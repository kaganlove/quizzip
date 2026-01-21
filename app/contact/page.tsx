import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "Contact | Quizzip",
  description: "Contact Quizzip support.",
};

export default function ContactPage() {
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
            <Link className="hover:text-white" href="/privacy">
              Privacy
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
          <h1 className="text-3xl font-extrabold">Contact</h1>
          <p className="mt-2 text-sm text-white/75">
            For support, billing questions, and bug reports, email us. Include screenshots if you can.
          </p>

          <div className="mt-6 space-y-4 text-sm text-white/85">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-extrabold">Support email</div>
              <a className="mt-2 inline-block text-base font-extrabold text-white underline" href="mailto:support@quizzip.co">
                support@quizzip.co
              </a>
              <div className="mt-2 text-xs text-white/70">Typical response time is one to two business days.</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-extrabold">What to include</div>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>The page you were on and what you clicked</li>
                <li>The file type you were using, such as QTI zip, docx, xlsx, or pasted text</li>
                <li>Any error message shown in the app</li>
                <li>A screenshot if possible</li>
              </ul>
            </div>
          </div>
        </div>

        <SiteFooter className="mt-8" />
      </div>
    </main>
  );
}
