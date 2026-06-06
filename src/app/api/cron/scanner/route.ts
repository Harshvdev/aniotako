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
    const { data: watchedRows, error: dbError } = await supabase
      .from("anime_metadata")
      .select(`
        anilist_id,
        mal_id,
        title,
        title_english,
        title_romaji,
        title_native,
        anilist_raw,
        watchlist_entries!inner(status)
      `)
      .eq("watchlist_entries.status", "watching")
      .not("anilist_id", "is", null);

    if (dbError) throw dbError;

    const watchedAnilistIds = new Set<number>();
    const anilistToMalMap = new Map<number, number>();
    const watchedTitleToAnilistId = new Map<string, number>();

    const normalizeText = (value: unknown) =>
      String(value ?? "")
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");

    const addWatchedTitle = (title: unknown, anilistId: number) => {
      const key = normalizeText(title);
      if (key.length >= 3) {
        watchedTitleToAnilistId.set(key, anilistId);
      }
    };

    const getDeepStrings = (value: unknown, seen = new WeakSet<object>()): string[] => {
      const out: string[] = [];

      const walk = (v: unknown) => {
        if (v === null || v === undefined) return;

        if (typeof v === "string") {
          out.push(v);
          return;
        }

        if (typeof v === "number" || typeof v === "boolean") {
          out.push(String(v));
          return;
        }

        if (Array.isArray(v)) {
          v.forEach(walk);
          return;
        }

        if (typeof v === "object") {
          const obj = v as Record<string, unknown>;
          if (seen.has(obj)) return;
          seen.add(obj);
          Object.values(obj).forEach(walk);
        }
      };

      walk(value);
      return Array.from(new Set(out));
    };

    watchedRows?.forEach((row: any) => {
      const anilistId = Number(row.anilist_id);
      const malId = Number(row.mal_id);

      if (Number.isFinite(anilistId)) {
        watchedAnilistIds.add(anilistId);
        anilistToMalMap.set(anilistId, malId);

        addWatchedTitle(row.title, anilistId);
        addWatchedTitle(row.title_english, anilistId);
        addWatchedTitle(row.title_romaji, anilistId);
        addWatchedTitle(row.title_native, anilistId);

        const rawTitles = getDeepStrings(row.anilist_raw);
        for (const t of rawTitles) {
          const norm = normalizeText(t);
          if (norm.length >= 3 && norm.length <= 120 && !norm.includes("http") && !/^\d+$/.test(norm)) {
            watchedTitleToAnilistId.set(norm, anilistId);
          }
        }
      }
    });

    const extractAniListId = (show: any): number | null => {
      const numericKeys = ["anilistId", "anilist_id", "mediaId", "media_id", "animeId", "anime_id"];
      for (const key of numericKeys) {
        const val = Number(show?.[key]);
        if (Number.isFinite(val)) return val;
      }

      const candidateStrings = [
        ...getDeepStrings(show),
        String(show?.websites ?? ""),
        String(show?.links ?? ""),
        String(show?.externalLinks ?? ""),
        String(show?.urls ?? ""),
        String(show?.website ?? ""),
        String(show?.link ?? ""),
        String(show?.url ?? ""),
      ];

      for (const text of candidateStrings) {
        const match =
          text.match(/anilist\.co\/anime\/(\d+)/i) ||
          text.match(/anilist\.com\/anime\/(\d+)/i) ||
          text.match(/anime\/(\d+)/i);

        if (match) return parseInt(match[1], 10);
      }

      return null;
    };

    const extractShowTitles = (show: any): string[] => {
      const titles = [
        show?.title,
        show?.name,
        show?.animeTitle,
        show?.anime_title,
        show?.englishTitle,
        show?.romajiTitle,
        show?.seriesTitle,
        show?.mediaTitle,
        show?.anime?.title,
        show?.anime?.name,
        show?.anime?.titleEnglish,
        show?.anime?.titleRomaji,
        show?.anime?.titleNative,
        show?.anime?.titles?.romaji,
        show?.anime?.titles?.english,
        show?.anime?.titles?.native,
        show?.anime?.title?.romaji,
        show?.anime?.title?.english,
        show?.anime?.title?.native,
      ];

      return Array.from(
        new Set(
          titles
            .map(normalizeText)
            .filter((t) => t.length >= 3)
        )
      );
    };

    const matchedShows = allTimetableShows
      .map((show: any) => {
        const anilistId = extractAniListId(show);

        if (anilistId && watchedAnilistIds.has(anilistId)) {
          show.parsedAnilistId = anilistId;
          return show;
        }

        for (const title of extractShowTitles(show)) {
          const mappedId = watchedTitleToAnilistId.get(title);
          if (mappedId) {
            show.parsedAnilistId = mappedId;
            return show;
          }
        }

        return null;
      })
      .filter(Boolean) as any[];

    console.log(
      `[CRON] timetable=${allTimetableShows.length} watched=${watchedAnilistIds.size} matched=${matchedShows.length}`
    );

    if (allTimetableShows.length > 0) {
      console.log("[CRON] first timetable keys:", Object.keys(allTimetableShows[0] || {}));
      console.log(
        "[CRON] first timetable sample:",
        JSON.stringify(allTimetableShows[0] || {}, null, 2).slice(0, 4000)
      );
    }

    if (matchedShows.length > 0) {
      console.log(
        "[CRON] sample matched show:",
        JSON.stringify(matchedShows[0], null, 2).slice(0, 4000)
      );
    }

    // --- Summary State Trackers ---
    let inWindowCount = 0;
    let cacheUpdatedCount = 0;
    const queuedStats = { raw: 0, sub: 0, dub: 0 };

    const windowStart = new Date(now.getTime() - 5 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();

    const normalizeEpisodeNumber = (value: unknown): number | null => {
      if (value === null || value === undefined || value === "") return null;
      const num = typeof value === "number" ? value : Number(value);
      return Number.isFinite(num) ? Math.floor(num) : null;
    };

    const toUnix = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.floor(value) : null;
  }

  const asNumber = Number(value);
  if (Number.isFinite(asNumber)) return Math.floor(asNumber);

  const asDate = new Date(String(value));
  return Number.isNaN(asDate.getTime()) ? null : Math.floor(asDate.getTime() / 1000);
};

