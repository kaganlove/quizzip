import JSZip from "jszip";

type ConvertItem = {
  type: "multiple_choice_single" | "multiple_choice_multiple" | "true_false" | "short_answer" | "essay";
  promptText: string;
  choices?: Array<{ text: string; correct?: boolean }>;
  correctText?: string;
};

function esc(s: string) {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function qtiItemXml(i: number, item: ConvertItem) {
  const ident = `ITEM_${i + 1}`;

  if (item.type === "true_false") {
    const choices = [
      { text: "True", correct: (item.choices ?? []).some(c => c.correct && c.text.toLowerCase().includes("true")) },
      { text: "False", correct: (item.choices ?? []).some(c => c.correct && c.text.toLowerCase().includes("false")) },
    ];
    const correctId = choices[0].correct ? "A" : "B";

    return `
<item ident="${ident}" title="${esc("Question " + (i + 1))}">
  <presentation>
    <material><mattext texttype="text/plain">${esc(item.promptText)}</mattext></material>
    <response_lid ident="response1" rcardinality="Single">
      <render_choice>
        <response_label ident="A"><material><mattext texttype="text/plain">True</mattext></material></response_label>
        <response_label ident="B"><material><mattext texttype="text/plain">False</mattext></material></response_label>
      </render_choice>
    </response_lid>
  </presentation>
  <resprocessing>
    <outcomes><decvar maxvalue="1" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes>
    <respcondition continue="No">
      <conditionvar><varequal respident="response1">${correctId}</varequal></conditionvar>
      <setvar action="Set" varname="SCORE">1</setvar>
    </respcondition>
  </resprocessing>
</item>
`.trim();
  }

  if (item.type === "short_answer" || item.type === "essay") {
    return `
<item ident="${ident}" title="${esc("Question " + (i + 1))}">
  <presentation>
    <material><mattext texttype="text/plain">${esc(item.promptText)}</mattext></material>
    <response_str ident="response1" rcardinality="Single">
      <render_fib/>
    </response_str>
  </presentation>
</item>
`.trim();
  }

  const choices = item.choices ?? [];
  const ids = choices.map((_, idx) => String.fromCharCode(65 + idx));
  const correctIds = ids.filter((id, idx) => !!choices[idx]?.correct);

  const cardinality = item.type === "multiple_choice_multiple" ? "Multiple" : "Single";
  const condition =
    item.type === "multiple_choice_multiple"
      ? correctIds
          .map(id => `<varequal respident="response1">${id}</varequal>`)
          .join("")
      : `<varequal respident="response1">${(correctIds[0] ?? ids[0])}</varequal>`;

  const render = ids
    .map((id, idx) => {
      const text = choices[idx]?.text ?? "";
      return `<response_label ident="${id}"><material><mattext texttype="text/plain">${esc(text)}</mattext></material></response_label>`;
    })
    .join("");

  return `
<item ident="${ident}" title="${esc("Question " + (i + 1))}">
  <presentation>
    <material><mattext texttype="text/plain">${esc(item.promptText)}</mattext></material>
    <response_lid ident="response1" rcardinality="${cardinality}">
      <render_choice>
        ${render}
      </render_choice>
    </response_lid>
  </presentation>
  <resprocessing>
    <outcomes><decvar maxvalue="1" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes>
    <respcondition continue="No">
      <conditionvar>${condition}</conditionvar>
      <setvar action="Set" varname="SCORE">1</setvar>
    </respcondition>
  </resprocessing>
</item>
`.trim();
}

function qtiAssessmentXml(title: string, items: ConvertItem[]) {
  const body = items.map((it, i) => qtiItemXml(i, it)).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop>
  <assessment ident="ASSESS_1" title="${esc(title || "Quiz")}">
    <section ident="SECTION_1">
      ${body}
    </section>
  </assessment>
</questestinterop>
`.trim();
}

function imsManifestXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST_1" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/profile/cc/ccv1p1/ccv1p1_imscp_v1p1_v1p0.xsd">
  <organizations/>
  <resources>
    <resource identifier="RES_1" type="imsqti_xmlv1p2" href="assessment.xml">
      <file href="assessment.xml"/>
    </resource>
  </resources>
</manifest>
`.trim();
}

export async function buildQtiZip(title: string, items: ConvertItem[]) {
  const zip = new JSZip();
  zip.file("imsmanifest.xml", imsManifestXml());
  zip.file("assessment.xml", qtiAssessmentXml(title, items));
  const blob = await zip.generateAsync({ type: "uint8array" });
  return blob;
}
