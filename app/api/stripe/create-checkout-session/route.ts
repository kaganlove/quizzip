import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover" as any,
});

const BodySchema = z.object({
  access_token: z.string(),
  billingPeriod: z.enum(["monthly", "annual"]).default("monthly"),
});

function getSupabaseWithAccessToken(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    const supabase = getSupabaseWithAccessToken(body.access_token);
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const user = data.user;
    const userId = user.id;
    const email = user.email;

    if (!email) {
      return new Response("User missing email", { status: 400 });
    }

    const monthlyPriceId = process.env.STRIPE_PRICE_ID_MONTHLY;
    const annualPriceId = process.env.STRIPE_PRICE_ID_ANNUAL;
    const priceId = body.billingPeriod === "annual" ? annualPriceId : monthlyPriceId;

    if (!priceId) {
      return new Response("Missing Stripe price env var", { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (!appUrl) {
      return new Response("Missing NEXT_PUBLIC_APP_URL (or NEXT_PUBLIC_SITE_URL)", { status: 500 });
    }

    // Create customer (optional but helpful)
    const customer = await stripe.customers.create({
      email,
      metadata: { user_id: userId },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancel`,
      // Critical: metadata must land on the subscription so invoice events can map back to Supabase user
      subscription_data: {
        metadata: { user_id: userId, email },
      },
      metadata: { user_id: userId, email },
      allow_promotion_codes: true,
    });

    return Response.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error", err?.message || err);
    return new Response("Checkout error", { status: 500 });
  }
}
