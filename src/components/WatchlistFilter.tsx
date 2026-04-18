// src/components/WatchlistFilter.tsx
"use client";

import { useState, useEffect } from "react";
import { WatchlistEntry } from "@/app/(app)/watchlist/WatchlistClient";

interface WatchlistFilterProps {
  entries: WatchlistEntry[];
  onFilter: (filtered: WatchlistEntry[]) => void;
}

const PRIMARY_GENRES = [
  "Action", "Adventure", "Cars", "Comedy", "Dementia", "Demons", "Drama", 
  "Ecchi", "Fantasy", "Game", "Harem", "Historical", "Horror", "Isekai", 
  "Josei", "Kids", "Magic", "Martial Arts", "Mecha", "Military", "Music", 
  "Mystery", "Parody", "Police", "Psychological", "Romance", "Samurai", 
  "School", "Sci-Fi", "Seinen", "Shoujo", "Shoujo Ai", "Shounen", 
  "Shounen Ai", "Slice of Life", "Space", "Sports", "Super Power", 
  "Supernatural", "Thriller", "Vampire"
];

const ADVANCED_TAGS = [
  "4-koma", "Achronological Order", "Afterlife", "Age Gap", "Airsoft", "Aliens", "Alternate Universe", "American Football", "Amnesia", "Anti-Hero", "Archery", "Assassins", "Athletics", "Augmented Reality", "Aviation", "Badminton", "Band", "Bar", "Baseball", "Basketball", "Battle Royale", "Biographical", "Bisexual", "Body Swapping", "Boxing", "Bullying", "Calligraphy", "Card Battle", "CGI", "Chibi", "Chuunibyou", "Classic Literature", "College", "Coming of Age", "Cosplay", "Crossdressing", "Crossover", "Cultivation", "Cute Girls Doing Cute Things", "Cyberpunk", "Cycling", "Dancing", "Delinquents", "Development", "Dragons", "Drawing", "Dystopian", "Economics", "Educational", "Ensemble Cast", "Environmental", "Episodic", "Espionage", "Fairy Tale", "Family Life", "Fashion", "Female Protagonist", "Fishing", "Fitness", "Flash", "Food", "Football", "Foreign", "Fugitive", "Full CGI", "Full Colour", "Gambling", "Gangs", "Gender Bending", "Gender Neutral", "Ghost", "Gods", "Gore", "Guns", "Gyaru", "Henshin", "Hikikomori", "Ice Skating", "Idol", "Iyashikei", "Kaiju", "Karuta", "Kemonomimi", "Love Triangle", "Mafia", "Mahjong", "Maids", "Male Protagonist", "Memory Manipulation", "Meta", "Monster Girl", "Mopeds", "Motorcycles", "Musical", "Mythology", "Nekomimi", "Ninja", "No Dialogue", "Noir", "Nudity", "Otaku Culture", "Outdoor", "Philosophy", "Photography", "Pirates", "Poker", "Politics", "Post-Apocalyptic", "Primarily Adult Cast", "Primarily Female Cast", "Primarily Male Cast", "Puppetry", "Real Robot", "Rehabilitation", "Reincarnation", "Revenge", "Reverse Harem", "Robots", "Rugby", "Rural", "Satire", "School Club", "Ships", "Shogi", "Slapstick", "Slavery", "Space Opera", "Steampunk", "Stop Motion", "Super Robot", "Superhero", "Surreal Comedy", "Survival", "Swimming", "Swordplay", "Table Tennis", "Tanks", "Teacher", "Tennis", "Terrorism", "Time Manipulation", "Time Skip", "Tragedy", "Trains", "Triads", "Tsundere", "Urban Fantasy", "Video Games", "Virtual World", "Volleyball", "War", "Witch", "Work", "Wrestling", "Writing", "Wuxia", "Yakuza", "Yandere", "Youkai", "Zombie"
];

const YEARS = Array.from({ length: new Date().getFullYear() - 1990 + 1 }, (_, i) => (new Date().getFullYear() - i).toString());

