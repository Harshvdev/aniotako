"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Types based on Jikan's API response
interface JikanAnime {
  mal_id: number;
  title: string;
  type: string;
  year: number;
  episodes: number;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
}

export default function AddAnimeSearch() {
  const router = useRouter();
  
  // Search State
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JikanAnime[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Modal State
  const [selectedAnime, setSelectedAnime] = useState<JikanAnime | null>(null);
  const [status, setStatus] = useState("watching");
  const [score, setScore] = useState<number>(0);
  const [watchedEpisodes, setWatchedEpisodes] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // --- 1. Debounced Search Effect ---
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/jikan/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // --- 2. Click Outside to Close Dropdown ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- 3. Handle Add to List ---
  const handleAddToList = async () => {
    if (!selectedAnime) return;
    setIsSubmitting(true);

    try {
      const payload = {
        mal_id: selectedAnime.mal_id,
        title: selectedAnime.title,
        status,
        score,
        watched_episodes: watchedEpisodes,
        total_episodes: selectedAnime.episodes,
        poster_url: selectedAnime.images.jpg.large_image_url,
      };

      const res = await fetch("/api/watchlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add anime.");
      }

      // Success
      setToast({ message: data.message, type: "success" });
      setSelectedAnime(null); // Close modal
      setQuery(""); // Clear search
      setShowDropdown(false);
      
      // Refresh the page data so the new anime appears in the watchlist behind the modal
      router.refresh(); 

    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 4. Auto-hide Toast ---
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="relative w-full max-w-2xl mx-auto z-40" ref={wrapperRef}>
      
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          placeholder="Search for anime to add..."
          className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all backdrop-blur-sm"
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <div className="w-4 h-4 border-2 border-zinc-500 border-t-cyan-500 rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Results Dropdown */}
      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto custom-scrollbar">
          {results.map((anime, index) => (
            <button
              key={`${anime.mal_id}-${index}`}
              onClick={() => {
                setSelectedAnime(anime);
                setShowDropdown(false);
                // Reset modal defaults
                setStatus("watching");
                setScore(0);
                setWatchedEpisodes(0);
              }}
              className="w-full flex items-center gap-4 p-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0 text-left"
            >
              <img 
                src={anime.images.jpg.image_url} 
                alt={anime.title} 
                className="w-10 h-14 object-cover rounded bg-zinc-800 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium text-sm truncate">{anime.title}</h4>
                <div className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
                  <span>{anime.type}</span>
                  {anime.year && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                      <span>{anime.year}</span>
                    </>
                  )}
                  {anime.episodes && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                      <span>{anime.episodes} eps</span>
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0 pl-2">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal / Popover */}
      {selectedAnime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="relative h-32 bg-zinc-800">
              <img 
                src={selectedAnime.images.jpg.large_image_url} 
                alt="Banner" 
                className="w-full h-full object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent"></div>
              <button 
                onClick={() => setSelectedAnime(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors backdrop-blur-md"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 pt-0 relative">
              {/* Floating Poster */}
              <div className="flex gap-4 -mt-12 mb-6">
                <img 
                  src={selectedAnime.images.jpg.image_url} 
                  className="w-24 h-36 object-cover rounded-xl border-4 border-zinc-900 shadow-lg shrink-0" 
                  alt="Poster"
                />
                <div className="pt-14">
                  <h3 className="text-lg font-bold text-white leading-tight line-clamp-2">{selectedAnime.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{selectedAnime.type} • {selectedAnime.episodes || '?'} Episodes</p>
                </div>
              </div>

              {/* Form Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Status</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
                  >
                    <option value="watching">Watching</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="dropped">Dropped</option>
                    <option value="plan_to_watch">Plan to Watch</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Score (0-10)</label>
                    <input 
                      type="number" 
                      min="0" max="10" 
                      value={score === 0 ? "" : score}
                      onChange={(e) => setScore(Number(e.target.value) || 0)}
                      placeholder="Unrated"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Eps Watched</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="0" 
                        max={selectedAnime.episodes || 9999}
                        value={watchedEpisodes === 0 ? "" : watchedEpisodes}
                        onChange={(e) => setWatchedEpisodes(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-12 py-2.5 text-white focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
                      />
                      <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 text-sm pointer-events-none">
                        / {selectedAnime.episodes || '?'}
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleAddToList}
                  disabled={isSubmitting}
                  className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(217,70,239,0.2)]"
                >
                  {isSubmitting ? "Adding..." : "Add to List"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-md ${
            toast.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {toast.type === "success" ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            )}
            <span className="font-medium text-sm">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}