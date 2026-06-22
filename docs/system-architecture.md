# System Architecture

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Deployment                     │
│                                                          │
│  ┌──────────────┐     ┌──────────────────────────────┐  │
│  │  Cron Job   │────▶│  /api/ingest (CRON_SECRET)   │  │
│  │  (daily)     │     └──────────┬───────────────────┘  │
│  └──────────────┘                │                      │
│                                  ▼                      │
│  ┌──────────────────────────────────────────────┐      │
│  │      Ingestion Pipeline (7 Fetchers)         │      │
│  │  ┌─────────────┐  ┌──────────────────────┐  │      │
│  │  │ RSS Fetcher │  │ X/Twitter API v2     │  │      │
│  │  │ (5 feeds)   │  │ (news tweets)        │  │      │
│  │  └──────┬──────┘  └──────────┬───────────┘  │      │
│  │         │                    │               │      │
│  │  ┌──────▼──────┐  ┌──────────▼───────────┐  │      │
│  │  │ CurrentsAPI │  │ CoinGecko Prices    │  │      │
│  │  │ (intl news) │  │ (crypto alerts)     │  │      │
│  │  └──────┬──────┘  └──────────┬───────────┘  │      │
│  │         │                    │               │      │
│  │  ┌──────▼──────┐  ┌──────────▼───────────┐  │      │
│  │  │ Etherscan   │  │ DeFiLlama TVL       │  │      │
│  │  │ Whale (V2)  │  │ (defi alerts)       │  │      │
│  │  └──────┬──────┘  └──────────┬───────────┘  │      │
│  │         │                    │               │      │
│  │  ┌──────▼──────────────────────────────┐    │      │
│  │  │ Binance Futures (OI + Funding)     │    │      │
│  │  └──────┬───────────────────────────────┘    │      │
│  │         └─────────────┬──────────────────────┘      │
│  │                       ▼                              │
│  │  ┌─────────────────────────────────┐             │      │
│  │  │   Article Normalizer            │             │      │
│  │  │   (strip HTML, validate)        │             │      │
│  │  └─────────────┬───────────────────┘             │      │
│  │                ▼                                  │      │
│  │  ┌─────────────────────────────┐             │      │
│  │  │   Keyword Classifier        │             │      │
│  │  │   ECONOMIC/POLITICAL/       │             │      │
│  │  │   CRYPTO/TECH/GENERAL       │             │      │
│  │  └─────────────┬───────────────┘             │      │
│  │                ▼                              │      │
│  │  ┌─────────────────────────────┐             │      │
│  │  │   Prisma Upsert             │             │      │
│  │  │   (dedupe by URL)           │             │      │
│  │  └─────────────┬───────────────┘             │      │
│  │                ▼                              │      │
│  │  ┌─────────────────────────────┐             │      │
│  │  │   CryptoSnapshot Upsert     │             │      │
│  │  │   (change detection)        │             │      │
│  │  └─────────────┬───────────────┘             │      │
│  │                ▼                              │      │
│  │  ┌─────────────────────────────┐             │      │
│  │  │   sendPushToAll()           │             │      │
│  │  │   (non-GENERAL only)        │             │      │
│  │  └─────────────┬───────────────┘             │      │
│  └────────────────┼─────────────────────────────┘      │
│                   ▼                                     │
│  ┌──────────────────────────────────────────────┐      │
│  │           Neon PostgreSQL                     │      │
│  │   Article(id, url, title, category...)        │      │
│  │   AlertRule(id, keywords[], category?)       │      │
│  │   PushSubscription(id, endpoint, keys)       │      │
│  │   CryptoSnapshot(source, symbol, value)      │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               Push Notification Flow                     │
│                                                          │
│  ┌─────────────┐   web-push   ┌────────────────────┐   │
│  │ Server      │──────────────▶│ Browser Push Svc   │   │
│  │ (send-push) │               │ (FCM / APNs)       │   │
│  └─────────────┘               └─────────┬──────────┘   │
│                                          │               │
│  ┌─────────────┐  sw.js          ┌────────▼──────────┐   │
│  │ Service     │◀───────────────▶│ Browser           │   │
│  │ Worker      │                 │ (Notification)    │   │
│  └─────────────┘                 └───────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     Browser Clients                      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  / (SSR) - 3-Column Layout                         │ │
│  │  ├─ Header: Logo + Notification Bell              │ │
│  │  ├─ Left Sidebar: Categories, Sources, Alerts     │ │
│  │  ├─ Center Feed: Articles + Filters               │ │
│  │  └─ Right Sidebar: Breaking, Trending, Alerts     │ │
│  │  Mobile: Hamburger drawer + single column         │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  BreakingNewsBanner (Client)                       │ │
│  │  ├─ SSE /api/alerts/sse                           │ │
│  │  └─ Polling fallback (60s)                        │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  /alerts (Client)                                  │ │
│  │  ├─ AlertRuleForm (create)                        │ │
│  │  └─ AlertRuleList (delete)                        │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Components

