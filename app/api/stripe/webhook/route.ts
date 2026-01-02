import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover" as any,
});

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function asId(x: unknown): string | null {
  if (typeof x === "string") return x;
  if (x && typeof x === "object" && "id" in x && typeof (x as any).id === "string") return (x as any).id;
  return null;
}

async function upsertSubscriptionFromSubscriptionId(subscriptionId: string) {
  const supabase = getSupabaseAdmin();

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["customer", "items.data.price"],
  });

  const userId =
    subscription.metadata?.user_id ||
    subscription.metadata?.userId ||
    subscription.metadata?.supabase_user_id ||
    null;

  if (!userId) {
    console.warn("Subscription missing metadata user_id", { subscriptionId });
    return;
  }

  const customerId = asId(subscription.customer);
  const customerEmail =
    typeof subscription.customer === "object" && subscription.customer
      ? (subscription.customer as Stripe.Customer).email
      : null;

  const priceId =
    subscription.items?.data?.[0]?.price?.id ||
    null;

  const payload = {
    user_id: userId,
    email: customerEmail,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    price_id: priceId,
  };

  const { error } = await supabase
    .from("subscriptions")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("Supabase upsert failed", { error, payload });
  } else {
    console.log("Supabase subscription upsert ok", payload);
  }
}

async function upsertSubscriptionFromInvoice(invoiceId: string) {
  const invoice = await stripe.invoices.retrieve(invoiceId, {
    expand: ["subscription", "customer", "lines.data.subscription"],
  });

  let subscriptionId = asId(invoice.subscription);

  if (!subscriptionId) {
    for (const line of invoice.lines?.data || []) {
      const lineSubId = asId((line as any).subscription);
      if (lineSubId) {
        subscriptionId = lineSubId;
        break;
      }
    }
  }

  if (!subscriptionId) {
    console.warn("Invoice event without subscriptionId", { invoiceId, type: invoice.status });
    return;
  }

  await upsertSubscriptionFromSubscriptionId(subscriptionId);
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return new Response("Server misconfigured", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message || err);
    return new Response("Webhook Error", { status: 400 });
  }

  try {
    // Stripe destination events you showed are heavily invoice driven
    const invoiceDriven = new Set<string>([
      "invoice.created",
      "invoice.finalized",
      "invoice.finalization_failed",
      "invoice.paid",
      "invoice.payment_failed",
      "invoice.payment_action_required",
      "invoice.updated",
      "invoice.upcoming",
    ]);

    if (invoiceDriven.has(event.type)) {
      const invoice = event.data.object as Stripe.Invoice;
      console.log("Stripe event received", { type: event.type, id: event.id, invoiceId: invoice.id });
      await upsertSubscriptionFromInvoice(invoice.id);
      return Response.json({ received: true });
    }

    // If Stripe also delivers these, handle them too
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      console.log("Stripe subscription event received", { type: event.type, id: event.id, subId: sub.id });
      await upsertSubscriptionFromSubscriptionId(sub.id);
      return Response.json({ received: true });
    }

    // Ignore everything else for now
    console.log("Stripe event ignored", { type: event.type, id: event.id });
    return Response.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler failed:", err?.message || err);
    return new Response("Webhook handler failed", { status: 500 });
  }
}
