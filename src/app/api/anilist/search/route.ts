// src/app/api/anilist/search/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  "Dementia": "Surreal Comedy"
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    // 1. Check user preferences for adult content
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let isAdult = false;
    if (user) {
      const { data: prefs } = await supabase.from('user_preferences').select('show_adult').eq('user_id', user.id).single();
      if (prefs?.show_adult) isAdult = true;
    }

    // 2. Extract and format query parameters
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = parseInt(searchParams.get("perPage") || "20", 10);
    const q = searchParams.get("q");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const genres = searchParams.get("genres");
    const sort = searchParams.get("sort");
    const minScore = searchParams.get("min_score");
    const maxScore = searchParams.get("max_score");

    const variables: any = {
      page,
      perPage,
      type: "ANIME", // We only want Anime media
    };

    // Only exclude 18+ content if the user hasn't explicitly allowed it
    if (!isAdult) variables.isAdult = false;

    // Apply filters conditionally so AniList ignores empty ones
    if (q && q.trim() !== "") variables.search = q;
    if (type && type !== "All") variables.format = type;
    if (status && status !== "All") variables.status = status;
    
    if (genres) {
      const anilistGenres: string[] = [];
      const anilistTags: string[] = [];
      
      genres.split(",").forEach((g) => {
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
    
    if (sort && sort !== "All") {
      variables.sort = [sort];
    } else if (q && q.trim() !== "") {
      variables.sort = ["SEARCH_MATCH"];
    } else {
      variables.sort = ["POPULARITY_DESC"];
    }

    if (minScore) variables.averageScore_greater = parseInt(minScore, 10) * 10;
    if (maxScore) variables.averageScore_lesser = parseInt(maxScore, 10) * 10 + 9;

    // 3. Build the GraphQL Query (Now supporting $tag_in)
    const query = `
      query ($page: Int, $perPage: Int, $search: String, $type: MediaType, $format: MediaFormat, $status: MediaStatus, $genre_in: [String], $tag_in: [String], $sort: [MediaSort], $isAdult: Boolean, $averageScore_greater: Int, $averageScore_lesser: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            currentPage
            hasNextPage
          }
          media(search: $search, type: $type, format: $format, status: $status, genre_in: $genre_in, tag_in: $tag_in, sort: $sort, isAdult: $isAdult, averageScore_greater: $averageScore_greater, averageScore_lesser: $averageScore_lesser) {
            id
            idMal
            title { romaji english native }
            coverImage { large medium }
            bannerImage
            episodes
            status
            format
            genres
            tags { name }
            averageScore
            popularity
            season
            seasonYear
            description
            studios(isMain: true) { nodes { name } }
            startDate { year month day }
            nextAiringEpisode { airingAt episode }
          }
        }
      }
    `;

    // 4. Fetch from AniList
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anilist API Error:", errText);
      return NextResponse.json({ error: "Failed to fetch from AniList API." }, { status: response.status });
    }

    const json = await response.json();
    const pageData = json.data.Page;

    // 5. Normalize data map for UI consumption (merging tags and genres together)
    const mappedData = pageData.media.map((m: any) => {
      // Merge official genres and dynamic tags into one flat array for compatibility
      const mergedGenres = [
        ...(m.genres || []),
        ...(m.tags?.map((t: any) => t.name) || [])
      ];

      return {
        mal_id: m.idMal,
        anilist_id: m.id,
        title: m.title.romaji || m.title.english || m.title.native,
        title_english: m.title.english,
        title_romaji: m.title.romaji,
        poster_url: m.coverImage?.large || m.coverImage?.medium,
        type: m.format,
        status: m.status,
        episodes: m.episodes,
        score: m.averageScore ? m.averageScore / 10 : null,
        genres: Array.from(new Set(mergedGenres)), // Deduplicate
        year: m.seasonYear,
        season: m.season,
        studio: m.studios?.nodes?.[0]?.name || null,
        next_episode: m.nextAiringEpisode
      };
    });

    return NextResponse.json({
      data: mappedData,
      pagination: {
        current_page: pageData.pageInfo.currentPage,
        has_next_page: pageData.pageInfo.hasNextPage
      }
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=59' },
    });

  } catch (error: any) {
    console.error("AniList search proxy error:", error);
    return NextResponse.json({ error: "Failed to connect to anime database." }, { status: 500 });
  }
}