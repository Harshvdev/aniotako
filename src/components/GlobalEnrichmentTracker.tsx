"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchAniListBatch = async (malIds: number[]) => {
  const query = `
    query($malIds: [Int]) {
      Page(page: 1, perPage: 50) {
        media(idMal_in: $malIds, type: ANIME) {
          id
          idMal
          title { romaji english native }
          coverImage { large extraLarge }
          episodes
          format
          status
          genres
          season
          seasonYear
          description
          studios { nodes { name isAnimationStudio } }
          averageScore
          startDate { year }
        }
      }
    }
  `;

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables: { malIds } })
  });

  if (!response.ok) {
    throw new Error(`AniList HTTP Error ${response.status}`);
  }

  const json = await response.json();
  return json.data?.Page?.media || [];
};

const mapAniListMedia = (media: any) => {
  const cleanSynopsis = media.description ? media.description.replace(/<[^>]*>?/gm, '') : null;
  const mainStudio = media.studios?.nodes?.find((s: any) => s.isAnimationStudio)?.name
                  || media.studios?.nodes?.[0]?.name || null;
  
  return {
    anilist_id: media.id,
    title: media.title.romaji || media.title.english || "",
    title_english: media.title.english || null,
    title_romaji: media.title.romaji || null,
    title_native: media.title.native || null,
    genres: media.genres || [],
    type: media.format || "Unknown",
    season: media.season || null,
    airing_status: media.status || null,
    studio: mainStudio,
    year: media.seasonYear || media.startDate?.year || null,
    total_episodes: media.episodes || null,
    synopsis: cleanSynopsis,
    poster_url: media.coverImage?.extraLarge || media.coverImage?.large || null,
    anilist_raw: media,
    jikan_raw: null
  };
};

const mapJikanMedia = (jData: any) => {
  const combinedGenres = Array.from(new Set([
    ...(jData.genres || []), ...(jData.explicit_genres || []),
    ...(jData.themes || []), ...(jData.demographics || [])
  ].map((g: any) => g.name)));
  
  return {
    anilist_id: null,
    title: jData.title || "",
    title_english: jData.title_english || null,
    title_romaji: jData.title || null,
    genres: combinedGenres,
    type: jData.type || "Unknown",
    season: jData.season || null,
    airing_status: jData.status || null,
    studio: jData.studios?.[0]?.name || null,
    year: jData.year || null,
    total_episodes: jData.episodes || null,
    synopsis: jData.synopsis || null,
    poster_url: jData.images?.jpg?.large_image_url || null,
    anilist_raw: null,
    jikan_raw: jData
  };
};

