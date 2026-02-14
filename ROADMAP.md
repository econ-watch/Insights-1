# EconWatch — Project Roadmap

## Vision
A polished, production-grade economic calendar that traders actually want to use daily. Not an MVP — the real thing.

## Status
- **L4 (Data Acquisition):** ✅ Complete
- **L5 (Product Polish):** 🔄 In Progress — one thing at a time, no rushing

---

## L5 Roadmap — "Actually Done"

### Phase 1: Trustworthy Data
- [ ] Verify scraper accuracy — are release dates/times correct?
- [ ] Add impact ratings (High/Medium/Low) per release
- [ ] Correct release times (exact scheduled times, not approximations)
- [ ] Validate indicator names match industry standard naming
- [ ] Ensure all major USD/EUR/GBP/JPY releases are covered

### Phase 2: Pro UI/UX
- [ ] Timezone selector (show times in user's local tz)
- [ ] Auto-refresh (live updates without manual reload)
- [ ] Mobile-first polish (test + fix on phone)
- [ ] Dark/light mode toggle
- [ ] Week view / day view toggle
- [ ] Loading states that feel snappy

### Phase 3: Trader Features
- [ ] Surprise indicator (actual vs forecast delta, color-coded)
- [ ] Historical data — past releases + trends
- [ ] Alerts / notifications ("CPI in 30 min")
- [ ] Watchlist with auth flow
- [ ] iCal/Google Calendar export (endpoint exists, needs testing)

### Phase 4: Real-Time
- [ ] Live actual values when releases drop
- [ ] Auto-refresh on release time
- [ ] WebSocket or polling for real-time updates

### Phase 5: Beyond
- [ ] Custom dashboards
- [ ] API for external consumers (endpoints exist, need polish)
- [ ] Charting — historical surprise charts per indicator
- [ ] Community features? (comments, predictions)
- [ ] SEO + marketing page

---

## Principles
- One thing at a time
- Each piece polished before moving on
- Data accuracy > features
- If the data's wrong, nothing else matters
