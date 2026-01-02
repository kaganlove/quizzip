import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-12-15.clover" as any,
});

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    "http://localhost:3000"
  );
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = data.user;
    const body = await req.json().catch(() => null);

    const priceId = body?.priceId;
    if (typeof priceId !== "string" || !priceId.startsWith("price_")) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }

    const email = user.email ?? undefined;

    let customerId: string | undefined;

    if (email) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      customerId = existing.data?.[0]?.id;
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    const baseUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/?checkout=success`,
      cancel_url: `${baseUrl}/?checkout=cancel`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        email: email ?? "",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          email: email ?? "",
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("create checkout session failed", err?.message || err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
