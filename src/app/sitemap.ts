import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/get-site-url";

export const revalidate = 86400; // Cache generated sitemap at the edge for 24 hours (ISR)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  // Static routes configuration
  const staticRoutes = [
    "",
    "/watchlist",
    "/calendar",
    "/search",
    "/import",
    "/notifications",
    "/settings",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  try {
    // Fast indexed query: prioritizing RELEASING anime, then by popularity
    // Direct from database engine without TOAST scans or in-memory JS sorting
    const topAnime = await prisma.anime_metadata.findMany({
      select: {
        mal_id: true,
        airing_status: true,
        cached_at: true,
      },
      orderBy: [
        { airing_status: "asc" },
        { popularity: "desc" },
      ],
      take: 2000,
    });

    const dynamicRoutes = topAnime.map((anime) => ({
      url: `${baseUrl}/anime/${Number(anime.mal_id)}`,
      lastModified: anime.cached_at ? new Date(anime.cached_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: anime.airing_status === "RELEASING" ? 0.7 : 0.5,
    }));

    return [...staticRoutes, ...dynamicRoutes];
  } catch (error) {
    console.error("[SITEMAP] Failed to fetch dynamic sitemap routes:", error);
    return staticRoutes;
  }
}
