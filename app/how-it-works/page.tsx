// app/how-it-works/page.tsx
import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "How it works | Quizzip",
  description: "Preview, convert, and export Canvas quiz content with Quizzip.",
};

export default function HowItWorksPage() {
  return (
    <main className="wrap">
      <div className="container">
        <header className="topbar">
          <div className="brand">
            <img className="logoImg" src="/quizzip-logo.png" alt="Quizzip logo" />
            <div className="brandText">
              <div className="brandName">Quizzip</div>
              <div className="brandSub">Canvas quiz tools that just work</div>
            </div>
          </div>

          <nav className="nav">
            <Link className="navLink" href="/how-it-works">
              How it works
            </Link>
            <Link className="navLink" href="/pricing">
              Pricing
            </Link>
            <Link className="navLink" href="/#faq">
              FAQ
            </Link>
          </nav>

          <div className="actions">
            <Link className="btn btnPrimary" href="/login?next=/app">
              Log in
            </Link>
            <Link className="btn btnOutline" href="/signup">
              Create account
            </Link>
          </div>
        </header>

        <section className="card">
          <h1 className="h1">How it works</h1>
          <p className="pSmall">A simple quiz pipeline: preview, convert, export.</p>

          <div className="stepGrid">
            <div className="miniCard">
              <div className="miniTitle">Preview</div>
              <div className="miniBody">
                Open a Canvas Classic QTI export zip and instantly see questions, choices, and images in a clean browser view.
              </div>
              <ul className="miniList">
                <li>Runs locally in your browser</li>
                <li>No upload required for preview</li>
                <li>Built for fast review</li>
              </ul>
            </div>

            <div className="miniCard">
              <div className="miniTitle">Convert</div>
              <div className="miniBody">
                Upload or paste your question bank and generate a Canvas importable QTI zip when you are ready.
              </div>
              <ul className="miniList">
                <li>Formatted import for template based content</li>
                <li>Smart import for messy docs and mixed formats</li>
                <li>Review before export</li>
              </ul>
            </div>

            <div className="miniCard">
              <div className="miniTitle">Export</div>
              <div className="miniBody">
                Download a Canvas QTI import zip or a Word export with images for SME review.
              </div>
              <ul className="miniList">
                <li>Canvas import zip output</li>
                <li>Word export for review</li>
                <li>Designed to reduce rework</li>
              </ul>
            </div>
          </div>

          <div className="blockCard">
            <div className="blockTitle">Supported inputs for conversion</div>
            <div className="blockBody">
              Smart import can accept pasted content and common file types. Formatted import is best when your content follows the
              Quizzip template.
            </div>
            <ul className="miniList">
              <li>docx</li>
              <li>xlsx</li>
              <li>csv</li>
              <li>tsv</li>
              <li>txt</li>
              <li>pasted text</li>
            </ul>
          </div>

          <div className="ctaRow">
            <Link className="btn btnPrimary" href="/app">
              Open the app
            </Link>
            <Link className="btn btnOutline" href="/contact">
              Contact support
            </Link>
          </div>
        </section>

        <div className="mt8">
          <SiteFooter />
        </div>
      </div>

      <style>{css}</style>
    </main>
  );
}

