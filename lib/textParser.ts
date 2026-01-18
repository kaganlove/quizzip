export type ParsedItem = {
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
};

export type ParsedQuiz = {
  title?: string;
  items: ParsedItem[];
};

function normLines(raw: string) {
  return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function stripNumPrefix(line: string) {
  return line.replace(/^\s*\d+\.\s+/, "").trim();
}

function isBlank(line: string) {
  return line.trim().length === 0;
}

function looksLikeQuestionStart(line: string) {
  return /^\s*\d+\.\s+/.test(line);
}

function splitIntoQuestionBlocks(raw: string) {
  const text = normLines(raw);
  const lines = text.split("\n");

  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (looksLikeQuestionStart(lines[i])) starts.push(i);
  }

  if (starts.length === 0) return [];

  const blocks: string[] = [];
  for (let si = 0; si < starts.length; si++) {
    const start = starts[si];
    const end = si + 1 < starts.length ? starts[si + 1] : lines.length;
    const slice = lines.slice(start, end);

    // Trim leading/trailing blank lines inside the block
    while (slice.length && isBlank(slice[0])) slice.shift();
    while (slice.length && isBlank(slice[slice.length - 1])) slice.pop();

    blocks.push(slice.join("\n"));
  }
  return blocks;
}

function parseBracketMulti(lines: string[], promptText: string): ParsedItem | null {
  // Multiple answers format:
  // [ ] Option
  // [*] Option
  const optionRe = /^\s*\[(\*?)\]\s+(.*\S)\s*$/;

  const choices: Array<{ text: string; correct?: boolean }> = [];
  let found = false;

  for (const line of lines) {
    const m = optionRe.exec(line);
    if (!m) continue;
    found = true;
    const correct = m[1] === "*";
    const text = m[2].trim();
    choices.push({ text, correct });
  }

  if (!found || choices.length < 2) return null;

  return {
    type: "multiple_choice_multiple",
    promptText,
    choices,
  };
}

function parseStarredAlphaChoices(lines: string[], promptText: string): ParsedItem | null {
  // Multiple choice single and True/False
  // a) 1
  // *b) 2
  const re = /^\s*(\*)?\s*([a-z])\)\s+(.*\S)\s*$/i;

  const parsed: Array<{ letter: string; text: string; correct: boolean }> = [];
  for (const line of lines) {
    const m = re.exec(line);
    if (!m) continue;
    parsed.push({
      letter: m[2].toLowerCase(),
      text: m[3].trim(),
      correct: Boolean(m[1]),
    });
  }

  if (parsed.length < 2) return null;

  // Check if this is True/False specifically
  if (parsed.length === 2) {
    const a = parsed[0].text.toLowerCase();
    const b = parsed[1].text.toLowerCase();
    const isTF =
      (a === "true" && b === "false") || (a === "false" && b === "true");

    if (isTF) {
      const choices = [
        { text: "True", correct: parsed.find(p => p.text.toLowerCase() === "true")?.correct ?? false },
        { text: "False", correct: parsed.find(p => p.text.toLowerCase() === "false")?.correct ?? false },
      ];

      // If neither is marked, do not guess. Fail so OpenAI can handle.
      if (!choices.some(c => c.correct)) return null;

      return {
        type: "true_false",
        promptText,
        choices,
      };
    }
  }

  // Multiple choice single
  const choices = parsed
    .sort((x, y) => x.letter.localeCompare(y.letter))
    .map(p => ({ text: p.text, correct: p.correct }));

  // Must have exactly one correct for single choice
  const correctCount = choices.filter(c => c.correct).length;
  if (correctCount !== 1) return null;

  return {
    type: "multiple_choice_single",
    promptText,
    choices,
  };
}

function parseShortAnswer(lines: string[], promptText: string): ParsedItem | null {
  // Short answer format:
  // * Santa
  // * Santa Claus
  const re = /^\s*\*\s+(.*\S)\s*$/;

  const answers: string[] = [];
  for (const line of lines) {
    const m = re.exec(line);
    if (!m) continue;

    // Avoid confusing with *c) style by rejecting if it looks like "*a) ..."
    if (/^\s*[a-z]\)\s+/i.test(m[1])) continue;

    answers.push(m[1].trim());
  }

  if (answers.length === 0) return null;

  return {
    type: "short_answer",
    promptText,
    correctText: answers.join("\n"),
  };
}

function parseEssayOrFile(lines: string[], promptText: string): ParsedItem | null {
  const hasEssayMarker = lines.some(l => /^\s*#{3,4}\s*$/.test(l));
  if (hasEssayMarker) {
    return { type: "essay", promptText };
  }

  const hasFileMarker = lines.some(l => /^\s*\^{3,4}\s*$/.test(l));
  if (hasFileMarker) {
    return { type: "file_upload", promptText };
  }

  return null;
}

function parseOneBlock(block: string): ParsedItem | null {
  const lines = normLines(block).split("\n");

  const first = lines[0] ?? "";
  if (!looksLikeQuestionStart(first)) return null;

  const promptText = stripNumPrefix(first);
  const rest = lines.slice(1).filter(l => !isBlank(l));

  // Essay / file upload markers can appear anywhere in the block
  const ef = parseEssayOrFile(rest, promptText);
  if (ef) return ef;

  // Multiple answers bracket format
  const multi = parseBracketMulti(rest, promptText);
  if (multi) return multi;

  // True/False or single choice
  const mc = parseStarredAlphaChoices(rest, promptText);
  if (mc) return mc;

  // Short answer
  const sa = parseShortAnswer(rest, promptText);
  if (sa) return sa;

  return null;
}

export function parseStrictQuizText(raw: string): { quiz: ParsedQuiz | null; reason?: string } {
  const blocks = splitIntoQuestionBlocks(raw);
  if (blocks.length === 0) return { quiz: null, reason: "No numbered questions found." };

  const items: ParsedItem[] = [];
  for (const b of blocks) {
    const parsed = parseOneBlock(b);
    if (!parsed) {
      return { quiz: null, reason: "At least one question did not match the strict formats." };
    }
    items.push(parsed);
  }

  return { quiz: { items }, reason: undefined };
}
