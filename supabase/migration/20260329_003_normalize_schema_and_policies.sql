-- ==========================================
-- 1. Create Tables
-- ==========================================

-- Table: anime_metadata
-- (Created first since it doesn't depend on other custom tables)
CREATE TABLE public.anime_metadata (
    mal_id integer PRIMARY KEY,
    title text NOT NULL,
    genres text[] DEFAULT '{}',
    type text NOT NULL,
    studio text,
    year integer,
    synopsis text,
    poster_url text,
    total_episodes integer,
    cached_at timestamptz DEFAULT now() NOT NULL
);

-- Table: watchlist_entries
CREATE TABLE public.watchlist_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    mal_id integer NOT NULL,
    title text NOT NULL,
    status text NOT NULL CHECK (status IN ('watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch')),
    score integer CHECK (score >= 0 AND score <= 10),
    watched_episodes integer DEFAULT 0 NOT NULL,
    total_episodes integer,
    poster_url text,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, mal_id)
);

-- Table: push_subscriptions
CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint text UNIQUE NOT NULL,
    p256dh text NOT NULL,
    auth_key text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ==========================================
-- 2. Enable Row Level Security (RLS)
-- ==========================================

ALTER TABLE public.anime_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. RLS Policies
-- ==========================================

-- ------------------------------------------
-- Policies for: anime_metadata
-- ------------------------------------------
-- Note: By default, Supabase's "Service Role" bypasses RLS entirely. 
-- Since we are not writing INSERT/UPDATE/DELETE policies for authenticated users, 
-- ONLY the Service Role (using the service_role key) will be able to write to this table.

CREATE POLICY "Authenticated users can view anime metadata" 
    ON public.anime_metadata FOR SELECT 
    TO authenticated 
    USING (true);

-- ------------------------------------------
-- Policies for: watchlist_entries
-- ------------------------------------------

CREATE POLICY "Users can view their own watchlist entries" 
    ON public.watchlist_entries FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watchlist entries" 
    ON public.watchlist_entries FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist entries" 
    ON public.watchlist_entries FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlist entries" 
    ON public.watchlist_entries FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);

-- ------------------------------------------
-- Policies for: push_subscriptions
-- ------------------------------------------

CREATE POLICY "Users can view their own push subscriptions" 
    ON public.push_subscriptions FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions" 
    ON public.push_subscriptions FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions" 
    ON public.push_subscriptions FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions" 
    ON public.push_subscriptions FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);