import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 300): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries > 0) {
      console.warn(`[ADD API] Operation failed, retrying in ${delay}ms... Retries left: ${retries}`, err.message || err);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Verify Authentication
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // 2. Parse Payload
    const body = await req.json();
    const { mal_id, title, status, score, watched_episodes, total_episodes, poster_url, anilist_id } = body;

    if (!mal_id || !title || !status) {
      return NextResponse.json({ error: "Missing required fields (mal_id, title, status)." }, { status: 400 });
    }

    // 3. Check if anime is already in the user's watchlist
    const existingEntry = await retry(async () => {
      const { data, error } = await supabase
        .from("watchlist_entries")
        .select("id")
        .eq("user_id", user.id)
        .eq("mal_id", mal_id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }
      return data;
    });

    if (existingEntry) {
      return NextResponse.json(
        { error: "This anime is already in your watchlist!" },
        { status: 409 }
      );
    }

    // 3.5. Ensure anime_metadata record exists to satisfy foreign key fk_watchlist_metadata
    const metaExists = await retry(async () => {
      const { data, error } = await supabase
        .from("anime_metadata")
        .select("mal_id")
        .eq("mal_id", mal_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    });

    if (!metaExists) {
      const { createClient: createAdminClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await retry(async () => {
        const { error } = await supabaseAdmin
          .from("anime_metadata")
          .insert({
            mal_id: Number(mal_id),
            anilist_id: anilist_id ? Number(anilist_id) : null,
            title: title,
            poster_url: poster_url || null,
            type: "TV",
            genres: [],
            cached_at: new Date().toISOString(),
          });

        if (error) throw error;
      });
    }

    // 4. Insert into watchlist
    const newEntry = await retry(async () => {
      const { data, error } = await supabase
        .from("watchlist_entries")
        .insert({
          user_id: user.id,
          mal_id,
          title,
          status,
          score: score > 0 ? score : null,
          watched_episodes: watched_episodes || 0,
          total_episodes: total_episodes || null,
          poster_url: poster_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    });

    return NextResponse.json({ success: true, entry: newEntry });
  } catch (error: any) {
    console.error("Add to watchlist error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}