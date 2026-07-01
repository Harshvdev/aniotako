import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const user = await getAuthUser(req);
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { data: entries, error } = await supabase
      .from("watchlist_entries")
      .select("mal_id, title, status, score, watched_episodes, total_episodes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Format as a downloadable JSON file
    const json = JSON.stringify({ exported_at: new Date().toISOString(), total: entries.length, entries }, null, 2);
    
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="aniotako-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}