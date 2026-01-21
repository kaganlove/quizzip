import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "How it works | Quizzip",
  description: "Preview, convert, and export Canvas quiz content with Quizzip.",
};

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(1200px_700px_at_10%_10%,#1b2a55_0%,#0b1020_45%,#070a12_100%)] text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
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
          <h1 className="text-3xl font-extrabold">How it works</h1>
          <p className="mt-2 text-sm text-white/75">A simple quiz pipeline: preview, convert, export.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-extrabold">Preview</div>
              <div className="mt-2 text-sm text-white/80">
                Open a Canvas Classic QTI export zip and instantly see questions, choices, and images in a clean browser view.
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-white/80">
                <li>Runs locally in your browser</li>
                <li>No upload required for preview</li>
                <li>Built for fast review</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-extrabold">Convert</div>
              <div className="mt-2 text-sm text-white/80">
                Upload or paste your question bank and generate a Canvas importable QTI zip when you are ready.
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-white/80">
                <li>Formatted import for template based content</li>
                <li>Smart import for messy docs and mixed formats</li>
                <li>Review before export</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-extrabold">Export</div>
              <div className="mt-2 text-sm text-white/80">
                Download a Canvas QTI import zip or a Word export with images for SME review.
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-white/80">
                <li>Canvas import zip output</li>
                <li>Word export for review</li>
                <li>Designed to reduce rework</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-extrabold">Supported inputs for conversion</div>
            <div className="mt-2 text-sm text-white/80">
              Smart import can accept pasted content and common file types. Formatted import is best when your content follows the
              Quizzip template.
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-white/80">
              <li>docx</li>
              <li>xlsx</li>
              <li>csv</li>
              <li>tsv</li>
              <li>txt</li>
              <li>pasted text</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/app"
              className="rounded-xl border border-purple-400/40 bg-gradient-to-r from-purple-500/90 to-pink-500/70 px-5 py-3 text-sm font-extrabold shadow-[0_12px_28px_rgba(168,85,247,0.22)] hover:brightness-105"
            >
              Open the app
            </Link>
            <Link
              href="/contact"
              className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-extrabold hover:bg-white/10"
            >
              Contact support
            </Link>
          </div>
        </div>

        <SiteFooter className="mt-8" />
      </div>
    </main>
  );
}
