import { createClient } from "@/lib/supabase/server";
import NotificationsClient from "./NotificationsClient";
import FeatureLandingPage from "@/components/FeatureLandingPage";
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Anime Airing Notifications",
  description: "Configure custom browser push notifications for your favorite anime series. Never miss a sub, dub, or raw episode release.",
  alternates: {
    canonical: "/notifications",
  },
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // Guest view: Render a beautiful reusable FeatureLandingPage
    const benefits = [
      {
        title: "Notify me when RAW releases",
        description: "Be the first to know the exact minute the raw broadcast goes live in Japan.",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        ),
      },
      {
        title: "Notify me when SUB releases",
        description: "Get an instant alert as soon as subbed versions are released.",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ),
      },
      {
        title: "Notify me when DUB releases",
        description: "Receive updates when dubbed episodes drop for your preferred language.",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        title: "Automatically adjusts for delays",
        description: "No false alarms. Notifications are automatically rescheduled if an episode is delayed or cancelled due to holidays or emergencies.",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
    ];

    const notificationsIllustration = (
      <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-4">
        {/* Visual representation of a notification push banner */}
        <div className="w-full max-w-[280px] bg-zinc-950/50 border border-zinc-800/80 rounded-2xl p-4 shadow-2xl relative overflow-hidden flex flex-col items-start text-left">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Episode Airing Alert</span>
          </div>
          <h4 className="text-sm font-bold text-white mb-1">Slime Season 4 - Episode 13</h4>
          <p className="text-xs text-zinc-400 leading-relaxed mb-3">English Subtitles are now available! Tap to track your progress.</p>
          <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-gradient-to-r from-red-600 to-rose-500 rounded-full" />
          </div>
        </div>
        
        {/* Decorative floating elements */}
        <div className="absolute -top-2 -right-2 w-10 h-10 bg-red-500 rounded-full opacity-20 blur-lg pointer-events-none animate-pulse" />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-rose-600/10 rounded-full opacity-30 blur-xl pointer-events-none" />
      </div>
    );

    return (
      <FeatureLandingPage
        title="Real-Time Airing Notifications"
        description="Get notified the exact minute your favorite anime episodes release. Never miss a subbed, dubbed, or raw broadcast."
        benefits={benefits}
        ctaText="Sign in to enable notifications"
        ctaHref="/login?next=%2Fnotifications"
        illustration={notificationsIllustration}
      />
    );
  }

  // Fetch all notifications for the user, newest first
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_cleared", false)
    .order("created_at", { ascending: false });

  let enrichedNotifications = notifications || [];
  if (notifications && notifications.length > 0) {
    const malIds = notifications.map(n => n.mal_id);
    const { data: metaData } = await supabase
      .from("anime_metadata")
      .select("mal_id, title_english, title_romaji, poster_url")
      .in("mal_id", malIds);

    enrichedNotifications = notifications.map(notif => {
      const meta = metaData?.find(m => m.mal_id === notif.mal_id);
      return {
        ...notif,
        poster_url: meta?.poster_url || notif.poster_url,
        anime_metadata: meta ? {
          title_english: meta.title_english,
          title_romaji: meta.title_romaji
        } : undefined
      };
    }) as any[];
  }

  return <NotificationsClient initialNotifications={enrichedNotifications} />;
}