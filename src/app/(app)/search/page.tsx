import SearchClient from "./SearchClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-16 pb-24 text-zinc-500 font-bold uppercase text-xs tracking-widest text-center flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin"></div>
          Loading Search...
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
