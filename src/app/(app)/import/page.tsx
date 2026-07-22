import { createClient } from "@/lib/supabase/server";
import ImportClient from "./ImportClient";
import FeatureLandingPage from "@/components/FeatureLandingPage";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Import Anime Watchlist",
  description: "Easily migrate and import your MyAnimeList XML watchlist backup into Aniotako to start tracking live episodes.",
  alternates: {
    canonical: "/import",
  },
};

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return <ImportClient />;
  }

  // Guest view: Render a beautiful reusable FeatureLandingPage
  const benefits = [
    {
      title: "One-Click Migration",
      description: "Import your entire MyAnimeList catalog in seconds using your exported XML file.",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
    },
    {
      title: "Sync History & Ratings",
      description: "Keep all your scores, statuses, and watched episode counts perfectly preserved.",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      title: "Automatic Metadata Enrichment",
      description: "Our background worker automatically fetches high-res artwork, genres, and studio details for every imported show.",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
        </svg>
      ),
    },
  ];

  const importIllustration = (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-4">
      {/* Visual representation of an upload/import area */}
      <div className="w-full max-w-[280px] bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-6 shadow-inner flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 animate-bounce">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <div className="h-3 w-32 bg-zinc-800 rounded mb-2" />
        <div className="h-2 w-24 bg-zinc-800/50 rounded mb-6" />
        
        <div className="w-full space-y-2">
          <div className="flex justify-between items-center bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/40">
            <div className="h-2 w-16 bg-zinc-800 rounded" />
            <div className="h-3 w-8 bg-red-500/20 border border-red-500/30 rounded" />
          </div>
          <div className="flex justify-between items-center bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/40">
            <div className="h-2 w-20 bg-zinc-800 rounded" />
            <div className="h-3 w-8 bg-rose-500/20 border border-rose-500/30 rounded" />
          </div>
        </div>
      </div>
      
      {/* Decorative floating elements */}
      <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl opacity-10 blur-xl pointer-events-none" />
    </div>
  );

  return (
    <FeatureLandingPage
      title="Import Watchlist"
      description="Instantly migrate your entire anime library from MyAnimeList. Bring your scores, episodes, and history over in seconds."
      benefits={benefits}
      ctaText="Sign in to import watchlist"
      ctaHref="/login?next=%2Fimport"
      illustration={importIllustration}
    />
  );
}