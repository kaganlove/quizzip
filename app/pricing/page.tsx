import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "Pricing | Quizzip",
  description: "Quizzip pricing and plan details.",
};

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="mt-1 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/10 text-white/80"
        aria-hidden="true"
      >
        ✓
      </span>
      <span className="text-white/85">{children}</span>
    </li>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(1200px_700px_at_10%_10%,#1b2a55_0%,#0b1020_45%,#070a12_100%)] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
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
            <Link className="hover:text-white" href="/refunds">
              Refunds
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

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <h1 className="text-4xl font-extrabold tracking-tight">
              Pricing built around your workflow
            </h1>
            <p className="mt-4 max-w-2xl text-white/75">
              Preview Canvas Classic QTI exports locally in your browser, then upgrade when you need
              to convert messy question banks into a Canvas import zip.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur">
                <div className="text-sm font-extrabold text-white/80">Step 1</div>
                <div className="mt-2 text-lg font-extrabold">Preview</div>
                <p className="mt-2 text-sm text-white/70">
                  Drop in a Canvas Classic export zip and review questions in a clean UI.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur">
                <div className="text-sm font-extrabold text-white/80">Step 2</div>
                <div className="mt-2 text-lg font-extrabold">Import</div>
                <p className="mt-2 text-sm text-white/70">
                  Use formatted import for template ready content, or smart import for messy docs.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur">
                <div className="text-sm font-extrabold text-white/80">Step 3</div>
                <div className="mt-2 text-lg font-extrabold">Export</div>
                <p className="mt-2 text-sm text-white/70">
                  Download a Canvas import zip, plus a Word export with images for review.
                </p>
              </div>
            </div>

            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur">
              <h2 className="text-xl font-extrabold">What counts toward the 1,000 questions</h2>
              <p className="mt-2 text-sm text-white/75">
                Only smart import uses AI and counts toward your monthly question allowance.
                Preview and formatted import do not count toward the meter.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-extrabold">Does not count</div>
                  <ul className="mt-3 space-y-2 text-sm text-white/80">
                    <li>Previewing Canvas Classic export zips</li>
                    <li>Exporting previews to Word</li>
                    <li>Formatted import conversions</li>
                    <li>Re downloading previously generated files in the session</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-extrabold">Counts</div>
                  <ul className="mt-3 space-y-2 text-sm text-white/80">
                    <li>Smart import conversions that require AI cleanup</li>
                    <li>Questions detected in the final converted bank</li>
                    <li>Optional review pass if you run it</li>
                  </ul>
                </div>
              </div>

              <p className="mt-4 text-xs text-white/55">
                Note: question estimates are best effort. If your source content is ambiguous, counts may vary slightly.
              </p>
            </div>

            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur">
              <h2 className="text-xl font-extrabold">Formatted import vs smart import</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-lg font-extrabold">Formatted import</div>
                  <p className="mt-2 text-sm text-white/75">
                    Best when your content already follows the Quizzip template. Converts instantly without AI.
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-white/80">
                    <li>Unlimited runs</li>
                    <li>No AI usage</li>
                    <li>Fast and predictable output</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-lg font-extrabold">Smart import</div>
                  <p className="mt-2 text-sm text-white/75">
                    Best for messy, mixed format content like docs, spreadsheets, and copy paste.
                    Uses AI to normalize and generate a clean Canvas import zip.
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-white/80">
                    <li>Metered up to 1,000 questions per month</li>
                    <li>Supports docx, xlsx, csv, tsv, txt, and pasted text</li>
                    <li>Designed for real world content</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <aside className="lg:col-span-1">
            <div className="sticky top-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur">
              <div className="text-sm font-extrabold text-white/80">Subscription</div>
              <div className="mt-2 flex items-end gap-2">
                <div className="text-5xl font-extrabold">$9</div>
                <div className="pb-2 text-sm text-white/70">per month</div>
              </div>

              <p className="mt-3 text-sm text-white/75">
                Built for instructional designers and faculty who manage Canvas question banks.
              </p>

              <ul className="mt-5 space-y-3 text-sm">
                <Check>Free QTI preview in a clean UI</Check>
                <Check>Export to Word with images for SME review</Check>
                <Check>Unlimited formatted import and QTI export</Check>
                <Check>Smart import includes 1,000 questions per month</Check>
                <Check>Optional review pass before export</Check>
                <Check>Manage billing anytime via Stripe portal</Check>
              </ul>

              <div className="mt-6">
                <Link
                  href="/login"
                  className="block w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-5 py-3 text-center text-sm font-extrabold text-white shadow-[0_10px_30px_rgba(168,85,247,0.35)] hover:opacity-95"
                >
                  Start now
                </Link>

                <p className="mt-3 text-xs text-white/60">
                  Preview and formatted import stay local. Smart import uses AI and is metered.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-8">
          <SiteFooter />
        </div>
      </div>
    </main>
  );
}
