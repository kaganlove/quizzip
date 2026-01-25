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

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

function deepReplaceImageTokens(obj: any, imagesMap: Record<string, string>): any {
  if (obj == null) return obj;

  if (typeof obj === "string") {
    // Replace any tokens like __QUIZZIP_IMAGE_TOKEN:abc123__ with actual data URLs
    return obj.replace(/__QUIZZIP_IMAGE_TOKEN:([a-zA-Z0-9_-]+)__/g, (match, token) => {
      const dataUrl = imagesMap[token];
      return dataUrl ? dataUrl : match;
    });
  }

  if (Array.isArray(obj)) {
    return obj.map((v) => deepReplaceImageTokens(v, imagesMap));
  }

  if (typeof obj === "object") {
    const out: any = {};
    for (const k of Object.keys(obj)) {
      out[k] = deepReplaceImageTokens(obj[k], imagesMap);
    }
    return out;
  }

  return obj;
}

function toIso(dt: Date) {
  return dt.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

async function getUserIdFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

async function getUserEmailFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

async function decrementCredits(userId: string, amount: number) {
  // credits table: user_id, credits
  const { data, error } = await supabase
    .from("credits")
    .select("credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  const current = data?.credits ?? 0;
  if (current < amount) {
    return { ok: false, current };
  }

  const newCredits = current - amount;

  const { error: updateError } = await supabase
    .from("credits")
    .upsert({ user_id: userId, credits: newCredits }, { onConflict: "user_id" });

  if (updateError) throw updateError;

  return { ok: true, current, newCredits };
}

async function logConversion(params: {
  userId: string | null;
  email: string | null;
  questionCount: number;
  mode: string;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
  startedAt: string;
  finishedAt: string;
  error?: string | null;
}) {
  // conversion_logs table: user_id, email, question_count, mode, input_tokens, output_tokens, model, started_at, finished_at, error
  const { error } = await supabase.from("conversion_logs").insert({
    user_id: params.userId,
    email: params.email,
    question_count: params.questionCount,
    mode: params.mode,
    input_tokens: params.inputTokens ?? null,
    output_tokens: params.outputTokens ?? null,
    model: params.model ?? null,
    started_at: params.startedAt,
    finished_at: params.finishedAt,
    error: params.error ?? null,
  });

  if (error) {
    // do not throw, logging should not break conversion
    console.error("Failed to log conversion", error);
  }
}

export async function POST(req: Request) {
  const startedAt = toIso(new Date());

  let userId: string | null = null;
  let email: string | null = null;
  let questionCount = 0;
  let mode = "unknown";
  let model: string | undefined;
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  try {
    const body = await req.json().catch(() => ({}));
    const raw = body?.raw;

    const doReview = Boolean(body?.do_review) || body?.mode === "ai+review";
    const clientTitle = typeof body?.title === "string" ? body.title.trim() : "";
    const imagesMap = (body?.imagesMap && typeof body.imagesMap === "object") ? body.imagesMap : null;

    mode = doReview ? "ai+review" : "ai";

    userId = await getUserIdFromRequest(req);
    email = await getUserEmailFromRequest(req);

    if (!raw || typeof raw !== "string") {
      return NextResponse.json({ error: "Missing raw quiz text." }, { status: 400 });
    }

    // Parse strict version for question count and explicit structure
    const strict = parseStrictQuizText(raw);

    const strictItems = strict.quiz?.items ?? [];
    questionCount = strictItems.length;

    if (!questionCount || questionCount < 1) {
      return NextResponse.json({ error: "No questions detected in input." }, { status: 400 });
    }

    // Cost model: 1 credit per conversion (regardless of question count for now)
    if (userId) {
      const { ok, current } = await decrementCredits(userId, 1);
      if (!ok) {
        return NextResponse.json(
          { error: "Not enough credits.", credits: current ?? 0 },
          { status: 402 }
        );
      }
    }

    // Convert using OpenAI
    const convert = await openAiConvertToJson(raw, { doReview });

    model = convert.model;
    inputTokens = convert.usage?.input_tokens;
    outputTokens = convert.usage?.output_tokens;

    if (!convert?.data) {
      return NextResponse.json({ error: "Conversion failed." }, { status: 500 });
    }

    // If doReview was requested, convert.data already should be the reviewed JSON
    // But openAiConvertToJson returns review results in data if doReview is enabled.
    // We will still double-check for validity.
    let final = convert.data;

    // Some guard rails if the model returned string JSON instead of object
    if (typeof final === "string") {
      const parsed = safeJsonParse(final);
      if (parsed) final = parsed;
    }

    if (!final || typeof final !== "object") {
      return NextResponse.json({ error: "Invalid conversion output." }, { status: 500 });
    }

    // In some cases, openAiConvertToJson returns `quiz` wrapper.
    if (final.quiz && typeof final.quiz === "object") {
      final = final.quiz;
    }

    // If we have a strict parse, we can enforce the item count if needed.
    // The model sometimes outputs questions under `questions` key.
    if (!Array.isArray(final.items) && Array.isArray(final.questions)) {
      final.items = final.questions;
      delete (final as any).questions;
    }

    if (!Array.isArray(final.items)) {
      return NextResponse.json({ error: "Conversion output missing items." }, { status: 500 });
    }

    // Ensure title exists
    if (!final.title || typeof final.title !== "string") {
      final.title = clientTitle || "Converted Quiz";
    }

    // Attempt one more review pass if requested and we detect problems
    let reviewUsage = { input_tokens: 0, output_tokens: 0 };
    if (doReview) {
      // openAiConvertToJson already performed review, but if we detect it didn't fix,
      // we can optionally add another pass. Keeping this placeholder.
      // For now, do nothing.
    }

    // If the model returned a mismatched item count, do a review pass.
    // (This is a soft guard and can be adjusted later.)
    if (final.items.length !== strictItems.length) {
      const review = await openAiConvertToJson(raw, { doReview: true, forceReview: true });
      if (review?.data) {
        final = review.data;
        reviewUsage = review.usage ?? reviewUsage;
      }
    }

    // Safety guard: do not allow correct answers unless the raw input contains explicit denotations.
    // This prevents guessing while still allowing correct answers when the user marked them.
    const rawText = String(raw ?? "");
    const rawHasExplicitCorrectMarkers =
      /\[\s*\*\s*\]/i.test(rawText) || // [*]
      /\[\s*x\s*\]/i.test(rawText) || // [x]
      /^\s*\*\s*\(?\s*[a-d]\s*[\)\.\:\-]/gim.test(rawText) || // *b) or *B.
      /<mark\b/i.test(rawText) || // <mark>...</mark>
      /background-color\s*:/i.test(rawText) || // inline highlight style
      /\(\s*correct\s*\)/i.test(rawText) || // (correct)
      /^\s*correct\s*(answer|answers)?\s*[:\-]/gim.test(rawText) || // Correct answer:
      /^\s*answer\s*[:\-]/gim.test(rawText); // Answer:

    if (!rawHasExplicitCorrectMarkers) {
      const finalItems: any[] = Array.isArray(final?.items)
        ? final.items
        : Array.isArray(final?.questions)
          ? final.questions
          : [];

      for (let i = 0; i < finalItems.length; i++) {
        finalItems[i].correctChoiceIds = [];
        if (Array.isArray(finalItems[i].choices)) {
          finalItems[i].choices = finalItems[i].choices.map((c: any) => ({ ...c, correct: false }));
        }
      }

      if (Array.isArray(final?.items)) final.items = finalItems;
      if (Array.isArray(final?.questions)) final.questions = finalItems;
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
    questionCount = items.length;

    if (
      !Array.isArray(items) ||
      items.length < 1 ||
      !items.every((it: any) => it && typeof it === "object" && typeof it.prompt === "string")
    ) {
      return NextResponse.json({ error: "Invalid question items in conversion output." }, { status: 500 });
    }

    // Build QTI zip
    const zip = await buildQtiZip(final);

    const finishedAt = toIso(new Date());

    // Log conversion
    await logConversion({
      userId,
      email,
      questionCount,
      mode,
      inputTokens: (inputTokens ?? 0) + (reviewUsage?.input_tokens ?? 0),
      outputTokens: (outputTokens ?? 0) + (reviewUsage?.output_tokens ?? 0),
      model,
      startedAt,
      finishedAt,
      error: null,
    });

    return new NextResponse(zip, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="quizzip_export.zip"',
      },
    });
  } catch (err: any) {
    const finishedAt = toIso(new Date());
    const message = err?.message || "Unknown error";

    await logConversion({
      userId,
      email,
      questionCount,
      mode,
      inputTokens,
      outputTokens,
      model,
      startedAt,
      finishedAt,
      error: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
