import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "Pricing | Quizzip",
  description: "Quizzip pricing and plan details.",
};

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="checkRow">
      <span className="checkDot" aria-hidden="true">
        ✓
      </span>
      <span className="checkText">{children}</span>
    </li>
  );
}

export default function PricingPage() {
  return (
    <main className="wrap">
      <div className="container">
        <header className="topbar">
          <Link href="/" className="brandLink" aria-label="Go to landing page">
            <div className="brand">
              <img className="logoImg" src="/quizzip-logo.png" alt="Quizzip" />
              <div className="brandText">
                <div className="brandName">Quizzip</div>
                <div className="brandSub">Canvas quiz tools that just work</div>
              </div>
            </div>
          </Link>

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
            <Link className="btn btnPrimary" href="/login">
              Log in
            </Link>
            <Link className="btn btnOutline" href="/signup">
              Create account
            </Link>
          </div>
        </header>

        <div className="grid">
          <section className="card mainCol">
            <h1 className="h1">Pricing built around your workflow</h1>
            <p className="p">
              Preview Canvas Classic QTI exports locally in your browser, then
              upgrade when you need to convert messy question banks into a
              Canvas import zip.
            </p>

            <div className="stepGrid">
              <div className="miniCard">
                <div className="miniKicker">Step 1</div>
                <div className="miniTitle">Preview</div>
                <p className="miniBody">
                  Drop in a Canvas Classic export zip and review questions in a
                  clean UI.
                </p>
              </div>

              <div className="miniCard">
                <div className="miniKicker">Step 2</div>
                <div className="miniTitle">Import</div>
                <p className="miniBody">
                  Use formatted import for template ready content, or smart
                  import for messy docs.
                </p>
              </div>

              <div className="miniCard">
                <div className="miniKicker">Step 3</div>
                <div className="miniTitle">Export</div>
                <p className="miniBody">
                  Download a Canvas import zip, plus a Word export with images
                  for review.
                </p>
              </div>
            </div>

            <div className="blockCard">
              <h2 className="h2">What counts toward the 1,000 questions</h2>
              <p className="pSmall">
                Only smart import uses AI and counts toward your monthly
                question allowance. Preview and formatted import do not count
                toward the meter.
              </p>

              <div className="twoCol">
                <div className="innerCard">
                  <div className="innerTitle">Does not count</div>
                  <ul className="innerList">
                    <li>Previewing Canvas Classic export zips</li>
                    <li>Exporting previews to Word</li>
                    <li>Formatted import conversions</li>
                    <li>Re downloading previously generated files in the session</li>
                  </ul>
                </div>

                <div className="innerCard">
                  <div className="innerTitle">Counts</div>
                  <ul className="innerList">
                    <li>Smart import conversions that require AI cleanup</li>
                    <li>Questions detected in the final converted bank</li>
                    <li>Optional review pass if you run it</li>
                  </ul>
                </div>
              </div>

              <p className="fine">
                Note: question estimates are best effort. If your source content
                is ambiguous, counts may vary slightly.
              </p>
            </div>

            <div className="blockCard">
              <h2 className="h2">Formatted import vs smart import</h2>

              <div className="twoCol">
                <div className="innerCard">
                  <div className="bigInnerTitle">Formatted import</div>
                  <p className="pSmall">
                    Best when your content already follows the Quizzip template.
                    Converts instantly without AI.
                  </p>
                  <ul className="innerList">
                    <li>Unlimited runs</li>
                    <li>No AI usage</li>
                    <li>Fast and predictable output</li>
                  </ul>
                </div>

                <div className="innerCard">
                  <div className="bigInnerTitle">Smart import</div>
                  <p className="pSmall">
                    Best for messy, mixed format content like docs, spreadsheets,
                    and copy paste. Uses AI to normalize and generate a clean
                    Canvas import zip.
                  </p>
                  <ul className="innerList">
                    <li>Metered up to 1,000 questions per month</li>
                    <li>Supports docx, xlsx, csv, tsv, txt, and pasted text</li>
                    <li>Designed for real world content</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <aside className="card sideCol">
            <div className="kicker">Subscription</div>

            <div className="priceStack">
              <div className="price">
                <span className="priceBig">$7.50</span>
                <span className="priceSmall">per month</span>
              </div>
              <div className="subLine">billed at $90 yearly</div>
              <div className="altLine">or $9 monthly subscription</div>
            </div>

            <p className="pSmall">
              Built for instructional designers and faculty who manage Canvas
              question banks.
            </p>

            <ul className="checkList">
              <Check>Free QTI preview in a clean UI</Check>
              <Check>Export to Word with images for SME review</Check>
              <Check>Unlimited formatted import and QTI export</Check>
              <Check>Smart import includes 1,000 questions per month</Check>
              <Check>Optional review pass before export</Check>
              <Check>Manage billing anytime via Stripe portal</Check>
            </ul>

            <div className="ctaStack">
              <Link className="btn btnPrimary full" href="/login?next=/app&billing=yearly">
                Start yearly
              </Link>
              <Link className="btn btnOutline full" href="/login?next=/app&billing=monthly">
                Start monthly
              </Link>
            </div>

            <div className="fine">
              Preview and formatted import stay local. Smart import uses AI and is metered.
            </div>
          </aside>
        </div>

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

  .brandLink{
    text-decoration:none;
    color:inherit;
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

  .grid{
    display:grid;
    grid-template-columns: 1.22fr 0.78fr;
    gap:22px;
    align-items:stretch;
  }

  .h1{
    margin:0;
    font-weight:1000;
    letter-spacing:-0.6px;
    line-height:1.05;
    font-size:38px;
  }

  .h2{
    margin:0;
    font-weight:1000;
    letter-spacing:-0.3px;
    line-height:1.15;
    font-size:20px;
  }

  .p{
    margin-top:16px;
    opacity:0.82;
    font-size:15px;
    line-height:1.65;
    max-width:780px;
  }

  .pSmall{
    margin-top:12px;
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
  .miniKicker{ font-weight:1000; font-size:12px; opacity:0.78; }
  .miniTitle{ margin-top:10px; font-weight:1000; font-size:14px; }
  .miniBody{ margin-top:10px; opacity:0.78; font-size:13px; line-height:1.55; }

  .blockCard{
    margin-top:18px;
    padding:18px;
    border-radius:16px;
    border:1px solid rgba(255,255,255,0.10);
    background:rgba(255,255,255,0.04);
  }

  .twoCol{
    margin-top:14px;
    display:grid;
    grid-template-columns: 1fr 1fr;
    gap:12px;
  }

  .innerCard{
    padding:14px;
    border-radius:14px;
    border:1px solid rgba(255,255,255,0.10);
    background:rgba(255,255,255,0.04);
  }
  .innerTitle{ font-weight:1000; font-size:13px; }
  .bigInnerTitle{ font-weight:1000; font-size:15px; }
  .innerList{ margin-top:10px; padding-left:18px; opacity:0.84; line-height:1.8; font-size:13px; }

  .kicker{
    font-weight:1000;
    font-size:13px;
    opacity:0.88;
    letter-spacing:0.2px;
    margin-bottom:14px;
  }

  .priceStack{ margin-top:10px; }
  .price{
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
  .subLine{
    margin-top:6px;
    font-size:12px;
    opacity:0.78;
    font-weight:900;
  }
  .orLine{
    margin-top:6px;
    font-size:12px;
    opacity:0.72;
    font-weight:900;
  }
  .altLine{
    margin-top:6px;
    font-size:12px;
    opacity:0.66;
    font-weight:900;
  }

  .checkList{ margin-top:16px; padding-left:0; list-style:none; display:flex; flex-direction:column; gap:12px; }
  .checkRow{ display:flex; gap:10px; align-items:flex-start; }
  .checkDot{
    margin-top:2px;
    display:inline-flex;
    width:22px;
    height:22px;
    border-radius:999px;
    align-items:center;
    justify-content:center;
    background: rgba(168,85,247,0.18);
    border: 1px solid rgba(168,85,247,0.38);
    color: rgba(255,255,255,0.96);
    font-weight:1000;
    flex:0 0 auto;
  }
  .checkText{ opacity:0.86; font-size:13px; line-height:1.55; font-weight:800; }

  .ctaStack{ margin-top:16px; display:flex; flex-direction:column; gap:10px; }

  .fine{ margin-top:14px; font-size:12px; opacity:0.70; line-height:1.45; }

  .mt8{ margin-top: 26px; }

  @media (max-width: 940px){
    .nav{display:none;}
    .grid{ grid-template-columns: 1fr; }
    .stepGrid{ grid-template-columns: 1fr; }
    .twoCol{ grid-template-columns: 1fr; }
  }

  @media (max-width: 520px){
    .wrap{padding:12px 14px;}
    .card{padding:20px;}
    .h1{font-size:32px;}
  }
`;
