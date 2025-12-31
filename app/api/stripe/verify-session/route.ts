import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ ok: false, error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "Missing session_id" }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const paid = session.payment_status === "paid";
  return NextResponse.json({
    ok: true,
    paid,
    session_id: session.id,
    payment_status: session.payment_status,
  });
}
