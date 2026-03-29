-- 1. Create the table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id INTEGER NOT NULL,
  anime_title TEXT NOT NULL,
  episode_number INTEGER,
  poster_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Allow users to read their own notifications
CREATE POLICY "Users can view their own notifications" 
  ON notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow users to mark their own notifications as read
CREATE POLICY "Users can update their own notifications" 
  ON notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Allow users to clear/delete their own notifications
CREATE POLICY "Users can delete their own notifications" 
  ON notifications 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- NOTE: We intentionally do NOT create an INSERT policy. 
-- By omitting it, users cannot insert notifications from the client browser.
-- Your Cron Job will use the SUPABASE_SERVICE_ROLE_KEY, which automatically 
-- bypasses RLS to securely inject notifications into the database.

-- 4. Create Performance Indexes
-- Index for quickly calculating the "unread badge" count
CREATE INDEX idx_notifications_user_read 
  ON notifications (user_id, is_read);

-- Index for fetching the dropdown list sorted by newest first
CREATE INDEX idx_notifications_user_created 
  ON notifications (user_id, created_at DESC);