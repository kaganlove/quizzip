import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { openAiConvertToJson } from "../../../lib/openai";
import { buildQtiZip } from "../../../lib/qtiWrite";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function monthStartUtc(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const access_token = body?.access_token;
    const raw = body?.raw;
    const doReview = Boolean(body?.do_review);

    if (!access_token || typeof access_token !== "string") {
      return NextResponse.json({ error: "Missing access token" }, { status: 401 });
    }
    if (!raw || typeof raw !== "string" || raw.trim().length < 3) {
      return NextResponse.json({ error: "Missing input" }, { status: 400 });
    }

    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(access_token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = userData.user.id;

    const { data: subRow } = await supabase.from("subscriptions").select("status").eq("user_id", userId).maybeSingle();

    const status = (subRow as any)?.status ?? "";
    const isPaid = status === "active" || status === "trialing";
    if (!isPaid) {
      return NextResponse.json({ error: "Subscription required" }, { status: 402 });
    }

    const periodStart = monthStartUtc();
    const periodKey = periodStart.toISOString().slice(0, 10);

    const { data: usageRow } = await supabase
      .from("conversion_usage")
      .select("questions_converted, review_passes, input_tokens, output_tokens")
      .eq("user_id", userId)
      .eq("period_start", periodKey)
      .maybeSingle();

    const usedQuestions = (usageRow as any)?.questions_converted ?? 0;
    const usedReviews = (usageRow as any)?.review_passes ?? 0;

    const maxQuestions = 1000;
    const maxReviews = 1;

    if (usedQuestions >= maxQuestions) {
      return NextResponse.json({ error: "Monthly question limit reached" }, { status: 429 });
    }
    if (doReview && usedReviews >= maxReviews) {
      return NextResponse.json({ error: "Monthly review limit reached" }, { status: 429 });
    }

    const convert = await openAiConvertToJson({ raw, mode: "convert" });

    let final = convert.data;
    let reviewUsage = { input_tokens: 0, output_tokens: 0 };

    if (doReview) {
      const review = await openAiConvertToJson({ raw: JSON.stringify(convert.data), mode: "review" });
      final = review.data;
      reviewUsage = review.usage;
    }

    const items = final.items ?? [];
    const questionCount = items.length;

    if (usedQuestions + questionCount > maxQuestions) {
      return NextResponse.json({ error: "This job would exceed your monthly limit" }, { status: 429 });
    }

    const zipBytes = await buildQtiZip(final.title || "Quiz", items);

    const inputTokens = convert.usage.input_tokens + reviewUsage.input_tokens;
    const outputTokens = convert.usage.output_tokens + reviewUsage.output_tokens;

    await supabase.from("conversion_usage").upsert(
      {
        user_id: userId,
        period_start: periodKey,
        questions_converted: usedQuestions + questionCount,
        review_passes: usedReviews + (doReview ? 1 : 0),
        input_tokens: ((usageRow as any)?.input_tokens ?? 0) + inputTokens,
        output_tokens: ((usageRow as any)?.output_tokens ?? 0) + outputTokens,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,period_start" }
    );

    return new NextResponse(zipBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="canvas_qti.zip"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Convert failed" }, { status: 500 });
  }
}
