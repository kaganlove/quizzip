import Link from "next/link";

export default function LandingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "56px 18px",
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(99,102,241,0.25), transparent 60%), radial-gradient(1200px 600px at 80% 30%, rgba(34,197,94,0.18), transparent 55%), #070a12",
        color: "rgba(255,255,255,0.92)",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            marginBottom: 46,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.14)",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
              }}
            >
              QZ
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>QuizZip</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>Canvas Classic quiz export viewer</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link
              href="/login"
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.92)",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Log in
            </Link>

            <Link
              href="/app"
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.95)",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Launch app
            </Link>
          </div>
        </div>

        {/* Hero */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          <section
            style={{
              padding: 22,
              borderRadius: 18,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ fontSize: 44, fontWeight: 1000, letterSpacing: -0.6, lineHeight: 1.05 }}>
              See Canvas Classic quiz exports like a normal human
            </div>

            <p style={{ marginTop: 12, opacity: 0.82, fontSize: 16, lineHeight: 1.45, maxWidth: 720 }}>
              Upload a Canvas Classic quiz export zip, view questions fast, and export clean formats. Parsing stays in your browser.
              Nothing gets uploaded to our servers.
            </p>

            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <Link
                href="/app"
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.14)",
                  color: "rgba(255,255,255,0.95)",
                  fontWeight: 900,
                  textDecoration: "none",
                }}
              >
                Launch app
              </Link>

              <Link
                href="/signup"
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.92)",
                  fontWeight: 900,
                  textDecoration: "none",
                }}
              >
                Create account
              </Link>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                opacity: 0.8,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <span style={pill()}>No installs</span>
              <span style={pill()}>Fast review</span>
              <span style={pill()}>Export to Word</span>
              <span style={pill()}>Images supported</span>
            </div>
          </section>

          {/* Pricing card */}
          <aside
            style={{
              padding: 22,
              borderRadius: 18,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ fontWeight: 1000, fontSize: 18 }}>Pricing</div>
            <div style={{ marginTop: 10, fontSize: 40, fontWeight: 1000, letterSpacing: -0.6 }}>
              $9<span style={{ fontSize: 14, opacity: 0.7, fontWeight: 800 }}>/month</span>
            </div>

            <div style={{ marginTop: 10, opacity: 0.8, fontSize: 14, lineHeight: 1.4 }}>
              Built for instructional designers and faculty who need to sanity check banks quickly.
            </div>

            <ul style={{ marginTop: 14, paddingLeft: 18, opacity: 0.86, lineHeight: 1.6 }}>
              <li>Upload Canvas Classic export zip</li>
              <li>Readable question view</li>
              <li>Export Word with images</li>
              <li>Manage billing anytime</li>
            </ul>

            <Link
              href="/app"
              style={{
                display: "block",
                marginTop: 16,
                textAlign: "center",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.95)",
                fontWeight: 1000,
                textDecoration: "none",
              }}
            >
              Start now
            </Link>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Cancel anytime. No file uploads to our servers.
            </div>
          </aside>
        </div>

        {/* How it works */}
        <section style={{ marginTop: 18, padding: 22, borderRadius: 18, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ fontWeight: 1000, fontSize: 18 }}>How it works</div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={stepCard()}>
              <div style={stepNum()}>1</div>
              <div style={stepTitle()}>Export from Canvas</div>
              <div style={stepBody()}>Use Canvas Classic export and grab the zip.</div>
            </div>

            <div style={stepCard()}>
              <div style={stepNum()}>2</div>
              <div style={stepTitle()}>Upload and review</div>
              <div style={stepBody()}>Browse questions, images, and answers in a clean view.</div>
            </div>

            <div style={stepCard()}>
              <div style={stepNum()}>3</div>
              <div style={stepTitle()}>Export clean files</div>
              <div style={stepBody()}>Download Word exports and share with SMEs fast.</div>
            </div>
          </div>
        </section>

        <footer style={{ marginTop: 26, opacity: 0.6, fontSize: 12 }}>
          © {new Date().getFullYear()} QuizZip
        </footer>
      </div>
    </main>
  );
}

function pill(): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
  };
}

function stepCard(): React.CSSProperties {
  return {
    padding: 14,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  };
}

function stepNum(): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    fontWeight: 1000,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.12)",
  };
}

function stepTitle(): React.CSSProperties {
  return { marginTop: 10, fontWeight: 1000 };
}

function stepBody(): React.CSSProperties {
  return { marginTop: 6, opacity: 0.78, fontSize: 13, lineHeight: 1.4 };
}
