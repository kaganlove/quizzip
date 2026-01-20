"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DOMPurify from "dompurify";

import type { Assessment, Item } from "../../lib/types";
import { loadAssessmentItems, parseCanvasQtiZip } from "../../lib/qti";
import { downloadBlob, exportDocx, exportXlsx } from "../../lib/exporters";
import { stripHtml } from "../../lib/html";
import { supabaseBrowser } from "../../lib/supabaseClient";

function pillClass(a: Assessment) {
  if (a.itemCount > 0) return "pill good";
  if (a.bankRefCount > 0) return "pill warn";
  return "pill bad";
}

function statusText(a: Assessment) {
  if (a.itemCount > 0) return "Exportable";
  if (a.bankRefCount > 0) return "Bank referenced";
  return "Empty";
}

function stripExtension(name: string) {
  const idx = name.lastIndexOf(".");
  if (idx <= 0) return name;
  return name.slice(0, idx);
}

function safeFilenameBase(input: string) {
  const s = (input || "").trim();
  if (!s) return "canvas_import";

  let out = s.replace(/[\\/:*?"<>|]/g, "_");
  out = out.replace(/\s+/g, " ").trim();
  if (!out) out = "canvas_import";
  return out.slice(0, 120);
}

export default function Page() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [toolTab, setToolTab] = useState<"preview" | "convert">("preview");
  const [toolGateMsg, setToolGateMsg] = useState<string>("");

  // Preview state
  const [file, setFile] = useState<File | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [itemWarnings, setItemWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [notice, setNotice] = useState<string>("");

  // Canvas import builder (Smart import uses AI)
  const [importTab, setImportTab] = useState<"smart" | "formatted">("smart");
  const [importRaw, setImportRaw] = useState<string>("");

  // User chosen bank name for conversion output
  const [importTitle, setImportTitle] = useState<string>("");

  const [importBusy, setImportBusy] = useState<boolean>(false);
  const [importError, setImportError] = useState<string>("");

  // Smart import image map (kept in memory only)
  const [importImages, setImportImages] = useState<Array<{ id: string; src: string }>>([]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  };

  // Auth and subscription state
  const [userEmail, setUserEmail] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");
  const [subStatus, setSubStatus] = useState<string>("");
  const [subPeriodEnd, setSubPeriodEnd] = useState<string | null>(null);
  const [subCancelAtPeriodEnd, setSubCancelAtPeriodEnd] = useState<boolean>(false);
  const [subInterval, setSubInterval] = useState<string>("");
  const [isPaid, setIsPaid] = useState(false);

  // One time background sync guards
  const [didBootstrapSync, setDidBootstrapSync] = useState(false);
  const [didPostCheckoutSync, setDidPostCheckoutSync] = useState(false);

  const subscriptionLabel = useMemo(() => {
    const status = subStatus || "none";
    const end = formatDate(subPeriodEnd);
    const intervalPart = subInterval ? ` · ${subInterval}` : "";
    let suffix = "";
    if ((subStatus === "active" || subStatus === "trialing") && end) {
      suffix = subCancelAtPeriodEnd ? ` cancels ${end}` : ` renews ${end}`;
    }
    return `${status}${suffix}${intervalPart}`;
  }, [subStatus, subPeriodEnd, subCancelAtPeriodEnd, subInterval]);

  function sanitizeHtml(html: string) {
    return DOMPurify.sanitize(html, {
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|blob|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-]|$))/i,
    }) as string;
  }

  async function refreshEntitlements() {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const email = session?.user?.email ?? "";
      const token = session?.access_token ?? "";

      setUserEmail(email);
      setAccessToken(token);

      if (!token || !session?.user?.id) {
        setSubStatus("");
        setSubPeriodEnd(null);
        setSubCancelAtPeriodEnd(false);
        setSubInterval("");
        setIsPaid(false);
        return;
      }

      const userId = session.user.id;

      const { data: row, error: subErr } = await supabase
        .from("subscriptions")
        .select("status, current_period_end, cancel_at_period_end, price_interval")
        .eq("user_id", userId)
        .maybeSingle();

      if (subErr) {
        setSubStatus("");
        setSubPeriodEnd(null);
        setSubCancelAtPeriodEnd(false);
        setSubInterval("");
        setIsPaid(false);
        return;
      }

      const anyRow = row as any;
      const status = anyRow?.status ?? "";
      setSubStatus(status);
      setSubPeriodEnd(anyRow?.current_period_end ?? null);
      setSubCancelAtPeriodEnd(!!anyRow?.cancel_at_period_end);
      setSubInterval(anyRow?.price_interval ?? "");

      const active = status === "active" || status === "trialing";
      setIsPaid(active);
    } catch {
      setSubStatus("");
      setSubPeriodEnd(null);
      setSubCancelAtPeriodEnd(false);
      setSubInterval("");
      setIsPaid(false);
    }
  }

  async function syncFromStripeSilently(token: string) {
    try {
      await fetch("/api/stripe/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token }),
      });
    } catch {
      // silent
    }
  }

  useEffect(() => {
    void refreshEntitlements();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refreshEntitlements();
      setDidBootstrapSync(false);
      setDidPostCheckoutSync(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    if (didPostCheckoutSync) return;

    const url = new URL(window.location.href);
    const checkout = url.searchParams.get("checkout");
    const success = url.searchParams.get("success");
    const sessionId = url.searchParams.get("session_id") || url.searchParams.get("stripe_session_id");

    const looksLikeCheckoutReturn = checkout === "success" || success === "true" || Boolean(sessionId);
    if (!looksLikeCheckoutReturn) return;

    (async () => {
      const mode = checkout === "cancel" ? "cancel" : "success";
      setNotice(mode === "success" ? "Payment complete. Unlocking your account now." : "Checkout canceled. No changes were made.");

      setDidPostCheckoutSync(true);
      await syncFromStripeSilently(accessToken);
      await refreshEntitlements();

      url.searchParams.delete("checkout");
      url.searchParams.delete("success");
      url.searchParams.delete("session_id");
      url.searchParams.delete("stripe_session_id");
      window.history.replaceState({}, "", url.toString());

      window.setTimeout(() => setNotice(""), 4000);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, didPostCheckoutSync]);

  useEffect(() => {
    if (!accessToken) return;
    if (didBootstrapSync) return;

    const status = (subStatus || "").toLowerCase();
    const active = status === "active" || status === "trialing";
    if (active) return;

    (async () => {
      setDidBootstrapSync(true);
      await syncFromStripeSilently(accessToken);
      await refreshEntitlements();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, subStatus, didBootstrapSync]);

  // If user switches away from Smart import, drop any in memory images map
  useEffect(() => {
    if (importTab !== "smart") setImportImages([]);
  }, [importTab]);

  function renderCorrect(q: Item) {
    const letters: string[] = [];
    const texts: string[] = [];

    for (const cid of q.correctChoiceIds) {
      const idx = q.choices.findIndex((c) => c.id === cid);
      if (idx >= 0) letters.push(String.fromCharCode(65 + idx));
      const t = stripHtml(q.choices[idx]?.html || "").trim();
      if (t) texts.push(t);
    }

    if (letters.length === 0) return null;

    return (
      <div className="small" style={{ marginTop: 10 }}>
        <span style={{ fontWeight: 800 }}>Correct:</span> <span className="code">{letters.join(", ")}</span>
        {texts.length > 0 && <span> {texts.join(" | ")}</span>}
      </div>
    );
  }

  const selected = useMemo(() => assessments.find((a) => a.id === selectedId) ?? null, [assessments, selectedId]);

  const freePreviewLimit = 5;

  const previewItems = useMemo(() => {
    const list = items ?? [];
    return isPaid ? list : list.slice(0, freePreviewLimit);
  }, [items, isPaid]);

  async function onPickFile(f: File | null) {
    setFile(f);
    setAssessments([]);
    setItems([]);
    setWarnings([]);
    setItemWarnings([]);
    setSelectedId("");
    setError("");

    if (!f) return;

    setLoading(true);
    try {
      const parsed = await parseCanvasQtiZip(f);
      setAssessments(parsed.assessments);
      setWarnings(parsed.warnings);
      if (parsed.assessments.length > 0) {
        setSelectedId(parsed.assessments[0].id);
      }
    } catch (e: any) {
      setError(e?.message ?? "Could not parse zip.");
    } finally {
      setLoading(false);
    }
  }

  async function onSelect(id: string) {
    if (!file) return;
    const a = assessments.find((x) => x.id === id);
    if (!a) return;

    setSelectedId(id);
    setItems([]);
    setItemWarnings([]);
    setError("");

    if (a.itemCount === 0) return;

    setLoading(true);
    try {
      const res = await loadAssessmentItems(file, a.qtiPath);
      setItems(res.items);
      setItemWarnings(res.warnings);
    } catch (e: any) {
      setError(e?.message ?? "Could not load assessment items.");
    } finally {
      setLoading(false);
    }
  }

  async function doExportDocx() {
    if (!selected) return;
    const blob = await exportDocx(selected.title, items);
    downloadBlob(blob, `${selected.title || "quiz"}.docx`);
  }

  async function doExportXlsx() {
    if (!selected) return;
    const blob = await exportXlsx(selected.title, items);
    downloadBlob(blob, `${selected.title || "quiz"}.xlsx`);
  }

  function estimateQuestionCount(raw: string) {
    const matches = raw.match(/^\s*\d+\.\s+/gm);
    return matches ? matches.length : 0;
  }

  async function importToCanvas(mode: "convert" | "review") {
    setImportError("");
    const raw = importRaw.trim();
    if (!raw) {
      setImportError("Paste questions first.");
      return;
    }
    if (!accessToken) {
      setImportError("Please log in first.");
      return;
    }
    if (!isPaid) {
      setImportError("Conversion is part of the subscription.");
      return;
    }

    try {
      setImportBusy(true);

      const res = await fetch("/api/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          raw,
          mode,
          title: importTitle.trim() || undefined,
          images: importImages,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Import failed.");
      }

      const blob = await res.blob();

      const base = safeFilenameBase(importTitle.trim() || "Canvas Import");
      const suffix = mode === "review" ? "_review" : "";
      downloadBlob(blob, `${base}${suffix}.zip`);
    } catch (e: any) {
      setImportError(e?.message || "Import failed.");
    } finally {
      setImportBusy(false);
    }
  }

  // DOCX helpers:
  // Smart import: extract HTML but replace base64 images with tokens to avoid huge AI outputs
  async function extractDocxAsRawText(ab: ArrayBuffer): Promise<string> {
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({ arrayBuffer: ab });
    return (result.value || "").trim();
  }

  async function extractDocxAsHtmlWithTokens(
    ab: ArrayBuffer
  ): Promise<{ html: string; images: Array<{ id: string; src: string }> }> {
    const mammoth = await import("mammoth/mammoth.browser");

    const result = await mammoth.convertToHtml(
      { arrayBuffer: ab },
      {
        convertImage: mammoth.images.inline(async (image: any) => {
          const b64 = await image.read("base64");
          const contentType = image.contentType || "image/png";
          return { src: `data:${contentType};base64,${b64}` };
        }),
      }
    );

    const rawHtml = (result.value || "").trim();
    if (!rawHtml) return { html: "", images: [] };

    const doc = new DOMParser().parseFromString(`<div>${rawHtml}</div>`, "text/html");
    const root = doc.body.firstElementChild as HTMLElement | null;

    const images: Array<{ id: string; src: string }> = [];
    if (root) {
      const imgs = Array.from(root.querySelectorAll("img"));
      let n = 0;

      for (const img of imgs) {
        const src = (img.getAttribute("src") || "").trim();
        if (!src.toLowerCase().startsWith("data:")) continue;

        n += 1;
        const id = `QUIZZIP_IMAGE_${n}`;
        images.push({ id, src });

        img.setAttribute("src", `quizzip:${id}`);
      }
    }

    const htmlOut = root ? root.innerHTML : rawHtml;
    return { html: htmlOut.trim(), images };
  }

  async function extractTextFromFile(f: File, opts: { preserveDocxImages: boolean }): Promise<string> {
    const name = f.name.toLowerCase();

    if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv") || name.endsWith(".tsv")) {
      setImportImages([]);
      return await f.text();
    }

    if (name.endsWith(".docx")) {
      const ab = await f.arrayBuffer();
      if (opts.preserveDocxImages) {
        const { html, images } = await extractDocxAsHtmlWithTokens(ab);
        setImportImages(images);
        return html;
      }
      setImportImages([]);
      return await extractDocxAsRawText(ab);
    }

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      setImportImages([]);
      const ab = await f.arrayBuffer();
      const XLSX = await import("xlsx");
      const wb = XLSX.read(ab, { type: "array" });

      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      if (!ws) return "";

      const csv = XLSX.utils.sheet_to_csv(ws);
      return csv.trim();
    }

    setImportImages([]);
    throw new Error("Unsupported file type.");
  }

  async function handleImportFile(f: File | null) {
    if (!f) return;

    if (importTab === "smart" && !isPaid) {
      setImportError("Conversion is part of the subscription. Subscribe to unlock.");
      return;
    }

    setImportError("");

    try {
      const preserveDocxImages = importTab === "smart";
      const text = await extractTextFromFile(f, { preserveDocxImages });

      if (!text || !text.trim()) {
        setImportError("We could not extract any text from that file. Try copy paste instead.");
        return;
      }

      setImportRaw(text);

      if (!importTitle.trim()) {
        setImportTitle(stripExtension(f.name));
      }
    } catch (e: any) {
      setImportError(e?.message || "Could not read that file.");
    }
  }

  async function startCheckout(billing: "monthly" | "yearly") {
    if (!accessToken) {
      alert("Please log in first.");
      return;
    }
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken, billing }),
      });
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
      else alert(data?.error ?? "Could not start checkout.");
    } catch (e: any) {
      alert(e?.message ?? "Could not start checkout.");
    }
  }

  async function openBillingPortal() {
    if (!accessToken) {
      alert("Please log in first.");
      return;
    }
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
      });
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
      else alert(data?.error ?? "Could not open billing portal.");
    } catch (e: any) {
      alert(e?.message ?? "Could not open billing portal.");
    }
  }

  function handleToolClick(next: "preview" | "convert") {
    setToolGateMsg("");
    if (next === "preview") {
      setToolTab("preview");
      return;
    }

    // Convert is subscription gated
    if (!userEmail) {
      setToolGateMsg("Log in to unlock conversion.");
      return;
    }
    if (!isPaid) {
      setToolGateMsg("Conversion is part of the subscription.");
      return;
    }

    setToolTab("convert");
  }

  const accountStatusPill = useMemo(() => {
    const status = (subStatus || "").toLowerCase();
    const active = status === "active" || status === "trialing";
    if (!userEmail) return { cls: "pill bad", text: "Not signed in" };
    if (active) return { cls: "pill good", text: "Active" };
    return { cls: "pill warn", text: "Free" };
  }, [subStatus, userEmail]);

  const convertLocked = !isPaid;

  return (
    <main className="wrap">
      <style jsx global>{`
        :root {
          color-scheme: dark;
        }
        body {
          margin: 0;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji",
            "Segoe UI Emoji";
          background: radial-gradient(1200px 700px at 10% 10%, #1b2a55 0%, #0b1020 45%, #070a12 100%);
          color: #e7e9ee;
        }
        .wrap {
          padding: 18px 18px 40px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .brandLogo {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.35);
          flex: 0 0 auto;
        }
        .brandText {
          display: flex;
          flex-direction: column;
        }
        .h1 {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 0.2px;
        }
        .sub {
          opacity: 0.85;
          margin-top: 6px;
          line-height: 1.35;
          font-size: 13px;
        }

        .accountTop {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .accountEmail {
          font-size: 12px;
          opacity: 0.85;
          max-width: 260px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        details.dropdown {
          position: relative;
        }
        details.dropdown summary {
          list-style: none;
          cursor: pointer;
          user-select: none;
        }
        details.dropdown summary::-webkit-details-marker {
          display: none;
        }
        .dropBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 14px;
          border: 1px solid rgba(168, 85, 247, 0.35);
          background: rgba(168, 85, 247, 0.12);
          color: rgba(255, 255, 255, 0.92);
          font-weight: 900;
        }
        .dropPanel {
          position: absolute;
          right: 0;
          top: 46px;
          width: 260px;
          z-index: 50;
          border-radius: 16px;
          background: rgba(20, 16, 34, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 16px 50px rgba(0, 0, 0, 0.45);
          padding: 12px;
        }
        .dropTitle {
          font-weight: 900;
          font-size: 13px;
        }
        .dropLine {
          margin-top: 8px;
          font-size: 12px;
          opacity: 0.85;
          line-height: 1.35;
          word-break: break-word;
        }

        .grid {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: stretch;
          margin-top: 14px;
        }
        .card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(10px);
        }

        .sectionTitle {
          font-size: 16px;
          font-weight: 950;
          margin: 0;
        }

        .small {
          font-size: 12px;
          opacity: 0.85;
          line-height: 1.35;
        }

        .btn {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.08);
          color: #e7e9ee;
          font-weight: 900;
          cursor: pointer;
          transition: transform 120ms ease, filter 120ms ease, box-shadow 120ms ease;
        }
        .btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.03);
        }
        .btn:active {
          transform: translateY(0px);
        }

        .btnPrimary {
          border-color: rgba(168, 85, 247, 0.5);
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.95), rgba(236, 72, 153, 0.78));
          box-shadow: 0 12px 28px rgba(168, 85, 247, 0.22), 0 10px 24px rgba(236, 72, 153, 0.12);
        }
        .btnPrimary:hover {
          box-shadow: 0 14px 34px rgba(168, 85, 247, 0.28), 0 12px 26px rgba(236, 72, 153, 0.16);
        }
        .btnOutline {
          border-color: rgba(168, 85, 247, 0.45);
          background: rgba(168, 85, 247, 0.1);
        }

        .hr {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 12px 0;
        }

        .notice {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 12px;
          line-height: 1.35;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.2px;
        }
        .pill.good {
          background: rgba(46, 204, 113, 0.12);
        }
        .pill.warn {
          background: rgba(241, 196, 15, 0.14);
        }
        .pill.bad {
          background: rgba(231, 76, 60, 0.14);
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .table th,
        .table td {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 10px 8px;
          text-align: left;
          vertical-align: top;
        }
        .table th {
          font-size: 12px;
          opacity: 0.8;
          font-weight: 900;
        }

        .choice {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 10px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          margin-top: 8px;
        }
        .choice.correct {
          border-color: rgba(46, 204, 113, 0.55);
          background: rgba(46, 204, 113, 0.08);
        }
        .tag {
          width: 26px;
          height: 26px;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.07);
          flex: 0 0 auto;
        }

        .code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          padding: 2px 6px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tabsRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .tabBtn {
          flex: 1 1 auto;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.92);
          font-weight: 950;
          cursor: pointer;
        }
        .tabBtn.active {
          border-color: rgba(168, 85, 247, 0.55);
          background: rgba(168, 85, 247, 0.16);
        }

        .tabMetaRow {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 10px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .tabMeta {
          font-size: 12px;
          opacity: 0.78;
          line-height: 1.3;
        }

        .label {
          display: block;
          font-weight: 900;
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(0, 0, 0, 0.25);
          color: #e7e9ee;
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
        }
        .input:focus {
          border-color: rgba(168, 85, 247, 0.55);
          box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.12);
        }

        @media (max-width: 820px) {
          .accountEmail {
            display: none;
          }
        }
      `}</style>

      {/* Top bar */}
      <div className="topbar">
        <div className="brand">
          <img className="brandLogo" src="/quizzip-logo.png" alt="Quizzip logo" />
          <div className="brandText">
            <div className="h1">Quizzip</div>
            <div className="sub">Preview Canvas Classic exports, then convert question banks into a Canvas import zip.</div>
          </div>
        </div>

        <div className="accountTop">
          <div className="accountEmail">{userEmail || "Not signed in"}</div>
          <span className={accountStatusPill.cls}>{accountStatusPill.text}</span>

          <details className="dropdown">
            <summary className="dropBtn" aria-label="Account menu">
              ☰
            </summary>
            <div className="dropPanel">
              <div className="dropTitle">Account</div>
              <div className="dropLine">{userEmail ? userEmail : "Not signed in"}</div>
              <div className="dropLine">Plan: {subscriptionLabel}</div>

              {notice ? (
                <div className="notice" style={{ marginTop: 10 }}>
                  {notice}
                </div>
              ) : null}

              <div className="hr" />

              {!userEmail ? (
                <>
                  <Link className="btn btnPrimary" href="/login?next=/app">
                    Log in
                  </Link>
                  <div style={{ height: 10 }} />
                  <Link className="btn btnOutline" href="/signup">
                    Create account
                  </Link>
                  <div className="small" style={{ marginTop: 10 }}>
                    Monthly 9 dollars. Yearly 90 dollars.
                  </div>
                </>
              ) : (
                <>
                  {!isPaid ? (
                    <>
                      <button className="btn btnPrimary" onClick={() => void startCheckout("monthly")}>
                        Subscribe monthly
                      </button>
                      <div style={{ height: 10 }} />
                      <button className="btn btnOutline" onClick={() => void startCheckout("yearly")}>
                        Subscribe yearly
                      </button>
                      <div className="small" style={{ marginTop: 10 }}>
                        After payment, return here and exports unlock automatically.
                      </div>
                    </>
                  ) : (
                    <>
                      <button className="btn btnPrimary" onClick={() => void openBillingPortal()}>
                        Manage billing
                      </button>
                    </>
                  )}

                  <div style={{ height: 10 }} />

                  <button
                    className="btn btnOutline"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = "/app";
                    }}
                  >
                    Log out
                  </button>
                </>
              )}
            </div>
          </details>
        </div>
      </div>

      {/* Tool chooser + main content */}
      <div className="grid">
        {/* Tool chooser */}
        <div className="card" style={{ flex: "1 1 320px", minWidth: 300 }}>
          <h2 className="sectionTitle">Tools</h2>
          <div className="small" style={{ marginTop: 8 }}>
            Preview runs locally. Conversion is unlocked with a subscription.
          </div>

          <div style={{ height: 12 }} />

          <div className="tabsRow">
            <button
              type="button"
              className={"tabBtn " + (toolTab === "preview" ? "active" : "")}
              onClick={() => handleToolClick("preview")}
            >
              Preview QTI
            </button>

            <button
              type="button"
              className={"tabBtn " + (toolTab === "convert" ? "active" : "")}
              onClick={() => handleToolClick("convert")}
            >
              Convert to Canvas {convertLocked ? "🔒" : ""}
            </button>
          </div>

          <div className="tabMetaRow">
            <div className="tabMeta">Open a Canvas export zip and scan questions.</div>
            <div className="tabMeta">{convertLocked ? "Requires subscription" : "Unlocked"}</div>
          </div>

          {toolGateMsg ? (
            <>
              <div style={{ height: 12 }} />
              <div className="notice" style={{ borderColor: "rgba(168, 85, 247, 0.45)" }}>
                <b>{toolGateMsg}</b>
                <div style={{ marginTop: 8 }}>
                  {!userEmail ? (
                    <>
                      <Link className="btn btnPrimary" href="/login?next=/app">
                        Log in to continue
                      </Link>
                      <div style={{ height: 10 }} />
                      <Link className="btn btnOutline" href="/signup">
                        Create account
                      </Link>
                    </>
                  ) : (
                    <>
                      <button className="btn btnPrimary" onClick={() => void startCheckout("monthly")}>
                        Unlock conversion
                      </button>
                      <div className="small" style={{ marginTop: 10 }}>
                        Want yearly. Choose it from the account menu.
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : null}

          <div style={{ height: 12 }} />

          {toolTab === "preview" ? (
            <div className="notice">
              <b>Preview</b>
              <div style={{ marginTop: 8 }}>Upload a Canvas Classic export zip to view assessments and questions.</div>
              <div className="small" style={{ marginTop: 10 }}>Nothing is uploaded to our servers for preview.</div>
            </div>
          ) : (
            <div className="notice">
              <b>Convert</b>
              <div style={{ marginTop: 8 }}>Upload or paste your question bank, then export a Canvas import zip.</div>
              <div className="small" style={{ marginTop: 10 }}>Docs: paste content, or download as docx and upload.</div>
            </div>
          )}
        </div>

        {/* Preview flow */}
        {toolTab === "preview" ? (
          <>
            <div className="card" style={{ flex: "1 1 320px", minWidth: 300 }}>
              <h2 className="sectionTitle">Upload export zip</h2>

              <div style={{ height: 10 }} />

              <input type="file" accept=".zip" onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)} disabled={loading} />

              <div style={{ height: 10 }} />

              <div className="small">Parsing stays in your browser.</div>

              {warnings.length > 0 && (
                <>
                  <div className="hr" />
                  <div className="notice">
                    <b>Warnings</b>
                    <ul style={{ margin: "8px 0 0 18px" }}>
                      {warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {error && (
                <>
                  <div className="hr" />
                  <div className="notice">
                    <b>Error</b>
                    <div style={{ marginTop: 6 }}>{error}</div>
                  </div>
                </>
              )}
            </div>

            <div className="card" style={{ flex: "2 1 560px", minWidth: 320 }}>
              <h2 className="sectionTitle">Assessments</h2>

              {!file && <div className="small" style={{ marginTop: 10 }}>Upload a zip to see assessments.</div>}

              {file && (
                <>
                  <div style={{ height: 10 }} />

                  <table className="table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Items</th>
                        <th>Bank refs</th>
                        <th>Types</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.map((a) => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 900 }}>{a.title || a.id}</td>
                          <td>
                            <span className={pillClass(a)}>{statusText(a)}</span>
                          </td>
                          <td>{a.itemCount}</td>
                          <td>{a.bankRefCount}</td>
                          <td className="small">
                            {Object.entries(a.typeCounts)
                              .map(([k, v]) => `${k}:${v}`)
                              .join(", ")}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button className="btn btnPrimary" onClick={() => void onSelect(a.id)} disabled={loading}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {selected && selected.itemCount === 0 && selected.bankRefCount > 0 && (
                    <>
                      <div className="hr" />
                      <div className="notice">
                        <b>This export does not include questions</b>
                        <div style={{ marginTop: 6 }}>
                          It references question banks ({selected.bankRefCount} bank refs). Canvas does not embed those questions in this export zip, so
                          preview and export are not possible for this assessment.
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          /* Convert flow */
          <div className="card" style={{ flex: "2 1 900px", minWidth: 320 }}>
            <h2 className="sectionTitle">Convert questions into a Canvas import zip</h2>
            <div className="small" style={{ marginTop: 8 }}>
              Smart import uses AI and is metered. Formatted import will export instantly without AI soon.
            </div>

            <div style={{ height: 14 }} />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className={"tabBtn " + (importTab === "smart" ? "active" : "")}
                onClick={() => setImportTab("smart")}
                type="button"
              >
                Smart import
              </button>
              <button
                className={"tabBtn " + (importTab === "formatted" ? "active" : "")}
                onClick={() => setImportTab("formatted")}
                type="button"
              >
                Formatted import
              </button>
            </div>

            <div style={{ height: 14 }} />

            <div className="notice">
              <b>{importTab === "smart" ? "Smart import" : "Formatted import"}</b>
              <div style={{ marginTop: 8 }}>Upload docx, xlsx, csv, tsv, txt, md, or paste content.</div>
              <div className="small" style={{ marginTop: 10 }}>Docs: paste content, or download as docx and upload.</div>
              {importTab === "smart" && !isPaid && <div className="small" style={{ marginTop: 10 }}>Conversion is part of the subscription.</div>}
            </div>

            <div style={{ height: 12 }} />

            <label className="label">Bank name</label>
            <input
              className="input"
              value={importTitle}
              onChange={(e) => setImportTitle(e.target.value)}
              placeholder="Example: Chapter 28 Air Brakes"
            />

            <div style={{ height: 12 }} />

            <input
              type="file"
              accept=".txt,.md,.csv,.tsv,.docx,.xlsx,.xls,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => void handleImportFile(e.target.files?.[0] || null)}
              disabled={importTab === "smart" && !isPaid}
            />

            <div style={{ height: 10 }} />

            <textarea
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.25)",
                color: "#e7e9ee",
                padding: 10,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 12,
                lineHeight: 1.4,
              }}
              value={importRaw}
              onChange={(e) => setImportRaw(e.target.value)}
              placeholder={importTab === "smart" ? "Paste anything that looks like questions and answers." : "Paste questions in Quizzip formatted style."}
              rows={12}
            />

            <div style={{ height: 10 }} />

            <div className="small" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span>Estimated questions: {estimateQuestionCount(importRaw)}</span>
              <span>{importTab === "smart" ? "Included: 1,000 questions per month" : "Unlimited formatted import"}</span>
            </div>

            <div style={{ height: 12 }} />

            {importTab === "smart" ? (
              <>
                <button className="btn btnPrimary" disabled={!isPaid || importBusy} onClick={() => void importToCanvas("convert")}>
                  {importBusy ? "Working..." : "Export Canvas import zip"}
                </button>

                <div style={{ height: 10 }} />

                <button className="btn btnOutline" disabled={!isPaid || importBusy} onClick={() => void importToCanvas("review")}>
                  {importBusy ? "Working..." : "Export with one review pass"}
                </button>
              </>
            ) : (
              <>
                <button className="btn btnPrimary" disabled type="button">
                  Export Canvas import zip
                </button>

                <div style={{ height: 10 }} />

                <div className="notice">
                  <b>Next</b>
                  <div style={{ marginTop: 6 }}>We will wire this lane to export instantly without AI. For now, Smart import handles the conversion.</div>
                </div>
              </>
            )}

            {importError && (
              <>
                <div style={{ height: 10 }} />
                <div className="notice" style={{ borderColor: "rgba(255, 99, 99, 0.35)" }}>
                  {importError}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Preview + Export panels */}
      {toolTab === "preview" && selected ? (
        <>
          <div style={{ height: 16 }} />

          <div className="grid">
            <div className="card" style={{ flex: "2 1 560px", minWidth: 320 }}>
              <h2 className="sectionTitle">Preview</h2>

              <div style={{ height: 10 }} />

              {itemWarnings.length > 0 && (
                <div className="notice" style={{ marginBottom: 12 }}>
                  <b>Item warnings</b>
                  <ul style={{ margin: "8px 0 0 18px" }}>
                    {itemWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!file && <div className="small">Upload a zip.</div>}
              {file && selected.itemCount === 0 && <div className="small">No items available for this assessment.</div>}
              {file && selected.itemCount > 0 && items.length === 0 && <div className="small">Click View to load questions.</div>}

              {previewItems.map((q, qi) => (
                <div key={q.id} className="notice" style={{ marginBottom: 12 }}>
                  <div className="small">{q.type}</div>
                  <div style={{ fontSize: 18, fontWeight: 950, marginTop: 6 }}>{qi + 1}.</div>
                  <div style={{ marginTop: 8 }}>
                    <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.promptHtml || "(no prompt)") }} />
                  </div>

                  {q.choices.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {q.choices.map((c, ci) => {
                        const isCorrectChoice = q.correctChoiceIds.includes(c.id);
                        return (
                          <div key={c.id} className={"choice " + (isCorrectChoice ? "correct" : "")}>
                            <div className="tag">{String.fromCharCode(65 + ci)}</div>
                            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.html || "(blank choice)") }} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {renderCorrect(q)}

                  {!isPaid && qi === freePreviewLimit - 1 && items.length > freePreviewLimit && (
                    <div className="small" style={{ marginTop: 10 }}>
                      Preview limited to first {freePreviewLimit} questions. Subscribe to view all.
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="card" style={{ flex: "1 1 320px", minWidth: 300 }}>
              <h2 className="sectionTitle">Export</h2>
              <div className="small" style={{ marginTop: 8 }}>
                Files are generated in your browser.
              </div>

              <div style={{ height: 12 }} />

              <button className="btn btnPrimary" disabled={!isPaid || loading || items.length === 0} onClick={doExportDocx}>
                Export Word
              </button>

              <div style={{ height: 10 }} />

              <button className="btn btnOutline" disabled={!isPaid || loading || items.length === 0} onClick={doExportXlsx}>
                Export Excel
              </button>

              {!isPaid && (
                <>
                  <div style={{ height: 12 }} />
                  <div className="notice">
                    <b>Locked</b>
                    <div style={{ marginTop: 6 }}>Exports are unlocked with a subscription.</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
