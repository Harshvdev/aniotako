import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("watchlist_entries")
      .delete()
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: "All entries deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}