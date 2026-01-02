import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0b1020] text-white">
      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-white/10 ring-1 ring-white/15" />
          <div className="leading-tight">
            <div className="text-lg font-semibold">QuizZip</div>
            <div className="text-xs text-white/70">
              View Canvas Classic quiz exports fast
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white/90 ring-1 ring-white/15 hover:bg-white/10"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0b1020] hover:bg-white/90"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-10 pt-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Open QTI exports and review questions in seconds
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/80">
              Upload a Canvas Classic quiz export zip and get a clean, readable
              view of questions, answers, and images. Parsing stays in your
              browser.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#0b1020] hover:bg-white/90"
              >
                Start free
              </Link>
              <Link
                href="/app"
                className="rounded-lg px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/10"
              >
                Open the app
              </Link>
            </div>

            <div className="mt-6 text-xs text-white/60">
              Nothing is uploaded to your servers. Great for quick instructor
              reviews.
            </div>
          </div>

          {/* Visual card */}
          <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="rounded-xl bg-black/30 p-5 ring-1 ring-white/10">
              <div className="text-sm font-semibold text-white/90">
                What you get
              </div>
              <ul className="mt-3 space-y-2 text-sm text-white/75">
                <li>Readable question list</li>
                <li>Answer key included</li>
                <li>Images supported</li>
                <li>Export to Word</li>
              </ul>
            </div>

            <div className="mt-4 rounded-xl bg-black/30 p-5 ring-1 ring-white/10">
              <div className="text-sm font-semibold text-white/90">
                Built for
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-white/75">
                <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
                  Instructional designers
                </div>
                <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
                  Faculty reviewers
                </div>
                <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
                  Course teams
                </div>
                <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
                  SMEs
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <h2 className="text-2xl font-bold">Pricing</h2>
        <p className="mt-2 text-sm text-white/75">
          Simple plan, built for speed. Upgrade any time.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-sm font-semibold text-white/85">Free</div>
            <div className="mt-2 text-3xl font-bold">$0</div>
            <ul className="mt-4 space-y-2 text-sm text-white/75">
              <li>Upload and view quizzes</li>
              <li>Images supported</li>
              <li>Basic exports</li>
            </ul>
            <Link
              href="/signup"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0b1020] hover:bg-white/90"
            >
              Start free
            </Link>
          </div>

          <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-sm font-semibold text-white/85">Pro</div>
            <div className="mt-2 text-3xl font-bold">
              $9<span className="text-base font-semibold text-white/70">/mo</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-white/75">
              <li>Full exports to Word</li>
              <li>Faster workflows for review</li>
              <li>Priority improvements as you grow</li>
            </ul>
            <Link
              href="/signup"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/10"
            >
              Upgrade in app
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="text-sm font-semibold text-white/90">
            Ready to try it
          </div>
          <div className="mt-2 text-sm text-white/75">
            Create an account, then head into the app to upload a quiz export.
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#0b1020] hover:bg-white/90"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} QuizZip</div>
          <div>Built for Canvas Classic quiz exports</div>
        </div>
      </footer>
    </main>
  );
}
