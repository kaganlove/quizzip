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

type ParsedChoice = { text: string; correct?: boolean };

export type ParsedQuiz = {
  title?: string;
  items: ParsedItem[];
};

function normLines(raw: string) {
  return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function stripNumPrefix(line: string) {
  // Accept: 12. , 12) , (12) , 12: , 12 -
  return line.replace(/^\s*\(?\s*\d+\s*[\.\)\:\-]\s+/, "").trim();
}

function isBlank(line: string) {
  return line.trim().length === 0;
}

function looksLikeQuestionStart(line: string) {
  // Accept: 12. , 12) , (12) , 12: , 12 -
  return /^\s*\(?\s*\d+\s*[\.\)\:\-]\s+/.test(line);
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

    while (slice.length && isBlank(slice[0])) slice.shift();
    while (slice.length && isBlank(slice[slice.length - 1])) slice.pop();

    blocks.push(slice.join("\n"));
  }
  return blocks;
}

/**
 * Removes markers/labels from choice text so the UI doesn't show things like:
 * "* B. Process" or "B) 12" or "[*] A) Foo"
 */
function stripChoiceLabel(text: string) {
  let s = (text ?? "").trim();

  // Remove leading bracket markers like [*] [x] [ ]
  s = s.replace(/^\s*\[\s*[\*xX]?\s*\]\s*/i, "");

  // Remove leading "*" marker
  s = s.replace(/^\s*\*\s*/, "");

  // Remove leading labels like A) a) A. a. A: A - (A)
  s = s.replace(/^\s*(?:\(?\s*[A-Da-d]\s*\)?\s*[\)\.\:\-]\s+)/, "");

  // Remove leading numeric labels like 1) 1. 1: 1 -
  s = s.replace(/^\s*(?:\d+\s*[\)\.\:\-]\s+)/, "");

  return s.trim();
}

function extractLettersFromAnswerText(raw: string): string[] {
  const s = (raw ?? "").toString();

  // Explicit "option b" patterns
  const opt = Array.from(s.matchAll(/\boption\s*([A-D])\b/gi)).map((m) => (m[1] ?? "").toUpperCase());
  if (opt.length) return Array.from(new Set(opt));

  // Standalone letters A-D
  const letters = Array.from(s.matchAll(/\b([A-D])\b/gi)).map((m) => (m[1] ?? "").toUpperCase());
  if (letters.length) return Array.from(new Set(letters));

  // Embedded "a)" / "b." / etc
  const letters2 = Array.from(s.matchAll(/\b([A-D])\s*[\)\.]/gi)).map((m) => (m[1] ?? "").toUpperCase());
  return Array.from(new Set(letters2));
}

type AnswerDirective = { letters: string[]; text: string | null; remaining: string[] };

/**
 * Pulls out answer-key style lines so they don't get treated as choices.
 * Supports:
 * - "Correct answers: a, b, c"
 * - "Correct = ... (option b)"
 * - "Correct C"
 * - "Answer: A"
 * - "Correct answer: a) (embedded vs linked images)"
 * - "Answer (text): Technician A only"
 * Also handles the "T / F / TRUE" pattern by treating the last TRUE/FALSE line as an answer key.
 */
