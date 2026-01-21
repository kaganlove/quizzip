import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "Accessibility | Quizzip",
  description: "Accessibility statement for Quizzip.",
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

export default function AccessibilityPage() {
  return (
    <Shell title="Accessibility" subtitle="We want Quizzip to be usable for as many people as possible.">
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Our goal</h2>
        <p>We aim to support accessibility best practices and to improve over time. If you run into an issue, we want to hear about it.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">What we are working toward</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Keyboard friendly navigation and focus states</li>
          <li>Readable contrast and font sizing</li>
          <li>Clear headings and page structure</li>
          <li>Helpful labels on inputs and controls</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Report an accessibility issue</h2>
        <p>
          Email{" "}
          <a className="font-extrabold text-white underline" href="mailto:support@quizzip.co">
            support@quizzip.co
          </a>{" "}
          and include the page, what you were trying to do, and what went wrong. Screenshots help.
        </p>
      </section>
    </Shell>
  );
}
