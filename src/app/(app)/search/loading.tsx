export default function SearchLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-10 pb-24 relative z-10">
      
      {/* Search Input and Filter Button Skeleton */}
      <div className="mb-8 w-full max-w-2xl mx-auto flex gap-2">
        <div className="flex-1 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
        <div className="w-24 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 w-full">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl sm:rounded-2xl overflow-hidden flex flex-col w-full h-[280px] sm:h-[350px] animate-pulse"
          >
            <div className="bg-zinc-850 flex-1 w-full" />
            <div className="p-3 sm:p-4 space-y-3 shrink-0 bg-zinc-900/40 border-t border-zinc-800/30">
              <div className="h-3 bg-zinc-800 rounded-md w-1/3" />
              <div className="h-4 bg-zinc-800 rounded-md w-3/4" />
              <div className="h-8 bg-zinc-850 rounded-md w-full" />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
