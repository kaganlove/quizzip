// app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");
if (!webhookSecret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");
if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseServiceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const stripe = new Stripe(stripeSecretKey, {
  // If you set a specific API version in Stripe, keep it consistent here.
  // If you do not care, you can remove apiVersion and let Stripe default.
  apiVersion: "2025-12-15.clover" as any,
});

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type SubscriptionRow = {
  user_id: string;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string | null;
  price_id: string | null;
  updated_at: string;
};

function asId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "id" in value) {
    const id = (value as any).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

function pickUserIdFromSubscription(sub: Stripe.Subscription): string | null {
  const meta = sub.metadata || {};
  return (
    (typeof meta.user_id === "string" && meta.user_id) ||
    (typeof (meta as any).userId === "string" && (meta as any).userId) ||
    null
  );
}

function pickPriceId(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0];
  const price = item?.price;
  return price?.id ?? null;
}

function pickEmailFromCustomer(customer: Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null;
  if ((customer as Stripe.DeletedCustomer).deleted) return null;
  return (customer as Stripe.Customer).email ?? null;
}

async function upsertSubscriptionRow(row: SubscriptionRow) {
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(row, { onConflict: "user_id" });

  if (error) {
    console.error("Supabase upsert error:", error);
    throw error;
  }
}

async function syncFromSubscription(subscriptionId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["customer", "items.data.price"],
  });

  const userId = pickUserIdFromSubscription(sub);
  if (!userId) {
    console.warn("Subscription missing user_id metadata:", sub.id);
    return;
  }

  const customerId = asId(sub.customer);
  const customerObj = (typeof sub.customer === "object" ? (sub.customer as any) : null) as
    | Stripe.Customer
    | Stripe.DeletedCustomer
    | null;

  const email = pickEmailFromCustomer(customerObj);

  const row: SubscriptionRow = {
    user_id: userId,
    email,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status ?? null,
    price_id: pickPriceId(sub),
    updated_at: new Date().toISOString(),
  };

  await upsertSubscriptionRow(row);
  console.log("Synced subscription to Supabase:", { userId, subscriptionId: sub.id, status: sub.status });
}

async function findSubscriptionIdFromInvoice(invoice: Stripe.Invoice): Promise<string | null> {
  // Common: invoice.subscription is string or Subscription
  const direct = asId((invoice as any).subscription);
  if (direct) return direct;

  // Sometimes it is tucked into lines
  const lines = (invoice as any).lines?.data as any[] | undefined;
  if (Array.isArray(lines)) {
    for (const line of lines) {
      const s1 = asId(line?.subscription);
      if (s1) return s1;
      const s2 = asId(line?.subscription_item?.subscription);
      if (s2) return s2;
    }
  }

  return null;
}

async function syncFromInvoiceId(invoiceId: string) {
  const invoice = await stripe.invoices.retrieve(invoiceId, {
    expand: ["lines.data.price", "customer"],
  });

  let subscriptionId = await findSubscriptionIdFromInvoice(invoice);

  // If still missing, attempt a safe fallback: use the customer and grab their most recent subscription
  if (!subscriptionId) {
    const customerId = asId((invoice as any).customer);
    if (customerId) {
      const list = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 1,
      });
      subscriptionId = list.data?.[0]?.id ?? null;
    }
  }

  if (!subscriptionId) {
    console.warn("Invoice event without subscriptionId:", { invoiceId });
    return;
  }

  await syncFromSubscription(subscriptionId);
}

async function syncFromPaymentIntentId(paymentIntentId: string) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  const invoiceId = asId((pi as any).invoice);
  if (!invoiceId) {
    console.warn("PaymentIntent has no invoice:", { paymentIntentId });
    return;
  }
  await syncFromInvoiceId(invoiceId);
}

export async function POST(req: Request) {
  let event: Stripe.Event;

  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig) return new Response("Missing stripe-signature", { status: 400 });

    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message || err);
    return new Response("Webhook Error", { status: 400 });
  }

  const eventType = event.type as string;

  try {
    // You can keep your Stripe destination limited. This code supports:
    // invoice.*   payment_intent.*   customer.subscription.*
    // plus checkout.session.completed if you ever enable it later.

    if (eventType.startsWith("customer.subscription.")) {
      const sub = event.data.object as Stripe.Subscription;
      await syncFromSubscription(sub.id);
      return Response.json({ received: true });
    }

    if (eventType.startsWith("invoice.")) {
      const inv = event.data.object as Stripe.Invoice;
      await syncFromInvoiceId(inv.id);
      return Response.json({ received: true });
    }

    if (eventType.startsWith("payment_intent.")) {
      const pi = event.data.object as Stripe.PaymentIntent;
      // payment_intent.succeeded is the most useful, but syncing on all is harmless
      await syncFromPaymentIntentId(pi.id);
      return Response.json({ received: true });
    }

    // subscription_schedule.* and entitlements.* are irrelevant for your Supabase subscription row
    return Response.json({ received: true, ignored: true });
  } catch (err: any) {
    console.error("Webhook handler failed:", err?.message || err);
    // Return 500 so Stripe can retry if needed
    return new Response("Webhook handler failed", { status: 500 });
  }
}
