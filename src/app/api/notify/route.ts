import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { Client } from "@upstash/qstash";
import webpush from "web-push";

// Initialize Web Push using environment variables
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:harsh.vs.tech@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Initialize Upstash QStash client
const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

// Helper to compute ISO Week and Year matching the scheduling engine properties
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

async function handler(req: Request) {
  try {
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
      liveShowData = timetableShows.find((show: any) => {
        const anilistWeb = show.websites?.find((w: any) => w.website === "AniList");
        if (!anilistWeb) return false;
        const match = anilistWeb.url.match(/anime\/(\d+)/);
        return match && parseInt(match[1], 10) === anilist_id;
      });
    }

    // Determine the corresponding dynamic property format targets
    let liveTimestampStr = null;
    if (liveShowData) {
      if (format === "raw") liveTimestampStr = liveShowData.episodeDate;
      if (format === "sub") liveTimestampStr = liveShowData.subPostDate;
      if (format === "dub") liveTimestampStr = liveShowData.dubPostDate;
    }

    // CASE C: Episode canceled or field target evaluates to null
    if (!liveShowData || !liveTimestampStr) {
      return NextResponse.json({ ok: true, status: "Cancelled or untracked format target. Skipping dispatch." }, { status: 200 });
    }

    const liveUnix = Math.floor(new Date(liveTimestampStr).getTime() / 1000);
    const differenceInSeconds = Math.abs(liveUnix - scheduled_at);

    // CASE B: Delayed — Target shifted out of window bounds by more than 10 minutes
    if (differenceInSeconds > 600 && liveUnix > nowUnix) {
      // Re-queue the exact message structure to QStash aligned with the updated timeline
      await qstash.publishJSON({
        url: process.env.NEXT_PUBLIC_SITE_URL + "/api/notify",
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

    // CASE A: Confirmed matching window targets (Proceed only if within limits and timestamp arrived)
    const isReadyToAir = liveUnix <= (nowUnix + 60);
    if (!isReadyToAir) {
      return NextResponse.json({ ok: true, status: "Waiting window frame execution target mismatch." }, { status: 200 });
    }

    // --- Step 3: Deduplication ---
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const { data: existingNotif } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("mal_id", mal_id)
      .eq("episode_number", episode)
      .eq("format", format)
      .gte("created_at", twelveHoursAgo)
      .maybeSingle();

    if (existingNotif) {
      return NextResponse.json({ ok: true, status: "Silently skipped duplicate notification event pipeline." }, { status: 200 });
    }

    // --- Step 4: Find Users and Notify ---
    // Join watchlist table across explicit relational format preferences
    const { data: usersToNotify, error: userQueryError } = await supabaseAdmin
      .from("watchlist_entries")
      .select(`
        user_id, 
        title, 
        title_english,
        user_preferences!inner(notification_format)
      `)
      .eq("mal_id", mal_id)
      .eq("status", "watching")
      .eq("user_preferences.notification_format", format);

    if (userQueryError) throw userQueryError;
    if (!usersToNotify || usersToNotify.length === 0) {
      return NextResponse.json({ ok: true, status: "No users watching active preference format target." }, { status: 200 });
    }

    // Bulk resolve targeted user IDs to collect active web push credentials in one query
    const targetUserIds = usersToNotify.map((u) => u.user_id);
    const { data: pushSubscriptions } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    // Format-aware localized dispatch templates
    let pushBody = `New episode of ${title} is out now!`;
    if (format === "raw") pushBody = `Episode ${episode} of ${title} is airing in Japan now!`;
    if (format === "sub") pushBody = `Episode ${episode} of ${title} subtitles are available!`;
    if (format === "dub") pushBody = `Episode ${episode} of ${title} English dub is out!`;

    const notificationPayload = JSON.stringify({
      title: title,
      body: pushBody,
      icon: poster_url || "/file.svg",
      data: { url: `/anime/${mal_id}` },
    });

    const pushPromises: Promise<any>[] = [];
    const internalNotificationsToInsert: any[] = [];

    for (const user of usersToNotify) {
      // Create in-app entity properties
      internalNotificationsToInsert.push({
        user_id: user.user_id,
        mal_id: mal_id,
        anime_title: title,
        episode_number: episode,
        poster_url: poster_url,
        format: format,
        is_read: false,
        aired_at: liveTimestampStr,
        created_at: now.toISOString(),
  });

      // Map subscriptions arrays
      const subs = pushSubscriptions?.filter((s) => s.user_id === user.user_id) || [];
      subs.forEach((sub) => {
        const promise = webpush
          .sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            notificationPayload
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
    await Promise.all([
      supabaseAdmin.from("notifications").insert(internalNotificationsToInsert),
      Promise.allSettled(pushPromises),
    ]);

    return NextResponse.json({ ok: true, status: "Dispatched target alerts successfully." }, { status: 200 });

  } catch (error: any) {
    // Graceful errors catcher layout return schema structure. Always returns status 200
    // so that operational logic drops or infrastructure failures don't get trapped in infinite QStash retry routines.
    console.error("JIT Delivery Engine Fail Exception:", error);
    return NextResponse.json({ ok: false, error: error.message || "Execution exception skipped" }, { status: 200 });
  }
}

// Wrap the route context handling securely using the Upstash cryptographic verification middleware
export const POST = verifySignatureAppRouter(handler);