const fetchAnimeDetailHtml = async (route: string): Promise<string | null> => {
  if (!route) return null;

  try {
    const res = await fetch(`https://animeschedule.net/anime/${route}`, {
      headers: {
        Authorization: `Bearer ${process.env.ANIMESCHEDULE_TOKEN}`,
      },
    });

    if (!res.ok) return null;
    return await res.text();
  } catch (error) {
    console.warn(`[CRON] detail page fetch failed for ${route}:`, error);
    return null;
  }
};

const extractField = (html: string, keys: string[]): string | null => {
  for (const key of keys) {
    const stringMatch = html.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, "i"));
    if (stringMatch?.[1]) return stringMatch[1];

    const numberMatch = html.match(new RegExp(`"${key}"\\s*:\\s*(\\d{10,13})`, "i"));
    if (numberMatch?.[1]) return numberMatch[1];
  }

  return null;
};

const getDetailSchedule = async (show: any) => {
  const html = await fetchAnimeDetailHtml(show.route);
  if (!html) {
    return null;
  }

  const rawAirAt = toUnix(
    extractField(html, ["rawPostDate", "raw_air_at", "rawAirAt", "episodeDate"]) ??
      show.episodeDate ??
      show.rawPostDate ??
      show.rawEpisodeDate
  );

  const subAirAt = toUnix(
    extractField(html, ["subPostDate", "sub_air_at", "subAirAt"]) ??
      show.subPostDate ??
      show.subEpisodeDate ??
      show.subEpisodeDateTime
  );

  const dubAirAt = toUnix(
    extractField(html, ["dubPostDate", "dub_air_at", "dubAirAt"]) ??
      show.dubPostDate ??
      show.dubEpisodeDate ??
      show.dubEpisodeDateTime
  );

  const rawEpisodeNumber =
    normalizeEpisodeNumber(
      extractField(html, [
        "rawNextEpisodeNumber",
        "raw_next_episode_number",
        "rawEpisodeNumber",
        "raw_episode_number",
        "episodeNumber",
        "nextEpisodeNumber",
        "next_episode_number",
      ])
    ) ?? normalizeEpisodeNumber(show.episodeNumber);

  const subEpisodeNumber =
    normalizeEpisodeNumber(
      extractField(html, [
        "subNextEpisodeNumber",
        "sub_next_episode_number",
        "subEpisodeNumber",
        "sub_episode_number",
      ])
    ) ?? rawEpisodeNumber;

  const dubEpisodeNumber =
    normalizeEpisodeNumber(
      extractField(html, [
        "dubNextEpisodeNumber",
        "dub_next_episode_number",
        "dubEpisodeNumber",
        "dub_episode_number",
      ])
    ) ??
    (rawEpisodeNumber !== null ? Math.max(rawEpisodeNumber - 1, 1) : null);

  return {
    rawAirAt,
    subAirAt,
    dubAirAt,
    rawEpisodeNumber,
    subEpisodeNumber,
    dubEpisodeNumber,
  };
};

const windowStartUnix = Math.floor(windowStart.getTime() / 1000);
const windowEndUnix = Math.floor(windowEnd.getTime() / 1000);

