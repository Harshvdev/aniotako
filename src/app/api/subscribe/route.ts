import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Verify User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Subscription Object
    const subscription = await req.json();
    const { endpoint, keys } = subscription;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
    }

    // 3. Upsert into Supabase
    // Uses the endpoint as the unique identifier so users don't get duplicate rows 
    // if they re-subscribe on the same device.
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        user_id: user.id,
        endpoint: endpoint,
        p256dh: keys.p256dh,
        auth_key: keys.auth,
      }, {
        onConflict: "endpoint"
      });

    if (error) {
      console.error("Failed to save subscription:", error);
      throw new Error("Database error while saving subscription.");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Subscription API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}