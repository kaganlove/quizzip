import JSZip from "jszip";
import type { Assessment, Item, ParseResult } from "./types";

function parseXml(xmlText: string): Document {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const parserError = doc.getElementsByTagName("parsererror")[0];
  if (parserError) {
    throw new Error("XML parse error: " + parserError.textContent?.slice(0, 120));
  }
  return doc;
}

function textContent(el: Element | null | undefined): string {
  return (el?.textContent ?? "").trim();
}

function getQuestionType(itemEl: Element): string {
  const fields = Array.from(itemEl.getElementsByTagName("qtimetadatafield"));
  for (const f of fields) {
    const label = textContent(f.getElementsByTagName("fieldlabel")[0]);
    if (label === "question_type") {
      return textContent(f.getElementsByTagName("fieldentry")[0]);
    }
  }
  return "unknown";
}

function getPromptHtml(itemEl: Element): string {
  const presentations = itemEl.getElementsByTagName("presentation");
  if (!presentations[0]) return "";
  const material = presentations[0].getElementsByTagName("material")[0];
  const mattext = material?.getElementsByTagName("mattext")[0];
  return (mattext?.textContent ?? "").trim();
}

function getChoices(itemEl: Element): { id: string; html: string }[] {
  const out: { id: string; html: string }[] = [];
  const labels = Array.from(itemEl.getElementsByTagName("response_label"));
  for (const rl of labels) {
    const id = rl.getAttribute("ident") ?? "";
    const mt = rl.getElementsByTagName("mattext")[0];
    const html = (mt?.textContent ?? "").trim();
    if (id) out.push({ id, html });
  }
  return out;
}

function getCorrectChoiceIds(itemEl: Element): string[] {
  const vals = Array.from(itemEl.getElementsByTagName("varequal"))
    .map((v) => (v.textContent ?? "").trim())
    .filter(Boolean);
  return Array.from(new Set(vals));
}

function parseQtiAssessment(qtiXmlText: string, idFromPath: string, qtiPath: string): Assessment {
  const doc = parseXml(qtiXmlText);
  const assessmentEl = doc.getElementsByTagName("assessment")[0];
  const title = assessmentEl?.getAttribute("title") ?? idFromPath;

  const bankRefs = Array.from(doc.getElementsByTagName("sourcebank_ref"))
    .map((e) => (e.textContent ?? "").trim())
    .filter(Boolean);

  const itemEls = Array.from(doc.getElementsByTagName("item"));

  const typeCounts: Record<string, number> = {};
  for (const it of itemEls) {
    const t = getQuestionType(it);
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }

  const assessment: Assessment = {
    id: idFromPath,
    title,
    qtiPath,
    itemCount: itemEls.length,
    bankRefCount: bankRefs.length,
    typeCounts,
  };

  return assessment;
}

function cleanBundleLabel(path: string): string {
  const base = path.replace(/\\/g, "/").split("/").pop() ?? path;
  const noExt = base.toLowerCase().endsWith(".zip") ? base.slice(0, -4) : base;
  return noExt.replace(/_+/g, " ").trim() || noExt;
}

function findManifestPath(zip: JSZip): string | null {
  if (zip.file("imsmanifest.xml")) return "imsmanifest.xml";
  const keys = Object.keys(zip.files);
  for (const k of keys) {
    if (k.toLowerCase().endsWith("imsmanifest.xml")) return k;
  }
  return null;
}

function getManifestResourceQtiPaths(manifestXml: string): string[] {
  const doc = parseXml(manifestXml);
  const resources = Array.from(doc.getElementsByTagName("resource"));

  const out: string[] = [];

  for (const r of resources) {
    const type = (r.getAttribute("type") ?? "").toLowerCase();

    const looksLikeQti =
      type.includes("imsqti") ||
      type.includes("qti") ||
      type.includes("assessment") ||
      type.includes("ims_qti");

    if (!looksLikeQti) continue;

    const files = Array.from(r.getElementsByTagName("file"))
      .map((f) => f.getAttribute("href") ?? "")
      .filter(Boolean);

    const pick = files.find((p) => p.toLowerCase().endsWith(".xml"));
    if (pick) out.push(pick);
  }

  return Array.from(new Set(out));
}

