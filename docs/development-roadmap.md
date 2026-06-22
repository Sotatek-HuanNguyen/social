# Development Roadmap

## MVP Phases

| # | Phase | Effort | Status | Notes |
|---|-------|--------|--------|-------|
| 1 | Project Setup | 2h | Complete | Next.js 16, Prisma 6, shadcn/ui, env config |
| 2 | News Ingestion | 4h | Complete | RSS fetcher (5 feeds), CurrentsAPI, normalizer, classifier |
| 3 | API Endpoints | 2h | Complete | Articles CRUD, Alert CRUD, SSE stream |
| 4 | Frontend UI | 6h | Complete | Home feed, filters, breaking news banner, alerts page |
| 5 | Testing & Deploy | 2h | Complete | Unit tests, Vercel deployment |
| 6 | PWA + Push Notifications | 3h | Complete | manifest.json, sw.js, web-push, notification bell |
| 7 | X/Twitter Integration | 2h | Complete | X API v2 fetcher for news tweets |
| 8 | Crypto Onchain Data | 4h | Complete | CoinGecko, Etherscan V2, DeFiLlama, Binance Futures fetchers + CryptoSnapshot model |
| 9 | UI Redesign (3-Column Layout) | 3h | Complete | FB-style layout: header, left/right sidebars, mobile drawer, responsive |

## Post-MVP Improvements

From code review, priority order:

1. **Batch upserts** - Replace individual `prisma.article.upsert()` loop with `prisma.article.createMany()` + `updateMany()` for performance
2. **Auto-detect `isBreaking`** - Rule-based detection (e.g., keywords like "bất ngờ", "đột ngột", "chấn động") or ML classification
3. **Alert evaluation** - After saving new articles, evaluate against all AlertRules and auto-set `isBreaking=true` on matches
4. **Alert notification delivery** - Currently alerts are stored but not actively delivered; needs email/webhook/notification integration
5. **Dedup strategy for CurrentsAPI** - CurrentsAPI may return duplicate URLs across fetches; consider content-based dedup (hash of title+summary)
6. **Crypto snapshot alerts** - Trigger alerts when CryptoSnapshot values change by threshold (e.g., 5% price change, TVL drop)

## Future Features

| Feature | Priority | Description |
|---------|----------|-------------|
| User auth + personal alerts | P2 | Per-user alert rules instead of global |
| Article bookmarking | P2 | Save articles for later |
| Search indexing | P2 | Full-text search with Postgres `tsvector` |
| Article summarization | P3 | AI-generated summaries for long articles |
| Social sharing | P3 | Share articles with commentary |
| RSS feed import | P3 | Let users add custom RSS feeds |
| Mobile push notifications | P1 | ~~Web push for breaking news~~ (Done) |
| Analytics dashboard | P4 | Track top sources, categories, alert matches |
| Crypto portfolio tracking | P2 | Track user's crypto holdings with price alerts |
| Sentiment analysis | P3 | AI-powered sentiment scoring for articles |

## Timeline

- MVP release target: 2026-05-04
- Phase 5-6 completion: 2026-05-05
- Phase 7-9 completion: 2026-05-08

