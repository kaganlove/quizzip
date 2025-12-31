"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabaseClient";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>QuizZip</h1>
      <p style={{ opacity: 0.85, marginTop: 8 }}>Log in with email and password.</p>

      <div style={{ height: 18 }} />

      <label style={{ display: "block", fontWeight: 800 }}>Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 6 }} />

      <div style={{ height: 12 }} />

      <label style={{ display: "block", fontWeight: 800 }}>Password</label>
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        style={{ width: "100%", padding: 10, marginTop: 6 }}
      />

      <div style={{ height: 16 }} />

      <button
        onClick={async () => {
          setMsg("");
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) setMsg(error.message);
          else window.location.href = "/";
        }}
        style={{ padding: "10px 14px", fontWeight: 800 }}
      >
        Log in
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <div style={{ height: 14 }} />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Link href="/signup" style={{ textDecoration: "underline" }}>Create account</Link>
        <Link href="/reset" style={{ textDecoration: "underline" }}>Forgot password</Link>
        <Link href="/" style={{ textDecoration: "underline" }}>Back</Link>
      </div>
    </main>
  );
}
