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

export default function Page() {
  const supabase = useMemo(() => supabaseBrowser(), []);

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
  const [importBusy, setImportBusy] = useState<boolean>(false);
  const [importError, setImportError] = useState<string>("");

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
      // Allow blob: URLs created from zip resources and data: URLs if they appear.
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

      // Important: TypeScript needs an explicit guard that session exists
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
      // Silent on purpose
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

  // If the user returns from Stripe, do a single background sync and clean the URL.
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

  // Extra safety: one time background sync after login if status is missing or incomplete.
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
      setImportError("Smart import is part of the paid plan.");
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
        body: JSON.stringify({ raw, mode }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Import failed.");
      }

      const blob = await res.blob();
      const filename = mode === "review" ? "canvas_import_review.zip" : "canvas_import.zip";
      downloadBlob(blob, filename);
    } catch (e: any) {
      setImportError(e?.message || "Import failed.");
    } finally {
      setImportBusy(false);
    }
  }

  async function handleImportFile(f: File | null) {
    if (!f) return;
    setImportError("");
    try {
      const name = f.name.toLowerCase();
      const ok = name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv") || name.endsWith(".tsv");
      if (!ok) {
        setImportError("For now, Smart import file upload supports txt, md, csv, and tsv. You can also paste content.");
        return;
      }
      const text = await f.text();
      setImportRaw(text);
      setImportTab("smart");
    } catch {
      setImportError("Could not read that file.");
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
          padding: 28px 18px 40px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .grid {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: stretch;
        }
        .card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(10px);
        }
        .h1 {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 0.2px;
        }
        .sub {
          opacity: 0.85;
          margin-top: 6px;
          line-height: 1.35;
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
          font-weight: 800;
          cursor: pointer;
        }
        .btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .hr {
          height: 1px;
          background: rgba(255, 255, 255, 0.10);
          margin: 12px 0;
        }
        .notice {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.10);
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
          font-weight: 800;
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
          border-bottom: 1px solid rgba(255, 255, 255, 0.10);
          padding: 10px 8px;
          text-align: left;
          vertical-align: top;
        }
        .table th {
          font-size: 12px;
          opacity: 0.8;
          font-weight: 800;
        }
        .choice {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 10px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.10);
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
          border: 1px solid rgba(255, 255, 255, 0.10);
        }
        input[type="file"] {
          width: 100%;
        }
        a {
          color: #cfe2ff;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .brandLogo {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.35);
          flex: 0 0 auto;
        }
        .brandText {
          display: flex;
          flex-direction: column;
        }
      `}</style>

      <div className="brand">
        <img className="brandLogo" src="/quizzip-logo.png" alt="QuizZip logo" />
        <div className="brandText">
          <div className="h1">QuizZip</div>
          <div className="sub">Upload a Canvas Classic quiz export zip. Parsing stays in your browser.</div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="grid">
        <div className="card" style={{ flex: "1 1 320px", minWidth: 300 }}>
          <h2>1) Upload</h2>
          <input type="file" accept=".zip" onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)} disabled={loading} />
          <div style={{ height: 10 }} />
          <div className="small">Nothing is uploaded to our servers.</div>

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

        <div className="card" style={{ flex: "1 1 320px", minWidth: 300 }}>
          <h2>2) Account and plan</h2>

          {!userEmail && (
            <div className="notice">
              <b>Log in to unlock exports</b>
              <div style={{ marginTop: 8 }}>
                <Link href="/login" style={{ textDecoration: "underline" }}>
                  Log in
                </Link>{" "}
                <Link href="/signup" style={{ textDecoration: "underline" }}>
                  Create account
                </Link>
              </div>
              <div className="small" style={{ marginTop: 8 }}>
                Monthly 9 dollars. Yearly 90 dollars.
              </div>
            </div>
          )}

          {userEmail && (
            <>
              <div className="notice">
                <b>Signed in</b>
                <div className="small" style={{ marginTop: 6 }}>
                  {userEmail}
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  Subscription status: {subscriptionLabel}
                </div>
              </div>
              {notice ? (
                <div className="notice" style={{ marginTop: 10 }}>
                  {notice}
                </div>
              ) : null}

              <div style={{ height: 10 }} />

              {!isPaid && (
                <>
                  <button className="btn" onClick={() => void startCheckout("monthly")}>
                    Subscribe monthly
                  </button>
                  <div style={{ height: 10 }} />
                  <button className="btn" onClick={() => void startCheckout("yearly")}>
                    Subscribe yearly
                  </button>
                  <div className="small" style={{ marginTop: 10 }}>
                    After payment, return here and exports unlock automatically. If it does not unlock, log out and log in again.
                  </div>
                </>
              )}

              {isPaid && (
                <>
                  <button className="btn" onClick={() => void openBillingPortal()}>
                    Manage billing
                  </button>
                </>
              )}

              <div style={{ height: 10 }} />

              <button
                className="btn"
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

        <div className="card" style={{ flex: "2 1 560px", minWidth: 320 }}>
          <h2>3) Assessments</h2>

          {!file && <div className="small">Upload a zip to see assessments.</div>}

          {file && (
            <>
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
                      <td style={{ fontWeight: 800 }}>{a.title || a.id}</td>
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
                        <button className="btn" onClick={() => void onSelect(a.id)} disabled={loading}>
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
                      It references question banks ({selected.bankRefCount} bank refs). Canvas does not embed those questions in this quiz export zip,
                      so preview and export are not possible for this assessment.
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {selected && (
        <>
          <div style={{ height: 16 }} />

          <div className="grid">
            <div className="card" style={{ flex: "2 1 560px", minWidth: 320 }}>
              <h2>Preview</h2>

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
                  <div style={{ fontSize: 18, fontWeight: 900, marginTop: 6 }}>{qi + 1}.</div>
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
              <h2>Export</h2>
              <div className="small">Files are generated in your browser.</div>

              <div style={{ height: 12 }} />

              <button className="btn" disabled={!isPaid || loading || items.length === 0} onClick={doExportDocx}>
                Export Word (.docx)
              </button>

              <div style={{ height: 10 }} />

              <button className="btn" disabled={!isPaid || loading || items.length === 0} onClick={doExportXlsx}>
                Export Excel (.xlsx)
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

              {isPaid && (
                <>
                  <div style={{ height: 12 }} />
                  <div className="notice">
                    <b>Unlocked</b>
                    <div className="small" style={{ marginTop: 6 }}>
                      Active subscription detected.
                    </div>
                  </div>
                </>
              )}

              <div className="hr" />

              <div className="small">
                Next steps:
                <ul style={{ margin: "8px 0 0 18px" }}>
                  <li>Embed images in Word exports</li>
                  <li>Add New Quizzes support</li>
                  <li>Improve bank referenced guidance</li>
                </ul>
              </div>
            </div>

            <div className="card" style={{ flex: "1 1 320px", minWidth: 300 }}>
              <h2>Import to Canvas</h2>
              <div className="small">Smart import uses AI and is metered. Formatted import is coming next.</div>

              <div style={{ height: 12 }} />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="pill"
                  style={{ cursor: "pointer", background: importTab === "smart" ? "rgba(255,255,255,0.10)" : "transparent" }}
                  onClick={() => setImportTab("smart")}
                  type="button"
                >
                  Smart import
                </button>
                <button
                  className="pill"
                  style={{ cursor: "pointer", background: importTab === "formatted" ? "rgba(255,255,255,0.10)" : "transparent" }}
                  onClick={() => setImportTab("formatted")}
                  type="button"
                >
                  Formatted import
                </button>
              </div>

              <div style={{ height: 12 }} />

              {importTab === "smart" ? (
                <>
                  <div className="small">
                    Paste anything that looks like questions and answers. Or upload a txt, md, csv, or tsv file.
                  </div>

                  <div style={{ height: 10 }} />

                  <input
                    type="file"
                    accept=".txt,.md,.csv,.tsv,text/plain,text/csv,text/tab-separated-values"
                    onChange={(e) => handleImportFile(e.target.files?.[0] || null)}
                  />

                  <div style={{ height: 10 }} />

                  <textarea
                    style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.25)", color: "#e7e9ee", padding: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace", fontSize: 12, lineHeight: 1.4 }}
                    value={importRaw}
                    onChange={(e) => setImportRaw(e.target.value)}
                    placeholder={"Paste questions here. Example:\n\n1. What is 2+2?\na) 3\n*b) 4\nc) 5\n\n2. True or False: The sky is blue.\n*a) True\nb) False"}
                    rows={10}
                  />

                  <div style={{ height: 10 }} />

                  <div className="small" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span>Estimated questions: {estimateQuestionCount(importRaw)}</span>
                    <span>Included: 1,000 questions per month</span>
                  </div>

                  <div style={{ height: 12 }} />

                  <button className="btn" disabled={!isPaid || importBusy} onClick={() => importToCanvas("convert")}>
                    {importBusy ? "Working..." : "Export QTI zip"}
                  </button>

                  <div style={{ height: 10 }} />

                  <button className="btn" disabled={!isPaid || importBusy} onClick={() => importToCanvas("review")}>
                    {importBusy ? "Working..." : "Export with one review pass"}
                  </button>

                  {importError && (
                    <>
                      <div style={{ height: 10 }} />
                      <div className="notice" style={{ borderColor: "rgba(255, 99, 99, 0.35)" }}>{importError}</div>
                    </>
                  )}

                  {!isPaid && (
                    <>
                      <div style={{ height: 10 }} />
                      <div className="notice">
                        <b>Locked</b>
                        <div style={{ marginTop: 6 }}>Smart import is unlocked with a subscription.</div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="small">
                    Use our formatted question style for fast, predictable imports. This lane will export without AI soon.
                  </div>

                  <div style={{ height: 10 }} />

                  <textarea
                    style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.25)", color: "#e7e9ee", padding: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace", fontSize: 12, lineHeight: 1.4 }}
                    value={importRaw}
                    onChange={(e) => setImportRaw(e.target.value)}
                    placeholder={"Formatted example:\n\n1. What is 2+3?\na) 6\nb) 1\n*c) 5\nd) 10\n\n2. Which of the following are dinosaurs?\n[ ] Woolly mammoth\n[*] Tyrannosaurus rex\n[*] Triceratops\n[ ] Smilodon fatalis"}
                    rows={10}
                  />

                  <div style={{ height: 10 }} />

                  <div className="small">Detected questions: {estimateQuestionCount(importRaw)}</div>

                  <div style={{ height: 12 }} />

                  <button className="btn" disabled type="button">
                    Export QTI zip
                  </button>

                  <div style={{ height: 10 }} />

                  <div className="notice">
                    <b>Next</b>
                    <div style={{ marginTop: 6 }}>
                      We will wire this lane to export instantly without AI. For now, use Smart import above.
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </>
      )}
    </main>
  );
}
