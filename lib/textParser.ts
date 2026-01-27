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

function lineHasHighlight(s: string) {
  const t = String(s || "");
  return (
    /<mark\b/i.test(t) ||
    /bgcolor\s*=/i.test(t) ||
    /background-color\s*:/i.test(t) ||
    /background\s*:/i.test(t) ||
    /mso-highlight\s*:/i.test(t)
  );
}

function looksLikeAnswerKeyLine(line: string) {
  return /^(?:\s*(?:correct\s*answers?|correct\s*answer|correct|answer)\b)/i.test(line ?? "");
}

function extractAnswerTail(line: string): string | null {
  const s = (line ?? "").trim();
  if (!s) return null;

  const m = s.match(/^(?:correct\s*answers?|correct\s*answer|correct|answer)\s*[:=]?\s*(.+)$/i);
  if (!m) return null;

  return String(m[1] ?? "").trim() || null;
}

function extractAnswerLetters(line: string): string[] {
  const tail = extractAnswerTail(line);
  if (!tail) return [];

  const compact = tail.replace(/\s+/g, " ").trim();

  const lettersOnly =
    /^(?:[a-d])(?:\s*(?:,|and|&)\s*(?:[a-d]))*$/i.test(compact) ||
    /^(?:option\s*[a-d])(?:\s*(?:,|and|&)\s*option\s*[a-d])*$/i.test(compact);

  if (!lettersOnly) return [];

  const found: string[] = [];

  for (const opt of compact.matchAll(/\boption\s*([a-d])\b/gi)) {
    found.push((opt[1] ?? "").toUpperCase());
  }

  for (const mm of compact.matchAll(/\b([a-d])\b/gi)) {
    found.push((mm[1] ?? "").toUpperCase());
  }

  return Array.from(new Set(found)).filter((x) => /^[A-D]$/.test(x));
}

function extractAnswerText(line: string): string | null {
  const tail = extractAnswerTail(line);
  if (!tail) return null;

  if (/^\s*(?:[a-d])(?:\s*(?:,|and|&)\s*(?:[a-d]))*\s*$/i.test(tail)) return null;
  if (/^\s*(?:option\s*[a-d])(?:\s*(?:,|and|&)\s*option\s*[a-d])*\s*$/i.test(tail)) return null;

  const cleaned = tail.replace(/^\((?:text|exact)\)\s*:\s*/i, "").trim();
  return cleaned || null;
}

function extractTrueFalseAnswer(line: string): "true" | "false" | null {
  const tail = extractAnswerTail(line);
  if (!tail) return null;

  const m = tail.match(/\b(true|false)\b/i);
  if (!m) return null;

  return m[1].toLowerCase() === "true" ? "true" : "false";
}

