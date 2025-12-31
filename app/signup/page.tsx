"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabaseClient";

export default function SignupPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>QuizZip</h1>
      <p style={{ opacity: 0.85, marginTop: 8 }}>Create an account with email and password.</p>

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
          const { error } = await supabase.auth.signUp({ email, password });
          if (error) setMsg(error.message);
          else setMsg("Account created. You can log in now.");
        }}
        style={{ padding: "10px 14px", fontWeight: 800 }}
      >
        Create account
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <div style={{ height: 14 }} />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Link href="/login" style={{ textDecoration: "underline" }}>Log in</Link>
        <Link href="/" style={{ textDecoration: "underline" }}>Back</Link>
      </div>
    </main>
  );
}
