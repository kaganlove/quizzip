import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.APP_URL;
  const priceMonthly = process.env.STRIPE_PRICE_ID_MONTHLY;
  const priceYearly = process.env.STRIPE_PRICE_ID_YEARLY;

  if (!secretKey || !appUrl || !priceMonthly || !priceYearly) {
    return NextResponse.json(
      {
        error:
          "Missing env vars. Check STRIPE_SECRET_KEY, APP_URL, STRIPE_PRICE_ID_MONTHLY, STRIPE_PRICE_ID_YEARLY",
      },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const access_token = body?.access_token as string | undefined;
  const billing = (body?.billing as string | undefined) ?? "monthly";

  if (!access_token) {
    return NextResponse.json({ error: "Missing access_token" }, { status: 401 });
  }

  // IMPORTANT: supabaseAdmin is a function that returns the client
  const admin = supabaseAdmin();

  const { data: userRes, error: userErr } = await admin.auth.getUser(access_token);
  if (userErr || !userRes?.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const user = userRes.user;
  const userId = user.id;
  const email = user.email ?? "";

  const stripe = new Stripe(secretKey);

  // Find existing Stripe customer id if we already have one
  const { data: subRow } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  let customerId = subRow?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email || undefined,
      metadata: { user_id: userId },
    });
    customerId = customer.id;
  } else {
    // Ensure metadata is present (helps webhook fallback)
    await stripe.customers.update(customerId, {
      metadata: { user_id: userId },
    });
  }

  const priceId = billing === "yearly" ? priceYearly : priceMonthly;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/?checkout=cancel`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { user_id: userId },
    },
  });

  return NextResponse.json({ url: session.url });
}
