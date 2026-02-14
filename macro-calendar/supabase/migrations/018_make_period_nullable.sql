-- Make period column nullable in releases table
ALTER TABLE releases 
ALTER COLUMN period DROP NOT NULL;
