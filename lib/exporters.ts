import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
  PageBreak,
} from "docx";
import * as XLSX from "xlsx";
import type { Item } from "./types";
import { stripHtml, toAlpha } from "./html";

type HtmlImg = {
  src: string;
  width?: number;
  height?: number;
};

function normalizeTextFromHtml(html: string): string {
  const s = stripHtml(html || "");
  // stripHtml replaces <img> with "[Image]" placeholders.
  // When we embed images, remove those placeholders to avoid duplication.
  return s.replace(/\[Image[^\]]*\]/g, "").replace(/\s+\n/g, "\n").trim();
}

function extractImages(html: string): HtmlImg[] {
  if (!html) return [];
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const imgs = Array.from(doc.querySelectorAll("img"));
    return imgs
      .map((img) => {
        const src = img.getAttribute("src") || "";
        if (!src) return null;
        const w = parseInt(img.getAttribute("width") || "", 10);
        const h = parseInt(img.getAttribute("height") || "", 10);
        return {
          src,
          width: Number.isFinite(w) ? w : undefined,
          height: Number.isFinite(h) ? h : undefined,
        } satisfies HtmlImg;
      })
      .filter(Boolean) as HtmlImg[];
  } catch {
    return [];
  }
}

function sniffImageKind(bytes: Uint8Array): "png" | "jpg" | "gif" | "webp" | "svg" | "unknown" {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }
  // GIF: 47 49 46 38
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "gif";
  }
  // WEBP: "RIFF"...."WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  // SVG: starts with "<" (rough)
  if (bytes.length >= 1 && bytes[0] === 0x3c) return "svg";

  return "unknown";
}

async function imageRunFromSrc(src: string, maxWidthPx = 520): Promise<ImageRun | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;

    const blob = await res.blob();
    const ab = await blob.arrayBuffer();
    const bytes = new Uint8Array(ab);
    const kind = sniffImageKind(bytes.slice(0, 16));

    // Only allow formats we can tell Word/docx about explicitly.
    // (Unknown types often trigger "unreadable content" warnings in Word.)
    const type = kind === "png" ? "png" : kind === "jpg" ? "jpg" : kind === "gif" ? "gif" : null;
    if (!type) return null;

    // Determine dimensions (best effort), then scale down.
    let width = maxWidthPx;
    let height = Math.round(maxWidthPx * 0.75);

    try {
      const bmp = await createImageBitmap(blob);
      const scale = Math.min(1, maxWidthPx / (bmp.width || maxWidthPx));
      width = Math.max(1, Math.round((bmp.width || maxWidthPx) * scale));
      height = Math.max(1, Math.round((bmp.height || height) * scale));
      // @ts-ignore
      bmp.close?.();
    } catch {
      // ignore
    }

    return new ImageRun({
      data: bytes,
      transformation: { width, height },
      type,
    });
  } catch {
    return null;
  }
}

function idsToLetters(choices: { id: string }[], correctIds: string[]): string[] {
  const letters: string[] = [];
  for (let i = 0; i < choices.length; i++) {
    if (correctIds.includes(choices[i].id)) letters.push(toAlpha(i));
  }
  return letters;
}

function correctTextForLetters(
  choices: { id: string; html?: string }[],
  correctIds: string[]
): string {
  if (!choices?.length || !correctIds?.length) return "";
  const parts: string[] = [];
  for (let i = 0; i < choices.length; i++) {
    const c = choices[i];
    if (correctIds.includes(c.id)) {
      const label = toAlpha(i);
      const text = normalizeTextFromHtml(c.html || "");
      parts.push(text ? `${label} (${text})` : `${label}`);
    }
  }
  return parts.join(", ");
}

