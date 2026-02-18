# Insights-1: Launch-to-800 Roadmap

*Written: 2026-02-18 | Author: Boss*

---

## 1. What's Built vs What's Missing

### ✅ Actually Built (L1-L3 shipped)
- **Web calendar UI** — browse releases, search, filter by country/category/impact
- **Auth** — Supabase auth with email/magic link
- **Watchlist** — save indicators, filter calendar to watchlist
- **Email alerts** — per-indicator, one-click unsubscribe
- **Admin** — CSV upload, role management, audit logs
- **Revision tracking** — badges + history for revised values
- **API keys** — generate, revoke, view usage
- **Webhooks** — register endpoints, delivery history, retry
- **REST API v1** — `/calendar`, `/indicators`, `/releases` with API key auth
- **Billing** — Stripe integration, plans table, subscriptions, usage alerts
- **Organizations** — create orgs, invite members, shared watchlists, org billing
- **Data export** — CSV/JSON export, iCal feed
- **Rate limiting** — Upstash Redis
- **OpenAPI docs** at `/docs/api`
- **CI** — GitHub Actions, Vitest tests
- **DB migrations** — 23 migrations, comprehensive schema
- **Edge Functions** — ForexFactory scraper, TradingEconomics scraper, sync-release-schedules, import-release-data, send-release-alert, send-webhook, send-usage-alert

### ⚠️ Built but Unverified/Incomplete
- **Scrapers exist as code** but no evidence they're running in production reliably
- **Stripe webhook handler** exists but no evidence of live Stripe products/prices configured
- **Plans/subscriptions tables** exist but may not have real Stripe price IDs wired up
- **Test coverage** is partial — many `.test.ts` files exist but RISKS.md still flags "No Automated Test Coverage" as high priority
- **RLS** flagged as "not verified end-to-end" in RISKS.md

### ❌ Missing (Critical for Charging Money)
- **No landing page / marketing site** — there's no way to explain what this is to a stranger
- **No onboarding flow** — new user signs up and sees... what? Raw calendar? No guided setup
- **No free tier definition** — what can you do without paying? Unclear
- **No live Stripe checkout** — billing code exists but likely not wired to real products
- **No custom domain** — presumably on a Vercel preview URL
- **No error monitoring** — no Sentry, no alerting on failures
- **No analytics** — no Mixpanel/PostHog/Plausible, no idea who's using what
- **No email infrastructure for marketing** — transactional alerts exist, no drip campaigns
- **No SEO** — no meta tags strategy, no blog, no content
- **No social proof** — no testimonials, no "used by" section
- **Mobile app** — L4 spec exists, zero code
- **Calendar integrations** — L4 spec exists, zero code
- **Historical data API** — L4 spec exists, zero code
- **Analytics dashboard** — L4 spec exists, zero code

---

## 2. MVP Definition — What We Need to Charge Money

The MVP is **not** L4. The MVP is making L1-L3 bulletproof and sellable. Stop building features. Start selling what exists.

### MVP Checklist (must-have before first dollar)
1. **Landing page** — explains value prop, shows pricing, has signup CTA
2. **Free tier** — unauthenticated browse + 3 watchlist items + no API access
3. **Paid tier working** — Stripe Checkout → subscription active → higher limits enforced
4. **Onboarding** — new user signs up → guided to add watchlist items → shown value in 60 seconds
5. **Data flowing** — scrapers running daily, releases populated automatically (not manual CSV)
6. **Custom domain** — `macrocal.io` or similar, SSL, professional
7. **Error monitoring** — Sentry or equivalent, alerts on scraper failures
8. **Product analytics** — know who signs up, what they click, where they drop off
9. **Email verification** — confirm email works, alert delivery is reliable
10. **Terms of service + privacy policy** — legal minimum

### What NOT to build for MVP
- Mobile app (later)
- Calendar integrations (later)
- Historical data API (later)
- Advanced analytics (later)
- Correlation analysis (later)