function extractAnswerDirectives(lines: string[]): AnswerDirective {
  let answerLetters: string[] = [];
  let answerText: string | null = null;

  // Detect TF blocks where the last line is the answer key (example: T, F, TRUE)
  let skipTfAnswerIndex: number | null = null;
  const nonBlankIdxs = lines.map((l, i) => ({ l, i })).filter((x) => !isBlank(x.l));
  if (nonBlankIdxs.length >= 3) {
    const a = nonBlankIdxs[0].l.trim();
    const b = nonBlankIdxs[1].l.trim();
    const last = nonBlankIdxs[nonBlankIdxs.length - 1].l.trim();

    const isTfToken = (t: string) => /^(\*?\s*)?(true|false|t|f)\s*$/i.test(t);
    const isTrueFalseWord = (t: string) => /^(true|false)$/i.test(t.trim());
    const isStarred = (t: string) => /^\*/.test(t.trim());

    if (isTfToken(a) && isTfToken(b) && isTrueFalseWord(last) && !isStarred(last)) {
      answerText = last; // apply by text match later
      skipTfAnswerIndex = nonBlankIdxs[nonBlankIdxs.length - 1].i; // remove from choices
    }
  }

  const remaining: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const t = (ln ?? "").trim();
    if (!t) continue;

    if (skipTfAnswerIndex !== null && i === skipTfAnswerIndex) {
      continue;
    }

    // "Correct answers:" / "Correct answer:" / "Answer:" / "Answers:" / "Answer (text):"
    const m1 = t.match(
      /^\s*(?:correct\s*answers?|correct\s*answer|answers?|answer)\s*(?:\(text\))?\s*[:=]\s*(.+)$/i
    );
    if (m1) {
      const payload = (m1[1] ?? "").trim();
      const letters = extractLettersFromAnswerText(payload);
      if (letters.length) answerLetters = Array.from(new Set([...answerLetters, ...letters]));
      else answerText = payload;
      continue;
    }

    // "Correct C"
    const m2 = t.match(/^\s*correct\s+([A-D])\s*$/i);
    if (m2) {
      answerLetters = Array.from(new Set([...answerLetters, (m2[1] ?? "").toUpperCase()]));
      continue;
    }

    // "Answer A"
    const m3 = t.match(/^\s*answer\s+([A-D])\s*$/i);
    if (m3) {
      answerLetters = Array.from(new Set([...answerLetters, (m3[1] ?? "").toUpperCase()]));
      continue;
    }

    // "The correct answer is choice C." / "Correct answer is B" (no colon)
    const m4 = t.match(/^\s*(?:the\s+)?correct\s*(?:answer\s*)?(?:is\s*)?(?:choice\s*)?(.+)\s*$/i);
    if (m4 && /^\s*(?:the\s+)?correct\b/i.test(t) && !/^\s*correct\s*$/i.test(t)) {
      const payload = (m4[1] ?? "").trim();
      // Avoid grabbing the whole line when it's just "correct" (handled above)
      const letters = extractLettersFromAnswerText(payload);
      if (letters.length) answerLetters = Array.from(new Set([...answerLetters, ...letters]));
      else if (payload && payload.toLowerCase() !== "answer") answerText = payload;
      continue;
    }

    remaining.push(ln);
  }

  return { letters: answerLetters, text: answerText, remaining };
}

function applyAnswerDirectiveToChoices(choices: ParsedChoice[], letters: string[], text: string | null) {
  if (!choices.length) return choices;

  const out = choices.map((c) => ({ ...c }));

  // Apply letter based keys (A=0, B=1, ...)
  if (letters.length) {
    for (const L of letters) {
      const idx = L.charCodeAt(0) - 65;
      if (idx >= 0 && idx < out.length) out[idx].correct = true;
    }
  }

  // Apply text based keys (match against stripped choice text)
  if (text) {
    const target = stripChoiceLabel(text).toLowerCase();
    if (target) {
      for (const c of out) {
        const ct = stripChoiceLabel(c.text).toLowerCase();
        if (ct === target) c.correct = true;
      }
    }
  }

  return out;
}

function parseBracketMulti(
  lines: string[],
  promptText: string,
  answerLetters: string[],
  answerText: string | null
): ParsedItem | null {
  // Bracketed choices:
  // [ ] Option
  // [*] Option
  // [x] Option
  const optionRe = /^\s*\[\s*([\*xX]?)\s*\]\s+(.*\S)\s*$/;

  const choices: ParsedChoice[] = [];
  for (const ln of lines) {
    const m = ln.match(optionRe);
    if (!m) return null;
    choices.push({ text: stripChoiceLabel(m[2]), correct: Boolean(m[1]) });
  }

  const applied = applyAnswerDirectiveToChoices(choices, answerLetters, answerText);
  const correctCount = applied.filter((c) => c.correct).length;

  if (correctCount === 0) {
    return { type: "multiple_choice_single", promptText, choices: applied };
  }
  if (correctCount > 1) {
    return { type: "multiple_choice_multiple", promptText, choices: applied };
  }
  return { type: "multiple_choice_single", promptText, choices: applied };
}

