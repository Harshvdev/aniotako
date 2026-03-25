"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import Link from "next/link";

interface ParsedAnime {
  mal_id: number;
  title: string;
  status: string;
  score: number | null;
  watched_episodes: number;
  total_episodes: number | null;
}

interface PreviewCounts {
  total: number;
  watching: number;
  completed: number;
  on_hold: number;
  dropped: number;
  plan_to_watch: number;
}

export default function ImportPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedAnime[] | null>(null);
  const [counts, setCounts] = useState<PreviewCounts | null>(null);
  
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers for Drag & Drop ---
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  // --- File Processing & Parsing ---
  const mapStatus = (malStatus: string) => {
    const s = malStatus.trim().toLowerCase();
    if (s === "watching") return "watching";
    if (s === "completed") return "completed";
    if (s === "on-hold") return "on_hold";
    if (s === "dropped") return "dropped";
    if (s === "plan to watch") return "plan_to_watch";
    return "watching"; // Fallback
  };

  const processFile = async (file: File) => {
    setError(null);
    setSuccessMsg(null);
    setParsedData(null);

    if (!file.name.endsWith(".xml")) {
      setError("Please upload a valid .xml file.");
      return;
    }

    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "application/xml");

      const parseError = xmlDoc.getElementsByTagName("parsererror");
      if (parseError.length > 0) {
        throw new Error("Invalid XML file format.");
      }

      const animeNodes = xmlDoc.getElementsByTagName("anime");
      const entries: ParsedAnime[] = [];
      const newCounts: PreviewCounts = { total: 0, watching: 0, completed: 0, on_hold: 0, dropped: 0, plan_to_watch: 0 };

      const getNodeText = (node: Element, tag: string) => node.getElementsByTagName(tag)[0]?.textContent || "";

      for (let i = 0; i < animeNodes.length; i++) {
        const node = animeNodes[i];
        
        const rawStatus = getNodeText(node, "my_status");
        const mappedStatus = mapStatus(rawStatus);
        
        const score = parseInt(getNodeText(node, "my_score")) || 0;
        const totalEps = parseInt(getNodeText(node, "series_episodes")) || 0;

        entries.push({
          mal_id: parseInt(getNodeText(node, "series_animedb_id")) || 0,
          title: getNodeText(node, "series_title"),
          status: mappedStatus,
          score: score > 0 ? score : null, // 0 means unrated in MAL
          watched_episodes: parseInt(getNodeText(node, "my_watched_episodes")) || 0,
          total_episodes: totalEps > 0 ? totalEps : null,
        });

        newCounts.total++;
        if (mappedStatus === "watching") newCounts.watching++;
        if (mappedStatus === "completed") newCounts.completed++;
        if (mappedStatus === "on_hold") newCounts.on_hold++;
        if (mappedStatus === "dropped") newCounts.dropped++;
        if (mappedStatus === "plan_to_watch") newCounts.plan_to_watch++;
      }

      if (entries.length === 0) {
        throw new Error("No anime entries found in this XML file.");
      }

      setParsedData(entries);
      setCounts(newCounts);
    } catch (err: any) {
      setError(err.message || "Failed to parse file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- API Batch Submission ---
  const handleImport = async () => {
    if (!parsedData) return;
    setIsImporting(true);
    setError(null);
    setProgress(0);

    const BATCH_SIZE = 50;
    let importedCount = 0;

    try {
      for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
        const batch = parsedData.slice(i, i + BATCH_SIZE);

        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: batch }),
        });

        if (!res.ok) {
          const { error: apiError } = await res.json();
          throw new Error(apiError || "Failed to import batch.");
        }

        importedCount += batch.length;
        setProgress(Math.round((importedCount / parsedData.length) * 100));
      }

      setSuccessMsg(`Imported ${importedCount} anime successfully.`);
      setParsedData(null); // Clear preview on success
      setCounts(null);
    } catch (err: any) {
      setError(err.message || "An error occurred during import.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Import Watchlist</h1>
        <p className="text-zinc-400">
          Upload your MyAnimeList XML export file to instantly sync your progress.
        </p>
      </div>

      {/* Upload Zone */}
      {!parsedData && !successMsg && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[300px] ${
            isDragging 
              ? "border-fuchsia-500 bg-fuchsia-500/10 scale-[1.02]" 
              : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-800/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors ${isDragging ? "bg-fuchsia-500/20 text-fuchsia-400" : "bg-zinc-800 text-zinc-400"}`}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Drag & Drop your XML file</h3>
          <p className="text-zinc-500 mb-6 max-w-sm">or click to browse your files. Must be an uncompressed .xml file exported from MyAnimeList.</p>
          <button className="px-6 py-2 rounded-full bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors pointer-events-none">
            Select File
          </button>
          <input 
            type="file" 
            accept=".xml" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Preview State */}
      {parsedData && counts && !successMsg && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-8 h-8 rounded bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </span>
            File Parsed Successfully
          </h2>
          
          <p className="text-zinc-300 mb-6 font-medium">
            Found <strong className="text-white">{counts.total}</strong> anime in your export.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400 mb-1">{counts.watching}</div>
              <div className="text-[10px] uppercase font-bold text-emerald-500/70 tracking-widest">Watching</div>
            </div>
            <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-fuchsia-400 mb-1">{counts.completed}</div>
              <div className="text-[10px] uppercase font-bold text-fuchsia-500/70 tracking-widest">Completed</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400 mb-1">{counts.on_hold}</div>
              <div className="text-[10px] uppercase font-bold text-amber-500/70 tracking-widest">On Hold</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-400 mb-1">{counts.dropped}</div>
              <div className="text-[10px] uppercase font-bold text-red-500/70 tracking-widest">Dropped</div>
            </div>
            <div className="bg-zinc-500/10 border border-zinc-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-zinc-400 mb-1">{counts.plan_to_watch}</div>
              <div className="text-[10px] uppercase font-bold text-zinc-500/70 tracking-widest">Plan to Watch</div>
            </div>
          </div>

          {/* Progress Bar */}
          {isImporting && (
            <div className="mb-6">
              <div className="flex justify-between text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">
                <span>Importing to Database...</span>
                <span className="text-cyan-400">{progress}%</span>
              </div>
              <div className="w-full bg-zinc-950 rounded-full h-3 border border-zinc-800 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-fuchsia-500 to-cyan-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button 
              onClick={handleImport}
              disabled={isImporting}
              className="flex-1 py-3 rounded-full bg-white text-black font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? "Importing..." : "Confirm & Import"}
            </button>
            <button 
              onClick={() => setParsedData(null)}
              disabled={isImporting}
              className="px-6 py-3 rounded-full bg-zinc-800 text-white font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-3 animate-in fade-in">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mt-6 p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center animate-in fade-in slide-in-from-bottom-4">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
          <p className="text-emerald-400/80 mb-8">{successMsg}</p>
          <Link 
            href="/watchlist" 
            className="px-8 py-3 rounded-full bg-emerald-500 text-white font-bold uppercase tracking-widest hover:bg-emerald-600 transition-colors inline-block shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            View Watchlist
          </Link>
        </div>
      )}
    </div>
  );
}