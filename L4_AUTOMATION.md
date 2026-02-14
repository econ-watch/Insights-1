# L4 Automation Architecture

## Goal: Fully Hands-Free Data Pipeline

### Overview
Automatically scrape release schedules daily, fetch actual values at release times, and trigger alerts — zero manual intervention.

---

## Infrastructure Setup Needed

### 1. Supabase
- **Project:** Create new Supabase project (or reuse existing)
- **Database:** Run all migrations (001-012)
- **Edge Functions:** Deploy scrapers and sync jobs
- **Cron:** Enable pg_cron extension for scheduled tasks
- **Webhooks:** Already configured in migration 005

### 2. Vercel
- **Deploy:** Fork repo → Connect to Vercel
- **Env vars:** Supabase keys, admin secrets
- **Domain:** Optional custom domain

### 3. External APIs (for T404-T406)
- **FRED API Key:** https://fred.stlouisfed.org/docs/api/api_key.html (free)
- **BLS API Key:** https://www.bls.gov/developers/home.htm (free, 500/day)
- **ECB:** No key needed (public API)

---

## Automation Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Daily 2:00 AM UTC: Sync Release Schedules                 │
├─────────────────────────────────────────────────────────────┤
│ 1. Edge Function: scrape-forexfactory                      │
│    - Parse HTML calendar for next 7-30 days                │
│    - Extract: indicator, country, date/time, importance    │
│    - Insert/update releases.release_at                     │
│                                                             │
│ 2. Fallback: scrape-investing (if ForexFactory fails)     │
│    - Same process, different HTML structure                │
│                                                             │
│ 3. Log results to sync_logs table                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ At Release Time: Import Actual Values                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Edge Function: import-release-data (every 15 min)      │
│    - Query releases WHERE release_at <= NOW()              │
│      AND actual IS NULL                                    │
│    - Fetch from FRED/BLS/ECB based on indicator mapping   │
│    - Update releases.actual                                │
│                                                             │
│ 2. Database Trigger: On releases.actual UPDATE            │
│    - Webhook fires (migration 005)                         │
│    - Edge Function: send-release-alert                     │
│    - Email users with alert_preferences enabled           │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Supabase Setup (10 min)
```bash
# 1. Create Supabase project at https://app.supabase.com
# 2. Get project URL and keys
# 3. Run migrations
cd macro-calendar
supabase link --project-ref YOUR_PROJECT_ID
supabase db push

# 4. Add API keys to data_sources table
supabase sql <<EOF
UPDATE data_sources SET auth_config = '{"api_key": "YOUR_FRED_KEY"}'::JSONB WHERE name = 'fred';
UPDATE data_sources SET auth_config = '{"api_key": "YOUR_BLS_KEY"}'::JSONB WHERE name = 'bls';
UPDATE data_sources SET enabled = true WHERE name IN ('fred', 'bls', 'ecb');
EOF
```

### Phase 2: Vercel Setup (5 min)
```bash
# 1. Connect GitHub repo to Vercel
# 2. Set environment variables:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_UPLOAD_SECRET=random_secret_here
UNSUBSCRIBE_TOKEN_SECRET=random_secret_here

# 3. Deploy
vercel --prod
```

### Phase 3: Edge Functions (T401-T403)

#### File Structure
```
supabase/functions/
├── scrape-forexfactory/
│   ├── index.ts          # Main scraper logic
│   └── parser.ts         # HTML parsing utilities
├── scrape-investing/
│   ├── index.ts          # Fallback scraper
│   └── parser.ts
├── sync-release-schedules/
│   └── index.ts          # Orchestrates daily sync
└── import-release-data/
    ├── index.ts          # Fetches actual values
    ├── fred.ts           # FRED API client
    ├── bls.ts            # BLS API client
    └── ecb.ts            # ECB API client
```

#### Deployment
```bash
# Deploy all Edge Functions
supabase functions deploy scrape-forexfactory
supabase functions deploy scrape-investing
supabase functions deploy sync-release-schedules
supabase functions deploy import-release-data

# Set up cron triggers (Supabase Dashboard > Database > Cron Jobs)
# Or use pg_cron SQL:
SELECT cron.schedule(
    'sync-release-schedules',
    '0 2 * * *',  -- Daily at 2:00 AM UTC
    $$SELECT net.http_post(
        url:='https://YOUR_PROJECT.supabase.co/functions/v1/sync-release-schedules',
        headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    )$$
);

SELECT cron.schedule(
    'import-release-data',
    '*/15 * * * *',  -- Every 15 minutes
    $$SELECT net.http_post(
        url:='https://YOUR_PROJECT.supabase.co/functions/v1/import-release-data',
        headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    )$$
);
```

---

## Monitoring & Maintenance

### Health Checks
- **Admin Dashboard:** `/admin/data-sources` page (T408)
  - View last sync times
  - Manual sync buttons (testing/recovery)
  - Sync logs with errors

### Alerts
- **Failed Syncs:** If `sync_logs.status = 'failed'` → send admin alert
- **Stale Data:** If `data_sources.last_sync_at > 48 hours ago` → alert
- **Missing Releases:** If `COUNT(releases WHERE release_at < NOW() AND actual IS NULL) > threshold` → alert

### Fallback Strategy
1. ForexFactory primary (most reliable)
2. Investing.com fallback (if ForexFactory down)
3. Manual CSV upload (admin page) for emergency data

---

## Cost Estimates (Free Tier Viable)

- **Supabase Free:** 500MB DB, 2GB bandwidth, 500K Edge Function invocations/month
  - Daily scrape: ~30 invocations/day = 900/month ✅
  - Import data: ~96 invocations/day (every 15 min) = 2,880/month ✅
  - Total: <5K/month (well under limit)

- **Vercel Free:** 100GB bandwidth, unlimited deployments ✅

- **FRED/BLS APIs:** Free tier sufficient
  - FRED: 120 requests/min
  - BLS: 500 requests/day
  - Typical usage: <50 requests/day ✅

---

## Next Steps

1. **You:** Set up Supabase project + get API keys
2. **Me:** Build Edge Functions (T401-T403)
3. **You:** Deploy to Vercel
4. **Me:** Build admin UI (T408)
5. **You:** Monitor first sync, verify automation works
6. **Done:** Hands-free data pipeline 🚀

---

## Questions to Answer

1. Do you have the old Supabase project credentials, or starting fresh?
2. Do you want me to start building the scrapers now, or wait for infra setup?
3. Preference for cron: Supabase pg_cron or external service (GitHub Actions, cron-job.org)?
