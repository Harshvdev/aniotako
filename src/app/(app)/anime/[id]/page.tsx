import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAnimeDetails } from "@/lib/anime";
import AnimeDetailClient from "./AnimeDetailClient";

export const dynamic = 'force-dynamic';

export default async function AnimePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const mal_id = parseInt(params.id, 10);
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  let watchlistEntry = null;
  let userPrefs = {
    timezone: "",
    notification_format: "sub",
    countdown_enabled: true,
  };

  if (isLoggedIn && user) {
    // 1. Fetch Watchlist Entry
    const { data: entry } = await supabase
      .from("watchlist_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("mal_id", mal_id)
      .single();
    watchlistEntry = entry;

    // 2. Direct Database Query for Preferences
    const { data: prefsRow } = await supabase
      .from("user_preferences")
      .select("timezone, notification_format, countdown_enabled")
      .eq("user_id", user.id)
      .single();

    if (prefsRow) {
      userPrefs = prefsRow;
    }
  }

  // 3. Fetch details directly using the server-side helper
  let anilistData = null;
  let errorType: string | null = null;

  try {
    const res = await getAnimeDetails(mal_id);
    if (res && res.error) {
      errorType = res.error;
    } else {
      anilistData = res;
    }
  } catch (err) {
    console.error("[PAGE] Failed to fetch anime details:", err);
    errorType = "network_error";
  }

  // If there's no data and it's not a rate-limit/network error, it's a true 404
  if (!anilistData && !errorType) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
        <h2 className="text-2xl font-bold text-white mb-2">Anime Not Found</h2>
        <p>We couldn't find details for this anime. It might not exist on AniList.</p>
      </div>
    );
  }

  // 4. Build Final Combined Payload
  let mergedAnime = null;
  if (anilistData) {
    const { data: meta } = await supabase
      .from("anime_metadata")
      .select("*")
      .eq("mal_id", mal_id)
      .single();

    const nextEpisodeNumber =
      meta?.raw_next_episode_number ??
      meta?.next_episode_number ??
      meta?.next_episode_num ??
      anilistData?.nextAiringEpisode?.episode ??
      null;

    mergedAnime = {
      ...anilistData,
      anime_metadata: meta ? {
        raw_air_at: meta.raw_air_at,
        sub_air_at: meta.sub_air_at,
        dub_air_at: meta.dub_air_at,
        raw_next_episode_number: meta.raw_next_episode_number ?? null,
        sub_next_episode_number: meta.sub_next_episode_number ?? null,
        dub_next_episode_number: meta.dub_next_episode_number ?? null,
        next_airing_at: meta.next_airing_at,
        next_episode_number: nextEpisodeNumber,
        schedule_updated_at: meta.schedule_updated_at,
      } : null,
    };
  }

  return (
    <AnimeDetailClient 
      anime={mergedAnime} 
      error={errorType}
      initialEntry={watchlistEntry || null} 
      preferences={userPrefs} 
      isLoggedIn={isLoggedIn}
    />
  );
}