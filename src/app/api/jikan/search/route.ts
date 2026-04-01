import { NextResponse } from "next/server";
import https from "https";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Custom fetch wrapper that forces IPv4 resolution to prevent ENETUNREACH
const fetchIPv4 = (url: string, timeoutMs: number = 5000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4 }, (res) => {
      if (res.statusCode === 429) return reject({ status: 429, message: "Rate Limited" });
      if (res.statusCode !== 200) return reject({ status: res.statusCode, message: `HTTP Error ${res.statusCode}` });

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } 
        catch (e) { reject({ status: 500, message: "Failed to parse JSON" }); }
      });
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(timeoutMs, () => { req.destroy(); reject({ name: 'AbortError', message: 'Request timed out' }); });
  });
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jikanUrl = new URL("https://api.jikan.moe/v4/anime");
    
    // INCREASED LIMIT TO 20
    jikanUrl.searchParams.set("limit", "20");
    jikanUrl.searchParams.set("sfw", "true");

    // NEW: Pagination
    const page = searchParams.get("page") || "1";
    jikanUrl.searchParams.set("page", page);

    const q = searchParams.get("q");
    if (q) jikanUrl.searchParams.set("q", q);

    const type = searchParams.get("type");
    if (type && type !== "All") jikanUrl.searchParams.set("type", type.toLowerCase());

    const status = searchParams.get("status");
    if (status && status !== "All") jikanUrl.searchParams.set("status", status.toLowerCase());

    const rating = searchParams.get("rating");
    if (rating && rating !== "All") {
      const ratingMap: Record<string, string> = { "G": "g", "PG": "pg", "PG-13": "pg13", "R-17+": "r17", "R+": "r", "Rx": "rx" };
      jikanUrl.searchParams.set("rating", ratingMap[rating] || "g");
    }

    const min_score = searchParams.get("min_score");
    if (min_score) jikanUrl.searchParams.set("min_score", min_score);
    const max_score = searchParams.get("max_score");
    if (max_score) jikanUrl.searchParams.set("max_score", max_score);

    const genres = searchParams.get("genres");
    if (genres) jikanUrl.searchParams.set("genres", genres);

    const order_by = searchParams.get("order_by");
    if (order_by && order_by !== "All") {
      jikanUrl.searchParams.set("order_by", order_by.toLowerCase());
      jikanUrl.searchParams.set("sort", "desc");
    }

    const MAX_RETRIES = 3;
    let lastError: any;

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const data = await fetchIPv4(jikanUrl.toString(), 5000);
        
        // NEW: Return both data and pagination details
        return NextResponse.json({
          data: data.data || [],
          pagination: {
            has_next_page: data.pagination?.has_next_page || false,
            current_page: parseInt(page, 10)
          }
        }, {
          headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=59' },
        });

      } catch (err: any) {
        lastError = err;
        if (err.status === 429) {
          await delay(1000 * (i + 1));
          continue;
        }
        if (i === MAX_RETRIES - 1) break;
        await delay(800 * (i + 1));
      }
    }
    throw lastError;

  } catch (error: any) {
    return NextResponse.json({ error: "Failed to connect to anime database." }, { status: 504 });
  }
}