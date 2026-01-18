import Link from "next/link";

export const metadata = {
  title: "Quizzip",
  description:
    "Preview Canvas QTI zips in a clean UI, export to Word with images, and convert question banks into Canvas-ready QTI. Parsing happens in your browser.",
};

export default function LandingPage() {
  return (
    <main className="wrap">
      <div className="bgGlow" aria-hidden="true" />

      <div className="container">
        {/* Header */}
        <header className="topbar">
          <div className="brand">
            <div className="logo" aria-hidden="true">
              <img className="logoImg" src="/quizzip-logo.png" alt="" />
            </div>
            <div className="brandText">
              <div className="brandName">Quizzip</div>
              <div className="brandSub">Canvas quiz tools that just work</div>
            </div>
          </div>

          <nav className="nav">
            <a className="navLink" href="#how">
              How it works
            </a>
            <a className="navLink" href="#pricing">
              Pricing
            </a>
            <a className="navLink" href="#faq">
              FAQ
            </a>
          </nav>

          <div className="actions">
            <Link className="btn btnPrimary" href="/login?next=/app">
              Log in
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="hero">
          <div className="card heroLeft">
            <h1 className="h1">Preview QTI instantly. Convert question banks into Canvas-ready quizzes.</h1>

            <p className="p">
              Open Canvas Classic quiz export zips in a clean, readable view, export a Word file with images, and convert
              question banks into a Canvas-ready QTI zip you can import. Your files stay on your device for preview and
              formatted conversions.
            </p>

            <div className="ctaRow">
              <Link className="btn btnPrimary" href="/login?next=/app">
                Log in
              </Link>
              <Link className="btn btnGhost" href="/signup">
                Create account
              </Link>
            </div>

            <div className="pillRow" aria-label="Key benefits">
              <span className="pill">Free QTI preview</span>
              <span className="pill">Unlimited formatted import</span>
              <span className="pill">Smart import for any input</span>
              <span className="pill">Export to Word</span>
              <span className="pill">Images supported</span>
            </div>

            <div className="trustRow">
              <div className="trustItem">
                <div className="trustTitle">Privacy first</div>
                <div className="trustBody">Preview and formatted conversions run locally in your browser.</div>
              </div>
              <div className="trustItem">
                <div className="trustTitle">Made for review</div>
                <div className="trustBody">Preview what you will import before you touch Canvas.</div>
              </div>
              <div className="trustItem">
                <div className="trustTitle">Canvas-ready output</div>
                <div className="trustBody">Download a QTI zip and import directly into Canvas.</div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <aside id="pricing" className="card heroRight">
            <div className="kicker">Pricing</div>

            <div className="price">
              <span className="priceBig">$9</span>
              <span className="priceSmall">per month</span>
            </div>

            <div className="p small">
              Built for instructional designers and faculty who need a fast way to preview, clean up, and import quizzes into
              Canvas.
            </div>

            <ul className="list">
              <li>Free QTI preview in a clean UI</li>
              <li>Export to Word with images</li>
              <li>Unlimited formatted import and QTI export</li>
              <li>
                Smart import for any input (includes <strong>1,000 questions</strong> per month)
              </li>
              <li>Optional review pass before export</li>
              <li>Manage billing anytime</li>
            </ul>

            <Link className="btn btnPrimary full" href="/signup">
              Start now
            </Link>

            <div className="finePrint">
              Cancel anytime. Preview and formatted conversions stay local. Smart import uses AI and is metered.
            </div>
          </aside>
        </section>

        {/* Preview */}
        <section className="card preview">
          <div className="previewGrid">
            <div>
              <div className="kicker">What you get</div>
              <h2 className="h2">A quiz pipeline: preview, normalize, export, import</h2>
              <p className="p">
                Whether you are auditing a Canvas export or building a quiz bank from scratch, Quizzip gives you a clean review
                screen and a Canvas-ready QTI zip.
              </p>

              <div className="previewBullets">
                <div className="bullet">
                  <div className="bulletDot" aria-hidden="true" />
                  <div>
                    <div className="bulletTitle">Free QTI preview</div>
                    <div className="bulletBody">Open Canvas Classic exports and scan questions fast.</div>
                  </div>
                </div>

                <div className="bullet">
                  <div className="bulletDot" aria-hidden="true" />
                  <div>
                    <div className="bulletTitle">Two import lanes</div>
                    <div className="bulletBody">
                      Use formatted import for instant conversion, or Smart import to normalize almost anything.
                    </div>
                  </div>
                </div>

                <div className="bullet">
                  <div className="bulletDot" aria-hidden="true" />
                  <div>
                    <div className="bulletTitle">Review before you export</div>
                    <div className="bulletBody">Catch issues early, then download a QTI zip ready for Canvas import.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mock">
              <div className="mockTop">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
                <span className="mockTitle">Quizzip workflow</span>
              </div>

              <div className="mockBody">
                <div className="mockPanel">
                  <div className="mockH">1 Preview</div>
                  <div className="mockSub">Open a Canvas export zip and scan questions in a clean view</div>
                </div>

                <div className="mockPanel">
                  <div className="mockH">2 Import</div>
                  <div className="mockSub">Formatted import for instant conversion or Smart import for any input</div>
                </div>

                <div className="mockPanel">
                  <div className="mockH">3 Export</div>
                  <div className="mockSub">Download Word with images or a Canvas-ready QTI zip</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="card how">
          <div className="kicker">How it works</div>

          <div className="steps">
            <div className="step">
              <div className="stepNum">1</div>
              <div className="stepTitle">Preview QTI</div>
              <div className="stepBody">Open Canvas Classic export zips and review questions fast.</div>
            </div>

            <div className="step">
              <div className="stepNum">2</div>
              <div className="stepTitle">Import your question bank</div>
              <div className="stepBody">Use formatted import for instant conversion, or Smart import to normalize any input.</div>
            </div>

            <div className="step">
              <div className="stepNum">3</div>
              <div className="stepTitle">Export for Canvas</div>
              <div className="stepBody">Download a QTI zip and import directly into Canvas. Export Word too.</div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="card faq">
          <div className="kicker">FAQ</div>

          <details className="qa">
            <summary>Do my files get uploaded anywhere</summary>
            <div className="qaBody">
              QTI preview and formatted conversions run locally in your browser. Smart import uses AI and is processed server-side
              so we can generate a Canvas-ready QTI zip.
            </div>
          </details>

          <details className="qa">
            <summary>What is the difference between formatted import and Smart import</summary>
            <div className="qaBody">
              Formatted import uses our question format for instant conversion and does not require AI. Smart import is for
              pasted content or common files where formatting is inconsistent. We normalize it into the same output and you can
              review before exporting.
            </div>
          </details>

          <details className="qa">
            <summary>How many Smart import questions are included</summary>
            <div className="qaBody">
              Your plan includes up to 1,000 Smart import questions per month. QTI preview and formatted imports are not metered.
            </div>
          </details>

          <details className="qa">
            <summary>Does it support New Quizzes</summary>
            <div className="qaBody">Right now it is focused on Canvas Classic quiz export zips and Canvas-ready QTI output.</div>
          </details>

          <details className="qa">
            <summary>Can I cancel anytime</summary>
            <div className="qaBody">Yes. You can manage billing from the app and cancel whenever you want.</div>
          </details>

          <details className="qa">
            <summary>Will images export to Word</summary>
            <div className="qaBody">Yes. If the export zip includes images, Quizzip includes them in the Word export.</div>
          </details>
        </section>

        <footer className="footer">
          <div className="footerLeft">© {new Date().getFullYear()} Quizzip</div>
          <div className="footerRight">
            <Link className="footerLink" href="/login?next=/app">
              Log in
            </Link>
            <span className="footerSep" aria-hidden="true">
              •
            </span>
            <Link className="footerLink" href="/signup">
              Create account
            </Link>
          </div>
        </footer>
      </div>

      <style>{css}</style>
    </main>
  );
}

