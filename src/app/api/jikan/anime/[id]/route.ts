import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin Client (Bypasses RLS - NEVER expose this to the browser)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Await params for Next.js 15+ compatibility
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid Anime ID" }, { status: 400 });
  }

  try {
    // 1. Check Supabase cache first
    // Calculate the ISO timestamp for exactly 7 days ago
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: cachedAnime, error: cacheError } = await supabaseAdmin
      .from("anime_metadata")
      .select("*")
      .eq("mal_id", id)
      .gte("cached_at", sevenDaysAgo)
      .single();

    // If we have a fresh cache hit, return it immediately!
    if (cachedAnime) {
      return NextResponse.json(cachedAnime);
    }

    // 2. If not found or stale, fetch from Jikan
    const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`);

    if (res.status === 429) {
      return NextResponse.json({ error: "Rate limited by Jikan API" }, { status: 429 });
    }

    if (res.status === 404) {
      return NextResponse.json({ error: "Anime not found" }, { status: 404 });
    }

    if (!res.ok) {
      throw new Error(`Jikan API responded with status: ${res.status}`);
    }

    const { data } = await res.json();

    // 3. Map Jikan's massive payload down to exactly what our schema needs
    const mappedData = {
      mal_id: data.mal_id,
      title: data.title,
      genres: data.genres?.map((g: any) => g.name) || [],
      type: data.type || "Unknown",
      studio: data.studios?.[0]?.name || null,
      year: data.year || null,
      total_episodes: data.episodes || null,
      synopsis: data.synopsis || null,
      poster_url: data.images?.jpg?.large_image_url || null,
      cached_at: new Date().toISOString(),
    };

    // 4. Upsert the fresh data into Supabase
    const { error: upsertError } = await supabaseAdmin
      .from("anime_metadata")
      .upsert(mappedData);

    if (upsertError) {
      console.error("Failed to cache anime metadata:", upsertError);
      // We log the error but DO NOT throw. We still want to return the fetched data to the user.
    }

    // 5. Return the newly fetched and formatted data
    return NextResponse.json(mappedData);
  } catch (error: any) {
    console.error("Jikan anime proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch anime details" }, { status: 500 });
  }
}