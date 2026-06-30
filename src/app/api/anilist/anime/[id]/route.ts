import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnimeDetails } from "@/lib/anime";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const mal_id = parseInt(params.id, 10);
    
    if (isNaN(mal_id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const supabase = await createClient();

    // 1. Fetch details using the shared helper
    const anilistData = await getAnimeDetails(mal_id);

    if (anilistData && anilistData.error) {
      if (anilistData.error === "rate_limited") {
        return NextResponse.json({ error: "rate_limited", retryAfter: anilistData.retryAfter }, { status: 429 });
      }
      return NextResponse.json({ error: "network_error" }, { status: 504 });
    }

    if (!anilistData) {
      return NextResponse.json({ error: "Not found on AniList" }, { status: 404 });
    }

    // 2. Fetch metadata row to build the merged payload
    const { data: meta } = await supabase
      .from("anime_metadata")
      .select("*")
      .eq("mal_id", mal_id)
      .single();

    // 3. Setup next episode information
    const nextEpisodeNumber =
      meta?.raw_next_episode_number ??
      meta?.next_episode_number ??
      meta?.next_episode_num ??
      anilistData?.nextAiringEpisode?.episode ??
      null;

    // 4. Build Final Combined Payload
    const mergedAnime = {
      ...anilistData,
      anime_metadata: meta ? {
        raw_air_at: meta.raw_air_at,
        sub_air_at: meta.sub_air_at,
        dub_air_at: meta.dub_air_at,
        raw_next_episode_number: meta.raw_next_episode_number ?? null,
        sub_next_episode_number: meta.sub_next_episode_number ?? null,
        dub_next_episode_number: meta.dub_next_episode_number ?? null,
        next_airing_at: meta.next_airing_at,
        next_episode_number: nextEpisodeNumber,
        schedule_updated_at: meta.schedule_updated_at,
      } : null,
    };

    return NextResponse.json(mergedAnime);

  } catch (error: any) {
    console.error("[API] Fatal AniList Proxy Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}