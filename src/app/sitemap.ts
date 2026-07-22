import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/get-site-url";

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
    // Fetch cached anime metadata from database with a 3-second build timeout fallback
    const cachedAnime = await Promise.race([
      prisma.anime_metadata.findMany({
        select: {
          mal_id: true,
          airing_status: true,
          cached_at: true,
          anilist_raw: true,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Database query timeout generating sitemap")), 3000)
      ),
    ]);

    // Sort in memory to avoid complex/slow dynamic json parsing in db query
    const sortedAnime = cachedAnime.sort((a, b) => {
      // 1. Airing status (RELEASING first)
      const aAiring = a.airing_status === "RELEASING";
      const bAiring = b.airing_status === "RELEASING";
      if (aAiring && !bAiring) return -1;
      if (!aAiring && bAiring) return 1;

      // 2. Popularity (from anilist_raw json object)
      const aPop = (a.anilist_raw as any)?.popularity || 0;
      const bPop = (b.anilist_raw as any)?.popularity || 0;
      return bPop - aPop;
    });

    // Take top 2000 records to keep within fast generation bounds
    const dynamicRoutes = sortedAnime.slice(0, 2000).map((anime) => ({
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
