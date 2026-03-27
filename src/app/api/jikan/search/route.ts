import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Base Jikan URL
    const jikanUrl = new URL("https://api.jikan.moe/v4/anime");
    
    // We only want 10 results max as requested
    jikanUrl.searchParams.set("limit", "10");
    jikanUrl.searchParams.set("sfw", "true"); // Safe for work (optional, but recommended)

    // Append all allowed parameters if they exist
    const q = searchParams.get("q");
    if (q) jikanUrl.searchParams.set("q", q);

    const type = searchParams.get("type");
    if (type && type !== "All") jikanUrl.searchParams.set("type", type.toLowerCase());

    const status = searchParams.get("status");
    if (status && status !== "All") jikanUrl.searchParams.set("status", status.toLowerCase());

    const rating = searchParams.get("rating");
    if (rating && rating !== "All") {
      // Map frontend values to Jikan values
      const ratingMap: Record<string, string> = {
        "G": "g", "PG": "pg", "PG-13": "pg13", "R-17+": "r17", "R+": "r", "Rx": "rx"
      };
      jikanUrl.searchParams.set("rating", ratingMap[rating] || "g");
    }

    const min_score = searchParams.get("min_score");
    if (min_score) jikanUrl.searchParams.set("min_score", min_score);

    const max_score = searchParams.get("max_score");
    if (max_score) jikanUrl.searchParams.set("max_score", max_score);

    const genres = searchParams.get("genres");
    if (genres) jikanUrl.searchParams.set("genres", genres); // Jikan expects comma-separated IDs

    const order_by = searchParams.get("order_by");
    if (order_by && order_by !== "All") {
      jikanUrl.searchParams.set("order_by", order_by.toLowerCase());
      jikanUrl.searchParams.set("sort", "desc"); // Always sort desc for score/popularity
    }

    const res = await fetch(jikanUrl.toString());
    if (!res.ok) throw new Error("Failed to fetch from Jikan");

    const data = await res.json();
    
    // Return just the array of anime to keep the frontend clean
    return NextResponse.json(data.data || []);
  } catch (error: any) {
    console.error("Jikan Search Proxy Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}