import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

type SyncResponse = {
  ok: boolean;
  status: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  price_id?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  cancel_at?: string | null;
  note?: string;
};

function pickBestSubscription(subs: any[]): any | null {
  if (!subs?.length) return null;

  // Prefer active/trialing first, then anything else.
  const priority = (s: any) => {
    const st = String(s?.status ?? "");
    if (st === "active") return 0;
    if (st === "trialing") return 1;
    if (st === "past_due") return 2;
    if (st === "incomplete") return 3;
    if (st === "incomplete_expired") return 4;
    if (st === "unpaid") return 5;
    if (st === "canceled") return 6;
    return 99;
  };

  return [...subs].sort((a, b) => priority(a) - priority(b))[0];
}

export async function POST(req: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { ok: false, status: "error", note: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const access_token = body?.access_token as string | undefined;

    if (!access_token) {
      return NextResponse.json(
        { ok: false, status: "error", note: "Missing access_token" },
        { status: 401 }
      );
    }

    const admin = supabaseAdmin();

    const { data: userRes, error: userErr } = await admin.auth.getUser(access_token);
    if (userErr || !userRes?.user) {
      return NextResponse.json(
        { ok: false, status: "error", note: "Invalid session" },
        { status: 401 }
      );
    }

    const user = userRes.user;
    const userId = user.id;
    const email = user.email ?? null;

    // IMPORTANT: do NOT pass apiVersion here (caused the Vercel type error).
    const stripe = new Stripe(secretKey);

    // Load existing row (if any)
    const { data: subRow, error: subRowErr } = await admin
      .from("subscriptions")
      .select("user_id,email,stripe_customer_id,stripe_subscription_id,status,price_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (subRowErr) {
      return NextResponse.json(
        { ok: false, status: "error", note: `Supabase read error: ${subRowErr.message}` },
        { status: 500 }
      );
    }

    let customerId: string | null = (subRow as any)?.stripe_customer_id ?? null;

    // Ensure Stripe customer exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { user_id: userId },
      });
      customerId = customer.id;

      // Create/update row with customer id right away
      await admin
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            email,
            stripe_customer_id: customerId,
          },
          { onConflict: "user_id" }
        );
    } else {
      // Keep email in sync if we have it
      if (email && (subRow as any)?.email !== email) {
        await admin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              email,
              stripe_customer_id: customerId,
            },
            { onConflict: "user_id" }
          );
      }
    }

    // Pull Stripe subscriptions for this customer
    const list = await stripe.subscriptions.list({
      customer: customerId!,
      status: "all",
      limit: 10,
      expand: ["data.items.data.price"],
    });

    const best = pickBestSubscription(list.data as any[]);
    const bestAny = best as any;

    let status = "none";
    let stripe_subscription_id: string | null = null;
    let price_id: string | null = null;

    let current_period_start: string | null = null;
    let current_period_end: string | null = null;
    let cancel_at_period_end = false;
    let cancel_at: string | null = null;

    if (bestAny) {
      status = String(bestAny.status ?? "none");
      stripe_subscription_id = (bestAny.id as string) ?? null;

      const firstItemPriceId =
        bestAny?.items?.data?.[0]?.price?.id ??
        bestAny?.items?.data?.[0]?.price ??
        null;

      price_id = typeof firstItemPriceId === "string" ? firstItemPriceId : null;

      const cps =
        typeof bestAny.current_period_start === "number" ? (bestAny.current_period_start as number) : null;

      const cpe =
        typeof bestAny.current_period_end === "number" ? (bestAny.current_period_end as number) : null;

      const ca =
        typeof bestAny.cancel_at === "number" ? (bestAny.cancel_at as number) : null;

      current_period_start = cps ? new Date(cps * 1000).toISOString() : null;
      current_period_end = cpe ? new Date(cpe * 1000).toISOString() : null;

      cancel_at_period_end = !!bestAny.cancel_at_period_end;
      cancel_at = ca ? new Date(ca * 1000).toISOString() : null;
    }

    const payload = {
      user_id: userId,
      email,
      stripe_customer_id: customerId,
      stripe_subscription_id,
      status,
      price_id,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      cancel_at,
    };

    const { error: upsertErr } = await admin
      .from("subscriptions")
      .upsert(payload, { onConflict: "user_id" });

    if (upsertErr) {
      return NextResponse.json(
        { ok: false, status: "error", note: `Supabase upsert error: ${upsertErr.message}` },
        { status: 500 }
      );
    }

    const res: SyncResponse = {
      ok: true,
      status,
      stripe_customer_id: customerId,
      stripe_subscription_id,
      price_id,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      cancel_at,
    };

    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, status: "error", note: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
