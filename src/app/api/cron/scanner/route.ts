import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Client } from "@upstash/qstash";
import { getSiteUrl } from "@/lib/get-site-url";

// Initialize Clients using Server-Side Environment Variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing critical Supabase configuration environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const qstash = new Client({ 
  token: process.env.QSTASH_TOKEN!,
  ...(process.env.QSTASH_URL ? { baseUrl: process.env.QSTASH_URL } : {}),
});

// Batching Constants for Performance Optimization
const DB_BATCH_SIZE = 100;
const QSTASH_BATCH_SIZE = 50; 

// Helper to calculate ISO Week and Year using UTC to prevent timezone offsets
function getISOWeekAndYearUTC(date: Date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
  return { week: weekNum, year: target.getUTCFullYear() };
}

const normalizeText = (value: unknown): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

const toUnix = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? Math.floor(value) : null;
  const asNumber = Number(value);
  if (Number.isFinite(asNumber)) return Math.floor(asNumber);
  const asDate = new Date(String(value));
  return Number.isNaN(asDate.getTime()) ? null : Math.floor(asDate.getTime() / 1000);
};

const normalizeEpisodeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? Math.floor(num) : null;
};

// Helper from File 1 to extract strings deeply from JSON metadata payloads
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

// Helper from File 1 to extract AniList IDs hiding inside timetable link variations
const extractAniListId = (show: any): number | null => {
  const numericKeys = ["anilistId", "anilist_id", "mediaId", "media_id", "animeId", "anime_id"];
  for (const key of numericKeys) {
    const val = Number(show?.[key] || show?.anime?.[key]);
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

// Extends string matching fallback protection by searching deeper inside payload targets
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
        .filter((t) => t.length >= 3 && t.length <= 120 && !t.includes("http") && !/^\d+$/.test(t))
    )
  );
};

