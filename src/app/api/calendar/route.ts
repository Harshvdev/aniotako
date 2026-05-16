import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import https from "https";

// Fallback fetcher for Jikan (IPv4 to prevent rate limits/drops)
const fetchIPv4 = (url: string, timeoutMs: number = 6000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4 }, (res) => {
      if (res.statusCode === 429) return reject({ status: 429, message: "Rate Limited" });
      if (res.statusCode && res.statusCode !== 200) return reject({ status: res.statusCode, message: `HTTP Error ${res.statusCode}` });
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(rawData)); } 
        catch (e) { reject({ status: 500, message: "JSON Parse Error" }); }
      });
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(timeoutMs, () => { req.destroy(); reject({ name: 'AbortError', message: 'Timeout' }); });
  });
};

const fetchAnilist = async (query: string, variables: any) => {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList Network Error: ${res.status}`);
  return res.json();
};

const anilistQuery = `
  query($page: Int, $start: Int, $end: Int, $anilistIds: [Int]) {
    Page(page: $page, perPage: 50) {
      pageInfo {
        hasNextPage
      }
      airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, mediaId_in: $anilistIds, sort: TIME) {
        airingAt
        episode
        media {
          id
          idMal
          format
          episodes
          title { romaji english }
          coverImage { large }
        }
      }
    }
  }
