"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";

export default function MobileNavDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      {/* The Hamburger Button */}
      <button 
        onClick={() => setIsOpen(true)} 
        className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* The Slide-in Drawer */}
      {mounted && isOpen && createPortal(
        <div className="md:hidden">
          <div 
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm animate-in fade-in" 
            onClick={() => setIsOpen(false)} 
          />
          
          <div className="fixed inset-y-0 left-0 w-64 bg-zinc-950 border-r border-zinc-800 shadow-2xl z-[101] flex flex-col animate-in slide-in-from-left">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
              <span className="font-bold text-white tracking-widest uppercase text-sm">Menu</span>
              <button onClick={() => setIsOpen(false)} className="p-2 -mr-2 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700 rounded-full transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar">
              <div className="flex flex-col p-4 gap-2">
                <Link href="/" onClick={() => setIsOpen(false)} className="px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl transition-colors">Home</Link>
                <Link href="/watchlist" onClick={() => setIsOpen(false)} className="px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl transition-colors">Watchlist</Link>
                <Link href="/search" onClick={() => setIsOpen(false)} className="px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl transition-colors">Search</Link>
                <Link href="/calendar" onClick={() => setIsOpen(false)} className="px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl transition-colors">Calendar</Link>
                <Link href="/import" onClick={() => setIsOpen(false)} className="px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl transition-colors">Import</Link>
                <Link href="/notifications" onClick={() => setIsOpen(false)} className="px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl transition-colors">Notifications</Link>
                
                <div className="border-t border-zinc-800 my-2 mx-2 shrink-0" />
                
                <Link href="/profile" onClick={() => setIsOpen(false)} className="px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl transition-colors">My Profile</Link>
                <Link href="/settings" onClick={() => setIsOpen(false)} className="px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl transition-colors">Settings</Link>
              </div>

              {/* Mobile Sidebar Footer */}
              <div className="p-6 border-t border-zinc-900 bg-zinc-950/40 space-y-4 shrink-0">
                <div className="flex flex-col gap-1 text-[11px] text-zinc-500">
                  <p>© {new Date().getFullYear()} Aniotako. All rights reserved.</p>
                  <p className="text-[10px] text-zinc-600 leading-normal">
                    Aniotako is a personal tracking application. Metadata and artwork are retrieved from external APIs. We do not host, stream, or distribute any media files.
                  </p>
                </div>
                
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex gap-4">
                    <Link href="/terms" onClick={() => setIsOpen(false)} className="hover:text-cyan-400 transition-colors">
                      Terms
                    </Link>
                    <Link href="/privacy" onClick={() => setIsOpen(false)} className="hover:text-cyan-400 transition-colors">
                      Privacy
                    </Link>
                  </div>
                  <span className="text-[10px] bg-zinc-900/60 text-zinc-500 px-2 py-0.5 rounded-full border border-zinc-800/80">
                    India
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}