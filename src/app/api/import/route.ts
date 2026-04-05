import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Verify Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Payload
    const body = await req.json();
    const { entries } = body;

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: "Invalid payload: 'entries' array is required." }, { status: 400 });
    }

    if (entries.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // 3. Attach user_id and fix MAL "Completed = 0 episodes" export bug
    const entriesWithUser = entries.map((entry) => {
      let watched = entry.watched_episodes || 0;
      
      // If MAL exported a completed show with 0 watched episodes, force it to the known total
      if (entry.status === 'completed' && watched === 0 && entry.total_episodes > 0) {
        watched = entry.total_episodes;
      }

      return {
        ...entry,
        title_romaji: entry.title,
        watched_episodes: watched,
        user_id: user.id,
      };
    });

    // 4. Bulk Upsert
    const { error: upsertError } = await supabase
      .from("watchlist_entries")
      .upsert(entriesWithUser, {
        onConflict: "user_id,mal_id",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error("Import upsert error:", upsertError);
      throw new Error(`Database error: ${upsertError.message}`);
    }

    return NextResponse.json({ success: true, count: entries.length });
  } catch (error: any) {
    console.error("Import API error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 });
  }
}