import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Helper for polite rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Verify Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Fetch up to 20 entries missing a poster_url
    const { data: pendingEntries, count } = await supabase
      .from("watchlist_entries")
      .select("id, mal_id, title", { count: "exact" })
      .eq("user_id", user.id)
      .is("poster_url", null)
      .limit(20);

    if (!pendingEntries || pendingEntries.length === 0) {
      return NextResponse.json({ enriched: 0, remaining: 0 });
    }

    // Initialize Admin client to bypass RLS for the shared anime_metadata table
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let enrichedCount = 0;

    // 3. Process each entry
    for (const entry of pendingEntries) {
      await delay(400); // 400ms delay to respect Jikan's 3 requests/sec limit

      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${entry.mal_id}`);
        
        // Handle rate limiting gracefully
        if (res.status === 429) {
          console.warn("Jikan rate limit hit, pausing for 1.5s...");
          await delay(1500);
          continue; // Skip this one for now, it'll get picked up in the next batch
        }
        
        if (!res.ok) continue;

        const { data } = await res.json();
        if (!data) continue;

        const poster_url = data.images?.jpg?.large_image_url || null;
        const total_episodes = data.episodes || null;

        const metadata = {
          mal_id: data.mal_id,
          title: data.title || entry.title,
          genres: data.genres?.map((g: any) => g.name) || [],
          type: data.type || "Unknown",
          studio: data.studios?.[0]?.name || null,
          year: data.year || null,
          total_episodes: total_episodes,
          synopsis: data.synopsis || null,
          poster_url: poster_url,
          cached_at: new Date().toISOString(),
        };

        // 4. Update the user's specific watchlist entry
        await supabase
          .from("watchlist_entries")
          .update({ poster_url, total_episodes })
          .eq("id", entry.id);

        // 5. Upsert the global metadata cache
        await supabaseAdmin.from("anime_metadata").upsert(metadata);

        enrichedCount++;
      } catch (err) {
        console.error(`Failed to enrich anime ${entry.mal_id}:`, err);
      }
    }

    // Calculate how many are left overall
    const remaining = Math.max(0, (count || 0) - pendingEntries.length);

    return NextResponse.json({ enriched: enrichedCount, remaining });
  } catch (error: any) {
    console.error("Enrich API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Use { count: 'exact', head: true } to get the number of rows without downloading the actual data
    const { count, error } = await supabase
      .from("watchlist_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("poster_url", null);

    if (error) throw error;

    return NextResponse.json({ remaining: count || 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}