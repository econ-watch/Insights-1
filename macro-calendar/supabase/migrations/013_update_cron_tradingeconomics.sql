-- Update cron jobs to use TradingEconomics scraper directly
-- Run this in Supabase SQL Editor

-- First, check existing cron jobs
SELECT jobid, schedule, command, nodename, nodeport, database, username, active 
FROM cron.job 
WHERE jobname LIKE '%release%' OR jobname LIKE '%scrape%' OR jobname LIKE '%import%';

-- Delete old cron jobs
SELECT cron.unschedule('daily-release-scrape');
SELECT cron.unschedule('import-release-data');

-- Schedule TradingEconomics scraper (daily at 2:00 AM UTC)
SELECT cron.schedule(
    'daily-tradingeconomics-scrape',
    '0 2 * * *', -- Every day at 2:00 AM UTC
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
    '*/15 * * * *', -- Every 15 minutes
    $$
    SELECT net.http_post(
        url := 'https://ncnggnhpcvdcyspjqguv.supabase.co/functions/v1/import-release-data',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jbmdnbmhwY3ZkY3lzcGpxZ3V2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTA1ODQ3MSwiZXhwIjoyMDg2NjM0NDcxfQ.-vGiG2Hrj0weOFHbWB3VPwoHHs87E2P5zn7InbuHd-g"}'::jsonb,
        body := '{}'::jsonb
    ) AS request_id;
    $$
);

-- Verify the new jobs
SELECT jobid, jobname, schedule, command, active, jobname
FROM cron.job 
ORDER BY jobid DESC 
LIMIT 5;
