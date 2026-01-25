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

function extractAnswerKey(lines: string[]): {
  answerLetter: string | null;
  answerTf: "true" | "false" | null;
  rest: string[];
} {
  // Accept lines like:
  // Answer: C
  // Correct answer: b
  // Correct: D
  // Key = A
  // Answer: True
  const keyRe = /^\s*(?:answer|correct(?:\s*answer)?|key)\s*[:=\-]\s*(.+?)\s*$/i;

  let answerLetter: string | null = null;
  let answerTf: "true" | "false" | null = null;

  const rest: string[] = [];

  for (const ln of lines) {
    const m = ln.match(keyRe);

    // Only remove the line if we successfully parse a key
    if (m && !answerLetter && !answerTf) {
      const raw = (m[1] ?? "").trim();

      if (/^(true|false)$/i.test(raw)) {
        answerTf = raw.toLowerCase() as "true" | "false";
        continue;
      }

      const m1 = raw.toUpperCase().match(/\b([A-D])\b/);
      const m2 = raw.toUpperCase().match(/^\(?\s*([A-D])\s*\)?(?:[)\.])?/);

      const letter = (m1?.[1] ?? m2?.[1] ?? "").trim();
      if (letter) {
        answerLetter = letter;
        continue;
      }
    }

    rest.push(ln);
  }

  return { answerLetter, answerTf, rest };
}

function parseBracketMulti(lines: string[], promptText: string, answerLetter: string | null): ParsedItem | null {
  // Bracketed choices:
  // [ ] Option
  // [*] Option
  const optionRe = /^\s*\[(\*?)\]\s+(.*\S)\s*$/;

  const choices: ParsedChoice[] = [];
  for (const ln of lines) {
    const m = ln.match(optionRe);
    if (!m) return null;
    choices.push({ text: m[2], correct: Boolean(m[1]) });
  }

  let correctCount = choices.filter((c) => c.correct).length;

  // If none are marked, allow explicit Answer: C key, still no guessing
  if (correctCount === 0) {
    if (answerLetter) {
      const idx = answerLetter.charCodeAt(0) - 65;
      if (idx >= 0 && idx < choices.length) {
        choices[idx].correct = true;
        correctCount = 1;
      }
    }
    return { type: "multiple_choice_single", promptText, choices };
  }

  // If more than one marked, treat as multiple answers
  if (correctCount > 1) {
    return { type: "multiple_choice_multiple", promptText, choices };
  }

  // Exactly one marked, treat as single answer multiple choice
  return { type: "multiple_choice_single", promptText, choices };
}

function parseStarredAlphaChoices(
  lines: string[],
  promptText: string,
  answerLetter: string | null,
  answerTf: "true" | "false" | null
): ParsedItem | null {
  // Multiple choice single and True or False
  // a) 1
  // *b) 2
  const re = /^\s*(\*)?\s*([a-z])\)\s+(.*\S)\s*$/i;

  const choices: ParsedChoice[] = [];
  for (const ln of lines) {
    // True or False special case
    const tf = ln.trim();
    if (/^\*?\s*(true|false)\s*$/i.test(tf)) {
      const isCorrect = /^\*/.test(tf);
      const text = tf.replace(/^\*\s*/, "");
      choices.push({ text, correct: isCorrect });
      continue;
    }

    const m = ln.match(re);
    if (!m) return null;
    choices.push({ text: m[3], correct: Boolean(m[1]) });
  }

  let correctCount = choices.filter((c) => c.correct).length;

  // If none are marked, allow explicit Answer key, still no guessing
  if (correctCount === 0) {
    if (answerTf) {
      const hit = choices.find((c) => c.text.trim().toLowerCase() === answerTf);
      if (hit) {
        hit.correct = true;
        correctCount = 1;
      }
    } else if (answerLetter) {
      const idx = answerLetter.charCodeAt(0) - 65;
      if (idx >= 0 && idx < choices.length) {
        choices[idx].correct = true;
        correctCount = 1;
      }
    }

    const isTf = choices.length === 2 && choices.every((c) => /^(true|false)$/i.test(c.text.trim()));
    return { type: isTf ? "true_false" : "multiple_choice_single", promptText, choices };
  }

  // If more than one is marked, treat as multiple answers
  if (correctCount > 1) {
    return { type: "multiple_choice_multiple", promptText, choices };
  }

  // Exactly one marked, treat as single answer multiple choice or TF
  const isTf = choices.length === 2 && choices.every((c) => /^(true|false)$/i.test(c.text.trim()));
  return { type: isTf ? "true_false" : "multiple_choice_single", promptText, choices };
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
  const { answerLetter, answerTf, rest } = extractAnswerKey(restRaw);

  const ef = parseEssayOrFile(rest, promptFirstLine);
  if (ef) return ef;

  const multi = parseBracketMulti(rest, promptFirstLine, answerLetter);
  if (multi) return multi;

  const mc = parseStarredAlphaChoices(rest, promptFirstLine, answerLetter, answerTf);
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
