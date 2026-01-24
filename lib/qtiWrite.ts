import JSZip from "jszip";
import { Buffer } from "buffer";

export type QtiWriteChoice = {
  id: string;
  text: string;
  isCorrect?: boolean;
};

export type QtiWriteItem = {
  id: string;
  type: "multiple_choice_single" | "multiple_choice_multiple" | "true_false" | "short_answer" | "essay";
  promptText: string;
  choices?: QtiWriteChoice[];
  correctChoiceIds?: string[];
};

export type QtiWriteJson = {
  title: string;
  items: QtiWriteItem[];
};

function xmlEscape(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

// The viewer may pass plain text or HTML. We wrap plain text in minimal HTML so Canvas treats it consistently.
// We also leave <img> tags intact so we can post process them into real files during zip generation.
function normalizePromptToHtml(prompt: string) {
  const trimmed = (prompt ?? "").trim();
  if (!trimmed) return "<p></p>";
  const looksLikeHtml = /<(p|div|br|img|table|tbody|thead|tr|td|th|ul|ol|li|strong|em|span|h1|h2|h3|h4|h5|h6)(\s|>)/i.test(
    trimmed
  );
  if (looksLikeHtml) return trimmed;
  const safe = xmlEscape(trimmed).replaceAll("\n", "<br/>");
  return `<p>${safe}</p>`;
}

function canvasQuestionType(itemType: QtiWriteItem["type"]) {
  switch (itemType) {
    case "multiple_choice_single":
      return "multiple_choice_question";
    case "multiple_choice_multiple":
      return "multiple_answers_question";
    case "true_false":
      return "true_false_question";
    case "short_answer":
      return "short_answer_question";
    case "essay":
      return "essay_question";
    default:
      return "multiple_choice_question";
  }
}

// Canvas is more reliable when these fields exist, especially for non multiple choice items.
function buildItemMetadataXml(item: QtiWriteItem) {
  const qType = canvasQuestionType(item.type);
  return `
    <itemmetadata>
      <qtimetadata>
        <qtimetadatafield>
          <fieldlabel>question_type</fieldlabel>
          <fieldentry>${xmlEscape(qType)}</fieldentry>
        </qtimetadatafield>
        <qtimetadatafield>
          <fieldlabel>points_possible</fieldlabel>
          <fieldentry>1</fieldentry>
        </qtimetadatafield>
      </qtimetadata>
    </itemmetadata>
  `.trim();
}

function buildManifestXml(title: string, extraFiles: string[]) {
  const safeTitle = xmlEscape(title || "QuizZip Export");
  const extraFileXml = extraFiles
    .map((href) => `      <file href="${xmlEscape(href)}"/>`)
    .join("\n");

  // Minimal QTI 1.2 manifest with a title. Canvas will also look for <file> entries for any referenced assets.
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="quizzip_qti_manifest" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/profile/cc/ccv1p3/derived_schema/imscp_v1p1.xsd
  http://www.imsglobal.org/xsd/imsmd_v1p2 http://www.imsglobal.org/profile/cc/ccv1p3/derived_schema/imsmd_v1p2p2.xsd">
  <metadata>
    <imsmd:lom>
      <imsmd:general>
        <imsmd:title>
          <imsmd:string>${safeTitle}</imsmd:string>
        </imsmd:title>
      </imsmd:general>
    </imsmd:lom>
  </metadata>
  <organizations/>
  <resources>
    <resource identifier="quizzip_qti_assessment" type="imsqti_xmlv1p2">
      <file href="assessment.xml"/>
${extraFileXml ? extraFileXml : ""}
    </resource>
  </resources>
</manifest>`;
}

type ExtractImagesResult = {
  html: string;
  files: Array<{ path: string; bytes: Buffer }>;
};

// Canvas will often strip data URI images and very large data URIs can cause the import to stop early.
// We extract any embedded data URI images into real files inside the zip and replace the src with a relative file path.
function extractDataUriImages(html: string, startIndex: number): ExtractImagesResult & { nextIndex: number } {
  let next = startIndex;
  const files: Array<{ path: string; bytes: Buffer }> = [];

  // Match data URIs inside src attributes. Keep it strict to avoid replacing unrelated base64 blobs.
  const dataUriRe = /src\s*=\s*["'](data:image\/([a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9\n\r+/=]+))["']/g;

  const out = html.replace(dataUriRe, (_m, _full, extRaw, b64) => {
    const ext = (extRaw || "png").toLowerCase().replaceAll("jpeg", "jpg");
    const cleanB64 = String(b64).replace(/\s+/g, "");
    let bytes: Buffer;
    try {
      bytes = Buffer.from(cleanB64, "base64");
    } catch {
      return `src=""`;
    }

    const fileName = `quizzip_img_${String(next).padStart(3, "0")}.${ext}`;
    const filePath = `images/${fileName}`;
    files.push({ path: filePath, bytes });
    next += 1;

    return `src="$IMS-CC-FILEBASE$/${filePath}"`;
  });

  return { html: out, files, nextIndex: next };
}

async function buildZipBytes(json: QtiWriteJson) {
  const zip = new JSZip();

  const extraFiles: string[] = [];
  const processedItems: QtiWriteItem[] = [];
  let imgIndex = 1;

  for (const item of json.items ?? []) {
    const baseHtml = normalizePromptToHtml(item.promptText);
    const extracted = extractDataUriImages(baseHtml, imgIndex);

    imgIndex = extracted.nextIndex;

    for (const f of extracted.files) {
      zip.file(f.path, f.bytes);
      extraFiles.push(f.path);
    }

    processedItems.push({
      ...item,
      // store HTML so we do not re introduce data URIs
      promptText: extracted.html,
    });
  }

  const assessmentXml = buildAssessmentXml({ title: json.title, items: processedItems });
  const manifestXml = buildManifestXml(json.title, extraFiles);

  zip.file("assessment.xml", assessmentXml);
  zip.file("imsmanifest.xml", manifestXml);

  return zip.generateAsync({ type: "nodebuffer" });
}

export async function buildQtiZip(json: QtiWriteJson) {
  return buildZipBytes(json);
}

function buildAssessmentXml(json: QtiWriteJson) {
  const itemsXml = (json.items ?? [])
    .map((item, i) => buildQtiItem(item, i + 1))
    .join("\n");

  const safeTitle = xmlEscape(json.title || "QuizZip Export");

  return `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2.xsd">
  <assessment ident="quizzip_assessment" title="${safeTitle}">
    <section ident="root_section">
${itemsXml}
    </section>
  </assessment>
</questestinterop>`;
}

function buildQtiItem(item: QtiWriteItem, index: number) {
  const itemIdent = `ITEM_${index}`;
  const itemTitle = `Question ${index}`;

  // If promptText already contains HTML, keep it. Otherwise normalize and wrap.
  const promptHtml = normalizePromptToHtml(item.promptText);

  const itemMetadataXml = buildItemMetadataXml(item);

  const basePresentation = `
      <presentation>
        <material>
          <mattext texttype="text/html"><![CDATA[${promptHtml}]]></mattext>
        </material>
      </presentation>
  `.trim();

  if (item.type === "multiple_choice_single" || item.type === "multiple_choice_multiple") {
    const choices = item.choices ?? [];
    const correctIds = new Set(item.correctChoiceIds ?? choices.filter((c) => c.isCorrect).map((c) => c.id));

    const responseIdent = "response1";
    const cardinality = item.type === "multiple_choice_multiple" ? "Multiple" : "Single";

    const renderChoices = choices
      .map((c, idx) => {
        const label = c.id || `choice_${idx + 1}`;
        return `<response_label ident="${xmlEscape(label)}">
                  <material>
                    <mattext texttype="text/plain">${xmlEscape(c.text ?? "")}</mattext>
                  </material>
                </response_label>`;
      })
      .join("");

    // Score 1 if correct, else 0.
    // For multi select, require exact match of correct ids.
    const correctConditions =
      item.type === "multiple_choice_multiple"
        ? `<and>
             ${[...correctIds]
               .map((id) => `<varequal respident="${responseIdent}" case="No">${xmlEscape(id)}</varequal>`)
               .join("")}
             <not>
               <or>
                 ${choices
                   .filter((c) => !correctIds.has(c.id))
                   .map((c) => `<varequal respident="${responseIdent}" case="No">${xmlEscape(c.id)}</varequal>`)
                   .join("")}
               </or>
             </not>
           </and>`
        : `<varequal respident="${responseIdent}" case="No">${xmlEscape([...correctIds][0] || "")}</varequal>`;

    return `
      <item ident="${itemIdent}" title="${xmlEscape(itemTitle)}">
        ${itemMetadataXml}
        ${basePresentation.replace(
          "</presentation>",
          `
            <response_lid ident="${responseIdent}" rcardinality="${cardinality}">
              <render_choice>
                ${renderChoices}
              </render_choice>
            </response_lid>
          </presentation>`
        )}
        <resprocessing>
          <outcomes>
            <decvar maxvalue="1" minvalue="0" varname="SCORE" vartype="Decimal"/>
          </outcomes>
          <respcondition continue="No">
            <conditionvar>
              ${correctConditions}
            </conditionvar>
            <setvar action="Set" varname="SCORE">1</setvar>
          </respcondition>
        </resprocessing>
      </item>
    `.trim();
  }

  if (item.type === "true_false") {
    const responseIdent = "response1";
    const correct = (item.correctChoiceIds?.[0] ?? item.choices?.find((c) => c.isCorrect)?.id ?? "true")
      .toLowerCase()
      .includes("f")
      ? "false"
      : "true";

    return `
      <item ident="${itemIdent}" title="${xmlEscape(itemTitle)}">
        ${itemMetadataXml}
        ${basePresentation.replace(
          "</presentation>",
          `
            <response_lid ident="${responseIdent}" rcardinality="Single">
              <render_choice>
                <response_label ident="true">
                  <material><mattext texttype="text/plain">T</mattext></material>
                </response_label>
                <response_label ident="false">
                  <material><mattext texttype="text/plain">F</mattext></material>
                </response_label>
              </render_choice>
            </response_lid>
          </presentation>`
        )}
        <resprocessing>
          <outcomes>
            <decvar maxvalue="1" minvalue="0" varname="SCORE" vartype="Decimal"/>
          </outcomes>
          <respcondition continue="No">
            <conditionvar>
              <varequal respident="${responseIdent}" case="No">${xmlEscape(correct)}</varequal>
            </conditionvar>
            <setvar action="Set" varname="SCORE">1</setvar>
          </respcondition>
        </resprocessing>
      </item>
    `.trim();
  }

  // short_answer and essay
  const responseIdent = "response1";
  const fibType = "String";

  return `
    <item ident="${itemIdent}" title="${xmlEscape(itemTitle)}">
      ${itemMetadataXml}
      ${basePresentation.replace(
        "</presentation>",
        `
          <response_str ident="${responseIdent}" rcardinality="Single">
            <render_fib fibtype="${fibType}" rows="5" columns="60"/>
          </response_str>
        </presentation>`
      )}
      <resprocessing>
        <outcomes>
          <decvar maxvalue="1" minvalue="0" varname="SCORE" vartype="Decimal"/>
        </outcomes>
      </resprocessing>
    </item>
  `.trim();
}
