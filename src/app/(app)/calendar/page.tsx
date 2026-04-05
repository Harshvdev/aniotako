"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CalendarEntry {
  mal_id: number;
  title: string;
  poster_url: string;
  format: string;
  time: string;
  total_episodes: number | null;
  status: string;
  watched_episodes: number;
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

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(() => getSafeDateString(new Date()));
  const [animeList, setAnimeList] = useState<CalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dots, setDots] = useState<Record<string, boolean>>({});

  const todayStr = getSafeDateString(new Date());

  // Fetch the selected date's anime
  useEffect(() => {
    if (!selectedDate || selectedDate.includes("NaN")) return; 

    const fetchSchedule = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/calendar?date=${selectedDate}`);
        
        // THE FIX 1: Check if the response is ACTUALLY JSON before parsing. 
        // This prevents crashes if Supabase times out and redirects to the HTML login page.
        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
          throw new Error("API returned non-JSON response (likely a timeout or redirect)"); 
        }
        
        const json = await res.json();
        setAnimeList(json.data || []);
      } catch (err) {
        console.error("Failed to load schedule:", err);
        setAnimeList([]); 
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedule();
  }, [selectedDate]);

  // Fetch the whole week on mount to populate the "dots"
  useEffect(() => {
    const fetchWeekDots = async () => {
      const today = new Date();
      const dayOfWeek = today.getDay(); 
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMonday);

      const weekDays = Array.from({length: 7}, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return getSafeDateString(d);
      });

      const newDots: Record<string, boolean> = {};
      
      for (const dayStr of weekDays) {
        try {
          const res = await fetch(`/api/calendar?date=${dayStr}`);
          const contentType = res.headers.get("content-type");
          
          // THE FIX 1 (Continued): Apply the same safety check here
          if (res.ok && contentType && contentType.includes("application/json")) {
            const json = await res.json();
            newDots[dayStr] = json.data && json.data.length > 0;
          }
        } catch (e) {
          // Silent catch for background dots
        }
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      setDots(newDots);
    };

    fetchWeekDots();
  }, []);

  // Generate Week Strip UI array
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
          <h1 className="text-3xl font-black text-white tracking-tight">Schedule</h1>
          <p className="text-sm text-zinc-400 mt-1">Track airing times for your watchlist.</p>
        </div>
        
        {/* Date Picker Input */}
        <div className="relative">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 cursor-pointer shadow-lg [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>
      </div>

      {/* THE FIX 2: Added `gap-2` instead of `justify-between` for proper mobile card spacing */}
      <div className="flex gap-2 sm:gap-4 mb-10 overflow-x-auto custom-scrollbar pb-2 px-1">
        {stripDays.map((d) => {
          const isSelected = d.dateStr === selectedDate;
          const hasAnime = dots[d.dateStr];
          return (
            <button
              key={d.dateStr}
              onClick={() => setSelectedDate(d.dateStr)}
              // Added shrink-0 so they don't squish when overflowing
              className={`flex flex-col items-center justify-center min-w-[3.5rem] sm:min-w-[4rem] py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all shrink-0 ${
                isSelected 
                  ? "bg-gradient-to-b from-fuchsia-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)] border border-transparent" 
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">{d.dayName}</span>
              <span className="text-lg sm:text-xl font-black mt-1">{d.dayNum}</span>
              
              {/* The Dot */}
              <div className="h-1.5 mt-1.5 flex items-center justify-center">
                {hasAnime && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-cyan-500"}`}></span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Results Header */}
      <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">
        {selectedDate === todayStr ? "Airing Today" : "Scheduled Anime"}
      </h2>

      {/* Results List */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-4 border-zinc-800 border-t-fuchsia-500 rounded-full animate-spin"></div>
        </div>
      ) : animeList.length === 0 ? (
        <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-10 text-center">
          <p className="text-zinc-500 font-medium">No anime from your list airing on this day.</p>
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
                  {anime.title}
                </h3>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {anime.time}
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-500">
                    Ep {anime.watched_episodes} <span className="opacity-50">/ {anime.total_episodes || '?'}</span>
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