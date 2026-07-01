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

    // Fetch watchlist entries linked with anime metadata
    const { data: watchlist, error: watchError } = await supabase
      .from("watchlist_entries")
      .select(`mal_id, status, watched_episodes, anime_metadata!left (anilist_id)`)
      .eq("user_id", user.id);

    if (watchError) {
      console.error("[CALENDAR API] Supabase Error:", watchError.message);
      return NextResponse.json({ error: watchError.message }, { status: 500 });
    }

    if (!watchlist || watchlist.length === 0) {
      return NextResponse.json({ chunks: [], userEntriesMap: {} });
    }

    // Filter out completed or dropped shows
    const activeWatchlist = watchlist.filter(
      (entry: any) => entry.status !== "completed" && entry.status !== "dropped"
    );

    // Build a map of entries using AniList ID as the key for easy frontend cross-referencing
    const userEntriesMap: Record<number, any> = {};
    const anilistIds: number[] = [];

    activeWatchlist.forEach((entry: any) => {
      let anilist_id = null;
      if (entry.anime_metadata) {
        anilist_id = Array.isArray(entry.anime_metadata) 
          ? entry.anime_metadata[0]?.anilist_id 
          : entry.anime_metadata.anilist_id;
      }
      
      const parsedId = Number(anilist_id);
      if (!isNaN(parsedId) && parsedId > 0) {
        anilistIds.push(parsedId);
        userEntriesMap[parsedId] = {
          status: entry.status,
          watched_episodes: entry.watched_episodes,
          mal_id: entry.mal_id
        };
      }
    });

    if (anilistIds.length === 0) {
      return NextResponse.json({ chunks: [], userEntriesMap: {} });
    }

    // Chunk the AniList IDs into groups of 50 to naturally handle pagination limits safely
    const CHUNK_SIZE = 50;
    const chunks: any[] = [];
    
    for (let i = 0; i < anilistIds.length; i += CHUNK_SIZE) {
      const chunkIds = anilistIds.slice(i, i + CHUNK_SIZE);
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

    console.log(`[CALENDAR API] Prepared ${chunks.length} payload requests for client-side execution.`);
    return NextResponse.json({ 
      isWeek,
      mondayUtcStr: mondayUtc.toISOString(),
      chunks, 
      userEntriesMap 
    });
    
  } catch (error: any) {
    console.error("[CALENDAR API] Unhandled Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}