import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import https from "https";

export const dynamic = 'force-dynamic';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to safely chunk arrays for Supabase .in() queries to prevent HTTP 414 URI Too Long
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunked = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
};

// --- JIKAN HELPER ---
const fetchIPv4 = (url: string, timeoutMs: number = 6000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4 }, (res) => {
      if (res.statusCode === 429) return reject({ status: 429, message: "Rate Limited" });
      if (res.statusCode === 404) return reject({ status: 404, message: "Not Found" });
      if (res.statusCode && res.statusCode !== 200) {
        return reject({ status: res.statusCode, message: `HTTP Error ${res.statusCode}` });
      }

      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(rawData)); } 
        catch (e) { reject({ status: 500, message: "JSON Parse Error" }); }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(timeoutMs, () => { req.destroy(); reject({ status: 504, name: 'AbortError', message: 'Timeout' }); });
  });
};

// --- ANILIST HELPER ---
const fetchAniListBatch = async (malIds: number[]) => {
  if (!malIds || malIds.length === 0) return {};

  const query = `
    query($malIds: [Int]) {
      Page(page: 1, perPage: 50) {
        media(idMal_in: $malIds, type: ANIME) {
          id
          idMal
          title { romaji english }
          coverImage { large extraLarge }
          episodes
          format
          status
          genres
          season
          seasonYear
          description
          studios { nodes { name isAnimationStudio } }
          averageScore
          startDate { year }
        }
      }
    }
  `;

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables: { malIds } })
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate Limited");
    throw new Error(`AniList HTTP Error ${response.status}`);
  }

  const json = await response.json();
  const mediaList = json.data?.Page?.media || [];
  
  const anilistData: any = {};
  mediaList.forEach((media: any) => {
    if (media.idMal) anilistData[media.idMal] = media;
  });

  return anilistData;
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

    const { data: allEntries, error: fetchError } = await supabase
      .from("watchlist_entries")
      .select("id, mal_id, title, poster_url, status, watched_episodes, title_english, title_romaji")
      .eq("user_id", user.id);

    if (fetchError) throw new Error(`Failed to fetch watchlist: ${fetchError.message}`);
    if (!allEntries || allEntries.length === 0) return NextResponse.json({ enriched: 0, remaining: 0 });

    const malIds = allEntries.map(e => e.mal_id);
    const existingMalIds = new Set<number>();
    
    const malIdChunks = chunkArray(malIds, 300);
    for (const chunk of malIdChunks) {
      const { data: existingMeta, error: metaFetchError } = await supabaseAdmin
        .from("anime_metadata")
        .select("mal_id")
        .in("mal_id", chunk);

      if (metaFetchError) throw new Error(`Failed to fetch metadata: ${metaFetchError.message}`);
      existingMeta?.forEach(m => existingMalIds.add(m.mal_id));
    }

    // BACK TO 20! We will handle Vercel timeouts dynamically below.
    const pendingEntries = allEntries.filter(
      e => !e.poster_url || !existingMalIds.has(e.mal_id)
    ).slice(0, 20);

    if (pendingEntries.length === 0) return NextResponse.json({ enriched: 0, remaining: 0 });

    console.log(`\n--- STARTING HYBRID BATCH OF ${pendingEntries.length} ANIME ---`);
    let enrichedCount = 0;

    await delay(700);

    let anilistData: any = {};
    try {
      const batchIds = pendingEntries.map(e => e.mal_id);
      anilistData = await fetchAniListBatch(batchIds);
    } catch (err: any) {
      console.error(`[ENRICH] AniList Fetch Error:`, err.message || err);
      if (err.message === "Rate Limited") {
        return NextResponse.json({ error: "Rate Limited" }, { status: 429 });
      }
      console.warn(`[ENRICH] AniList is down or errored. Forcing Jikan fallback for this batch.`);
    }

    const metadataUpserts: any[] = [];
    const watchListUpdates: any[] = [];
    
    // --- DYNAMIC SAFETY LIMITS ---
    const MAX_JIKAN_REQUESTS = 5;
    let jikanRequestsMade = 0;

    for (const entry of pendingEntries) {
      const media = anilistData[entry.mal_id];
      let metadata: any = null;
      let jikanErrorStatus: number | null = null;
      
      let poster_url = null;
      let total_episodes = null;
      let title_english = null;
      let title_romaji = null;

      if (media) {
        // --- 1. ANILIST SUCCESS (Instant) ---
        poster_url = media.coverImage?.extraLarge || media.coverImage?.large || entry.poster_url;
        total_episodes = media.episodes;
        title_english = media.title?.english;
        title_romaji = media.title?.romaji;
        
        metadata = {
          mal_id: media.idMal,
          anilist_id: media.id,
          title: title_romaji || entry.title,
          title_english: title_english || null,
          title_romaji: title_romaji || null,
          genres: media.genres || [],
          type: media.format || "Unknown",
          season: media.season || null,
          airing_status: media.status || null,
          studio: media.studios?.nodes?.find((s: any) => s.isAnimationStudio)?.name || media.studios?.nodes?.[0]?.name || null,
          year: media.seasonYear || media.startDate?.year || null,
          total_episodes: total_episodes || null,
          synopsis: media.description ? media.description.replace(/<[^>]*>?/gm, '') : null,
          poster_url: poster_url,
          cached_at: new Date().toISOString(),
          anilist_raw: media, // Save AniList data here
          jikan_raw: null     // Ensure Jikan is null
        };

        console.log(`[ENRICH] AniList parsed ${entry.mal_id} (${title_romaji})`);
      } else {
        // --- 2. JIKAN FALLBACK (Slow, Requires Limit) ---
        
        // CHECK: Have we hit the Vercel 10s safety limit?
        if (jikanRequestsMade >= MAX_JIKAN_REQUESTS) {
          console.log(`[ENRICH] ⚠️ Vercel timeout safety limit reached. Deferring ${entry.mal_id} to the next batch.`);
          continue; // Skips to the next item in the loop without processing this one
        }
        
        jikanRequestsMade++; // Increment our safety counter
        
        console.log(`[ENRICH] Missing on AniList: ${entry.mal_id}. Falling back to Jikan...`);
        await delay(1100);

        try {
          const jRes = await fetchIPv4(`https://api.jikan.moe/v4/anime/${entry.mal_id}`);
          const jData = jRes.data;

          if (jData) {
            poster_url = jData.images?.jpg?.large_image_url || entry.poster_url;
            total_episodes = jData.episodes;
            title_english = jData.title_english;
            title_romaji = jData.title;

            const combinedGenres = Array.from(new Set([
              ...(jData.genres || []), ...(jData.explicit_genres || []),
              ...(jData.themes || []), ...(jData.demographics || [])
            ].map((g: any) => g.name)));

            metadata = {
              mal_id: entry.mal_id,
              anilist_id: null,
              title: title_romaji || entry.title,
              title_english: title_english || null,
              title_romaji: title_romaji || null,
              genres: combinedGenres,
              type: jData.type || "Unknown",
              season: jData.season || null,
              airing_status: jData.status || null,
              studio: jData.studios?.[0]?.name || null,
              year: jData.year || null,
              total_episodes: total_episodes || null,
              synopsis: jData.synopsis || null,
              poster_url: poster_url,
              cached_at: new Date().toISOString(),
              jikan_raw: jData,   // RESTORED: Save Jikan data here
              anilist_raw: null   // FIX: Keep this null so the UI doesn't get confused
            };
            console.log(`[ENRICH] Jikan fallback successful for ${entry.mal_id}`);
          }
        } catch (err: any) {
          jikanErrorStatus = err.status || 500;
          console.warn(`[ENRICH] Jikan fallback failed for ${entry.mal_id}:`, err.message);
        }
      }

      // --- 3. APPLY METADATA OR CACHE AS UNKNOWN SAFELY ---
      if (metadata) {
        metadataUpserts.push(metadata);

        const needsPosterUpdate = entry.poster_url !== poster_url;
        const needsEpisodeFix = entry.status === 'completed' && entry.watched_episodes === 0 && (total_episodes > 0);
        
        if (needsPosterUpdate || needsEpisodeFix || !entry.title_english) {
          const updateData: any = {};
          if (needsPosterUpdate) { updateData.poster_url = poster_url; updateData.total_episodes = total_episodes; }
          if (needsEpisodeFix) { updateData.watched_episodes = total_episodes; updateData.total_episodes = total_episodes; }
          updateData.title_english = title_english;
          updateData.title_romaji = title_romaji;
          watchListUpdates.push({ id: entry.id, updateData });
        }
        enrichedCount++;
      } else if (jikanErrorStatus === 404 || !jikanErrorStatus) {
        metadataUpserts.push({
          mal_id: entry.mal_id, title: entry.title, type: "Unknown", cached_at: new Date().toISOString()
        });
        enrichedCount++;
      }
    }

    if (metadataUpserts.length > 0) {
      const { error: upsertErr } = await supabaseAdmin
        .from("anime_metadata")
        .upsert(metadataUpserts, { onConflict: "mal_id" });
        
      if (upsertErr) throw new Error(`Metadata Upsert Error: ${upsertErr.message}`);
    }

    const updatePromises = watchListUpdates.map(async (update) => {
      const { error } = await supabase.from("watchlist_entries").update(update.updateData).eq("id", update.id);
      if (error) throw new Error(error.message);
      return update.id;
    });

    const updateResults = await Promise.allSettled(updatePromises);
    updateResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Watchlist Update Error for ID ${watchListUpdates[index].id}:`, result.reason);
      }
    });

    const totalMissing = allEntries.filter(e => !e.poster_url || !existingMalIds.has(e.mal_id)).length;
    // We adjust remaining count slightly to account for skipped entries
    const remaining = Math.max(0, totalMissing - enrichedCount);
    
    return NextResponse.json({ enriched: enrichedCount, remaining });
  } catch (error: any) {
    console.error("\n[ENRICH] FATAL ERROR:", error.message || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: allEntries } = await supabase.from("watchlist_entries").select("mal_id, poster_url").eq("user_id", user.id);
    if (!allEntries) return NextResponse.json({ remaining: 0 });

    const malIds = allEntries.map(e => e.mal_id);
    const existingMalIds = new Set<number>();

    // FIX: Apply the same chunking fix here to prevent URI Too Long crashes on GET
    const malIdChunks = chunkArray(malIds, 300);
    for (const chunk of malIdChunks) {
      const { data: existingMeta } = await supabaseAdmin
        .from("anime_metadata")
        .select("mal_id")
        .in("mal_id", chunk);
        
      existingMeta?.forEach(m => existingMalIds.add(m.mal_id));
    }

    const remaining = allEntries.filter(e => !e.poster_url || !existingMalIds.has(e.mal_id)).length;

    return NextResponse.json({ remaining });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}