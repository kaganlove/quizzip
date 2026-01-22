import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QuizZip MVP",
  description: "Preview Canvas QTI exports and generate clean exports.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