export async function exportDocx(title: string, items: Item[]): Promise<Blob> {
  const children: Paragraph[] = [];
  const exportedAt = new Date().toLocaleString();

  // Title
  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: title, bold: true, size: 34 })],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [new TextRun({ text: `Exported: ${exportedAt}`, italics: true })],
    })
  );

  // Questions
  for (let i = 0; i < items.length; i++) {
    const q = items[i];
    const qNum = i + 1;

    const promptText = normalizeTextFromHtml(q.promptHtml || "");
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: `${qNum}. `, bold: true }),
          new TextRun({ text: promptText || "(no prompt)" }),
        ],
      })
    );

    // Prompt images (centered)
    const promptImgs = extractImages(q.promptHtml || "");
    for (const img of promptImgs) {
      const run = await imageRunFromSrc(img.src);
      if (run) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [run],
          })
        );
      } else {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: "[Image omitted]", italics: true })],
          })
        );
      }
    }

    // Choices
    if (q.choices?.length) {
      for (let ci = 0; ci < q.choices.length; ci++) {
        const c = q.choices[ci];
        const label = toAlpha(ci);
        const isCorrect = q.correctChoiceIds?.includes(c.id);
        const choiceText = normalizeTextFromHtml(c.html || "");

        children.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: `${label}) `, bold: true }),
              new TextRun({ text: choiceText || "(blank)", bold: isCorrect }),
            ],
          })
        );

        // Choice images (centered)
        const choiceImgs = extractImages(c.html || "");
        for (const img of choiceImgs) {
          const run = await imageRunFromSrc(img.src);
          if (run) {
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
                children: [run],
              })
            );
          } else {
            children.push(
              new Paragraph({
                spacing: { after: 120 },
                children: [new TextRun({ text: "[Image omitted]", italics: true })],
              })
            );
          }
        }
      }
    }

    // Correct line (letters + text)
    const correctLetters = idsToLetters(q.choices || [], q.correctChoiceIds || []);
    const correctLabel = correctLetters.length ? correctLetters.join(", ") : "(none)";
    const correctWithText = correctTextForLetters(q.choices || [], q.correctChoiceIds || []);
    const correctLine = correctWithText ? `Correct: ${correctWithText}` : `Correct: ${correctLabel}`;

    children.push(
      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun({ text: correctLine, italics: true })],
      })
    );

    // Page break between questions (keeps things clean in Word)
    if (i < items.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // Answer Key (end)
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      spacing: { after: 160 },
      children: [new TextRun({ text: "Answer Key", bold: true, size: 28 })],
    })
  );

  for (let i = 0; i < items.length; i++) {
    const q = items[i];
    const qNum = i + 1;

    const correctLetters = idsToLetters(q.choices || [], q.correctChoiceIds || []);
    const correctLabel = correctLetters.length ? correctLetters.join(", ") : "(none)";
    const correctWithText = correctTextForLetters(q.choices || [], q.correctChoiceIds || []);
    const keyLine = correctWithText ? `${qNum}. ${correctWithText}` : `${qNum}. ${correctLabel}`;

    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: keyLine })],
      })
    );
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return await Packer.toBlob(doc);
}

export async function exportXlsx(title: string, items: Item[]): Promise<Blob> {
  // Main sheet: questions
  const rows: any[] = [];
  rows.push({
    Title: title,
    Question: "",
    A: "",
    B: "",
    C: "",
    D: "",
    Correct: "",
    Notes: "",
  });

  for (let i = 0; i < items.length; i++) {
    const q = items[i];
    const qNum = i + 1;

    const promptText = normalizeTextFromHtml(q.promptHtml || "");
    const choices = (q.choices || []).map((c) => normalizeTextFromHtml(c.html || ""));
    const correctLetters = idsToLetters(q.choices || [], q.correctChoiceIds || []).join(", ");

    rows.push({
      Title: "",
      Question: `${qNum}. ${promptText}`,
      A: choices[0] || "",
      B: choices[1] || "",
      C: choices[2] || "",
      D: choices[3] || "",
      Correct: correctLetters,
      Notes: "",
    });
  }

  // Answer key sheet
  const keyRows: any[] = [];
  keyRows.push({ Title: title, "": "" });
  keyRows.push({ Question: "Question", Correct: "Correct", "Correct text": "Correct text" });

  for (let i = 0; i < items.length; i++) {
    const q = items[i];
    const qNum = i + 1;
    const correctLetters = idsToLetters(q.choices || [], q.correctChoiceIds || []).join(", ") || "(none)";
    const correctText = correctTextForLetters(q.choices || [], q.correctChoiceIds || []) || "";
    keyRows.push({ Question: qNum, Correct: correctLetters, "Correct text": correctText });
  }

  const wb = XLSX.utils.book_new();

  const wsQuiz = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
  // Column widths for readability
  (wsQuiz as any)["!cols"] = [
    { wch: 18 }, // Title
    { wch: 60 }, // Question
    { wch: 28 }, // A
    { wch: 28 }, // B
    { wch: 28 }, // C
    { wch: 28 }, // D
    { wch: 10 }, // Correct
    { wch: 20 }, // Notes
  ];
  XLSX.utils.book_append_sheet(wb, wsQuiz, "Quiz");

  const wsKey = XLSX.utils.json_to_sheet(keyRows, { skipHeader: false });
  (wsKey as any)["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsKey, "Answer Key");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
