"use client";

import { useState, useRef, useEffect } from "react";

export interface WatchlistEntry {
  id: string;
  mal_id: number;
  title: string;
  status: string;
  score: number | null;
  watched_episodes: number;
  total_episodes: number | null;
  poster_url: string | null;
}

interface AnimeCardProps {
  entry: WatchlistEntry;
  onRemove?: (id: string) => void; // Optional callback if you want the parent to handle deletion from the grid
}

export default function AnimeCard({ entry, onRemove }: AnimeCardProps) {
  // --- Optimistic UI State ---
  const [anime, setAnime] = useState<WatchlistEntry>(entry);
  
  // --- UI Toggles ---
  const [isScoreOpen, setIsScoreOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  
  const scoreRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (scoreRef.current && !scoreRef.current.contains(event.target as Node)) setIsScoreOpen(false);
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) setIsOptionsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Core Update Logic ---
  const handleUpdate = async (updates: Partial<WatchlistEntry>) => {
    // 1. Save previous state for rollback
    const previousState = { ...anime };
    
    // 2. Optimistic Update (Instant UI feedback)
    setAnime((prev) => ({ ...prev, ...updates }));

    try {
      // 3. API Call
      const res = await fetch("/api/watchlist/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: anime.id, updates }),
      });

      if (!res.ok) throw new Error("Update failed");
    } catch (error) {
      console.error(error);
      // 4. Rollback on failure
      setAnime(previousState);
      alert("Failed to update. Please try again.");
    }
  };

  // --- Specific Action Handlers ---
  const incrementEpisode = () => {
    if (anime.total_episodes && anime.watched_episodes >= anime.total_episodes) return;
    
    const newCount = anime.watched_episodes + 1;
    const updates: Partial<WatchlistEntry> = { watched_episodes: newCount };

    // Auto-prompt to complete
    if (anime.total_episodes && newCount === anime.total_episodes && anime.status !== "completed") {
      const confirmComplete = window.confirm(`You've reached the final episode of ${anime.title}. Mark as Completed?`);
      if (confirmComplete) {
        updates.status = "completed";
      }
    }

    handleUpdate(updates);
  };

  const decrementEpisode = () => {
    if (anime.watched_episodes <= 0) return;
    handleUpdate({ watched_episodes: anime.watched_episodes - 1 });
  };

  // --- Rendering Helpers ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case "watching": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "completed": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "on_hold": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "dropped": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  const formatStatus = (status: string) => status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="group flex flex-col bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden hover:border-zinc-600 transition-colors shadow-lg relative">
      
      {/* --- Poster & Top Badges --- */}
      <div className="relative aspect-[2/3] w-full bg-zinc-800/50 overflow-hidden">
        {anime.poster_url ? (
          <img 
            src={anime.poster_url} 
            alt={anime.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-zinc-600">
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">No Image</span>
          </div>
        )}

        {/* Score Selector (Clickable) */}
        <div className="absolute top-2 right-2" ref={scoreRef}>
          <button 
            onClick={() => setIsScoreOpen(!isScoreOpen)}
            className="px-2 py-1 bg-black/70 backdrop-blur-md rounded-md text-xs font-black text-amber-400 border border-white/10 shadow-md hover:bg-black/90 transition-colors flex items-center gap-1"
          >
            ★ {anime.score || "-"}
          </button>

          {isScoreOpen && (
            <div className="absolute top-full right-0 mt-1 w-32 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-20 grid grid-cols-5 p-1 gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    handleUpdate({ score: num === 0 ? null : num });
                    setIsScoreOpen(false);
                  }}
                  className={`py-1 text-xs font-bold rounded ${anime.score === num ? 'bg-amber-500 text-black' : 'text-zinc-300 hover:bg-zinc-800'}`}
                >
                  {num === 0 ? "-" : num}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Options Menu (...) */}
        <div className="absolute top-2 left-2" ref={optionsRef}>
          <button 
            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
            className="w-7 h-7 bg-black/70 backdrop-blur-md rounded-md text-white border border-white/10 shadow-md flex items-center justify-center hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
          </button>

          {isOptionsOpen && (
            <div className="absolute top-full left-0 mt-1 w-40 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-20 py-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Status</div>
              {["watching", "completed", "on_hold", "dropped", "plan_to_watch"].map((s) => (
                <button
                  key={s}
                  onClick={() => { handleUpdate({ status: s }); setIsOptionsOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-xs hover:bg-zinc-800 ${anime.status === s ? 'text-cyan-400 font-bold' : 'text-zinc-300'}`}
                >
                  {formatStatus(s)}
                </button>
              ))}
              <div className="border-t border-zinc-800 my-1"></div>
              <button className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Edit Details</button>
              <button 
                onClick={() => {
                  if(window.confirm("Remove this anime from your list?")) {
                    onRemove?.(anime.id); // Parent handles actual deletion
                    setIsOptionsOpen(false);
                  }
                }}
                className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-zinc-800"
              >
                Remove from list
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- Info Area --- */}
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-3">
          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border ${getStatusColor(anime.status)} mb-2 transition-colors`}>
            {formatStatus(anime.status)}
          </span>
          <h3 className="font-semibold text-sm line-clamp-2 leading-snug group-hover:text-cyan-400 transition-colors" title={anime.title}>
            {anime.title}
          </h3>
        </div>

        {/* --- Episode Counter --- */}
        <div className="mt-auto">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-zinc-500 font-medium">Progress</span>
            
            <div className="flex items-center gap-2 bg-zinc-950 rounded-lg p-1 border border-zinc-800">
              <button 
                onClick={decrementEpisode}
                disabled={anime.watched_episodes <= 0}
                className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 transition-colors text-zinc-300"
              >
                -
              </button>
              <span className="font-mono font-bold text-zinc-200 min-w-[3ch] text-center">
                {anime.watched_episodes}
              </span>
              <button 
                onClick={incrementEpisode}
                disabled={!!(anime.total_episodes && anime.watched_episodes >= anime.total_episodes)}
                className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 transition-colors text-zinc-300"
              >
                +
              </button>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 rounded-full transition-all duration-300"
              style={{ width: anime.total_episodes ? `${Math.min((anime.watched_episodes / anime.total_episodes) * 100, 100)}%` : '0%' }}
            />
          </div>
        </div>
      </div>

    </div>
  );
}