async function parseSinglePackageZip(
  zip: JSZip,
  bundlePath: string | null,
  bundleLabel: string | null
): Promise<ParseResult> {
  const warnings: string[] = [];
  const manifestPath = findManifestPath(zip);
  if (!manifestPath) {
    throw new Error("imsmanifest.xml not found in package.");
  }

  const manifestText = await zip.file(manifestPath)!.async("text");
  const qtiPaths = getManifestResourceQtiPaths(manifestText);

  if (qtiPaths.length === 0) {
    throw new Error("No QTI resources found in manifest.");
  }

  const assessments: Assessment[] = [];
  for (const p of qtiPaths) {
    const f = zip.file(p);
    if (!f) {
      warnings.push((bundleLabel ? `${bundleLabel}: ` : "") + "QTI file referenced in manifest but not found: " + p);
      continue;
    }

    try {
      const xml = await f.async("text");
      const idFromPath = (bundleLabel ? `${bundleLabel} :: ` : "") + p;
      const qtiPath = bundlePath ? `${bundlePath}::${p}` : p;
      assessments.push(parseQtiAssessment(xml, idFromPath, qtiPath));
    } catch (e: any) {
      warnings.push((bundleLabel ? `${bundleLabel}: ` : "") + "Could not parse xml " + p + ": " + (e?.message ?? String(e)));
    }
  }

  if (assessments.length === 0) {
    throw new Error("No QTI resources found in manifest.");
  }

  assessments.sort((a, b) => a.title.localeCompare(b.title));
  return { assessments, warnings };
}

function listNestedZipPaths(zip: JSZip): string[] {
  const all = Object.keys(zip.files);
  return all.filter((p) => p.toLowerCase().endsWith(".zip")).filter((p) => !zip.files[p].dir);
}

export async function parseCanvasQtiZip(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const outerZip = await JSZip.loadAsync(buf);

  const outerManifestPath = findManifestPath(outerZip);
  if (outerManifestPath) {
    return parseSinglePackageZip(outerZip, null, null);
  }

  const nestedZips = listNestedZipPaths(outerZip);
  if (nestedZips.length === 0) {
    throw new Error("No imsmanifest.xml found and no nested zip packages found. This does not look like a supported QTI export.");
  }

  const allAssessments: Assessment[] = [];
  const allWarnings: string[] = [];

  for (const nestedPath of nestedZips) {
    const f = outerZip.file(nestedPath);
    if (!f) continue;

    try {
      const innerBuf = await f.async("arraybuffer");
      const innerZip = await JSZip.loadAsync(innerBuf);

      const label = cleanBundleLabel(nestedPath);

      const parsed = await parseSinglePackageZip(innerZip, nestedPath, label);
      allAssessments.push(...parsed.assessments);
      allWarnings.push(...parsed.warnings);
    } catch (e: any) {
      allWarnings.push(`${cleanBundleLabel(nestedPath)}: Could not parse nested package: ${e?.message ?? String(e)}`);
    }
  }

  allAssessments.sort((a, b) => a.title.localeCompare(b.title));
  return { assessments: allAssessments, warnings: Array.from(new Set(allWarnings)) };
}

type LoadItemsResult = { items: Item[]; warnings: string[] };

