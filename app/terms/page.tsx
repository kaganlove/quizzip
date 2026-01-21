import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "Terms of Service | Quizzip",
  description: "Terms for using Quizzip.",
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

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="mt-2 text-sm text-white/75">{subtitle}</p>

          <div className="mt-6 space-y-6 text-sm text-white/85">{children}</div>
        </div>

        <div className="mt-8">
          <SiteFooter />
        </div>
      </div>
    </main>
  );
}

export default function TermsPage() {
  return (
    <Shell
      title="Terms of Service"
      subtitle="Last updated: update this date when you ship changes."
    >
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Agreement</h2>
        <p>
          By accessing or using Quizzip, you agree to these terms. If you do not agree, do not use the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">What Quizzip does</h2>
        <p>
          Quizzip helps you preview Canvas Classic QTI exports in a clean browser view and generate outputs such as Word exports
          and Canvas importable QTI zips. Preview is designed to run locally in your browser. Smart import sends content to our
          server route to run an AI conversion.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Accounts</h2>
        <p>
          You are responsible for safeguarding your account. You agree not to share your login credentials and to notify us if
          you suspect unauthorized access.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Subscriptions and billing</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Paid features require an active subscription.</li>
          <li>Billing is handled through Stripe. You can manage billing and cancel through the billing portal.</li>
          <li>Smart import usage may be metered by question count based on your plan.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Acceptable use</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Do not misuse the service, attempt to break it, or interfere with other users.</li>
          <li>Do not submit content that you do not have the right to use.</li>
          <li>Do not use Quizzip to violate laws or policies that apply to you.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">No affiliation</h2>
        <p>
          Quizzip is not affiliated with Instructure or Canvas. Canvas is a trademark of its respective owner.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Disclaimers</h2>
        <p>
          The service is provided as is. We do not guarantee that every conversion will be perfect. You are responsible for
          reviewing outputs before importing into Canvas.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Quizzip will not be liable for indirect, incidental, special, consequential, or
          punitive damages, or any loss of data, profits, or revenue.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Changes</h2>
        <p>
          We may update these terms from time to time. If changes are material, we will post an updated date on this page.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a className="font-extrabold text-white underline" href="mailto:support@quizzip.co">
            support@quizzip.co
          </a>
        </p>
      </section>
    </Shell>
  );
}
