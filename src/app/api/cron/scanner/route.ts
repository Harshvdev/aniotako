import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Client } from "@upstash/qstash";

// Initialize Clients using Server-Side Environment Variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing Supabase URL environment variable.");
}
if (!supabaseServiceKey) {
  throw new Error("Missing Supabase Service Role Key environment variable.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

// Helper to calculate ISO Week and Year
function getISOWeekAndYear(date: Date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return { week: weekNum, year: target.getFullYear() };
}

export async function GET(req: NextRequest) {
  try {
    // Security Guardrail: Enforce token matching
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const now = new Date();
    
    // --- Step 1: Compute Current and Next ISO Weeks ---
    const currentWeekInfo = getISOWeekAndYear(now);
    const nextWeekDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeekInfo = getISOWeekAndYear(nextWeekDate);

    const weeksToFetch = [currentWeekInfo];
    if (currentWeekInfo.week !== nextWeekInfo.week) {
      weeksToFetch.push(nextWeekInfo);
    }

    // --- Step 2: Fetch Schedules from AnimeSchedule.net ---
    let allTimetableShows: any[] = [];
    
    for (const info of weeksToFetch) {
      const scheduleRes = await fetch(
        `https://animeschedule.net/api/v3/timetables?week=${info.week}&year=${info.year}&tz=UTC`,
        {
          headers: {
            Authorization: `Bearer ${process.env.ANIMESCHEDULE_TOKEN}`,
          },
        }
      );

      if (scheduleRes.ok) {
        const data = await scheduleRes.json();
        if (Array.isArray(data)) {
          allTimetableShows = allTimetableShows.concat(data);
        }
      }
    }

    // --- Step 3: Filter Against Users' Current Watchlists ---
    // Emulates the targeted distinct join query to locate watched metadata records
    const { data: watchedRows, error: dbError } = await supabase
      .from("anime_metadata")
      .select("anilist_id, mal_id, watchlist_entries!inner(status)")
      .eq("watchlist_entries.status", "watching")
      .not("anilist_id", "is", null);

    if (dbError) throw dbError;

    const watchedAnilistIds = new Set<number>();
    const anilistToMalMap = new Map<number, number>();

    watchedRows?.forEach((row: any) => {
      watchedAnilistIds.add(row.anilist_id);
      anilistToMalMap.set(row.anilist_id, row.mal_id);
    });

    // Parse AniList ID and cross-reference with watchlists
    const matchedShows = allTimetableShows.filter((show: any) => {
      const anilistWeb = show.websites?.find((w: any) => w.website === "AniList");
      if (!anilistWeb) return false;
      
      const match = anilistWeb.url.match(/anime\/(\d+)/);
      if (!match) return false;

      const id = parseInt(match[1], 10);
      show.parsedAnilistId = id; // Inject for usage in downstream loops
      return watchedAnilistIds.has(id);
    });

    // --- Summary State Trackers ---
    let inWindowCount = 0;
    let cacheUpdatedCount = 0;
    const queuedStats = { raw: 0, sub: 0, dub: 0 };

    const windowStart = new Date(now.getTime() - 5 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();

    const toUnix = (dateStr: string | null) =>
      dateStr ? Math.floor(new Date(dateStr).getTime() / 1000) : null;

    // --- Step 4, 5 & 6: Window Filtering, Caching & Queue Processing ---
    for (const show of matchedShows) {
      const epDate = new Date(show.episodeDate);
      
      // Determine if show falls within the current processing execution window
      if (epDate >= windowStart && epDate <= windowEnd) {
        inWindowCount++;
        const anilistId = show.parsedAnilistId;
        const malId = anilistToMalMap.get(anilistId);

        // Step 5: Upsert internal schema metadata cache values
        const { error: upsertError } = await supabase.from("anime_metadata").upsert(
          {
            anilist_id: anilistId,
            mal_id: malId,
            raw_air_at: toUnix(show.episodeDate),
            sub_air_at: toUnix(show.subPostDate),
            dub_air_at: toUnix(show.dubPostDate),
            next_episode_number: show.episodeNumber,
            next_airing_at: toUnix(show.episodeDate),
            schedule_updated_at: now.toISOString(),
          },
          { onConflict: "anilist_id" }
        );

        if (!upsertError) cacheUpdatedCount++;

        // Step 6: Queue QStash Payload Configurations
        const rawAirAt = toUnix(show.episodeDate);
        const subAirAt = toUnix(show.subPostDate);
        const dubAirAt = toUnix(show.dubPostDate);

        const formats = [
          { format: "raw", timestamp: rawAirAt },
          { format: "sub", timestamp: subAirAt },
          { format: "dub", timestamp: dubAirAt },
        ].filter((f) => f.timestamp && f.timestamp > Math.floor(now.getTime() / 1000));

        const poster_url = show.imageVersionRoute
          ? `https://animeschedule.net/images/anime/${show.imageVersionRoute}`
          : null;

        for (const f of formats) {
          // Internal Deduplication Check: Look back 12 hours
          const { data: duplicateNotification } = await supabase
            .from("notifications")
            .select("id")
            .eq("episode", show.episodeNumber)
            .eq("format", f.format)
            .or(`anilist_id.eq.${anilistId},mal_id.eq.${malId}`)
            .gte("created_at", twelveHoursAgo)
            .maybeSingle();

          if (duplicateNotification) continue; // Skip redundant pipelines

          // Dispatch Message payload to Upstash holding zones
          await qstash.publishJSON({
            url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/notify`,
            body: {
              anilist_id: anilistId,
              mal_id: malId,
              episode: show.episodeNumber,
              format: f.format,
              scheduled_at: f.timestamp,
              title: show.title,
              poster_url: poster_url,
            },
            notBefore: f.timestamp!,
            retries: 2,
          });

          // Log Metrics Increments
          if (f.format === "raw") queuedStats.raw++;
          if (f.format === "sub") queuedStats.sub++;
          if (f.format === "dub") queuedStats.dub++;
        }
      }
    }

    // --- Step 7: Final Metric Assertions ---
    return NextResponse.json({
      shows_scanned: allTimetableShows.length,
      in_window: inWindowCount,
      queued: queuedStats,
      cache_updated: cacheUpdatedCount,
    });
  } catch (error: any) {
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}