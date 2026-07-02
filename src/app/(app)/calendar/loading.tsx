export default function CalendarLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-32 min-h-screen">
      
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <div className="h-8 bg-zinc-800 rounded-xl w-48 animate-pulse" />
          <div className="h-4 bg-zinc-850 rounded-lg w-28 animate-pulse" />
        </div>
        <div className="h-11 bg-zinc-900 border border-zinc-800 rounded-xl w-full sm:w-40 animate-pulse" />
      </div>

      {/* Week day strip Skeleton */}
      <div className="flex gap-2 sm:gap-4 mb-10 overflow-x-auto pb-2 px-1">
        {Array.from({ length: 7 }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-center min-w-[3.5rem] sm:min-w-[4rem] h-[68px] sm:h-[84px] py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-zinc-900/50 border border-zinc-800/80 animate-pulse shrink-0"
          >
            <div className="h-2.5 bg-zinc-850 rounded w-1/2" />
            <div className="h-5 bg-zinc-800 rounded w-1/3 mt-2" />
          </div>
        ))}
      </div>

      {/* Scheduled Anime Section Header */}
      <div className="h-4 bg-zinc-850 rounded w-36 animate-pulse mb-6" />

      {/* Scheduled Anime List Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 p-3 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl animate-pulse"
          >
            {/* Image Placeholder */}
            <div className="w-16 h-24 bg-zinc-850 rounded-xl shrink-0" />
            
            {/* Details Placeholder */}
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-4 bg-zinc-800 rounded w-3/4" />
              <div className="h-3 bg-zinc-850 rounded w-1/2" />
              <div className="h-6 bg-zinc-850 rounded w-5/6 mt-1" />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
