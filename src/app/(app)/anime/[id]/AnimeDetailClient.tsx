"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  anime: any;
  initialEntry: any;
}

export default function AnimeDetailClient({ anime, initialEntry }: Props) {
  const router = useRouter();
  const [entry, setEntry] = useState(initialEntry);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedSyn, setExpandedSyn] = useState(false);
  const [activeTab, setActiveTab] = useState("related"); // Default tab
  
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);

  const poster = anime.images?.jpg?.large_image_url;

  // Force React state to update when Next.js router.refresh() fetches new server data
  useEffect(() => {
    setEntry(initialEntry);
  }, [initialEntry]);  

  // --- Dynamic Tab Fetching ---
  useEffect(() => {
    const fetchTabData = async () => {
      if (activeTab === "episodes" && episodes.length === 0) {
        setLoadingTab(true);
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}/episodes`);
          const { data } = await res.json();
          setEpisodes(data || []);
        } catch (e) { console.error(e); }
        setLoadingTab(false);
      }
      
      if (activeTab === "characters" && characters.length === 0) {
        setLoadingTab(true);
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}/characters`);
          const { data } = await res.json();
          // Sort by favorites to get main characters first, take top 12
          const sorted = (data || []).sort((a: any, b: any) => b.favorites - a.favorites).slice(0, 12);
          setCharacters(sorted);
        } catch (e) { console.error(e); }
        setLoadingTab(false);
      }
    };
    fetchTabData();
  }, [activeTab, anime.mal_id]);

  // --- Tracking Actions ---
  const handleAdd = async () => {
    setIsUpdating(true);
    try {
      const payload = {
        mal_id: anime.mal_id,
        title: anime.title,
        status: "watching",
        score: 0,
        watched_episodes: 0,
        total_episodes: anime.episodes,
        poster_url: poster,
      };

      const res = await fetch("/api/watchlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Optimistically update the UI instantly using our own payload as a fallback
        setEntry(data.entry || data.data || { 
          ...payload, 
          id: "temp-id", 
          created_at: new Date().toISOString() 
        });
      }
      
      // Tell Next.js to silently refetch the real database row in the background
      router.refresh();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdate = async (updates: any) => {
    if (!entry) return;
    setEntry({ ...entry, ...updates }); // Optimistic
    try {
      await fetch("/api/watchlist/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, updates }),
      });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-[#09090b] pb-24">
      
      {/* 1. HERO BACKGROUND */}
      <div className="relative h-[300px] md:h-[400px] w-full overflow-hidden border-b border-zinc-800">
        {poster && (
          <img src={poster} alt="Background" className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30 scale-110" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-[#09090b]/50" />
      </div>

      {/* 2. MAIN CONTENT OVERLAP */}
      <div className="max-w-6xl mx-auto px-6 relative z-10 -mt-32 md:-mt-48 flex flex-col md:flex-row gap-8">
        
        {/* Left Column: Poster & Quick Info */}
        <div className="shrink-0 flex flex-col items-center md:items-start gap-4">
          <div className="w-48 md:w-64 aspect-[2/3] rounded-2xl bg-zinc-800 shadow-2xl border border-zinc-700/50 overflow-hidden relative">
            {poster ? <img src={poster} alt={anime.title} className="w-full h-full object-cover" /> : <div className="flex-1" />}
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/80 backdrop-blur text-white text-[10px] font-bold rounded uppercase tracking-widest border border-white/10">
              {anime.type}
            </div>
          </div>
          
          {/* Tracking Card (Desktop Only, moves below title on mobile) */}
          <div className="hidden md:block w-full">
            <TrackingCard entry={entry} isUpdating={isUpdating} onAdd={handleAdd} onUpdate={handleUpdate} episodes={anime.episodes} />
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="flex-1 pt-2 md:pt-16">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-lg">{anime.title}</h1>
          {anime.title_japanese && <h2 className="text-zinc-400 text-lg md:text-xl font-medium mt-1">{anime.title_japanese}</h2>}

          {/* Quick Stats Banner */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full border ${
              anime.status.includes("Airing") ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
              anime.status.includes("Finished") ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
              "bg-amber-500/10 border-amber-500/30 text-amber-400"
            }`}>
              {anime.status}
            </span>
            <div className="flex items-center gap-1.5 text-amber-400 font-black text-lg bg-zinc-900 px-3 py-1 rounded-xl shadow-inner border border-zinc-800">
              ★ {anime.score || "N/A"}
            </div>
            <div className="text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl shadow-inner">
              Ranked <span className="text-white font-bold">#{anime.rank || "?"}</span>
            </div>
            <div className="text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl shadow-inner">
              Popularity <span className="text-white font-bold">#{anime.popularity || "?"}</span>
            </div>
          </div>

          {/* Tracking Card (Mobile) */}
          <div className="md:hidden mt-6 w-full">
            <TrackingCard entry={entry} isUpdating={isUpdating} onAdd={handleAdd} onUpdate={handleUpdate} episodes={anime.episodes} />
          </div>

          {/* Genres, Themes & Demographics */}
          <div className="flex flex-wrap gap-2 mt-6">
            {[
              ...(anime.genres || []),
              ...(anime.explicit_genres || []),
              ...(anime.themes || []),
              ...(anime.demographics || [])
            ].map((g: any, idx: number) => (
              <span 
                key={`${g.mal_id}-${idx}`} 
                className="px-3 py-1 text-xs bg-zinc-800 text-zinc-300 rounded-full font-medium hover:bg-fuchsia-600 hover:text-white cursor-pointer transition-colors border border-zinc-700/50"
              >
                {g.name}
              </span>
            ))}
          </div>

          {/* Synopsis */}
          <div className="mt-6 bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-2xl">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Synopsis</h3>
            <p className={`text-sm text-zinc-300 leading-relaxed ${!expandedSyn && "line-clamp-3"}`}>
              {anime.synopsis || "No synopsis available."}
            </p>
            {anime.synopsis && anime.synopsis.length > 200 && (
              <button onClick={() => setExpandedSyn(!expandedSyn)} className="mt-2 text-cyan-400 hover:text-cyan-300 text-xs font-bold transition-colors">
                {expandedSyn ? "Read Less" : "Read More"}
              </button>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-xl">
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Studio</span>
              <span className="text-sm font-medium text-white">{anime.studios?.[0]?.name || "?"}</span>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-xl">
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Source</span>
              <span className="text-sm font-medium text-white">{anime.source || "?"}</span>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-xl">
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Season</span>
              <span className="text-sm font-medium text-white capitalize">{anime.season || "?"} {anime.year}</span>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-xl">
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Duration</span>
              <span className="text-sm font-medium text-white">{anime.duration || "?"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM TABS */}
      <div className="max-w-6xl mx-auto px-6 mt-16">
        <div className="flex gap-8 border-b border-zinc-800 mb-8">
          {["related", "episodes", "characters"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative ${activeTab === tab ? "text-fuchsia-400" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]"></div>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loadingTab ? (
          <div className="py-12 flex justify-center"><div className="w-8 h-8 border-4 border-zinc-800 border-t-fuchsia-500 rounded-full animate-spin"></div></div>
        ) : (
          <>
            {/* RELATED TAB */}
            {activeTab === "related" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {anime.relations?.map((rel: any, idx: number) => (
                  <div key={idx} className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                    <h3 className="text-xs font-bold text-fuchsia-500 uppercase tracking-widest mb-3">{rel.relation}</h3>
                    <div className="flex flex-col gap-2">
                      {rel.entry.map((entry: any) => (
                        entry.type === "anime" ? (
                          <Link href={`/anime/${entry.mal_id}`} key={entry.mal_id} className="text-sm font-medium text-zinc-300 hover:text-cyan-400 flex items-center gap-2 group transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-cyan-400 transition-colors"></span>
                            {entry.name}
                          </Link>
                        ) : (
                          <span key={entry.mal_id} className="text-sm text-zinc-500 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-800"></span>
                            {entry.name} <span className="text-[10px] uppercase border border-zinc-800 px-1 rounded">{entry.type}</span>
                          </span>
                        )
                      ))}
                    </div>
                  </div>
                ))}
                {(!anime.relations || anime.relations.length === 0) && <p className="text-zinc-500 text-sm">No related anime found.</p>}
              </div>
            )}

            {/* EPISODES TAB */}
            {activeTab === "episodes" && (
              <div className="flex flex-col gap-2">
                {episodes.length > 0 ? episodes.map((ep: any) => (
                  <div key={ep.mal_id} className={`flex items-center gap-4 p-4 rounded-xl border ${entry && entry.watched_episodes >= ep.mal_id ? "bg-emerald-500/5 border-emerald-500/20" : "bg-zinc-900/50 border-zinc-800"}`}>
                    <div className={`w-10 text-center font-mono font-bold ${entry && entry.watched_episodes >= ep.mal_id ? "text-emerald-500" : "text-zinc-500"}`}>
                      {ep.mal_id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">{ep.title}</h4>
                      {ep.title_japanese && <p className="text-xs text-zinc-500 truncate">{ep.title_japanese}</p>}
                    </div>
                    <div className="shrink-0 text-xs text-zinc-500 font-medium">
                      {ep.aired ? new Date(ep.aired).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "TBA"}
                    </div>
                  </div>
                )) : <p className="text-zinc-500 text-sm">No episodes listed yet.</p>}
              </div>
            )}

            {/* CHARACTERS TAB */}
            {activeTab === "characters" && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {characters.length > 0 ? characters.map((c: any) => (
                  <div key={c.character.mal_id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
                    <img src={c.character.images?.jpg?.image_url} alt={c.character.name} className="w-12 h-12 rounded-lg object-cover bg-zinc-800" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{c.character.name}</h4>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mt-0.5">{c.role}</p>
                    </div>
                  </div>
                )) : <p className="text-zinc-500 text-sm">No characters listed yet.</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- Mini Component for Tracking Logic ---
function TrackingCard({ entry, isUpdating, onAdd, onUpdate, episodes }: any) {
  if (!entry) {
    return (
      <button onClick={onAdd} disabled={isUpdating} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_0_20px_rgba(217,70,239,0.3)]">
        {isUpdating ? "Adding..." : "+ Add to List"}
      </button>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800/80">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Your List</span>
        <span className="text-[10px] text-zinc-500 font-medium">
          Added {new Date(entry.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1 block">Status</label>
          <select value={entry.status} onChange={(e) => onUpdate({ status: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
            <option value="watching">Watching</option><option value="completed">Completed</option><option value="on_hold">On Hold</option><option value="dropped">Dropped</option><option value="plan_to_watch">Plan to Watch</option>
          </select>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1 block">Score</label>
            <select value={entry.score || 0} onChange={(e) => onUpdate({ score: Number(e.target.value) || null })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
              <option value={0}>Unrated</option>
              {[10,9,8,7,6,5,4,3,2,1].map(n => <option key={n} value={n}>★ {n}</option>)}
            </select>
          </div>

          <div className="flex-1">
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1 block">Progress</label>
            <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5">
              <button onClick={() => onUpdate({ watched_episodes: Math.max(0, entry.watched_episodes - 1) })} className="w-6 h-6 flex items-center justify-center bg-zinc-800 text-zinc-400 rounded hover:text-white hover:bg-zinc-700">-</button>
              <span className="text-sm font-mono font-bold text-white">{entry.watched_episodes} <span className="text-zinc-600 text-xs">/ {episodes || '?'}</span></span>
              <button onClick={() => onUpdate({ watched_episodes: entry.watched_episodes + 1 })} className="w-6 h-6 flex items-center justify-center bg-zinc-800 text-zinc-400 rounded hover:text-white hover:bg-zinc-700">+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}