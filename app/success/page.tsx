"use client";

import Link from "next/link";

export default function SuccessPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>QuizZip</h1>
      <p style={{ opacity: 0.85, marginTop: 8 }}>Payment completed. Your account will unlock in a moment.</p>
      <div style={{ marginTop: 16 }}>
        <Link href="/" style={{ textDecoration: "underline" }}>Return to app</Link>
      </div>
      <p style={{ opacity: 0.8, marginTop: 10 }}>If it does not unlock right away, refresh the page.</p>
    </main>
  );
}
