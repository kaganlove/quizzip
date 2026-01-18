import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { openAiConvertToJson } from "../../../lib/openai";
import { buildQtiZip } from "../../../lib/qtiWrite";
import { parseStrictQuizText } from "../../../lib/textParser";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function monthStartUtc(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function extractAccessToken(req: Request, body: any) {
  // 1) Authorization header: "Bearer <token>"
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    const t = auth.slice(7).trim();
    if (t) return t;
  }

  // 2) JSON body fallbacks
  const t =
    body?.access_token ||
    body?.accessToken ||
    body?.token;

  if (typeof t === "string" && t.trim()) return t.trim();
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = body?.raw;
    const doReview = Boolean(body?.do_review);

    const accessToken = extractAccessToken(req, body);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing access token. Please log in again and retry." },
        { status: 401 }
      );
    }

    if (!raw || typeof raw !== "string" || raw.trim().length < 3) {
      return NextResponse.json({ error: "Missing input" }, { status: 400 });
    }

    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { error: "Invalid session. Please log out and log back in." },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

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

    // 1) Try strict local parsing first
    const strict = parseStrictQuizText(raw);

    let final: any;
    let convertUsage = { input_tokens: 0, output_tokens: 0 };
    let reviewUsage = { input_tokens: 0, output_tokens: 0 };

    if (strict.quiz) {
      final = strict.quiz;
    } else {
      // 2) Fall back to OpenAI when input is not in strict formats
      const convert = await openAiConvertToJson({ raw, mode: "convert" });
      final = convert.data;
      convertUsage = convert.usage ?? convertUsage;
    }

    // Optional review pass (even for strict parsed content)
    if (doReview) {
      const review = await openAiConvertToJson({ raw: JSON.stringify(final), mode: "review" });
      final = review.data;
      reviewUsage = review.usage ?? reviewUsage;
    }

    const items = final.items ?? [];
    const questionCount = items.length;

    if (questionCount <= 0) {
      return NextResponse.json({ error: "No questions detected." }, { status: 400 });
    }

    if (usedQuestions + questionCount > maxQuestions) {
      return NextResponse.json({ error: "This job would exceed your monthly limit" }, { status: 429 });
    }

    const zipBytes = await buildQtiZip(final.title || "Quiz", items);

    const inputTokens = (convertUsage.input_tokens ?? 0) + (reviewUsage.input_tokens ?? 0);
    const outputTokens = (convertUsage.output_tokens ?? 0) + (reviewUsage.output_tokens ?? 0);

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
