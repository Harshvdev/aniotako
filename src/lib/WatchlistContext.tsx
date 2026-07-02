"use client";

import React, { createContext, useContext, useState } from "react";

export interface WatchlistStatus {
  id: string;
  status: string;
  score: number | null;
  watched_episodes: number;
}

interface WatchlistContextType {
  watchlistMap: Map<number, WatchlistStatus>;
  isUpdating: boolean;
  addToWatchlist: (anime: { 
    mal_id: number; 
    title: string; 
    poster_url: string | null; 
    total_episodes: number | null;
    anilist_id?: number | null;
  }) => Promise<void>;
  updateWatchlistStatus: (malId: number, status: string) => Promise<void>;
  removeFromWatchlist: (malId: number) => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({
  children,
  initialWatchlist = [],
}: {
  children: React.ReactNode;
  initialWatchlist?: any[];
}) {
  const [watchlistMap, setWatchlistMap] = useState<Map<number, WatchlistStatus>>(() => {
    const map = new Map<number, WatchlistStatus>();
    initialWatchlist.forEach((entry: any) => {
      map.set(Number(entry.mal_id), {
        id: entry.id,
        status: entry.status,
        score: entry.score,
        watched_episodes: entry.watched_episodes || 0,
      });
    });
    return map;
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [lastMutationTimestamp, setLastMutationTimestamp] = useState(0);

  const addToWatchlist = async (anime: {
    mal_id: number;
    title: string;
    poster_url: string | null;
    total_episodes: number | null;
    anilist_id?: number | null;
  }) => {
    const malId = Number(anime.mal_id);
    const mutationTime = Date.now();
    setLastMutationTimestamp(mutationTime);
    setIsUpdating(true);

    const prevMap = new Map(watchlistMap);

    // Optimistic insert
    setWatchlistMap((prev) => {
      const next = new Map(prev);
      next.set(malId, {
        id: "temp-id",
        status: "watching",
        score: null,
        watched_episodes: 0,
      });
      return next;
    });

    try {
      const res = await fetch("/api/watchlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mal_id: malId,
          title: anime.title,
          status: "watching",
          score: 0,
          watched_episodes: 0,
          total_episodes: anime.total_episodes,
          poster_url: anime.poster_url,
          anilist_id: anime.anilist_id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add to watchlist");

      // Verify no newer mutations occurred
      if (mutationTime >= lastMutationTimestamp) {
        setWatchlistMap((prev) => {
          const next = new Map(prev);
          next.set(malId, {
            id: data.entry.id,
            status: data.entry.status,
            score: data.entry.score,
            watched_episodes: data.entry.watched_episodes || 0,
          });
          return next;
        });
      }
    } catch (err) {
      console.error(err);
      if (mutationTime >= lastMutationTimestamp) {
        setWatchlistMap(prevMap); // Rollback
      }
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateWatchlistStatus = async (malId: number, status: string) => {
    const entry = watchlistMap.get(malId);
    if (!entry) return;

    const mutationTime = Date.now();
    setLastMutationTimestamp(mutationTime);
    setIsUpdating(true);

    const prevMap = new Map(watchlistMap);

    // Optimistic update
    setWatchlistMap((prev) => {
      const next = new Map(prev);
      const prevEntry = next.get(malId);
      if (prevEntry) {
        next.set(malId, { ...prevEntry, status });
      }
      return next;
    });

    try {
      const res = await fetch("/api/watchlist/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entry.id,
          updates: { status },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update watchlist");
    } catch (err) {
      console.error(err);
      if (mutationTime >= lastMutationTimestamp) {
        setWatchlistMap(prevMap); // Rollback
      }
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const removeFromWatchlist = async (malId: number) => {
    const entry = watchlistMap.get(malId);
    if (!entry) return;

    const mutationTime = Date.now();
    setLastMutationTimestamp(mutationTime);
    setIsUpdating(true);

    const prevMap = new Map(watchlistMap);

    // Optimistic delete
    setWatchlistMap((prev) => {
      const next = new Map(prev);
      next.delete(malId);
      return next;
    });

    try {
      const res = await fetch(`/api/watchlist/delete?id=${entry.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete entry from database");
    } catch (err) {
      console.error(err);
      if (mutationTime >= lastMutationTimestamp) {
        setWatchlistMap(prevMap); // Rollback
      }
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <WatchlistContext.Provider
      value={{
        watchlistMap,
        isUpdating,
        addToWatchlist,
        updateWatchlistStatus,
        removeFromWatchlist,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error("useWatchlist must be used within a WatchlistProvider");
  }
  return context;
}