const css = `
  .wrap{
    min-height:100vh;
    padding:56px 18px;
    background:#070a12;
    color:rgba(255,255,255,0.92);
    position:relative;
    overflow:hidden;
  }

  .bgGlow{
    position:absolute;
    inset:-200px;
    background:
      radial-gradient(1200px 600px at 18% 10%, rgba(99,102,241,0.28), transparent 60%),
      radial-gradient(1100px 600px at 82% 30%, rgba(34,197,94,0.18), transparent 55%),
      radial-gradient(900px 520px at 55% 80%, rgba(56,189,248,0.10), transparent 60%);
    pointer-events:none;
    filter: blur(0px);
  }

  .container{
    max-width:1080px;
    margin:0 auto;
    position:relative;
    z-index:1;
  }

  .topbar{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:14px;
    margin-bottom:42px;
  }

  .brand{display:flex; align-items:center; gap:10px;}
  .logo{
    width:44px; height:44px;
    border-radius:12px;
    background:rgba(255,255,255,0.06);
    border:1px solid rgba(255,255,255,0.14);
    display:grid;
    place-items:center;
    overflow:hidden;
  }
  .logoImg{
    width:34px;
    height:34px;
    object-fit:contain;
    display:block;
  }

  .brandText{display:flex; flex-direction:column; gap:2px;}
  .brandName{font-weight:900; font-size:18px;}
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
    font-weight:900;
    border:1px solid rgba(255,255,255,0.16);
    color:rgba(255,255,255,0.92);
    background:rgba(255,255,255,0.06);
    transition: transform 120ms ease, background 120ms ease, border 120ms ease;
  }
  .btn:hover{transform: translateY(-1px); background:rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.22);}
  .btn:active{transform: translateY(0px);}
  .btnPrimary{
    background:rgba(255,255,255,0.14);
    border-color: rgba(255,255,255,0.22);
    color:rgba(255,255,255,0.95);
  }
  .btnGhost{background:rgba(255,255,255,0.06);}
  .btn.full{width:100%;}

  .card{
    padding:22px;
    border-radius:18px;
    background:rgba(255,255,255,0.06);
    border:1px solid rgba(255,255,255,0.12);
    box-shadow: 0 18px 50px rgba(0,0,0,0.35);
    backdrop-filter: blur(6px);
  }

  .hero{
    display:grid;
    grid-template-columns: 1.22fr 0.78fr;
    gap:18px;
    align-items:stretch;
  }

  .h1{
    font-size:48px;
    font-weight:1000;
    letter-spacing:-0.8px;
    line-height:1.02;
    margin:0;
  }
  .h2{
    font-size:26px;
    font-weight:1000;
    letter-spacing:-0.4px;
    line-height:1.15;
    margin:10px 0 0 0;
  }

  .p{
    margin-top:12px;
    opacity:0.82;
    font-size:16px;
    line-height:1.5;
    max-width:720px;
  }
  .p.small{font-size:14px; max-width: none;}

  .ctaRow{
    display:flex;
    gap:10px;
    margin-top:18px;
    flex-wrap:wrap;
  }

  .pillRow{
    margin-top:18px;
    display:flex;
    gap:10px;
    flex-wrap:wrap;
  }
  .pill{
    padding:7px 10px;
    border-radius:999px;
    border:1px solid rgba(255,255,255,0.12);
    background:rgba(255,255,255,0.06);
    opacity:0.85;
    font-size:13px;
    font-weight:800;
  }

  .trustRow{
    margin-top:18px;
    display:grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap:12px;
  }
  .trustItem{
    padding:12px;
    border-radius:16px;
    border:1px solid rgba(255,255,255,0.10);
    background:rgba(255,255,255,0.04);
  }
  .trustTitle{font-weight:1000; font-size:13px;}
  .trustBody{margin-top:6px; opacity:0.78; font-size:13px; line-height:1.35;}

  .kicker{
    font-weight:1000;
    font-size:13px;
    opacity:0.88;
    letter-spacing:0.2px;
  }

  .price{
    margin-top:10px;
    display:flex;
    gap:10px;
    align-items:baseline;
  }
  .priceBig{
    font-size:44px;
    font-weight:1000;
    letter-spacing:-0.8px;
  }
  .priceSmall{
    font-size:13px;
    opacity:0.72;
    font-weight:900;
  }

  .list{
    margin-top:14px;
    padding-left:18px;
    opacity:0.86;
    line-height:1.7;
    font-size:14px;
  }

  .finePrint{
    margin-top:10px;
    font-size:12px;
    opacity:0.70;
  }

  .preview{
    margin-top:18px;
    background:rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.10);
  }
  .previewGrid{
    display:grid;
    grid-template-columns: 1.05fr 0.95fr;
    gap:16px;
    align-items:stretch;
  }
  .previewBullets{margin-top:14px; display:flex; flex-direction:column; gap:12px;}
  .bullet{display:flex; gap:10px; align-items:flex-start;}
  .bulletDot{
    width:10px; height:10px;
    border-radius:999px;
    background:rgba(255,255,255,0.22);
    border:1px solid rgba(255,255,255,0.18);
    margin-top:6px;
    flex:0 0 auto;
  }
  .bulletTitle{font-weight:1000; font-size:14px;}
  .bulletBody{margin-top:4px; opacity:0.78; font-size:13px; line-height:1.35;}

  .mock{
    border-radius:18px;
    border:1px solid rgba(255,255,255,0.12);
    background:rgba(0,0,0,0.20);
    overflow:hidden;
  }
  .mockTop{
    display:flex;
    align-items:center;
    gap:8px;
    padding:12px;
    border-bottom:1px solid rgba(255,255,255,0.10);
    background:rgba(255,255,255,0.04);
  }
  .dot{
    width:10px; height:10px; border-radius:999px;
    background:rgba(255,255,255,0.14);
    border:1px solid rgba(255,255,255,0.12);
  }
  .mockTitle{
    margin-left:6px;
    font-size:12px;
    opacity:0.75;
    font-weight:900;
  }
  .mockBody{
    padding:14px;
    display:grid;
    grid-template-columns: 1fr;
    gap:10px;
  }
  .mockPanel{
    padding:12px;
    border-radius:16px;
    border:1px solid rgba(255,255,255,0.10);
    background:rgba(255,255,255,0.04);
  }
  .mockH{font-weight:1000; font-size:13px;}
  .mockSub{margin-top:6px; opacity:0.78; font-size:13px; line-height:1.35;}

  .how{
    margin-top:18px;
    background:rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.10);
  }
  .steps{
    margin-top:12px;
    display:grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap:12px;
  }
  .step{
    padding:14px;
    border-radius:16px;
    border:1px solid rgba(255,255,255,0.10);
    background:rgba(255,255,255,0.04);
  }
  .stepNum{
    width:28px;
    height:28px;
    border-radius:10px;
    display:grid;
    place-items:center;
    font-weight:1000;
    background:rgba(255,255,255,0.10);
    border:1px solid rgba(255,255,255,0.12);
  }
  .stepTitle{margin-top:10px; font-weight:1000;}
  .stepBody{margin-top:6px; opacity:0.78; font-size:13px; line-height:1.4;}

  .faq{
    margin-top:18px;
    background:rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.10);
  }
  .qa{
    margin-top:12px;
    border-radius:16px;
    border:1px solid rgba(255,255,255,0.10);
    background:rgba(255,255,255,0.04);
    padding:12px 14px;
  }
  .qa summary{
    cursor:pointer;
    font-weight:1000;
    opacity:0.92;
    list-style:none;
    outline:none;
  }
  .qa summary::-webkit-details-marker{display:none;}
  .qaBody{
    margin-top:10px;
    opacity:0.78;
    font-size:13px;
    line-height:1.45;
  }

  .footer{
    margin-top:26px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    opacity:0.65;
    font-size:12px;
  }
  .footerRight{display:flex; gap:10px; align-items:center; flex-wrap:wrap;}
  .footerLink{color:rgba(255,255,255,0.72); text-decoration:none; font-weight:900;}
  .footerLink:hover{color:rgba(255,255,255,0.92);}
  .footerSep{opacity:0.45;}

  @media (max-width: 940px){
    .nav{display:none;}
    .hero{grid-template-columns: 1fr;}
    .h1{font-size:42px;}
    .trustRow{grid-template-columns: 1fr; }
    .previewGrid{grid-template-columns: 1fr;}
    .steps{grid-template-columns: 1fr;}
  }

  @media (max-width: 520px){
    .wrap{padding:42px 14px;}
    .topbar{margin-bottom:28px;}
    .h1{font-size:36px;}
    .card{padding:18px;}
    .actions{gap:8px;}
    .btn{padding:10px 12px;}
  }
`;
