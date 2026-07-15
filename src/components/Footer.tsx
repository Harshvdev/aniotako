// src/components/Footer.tsx
"use client";

import Link from "next/link";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-800/80 bg-[#09090b]/90 text-zinc-400 py-12 px-4 sm:px-6 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8">
        
        {/* Left column: Logo & Brief */}
        <div className="max-w-sm space-y-3">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <Logo showText={true} size={36} className="group-hover:scale-105 transition-transform" />
          </Link>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Aniotako is a personal anime watchlist tracker and airing scheduler. Designed for anime enthusiasts to organize their watching progress and get real-time notifications in their localized timezone.
          </p>
          <p className="text-[11px] text-zinc-500">
            © {new Date().getFullYear()} Aniotako. All rights reserved. Built and operated from India.
          </p>
        </div>

        {/* Middle column: Quick Links */}
        <div className="flex flex-col sm:flex-row gap-8 sm:gap-16">
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Navigation</h4>
            <ul className="space-y-1.5 text-xs text-zinc-400">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/watchlist" className="hover:text-white transition-colors">Watchlist</Link></li>
              <li><Link href="/search" className="hover:text-white transition-colors">Search Anime</Link></li>
              <li><Link href="/calendar" className="hover:text-white transition-colors">Airing Calendar</Link></li>
              <li><Link href="/import" className="hover:text-white transition-colors">Import MAL / AniList</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Legal & Safety</h4>
            <ul className="space-y-1.5 text-xs text-zinc-400">
              <li><Link href="/terms" className="hover:text-cyan-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-cyan-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/settings" className="hover:text-white transition-colors">Content & Adult Settings</Link></li>
            </ul>
          </div>
        </div>

        {/* Right column: Third-Party Data & Caching Notice */}
        <div className="max-w-md bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-2 text-[11px] text-zinc-400 leading-relaxed shadow-sm">
          <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
            <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Third-Party Data &amp; Caching Notice</span>
          </div>
          <p>
            Aniotako is a personal anime tracking and schedule countdown application. Anime metadata, schedules, and artwork are dynamically retrieved from external third-party APIs (<span className="text-zinc-300">such as AniList and MyAnimeList</span>) and temporarily cached to improve loading speeds.
          </p>
          <p>
            Aniotako does not host, stream, or distribute any video or media files. Adult content (18+) is disabled by default and requires voluntary opt-in within Account Settings.
          </p>
        </div>

      </div>
    </footer>
  );
}