### Ingestion Pipeline (7 Fetchers)
- **RSS Fetcher** (`lib/services/rss-fetcher.ts`): Fetches 5 Vietnamese RSS feeds in parallel using `rss-parser`, timeout 10s per feed
- **X/Twitter Fetcher** (`lib/services/x-fetcher.ts`): Fetches news tweets via X API v2
- **CurrentsAPI Client** (`lib/services/currents-api-client.ts`): Fetches international Vietnamese-language news, 10s fetch timeout
- **CoinGecko Price Fetcher** (`lib/services/coingecko-price-fetcher.ts`): Fetches crypto price alerts, upserts CryptoSnapshot for change detection
- **Etherscan Whale Fetcher** (`lib/services/etherscan-whale-fetcher.ts`): Fetches whale transfers via Etherscan V2 API
- **DeFiLlama TVL Fetcher** (`lib/services/defillama-tvl-fetcher.ts`): Fetches DeFi TVL alerts
- **Binance Futures Fetcher** (`lib/services/binance-futures-fetcher.ts`): Fetches futures open interest + funding rates
- **Normalizer** (`lib/services/article-normalizer.ts`): Strips HTML from summary, validates dates, trims fields
- **Classifier** (`lib/utils/keyword-classifier.ts`): Rule-based keyword matching with word-boundary detection for ECONOMIC/POLITICAL/CRYPTO/TECH/GENERAL categories

### REST API
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/ingest` | GET | CRON_SECRET | Trigger ingestion (7 fetchers via Promise.allSettled) |
| `/api/articles` | GET | none | Paginated articles, filter by category/source/search, excludeGeneral param |
| `/api/articles/[id]` | GET | none | Single article detail |
| `/api/alerts` | GET | none | List alert rules |
| `/api/alerts` | POST | none | Create alert rule |
| `/api/alerts/[id]` | DELETE | none | Delete alert rule |
| `/api/alerts/sse` | GET | none | SSE stream for breaking news |
| `/api/push/subscribe` | POST | none | Save push subscription |
| `/api/push/subscribe` | DELETE | none | Remove push subscription |

### SSE (`/api/alerts/sse`)
- Polls DB every 30s for articles where `isBreaking=true` and `publishedAt >= now() - 60s`
- Sends keep-alive ping every 15s
- Client (`BreakingNewsBanner`) auto-falls back to HTTP polling if SSE fails

### Frontend (3-Column Layout)
- **Header**: Sticky header with logo + notification bell
- **Left Sidebar**: Fixed sidebar with categories, sources, alert rules
- **Center Feed**: Article feed with filters (category, source, search)
- **Right Sidebar**: Fixed sidebar with breaking news, trending, alerts
- **Mobile**: Hamburger drawer + single column layout
- **Home (`/`)**: Server Component - SSR initial article list with filters
- **Alerts (`/alerts`)**: Client Component - form + list for alert rules
- **BreakingNewsBanner**: Client Component - SSE subscription with 60s polling fallback

## Database Schema

### Article
```prisma
model Article {
  id          String   @id @default(uuid())
  url         String   @unique           // dedupe by URL
  title       String
  summary     String?
  source      String
  category    Category @default(GENERAL)
  imageUrl    String?
  publishedAt DateTime
  fetchedAt   DateTime @default(now())
  isBreaking  Boolean  @default(false)

  @@index([category, publishedAt(sort: Desc)])
  @@index([publishedAt(sort: Desc)])
}

enum Category { ECONOMIC | POLITICAL | CRYPTO | TECH | GENERAL }
```

### AlertRule
```prisma
model AlertRule {
  id        String   @id @default(uuid())
  keywords  String[]
  category  String?
  createdAt DateTime @default(now())
}
```

### PushSubscription
```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  endpoint  String   @unique
  keys      Json     // { p256dh: string, auth: string }
  createdAt DateTime @default(now())
}
```

### CryptoSnapshot
```prisma
model CryptoSnapshot {
  id        String   @id @default(uuid())
  source    String   // "coingecko", "etherscan", "defillama", "binance"
  symbol    String   // "BTC", "ETH", "aave", "BTCUSDT"
  value     Float    // last known numeric value
  metadata  Json?    // optional extra data (funding rate, volume, etc.)
  updatedAt DateTime @updatedAt

  @@unique([source, symbol])
  @@index([source])
}
```

## External Integrations

| Service | Purpose | Limits |
|---------|---------|--------|
| Neon PostgreSQL | Database (free tier) | Free |
| CurrentsAPI | International news | 600 req/day free |
| X API v2 | Twitter news | Rate limited |
| CoinGecko | Crypto prices | Free tier available |
| Etherscan V2 | Whale transfers | Free tier available |
| DeFiLlama | DeFi TVL | Free tier available |
| Binance | Futures data | Free tier available |
| VnExpress RSS | VN business news | No limit |
| CafeF RSS | VN stock market | No limit |
| VietnamNet RSS | VN economy | No limit |
| TuoiTre RSS | VN economy | No limit |
| ThanhNien RSS | VN economy | No limit |
| web-push (FCM/APNs) | Push notifications | Browser push service |
