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
  // Dedupe while keeping order
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

export async function parseCanvasQtiZip(file: File): Promise<ParseResult> {
  const warnings: string[] = [];

  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const manifestFile = zip.file("imsmanifest.xml");
  if (!manifestFile) throw new Error("imsmanifest.xml not found. This does not look like a Canvas quiz export zip.");
  const manifestText = await manifestFile.async("text");
  const manifestDoc = parseXml(manifestText);

  const resources = Array.from(manifestDoc.getElementsByTagName("resource"));
  const qtiResources = resources.filter((r) => r.getAttribute("type") === "imsqti_xmlv1p2");

  if (qtiResources.length === 0) {
    throw new Error("No QTI resources found in manifest. This might not be a Classic Quiz export.");
  }

  const assessments: Assessment[] = [];
  for (const res of qtiResources) {
    const files = Array.from(res.getElementsByTagName("file"));
    const href = files[0]?.getAttribute("href") ?? "";
    if (!href) continue;

    const qtiFile = zip.file(href);
    if (!qtiFile) {
      warnings.push("Manifest referenced a file that was not found: " + href);
      continue;
    }

    const qtiText = await qtiFile.async("text");

    const idFromPath = href.split("/")[0] || href;
    try {
      const assessment = parseQtiAssessment(qtiText, idFromPath, href);
      assessments.push(assessment);
    } catch (e: any) {
      warnings.push("Could not parse assessment " + href + ": " + (e?.message ?? String(e)));
    }
  }

  // Sort by title for sanity
  assessments.sort((a, b) => a.title.localeCompare(b.title));

  return { assessments, warnings };
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

  // Common IMS CC placeholder
  if (s.startsWith("$IMS-CC-FILEBASE$/")) {
    s = s.slice("$IMS-CC-FILEBASE$/".length);
  }

  // Strip leading markers
  s = s.replace(/^\.\//, "");
  s = s.replace(/^\//, "");
  return s;
}

function looksLikeExternalUrl(s: string): boolean {
  const t = s.trim().toLowerCase();
  return t.startsWith("http://") || t.startsWith("https://") || t.startsWith("data:");
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

  // Direct matches
  const direct = index.byNorm.get(norm);
  if (direct) return direct;

  // Sometimes HTML uses relative segments
  const alt1 = norm.replace(/^resources\//, "");
  const alt2 = norm.replace(/^web_resources\//, "");
  const a1 = index.byNorm.get(alt1);
  if (a1) return a1;
  const a2 = index.byNorm.get(alt2);
  if (a2) return a2;

  // Fallback: basename match if unique
  const base = getBasename(norm).toLowerCase();
  const matches = index.all.filter((p) => getBasename(p).toLowerCase() === base);
  if (matches.length === 1) return matches[0];

  // If multiple, pick the shortest path (usually closest)
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

  // Parse as HTML fragment safely
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
      // Not an image file, leave it alone but warn
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

  // Some QTI content may link files via anchor tags
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

export async function loadAssessmentItems(file: File, qtiPath: string): Promise<LoadItemsResult> {
  const warnings: string[] = [];
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const qtiFile = zip.file(qtiPath);
  if (!qtiFile) throw new Error("QTI file not found in zip: " + qtiPath);
  const qtiText = await qtiFile.async("text");

  const doc = parseXml(qtiText);
  const itemEls = Array.from(doc.getElementsByTagName("item"));

  const index = buildZipPathIndex(zip);
  const blobUrlCache = new Map<string, string>();

  const items: Item[] = [];
  for (const it of itemEls) {
    const id = it.getAttribute("ident") ?? "";
    const type = getQuestionType(it);

    let promptHtml = getPromptHtml(it);
    const promptRewritten = await rewriteHtmlWithZipResources(promptHtml, zip, index, blobUrlCache);
    promptHtml = promptRewritten.html;
    warnings.push(...promptRewritten.warnings);

    const rawChoices = getChoices(it);
    const choices: { id: string; html: string }[] = [];
    for (const c of rawChoices) {
      const rewritten = await rewriteHtmlWithZipResources(c.html, zip, index, blobUrlCache);
      warnings.push(...rewritten.warnings);
      choices.push({ id: c.id, html: rewritten.html });
    }

    const correctChoiceIds = getCorrectChoiceIds(it);
    items.push({ id, type, promptHtml, choices, correctChoiceIds });
  }

  // Reduce duplicate warnings
  const uniqWarnings = Array.from(new Set(warnings));

  return { items, warnings: uniqWarnings };
}
