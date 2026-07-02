export default function NotificationsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
      
      {/* Header Area Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div className="flex flex-col gap-2">
          <div className="h-8 bg-zinc-800 rounded-xl w-44 animate-pulse" />
          <div className="h-4 bg-zinc-850 rounded-lg w-56 animate-pulse" />
        </div>
      </div>

      {/* Notifications List Skeleton */}
      <div className="space-y-8">
        {[ "Today", "Yesterday", "Earlier" ].map((groupLabel, idx) => (
          <div key={idx} className="flex flex-col gap-4">
            {/* Group Label Skeleton */}
            <div className="h-3.5 bg-zinc-850 rounded w-16 animate-pulse mb-1 pl-2" />
            
            {/* Notifications Group items */}
            <div className="flex flex-col gap-3">
              {Array.from({ length: idx === 0 ? 3 : 2 }).map((_, itemIdx) => (
                <div 
                  key={itemIdx}
                  className="w-full flex items-start sm:items-center gap-4 p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/10 animate-pulse"
                >
                  {/* Poster placeholder */}
                  <div className="shrink-0 w-12 h-16 sm:w-16 sm:h-20 bg-zinc-850 rounded-lg" />
                  
                  {/* Content placeholder */}
                  <div className="flex-1 flex flex-col gap-2.5">
                    <div className="h-4 bg-zinc-800 rounded w-1/3" />
                    <div className="h-3.5 bg-zinc-850 rounded w-3/4" />
                    <div className="h-3 bg-zinc-850 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