---

## 3. Launch Strategy

### Phase 1: First 10 Users (Week 1-4)
**Strategy: Manual outreach, personal network**

- Deploy MVP with landing page
- Post in: r/algotrading, r/forex, r/economics, FinTwit
- DM 50 people on Twitter/X who tweet about macro data
- Offer **free Pro access for 3 months** to first 10 users who give feedback
- Goal: 10 active users giving feedback weekly

### Phase 2: First 50 Users (Month 2-3)
**Strategy: Content + community**

- Write 3 blog posts: "How to track NFP releases", "Building a macro calendar for traders", "API-first economic data"
- Post weekly in trading Discord servers and Telegram groups
- Submit to Product Hunt, Hacker News (Show HN)
- Create a Twitter/X account posting daily macro event previews
- Integrate feedback from first 10 users
- Goal: 50 signups, 15 paid

### Phase 3: First 100 Users (Month 3-5)
**Strategy: SEO + API developer community**

- SEO-optimize indicator pages (each indicator = a landing page)
- List on API directories (RapidAPI, API List, ProgrammableWeb)
- Write developer tutorials for the REST API
- Start a changelog / "what's new" page
- Referral program: give 1 month free for each referral
- Goal: 100 signups, 40 paid

---

## 4. Growth to 800 Paid Subscriptions

### Infrastructure Needs at Scale
- **Database**: Supabase free tier won't cut it. Need Pro plan ($25/mo) by 100 users, Team plan by 500
- **Vercel**: Free tier is fine to ~200 users, then Pro ($20/mo)
- **Upstash**: Scale rate limiting as API usage grows
- **Email**: Resend or SendGrid paid plan by 100 users (alert volume)
- **Monitoring**: Sentry paid plan, uptime monitoring (BetterUptime)

### Features Needed for 800 Users
| User Count | Feature Needed | Why |
|---|---|---|
| 50+ | Historical data API | Developers want backtesting data |
| 100+ | Google Calendar sync | Users asked, competitors have it |
| 200+ | Mobile app (PWA first) | Usage shifts to mobile |
| 300+ | Team/org billing | Enterprise sales require it |
| 500+ | Analytics dashboard | Differentiator, reduces churn |
| 500+ | SLA and uptime guarantee | Enterprise requirement |
| 800 | Custom integrations / API v2 | Power users need more |

### Marketing at Scale (200-800)
- **SEO**: Target 50+ "economic indicator + date" keywords
- **Partnerships**: Integrate with TradingView, broker platforms
- **Content**: Weekly macro preview newsletter (drives retention)
- **Paid ads**: Google Ads on "economic calendar API" ($2-5 CPC, high intent)
- **Enterprise sales**: Direct outreach to hedge funds, prop trading firms

### Support at Scale
- Self-serve docs and FAQ (already have API docs, expand)
- Email support (founder handles until 300 users)
- Consider Intercom/Crisp at 300+ users
- Status page at 200+ users

---

## 5. Monetization

### Pricing Model
**Three tiers + free:**

| Tier | Price (Monthly) | Price (Yearly) | What You Get |
|---|---|---|---|
| **Free** | $0 | $0 | Browse calendar, 3 watchlist items, no API |
| **Plus** | $12/mo | $99/yr | Unlimited watchlist, email alerts, CSV export, 1K API calls/mo |
| **Pro** | $29/mo | $249/yr | Everything in Plus + webhooks, iCal, 10K API calls/mo, historical data |
| **Enterprise** | $79/mo | $699/yr | Everything in Pro + org/team features, 100K API calls/mo, priority support |

### Why These Prices
- **$12/mo** is impulse-buy territory for a trader. Coffee money.
- **$29/mo** is the sweet spot for serious traders who want API access
- **$79/mo** targets small funds/teams — still cheaper than Bloomberg
- **Yearly discount** (~30%) incentivizes commitment and reduces churn

