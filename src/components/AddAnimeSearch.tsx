"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTitleLanguage } from "@/lib/TitleLanguageContext";

interface JikanAnime {
  mal_id: number;
  title: string;
  title_english?: string;
  type: string;
  year: number;
  episodes: number;
  images: { jpg: { image_url: string; large_image_url: string; } };
}

const GENRES = [
  { id: 1, name: "Action" }, { id: 2, name: "Adventure" }, { id: 3, name: "Cars" },
  { id: 4, name: "Comedy" }, { id: 5, name: "Dementia" }, { id: 6, name: "Demons" },
  { id: 8, name: "Drama" }, { id: 9, name: "Ecchi" }, { id: 10, name: "Fantasy" },
  { id: 11, name: "Game" }, { id: 35, name: "Harem" }, { id: 13, name: "Historical" },
  { id: 14, name: "Horror" }, { id: 62, name: "Isekai" }, { id: 43, name: "Josei" },
  { id: 15, name: "Kids" }, { id: 16, name: "Magic" }, { id: 17, name: "Martial Arts" },
  { id: 18, name: "Mecha" }, { id: 38, name: "Military" }, { id: 19, name: "Music" },
  { id: 7, name: "Mystery" }, { id: 20, name: "Parody" }, { id: 39, name: "Police" },
  { id: 40, name: "Psychological" }, { id: 22, name: "Romance" }, { id: 21, name: "Samurai" },
  { id: 23, name: "School" }, { id: 24, name: "Sci-Fi" }, { id: 42, name: "Seinen" },
  { id: 25, name: "Shoujo" }, { id: 26, name: "Shoujo Ai" }, { id: 27, name: "Shounen" },
  { id: 28, name: "Shounen Ai" }, { id: 36, name: "Slice of Life" }, { id: 29, name: "Space" },
  { id: 30, name: "Sports" }, { id: 31, name: "Super Power" }, { id: 37, name: "Supernatural" },
  { id: 41, name: "Thriller" }, { id: 32, name: "Vampire" }
];

