import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const mal_id = parseInt(params.id, 10);
    
    if (isNaN(mal_id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const supabase = await createClient();

    // 1. Check Cache
    console.log(`[API] Checking cache for MAL ID: ${mal_id}`);
    const { data: meta } = await supabase
      .from("anime_metadata")
      .select("*")
      .eq("mal_id", mal_id)
      .not("anilist_id", "is", null)
      .single();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const isStale = !meta || !meta.cached_at || new Date(meta.cached_at) < sevenDaysAgo;

    let anilistData = null;

    if (!isStale && meta?.anilist_raw) {
      console.log(`[API] Serving ${mal_id} from Supabase Cache`);
      anilistData = meta.anilist_raw;
        } else {
      console.log(`[API] Cache missing or stale. Fetching ${mal_id} directly from AniList GraphQL...`);

      const fetchAniList = async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        try {
          return await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify({
              query: ANILIST_QUERY,
              variables: { idMal: mal_id }
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
      };

      let response: Response | null = null;
      let lastError: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await fetchAniList();
          break;
        } catch (err) {
          lastError = err;
          if (attempt === 3) {
            if (meta?.anilist_raw) {
              console.warn(`[API] AniList timed out, serving cached payload for ${mal_id}`);
              anilistData = meta.anilist_raw;
              break;
            }
            throw err;
          }

          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }

      if (response) {
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[API] AniList returned HTTP ${response.status}:`, errorText);
          throw new Error(`AniList returned HTTP ${response.status}`);
        }

        const json = await response.json();

        if (json.errors) {
          console.error(`[API] AniList GraphQL Errors:`, json.errors);
          throw new Error(json.errors[0].message);
        }

        anilistData = json.data.Media;

        if (anilistData) {
          console.log(`[API] Successfully fetched ${mal_id} from AniList. Upserting to cache...`);

          const combinedGenres = Array.from(new Set([
            ...(anilistData.genres || []),
            ...(anilistData.tags?.map((t: any) => t.name) || [])
          ]));

          const cleanSynopsis = anilistData.description ? anilistData.description.replace(/<[^>]*>?/gm, '') : null;
          const mainStudio = anilistData.studios?.nodes?.find((s: any) => s.isAnimationStudio)?.name
                          || anilistData.studios?.nodes?.[0]?.name || null;

          await supabase.from("anime_metadata").upsert({
            mal_id,
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
            anilist_raw: anilistData
          });
        }
      }
    }

    if (!anilistData) {
      return NextResponse.json({ error: "Not found on AniList" }, { status: 404 });
    }

    // 3. Fetch Historical Episodes from Jikan
    let jikanEpisodes: any[] = [];
    try {
      const jikanResponse = await fetch(`https://api.jikan.moe/v4/anime/${mal_id}/episodes`);
      if (jikanResponse.ok) {
        const jikanJson = await jikanResponse.json();
        jikanEpisodes = jikanJson.data || [];
      } else {
        console.warn(`[API] Jikan returned HTTP ${jikanResponse.status} for episodes`);
      }
    } catch (jikanError) {
      console.error("[API] Failed to fetch historical episodes from Jikan:", jikanError);
    }

    // 4. Fill Missing Episodes & Merge Logic
    const nextEpisodeNumber =
      meta?.next_episode_number ??
      meta?.next_episode_num ??
      anilistData?.nextAiringEpisode?.episode ??
      null;

    const nextAiringUnix =
      meta?.next_airing_at ??
      anilistData?.nextAiringEpisode?.airingAt ??
      meta?.raw_air_at ??
      null;

    const jikanMap = new Map<number, any>();
    jikanEpisodes.forEach((ep: any, idx: number) => {
      jikanMap.set(idx + 1, ep);
    });

    const lastReleasedEpisode = jikanEpisodes.length;
    const targetMax = nextEpisodeNumber
      ? Math.max(lastReleasedEpisode, nextEpisodeNumber)
      : lastReleasedEpisode;

    const mergedEpisodes = [];

    for (let i = 1; i <= targetMax; i++) {
      const jikanEp = jikanMap.get(i);

      if (jikanEp) {
        mergedEpisodes.push({
          episode_number: i,
          title: jikanEp.title || `Episode ${i}`,
          aired: jikanEp.aired || null,
          filler: jikanEp.filler,
          recap: jikanEp.recap,
          forum_url: jikanEp.forum_url,
          is_placeholder: false,
        });
        continue;
      }

      if (nextEpisodeNumber && i === nextEpisodeNumber) {
        mergedEpisodes.push({
          episode_number: i,
          title: `Episode ${i}`,
          airing_at: nextAiringUnix,
          is_placeholder: false,
        });
        continue;
      }

      if (nextEpisodeNumber && i < nextEpisodeNumber) {
        mergedEpisodes.push({
          episode_number: i,
          title: `Episode ${i}`,
          is_placeholder: true,
        });
      }
    }

    // 5. Build Final Combined Payload
    const mergedAnime = {
      ...anilistData,
      anime_metadata: meta ? {
        raw_air_at: meta.raw_air_at,
        sub_air_at: meta.sub_air_at,
        dub_air_at: meta.dub_air_at,
        next_airing_at: meta.next_airing_at,
        next_episode_number: nextEpisodeNumber,
        schedule_updated_at: meta.schedule_updated_at,
      } : null,
      episodes: mergedEpisodes,
    };

    return NextResponse.json(mergedAnime);

  } catch (error: any) {
    console.error("[API] Fatal AniList Proxy Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}