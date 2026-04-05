ALTER TABLE notifications ADD COLUMN IF NOT EXISTS episode_number INTEGER;
NOTIFY pgrst, 'reload schema';