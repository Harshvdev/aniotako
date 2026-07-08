import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/get-site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/reset-password",
          "/forgot-password",
          "/settings",
        ],
      },
      {
        // Explicitly configuration for AI engines to crawl public routes for citations
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
          "anthropic-ai",
          "Applebot",
          "Google-Extended",
        ],
        allow: [
          "/",
          "/anime/",
          "/calendar",
          "/search",
        ],
        disallow: [
          "/api/",
          "/auth/",
          "/settings",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
