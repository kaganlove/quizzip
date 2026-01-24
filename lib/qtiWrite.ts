import JSZip from "jszip";

type QtiWriteChoice = { id: string; text: string };

export type QtiWriteItem = {
  id: string;
  type: string;
  promptHtml: string;
  choices?: QtiWriteChoice[];
  correctChoiceIds?: string[];
};

export type QtiWriteJson = {
  title: string;
  items: QtiWriteItem[];
};

function escapeXml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function stripHtmlToText(html: string) {
  return html
    .replaceAll(/<br\s*\/?>/gi, "\n")
    .replaceAll(/<\/p>/gi, "\n")
    .replaceAll(/<[^>]*>/g, "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .trim();
}

function normalizeNewlines(s: string) {
  return s.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function replacementSrcFor(filePath: string) {
  // Canvas QTI zip import is much happier with a plain relative path.
  return `src="${filePath}"`;
}

function extractAndReplaceDataUris(html: string, images: { path: string; bytes: Uint8Array }[]) {
  if (!html) return html;

  const re = /src\s*=\s*"(data:image\/(png|jpeg|jpg|gif|webp);base64,([^"]+))"/gi;

  let out = html;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const full = match[1];
    const ext = (match[2] || "png").toLowerCase().replace("jpg", "jpeg");
    const b64 = match[3] || "";

    let bytes: Uint8Array;
    try {
      const bin = Buffer.from(b64, "base64");
      bytes = new Uint8Array(bin);
    } catch {
      continue;
    }

    const idx = images.length + 1;
    const fileName = `quizzip_img_${String(idx).padStart(3, "0")}.${ext === "jpeg" ? "jpg" : ext}`;
    const filePath = `images/${fileName}`;

    images.push({ path: filePath, bytes });

    const replacementSrc = replacementSrcFor(filePath);
    out = out.replaceAll(`src="${full}"`, replacementSrc);
  }

  return out;
}

function canvasQuestionType(type: string) {
  switch (type) {
    case "multiple_choice":
    case "multiple_choice_single":
      return "multiple_choice_question";
    case "multiple_answers":
    case "multiple_choice_multiple":
      return "multiple_answers_question";
    case "true_false":
      return "true_false_question";
    case "essay":
      return "essay_question";
    default:
      return "essay_question";
  }
}

function buildItemMetadataXml(type: string) {
  const qt = canvasQuestionType(type);
  return `
    <itemmetadata>
      <qtimetadata>
        <qtimetadatafield>
          <fieldlabel>question_type</fieldlabel>
          <fieldentry>${escapeXml(qt)}</fieldentry>
        </qtimetadatafield>
      </qtimetadata>
    </itemmetadata>
  `.trim();
}

function buildRenderChoiceXml(choices: QtiWriteChoice[]) {
  const labels = choices
    .map(
      (c) => `
        <response_label ident="${escapeXml(c.id)}">
          <material>
            <mattext texttype="text/html">${escapeXml(c.text)}</mattext>
          </material>
        </response_label>
      `.trim()
    )
    .join("\n");

  return `
    <render_choice shuffle="No">
      ${labels}
    </render_choice>
  `.trim();
}

