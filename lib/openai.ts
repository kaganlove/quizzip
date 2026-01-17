type OpenAiUsage = { input_tokens: number; output_tokens: number };

export type ConvertResult = {
  items: Array<{
    type: "multiple_choice_single" | "multiple_choice_multiple" | "true_false" | "short_answer" | "essay";
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

    // Most common: { type: "output_text", text: "..." }
    const c1 = content.find((c: any) => c?.type === "output_text" && typeof c?.text === "string" && c.text.trim());
    if (c1?.text) return c1.text;

    // Some variants: { type: "text", text: "..." }
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

  // Use an env override if you want, otherwise default to a very reliable model for text+json.
  // You can set OPENAI_MODEL in Vercel env vars later.
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const system = [
    "You are converting questions into a strict JSON object for Canvas QTI export.",
    "Return only JSON. No markdown. No commentary.",
    "If you are unsure, make the best structured guess and keep text faithful.",
    "Types allowed: multiple_choice_single, multiple_choice_multiple, true_false, short_answer, essay.",
  ].join("\n");

  const schemaHint = [
    "JSON shape:",
    "{",
    '  "title": "optional quiz title",',
    '  "items": [',
    "    {",
    '      "type": "multiple_choice_single|multiple_choice_multiple|true_false|short_answer|essay",',
    '      "promptText": "string",',
    '      "choices": [{"text":"string","correct":true|false}] (only for choice based types),',
    '      "correctText": "string (optional for short answer or essay guidance)"',
    "    }",
    "  ]",
    "}",
  ].join("\n");

  const instruction =
    args.mode === "review"
      ? "Review the provided JSON items for correctness. Fix obvious mistakes, ensure correct flags match the prompt. Return JSON only."
      : "Extract questions from the raw input into the JSON shape. Return JSON only.";

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

      // Force JSON mode so the model must return valid JSON text.
      // (This makes parsing far more consistent.)
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
    // Helpful for debugging without dumping the whole response
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
