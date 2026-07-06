import { useState, useCallback } from "react";

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cacheMap = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

const AUTOCOMPLETE_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 8) {
      media(search: $search, type: ANIME, isAdult: false) {
        id
        idMal
        title { romaji english native }
        coverImage { medium }
        format
        episodes
        seasonYear
        status
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

interface AniListMedia {
  id: number;
  idMal: number | null;
  title: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  };
  coverImage?: {
    large?: string | null;
    medium?: string | null;
  } | null;
  format?: string | null;
  episodes?: number | null;
  averageScore?: number | null;
  season?: string | null;
  seasonYear?: number | null;
  status?: string | null;
}

export interface SearchResult {
  mal_id: number | null;
  anilist_id: number;
  title: string;
  title_english: string | null;
  title_romaji: string | null;
  poster_url: string | null;
  type: string;
  episodes: number | null;
  year: number | null;
  status: string;
}

export interface PaginatedSearchResult extends SearchResult {
  average_score: number | null;
  season: string | null;
}

export interface PaginatedSearchResponse {
  results: PaginatedSearchResult[];
  page: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface AutocompleteSearchResponse {
  results: SearchResult[];
}

const parseFuzzyDate = (dateStr: string | null): number | undefined => {
  if (!dateStr) return undefined;
  const cleaned = dateStr.replace(/-/g, "");
  const val = parseInt(cleaned, 10);
  return isNaN(val) ? undefined : val;
};

export function useSearchQuery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaginatedSearch = useCallback(async (
    filters: Record<string, string | number | null | undefined>,
    signal?: AbortSignal
  ): Promise<PaginatedSearchResponse | null> => {
    // Generate cache key based on filters serialized
    const cacheKey = `paginated:${JSON.stringify(filters)}`;
    const cached = cacheMap.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as PaginatedSearchResponse;
    }

    setLoading(true);
    setError(null);

    try {
      const queryText = (filters.q as string) || "";
      const page = parseInt((filters.page as string) || "1", 10);
      const format = (filters.type as string) || "All";
      const status = (filters.status as string) || "All";
      const score = (filters.score as string) || "All";
      const orderBy = (filters.order_by as string) || "Popularity";
      const genresParam = (filters.genres as string) || "";
      const genres = genresParam ? genresParam.split(",") : [];

      const season = (filters.season as string) || "All";
      const seasonYear = (filters.year as string) || "All";
      const language = (filters.language as string) || "All";
      const rated = (filters.rated as string) || "All";
      const startDate = filters.start_date as string | null;
      const endDate = filters.end_date as string | null;

      const variables: Record<string, unknown> = {
        page,
        perPage: 20,
        type: "ANIME",
        isAdult: rated === "Rx",
      };

      if (queryText.trim() !== "") variables.search = queryText;
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
      } else if (queryText.trim() !== "") {
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
        signal,
      });

      if (!response.ok) {
        throw new Error(`AniList returned status ${response.status}`);
      }

      const json = await response.json();
      const pageData = json.data?.Page;
      const media = (pageData?.media || []) as AniListMedia[];
      const pageInfo = pageData?.pageInfo || { currentPage: 1, hasNextPage: false, lastPage: 1 };

      const results: PaginatedSearchResult[] = media.map((m) => ({
        mal_id: m.idMal,
        anilist_id: m.id,
        title: m.title.romaji || m.title.english || m.title.native || "",
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

      const resultPayload: PaginatedSearchResponse = {
        results,
        page: pageInfo.currentPage,
        totalPages: pageInfo.lastPage || Math.ceil(results.length / 20) || 1,
        hasNextPage: pageInfo.hasNextPage,
      };

      cacheMap.set(cacheKey, {
        data: resultPayload,
        expiresAt: Date.now() + CACHE_TTL,
      });

      return resultPayload;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return null;
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch search results";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAutocompleteSearch = useCallback(async (
    searchQuery: string,
    signal?: AbortSignal
  ): Promise<AutocompleteSearchResponse | null> => {
    if (searchQuery.trim().length < 3) {
      return { results: [] };
    }

    const cacheKey = `autocomplete:${searchQuery.trim()}`;
    const cached = cacheMap.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as AutocompleteSearchResponse;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          query: AUTOCOMPLETE_QUERY,
          variables: { search: searchQuery.trim() },
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`AniList returned status ${response.status}`);
      }

      const json = await response.json();
      const media = (json.data?.Page?.media || []) as AniListMedia[];

      const results: SearchResult[] = media.map((m) => ({
        mal_id: m.idMal,
        anilist_id: m.id,
        title: m.title.romaji || m.title.english || m.title.native || "",
        title_english: m.title.english || null,
        title_romaji: m.title.romaji || null,
        poster_url: m.coverImage?.medium || null,
        type: m.format || "Unknown",
        episodes: m.episodes || null,
        year: m.seasonYear || null,
        status: m.status || "UNKNOWN",
      }));

      const resultPayload: AutocompleteSearchResponse = { results };

      cacheMap.set(cacheKey, {
        data: resultPayload,
        expiresAt: Date.now() + CACHE_TTL,
      });

      return resultPayload;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return null;
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch autocomplete results";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchPaginatedSearch, fetchAutocompleteSearch, loading, error };
}
