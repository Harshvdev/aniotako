import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Initialize Web Push with your VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:harsh.vs.tech@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: Request) {
  try {
    // 1. Authenticate the Cron Request
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Determine today's day of the week
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayStr = days[new Date().getDay()];

    // 3. Fetch today's airing anime from Jikan
    const jikanRes = await fetch(`https://api.jikan.moe/v4/schedules?filter=${todayStr}`);
    if (!jikanRes.ok) throw new Error("Failed to fetch schedule from Jikan");
    const { data: scheduleData } = await jikanRes.json();
    
    if (!scheduleData || scheduleData.length === 0) {
      return NextResponse.json({ message: "No anime airing today." });
    }

    const airingMalIds = scheduleData.map((a: any) => a.mal_id);

    // 4. Find all users watching these airing anime
    const { data: watchingEntries, error: watchErr } = await supabaseAdmin
      .from("watchlist_entries")
      .select("user_id, mal_id, title")
      .eq("status", "watching")
      .in("mal_id", airingMalIds);

    if (watchErr) throw watchErr;
    if (!watchingEntries || watchingEntries.length === 0) {
      return NextResponse.json({ message: "No users watching today's airing anime." });
    }

    // 5. Gather required metadata
    const uniqueUserIds = [...new Set(watchingEntries.map(e => e.user_id))];
    const uniqueAiringMalIds = [...new Set(watchingEntries.map(e => e.mal_id))]; // Only the ones actually being watched
    
    const [ { data: metadata }, { data: subscriptions } ] = await Promise.all([
      supabaseAdmin.from("anime_metadata").select("mal_id, poster_url, jikan_raw").in("mal_id", uniqueAiringMalIds),
      supabaseAdmin.from("push_subscriptions").select("*").in("user_id", uniqueUserIds)
    ]);

    // --- NEW: FETCH EPISODE NUMBERS ONCE PER ANIME ---
    const episodeMap: Record<number, number | null> = {};
    const today = new Date();

    for (const animeId of uniqueAiringMalIds) {
      let epNum: number | null = null;

      try {
        // Pause for 1 second to respect Jikan's strict rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const epRes = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/episodes`);
        if (epRes.ok) {
          const { data: epData } = await epRes.json();
          if (epData && epData.length > 0) {
            // Find all episodes that aired today or earlier
            const airedEpisodes = epData.filter((ep: any) => ep.aired && new Date(ep.aired) <= today);
            if (airedEpisodes.length > 0) {
              // Get the highest episode number from the aired list
              epNum = Math.max(...airedEpisodes.map((ep: any) => ep.mal_id));
            }
          }
        }
      } catch (err) {
        console.error(`Failed to fetch episodes for ${animeId}`, err);
      }

      // Fallback Math: If Jikan episodes API fails or is empty, calculate based on start date
      if (epNum === null) {
        const meta = metadata?.find(m => m.mal_id === animeId);
        const airedFrom = meta?.jikan_raw?.aired?.from;
        
        if (airedFrom) {
          const startDate = new Date(airedFrom);
          if (startDate <= today) {
            // Count milliseconds between dates, convert to weeks, add 1
            const diffTime = Math.abs(today.getTime() - startDate.getTime());
            const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
            epNum = diffWeeks + 1;
          }
        }
      }

      episodeMap[animeId] = epNum;
    }

    let inAppCreated = 0;
    let pushesSent = 0;
    let pushErrors = 0;

    // 6. Process matches and send notifications
    for (const entry of watchingEntries) {
      const meta = metadata?.find(m => m.mal_id === entry.mal_id);
      const posterUrl = meta?.poster_url || null;
      const epNum = episodeMap[entry.mal_id] || null; // Retrieve the calculated episode

      // A. Create In-App Notification
      const { data: insertedNotif, error: insertErr } = await supabaseAdmin
        .from("notifications")
        .upsert({
          user_id: entry.user_id,
          mal_id: entry.mal_id,
          anime_title: entry.title,
          poster_url: posterUrl,
          episode_number: epNum // Save to DB
        }, { 
          onConflict: "user_id, mal_id, created_date",
          ignoreDuplicates: true 
        })
        .select("id");

      if (insertErr) {
        console.error(`Failed to insert notification for ${entry.user_id}`, insertErr);
      } else if (insertedNotif && insertedNotif.length > 0) {
        inAppCreated++;
      }

      // B. Send Web Push Notification
      const userSubs = subscriptions?.filter(s => s.user_id === entry.user_id) || [];
      if (userSubs.length > 0) {
        
        // Construct the specific push text
        const pushBody = epNum 
          ? `Episode ${epNum} of ${entry.title} is out now!` 
          : `${entry.title} — New episode out today!`;

        const payload = JSON.stringify({
          title: entry.title,
          body: pushBody,
          icon: posterUrl || "/file.svg",
          data: { url: `/anime/${entry.mal_id}` }
        });

        for (const sub of userSubs) {
          try {
            await webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            }, payload);
            pushesSent++;
          } catch (err: any) {
            pushErrors++;
            if (err.statusCode === 410 || err.statusCode === 404) {
               await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      summary: {
        matches_found: watchingEntries.length,
        in_app_notifications_created: inAppCreated,
        pushes_sent: pushesSent,
        push_errors: pushErrors
      } 
    });

  } catch (error: any) {
    console.error("Notify Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}