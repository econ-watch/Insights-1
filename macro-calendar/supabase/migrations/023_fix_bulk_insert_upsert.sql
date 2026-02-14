-- Fix: Update bulk_insert_releases to UPDATE on conflict instead of DO NOTHING
-- This ensures forecast, previous, and actual values get updated on re-scrape

CREATE OR REPLACE FUNCTION bulk_insert_releases(releases_data JSONB)
RETURNS TABLE (inserted INT, skipped INT) AS $$
DECLARE
    inserted_count INT := 0;
    updated_count INT := 0;
    total_count INT := 0;
BEGIN
    total_count := jsonb_array_length(releases_data);
    
    -- Insert new releases OR update existing ones with fresh data
    WITH upserted_rows AS (
        INSERT INTO releases (indicator_id, release_at, period, forecast, previous, actual)
        SELECT 
            (r->>'indicator_id')::UUID,
            (r->>'release_at')::TIMESTAMPTZ,
            r->>'period',
            r->>'forecast',
            r->>'previous',
            r->>'actual'
        FROM jsonb_array_elements(releases_data) AS r
        ON CONFLICT (indicator_id, release_at) DO UPDATE SET
            forecast = COALESCE(EXCLUDED.forecast, releases.forecast),
            previous = COALESCE(EXCLUDED.previous, releases.previous),
            actual = COALESCE(EXCLUDED.actual, releases.actual),
            period = COALESCE(EXCLUDED.period, releases.period)
        RETURNING (xmax = 0)::INT AS was_inserted
    )
    SELECT 
        COALESCE(SUM(was_inserted), 0)::INT INTO inserted_count
    FROM upserted_rows;
    
    updated_count := total_count - inserted_count;
    
    -- Return inserted as new rows, skipped as updated rows
    RETURN QUERY SELECT inserted_count, updated_count;
END;
$$ LANGUAGE plpgsql;
