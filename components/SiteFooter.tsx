import type React from "react";
import Link from "next/link";

type SiteFooterProps = React.ComponentPropsWithoutRef<"footer"> & {
  className?: string;
};

export default function SiteFooter({ className = "", ...rest }: SiteFooterProps) {
  const year = new Date().getFullYear();

  const outer: React.CSSProperties = {
    width: "100%",
    borderTop: "1px solid rgba(255,255,255,0.10)",
    background: "transparent",
    marginTop: "56px",
  };

  const inner: React.CSSProperties = {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "40px 18px",
    color: "rgba(255,255,255,0.70)",
    fontSize: 14,
    textAlign: "center",
  };

  const linkRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 0,
    marginTop: 18,
    marginBottom: 18,
  };

  const linkStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "8px 18px",
    color: "rgba(255,255,255,0.70)",
    textDecoration: "none",
    fontWeight: 800,
  };

  const sepStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.28)",
    padding: "0 6px",
    userSelect: "none",
  };

  const taglineStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.75)",
    fontWeight: 700,
  };

  const copyrightStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.50)",
    fontSize: 12,
  };

  return (
    <footer className={className} style={outer} {...rest}>
      <div style={inner}>
        {/* Line 1 */}
        <div style={taglineStyle}>Canvas quiz tools that just work</div>

        {/* Line 2 */}
        <nav aria-label="Footer links" style={linkRow}>
          <Link href="/privacy" style={linkStyle}>
            Privacy
          </Link>
          <span aria-hidden="true" style={sepStyle}>
            |
          </span>

          <Link href="/terms" style={linkStyle}>
            Terms
          </Link>
          <span aria-hidden="true" style={sepStyle}>
            |
          </span>

          <Link href="/refunds" style={linkStyle}>
            Refunds
          </Link>
          <span aria-hidden="true" style={sepStyle}>
            |
          </span>

          <Link href="/accessibility" style={linkStyle}>
            Accessibility
          </Link>
          <span aria-hidden="true" style={sepStyle}>
            |
          </span>

          <Link href="/contact" style={linkStyle}>
            Contact
          </Link>
        </nav>

        {/* Line 3 */}
        <div style={copyrightStyle}>© {year} Quizzip. All rights reserved.</div>
      </div>
    </footer>
  );
}
