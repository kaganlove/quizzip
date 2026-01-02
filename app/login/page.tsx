"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabaseClient";

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
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(targetNext)}`;

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
    <main style={{ padding: 24, maxWidth: 520 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img
          src="/quizzip-logo.png"
          alt="Quizzip logo"
          style={{ width: 44, height: 44, objectFit: "contain" }}
        />
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Quizzip</h1>
          <p style={{ opacity: 0.85, marginTop: 4, marginBottom: 0 }}>
            Log in with email and password, or Google.
          </p>
        </div>
      </div>

      <div style={{ height: 18 }} />

      <button
        onClick={signInWithGoogle}
        style={{
          width: "100%",
          padding: "12px 14px",
          fontWeight: 900,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(255,255,255,0.08)",
          cursor: "pointer",
        }}
      >
        Continue with Google
      </button>

      <div style={{ height: 18 }} />

      <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>OR</div>

      <div style={{ height: 12 }} />

      <label style={{ display: "block", fontWeight: 800 }}>Email</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, marginTop: 6 }}
      />

      <div style={{ height: 12 }} />

      <label style={{ display: "block", fontWeight: 800 }}>Password</label>
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        style={{ width: "100%", padding: 10, marginTop: 6 }}
      />

      <div style={{ height: 16 }} />

      <button onClick={signInWithPassword} style={{ padding: "10px 14px", fontWeight: 800 }}>
        Log in
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <div style={{ height: 14 }} />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Link href="/signup" style={{ textDecoration: "underline" }}>
          Create account
        </Link>
        <Link href="/reset" style={{ textDecoration: "underline" }}>
          Forgot password
        </Link>
        <Link href="/" style={{ textDecoration: "underline" }}>
          Back
        </Link>
      </div>
    </main>
  );
}
