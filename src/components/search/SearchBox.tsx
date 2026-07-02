"use client";

interface SearchBoxProps {
  value: string;
  onChange: (val: string) => void;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onFilterClick?: () => void;
  isFilterActive?: boolean;
  placeholder?: string;
  loading?: boolean;
}

export default function SearchBox({
  value,
  onChange,
  onFocus,
  onKeyDown,
  onFilterClick,
  isFilterActive = false,
  placeholder = "Search anime...",
  loading = false,
}: SearchBoxProps) {
  return (
    <div className="flex gap-2 w-full relative">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl py-3.5 pl-12 pr-12 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all backdrop-blur-sm shadow-lg"
        />

        {loading && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <div className="w-4 h-4 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {onFilterClick && (
        <button
          type="button"
          onClick={onFilterClick}
          className={`flex items-center justify-center gap-2 px-5 rounded-2xl border transition-all shadow-lg text-xs font-bold uppercase tracking-wider shrink-0 ${
            isFilterActive
              ? "bg-fuchsia-500/10 border-fuchsia-500/50 text-fuchsia-400"
              : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="hidden sm:block">Filter</span>
        </button>
      )}
    </div>
  );
}
