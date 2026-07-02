export default function AnimeDetailLoading() {
  return (
    <div className="min-h-screen bg-[#09090b] pb-24">
      {/* 1. HERO BACKGROUND SKELETON */}
      <div className="relative h-[300px] md:h-[400px] w-full overflow-hidden border-b border-zinc-800 bg-zinc-950 animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-[#09090b]/30" />
      </div>

      {/* 2. MAIN CONTENT OVERLAP SKELETON */}
      <div className="max-w-6xl mx-auto px-6 relative z-10 -mt-32 md:-mt-48 flex flex-col md:flex-row gap-8">
        
        {/* Left Column Skeleton */}
        <div className="shrink-0 flex flex-col items-center md:items-start gap-4">
          {/* Poster placeholder */}
          <div className="w-48 md:w-64 aspect-[2/3] rounded-2xl bg-zinc-850 shadow-2xl border border-zinc-800 animate-pulse" />
          
          {/* Tracking Card placeholder */}
          <div className="hidden md:block w-full h-44 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse" />
        </div>

        {/* Right Column Skeleton */}
        <div className="flex-1 pt-2 md:pt-16 flex flex-col gap-5">
          {/* Title placeholders */}
          <div className="flex flex-col gap-2">
            <div className="h-10 md:h-14 bg-zinc-800 rounded-2xl w-3/4 animate-pulse" />
            <div className="h-5 bg-zinc-850 rounded-xl w-1/3 animate-pulse" />
          </div>

          {/* Quick Stats placeholder */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-6 w-24 bg-zinc-850 rounded-full animate-pulse" />
            <div className="h-8 w-16 bg-zinc-850 rounded-xl animate-pulse" />
            <div className="h-8 w-24 bg-zinc-850 rounded-xl animate-pulse" />
          </div>

          {/* Countdown schedule placeholder */}
          <div className="p-5 rounded-2xl bg-zinc-900/20 border border-zinc-800/80 w-full flex flex-col gap-3 animate-pulse">
            <div className="h-3.5 bg-zinc-800 rounded w-1/4" />
            <div className="h-8 bg-zinc-850 rounded w-2/3" />
            <div className="h-8 bg-zinc-850 rounded w-1/2" />
          </div>

          {/* Details Tabs and Info placeholder */}
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex gap-4 border-b border-zinc-800/60 pb-3">
              <div className="h-7 w-20 bg-zinc-800 rounded-lg animate-pulse" />
              <div className="h-7 w-24 bg-zinc-800 rounded-lg animate-pulse" />
              <div className="h-7 w-20 bg-zinc-800 rounded-lg animate-pulse" />
            </div>
            <div className="h-28 bg-zinc-900/10 border border-zinc-800/40 rounded-2xl w-full animate-pulse" />
          </div>

        </div>
      </div>
    </div>
  );
}
