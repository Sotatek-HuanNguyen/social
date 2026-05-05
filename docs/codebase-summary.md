# Codebase Summary

## Directory Structure

```
social/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page (SSR article feed)
│   ├── alerts/page.tsx           # Alert management page (client)
│   └── api/
│       ├── ingest/route.ts       # Cron endpoint: fetch + save articles
│       ├── articles/route.ts     # GET articles (filter, pagination)
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
│   └── ui/                       # shadcn/ui primitives
├── lib/
│   ├── db.ts                     # Prisma singleton
│   ├── utils.ts                  # cn() helper (clsx + tw-merge)
│   ├── push/
│   │   ├── vapid.ts              # VAPID keys + web-push setup
│   │   ├── send-push.ts          # sendPushToAll() - send to all subscribers, auto-clean 410s
│   │   └── register-push.ts       # Client: subscribe/unsubscribe push
│   └── services/
│   │   ├── keyword-classifier.ts # ECONOMIC/POLITICAL/GENERAL classifier
│   │   ├── api-helpers.ts        # paginate(), jsonError()
│   │   └── format-date.ts        # timeAgo helper
│   └── services/
│       ├── rss-fetcher.ts        # Fetch 5 Vietnamese RSS feeds
│       ├── currents-api-client.ts # Fetch international via CurrentsAPI
│       └── article-normalizer.ts  # Strip HTML, normalize fields
├── public/
│   ├── sw.js                     # Service Worker (push event + notification click)
│   └── manifest.json             # PWA manifest for installability
├── types/article.ts              # RawArticle interface
├── prisma/schema.prisma           # Prisma schema (Article, AlertRule, PushSubscription)
└── vercel.json                   # Cron schedule: 0 8 * * *
```

## Data Flow

```
Vercel Cron (daily @ 8am on Hobby, 15min on Pro)
  └─ GET /api/ingest?secret=<CRON_SECRET>
      ├─ fetchRssFeeds()        → 5 Vietnamese RSS feeds (VnExpress, CafeF, VietnamNet, TuoiTre, ThanhNien)
      ├─ fetchCurrentsApi()     → CurrentsAPI (international Vietnamese news)
      ├─ normalizeArticle()     → strip HTML, validate dates
      ├─ classifyArticle()       → keyword match → ECONOMIC | POLITICAL | GENERAL
      └─ prisma.article.upsert() → dedupe by URL, save to Neon DB

Browser
  ├─ GET / (SSR)                → initial article feed with filters
  ├─ GET /api/articles           → paginated JSON feed (category, source, search)
  ├─ GET /api/alerts/sse         → SSE stream (30s DB poll for isBreaking articles)
  ├─ BreakingNewsBanner client  → SSE + polling fallback for breaking news
  └─ Notification bell          → POST/DELETE /api/push/subscribe (subscribe/unsubscribe)

Push Notification Path
  Cron ingest → detect non-GENERAL article → sendPushToAll() → web-push lib → browser push service (FCM/APNs) → Service Worker (sw.js) → OS notification
```

## Key Files

| File | Purpose |
|------|---------|
| `app/api/ingest/route.ts` | Cron ingestion pipeline, CRON_SECRET auth |
| `lib/services/rss-fetcher.ts` | Fetch 5 VN RSS feeds via rss-parser |
| `lib/services/currents-api-client.ts` | Fetch CurrentsAPI with 10s timeout |
| `lib/utils/keyword-classifier.ts` | Rule-based category classification |
| `app/api/alerts/sse/route.ts` | SSE stream, 30s polling, 15s keep-alive ping |
| `components/breaking-news-banner.tsx` | Client SSE subscription with polling fallback |
| `lib/db.ts` | Prisma singleton with globalThis cache |
| `prisma/schema.prisma` | Article + AlertRule + PushSubscription models |
