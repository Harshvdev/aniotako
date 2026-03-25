import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Verify Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: "Invalid payload. 'id' and 'updates' object are required." }, { status: 400 });
    }

    // 2. Perform the Update
    // The .eq("user_id", user.id) is a critical security check to ensure 
    // users can't modify someone else's watchlist by guessing their row ID.
    const { data, error } = await supabase
      .from("watchlist_entries")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Database update error:", error);
      throw new Error("Failed to update entry.");
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Watchlist update API error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 });
  }
}