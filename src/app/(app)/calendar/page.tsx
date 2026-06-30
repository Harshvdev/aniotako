"use client";

import { useState, useEffect } from "react";
import { useTitleLanguage } from "@/lib/TitleLanguageContext";
import { formatTimeOnly } from "@/lib/timezone";
import Link from "next/link";

interface CalendarEntry {
  mal_id: number;
  anilist_id?: number | null;
  title: string;
  poster_url: string;
  format: string;
  time?: string;
  airingAt?: number | null;
  episode?: number | null;
  total_episodes: number | null;
  status: string;
  watched_episodes: number;
  title_english?: string | null;
  title_romaji?: string | null;
}

const formatStatus = (status: string) => status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
const getStatusColor = (status: string) => {
  switch (status) {
    case "watching": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "completed": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "on_hold": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "dropped": return "bg-red-500/10 text-red-400 border-red-500/20";
    default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  }
};

const getSafeDateString = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getDateStringInTz = (unixSeconds: number, tz: string) => {
  try {
    const d = new Date(unixSeconds * 1000);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  } catch (e) {
    const d = new Date(unixSeconds * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
};

const fetchChunk = async (chunk: any) => {
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      query: chunk.query,
      variables: chunk.variables,
    }),
  });
  if (!response.ok) {
    throw new Error(`AniList returned status ${response.status}`);
  }
  return response.json();
};

