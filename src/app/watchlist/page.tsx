"use client";

import { useState, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";

// Interfaces
interface AnimeEntry {
  id: string; // Supabase row ID
  series_animedb_id: number;
  series_title: string;
  series_type: string;
  series_episodes: number;
  my_status: string;
  my_score: number;
  my_watched_episodes: number;
  poster_url?: string; // Assuming you enrich your DB with this
  genres?: number[];   // Assuming you store genre IDs
  created_at: string;
}

interface JikanGenre {
  mal_id: number;
  name: string;
}

const TABS = ["All", "Watching", "Completed", "On Hold", "Dropped", "Plan to Watch"];
const SORT_OPTIONS = ["Title A-Z", "Score High-Low", "Recently Added"];
const TYPES = ["TV", "Movie", "OVA", "ONA"];

export default function WatchlistPage() {
  // State
  const [activeTab, setActiveTab] = useState("All");
  const [animes, setAnimes] = useState<AnimeEntry[]>([]);
  const [genres, setGenres] = useState<JikanGenre[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Sorting State
  const [sortBy, setSortBy] = useState("Recently Added");
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [minScore, setMinScore] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch Watchlist from Supabase when Tab changes
  useEffect(() => {
    const fetchWatchlist = async () => {
      setIsLoading(true);
      
      let query = supabase.from("watchlist_entries").select("*");
      
      if (activeTab !== "All") {
        query = query.eq("my_status", activeTab.toLowerCase().replace(/ /g, ""));
      }

      const { data, error } = await query;
      
      if (!error && data) {
        setAnimes(data as AnimeEntry[]);
      }
      setIsLoading(false);
    };

    fetchWatchlist();
  }, [activeTab, supabase]);

  // Fetch Genres from Jikan API once
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await fetch("https://api.jikan.moe/v4/genres/anime");
        const json = await res.json();
        setGenres(json.data || []);
      } catch (err) {
        console.error("Failed to fetch genres", err);
      }
    };
    fetchGenres();
  }, []);

  // Client-Side Filtering & Sorting
  const filteredAndSortedAnimes = useMemo(() => {
    let result = [...animes];

    // Filter by Type
    if (filterTypes.length > 0) {
      result = result.filter((a) => filterTypes.includes(a.series_type));
    }

    // Filter by Score
    if (minScore > 0) {
      result = result.filter((a) => a.my_score >= minScore);
    }

    // Filter by Genre
    if (selectedGenres.length > 0) {
      result = result.filter((a) => 
        a.genres?.some(g => selectedGenres.includes(g))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "Title A-Z") return a.series_title.localeCompare(b.series_title);
      if (sortBy === "Score High-Low") return b.my_score - a.my_score;
      if (sortBy === "Recently Added") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

    return result;
  }, [animes, filterTypes, minScore, selectedGenres, sortBy]);

  // Quick Action Handlers
  const handleUpdateEpisodes = async (id: string, currentEps: number, totalEps: number) => {
    if (currentEps >= totalEps && totalEps !== 0) return;
    
    // Optimistic UI update
    setAnimes(prev => prev.map(a => a.id === id ? { ...a, my_watched_episodes: currentEps + 1 } : a));
    
    // DB update
    await supabase.from("watchlist_entries").update({ my_watched_episodes: currentEps + 1 }).eq("id", id);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setAnimes(prev => prev.map(a => a.id === id ? { ...a, my_status: newStatus } : a));
    await supabase.from("watchlist_entries").update({ my_status: newStatus }).eq("id", id);
  };

  const toggleFilterArray = (item: any, array: any[], setArray: React.Dispatch<React.SetStateAction<any[]>>) => {
    setArray(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6">
      
      {/* 1. Top Tab Row */}
      <div className="flex space-x-2 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* 2. Left Sidebar (Filters) */}
        <aside className="w-full lg:w-64 shrink-0 space-y-6">
          {/* Sort Dropdown */}
          <div>
            <h3 className="font-semibold mb-2">Sort By</h3>
            <select 
              className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <h3 className="font-semibold mb-2">Format</h3>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => toggleFilterArray(type, filterTypes, setFilterTypes)}
                  className={`px-3 py-1 text-xs rounded-md border ${
                    filterTypes.includes(type) ? "bg-blue-100 border-blue-600 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Score Filter */}
          <div>
            <h3 className="font-semibold mb-2">Min Score ({minScore}+)</h3>
            <input 
              type="range" 
              min="0" max="10" step="1" 
              value={minScore} 
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          {/* Genre Filter */}
          <div>
            <h3 className="font-semibold mb-2">Genres</h3>
            <div className="h-64 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
              {genres.map(genre => (
                <label key={genre.mal_id} className="flex items-center space-x-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedGenres.includes(genre.mal_id)}
                    onChange={() => toggleFilterArray(genre.mal_id, selectedGenres, setSelectedGenres)}
                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{genre.name}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* 4. Anime Grid */}
        <main className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-pulse">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
              ))}
            </div>
          ) : filteredAndSortedAnimes.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">No anime found matching your criteria.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredAndSortedAnimes.map((anime) => (
                <div key={anime.id} className="group relative rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col">
                  
                  {/* Poster Area */}
                  <div className="relative aspect-[2/3] w-full bg-zinc-200 dark:bg-zinc-800">
                    {anime.poster_url ? (
                      <img src={anime.poster_url} alt={anime.series_title} className="object-cover w-full h-full" />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-zinc-400">No Image</div>
                    )}
                    
                    {/* Score Badge */}
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                      ★ {anime.my_score || "N/A"}
                    </div>

                    {/* 5. Hover Action Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-4 space-y-3 backdrop-blur-sm">
                      <button 
                        onClick={() => handleUpdateEpisodes(anime.id, anime.my_watched_episodes, anime.series_episodes)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg font-medium transition-colors"
                      >
                        +1 Episode
                      </button>
                      <select 
                        className="w-full bg-zinc-800 text-white text-sm p-2 rounded-lg border border-zinc-600"
                        value={anime.my_status}
                        onChange={(e) => handleUpdateStatus(anime.id, e.target.value)}
                      >
                        <option value="watching">Watching</option>
                        <option value="completed">Completed</option>
                        <option value="onhold">On Hold</option>
                        <option value="dropped">Dropped</option>
                        <option value="plantowatch">Plan to Watch</option>
                      </select>
                    </div>
                  </div>

                  {/* Info Area */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <h4 className="font-semibold text-sm line-clamp-2 leading-tight" title={anime.series_title}>
                      {anime.series_title}
                    </h4>
                    <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{anime.series_type}</span>
                      <span>
                        Ep: {anime.my_watched_episodes} / {anime.series_episodes === 0 ? "?" : anime.series_episodes}
                      </span>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}