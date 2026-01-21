import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "Refunds and Cancellation | Quizzip",
  description: "Refund policy and how to cancel.",
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
            <Link className="hover:text-white" href="/terms">
              Terms
            </Link>
            <Link className="hover:text-white" href="/privacy">
              Privacy
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

export default function RefundsPage() {
  return (
    <Shell title="Refunds and Cancellation" subtitle="Last updated: update this date when you ship changes.">
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Cancel anytime</h2>
        <p>
          You can cancel your subscription anytime through the Stripe billing portal. Your plan remains active until the end of
          your billing period.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Refunds</h2>
        <p>
          Because Quizzip provides immediate access to paid features, refunds are handled on a case by case basis. If something is
          broken on our side and we cannot resolve it, contact support and we will review your request.
        </p>
        <p>If you have a billing question, reach out quickly. The sooner we can investigate, the easier it is to help.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Usage limits</h2>
        <p>
          Smart import may be metered by question count based on your plan. If you hit a limit, you can wait for the next billing
          cycle or contact support if you need help.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Contact</h2>
        <p>
          Billing support:{" "}
          <a className="font-extrabold text-white underline" href="mailto:support@quizzip.co">
            support@quizzip.co
          </a>
        </p>
      </section>
    </Shell>
  );
}
