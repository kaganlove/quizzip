export type ConvertMode = "convert" | "review";

export type ConvertResult = {
  title?: string;
  items?: any[];
  quiz?: any;
};

export type ConvertUsage = {
  input_tokens?: number;
  output_tokens?: number;
};

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function extractOutputText(resp: any): string {
  // Responses API: best effort extraction
  if (typeof resp?.output_text === "string" && resp.output_text.trim()) return resp.output_text;

  const out = resp?.output;
  if (Array.isArray(out)) {
    for (const item of out) {
      const content = item?.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          if (c?.type === "output_text" && typeof c?.text === "string" && c.text.trim()) {
            return c.text;
          }
        }
      }
    }
  }

  return "";
}

function stripCodeFences(s: string) {
  let out = (s ?? "").trim();
  // ```json ... ``` or ``` ... ```
  out = out.replace(/^```\s*json\s*/i, "```");
  if (out.startsWith("```")) {
    out = out.replace(/^```\s*/i, "");
    out = out.replace(/```\s*$/i, "");
  }
  return out.trim();
}

function coerceJsonFromText(text: string): any | null {
  const raw = stripCodeFences(text);

  // 1) Direct parse
  try {
    return JSON.parse(raw);
  } catch {
    // continue
  }

  // 2) Try to extract the first JSON object span
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const slice = raw.slice(first, last + 1);

    // Common “almost JSON” cleanup: trailing commas
    const cleaned = slice.replace(/,\s*([}\]])/g, "$1");

    try {
      return JSON.parse(cleaned);
    } catch {
      // continue
    }
  }

  return null;
}

function coerceUsage(u: any): ConvertUsage | undefined {
  if (!u || typeof u !== "object") return undefined;

  const input_tokens =
    typeof u?.input_tokens === "number"
      ? u.input_tokens
      : typeof u?.prompt_tokens === "number"
        ? u.prompt_tokens
        : undefined;

  const output_tokens =
    typeof u?.output_tokens === "number"
      ? u.output_tokens
      : typeof u?.completion_tokens === "number"
        ? u.completion_tokens
        : undefined;

  if (input_tokens == null && output_tokens == null) return undefined;
  return { input_tokens, output_tokens };
}

export async function openAiConvertToJson(args: { raw: string; mode: ConvertMode }) {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const system = [
    "You convert question content into a strict JSON object for Canvas QTI export.",
    "Return only JSON. No markdown. No commentary.",
    "Prefer faithful transcription over rewriting.",
    "Allowed types: multiple_choice_single, multiple_choice_multiple, true_false, short_answer, essay, file_upload.",
    "",
    "HTML and images rules (critical):",
    "1) The input may contain HTML tags. Preserve HTML exactly when it appears.",
    "2) Images may appear as <img> tags with src like quizzip:QUIZZIP_IMAGE_1. Keep these <img> tags.",
    "3) Keep img attributes, especially src, exactly as provided. Do not remove quizzip: tokens.",
    "4) Do not invent new image tokens. Do not rename them.",
    "5) Output raw HTML inside JSON strings. Do not escape tags into entities.",
    "6) Preserve span class attributes exactly when present (for example ql-bg-yellow).",
    "",
    "Interpret these common authoring conventions:",
    "1) Multiple choice single: a) b) c) lines, exactly one correct marked with a leading asterisk like *c). When a choice is marked correct, remove the asterisk from the choice text.",
    "2) Multiple answers: [ ] incorrect and [*] correct.",
    "3) Short answer: correct answers are lines that start with an asterisk followed by a space, like * Santa.",
    "4) Essay: a line of #### indicates essay.",
    "5) File upload: a line of ^^^^ indicates file upload.",
    "6) True or False: must be a) True and b) False, with asterisk on the correct one. When marked correct, remove the asterisk from the choice text.",
    "",
    "7) If a question block contains a line like 'Correct: B (12)' or 'Correct: A' or 'Correct: C, D', treat that as explicit and mark the matching choice letters as correct.",
    "8) If a question block says 'Correct: (none)' then leave all choices correct:false.",
    "9) If there is an 'Answer Key' section at the end with numbered entries like '1. B (12)', use it to set correct answers for the corresponding question number when the question itself does not include a correct marker.",
    "",
    "Correct answer rules:",
    "A) Never guess or infer a correct answer from general knowledge, semantics, probability, or context.",
    "B) Only mark a choice as correct when the input explicitly denotes it.",
    "C) Explicit denotations include: a leading asterisk before the option label, bracket markers like [*] or [x], or highlight markup on the option text such as <mark>...</mark>, a span with a background-color or background style, OR Quill highlight classes like <span class=\"ql-bg-yellow\">...</span>.",
    "D) If no explicit denotation is present for a question, leave all choices with correct:false and do not invent a correctText.",
  ].join("\n");

  const schemaHint = [
    "Return JSON with shape:",
    "{",
    '  "title": "optional quiz title",',
    '  "items": [',
    "    {",
    '      "type": "multiple_choice_single|multiple_choice_multiple|true_false|short_answer|essay|file_upload",',
    '      "promptHtml": "string",',
    '      "choices": [{"text":"string","correct":true|false}] (only for choice based types),',
    '      "correctText": "string (optional, for short answer alternatives or essay guidance)"',
    "    }",
    "  ]",
    "}",
  ].join("\n");

  const instruction =
    args.mode === "review"
      ? [
          "Review the provided JSON items for correctness. Fix obvious mistakes.",
          "Keep any HTML and any <img> tags exactly. Do not remove or alter them.",
          "If you see img src values like quizzip:QUIZZIP_IMAGE_1, keep them exactly as is.",
          "Return JSON only.",
        ].join("\n")
      : [
          "Extract questions from the raw input into the JSON shape.",
          "If the raw input contains HTML or <img> tags, preserve them exactly in the output fields.",
          "If you see img src values like quizzip:QUIZZIP_IMAGE_1, keep them exactly as is.",
          "Return JSON only.",
        ].join("\n");

  const input = [
    { role: "system", content: system + "\n\n" + schemaHint },
    { role: "user", content: instruction + "\n\nRAW:\n" + args.raw },
  ];

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input,
      // Many questions + HTML can exceed 2k tokens and truncation breaks JSON.
      max_output_tokens: 6000,
      text: { format: { type: "json_object" } },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const json = await res.json();

  const textOut = extractOutputText(json);
  if (!textOut) {
    const status = json?.status ? ` status=${json.status}` : "";
    throw new Error(`OpenAI returned no text output.${status}`);
  }

  const parsed = coerceJsonFromText(textOut);
  if (!parsed) throw new Error("OpenAI did not return valid JSON");

  const data = parsed as ConvertResult;
  const usage = coerceUsage(json?.usage);

  return { data, usage };
}
