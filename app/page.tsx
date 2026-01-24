import Link from "next/link";
import SiteFooter from "../components/SiteFooter";

export const metadata = {
  title: "Quizzip",
  description:
    "Preview Canvas Classic QTI exports in a clean UI, export to Word with images, and convert question banks into a Canvas import zip.",
};

export default function LandingPage() {
  return (
    <main className="wrap">
      <div className="container">
        {/* Header */}
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
            <a className="navLink" href="#faq">
              FAQ
            </a>
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

        {/* Hero */}
        <section className="hero">
          <div className="card heroLeft">
            <h1 className="h1">
              <span className="h1Main">Preview Canvas QTI instantly.</span>
              <span className="h1Sub">Open an export zip in a clean view, then convert when you are ready.</span>
            </h1>

            <p className="p">
              Open a Canvas Classic QTI zip in your browser and scan questions fast. Your file stays on your computer.
            </p>

            <div className="ctaRow">
              <Link className="btn btnPrimary btnBig" href="/login?next=/app">
                Open the app
              </Link>
              <Link className="btn btnOutline btnBig" href="/signup">
                Create account
              </Link>
            </div>

            <ul className="featureList" aria-label="Key benefits">
              <li>In browser QTI preview</li>
              <li>Export to Word with images</li>
              <li>Formatted import for template based banks</li>
              <li>Smart import for messy docs and sheets</li>
              <li>Canvas import zip output</li>
            </ul>

            <div className="trustRow">
              <div className="trustItem">
                <div className="trustTitle">Privacy first</div>
                <div className="trustBody">Preview runs locally. Nothing is uploaded for preview.</div>
              </div>
              <div className="trustItem">
                <div className="trustTitle">Built for review</div>
                <div className="trustBody">See what will import before you touch Canvas.</div>
              </div>
              <div className="trustItem">
                <div className="trustTitle">Fast exports</div>
                <div className="trustBody">Word exports with images for SMEs and faculty.</div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <aside id="pricing" className="card heroRight">
  <div className="kicker">Pricing</div>

  <div className="price">
    <span className="priceBig">$7.50</span>
    <span className="priceSmall">per month</span>
  </div>

  <div className="finePrint">
    billed at $90 yearly
    <br />
    or $9 per month
  </div>

  <div className="p small">For instructional designers and faculty who manage Canvas question banks.</div>

  <ul className="list">
    <li>Preview Canvas exports in a clean UI</li>
    <li>Export to Word with images</li>
    <li>Unlimited formatted imports and QTI export</li>
    <li>
      Smart import for messy docs and spreadsheets includes <strong>1,000 questions</strong> per month
    </li>
    <li>One review pass before export</li>
    <li>Manage billing anytime</li>
  </ul>

  <Link className="btn btnPrimary full" href="/signup?billing=yearly">
    Get Started
  </Link>

  <div className="finePrint">
    Cancel anytime. Preview and formatted import stay local. Smart import uses AI and is metered.
  </div>
</aside>

        </section>

        {/* What you get */}
        <section className="card preview">
          <div className="previewGrid">
            <div>
              <div className="kicker">What you get</div>
              <h2 className="h2"><strong>Preview, convert, export.</strong>
</h2>
              <p className="p">Preview first, convert when needed, then export for Canvas or Word.</p>

              <div className="previewBullets">
                <div className="bullet">
                  <div className="bulletDot" aria-hidden="true" />
                  <div>
                    <div className="bulletTitle">Preview</div>
                    <div className="bulletBody">Drop in a Canvas Classic export zip and scan questions fast.</div>
                  </div>
                </div>

                <div className="bullet">
                  <div className="bulletDot" aria-hidden="true" />
                  <div>
                    <div className="bulletTitle">Convert</div>
                    <div className="bulletBody">
                      Use formatted import for template style inputs, or Smart import for messy content.
                    </div>
                  </div>
                </div>

                <div className="bullet">
                  <div className="bulletDot" aria-hidden="true" />
                  <div>
                    <div className="bulletTitle">Export</div>
                    <div className="bulletBody">Download a Canvas import zip, or Word with images for review.</div>
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
                  <div className="mockH">Preview</div>
                  <div className="mockSub">Open a Canvas export zip and scan questions in a clean view</div>
                </div>

                <div className="mockPanel">
                  <div className="mockH">Convert</div>
                  <div className="mockSub">Formatted import or Smart import for messy inputs</div>
                </div>

                <div className="mockPanel">
                  <div className="mockH">Export</div>
                  <div className="mockSub">Download Word with images or a Canvas import zip</div>
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
              <div className="stepBody">Open a Canvas Classic export zip and review questions fast.</div>
            </div>

            <div className="step">
              <div className="stepNum">2</div>
              <div className="stepTitle">Convert your bank</div>
              <div className="stepBody">Upload docx, xlsx, csv, tsv, txt, or paste content.</div>
            </div>

            <div className="step">
              <div className="stepNum">3</div>
              <div className="stepTitle">Export for Canvas</div>
              <div className="stepBody">Download a QTI zip and import into Canvas. Export Word too.</div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="card faq">
          <div className="kicker">FAQ</div>

          <details className="qa">
            <summary>Do my files get uploaded anywhere</summary>
            <div className="qaBody">
              Preview and formatted import run locally in your browser. Smart import is processed on the server so we can
              generate your QTI zip.
            </div>
          </details>

          <details className="qa">
            <summary>Which Canvas quiz type is supported</summary>
            <div className="qaBody">Canvas Classic quizzes. New Quizzes exports are different and are not supported yet.</div>
          </details>

          <details className="qa">
            <summary>What formats does Smart import accept</summary>
            <div className="qaBody">
              Paste text or upload docx, xlsx, csv, tsv, or txt. If your content has clear numbering and answers, Smart
              import can usually normalize it.
            </div>
          </details>

          <details className="qa">
            <summary>What question types are supported</summary>
            <div className="qaBody">
              Multiple choice, multiple answers, true or false, short answer, essay, and file upload. If something is
              ambiguous, we flag it for review.
            </div>
          </details>

          <details className="qa">
            <summary>What does unlimited formatted import mean</summary>
            <div className="qaBody">
              If you use our formatted input style, conversion and export are unlimited because it does not require AI.
            </div>
          </details>

          <details className="qa">
            <summary>What counts toward the 1,000 Smart import questions</summary>
            <div className="qaBody">Only Smart import conversions. Preview and formatted import exports do not count.</div>
          </details>

          <details className="qa">
            <summary>What are the Smart import limits per upload</summary>
            <div className="qaBody">If you hit the limit, we will ask you to split the content into smaller batches for best results.</div>
          </details>

          <details className="qa">
            <summary>Can I export a Word document too</summary>
            <div className="qaBody">Yes. Word export is generated in your browser. Images are included.</div>
          </details>

          <details className="qa">
            <summary>Will the QTI zip import cleanly into Canvas</summary>
            <div className="qaBody">
              Yes for Canvas Classic. We still recommend importing into a sandbox course first, especially for important
              exams.
            </div>
          </details>

          <details className="qa">
            <summary>Can multiple people use one account</summary>
            <div className="qaBody">
              A single subscription is intended for one user. If you need a department license, reach out and we will set
              it up.
            </div>
          </details>

          <details className="qa">
            <summary>Do you offer annual billing</summary>
            <div className="qaBody">Yes. You can switch plans inside the app.</div>
          </details>

          <details className="qa">
            <summary>Can I cancel anytime</summary>
            <div className="qaBody">Yes. You can manage billing from the app and cancel whenever you want.</div>
          </details>

          <details className="qa">
  <summary>Can I use it just for viewing</summary>
  <div className="qaBody">Yes. The free plan offers unlimited quiz viewing.</div>
</details>

        </section>

        {/* Shared footer (consistent across pages) */}
        <div className="mt8">
          <SiteFooter />
        </div>
      </div>

      <style>{css}</style>
    </main>
  );
}

