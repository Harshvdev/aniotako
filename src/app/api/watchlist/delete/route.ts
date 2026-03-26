import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Verify Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Get the ID from the URL (e.g., /api/watchlist/delete?id=123)
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing anime ID" }, { status: 400 });

    // 3. Delete from database (Ensure the user owns this row!)
    const { error } = await supabase
      .from("watchlist_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}