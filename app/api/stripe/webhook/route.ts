import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function firstNonEmpty(...vals: Array<string | null | undefined>): string | null {
  for (const v of vals) {
    if (v && v.trim()) return v;
  }
  return null;
}

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secretKey);

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message || err);
    return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const eventType = event.type as string;

  try {
    // Your Event Destination is sending invoice.* + payment_intent.* reliably.
    // We’ll sync subscriptions primarily off invoice.* (works even when subscription.created isn't delivered).
    if (eventType.startsWith("invoice.")) {
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice?.id) {
        console.warn("Invoice event missing invoice.id", { eventType });
        return NextResponse.json({ received: true });
      }

      await syncFromInvoice({
        stripe,
        admin,
        invoiceId: invoice.id,
        eventType,
      });

      return NextResponse.json({ received: true });
    }

    // Optional: if these ever arrive, you can sync too
    if (eventType === "checkout.session.completed") {
      // Not required for your current destination setup, but harmless if it comes through.
      return NextResponse.json({ received: true });
    }

    if (eventType.startsWith("payment_intent.")) {
      // Usually not needed for subscription table; invoice covers it.
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err?.message || err, { eventType });
    // Stripe treats non-2xx as retry; if you want retries, return 500.
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function syncFromInvoice(args: {
  stripe: Stripe;
  admin: ReturnType<typeof supabaseAdmin>;
  invoiceId: string;
  eventType: string;
}) {
  const { stripe, admin, invoiceId, eventType } = args;

  // Pull a fresh invoice with expansions so we can reliably find subscription + price
  const inv = await stripe.invoices.retrieve(invoiceId, {
    expand: ["subscription", "lines.data.price"],
  });

  const customerId =
    asString((inv as any).customer) || asString((inv as any).customer?.id) || null;

  // subscription on invoice can be string | object | null
  const invoiceSub =
    asString((inv as any).subscription) || asString((inv as any).subscription?.id) || null;

  let subscriptionId = invoiceSub;

  // Fallback 1: try invoice lines (sometimes subscription is attached there)
  if (!subscriptionId && Array.isArray(inv.lines?.data)) {
    for (const line of inv.lines.data as any[]) {
      const lineSub = asString(line?.subscription) || asString(line?.subscription?.id);
      if (lineSub) {
        subscriptionId = lineSub;
        break;
      }
    }
  }

  // Fallback 2: list latest subscription for customer (only if we have a customer)
  if (!subscriptionId && customerId) {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });
    subscriptionId = subs.data?.[0]?.id ?? null;
  }

  if (!subscriptionId) {
    console.warn("Invoice event without subscriptionId", { invoiceId, eventType, customerId });
    return;
  }

  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price", "customer"],
  });

  const priceId =
    sub.items?.data?.[0]?.price?.id ||
    (inv.lines?.data?.[0] as any)?.price?.id ||
    null;

  const status = sub.status ?? "unknown";

  // Prefer user_id from metadata written at checkout
  const userId =
    firstNonEmpty(
      (sub.metadata as any)?.user_id,
      (sub.metadata as any)?.userId,
      (sub.customer as any)?.metadata?.user_id
    ) || null;

  // Email fallback chain
  const email =
    firstNonEmpty(
      (inv as any).customer_email,
      (inv as any).customer_details?.email,
      (sub.customer as any)?.email
    ) || "";

  if (!userId) {
    // If you *must* map by email, you can do it here via auth schema (service role required).
    // But ideally user_id is always present from subscription metadata.
    console.warn("No user_id found in Stripe metadata; cannot reliably upsert by user_id", {
      invoiceId,
      subscriptionId,
      customerId,
      email,
    });
    return;
  }

  const payload = {
    user_id: userId,
    email,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    status,
    price_id: priceId,
  };

  const { error } = await admin
    .from("subscriptions")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("Supabase upsert failed", error, payload);
    throw error;
  }
}
