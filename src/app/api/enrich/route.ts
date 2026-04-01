import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import https from "https";

export const dynamic = 'force-dynamic';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchIPv4 = (url: string, timeoutMs: number = 6000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4 }, (res) => {
      if (res.statusCode === 429) return reject({ status: 429, message: "Rate Limited" });
      if (res.statusCode && res.statusCode !== 200) {
        return reject({ status: res.statusCode, message: `HTTP Error ${res.statusCode}` });
      }

      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try { 
          resolve(JSON.parse(rawData)); 
        } catch (e) { 
          reject({ status: 500, message: "JSON Parse Error" }); 
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(timeoutMs, () => { 
      req.destroy(); 
      reject({ name: 'AbortError', message: 'Timeout' }); 
    });
  });
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // THE FIX: Included `status` and `watched_episodes` in the select payload
    const { data: allEntries, error: fetchError } = await supabase
      .from("watchlist_entries")
      .select("id, mal_id, title, poster_url, status, watched_episodes")
      .eq("user_id", user.id);

    if (fetchError) throw new Error(`Failed to fetch watchlist: ${fetchError.message}`);
    if (!allEntries || allEntries.length === 0) return NextResponse.json({ enriched: 0, remaining: 0 });

    const malIds = allEntries.map(e => e.mal_id);
    const { data: existingMeta, error: metaFetchError } = await supabaseAdmin
      .from("anime_metadata")
      .select("mal_id")
      .in("mal_id", malIds);

    if (metaFetchError) throw new Error(`Failed to fetch metadata: ${metaFetchError.message}`);

    const existingMalIds = new Set(existingMeta?.map(m => m.mal_id) || []);

    const pendingEntries = allEntries.filter(
      e => !e.poster_url || !existingMalIds.has(e.mal_id)
    ).slice(0, 20);

    if (pendingEntries.length === 0) return NextResponse.json({ enriched: 0, remaining: 0 });

    console.log(`\n--- STARTING BATCH OF ${pendingEntries.length} ANIME ---`);
    let enrichedCount = 0;

    for (const entry of pendingEntries) {
      await delay(1100); 

      try {
        const jsonResponse = await fetchIPv4(`https://api.jikan.moe/v4/anime/${entry.mal_id}`);
        const data = jsonResponse.data;
        
        if (!data) continue;

        const poster_url = data.images?.jpg?.large_image_url || entry.poster_url;
        const combinedGenres = Array.from(new Set([
          ...(data.genres || []), ...(data.explicit_genres || []),
          ...(data.themes || []), ...(data.demographics || [])
        ].map((g: any) => g.name)));

        const metadata = {
          mal_id: data.mal_id, title: data.title || entry.title, genres: combinedGenres,
          type: data.type || "Unknown", season: data.season || null,
          airing_status: data.status || null, studio: data.studios?.[0]?.name || null,
          year: data.year || null, total_episodes: data.episodes || null,
          synopsis: data.synopsis || null, poster_url: poster_url,
          cached_at: new Date().toISOString(), jikan_raw: data
        };

        // 1. Update Watchlist Entry Poster & Fix Missing Episodes
        const needsPosterUpdate = entry.poster_url !== poster_url;
        const needsEpisodeFix = entry.status === 'completed' && entry.watched_episodes === 0 && data.episodes > 0;

        if (needsPosterUpdate || needsEpisodeFix) {
          const updateData: any = {};
          if (needsPosterUpdate) {
            updateData.poster_url = poster_url;
            updateData.total_episodes = data.episodes;
          }
          if (needsEpisodeFix) {
            updateData.watched_episodes = data.episodes;
            updateData.total_episodes = data.episodes; // ensure it is synced
          }

          const { error: updateErr } = await supabase
            .from("watchlist_entries")
            .update(updateData)
            .eq("id", entry.id);
          
          if (updateErr) throw new Error(`Watchlist Update Error: ${updateErr.message}`);
        }

        // 2. Upsert into Metadata Cache
        const { error: upsertErr } = await supabaseAdmin.from("anime_metadata").upsert(metadata);
        if (upsertErr) throw new Error(`Metadata Upsert Error: ${upsertErr.message}`);

        console.log(`[ENRICH] Successfully saved ${entry.mal_id}`);
        enrichedCount++;

      } catch (err: any) {
        console.error(`[ENRICH] Hard Crash on ${entry.mal_id}:`, err.message || err);
        if (err.status === 429) {
          console.warn(`[ENRICH] Rate Limit Hit! Breaking batch.`);
          break;
        }
        if (err.status === 404 || err.status >= 500) {
           await supabaseAdmin.from("anime_metadata").upsert({
            mal_id: entry.mal_id, title: entry.title, type: "Unknown", cached_at: new Date().toISOString()
          });
          enrichedCount++;
        }
      }
    }

    const totalMissing = allEntries.filter(e => !e.poster_url || !existingMalIds.has(e.mal_id)).length;
    const remaining = Math.max(0, totalMissing - enrichedCount);
    
    return NextResponse.json({ enriched: enrichedCount, remaining });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // ... existing GET function remains unchanged
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: allEntries } = await supabase.from("watchlist_entries").select("mal_id, poster_url").eq("user_id", user.id);
    if (!allEntries) return NextResponse.json({ remaining: 0 });

    const malIds = allEntries.map(e => e.mal_id);
    const { data: existingMeta } = await supabaseAdmin.from("anime_metadata").select("mal_id").in("mal_id", malIds);
      
    const existingMalIds = new Set(existingMeta?.map(m => m.mal_id) || []);
    const remaining = allEntries.filter(e => !e.poster_url || !existingMalIds.has(e.mal_id)).length;

    return NextResponse.json({ remaining });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}