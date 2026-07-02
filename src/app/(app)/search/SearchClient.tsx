"use client";

import { useState, useEffect } from "react";
import SearchBox from "@/components/search/SearchBox";
import SearchAnimeCard from "@/components/search/SearchAnimeCard";
import { usePaginatedSearch } from "@/hooks/usePaginatedSearch";

const PRIMARY_GENRES = [
  "Action", "Adventure", "Cars", "Comedy", "Dementia", "Demons", "Drama", 
  "Ecchi", "Fantasy", "Game", "Harem", "Historical", "Horror", "Isekai", 
  "Josei", "Kids", "Magic", "Martial Arts", "Mecha", "Military", "Music", 
  "Mystery", "Parody", "Police", "Psychological", "Romance", "Samurai", 
  "School", "Sci-Fi", "Seinen", "Shoujo", "Shoujo Ai", "Shounen", 
  "Shounen Ai", "Slice of Life", "Space", "Sports", "Super Power", 
  "Supernatural", "Thriller", "Vampire"
];

const SearchSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 w-full animate-pulse">
    {Array.from({ length: 10 }).map((_, i) => (
      <div
        key={i}
        className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl sm:rounded-2xl overflow-hidden flex flex-col w-full h-[280px] sm:h-[350px]"
      >
        <div className="bg-zinc-800/60 flex-1 w-full" />
        <div className="p-3 sm:p-4 space-y-3 shrink-0 bg-zinc-900/40 border-t border-zinc-800/30">
          <div className="h-3 bg-zinc-850 rounded-md w-1/3" />
          <div className="h-4 bg-zinc-850 rounded-md w-3/4" />
          <div className="h-8.5 bg-zinc-850 rounded-md w-full" />
        </div>
      </div>
    ))}
  </div>
);

const YEARS = Array.from({ length: 2027 - 1980 + 1 }, (_, i) => (2027 - i).toString());

