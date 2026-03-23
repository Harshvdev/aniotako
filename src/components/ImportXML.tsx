"use client";

import { useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";

// Define the shape of our extracted data
interface WatchlistEntry {
  user_id: string;
  series_animedb_id: number;
  series_title: string;
  series_type: string;
  series_episodes: number;
  my_status: string;
  my_score: number;
  my_watched_episodes: number;
}

export default function ImportXML() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setProgress(0);
    setSummary(null);
    setError(null);

    try {
      // 1. Authenticate user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in to import a watchlist.");
      }

      // 2. Read file content
      const text = await file.text();

      // 3. Parse XML using DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "application/xml");

      // Check for parsing errors
      const parseError = xmlDoc.getElementsByTagName("parsererror");
      if (parseError.length > 0) {
        throw new Error("Invalid XML file format.");
      }

      const animeNodes = xmlDoc.getElementsByTagName("anime");
      const entries: WatchlistEntry[] = [];

      // Helper to safely extract text content
      const getNodeText = (node: Element, tag: string) => {
        return node.getElementsByTagName(tag)[0]?.textContent || "";
      };

      // 4. Extract and map data
      for (let i = 0; i < animeNodes.length; i++) {
        const node = animeNodes[i];
        entries.push({
          user_id: user.id,
          series_animedb_id: parseInt(getNodeText(node, "series_animedb_id")) || 0,
          series_title: getNodeText(node, "series_title"),
          series_type: getNodeText(node, "series_type"),
          series_episodes: parseInt(getNodeText(node, "series_episodes")) || 0,
          my_status: getNodeText(node, "my_status").toLowerCase(),
          my_score: parseInt(getNodeText(node, "my_score")) || 0,
          my_watched_episodes: parseInt(getNodeText(node, "my_watched_episodes")) || 0,
        });
      }

      if (entries.length === 0) {
        throw new Error("No anime entries found in the file.");
      }

      // 5. Bulk Upsert in chunks (e.g., 100 at a time for safety and progress tracking)
      const chunkSize = 100;
      let importedCount = 0;

      for (let i = 0; i < entries.length; i += chunkSize) {
        const chunk = entries.slice(i, i + chunkSize);

        const { error: upsertError } = await supabase
          .from("watchlist_entries")
          .upsert(chunk, { 
            onConflict: 'user_id, series_animedb_id', // Adjust if your unique constraint is different
            ignoreDuplicates: false 
          });

        if (upsertError) {
          throw new Error(`Failed to upsert data: ${upsertError.message}`);
        }

        importedCount += chunk.length;
        setProgress(Math.round((importedCount / entries.length) * 100));
      }

      setSummary(`Imported ${importedCount} anime successfully.`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during import.");
    } finally {
      setIsImporting(false);
      // Reset the input so the user can upload the same file again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800">
      <h2 className="text-xl font-semibold mb-4 text-zinc-800 dark:text-zinc-100">
        Import from MyAnimeList
      </h2>
      <p className="text-sm text-zinc-500 mb-6">
        Upload your MAL XML export file to sync your watchlist.
      </p>

      {/* Upload Button/Input */}
      <div className="mb-4">
        <label
          htmlFor="mal-upload"
          className={`flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isImporting
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isImporting ? "Importing..." : "Select XML File"}
          <input
            id="mal-upload"
            type="file"
            accept=".xml"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isImporting}
            ref={fileInputRef}
          />
        </label>
      </div>

      {/* Progress Bar */}
      {isImporting && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Success Summary Message */}
      {summary && (
        <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-900/30 dark:text-green-400">
          {summary}
        </div>
      )}
    </div>
  );
}