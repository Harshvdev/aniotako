import { NextResponse } from "next/server";

// Module-level variable to track the last request time
let lastRequestTime = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "Search term is required" }, { status: 400 });
  }

  // 1. Throttle logic: Ensure at least 500ms between requests
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  
  if (timeSinceLast < 500) {
    // Wait for the remainder of the 500ms window
    await new Promise((resolve) => setTimeout(resolve, 500 - timeSinceLast));
  }
  
  // Update the timestamp to the current time *after* any waiting
  lastRequestTime = Date.now();

  try {
    // 2. Fetch from Jikan
    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=10&sfw=true`);
    
    if (res.status === 429) {
      return NextResponse.json({ error: "Rate limited by Jikan API" }, { status: 429 });
    }

    if (!res.ok) {
      throw new Error(`Jikan API responded with status: ${res.status}`);
    }

    const json = await res.json();
    
    // 3. Return only the data array
    return NextResponse.json(json.data || []);
  } catch (error: any) {
    console.error("Jikan search proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch search results" }, { status: 500 });
  }
}