import { NextResponse } from "next/server";

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const cacheMap = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

const SEARCH_QUERY = `
  query ($page: Int, $perPage: Int, $search: String, $type: MediaType, $format: MediaFormat, $status: MediaStatus, $genre_in: [String], $tag_in: [String], $sort: [MediaSort], $isAdult: Boolean, $averageScore_greater: Int, $averageScore_lesser: Int, $season: MediaSeason, $seasonYear: Int, $countryOfOrigin: CountryCode, $startDate_greater: FuzzyDateInt, $endDate_lesser: FuzzyDateInt) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        currentPage
        hasNextPage
        lastPage
      }
      media(search: $search, type: $type, format: $format, status: $status, genre_in: $genre_in, tag_in: $tag_in, sort: $sort, isAdult: $isAdult, averageScore_greater: $averageScore_greater, averageScore_lesser: $averageScore_lesser, season: $season, seasonYear: $seasonYear, countryOfOrigin: $countryOfOrigin, startDate_greater: $startDate_greater, endDate_lesser: $endDate_lesser) {
        id
        idMal
        title { romaji english native }
        coverImage { large medium }
        episodes
        status
        format
        genres
        tags { name }
        averageScore
        season
        seasonYear
      }
    }
  }
`;

const ANILIST_GENRES = new Set([
  "Action", "Adventure", "Boys Love", "Comedy", "Drama", "Ecchi", "Fantasy", 
  "Girls Love", "Hentai", "Horror", "Mahou Shoujo", "Mecha", "Music", "Mystery", 
  "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"
]);

const TAG_MAP: Record<string, string> = {
  "Gourmet": "Food",
  "Shoujo Ai": "Girls Love",
  "Shounen Ai": "Boys Love",
  "Game": "Video Games",
  "Dementia": "Surreal Comedy",
  "Harem": "Female Harem",
  "Reverse Harem": "Male Harem"
};

const parseFuzzyDate = (dateStr: string | null): number | undefined => {
  if (!dateStr) return undefined;
  const cleaned = dateStr.replace(/-/g, "");
  const val = parseInt(cleaned, 10);
  return isNaN(val) ? undefined : val;
};

export async function GET(req: Request) {
  try {
    const cacheKey = req.url;
    const cached = cacheMap.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.data);
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const format = searchParams.get("type") || "All";
    const status = searchParams.get("status") || "All";
    const score = searchParams.get("score") || "All";
    const orderBy = searchParams.get("order_by") || "All";
    const genresParam = searchParams.get("genres") || "";
    const genres = genresParam ? genresParam.split(",") : [];

    const season = searchParams.get("season") || "All";
    const seasonYear = searchParams.get("year") || "All";
    const language = searchParams.get("language") || "All";
    const rated = searchParams.get("rated") || "All";
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const variables: any = {
      page,
      perPage: 20,
      type: "ANIME",
      isAdult: rated === "Rx" ? true : false,
    };

    if (query.trim() !== "") variables.search = query;
    if (format !== "All") variables.format = format;
    if (status !== "All") variables.status = status;
    if (season !== "All") variables.season = season;
    if (seasonYear !== "All") variables.seasonYear = parseInt(seasonYear, 10);
    if (language !== "All") variables.countryOfOrigin = language;

    const startFuzzy = parseFuzzyDate(startDate);
    if (startFuzzy !== undefined) variables.startDate_greater = startFuzzy;

    const endFuzzy = parseFuzzyDate(endDate);
    if (endFuzzy !== undefined) variables.endDate_lesser = endFuzzy;

    if (genres.length > 0) {
      const anilistGenres: string[] = [];
      const anilistTags: string[] = [];
      
      genres.forEach((g: string) => {
        const mapped = TAG_MAP[g] || g;
        if (ANILIST_GENRES.has(mapped)) {
          anilistGenres.push(mapped);
        } else {
          anilistTags.push(mapped);
        }
      });

      if (anilistGenres.length > 0) variables.genre_in = anilistGenres;
      if (anilistTags.length > 0) variables.tag_in = anilistTags;
    }

    if (orderBy !== "All") {
      const sortMap: Record<string, string> = {
        "Score": "SCORE_DESC",
        "Title": "TITLE_ROMAJI",
        "Episodes": "EPISODES_DESC",
        "Popularity": "POPULARITY_DESC",
        "Trending": "TRENDING_DESC"
      };
      variables.sort = [sortMap[orderBy] || "POPULARITY_DESC"];
    } else if (query.trim() !== "") {
      variables.sort = ["SEARCH_MATCH"];
    } else {
      variables.sort = ["POPULARITY_DESC"];
    }

    if (score !== "All") {
      const [min, max] = score.split("-");
      variables.averageScore_greater = parseInt(min, 10) * 10;
      variables.averageScore_lesser = parseInt(max, 10) * 10 + 9;
    }

    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `AniList returned status ${response.status}` },
        { status: response.status }
      );
    }

    const json = await response.json();
    const pageData = json.data?.Page;
    const media = pageData?.media || [];
    const pageInfo = pageData?.pageInfo || { currentPage: 1, hasNextPage: false, lastPage: 1 };

    const results = media.map((m: any) => ({
      mal_id: m.idMal,
      anilist_id: m.id,
      title: m.title.romaji || m.title.english || m.title.native,
      title_english: m.title.english || null,
      title_romaji: m.title.romaji || null,
      poster_url: m.coverImage?.large || m.coverImage?.medium || null,
      type: m.format || "Unknown",
      episodes: m.episodes || null,
      average_score: m.averageScore ? m.averageScore / 10 : null,
      year: m.seasonYear || null,
      season: m.season || null,
      status: m.status || "UNKNOWN",
    }));

    const resultPayload = {
      results,
      page: pageInfo.currentPage,
      totalPages: pageInfo.lastPage || Math.ceil(results.length / 20) || 1,
      hasNextPage: pageInfo.hasNextPage,
    };

    cacheMap.set(cacheKey, {
      data: resultPayload,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return NextResponse.json(resultPayload);
  } catch (error: any) {
    console.error("[SEARCH API] Error:", error.message || error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
