-- Add unique constraint to indicators table
-- This allows upsert on (name, country_code)

ALTER TABLE indicators 
ADD CONSTRAINT indicators_name_country_unique 
UNIQUE (name, country_code);
