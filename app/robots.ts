import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/how-it-works", "/privacy", "/terms", "/refunds", "/security", "/accessibility", "/contact"],
        disallow: ["/app", "/api", "/auth", "/login", "/signup", "/reset"],
      },
    ],
    sitemap: "https://quizzip.co/sitemap.xml",
  };
}