const css = `
  html, body{ background:#070a12; }

  .wrap{
    min-height:100vh;
    padding:16px 18px;
    color:rgba(255,255,255,0.92);
    position:relative;
    overflow:hidden;
    background: transparent;
  }

  .wrap::before{
    content:"";
    position:fixed;
    inset:0;
    z-index:-1;
    background:
      radial-gradient(1200px 600px at 18% 10%, rgba(99,102,241,0.28), transparent 60%),
      radial-gradient(1100px 600px at 82% 30%, rgba(34,197,94,0.18), transparent 55%),
      radial-gradient(900px 520px at 55% 80%, rgba(56,189,248,0.10), transparent 60%),
      #070a12;
    background-repeat:no-repeat;
  }

  .container{ max-width:1080px; margin:0 auto; position:relative; z-index:1; }

  .topbar{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:14px;
    margin-bottom:22px;
  }

  .brand{
    display:flex;
    align-items:center;
    gap:14px;
  }
  .logoImg{
    width:64px;
    height:64px;
    object-fit:contain;
    display:block;
    filter: drop-shadow(0 10px 22px rgba(0,0,0,0.35));
  }
  .brandText{display:flex; flex-direction:column; gap:5px;}
  .brandName{font-weight:1000; font-size:20px; letter-spacing:-0.2px;}
  .brandSub{opacity:0.70; font-size:12px;}

  .nav{display:flex; gap:16px; align-items:center;}
  .navLink{
    color:rgba(255,255,255,0.78);
    text-decoration:none;
    font-weight:800;
    font-size:13px;
    padding:8px 10px;
    border-radius:12px;
  }
  .navLink:hover{background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.92);}

  .actions{display:flex; gap:10px; align-items:center;}

  .btn{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    padding:10px 14px;
    border-radius:14px;
    text-decoration:none;
    font-weight:950;
    border:1px solid rgba(255,255,255,0.16);
    color:rgba(255,255,255,0.94);
    background:rgba(255,255,255,0.06);
    transition: transform 120ms ease, filter 120ms ease, box-shadow 120ms ease, border 120ms ease;
  }
  .btn:hover{transform: translateY(-1px); filter: brightness(1.03);}
  .btn:active{transform: translateY(0px);}

  .btnPrimary{
    border-color: rgba(168,85,247,0.50);
    background: linear-gradient(135deg, rgba(168,85,247,0.95), rgba(236,72,153,0.78));
    box-shadow:
      0 12px 28px rgba(168,85,247,0.22),
      0 10px 24px rgba(236,72,153,0.12);
  }

  .btnOutline{
    border-color: rgba(168,85,247,0.45);
    background: rgba(168,85,247,0.10);
    color: rgba(255,255,255,0.96);
  }

  .card{
    padding:24px;
    border-radius:18px;
    background:rgba(255,255,255,0.06);
    border:1px solid rgba(255,255,255,0.12);
    box-shadow: 0 18px 50px rgba(0,0,0,0.35);
    backdrop-filter: blur(6px);
  }

  .h1{
    margin:0;
    font-weight:1000;
    letter-spacing:-0.6px;
    line-height:1.05;
    font-size:34px;
  }

  .pSmall{
    margin-top:10px;
    opacity:0.78;
    font-size:13px;
    line-height:1.6;
  }

  .stepGrid{
    margin-top:18px;
    display:grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap:14px;
  }

  .miniCard{
    padding:16px;
    border-radius:16px;
    border:1px solid rgba(255,255,255,0.10);
    background:rgba(255,255,255,0.04);
  }

  .miniTitle{ font-weight:1000; font-size:14px; }
  .miniBody{ margin-top:10px; opacity:0.80; font-size:13px; line-height:1.55; }

  .miniList{
    margin-top:12px;
    padding-left:18px;
    opacity:0.84;
    line-height:1.85;
    font-size:13px;
  }

  .blockCard{
    margin-top:18px;
    padding:18px;
    border-radius:16px;
    border:1px solid rgba(255,255,255,0.10);
    background:rgba(255,255,255,0.04);
  }

  .blockTitle{ font-weight:1000; font-size:13px; }
  .blockBody{ margin-top:10px; opacity:0.80; font-size:13px; line-height:1.6; }

  .ctaRow{
    margin-top:16px;
    display:flex;
    gap:12px;
    flex-wrap:wrap;
  }

  .mt8{ margin-top: 26px; }

  @media (max-width: 940px){
    .nav{display:none;}
    .stepGrid{ grid-template-columns: 1fr; }
  }

  @media (max-width: 520px){
    .wrap{padding:12px 14px;}
    .card{padding:20px;}
    .h1{font-size:30px;}
  }
`;
