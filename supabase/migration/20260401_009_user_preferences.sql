-- 1. Create the user_preferences table
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_watching_only BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  show_adult BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
CREATE POLICY "Users can view their own preferences" 
  ON user_preferences FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own preferences" 
  ON user_preferences FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own preferences" 
  ON user_preferences FOR UPDATE USING ((select auth.uid()) = user_id);

-- 4. Automatically create a preferences row when a new user signs up
-- (This is a handy Postgres trigger so we never have to worry about missing rows)
CREATE OR REPLACE FUNCTION public.handle_new_user_prefs() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger it on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_prefs();

-- Reload Schema
NOTIFY pgrst, 'reload schema';