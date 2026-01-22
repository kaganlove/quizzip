import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "Accessibility | Quizzip",
  description: "Accessibility statement for Quizzip.",
};

function LegalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="wrap">
      <div className="container">
        <header className="topbar">
          <Link className="brand" href="/">
            <img className="logoImg" src="/quizzip-logo.png" alt="Quizzip logo" />
            <div className="brandText">
              <div className="brandName">Quizzip</div>
              <div className="brandSub">Canvas quiz tools that just work</div>
            </div>
          </Link>

          <nav className="nav">
            <Link className="navLink" href="/how-it-works">
              How it works
            </Link>
            <Link className="navLink" href="/pricing">
              Pricing
            </Link>
            <a className="navLink" href="/#faq">
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

        <section className="card legalCard">
          <h1 className="legalH1">{title}</h1>
          <p className="legalSub">{subtitle}</p>

          <div className="legalBody">{children}</div>
        </section>

        <div className="mt8">
          <SiteFooter />
        </div>
      </div>

      <style>{css}</style>
    </main>
  );
}

export default function AccessibilityPage() {
  return (
    <LegalShell title="Accessibility" subtitle="We want Quizzip to be usable for as many people as possible.">
      <section className="space">
        <h2 className="h2small">Our goal</h2>
        <p>We aim to support accessibility best practices and to improve over time. If you run into an issue, we want to hear about it.</p>
      </section>

      <section className="space">
        <h2 className="h2small">What we are working toward</h2>
        <ul className="ul">
          <li>Keyboard friendly navigation and focus states</li>
          <li>Readable contrast and font sizing</li>
          <li>Clear headings and page structure</li>
          <li>Helpful labels on inputs and controls</li>
        </ul>
      </section>

      <section className="space">
        <h2 className="h2small">Report an accessibility issue</h2>
        <p>
          Email{" "}
          <a className="link" href="mailto:support@quizzip.co">
            support@quizzip.co
          </a>{" "}
          and include the page, what you were trying to do, and what went wrong. Screenshots help.
        </p>
      </section>
    </LegalShell>
  );
}

const css = `
  html, body { background:#070a12; }

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
    text-decoration:none;
    color:inherit;
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
  }

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

  .legalCard{ margin-top: 8px; }
  .legalH1{ margin:0; font-weight:1000; letter-spacing:-0.6px; font-size:42px; line-height:1.05; }
  .legalSub{ margin-top:14px; opacity:0.78; font-size:14px; line-height:1.6; max-width:780px; }

  .legalBody{ margin-top:22px; opacity:0.86; font-size:14px; line-height:1.8; }
  .space{ margin-top: 18px; }
  .h2small{ margin:0 0 8px 0; font-size:16px; font-weight:1000; letter-spacing:-0.2px; }
  .ul{ margin: 10px 0 0 0; padding-left: 18px; }
  .ul li{ margin-top: 8px; }
  .link{ font-weight:1000; color:rgba(255,255,255,0.96); text-decoration: underline; }

  .mt8{ margin-top: 26px; }

  @media (max-width: 940px){
    .nav{display:none;}
    .legalH1{font-size:36px;}
  }

  @media (max-width: 520px){
    .wrap{padding:12px 14px;}
    .card{padding:20px;}
    .logoImg{width:56px; height:56px;}
    .legalH1{font-size:32px;}
  }
`;