function safeDecodeURIComponent(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function normalizeRef(raw: string): string {
  let s = (raw ?? "").trim();
  s = s.split("#")[0].split("?")[0];
  s = s.replace(/\\/g, "/");
  s = safeDecodeURIComponent(s);

  if (s.startsWith("$IMS-CC-FILEBASE$/")) {
    s = s.slice("$IMS-CC-FILEBASE$/".length);
  }

  s = s.replace(/^\.\//, "");
  s = s.replace(/^\//, "");
  return s;
}

function looksLikeExternalUrl(s: string): boolean {
  const t = s.trim().toLowerCase();
  return t.startsWith("http://") || t.startsWith("https://") || t.startsWith("data:") || t.startsWith("blob:");
}

function isImagePath(p: string): boolean {
  const lower = p.toLowerCase();
  return (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".svg")
  );
}

function getBasename(p: string): string {
  const parts = p.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || p;
}

function buildZipPathIndex(zip: JSZip): { all: string[]; byNorm: Map<string, string> } {
  const all = Object.keys(zip.files);
  const byNorm = new Map<string, string>();
  for (const p of all) {
    byNorm.set(normalizeRef(p), p);
  }
  return { all, byNorm };
}

function resolveZipPath(index: { all: string[]; byNorm: Map<string, string> }, ref: string): string | null {
  const norm = normalizeRef(ref);
  if (!norm) return null;

  const direct = index.byNorm.get(norm);
  if (direct) return direct;

  const alt1 = norm.replace(/^resources\//, "");
  const alt2 = norm.replace(/^web_resources\//, "");
  const a1 = index.byNorm.get(alt1);
  if (a1) return a1;
  const a2 = index.byNorm.get(alt2);
  if (a2) return a2;

  const base = getBasename(norm).toLowerCase();
  const matches = index.all.filter((p) => getBasename(p).toLowerCase() === base);
  if (matches.length === 1) return matches[0];

  if (matches.length > 1) {
    matches.sort((x, y) => x.length - y.length);
    return matches[0];
  }

  return null;
}

async function rewriteHtmlWithZipResources(
  html: string,
  zip: JSZip,
  index: { all: string[]; byNorm: Map<string, string> },
  blobUrlCache: Map<string, string>
): Promise<{ html: string; warnings: string[] }> {
  const warnings: string[] = [];
  if (!html) return { html, warnings };

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return { html, warnings };

  const imgs = Array.from(root.querySelectorAll("img"));
  for (const img of imgs) {
    const srcRaw = img.getAttribute("src") ?? "";
    if (!srcRaw || looksLikeExternalUrl(srcRaw)) continue;

    const norm = normalizeRef(srcRaw);
    const resolved = resolveZipPath(index, norm);
    if (!resolved) {
      warnings.push(`Image referenced but not found in zip: ${srcRaw}`);
      continue;
    }

    if (!isImagePath(resolved)) {
      warnings.push(`Image tag src resolved to a non image file: ${srcRaw}`);
      continue;
    }

    let blobUrl = blobUrlCache.get(resolved);
    if (!blobUrl) {
      const f = zip.file(resolved);
      if (!f) {
        warnings.push(`Image referenced but not found in zip: ${srcRaw}`);
        continue;
      }
      const blob = await f.async("blob");
      blobUrl = URL.createObjectURL(blob);
      blobUrlCache.set(resolved, blobUrl);
    }

    img.setAttribute("src", blobUrl);
  }

  const links = Array.from(root.querySelectorAll("a"));
  for (const a of links) {
    const hrefRaw = a.getAttribute("href") ?? "";
    if (!hrefRaw || looksLikeExternalUrl(hrefRaw)) continue;

    const norm = normalizeRef(hrefRaw);
    const resolved = resolveZipPath(index, norm);
    if (!resolved) continue;

    let blobUrl = blobUrlCache.get(resolved);
    if (!blobUrl) {
      const f = zip.file(resolved);
      if (!f) continue;
      const blob = await f.async("blob");
      blobUrl = URL.createObjectURL(blob);
      blobUrlCache.set(resolved, blobUrl);
    }

    a.setAttribute("href", blobUrl);
  }

  return { html: root.innerHTML, warnings };
}

function stripLeadingQuestionNumberingHtml(input: string): string {
  const s = (input ?? "").trimStart();
  if (!s) return "";

  const htmlFirstTag = s.replace(/^\s*(<[^>]+>\s*)(\(?\s*\d+\s*[\.)\:\-]\s+)/i, "$1");
  if (htmlFirstTag !== s) return htmlFirstTag;

  return s.replace(/^\s*\(?\s*\d+\s*[\.)\:\-]\s+/i, "");
}

function stripLeadingChoiceLabelingHtml(input: string): string {
  const s = (input ?? "").trimStart();
  if (!s) return "";

  // Strip checkbox markers first
  const noBox = s.replace(/^\s*\[\s*[\*xX]?\s*\]\s+/i, "");
  const s2 = noBox.trimStart();

  const htmlFirstTag = s2.replace(/^\s*(<[^>]+>\s*)(\(?\s*[A-D]\s*[\.)\:\-]\s+)/i, "$1");
  if (htmlFirstTag !== s2) return htmlFirstTag;

  return s2.replace(/^\s*\(?\s*[A-D]\s*[\.)\:\-]\s+/i, "");
}

function stripQuestionPrefixFromLineText(text: string): string {
  const t = (text ?? "").trimStart();
  if (!t) return "";
  return t.replace(/^question:\s*/i, "");
}

function removeInlineChoiceBlockFromPromptHtml(inputHtml: string): string {
  const html = (inputHtml ?? "").trim();
  if (!html) return "";

  const BR_TOKEN = "__QUIZZIP_BR__";

  // Normalize common line breaks into a token
  let normalized = html
    .replace(/<br\s*\/?>/gi, BR_TOKEN)
    .replace(/<\/p>\s*<p[^>]*>/gi, BR_TOKEN)
    .replace(/<\/div>\s*<div[^>]*>/gi, BR_TOKEN);

  const parts = normalized.split(BR_TOKEN);

  let removed = 0;
  const kept: string[] = [];

  for (const part of parts) {
    const plain = part.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    // Remove inline choice lines like A) ... B) ... etc
    if (/^[A-D]\s*[\.)]\s+/i.test(plain)) {
      removed++;
      continue;
    }

    // Remove leading "Question:" label but keep the rest
    if (/^question:\s*/i.test(plain)) {
      const remainder = stripQuestionPrefixFromLineText(plain);
      kept.push(remainder);
      continue;
    }

    kept.push(part);
  }

  // Only apply if it really looks like a duplicated choice block
  if (removed < 2) return html;

  // Rebuild as simple HTML with breaks
  const rebuilt = kept
    .map((x) => (x ?? "").trim())
    .filter((x) => x.length > 0)
    .join("<br/>");

  return rebuilt.trim();
}

export async function loadAssessmentItems(file: File, qtiPath: string): Promise<LoadItemsResult> {
  const warnings: string[] = [];

  const buf = await file.arrayBuffer();
  const outerZip = await JSZip.loadAsync(buf);

  let zipToUse: JSZip = outerZip;
  let actualQtiPath = qtiPath;

  if (qtiPath.includes("::")) {
    const parts = qtiPath.split("::");
    const innerZipPath = parts.shift() ?? "";
    const innerQtiPath = parts.join("::");

    if (!innerZipPath || !innerQtiPath) {
      throw new Error("Invalid bundle QTI path: " + qtiPath);
    }

    const innerZipFile = outerZip.file(innerZipPath);
    if (!innerZipFile) {
      throw new Error("Nested package not found in zip: " + innerZipPath);
    }

    const innerBuf = await innerZipFile.async("arraybuffer");
    zipToUse = await JSZip.loadAsync(innerBuf);
    actualQtiPath = innerQtiPath;
  }

  const qtiFile = zipToUse.file(actualQtiPath);
  if (!qtiFile) throw new Error("QTI file not found in zip: " + actualQtiPath);

  const qtiText = await qtiFile.async("text");

  const doc = parseXml(qtiText);
  const itemEls = Array.from(doc.getElementsByTagName("item"));

  const index = buildZipPathIndex(zipToUse);
  const blobUrlCache = new Map<string, string>();

  const items: Item[] = [];
  for (const it of itemEls) {
    const id = it.getAttribute("ident") ?? "";
    const type = getQuestionType(it);

    let promptHtml = getPromptHtml(it);
    const promptRewritten = await rewriteHtmlWithZipResources(promptHtml, zipToUse, index, blobUrlCache);
    warnings.push(...promptRewritten.warnings);

    // Clean prompt numbering and remove embedded choice lists when present
    promptHtml = stripLeadingQuestionNumberingHtml(promptRewritten.html);
    promptHtml = removeInlineChoiceBlockFromPromptHtml(promptHtml);

    const rawChoices = getChoices(it);
    const choices: { id: string; html: string }[] = [];
    for (const c of rawChoices) {
      const rewritten = await rewriteHtmlWithZipResources(c.html, zipToUse, index, blobUrlCache);
      warnings.push(...rewritten.warnings);
      choices.push({ id: c.id, html: stripLeadingChoiceLabelingHtml(rewritten.html) });
    }

    const correctChoiceIds = getCorrectChoiceIds(it);
    items.push({ id, type, promptHtml, choices, correctChoiceIds });
  }

  const uniqWarnings = Array.from(new Set(warnings));
  return { items, warnings: uniqWarnings };
}
