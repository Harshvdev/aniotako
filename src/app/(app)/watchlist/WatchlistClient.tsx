"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AnimeCard from "@/components/AnimeCard";
import AddAnimeSearch from "@/components/AddAnimeSearch";
import WatchlistFilter from "@/components/WatchlistFilter";

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
  
  // Grid State (Controlled by WatchlistFilter component)
  const [filteredList, setFilteredList] = useState<WatchlistEntry[]>(initialWatchlist);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  useEffect(() => {
    // This will print the very first anime in your list to the browser console
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
    <div className="max-w-7xl mx-auto px-6 mt-10 pb-24 relative z-10">
      
      {/* Top Filter Panel */}
      <WatchlistFilter entries={initialWatchlist} onFilter={setFilteredList} />

      {/* Grid Area */}
      {filteredList.length === 0 ? (
        <div className="py-24 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
          No anime found matching these filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
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