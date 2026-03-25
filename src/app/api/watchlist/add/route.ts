import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Verify Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // 2. Parse Payload
    const body = await req.json();
    const { mal_id, title, status, score, watched_episodes, total_episodes, poster_url } = body;

    if (!mal_id || !title || !status) {
      return NextResponse.json({ error: "Missing required fields (mal_id, title, status)." }, { status: 400 });
    }

    // 3. Check if anime is already in the user's watchlist
    const { data: existingEntry, error: checkError } = await supabase
      .from("watchlist_entries")
      .select("id")
      .eq("user_id", user.id)
      .eq("mal_id", mal_id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 means "No rows found", which is what we want. Any other error is a real database error.
      throw checkError;
    }

    if (existingEntry) {
      return NextResponse.json(
        { error: "This anime is already in your watchlist!" },
        { status: 409 } // 409 Conflict
      );
    }

    // 4. Insert into watchlist
    const { error: insertError } = await supabase
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
      });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, message: "Anime added successfully!" });
  } catch (error: any) {
    console.error("Add to watchlist error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}