"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabaseClient";

function getCanonicalOrigin(): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  const host = url.hostname.startsWith("www.") ? url.hostname.slice(4) : url.hostname;
  return `${url.protocol}//${host}`;
}

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const targetNext = useMemo(() => {
    if (typeof window === "undefined") return "/app";
    const url = new URL(window.location.href);
    return url.searchParams.get("next") || "/app";
  }, []);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) window.location.href = targetNext;
    };
    run();
  }, [supabase, targetNext]);

  async function signInWithGoogle() {
    setMsg("");

    const origin = getCanonicalOrigin() || (typeof window !== "undefined" ? window.location.origin : "");
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(targetNext)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) setMsg(error.message);
  }

  async function signInWithPassword() {
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
    else window.location.href = targetNext;
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
          min-height: 100vh;
          padding: 18px;
          display: grid;
          place-items: center;
        }

        .card {
          width: 100%;
          max-width: 560px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(10px);
        }

        .top {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .logo {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.35);
          object-fit: contain;
          flex: 0 0 auto;
        }
        .h1 {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 0.2px;
          margin: 0;
        }
        .sub {
          opacity: 0.85;
          margin-top: 6px;
          line-height: 1.35;
          font-size: 13px;
        }

        .hr {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 14px 0;
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
          text-align: center;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
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
          color: rgba(255, 255, 255, 0.96);
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

        .small {
          font-size: 12px;
          opacity: 0.85;
          line-height: 1.35;
        }

        .links {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          margin-top: 12px;
        }
        .link {
          text-decoration: none;
          font-weight: 900;
          font-size: 12px;
          opacity: 0.85;
          color: rgba(255, 255, 255, 0.9);
        }
        .link:hover {
          opacity: 1;
          text-decoration: underline;
        }
      `}</style>

      <div className="card">
        <div className="top">
          <img src="/quizzip-logo.png" alt="Quizzip logo" className="logo" />
          <div>
            <h1 className="h1">Quizzip</h1>
            <div className="sub">Log in with email and password, or Google.</div>
          </div>
        </div>

        <div style={{ height: 14 }} />

        <button onClick={signInWithGoogle} className="btn btnPrimary" type="button">
          Continue with Google
        </button>

        <div className="hr" />

        <div className="small" style={{ fontWeight: 900, opacity: 0.7 }}>
          OR
        </div>

        <div style={{ height: 12 }} />

        <label className="label">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" />

        <div style={{ height: 12 }} />

        <label className="label">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          className="input"
          autoComplete="current-password"
        />

        <div style={{ height: 14 }} />

        <button onClick={signInWithPassword} className="btn btnOutline" type="button">
          Log in
        </button>

        {msg ? (
          <div style={{ marginTop: 12 }}>
            <div className="small" style={{ border: "1px solid r