export default function GlobalEnrichmentTracker() {
  const [isActive, setIsActive] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [stats, setStats] = useState({ done: 0, total: 0 });
  const [syncStage, setSyncStage] = useState<"anilist" | "jikan">("anilist");
  const [jikanQueueLength, setJikanQueueLength] = useState(0);
  const [jikanDone, setJikanDone] = useState(0);
  
  const isProcessingRef = useRef(false);
  const router = useRouter();

  // Guard against tab closure
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isActive) {
        e.preventDefault();
        e.returnValue = "Enrichment is in progress. Leaving now will pause the sync.";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isActive]);

  const checkStatusAndStart = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true; 

    try {
      const res = await fetch("/api/enrich");
      if (!res.ok) {
        isProcessingRef.current = false;
        return;
      }
      
      const { remaining, pendingEntries } = await res.json();
      
      if (remaining > 0 && pendingEntries && pendingEntries.length > 0) {
        setStats({ done: 0, total: remaining });
        startProcessing(pendingEntries);
      } else {
        isProcessingRef.current = false; 
      }
    } catch (err) {
      console.error("Failed to check enrichment status", err);
      isProcessingRef.current = false; 
    }
  };

  const startProcessing = async (pendingEntries: any[]) => {
    setIsActive(true);
    setIsComplete(false);
    setSyncStage("anilist");

    const jikanFallbackQueue: any[] = [];
    let doneCount = 0;

    // --- STAGE 1: ANILIST BATCHING (Fast) ---
    const CHUNK_SIZE = 50;
    for (let i = 0; i < pendingEntries.length; i += CHUNK_SIZE) {
      const chunk = pendingEntries.slice(i, i + CHUNK_SIZE);
      const chunkIds = chunk.map(e => e.mal_id);

      let mediaList: any[] = [];
      let aniListFailed = false;

      try {
        mediaList = await fetchAniListBatch(chunkIds);
      } catch (err) {
        console.warn("[Enrich] AniList batch fetch failed. Will fallback all chunk items to Jikan.", err);
        aniListFailed = true;
      }

      const mediaMap = new Map<number, any>();
      mediaList.forEach((media: any) => {
        if (media.idMal) mediaMap.set(media.idMal, media);
      });

      const enrichmentsToSave: any[] = [];

      for (const entry of chunk) {
        const media = mediaMap.get(entry.mal_id);
        if (media && !aniListFailed) {
          const mappedMetadata = mapAniListMedia(media);
          enrichmentsToSave.push({
            mal_id: entry.mal_id,
            watchlist_id: entry.id,
            status: entry.status,
            watched_episodes: entry.watched_episodes,
            poster_url: mappedMetadata.poster_url,
            total_episodes: mappedMetadata.total_episodes,
            title_english: mappedMetadata.title_english,
            title_romaji: mappedMetadata.title_romaji,
            metadata: mappedMetadata
          });
        } else {
          // Add to Jikan queue if not found on AniList or if AniList failed
          jikanFallbackQueue.push(entry);
        }
      }

      // Save AniList resolved chunk to database immediately
      if (enrichmentsToSave.length > 0) {
        try {
          const saveRes = await fetch("/api/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enrichments: enrichmentsToSave })
          });
          if (!saveRes.ok) {
            console.error("[Enrich] Failed to save AniList batch to DB");
          } else {
            doneCount += enrichmentsToSave.length;
            setStats(prev => ({ ...prev, done: doneCount }));
          }
        } catch (saveErr) {
          console.error("[Enrich] Error saving AniList batch", saveErr);
        }
      }
    }

    // --- STAGE 2: JIKAN FALLBACK (Slow / Sequential) ---
    if (jikanFallbackQueue.length > 0) {
      setSyncStage("jikan");
      setJikanQueueLength(jikanFallbackQueue.length);
      setJikanDone(0);

      for (let j = 0; j < jikanFallbackQueue.length; j++) {
        const entry = jikanFallbackQueue[j];
        
        // Respect Jikan 3 req/sec limit with 1.2s delay
        await delay(1200);

        let mappedMetadata: any = null;
        let jikanFailedOr404 = false;

        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${entry.mal_id}`);
          if (res.status === 404) {
            jikanFailedOr404 = true;
          } else if (!res.ok) {
            throw new Error(`Jikan returned HTTP ${res.status}`);
          } else {
            const json = await res.json();
            const jData = json.data;
            if (jData) {
              mappedMetadata = mapJikanMedia(jData);
            } else {
              jikanFailedOr404 = true;
            }
          }
        } catch (err) {
          console.warn(`[Enrich] Jikan fetch failed for MAL ID ${entry.mal_id}`, err);
          jikanFailedOr404 = true;
        }

        // Handle Ghost Item or missing item: cache as "Unknown" to avoid retrying
        if (jikanFailedOr404 || !mappedMetadata) {
          mappedMetadata = {
            title: entry.title,
            type: "Unknown"
          };
        }

        const enrichmentPayload = {
          mal_id: entry.mal_id,
          watchlist_id: entry.id,
          status: entry.status,
          watched_episodes: entry.watched_episodes,
          poster_url: mappedMetadata.poster_url || null,
          total_episodes: mappedMetadata.total_episodes || null,
          title_english: mappedMetadata.title_english || null,
          title_romaji: mappedMetadata.title_romaji || null,
          metadata: mappedMetadata
        };

        try {
          const saveRes = await fetch("/api/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enrichments: [enrichmentPayload] })
          });
          if (saveRes.ok) {
            doneCount++;
            setJikanDone(j + 1);
            setStats(prev => ({ ...prev, done: doneCount }));
          }
        } catch (saveErr) {
          console.error(`[Enrich] Failed to save Jikan fallback for MAL ID ${entry.mal_id}`, saveErr);
        }
      }
    }

    // --- COMPLETE ---
    setIsActive(false);
    setIsComplete(true);
    isProcessingRef.current = false;
    
    router.refresh();

    setTimeout(() => {
      setIsComplete(false);
      setStats({ done: 0, total: 0 });
      setJikanQueueLength(0);
      setJikanDone(0);
    }, 4000);
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
              <p className="text-xs font-bold text-white tracking-wide truncate">
                {syncStage === "anilist" 
                  ? "Syncing artwork & metadata..." 
                  : `Searching MyAnimeList (${jikanDone}/${jikanQueueLength})...`}
              </p>
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
        ) : null}
      </div>
    </div>
  );
}