export default function WatchlistFilter({ entries, onFilter }: WatchlistFilterProps) {
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [airingStatus, setAiringStatus] = useState("All");
  const [score, setScore] = useState("All");
  const [season, setSeason] = useState("All");
  const [year, setYear] = useState("All");
  const [sort, setSort] = useState("Default");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showAdvancedTags, setShowAdvancedTags] = useState(false);

  const handleFilter = () => {
    let result = [...entries];

    const statusMap: Record<string, string> = {
      "Watching": "watching", "Completed": "completed", "On Hold": "on_hold", "Dropped": "dropped", "Plan to Watch": "plan_to_watch"
    };

    if (status !== "All") result = result.filter(e => e.status === statusMap[status]);

    if (airingStatus !== "All") {
      result = result.filter(e => {
        const dbStatus = e.anime_metadata?.airing_status || "";
        if (airingStatus === "RELEASING") return dbStatus.includes("Currently Airing") || dbStatus === "RELEASING";
        if (airingStatus === "FINISHED") return dbStatus.includes("Finished Airing") || dbStatus === "FINISHED";
        if (airingStatus === "NOT_YET_RELEASED") return dbStatus.includes("Not yet aired") || dbStatus === "NOT_YET_RELEASED";
        if (airingStatus === "CANCELLED") return dbStatus === "CANCELLED";
        return true;
      });
    }

    if (type !== "All") result = result.filter(e => e.anime_metadata?.type?.toUpperCase() === type.toUpperCase());
    
    if (score !== "All") {
      const targetScore = parseInt(score.replace(/[^0-9]/g, ''), 10);
      result = result.filter(e => e.score === targetScore);
    }

    if (season !== "All") result = result.filter(e => e.anime_metadata?.season?.toLowerCase() === season.toLowerCase());
    if (year !== "All") result = result.filter(e => e.anime_metadata?.year?.toString() === year);

    if (startDate) {
      const startYear = new Date(startDate).getFullYear();
      result = result.filter(e => (e.anime_metadata?.year || 0) >= startYear);
    }
    if (endDate) {
      const endYear = new Date(endDate).getFullYear();
      result = result.filter(e => (e.anime_metadata?.year || 9999) <= endYear);
    }

    if (selectedGenres.length > 0) {
      result = result.filter(e => {
        const animeGenres = e.anime_metadata?.genres || [];
        return selectedGenres.every(g => animeGenres.includes(g));
      });
    }

    result.sort((a, b) => {
      switch (sort) {
        case "Title A-Z": return a.title.localeCompare(b.title);
        case "Title Z-A": return b.title.localeCompare(a.title);
        case "Score (High)": return (b.score || 0) - (a.score || 0);
        case "Score (Low)": return (a.score || 0) - (b.score || 0);
        case "Episode Progress":
          const progA = a.total_episodes ? a.watched_episodes / a.total_episodes : 0;
          const progB = b.total_episodes ? b.watched_episodes / b.total_episodes : 0;
          return progB - progA;
        case "Recently Added":
        case "Default":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    onFilter(result);
  };

  const handleClearAll = () => {
    setType("All"); setStatus("All"); setAiringStatus("All"); setScore("All"); setSeason("All"); setYear("All"); setSort("Default");
    setStartDate(""); setEndDate(""); setSelectedGenres([]);
    onFilter([...entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
  };

  useEffect(() => { handleFilter(); }, [entries, type, status, airingStatus, score, season, year, sort, startDate, endDate, selectedGenres]);

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl mb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-4">
        
        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-fuchsia-500">
          <option value="All">Type: All</option><option value="TV">TV</option><option value="MOVIE">Movie</option><option value="OVA">OVA</option><option value="ONA">ONA</option><option value="SPECIAL">Special</option><option value="MUSIC">Music</option>
        </select>
        
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-fuchsia-500">
          <option value="All">List Status: All</option><option value="Watching">Watching</option><option value="Completed">Completed</option><option value="On Hold">On Hold</option><option value="Dropped">Dropped</option><option value="Plan to Watch">Plan to Watch</option>
        </select>

        <select value={airingStatus} onChange={(e) => setAiringStatus(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500">
          <option value="All">Airing: All</option><option value="RELEASING">Releasing</option><option value="FINISHED">Finished</option><option value="NOT_YET_RELEASED">Not yet released</option><option value="CANCELLED">Cancelled</option>
        </select>

        <select value={score} onChange={(e) => setScore(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-fuchsia-500">
          <option value="All">Score: All</option><option value="(1) Appalling">(1) Appalling</option><option value="(2) Horrible">(2) Horrible</option><option value="(3) Very Bad">(3) Very Bad</option><option value="(4) Bad">(4) Bad</option><option value="(5) Average">(5) Average</option><option value="(6) Fine">(6) Fine</option><option value="(7) Good">(7) Good</option><option value="(8) Very Good">(8) Very Good</option><option value="(9) Great">(9) Great</option><option value="(10) Masterpiece">(10) Masterpiece</option>
        </select>
        <select value={season} onChange={(e) => setSeason(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-fuchsia-500">
          <option value="All">Season: All</option><option value="Winter">Winter</option><option value="Spring">Spring</option><option value="Summer">Summer</option><option value="Fall">Fall</option>
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-fuchsia-500">
          <option value="All">Year: All</option>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-fuchsia-500">
          <option value="Default">Sort: Default</option><option value="Title A-Z">Title A-Z</option><option value="Title Z-A">Title Z-A</option><option value="Score (High)">Score (High)</option><option value="Score (Low)">Score (Low)</option><option value="Recently Added">Recently Added</option><option value="Episode Progress">Episode Progress</option>
        </select>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-fuchsia-500" />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-fuchsia-500" />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Genres & Common Tags</label>
        <div className="flex flex-wrap gap-2">
          {PRIMARY_GENRES.map(g => (
            <button
              key={g}
              onClick={() => toggleGenre(g)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all ${
                selectedGenres.includes(g)
                  ? "bg-fuchsia-600 text-white border border-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.4)]"
                  : "bg-transparent border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 pt-2 border-t border-zinc-800/80">
        <button 
          onClick={() => setShowAdvancedTags(!showAdvancedTags)}
          className="text-xs font-bold text-cyan-500 hover:text-cyan-400 flex items-center gap-1 uppercase tracking-widest transition-colors mb-3"
        >
          {showAdvancedTags ? "Hide Advanced Tags" : "Show All Tags"}
          <svg className={`w-4 h-4 transition-transform ${showAdvancedTags ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {showAdvancedTags && (
          <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1">
            {ADVANCED_TAGS.map(g => (
              <button
                key={g}
                onClick={() => toggleGenre(g)}
                className={`px-2.5 py-0.5 text-[10px] rounded-full font-medium transition-all border ${
                  selectedGenres.includes(g)
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    : "bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80">
        <button onClick={handleClearAll} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Clear All</button>
        <button onClick={handleFilter} className="px-8 py-2.5 rounded-full bg-fuchsia-600 text-white font-bold text-sm uppercase tracking-widest hover:bg-fuchsia-500 transition-colors shadow-[0_0_15px_rgba(217,70,239,0.3)]">Filter</button>
      </div>
    </div>
  );
}