-- 1. Destroy the corrupted cache table
DROP TABLE IF EXISTS anime_metadata;

-- 2. Build it perfectly from scratch
CREATE TABLE anime_metadata (
  mal_id BIGINT PRIMARY KEY,
  title TEXT,
  genres TEXT[],
  type TEXT,
  season TEXT,
  airing_status TEXT,
  studio TEXT,
  year INT,
  total_episodes INT,
  synopsis TEXT,
  poster_url TEXT,
  cached_at TIMESTAMPTZ
);

-- 3. Force Supabase to wake up and see the new table
NOTIFY pgrst, 'reload schema';