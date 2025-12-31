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
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });

    const body = await req.json().catch(() => ({} as any));
    const access_token = body?.access_token as string | undefined;
    if (!access_token) return NextResponse.json({ error: "Missing access_token" }, { status: 401 });

    const admin = supabaseAdmin();

    const { data: userRes, error: userErr } = await admin.auth.getUser(access_token);
    if (userErr || !userRes?.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const userId = userRes.user.id;
    const email = (userRes.user.email || "").trim();
    const stripe = new Stripe(secretKey);

    const { data: row } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let customerId = (row?.stripe_customer_id || "").trim() || null;

    async function listAllSubsForCustomer(cusId: string) {
      const res = await stripe.subscriptions.list({ customer: cusId, status: "all", limit: 20 });
      return res.data;
    }

    let subs: Stripe.Subscription[] = [];
    if (customerId) subs = await listAllSubsForCustomer(customerId);

    // Fallback: if stored customer has no subs, try finding by email
    if ((!customerId || subs.length === 0) && email) {
      try {
        const found = await stripe.customers.search({
          query: `email:'${email.replace(/'/g, "\'")}'`,
          limit: 10,
        });

        const candidates = found.data
          .filter((c) => !("deleted" in c))
          .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

        for (const c of candidates) {
          const s = await listAllSubsForCustomer(c.id);
          if (s.length) {
            customerId = c.id;
            subs = s;
            // ensure customer has user_id metadata for future webhooks
            try {
              const metaUser = (c.metadata?.user_id || "").trim();
              if (!metaUser) await stripe.customers.update(c.id, { metadata: { user_id: userId } });
            } catch {}
            break;
          }
        }
      } catch {}
    }

    const best = pickBestSubscription(subs);
    if (!best) return NextResponse.json({ ok: true, status: "none" });

    const priceId = best.items.data[0]?.price?.id ?? null;

    // IMPORTANT: Only write columns that exist in your current table
    const upsertPayload: any = {
      user_id: userId,
      email,
      stripe_customer_id:
        customerId ||
        (typeof best.customer === "string" ? best.customer : (best.customer as any)?.id) ||
        null,
      stripe_subscription_id: best.id,
      status: best.status,
      price_id: priceId,
      current_period_start: best.current_period_start ? new Date(best.current_period_start * 1000).toISOString() : null,
      current_period_end: best.current_period_end ? new Date(best.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: !!best.cancel_at_period_end,
      cancel_at: (best as any).cancel_at ? new Date(((best as any).cancel_at as number) * 1000).toISOString() : null,
      canceled_at: (best as any).canceled_at ? new Date(((best as any).canceled_at as number) * 1000).toISOString() : null,
      ended_at: (best as any).ended_at ? new Date(((best as any).ended_at as number) * 1000).toISOString() : null,
      price_interval: recurring?.interval ?? null,
      price_interval_count: recurring?.interval_count ?? null,
    };

    const { error: upErr } = await admin.from("subscriptions").upsert(upsertPayload, { onConflict: "user_id" });

    if (upErr) {
      return NextResponse.json(
        { error: "Supabase upsert failed", detail: upErr.message, hint: upErr.hint, code: upErr.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, status: best.status, stripe_subscription_id: best.id, price_id: priceId });
  } catch (err: any) {
    return NextResponse.json({ error: "Sync failed", detail: err?.message ?? String(err) }, { status: 500 });
  }
}
