-- Add a check constraint to the profiles table
ALTER TABLE profiles 
ADD CONSTRAINT display_name_max_length 
CHECK (char_length(display_name) <= 30);

-- Also add it to the watchlist_entries for redundancy if needed, 
-- but profiles is the primary storage for display names.