import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
}

const stripe = new Stripe(secretKey);


async function resolveUserIdFromCustomer(customerId: string): Promise<string | null> {
  try {
    const cust = await stripe.customers.retrieve(customerId);
    if (cust && !("deleted" in cust)) {
      const uid = (cust.metadata?.user_id || "").trim();
      return uid || null;
    }
  } catch {}
  return null;
}

async function upsertSubscription(userId: string, email: string | null, sub: Stripe.Subscription) {
  const admin = supabaseAdmin();
  const customerId =
    typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id || null;

  const priceId = sub.items.data[0]?.price?.id ?? null;

  // IMPORTANT: Only write columns that exist in your current table
  const payload: any = {
    user_id: userId,
    email: email || null,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    price_id: priceId,
  };

  const { error } = await admin.from("subscriptions").upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

export async function POST(req: Request) {
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  if (!whsec) return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const buf = Buffer.from(await req.arrayBuffer());
    event = stripe.webhooks.constructEvent(buf, sig, whsec);
  } catch (err: any) {
    return NextResponse.json({ error: "Invalid signature", detail: err?.message ?? String(err) }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") return NextResponse.json({ received: true });

      const subId = typeof session.subscription === "string" ? session.subscription : null;
      const customerId = typeof session.customer === "string" ? session.customer : null;

      const userId =
        (session.client_reference_id || "").trim() ||
        (session.metadata?.user_id || "").trim() ||
        (customerId ? await resolveUserIdFromCustomer(customerId) : null);

      if (userId && subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const email = (session.customer_details?.email || session.customer_email || "").trim() || null;
        await upsertSubscription(userId, email, sub);
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id;

      const userId =
        (sub.metadata?.user_id || "").trim() ||
        (customerId ? await resolveUserIdFromCustomer(customerId) : null);

      if (userId) await upsertSubscription(userId, null, sub);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Webhook handler failed", detail: err?.message ?? String(err) }, { status: 500 });
  }
}
