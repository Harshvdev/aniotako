"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useTitleLanguage } from "@/lib/TitleLanguageContext";
import ConfirmModal from "./ConfirmModal";

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
  onRemove?: (id: string) => void;
}

export default function AnimeCard({ entry, onRemove }: AnimeCardProps) {
  const { getTitle } = useTitleLanguage();
  const [anime, setAnime] = useState<WatchlistEntry>(entry);
  const [isScoreOpen, setIsScoreOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  const scoreRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  
  // THE FIX: We MUST track the portal so clicks inside it aren't treated as "outside" clicks
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (scoreRef.current && !scoreRef.current.contains(event.target as Node)) {
        setIsScoreOpen(false);
      }
      
      // THE FIX: Check if the click was inside the options menu OR inside the mobile portal
      if (
        optionsRef.current && 
        !optionsRef.current.contains(event.target as Node) &&
        (!portalRef.current || !portalRef.current.contains(event.target as Node))
      ) {
        setIsOptionsOpen(false);
      }
    }
    
    // THE FIX: Listen for touchstart to catch mobile taps immediately
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleUpdate = async (updates: Partial<WatchlistEntry>) => {
    const previousState = { ...anime };
    setAnime((prev) => ({ ...prev, ...updates }));

    try {
      const res = await fetch("/api/watchlist/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: anime.id, updates }),
      });
      if (!res.ok) throw new Error("Update failed");
    } catch (error) {
      setAnime(previousState);
      alert("Failed to update. Please try again.");
    }
  };

  const incrementEpisode = () => {
    if (anime.total_episodes && anime.watched_episodes >= anime.total_episodes) return;
    const newCount = anime.watched_episodes + 1;
    const updates: Partial<WatchlistEntry> = { watched_episodes: newCount };

    if (anime.total_episodes && newCount === anime.total_episodes && anime.status !== "completed") {
      if (window.confirm(`You've reached the final episode of ${anime.title}. Mark as Completed?`)) {
        updates.status = "completed";
      }
    }
    handleUpdate(updates);
  };

  const decrementEpisode = () => {
    if (anime.watched_episodes <= 0) return;
    handleUpdate({ watched_episodes: anime.watched_episodes - 1 });
  };

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

  const handleConfirmRemove = () => {
    setIsConfirmModalOpen(false);
    if (onRemove) {
      onRemove(anime.id);
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
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-zinc-600">
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">No Image</span>
            </div>
          )}
        </Link>

        {/* Score Selector: Top Left (Always Visible) */}
        <div className="absolute top-2 left-2 z-10" ref={scoreRef}>
          <button 
            onClick={(e) => { e.preventDefault(); setIsScoreOpen(!isScoreOpen); }}
            className="px-2 py-1 bg-black/80 backdrop-blur-md rounded-md text-xs sm:text-sm font-black text-amber-400 border border-white/10 shadow-md hover:bg-black/90 transition-colors flex items-center gap-1"
          >
            ★ {anime.score || "-"}
          </button>

          {isScoreOpen && (
            <div className="absolute top-full left-0 mt-1 w-32 max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-20 grid grid-cols-5 p-1 gap-1 custom-scrollbar">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={(e) => {
                    e.preventDefault();
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

        {/* Options Menu: Top Right (Always Visible) */}
        <div className="absolute top-2 right-2 z-10" ref={optionsRef}>
          <button 
            onClick={(e) => { e.preventDefault(); setIsOptionsOpen(!isOptionsOpen); }}
            className="w-8 h-8 sm:w-7 sm:h-7 bg-black/80 backdrop-blur-md rounded-md text-white border border-white/10 shadow-md flex items-center justify-center hover:bg-black/90 transition-colors"
          >
            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
          </button>

          {isOptionsOpen && (
            <>
              {/* Desktop Dropdown */}
              <div className="hidden sm:block absolute top-full right-0 mt-1 w-40 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 py-1">
                <div className="px-4 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Status</div>
                {["watching", "completed", "on_hold", "dropped", "plan_to_watch"].map((s) => (
                  <button
                    key={s}
                    onClick={(e) => { e.preventDefault(); handleUpdate({ status: s }); setIsOptionsOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-xs hover:bg-zinc-800 ${anime.status === s ? 'text-cyan-400 font-bold' : 'text-zinc-300'}`}
                  >
                    {formatStatus(s)}
                  </button>
                ))}
                <div className="border-t border-zinc-800 my-1"></div>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    setIsConfirmModalOpen(true);
                    setIsOptionsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-zinc-800"
                >
                  Remove from list
                </button>
              </div>

              {/* Mobile Bottom Sheet (Portaled to document body) */}
              {mounted && createPortal(
                <div className="sm:hidden" ref={portalRef}>
                  <div 
                    className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm" 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOptionsOpen(false); }} 
                  />
                  <div className="fixed inset-x-0 bottom-0 w-full max-h-[80vh] overflow-y-auto bg-zinc-900 border-t border-zinc-700 rounded-t-2xl shadow-[0_-20px_40px_rgba(0,0,0,0.6)] z-[101] py-4 animate-in slide-in-from-bottom-full pb-8 custom-scrollbar">
                    <div className="px-6 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Status</div>
                    {["watching", "completed", "on_hold", "dropped", "plan_to_watch"].map((s) => (
                      <button
                        key={s}
                        onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          handleUpdate({ status: s }); 
                          setIsOptionsOpen(false); 
                        }}
                        className={`w-full text-left px-6 py-4 text-base hover:bg-zinc-800 ${anime.status === s ? 'text-cyan-400 font-bold' : 'text-zinc-300'}`}
                      >
                        {formatStatus(s)}
                      </button>
                    ))}
                    <div className="border-t border-zinc-800 my-2"></div>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsConfirmModalOpen(true);
                        setIsOptionsOpen(false);
                      }}
                      className="w-full text-left px-6 py-4 text-base text-red-400 hover:bg-zinc-800"
                    >
                      Remove from list
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-1 z-10 bg-zinc-900/40">
        <div className="mb-2 sm:mb-3">
          <span className={`inline-block px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded text-[9px] sm:text-[10px] font-bold tracking-widest uppercase border ${getStatusColor(anime.status)} mb-1.5 sm:mb-2 transition-colors`}>
            {formatStatus(anime.status)}
          </span>
          <Link href={`/anime/${anime.mal_id}`} className="block group-hover:text-cyan-400 transition-colors">
            <h3 className="font-semibold text-[12px] sm:text-sm line-clamp-2 leading-snug cursor-pointer" title={getTitle(anime)}>
              {getTitle(anime)}
            </h3>
          </Link>
        </div>

        <div className="mt-auto pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs text-zinc-500 font-medium">Progress</span>
            
            <div className="flex items-center gap-1 sm:gap-2 bg-zinc-950 rounded-lg p-1 border border-zinc-800 self-start sm:self-auto">
              <button 
                onClick={decrementEpisode}
                disabled={anime.watched_episodes <= 0}
                className="w-6 h-6 sm:w-6 sm:h-6 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 transition-colors text-zinc-300 shrink-0"
              >
                -
              </button>
              <span className="font-mono font-bold text-zinc-200 min-w-[3ch] text-center text-xs sm:text-sm">
                {anime.watched_episodes}
              </span>
              <button 
                onClick={incrementEpisode}
                disabled={!!(anime.total_episodes && anime.watched_episodes >= anime.total_episodes)}
                className="w-6 h-6 sm:w-6 sm:h-6 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 transition-colors text-zinc-300 shrink-0"
              >
                +
              </button>
            </div>
          </div>

          <div className="w-full h-1 sm:h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1.5 sm:mt-0">
            <div 
              className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 rounded-full transition-all duration-300"
              style={{ width: anime.total_episodes ? `${Math.min((anime.watched_episodes / anime.total_episodes) * 100, 100)}%` : '0%' }}
            />
          </div>
        </div>
      </div>

      {/* Render the Custom Modal at the root level of the card */}
      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmRemove}
        title="Remove Anime"
        description="Are you sure you want to remove this anime from your list?"
        confirmLabel="Remove"
        isDestructive={true}
      />
    </div>
  );
}