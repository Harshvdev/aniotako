export default function WatchlistLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-10 pb-24 relative z-10">
      
      {/* Header Skeleton */}
      <div className="md:hidden flex items-center justify-between mb-4">
        <div className="h-8 w-28 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="w-10 h-10 bg-zinc-850 border border-zinc-800 rounded-xl animate-pulse" />
      </div>

      {/* Filter Panel Skeleton */}
      <div className="mb-6 sm:mb-8 bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex-1 max-w-md h-11 bg-zinc-850 border border-zinc-800 rounded-2xl animate-pulse" />
        <div className="flex flex-wrap gap-2.5">
          <div className="h-9 w-24 bg-zinc-850 border border-zinc-800 rounded-xl animate-pulse" />
          <div className="h-9 w-28 bg-zinc-850 border border-zinc-800 rounded-xl animate-pulse" />
          <div className="h-9 w-28 bg-zinc-850 border border-zinc-800 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Anime Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div key={idx} className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl flex flex-col">
            {/* Image Skeleton */}
            <div className="relative aspect-[2/3] w-full bg-zinc-850 animate-pulse" />
            
            {/* Details Skeleton */}
            <div className="p-3 sm:p-4 flex flex-col flex-1 gap-2">
              <div className="h-4 bg-zinc-800 rounded w-5/6 animate-pulse" />
              <div className="h-3 bg-zinc-850 rounded w-1/2 animate-pulse" />
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-800/50">
                <div className="h-3.5 bg-zinc-850 rounded w-1/3 animate-pulse" />
                <div className="h-3.5 bg-zinc-850 rounded w-1/4 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
