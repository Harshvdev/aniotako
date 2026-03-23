import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

// Configure web-push with VAPID details
webPush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: Request) {
  // Optional: Secure this endpoint so only Vercel Cron can call it
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch today's schedule from Jikan
    const jikanRes = await fetch("https://api.jikan.moe/v4/schedules");
    const { data: airingAnime } = await jikanRes.json();
    
    if (!airingAnime || airingAnime.length === 0) {
      return NextResponse.json({ message: "No anime airing today." });
    }

    const airingMalIds = airingAnime.map((a: any) => a.mal_id);

    // Initialize Supabase Admin Client (Bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Requires service role key!
    );

    // 2. Find all entries where status is "watching" and the anime is airing today
    const { data: watchingEntries, error: entriesError } = await supabaseAdmin
      .from("watchlist_entries")
      .select("user_id, series_title, series_animedb_id")
      .eq("my_status", "watching")
      .in("series_animedb_id", airingMalIds);

    if (entriesError) throw entriesError;
    if (!watchingEntries || watchingEntries.length === 0) {
      return NextResponse.json({ message: "No users watching today's anime." });
    }

    // Extract unique user IDs to fetch their push subscriptions
    const userIds = [...new Set(watchingEntries.map(e => e.user_id))];

    // 3. Get push subscriptions for these users
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (subsError) throw subsError;

    // 4. Send Web Push Notifications
    const notificationPromises = watchingEntries.map(entry => {
      // Find all subscriptions for the user watching this specific anime
      const userSubs = subscriptions?.filter(sub => sub.user_id === entry.user_id) || [];
      
      const payload = JSON.stringify({
        title: "New Episode Airing!",
        body: `A new episode of ${entry.series_title} airs today.`,
        url: `/watchlist`, // Clicking notification will route here
      });

      // Send to all devices the user has subscribed with
      return userSubs.map(sub => 
        webPush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        ).catch(err => {
          console.error("Failed to send push to endpoint", sub.endpoint, err);
          // Optional: Delete dead subscriptions from DB if err.statusCode === 410 (Gone)
        })
      );
    }).flat();

    await Promise.all(notificationPromises);

    return NextResponse.json({ success: true, notificationsSent: notificationPromises.length });
  } catch (error: any) {
    console.error("Cron notification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}