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
      <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-white/70">
        <div className="flex flex-col items-center gap-5 text-center md:flex-row md:justify-between md:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <span className="font-extrabold text-white/85">Quizzip</span>
            <span className="text-white/55">Canvas quiz tools that just work</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link className="hover:text-white/95" href="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-white/95" href="/terms">
              Terms
            </Link>
            <Link className="hover:text-white/95" href="/refunds">
              Refunds
            </Link>
            <Link className="hover:text-white/95" href="/accessibility">
              Accessibility
            </Link>
            <Link className="hover:text-white/95" href="/contact">
              Contact
            </Link>
          </nav>
        </div>

        <div className="mt-5 text-center text-xs text-white/50 md:text-left">
          © {new Date().getFullYear()} Quizzip. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
