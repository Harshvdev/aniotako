import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Attempt to fetch current configurations
  let { data, error } = await supabase
    .from("user_preferences")
    .select("notification_format, countdown_enabled, title_language, show_adult, notify_watching_only, email_notifications, timezone")
    .eq("user_id", user.id)
    .single();

  // If preferences entry missing, initialize default row for user instance
  if (error && error.code === "PGRST116") {
    const { data: newPrefs, error: insertError } = await supabase
      .from("user_preferences")
      .insert({ user_id: user.id })
      .select("notification_format, countdown_enabled, title_language, show_adult, notify_watching_only, email_notifications, timezone")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    data = newPrefs;
  } else if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const { notification_format, countdown_enabled, title_language, show_adult, timezone } = body;
    const updates: Record<string, any> = {};

    if (notification_format !== undefined) updates.notification_format = notification_format;
    if (countdown_enabled !== undefined) updates.countdown_enabled = countdown_enabled;
    if (title_language !== undefined) updates.title_language = title_language;
    if (show_adult !== undefined) updates.show_adult = show_adult;
    if (timezone !== undefined) updates.timezone = timezone;

    const { data, error } = await supabase
      .from("user_preferences")
      .upsert(
        { user_id: user.id, ...updates },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid Request Body" }, { status: 400 });
  }
}