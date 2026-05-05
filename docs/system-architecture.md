# System Architecture

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Deployment                     │
│                                                          │
│  ┌──────────────┐     ┌──────────────────────────────┐  │
│  │  Cron Job   │────▶│  /api/ingest (CRON_SECRET)   │  │
│  │  (schedule)  │     └──────────┬───────────────────┘  │
│  └──────────────┘                │                      │
│                                  ▼                      │
│  ┌──────────────────────────────────────────────┐      │
│  │           Ingestion Pipeline                   │      │
│  │  ┌─────────────┐  ┌─────────────────────┐   │      │
│  │  │ RSS Fetcher │  │ CurrentsAPI Client  │   │      │
│  │  │ (5 feeds)   │  │ (international)     │   │      │
│  │  └──────┬──────┘  └──────────┬──────────┘   │      │
│  │         └─────────┬──────────┘              │      │
│  │                   ▼                          │      │
│  │  ┌─────────────────────────────┐             │      │
│  │  │   Article Normalizer        │             │      │
│  │  │   (strip HTML, validate)    │             │      │
│  │  └─────────────┬───────────────┘             │      │
│  │                ▼                              │      │
│  │  ┌─────────────────────────────┐             │      │
│  │  │   Keyword Classifier        │             │      │
│  │  │   ECONOMIC/POLITICAL/GENERAL│             │      │
│  │  └─────────────┬───────────────┘             │      │
│  │                ▼                              │      │
│  │  ┌─────────────────────────────┐             │      │
│  │  │   Prisma Upsert             │             │      │
│  │  │   (dedupe by URL)           │             │      │
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
│  ┌────────────────┐     ┌───────────────────────────┐    │
│  │  / (SSR)       │     │  BreakingNewsBanner (Client)│   │
│  │  Home page     │     │  ├─ SSE /api/alerts/sse   │    │
│  │  - filter bar  │     │  └─ Polling fallback      │    │
│  │  - article feed│     └───────────────────────────┘    │
│  │  - breaking    │                                      │
│  └────────────────┘     ┌───────────────────────────┐    │
│                          │  /alerts (Client)          │    │
│  ┌────────────────┐     │  - AlertRuleForm           │    │
│  │  /api/articles │◀────│  - AlertRuleList           │    │
│  └────────────────┘     └───────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Components

### Ingestion Pipeline
- **RSS Fetcher** (`lib/services/rss-fetcher.ts`): Fetches 5 Vietnamese RSS feeds in parallel using `rss-parser`, timeout 10s per feed
- **CurrentsAPI Client** (`lib/services/currents-api-client.ts`): Fetches international Vietnamese-language news, 10s fetch timeout
- **Normalizer** (`lib/services/article-normalizer.ts`): Strips HTML from summary, validates dates, trims fields
- **Classifier** (`lib/utils/keyword-classifier.ts`): Rule-based keyword matching for ECONOMIC/POLITICAL/GENERAL categories

### REST API
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/ingest` | GET | CRON_SECRET | Trigger ingestion |
| `/api/articles` | GET | none | Paginated articles, filter by category/source/search |
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

### Frontend
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

enum Category { ECONOMIC | POLITICAL | GENERAL }
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
  keys      Json
  createdAt DateTime @default(now())
}
```

## External Integrations

| Service | Purpose | Limits |
|---------|---------|--------|
| Neon PostgreSQL | Database (free tier) | Free |
| CurrentsAPI | International news | 600 req/day free |
| VnExpress RSS | VN business news | No limit |
| CafeF RSS | VN stock market | No limit |
| VietnamNet RSS | VN economy | No limit |
| TuoiTre RSS | VN economy | No limit |
| ThanhNien RSS | VN economy | No limit |
| web-push (FCM/APNs) | Push notifications | Browser push service |
