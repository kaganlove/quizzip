import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

function pickBestSubscription(subs: Stripe.Subscription[]) {
  if (!subs.length) return null;

  const score = (s: Stripe.Subscription) => {
    const good = s.status === "active" || s.status === "trialing";
    return (good ? 1_000_000_000 : 0) + (s.created ?? 0);
  };

  return subs.slice().sort((a, b) => score(b) - score(a))[0];
}

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  try {
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

    const user = userRes.user;
    const userId = user.id;
    const email = user.email ?? "";

    const stripe = new Stripe(secretKey);

    // Look up the stored Stripe customer id
    const { data: subRow } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    const customerId = subRow?.stripe_customer_id ?? null;

    if (!customerId) {
      // No customer id stored yet, nothing to sync
      return NextResponse.json({ ok: true, status: "none" });
    }

    // Pull recent subs for this customer and choose best
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
      expand: ["data.items.data.price"],
    });

    const best = pickBestSubscription(list.data);

    if (!best) {
      // Persist "none" but keep customer id
      await admin
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            email,
            stripe_customer_id: customerId,
            stripe_subscription_id: null,
            status: "none",
            price_id: null,
          },
          { onConflict: "user_id" }
        );

      return NextResponse.json({ ok: true, status: "none" });
    }

    const priceId =
      (best as any)?.items?.data?.[0]?.price?.id ??
      (best as any)?.plan?.id ??
      null;

    await admin
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          email,
          stripe_customer_id: customerId,
          stripe_subscription_id: best.id,
          status: best.status,
          price_id: priceId,
        },
        { onConflict: "user_id" }
      );

    return NextResponse.json({
      ok: true,
      status: best.status,
      stripe_subscription_id: best.id,
      price_id: priceId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Sync failed", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
