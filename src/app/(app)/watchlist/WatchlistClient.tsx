"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";
import AddAnimeSearch from "@/components/AddAnimeSearch";
import AnimeCard from "@/components/AnimeCard";

// Define the shape of your data
export interface WatchlistEntry {
  id: string;
  mal_id: number;
  title: string;
  status: string;
  score: number | null;
  watched_episodes: number;
  total_episodes: number | null;
  poster_url: string | null;
  created_at: string;
  type?: string; // Optional, assuming you might join this from anime_metadata
}

interface Props {
  initialWatchlist: WatchlistEntry[];
}

const TABS = [
  { id: "all", label: "All" },
  { id: "watching", label: "Watching" },
  { id: "completed", label: "Completed" },
  { id: "on_hold", label: "On Hold" },
  { id: "dropped", label: "Dropped" },
  { id: "plan_to_watch", label: "Plan to Watch" },
];

const TYPES = ["TV", "Movie", "OVA", "ONA", "Special"];

export default function WatchlistClient({ initialWatchlist }: Props) {
  // --- State ---
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [minScore, setMinScore] = useState<number>(0);
  const [sortBy, setSortBy] = useState("recent");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);


  const handleRemove = async (id: string) => {
    try {
      const res = await fetch(`/api/watchlist/delete?id=${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Failed to delete");
      
      // Tell Next.js to quietly refresh the list from the server
      router.refresh(); 
    } catch (error) {
      console.error(error);
      alert("Failed to remove anime. Please try again.");
    }
  };
  // --- Client-Side Filtering & Sorting (Instant!) ---
  const filteredAndSorted = useMemo(() => {
    let result = [...initialWatchlist];

    // 1. Filter by Tab
    if (activeTab !== "all") {
      result = result.filter((entry) => entry.status === activeTab);
    }

    // 2. Filter by Type (If your data includes it, otherwise it safely ignores)
    if (selectedTypes.length > 0) {
      result = result.filter((entry) => selectedTypes.includes(entry.type || "TV"));
    }

    // 3. Filter by Min Score
    if (minScore > 0) {
      result = result.filter((entry) => (entry.score || 0) >= minScore);
    }

    // 4. Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "title_az":
          return a.title.localeCompare(b.title);
        case "title_za":
          return b.title.localeCompare(a.title);
        case "score_high":
          return (b.score || 0) - (a.score || 0);
        case "score_low":
          return (a.score || 0) - (b.score || 0);
        case "progress":
          const progressA = a.total_episodes ? a.watched_episodes / a.total_episodes : 0;
          const progressB = b.total_episodes ? b.watched_episodes / b.total_episodes : 0;
          return progressB - progressA;
        case "recent":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [initialWatchlist, activeTab, selectedTypes, minScore, sortBy]);

  // --- Helpers ---
  const clearFilters = () => {
    setSelectedTypes([]);
    setMinScore(0);
    setSortBy("recent");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "watching": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "completed": return "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30";
      case "on_hold": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "dropped": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 mt-10 pb-24">
      {/* Category Tabs (Instant Client-Side Switch) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 custom-scrollbar">
        {TABS.map((tab) => {
          const count = initialWatchlist.filter(
            (e) => tab.id === "all" || e.status === tab.id
          ).length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                activeTab === tab.id
                  ? "bg-zinc-100 text-zinc-900 border-zinc-200"
                  : "bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === tab.id ? "bg-zinc-300/50 text-zinc-800" : "bg-zinc-800 text-zinc-500"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* --- Left Sidebar: Filters & Sorting --- */}
        <aside className="w-full lg:w-64 shrink-0 space-y-8 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/80 h-fit">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white">Filters</h2>
            <button onClick={clearFilters} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              Clear All
            </button>
          </div>

          {/* Sort By */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1"
            >
              <option value="recent">Recently Added</option>
              <option value="title_az">Title (A-Z)</option>
              <option value="title_za">Title (Z-A)</option>
              <option value="score_high">Score (High - Low)</option>
              <option value="score_low">Score (Low - High)</option>
              <option value="progress">Episode Progress</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Format</label>
            <div className="flex flex-col gap-2">
              {TYPES.map((type) => (
                <label key={type} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    selectedTypes.includes(type) ? "bg-cyan-600 border-cyan-500" : "bg-zinc-950 border-zinc-700 group-hover:border-zinc-500"
                  }`}>
                    {selectedTypes.includes(type) && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedTypes.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTypes([...selectedTypes, type]);
                      else setSelectedTypes(selectedTypes.filter((t) => t !== type));
                    }}
                  />
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Score Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Min Score</label>
              <span className="text-xs font-bold text-cyan-400">{minScore > 0 ? `${minScore} ★` : "Any"}</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </aside>

        {/* --- Right Main Area: Grid --- */}
        <div className="flex-1">
          {filteredAndSorted.length === 0 ? (
            <div className="py-24 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
              No anime found matching these filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredAndSorted.map((anime) => (
                <AnimeCard
                  key={anime.id}
                  entry={anime}
                  onRemove={handleRemove}
                />
              ))}
              
            </div>
          )}
        </div>
      </div>

      {/* --- Floating Action Button & Search Modal --- */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(217,70,239,0.4)] hover:scale-110 active:scale-95 transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4 bg-black/80 backdrop-blur-sm">
          {/* Invisible backdrop to close modal when clicking outside */}
          <div className="absolute inset-0" onClick={() => setIsSearchModalOpen(false)}></div>
          
          <div className="relative w-full max-w-2xl bg-transparent">
            {/* Your existing AddAnimeSearch component handles its own internal routing.
              Because it uses router.refresh() after adding, this Client Component 
              will automatically receive the new `initialWatchlist` from the Server!
            */}
            <AddAnimeSearch />
            
            <button 
              onClick={() => setIsSearchModalOpen(false)}
              className="absolute -top-12 right-0 text-zinc-400 hover:text-white flex items-center gap-2 text-sm font-bold tracking-widest uppercase"
            >
              Close <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}