`;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // Expected: YYYY-MM-DD
    const isWeek = searchParams.get("week") === "true";
    
    console.log(`\n--- [CALENDAR API] Request Started ---`);
    console.log(`Params: date=${dateParam}, week=${isWeek}`);

    if (!dateParam) {
      return NextResponse.json({ error: "Missing date parameter" }, { status: 400 });
    }

    const targetDate = new Date(`${dateParam}T00:00:00Z`); // Parse strictly as UTC
    let startUnix: number, endUnix: number;
    let mondayUtc = new Date(targetDate);

    if (isWeek) {
      // Get current week's Mon-Sun date range in UTC
      const day = targetDate.getUTCDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      
      mondayUtc.setUTCDate(targetDate.getUTCDate() + diffToMonday);
      mondayUtc.setUTCHours(0, 0, 0, 0);
      
      const sundayUtc = new Date(mondayUtc);
      sundayUtc.setUTCDate(mondayUtc.getUTCDate() + 6);
      sundayUtc.setUTCHours(23, 59, 59, 999);

      startUnix = Math.floor(mondayUtc.getTime() / 1000);
      endUnix = Math.floor(sundayUtc.getTime() / 1000);
    } else {
      // Get start and end of the specific day in UTC
      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      startUnix = Math.floor(startOfDay.getTime() / 1000);
      endUnix = Math.floor(endOfDay.getTime() / 1000);
    }

    console.log(`Calculated Unix Range: start=${startUnix}, end=${endUnix}`);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: watchlist, error: watchError } = await supabase
      .from("watchlist_entries")
      .select(`mal_id, status, watched_episodes, anime_metadata!left (anilist_id)`)
      .eq("user_id", user.id);

    if (watchError) {
      console.error("[CALENDAR API] Supabase Error:", watchError.message);
      return NextResponse.json({ error: watchError.message }, { status: 500 });
    }

    if (!watchlist || watchlist.length === 0) {
      return NextResponse.json(isWeek ? { dotsByDate: {} } : { data: [] });
    }

    // Strip out completed/dropped shows
    const activeWatchlist = watchlist.filter(
      (entry: any) => entry.status !== "completed" && entry.status !== "dropped"
    );

    const userEntries = activeWatchlist.map((entry: any) => {
      let anilist_id = null;
      if (entry.anime_metadata) {
        anilist_id = Array.isArray(entry.anime_metadata) 
          ? entry.anime_metadata[0]?.anilist_id 
          : entry.anime_metadata.anilist_id;
      }
      return { ...entry, anilist_id: Number(anilist_id) };
    });

    const anilistIds = userEntries.map(e => e.anilist_id).filter(id => !isNaN(id) && id > 0);
    const missingAnilistEntries = userEntries.filter(e => isNaN(e.anilist_id) || e.anilist_id <= 0);

    let allSchedules: any[] = [];
    
    // FETCH ANILIST (One query, loop pages if results exceed 50)
    if (anilistIds.length > 0) {
      let page = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        try {
          const variables = { page, start: startUnix - 1, end: endUnix + 1, anilistIds };
          const anilistRes = await fetchAnilist(anilistQuery, variables);

          if (anilistRes.errors) {
            console.error(`[CALENDAR API] AniList GraphQL Errors:`, JSON.stringify(anilistRes.errors));
            break;
          }

          if (anilistRes?.data?.Page?.airingSchedules) {
            allSchedules.push(...anilistRes.data.Page.airingSchedules);
          }
          
          hasNextPage = anilistRes?.data?.Page?.pageInfo?.hasNextPage || false;
          page++;
        } catch (err: any) {
          console.error(`[CALENDAR API] AniList Error:`, err.message);
          break;
        }
      }
    }

    // --- RETURN DOTS (WEEK MODE) ---
    if (isWeek) {
      const dotsByDate: Record<string, boolean> = {};
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(mondayUtc);
        d.setUTCDate(mondayUtc.getUTCDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        dotsByDate[dateStr] = false;
      }
      
      allSchedules.forEach((schedule: any) => {
        const dateObj = new Date(schedule.airingAt * 1000);
        const dStr = dateObj.toISOString().split('T')[0];
        if (dotsByDate[dStr] !== undefined) {
          dotsByDate[dStr] = true;
        }
      });
      
      console.log(`[CALENDAR API] Week Dots Payload Prepared.`);
      return NextResponse.json({ dotsByDate });
    } 
    
    // --- RETURN SPECIFIC DAY (SINGLE MODE) ---
    let matchedAnime = allSchedules.map((schedule: any) => {
      const media = schedule.media;
      const userEntry = userEntries.find(e => e.anilist_id === media.id || e.mal_id === media.idMal);
      return {
        mal_id: media.idMal,
        anilist_id: media.id,
        title: media.title.romaji || media.title.english,
        title_english: media.title.english || null,
        title_romaji: media.title.romaji || null,
        poster_url: media.coverImage?.large,
        format: media.format,
        airingAt: schedule.airingAt,
        episode: schedule.episode,
        total_episodes: media.episodes,
        status: userEntry?.status,
        watched_episodes: userEntry?.watched_episodes,
      };
    });

    // Jikan Fallback for Missing AniList IDs
    if (missingAnilistEntries.length > 0) {
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayOfWeek = days[targetDate.getUTCDay()]; 
      
      try {
        const jikanData = await fetchIPv4(`https://api.jikan.moe/v4/schedules?filter=${dayOfWeek}`);
        const missingMalIds = new Set(missingAnilistEntries.map(e => e.mal_id));
        
        const jikanMatches = (jikanData.data || [])
          .filter((anime: any) => missingMalIds.has(anime.mal_id))
          .map((anime: any) => {
            const userEntry = missingAnilistEntries.find(e => e.mal_id === anime.mal_id);
            return {
              mal_id: anime.mal_id,
              anilist_id: null,
              title: anime.title,
              title_english: anime.title_english || null,
              title_romaji: anime.title || null,
              poster_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
              format: anime.type,
              time: anime.broadcast?.string || "Time Unknown",
              airingAt: null,
              episode: null,
              total_episodes: anime.episodes,
              status: userEntry?.status,
              watched_episodes: userEntry?.watched_episodes,
            };
          });
          
        matchedAnime = [...matchedAnime, ...jikanMatches];
      } catch (e: any) {
        console.error("[CALENDAR API] Jikan fallback failed:", e.message);
      }
    }

    console.log(`[CALENDAR API] Returning ${matchedAnime.length} entries for ${dateParam}.`);
    console.log(`--- [CALENDAR API] Request Ended ---\n`);
    return NextResponse.json({ data: matchedAnime });
    
  } catch (error: any) {
    console.error("[CALENDAR API] Unhandled Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}