const css = `
  html, body{
    background:#070a12;
  }

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
  .btn.full{width:100%;}
  .btnBig{padding:12px 16px; border-radius:16px;}

  .btnPrimary{
    border-color: rgba(168,85,247,0.50);
    background: linear-gradient(135deg, rgba(168,85,247,0.95), rgba(236,72,153,0.78));
    box-shadow:
      0 12px 28px rgba(168,85,247,0.22),
      0 10px 24px rgba(236,72,153,0.12);
  }
  .btnPrimary:hover{
    box-shadow:
      0 14px 34px rgba(168,85,247,0.28),
      0 12px 26px rgba(236,72,153,0.16);
  }

  .btnOutline{
    border-color: rgba(168,85,247,0.45);
    background: rgba(168,85,247,0.10);
    color: rgba(255,255,255,0.96);
  }
  .btnOutline:hover{
    border-color: rgba(168,85,247,0.65);
    background: rgba(168,85,247,0.14);
  }

  .card{
    padding:24px;
    border-radius:18px;
    background:rgba(255,255,255,0.06);
    border:1px solid rgba(255,255,255,0.12);
    box-shadow: 0 18px 50px rgba(0,0,0,0.35);
    backdrop-filter: blur(6px);
  }

  .hero{
    display:grid;
    grid-template-columns: 1.22fr 0.78fr;
    gap:22px;
    align-items:stretch;
    margin-bottom:22px;
  }

  .h1{
    margin:0;
    font-weight:1000;
    letter-spacing:-0.8px;
    line-height:1.02;
  }
  .h1Main{
    display:block;
    font-size:52px;
  }
  .h1Sub{
    display:block;
    margin-top:18px;
    font-size:28px;
    line-height:1.15;
    opacity:0.92;
    letter-spacing:-0.3px;
  }

  .h2{
    font-size:26px;
    font-weight:1000;
    letter-spacing:-0.4px;
    line-height:1.15;
    margin:18px 0 0 0;
  }

  .p{
    margin-top:24px;
    opacity:0.82;
    font-size:16px;
    line-height:1.6;
    max-width:720px;
  }
  .p.small{
    font-size:14px;
    max-width:none;
    margin-top:18px;
    line-height:1.6;
  }

  .ctaRow{
    display:flex;
    gap:12px;
    margin-top:26px;
    flex-wrap:wrap;
  }

  .featureList{
    margin-top:26px;
    padding-left:0;
    list-style:none;
    display:grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap:14px 28px;
    max-width:720px;
  }
  .featureList li{
    display:flex;
    align-items:center;
    gap:10px;
    font-size:14px;
    font-weight:900;
    opacity:0.90;
    line-height:1.35;
  }
  .featureList li::before{
    content:"✓";
    display:inline-flex;
    align-items:center;
    justify-content:center;
    width:22px;
    height:22px;
    border-radius:999px;
    background: rgba(168,85,247,0.18);
    border: 1px solid rgba(168,85,247,0.38);
    color: rgba(255,255,255,0.96);
    font-weight:1000;
    flex:0 0 auto;
  }

  .trustRow{
    margin-top:26px;
    display:grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap:16px;
  }
  .trustItem{
    padding:14px;
    border-radius:16px;
    border:1px solid rgba(255,255,255,0.10);
    background:rgba(255,255,255,0.04);
  }
  .trustTitle{font-weight:1000; font-size:13px;}
  .trustBody{margin-top:10px; opacity:0.78; font-size:13px; line-height:1.5;}

  .kicker{
    font-weight:1000;
    font-size:13px;
    opacity:0.88;
    letter-spacing:0.2px;
    margin-bottom:14px;
  }

  .price{
    margin-top:12px;
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
    margin-top:22px;
    padding-left:18px;
    opacity:0.86;
    line-height:1.9;
    font-size:14px;
  }

  .finePrint{
    margin-top:18px;
    font-size:12px;
    opacity:0.70;
    line-height:1.45;
  }

  .preview{
    margin-top:26px;
    background:rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.10);
  }
  .previewGrid{
    display:grid;
    grid-template-columns: 1.05fr 0.95fr;
    gap:18px;
    align-items:stretch;
  }
  .previewBullets{margin-top:22px; display:flex; flex-direction:column; gap:16px;}
  .bullet{display:flex; gap:12px; align-items:flex-start;}
  .bulletDot{
    width:10px; height:10px;
    border-radius:999px;
    background:rgba(255,255,255,0.22);
    border:1px solid rgba(255,255,255,0.18);
    margin-top:6px;
    flex:0 0 auto;
  }
  .bulletTitle{font-weight:1000; font-size:14px;}
  .bulletBody{margin-top:8px; opacity:0.78; font-size:13px; line-height:1.5;}

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
    padding:16px;
    display:grid;
    grid-template-columns: 1fr;
    gap:12px;
  }
  .mockPanel{
    padding:14px;
    border-radius:16px;
    border:1px solid rgba(255,255,255,0.10);
    background:rgba(255,255,255,0.04);
  }
  .mockH{font-weight:1000; font-size:13px;}
  .mockSub{margin-top:10px; opacity:0.78; font-size:13px; line-height:1.5;}

  .how{
    margin-top:26px;
    background:rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.10);
  }
  .steps{
    margin-top:18px;
    display:grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap:14px;
  }
  .step{
    padding:16px;
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
  .stepTitle{margin-top:14px; font-weight:1000;}
  .stepBody{margin-top:10px; opacity:0.78; font-size:13px; line-height:1.5;}

  .faq{
    margin-top:26px;
    background:rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.10);
  }
  .qa{
    margin-top:16px;
    border-radius:16px;
    border:1px solid rgba(255,255,255,0.10);
    background:rgba(255,255,255,0.04);
    padding:16px 18px;
  }
  .qa summary{
    cursor:pointer;
    font-weight:1000;
    opacity:0.92;
    list-style:none;
    outline:none;
    line-height:1.45;
    padding:2px 0;
    letter-spacing:0.1px;
  }
  .qa summary::-webkit-details-marker{display:none;}
  .qaBody{
    margin-top:14px;
    opacity:0.78;
    font-size:13px;
    line-height:1.6;
  }

  .mt8{ margin-top: 26px; }

  @media (max-width: 940px){
    .nav{display:none;}
    .hero{grid-template-columns: 1fr;}
    .h1Main{font-size:44px;}
    .h1Sub{font-size:24px;}
    .trustRow{grid-template-columns: 1fr;}
    .previewGrid{grid-template-columns: 1fr;}
    .steps{grid-template-columns: 1fr;}
    .featureList{grid-template-columns: 1fr;}
  }

  @media (max-width: 520px){
    .wrap{padding:12px 14px;}
    .topbar{margin-bottom:18px;}
    .card{padding:20px;}
    .actions{gap:8px;}
    .btn{padding:10px 12px;}
    .logoImg{width:56px; height:56px;}
    .h1Main{font-size:38px;}
    .h1Sub{font-size:20px;}
  }
`;
