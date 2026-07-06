import { useState, useEffect, useRef } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useSearchQuery, type PaginatedSearchResult } from "./useSearchQuery";
export type { PaginatedSearchResult };

export function usePaginatedSearch() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { fetchPaginatedSearch, loading, error } = useSearchQuery();

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
        const filters = {
          q: query,
          page,
          type,
          status,
          score,
          order_by: orderBy,
          genres,
          season,
          year,
          language,
          rated,
          start_date: startDate,
          end_date: endDate,
        };

        const data = await fetchPaginatedSearch(filters, controller.signal);

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
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name !== "AbortError") {
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
    fetchPaginatedSearch,
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

    const newUrl = `${pathname}?${current.toString()}`;
    window.history.replaceState(null, "", newUrl);
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
