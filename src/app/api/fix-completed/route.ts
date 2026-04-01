import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  // Secure this route using your CRON_SECRET environment variable
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized. Invalid secret." }, { status: 401 });
  }

  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch all buggy rows
    const { data: buggyRows, error: fetchError } = await supabaseAdmin
      .from("watchlist_entries")
      .select("id, total_episodes, title")
      .eq("status", "completed")
      .eq("watched_episodes", 0)
      .gt("total_episodes", 0);

    if (fetchError) throw fetchError;

    if (!buggyRows || buggyRows.length === 0) {
      return NextResponse.json({ message: "Database is perfectly clean! No records to fix." });
    }

    let fixedCount = 0;

    // 2. Loop through and update them
    for (const row of buggyRows) {
      const { error: updateError } = await supabaseAdmin
        .from("watchlist_entries")
        .update({ watched_episodes: row.total_episodes })
        .eq("id", row.id);
      
      if (!updateError) fixedCount++;
    }

    return NextResponse.json({ 
      message: `Successfully fixed ${fixedCount} completed entries.`, 
      fixedCount,
      fixedTitles: buggyRows.map(r => r.title)
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}