import { createClient, getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WatchlistClient from "./WatchlistClient";

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  const supabase = await createClient();

  const user = await getServerUser();
  if (!user) {
    return <WatchlistClient initialWatchlist={[]} isLoggedIn={false} />;
  }

  // Fetch user's watchlist entries joined with metadata in a single query
  const { data: entries, error } = await supabase
    .from("watchlist_entries")
    .select(`
      id,
      user_id,
      mal_id,
      title,
      status,
      score,
      watched_episodes,
      total_episodes,
      poster_url,
      created_at,
      title_english,
      title_romaji,
      anime_metadata (
        genres,
        year,
        type,
        season,
        airing_status,
        title_english,
        title_romaji
      )
    `)
    .eq("user_id", user.id);

  if (error) {
    console.error("[WATCHLIST PAGE] Supabase Fetch Error:", error.message);
  }

  if (!entries || entries.length === 0) {
    return <WatchlistClient initialWatchlist={[]} />;
  }

  // Merge watchlist fields and map the joined relation object
  const mergedEntries = entries.map((entry: any) => {
    // Supabase can return relation as a single object or a 1-item array depending on structural parsing
    const meta = Array.isArray(entry.anime_metadata) 
      ? entry.anime_metadata[0] 
      : entry.anime_metadata;

    return {
      id: entry.id,
      mal_id: entry.mal_id,
      title: entry.title,
      status: entry.status,
      score: entry.score,
      watched_episodes: entry.watched_episodes,
      total_episodes: entry.total_episodes,
      poster_url: entry.poster_url,
      created_at: entry.created_at,
      title_english: entry.title_english || meta?.title_english || null,
      title_romaji: entry.title_romaji || meta?.title_romaji || entry.title,
      anime_metadata: meta ? {
        genres: meta.genres || [],
        year: meta.year || null,
        type: meta.type || null,
        season: meta.season || null,
        airing_status: meta.airing_status || null,
      } : undefined
    };
  });

  return <WatchlistClient initialWatchlist={mergedEntries} />;
}