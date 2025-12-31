"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabaseClient";

export default function ResetPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>QuizZip</h1>
      <p style={{ opacity: 0.85, marginTop: 8 }}>Send a password reset email.</p>

      <div style={{ height: 18 }} />

      <label style={{ display: "block", fontWeight: 800 }}>Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 6 }} />

      <div style={{ height: 16 }} />

      <button
        onClick={async () => {
          setMsg("");
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/`,
          });
          if (error) setMsg(error.message);
          else setMsg("Password reset email sent.");
        }}
        style={{ padding: "10px 14px", fontWeight: 800 }}
      >
        Send reset email
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
