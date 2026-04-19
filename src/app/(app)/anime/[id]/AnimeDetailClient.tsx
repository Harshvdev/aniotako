"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AsyncButton from "@/components/AsyncButton";
import { useTitleLanguage } from "@/lib/TitleLanguageContext";

interface Props {
  anime: any;
  initialEntry: any;
}

const PRIMARY_GENRES = new Set([
  "Action", "Adventure", "Cars", "Comedy", "Dementia", "Demons", "Drama", "Ecchi", "Fantasy", 
  "Game", "Harem", "Historical", "Horror", "Isekai", "Josei", "Kids", "Magic", "Martial Arts", 
  "Mecha", "Military", "Music", "Mystery", "Parody", "Police", "Psychological", "Romance", 
  "Samurai", "School", "Sci-Fi", "Seinen", "Shoujo", "Shoujo Ai", "Shounen", "Shounen Ai", 
  "Slice of Life", "Space", "Sports", "Super Power", "Supernatural", "Thriller", "Vampire", "Food"
]);

export default function AnimeDetailClient({ anime, initialEntry }: Props) {
  const router = useRouter();
  const [entry, setEntry] = useState(initialEntry);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedSyn, setExpandedSyn] = useState(false);
  const [activeTab, setActiveTab] = useState("related");

  const { getTitle } = useTitleLanguage();
  
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // AniList provides these directly now, so no need to fetch!
  const characters = anime.characters?.edges || [];
  const recommendations = anime.recommendations?.nodes || [];
  const relations = anime.relations?.edges || [];

  const poster = anime.coverImage?.extraLarge || anime.coverImage?.large;
  const banner = anime.bannerImage || poster;

  // Split Genres and Tags based on requested list
  const allTagsAndGenres = Array.from(new Set([
    ...(anime.genres || []),
    ...(anime.tags?.map((t: any) => t.name) || [])
  ]));
  
  const displayGenres = allTagsAndGenres.filter(g => PRIMARY_GENRES.has(g));
  const displayTags = allTagsAndGenres.filter(g => !PRIMARY_GENRES.has(g));

  useEffect(() => {
    setEntry(initialEntry);
  }, [initialEntry]);  

  // Jikan is still needed for historical episode lists
  useEffect(() => {
    const fetchEpisodes = async () => {
      if (activeTab === "episodes" && episodes.length === 0 && anime.idMal) {
        setLoadingEpisodes(true);
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.idMal}/episodes`);
          const { data } = await res.json();
          setEpisodes(data || []);
        } catch (e) { console.error(e); }
        setLoadingEpisodes(false);
      }
    };
    fetchEpisodes();
  }, [activeTab, anime.idMal]);

  const handleAdd = async () => {
    setIsUpdating(true);
    try {
      const payload = {
        mal_id: anime.idMal,
        title: anime.title.romaji || anime.title.english,
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
        setEntry(data.entry || data.data || { ...payload, id: "temp-id", created_at: new Date().toISOString() });
      }
      router.refresh();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdate = async (updates: any) => {
    if (!entry) return;
    setEntry({ ...entry, ...updates });
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
        {banner && <img src={banner} alt="Background" className="absolute inset-0 w-full h-full object-cover blur-sm opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-[#09090b]/30" />
      </div>

      {/* 2. MAIN CONTENT OVERLAP */}
      <div className="max-w-6xl mx-auto px-6 relative z-10 -mt-32 md:-mt-48 flex flex-col md:flex-row gap-8">
        
        {/* Left Column */}
        <div className="shrink-0 flex flex-col items-center md:items-start gap-4">
          <div className="w-48 md:w-64 aspect-[2/3] rounded-2xl bg-zinc-800 shadow-2xl border border-zinc-700/50 overflow-hidden relative">
            {poster ? <img src={poster} alt={anime.title.romaji} className="w-full h-full object-cover" /> : <div className="flex-1" />}
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/80 backdrop-blur text-white text-[10px] font-bold rounded uppercase tracking-widest border border-white/10">
              {anime.format}
            </div>
          </div>
          
          <div className="hidden md:block w-full">
            <TrackingCard entry={entry} isUpdating={isUpdating} onAdd={handleAdd} onUpdate={handleUpdate} episodes={anime.episodes} />
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1 pt-2 md:pt-16">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            {getTitle({ 
              title: anime.title.romaji || anime.title.english, 
              title_english: anime.title.english, 
              title_romaji: anime.title.romaji 
            })}
          </h1>
          {anime.title.native && <h2 className="text-zinc-400 text-lg md:text-xl font-medium mt-1">{anime.title.native}</h2>}

          {/* Quick Stats Banner */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full border ${
              anime.status === "RELEASING" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
              anime.status === "FINISHED" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
              "bg-amber-500/10 border-amber-500/30 text-amber-400"
            }`}>
              {anime.status?.replace(/_/g, ' ')}
            </span>
            <div className="flex items-center gap-1.5 text-amber-400 font-black text-lg bg-zinc-900 px-3 py-1 rounded-xl shadow-inner border border-zinc-800">
              ★ {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "N/A"}
            </div>
            <div className="text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl shadow-inner">
              Pop <span className="text-white font-bold">#{anime.popularity || "?"}</span>
            </div>
          </div>

          <div className="md:hidden mt-6 w-full">
            <TrackingCard entry={entry} isUpdating={isUpdating} onAdd={handleAdd} onUpdate={handleUpdate} episodes={anime.episodes} />
          </div>

          {/* Display Genres */}
          {displayGenres.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {displayGenres.map((g, idx) => (
                <span key={`genre-${idx}`} className="px-3 py-1 text-xs bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30 rounded-full font-bold">
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Display Tags */}
          {displayTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {displayTags.map((t, idx) => (
                <span key={`tag-${idx}`} className="px-2 py-0.5 text-[10px] bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700/50">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          <div className="mt-6 bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-2xl">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Synopsis</h3>
            <p className={`text-sm text-zinc-300 leading-relaxed ${!expandedSyn && "line-clamp-4"}`} dangerouslySetInnerHTML={{ __html: anime.description || "No synopsis available." }} />
            {anime.description && anime.description.length > 250 && (
              <button onClick={() => setExpandedSyn(!expandedSyn)} className="mt-2 text-cyan-400 hover:text-cyan-300 text-xs font-bold transition-colors">
                {expandedSyn ? "Read Less" : "Read More"}
              </button>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-xl">
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Studio</span>
              <span className="text-sm font-medium text-white">{anime.studios?.nodes?.find((s:any) => s.isAnimationStudio)?.name || "?"}</span>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-xl">
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Source</span>
              <span className="text-sm font-medium text-white">{anime.source?.replace(/_/g, ' ') || "?"}</span>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-xl">
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Season</span>
              <span className="text-sm font-medium text-white capitalize">{anime.season?.toLowerCase() || "?"} {anime.seasonYear}</span>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-xl">
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Duration</span>
              <span className="text-sm font-medium text-white">{anime.duration ? `${anime.duration} min` : "?"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM TABS */}
      <div className="max-w-6xl mx-auto px-6 mt-16">
        <div className="flex gap-6 overflow-x-auto border-b border-zinc-800 mb-8 custom-scrollbar">
          {["related", "recommendations", "episodes", "characters", "trailer"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative whitespace-nowrap ${activeTab === tab ? "text-fuchsia-400" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]"></div>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {/* RELATED TAB */}
        {activeTab === "related" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relations.length > 0 ? relations.map((rel: any, idx: number) => (
              <Link href={`/anime/${rel.node.idMal}`} key={idx} className="flex gap-4 bg-zinc-900 border border-zinc-800 p-3 rounded-2xl hover:border-zinc-600 transition-colors group">
                <img src={rel.node.coverImage?.medium} className="w-16 h-20 rounded bg-zinc-800 object-cover" alt="" />
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-fuchsia-500 uppercase tracking-widest">{rel.relationType?.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors mt-1">{rel.node.title.romaji || rel.node.title.english}</span>
                  <span className="text-xs text-zinc-500 mt-0.5">{rel.node.format} • {rel.node.status}</span>
                </div>
              </Link>
            )) : <p className="text-zinc-500 text-sm">No related media found.</p>}
          </div>
        )}

        {/* RECOMMENDATIONS TAB */}
        {activeTab === "recommendations" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {recommendations.length > 0 ? recommendations.map((rec: any, idx: number) => {
              const node = rec.mediaRecommendation;
              if (!node) return null;
              return (
                <Link href={`/anime/${node.idMal}`} key={idx} className="group flex flex-col gap-2">
                  <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700/50">
                    <img src={node.coverImage?.extraLarge} alt={node.title.romaji} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <h4 className="text-sm font-medium text-white truncate group-hover:text-cyan-400 transition-colors">{node.title.romaji || node.title.english}</h4>
                </Link>
              )
            }) : <p className="text-zinc-500 text-sm">No recommendations available.</p>}
          </div>
        )}

        {/* EPISODES TAB */}
        {activeTab === "episodes" && (
          <div className="flex flex-col gap-2">
            {loadingEpisodes ? (
               <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-zinc-800 border-t-fuchsia-500 rounded-full animate-spin"></div></div>
            ) : episodes.length > 0 ? episodes.map((ep: any) => (
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
            )) : <p className="text-zinc-500 text-sm">No past episodes listed.</p>}
          </div>
        )}

        {/* CHARACTERS TAB */}
        {activeTab === "characters" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {characters.length > 0 ? characters.map((c: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
                <img src={c.node.image?.medium} alt={c.node.name.full} className="w-12 h-12 rounded-lg object-cover bg-zinc-800" />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate" title={c.node.name.full}>{c.node.name.full}</h4>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mt-0.5">{c.role}</p>
                </div>
              </div>
            )) : <p className="text-zinc-500 text-sm">No characters listed.</p>}
          </div>
        )}

        {/* TRAILER TAB */}
        {activeTab === "trailer" && (
          <div className="max-w-3xl mx-auto">
            {anime.trailer?.site === "youtube" ? (
              <div className="aspect-video w-full rounded-2xl overflow-hidden border border-zinc-800 bg-black shadow-2xl">
                <iframe 
                  src={`https://www.youtube.com/embed/${anime.trailer.id}`} 
                  title="Trailer"
                  className="w-full h-full"
                  allowFullScreen 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            ) : anime.trailer?.site === "dailymotion" ? (
              <div className="aspect-video w-full rounded-2xl overflow-hidden border border-zinc-800 bg-black shadow-2xl">
                <iframe 
                  src={`https://www.dailymotion.com/embed/video/${anime.trailer.id}`} 
                  title="Trailer"
                  className="w-full h-full"
                  allowFullScreen 
                />
              </div>
            ) : <p className="text-zinc-500 text-sm text-center py-12">No trailer available for this anime.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Tracking Card remains the same as your provided code ---
function TrackingCard({ entry, isUpdating, onAdd, onUpdate, episodes }: any) {
  const [showCompletePrompt, setShowCompletePrompt] = useState(false);

  if (!entry) {
    return (
      <AsyncButton onClick={onAdd} disabled={isUpdating} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-bold text-sm uppercase tracking-widest hover:opacity-90 disabled:opacity-50 shadow-[0_0_20px_rgba(217,70,239,0.3)]">
        + Add to List
      </AsyncButton>
    );
  }
  
  const checkCompletion = (val: number) => {
    if (episodes && val === episodes && entry.status !== "completed") setShowCompletePrompt(true);
    else setShowCompletePrompt(false);
  };

  const handleEpisodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 0;
    if (episodes && val > episodes) val = episodes;
    if (val < 0) val = 0;
    onUpdate({ watched_episodes: val });
    checkCompletion(val);
  };

  const increment = () => {
    if (episodes && entry.watched_episodes >= episodes) return;
    const newVal = entry.watched_episodes + 1;
    onUpdate({ watched_episodes: newVal });
    checkCompletion(newVal);
  };

  const decrement = () => {
    if (entry.watched_episodes <= 0) return;
    onUpdate({ watched_episodes: entry.watched_episodes - 1 });
    setShowCompletePrompt(false);
  };

  const selectArrowUI = "appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[position:right_12px_center] bg-no-repeat pr-8";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800/80">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Your List</span>
        <span className="text-[10px] text-zinc-500 font-medium">Added {new Date(entry.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1 block">Status</label>
          <select 
            value={entry.status} 
            onChange={(e) => { onUpdate({ status: e.target.value }); if (e.target.value === "completed") setShowCompletePrompt(false); }} 
            className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 hover:border-zinc-700 transition-colors cursor-pointer ${selectArrowUI}`}
          >
            <option value="watching">Watching</option><option value="completed">Completed</option><option value="on_hold">On Hold</option><option value="dropped">Dropped</option><option value="plan_to_watch">Plan to Watch</option>
          </select>
        </div>
        <div className="flex gap-3">
          <div className="w-[105px] shrink-0">
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1 block">Score</label>
            <select 
              value={entry.score || 0} 
              onChange={(e) => onUpdate({ score: Number(e.target.value) || null })} 
              className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 hover:border-zinc-700 transition-colors cursor-pointer ${selectArrowUI}`}
            >
              <option value={0}>Unrated</option>
              {[10,9,8,7,6,5,4,3,2,1].map(n => <option key={n} value={n}>★ {n}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1 block">Progress</label>
            <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg p-1 hover:border-zinc-700 transition-colors">
              <button onClick={decrement} disabled={entry.watched_episodes <= 0} className="w-8 h-8 flex items-center justify-center bg-zinc-800 text-zinc-400 rounded-md hover:text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0">-</button>
              <div className="flex-1 flex items-center justify-center text-sm font-mono font-bold whitespace-nowrap">
                <input type="number" value={entry.watched_episodes === 0 ? "" : entry.watched_episodes} onChange={handleEpisodeChange} placeholder="0" className="w-10 text-right px-1 py-0.5 m-0 bg-transparent text-white focus:outline-none focus:bg-zinc-800 rounded transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <span className="text-zinc-600 mx-0.5">/</span>
                <span className="w-10 text-left text-zinc-500 px-1 py-0.5">{episodes || '?'}</span>
              </div>
              <button onClick={increment} disabled={episodes ? entry.watched_episodes >= episodes : false} className="w-8 h-8 flex items-center justify-center bg-zinc-800 text-zinc-400 rounded-md hover:text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0">+</button>
            </div>
          </div>
        </div>
        {showCompletePrompt && (
          <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span className="text-xs text-emerald-400 font-medium">All episodes watched!</span>
            <button onClick={() => { onUpdate({ status: "completed" }); setShowCompletePrompt(false); }} className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg transition-colors shadow-sm">Complete</button>
          </div>
        )}
      </div>
    </div>
  );
}