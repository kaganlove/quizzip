import Link from "next/link";

export default function LandingPage() {
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
        a {
          color: inherit;
          text-decoration: none;
        }
      `}</style>

      <style jsx>{`
        .wrap {
          padding: 28px 18px 60px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 240px;
        }
        .logo {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.35);
          flex: 0 0 auto;
        }
        .brandText {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }
        .name {
          font-size: 20px;
          font-weight: 950;
          letter-spacing: 0.2px;
        }
        .tagline {
          opacity: 0.85;
          font-size: 12px;
          margin-top: 4px;
        }
        .nav {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .pill {
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          font-weight: 800;
          font-size: 13px;
        }
        .pill.primary {
          background: rgba(120, 160, 255, 0.18);
          border-color: rgba(120, 160, 255, 0.28);
        }

        .hero {
          margin-top: 22px;
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 16px;
          align-items: stretch;
        }
        @media (max-width: 900px) {
          .hero {
            grid-template-columns: 1fr;
          }
        }

        .card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(10px);
        }

        .h1 {
          font-size: 36px;
          font-weight: 950;
          letter-spacing: 0.2px;
          line-height: 1.05;
          margin: 0;
        }
        .sub {
          opacity: 0.88;
          margin-top: 10px;
          font-size: 15px;
          line-height: 1.45;
          max-width: 62ch;
        }

        .ctaRow {
          display: flex;
          gap: 10px;
          margin-top: 14px;
          flex-wrap: wrap;
        }
        .btn {
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.08);
          color: #e7e9ee;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-width: 180px;
        }
        .btn.primary {
          background: rgba(120, 160, 255, 0.22);
          border-color: rgba(120, 160, 255, 0.30);
        }
        .btn:hover {
          filter: brightness(1.05);
        }

        .fine {
          margin-top: 10px;
          font-size: 12px;
          opacity: 0.82;
          line-height: 1.35;
        }

        .grid3 {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 900px) {
          .grid3 {
            grid-template-columns: 1fr;
          }
        }
        .kicker {
          font-size: 12px;
          opacity: 0.75;
          font-weight: 900;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .h2 {
          font-size: 18px;
          font-weight: 950;
          margin: 6px 0 0;
        }
        .p {
          margin: 8px 0 0;
          opacity: 0.88;
          line-height: 1.45;
          font-size: 13px;
        }

        .pricing {
          margin-top: 16px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 900px) {
          .pricing {
            grid-template-columns: 1fr;
          }
        }
        .priceBig {
          font-size: 28px;
          font-weight: 950;
          margin-top: 8px;
        }
        .muted {
          opacity: 0.78;
          font-size: 12px;
          margin-top: 6px;
          line-height: 1.35;
        }
        .ul {
          margin: 10px 0 0 18px;
          padding: 0;
          opacity: 0.9;
          font-size: 13px;
          line-height: 1.45;
        }
        .ul li {
          margin: 6px 0;
        }

        .footer {
          margin-top: 18px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          opacity: 0.75;
          font-size: 12px;
        }

        .miniDemo {
          display: grid;
          gap: 10px;
        }
        .demoBox {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(0, 0, 0, 0.22);
          padding: 14px;
        }
        .demoTitle {
          font-weight: 950;
          font-size: 14px;
        }
        .demoLine {
          margin-top: 6px;
          opacity: 0.86;
          font-size: 12px;
          line-height: 1.35;
        }
        .code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          padding: 2px 6px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.10);
        }
      `}</style>

      <header className="topbar">
        <div className="brand">
          <img className="logo" src="/quizzip-logo.png" alt="QuizZip logo" />
          <div className="brandText">
            <div className="name">QuizZip</div>
            <div className="tagline">View Canvas Classic quiz exports fast. Export to Word and Excel.</div>
          </div>
        </div>

        <nav className="nav">
          <Link className="pill" href="/app">
            Open app
          </Link>
          <Link className="pill" href="/login">
            Log in
          </Link>
          <Link className="pill primary" href="/signup">
            Create account
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div className="card">
          <h1 className="h1">Stop fighting QTI files.</h1>
          <div className="sub">
            QuizZip lets you drop in a Canvas Classic quiz export zip and instantly preview questions in the browser.
            When you are ready, export clean Word and Excel files.
          </div>

          <div className="ctaRow">
            <Link className="btn primary" href="/app">
              Try it now
            </Link>
            <Link className="btn" href="/signup">
              Start subscription
            </Link>
          </div>

          <div className="fine">
            Parsing stays in your browser. Your zip file is not uploaded to our servers.
          </div>

          <div className="grid3">
            <div className="card" style={{ padding: 14 }}>
              <div className="kicker">Fast review</div>
              <div className="h2">Preview questions instantly</div>
              <div className="p">Scan stems, choices, and correct answers without clicking through Canvas screens.</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="kicker">Clean export</div>
              <div className="h2">Word and Excel output</div>
              <div className="p">Generate a docx or xlsx on demand for SMEs, faculty review, or record keeping.</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="kicker">Clear limits</div>
              <div className="h2">Handles bank references</div>
              <div className="p">If a quiz references a bank, QuizZip tells you why questions are missing in the export.</div>
            </div>
          </div>
        </div>

        <div className="card miniDemo">
          <div className="demoBox">
            <div className="demoTitle">How it works</div>
            <div className="demoLine">1) Export a Classic Quiz from Canvas as a zip.</div>
            <div className="demoLine">2) Open <span className="code">/app</span> and upload the zip.</div>
            <div className="demoLine">3) Preview questions, then export to Word or Excel.</div>
          </div>

          <div className="demoBox">
            <div className="demoTitle">Best for</div>
            <div className="demoLine">Instructional designers, SMEs, faculty reviewers, course auditors.</div>
          </div>

          <div className="demoBox">
            <div className="demoTitle">Security note</div>
            <div className="demoLine">Quiz content stays local in the browser. Exports are generated locally too.</div>
          </div>
        </div>
      </section>

      <section className="pricing">
        <div className="card">
          <div className="kicker">Pricing</div>
          <div className="h2">Simple, predictable</div>
          <div className="priceBig">$9 / month</div>
          <div className="muted">Or $90 / year</div>
          <ul className="ul">
            <li>Unlimited exports</li>
            <li>Word and Excel download</li>
            <li>Account and billing portal</li>
          </ul>
          <div className="ctaRow" style={{ marginTop: 12 }}>
            <Link className="btn primary" href="/signup">
              Create account
            </Link>
            <Link className="btn" href="/app">
              Open app
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="kicker">FAQ</div>
          <div className="h2">Common questions</div>
          <ul className="ul">
            <li>Does it upload my zip file? No. Parsing stays in the browser.</li>
            <li>Does it support bank referenced quizzes? It detects them and explains the limitation.</li>
            <li>Does it work for New Quizzes? Not yet. Classic Quizzes first.</li>
          </ul>
          <div className="muted" style={{ marginTop: 10 }}>
            Want a tighter landing page later? We can add screenshots, testimonials, and a short demo video.
          </div>
        </div>
      </section>

      <footer className="footer">
        <div>© {new Date().getFullYear()} QuizZip</div>
        <div>
          <Link href="/app" className="pill">
            Open app
          </Link>
        </div>
      </footer>
    </main>
  );
}
