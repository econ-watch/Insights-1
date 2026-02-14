-- Safe cron update - handles missing jobs gracefully

-- First, list all existing jobs to see what we have
SELECT jobid, jobname, schedule, active FROM cron.job;

-- Try to delete old jobs (will skip if they don't exist)
DO $$
BEGIN
    BEGIN
        PERFORM cron.unschedule('daily-release-scrape');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Job daily-release-scrape does not exist, skipping';
    END;
    
    BEGIN
        PERFORM cron.unschedule('import-release-data');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Job import-release-data does not exist, skipping';
    END;
END $$;

-- Schedule TradingEconomics scraper (daily at 2:00 AM UTC)
SELECT cron.schedule(
    'daily-tradingeconomics-scrape',
    '0 2 * * *',
    $$
    SELECT net.http_post(
        url := 'https://ncnggnhpcvdcyspjqguv.supabase.co/functions/v1/scrape-tradingeconomics',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jbmdnbmhwY3ZkY3lzcGpxZ3V2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTA1ODQ3MSwiZXhwIjoyMDg2NjM0NDcxfQ.-vGiG2Hrj0weOFHbWB3VPwoHHs87E2P5zn7InbuHd-g"}'::jsonb,
        body := '{}'::jsonb
    ) AS request_id;
    $$
);

-- Schedule data import (every 15 minutes)
SELECT cron.schedule(
    'import-release-data-15min',
    '*/15 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://ncnggnhpcvdcyspjqguv.supabase.co/functions/v1/import-release-data',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jbmdnbmhwY3ZkY3lzcGpxZ3V2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTA1ODQ3MSwiZXhwIjoyMDg2NjM0NDcxfQ.-vGiG2Hrj0weOFHbWB3VPwoHHs87E2P5zn7InbuHd-g"}'::jsonb,
        body := '{}'::jsonb
    ) AS request_id;
    $$
);

-- Verify the new jobs
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobid DESC LIMIT 5;
