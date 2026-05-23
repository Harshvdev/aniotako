-- 1. Ensure mal_id is unique in the metadata table so it can be referenced
ALTER TABLE anime_metadata
ADD CONSTRAINT unique_mal_id UNIQUE (mal_id);

-- 2. Create the strict relationship between the two tables
ALTER TABLE watchlist_entries
ADD CONSTRAINT fk_watchlist_metadata
FOREIGN KEY (mal_id) REFERENCES anime_metadata(mal_id);