function parseStarredAlphaChoices(
  lines: string[],
  promptText: string,
  answerLetters: string[],
  answerText: string | null
): ParsedItem | null {
  // Accepts:
  // a) 1
  // *b) 2
  // A. 1
  // * B. 2
  // A: 1
  // A - 1
  const re = /^\s*(\*)?\s*([a-d])\s*[\)\.\:\-]\s+(.*\S)\s*$/i;

  const choices: ParsedChoice[] = [];
  for (const ln of lines) {
    const tfRaw = ln.trim();

    // True/False (allow T/F as well)
    if (/^\*?\s*(true|false|t|f)\s*$/i.test(tfRaw)) {
      const isCorrect = /^\*/.test(tfRaw);
      const val = tfRaw.replace(/^\*\s*/i, "").trim();
      const text =
        /^t$/i.test(val) ? "True" : /^f$/i.test(val) ? "False" : val[0].toUpperCase() + val.slice(1).toLowerCase();
      choices.push({ text, correct: isCorrect });
      continue;
    }

    const m = ln.match(re);
    if (!m) return null;
    choices.push({ text: stripChoiceLabel(m[3]), correct: Boolean(m[1]) });
  }

  const applied = applyAnswerDirectiveToChoices(choices, answerLetters, answerText);
  const correctCount = applied.filter((c) => c.correct).length;

  if (correctCount === 0) {
    const isTf = applied.length === 2 && applied.every((c) => /^(true|false)$/i.test(c.text.trim()));
    return { type: isTf ? "true_false" : "multiple_choice_single", promptText, choices: applied };
  }

  if (correctCount > 1) {
    return { type: "multiple_choice_multiple", promptText, choices: applied };
  }

  const isTf = applied.length === 2 && applied.every((c) => /^(true|false)$/i.test(c.text.trim()));
  return { type: isTf ? "true_false" : "multiple_choice_single", promptText, choices: applied };
}

function parseShortAnswer(lines: string[], promptText: string): ParsedItem | null {
  const re = /^\s*\*\s+(.*\S)\s*$/;

  const answers: string[] = [];
  for (const line of lines) {
    const m = re.exec(line);
    if (!m) continue;

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
  const hasEssayMarker = lines.some((l) => /^\s*#{3,4}\s*$/.test(l));
  if (hasEssayMarker) {
    return { type: "essay", promptText };
  }

  const hasFileMarker = lines.some((l) => /^\s*\^{3,4}\s*$/.test(l));
  if (hasFileMarker) {
    return { type: "file_upload", promptText };
  }

  return null;
}

function parseOneBlock(block: string): ParsedItem | null {
  const lines = normLines(block).split("\n");

  const first = lines[0] ?? "";
  if (!looksLikeQuestionStart(first)) return null;

  const promptFirstLine = stripNumPrefix(first);
  const restRaw = lines.slice(1).filter((l) => !isBlank(l));

  // NEW: pull out answer keys like "Correct answers: a, b, c" so they don't become choices
  const extracted = extractAnswerDirectives(restRaw);
  const rest = extracted.remaining;

  const ef = parseEssayOrFile(rest, promptFirstLine);
  if (ef) return ef;

  const multi = parseBracketMulti(rest, promptFirstLine, extracted.letters, extracted.text);
  if (multi) return multi;

  const mc = parseStarredAlphaChoices(rest, promptFirstLine, extracted.letters, extracted.text);
  if (mc) return mc;

  const sa = parseShortAnswer(rest, promptFirstLine);
  if (sa) return sa;

  // Minimal fallback: keep the question instead of dropping it.
  // This preserves things like matching/table questions (ex: your Question 6).
  const combined = [promptFirstLine, ...rest].join("\n").trim();
  return { type: "essay", promptText: combined };
}

export function parseStrictQuizText(raw: string): { quiz: ParsedQuiz | null; reason?: string } {
  const blocks = splitIntoQuestionBlocks(raw);
  if (!blocks.length) return { quiz: null, reason: "No question blocks found." };

  const items: ParsedItem[] = [];
  for (const b of blocks) {
    const it = parseOneBlock(b);
    if (!it) return { quiz: null, reason: "One or more blocks did not match strict formatting." };
    items.push(it);
  }

  return { quiz: { items } };
}