function normLines(raw: string) {
  return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function isBlank(line: string) {
  return line.trim().length === 0;
}

function looksLikeQuestionStart(line: string) {
  return /^\s*\(?\s*\d+\s*[\.\)\:\-]\s+/.test(line);
}

function stripNumPrefix(line: string) {
  return line.replace(/^\s*\(?\s*\d+\s*[\.\)\:\-]\s+/, "").trim();
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
  return s.replace(/^\s*\(?\s*[A-D]\s*[\)\.\:\-]\s+/i, "").trim();
}

function looksIgnorableLine(line: string) {
  const s = (line ?? "").trim();
  if (!s) return true;
  return /^(section\b|directions\b|note\b)/i.test(s);
}

function applyAnswerTextToChoices(choices: ParsedChoice[], answerText: string | null) {
  if (!answerText) return;

  const target = answerText.trim().toLowerCase();
  if (!target) return;

  for (const c of choices) {
    const ct = String(c.text ?? "").trim().toLowerCase();
    if (!ct) continue;

    if (ct === target) {
      c.correct = true;
      continue;
    }

    if (ct.includes(target) || target.includes(ct)) {
      c.correct = true;
    }
  }
}

function parseBracketMulti(lines: string[], promptText: string): ParsedItem | null {
  const optionRe = /^\s*\[(\*?)\]\s+(.*\S)\s*$/;

  const choices: ParsedChoice[] = [];
  let answerLetters: string[] = [];
  let answerText: string | null = null;
  let tfAnswer: "true" | "false" | null = null;

  for (const ln of lines) {
    if (looksLikeAnswerKeyLine(ln)) {
      if (!answerLetters.length) answerLetters = extractAnswerLetters(ln);
      if (!answerText) answerText = extractAnswerText(ln);
      tfAnswer = tfAnswer ?? extractTrueFalseAnswer(ln);
      continue;
    }

    if (looksIgnorableLine(ln) && choices.length >= 2) continue;

    const m = ln.match(optionRe);
    if (!m) return null;

    const choiceText = m[2];
    const isCorrect = Boolean(m[1]) || lineHasHighlight(ln) || lineHasHighlight(choiceText);

    choices.push({ text: choiceText, correct: isCorrect });
  }

  if (choices.every((c) => !c.correct)) {
    if (tfAnswer) {
      for (const c of choices) {
        if (c.text.trim().toLowerCase() === tfAnswer) c.correct = true;
      }
    } else if (answerLetters.length) {
      for (const L of answerLetters) {
        const idx = L.charCodeAt(0) - 65;
        if (idx >= 0 && idx < choices.length) choices[idx].correct = true;
      }
    } else {
      applyAnswerTextToChoices(choices, answerText);
    }
  }

  const correctCount = choices.filter((c) => c.correct).length;

  if (correctCount === 0) return { type: "multiple_choice_single", promptText, choices };
  if (correctCount > 1) return { type: "multiple_choice_multiple", promptText, choices };
  return { type: "multiple_choice_single", promptText, choices };
}

function parseStarredAlphaChoices(lines: string[], promptText: string): ParsedItem | null {
  const re = /^\s*(\*)?\s*\(?\s*([a-d])\s*[\)\.\:\-]\s+(.*\S)\s*$/i;

  const choices: ParsedChoice[] = [];
  let answerLetters: string[] = [];
  let answerText: string | null = null;
  let tfAnswer: "true" | "false" | null = null;

  for (const ln of lines) {
    if (looksLikeAnswerKeyLine(ln)) {
      if (!answerLetters.length) answerLetters = extractAnswerLetters(ln);
      if (!answerText) answerText = extractAnswerText(ln);
      tfAnswer = tfAnswer ?? extractTrueFalseAnswer(ln);
      continue;
    }

    if (looksIgnorableLine(ln) && choices.length >= 2) continue;

    const tf = ln.trim();
    if (/^\*?\s*(true|false)\s*$/i.test(tf)) {
      const isCorrect = /^\*/.test(tf) || lineHasHighlight(ln);
      const text = tf.replace(/^\*\s*/, "");
      choices.push({ text, correct: isCorrect });
      continue;
    }

    const m = ln.match(re);
    if (!m) return null;

    const text = stripChoiceLabel(m[3]);

    const isCorrect =
      Boolean(m[1]) ||
      lineHasHighlight(ln) ||
      lineHasHighlight(m[3]) ||
      /^\s*\[\s*\*\s*\]\s*/.test(ln) ||
      /\(\s*correct\s*\)$/i.test(ln) ||
      /\s+correct\s*$/i.test(ln) ||
      /\s+\u2713\s*$/i.test(ln);

    choices.push({ text, correct: isCorrect });
  }

  if (choices.every((c) => !c.correct)) {
    if (tfAnswer) {
      for (const c of choices) {
        if (c.text.trim().toLowerCase() === tfAnswer) c.correct = true;
      }
    } else if (answerLetters.length) {
      for (const L of answerLetters) {
        const idx = L.charCodeAt(0) - 65;
        if (idx >= 0 && idx < choices.length) choices[idx].correct = true;
      }
    } else {
      applyAnswerTextToChoices(choices, answerText);
    }
  }

  const correctCount = choices.filter((c) => c.correct).length;

  const isTf = choices.length === 2 && choices.every((c) => /^(true|false)$/i.test(c.text.trim()));

  if (correctCount === 0) return { type: isTf ? "true_false" : "multiple_choice_single", promptText, choices };
  if (correctCount > 1) return { type: "multiple_choice_multiple", promptText, choices };
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
  if (hasEssayMarker) return { type: "essay", promptText };

  const hasFileMarker = lines.some((l) => /^\s*\^{3,4}\s*$/.test(l));
  if (hasFileMarker) return { type: "file_upload", promptText };

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
