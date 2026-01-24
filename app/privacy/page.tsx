import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "Privacy Policy | Quizzip",
  description: "How Quizzip handles your data and files.",
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

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" subtitle="Last updated: January 23, 2026.">
      <section className="space">
        <h2 className="h2small">Summary</h2>
        <p>
          Quizzip is designed to keep your quiz files on your machine whenever possible. QTI preview runs in your browser and does
          not upload your QTI zip to our servers. Smart import is the only feature that sends content to our server route so we can
          run an AI conversion and produce a Canvas import zip for you. Smart import uploads only the content you submit for
          conversion. Preview and formatted import stay in your browser.
        </p>
      </section>

      <section className="space">
        <h2 className="h2small">What we collect</h2>
        <ul className="ul">
          <li>
            <span className="strong">Account data</span>: email and an account identifier, handled through Supabase.
          </li>
          <li>
            <span className="strong">Subscription data</span>: Stripe customer and subscription identifiers, subscription
            status, and related billing metadata.
          </li>
          <li>
            <span className="strong">Smart import input</span>: the text or extracted content you submit for conversion.
            Preview and formatted import are designed to stay local.
          </li>
          <li>
            <span className="strong">Basic telemetry</span>: standard platform logs needed to operate and secure the
            service. We aim to keep logs minimal.
          </li>
        </ul>
      </section>

      <section className="space">
        <h2 className="h2small">What we do not collect</h2>
        <ul className="ul">
          <li>Your uploaded QTI export zip when you use preview. Preview runs locally.</li>
          <li>Your private Canvas data. Quizzip does not connect to your Canvas account.</li>
          <li>Any quiz content unless you submit it to Smart import.</li>
        </ul>
      </section>

      <section className="space">
        <h2 className="h2small">How Smart import works</h2>
        <p>
          When you use Smart import, Quizzip sends the content required to perform conversion to our server route. That route calls
          an AI provider to normalize your content into a structured internal format and then generates a Canvas import QTI zip for
          download. Smart import uploads only the content you submit for conversion. Preview and formatted import stay in your
          browser.
        </p>
        <p>
          We do not sell your content. We do not use it to train models. We treat it as customer provided input for the purpose of
          generating your requested output.
        </p>
      </section>

      <section className="space">
        <h2 className="h2small">Third party services</h2>
        <ul className="ul">
          <li>Vercel hosts the application.</li>
          <li>Supabase provides authentication and stores subscription status records.</li>
          <li>Stripe handles payments and billing portal access.</li>
          <li>An AI provider is used only for Smart import conversions.</li>
        </ul>
      </section>

      <section className="space">
        <h2 className="h2small">Data retention</h2>
        <p>
          Account and subscription records are retained while your account is active and as needed for legal and billing purposes.
          Smart import input is processed to generate your requested output. We do not use Smart import input for training. Any
          temporary handling is limited to what is needed to complete the conversion and operate the service. Platform logs may
          retain limited data for security and reliability.
        </p>
      </section>

      <section className="space">
        <h2 className="h2small">Your choices</h2>
        <ul className="ul">
          <li>You can cancel your subscription anytime through the billing portal.</li>
          <li>You can request account deletion by contacting support.</li>
          <li>If you want zero content leaving your machine, use preview and formatted import.</li>
        </ul>
      </section>

      <section className="space">
        <h2 className="h2small">Contact</h2>
        <p>
          Questions about privacy:{" "}
          <a className="link" href="mailto:support@quizzip.co">
            support@quizzip.co
          </a>
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

  .legalCard{ margin-top: 8px; }
  .legalH1{ margin:0; font-weight:1000; letter-spacing:-0.6px; font-size:42px; line-height:1.05; }
  .legalSub{ margin-top:14px; opacity:0.78; font-size:14px; line-height:1.6; max-width:780px; }

  .legalBody{ margin-top:22px; opacity:0.86; font-size:14px; line-height:1.8; }
  .space{ margin-top: 18px; }
  .h2small{ margin:0 0 8px 0; font-size:16px; font-weight:1000; letter-spacing:-0.2px; }
  .ul{ margin: 10px 0 0 0; padding-left: 18px; }
  .ul li{ margin-top: 8px; }
  .strong{ font-weight:1000; }
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
