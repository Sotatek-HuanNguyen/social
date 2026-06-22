# Codebase Summary

## Directory Structure

```
social/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page (SSR article feed)
│   ├── alerts/page.tsx           # Alert management page (client)
│   └── api/
│       ├── ingest/route.ts       # Cron endpoint: fetch + save articles (7 fetchers)
│       ├── articles/route.ts     # GET articles (filter, pagination, excludeGeneral)
│       ├── articles/[id]/route.ts # GET single article
│       ├── alerts/route.ts       # GET/POST alert rules
│       ├── alerts/[id]/route.ts  # DELETE alert rule
│       ├── alerts/sse/route.ts   # SSE breaking news stream
│       └── push/subscribe/route.ts # POST/DELETE push subscription
├── components/
│   ├── article-card.tsx          # Article display card
│   ├── article-feed.tsx          # Feed + client-side load-more
│   ├── breaking-news-banner.tsx  # SSE/polling breaking news banner
│   ├── filter-bar.tsx            # Category/source/search filters
│   ├── alert-rule-form.tsx       # Create alert rule form
│   ├── alert-rule-list.tsx       # List/delete alert rules
│   ├── notification-permission-button.tsx # Bell toggle: subscribe/unsubscribe push
│   ├── layout/
│   │   ├── layout-shell.tsx      # 3-column layout wrapper (xl/lg/mobile responsive)
│   │   ├── header-bar.tsx        # Sticky header with logo + notification bell
│   │   ├── sidebar-left.tsx      # Fixed left sidebar (categories, sources, alerts)
│   │   ├── sidebar-right.tsx     # Fixed right sidebar (breaking, trending, alerts)
│   │   └── mobile-drawer.tsx     # Hamburger drawer for mobile
│   └── ui/                       # shadcn/ui primitives
├── lib/
│   ├── db.ts                     # Prisma singleton
│   ├── utils.ts                  # cn() helper (clsx + tw-merge)
│   ├── push/
│   │   ├── vapid.ts              # VAPID keys + web-push setup
│   │   ├── send-push.ts          # sendPushToAll() - send to all subscribers, auto-clean 410s
│   │   └── register-push.ts       # Client: subscribe/unsubscribe push
│   └── services/
│       ├── rss-fetcher.ts        # Fetch 5 Vietnamese RSS feeds
│       ├── x-fetcher.ts          # Fetch X/Twitter via API v2
│       ├── currents-api-client.ts # Fetch international via CurrentsAPI
│       ├── coingecko-price-fetcher.ts # Fetch crypto price alerts
│       ├── etherscan-whale-fetcher.ts # Fetch whale transfers (V2 API)
│       ├── defillama-tvl-fetcher.ts # Fetch DeFi TVL alerts
│       ├── binance-futures-fetcher.ts # Fetch futures OI + funding rates
│       ├── keyword-classifier.ts # ECONOMIC/POLITICAL/CRYPTO/TECH/GENERAL classifier
│       ├── article-normalizer.ts # Strip HTML, normalize fields
│       ├── api-helpers.ts        # paginate(), jsonError()
│       └── format-date.ts        # timeAgo helper
├── public/
│   ├── sw.js                     # Service Worker (push event + notification click)
│   └── manifest.json             # PWA manifest for installability
├── types/article.ts              # RawArticle interface
├── prisma/schema.prisma          # Prisma schema (Article, AlertRule, PushSubscription, CryptoSnapshot)
└── vercel.json                   # Cron schedule: 0 8 * * * (daily for Hobby tier)
```

## Data Flow

```
Vercel Cron (daily @ 8am on Hobby tier)
  └─ GET /api/ingest?secret=<CRON_SECRET>
      ├─ Promise.allSettled([
      │   ├─ fetchRssFeeds()              → 5 Vietnamese RSS feeds
      │   ├─ fetchXFeeds()                → X/Twitter API v2
      │   ├─ fetchCurrentsApi()           → International Vietnamese news
      │   ├─ fetchCoinGeckoPrices()       → Crypto price alerts
      │   ├─ fetchEtherscanWhaleTransfers() → Whale transfers (V2 API)
      │   ├─ fetchDefiLlamaTvl()          → DeFi TVL alerts
      │   └─ fetchBinanceFuturesData()    → Futures OI + funding rates
      │ ])
      ├─ normalizeArticle()     → strip HTML, validate dates
      ├─ classifyArticle()       → keyword match → ECONOMIC | POLITICAL | CRYPTO | TECH | GENERAL
      ├─ prisma.article.upsert() → dedupe by URL, save to Neon DB
      ├─ prisma.cryptoSnapshot.upsert() → track crypto metrics for change detection
      └─ sendPushToAll()        → push notification for non-GENERAL articles

Browser
  ├─ GET / (SSR)                → initial article feed with filters (3-column layout)
  ├─ GET /api/articles           → paginated JSON feed (category, source, search, excludeGeneral)
  ├─ GET /api/alerts/sse         → SSE stream (30s DB poll for isBreaking articles)
  ├─ BreakingNewsBanner client  → SSE + polling fallback for breaking news
  └─ Notification bell          → POST/DELETE /api/push/subscribe (subscribe/unsubscribe)

Push Notification Path
  Cron ingest → detect non-GENERAL article → sendPushToAll() → web-push lib → browser push service (FCM/APNs) → Service Worker (sw.js) → OS notification
```

## Key Files

| File | Purpose |
|------|---------|
| `app/api/ingest/route.ts` | Cron ingestion pipeline, 7 fetchers, CRON_SECRET auth, Promise.allSettled |
| `lib/services/rss-fetcher.ts` | Fetch 5 VN RSS feeds via rss-parser |
| `lib/services/x-fetcher.ts` | Fetch X/Twitter via API v2 |
| `lib/services/currents-api-client.ts` | Fetch CurrentsAPI with 10s timeout |
| `lib/services/coingecko-price-fetcher.ts` | Fetch crypto price alerts, upsert CryptoSnapshot |
| `lib/services/etherscan-whale-fetcher.ts` | Fetch whale transfers via Etherscan V2 API |
| `lib/services/defillama-tvl-fetcher.ts` | Fetch DeFi TVL alerts |
| `lib/services/binance-futures-fetcher.ts` | Fetch futures OI + funding rates |
| `lib/utils/keyword-classifier.ts` | Rule-based category classification (word-boundary matching) |
| `app/api/articles/route.ts` | GET articles with excludeGeneral param support |
| `app/api/alerts/sse/route.ts` | SSE stream, 30s polling, 15s keep-alive ping |
| `components/breaking-news-banner.tsx` | Client SSE subscription with polling fallback |
| `components/layout/layout-shell.tsx` | 3-column responsive layout (xl/lg/mobile) |
| `lib/db.ts` | Prisma singleton with globalThis cache |
| `prisma/schema.prisma` | Article + AlertRule + PushSubscription + CryptoSnapshot models |