export default function SearchClient() {
  const {
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
  } = usePaginatedSearch();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  // Debounce search input changes automatically
  useEffect(() => {
    if (searchInput === query) return;

    const delayDebounce = setTimeout(() => {
      updateFilters({ q: searchInput, page: 1 });
    }, 350);

    return () => {
      clearTimeout(delayDebounce);
    };
  }, [searchInput, query, updateFilters]);

  const selectedGenres = genres ? genres.split(",") : [];

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateFilters({ q: searchInput, page: 1 });
  };

  const handleGenreToggle = (g: string) => {
    let nextGenres = [...selectedGenres];
    if (nextGenres.includes(g)) {
      nextGenres = nextGenres.filter((genre) => genre !== g);
    } else {
      nextGenres.push(g);
    }
    updateFilters({ genres: nextGenres.join(",") });
  };

  const handleClearAll = () => {
    updateFilters({
      q: "",
      page: 1,
      type: "All",
      status: "All",
      score: "All",
      order_by: "Popularity",
      genres: "",
      season: "All",
      year: "All",
      language: "All",
      rated: "All",
      start_date: "",
      end_date: "",
    });
    setSearchInput("");
  };

  const getPageNumbers = () => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(pagination.totalPages, page + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const isFilterActive =
    isFilterOpen ||
    selectedGenres.length > 0 ||
    type !== "All" ||
    status !== "All" ||
    score !== "All" ||
    orderBy !== "Popularity" ||
    season !== "All" ||
    year !== "All" ||
    language !== "All" ||
    rated !== "All" ||
    startDate !== "" ||
    endDate !== "";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-10 pb-24 relative z-10">
      <div className="mb-6 sm:mb-8 max-w-3xl mx-auto">
        <form onSubmit={handleSearchSubmit}>
          <SearchBox
            value={searchInput}
            onChange={setSearchInput}
            onFilterClick={() => setIsFilterOpen(!isFilterOpen)}
            isFilterActive={isFilterActive}
            placeholder="Search anime catalog..."
            loading={loading && results.length > 0}
          />
        </form>
      </div>

      {isFilterOpen && (
        <div className="w-full mb-8 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Type</label>
              <select
                value={type}
                onChange={(e) => updateFilters({ type: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="All">All</option>
                <option value="TV">TV</option>
                <option value="MOVIE">Movie</option>
                <option value="OVA">OVA</option>
                <option value="ONA">ONA</option>
                <option value="SPECIAL">Special</option>
                <option value="MUSIC">Music</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</label>
              <select
                value={status}
                onChange={(e) => updateFilters({ status: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="All">All</option>
                <option value="RELEASING">Releasing</option>
                <option value="FINISHED">Finished</option>
                <option value="NOT_YET_RELEASED">Not yet released</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Rated</label>
              <select
                value={rated}
                onChange={(e) => updateFilters({ rated: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="All">All</option>
                <option value="G">G (All Ages)</option>
                <option value="PG">PG (Children)</option>
                <option value="PG-13">PG-13 (Teens)</option>
                <option value="R">R (17+)</option>
                <option value="R+">R+ (Mild Nudity)</option>
                <option value="Rx">Rx (Adults Only)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Score</label>
              <select
                value={score}
                onChange={(e) => updateFilters({ score: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="All">All</option>
                <option value="1-2">1-2</option>
                <option value="3-4">3-4</option>
                <option value="5-6">5-6</option>
                <option value="7-8">7-8</option>
                <option value="9-10">9-10</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Season</label>
              <select
                value={season}
                onChange={(e) => updateFilters({ season: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="All">All</option>
                <option value="WINTER">Winter</option>
                <option value="SPRING">Spring</option>
                <option value="SUMMER">Summer</option>
                <option value="FALL">Fall</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Year</label>
              <select
                value={year}
                onChange={(e) => updateFilters({ year: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="All">All</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Language</label>
              <select
                value={language}
                onChange={(e) => updateFilters({ language: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="All">All</option>
                <option value="JP">Japanese</option>
                <option value="CN">Chinese</option>
                <option value="KR">Korean</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sort</label>
              <select
                value={orderBy}
                onChange={(e) => updateFilters({ order_by: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="Popularity">Popularity</option>
                <option value="Score">Score</option>
                <option value="Title">Title</option>
                <option value="Episodes">Episodes</option>
                <option value="Trending">Trending</option>
              </select>
            </div>

            <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-4">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => updateFilters({ start_date: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>

            <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-4">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => updateFilters({ end_date: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Genres</label>
            <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
              {PRIMARY_GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => handleGenreToggle(g)}
                  className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all ${
                    selectedGenres.includes(g)
                      ? "bg-fuchsia-600 text-white border border-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.4)]"
                      : "bg-zinc-850 border border-zinc-800 text-zinc-400 hover:border-zinc-650 hover:text-zinc-200"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-850 flex justify-between items-center">
            <button
              onClick={handleClearAll}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest"
            >
              Clear All
            </button>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="px-4 py-1.5 bg-zinc-850 hover:bg-zinc-750 text-xs font-bold text-zinc-300 rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {(loading || !hasSearched) && results.length === 0 ? (
        <SearchSkeleton />
      ) : error ? (
        <div className="py-24 text-center text-red-400 font-semibold border border-red-500/10 rounded-2xl bg-red-500/5">
          {error}
        </div>
      ) : results.length === 0 ? (
        <div className="py-24 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
          No anime found matching these filters. Try searching for something else!
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 animate-in fade-in duration-300">
            {results.map((anime) => (
              <SearchAnimeCard key={anime.anilist_id} anime={anime} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => updateFilters({ page: page - 1 })}
                disabled={page <= 1}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-xs font-bold text-zinc-300 rounded-xl disabled:opacity-40 transition-colors cursor-pointer"
              >
                Prev
              </button>

              {getPageNumbers().map((num) => (
                <button
                  key={num}
                  onClick={() => updateFilters({ page: num })}
                  className={`w-9 h-9 flex items-center justify-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    page === num
                      ? "bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white shadow-lg font-black"
                      : "bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300"
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() => updateFilters({ page: page + 1 })}
                disabled={!pagination.hasNextPage}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-xs font-bold text-zinc-300 rounded-xl disabled:opacity-40 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
