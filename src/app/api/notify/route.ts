import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { Client } from "@upstash/qstash";
import webpush from "web-push";
import { getSiteUrl } from "@/lib/get-site-url";

// Initialize Web Push using environment variables
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:harsh.vs.tech@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Initialize Upstash QStash client
const qstash = new Client({ 
  token: process.env.QSTASH_TOKEN!,
  ...(process.env.QSTASH_URL ? { baseUrl: process.env.QSTASH_URL } : {}),
});

// Helper to compute ISO Week and Year matching the scheduling engine properties in UTC
function getISOWeekAndYear(date: Date) {
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

async function handler(req: Request) {
  try {
    const siteUrl = getSiteUrl(req);
    // --- Step 1: Parse Payload from Scanner ---
    const { 
      anilist_id, 
      mal_id, 
      episode, 
      format, 
      scheduled_at, 
      title, 
      poster_url 
    } = await req.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();
    const nowUnix = Math.floor(now.getTime() / 1000);

    // --- Step 2: Live JIT Verification Against AnimeSchedule ---
    const currentWeekInfo = getISOWeekAndYear(now);
    const scheduleRes = await fetch(
      `https://animeschedule.net/api/v3/timetables?week=${currentWeekInfo.week}&year=${currentWeekInfo.year}&tz=UTC`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ANIMESCHEDULE_TOKEN}`,
        },
      }
    );

    if (!scheduleRes.ok) {
      throw new Error(`AnimeSchedule fallback validation failed: ${scheduleRes.statusText}`);
    }

    const timetableShows = await scheduleRes.json();
    let liveShowData = null;

    if (Array.isArray(timetableShows)) {
      // Find the entry that matches BOTH the anilist_id and the requested format
      liveShowData = timetableShows.find((show: any) => {
        const anilistWeb = show.websites?.find((w: any) => w.website === "AniList");
        if (!anilistWeb) return false;
        const match = anilistWeb.url.match(/anime\/(\d+)/);
        const matchesId = match && parseInt(match[1], 10) === anilist_id;
        const matchesFormat = show.airType === format;
        return matchesId && matchesFormat;
      });

      // Fallback: match by ID only if format-specific search yields nothing
      if (!liveShowData) {
        liveShowData = timetableShows.find((show: any) => {
          const anilistWeb = show.websites?.find((w: any) => w.website === "AniList");
          if (!anilistWeb) return false;
          const match = anilistWeb.url.match(/anime\/(\d+)/);
          return match && parseInt(match[1], 10) === anilist_id;
        });
      }
    }

    // Determine the corresponding dynamic property format targets
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
        console.warn(`[NOTIFY] detail page fetch failed for ${route}:`, error);
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

    let liveTimestampStr: string | null = null;

    // Direct Extraction from Timetable API (Pre-fetch optimization to avoid scrapers)
    if (liveShowData) {
      if (format === "raw") {
        liveTimestampStr = liveShowData.episodeDate ?? liveShowData.rawPostDate ?? liveShowData.rawAirAt ?? null;
      } else if (format === "sub") {
        liveTimestampStr = liveShowData.subPostDate ?? liveShowData.subAirAt ?? liveShowData.subEpisodeDateTime ?? null;
      } else if (format === "dub") {
        liveTimestampStr = liveShowData.dubPostDate ?? liveShowData.dubAirAt ?? null;
      }
    }

    // Fallback HTML Scrape only if timetable payload has no dates
    if (!liveTimestampStr && liveShowData?.route) {
      const detailHtml = await fetchAnimeDetailHtml(liveShowData.route);

      if (detailHtml) {
        if (format === "raw") {
          liveTimestampStr =
            extractField(detailHtml, ["rawPostDate", "raw_air_at", "rawAirAt", "episodeDate"]) ??
            liveShowData.episodeDate;
        } else if (format === "sub") {
          liveTimestampStr =
            extractField(detailHtml, ["subPostDate", "sub_air_at", "subAirAt"]) ??
            liveShowData.subPostDate;
        } else if (format === "dub") {
          liveTimestampStr =
            extractField(detailHtml, ["dubPostDate", "dub_air_at", "dubAirAt"]) ??
            liveShowData.dubPostDate;
        }
      }
    }

    // CASE C: Episode canceled or field target evaluates to null
    if (!liveShowData || !liveTimestampStr) {
      return NextResponse.json({ ok: true, status: "Cancelled or untracked format target. Skipping dispatch." }, { status: 200 });
    }

    const liveUnix = Math.floor(new Date(liveTimestampStr).getTime() / 1000);

    // CASE B: Delayed or not yet ready to air — reschedule to actual air time
    if (liveUnix > nowUnix + 60) {
      // 1. Ensure the new notification event key exists in the database
      const newEventKey = `${mal_id}:${episode}:${format}:${liveUnix}`;
      await supabaseAdmin
        .from("notification_events")
        .upsert({
          event_key: newEventKey,
          anilist_id,
          mal_id,
          episode_number: episode,
          format,
          aired_at: new Date(liveUnix * 1000).toISOString(),
        }, { onConflict: "event_key", ignoreDuplicates: true });

      // 2. Re-queue the exact message structure to QStash aligned with the updated timeline
      await qstash.publishJSON({
        url: siteUrl + "/api/notify",
        body: { 
          anilist_id, 
          mal_id, 
          episode, 
          format, 
          scheduled_at: liveUnix, 
          title, 
          poster_url 
        },
        notBefore: liveUnix,
        retries: 2,
      });

      return NextResponse.json({ ok: true, status: `Rescheduled delayed item to Unix timestamp: ${liveUnix}` }, { status: 200 });
    }

    // --- Step 3: Fetch Global Event Identifier ---
    const eventKey = `${mal_id}:${episode}:${format}:${scheduled_at}`;
    const { data: eventRecord, error: eventError } = await supabaseAdmin
      .from("notification_events")
      .select("id")
      .eq("event_key", eventKey)
      .maybeSingle();

    if (eventError || !eventRecord) {
      return NextResponse.json({ ok: true, status: "Global event key context missing. Skipping execution loop." }, { status: 200 });
    }

    const eventId = eventRecord.id;

    // --- Step 4: Find Users and Notify ---
    // Fetch all users watching this anime
    const { data: watchlistUsers, error: watchlistError } = await supabaseAdmin
      .from("watchlist_entries")
      .select("user_id, title, title_english")
      .eq("mal_id", mal_id)
      .eq("status", "watching");

    if (watchlistError) throw watchlistError;
    if (!watchlistUsers || watchlistUsers.length === 0) {
      return NextResponse.json({ ok: true, status: "No users watching active preference format target." }, { status: 200 });
    }

    const userIds = watchlistUsers.map((w) => w.user_id);

    // Fetch user preferences — NO format filter: we resolve the fallback chain in memory
    const { data: preferences, error: prefError } = await supabaseAdmin
      .from("user_preferences")
      .select("user_id, notification_format, timezone")
      .in("user_id", userIds);

    if (prefError) throw prefError;
    if (!preferences || preferences.length === 0) {
      return NextResponse.json({ ok: true, status: "No preferences found for watching users." }, { status: 200 });
    }

    // Determine which formats are available for this same episode across all queued events.
    // This allows us to apply the fallback chain correctly:
    //   dub pref: dub > sub > raw
    //   sub pref: sub > raw
    //   raw pref: raw only
    const { data: episodeFormatEvents } = await supabaseAdmin
      .from("notification_events")
      .select("format")
      .eq("mal_id", mal_id)
      .eq("episode_number", episode);

    const availableFormats = new Set(
      episodeFormatEvents?.map((e: { format: string }) => e.format) ?? []
    );

    // Returns the format label to show the user, or null if this event should NOT be delivered
    // to a user with the given preference under the fallback chain.
    function resolveFormatDelivery(userPref: string | null, eventFormat: string): string | null {
      const pref = userPref ?? "sub";

      if (eventFormat === "raw") {
        if (pref === "raw") return "RAW";
        if (pref === "sub" && !availableFormats.has("sub")) return "RAW (Sub not yet available)";
        if (pref === "dub" && !availableFormats.has("dub") && !availableFormats.has("sub")) return "RAW (Dub & Sub not yet available)";
        return null;
      }

      if (eventFormat === "sub") {
        if (pref === "sub") return "SUB";
        if (pref === "dub" && !availableFormats.has("dub")) return "SUB (Dub not yet available)";
        return null;
      }

      if (eventFormat === "dub") {
        if (pref === "dub") return "DUB";
        return null;
      }

      return null;
    }

    // Map watchlist entries with preferences in memory
    const usersToNotify = watchlistUsers
      .filter((w) => preferences.some((p) => p.user_id === w.user_id))
      .map((w) => {
        const pref = preferences.find((p) => p.user_id === w.user_id);
        return {
          user_id: w.user_id,
          title: w.title,
          title_english: w.title_english,
          user_preferences: {
            notification_format: pref?.notification_format ?? "sub",
            timezone: pref?.timezone,
          },
        };
      });

    if (usersToNotify.length === 0) {
      return NextResponse.json({ ok: true, status: "No users watching active preference format target." }, { status: 200 });
    }

    // Bulk resolve targeted user IDs to collect active web push credentials in one query
    const targetUserIds = usersToNotify.map((u) => u.user_id);
    const { data: pushSubscriptions } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    // Guard: Fetch existing notifications for the target users to prevent duplicate delivery in one query
    const { data: existingNotifs, error: existError } = await supabaseAdmin
      .from("notifications")
      .select("user_id")
      .eq("notification_event_id", eventId)
      .in("user_id", targetUserIds);

    if (existError) throw existError;
    const existingDeliveredSet = new Set(existingNotifs?.map((n) => n.user_id) ?? []);

    const pushPromises: Promise<any>[] = [];
    const internalNotificationsToInsert: any[] = [];

    for (const user of usersToNotify) {
      // 0. Resolve whether this event format should be delivered to this user
      const userPref = (user.user_preferences as any)?.notification_format ?? "sub";
      const formatLabel = resolveFormatDelivery(userPref, format);
      if (!formatLabel) {
        // This event format is not in the user's delivery chain — skip
        continue;
      }

      // 1. Fetch user's custom timezone (fallback to UTC if missing)
      const tz = (user.user_preferences as any)?.timezone || "UTC";

      const airedAt = new Date(liveTimestampStr!);
      const receivedAt = new Date(now.toISOString());

      // 2. Localized time formatter matching user preference timezone
      const formatDateTime = (d: Date) =>
        new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(d);

      // 3. Build personalized body text strings — include format label so users know which stream type
      const pushBody =
        `[${formatLabel}] Episode ${episode} of ${title} aired at ${formatDateTime(airedAt)}. ` +
        `Notified at ${formatDateTime(receivedAt)}.`;

      // 4. Stringify individual user payload configuration mapping
      const notificationPayload = JSON.stringify({
        title: title,
        body: pushBody,
        icon: poster_url || "/file.svg",
        data: {
          url: `/anime/${mal_id}`,
          aired_at: liveTimestampStr,
          received_at: now.toISOString(),
          format,
          episode,
          title,
        },
      });

      if (existingDeliveredSet.has(user.user_id)) {
        console.log(`[NOTIFY] Duplicate detected for user ${user.user_id} and event ${eventId}. Skipping.`);
        continue;
      }

      // Create in-app entity properties mapped with relational event constraints
      internalNotificationsToInsert.push({
        user_id: user.user_id,
        mal_id,
        anime_title: title,
        episode_number: episode,
        poster_url,
        format,
        is_read: false,
        aired_at: new Date(liveUnix * 1000).toISOString(),
        created_at: now.toISOString(),
        notification_event_id: eventId,
      });

      // Map subscriptions arrays using schema-compliant database keys
      const subs = pushSubscriptions?.filter((s) => s.user_id === user.user_id) || [];
      subs.forEach((sub) => {
        const promise = webpush
          .sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth_key },
            },
            notificationPayload // This now safely uses the localized per-user payload
          )
          .catch(async (err: any) => {
            // Unregister obsolete/expired client targets automatically
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
            }
          });
        pushPromises.push(promise);
      });
    }

    // Execute database operations and background workers concurrently
    const dbPromise = internalNotificationsToInsert.length > 0
      ? supabaseAdmin
          .from("notifications")
          .upsert(internalNotificationsToInsert, { onConflict: "user_id,mal_id,created_date", ignoreDuplicates: true })
      : Promise.resolve({ data: null, error: null });

    await Promise.all([
      dbPromise,
      Promise.allSettled(pushPromises),
    ]);

    return NextResponse.json({ ok: true, status: "Dispatched target alerts successfully." }, { status: 200 });

  } catch (error: any) {
    // Return a 500 status code for actual errors so QStash knows to retry
    console.error("JIT Delivery Engine Fail Exception:", error);
    return NextResponse.json({ ok: false, error: error.message || "Execution exception skipped" }, { status: 500 });
  }
}

// Wrap the route context handling securely using the Upstash cryptographic verification middleware
export const POST = verifySignatureAppRouter(handler);