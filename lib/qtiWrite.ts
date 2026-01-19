// lib/qtiWrite.ts
export type QtiChoice = { text: string; correct?: boolean };
export type QtiItem =
  | {
      type: "multiple_choice_single" | "multiple_choice_multiple" | "true_false";
      promptText: string;
      choices: QtiChoice[];
    }
  | {
      type: "short_answer" | "essay";
      promptText: string;
      correctText?: string;
    };

export type QtiConvertJson = {
  title?: string;
  items: QtiItem[];
};

function xmlEscape(s: string) {
  return (s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Put HTML inside CDATA so tags survive, while still being valid XML.
 * Also safely splits any accidental "]]>" sequences.
 */
function cdata(html: string) {
  const safe = (html ?? "").replaceAll("]]>", "]]]]><![CDATA[>");
  return `<![CDATA[${safe}]]>`;
}

function matTextHtml(html: string) {
  // Canvas QTI is fine with text/html mattext. CDATA keeps tags and data images.
  return `<mattext texttype="text/html">${cdata(html ?? "")}</mattext>`;
}

function makeIdent(prefix = "I") {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
}

function normalizePromptToHtml(promptText: string) {
  // If promptText already contains HTML, keep it.
  // If it looks like plain text, we still place it inside mattext html for consistency.
  return promptText ?? "";
}

async function buildZipBytes(json: QtiConvertJson, outType: "uint8array" | "blob") {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const title = json.title?.trim() || "QuizZip Import";
  const items = json.items ?? [];

  const manifestIdent = makeIdent("MAN");
  const resourceIdent = makeIdent("RES");

  const assessmentIdent = makeIdent("ASMT");
  const sectionIdent = makeIdent("SEC");

  // One assessment file
  const assessmentXml = buildAssessmentXml({
    title,
    assessmentIdent,
    sectionIdent,
    items,
  });

  zip.file("assessment.xml", assessmentXml);

  // Minimal imsmanifest with assessment.xml
  const imsmanifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${xmlEscape(manifestIdent)}"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd">
  <organizations/>
  <resources>
    <resource identifier="${xmlEscape(resourceIdent)}" type="imsqti_xmlv1p2" href="assessment.xml">
      <file href="assessment.xml"/>
    </resource>
  </resources>
</manifest>`;

  zip.file("imsmanifest.xml", imsmanifest);

  return await zip.generateAsync({ type: outType });
}

// Existing browser friendly export
export async function buildCanvasQtiZip(args: { json: QtiConvertJson }) {
  return await buildZipBytes(args.json, "blob");
}

// Server route helper expected by app/api/convert/route.ts
// Returns bytes that can be directly returned via NextResponse
export async function buildQtiZip(title: string, items: QtiItem[]): Promise<Uint8Array> {
  const json: QtiConvertJson = { title, items };
  return (await buildZipBytes(json, "uint8array")) as Uint8Array;
}

function buildAssessmentXml(args: {
  title: string;
  assessmentIdent: string;
  sectionIdent: string;
  items: QtiItem[];
}) {
  const { title, assessmentIdent, sectionIdent, items } = args;

  const itemXml = items
    .map((it, idx) => {
      const ident = makeIdent(`ITEM${idx + 1}`);
      return buildItemXml({ item: it, ident });
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2">
  <assessment ident="${xmlEscape(assessmentIdent)}" title="${xmlEscape(title)}">
    <section ident="${xmlEscape(sectionIdent)}">
      ${itemXml}
    </section>
  </assessment>
</questestinterop>`;
}

function buildItemXml(args: { item: QtiItem; ident: string }) {
  const { item, ident } = args;

  // Convert prompt to HTML (may include <img src="data:..."> from Smart import)
  const promptHtml = normalizePromptToHtml(item.promptText);

  if (item.type === "short_answer") {
    const expected = (item.correctText ?? "").trim();
    return `
<item ident="${xmlEscape(ident)}" title="${xmlEscape(ident)}">
  <presentation>
    <material>
      ${matTextHtml(promptHtml)}
    </material>
    <response_str ident="response1" rcardinality="Single">
      <render_fib/>
    </response_str>
  </presentation>
  <resprocessing>
    <outcomes>
      <decvar varname="SCORE" vartype="Decimal" minvalue="0" maxvalue="100"/>
    </outcomes>
    <respcondition continue="No">
      <conditionvar>
        <other/>
      </conditionvar>
      <setvar varname="SCORE" action="Set">100</setvar>
    </respcondition>
    ${expected ? `<itemfeedback ident="general_fb"><flow_mat><material>${matTextHtml(xmlEscape(expected))}</material></flow_mat></itemfeedback>` : ""}
  </resprocessing>
</item>`;
  }

  if (item.type === "essay") {
    return `
<item ident="${xmlEscape(ident)}" title="${xmlEscape(ident)}">
  <presentation>
    <material>
      ${matTextHtml(promptHtml)}
    </material>
    <response_str ident="response1" rcardinality="Single">
      <render_fib/>
    </response_str>
  </presentation>
  <resprocessing>
    <outcomes>
      <decvar varname="SCORE" vartype="Decimal" minvalue="0" maxvalue="100"/>
    </outcomes>
  </resprocessing>
</item>`;
  }

  // Choice based types
  const choices = (item as any).choices as QtiChoice[] | undefined;
  const choiceList = (choices ?? []).map((c, i) => ({ ...c, ident: `CHOICE_${i + 1}` }));

  const responseIdent = "response1";
  const correctIdents = choiceList.filter((c) => c.correct).map((c) => c.ident);

  const renderChoice = `
<response_lid ident="${xmlEscape(responseIdent)}" rcardinality="${
    item.type === "multiple_choice_multiple" ? "Multiple" : "Single"
  }">
  <render_choice>
    ${choiceList
      .map(
        (c) => `
    <response_label ident="${xmlEscape(c.ident)}">
      <material>
        ${matTextHtml(c.text ?? "")}
      </material>
    </response_label>`
      )
      .join("\n")}
  </render_choice>
</response_lid>`;

  // Very lightweight scoring: correct if matches expected set for multiple, or matches single correct for single/true_false
  // Canvas tends to accept this minimal logic well enough for import.
  const condition =
    item.type === "multiple_choice_multiple"
      ? `
      <and>
        ${correctIdents.map((id) => `<varequal respident="${xmlEscape(responseIdent)}">${xmlEscape(id)}</varequal>`).join("\n")}
      </and>`
      : correctIdents[0]
        ? `<varequal respident="${xmlEscape(responseIdent)}">${xmlEscape(correctIdents[0])}</varequal>`
        : `<other/>`;

  return `
<item ident="${xmlEscape(ident)}" title="${xmlEscape(ident)}">
  <presentation>
    <material>
      ${matTextHtml(promptHtml)}
    </material>
    ${renderChoice}
  </presentation>
  <resprocessing>
    <outcomes>
      <decvar varname="SCORE" vartype="Decimal" minvalue="0" maxvalue="100"/>
    </outcomes>
    <respcondition continue="No">
      <conditionvar>
        ${condition}
      </conditionvar>
      <setvar varname="SCORE" action="Set">100</setvar>
    </respcondition>
  </resprocessing>
</item>`;
}
