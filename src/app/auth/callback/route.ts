import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  // The 'next' param is useful if you want to redirect them to a specific page they were trying to access.
  // We default to '/watchlist' if it's a brand new signup.
  const next = requestUrl.searchParams.get("next") ?? "/watchlist";

  if (code) {
    const supabase = await createClient();
    
    // Exchange the auth code for a valid session token
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If successful, redirect them to the intended page
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } else {
      console.error("Auth callback error:", error.message);
    }
  }

  // If there's no code, or if the exchange failed, redirect to login with an error
  return NextResponse.redirect(new URL("/login?error=Could not verify your email. The link may have expired.", requestUrl.origin));
}