// --- Step 4, 5 & 6: Cache refresh for every matched show, queue format-specific events independently ---
for (const show of matchedShows) {
  const anilistId = show.parsedAnilistId;
  const malId = anilistToMalMap.get(anilistId);

  const detailSchedule = await getDetailSchedule(show);

  const rawAirAt =
    detailSchedule?.rawAirAt ??
    toUnix(show.episodeDate ?? show.rawPostDate ?? show.rawEpisodeDate);

  const subAirAt =
    detailSchedule?.subAirAt ??
    toUnix(show.subPostDate ?? show.subEpisodeDate ?? show.subEpisodeDateTime);

  const dubAirAt =
    detailSchedule?.dubAirAt ??
    toUnix(show.dubPostDate ?? show.dubEpisodeDate ?? show.dubEpisodeDateTime);

  const rawEpisodeNumber =
    detailSchedule?.rawEpisodeNumber ??
    normalizeEpisodeNumber(show.episodeNumber);

  const subEpisodeNumber =
    detailSchedule?.subEpisodeNumber ??
    rawEpisodeNumber;

  const dubEpisodeNumber =
    detailSchedule?.dubEpisodeNumber ??
    (rawEpisodeNumber !== null ? Math.max(rawEpisodeNumber - 1, 1) : null);

  if (rawEpisodeNumber === null && subEpisodeNumber === null && dubEpisodeNumber === null) {
    console.warn("[CRON] skipping show with no episode numbers:", show?.title || anilistId);
    continue;
  }

  const { error: upsertError } = await supabase.from("anime_metadata").upsert(
    {
      anilist_id: anilistId,
      mal_id: malId,
      raw_air_at: rawAirAt,
      sub_air_at: subAirAt,
      dub_air_at: dubAirAt,
      raw_next_episode_number: rawEpisodeNumber,
      sub_next_episode_number: subEpisodeNumber,
      dub_next_episode_number: dubEpisodeNumber,
      next_episode_number: rawEpisodeNumber,
      next_airing_at: rawAirAt ?? subAirAt ?? dubAirAt,
      schedule_updated_at: now.toISOString(),
    },
    { onConflict: "mal_id" }
  );

  if (upsertError) {
    console.error("[CRON] upsert failed for MAL", malId, upsertError);
  } else {
    cacheUpdatedCount++;
  }

  const poster_url = show.imageVersionRoute
    ? `https://animeschedule.net/images/anime/${show.imageVersionRoute}`
    : null;

  const formatRows = [
    { format: "raw" as const, timestamp: rawAirAt, episodeNumber: rawEpisodeNumber },
    { format: "sub" as const, timestamp: subAirAt, episodeNumber: subEpisodeNumber },
    { format: "dub" as const, timestamp: dubAirAt, episodeNumber: dubEpisodeNumber },
  ].filter(
    (
      row
    ): row is {
      format: "raw" | "sub" | "dub";
      timestamp: number;
      episodeNumber: number;
    } => row.timestamp !== null && row.episodeNumber !== null
  );

  for (const row of formatRows) {
    if (row.timestamp < windowStartUnix || row.timestamp > windowEndUnix) {
      continue;
    }

    inWindowCount++;

    const eventKey = `${malId}:${row.episodeNumber}:${row.format}:${row.timestamp}`;

    const { error: insertEventError } = await supabase
      .from("notification_events")
      .insert({
        event_key: eventKey,
        anilist_id: anilistId,
        mal_id: malId,
        episode_number: row.episodeNumber,
        format: row.format,
        aired_at: new Date(row.timestamp * 1000).toISOString(),
      });

    if (insertEventError) {
      if (insertEventError.code === "23505") {
        continue;
      }
      throw insertEventError;
    }

    await qstash.publishJSON({
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/notify`,
      body: {
        anilist_id: anilistId,
        mal_id: malId,
        episode: row.episodeNumber,
        format: row.format,
        scheduled_at: row.timestamp,
        title: show.title,
        poster_url: poster_url,
      },
      notBefore: row.timestamp,
      retries: 2,
    });

    if (row.format === "raw") queuedStats.raw++;
    if (row.format === "sub") queuedStats.sub++;
    if (row.format === "dub") queuedStats.dub++;
  }
}

    // --- Step 7: Final Metric Assertions ---
    return NextResponse.json({
      shows_scanned: allTimetableShows.length,
      watched_anilist_ids: watchedAnilistIds.size,
      matched_shows: matchedShows.length,
      in_window: inWindowCount,
      queued: queuedStats,
      cache_updated: cacheUpdatedCount,
    });
  } catch (error: any) {
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}