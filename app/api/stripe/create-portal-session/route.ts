import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const appUrl = process.env.APP_URL;

    if (!secretKey || !appUrl) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY or APP_URL" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({} as any));
    const access_token = body?.access_token as string | undefined;

    if (!access_token) {
      return NextResponse.json({ error: "Missing access_token" }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const { data: userRes, error: userErr } = await admin.auth.getUser(access_token);
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = userRes.user.id;

    const { data: subRow } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    const customerId = subRow?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ error: "No Stripe customer found for this user yet" }, { status: 400 });
    }

    const stripe = new Stripe(secretKey);
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Create portal session failed", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
