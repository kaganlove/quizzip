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
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    const t = auth.slice(7).trim();
    if (t) return t;
  }

  const t = body?.access_token || body?.accessToken || body?.token;
  if (typeof t === "string" && t.trim()) return t.trim();
  return null;
}

function buildImageMap(images: any): Record<string, string> {
  const map: Record<string, string> = {};
  if (!Array.isArray(images)) return map;

  for (const it of images) {
    const id = typeof it?.id === "string" ? it.id.trim() : "";
    const src = typeof it?.src === "string" ? it.src.trim() : "";
    if (!id || !src) continue;
    map[id] = src;
  }
  return map;
}

function replaceImageTokensInString(s: string, map: Record<string, string>): string {
  if (!s) return s;
  return s.replace(/quizzip:(QUIZZIP_IMAGE_\d+)/g, (_m, id) => {
    const repl = map[id];
    return repl ? repl : _m;
  });
}

function deepReplaceImageTokens<T>(obj: T, map: Record<string, string>): T {
  if (!obj) return obj;

  if (typeof obj === "string") {
    return replaceImageTokensInString(obj, map) as any;
  }

  if (Array.isArray(obj)) {
    return obj.map((v) => deepReplaceImageTokens(v, map)) as any;
  }

  if (typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj as any)) {
      out[k] = deepReplaceImageTokens(v as any, map);
    }
    return out;
  }

  return obj;
}

function normalizeTitle(input: any): string {
  if (typeof input !== "string") return "";
  let t = input.trim();
  if (!t) return "";
  t = t.replace(/[\u0000-\u001F\u007F]/g, ""); // remove control chars
  t = t.replace(/\s+/g, " ").trim();
  return t.slice(0, 120);
}

function safeFilenameBase(input: string) {
  let s = (input || "").trim();
  if (!s) s = "Canvas Import";
  s = s.replace(/[\\/:*?"<>|]/g, "_");
  s = s.replace(/\s+/g, " ").trim();
  if (!s) s = "Canvas Import";
  return s.slice(0, 120);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = body?.raw;

    const doReview = Boolean(body?.do_review) || body?.mode === "review";

    const accessToken = extractAccessToken(req, body);
    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token. Please log in again and retry." }, { status: 401 });
    }

    if (!raw || typeof raw !== "string" || raw.trim().length < 3) {
      return NextResponse.json({ error: "Missing input" }, { status: 400 });
    }

    const clientTitle = normalizeTitle(body?.title);
    const imagesMap = buildImageMap(body?.images);

    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid session. Please log out and log back in." }, { status: 401 });
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

    // 1) Try strict local parsing first
    const strict = parseStrictQuizText(raw);

    let final: any;
    let convertUsage = { input_tokens: 0, output_tokens: 0 };
    let reviewUsage = { input_tokens: 0, output_tokens: 0 };

    if (strict.quiz) {
      final = strict.quiz;
    } else {
      const convert = await openAiConvertToJson({ raw, mode: "convert" });
      final = convert.data;
      convertUsage = convert.usage ?? convertUsage;
    }

    if (doReview) {
      const review = await openAiConvertToJson({ raw: JSON.stringify(final), mode: "review" });
      final = review.data;
      reviewUsage = review.usage ?? reviewUsage;
    }

    // Apply client chosen title last so it always wins
    if (clientTitle) {
      final.title = clientTitle;
    }

    // Restore any quizzip image tokens to real data URLs before generating QTI
    if (imagesMap && Object.keys(imagesMap).length > 0) {
      final = deepReplaceImageTokens(final, imagesMap);
    }

    const items = final.items ?? [];
    const questionCount = items.length;

    if (questionCount <= 0) {
      return NextResponse.json({ error: "No questions detected." }, { status: 400 });
    }

    if (usedQuestions + questionCount > maxQuestions) {
      return NextResponse.json({ error: "This job would exceed your monthly limit" }, { status: 429 });
    }

    const title = (final.title || "Canvas Import").toString();
    const zipBytes = await buildQtiZip({title, items});

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

    const base = safeFilenameBase(clientTitle || title);
    const suffix = doReview ? "_review" : "";

    return new NextResponse(zipBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${base}${suffix}.zip"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Convert failed" }, { status: 500 });
  }
}
