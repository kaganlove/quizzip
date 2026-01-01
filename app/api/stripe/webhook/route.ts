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

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Webhook signature verification failed", detail: err?.message ?? String(err) },
      { status: 400 }
    );
  }

  try {
    const admin = supabaseAdmin();

    const upsertSubRow = async (params: {
      userId: string;
      email?: string | null;
      customerId?: string | null;
      subscriptionId?: string | null;
      status?: string | null;
      priceId?: string | null;
    }) => {
      const { userId, email, customerId, subscriptionId, status, priceId } = params;

      await admin
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            email: email ?? "",
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: subscriptionId ?? null,
            status: status ?? "none",
            price_id: priceId ?? null,
          },
          { onConflict: "user_id" }
        );
    };

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;

      const userId = (sub as any)?.metadata?.user_id as string | undefined;
      if (!userId) {
        // We can’t map it to a Supabase user without metadata, ignore safely
        return NextResponse.json({ received: true });
      }

      const customerId =
        typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id ?? null;

      const priceId =
        (sub as any)?.items?.data?.[0]?.price?.id ??
        (sub as any)?.plan?.id ??
        null;

      const status =
        event.type === "customer.subscription.deleted" ? "canceled" : sub.status;

      await upsertSubRow({
        userId,
        email: (sub as any)?.customer_email ?? null,
        customerId,
        subscriptionId: sub.id,
        status,
        priceId,
      });

      return NextResponse.json({ received: true });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // We set client_reference_id to userId when creating checkout
      const userId = (session.client_reference_id ?? undefined) as string | undefined;
      if (!userId) return NextResponse.json({ received: true });

      const customerId =
        typeof session.customer === "string" ? session.customer : (session.customer as any)?.id ?? null;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription as any)?.id ?? null;

      // Price is not always present on session without extra expands, so leave null
      await upsertSubRow({
        userId,
        customerId,
        subscriptionId,
        status: "active",
        priceId: null,
      });

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Webhook handler failed", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
