-- Add unique constraint to releases table
-- This allows upsert to skip duplicates

ALTER TABLE releases 
ADD CONSTRAINT releases_indicator_release_unique 
UNIQUE (indicator_id, release_at);
