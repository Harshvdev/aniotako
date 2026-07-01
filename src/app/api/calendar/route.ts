import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

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

    // Parse strictly as UTC
    const targetDate = new Date(`${dateParam}T00:00:00Z`); 
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
      // Get exact start and end of the specific day in UTC boundaries
      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      startUnix = Math.floor(startOfDay.getTime() / 1000);
      endUnix = Math.floor(endOfDay.getTime() / 1000);
    }

    // Authenticate User via Supabase
    const supabase = await createClient();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch watchlist entries linked with anime metadata and scheduling cache
    const { data: watchlist, error: watchError } = await supabase
      .from("watchlist_entries")
      .select(`
        mal_id, 
        status, 
        watched_episodes, 
        anime_metadata!left (
          anilist_id,
          title,
          poster_url,
          type,
          total_episodes,
          title_english,
          title_romaji,
          raw_air_at,
          sub_air_at,
          dub_air_at,
          raw_next_episode_number,
          sub_next_episode_number,
          dub_next_episode_number
        )
      `)
      .eq("user_id", user.id);

    if (watchError) {
      console.error("[CALENDAR API] Supabase Error:", watchError.message);
      return NextResponse.json({ error: watchError.message }, { status: 500 });
    }

    if (!watchlist || watchlist.length === 0) {
      return NextResponse.json({ resolvedSchedules: [], chunks: [], userEntriesMap: {} });
    }

    // Filter out completed or dropped shows
    const activeWatchlist = watchlist.filter(
      (entry: any) => entry.status !== "completed" && entry.status !== "dropped"
    );

    // Build a map of entries and resolve schedules from DB cache where possible
    const userEntriesMap: Record<number, any> = {};
    const fallbackAnilistIds: number[] = [];
    const resolvedSchedules: any[] = [];

    activeWatchlist.forEach((entry: any) => {
      const meta = Array.isArray(entry.anime_metadata) ? entry.anime_metadata[0] : entry.anime_metadata;
      if (!meta) return;

      const anilistId = Number(meta.anilist_id);
      if (isNaN(anilistId) || anilistId <= 0) return;

      userEntriesMap[anilistId] = {
        status: entry.status,
        watched_episodes: entry.watched_episodes,
        mal_id: entry.mal_id
      };

      // Check if we have a cached airing time within our range [startUnix, endUnix]
      const airTimes = [
        { type: "raw", time: meta.raw_air_at ? Number(meta.raw_air_at) : null, ep: meta.raw_next_episode_number },
        { type: "sub", time: meta.sub_air_at ? Number(meta.sub_air_at) : null, ep: meta.sub_next_episode_number },
        { type: "dub", time: meta.dub_air_at ? Number(meta.dub_air_at) : null, ep: meta.dub_next_episode_number },
      ];

      const activeAiring = airTimes.find(t => t.time && t.time >= startUnix && t.time <= endUnix);

      if (activeAiring) {
        resolvedSchedules.push({
          mal_id: entry.mal_id,
          anilist_id: anilistId,
          title: meta.title_romaji || meta.title_english || entry.title || "",
          title_english: meta.title_english,
          title_romaji: meta.title_romaji,
          poster_url: meta.poster_url || entry.poster_url || "",
          format: meta.type || "Unknown",
          airingAt: activeAiring.time,
          episode: activeAiring.ep,
          total_episodes: meta.total_episodes,
          status: entry.status,
          watched_episodes: entry.watched_episodes,
        });
      } else {
        fallbackAnilistIds.push(anilistId);
      }
    });

    // Chunk the remaining AniList IDs into groups of 50 to naturally handle pagination limits safely
    const CHUNK_SIZE = 50;
    const chunks: any[] = [];
    
    for (let i = 0; i < fallbackAnilistIds.length; i += CHUNK_SIZE) {
      const chunkIds = fallbackAnilistIds.slice(i, i + CHUNK_SIZE);
      chunks.push({
        query: `
          query($start: Int, $end: Int, $ids: [Int]) {
            Page(page: 1, perPage: 50) {
              airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, mediaId_in: $ids, sort: TIME) {
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
        `,
        variables: {
          start: startUnix,
          end: endUnix,
          ids: chunkIds
        }
      });
    }

    console.log(`[CALENDAR API] Resolved ${resolvedSchedules.length} from database. Prepared ${chunks.length} fallback payload requests for client-side execution.`);
    return NextResponse.json({ 
      isWeek,
      mondayUtcStr: mondayUtc.toISOString(),
      resolvedSchedules,
      chunks, 
      userEntriesMap 
    });
    
  } catch (error: any) {
    console.error("[CALENDAR API] Unhandled Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}