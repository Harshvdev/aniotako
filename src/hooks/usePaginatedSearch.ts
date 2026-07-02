import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSearchQuery } from "./useSearchQuery";

export interface PaginatedSearchResult {
  mal_id: number;
  anilist_id: number;
  title: string;
  title_english: string | null;
  title_romaji: string | null;
  poster_url: string | null;
  type: string;
  episodes: number | null;
  average_score: number | null;
  year: number | null;
  season: string | null;
  status: string;
}

export function usePaginatedSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { fetchWithCache, loading, error } = useSearchQuery();

  const [results, setResults] = useState<PaginatedSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    hasNextPage: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Read URL search params as the only source of truth
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const type = searchParams.get("type") || "All";
  const status = searchParams.get("status") || "All";
  const score = searchParams.get("score") || "All";
  const orderBy = searchParams.get("order_by") || "Popularity"; // Default to Popularity
  const genres = searchParams.get("genres") || "";
  const season = searchParams.get("season") || "All";
  const year = searchParams.get("year") || "All";
  const language = searchParams.get("language") || "All";
  const rated = searchParams.get("rated") || "All";
  const startDate = searchParams.get("start_date") || "";
  const endDate = searchParams.get("end_date") || "";

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const performSearch = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (query) queryParams.set("q", query);
        if (page > 1) queryParams.set("page", page.toString());
        if (type !== "All") queryParams.set("type", type);
        if (status !== "All") queryParams.set("status", status);
        if (score !== "All") queryParams.set("score", score);
        if (orderBy !== "Popularity") queryParams.set("order_by", orderBy);
        if (genres) queryParams.set("genres", genres);
        if (season !== "All") queryParams.set("season", season);
        if (year !== "All") queryParams.set("year", year);
        if (language !== "All") queryParams.set("language", language);
        if (rated !== "All") queryParams.set("rated", rated);
        if (startDate) queryParams.set("start_date", startDate);
        if (endDate) queryParams.set("end_date", endDate);

        const url = `/api/search?${queryParams.toString()}`;
        const data = await fetchWithCache(url, controller.signal);

        if (controller.signal.aborted) return;

        if (data) {
          setResults(data.results || []);
          setPagination({
            page: data.page || 1,
            totalPages: data.totalPages || 1,
            hasNextPage: !!data.hasNextPage,
          });
          setHasSearched(true);
        }
      } catch (err: any) {
        if (controller.signal.aborted) return;
        if (err.name !== "AbortError") {
          console.error("Paginated search query error:", err);
          setHasSearched(true);
        }
      }
    };

    performSearch();

    return () => {
      controller.abort();
    };
  }, [
    query,
    page,
    type,
    status,
    score,
    orderBy,
    genres,
    season,
    year,
    language,
    rated,
    startDate,
    endDate,
    fetchWithCache,
  ]);

  const updateFilters = (newFilters: Record<string, string | number | null>) => {
    const current = new URLSearchParams(searchParams.toString());

    // Changing search queries or filters automatically resets current page
    if (newFilters.page === undefined) {
      current.delete("page");
    }

    Object.entries(newFilters).forEach(([key, val]) => {
      if (val === null || val === "" || val === "All") {
        current.delete(key);
      } else {
        current.set(key, val.toString());
      }
    });

    router.push(`${pathname}?${current.toString()}`, { scroll: false });
  };

  return {
    results,
    pagination,
    loading,
    error,
    updateFilters,
    query,
    page,
    type,
    status,
    score,
    orderBy,
    genres,
    season,
    year,
    language,
    rated,
    startDate,
    endDate,
    hasSearched,
  };
}
