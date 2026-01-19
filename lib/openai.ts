type OpenAiUsage = { input_tokens: number; output_tokens: number };

export type ConvertResult = {
  items: Array<{
    type:
      | "multiple_choice_single"
      | "multiple_choice_multiple"
      | "true_false"
      | "short_answer"
      | "essay"
      | "file_upload";
    promptText: string;
    choices?: Array<{ text: string; correct?: boolean }>;
    correctText?: string;
  }>;
  title?: string;
};

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function coerceUsage(u: any): OpenAiUsage {
  return {
    input_tokens: Number(u?.input_tokens ?? 0),
    output_tokens: Number(u?.output_tokens ?? 0),
  };
}

function extractOutputText(resp: any): string {
  if (typeof resp?.output_text === "string" && resp.output_text.trim()) return resp.output_text;

  const out = resp?.output;
  if (!Array.isArray(out)) return "";

  for (const item of out) {
    const content = item?.content;
    if (!Array.isArray(content)) continue;

    const c1 = content.find((c: any) => c?.type === "output_text" && typeof c?.text === "string" && c.text.trim());
    if (c1?.text) return c1.text;

    const c2 = content.find((c: any) => c?.type === "text" && typeof c?.text === "string" && c.text.trim());
    if (c2?.text) return c2.text;
  }

  return "";
}

export async function openAiConvertToJson(args: {
  raw: string;
  mode: "convert" | "review";
}): Promise<{ data: ConvertResult; usage: OpenAiUsage }> {
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
    "",
    "Interpret these common authoring conventions:",
    "1) Multiple choice single: a) b) c) lines, exactly one correct marked with a leading asterisk like *c).",
    "2) Multiple answers: [ ] incorrect and [*] correct.",
    "3) Short answer: correct answers are lines that start with an asterisk followed by a space, like * Santa.",
    "4) Essay: a line of #### indicates essay.",
    "5) File upload: a line of ^^^^ indicates file upload.",
    "6) True/False: must be a) True and b) False, with asterisk on the correct one.",
  ].join("\n");

  const schemaHint = [
    "JSON shape:",
    "{",
    '  "title": "optional quiz title",',
    '  "items": [',
    "    {",
    '      "type": "multiple_choice_single|multiple_choice_multiple|true_false|short_answer|essay|file_upload",',
    '      "promptText": "string",',
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
      max_output_tokens: 2000,
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

  let data: ConvertResult;
  try {
    data = JSON.parse(textOut);
  } catch {
    throw new Error("OpenAI did not return valid JSON");
  }

  const usage = coerceUsage(json?.usage);
  return { data, usage };
}
