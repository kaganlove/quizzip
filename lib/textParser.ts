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

function extractAnswerLetters(line: string): string[] {
  const s = (line ?? "").trim();
  if (!s) return [];

  // Common patterns we support:
  // "Correct: C", "Correct C (14)", "Answer: A"
  // "Correct answers: a, b, c"
  // "Correct = .zip (option b)"
  const m = s.match(/^(?:correct\s*answers?|correct\s*answer|correct|answer)\s*[:=]?\s*(.+)$/i);
  const tail = (m ? m[1] : s).trim();

  const found: string[] = [];

  // Prefer explicit "option X" if present
  for (const opt of tail.matchAll(/\boption\s*([a-d])\b/gi)) {
    found.push((opt[1] ?? "").toUpperCase());
  }

  // Otherwise pick single letter tokens A to D
  for (const mm of tail.matchAll(/\b([a-d])\b/gi)) {
    found.push((mm[1] ?? "").toUpperCase());
  }

  // De dupe
  return Array.from(new Set(found)).filter((x) => /^[A-D]$/.test(x));
}

function extractTrueFalseAnswer(line: string): "true" | "false" | null {
  const s = (line ?? "").trim();
  if (!s) return null;

  const m = s.match(/^(?:correct|answer)\s*[:=]?\s*(true|false)\b/i);
  if (!m) return null;
  return m[1].toLowerCase() === "true" ? "true" : "false";
}

function looksLikeAnswerKeyLine(line: string) {
  return /^(?:\s*(?:correct\s*answers?|correct\s*answer|correct|answer)\b)/i.test(line ?? "");
}

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

function stripChoiceLabel(text: string) {
  const s = (text ?? "").trim();

  // Remove common leading choice labels from the captured text
  // Example: "B. Process" or "b) Process" or "(C): Process"
  return s.replace(/^\s*\(?\s*[A-D]\s*[\)\.\:\-]\s+/i, "").trim();
}

function parseBracketMulti(lines: string[], promptText: string): ParsedItem | null {
  // Bracketed choices:
  // [ ] Option
  // [*] Option
  const optionRe = /^\s*\[(\*?)\]\s+(.*\S)\s*$/;

  const choices: ParsedChoice[] = [];
  let answerLetters: string[] = [];
  let tfAnswer: "true" | "false" | null = null;

  for (const ln of lines) {
    // Allow answer key lines inside the block (ex: "Correct: C")
    if (looksLikeAnswerKeyLine(ln)) {
      answerLetters = answerLetters.length ? answerLetters : extractAnswerLetters(ln);
      tfAnswer = tfAnswer ?? extractTrueFalseAnswer(ln);
      continue;
    }

    const m = ln.match(optionRe);
    if (!m) return null;
    choices.push({ text: m[2], correct: Boolean(m[1]) });
  }

  // If none are marked in brackets, use an explicit answer key line if present
  if (choices.every((c) => !c.correct)) {
    if (tfAnswer) {
      for (const c of choices) {
        if (c.text.trim().toLowerCase() === tfAnswer) c.correct = true;
      }
    } else if (answerLetters.length) {
      for (const L of answerLetters) {
        const idx = L.charCodeAt(0) - 65; // A = 0
        if (idx >= 0 && idx < choices.length) choices[idx].correct = true;
      }
    }
  }

  const correctCount = choices.filter((c) => c.correct).length;

  // If none are marked, keep the question but leave correct blank
  if (correctCount === 0) {
    return { type: "multiple_choice_single", promptText, choices };
  }

  // If more than one marked, treat as multiple answers
  if (correctCount > 1) {
    return { type: "multiple_choice_multiple", promptText, choices };
  }

  // Exactly one marked, treat as single answer multiple choice
  return { type: "multiple_choice_single", promptText, choices };
}

function parseStarredAlphaChoices(lines: string[], promptText: string): ParsedItem | null {
  // Multiple choice single and True or False
  // a) 1
  // *b) 2
  // Also allow: "B. Text", "* B. Text", "(A): Text", "A - Text"
  const re = /^\s*(\*)?\s*\(?\s*([a-d])\s*[\)\.\:\-]\s+(.*\S)\s*$/i;

  const choices: ParsedChoice[] = [];
  let answerLetters: string[] = [];
  let tfAnswer: "true" | "false" | null = null;

  for (const ln of lines) {
    // Allow answer key lines inside the block (ex: "Correct answers: a, c")
    if (looksLikeAnswerKeyLine(ln)) {
      if (!answerLetters.length) answerLetters = extractAnswerLetters(ln);
      tfAnswer = tfAnswer ?? extractTrueFalseAnswer(ln);
      continue;
    }

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

    const text = stripChoiceLabel(m[3]);
    const isCorrect =
      Boolean(m[1]) ||
      /^\s*\[\s*\*\s*\]\s*/.test(ln) ||
      /\(\s*correct\s*\)$/i.test(ln) ||
      /\s+-\s*correct\s*$/i.test(ln) ||
      /\s+correct\s*$/i.test(ln) ||
      /\s+\u2713\s*$/i.test(ln);

    choices.push({ text, correct: isCorrect });
  }

  // If no inline markers were found, use an explicit answer key line if present
  if (choices.every((c) => !c.correct)) {
    if (tfAnswer) {
      for (const c of choices) {
        if (c.text.trim().toLowerCase() === tfAnswer) c.correct = true;
      }
    } else if (answerLetters.length) {
      for (const L of answerLetters) {
        const idx = L.charCodeAt(0) - 65; // A = 0
        if (idx >= 0 && idx < choices.length) choices[idx].correct = true;
      }
    }
  }

  const correctCount = choices.filter((c) => c.correct).length;

  // If none are marked, keep the question but leave correct blank
  if (correctCount === 0) {
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
  const rest = lines.slice(1).filter((l) => !isBlank(l));

  const ef = parseEssayOrFile(rest, promptFirstLine);
  if (ef) return ef;

  const multi = parseBracketMulti(rest, promptFirstLine);
  if (multi) return multi;

  const mc = parseStarredAlphaChoices(rest, promptFirstLine);
  if (mc) return mc;

  const sa = parseShortAnswer(rest, promptFirstLine);
  if (sa) return sa;

  // Minimal fallback: keep the question instead of dropping it.
  // This preserves things like matching or table questions (ex: your Question 6).
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
