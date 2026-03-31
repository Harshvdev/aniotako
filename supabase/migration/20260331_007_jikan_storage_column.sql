ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS jikan_raw JSONB;
NOTIFY pgrst, 'reload schema';