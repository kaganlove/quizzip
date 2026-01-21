import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "Privacy Policy | Quizzip",
  description: "How Quizzip handles your data and files.",
};

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(1200px_700px_at_10%_10%,#1b2a55_0%,#0b1020_45%,#070a12_100%)] text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/quizzip-logo.png"
              alt="Quizzip"
              className="h-10 w-10 rounded-xl shadow-[0_12px_34px_rgba(0,0,0,0.35)]"
            />
            <div>
              <div className="text-lg font-extrabold leading-tight">Quizzip</div>
              <div className="text-xs text-white/70">Canvas quiz tools that just work</div>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-3 text-sm text-white/80">
            <Link className="hover:text-white" href="/how-it-works">
              How it works
            </Link>
            <Link className="hover:text-white" href="/security">
              Security
            </Link>
            <Link className="hover:text-white" href="/contact">
              Contact
            </Link>
            <Link
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-extrabold hover:bg-white/10"
              href="/login"
            >
              Log in
            </Link>
          </nav>
        </header>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="mt-2 text-sm text-white/75">{subtitle}</p>

          <div className="mt-6 space-y-6 text-sm text-white/85">{children}</div>
        </div>

        <SiteFooter className="mt-8" />
      </div>
    </main>
  );
}

export default function PrivacyPage() {
  return (
    <Shell title="Privacy Policy" subtitle="Last updated: update this date when you ship changes.">
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Summary</h2>
        <p>
          Quizzip is designed to keep your quiz files on your machine whenever possible. QTI preview runs in your browser and does
          not upload your QTI zip to our servers. Smart import is the only feature that sends content to our server route so we can
          run an AI conversion and produce a Canvas import zip for you.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">What we collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-extrabold">Account data</span>: email and an account identifier, handled through Supabase.
          </li>
          <li>
            <span className="font-extrabold">Subscription data</span>: Stripe customer and subscription identifiers, subscription
            status, and related billing metadata.
          </li>
          <li>
            <span className="font-extrabold">Smart import input</span>: the text or extracted content you submit for conversion.
            Preview and formatted import are designed to stay local.
          </li>
          <li>
            <span className="font-extrabold">Basic telemetry</span>: standard platform logs needed to operate and secure the
            service. We aim to keep logs minimal.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">What we do not collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Your uploaded QTI export zip when you use preview. Preview runs locally.</li>
          <li>Your private Canvas data. Quizzip does not connect to your Canvas account.</li>
          <li>Any quiz content unless you submit it to Smart import.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">How Smart import works</h2>
        <p>
          When you use Smart import, Quizzip sends the content required to perform conversion to our server route. That route calls
          an AI provider to normalize your content into a structured internal format and then generates a Canvas import QTI zip for
          download.
        </p>
        <p>
          We do not sell your content. We do not use it to train models. We treat it as customer provided input for the purpose of
          generating your requested output.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Third party services</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Vercel hosts the application.</li>
          <li>Supabase provides authentication and stores subscription status records.</li>
          <li>Stripe handles payments and billing portal access.</li>
          <li>An AI provider is used only for Smart import conversions.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Data retention</h2>
        <p>
          Account and subscription records are retained while your account is active and as needed for legal and billing purposes.
          Smart import input is not intended to be stored long term. Platform logs may retain limited data for security and
          reliability.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Your choices</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>You can cancel your subscription anytime through the billing portal.</li>
          <li>You can request account deletion by contacting support.</li>
          <li>If you want zero content leaving your machine, use preview and formatted import.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Contact</h2>
        <p>
          Questions about privacy:{" "}
          <a className="font-extrabold text-white underline" href="mailto:support@quizzip.co">
            support@quizzip.co
          </a>
        </p>
      </section>
    </Shell>
  );
}
