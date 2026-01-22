import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "Terms of Service | Quizzip",
  description: "Terms for using Quizzip.",
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

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" subtitle="Last updated: update this date when you ship changes.">
      <section className="space">
        <h2 className="h2small">Agreement</h2>
        <p>By accessing or using Quizzip, you agree to these terms. If you do not agree, do not use the service.</p>
      </section>

      <section className="space">
        <h2 className="h2small">What Quizzip does</h2>
        <p>
          Quizzip helps you preview Canvas Classic QTI exports in a clean browser view and generate outputs such as Word exports
          and Canvas importable QTI zips. Preview is designed to run locally in your browser. Smart import sends content to our
          server route to run an AI conversion.
        </p>
      </section>

      <section className="space">
        <h2 className="h2small">Accounts</h2>
        <p>
          You are responsible for safeguarding your account. You agree not to share your login credentials and to notify us if
          you suspect unauthorized access.
        </p>
      </section>

      <section className="space">
        <h2 className="h2small">Subscriptions and billing</h2>
        <ul className="ul">
          <li>Paid features require an active subscription.</li>
          <li>Billing is handled through Stripe. You can manage billing and cancel through the billing portal.</li>
          <li>Smart import usage may be metered by question count based on your plan.</li>
        </ul>
      </section>

      <section className="space">
        <h2 className="h2small">Acceptable use</h2>
        <ul className="ul">
          <li>Do not misuse the service, attempt to break it, or interfere with other users.</li>
          <li>Do not submit content that you do not have the right to use.</li>
          <li>Do not use Quizzip to violate laws or policies that apply to you.</li>
        </ul>
      </section>

      <section className="space">
        <h2 className="h2small">No affiliation</h2>
        <p>Quizzip is not affiliated with Instructure or Canvas. Canvas is a trademark of its respective owner.</p>
      </section>

      <section className="space">
        <h2 className="h2small">Disclaimers</h2>
        <p>
          The service is provided as is. We do not guarantee that every conversion will be perfect. You are responsible for
          reviewing outputs before importing into Canvas.
        </p>
      </section>

      <section className="space">
        <h2 className="h2small">Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Quizzip will not be liable for indirect, incidental, special, consequential, or
          punitive damages, or any loss of data, profits, or revenue.
        </p>
      </section>

      <section className="space">
        <h2 className="h2small">Changes</h2>
        <p>We may update these terms from time to time. If changes are material, we will post an updated date on this page.</p>
      </section>

      <section className="space">
        <h2 className="h2small">Contact</h2>
        <p>
          Questions about these terms:{" "}
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
