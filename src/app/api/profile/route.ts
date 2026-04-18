import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { display_name } = await req.json();
    
    if (!display_name || display_name.trim().length === 0) {
      return NextResponse.json({ error: "Display name cannot be empty." }, { status: 400 });
    }
    if (display_name.trim().length > 30) {
      return NextResponse.json({ error: "Display name must be 30 characters or less." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("profiles")
      .upsert({ 
        id: user.id, 
        display_name: display_name.trim(),
      });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}