function buildItemXml(item: QtiWriteItem, index: number) {
  const ident = escapeXml(item.id || `q${index + 1}`);
  const title = escapeXml(`Question ${index + 1}`);

  const promptHtml = item.promptHtml || "";
  const promptText = stripHtmlToText(promptHtml);

  const type = item.type || (item.choices?.length ? "multiple_choice" : "essay");
  const qt = canvasQuestionType(type);

  if (qt === "multiple_choice_question" || qt === "multiple_answers_question" || qt === "true_false_question") {
    const choices = item.choices ?? [];
    const correctIds = item.correctChoiceIds ?? [];

    const responseIdent = "response1";

    const presentation = `
      <presentation>
        <material>
          <mattext texttype="text/html">${escapeXml(promptHtml || promptText)}</mattext>
        </material>
        <response_lid ident="${responseIdent}" rcardinality="${qt === "multiple_answers_question" ? "Multiple" : "Single"}">
          ${buildRenderChoiceXml(choices)}
        </response_lid>
      </presentation>
    `.trim();

    const respconditions =
      qt === "multiple_answers_question"
        ? correctIds
            .map(
              (cid) => `
          <respcondition continue="Yes">
            <conditionvar>
              <varequal respident="${responseIdent}">${escapeXml(cid)}</varequal>
            </conditionvar>
          </respcondition>
        `.trim()
            )
            .join("\n")
        : `
        <respcondition continue="No">
          <conditionvar>
            <varequal respident="${responseIdent}">${escapeXml(correctIds?.[0] || "")}</varequal>
          </conditionvar>
        </respcondition>
      `.trim();

    const resprocessing = `
      <resprocessing>
        <outcomes>
          <decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/>
        </outcomes>
        ${respconditions}
      </resprocessing>
    `.trim();

    return `
      <item ident="${ident}" title="${title}">
        ${buildItemMetadataXml(type)}
        ${presentation}
        ${resprocessing}
      </item>
    `.trim();
  }

  // Essay fallback (imports reliably into Canvas even when we do not have gradable structure)
  const presentation = `
    <presentation>
      <material>
        <mattext texttype="text/html">${escapeXml(promptHtml || promptText)}</mattext>
      </material>
      <response_str ident="response1" rcardinality="Single">
        <render_fib/>
      </response_str>
    </presentation>
  `.trim();

  const resprocessing = `
    <resprocessing>
      <outcomes>
        <decvar maxvalue="0" minvalue="0" varname="SCORE" vartype="Decimal"/>
      </outcomes>
    </resprocessing>
  `.trim();

  return `
    <item ident="${ident}" title="${title}">
      ${buildItemMetadataXml(type)}
      ${presentation}
      ${resprocessing}
    </item>
  `.trim();
}

function buildAssessmentXml(json: QtiWriteJson) {
  const safeTitle = (json.title || "Canvas Import").toString();
  const items = json.items ?? [];

  const itemXml = items.map((it, idx) => buildItemXml(it, idx)).join("\n\n");

  return normalizeNewlines(`
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE questestinterop SYSTEM "ims_qtiasiv1p2.dtd">
<questestinterop>
  <assessment ident="quizzip_assessment" title="${escapeXml(safeTitle)}">
    <section ident="root_section">
      ${itemXml}
    </section>
  </assessment>
</questestinterop>
  `.trim());
}

function buildManifestXml(title: string, files: string[]) {
  const fileTags = files
    .map((f) => `      <file href="${escapeXml(f)}"/>`)
    .join("\n");

  return normalizeNewlines(`
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="quizzip_manifest" xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1"
  xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1 http://www.imsglobal.org/profile/cc/ccv1p1/ccv1p1_imscp_v1p1.xsd">
  <organizations>
    <organization identifier="O_1">
      <item identifier="I_1" identifierref="RES_1" title="${escapeXml(title)}"/>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES_1" type="imsqti_xmlv1p2" href="assessment.xml">
      <file href="assessment.xml"/>
${fileTags}
    </resource>
  </resources>
</manifest>
  `.trim());
}

async function buildZipBytes(json: QtiWriteJson) {
  const zip = new JSZip();

  const images: { path: string; bytes: Uint8Array }[] = [];

  const normalizedItems = (json.items ?? []).map((it) => {
    const prompt = extractAndReplaceDataUris(it.promptHtml ?? "", images);
    const choices = (it.choices ?? []).map((c) => ({
      ...c,
      text: extractAndReplaceDataUris(c.text ?? "", images),
    }));

    return { ...it, promptHtml: prompt, choices };
  });

  const assessmentXml = buildAssessmentXml({ ...json, items: normalizedItems });

  zip.file("assessment.xml", assessmentXml);

  for (const img of images) {
    zip.file(img.path, img.bytes);
  }

  const manifestXml = buildManifestXml((json.title ?? "Canvas Import").toString(), images.map((x) => x.path));
  zip.file("imsmanifest.xml", manifestXml);

  const bytes = await zip.generateAsync({ type: "uint8array" });
  return bytes;
}

