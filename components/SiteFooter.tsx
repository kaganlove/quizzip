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
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-white/70">
        <div className="flex flex-col items-center text-center">
          <div className="text-white/75">Canvas quiz tools that just work</div>

          <div className="h-4" />

          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
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

          <div className="h-5" />

          <div className="text-xs text-white/50">
            © {new Date().getFullYear()} Quizzip. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
