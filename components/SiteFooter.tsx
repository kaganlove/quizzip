import type React from "react";
import Link from "next/link";

type SiteFooterProps = React.ComponentPropsWithoutRef<"footer"> & {
  className?: string;
};

export default function SiteFooter({ className = "", ...rest }: SiteFooterProps) {
  const sep = (
    <span aria-hidden="true" className="mx-4 text-white/25">
      |
    </span>
  );

  return (
    <footer
      className={[
        "mt-16 w-full border-t border-white/10 bg-transparent",
        className,
      ].join(" ")}
      {...rest}
    >
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-white/70">
        <div className="flex flex-col items-center text-center">
          {/* Line 1 */}
          <div className="text-white/75">Canvas quiz tools that just work</div>

          {/* Vertical spacing */}
          <div className="h-4" />

          {/* Line 2 */}
          <nav className="flex flex-wrap items-center justify-center">
            <Link className="hover:text-white transition-colors" href="/privacy">
              Privacy
            </Link>
            {sep}
            <Link className="hover:text-white transition-colors" href="/terms">
              Terms
            </Link>
            {sep}
            <Link className="hover:text-white transition-colors" href="/refunds">
              Refunds
            </Link>
            {sep}
            <Link className="hover:text-white transition-colors" href="/accessibility">
              Accessibility
            </Link>
            {sep}
            <Link className="hover:text-white transition-colors" href="/contact">
              Contact
            </Link>
          </nav>

          {/* Vertical spacing */}
          <div className="h-4" />

          {/* Line 3 */}
          <div className="text-xs text-white/50">
            © {new Date().getFullYear()} Quizzip. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
