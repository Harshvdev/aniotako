import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Initialize Web Push with your VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@aniotako.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// We use GET for Vercel Cron Jobs
export async function GET(req: Request) {
  try {
    // 1. Authenticate the Cron Request
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
    }

    // Initialize Supabase Admin Client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Determine today's day of the week for Jikan
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

    // 5. Gather required metadata (Posters and Push Subscriptions)
    const uniqueUserIds = [...new Set(watchingEntries.map(e => e.user_id))];
    
    const [ { data: metadata }, { data: subscriptions } ] = await Promise.all([
      supabaseAdmin.from("anime_metadata").select("mal_id, poster_url").in("mal_id", airingMalIds),
      supabaseAdmin.from("push_subscriptions").select("*").in("user_id", uniqueUserIds)
    ]);

    let inAppCreated = 0;
    let pushesSent = 0;
    let pushErrors = 0;

    // 6. Process matches
    for (const entry of watchingEntries) {
      const meta = metadata?.find(m => m.mal_id === entry.mal_id);
      const posterUrl = meta?.poster_url || null;

      // --- A. Create In-App Notification (With DB Deduplication) ---
      const { data: insertedNotif, error: insertErr } = await supabaseAdmin
        .from("notifications")
        .upsert({
          user_id: entry.user_id,
          mal_id: entry.mal_id,
          anime_title: entry.title,
          poster_url: posterUrl,
          // episode_number is naturally null by default
        }, { 
          onConflict: "user_id, mal_id, created_date", // Relies on our new unique constraint
          ignoreDuplicates: true 
        })
        .select("id"); // Select ID so we know if it actually inserted or was ignored

      if (insertErr) {
        console.error(`Failed to insert notification for ${entry.user_id}`, insertErr);
      } else if (insertedNotif && insertedNotif.length > 0) {
        inAppCreated++;
      }

      // --- B. Send Web Push Notification ---
      const userSubs = subscriptions?.filter(s => s.user_id === entry.user_id) || [];
      if (userSubs.length > 0) {
        const payload = JSON.stringify({
          title: entry.title,
          body: "New episode out today!",
          icon: posterUrl || "/file.svg", // Fallback to a default icon if missing
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
            console.error(`Push failed for ${sub.user_id}:`, err?.statusCode);
            pushErrors++;
            // Optional: If err.statusCode === 410 (Gone), delete the subscription from DB
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