# News Tracker MVP - Project Overview & PDR

## Project

**Name:** News Tracker (Theo Doi Tin Tuc)
**Type:** Near real-time news aggregation and alerting web app
**Description:** Tracks economic-political news from Vietnamese RSS feeds and international sources via CurrentsAPI, with category filtering and breaking news alerts via SSE.
**Target Users:** Public (no auth required). Alert rules are global and shared.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, TypeScript, React 19) |
| UI | Tailwind CSS 4 + shadcn/ui |
| Database | PostgreSQL via Prisma 6 (Neon free tier) |
| Real-time | Server-Sent Events (SSE) |
| Deployment | Vercel (Hobby/Pro with cron jobs) |
| Testing | Vitest |
| News Sources | 5 Vietnamese RSS feeds + CurrentsAPI |

## Goals

- Aggregate news from multiple Vietnamese and international sources
- Classify articles into ECONOMIC / POLITICAL / GENERAL categories
- Provide filterable, paginated article feed
- Stream breaking news to browser via SSE
- Allow users to create/delete global alert rules (keyword + category matching)

## Key Features

1. **News Ingestion** - Cron job fetches from 7 sources (5 RSS + X API + CurrentsAPI) every 24h, normalizes, deduplicates (upsert by URL), classifies
2. **Crypto Onchain Data** - Fetches price alerts (CoinGecko), whale transfers (Etherscan V2), TVL (DeFiLlama), futures data (Binance)
3. **Article Feed** - Paginated list with category/source/search filters, SSR for initial load, 3-column responsive layout
4. **Breaking News Banner** - Client-side SSE subscription, polls DB every 30s, fallback to HTTP polling
5. **Alert Rules** - CRUD API for global alert rules (stored in DB)
6. **SSE Stream** - `/api/alerts/sse` pushes breaking articles to connected clients
7. **Push Notifications** - Web push for non-GENERAL articles, auto-cleanup of 410 responses

## Database Models

### Article
```
id          String   @id @default(uuid())
url         String   @unique
title       String
summary     String?
source      String
category    Category @default(GENERAL)
imageUrl    String?
publishedAt DateTime
fetchedAt   DateTime @default(now())
isBreaking  Boolean  @default(false)
```

### AlertRule
```
id        String   @id @default(uuid())
keywords  String[]
category  String?
createdAt DateTime @default(now())
```

### CryptoSnapshot
```
id        String   @id @default(uuid())
source    String   // "coingecko", "etherscan", "defillama", "binance"
symbol    String   // "BTC", "ETH", "aave", "BTCUSDT"
value     Float    // last known numeric value
metadata  Json?    // optional extra data
updatedAt DateTime @updatedAt
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection (migrations) |
| `CURRENTS_API_KEY` | CurrentsAPI key (free 600 req/day) |
| `CRON_SECRET` | Secret protecting `/api/ingest` endpoint |

## Production URL

https://social-eosin-zeta.vercel.app
