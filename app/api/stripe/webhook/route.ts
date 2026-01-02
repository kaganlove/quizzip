import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

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

  // Stripe needs the RAW body for signature verification
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err?.message ?? "unknown error"}` },
      { status: 400 }
    );
  }

  const admin = supabaseAdmin();

  // Helper: upsert into your subscriptions table
  async function upsertSubscription(params: {
    userId: string;
    email?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    status?: string | null;
    priceId?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean | null;
    cancelAt?: string | null;
  }) {
    const payload: any = {
      user_id: params.userId,
      email: params.email ?? null,
      stripe_customer_id: params.stripeCustomerId ?? null,
      stripe_subscription_id: params.stripeSubscriptionId ?? null,
      status: params.status ?? null,
      price_id: params.priceId ?? null,
      current_period_start: params.currentPeriodStart ?? null,
      current_period_end: params.currentPeriodEnd ?? null,
      cancel_at_period_end: params.cancelAtPeriodEnd ?? null,
      cancel_at: params.cancelAt ?? null,
    };

    const { error } = await admin
      .from("subscriptions")
      .upsert(payload, { onConflict: "user_id" });

    if (error) throw error;
  }

  // Helper: given a subscription id, retrieve subscription + derive userId
  async function handleSubscriptionById(subscriptionId: string) {
    const sub: any = await stripe.subscriptions.retrieve(subscriptionId);

    const stripeCustomerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

    // Prefer subscription metadata, fallback to customer metadata
    let userId: string | null = sub?.metadata?.user_id ?? null;

    let email: string | null = null;
    if (sub?.customer_email) email = sub.customer_email;

    if (!userId && stripeCustomerId) {
      const cust: any = await stripe.customers.retrieve(stripeCustomerId);
      userId = cust?.metadata?.user_id ?? null;
      email = email ?? cust?.email ?? null;
    }

    if (!userId) {
      // We can’t map this Stripe sub to a Supabase user
      // Still return 200 so Stripe doesn’t retry forever
      return;
    }

    const priceId =
      sub?.items?.data?.[0]?.price?.id ?? null;

    const currentPeriodStart =
      sub?.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null;

    const currentPeriodEnd =
      sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

    const cancelAt =
      sub?.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null;

    await upsertSubscription({
      userId,
      email,
      stripeCustomerId,
      stripeSubscriptionId: sub?.id ?? subscriptionId,
      status: sub?.status ?? null,
      priceId,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: !!sub?.cancel_at_period_end,
      cancelAt,
    });
  }

  try {
    switch (event.type) {
      // Best event for creating the initial link (has client_reference_id + subscription id)
      case "checkout.session.completed": {
        const session: any = event.data.object;

        const userId: string | null =
          session?.client_reference_id ?? session?.metadata?.user_id ?? null;

        const subscriptionId: string | null =
          typeof session?.subscription === "string"
            ? session.subscription
            : session?.subscription?.id ?? null;

        if (userId && subscriptionId) {
          // Pull subscription to get full details + price id + status
          await handleSubscriptionById(subscriptionId);
        }
        break;
      }

      // Subscription lifecycle events
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub: any = event.data.object;
        if (sub?.id) {
          await handleSubscriptionById(sub.id);
        }
        break;
      }

      // Invoice events (often what you selected in Stripe UI)
      case "invoice.paid":
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
      case "invoice.finalized": {
        const invoice: any = event.data.object;

        const subscriptionId: string | null =
          typeof invoice?.subscription === "string"
            ? invoice.subscription
            : invoice?.subscription?.id ?? null;

        if (subscriptionId) {
          await handleSubscriptionById(subscriptionId);
        }
        break;
      }

      default:
        // Ignore anything else
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    // IMPORTANT: Return 200 anyway so Stripe doesn't hammer you with retries
    // But log the error so you can see it in Vercel Logs
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ received: true, handled: false });
  }
}
