import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "Security and Privacy | Quizzip",
  description: "How Quizzip protects your files and your account.",
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
            <Link className="hover:text-white" href="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-white" href="/terms">
              Terms
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

export default function SecurityPage() {
  return (
    <Shell
      title="Security and Privacy"
      subtitle="A plain language overview of how Quizzip is designed to protect your work."
    >
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Local preview by design</h2>
        <p>
          QTI preview runs in your browser. When you preview a Canvas Classic QTI export zip, the zip stays on your machine and is
          processed locally. This reduces risk and keeps your workflow fast.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Smart import is the exception</h2>
        <p>
          Smart import sends the content you submit to our server route so we can run an AI conversion and generate a Canvas
          importable QTI zip. Smart import uploads only the content you submit for conversion. Preview and formatted import stay in
          your browser.
        </p>
        <p>If you need a workflow where content never leaves your machine, use preview and formatted import.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Account security</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Authentication is handled through Supabase.</li>
          <li>Payments and billing are handled through Stripe.</li>
          <li>We do not store your card details.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Reporting a security issue</h2>
        <p>
          If you believe you found a security issue, email{" "}
          <a className="font-extrabold text-white underline" href="mailto:support@quizzip.co">
            support@quizzip.co
          </a>{" "}
          with details. Please do not publish sensitive information until we have a chance to respond.
        </p>
      </section>
    </Shell>
  );
}
