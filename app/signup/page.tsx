"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabaseClient";
import SiteFooter from "../../components/SiteFooter";

export default function SignupPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>QuizZip</h1>
      <p style={{ opacity: 0.85, marginTop: 8 }}>Create an account with email and password.</p>

      <div style={{ height: 18 }} />

      <label style={{ display: "block", fontWeight: 800 }}>Email</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, marginTop: 6 }}
        autoComplete="email"
      />

      <div style={{ height: 12 }} />

      <label style={{ display: "block", fontWeight: 800 }}>Password</label>
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        style={{ width: "100%", padding: 10, marginTop: 6 }}
        autoComplete="new-password"
      />

      <div style={{ height: 16 }} />

      <button
        disabled={busy}
        onClick={async () => {
          setMsg("");
          setBusy(true);

          const emailRedirectTo =
            typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: emailRedirectTo ? { emailRedirectTo } : undefined,
          });

          setBusy(false);

          if (error) {
            setMsg(error.message);
            return;
          }

          if (data?.session) {
            router.push("/app");
            return;
          }

          setMsg("Account created. Check your email to confirm, then return to log in.");
        }}
        style={{ padding: "10px 14px", fontWeight: 800, opacity: busy ? 0.7 : 1 }}
      >
        {busy ? "Creating account..." : "Create account"}
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <div style={{ height: 14 }} />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Link href="/login" style={{ textDecoration: "underline" }}>
          Log in
        </Link>
        <Link href="/" style={{ textDecoration: "underline" }}>
          Back
        </Link>
      </div>

      <div style={{ marginTop: 28 }}>
        <div
          style={{
            background: "#070a12",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <SiteFooter />
        </div>
      </div>
    </main>
  );
}
