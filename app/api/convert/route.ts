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
    let s = obj.replace(/__QUIZZIP_IMAGE_TOKEN:([a-zA-Z0-9_-]+)__/g, (match, token) => {
      const dataUrl = imagesMap[token];
      return dataUrl ? dataUrl : match;
    });

    // Replace tokens like quizzip:QUIZZIP_IMAGE_3 with actual data URLs
    s = s.replace(/quizzip:(QUIZZIP_IMAGE_\d+)/g, (match, token) => {
      const dataUrl = imagesMap[token];
      return dataUrl ? dataUrl : match;
    });

    return s;
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

  if (error) {
    const msg = (error as any)?.message || String(error);
    if (msg.includes("public.credits") || msg.includes("credits")) {
      // credits table not present; credits system disabled
      return { ok: true, current: 0, newCredits: 0 };
    }
    throw error;
  }

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

    // UPDATED: accept either imagesMap OR images (array of {id,src})
    const imagesMap =
      body?.imagesMap && typeof body.imagesMap === "object"
        ? body.imagesMap
        : Array.isArray(body?.images)
          ? Object.fromEntries(
              body.images
                .filter((img: any) => img && typeof img.id === "string" && typeof img.src === "string")
                .map((img: any) => [img.id, img.src])
            )
          : null;

    mode = doReview ? "ai+review" : "ai";

    userId = await getUserIdFromRequest(req);
    email = await getUserEmailFromRequest(req);

    if (!raw || typeof raw !== "string") {
      return NextResponse.json({ error: "Missing raw quiz text." }, { status: 400 });
    }

    // Parse strict version for question count and explicit structure (best effort only)
    const strict = parseStrictQuizText(raw);
    const strictItems = strict.quiz?.items ?? [];
    questionCount = strictItems.length;

    // Do NOT hard fail if strict parser finds 0, because HTML input often fails strict parsing.

    // Cost model: 1 credit per conversion (regardless of question count for now)
    if (userId) {
      const { ok, current } = await decrementCredits(userId, 1);
      if (!ok) {
        return NextResponse.json({ error: "Not enough credits.", credits: current ?? 0 }, { status: 402 });
      }
    }

    // Convert using OpenAI (updated signature)
    const convert = await openAiConvertToJson({
      raw,
      mode: "convert",
    });

    model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    inputTokens = convert.usage?.input_tokens;
    outputTokens = convert.usage?.output_tokens;

    if (!convert?.data) {
      return NextResponse.json({ error: "Conversion failed." }, { status: 500 });
    }

    let final: any = convert.data;

    // Guard rails if the model returned string JSON instead of object
    if (typeof final === "string") {
      const parsed = safeJsonParse(final);
      if (parsed) final = parsed;
    }

    if (!final || typeof final !== "object") {
      return NextResponse.json({ error: "Invalid conversion output." }, { status: 500 });
    }

    // In some cases, wrap might exist
    if (final.quiz && typeof final.quiz === "object") {
      final = final.quiz;
    }

    // Normalize items key
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

    // Review pass when requested (updated signature, review expects JSON input)
    let reviewUsage = { input_tokens: 0, output_tokens: 0 };
    if (doReview) {
      const review = await openAiConvertToJson({
        raw: JSON.stringify(final),
        mode: "review",
      });
      if (review?.data) {
        final = review.data as any;
        reviewUsage = review.usage ?? reviewUsage;
      }
    }

    // If strict parsing detected items and count mismatched, do one cleanup review
    if (strictItems.length > 0 && final.items.length !== strictItems.length) {
      const review2 = await openAiConvertToJson({
        raw: JSON.stringify(final),
        mode: "review",
      });
      if (review2?.data) {
        final = review2.data as any;
        reviewUsage = {
          input_tokens: (reviewUsage?.input_tokens ?? 0) + (review2.usage?.input_tokens ?? 0),
          output_tokens: (reviewUsage?.output_tokens ?? 0) + (review2.usage?.output_tokens ?? 0),
        };
      }
    }

    // Detect whether the raw input contains explicit correct-answer markers.
    // If it does, we can safely preserve correct flags from AI conversion without "guessing".
    const rawText = String(raw ?? "");
    const rawHasExplicitCorrectMarkers =
      /\[\s*\*\s*\]/i.test(rawText) || // [*]
      /\[\s*x\s*\]/i.test(rawText) || // [x]
      /^\s*\*\s*\(?\s*[a-d]\s*[\)\.\:\-]/gim.test(rawText) || // *b) or *B.
      /<mark\b/i.test(rawText) || // <mark>...</mark>
      /background-color\s*:/i.test(rawText) || // inline highlight style
      /background\s*:/i.test(rawText) || // inline highlight style (Word often uses background:)
      /bgcolor\s*=/i.test(rawText) || // legacy html highlight
      /\(\s*correct\s*\)/i.test(rawText) || // (correct)
      /^\s*correct\s*(answer|answers)?\s*[:\-]/gim.test(rawText) || // Correct answer:
      /^\s*answer\s*[:\-]/gim.test(rawText); // Answer:

    // Do not guess correct answers.
    // Keep correct answers only when they were explicitly marked in the original strict parse.
    const explicitCorrectFlags = strict.quiz?.items?.map((it: any) =>
      Array.isArray(it?.choices) ? it.choices.some((c: any) => Boolean(c?.correct)) : false
    );

    const finalItems: any[] = Array.isArray(final?.items)
      ? final.items
      : Array.isArray(final?.questions)
        ? final.questions
        : [];

    for (let i = 0; i < finalItems.length; i++) {
      const keep = explicitCorrectFlags
        ? Boolean(explicitCorrectFlags[i])
        : rawHasExplicitCorrectMarkers;

      if (!keep) {
        finalItems[i].correctChoiceIds = [];
        if (Array.isArray(finalItems[i].choices)) {
          finalItems[i].choices = finalItems[i].choices.map((c: any) => ({ ...c, correct: false }));
        }
      }
    }

    if (Array.isArray(final?.items)) final.items = finalItems;
    if (Array.isArray(final?.questions)) final.questions = finalItems;

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

    // Validate after conversion. Accept promptText too.
    if (
      !Array.isArray(items) ||
      items.length < 1 ||
      !items.every(
        (it: any) =>
          it &&
          typeof it === "object" &&
          (typeof it.prompt === "string" ||
            typeof it.promptText === "string" ||
            typeof it.promptHtml === "string")
      )
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
