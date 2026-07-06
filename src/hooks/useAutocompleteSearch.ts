import { useState, useEffect, useRef } from "react";
import { useSearchQuery, type SearchResult } from "./useSearchQuery";
export type { SearchResult };

export function useAutocompleteSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { fetchAutocompleteSearch, loading, error } = useSearchQuery();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setShowDropdown(false);
      setActiveIndex(-1);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const delayDebounce = setTimeout(async () => {
      try {
        const data = await fetchAutocompleteSearch(query, controller.signal);
        if (data && data.results) {
          // Limit results to maximum 8 items
          setResults(data.results.slice(0, 8));
          setShowDropdown(data.results.length > 0);
          setActiveIndex(-1);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Autocomplete search error:", err);
        }
      }
    }, 350);

    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [query, fetchAutocompleteSearch]);

  const handleKeyDown = (
    e: React.KeyboardEvent,
    onSelect: (anime: SearchResult, openNewTab?: boolean) => void
  ) => {
    if (!showDropdown || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(results.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        setShowDropdown(false);
        setActiveIndex(-1);
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          const isCtrlOrCmd = e.ctrlKey || e.metaKey;
          onSelect(results[activeIndex], isCtrlOrCmd);
        }
        break;
      default:
        break;
    }
  };

  return {
    query,
    setQuery,
    results,
    showDropdown,
    setShowDropdown,
    activeIndex,
    setActiveIndex,
    loading,
    error,
    handleKeyDown,
  };
}
