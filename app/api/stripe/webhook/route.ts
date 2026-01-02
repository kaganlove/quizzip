import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const secretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!secretKey) throw new Error("Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(secretKey);

function toIso(ts?: number | null) {
  return ts ? new Date(ts * 1000).toISOString() : null;
}

async function getCustomerEmail(customerId: string): Promise<string> {
  try {
    const c = await stripe.customers.retrieve(customerId);
    if (typeof c !== "string" && "email" in c && c.email) return c.email;
  } catch {}
  return "";
}

async function upsertSubscriptionRow(params: {
  userId: string;
  email: string;
  customerId: string;
  subscriptionId: string;
  status: string | null;
  priceId: string | null;
  priceInterval: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
}) {
  const admin = supabaseAdmin();

  const payload: any = {
    user_id: params.userId,
    email: params.email,
    stripe_customer_id: params.customerId,
    stripe_subscription_id: params.subscriptionId,
    status: params.status,
    price_id: params.priceId,
    price_interval: params.priceInterval,
    current_period_start: params.currentPeriodStart,
    current_period_end: params.currentPeriodEnd,
    cancel_at_period_end: params.cancelAtPeriodEnd,
    cancel_at: params.cancelAt,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("subscriptions")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("Supabase upsert error:", error);
    throw error;
  }
}

async function writeFromSubscription(sub: Stripe.Subscription, emailHint?: string) {
  const customerId = String(sub.customer);
  const subscriptionId = sub.id;

  const userId =
    (sub.metadata && (sub.metadata as any).user_id) ||
    (sub.metadata && (sub.metadata as any).userId);

  if (!userId) {
    console.warn("No user_id found in subscription metadata:", subscriptionId);
    return;
  }

  const price = sub.items?.data?.[0]?.price ?? null;
  const priceId = price?.id ?? null;
  const interval = (price as any)?.recurring?.interval ?? null;

  const email = emailHint || (await getCustomerEmail(customerId));

  await upsertSubscriptionRow({
    userId,
    email,
    customerId,
    subscriptionId,
    status: sub.status ?? null,
    priceId,
    priceInterval: interval,
    currentPeriodStart: toIso((sub as any).current_period_start ?? null),
    currentPeriodEnd: toIso((sub as any).current_period_end ?? null),
    cancelAtPeriodEnd: Boolean((sub as any).cancel_at_period_end),
    cancelAt: toIso((sub as any).cancel_at ?? null),
  });
}

export async function POST(req: Request) {
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message || err);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== "subscription") break;

        const subscriptionId = session.subscription
          ? String(session.subscription)
          : null;

        if (!subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);

        const email =
          session.customer_details?.email ||
          (session.customer_email ?? "") ||
          "";

        await writeFromSubscription(sub, email);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await writeFromSubscription(sub);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        // Stripe types are inconsistent across versions; some omit `subscription` on Invoice.
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionRaw = (invoice as any).subscription;

        const subscriptionId =
          typeof subscriptionRaw === "string"
            ? subscriptionRaw
            : subscriptionRaw
              ? String(subscriptionRaw)
              : null;

        if (!subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);

        const email =
          (invoice as any).customer_email ||
          (invoice as any).customer_details?.email ||
          "";

        await writeFromSubscription(sub, email);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err?.message || err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
