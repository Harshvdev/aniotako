import { createClient } from "@/lib/supabase/server";
import CalendarClient from "./CalendarClient";
import FeatureLandingPage from "@/components/FeatureLandingPage";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return <CalendarClient />;
  }

  // Guest view: Render a beautiful reusable FeatureLandingPage
  const benefits = [
    {
      title: "Local Airing Times",
      description: "See exactly when new episodes air, automatically translated to your local timezone.",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: "Track Release Formats",
      description: "Monitor scheduled release times for Raw, Subbed, and Dubbed episodes in one unified grid.",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      ),
    },
    {
      title: "Personalized Grid",
      description: "No noise. The calendar automatically filters down to show only the shows on your watchlist.",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      ),
    },
  ];

  const calendarIllustration = (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-4">
      {/* Visual representation of a calendar grid */}
      <div className="w-full bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-4 shadow-inner">
        <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-3">
          <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-12 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-7 gap-2 mb-3">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
            <div key={idx} className="text-[9px] font-bold text-zinc-600 uppercase">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 14 }).map((_, idx) => {
            const isToday = idx === 4;
            const hasRelease = idx === 4 || idx === 8 || idx === 11;
            return (
              <div 
                key={idx} 
                className={`aspect-square rounded flex flex-col items-center justify-center relative border ${
                  isToday 
                    ? "bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-400 font-bold" 
                    : "bg-zinc-900/30 border-zinc-800/40 text-zinc-500"
                }`}
              >
                <span className="text-[10px]">{idx + 1}</span>
                {hasRelease && (
                  <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isToday ? "bg-fuchsia-400" : "bg-cyan-400"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Decorative floating elements */}
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-fuchsia-500 to-cyan-500 rounded-2xl opacity-10 blur-xl pointer-events-none" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-cyan-500 rounded-full opacity-5 blur-xl pointer-events-none" />
    </div>
  );

  return (
    <FeatureLandingPage
      title="Your Airing Calendar"
      description="Track weekly anime releases tailored exactly to your watchlist. Always know when the next episode is coming."
      benefits={benefits}
      ctaText="Sign in to view calendar"
      ctaHref="/login?next=%2Fcalendar"
      illustration={calendarIllustration}
    />
  );
}