export default function AddAnimeSearch() {
  const router = useRouter();

  const { getTitle } = useTitleLanguage();
  
  const [query, setQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: "All", status: "All", rating: "All", score: "All", order_by: "All", genres: [] as number[]
  });

  const [results, setResults] = useState<JikanAnime[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // NEW: Pagination State
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // --- 1. Initial Search (Page 1) Effect ---
  // We intentionally omit `page` from the dependency array so this ONLY triggers on filter/query changes.
  useEffect(() => {
    if (!query.trim() && filters.genres.length === 0 && filters.order_by === "All") {
      setResults([]);
      setShowDropdown(false);
      setHasNextPage(false);
      return;
    }

    const controller = new AbortController();

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setPage(1); // Reset back to page 1 on new query
      
      try {
        const params = new URLSearchParams();
        params.append("page", "1");
        if (query.trim()) params.append("q", query);
        if (filters.type !== "All") params.append("type", filters.type);
        if (filters.status !== "All") params.append("status", filters.status);
        if (filters.rating !== "All") params.append("rating", filters.rating);
        if (filters.order_by !== "All") params.append("order_by", filters.order_by);
        if (filters.genres.length > 0) params.append("genres", filters.genres.join(","));
        
        if (filters.score !== "All") {
          const [min, max] = filters.score.split("-");
          params.append("min_score", min);
          params.append("max_score", max);
        }

        const res = await fetch(`/api/jikan/search?${params.toString()}`, { signal: controller.signal });
        
        if (res.ok) {
          const json = await res.json();
          setResults(json.data);
          setHasNextPage(json.pagination.has_next_page);
          setShowDropdown(true);
        } else if (res.status === 429) {
           setToast({ message: "Searching too fast! Please wait a moment.", type: "error" });
        }
      } catch (err: any) {
        if (err.name !== "AbortError") console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 800);

    return () => {
      clearTimeout(delayDebounceFn);
      controller.abort(); 
    };
  }, [query, filters]);

  // --- 2. Load More (Page 2+) Logic ---
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasNextPage) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const params = new URLSearchParams();
      params.append("page", nextPage.toString());
      if (query.trim()) params.append("q", query);
      if (filters.type !== "All") params.append("type", filters.type);
      if (filters.status !== "All") params.append("status", filters.status);
      if (filters.rating !== "All") params.append("rating", filters.rating);
      if (filters.order_by !== "All") params.append("order_by", filters.order_by);
      if (filters.genres.length > 0) params.append("genres", filters.genres.join(","));
      
      if (filters.score !== "All") {
        const [min, max] = filters.score.split("-");
        params.append("min_score", min);
        params.append("max_score", max);
      }

      const res = await fetch(`/api/jikan/search?${params.toString()}`);
      
      if (res.ok) {
        const json = await res.json();
        // Append new data to existing results
        setResults((prev) => [...prev, ...json.data]);
        setHasNextPage(json.pagination.has_next_page);
        setPage(nextPage);
      }
    } catch (err: any) {
      console.error("Failed to load more pages", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // --- 3. Click Outside to Close ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleGenre = (id: number) => {
    setFilters(prev => ({
      ...prev,
      genres: prev.genres.includes(id) ? prev.genres.filter(gId => gId !== id) : [...prev.genres, id]
    }));
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="relative w-full max-w-3xl mx-auto z-40" ref={wrapperRef}>
      
      <div className="flex gap-2 relative">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
            placeholder="Search anime..."
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl py-3 pl-12 pr-12 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all backdrop-blur-sm shadow-lg"
          />
          {isSearching && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <div className="w-4 h-4 border-2 border-zinc-500 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`flex items-center justify-center gap-2 px-5 rounded-2xl border transition-all shadow-lg ${
            isFilterOpen || filters.genres.length > 0 || filters.type !== "All"
              ? "bg-fuchsia-500/10 border-fuchsia-500/50 text-fuchsia-400" 
              : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          <span className="font-medium hidden sm:block">Filter</span>
        </button>
      </div>

      {isFilterOpen && (
        <div className="absolute top-full right-0 mt-3 w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[600px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-5 z-50 animate-in fade-in slide-in-from-top-2 custom-scrollbar">
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Type</label>
              <select value={filters.type} onChange={(e) => handleFilterChange("type", e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500">
                <option value="All">All</option><option value="TV">TV</option><option value="Movie">Movie</option><option value="OVA">OVA</option><option value="ONA">ONA</option><option value="Special">Special</option><option value="Music">Music</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</label>
              <select value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500">
                <option value="All">All</option><option value="Airing">Airing</option><option value="Complete">Complete</option><option value="Upcoming">Upcoming</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Rating</label>
              <select value={filters.rating} onChange={(e) => handleFilterChange("rating", e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500">
                <option value="All">All</option><option value="G">G</option><option value="PG">PG</option><option value="PG-13">PG-13</option><option value="R-17+">R-17+</option><option value="R+">R+</option><option value="Rx">Rx</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Score</label>
              <select value={filters.score} onChange={(e) => handleFilterChange("score", e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500">
                <option value="All">All</option><option value="1-2">1-2</option><option value="3-4">3-4</option><option value="5-6">5-6</option><option value="7-8">7-8</option><option value="9-10">9-10</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Order By</label>
              <select value={filters.order_by} onChange={(e) => handleFilterChange("order_by", e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500">
                <option value="All">Default</option><option value="Score">Score</option><option value="Title">Title</option><option value="Episodes">Episodes</option><option value="Rank">Ranked</option><option value="Popularity">Popularity</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Genres</label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(genre => (
                <button
                  key={genre.id}
                  onClick={() => toggleGenre(genre.id)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                    filters.genres.includes(genre.id)
                      ? "bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
            <button 
              onClick={() => setFilters({ type: "All", status: "All", rating: "All", score: "All", order_by: "All", genres: [] })}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Clear All
            </button>
            <button onClick={() => setIsFilterOpen(false)} className="px-4 py-1.5 bg-zinc-800 text-xs font-bold text-white rounded-lg hover:bg-zinc-700">
              Close
            </button>
          </div>
        </div>
      )}

      {showDropdown && results.length > 0 && !isFilterOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto overscroll-contain custom-scrollbar z-10 flex flex-col">
          {results.map((anime, index) => (
            <button
              key={`${anime.mal_id}-${index}`}
              onClick={() => {
                setShowDropdown(false);
                setIsFilterOpen(false);
                router.push(`/anime/${anime.mal_id}`);
              }}
              className="w-full flex items-center gap-4 p-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 text-left shrink-0"
            >
              <img src={anime.images.jpg.image_url} alt={anime.title} className="w-12 h-16 object-cover rounded bg-zinc-800 shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium text-sm truncate" title={getTitle(anime)}>
                  {getTitle(anime)}
                </h4>
                <div className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
                  <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-zinc-300 font-bold">{anime.type}</span>
                  {anime.year && <span>{anime.year}</span>}
                  {anime.episodes && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                      <span>{anime.episodes} eps</span>
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0 pl-2 pr-2">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            </button>
          ))}
          
          {/* LOAD MORE / END OF RESULTS */}
          {hasNextPage ? (
            <div className="p-3 bg-zinc-900/90 backdrop-blur-sm sticky bottom-0 border-t border-zinc-800 flex justify-center shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLoadMore(); }}
                disabled={isLoadingMore}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sm font-bold text-white rounded-xl transition-colors flex items-center justify-center gap-2 border border-zinc-700"
              >
                {isLoadingMore && <div className="w-4 h-4 border-2 border-zinc-500 border-t-cyan-500 rounded-full animate-spin"></div>}
                {isLoadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          ) : (
            <div className="p-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-600 shrink-0">
              No more results
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-md ${toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
            {toast.type === "success" ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            <span className="font-medium text-sm">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100 transition-opacity"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>
      )}
    </div>
  );
}