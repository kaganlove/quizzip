import React from "react";
import Link from "next/link";

type SiteFooterProps = React.ComponentPropsWithoutRef<"footer"> & {
  className?: string;
};

export default function SiteFooter({ className = "", ...rest }: SiteFooterProps) {
  const links = [
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
    { href: "/refunds", label: "Refunds" },
    { href: "/accessibility", label: "Accessibility" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <footer
      className={["mt-10 w-full border-t border-white/10 bg-transparent", className].join(" ")}
      {...rest}
    >
      <div className="mx-auto max-w-6xl px-6 py-10 text-center text-sm text-white/70">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="text-white/80">Canvas quiz tools that just work</div>

          <nav
            aria-label="Footer links"
            className="flex flex-wrap items-center justify-center gap-y-2"
          >
            {links.map((l, idx) => (
              <React.Fragment key={l.href}>
                {idx > 0 && (
                  <span aria-hidden="true" className="mx-5 text-white/25">
                    |
                  </span>
                )}
                <Link className="hover:text-white" href={l.href}>
                  {l.label}
                </Link>
              </React.Fragment>
            ))}
          </nav>

          <div className="pt-2 text-xs text-white/50">
            © {new Date().getFullYear()} Quizzip. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
