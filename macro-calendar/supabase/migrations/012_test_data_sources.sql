-- Test seed for data_sources table
-- Description: Sample data sources for L4 testing
-- Date: 2026-02-14

-- Insert test data sources (only if they don't exist)
INSERT INTO data_sources (name, type, base_url, auth_config, enabled)
VALUES 
    (
        'forexfactory',
        'scraper',
        'https://www.forexfactory.com',
        '{"calendar_path": "/calendar", "user_agent": "Mozilla/5.0"}'::JSONB,
        true
    ),
    (
        'investing_com',
        'scraper',
        'https://www.investing.com',
        '{"calendar_path": "/economic-calendar", "user_agent": "Mozilla/5.0"}'::JSONB,
        true
    ),
    (
        'fred',
        'api',
        'https://api.stlouisfed.org/fred',
        '{"api_key": "PLACEHOLDER", "rate_limit_per_minute": 120}'::JSONB,
        false
    ),
    (
        'bls',
        'api',
        'https://api.bls.gov/publicAPI/v2',
        '{"api_key": "PLACEHOLDER", "rate_limit_per_minute": 25}'::JSONB,
        false
    ),
    (
        'ecb',
        'api',
        'https://data-api.ecb.europa.eu/service',
        '{"rate_limit_per_minute": 60}'::JSONB,
        false
    )
ON CONFLICT (name) DO NOTHING;

-- Insert sample sync log entries
DO $$
DECLARE
    v_forexfactory_id UUID;
BEGIN
    -- Get the forexfactory data source id
    SELECT id INTO v_forexfactory_id FROM data_sources WHERE name = 'forexfactory' LIMIT 1;
    
    IF v_forexfactory_id IS NOT NULL THEN
        INSERT INTO sync_logs (
            data_source_id,
            status,
            records_processed,
            errors_count,
            metadata,
            started_at,
            completed_at
        )
        VALUES (
            v_forexfactory_id,
            'success',
            42,
            0,
            '{"duration_ms": 3421, "releases_found": 42, "releases_inserted": 15, "releases_updated": 27}'::JSONB,
            NOW() - INTERVAL '1 day',
            NOW() - INTERVAL '1 day' + INTERVAL '4 seconds'
        );
    END IF;
END $$;
