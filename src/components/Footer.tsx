// src/components/Footer.tsx
"use client";

import Link from "next/link";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="hidden md:block relative w-full border-t border-zinc-900 bg-zinc-950/60 text-zinc-400 py-6 px-4 sm:px-6 md:px-8 backdrop-blur-md overflow-hidden">
      {/* Background Subtle Radial Gradient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.03),rgba(244,63,94,0.02),transparent_70%)] pointer-events-none" />
      
      {/* Top Border Gradient Glow Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-800/50 to-transparent" />

      <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        
        {/* Left Side: Brand, Copyright & Small Disclaimer */}
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 group shrink-0">
              <Logo
                showText={true}
                size={28}
                className="group-hover:scale-105 transition-transform duration-300"
              />
            </Link>
            <span className="text-zinc-800">|</span>
            <span className="text-[11px] text-zinc-500">
              © {new Date().getFullYear()} Aniotako. All rights reserved.
            </span>
          </div>
          <p className="text-[10px] text-zinc-600 leading-normal">
            Aniotako is a personal tracking application. Metadata and artwork are retrieved from external APIs. We do not host, stream, or distribute any media files.
          </p>
        </div>

        {/* Right Side: Links & Operation Pill */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs shrink-0 self-start md:self-center">
          <Link href="/terms" className="hover:text-cyan-400 transition-colors duration-200">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-cyan-400 transition-colors duration-200">
            Privacy Policy
          </Link>
          <span className="text-[10px] bg-zinc-900/60 text-zinc-500 px-2.5 py-0.5 rounded-full border border-zinc-800/80">
            India
          </span>
        </div>

      </div>
    </footer>
  );
}


