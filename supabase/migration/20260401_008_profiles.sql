-- 1. Create the table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Secure the table
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE USING ((select auth.uid()) = id);

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';