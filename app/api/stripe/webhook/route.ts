// app/api/stripe/webhook/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const STRIPE_SECRET_KEY = requireEnv("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = requireEnv("STRIPE_WEBHOOK_SECRET");

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");

const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

// Do not set apiVersion here to avoid TS mismatches with codenamed versions.
// Stripe will use your account default for requests.
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  typescript: true,
});

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type UpsertPayload = {
  user_id: string;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string | null;
  price_id: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
};

async function upsertSubscriptionRow(payload: UpsertPayload) {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .maybeSingle();

  if (error) {
    console.error("Supabase upsert error", { error, payload });
    throw error;
  }

  console.log("Supabase upsert ok", { user_id: payload.user_id, status: payload.status });
  return data;
}

async function findUserIdByCustomerId(customerId: string) {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error("Supabase lookup error", { error, customerId });
    return null;
  }

  return data?.user_id ?? null;
}

function toIsoFromUnixSeconds(x: unknown) {
  if (typeof x !== "number") return null;
  return new Date(x * 1000).toISOString();
}

export async function POST(req: Request) {
  try {
    const sig = (await headers()).get("stripe-signature");
    if (!sig) {
      console.error("Missing stripe-signature header");
      return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
    }

    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error("Webhook signature verification failed", err?.message || err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Log the event type so you can see what is actually hitting prod.
    console.log("Stripe event received", { type: event.type, id: event.id });

    // We cast to any in a few places because Stripe type shapes vary by API version.
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;

        // Only care about subscription checkouts
        if (session?.mode !== "subscription") break;

        const userId: string | null =
          session?.metadata?.user_id ||
          session?.client_reference_id ||
          null;

        const email: string | null =
          session?.customer_details?.email ||
          session?.customer_email ||
          session?.metadata?.email ||
          null;

        const customerId: string | null =
          typeof session?.customer === "string"
            ? session.customer
            : session?.customer?.id || null;

        const subscriptionId: string | null =
          typeof session?.subscription === "string"
            ? session.subscription
            : session?.subscription?.id || null;

        if (!userId) {
          console.error("checkout.session.completed missing userId", { sessionId: session?.id });
          break;
        }

        if (!subscriptionId) {
          console.error("checkout.session.completed missing subscriptionId", { sessionId: session?.id });
          break;
        }

        const sub = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["items.data.price"],
        }) as any;

        const priceId: string | null =
          sub?.items?.data?.[0]?.price?.id || null;

        const status: string | null = sub?.status || null;

        await upsertSubscriptionRow({
          user_id: userId,
          email,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status,
          price_id: priceId,
          current_period_start: toIsoFromUnixSeconds(sub?.current_period_start),
          current_period_end: toIsoFromUnixSeconds(sub?.current_period_end),
        });

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;

        const subscriptionId: string | null = sub?.id || null;
        const customerId: string | null =
          typeof sub?.customer === "string" ? sub.customer : sub?.customer?.id || null;

        const userIdFromMeta: string | null = sub?.metadata?.user_id || null;

        const userId =
          userIdFromMeta ||
          (customerId ? await findUserIdByCustomerId(customerId) : null);

        if (!userId) {
          console.error("subscription event missing userId", { subscriptionId, customerId, type: event.type });
          break;
        }

        const priceId: string | null =
          sub?.items?.data?.[0]?.price?.id || null;

        const status: string | null = sub?.status || null;

        await upsertSubscriptionRow({
          user_id: userId,
          email: null,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status,
          price_id: priceId,
          current_period_start: toIsoFromUnixSeconds(sub?.current_period_start),
          current_period_end: toIsoFromUnixSeconds(sub?.current_period_end),
        });

        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as any;

        const customerId: string | null =
          typeof invoice?.customer === "string" ? invoice.customer : invoice?.customer?.id || null;

        const subscriptionId: string | null =
          typeof invoice?.subscription === "string"
            ? invoice.subscription
            : invoice?.subscription?.id || null;

        // If we do not have a subscription, there is nothing to update
        if (!subscriptionId) {
          console.log("Invoice event without subscriptionId", { invoiceId: invoice?.id, type: event.type });
          break;
        }

        const sub = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["items.data.price"],
        }) as any;

        const status: string | null = sub?.status || null;
        const priceId: string | null = sub?.items?.data?.[0]?.price?.id || null;

        const userIdFromMeta: string | null = sub?.metadata?.user_id || null;
        const userId =
          userIdFromMeta ||
          (customerId ? await findUserIdByCustomerId(customerId) : null);

        if (!userId) {
          console.error("invoice event could not resolve userId", {
            invoiceId: invoice?.id,
            subscriptionId,
            customerId,
            type: event.type,
          });
          break;
        }

        await upsertSubscriptionRow({
          user_id: userId,
          email: invoice?.customer_email || null,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status,
          price_id: priceId,
          current_period_start: toIsoFromUnixSeconds(sub?.current_period_start),
          current_period_end: toIsoFromUnixSeconds(sub?.current_period_end),
        });

        break;
      }

      default:
        // Ignore everything else
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler crashed", err?.message || err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