### Revenue Math to 800 Paid Users
Assuming mix: 40% Plus, 40% Pro, 20% Enterprise
- 320 × $12 = $3,840/mo
- 320 × $29 = $9,280/mo
- 160 × $79 = $12,640/mo
- **Total: ~$25,760/mo ($309K ARR)**

### Billing Integration (already partially built)
- Stripe Checkout for signup
- Stripe Customer Portal for self-serve plan changes
- Webhook handler for subscription lifecycle events
- Usage metering for API calls
- **Action needed**: Create actual Stripe products/prices matching the tier table above

---

## 6. Key Milestones

### M1: MVP Launch (Target: March 15, 2026)
**Acceptance Criteria:**
- [ ] Landing page live with pricing
- [ ] Free tier enforced (3 watchlist items, no API without plan)
- [ ] Stripe Checkout working for Plus and Pro plans
- [ ] Scrapers running daily, populating next 7 days of releases
- [ ] Custom domain configured
- [ ] Sentry error monitoring active
- [ ] PostHog or Plausible analytics installed
- [ ] ToS and Privacy Policy pages exist

### M2: First 10 Paying Users (Target: April 15, 2026)
**Acceptance Criteria:**
- [ ] 10 users with active Stripe subscriptions
- [ ] NPS or feedback collected from all 10
- [ ] Zero critical bugs reported
- [ ] Scrapers have not missed a release in 2 weeks
- [ ] Email alert delivery rate > 95%

### M3: Product-Market Fit Signal (Target: June 2026)
**Acceptance Criteria:**
- [ ] 50 total signups, 20 paid
- [ ] Monthly churn < 10%
- [ ] At least 3 users using the API
- [ ] At least 1 organic signup (not from direct outreach)
- [ ] Blog has 3+ posts with > 100 views each

### M4: Growth Engine (Target: September 2026)
**Acceptance Criteria:**
- [ ] 200 signups, 80 paid
- [ ] Historical data API shipped
- [ ] Google Calendar sync shipped
- [ ] SEO driving > 30% of signups
- [ ] MRR > $2,000

### M5: Scale (Target: February 2027)
**Acceptance Criteria:**
- [ ] 800 paid subscriptions
- [ ] MRR > $20,000
- [ ] Mobile app (at minimum PWA) shipped
- [ ] Enterprise tier with 5+ org customers
- [ ] Uptime > 99.5% over trailing 90 days

---

## 7. Risks and Blockers

### 🔴 Critical (kills us if ignored)

1. **Scrapers are unreliable** — ForexFactory and TradingEconomics actively block scrapers. One HTML change breaks everything. If data stops flowing, the product is worthless.
   - *Mitigation*: Multiple source fallbacks, health checks, immediate alerts on failure, consider paying for data feeds (Econoday, FXStreet API) as backup

2. **No users yet** — All this code and zero paying customers. The biggest risk is building more features instead of selling.
   - *Mitigation*: Stop feature development. Launch MVP. Talk to humans.

3. **Solo dependency** — One person building everything. Bus factor = 1.
   - *Mitigation*: Document everything (already decent), consider hiring a part-time marketer before a second developer

### 🟡 Serious (degrades us if ignored)

4. **Data accuracy** — If actual values are wrong or late, trust is destroyed instantly. Financial data has zero tolerance for errors.
   - *Mitigation*: Cross-validate across multiple sources, show data source attribution, have manual override capability

5. **Stripe integration untested with real money** — The billing code exists but has it processed a real charge? Test with real cards in live mode before launch.
   - *Mitigation*: Do a $1 test charge yourself before launch day

6. **Legal risk on scraped data** — Scraping ForexFactory/TradingEconomics may violate ToS. Getting a C&D would kill the data pipeline.
   - *Mitigation*: Use government source APIs (FRED, BLS, ECB) as primary, scrapers as supplementary. Budget for a paid data feed ($200-500/mo) as insurance.

