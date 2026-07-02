"use client";

import { useWatchlist } from "@/lib/WatchlistContext";
import { SearchResult } from "@/hooks/useAutocompleteSearch";
import { useState } from "react";

interface SearchResultRowProps {
  anime: SearchResult;
  isActive: boolean;
  onSelect: () => void;
  onMobileActionClick: (anime: SearchResult) => void;
}

export default function SearchResultRow({
  anime,
  isActive,
  onSelect,
  onMobileActionClick,
}: SearchResultRowProps) {
  const { watchlistMap, addToWatchlist, updateWatchlistStatus, removeFromWatchlist } = useWatchlist();
  const [loading, setLoading] = useState(false);

  const entry = watchlistMap.get(Number(anime.mal_id));
  const isAdded = !!entry;

  const handleStatusChange = async (newStatus: string) => {
    if (!anime.mal_id) return;
    setLoading(true);
    try {
      if (newStatus === "remove") {
        await removeFromWatchlist(Number(anime.mal_id));
      } else if (isAdded) {
        await updateWatchlistStatus(Number(anime.mal_id), newStatus);
      } else {
        await addToWatchlist({
          mal_id: Number(anime.mal_id),
          title: anime.title,
          poster_url: anime.poster_url,
          total_episodes: anime.episodes,
          anilist_id: anime.anilist_id,
        });
        if (newStatus !== "watching") {
          await updateWatchlistStatus(Number(anime.mal_id), newStatus);
        }
      }
    } catch (err) {
      console.error("Watchlist status update error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("select") || target.closest("button")) {
      return;
    }
    onSelect();
  };

  return (
    <div
      onClick={handleRowClick}
      className={`w-full flex items-center gap-4 p-3 hover:bg-zinc-800/80 transition-all border-b border-zinc-900/60 text-left shrink-0 cursor-pointer relative group ${
        isActive ? "bg-zinc-800/70 border-l-2 border-l-cyan-500" : ""
      }`}
    >
      <img
        src={anime.poster_url || ""}
        alt={anime.title}
        className="w-10 h-14 object-cover rounded bg-zinc-800 shrink-0 shadow-md"
      />

      <div className="flex-1 min-w-0 pr-12 sm:pr-0">
        <h4 className="text-zinc-100 font-bold text-sm truncate group-hover:text-cyan-400 transition-colors">
          {anime.title}
        </h4>
        <div className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
          <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 font-black border border-zinc-800">
            {anime.type}
          </span>
          {anime.year && <span>{anime.year}</span>}
          {anime.episodes && (
            <>
              <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
              <span>{anime.episodes} eps</span>
            </>
          )}
        </div>
      </div>

      {/* Desktop Quick Actions (On Hover) */}
      <div className="hidden sm:flex items-center gap-2 ml-auto shrink-0 relative z-20">
        {loading ? (
          <div className="w-4 h-4 border-2 border-zinc-500 border-t-cyan-500 rounded-full animate-spin"></div>
        ) : (
          <select
            value={entry?.status || "add"}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`text-xs font-bold rounded-xl px-3 py-1.5 border transition-all cursor-pointer bg-zinc-950/80 hover:bg-zinc-900 focus:outline-none ${
              isAdded
                ? "text-emerald-400 border-emerald-500/30"
                : "text-zinc-400 border-zinc-800 hover:border-zinc-500 hover:text-white"
            }`}
          >
            <option value="add" disabled={isAdded}>
              + Add to List
            </option>
            <option value="watching">Watching</option>
            <option value="plan_to_watch">Plan to Watch</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="dropped">Dropped</option>
            {isAdded && (
              <option value="remove" className="text-red-400 font-semibold">
                ✕ Remove Entry
              </option>
            )}
          </select>
        )}
      </div>

      {/* Mobile Actions Button */}
      <div className="sm:hidden absolute right-3 top-1/2 -translate-y-1/2 z-20">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMobileActionClick(anime);
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
            isAdded
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-zinc-800/80 border-zinc-700 text-zinc-400"
          }`}
        >
          {isAdded ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
