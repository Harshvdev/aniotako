import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Verify User
    const user = await getAuthUser(req);
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

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to delete subscription:", error);
      throw new Error("Database error while deleting subscription.");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Unsubscribe API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}