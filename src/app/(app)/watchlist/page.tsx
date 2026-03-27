import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WatchlistClient from "./WatchlistClient";

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1. Fetch user's core watchlist entries
  const { data: entries } = await supabase
    .from("watchlist_entries")
    .select("*")
    .eq("user_id", user.id);

  if (!entries || entries.length === 0) {
    return <WatchlistClient initialWatchlist={[]} />;
  }

  // 2. Fetch metadata for only the anime in this user's list
  const malIds = entries.map(e => e.mal_id);
  const { data: metadata } = await supabase
    .from("anime_metadata")
    // ADDED: airing_status to the select query
    .select("mal_id, genres, year, type, season, airing_status") 
    .in("mal_id", malIds);

  // 3. Merge them together
  const mergedEntries = entries.map(entry => {
    const meta = metadata?.find(m => m.mal_id === entry.mal_id);
    return {
      ...entry,
      anime_metadata: meta ? {
        genres: meta.genres || [],
        year: meta.year || null,
        type: meta.type || null,
        season: meta.season || null,
        airing_status: meta.airing_status || null, // ADDED THIS
      } : undefined
    };
  });

  return <WatchlistClient initialWatchlist={mergedEntries} />;
}