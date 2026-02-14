# L4 Implementation Plan

## Starting: Data Acquisition (Section 0)

### Phase 1: Foundation (T400)
- [ ] Create data_sources table migration
- [ ] Create sync_logs table for tracking data source runs
- [ ] Add RLS policies for admin-only access
- [ ] Create TypeScript types for data sources

### Phase 2: ForexFactory Scraper (T401)
- [ ] Create Supabase Edge Function: scrape-forexfactory
- [ ] Parse HTML calendar structure
- [ ] Extract indicator name, country, date/time, importance
- [ ] Handle timezone conversion to UTC
- [ ] Add error handling and retries

### Phase 3: Investing.com Fallback (T402)
- [ ] Create Edge Function: scrape-investing
- [ ] Parse alternative HTML structure
- [ ] Match indicator names to existing indicators
- [ ] Implement fallback logic

### Phase 4: Schedule Sync Cron (T403)
- [ ] Create Edge Function: sync-release-schedules
- [ ] Set up daily cron trigger
- [ ] Update releases table with scheduled times
- [ ] Log sync results

### Phase 5: API Integrations (T404-T406)
- [ ] FRED API integration (Federal Reserve Economic Data)
- [ ] BLS API integration (Bureau of Labor Statistics)
- [ ] ECB API integration (European Central Bank)

### Phase 6: Data Import Automation (T407)
- [ ] Create Edge Function: import-release-data
- [ ] Trigger at release times
- [ ] Fetch actual values from APIs
- [ ] Update releases and trigger alerts

### Phase 7: Admin UI (T408)
- [ ] Data sources management page
- [ ] Manual sync buttons
- [ ] Sync logs viewer

## Success Metrics
- Scrapers running daily without manual intervention
- Release schedules populated 7+ days in advance
- Actual values imported within 5 minutes of release
- Zero missed releases for major indicators
