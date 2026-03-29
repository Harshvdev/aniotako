-- 1. Create the column by explicitly locking the timezone to UTC
ALTER TABLE notifications 
ADD COLUMN created_date DATE GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::DATE) STORED;

-- 2. Add the unique constraint for our cron job deduplication
ALTER TABLE notifications 
ADD CONSTRAINT unique_daily_notification UNIQUE (user_id, mal_id, created_date);

-- 3. Reload the schema cache so the API instantly sees the new setup
NOTIFY pgrst, 'reload schema';