7. **Test coverage gaps** — RISKS.md from January 2026 still lists "No Automated Test Coverage" as high priority. Regressions will happen.
   - *Mitigation*: Add integration tests for auth + billing flows before launch

### 🟢 Manageable

8. **Competition** — ForexFactory, Investing.com, TradingEconomics, and Bloomberg exist. We're not replacing them.
   - *Positioning*: API-first, developer-friendly, clean UX. Target the gap between "free calendar" and "Bloomberg terminal."

9. **Scope creep** — L4 spec has mobile app, calendar sync, analytics, correlation analysis. That's 6 months of work that doesn't help get the first dollar.
   - *Mitigation*: This roadmap. Follow it.

---

## 8. Priority-Ordered Task List

### Sprint 1: Launch Prep (2 weeks)
1. **Create landing page** — Hero section, feature list, pricing table, signup CTA. Can be a single Next.js page.
2. **Wire Stripe products** — Create real products/prices in Stripe matching tier table. Test checkout flow end-to-end.
3. **Enforce free tier limits** — 3 watchlist items for free users, API requires paid plan
4. **Verify scrapers are running** — Check sync_logs, ensure data is flowing. Fix any broken scrapers.
5. **Add Sentry** — `npm install @sentry/nextjs`, configure, test error capture
6. **Add analytics** — Plausible or PostHog, track signups/page views/feature usage
7. **Custom domain** — Buy domain, configure DNS, Vercel custom domain

### Sprint 2: Polish & Ship (2 weeks)
8. **Onboarding flow** — After signup: "Add your first indicators" → watchlist → show value
9. **ToS + Privacy Policy** — Use a generator, customize, add pages
10. **Test billing end-to-end** — Real Stripe charge, webhook received, subscription active, limits updated
11. **Scraper health monitoring** — Alert (email/Slack) if scraper fails or returns zero results
12. **Fix RLS gaps** — Verify end-to-end per RISKS.md item #2
13. **Landing page SEO** — Meta tags, OG images, structured data
14. **Email reliability** — Verify Resend/SendGrid delivery, check spam scores

### Sprint 3: Launch & Outreach (2 weeks)
15. **Soft launch** — Share with 20 people in personal network
16. **Write launch post** — For r/algotrading, HN, Product Hunt
17. **Twitter/X account** — Start posting daily macro previews
18. **Collect feedback** — Simple form or Intercom widget
19. **Fix bugs from first users** — Expect to spend 50% of sprint on bug fixes
20. **First blog post** — "We built an open economic calendar for developers"

### Sprint 4: Iterate (2 weeks)
21. **Address top 3 user complaints** — Whatever they are
22. **Integration tests** — Auth flow, billing flow, webhook delivery
23. **Performance audit** — Page load times, API response times
24. **Historical data API** — If API users are asking for it
25. **Improve indicator pages** — SEO-optimize, make each one a potential landing page

### Sprint 5+: Growth Features (ongoing)
26. Google Calendar sync
27. PWA / mobile experience
28. Weekly newsletter automation
29. API v1 improvements based on developer feedback
30. Enterprise features as demand emerges

---

## TL;DR

**The product is 80% built and 0% sold.** The code is solid. The schema is comprehensive. The features are real. But none of it matters without users.

**Stop building. Start selling.**

The path to 800 paid users:
1. Make what exists reliable and purchasable (4 weeks)
2. Get 10 users through manual outreach (4 weeks)
3. Get to 50 through content and community (8 weeks)
4. Get to 200 through SEO and API developer marketing (16 weeks)
5. Get to 800 through enterprise sales and partnerships (6 months)

Total timeline: ~12-14 months from today to 800 paid users, assuming disciplined execution.

---

*This document is the operating plan. Mr Fog builds Sprint 1-2. Cortex handles Sprint 3-4 outreach. Both execute against milestones, not vibes.*
