import { createClient as createAdminClient } from "@supabase/supabase-js";
import prisma from "@/lib/prisma";

const ANILIST_QUERY = `
  query ($idMal: Int) {
    Media(idMal: $idMal, type: ANIME) {
      id
      idMal
      title { romaji english native }
      description
      coverImage { large extraLarge }
      bannerImage
      format
      status
      episodes
      duration
      averageScore
      meanScore
      popularity
      isAdult
      genres
      tags { name }
      studios { nodes { name isAnimationStudio } }
      season
      seasonYear
      startDate { year month day }
      endDate { year month day }
      source
      countryOfOrigin
      nextAiringEpisode { airingAt episode timeUntilAiring }
      airingSchedule { nodes { airingAt episode } }
      characters (sort: [FAVOURITES_DESC], perPage: 12) {
        edges { role node { name { full native } image { medium } } }
      }
      recommendations (sort: [RATING_DESC], perPage: 10) {
        nodes { mediaRecommendation { id idMal title { romaji english } coverImage { extraLarge } format averageScore } }
      }
      relations {
        edges { relationType node { id idMal title { romaji english } coverImage { medium } format status } }
      }
      trailer { id site }
      externalLinks { url site }
    }
  }
`;

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const fetchAniList = async (malId: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    return await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query: ANILIST_QUERY,
        variables: { idMal: malId }
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

export async function getAnimeDetails(malId: number) {
  try {
    // 1. Check Cache
    const { data: meta } = await supabaseAdmin
      .from("anime_metadata")
      .select("*")
      .eq("mal_id", malId)
      .single();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let isStale = !meta || !meta.cached_at || new Date(meta.cached_at) < sevenDaysAgo;

    // If the anime is releasing, check for updates more frequently (e.g., every 24 hours)
    if (!isStale && meta && meta.airing_status === "RELEASING") {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (new Date(meta.cached_at) < oneDayAgo) {
        isStale = true;
      }
    }

    // If the cached next airing episode has already aired, force a cache refresh
    if (!isStale && meta?.anilist_raw) {
      const raw = meta.anilist_raw as any;
      const airingAt = raw?.nextAiringEpisode?.airingAt;
      if (airingAt && airingAt * 1000 < Date.now()) {
        isStale = true;
      }
    }

    if (!isStale && meta?.anilist_raw) {
      return meta.anilist_raw;
    }

    // 2. Acquire Atomic Semaphore (locks row, checks circuit breaker, checks concurrency)
    const { data: authResult, error: authError } = await supabaseAdmin.rpc("acquire_anilist_semaphore");

    if (authError || !authResult) {
      console.error("[getAnimeDetails] Semaphore RPC Error:", authError);
      return { error: "rate_limited" };
    }

    const { success, error, ticket_id, retry_after } = authResult;

    if (!success) {
      console.warn(`[getAnimeDetails] Semaphore denied access for MAL ID ${malId}. Error: ${error}`);
      if (error === "rate_limited") {
        return { error: "rate_limited", retryAfter: retry_after };
      }
      return { error: "rate_limited" }; // Treat concurrency limit as rate_limited for client fallback
    }

    // 3. Fetch from AniList
    try {
      const response = await fetchAniList(malId);

      // Handle 429 Rate Limit
      if (response.status === 429) {
        console.warn(`[getAnimeDetails] AniList returned 429 for MAL ID ${malId}`);
        const retryAfterHeader = response.headers.get("Retry-After");
        const seconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
        const blockedUntil = new Date(Date.now() + seconds * 1000);

        // Monotonic update of circuit breaker using GREATEST
        await prisma.$executeRaw`
          INSERT INTO api_status (api_name, blocked_until)
          VALUES ('anilist', ${blockedUntil})
          ON CONFLICT (api_name) DO UPDATE
          SET blocked_until = GREATEST(api_status.blocked_until, ${blockedUntil});
        `;

        return { error: "rate_limited", retryAfter: seconds };
      }

      if (!response.ok) {
        throw new Error(`AniList returned HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.errors) {
        throw new Error(json.errors[0].message);
      }

      const anilistData = json.data?.Media;
      if (!anilistData) {
        return null;
      }

      // Save to Cache
      const combinedGenres = Array.from(new Set([
        ...(anilistData.genres || []),
        ...(anilistData.tags?.map((t: any) => t.name) || [])
      ]));

      const cleanSynopsis = anilistData.description ? anilistData.description.replace(/<[^>]*>?/gm, '') : null;
      const mainStudio = anilistData.studios?.nodes?.find((s: any) => s.isAnimationStudio)?.name
                      || anilistData.studios?.nodes?.[0]?.name || null;

      const isFinished = anilistData.status === "FINISHED" || anilistData.status === "CANCELLED";

      const { error: upsertErr } = await supabaseAdmin.from("anime_metadata").upsert({
        mal_id: malId,
        anilist_id: anilistData.id,
        title: anilistData.title.romaji || anilistData.title.english,
        title_english: anilistData.title.english,
        title_romaji: anilistData.title.romaji,
        title_native: anilistData.title.native,
        genres: combinedGenres,
        type: anilistData.format || "Unknown",
        season: anilistData.season || null,
        airing_status: anilistData.status || null,
        studio: mainStudio,
        year: anilistData.seasonYear || null,
        total_episodes: anilistData.episodes || null,
        synopsis: cleanSynopsis,
        poster_url: anilistData.coverImage?.extraLarge || anilistData.coverImage?.large || null,
        cached_at: new Date().toISOString(),
        anilist_raw: anilistData,
        ...(isFinished ? {
          raw_air_at: null,
          sub_air_at: null,
          dub_air_at: null,
          raw_next_episode_number: null,
          sub_next_episode_number: null,
          dub_next_episode_number: null,
          next_episode_number: null,
          next_airing_at: null,
        } : {})
      });

      if (upsertErr) {
        console.error(`[getAnimeDetails] Failed to cache metadata for ${malId}:`, upsertErr.message);
      }

      return anilistData;

    } catch (err: any) {
      console.error(`[getAnimeDetails] Fetch failed for ${malId}:`, err.message || err);
      return { error: "network_error" };

    } finally {
      // 4. Release Semaphore Ticket
      if (ticket_id) {
        await supabaseAdmin.from("active_api_requests").delete().eq("id", ticket_id);
      }
    }

  } catch (fatalError: any) {
    console.error("[getAnimeDetails] Fatal Error:", fatalError.message || fatalError);
    return { error: "network_error" };
  }
}
