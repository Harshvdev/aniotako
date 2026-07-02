"use client";

import { useWatchlist } from "@/lib/WatchlistContext";
import { PaginatedSearchResult } from "@/hooks/usePaginatedSearch";
import { useState } from "react";
import Link from "next/link";

interface SearchAnimeCardProps {
  anime: PaginatedSearchResult;
}

export default function SearchAnimeCard({ anime }: SearchAnimeCardProps) {
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
      console.error("Watchlist status mutation error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group flex flex-col bg-zinc-900/40 border border-zinc-800/80 rounded-xl sm:rounded-2xl overflow-hidden hover:border-zinc-600 transition-colors shadow-lg relative w-full">
      <div className="relative aspect-[2/3] w-full bg-zinc-800/50 overflow-hidden shrink-0">
        <Link href={`/anime/${anime.mal_id}`} className="absolute inset-0 z-0 block">
          {anime.poster_url ? (
            <img
              src={anime.poster_url}
              alt={anime.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-zinc-600">
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">No Image</span>
            </div>
          )}
        </Link>

        {anime.average_score && (
          <div className="absolute top-2 left-2 z-10">
            <div className="px-2 py-1 bg-black/80 backdrop-blur-md rounded-md text-xs font-black text-amber-400 border border-white/10 shadow-md">
              ★ {anime.average_score.toFixed(1)}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-1 z-10 bg-zinc-900/40">
        <div className="mb-3">
          <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 font-black border border-zinc-800 uppercase tracking-wider inline-block mb-1.5">
            {anime.type}
          </span>
          <Link href={`/anime/${anime.mal_id}`} className="block group-hover:text-cyan-400 transition-colors">
            <h3 className="font-bold text-xs sm:text-sm line-clamp-2 leading-snug cursor-pointer" title={anime.title}>
              {anime.title}
            </h3>
          </Link>
          {anime.year && (
            <span className="text-[10px] text-zinc-500 font-medium block mt-1">
              {anime.season ? `${anime.season} ` : ""}{anime.year}
            </span>
          )}
        </div>

        <div className="mt-auto pt-2 border-t border-zinc-800/40">
          {loading ? (
            <div className="py-1.5 flex justify-center">
              <div className="w-4 h-4 border-2 border-zinc-500 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <select
              value={entry?.status || "add"}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`w-full text-xs font-bold rounded-xl px-3 py-2 border transition-all cursor-pointer bg-zinc-950/80 hover:bg-zinc-900 focus:outline-none text-center ${
                isAdded
                  ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
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
                  ✕ Remove
                </option>
              )}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
