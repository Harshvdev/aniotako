"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

import UserAvatar from "@/components/UserAvatar";

// THE FIX: Added displayName and avatarInitial to the component props
export default function UserDropdown({ 
  email, 
  displayName, 
  avatarInitial 
}: { 
  email: string | undefined;
  displayName: string;
  avatarInitial: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsHelpOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCloseAll = () => {
    setIsOpen(false);
    setIsHelpOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* The Trigger Button */}
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          setIsHelpOpen(false);
        }}
        className="flex items-center gap-2 rounded-full border-0 sm:border border-zinc-800 bg-transparent sm:bg-zinc-900/50 p-0 sm:pl-3.5 sm:pr-1.5 sm:py-1.5 hover:bg-transparent sm:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 shrink-0"
      >
        <span className="text-sm text-zinc-400 truncate max-w-[120px] md:max-w-xs hidden sm:block">
          {displayName}
        </span>
        <UserAvatar initial={avatarInitial} size="sm" />
      </button>

      {/* The Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl py-2 shadow-2xl z-[60] animate-in fade-in slide-in-from-top-2 origin-top-right">
          
          {/* User Info Header */}
          <div className="px-4 py-2.5 mb-1 border-b border-zinc-800/80">
            <p className="text-sm font-bold text-white truncate">{displayName}</p>
            <p className="text-xs text-zinc-500 truncate">{email}</p>
          </div>
          
          {/* My Profile */}
          <Link 
            href="/profile" 
            onClick={handleCloseAll}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/80 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            My Profile
          </Link>
          
          {/* Settings */}
          <Link 
            href="/settings" 
            onClick={handleCloseAll}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/80 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
          
          {/* Help Menu Trigger with Submenu */}
          <div 
            className="relative"
            onMouseEnter={() => setIsHelpOpen(true)}
            onMouseLeave={() => setIsHelpOpen(false)}
          >
            <button
              onClick={() => setIsHelpOpen(!isHelpOpen)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                isHelpOpen ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help
              </div>
              <svg className={`w-4 h-4 text-zinc-500 transition-transform ${isHelpOpen ? "rotate-90 sm:rotate-0" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Help Submenu Flyout (Desktop) & Accordion (Mobile) */}
            {isHelpOpen && (
              <div className="sm:absolute sm:right-full sm:top-0 sm:mr-2 w-full sm:w-52 bg-zinc-900 sm:border sm:border-zinc-800 rounded-xl sm:rounded-2xl py-1 sm:py-2 shadow-2xl sm:z-[70] animate-in fade-in slide-in-from-right-2">
                <Link 
                  href="/terms" 
                  onClick={handleCloseAll}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/80 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Terms of Service
                </Link>
                <Link 
                  href="/privacy" 
                  onClick={handleCloseAll}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/80 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Privacy Policy
                </Link>
              </div>
            )}
          </div>
          
          <div className="border-t border-zinc-800/80 my-1" />
          
          <div onClick={handleCloseAll}>
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  );
}