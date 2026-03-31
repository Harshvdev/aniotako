import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import EditProfileModal from "./EditProfileModal";

export const dynamic = 'force-dynamic';

// Helper to extract minutes from Jikan duration strings (e.g., "1 hr 10 min", "24 min per ep")
function getMinutesFromDuration(durationStr: string | null) {
  if (!durationStr || durationStr === "Unknown") return 24;
  let mins = 0;
  const hrMatch = durationStr.match(/(\d+)\s*hr/);
  if (hrMatch) mins += parseInt(hrMatch[1], 10) * 60;
  const minMatch = durationStr.match(/(\d+)\s*min/);
  if (minMatch) mins += parseInt(minMatch[1], 10);
  return mins > 0 ? mins : 24;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1. Fetch Profile & Watchlist Data
  const [
    { data: profile },
    { data: entries }
  ] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.from("watchlist_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
  ]);

  const watchlist = entries || [];
  const malIds = watchlist.map((e) => e.mal_id);

  // 2. Fetch related Metadata (for duration and genres)
  const { data: metadataList } = await supabase
    .from("anime_metadata")
    .select("mal_id, jikan_raw, genres")
    .in("mal_id", malIds.length > 0 ? malIds : [0]); // Prevent empty .in() crash

  // --- 3. CRUNCH THE NUMBERS ---
  const stats = {
    total: watchlist.length,
    watching: 0,
    completed: 0,
    totalEps: 0,
    totalMinutes: 0,
    scoreSum: 0,
    scoreCount: 0,
  };

  const scores = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Index 0 = Score 1, Index 9 = Score 10
  const genreTally: Record<string, number> = {};

  watchlist.forEach((entry) => {
    // Basic Status & Episodes
    if (entry.status === "watching") stats.watching++;
    if (entry.status === "completed") stats.completed++;
    stats.totalEps += (entry.watched_episodes || 0);

    // Scoring
    if (entry.score && entry.score > 0) {
      stats.scoreSum += entry.score;
      stats.scoreCount++;
      scores[entry.score - 1]++;
    }

    // Metadata matching (Time & Genres)
    const meta = metadataList?.find((m) => m.mal_id === entry.mal_id);
    if (meta) {
      // Calculate Time
      const durationStr = meta.jikan_raw?.duration;
      const minsPerEp = getMinutesFromDuration(durationStr);
      stats.totalMinutes += (entry.watched_episodes * minsPerEp);

      // Tally Genres (Only for anime they actively watch/completed)
      if (entry.status === "watching" || entry.status === "completed") {
        meta.genres?.forEach((g: string) => {
          genreTally[g] = (genreTally[g] || 0) + 1;
        });
      }
    }
  });

  // Final Derived Stats
  const hoursWatched = (stats.totalMinutes / 60).toFixed(1);
  const meanScore = stats.scoreCount > 0 ? (stats.scoreSum / stats.scoreCount).toFixed(2) : "0.00";
  const maxScoreCount = Math.max(...scores, 1); // Avoid division by zero in CSS height
  
  // Find top genre
  let favGenre = "None";
  let maxGenreCount = 0;
  Object.entries(genreTally).forEach(([genre, count]) => {
    if (count > maxGenreCount) {
      maxGenreCount = count;
      favGenre = genre;
    }
  });

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Otaku";
  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 pb-24">
      
      {/* --- HERO PROFILE CARD --- */}
      <div className="w-full bg-zinc-900/50 border-b border-zinc-800/80 pt-16 pb-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-8">
          
          {/* Avatar */}
          <div className="shrink-0 relative">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-tr from-cyan-600 to-fuchsia-600 flex items-center justify-center text-white font-black text-5xl md:text-6xl shadow-[0_0_30px_rgba(217,70,239,0.4)] border-4 border-zinc-900">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1 text-center md:text-left pt-2">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
              {displayName}
            </h1>
            <p className="text-zinc-400 font-medium mt-2 flex items-center justify-center md:justify-start gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              {user.email}
            </p>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-4">
              Member since {memberSince}
            </p>
          </div>

          <EditProfileModal currentName={profile?.display_name || ""} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* --- LEFT COLUMN: STATS --- */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Stats Grid */}
          <div>
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Anime Stats</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
                <span className="block text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">Total Anime</span>
                <span className="text-3xl font-black text-white">{stats.total}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
                <span className="block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Watching</span>
                <span className="text-3xl font-black text-white">{stats.watching}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
                <span className="block text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Completed</span>
                <span className="text-3xl font-black text-white">{stats.completed}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
                <span className="block text-xs font-bold text-fuchsia-400 uppercase tracking-widest mb-2">Total Eps</span>
                <span className="text-3xl font-black text-white">{stats.totalEps}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
                <span className="block text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Hours Watched</span>
                <span className="text-3xl font-black text-white">{hoursWatched}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
                <span className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Mean Score</span>
                <span className="text-3xl font-black text-white flex items-center gap-2">
                  {meanScore} <span className="text-amber-400 text-xl">★</span>
                </span>
              </div>
            </div>
            
            <div className="mt-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Favorite Genre</span>
              <span className="px-4 py-1.5 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 rounded-full text-sm font-bold tracking-wide">
                {favGenre}
              </span>
            </div>
          </div>

          {/* Score Distribution (Pure CSS) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-8">Score Distribution</h2>
            <div className="flex items-end justify-between h-48 gap-1 sm:gap-2 px-2 sm:px-6">
              {scores.map((count, i) => {
                const heightPercentage = count === 0 ? 0 : (count / maxScoreCount) * 100;
                return (
                  <div key={i} className="flex flex-col items-center flex-1 group">
                    <div className="text-xs font-bold text-zinc-400 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {count}
                    </div>
                    <div className="w-full relative bg-zinc-800 rounded-t-sm overflow-hidden h-full flex items-end">
                      <div 
                        className="w-full bg-gradient-to-t from-fuchsia-600 to-cyan-400 rounded-t-sm transition-all duration-1000 ease-out"
                        style={{ height: `${heightPercentage}%`, minHeight: count > 0 ? '4px' : '0' }}
                      />
                    </div>
                    <div className="mt-3 text-[10px] font-black text-zinc-500">{i + 1}</div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* --- RIGHT COLUMN: HISTORY --- */}
        <div>
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Recently Added</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            {watchlist.slice(0, 5).map((entry) => (
              <Link 
                href={`/anime/${entry.mal_id}`} 
                key={entry.id} 
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-800 transition-colors group"
              >
                <div className="w-12 h-16 shrink-0 bg-zinc-800 rounded overflow-hidden shadow">
                  {entry.poster_url ? (
                    <img src={entry.poster_url} alt="Poster" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-zinc-600">NO IMG</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors">{entry.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {entry.status.replace("_", " ")}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                    <span className="text-xs font-mono text-zinc-400">
                      Ep {entry.watched_episodes}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            {watchlist.length === 0 && (
              <p className="text-sm text-zinc-500 p-4 text-center">No history found.</p>
            )}
            
            {watchlist.length > 5 && (
              <Link href="/watchlist" className="w-full mt-2 py-2 text-center text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-widest">
                View Full Watchlist →
              </Link>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}