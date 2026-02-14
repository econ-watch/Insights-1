-- Create function for bulk inserting releases with conflict handling
CREATE OR REPLACE FUNCTION bulk_insert_releases(releases_data JSONB)
RETURNS TABLE (inserted INT, skipped INT) AS $$
DECLARE
    inserted_count INT := 0;
    skipped_count INT := 0;
BEGIN
    -- Insert with ON CONFLICT DO NOTHING
    WITH inserted_rows AS (
        INSERT INTO releases (indicator_id, release_at, period, forecast, previous, actual)
        SELECT 
            (r->>'indicator_id')::UUID,
            (r->>'release_at')::TIMESTAMPTZ,
            r->>'period',
            r->>'forecast',
            r->>'previous',
            r->>'actual'
        FROM jsonb_array_elements(releases_data) AS r
        ON CONFLICT (indicator_id, release_at) DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*)::INT INTO inserted_count FROM inserted_rows;
    
    skipped_count := jsonb_array_length(releases_data) - inserted_count;
    
    RETURN QUERY SELECT inserted_count, skipped_count;
END;
$$ LANGUAGE plpgsql;
