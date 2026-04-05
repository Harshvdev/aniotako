"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import AnimeCard from "@/components/AnimeCard";
import AddAnimeSearch from "@/components/AddAnimeSearch";
import WatchlistFilter from "@/components/WatchlistFilter";
import Link from "next/link";

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
  anime_metadata?: {
    genres: string[];
    year: number | null;
    type: string | null;
    season: string | null;
    airing_status?: string | null;
  };
}

interface Props {
  initialWatchlist: WatchlistEntry[];
}

export default function WatchlistClient({ initialWatchlist }: Props) {
  const router = useRouter();
  
  const [filteredList, setFilteredList] = useState<WatchlistEntry[]>(initialWatchlist);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  
  // NEW: State for Mobile Filter Sheet
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log("🔍 CHECKING ANIME METADATA:", initialWatchlist[0]);
  }, [initialWatchlist]);

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch(`/api/watchlist/delete?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.refresh(); 
    } catch (error) {
      console.error(error);
      alert("Failed to remove anime. Please try again.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-10 pb-24 relative z-10">
      
      {/* MOBILE HEADER: Title + Filter Button + Calendar */}
      <div className="md:hidden flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white tracking-tight">My List</h1>
        <div className="flex items-center gap-2">
          <Link href="/calendar" className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </Link>
          <button
            onClick={() => setIsFilterSheetOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Filters
          </button>
        </div>
      </div>

      {/* DESKTOP FILTER (Hidden on Mobile) */}
      <div className="hidden md:block mb-8">
        <WatchlistFilter entries={initialWatchlist} onFilter={setFilteredList} />
      </div>

      {/* MOBILE FILTER BOTTOM SHEET (Portaled) */}
      {mounted && isFilterSheetOpen && createPortal(
        <div className="md:hidden">
          <div className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm animate-in fade-in" onClick={() => setIsFilterSheetOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 w-full h-[85vh] bg-zinc-950 border-t border-zinc-800 rounded-t-2xl shadow-[0_-20px_40px_rgba(0,0,0,0.8)] z-[101] flex flex-col animate-in slide-in-from-bottom-full">
            
            {/* Sheet Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0 bg-zinc-900/50 rounded-t-2xl">
              <span className="font-bold text-white tracking-widest uppercase text-sm">Filters</span>
              <button onClick={() => setIsFilterSheetOpen(false)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* Scrollable Filter Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
               <WatchlistFilter entries={initialWatchlist} onFilter={setFilteredList} />
            </div>
            
            {/* Sticky Apply Button */}
            <div className="p-4 border-t border-zinc-800 shrink-0 bg-zinc-950">
               <button onClick={() => setIsFilterSheetOpen(false)} className="w-full py-3.5 bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg">
                 Apply Filters & Close
               </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Grid Area */}
      {filteredList.length === 0 ? (
        <div className="py-24 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
          No anime found matching these filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
          {filteredList.map((anime) => (
            <AnimeCard 
              key={anime.id} 
              entry={anime} 
              onRemove={handleRemove} 
            />
          ))}
        </div>
      )}

      {/* Floating Add Button */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50">
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(217,70,239,0.4)] hover:scale-110 active:scale-95 transition-all"
        >
          <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      {/* Search Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center pt-20 sm:pt-24 px-4 bg-black/80 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsSearchModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-transparent">
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