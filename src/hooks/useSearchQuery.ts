import { useState, useCallback } from "react";

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const cacheMap = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useSearchQuery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWithCache = useCallback(async (url: string, signal?: AbortSignal) => {
    const cached = cacheMap.get(url);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();

      cacheMap.set(url, {
        data,
        expiresAt: Date.now() + CACHE_TTL,
      });

      return data;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to fetch search results");
        throw err;
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchWithCache, loading, error };
}
