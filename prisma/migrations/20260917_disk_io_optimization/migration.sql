-- ==============================================================================
-- Migration: Disk IO Optimization (Schema Elevation & Indexing)
-- Purpose: Permanently resolve Supabase Disk IO budget exhaustion
-- ==============================================================================

-- 1. Schema Elevation: Add popularity column to anime_metadata for direct SQL sorting
ALTER TABLE public.anime_metadata 
ADD COLUMN IF NOT EXISTS popularity integer;

-- 2. Backfill existing popularity from raw JSON payload
UPDATE public.anime_metadata
SET popularity = (anilist_raw->>'popularity')::integer
WHERE anilist_raw IS NOT NULL 
  AND (anilist_raw->>'popularity') IS NOT NULL 
  AND popularity IS NULL;

-- 3. Composite index on anime_metadata for instant sitemap generation (replaces TOAST scan)
CREATE INDEX IF NOT EXISTS idx_anime_metadata_sitemap 
ON public.anime_metadata (airing_status, popularity DESC NULLS LAST);

-- 4. Foreign key index on watchlist_entries (accelerates /api/notify and FK cascades)
CREATE INDEX IF NOT EXISTS idx_watchlist_entries_mal_id 
ON public.watchlist_entries (mal_id);

-- 5. Partial index on active watchlists
CREATE INDEX IF NOT EXISTS idx_watchlist_entries_watching 
ON public.watchlist_entries (mal_id) 
WHERE status = 'watching';

-- 6. Indexes on notification_events for the cron scanner and notification delivery
CREATE INDEX IF NOT EXISTS idx_notification_events_aired_at 
ON public.notification_events (aired_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_events_mal_ep 
ON public.notification_events (mal_id, episode_number);

-- 7. Indexes on notifications for deduplication and auto-pruning
CREATE INDEX IF NOT EXISTS idx_notifications_event_id 
ON public.notifications (notification_event_id);

CREATE INDEX IF NOT EXISTS idx_notifications_prune 
ON public.notifications (is_cleared, created_at) 
WHERE is_cleared = true;
