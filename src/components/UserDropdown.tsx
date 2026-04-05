"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

export default function UserDropdown({ email }: { email: string | undefined }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown if the user clicks anywhere outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* The Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 pl-4 pr-1.5 py-1.5 hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
      >
        <span className="text-sm text-zinc-400 truncate max-w-[120px] md:max-w-xs hidden sm:block">
          {email}
        </span>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-sm shadow-inner shrink-0">
          {email?.charAt(0).toUpperCase() || "U"}
        </div>
      </button>

      {/* The Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 min-w-[200px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl py-2 shadow-2xl z-[60] animate-in fade-in slide-in-from-top-2 origin-top-right custom-scrollbar">
          <div className="px-4 py-2 mb-1 sm:hidden">
            <p className="text-xs text-zinc-500 truncate">{email}</p>
          </div>
          
          <Link 
            href="/profile" 
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            My Profile
          </Link>
          
          <Link 
            href="/settings" 
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Settings
          </Link>
          
          <div className="border-t border-zinc-800 my-1" />
          
          <div onClick={() => setIsOpen(false)}>
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  );
}