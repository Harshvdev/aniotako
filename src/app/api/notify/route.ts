import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

// Configure web-push with your VAPID details
webPush.setVapidDetails(
  "mailto:harsh.vs.tech@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: Request) {
  // 1. Verify Authorization header against Vercel Cron Secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Determine today's day name in lowercase
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = days[new Date().getUTCDay()];

    // 3. Fetch today's schedule from Jikan
    const jikanRes = await fetch(`https://api.jikan.moe/v4/schedules?filter=${today}`);
    if (!jikanRes.ok) throw new Error("Failed to fetch Jikan schedule");
    
    const { data: airingData } = await jikanRes.json();
    if (!airingData || airingData.length === 0) {
      return NextResponse.json({ message: "No anime airing today", notified_users: 0, notifications_sent: 0, failed: 0 });
    }
    
    // Extract the array of mal_id values
    const airingMalIds = airingData.map((anime: any) => anime.mal_id);

    // 4. Init Supabase Admin (Bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Query watchlist_entries for 'watching' status matching airing mal_ids
    const { data: watchlist, error: wlError } = await supabaseAdmin
      .from("watchlist_entries")
      .select("user_id, mal_id, title")
      .eq("status", "watching")
      .in("mal_id", airingMalIds);

    if (wlError) throw wlError;
    if (!watchlist || watchlist.length === 0) {
      return NextResponse.json({ message: "No users watching today's airing anime", notified_users: 0, notifications_sent: 0, failed: 0 });
    }

    // 5. Group by user_id
    const userIds = [...new Set(watchlist.map((entry) => entry.user_id))];

    // 6. Fetch push_subscriptions for these users
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth_key")
      .in("user_id", userIds);

    if (subError) throw subError;
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "No push subscriptions found for target users", notified_users: 0, notifications_sent: 0, failed: 0 });
    }

    // Tracking metrics
    let notificationsSent = 0;
    let failed = 0;
    const endpointsToDelete: string[] = [];
    const notifiedUsers = new Set<string>();

    // 7. Map out all push notification promises
    const pushPromises = [];

    for (const entry of watchlist) {
      // Find all devices/subscriptions belonging to the user tracking this anime
      const userSubs = subscriptions.filter(sub => sub.user_id === entry.user_id);
      
      if (userSubs.length > 0) {
        notifiedUsers.add(entry.user_id);
      }

      for (const sub of userSubs) {
        const payload = JSON.stringify({
          title: `New episode: ${entry.title}`,
          body: "A new episode is out now on Aniotako",
          url: "/watchlist" // Optional: directs users to the watchlist when they click the notification
        });

        // 8. Execute push and catch 410 errors
        const pushPromise = webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key }
          },
          payload
        ).then(() => {
          notificationsSent++;
        }).catch((err) => {
          failed++;
          // 410 Gone means the user revoked permission or the subscription expired
          if (err.statusCode === 410) {
            endpointsToDelete.push(sub.endpoint);
          }
        });

        pushPromises.push(pushPromise);
      }
    }

    // Wait for all pushes to complete
    await Promise.allSettled(pushPromises);

    // Clean up expired subscriptions from the database
    if (endpointsToDelete.length > 0) {
      await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .in("endpoint", endpointsToDelete);
    }

    // 9. Return JSON results
    return NextResponse.json({
      notified_users: notifiedUsers.size,
      notifications_sent: notificationsSent,
      failed: failed,
      deleted_expired_subs: endpointsToDelete.length
    });

  } catch (error: any) {
    console.error("Cron Notification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}