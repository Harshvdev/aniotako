import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    // THE FIX: Fetch bilingual titles from anime_metadata to support user preferences
    const malIds = data.map(n => n.mal_id);
    const { data: metaData } = await supabase
      .from("anime_metadata")
      .select("mal_id, title_english, title_romaji")
      .in("mal_id", malIds);

    // Stitch the metadata into the notifications
    const enrichedNotifications = data.map(notif => {
      const meta = metaData?.find(m => m.mal_id === notif.mal_id);
      return {
        ...notif,
        anime_metadata: meta ? {
          title_english: meta.title_english,
          title_romaji: meta.title_romaji
        } : undefined
      };
    });

    return NextResponse.json({ notifications: enrichedNotifications, unreadCount: count || 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}