export async function GET(req: NextRequest) {
  try {
    // Security Guardrail: Enforce token matching
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const siteUrl = getSiteUrl(req);

    const now = new Date();
    const windowStartUnix = Math.floor((now.getTime() - 5 * 60 * 1000) / 1000);
    const windowEndUnix = Math.floor((now.getTime() + 2 * 60 * 60 * 1000) / 1000);
    
    // Compute current and next week boundaries using UTC bounds
    const currentWeekInfo = getISOWeekAndYearUTC(now);
    const windowEndDate = new Date(windowEndUnix * 1000);
    const nextWeekInfo = getISOWeekAndYearUTC(windowEndDate);

    const weeksToFetch = [currentWeekInfo];
    if (currentWeekInfo.week !== nextWeekInfo.week || currentWeekInfo.year !== nextWeekInfo.year) {
      weeksToFetch.push(nextWeekInfo);
    }

    // --- Step 1: Fetch Timetables from AnimeSchedule.net ---
    let allTimetableShows: any[] = [];
    for (const info of weeksToFetch) {
      const scheduleRes = await fetch(
        `https://animeschedule.net/api/v3/timetables?week=${info.week}&year=${info.year}&tz=UTC`,
        {
          headers: { Authorization: `Bearer ${process.env.ANIMESCHEDULE_TOKEN}` },
        }
      );

      if (scheduleRes.ok) {
        const data = await scheduleRes.json();
        if (Array.isArray(data)) {
          allTimetableShows = allTimetableShows.concat(data);
        }
      }
    }

    if (allTimetableShows.length === 0) {
      return NextResponse.json({ message: "No airing shows found for this tracking period." });
    }

    // --- Step 1.5: Extended 7-Day Metadata Refresh ---
    // The notification window above only covers ±2 hours, so future episodes (e.g. next week)
    // are never fetched and anime_metadata never gets their schedule. This extra fetch covers
    // the next 7 days so the anime detail page always shows the correct upcoming episode info.
    const sevenDayFetchWeeks = new Set<string>();
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const d = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const { week, year } = getISOWeekAndYearUTC(d);
      sevenDayFetchWeeks.add(`${year}-W${week}`);
    }

    let allExtendedShows: any[] = [...allTimetableShows]; // start with what we already have
    for (const weekKey of sevenDayFetchWeeks) {
      const [yearStr, weekStr] = weekKey.split("-W");
      const weekNum = parseInt(weekStr, 10);
      const yearNum = parseInt(yearStr, 10);
      // Skip weeks already fetched for the notification window
      if (weeksToFetch.some(w => w.week === weekNum && w.year === yearNum)) continue;

      const extRes = await fetch(
        `https://animeschedule.net/api/v3/timetables?week=${weekNum}&year=${yearNum}&tz=UTC`,
        { headers: { Authorization: `Bearer ${process.env.ANIMESCHEDULE_TOKEN}` } }
      );
      if (extRes.ok) {
        const extData = await extRes.json();
        if (Array.isArray(extData)) allExtendedShows = allExtendedShows.concat(extData);
      }
    }

    // --- Step 2: Fetch All Anime Metadata from Supabase ---
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
        poster_url,
        airing_status
      `)
      .not("anilist_id", "is", null)
      .limit(10000);

    // Fetch all watching entries including user_id for the scanner-direct fallback
    const { data: watchingEntries, error: watchError } = await supabase
      .from("watchlist_entries")
      .select("user_id, mal_id")
      .eq("status", "watching");

    const watchingMalIds = new Set<number>();
    if (!watchError && watchingEntries) {
      watchingEntries.forEach((entry: any) => watchingMalIds.add(Number(entry.mal_id)));
    }

    if (dbError) throw dbError;

    const watchedAnilistIds = new Set<number>();
    const anilistToMalMap = new Map<number, number>();
    const malToPosterUrlMap = new Map<number, string | null>();
    const titleToAnilistIdMap = new Map<string, number>();

    const addWatchedTitle = (title: unknown, anilistId: number) => {
      const key = normalizeText(title);
      if (key.length >= 3) {
        titleToAnilistIdMap.set(key, anilistId);
      }
    };

    watchedRows?.forEach((row: any) => {
      // Ignore finished shows to prevent airing schedule mapping collisions
      const status = (row.airing_status || "").toUpperCase();
      if (status === "FINISHED" || status === "FINISHED AIRING" || status === "CANCELLED") {
        return;
      }

      const anilistId = Number(row.anilist_id);
      const malId = row.mal_id ? Number(row.mal_id) : null;

      if (Number.isFinite(anilistId)) {
        watchedAnilistIds.add(anilistId);
        if (malId) {
          anilistToMalMap.set(anilistId, malId);
          malToPosterUrlMap.set(malId, row.poster_url ?? null);
        }

        addWatchedTitle(row.title, anilistId);
        addWatchedTitle(row.title_english, anilistId);
        addWatchedTitle(row.title_romaji, anilistId);
        addWatchedTitle(row.title_native, anilistId);


      }
    });

    // --- Step 3: Match Schedule Data via IDs or Deep Fuzzy Text Titles ---
    // Two independent passes:
    //   extendedMatchedShows - all 7-day shows, used for anime_metadata upsert (display info)
    //   matchedShows         - notification-window shows only, used for notification candidates
    const extendedMatchedShows: any[] = [];
    for (const show of allExtendedShows) {
      let matchedAnilistId = extractAniListId(show);
      if (!matchedAnilistId) {
        for (const title of extractShowTitles(show)) {
          const mappedId = titleToAnilistIdMap.get(title);
          if (mappedId) { matchedAnilistId = mappedId; break; }
        }
      }
      if (matchedAnilistId && watchedAnilistIds.has(matchedAnilistId)) {
        show.parsedAnilistId = matchedAnilistId;
        extendedMatchedShows.push(show);
      }
    }

    const matchedShows: any[] = [];
    for (const show of allTimetableShows) {
      let matchedAnilistId = extractAniListId(show);
      if (!matchedAnilistId) {
        for (const title of extractShowTitles(show)) {
          const mappedId = titleToAnilistIdMap.get(title);
          if (mappedId) { matchedAnilistId = mappedId; break; }
        }
      }
      if (matchedAnilistId && watchedAnilistIds.has(matchedAnilistId)) {
        show.parsedAnilistId = matchedAnilistId;
        matchedShows.push(show);
      }
    }

    // --- Step 4: Group & Merge Schedule Data by Anime ---
    // Uses extendedMatchedShows (7-day window) so that next-episode info is always fresh
    // on the anime detail page, even when the next episode is days away.
    const groupedShows = new Map<number, any>();

    // Helper: decide if a new air time is "better" than the existing one for the
    // "next episode" semantic — prefer earliest FUTURE, fall back to latest PAST.
    const nowUnixSec = Math.floor(now.getTime() / 1000);
    const pickBetter = (existing: number | null, newTime: number | null): boolean => {
      if (newTime === null) return false;
      if (existing === null) return true;
      const existFuture = existing > nowUnixSec;
      const newFuture   = newTime  > nowUnixSec;
      if ( newFuture && !existFuture) return true;              // prefer future over past
      if (!newFuture &&  existFuture) return false;             // don't replace future with past
      if ( newFuture &&  existFuture) return newTime < existing; // earlier future wins
      return newTime > existing;                                // both past: more recent wins
    };

    extendedMatchedShows.forEach((show) => {
      const anilistId = show.parsedAnilistId;
      const malId = anilistToMalMap.get(anilistId) ?? null;
      const posterUrl = show.imageVersionRoute ? `https://img.animeschedule.net/production/assets/public/img/${show.imageVersionRoute}` : null;

      const rawAirAt = toUnix(show.episodeDate ?? show.rawPostDate ?? show.rawAirAt);
      const subAirAt = toUnix(show.subPostDate ?? show.subAirAt ?? show.subEpisodeDateTime) ?? rawAirAt;
      const dubAirAt = toUnix(show.dubPostDate ?? show.dubAirAt); 

      const rawEpisodeNumber = normalizeEpisodeNumber(show.episodeNumber ?? show.rawEpisodeNumber);
      const subEpisodeNumber = normalizeEpisodeNumber(show.subEpisodeNumber) ?? rawEpisodeNumber;
      const dubEpisodeNumber = normalizeEpisodeNumber(show.dubEpisodeNumber) ?? (rawEpisodeNumber ? Math.max(rawEpisodeNumber - 1, 1) : null);

      const episodeDateVal = toUnix(show.episodeDate ?? show.rawPostDate ?? show.rawAirAt ?? show.subPostDate ?? show.subAirAt ?? show.dubPostDate ?? show.dubAirAt);
      const episodeNumVal = normalizeEpisodeNumber(show.episodeNumber ?? show.rawEpisodeNumber ?? show.subEpisodeNumber ?? show.dubEpisodeNumber);

      if (!groupedShows.has(anilistId)) {
        groupedShows.set(anilistId, {
          anilist_id: anilistId,
          mal_id: malId,
          title: show.title,
          route: show.route,
          poster_url: posterUrl,
          raw_air_at: null,
          sub_air_at: null,
          dub_air_at: null,
          raw_next_episode_number: null,
          sub_next_episode_number: null,
          dub_next_episode_number: null,
          next_episode_number: null,
          next_airing_at: null,
          schedule_updated_at: now.toISOString(),
        });
      }

      const payload = groupedShows.get(anilistId);

      const isFinished = show.status?.toLowerCase() === "finished";
      if (isFinished) {
        payload.is_finished = true;
      }

      if (show.airType === "raw") {
        if (pickBetter(payload.raw_air_at, episodeDateVal)) {
          payload.raw_air_at = episodeDateVal;
          payload.raw_next_episode_number = episodeNumVal;
          payload.next_episode_number = episodeNumVal;
        }
      } else if (show.airType === "sub") {
        if (pickBetter(payload.sub_air_at, episodeDateVal)) {
          payload.sub_air_at = episodeDateVal;
          payload.sub_next_episode_number = episodeNumVal;
        }
      } else if (show.airType === "dub") {
        if (pickBetter(payload.dub_air_at, episodeDateVal)) {
          payload.dub_air_at = episodeDateVal;
          payload.dub_next_episode_number = episodeNumVal;
        }
      }
    });

    // Fill in fallbacks and calculate next_airing_at
    const upsertPayloads: any[] = [];
    groupedShows.forEach((payload) => {
      if (payload.is_finished) {
        // Clear all airing schedule fields for finished shows
        payload.raw_air_at = null;
        payload.sub_air_at = null;
        payload.dub_air_at = null;
        payload.raw_next_episode_number = null;
        payload.sub_next_episode_number = null;
        payload.dub_next_episode_number = null;
        payload.next_episode_number = null;
        payload.next_airing_at = null;
        
        upsertPayloads.push(payload);
        return;
      }

      // Fallback sub_air_at to raw_air_at if sub is null
      if (payload.sub_air_at === null) {
        payload.sub_air_at = payload.raw_air_at;
      }
      if (payload.sub_next_episode_number === null) {
        payload.sub_next_episode_number = payload.raw_next_episode_number;
      }
      // Fallback dub_next_episode_number if null
      if (payload.dub_next_episode_number === null && payload.raw_next_episode_number !== null) {
        payload.dub_next_episode_number = Math.max(payload.raw_next_episode_number - 1, 1);
      }

      // next_airing_at is the earliest of the non-null airing times
      const times = [payload.raw_air_at, payload.sub_air_at, payload.dub_air_at].filter(t => t !== null) as number[];
      payload.next_airing_at = times.length > 0 ? Math.min(...times) : null;

      if (payload.next_airing_at !== null) {
        upsertPayloads.push(payload);
      } else {
        console.warn(`[CRON] Structural validation failed for AniList ID ${payload.anilist_id}. Isolating from execution loop.`);
      }
    });

    // Bulk execute database metadata updates matching unique target schema constraint ('mal_id') from File 1
    let cacheUpdatedCount = 0;
    const dbPayloads = upsertPayloads.map(({ title, poster_url, route, is_finished, ...dbData }) => dbData);
    for (let i = 0; i < dbPayloads.length; i += DB_BATCH_SIZE) {
      const chunk = dbPayloads.slice(i, i + DB_BATCH_SIZE);
      const { error: upsertError } = await supabase
        .from("anime_metadata")
        .upsert(chunk, { onConflict: "mal_id" });

      if (!upsertError) cacheUpdatedCount += chunk.length;
      else console.error("[CRON] Batch metadata cache sync failure:", upsertError.message);
    }

    // --- Step 5: Compile Notification Window Candidates ---
    let directNotificationsCreated = 0;
    const candidateNotifications: any[] = [];
    const candidateQStashMessages: any[] = [];
    // Direct-insert candidates: shows that ALREADY aired (within the -5 min backfill).
    // These don't need QStash scheduling — we insert their notifications right now.
    const candidateDirectInsert: any[] = [];
    const allCandidateKeys: string[] = [];
    const nowUnix = Math.floor(now.getTime() / 1000);

    upsertPayloads.forEach((payload) => {
      const anilistId = payload.anilist_id;
      const malId = payload.mal_id;
      const posterUrl = payload.poster_url;

      // Only schedule notifications if the show is actively being watched by at least one user
      if (!malId || !watchingMalIds.has(malId)) {
        return;
      }

      const formats = [
        { type: "raw" as const, time: payload.raw_air_at, ep: payload.raw_next_episode_number },
        { type: "sub" as const, time: payload.sub_air_at, ep: payload.sub_next_episode_number },
        { type: "dub" as const, time: payload.dub_air_at, ep: payload.dub_next_episode_number }
      ];

      for (const fmt of formats) {
        if (fmt.time && fmt.ep && fmt.time >= windowStartUnix && fmt.time <= windowEndUnix) {
          // Event naming protocol matching File 1 properties format structure
          const eventKey = `${malId}:${fmt.ep}:${fmt.type}:${fmt.time}`;
          allCandidateKeys.push(eventKey);

          const hasAlreadyAired = fmt.time <= nowUnix;

          candidateNotifications.push({
            event_key: eventKey,
            anilist_id: anilistId,
            mal_id: malId,
            episode_number: fmt.ep,
            format: fmt.type,
            aired_at: new Date(fmt.time * 1000).toISOString(),
          });

          if (hasAlreadyAired) {
            // Already aired — record it for immediate direct DB insertion (bypass QStash).
            candidateDirectInsert.push({
              eventKey,
              malId,
              episodeNumber: fmt.ep,
              format: fmt.type,
              airedAt: new Date(fmt.time * 1000).toISOString(),
              title: payload.title,
              posterUrl,
            });
          } else {
            // Future episode — QStash schedules delivery at the exact air time.
            const dbPoster = malId ? malToPosterUrlMap.get(malId) : null;
            candidateQStashMessages.push({
              eventKey,
              url: `${siteUrl}/api/notify`,
              body: {
                anilist_id: anilistId,
                mal_id: malId,
                route: payload.route,
                episode: fmt.ep,
                format: fmt.type,
                scheduled_at: fmt.time,
                title: payload.title,
                poster_url: dbPoster ?? posterUrl,
              },
              notBefore: fmt.time,
              retries: 2,
            });
          }
        }
      }
    });

    // --- Step 6: Deduplication & Event Isolation Layers ---
    const existingEventKeys = new Set<string>();
    
    if (allCandidateKeys.length > 0) {
      for (let i = 0; i < allCandidateKeys.length; i += 500) {
        const keyChunk = allCandidateKeys.slice(i, i + 500);
        const { data: matchedEvents, error: eventFetchError } = await supabase
          .from("notification_events")
          .select("event_key")
          .in("event_key", keyChunk);

        if (!eventFetchError && matchedEvents) {
          matchedEvents.forEach(evt => existingEventKeys.add(evt.event_key));
        }
      }
    }

    const notificationsToInsert = candidateNotifications.filter(n => !existingEventKeys.has(n.event_key));
    // Only queue future episodes to QStash — past ones are handled directly below.
    const finalQStashMessages = candidateQStashMessages
      .filter(m => !existingEventKeys.has(m.eventKey))
      .map(({ eventKey, ...cleanPayload }) => cleanPayload);
    // Past-aired candidates that aren't already in the DB.
    const finalDirectInserts = candidateDirectInsert.filter(d => !existingEventKeys.has(d.eventKey));

    // Calculate metrics based on filtered state canvases
    const inWindowCount = candidateNotifications.length;
    const queuedStats = { raw: 0, sub: 0, dub: 0 };

    finalQStashMessages.forEach(msg => {
      if (msg.body.format === "raw") queuedStats.raw++;
      if (msg.body.format === "sub") queuedStats.sub++;
      if (msg.body.format === "dub") queuedStats.dub++;
    });

    // Write completely new notification events into the DB safely
    for (let i = 0; i < notificationsToInsert.length; i += DB_BATCH_SIZE) {
      const chunk = notificationsToInsert.slice(i, i + DB_BATCH_SIZE);
      await supabase
        .from("notification_events")
        .upsert(chunk, { 
          onConflict: "event_key", 
          ignoreDuplicates: true 
        });
    }

    // Immediately deliver notifications for already-aired shows (bypass QStash).
    // QStash is only useful for scheduling future delivery; for past episodes it adds
    // latency when delivery silently fails. Direct insert ensures the notification
    // appears within the same scanner run that detects the episode aired.
    if (finalDirectInserts.length > 0 && watchingEntries && watchingEntries.length > 0) {
      const directMalIds = [...new Set(finalDirectInserts.map(d => d.malId))];
      const { data: directPrefs } = await supabase
        .from("user_preferences")
        .select("user_id, notification_format, timezone")
        .in("user_id", [...new Set(watchingEntries.map((e: any) => e.user_id))]);

      // Fetch AniList poster URLs for direct-insert shows
      const { data: directMeta } = await supabase
        .from("anime_metadata")
        .select("mal_id, poster_url, title")
        .in("mal_id", directMalIds);
      const directMetaMap = new Map<number, { poster_url: string | null; title: string }>(
        directMeta?.map((m: any) => [Number(m.mal_id), { poster_url: m.poster_url ?? null, title: m.title ?? "" }]) ?? []
      );

      // Fetch notification_events rows for the direct candidates so we have their IDs
      const directEventKeys = finalDirectInserts.map(d => d.eventKey);
      const { data: directEventRows } = await supabase
        .from("notification_events")
        .select("id, event_key")
        .in("event_key", directEventKeys);
      const directEventIdMap = new Map<string, string>(
        directEventRows?.map((r: any) => [r.event_key, r.id]) ?? []
      );

      // Fetch already-delivered notifications to deduplicate
      const directEventIds = [...directEventIdMap.values()];
      const { data: alreadyDelivered } = directEventIds.length > 0
        ? await supabase
            .from("notifications")
            .select("user_id, notification_event_id")
            .in("notification_event_id", directEventIds)
        : { data: [] };
      const deliveredSet = new Set<string>(
        alreadyDelivered?.map((n: any) => `${n.user_id}:${n.notification_event_id}`) ?? []
      );

      // Build a format→event map per episode
      const directEpisodeMap = new Map<string, { format: string; data: any }[]>();
      for (const d of finalDirectInserts) {
        const key = `${d.malId}:${d.episodeNumber}`;
        if (!directEpisodeMap.has(key)) directEpisodeMap.set(key, []);
        directEpisodeMap.get(key)!.push({ format: d.format, data: d });
      }

      const immediateNotifications: any[] = [];
      for (const [epKey, epFormats] of directEpisodeMap) {
        const [malIdStr] = epKey.split(":");
        const malId = Number(malIdStr);
        const available = new Map(epFormats.map(f => [f.format, f]));
        const meta = directMetaMap.get(malId);
        const watchersForAnime = watchingEntries.filter((e: any) => Number(e.mal_id) === malId);

        for (const watcher of watchersForAnime) {
          const pref = directPrefs?.find((p: any) => p.user_id === watcher.user_id);
          const userPref = pref?.notification_format ?? "sub";

          // Apply format preference fallback chain
          let chosen: { format: string; data: any } | null = null;
          if (userPref === "raw") {
            chosen = available.get("raw") ?? null;
          } else if (userPref === "sub") {
            chosen = available.get("sub") ?? available.get("raw") ?? null;
          } else if (userPref === "dub") {
            chosen = available.get("dub") ?? available.get("sub") ?? available.get("raw") ?? null;
          }
          if (!chosen) continue;

          const eventId = directEventIdMap.get(chosen.data.eventKey);
          if (!eventId) continue;
          const dupKey = `${watcher.user_id}:${eventId}`;
          if (deliveredSet.has(dupKey)) continue;
          deliveredSet.add(dupKey);

          immediateNotifications.push({
            user_id: watcher.user_id,
            mal_id: malId,
            anime_title: meta?.title ?? chosen.data.title ?? "",
            episode_number: chosen.data.episodeNumber,
            poster_url: meta?.poster_url ?? chosen.data.posterUrl ?? null,
            format: chosen.format,
            is_read: false,
            aired_at: chosen.data.airedAt,
            created_at: now.toISOString(),
            notification_event_id: eventId,
          });
        }
      }

      for (let i = 0; i < immediateNotifications.length; i += DB_BATCH_SIZE) {
        const chunk = immediateNotifications.slice(i, i + DB_BATCH_SIZE);
        const { data: inserted, error: immErr } = await supabase
          .from("notifications")
          .upsert(chunk, { onConflict: "user_id,notification_event_id", ignoreDuplicates: true })
          .select("id");
        if (immErr) console.error("[CRON Step5-Direct] Insert error:", immErr.message);
        else directNotificationsCreated += inserted?.length ?? 0;
      }
      console.log(`[CRON Step5-Direct] Immediately delivered ${immediateNotifications.length} notification(s) for ${finalDirectInserts.length} already-aired candidate(s).`);
    }

    // Load unique messages into QStash concurrently across chunks to maximize network I/O efficiency
    const qstashBatches: Promise<any>[] = [];
    for (let i = 0; i < finalQStashMessages.length; i += QSTASH_BATCH_SIZE) {
      const chunk = finalQStashMessages.slice(i, i + QSTASH_BATCH_SIZE);
      
      qstashBatches.push(
        Promise.allSettled(chunk.map((msg) => qstash.publishJSON(msg))).then((results) => {
          const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
          if (rejected.length > 0) {
            console.error(
              `[CRON CRITICAL] Failed to queue ${rejected.length} messages in QStash batch initialization.`,
              rejected.map((f) => f.reason)
            );
          }
        })
      );
    }
    // Await all concurrent batch workers
    await Promise.all(qstashBatches);

    // --- Step 8: Scanner-Direct Notification Fallback ---
    // QStash delivery may be silently broken (publishJSON failures are swallowed by Promise.allSettled).
    // As a reliable fallback, we query notification_events directly from the DB for ALL past episodes
    // (up to 7 days) and insert notifications for any that haven't been delivered yet.
    // NOTE: We query the DB here instead of filtering candidateNotifications because candidateNotifications
    // only covers the current scanner window (past 5 min → future 2 hrs), missing all historical events.

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgoUnix = Math.floor(new Date(sevenDaysAgo).getTime() / 1000);

    // --- Step 8a: Ensure notification_events exist for ALL past watched episodes ---
    // If the cron missed the real-time window (e.g. episode aired between two cron runs,
    // or QStash delivery silently failed), notification_events were never created for that
    // episode, so Step 8 below had nothing to query. This step fills the gap by upserting
    // notification_events directly from extendedMatchedShows timetable data.
    const catchUpEvents: any[] = [];
    for (const show of extendedMatchedShows) {
      const malId = anilistToMalMap.get(show.parsedAnilistId) ?? null;
      if (!malId || !watchingMalIds.has(malId)) continue;

      // Determine the air time for this timetable entry's format
      let airTime: number | null = null;
      if (show.airType === "sub") {
        airTime = toUnix(show.subPostDate ?? show.subAirAt ?? show.subEpisodeDateTime ?? show.episodeDate ?? show.rawPostDate ?? show.rawAirAt);
      } else if (show.airType === "dub") {
        airTime = toUnix(show.dubPostDate ?? show.dubAirAt);
      } else {
        airTime = toUnix(show.episodeDate ?? show.rawPostDate ?? show.rawAirAt);
      }

      // Only create events for episodes that have already aired within the past 7 days
      if (!airTime || airTime > nowUnixSec || airTime < sevenDaysAgoUnix) continue;

      const epNum = normalizeEpisodeNumber(
        show.episodeNumber ?? show.rawEpisodeNumber ?? show.subEpisodeNumber ?? show.dubEpisodeNumber
      );
      if (!epNum) continue;

      const format = show.airType ?? "raw";
      const eventKey = `${malId}:${epNum}:${format}:${airTime}`;

      catchUpEvents.push({
        event_key: eventKey,
        anilist_id: show.parsedAnilistId,
        mal_id: malId,
        episode_number: epNum,
        format,
        aired_at: new Date(airTime * 1000).toISOString(),
      });
    }

    if (catchUpEvents.length > 0) {
      for (let i = 0; i < catchUpEvents.length; i += DB_BATCH_SIZE) {
        const chunk = catchUpEvents.slice(i, i + DB_BATCH_SIZE);
        await supabase.from("notification_events").upsert(chunk, { onConflict: "event_key", ignoreDuplicates: true });
      }
      console.log(`[CRON Step8a] Ensured ${catchUpEvents.length} notification_event(s) for past timetable episodes.`);
    }

    // Fetch all past notification_events from the last 7 days
    const { data: airedCandidateEvents, error: airedEventsError } = await supabase
      .from("notification_events")
      .select("id, event_key, mal_id, episode_number, format, aired_at")
      .lt("aired_at", now.toISOString())
      .gte("aired_at", sevenDaysAgo)
      .order("aired_at", { ascending: false });

    if (airedEventsError) console.error("[CRON Step8] Error fetching aired events:", airedEventsError.message);

    const airedCandidates = airedCandidateEvents ?? [];

    if (airedCandidates.length > 0 && watchingEntries && watchingEntries.length > 0) {
      const airedEvents = airedCandidates;

      const allWatchingUserIds = [...new Set(watchingEntries.map((e: any) => e.user_id))];
      const { data: allPrefs } = await supabase
        .from("user_preferences")
        .select("user_id, notification_format, timezone")
        .in("user_id", allWatchingUserIds);

      const { data: existingNotifs } = await supabase
        .from("notifications")
        .select("user_id, notification_event_id, mal_id, episode_number")
        .in("user_id", allWatchingUserIds)
        .gte("created_at", sevenDaysAgo);

      const existingEventSet = new Set<string>(
        existingNotifs?.map((n: any) => `${n.user_id}:${n.notification_event_id}`) ?? []
      );

      const existingEpisodeSet = new Set<string>(
        existingNotifs?.map((n: any) => `${n.user_id}:${n.mal_id}:${n.episode_number}`) ?? []
      );

      const episodeEventMap = new Map<string, { format: string; event: any }[]>();
      for (const event of airedEvents) {
        const key = `${Number(event.mal_id)}:${event.episode_number}`;
        if (!episodeEventMap.has(key)) episodeEventMap.set(key, []);
        episodeEventMap.get(key)!.push({ format: event.format, event });
      }

      const upsertMalIds = new Set(upsertPayloads.map((p: any) => Number(p.mal_id)));
      // All unique MAL IDs from aired events — including both current-scan and historical
      const allAiredMalIds = [...new Set(airedEvents.map((e: any) => Number(e.mal_id)))];
      const historicalMalIds = allAiredMalIds.filter((id) => !upsertMalIds.has(id));

      const historicalMetaMap = new Map<number, { title: string; poster_url: string | null; airing_status: string | null }>();
      // Fetch from ALL mal_ids (including current-scan ones) so we get AniList poster URLs for everyone.
      // upsertPayloads.poster_url uses AnimeSchedule.net imageVersionRoute.
      if (allAiredMalIds.length > 0) {
        const { data: historicalMeta } = await supabase
          .from("anime_metadata")
          .select("mal_id, title, poster_url, airing_status")
          .in("mal_id", allAiredMalIds);
        historicalMeta?.forEach((m: any) => {
          historicalMetaMap.set(Number(m.mal_id), {
            title: m.title ?? "",
            poster_url: m.poster_url ?? null,
            airing_status: m.airing_status ?? null,
          });
        });
      }

      // Build a set of FINISHED/CANCELLED MAL IDs to skip — prevents false notifications
      // for shows that were spuriously matched in a previous scanner run.
      const FINISHED_STATUSES = new Set(["FINISHED", "FINISHED AIRING", "CANCELLED"]);
      const finishedMalIds = new Set<number>();
      for (const [malId, meta] of historicalMetaMap) {
        if (FINISHED_STATUSES.has((meta.airing_status ?? "").toUpperCase())) finishedMalIds.add(malId);
      }
      // Also skip any MAL ID in upsertPayloads marked finished
      upsertPayloads.forEach((p: any) => { if (p.is_finished) finishedMalIds.add(Number(p.mal_id)); });

      function resolveFormatForScanner(
        userPref: string,
        available: Map<string, any>
      ): { resolvedEvent: any; formatLabel: string } | null {
        if (userPref === "raw") {
          if (available.has("raw")) return { resolvedEvent: available.get("raw"), formatLabel: "RAW" };
        } else if (userPref === "sub") {
          if (available.has("sub")) return { resolvedEvent: available.get("sub"), formatLabel: "SUB" };
          if (available.has("raw")) return { resolvedEvent: available.get("raw"), formatLabel: "RAW (Sub not yet available)" };
        } else if (userPref === "dub") {
          if (available.has("dub")) return { resolvedEvent: available.get("dub"), formatLabel: "DUB" };
          if (available.has("sub")) return { resolvedEvent: available.get("sub"), formatLabel: "SUB (Dub not yet available)" };
          if (available.has("raw")) return { resolvedEvent: available.get("raw"), formatLabel: "RAW (Dub & Sub not yet available)" };
        }
        return null;
      }

      const notificationsToInsertDirect: any[] = [];

      for (const [episodeKey, episodeFormats] of episodeEventMap) {
        const [malIdStr] = episodeKey.split(":");
        const malId = Number(malIdStr);

        // Skip events for FINISHED/CANCELLED anime — avoids notifying about old episodes
        // that were accidentally matched by the scanner in a prior run.
        if (finishedMalIds.has(malId)) continue;

        const available = new Map(episodeFormats.map((f) => [f.format, f.event]));
        // For notification inserts, always prefer anime_metadata.poster_url (AniList CDN, publicly
        // accessible) over the imageVersionRoute URL from upsertPayloads.
        const dbMeta = historicalMetaMap.get(malId);
        const currentScanPayload = upsertPayloads.find((p: any) => Number(p.mal_id) === malId);
        const animePayload = {
          title: currentScanPayload?.title ?? dbMeta?.title ?? "",
          // Prefer DB poster (AniList URL) — fall back to scan payload only if DB has nothing
          poster_url: dbMeta?.poster_url ?? currentScanPayload?.poster_url ?? null,
        };

        const watchersForAnime = watchingEntries.filter((e: any) => Number(e.mal_id) === malId);
        for (const watcher of watchersForAnime) {
          const pref = allPrefs?.find((p: any) => p.user_id === watcher.user_id);
          const userPref = pref?.notification_format ?? "sub";

          const resolved = resolveFormatForScanner(userPref, available);
          if (!resolved) continue;

          const { resolvedEvent } = resolved;
          const dupKey = `${watcher.user_id}:${resolvedEvent.id}`;
          if (existingEventSet.has(dupKey)) continue;

          // Catch-up fallback guard: Do not send a delayed notification if the user has
          // already received a notification for this episode in any other format.
          const episodeDupKey = `${watcher.user_id}:${malId}:${resolvedEvent.episode_number}`;
          if (existingEpisodeSet.has(episodeDupKey)) continue;

          existingEventSet.add(dupKey);
          existingEpisodeSet.add(episodeDupKey);

          notificationsToInsertDirect.push({
            user_id: watcher.user_id,
            mal_id: malId,
            anime_title: animePayload.title ?? "",
            episode_number: resolvedEvent.episode_number,
            poster_url: animePayload.poster_url ?? null,
            format: resolvedEvent.format,
            is_read: false,
            aired_at: resolvedEvent.aired_at,
            created_at: now.toISOString(),
            notification_event_id: resolvedEvent.id,
          });
        }
      }


      for (let i = 0; i < notificationsToInsertDirect.length; i += DB_BATCH_SIZE) {
        const chunk = notificationsToInsertDirect.slice(i, i + DB_BATCH_SIZE);
        // Use upsert with ignoreDuplicates to handle the unique_user_event_notification constraint
        // (UNIQUE on user_id + notification_event_id). If a notification was already sent
        // for this event, we skip silently rather than throw a constraint violation.
        const { data: inserted, error: insertErr } = await supabase
          .from("notifications")
          .upsert(chunk, { onConflict: "user_id,notification_event_id", ignoreDuplicates: true })
          .select("id");
        if (!insertErr) directNotificationsCreated += inserted?.length ?? 0;
        else console.error("[CRON] Direct notification upsert error:", insertErr.message);
      }
    }

    // --- Step 7: Final Metric Return Assertions ---
    return NextResponse.json({
      shows_scanned: allTimetableShows.length,
      watched_anilist_ids: watchedAnilistIds.size,
      matched_shows: upsertPayloads.length,
      in_window: inWindowCount,
      queued: queuedStats,
      cache_updated: cacheUpdatedCount,
      direct_notifications_created: directNotificationsCreated,
    });

  } catch (error: any) {
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}