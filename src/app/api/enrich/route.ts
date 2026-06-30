import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunked = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
};

// GET: Returns the list of watchlist entries that need enrichment
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all watchlist entries for the user
    const { data: allEntries, error: fetchError } = await supabase
      .from("watchlist_entries")
      .select("id, mal_id, title, status, watched_episodes, poster_url, title_english, title_romaji")
      .eq("user_id", user.id);

    if (fetchError) throw new Error(`Failed to fetch watchlist: ${fetchError.message}`);
    if (!allEntries || allEntries.length === 0) {
      return NextResponse.json({ remaining: 0, pendingEntries: [] });
    }

    const malIds = allEntries.map(e => e.mal_id);
    const existingMalIds = new Set<number>();

    // Chunk to prevent URI Too Long crashes on query
    const malIdChunks = chunkArray(malIds, 300);
    for (const chunk of malIdChunks) {
      const { data: existingMeta, error: metaFetchError } = await supabaseAdmin
        .from("anime_metadata")
        .select("mal_id")
        .in("mal_id", chunk);

      if (metaFetchError) throw new Error(`Failed to fetch metadata: ${metaFetchError.message}`);
      existingMeta?.forEach(m => existingMalIds.add(m.mal_id));
    }

    // Filter entries that are missing poster_url OR do not have metadata cached
    const pendingEntries = allEntries.filter(
      e => !e.poster_url || !existingMalIds.has(e.mal_id)
    );

    return NextResponse.json({
      remaining: pendingEntries.length,
      pendingEntries
    });
  } catch (error: any) {
    console.error("[ENRICH GET] Fatal Error:", error.message || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Accepts resolved metadata from the client and saves it to the database
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { enrichments } = body;

    if (!enrichments || !Array.isArray(enrichments) || enrichments.length === 0) {
      return NextResponse.json({ error: "Invalid or empty enrichments array" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const metadataUpserts: any[] = [];
    const watchListUpdates: any[] = [];

    for (const item of enrichments) {
      const { mal_id, metadata, poster_url, total_episodes, title_english, title_romaji, watchlist_id } = item;

      if (!mal_id) continue;

      // 1. Prepare metadata upsert
      const statusUpper = metadata.airing_status?.toUpperCase();
      const isFinished = statusUpper === "FINISHED" || statusUpper === "FINISHED AIRING" || statusUpper === "CANCELLED";

      metadataUpserts.push({
        ...metadata,
        mal_id,
        cached_at: new Date().toISOString(),
        ...(isFinished ? {
          raw_air_at: null,
          sub_air_at: null,
          dub_air_at: null,
          raw_next_episode_number: null,
          sub_next_episode_number: null,
          dub_next_episode_number: null,
          next_episode_number: null,
          next_airing_at: null,
        } : {})
      });

      // 2. Prepare watchlist updates if necessary
      if (watchlist_id) {
        const updateData: any = {};
        let hasUpdates = false;

        if (poster_url) {
          updateData.poster_url = poster_url;
          hasUpdates = true;
        }
        if (total_episodes !== undefined && total_episodes !== null) {
          updateData.total_episodes = total_episodes;
          hasUpdates = true;
        }
        if (title_english) {
          updateData.title_english = title_english;
          hasUpdates = true;
        }
        if (title_romaji) {
          updateData.title_romaji = title_romaji;
          hasUpdates = true;
        }

        // Handle the episode correction case: completed but 0 episodes watched
        // (Only apply if we have a valid total_episodes count)
        if (item.status === 'completed' && item.watched_episodes === 0 && total_episodes > 0) {
          updateData.watched_episodes = total_episodes;
          updateData.total_episodes = total_episodes;
          hasUpdates = true;
        }

        if (hasUpdates) {
          watchListUpdates.push({ id: watchlist_id, updateData });
        }
      }
    }

    // Perform bulk upsert of metadata
    if (metadataUpserts.length > 0) {
      const { error: upsertErr } = await supabaseAdmin
        .from("anime_metadata")
        .upsert(metadataUpserts, { onConflict: "mal_id" });

      if (upsertErr) {
        throw new Error(`Metadata Upsert Error: ${upsertErr.message}`);
      }
    }

    // Perform parallel updates to watchlist entries
    if (watchListUpdates.length > 0) {
      const updatePromises = watchListUpdates.map(async (update) => {
        const { error } = await supabase
          .from("watchlist_entries")
          .update(update.updateData)
          .eq("id", update.id);
        if (error) throw new Error(error.message);
        return update.id;
      });

      const results = await Promise.allSettled(updatePromises);
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`[ENRICH POST] Watchlist Update Failed for ID ${watchListUpdates[index].id}:`, result.reason);
        }
      });
    }

    return NextResponse.json({ success: true, enrichedCount: enrichments.length });
  } catch (error: any) {
    console.error("[ENRICH POST] Fatal Error:", error.message || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}