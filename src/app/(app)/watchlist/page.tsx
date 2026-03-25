import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WatchlistClient from "./WatchlistClient";

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  const supabase = await createClient();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Fetch user's watchlist
  const { data: watchlistEntries } = await supabase
    .from("watchlist_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <WatchlistClient initialWatchlist={watchlistEntries || []} />;
}