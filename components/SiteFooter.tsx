import Link from "next/link";

type SiteFooterProps = React.ComponentPropsWithoutRef<"footer"> & {
  className?: string;
};

export default function SiteFooter({ className = "", ...rest }: SiteFooterProps) {
  return (
    <footer
      className={[
        "mt-10 w-full border-t border-white/10 bg-transparent",
        className,
      ].join(" ")}
      {...rest}
    >
      <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-white/70">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white/85">Quizzip</span>
            <span aria-hidden="true" className="text-white/25">
              |
            </span>
            <span>Canvas quiz tools that just work</span>
          </div>

          <nav className="flex flex-wrap items-center gap-3">
            <Link className="hover:text-white" href="/how-it-works">
              How it works
            </Link>
            <span aria-hidden="true" className="text-white/25">
              |
            </span>
            <Link className="hover:text-white" href="/pricing">
              Pricing
            </Link>
            <span aria-hidden="true" className="text-white/25">
              |
            </span>
            <Link className="hover:text-white" href="/privacy">
              Privacy
            </Link>
            <span aria-hidden="true" className="text-white/25">
              |
            </span>
            <Link className="hover:text-white" href="/terms">
              Terms
            </Link>
            <span aria-hidden="true" className="text-white/25">
              |
            </span>
            <Link className="hover:text-white" href="/refunds">
              Refunds
            </Link>
            <span aria-hidden="true" className="text-white/25">
              |
            </span>
            <Link className="hover:text-white" href="/accessibility">
              Accessibility
            </Link>
            <span aria-hidden="true" className="text-white/25">
              |
            </span>
            <Link className="hover:text-white" href="/contact">
              Contact
            </Link>
          </nav>
        </div>

        <div className="mt-4 text-xs text-white/50">
          © {new Date().getFullYear()} Quizzip. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
