import Link from "next/link";

export const metadata = {
  title: "QuizZip",
  description:
    "View Canvas Classic quiz export zips in a clean format and export to Word with images. Parsing happens in your browser.",
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
              QZ
            </div>
            <div className="brandText">
              <div className="brandName">QuizZip</div>
              <div className="brandSub">Canvas Classic quiz export viewer</div>
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
            <Link className="btn btnGhost" href="/login">
              Log in
            </Link>
            <Link className="btn btnPrimary" href="/app">
              Launch app
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="hero">
          <div className="card heroLeft">
            <h1 className="h1">See Canvas Classic quiz exports like a normal human</h1>

            <p className="p">
              Upload a Canvas Classic quiz export zip, review questions fast, and export a clean Word file with images. Parsing
              happens in your browser. Nothing gets uploaded to our servers.
            </p>

            <div className="ctaRow">
              <Link className="btn btnPrimary" href="/app">
                Launch app
              </Link>
              <Link className="btn btnGhost" href="/signup">
                Create account
              </Link>
            </div>

            <div className="pillRow" aria-label="Key benefits">
              <span className="pill">No installs</span>
              <span className="pill">Fast review</span>
              <span className="pill">Export to Word</span>
              <span className="pill">Images supported</span>
              <span className="pill">Files stay local</span>
            </div>

            <div className="trustRow">
              <div className="trustItem">
                <div className="trustTitle">Privacy first</div>
                <div className="trustBody">Your zip is parsed locally in your browser.</div>
              </div>
              <div className="trustItem">
                <div className="trustTitle">Made for review</div>
                <div className="trustBody">Clean question view for quick checking and edits.</div>
              </div>
              <div className="trustItem">
                <div className="trustTitle">Shareable exports</div>
                <div className="trustBody">Word exports with images for SMEs and faculty.</div>
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
              Built for instructional designers and faculty who need to review question banks without the Canvas pain.
            </div>

            <ul className="list">
              <li>Upload Canvas Classic export zip</li>
              <li>Readable question view</li>
              <li>Export Word with images</li>
              <li>Manage billing anytime</li>
            </ul>

            <Link className="btn btnPrimary full" href="/signup">
              Start now
            </Link>

            <div className="finePrint">Cancel anytime. Files are not uploaded to our servers.</div>
          </aside>
        </section>

        {/* Preview */}
        <section className="card preview">
          <div className="previewGrid">
            <div>
              <div className="kicker">What you get</div>
              <h2 className="h2">A clean view that makes quiz banks readable again</h2>
              <p className="p">
                No more hunting through messy exports. You get a fast, readable question view and an export you can actually send
                to someone without apologizing first.
              </p>

              <div className="previewBullets">
                <div className="bullet">
                  <div className="bulletDot" aria-hidden="true" />
                  <div>
                    <div className="bulletTitle">Quick scan layout</div>
                    <div className="bulletBody">Questions and answers in a simple readable format.</div>
                  </div>
                </div>

                <div className="bullet">
                  <div className="bulletDot" aria-hidden="true" />
                  <div>
                    <div className="bulletTitle">Images included</div>
                    <div className="bulletBody">Images carry through to the Word export.</div>
                  </div>
                </div>

                <div className="bullet">
                  <div className="bulletDot" aria-hidden="true" />
                  <div>
                    <div className="bulletTitle">Nothing uploaded</div>
                    <div className="bulletBody">Your file stays on your device during parsing.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mock">
              <div className="mockTop">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
                <span className="mockTitle">QuizZip preview</span>
              </div>

              <div className="mockBody">
                <div className="mockPanel">
                  <div className="mockH">1 Upload</div>
                  <div className="mockSub">Choose a Canvas Classic export zip</div>
                </div>

                <div className="mockPanel">
                  <div className="mockH">2 Review</div>
                  <div className="mockSub">Clean question view with images</div>
                </div>

                <div className="mockPanel">
                  <div className="mockH">3 Export</div>
                  <div className="mockSub">Download Word file with images</div>
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
              <div className="stepTitle">Export from Canvas</div>
              <div className="stepBody">Use Canvas Classic export and grab the zip.</div>
            </div>

            <div className="step">
              <div className="stepNum">2</div>
              <div className="stepTitle">Upload and review</div>
              <div className="stepBody">Browse questions, images, and answers in a clean view.</div>
            </div>

            <div className="step">
              <div className="stepNum">3</div>
              <div className="stepTitle">Export clean files</div>
              <div className="stepBody">Download Word exports and share with SMEs fast.</div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="card faq">
          <div className="kicker">FAQ</div>

          <details className="qa">
            <summary>Do my files get uploaded anywhere</summary>
            <div className="qaBody">
              No. Parsing happens in your browser. Your zip file is not uploaded to our servers.
            </div>
          </details>

          <details className="qa">
            <summary>Does it support New Quizzes</summary>
            <div className="qaBody">
              Right now it is focused on Canvas Classic quiz export zips.
            </div>
          </details>

          <details className="qa">
            <summary>Can I cancel anytime</summary>
            <div className="qaBody">
              Yes. You can manage billing from the app and cancel whenever you want.
            </div>
          </details>

          <details className="qa">
            <summary>Will images export to Word</summary>
            <div className="qaBody">
              Yes. If the export zip includes images, QuizZip includes them in the Word export.
            </div>
          </details>
        </section>

        <footer className="footer">
          <div className="footerLeft">© {new Date().getFullYear()} QuizZip</div>
          <div className="footerRight">
            <Link className="footerLink" href="/login">
              Log in
            </Link>
            <span className="footerSep" aria-hidden="true">
              •
            </span>
            <Link className="footerLink" href="/signup">
              Create account
            </Link>
            <span className="footerSep" aria-hidden="true">
              •
            </span>
            <Link className="footerLink" href="/app">
              Launch app
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
    background:rgba(255,255,255,0.10);
    border:1px solid rgba(255,255,255,0.14);
    display:grid;
    place-items:center;
    font-weight:900;
    letter-spacing:0.2px;
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
