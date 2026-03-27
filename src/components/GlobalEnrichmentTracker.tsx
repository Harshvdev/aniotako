"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function GlobalEnrichmentTracker() {
  const [isActive, setIsActive] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [stats, setStats] = useState({ done: 0, total: 0, remaining: 0 });
  
  const isProcessingRef = useRef(false);
  const router = useRouter();

  const checkStatusAndStart = async () => {
    // 1. LOCK IMMEDIATELY. Do not wait for fetch.
    if (isProcessingRef.current) return;
    isProcessingRef.current = true; 

    try {
      const res = await fetch("/api/enrich");
      if (!res.ok) {
        isProcessingRef.current = false;
        return;
      }
      
      const { remaining } = await res.json();
      
      if (remaining > 0) {
        setStats(prev => ({ 
          ...prev, 
          remaining, 
          total: prev.total > remaining ? prev.total : remaining 
        }));
        // startProcessing takes over the lock from here
        startProcessing(remaining);
      } else {
        // Unlock if there is nothing to do
        isProcessingRef.current = false; 
      }
    } catch (err) {
      console.error("Failed to check enrichment status", err);
      isProcessingRef.current = false; 
    }
  };

  const startProcessing = async (initialRemaining: number) => {
    setIsActive(true);
    setIsComplete(false);

    let currentRemaining = initialRemaining;

    while (currentRemaining > 0) {
      try {
        const res = await fetch("/api/enrich", { method: "POST" });
        if (!res.ok) break; 
        
        // 2. SHIELD AGAINST HTML ERRORS (Fixes the <!DOCTYPE crash)
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error("Server returned non-JSON response. Pausing tracker.");
          break;
        }

        const data = await res.json();
        currentRemaining = data.remaining;
        
        setStats(prev => ({
          ...prev,
          remaining: data.remaining,
          done: prev.total - data.remaining
        }));

        if (data.remaining <= 0) {
          isProcessingRef.current = false;
          setIsActive(false);
          setIsComplete(true);
          
          router.refresh();
          
          setTimeout(() => {
            setIsComplete(false);
            setStats({ done: 0, total: 0, remaining: 0 });
          }, 4000);
          break;
        }
      } catch (err) {
        console.error("Enrichment loop interrupted", err);
        break;
      }
    }
    isProcessingRef.current = false; // Always release the lock when done
  };

  useEffect(() => {
    checkStatusAndStart();
    
    const handleTrigger = () => checkStatusAndStart();
    window.addEventListener("trigger-enrichment", handleTrigger);
    
    return () => window.removeEventListener("trigger-enrichment", handleTrigger);
  }, []);

  if (!isActive && !isComplete) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-zinc-900/90 border border-zinc-800 backdrop-blur-md p-4 rounded-2xl shadow-2xl w-72">
        {isActive ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-cyan-500 rounded-full animate-spin shrink-0"></div>
              <p className="text-xs font-bold text-white tracking-wide truncate">Syncing missing artwork...</p>
            </div>
            
            <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden mb-2">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 h-full transition-all duration-500"
                style={{ width: stats.total > 0 ? `${(stats.done / stats.total) * 100}%` : '0%' }}
              />
            </div>
            
            <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              <span>Background task</span>
              <span className="text-cyan-400">{stats.done} / {stats.total}</span>
            </div>
          </>
        ) : isComplete ? (
          <div className="flex items-center gap-3 text-emerald-400">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <p className="text-xs font-bold tracking-wide">Artwork sync complete!</p>
          </div>
        ): null}
      </div>
    </div>
  );
}