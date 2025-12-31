"use client";

import Link from "next/link";

export default function CancelPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>QuizZip</h1>
      <p style={{ opacity: 0.85, marginTop: 8 }}>Checkout canceled.</p>
      <div style={{ marginTop: 16 }}>
        <Link href="/" style={{ textDecoration: "underline" }}>Back to app</Link>
      </div>
    </main>
  );
}
