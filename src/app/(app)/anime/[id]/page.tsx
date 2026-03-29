import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AnimeDetailClient from "./AnimeDetailClient";
import https from "https";

export const dynamic = 'force-dynamic';

// Custom IPv4 fetch to prevent Linux IPv6 network crashes
const fetchIPv4 = (url: string, timeoutMs: number = 5000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } 
        catch (e) { reject(e); }
      });
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error("Timeout")); });
  });
};

export default async function AnimePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const mal_id = parseInt(params.id, 10);
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1. Fetch user's personal tracking data
  const { data: watchlistEntry } = await supabase
    .from("watchlist_entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("mal_id", mal_id)
    .single();

  // 2. Check cache for Jikan data
  const { data: meta } = await supabase
    .from("anime_metadata")
    .select("*")
    .eq("mal_id", mal_id)
    .single();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const isStale = !meta || !meta.cached_at || new Date(meta.cached_at) < sevenDaysAgo;
  let jikanData = meta?.jikan_raw;

  // 3. Fetch from Jikan if missing or stale
  if (isStale || !jikanData) {
    try {
      const response = await fetchIPv4(`https://api.jikan.moe/v4/anime/${mal_id}/full`);
      jikanData = response.data;

      if (jikanData) {
        await supabase.from("anime_metadata").upsert({
          mal_id,
          title: jikanData.title,
          genres: jikanData.genres?.map((g: any) => g.name) || [],
          type: jikanData.type || "Unknown",
          season: jikanData.season || null,
          airing_status: jikanData.status || null,
          studio: jikanData.studios?.[0]?.name || null,
          year: jikanData.year || null,
          total_episodes: jikanData.episodes || null,
          synopsis: jikanData.synopsis || null,
          poster_url: jikanData.images?.jpg?.large_image_url || null,
          cached_at: new Date().toISOString(),
          jikan_raw: jikanData // Save the massive payload here
        });
      }
    } catch (error) {
      console.error(`Failed to fetch/cache anime ${mal_id}`, error);
    }
  }

  if (!jikanData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
        <h2 className="text-2xl font-bold text-white mb-2">Anime Not Found</h2>
        <p>We couldn't fetch details for this anime. Please try again later.</p>
      </div>
    );
  }

  return <AnimeDetailClient anime={jikanData} initialEntry={watchlistEntry || null} />;
}