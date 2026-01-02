// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

function toIsoFromUnixSeconds(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

async function getEmailForUserId(admin: any, userId: string): Promise<string | null> {
  try {
    const res = await admin.auth.admin.getUserById(userId);
    return res?.data?.user?.email ?? null;
  } catch {
    return null;
  }
}

function getSubscriptionBasics(sub: any) {
  const customerId =
    typeof sub?.customer === "string" ? sub.customer : sub?.customer?.id ?? null;

  const price = sub?.items?.data?.[0]?.price ?? null;
  const priceId = price?.id ?? null;
  const priceInterval = price?.recurring?.interval ?? null;

  const currentPeriodEnd = toIsoFromUnixSeconds(sub?.current_period_end);
  const cancelAtPeriodEnd =
    typeof sub?.cancel_at_period_end === "boolean" ? sub.cancel_at_period_end : null;

  const rawStatus = typeof sub?.status === "string" ? sub.status : null;

  // Optional: normalize "trialing" to "active" if your UI gates strictly on "active"
  const status = rawStatus === "trialing" ? "active" : rawStatus;

  const subscriptionId = typeof sub?.id === "string" ? sub.id : null;

  return {
    customerId,
    priceId,
    priceInterval,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    status,
    subscriptionId,
  };
}

async function upsertSubscriptionRow(args: {
  userId: string;
  email: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  status: string | null;
  priceId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  priceInterval: string | null;
}) {
  const admin = supabaseAdmin();

  const payload: Record<string, any> = {
    user_id: args.userId,
    email: args.email,
    stripe_customer_id: args.customerId,
    stripe_subscription_id: args.subscriptionId,
    status: args.status,
    price_id: args.priceId,
    current_period_end: args.currentPeriodEnd,
    cancel_at_period_end: args.cancelAtPeriodEnd,
    price_interval: args.priceInterval,
  };

  const { error } = await admin.from("subscriptions").upsert(payload, { onConflict: "user_id" });

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
}

function getInvoiceId(obj: any): string | null {
  return typeof obj?.id === "string" ? obj.id : null;
}

function getInvoiceCustomerId(obj: any): string | null {
  const c = obj?.customer;
  if (typeof c === "string") return c;
  if (typeof c?.id === "string") return c.id;
  return null;
}

function pickSubscriptionIdFromInvoice(invoice: any): string | null {
  // Common case
  const sub = invoice?.subscription;
  if (typeof sub === "string") return sub;
  if (typeof sub?.id === "string") return sub.id;

  // Some payloads may only include it on a line item
  const lineSub =
    invoice?.lines?.data?.find((l: any) => typeof l?.subscription === "string")?.subscription;
  if (typeof lineSub === "string") return lineSub;

  // Some newer payloads may include subscription details metadata only
  const subDetails = invoice?.subscription_details;
  if (typeof subDetails?.subscription === "string") return subDetails.subscription;

  return null;
}

async function resolveSubscriptionIdViaCustomerLatestInvoice(
  stripe: Stripe,
  customerId: string,
  invoiceId: string
): Promise<string | null> {
  try {
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const match = list.data.find((s: any) => {
      const latest = s?.latest_invoice;
      if (typeof latest === "string") return latest === invoiceId;
      if (typeof latest?.id === "string") return latest.id === invoiceId;
      return false;
    });

    return typeof match?.id === "string" ? match.id : null;
  } catch {
    return null;
  }
}

async function syncFromSubscriptionId(stripe: Stripe, subscriptionId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price", "customer"],
  });

  const userIdRaw = (sub as any)?.metadata?.user_id;
  const userId = typeof userIdRaw === "string" ? userIdRaw : "";

  if (!userId) {
    console.log("Subscription missing metadata.user_id", { subscriptionId });
    return;
  }

  const admin = supabaseAdmin();

  // Prefer Supabase email for your own user model
  const emailFromAuth = await getEmailForUserId(admin, userId);

  // Fallback: Stripe customer email if needed
  const cust: any = (sub as any)?.customer;
  const emailFromStripe = typeof cust?.email === "string" ? cust.email : null;

  const basics = getSubscriptionBasics(sub as any);

  await upsertSubscriptionRow({
    userId,
    email: emailFromAuth ?? emailFromStripe,
    customerId: basics.customerId,
    subscriptionId: basics.subscriptionId,
    status: basics.status,
    priceId: basics.priceId,
    currentPeriodEnd: basics.currentPeriodEnd,
    cancelAtPeriodEnd: basics.cancelAtPeriodEnd,
    priceInterval: basics.priceInterval,
  });
}

async function syncFromInvoiceEvent(stripe: Stripe, invoiceObject: any) {
  const invoiceId = getInvoiceId(invoiceObject);
  if (!invoiceId) {
    console.log("Invoice event missing invoice id");
    return;
  }

  // Always re fetch invoice with expansions so we are not dependent on partial payloads
  const invoice = await stripe.invoices.retrieve(invoiceId, {
    expand: ["subscription", "lines.data.price", "customer"],
  });

  let subscriptionId = pickSubscriptionIdFromInvoice(invoice);

  // Fallback: resolve by matching the subscription latest_invoice
  if (!subscriptionId) {
    const customerId = getInvoiceCustomerId(invoice) ?? getInvoiceCustomerId(invoiceObject);
    if (customerId) {
      subscriptionId = await resolveSubscriptionIdViaCustomerLatestInvoice(
        stripe,
        customerId,
        invoiceId
      );
    }
  }

  if (!subscriptionId) {
    console.log("Invoice event without resolvable subscription id", { invoiceId });
    return;
  }

  await syncFromSubscriptionId(stripe, subscriptionId);
}

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await req.text();

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-12-15.clover" as any,
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Webhook signature verification failed", detail: err?.message ?? String(err) },
      { status: 400 }
    );
  }

  try {
    // These are the events your Destination is actually delivering
    if (
      event.type === "invoice.paid" ||
      event.type === "invoice.payment_succeeded" ||
      event.type === "invoice_payment.paid"
    ) {
      await syncFromInvoiceEvent(stripe, event.data.object);
      return NextResponse.json({ received: true });
    }

    if (
      event.type === "invoice.payment_failed" ||
      event.type === "invoice_payment.failed" ||
      event.type === "invoice.finalization_failed"
    ) {
      // Still sync, Stripe will reflect status like past_due or unpaid
      await syncFromInvoiceEvent(stripe, event.data.object);
      return NextResponse.json({ received: true });
    }

    // Keep these if your Destination ever includes them
    if (event.type === "checkout.session.completed") {
      const session: any = event.data.object;
      const subscriptionId =
        typeof session?.subscription === "string"
          ? session.subscription
          : typeof session?.subscription?.id === "string"
          ? session.subscription.id
          : null;

      if (subscriptionId) {
        await syncFromSubscriptionId(stripe, subscriptionId);
      } else {
        console.log("Checkout session completed without subscription id", { id: session?.id });
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Stripe webhook handler failed", err?.message ?? err);
    return NextResponse.json(
      { error: "Webhook handler failed", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
