import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// In-memory rate limit: one clear-all per user per CLEAR_COOLDOWN_MS
// (resets on server restart, but prevents rapid-fire abuse within a process)
const CLEAR_COOLDOWN_MS = 60_000; // 60 seconds
const lastClearedAt = new Map<string, number>();

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Start fetching the true unread count in parallel
    const unreadCountPromise = supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .eq("is_cleared", false);

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_cleared", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data, error } = await query;
    if (error) throw error;

    const { count: trueUnreadCount, error: countError } = await unreadCountPromise;
    if (countError) throw countError;

    const totalUnreadCount = trueUnreadCount || 0;

    if (!data || data.length === 0) {
      return NextResponse.json({ notifications: [], unreadCount: totalUnreadCount });
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

    return NextResponse.json({ notifications: enrichedNotifications, unreadCount: totalUnreadCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Server-side rate limit: one clear per user per 60 s
    const last = lastClearedAt.get(user.id) ?? 0;
    const remaining = CLEAR_COOLDOWN_MS - (Date.now() - last);
    if (remaining > 0) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before clearing again.", retryAfterMs: remaining },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(remaining / 1000)) },
        }
      );
    }

    lastClearedAt.set(user.id, Date.now());

    await prisma.notifications.updateMany({
      where: {
        user_id: user.id,
      },
      data: {
        is_cleared: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}