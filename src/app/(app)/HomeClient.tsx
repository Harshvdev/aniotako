"use client";

import { useRouter } from "next/navigation";
import SearchBox from "@/components/search/SearchBox";
import SearchAutocomplete from "@/components/search/SearchAutocomplete";
import { useAutocompleteSearch, SearchResult } from "@/hooks/useAutocompleteSearch";
import { useRef, useEffect } from "react";

export default function HomeClient() {
  const router = useRouter();
  const {
    query,
    setQuery,
    results,
    showDropdown,
    setShowDropdown,
    activeIndex,
    loading,
    error,
    handleKeyDown,
  } = useAutocompleteSearch();

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowDropdown]);

  const handleSelectAnime = (anime: SearchResult, openNewTab = false) => {
    setShowDropdown(false);
    const targetUrl = `/anime/${anime.mal_id || anime.anilist_id}`;
    if (openNewTab) {
      window.open(targetUrl, "_blank");
    } else {
      router.push(targetUrl);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    // If navigating inside results list, delegate to keyboard handler
    if (showDropdown && activeIndex >= 0) {
      handleKeyDown(e, handleSelectAnime);
      return;
    }

    if (e.key === "Enter") {
      handleSearchSubmit();
    } else {
      handleKeyDown(e, handleSelectAnime);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-16 sm:mt-24 pb-24 relative z-10 flex flex-col items-center">
      {/* Hero Header */}
      <div className="text-center mb-10 max-w-2xl animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-4 bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent leading-none">
          Discover & Track
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
          Create your personalized anime watchlist, check airing countdowns, and get automated notifications for upcoming episodes.
        </p>
      </div>

      {/* Spotlight Autocomplete Search Box */}
      <div className="relative w-full max-w-2xl" ref={wrapperRef}>
        <form onSubmit={handleSearchSubmit}>
          <SearchBox
            value={query}
            onChange={setQuery}
            onFocus={() => {
              if (results.length > 0) setShowDropdown(true);
            }}
            onKeyDown={handleInputKeyDown}
            onFilterClick={() => {
              router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            }}
            isFilterActive={false}
            placeholder="Search anime..."
            loading={loading}
          />
        </form>

        <SearchAutocomplete
          results={results}
          showDropdown={showDropdown}
          activeIndex={activeIndex}
          loading={loading}
          error={error}
          onSelect={handleSelectAnime}
        />
      </div>
    </div>
  );
}
