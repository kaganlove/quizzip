import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-12-15.clover" as any,
});

type UpsertRow = {
  user_id: string;
  email?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  status?: string | null;
  price_id?: string | null;
};

function asId(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const v = (value as any).id;
    return typeof v === "string" ? v : undefined;
  }
  return undefined;
}

function pickEmailFromCustomer(customer: unknown): string | undefined {
  const email = (customer as any)?.email;
  return typeof email === "string" ? email : undefined;
}

async function upsertSubscriptionRow(row: UpsertRow) {
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(row, { onConflict: "user_id" });

  if (error) {
    console.error("Supabase upsert failed", error);
    throw new Error(error.message);
  }
}

async function syncFromSubscriptionId(subscriptionId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price", "customer"],
  });

  const userId = sub.metadata?.user_id;
  if (!userId) {
    console.warn("Subscription missing metadata.user_id", { subscriptionId });
    return;
  }

  const customerId = asId(sub.customer);
  const email = pickEmailFromCustomer(sub.customer) ?? sub.metadata?.email ?? null;
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;

  await upsertSubscriptionRow({
    user_id: userId,
    email,
    stripe_customer_id: customerId ?? null,
    stripe_subscription_id: sub.id,
    status: sub.status ?? null,
    price_id: priceId,
  });
}

async function syncFromInvoiceId(invoiceId: string) {
  const invoice = await stripe.invoices.retrieve(invoiceId, {
    expand: ["subscription", "customer", "lines.data.price"],
  });

  const subscriptionId =
    asId((invoice as any).subscription) ||
    asId((invoice as any).subscription_details?.subscription);

  if (!subscriptionId) {
    console.warn("Invoice has no subscription id", { invoiceId });
    return;
  }

  await syncFromSubscriptionId(subscriptionId);
}

async function markCanceledBySubscriptionId(subscriptionId: string) {
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("Supabase cancel update failed", error);
    throw new Error(error.message);
  }
}

export async function POST(req: Request) {
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing stripe-signature", { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed", err?.message || err);
    return new Response("Webhook Error", { status: 400 });
  }

  try {
    const type = event.type;

    if (type.startsWith("invoice.")) {
      const invoiceId = (event.data.object as any)?.id;
      if (typeof invoiceId === "string") {
        await syncFromInvoiceId(invoiceId);
      } else {
        console.warn("Invoice event missing id", { type });
      }
    } else if (
      type === "customer.subscription.created" ||
      type === "customer.subscription.updated"
    ) {
      const subscriptionId = (event.data.object as any)?.id;
      if (typeof subscriptionId === "string") {
        await syncFromSubscriptionId(subscriptionId);
      } else {
        console.warn("Subscription event missing id", { type });
      }
    } else if (type === "customer.subscription.deleted") {
      const subscriptionId = (event.data.object as any)?.id;
      if (typeof subscriptionId === "string") {
        await markCanceledBySubscriptionId(subscriptionId);
      } else {
        console.warn("Subscription deleted event missing id", { type });
      }
    } else {
      // You can keep this, or remove if you want quieter logs
      console.log("Ignoring event type", type);
    }
  } catch (err: any) {
    console.error("Webhook handler failed", err?.message || err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