function normalizeWriteJson(titleOrJson: any, maybeItems?: any[]): QtiWriteJson {
  // Support both call styles:
  // 1) buildQtiZip({ title, items })
  // 2) buildQtiZip(title, items)  (older call sites)
  const raw: any =
    typeof titleOrJson === "string" || Array.isArray(maybeItems)
      ? { title: titleOrJson, items: maybeItems }
      : titleOrJson ?? {};

  const title = (raw.title ?? "Canvas Import").toString();
  const rawItems: any[] = Array.isArray(raw.items) ? raw.items : [];

  const items = rawItems.map((it, idx) => normalizeItem(it, idx));
  return { title, items } as QtiWriteJson;
}

function normalizeItem(rawItem: any, idx: number) {
  const promptHtml = (
    rawItem?.promptHtml ??
    rawItem?.promptText ??
    rawItem?.prompt ??
    rawItem?.question ??
    rawItem?.stem ??
    ""
  ).toString();

  // Normalize choices
  const rawChoices = rawItem?.choices;
  let choices: any[] = [];
  if (Array.isArray(rawChoices)) {
    if (rawChoices.length > 0 && typeof rawChoices[0] === "object" && rawChoices[0] !== null) {
      // Could be { id, text } or { text, correct }
      choices = rawChoices.map((c: any, i: number) => ({
        id: (c.id ?? String.fromCharCode(65 + i)).toString(),
        text: (c.text ?? c.html ?? c.value ?? "").toString(),
        correct: Boolean(c.correct),
      }));
    } else {
      // Array of strings
      choices = rawChoices.map((t: any, i: number) => ({
        id: String.fromCharCode(65 + i),
        text: (t ?? "").toString(),
        correct: false,
      }));
    }
  }

  // Determine correct choices
  let correctChoiceIds: string[] = [];
  if (Array.isArray(rawItem?.correctChoiceIds) && rawItem.correctChoiceIds.length > 0) {
    correctChoiceIds = rawItem.correctChoiceIds.map((x: any) => x.toString());
  } else {
    // From per choice flags (textParser output)
    const flagged = choices.filter((c) => c.correct).map((c) => c.id);
    if (flagged.length) correctChoiceIds = flagged;
  }

  if (correctChoiceIds.length === 0) {
    // From letters (A, B, C...)
    const lettersRaw =
      rawItem?.correctLetters ?? rawItem?.correctLetter ?? rawItem?.correct ?? rawItem?.answer ?? rawItem?.answers;

    const letters: string[] = Array.isArray(lettersRaw)
      ? lettersRaw.map((x: any) => x.toString())
      : lettersRaw
        ? [lettersRaw.toString()]
        : [];

    const mapped = letters
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toUpperCase())
      .map((s) => s.replace(/[^A-Z]/g, ""))
      .filter((s) => s.length > 0)
      .map((s) => s[0]);

    if (mapped.length) correctChoiceIds = mapped;
  }

  if (correctChoiceIds.length === 0 && typeof rawItem?.correctText === "string" && choices.length) {
    const target = rawItem.correctText.trim().toLowerCase();
    const hit = choices.find((c) => (c.text ?? "").toString().trim().toLowerCase() === target);
    if (hit) correctChoiceIds = [hit.id];
  }

  // Normalize type
  const rawType = (rawItem?.type ?? rawItem?.questionType ?? "").toString();
  let type = rawType;
  if (!type) {
    type = choices.length > 0 ? "multiple_choice" : "essay";
  }
  if (type === "multiple_choice_single") type = "multiple_choice";
  if (type === "multiple_choice_multiple") type = "multiple_answers";
  if (type === "short_answer") type = "essay"; // safest for Canvas import

  // Ensure stable ids for choices if missing
  choices = choices.map((c, i) => ({ ...c, id: (c.id ?? String.fromCharCode(65 + i)).toString() }));

  return {
    id: rawItem?.id ?? `q${idx + 1}`,
    type,
    promptHtml,
    choices: choices.map((c) => ({ id: c.id, text: c.text })),
    correctChoiceIds,
  };
}

export async function buildQtiZip(titleOrJson: any, maybeItems?: any[]) {
  const json = normalizeWriteJson(titleOrJson, maybeItems);
  return buildZipBytes(json);
}
