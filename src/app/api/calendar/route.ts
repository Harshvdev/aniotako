import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import https from "https";

// Helper to reliably fetch from Jikan
const fetchIPv4 = (url: string, timeoutMs: number = 6000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4 }, (res) => {
      if (res.statusCode === 429) return reject({ status: 429, message: "Rate Limited" });
      if (res.statusCode && res.statusCode !== 200) return reject({ status: res.statusCode, message: `HTTP Error ${res.statusCode}` });
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(rawData)); } 
        catch (e) { reject({ status: 500, message: "JSON Parse Error" }); }
      });
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(timeoutMs, () => { req.destroy(); reject({ name: 'AbortError', message: 'Timeout' }); });
  });
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    
    if (!dateParam) return NextResponse.json({ error: "Date is required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Determine Day of the Week
    // We append T12:00:00 to prevent timezone shifting backwards a day
    const targetDate = new Date(`${dateParam}T12:00:00`);
    
    // THE FIX: Prevent server crashes if the date is invalid
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format provided." }, { status: 400 });
    }

    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayOfWeek = days[targetDate.getDay()];

    // 2. Fetch User's Watchlist (All Statuses)
    const { data: watchlist } = await supabase
      .from("watchlist_entries")
      .select("mal_id, status, watched_episodes")
      .eq("user_id", user.id);

    if (!watchlist || watchlist.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const userMalIds = new Set(watchlist.map((entry) => entry.mal_id));

    // 3. Fetch Jikan Schedule
    const jikanData = await fetchIPv4(`https://api.jikan.moe/v4/schedules?filter=${dayOfWeek}`);
    const scheduledAnime = jikanData.data || [];

    // 4. Filter & Format Results
    const matchedAnime = scheduledAnime
      .filter((anime: any) => userMalIds.has(anime.mal_id))
      .map((anime: any) => {
        const userEntry = watchlist.find((e) => e.mal_id === anime.mal_id);
        return {
          mal_id: anime.mal_id,
          title: anime.title,
          title_english: anime.title_english || null,
          title_romaji: anime.title || null,
          poster_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
          format: anime.type,
          time: anime.broadcast?.string || "Time Unknown",
          total_episodes: anime.episodes,
          status: userEntry?.status,
          watched_episodes: userEntry?.watched_episodes,
        };
      });

    return NextResponse.json({ data: matchedAnime });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}