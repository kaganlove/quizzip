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

  // Responses API usage shape can vary; normalize lightly
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

  const system =
    "You are QuizZip, a converter that outputs strictly valid JSON only. No markdown. No commentary.";

  const schemaHint =
    "Return JSON with shape { title: string, items: Array<{ type: string, promptHtml: string, choices?: Array<{ id: string, text: string }>, correctChoiceIds?: string[] }> }. " +
    "All strings must be valid JSON strings (escape quotes as needed).";

  const instruction =
    args.mode === "review"
      ? "Review and clean the provided quiz JSON. Keep structure. Only return JSON."
      : "Convert the RAW quiz text into the required JSON shape. Only use explicit correct-answer markers; do not guess. Only return JSON.";

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
      // Larger outputs (many questions + HTML) can exceed 2k tokens and get truncated, which breaks JSON.
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
