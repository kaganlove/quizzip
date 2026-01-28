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
    let s = obj.replace(/__QUIZZIP_IMAGE_TOKEN:([a-zA-Z0-9_-]+)__/g, (match, token) => {
      const dataUrl = imagesMap[token];
      return dataUrl ? dataUrl : match;
    });

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
  const { data, error } = await supabase
    .from("credits")
    .select("credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    const msg = (error as any)?.message || String(error);
    if (msg.includes("public.credits") || msg.includes("credits")) {
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
    console.error("Failed to log conversion", error);
  }
}

function stripHighlightMarkup(input: string) {
  if (!input) return input;
  let s = input;

  s = s.replace(/<mark\b[^>]*>/gi, "");
  s = s.replace(/<\/mark>/gi, "");

  s = s.replace(
    /style\s*=\s*"([^"]*)"/gi,
    (full, styleText) => {
      const cleaned = String(styleText)
        .replace(/background-color\s*:\s*[^;"]+;?/gi, "")
        .replace(/background\s*:\s*[^;"]+;?/gi, "")
        .replace(/mso-highlight\s*:\s*[^;"]+;?/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      if (!cleaned) return "";
      return `style="${cleaned}"`;
    }
  );

  s = s.replace(/\sbgcolor\s*=\s*"[^"]*"/gi, "");

  return s;
}

function hasHighlightMarkup(s: string) {
  const t = String(s ?? "");
  return (
    /<mark\b/i.test(t) ||
    /background-color\s*:/i.test(t) ||
    /mso-highlight\s*:/i.test(t) ||
    /bgcolor\s*=/i.test(t)
  );
}

function htmlToPlainText(raw: string) {
  return String(raw ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .trim();
}

function splitPlainIntoQuestionBlocks(plain: string) {
  const text = String(plain ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");

  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\(?\s*\d+\s*[\.\)\:\-]\s+/.test(lines[i])) starts.push(i);
  }
  if (starts.length === 0) return [];

  const blocks: string[] = [];
  for (let si = 0; si < starts.length; si++) {
    const start = starts[si];
    const end = si + 1 < starts.length ? starts[si + 1] : lines.length;
    const slice = lines.slice(start, end);

    while (slice.length && slice[0].trim() === "") slice.shift();
    while (slice.length && slice[slice.length - 1].trim() === "") slice.pop();

    blocks.push(slice.join("\n"));
  }
  return blocks;
}

function blockHasExplicitCorrectMarker(block: string) {
  const b = String(block ?? "");

  if (/\[\s*\*\s*\]/i.test(b)) return true;
  if (/\[\s*x\s*\]/i.test(b)) return true;
  if (/^\s*\*\s*\(?\s*[a-d]\s*[\)\.\:\-]/gim.test(b)) return true;
  if (/\(\s*correct\s*\)/i.test(b)) return true;
  if (/(^|\n)\s*correct\s*(answer|answers)?(?:\s*\([^)]*\))?\s*[:=\-]/gim.test(b)) return true;
  if (/(^|\n)\s*answer(?:\s*\([^)]*\))?\s*[:=\-]/gim.test(b)) return true;

  if (/the\s+correct\s+answer\s+is\s+choice\s+[a-d]/i.test(b)) return true;

  return false;
}

function parseAnswerKeyMap(plain: string): Record<number, string[]> {
  const text = String(plain ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lower = text.toLowerCase();

  let start = lower.indexOf("answer key");
  if (start < 0) start = lower.indexOf("answer keys");
  if (start < 0) return {};

  const tail = text.slice(start);
  const lines = tail.split("\n");

  const map: Record<number, string[]> = {};

  for (const ln of lines) {
    const line = ln.trim();
    if (!line) continue;

    const m = line.match(/^\s*(\d{1,4})\s*[\.\)\:\-]\s*([A-D](?:\s*,\s*[A-D])*)\b/i);
    if (!m) continue;

    const n = Number(m[1]);
    if (!Number.isFinite(n)) continue;

    const lettersRaw = String(m[2] ?? "");
    const letters = lettersRaw
      .split(",")
      .map((x) => x.trim().toUpperCase())
      .filter((x) => /^[A-D]$/.test(x));

    if (letters.length) map[n] = Array.from(new Set(letters));
  }

  return map;
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

    const strict = parseStrictQuizText(raw);
    const strictItems = strict.quiz?.items ?? [];
    questionCount = strictItems.length;

    const plain = htmlToPlainText(raw);
    const plainBlocks = splitPlainIntoQuestionBlocks(plain);
    const blockEvidence = plainBlocks.map((b) => blockHasExplicitCorrectMarker(b));

    const strictEvidence = strictItems.map((it: any) =>
      Array.isArray(it?.choices) ? it.choices.some((c: any) => Boolean(c?.correct)) : false
    );

    const answerKeyMap = parseAnswerKeyMap(plain);

    if (userId) {
      const { ok, current } = await decrementCredits(userId, 1);
      if (!ok) {
        return NextResponse.json({ error: "Not enough credits.", credits: current ?? 0 }, { status: 402 });
      }
    }

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

    if (typeof final === "string") {
      const parsed = safeJsonParse(final);
      if (parsed) final = parsed;
    }

    if (!final || typeof final !== "object") {
      return NextResponse.json({ error: "Invalid conversion output." }, { status: 500 });
    }

    if (final.quiz && typeof final.quiz === "object") {
      final = final.quiz;
    }

    if (!Array.isArray(final.items) && Array.isArray(final.questions)) {
      final.items = final.questions;
      delete (final as any).questions;
    }

    if (!Array.isArray(final.items)) {
      return NextResponse.json({ error: "Conversion output missing items." }, { status: 500 });
    }

    if (!final.title || typeof final.title !== "string") {
      final.title = clientTitle || "Converted Quiz";
    }

    // FIX: keep reviewUsage as numbers so TS stays happy
    let reviewUsage: { input_tokens: number; output_tokens: number } = { input_tokens: 0, output_tokens: 0 };

    if (doReview) {
      const review = await openAiConvertToJson({
        raw: JSON.stringify(final),
        mode: "review",
      });

      if (review?.data) {
        final = review.data as any;

        reviewUsage = {
          input_tokens: review.usage?.input_tokens ?? reviewUsage.input_tokens,
          output_tokens: review.usage?.output_tokens ?? reviewUsage.output_tokens,
        };
      }
    }

    if (clientTitle) {
      final.title = clientTitle;
    }

    if (imagesMap && Object.keys(imagesMap).length > 0) {
      final = deepReplaceImageTokens(final, imagesMap);
    }

    const finalItems: any[] = Array.isArray(final?.items) ? final.items : [];
    questionCount = finalItems.length;

    for (let i = 0; i < finalItems.length; i++) {
      const it = finalItems[i];
      if (!it || typeof it !== "object") continue;

      const hasStrict = Boolean(strictEvidence[i]);
      const hasBlock = Boolean(blockEvidence[i]);

      const choicesArr: any[] = Array.isArray(it.choices) ? it.choices : [];
      const highlightHits: string[] = [];

      for (let c = 0; c < choicesArr.length; c++) {
        const ch = choicesArr[c];
        const html = String(ch?.html ?? ch?.text ?? "");
        if (hasHighlightMarkup(html)) {
          highlightHits.push(String(ch?.id ?? ""));
        }

        if (typeof ch?.html === "string") ch.html = stripHighlightMarkup(ch.html);
        if (typeof ch?.text === "string") ch.text = stripHighlightMarkup(ch.text);
      }

      if (typeof it.promptHtml === "string") it.promptHtml = stripHighlightMarkup(it.promptHtml);
      if (typeof it.promptText === "string") it.promptText = stripHighlightMarkup(it.promptText);
      if (typeof it.prompt === "string") it.prompt = stripHighlightMarkup(it.prompt);

      const hasChoiceHighlight = highlightHits.length > 0;

      const keyLetters = answerKeyMap[i + 1] ?? [];
      const hasAnswerKey = Array.isArray(keyLetters) && keyLetters.length > 0;

      const keepCorrect = hasStrict || hasBlock || hasChoiceHighlight || hasAnswerKey;

      if (hasChoiceHighlight) {
        const unique = Array.from(new Set(highlightHits.filter(Boolean)));
        it.correctChoiceIds = unique;

        if (Array.isArray(it.choices)) {
          it.choices = it.choices.map((c: any) => ({
            ...c,
            correct: unique.includes(String(c?.id ?? "")),
          }));
        }
      } else if (hasAnswerKey) {
        const currentIds: string[] = Array.isArray(it.correctChoiceIds)
          ? it.correctChoiceIds.map((x: any) => String(x))
          : [];

        if (!currentIds.length) {
          const ids = keyLetters.map((L) => String(L).toUpperCase()).filter((L) => /^[A-D]$/.test(L));
          it.correctChoiceIds = ids;

          if (Array.isArray(it.choices)) {
            it.choices = it.choices.map((c: any) => ({
              ...c,
              correct: ids.includes(String(c?.id ?? "").toUpperCase()),
            }));
          }
        }
      }

      if (!keepCorrect) {
        it.correctChoiceIds = [];
        if (Array.isArray(it.choices)) {
          it.choices = it.choices.map((c: any) => ({ ...c, correct: false }));
        }
      }
    }

    if (
      !Array.isArray(finalItems) ||
      finalItems.length < 1 ||
      !finalItems.every(
        (it: any) =>
          it &&
          typeof it === "object" &&
          (typeof it.prompt === "string" || typeof it.promptText === "string" || typeof it.promptHtml === "string")
      )
    ) {
      return NextResponse.json({ error: "Invalid question items in conversion output." }, { status: 500 });
    }

    const zip = await buildQtiZip(final);

    const finishedAt = toIso(new Date());

    await logConversion({
      userId,
      email,
      questionCount,
      mode,
      inputTokens: (inputTokens ?? 0) + (reviewUsage.input_tokens ?? 0),
      outputTokens: (outputTokens ?? 0) + (reviewUsage.output_tokens ?? 0),
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
