import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Force Next.js to NEVER cache this route
export const dynamic = 'force-dynamic';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      .select("id, mal_id, title, poster_url")
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
        const res = await fetch(`https://api.jikan.moe/v4/anime/${entry.mal_id}`);
        
        if (res.status === 429) {
          console.warn(`[ENRICH] Rate Limit Hit! Breaking batch.`);
          break; 
        }

        if (!res.ok) {
          const { error: placeholderErr } = await supabaseAdmin.from("anime_metadata").upsert({
            mal_id: entry.mal_id, title: entry.title, type: "Unknown", cached_at: new Date().toISOString()
          });
          if (placeholderErr) throw new Error(`Placeholder DB Error: ${placeholderErr.message}`);
          enrichedCount++;
          continue;
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const { error: htmlErr } = await supabaseAdmin.from("anime_metadata").upsert({
            mal_id: entry.mal_id, title: entry.title, type: "Unknown", cached_at: new Date().toISOString()
          });
          if (htmlErr) throw new Error(`HTML Fallback DB Error: ${htmlErr.message}`);
          enrichedCount++; 
          continue;
        }

        const { data } = await res.json();
        if (!data) continue;

        const poster_url = data.images?.jpg?.large_image_url || entry.poster_url;

        const metadata = {
          mal_id: data.mal_id,
          title: data.title || entry.title,
          genres: data.genres?.map((g: any) => g.name) || [],
          type: data.type || "Unknown",
          season: data.season || null,
          airing_status: data.status || null,
          studio: data.studios?.[0]?.name || null,
          year: data.year || null,
          total_episodes: data.episodes || null,
          synopsis: data.synopsis || null,
          poster_url: poster_url,
          cached_at: new Date().toISOString(),
        };

        if (entry.poster_url !== poster_url) {
          const { error: updateErr } = await supabase
            .from("watchlist_entries")
            .update({ poster_url, total_episodes: data.episodes })
            .eq("id", entry.id);
          
          if (updateErr) throw new Error(`Watchlist Update Error: ${updateErr.message}`);
        }

        const { error: upsertErr } = await supabaseAdmin.from("anime_metadata").upsert(metadata);
        if (upsertErr) throw new Error(`Metadata Upsert Error: ${upsertErr.message}`);

        console.log(`[ENRICH] Successfully saved ${entry.mal_id}`);
        enrichedCount++;

      } catch (err) {
        // THIS IS THE CRITICAL LOG: It will now print the EXACT database failure reason!
        console.error(`[ENRICH] Hard Crash on ${entry.mal_id}:`, err);
      }
    }

    const totalMissing = allEntries.filter(e => !e.poster_url || !existingMalIds.has(e.mal_id)).length;
    const remaining = Math.max(0, totalMissing - enrichedCount);
    
    console.log(`--- BATCH COMPLETE. Processed: ${enrichedCount}. Remaining: ${remaining} ---\n`);

    return NextResponse.json({ enriched: enrichedCount, remaining });
  } catch (error: any) {
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
    const { data: existingMeta } = await supabaseAdmin.from("anime_metadata").select("mal_id").in("mal_id", malIds);
      
    const existingMalIds = new Set(existingMeta?.map(m => m.mal_id) || []);
    const remaining = allEntries.filter(e => !e.poster_url || !existingMalIds.has(e.mal_id)).length;

    return NextResponse.json({ remaining });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}