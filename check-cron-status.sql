-- Check all active cron jobs
SELECT 
    jobid,
    jobname, 
    schedule, 
    active,
    database,
    username
FROM cron.job 
ORDER BY jobid DESC;
