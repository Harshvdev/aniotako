-------------------------------------------------------
-- FIX 1: Secure the anime_metadata table (Issue 1)
-------------------------------------------------------
ALTER TABLE anime_metadata ENABLE ROW LEVEL SECURITY;
-- Allow logged-in users to read the data. 
-- (Our server's Service Role Key already bypasses this for writing).
CREATE POLICY "Authenticated users can read anime metadata" 
  ON anime_metadata FOR SELECT TO authenticated USING (true);


-------------------------------------------------------
-- FIX 2: Add covering index to Push Subscriptions (Issue 9)
-------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id 
  ON push_subscriptions(user_id);


-------------------------------------------------------
-- FIX 3: Optimize RLS Policies for massive scale (Issues 3-7)
-------------------------------------------------------

-- A. Update Watchlist Entries
DROP POLICY IF EXISTS "Users can fully manage their own watchlist entries" ON watchlist_entries;
CREATE POLICY "Users can fully manage their own watchlist entries" 
  ON watchlist_entries FOR ALL 
  USING ((select auth.uid()) = user_id);

-- B. Update Push Subscriptions
DROP POLICY IF EXISTS "Users can fully manage their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can fully manage their own push subscriptions" 
  ON push_subscriptions FOR ALL 
  USING ((select auth.uid()) = user_id);

-- C. Update Notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

CREATE POLICY "Users can view their own notifications" 
  ON notifications FOR SELECT 
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own notifications" 
  ON notifications FOR UPDATE 
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own notifications" 
  ON notifications FOR DELETE 
  USING ((select auth.uid()) = user_id);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';