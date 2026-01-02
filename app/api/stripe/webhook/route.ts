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
    // supabase-js v2 supports auth.admin.getUserById with service role
    const res = await admin.auth.admin.getUserById(userId);
    return res?.data?.user?.email ?? null;
  } catch {
    return null;
  }
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

  const { error } = await admin
    .from("subscriptions")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

function getSubscriptionBasics(sub: any) {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

  const price = sub?.items?.data?.[0]?.price ?? null;
  const priceId = price?.id ?? null;
  const priceInterval = price?.recurring?.interval ?? null;

  const currentPeriodEnd = toIsoFromUnixSeconds(sub?.current_period_end);
  const cancelAtPeriodEnd =
    typeof sub?.cancel_at_period_end === "boolean" ? sub.cancel_at_period_end : null;

  const status = typeof sub?.status === "string" ? sub.status : null;

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
    // keep this aligned with your Stripe setting, or omit to use Stripe default
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
    // Prefer subscription events for syncing entitlements
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as any;

      const userIdRaw = sub?.metadata?.user_id;
      const userId = typeof userIdRaw === "string" ? userIdRaw : "";

      if (!userId) {
        console.log("Subscription event missing metadata.user_id", { eventType: event.type, subId: sub?.id });
        return NextResponse.json({ received: true });
      }

      const admin = supabaseAdmin();
      const email = await getEmailForUserId(admin, userId);

      const basics = getSubscriptionBasics(sub);

      await upsertSubscriptionRow({
        userId,
        email,
        customerId: basics.customerId,
        subscriptionId: basics.subscriptionId,
        status: basics.status,
        priceId: basics.priceId,
        currentPeriodEnd: basics.currentPeriodEnd,
        cancelAtPeriodEnd: basics.cancelAtPeriodEnd,
        priceInterval: basics.priceInterval,
      });

      return NextResponse.json({ received: true });
    }

    // Optional: Checkout session completed can also be used to force a sync
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;

      const userIdRaw = session?.metadata?.user_id;
      const userId = typeof userIdRaw === "string" ? userIdRaw : "";

      const customerId = typeof session?.customer === "string" ? session.customer : null;
      const subscriptionId =
        typeof session?.subscription === "string"
          ? session.subscription
          : session?.subscription?.id ?? null;

      if (!userId || !customerId || !subscriptionId) {
        console.log("Checkout session missing linkage", {
          userIdPresent: !!userId,
          customerIdPresent: !!customerId,
          subscriptionIdPresent: !!subscriptionId,
        });
        return NextResponse.json({ received: true });
      }

      const admin = supabaseAdmin();
      const email = await getEmailForUserId(admin, userId);

      // Pull the subscription so we can store price, interval, status, period end
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"],
      });

      const basics = getSubscriptionBasics(sub as any);

      await upsertSubscriptionRow({
        userId,
        email,
        customerId: basics.customerId ?? customerId,
        subscriptionId: basics.subscriptionId ?? subscriptionId,
        status: basics.status,
        priceId: basics.priceId,
        currentPeriodEnd: basics.currentPeriodEnd,
        cancelAtPeriodEnd: basics.cancelAtPeriodEnd,
        priceInterval: basics.priceInterval,
      });

      return NextResponse.json({ received: true });
    }

    // Keep invoice events for logging, but do not rely on them
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as any;

      const subscriptionId =
        typeof invoice?.subscription === "string"
          ? invoice.subscription
          : invoice?.subscription?.id ??
            invoice?.lines?.data?.find((l: any) => typeof l?.subscription === "string")?.subscription ??
            null;

      if (!subscriptionId) {
        console.log("Invoice event without subscriptionId", { invoiceId: invoice?.id, type: event.type });
        return NextResponse.json({ received: true });
      }

      // If you want, you can retrieve and upsert here too, but subscription events already cover it
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Stripe webhook handler failed", err?.message ?? err);
    // Returning 500 makes Stripe retry, which is what you want if Supabase write failed
    return NextResponse.json(
      { error: "Webhook handler failed", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
