import JSZip from "jszip";

export type QtiWriteChoice = {
  id?: string;
  text: string;
  isCorrect?: boolean;
};

export type QtiWriteItem = {
  id: string;
  type:
    | "multiple_choice_single"
    | "multiple_choice_multiple"
    | "true_false"
    | "short_answer"
    | "essay"
    | "matching";
  title?: string;
  promptText: string;
  // multiple choice / true-false
  choices?: QtiWriteChoice[];
  correctChoiceIds?: string[];
  // matching
  pairs?: Array<{ left: string; right: string }>;
};

export type QtiWriteInput = {
  title?: string;
  items: QtiWriteItem[];
};

type ExtractImagesResult = {
  html: string;
  files: Array<{ path: string; bytes: Buffer }>;
};

function xmlEscape(s?: string) {
  const v = (s ?? "").toString();
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizePromptToHtml(promptText: string) {
  const trimmed = (promptText ?? "").trim();
  if (!trimmed) return xmlEscape("<p></p>");

  // If it already looks like HTML, keep it
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed);
  const raw = looksHtml ? trimmed : `<p>${trimmed}</p>`;

  // Escape for placement inside XML mattext with texttype="text/html"
  const safe = xmlEscape(raw);

  // Canvas can be picky about bare newlines in HTML strings
  return safe.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function detectAndStripChoiceMarker(raw: string) {
  const t = (raw ?? "").toString();

  // Detect correct markers commonly used in copy/paste formats
  const isMarkedCorrect =
    /^\s*\[\s*\*\s*\]/i.test(t) ||
    /^\s*\[\s*x\s*\]/i.test(t) ||
    /^\s*\*/.test(t);

  // Remove markers like [*], [x], [ ]
  let cleaned = t
    .replace(/^\s*\[\s*(?:\*|x)?\s*\]\s*/i, "")
    .replace(/^\s*\*\s*/, "");

  // Remove leading letter labels like "A) ", "b) ", "C. ", "D: "
  cleaned = cleaned.replace(/^\s*[A-Da-d]\s*[\)\.:]\s+/, "");

  return { cleaned: cleaned.trim(), isMarkedCorrect };
}

function normalizeHtmlImageSrcs(html: string) {
  // Make common prefixes Canvas-unfriendly; keep just the filename at zip root
  return (html ?? "")
    .replaceAll("$IMS-CC-FILEBASE$/images/", "")
    .replaceAll("$IMS-CC-FILEBASE$/", "")
    .replaceAll("images/", "");
}

function extractDataUriImages(
  html: string,
  startIndex: number
): ExtractImagesResult & { nextIndex: number } {
  let next = startIndex;
  const files: Array<{ path: string; bytes: Buffer }> = [];

  const out = (html ?? "").replace(
    /<img[^>]+src=["'](data:image\/[^"']+)["'][^>]*>/gi,
    (match, src) => {
      const m = /^data:(image\/[^;]+);base64,(.+)$/i.exec(src);
      if (!m) return match;

      const mime = m[1].toLowerCase();
      const b64 = m[2];
      const ext = mime.includes("png")
        ? "png"
        : mime.includes("jpeg") || mime.includes("jpg")
          ? "jpg"
          : mime.includes("gif")
            ? "gif"
            : "png";

      const fileName = `quizzip_img_${String(next).padStart(3, "0")}.${ext}`;
      next += 1;

      files.push({ path: fileName, bytes: Buffer.from(b64, "base64") });

      // Canvas QTI import is most reliable when image files are at zip root and referenced by filename
      return match.replace(src, fileName);
    }
  );

  return { html: out, files, nextIndex: next };
}