export default function CalendarPage() {
  const { getTitle } = useTitleLanguage();
  const [selectedDate, setSelectedDate] = useState(() => getSafeDateString(new Date()));
  const [animeList, setAnimeList] = useState<CalendarEntry[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0); 
  
  const [dots, setDots] = useState<Record<string, boolean>>({});
  const [currentWeekStart, setCurrentWeekStart] = useState<string>("");
  const [userTz, setUserTz] = useState<string>("UTC");

  const todayStr = getSafeDateString(new Date());

  // 1. Init Timezone
  useEffect(() => {
    setUserTz(
      localStorage.getItem("aniotako_timezone") || 
      Intl.DateTimeFormat().resolvedOptions().timeZone || 
      "UTC"
    );
  }, []);

  // 2. Fetch Selected Date
  useEffect(() => {
    if (!selectedDate || selectedDate.includes("NaN")) return; 

    const fetchSchedule = async () => {
      setIsLoading(true);
      setError(null); 
      
      try {
        const res = await fetch(`/api/calendar?date=${selectedDate}`);
        const contentType = res.headers.get("content-type");
        
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
          throw new Error("Connection timed out. Please check your network and try again."); 
        }
        
        const json = await res.json();
        const chunks = json.chunks || [];
        const userEntriesMap = json.userEntriesMap || {};

        if (chunks.length === 0) {
          setAnimeList([]);
          return;
        }

        // Fetch AniList GraphQL data client-side in parallel
        const results = await Promise.all(chunks.map(fetchChunk));
        const allSchedules: any[] = [];
        
        results.forEach((r: any) => {
          const schedules = r.data?.Page?.airingSchedules || [];
          allSchedules.push(...schedules);
        });

        // Map and merge with user watchlist info
        const mappedData: CalendarEntry[] = [];
        allSchedules.forEach((sched: any) => {
          const media = sched.media;
          if (!media) return;
          const userEntry = userEntriesMap[media.id];
          if (!userEntry) return;

          mappedData.push({
            mal_id: media.idMal || userEntry.mal_id,
            anilist_id: media.id,
            title: media.title.romaji || media.title.english || "",
            title_english: media.title.english,
            title_romaji: media.title.romaji,
            poster_url: media.coverImage?.large || "",
            format: media.format || "Unknown",
            airingAt: sched.airingAt,
            episode: sched.episode,
            total_episodes: media.episodes,
            status: userEntry.status,
            watched_episodes: userEntry.watched_episodes,
          });
        });

        // Sort ascending by default (early airers first)
        const sortedData = mappedData.sort((a: CalendarEntry, b: CalendarEntry) => {
          if (a.airingAt && b.airingAt) return a.airingAt - b.airingAt;
          if (a.airingAt) return -1;
          if (b.airingAt) return 1;
          return 0;
        });

        setAnimeList(sortedData);
      } catch (err: any) {
        console.error("Failed to load schedule:", err);
        setError(err.message || "An unexpected error occurred.");
        setAnimeList([]); 
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSchedule();
  }, [selectedDate, retryCount]);

  // 3. Fetch Week Dots (One Query!)
  useEffect(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    if (!y || !m || !d) return;
    
    const curr = new Date(y, m - 1, d);
    const dayOfWeek = curr.getDay(); 
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() + diffToMonday);
    const mondayStr = getSafeDateString(monday);

    // Only fire off the network request if we move into a new calendar week block
    if (mondayStr !== currentWeekStart) {
      setCurrentWeekStart(mondayStr);
      
      const fetchWeekDots = async () => {
        try {
          const res = await fetch(`/api/calendar?date=${mondayStr}&week=true`);
          if (res.ok) {
            const json = await res.json();
            const chunks = json.chunks || [];
            
            if (chunks.length === 0) {
              setDots({});
              return;
            }

            const results = await Promise.all(chunks.map(fetchChunk));
            const newDots: Record<string, boolean> = {};
            
            results.forEach((r: any) => {
              const schedules = r.data?.Page?.airingSchedules || [];
              schedules.forEach((sched: any) => {
                const dateStr = getDateStringInTz(sched.airingAt, userTz);
                newDots[dateStr] = true;
              });
            });

            setDots(prev => ({ ...prev, ...newDots }));
          }
        } catch (e) {
          console.error("Failed to load week dots:", e);
        }
      };
      fetchWeekDots();
    }
  }, [selectedDate, currentWeekStart, userTz]);

  const buildStripDays = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    if (!y || !m || !d) return [];

    const curr = new Date(y, m - 1, d);
    const dayOfWeek = curr.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diffToMonday);

    return Array.from({length: 7}, (_, i) => {
      const iterDate = new Date(monday);
      iterDate.setDate(monday.getDate() + i);
      return {
        dateStr: getSafeDateString(iterDate),
        dayName: iterDate.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: iterDate.getDate(),
      };
    });
  };

  const stripDays = buildStripDays();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-32 min-h-screen">
      
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Weekly Schedule</h1>
          <p className="text-sm text-zinc-400 mt-1">Current airing times for your watchlist.</p>
        </div>
        
        <div className="relative">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 cursor-pointer shadow-lg [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>
      </div>

      <div className="flex gap-2 sm:gap-4 mb-10 overflow-x-auto custom-scrollbar pb-2 px-1">
        {stripDays.map((d) => {
          const isSelected = d.dateStr === selectedDate;
          const hasAnime = dots[d.dateStr];
          return (
            <button
              key={d.dateStr}
              onClick={() => setSelectedDate(d.dateStr)}
              className={`flex flex-col items-center justify-center min-w-[3.5rem] sm:min-w-[4rem] py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all shrink-0 ${
                isSelected 
                  ? "bg-gradient-to-b from-fuchsia-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)] border border-transparent" 
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">{d.dayName}</span>
              <span className="text-lg sm:text-xl font-black mt-1">{d.dayNum}</span>
              <div className="h-1.5 mt-1.5 flex items-center justify-center">
                {hasAnime && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-cyan-500"}`}></span>}
              </div>
            </button>
          );
        })}
      </div>

      <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">
        {selectedDate === todayStr ? "Airing Today" : "Scheduled Anime"}
      </h2>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-4 border-zinc-800 border-t-fuchsia-500 rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center animate-in fade-in zoom-in-95">
          <svg className="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p className="text-red-400 font-medium mb-6">{error}</p>
          <button 
            onClick={() => setRetryCount(c => c + 1)} 
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl transition-colors shadow-lg"
          >
            Retry Connection
          </button>
        </div>
      ) : animeList.length === 0 ? (
        <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-10 text-center">
          <p className="text-zinc-500 font-medium">No anime from your list scheduled for this day.</p>
          <button onClick={() => setSelectedDate(todayStr)} className="mt-4 text-sm font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
            Return to Today
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {animeList.map((anime) => (
            <Link 
              href={`/anime/${anime.mal_id}`} 
              key={anime.mal_id}
              className="flex items-center gap-4 p-3 bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/80 rounded-2xl transition-all group"
            >
              <img src={anime.poster_url} alt={anime.title} className="w-16 h-24 sm:w-20 sm:h-28 object-cover rounded-xl bg-zinc-800 shrink-0" />
              
              <div className="flex-1 min-w-0 py-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase border ${getStatusColor(anime.status)}`}>
                    {formatStatus(anime.status)}
                  </span>
                  <span className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
                    {anime.format}
                  </span>
                </div>   
                <h3 className="font-bold text-white text-sm sm:text-base line-clamp-2 leading-snug group-hover:text-cyan-400 transition-colors">
                  {getTitle(anime)}
                </h3>
                
                <div className="flex flex-col mt-2 gap-1">
                  <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {anime.airingAt && anime.episode ? (
                      <span className="truncate">Episode {anime.episode} &middot; Airs at {formatTimeOnly(anime.airingAt)}</span>
                    ) : (
                      <span className="truncate">Broadcast: {anime.time}</span>
                    )}
                  </span>
                  <span className="text-[10px] sm:text-xs text-zinc-500 font-medium">
                    Your Progress: <span className="font-mono font-bold text-zinc-300">{anime.watched_episodes}</span> <span className="opacity-50">/ {anime.total_episodes || '?'}</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}