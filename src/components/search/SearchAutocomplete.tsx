"use client";

import { useState } from "react";
import { SearchResult } from "@/hooks/useAutocompleteSearch";
import SearchResultRow from "./SearchResultRow";
import ActionSheet, { ActionSheetAction } from "../ActionSheet";
import { useWatchlist } from "@/lib/WatchlistContext";

interface SearchAutocompleteProps {
  results: SearchResult[];
  showDropdown: boolean;
  activeIndex: number;
  loading: boolean;
  error: string | null;
  onSelect: (anime: SearchResult, openNewTab?: boolean) => void;
}

export default function SearchAutocomplete({
  results,
  showDropdown,
  activeIndex,
  loading,
  error,
  onSelect,
}: SearchAutocompleteProps) {
  const { watchlistMap, addToWatchlist, updateWatchlistStatus, removeFromWatchlist } = useWatchlist();
  const [selectedMobileAnime, setSelectedMobileAnime] = useState<SearchResult | null>(null);

  if (!showDropdown) return null;

  const handleMobileActionSelect = async (value: string) => {
    if (!selectedMobileAnime || !selectedMobileAnime.mal_id) return;
    const malId = Number(selectedMobileAnime.mal_id);
    const isAdded = watchlistMap.has(malId);

    try {
      if (value === "remove") {
        await removeFromWatchlist(malId);
      } else if (isAdded) {
        await updateWatchlistStatus(malId, value);
      } else {
        await addToWatchlist({
          mal_id: malId,
          title: selectedMobileAnime.title,
          poster_url: selectedMobileAnime.poster_url,
          total_episodes: selectedMobileAnime.episodes,
          anilist_id: selectedMobileAnime.anilist_id,
        });
        if (value !== "watching") {
          await updateWatchlistStatus(malId, value);
        }
      }
    } catch (err) {
      console.error("Mobile status action error:", err);
    }
  };

  const getMobileActions = (): ActionSheetAction[] => {
    if (!selectedMobileAnime) return [];
    const isAdded = watchlistMap.has(Number(selectedMobileAnime.mal_id));

    const actions: ActionSheetAction[] = [
      { label: "Watching", value: "watching" },
      { label: "Plan to Watch", value: "plan_to_watch" },
      { label: "Completed", value: "completed" },
      { label: "On Hold", value: "on_hold" },
      { label: "Dropped", value: "dropped" },
    ];

    if (isAdded) {
      actions.push({ label: "Remove from List", value: "remove", isDestructive: true });
    }

    return actions;
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto overscroll-contain z-50 flex flex-col custom-scrollbar">
      {loading && results.length === 0 && (
        <div className="p-4 text-center text-xs text-zinc-500 font-bold tracking-widest uppercase flex items-center justify-center gap-2">
          <div className="w-4.5 h-4.5 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin"></div>
          Searching...
        </div>
      )}

      {error && (
        <div className="p-4 text-center text-xs text-red-400 font-semibold">
          {error}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="p-4 text-center text-xs text-zinc-500 font-bold tracking-widest uppercase">
          No results found
        </div>
      )}

      {results.map((anime, index) => (
        <SearchResultRow
          key={anime.anilist_id}
          anime={anime}
          isActive={index === activeIndex}
          onSelect={() => onSelect(anime)}
          onMobileActionClick={(a) => setSelectedMobileAnime(a)}
        />
      ))}

      <ActionSheet
        isOpen={selectedMobileAnime !== null}
        onClose={() => setSelectedMobileAnime(null)}
        title={selectedMobileAnime?.title || "Watchlist Action"}
        actions={getMobileActions()}
        onSelect={handleMobileActionSelect}
      />
    </div>
  );
}
