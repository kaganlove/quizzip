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

function parseBracketMulti(lines: string[], promptText: string): ParsedItem | null {
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

  // True/False detection (allow even if no correct is marked)
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

      return {
        type: "true_false",
        promptText,
        choices,
      };
    }
  }

  const choices = parsed
    .sort((x, y) => x.letter.localeCompare(y.letter))
    .map(p => ({ text: p.text, correct: p.correct }));

  const correctCount = choices.filter(c => c.correct).length;

  // If multiple correct are marked, treat it as multi-answer.
  if (correctCount > 1) {
    return {
      type: "multiple_choice_multiple",
      promptText,
      choices,
    };
  }

  // If exactly one correct is marked, keep single-choice.
  if (correctCount === 1) {
    return {
      type: "multiple_choice_single",
      promptText,
      choices,
    };
  }

  // If none are marked, still keep the question (no guessing).
  return {
    type: "multiple_choice_single",
    promptText,
    choices: choices.map(c => ({ text: c.text, correct: false })),
  };
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

  const promptFirstLine = stripNumPrefix(first);
  const rest = lines.slice(1).filter(l => !isBlank(l));

  const ef = parseEssayOrFile(rest, promptFirstLine);
  if (ef) return ef;

  const multi = parseBracketMulti(rest, promptFirstLine);
  if (multi) return multi;

  const mc = parseStarredAlphaChoices(rest, promptFirstLine);
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
