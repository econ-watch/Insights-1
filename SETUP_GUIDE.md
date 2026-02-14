# L4 Setup Guide (Free Tier Only)

## Step 1: Supabase Setup (5 min)

### A. Create Project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Name: `insights-calendar` (or whatever)
4. Region: Choose closest to you
5. Database password: Save this somewhere safe
6. Wait ~2 min for project to spin up

### B. Get API Keys
1. Go to Project Settings → API
2. Copy these 3 values:
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)
   - **Service role key** (starts with `eyJ...`, keep this secret)

### C. Install Supabase CLI (if not installed)
```bash
# Linux/WSL
brew install supabase/tap/supabase

# Or with npm
npm install -g supabase
```

### D. Link Project & Run Migrations
```bash
cd /home/corn/.openclaw/workspace/Insights/macro-calendar

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run all migrations (creates tables, functions, RLS policies)
supabase db push
```

### E. Add API Keys to Database
```bash
# Get FRED API key: https://fred.stlouisfed.org/docs/api/api_key.html (instant, free)
# Get BLS API key: https://www.bls.gov/developers/home.htm (free, 500/day limit)

# Update data_sources with real keys
supabase sql <<EOF
UPDATE data_sources 
SET auth_config = '{"api_key": "YOUR_FRED_KEY_HERE", "rate_limit_per_minute": 120}'::JSONB,
    enabled = true
WHERE name = 'fred';

UPDATE data_sources 
SET auth_config = '{"api_key": "YOUR_BLS_KEY_HERE", "rate_limit_per_minute": 25}'::JSONB,
    enabled = true
WHERE name = 'bls';

UPDATE data_sources 
SET enabled = true
WHERE name = 'ecb';
EOF
```

---

## Step 2: Vercel Setup (3 min)

### A. Connect GitHub Repo
1. Go to https://vercel.com
2. Import Project → Select `econ-watch/Insights-1`
3. Framework: Next.js (auto-detected)
4. Root Directory: `macro-calendar`

### B. Set Environment Variables
Add these in Vercel dashboard (Settings → Environment Variables):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_UPLOAD_SECRET=generate_random_32_char_string
UNSUBSCRIBE_TOKEN_SECRET=generate_random_32_char_string
```

### C. Deploy
Click "Deploy" — should take ~2 min.

---

## Step 3: Cron Setup (FREE - Supabase pg_cron)

**Good news:** Supabase free tier includes `pg_cron` extension built-in. No pro plan needed!

### Enable pg_cron
```bash
# Enable extension (only needed once)
supabase sql <<EOF
CREATE EXTENSION IF NOT EXISTS pg_cron;
EOF
```

### Schedule Jobs (After Edge Functions Are Deployed)
We'll set these up after I build the Edge Functions. They'll look like:

```sql
-- Daily at 2 AM UTC: Scrape release schedules
SELECT cron.schedule(
    'sync-schedules',
    '0 2 * * *',
    $$SELECT net.http_post(
        url:='https://YOUR_PROJECT.supabase.co/functions/v1/sync-release-schedules',
        headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    )$$
);

-- Every 15 min: Import actual values
SELECT cron.schedule(
    'import-data',
    '*/15 * * * *',
    $$SELECT net.http_post(
        url:='https://YOUR_PROJECT.supabase.co/functions/v1/import-release-data',
        headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    )$$
);
```

**Cost:** $0 (included in Supabase free tier) ✅

---

## Step 4: Get API Keys (5 min)

### FRED (Federal Reserve Economic Data)
1. Go to https://fred.stlouisfed.org/
2. Create account (free)
3. Request API key: https://fred.stlouisfed.org/docs/api/api_key.html
4. Instant approval — copy key

### BLS (Bureau of Labor Statistics)
1. Go to https://www.bls.gov/developers/home.htm
2. Click "Register"
3. Fill out form (takes 2 min)
4. Check email for API key (usually instant)
5. Limit: 500 requests/day (plenty for us)

### ECB (European Central Bank)
- No API key needed — public API ✅

---

## What Happens Next

Once you complete Steps 1-4:

1. **Paste your Supabase project URL here**
2. I'll build the 4 Edge Functions:
   - `scrape-forexfactory` (T401)
   - `scrape-investing` (T402)
   - `sync-release-schedules` (T403)
   - `import-release-data` (T407)
3. I'll deploy them to your Supabase project
4. I'll set up the cron jobs
5. **Done** — fully automated, zero cost 🚀

---

## Free Tier Limits (You're Safe)

### Supabase Free Tier
- ✅ 500 MB database (plenty for release data)
- ✅ 2 GB bandwidth/month
- ✅ 500K Edge Function invocations/month
- ✅ pg_cron included (unlimited jobs)
- **Our usage:** ~5K invocations/month (1% of limit)

### Vercel Free Tier
- ✅ 100 GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Custom domains (optional)

### API Rate Limits (Free Tier)
- ✅ FRED: 120 requests/min (way more than we need)
- ✅ BLS: 500 requests/day (we'll use ~20-50/day)
- ✅ ECB: Public, no hard limits

**Total cost: $0/month** ⚡

---

## Ready?

Let me know when you've:
1. Created Supabase project + got API keys
2. Connected Vercel
3. Obtained FRED + BLS API keys

Then paste your Supabase project URL and I'll handle the rest 🔥
