import { NextResponse } from "next/server";
import https from "https";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Custom fetch wrapper that forces IPv4 resolution to prevent ENETUNREACH
const fetchIPv4 = (url: string, timeoutMs: number = 5000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4 }, (res) => { // family: 4 forces IPv4
      if (res.statusCode === 429) {
        return reject({ status: 429, message: "Rate Limited" });
      }
      if (res.statusCode !== 200) {
        return reject({ status: res.statusCode, message: `HTTP Error ${res.statusCode}` });
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject({ status: 500, message: "Failed to parse JSON response" });
        }
      });
    });

    req.on('error', (err) => reject(err));
    
    // Hard timeout implementation
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject({ name: 'AbortError', message: 'Request timed out' });
    });
  });
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jikanUrl = new URL("https://api.jikan.moe/v4/anime");
    
    jikanUrl.searchParams.set("limit", "10");
    jikanUrl.searchParams.set("sfw", "true");

    const q = searchParams.get("q");
    if (q) jikanUrl.searchParams.set("q", q);

    const type = searchParams.get("type");
    if (type && type !== "All") jikanUrl.searchParams.set("type", type.toLowerCase());

    const status = searchParams.get("status");
    if (status && status !== "All") jikanUrl.searchParams.set("status", status.toLowerCase());

    const rating = searchParams.get("rating");
    if (rating && rating !== "All") {
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
    if (genres) jikanUrl.searchParams.set("genres", genres);

    const order_by = searchParams.get("order_by");
    if (order_by && order_by !== "All") {
      jikanUrl.searchParams.set("order_by", order_by.toLowerCase());
      jikanUrl.searchParams.set("sort", "desc");
    }

    const MAX_RETRIES = 3;
    let lastError: any;

    console.log(`\n=========================================`);
    console.log(`[Search API] TARGET URL: ${jikanUrl.toString()}`);
    console.log(`=========================================`);

    for (let i = 0; i < MAX_RETRIES; i++) {
      const attemptStart = Date.now();
      try {
        console.log(`[Search API] Attempt ${i + 1} fetching via IPv4...`);
        
        // Using our custom IPv4 fetcher
        const data = await fetchIPv4(jikanUrl.toString(), 5000);
        
        console.log(`[Search API] Attempt ${i + 1} SUCCESS (Took ${Date.now() - attemptStart}ms)`);
        
        // Cache the response locally for 1 hour using Next.js caching strategy
        return NextResponse.json(data.data || [], {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=59',
          },
        });

      } catch (err: any) {
        const duration = Date.now() - attemptStart;
        lastError = err;

        console.error(`\n[Search API] ❌ Attempt ${i + 1} FAILED after ${duration}ms`);
        console.error(`   -> Error:`, err.message || err);
        console.error(`-----------------------------------------\n`);

        if (err.status === 429) {
          console.warn(`[Search API] Rate limited. Retrying...`);
          await delay(1000 * (i + 1));
          continue;
        }

        if (i === MAX_RETRIES - 1) break;
        await delay(800 * (i + 1));
      }
    }

    throw lastError;

  } catch (error: any) {
    console.error("[Search API] Final Crash Reached.", error);
    return NextResponse.json({ error: "Failed to connect to anime database." }, { status: 504 });
  }
}