function buildManifestXml(title: string, extraFiles: string[]) {
  const safeTitle = xmlEscape(title);
  const extraFileXml = extraFiles
    .map((href) => `<file href="${xmlEscape(href)}" />`)
    .join("\n      ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST1" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1
  http://www.imsglobal.org/xsd/imscp_v1p1.xsd">
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.1.3</schemaversion>
  </metadata>
  <organizations default="ORG1">
    <organization identifier="ORG1">
      <title>${safeTitle}</title>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES1" type="imsqti_xmlv1p2" href="assessment.xml">
      <file href="assessment.xml" />
      ${extraFileXml}
    </resource>
  </resources>
</manifest>`;
}

function buildAssessmentXml(title: string, itemsXml: string) {
  const safeTitle = xmlEscape(title);

  return `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2">
  <assessment ident="ASSESS1" title="${safeTitle}">
    <section ident="SEC1">
      ${itemsXml}
    </section>
  </assessment>
</questestinterop>`;
}

function buildQtiItem(item: QtiWriteItem, num: number) {
  const title = xmlEscape((item.title ?? `${num}`).toString());

  const metadata = (() => {
    // Keep Canvas friendly types
    switch (item.type) {
      case "multiple_choice_single":
      case "multiple_choice_multiple":
        return "multiple_choice_question";
      case "true_false":
        return "true_false_question";
      case "short_answer":
        return "short_answer_question";
      case "essay":
        return "essay_question";
      case "matching":
        return "matching_question";
      default:
        return "multiple_choice_question";
    }
  })();

  // promptText already passed through normalizePromptToHtml + image extraction in buildZipBytes
  const promptHtml = item.promptText ?? "";

  const makeChoiceIdents = (n: number) => {
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      if (i < 26) out.push(String.fromCharCode(65 + i));
      else out.push(`A${i - 25}`);
    }
    return out;
  };

  const buildMultipleChoice = (
    isMultiple: boolean,
    labels: Array<{ ident: string; html: string }>,
    correct: string[]
  ) => {
    const renderChoices = labels
      .map(
        (c) => `
        <response_label ident="${c.ident}">
          <material>
            <mattext texttype="text/html">${c.html}</mattext>
          </material>
        </response_label>`
      )
      .join("");

    const rcardinality = isMultiple ? "Multiple" : "Single";

    // If we cannot determine a correct key, omit respconditions so Canvas can still import the question
    const correctConds = (() => {
      if (!correct.length) return "";

      if (!isMultiple) {
        const key = correct[0];
        return `
      <respcondition continue="No">
        <conditionvar>
          <varequal respident="response1">${key}</varequal>
        </conditionvar>
        <setvar action="Set">100</setvar>
      </respcondition>`;
      }

      const correctSet = new Set(correct);
      const andParts = labels
        .map((l) => {
          if (correctSet.has(l.ident)) {
            return `<varequal respident="response1">${l.ident}</varequal>`;
          }
          return `<not><varequal respident="response1">${l.ident}</varequal></not>`;
        })
        .join("");

      return `
      <respcondition continue="No">
        <conditionvar>
          <and>
            ${andParts}
          </and>
        </conditionvar>
        <setvar action="Set">100</setvar>
      </respcondition>`;
    })();

    return `
    <presentation>
      <material>
        <mattext texttype="text/html">${promptHtml}</mattext>
      </material>
      <response_lid ident="response1" rcardinality="${rcardinality}">
        <render_choice>
          ${renderChoices}
        </render_choice>
      </response_lid>
    </presentation>
    <resprocessing>
      <outcomes>
        <decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/>
      </outcomes>
      ${correctConds}
    </resprocessing>`;
  };

  if (item.type === "true_false") {
    const choices = [
      { ident: "true", html: xmlEscape("True") },
      { ident: "false", html: xmlEscape("False") },
    ];

    const correct = (() => {
      // Prefer explicit correctChoiceIds; otherwise look for a choice flagged correct
      const explicit = (item.correctChoiceIds ?? [])
        .map((x) => (x ?? "").toString().trim().toLowerCase())
        .filter(Boolean);
      if (explicit.length) {
        const v = explicit[0];
        if (v === "true" || v === "t") return ["true"];
        if (v === "false" || v === "f") return ["false"];
      }

      const flagged = (item.choices ?? []).find((c) => c.isCorrect);
      if (flagged) {
        const v = (flagged.id ?? flagged.text ?? "")
          .toString()
          .trim()
          .toLowerCase();
        if (v.startsWith("t")) return ["true"];
        if (v.startsWith("f")) return ["false"];
      }

      // Last resort: scan text markers in the choices
      const marked = (item.choices ?? []).find((c) =>
        detectAndStripChoiceMarker(c.text ?? "").isMarkedCorrect
      );
      if (marked) {
        const v = (marked.id ?? marked.text ?? "")
          .toString()
          .trim()
          .toLowerCase();
        if (v.startsWith("t")) return ["true"];
        if (v.startsWith("f")) return ["false"];
      }

      return [];
    })();

    const inner = buildMultipleChoice(false, choices, correct);

    return `
  <item ident="ITEM_${num}" title="${title}">
    <itemmetadata>
      <qtimetadata>
        <qtimetadatafield>
          <fieldlabel>question_type</fieldlabel>
          <fieldentry>${metadata}</fieldentry>
        </qtimetadatafield>
      </qtimetadata>
    </itemmetadata>
    ${inner}
  </item>`;
  }

  if (
    item.type === "multiple_choice_single" ||
    item.type === "multiple_choice_multiple"
  ) {
    const choiceIdents = makeChoiceIdents((item.choices ?? []).length);

    const labels = (item.choices ?? []).map((c, i) => {
      const d = detectAndStripChoiceMarker(c.text ?? "");
      const cleanedHtml = normalizePromptToHtml(normalizeHtmlImageSrcs(d.cleaned));
      return { ident: choiceIdents[i] ?? `${i + 1}`, html: cleanedHtml };
    });

    // Determine correctness:
    // 1) prefer explicit correctChoiceIds
    // 2) otherwise use choice.isCorrect
    // 3) otherwise fall back to [*]/[x] markers in choice text
    const correct = (() => {
      const explicit = (item.correctChoiceIds ?? []).filter(Boolean);
      if (explicit.length) {
        // If the IDs already look like A/B/C, honor them; otherwise map by index match on original choice.id
        const byIdent = explicit.filter((x) => /^[A-Z](\d+)?$/i.test(x));
        if (byIdent.length) return byIdent.map((x) => x.toUpperCase());

        const idToIdent = new Map<string, string>();
        (item.choices ?? []).forEach((c, i) => {
          if (c.id) idToIdent.set(c.id, choiceIdents[i] ?? `${i + 1}`);
        });
        return explicit
          .map((x) => idToIdent.get(x) ?? x)
          .filter(Boolean);
      }

      const fromFlag = (item.choices ?? [])
        .map((c, i) => (c.isCorrect ? choiceIdents[i] ?? `${i + 1}` : null))
        .filter(Boolean) as string[];
      if (fromFlag.length) return fromFlag;

      const fromMarker = (item.choices ?? [])
        .map((c, i) => {
          const d = detectAndStripChoiceMarker(c.text ?? "");
          return d.isMarkedCorrect ? choiceIdents[i] ?? `${i + 1}` : null;
        })
        .filter(Boolean) as string[];
      return fromMarker;
    })();

    const isMultiple =
      item.type === "multiple_choice_multiple" || new Set(correct).size > 1;

    const inner = buildMultipleChoice(isMultiple, labels, correct);

    return `
  <item ident="ITEM_${num}" title="${title}">
    <itemmetadata>
      <qtimetadata>
        <qtimetadatafield>
          <fieldlabel>question_type</fieldlabel>
          <fieldentry>${metadata}</fieldentry>
        </qtimetadatafield>
      </qtimetadata>
    </itemmetadata>
    ${inner}
  </item>`;
  }

  if (item.type === "short_answer") {
    return `
  <item ident="ITEM_${num}" title="${title}">
    <itemmetadata>
      <qtimetadata>
        <qtimetadatafield>
          <fieldlabel>question_type</fieldlabel>
          <fieldentry>${metadata}</fieldentry>
        </qtimetadatafield>
      </qtimetadata>
    </itemmetadata>
    <presentation>
      <material>
        <mattext texttype="text/html">${promptHtml}</mattext>
      </material>
      <response_str ident="response1" rcardinality="Single">
        <render_fib fibtype="String"/>
      </response_str>
    </presentation>
  </item>`;
  }

  if (item.type === "essay") {
    return `
  <item ident="ITEM_${num}" title="${title}">
    <itemmetadata>
      <qtimetadata>
        <qtimetadatafield>
          <fieldlabel>question_type</fieldlabel>
          <fieldentry>${metadata}</fieldentry>
        </qtimetadatafield>
      </qtimetadata>
    </itemmetadata>
    <presentation>
      <material>
        <mattext texttype="text/html">${promptHtml}</mattext>
      </material>
      <response_str ident="response1" rcardinality="Single">
        <render_fib fibtype="String"/>
      </response_str>
    </presentation>
  </item>`;
  }

  if (item.type === "matching") {
    // Lightweight matching format
    const pairs = (item.pairs ?? []).map((p, i) => ({
      left: normalizePromptToHtml(p.left ?? ""),
      right: normalizePromptToHtml(p.right ?? ""),
      ident: `P${i + 1}`,
    }));

    const choices = pairs
      .map(
        (p) => `
        <response_label ident="${p.ident}">
          <material>
            <mattext texttype="text/plain">${p.right}</mattext>
          </material>
        </response_label>`
      )
      .join("");

    return `
  <item ident="ITEM_${num}" title="${title}">
    <itemmetadata>
      <qtimetadata>
        <qtimetadatafield>
          <fieldlabel>question_type</fieldlabel>
          <fieldentry>${metadata}</fieldentry>
        </qtimetadatafield>
      </qtimetadata>
    </itemmetadata>
    <presentation>
      <material>
        <mattext texttype="text/html">${promptHtml}</mattext>
      </material>
      ${pairs
        .map(
          (p) => `
      <response_lid ident="${p.ident}" rcardinality="Single">
        <material>
          <mattext texttype="text/plain">${p.left}</mattext>
        </material>
        <render_choice>
          ${choices}
        </render_choice>
      </response_lid>`
        )
        .join("")}
    </presentation>
  </item>`;
  }

  // Fallback
  return `
  <item ident="ITEM_${num}" title="${title}">
    <itemmetadata>
      <qtimetadata>
        <qtimetadatafield>
          <fieldlabel>question_type</fieldlabel>
          <fieldentry>essay_question</fieldentry>
        </qtimetadatafield>
      </qtimetadata>
    </itemmetadata>
    <presentation>
      <material>
        <mattext texttype="text/html">${promptHtml}</mattext>
      </material>
      <response_str ident="response1" rcardinality="Single">
        <render_fib fibtype="String"/>
      </response_str>
    </presentation>
  </item>`;
}

async function buildZipBytes(input: QtiWriteInput) {
  const zip = new JSZip();

  const title = (input.title ?? "Canvas Import").toString().trim() || "Canvas Import";

  let imgIndex = 1;
  const extraFiles: Array<{ path: string; bytes: Buffer }> = [];

  const itemsXml = (input.items ?? [])
    .map((rawItem, i) => {
      const item = { ...rawItem };

      // Normalize prompt HTML and image srcs before data uri extraction
      const baseHtml = normalizePromptToHtml(normalizeHtmlImageSrcs(item.promptText));
      const extracted = extractDataUriImages(baseHtml, imgIndex);
      imgIndex = extracted.nextIndex;

      item.promptText = extracted.html;
      extraFiles.push(...extracted.files);

      return buildQtiItem(item, i + 1);
    })
    .join("\n");

  // Put extracted images at zip root
  for (const f of extraFiles) {
    zip.file(f.path, f.bytes);
  }

  zip.file(
    "imsmanifest.xml",
    buildManifestXml(title, extraFiles.map((f) => f.path))
  );
  zip.file("assessment.xml", buildAssessmentXml(title, itemsXml));

  return zip.generateAsync({ type: "nodebuffer" });
}

export async function buildQtiZip(input: QtiWriteInput) {
  return buildZipBytes(input);
}
