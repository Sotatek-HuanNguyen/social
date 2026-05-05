# Research Report: Next.js Architecture for News Tracking & Alerting MVP

Date: 2026-05-04 | Researcher: general-purpose agent

---

## Recommended Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14+ App Router | Unified frontend/backend, RSC, Route Handlers |
| Styling | Tailwind CSS + shadcn/ui | Rapid UI, accessible components |
| Database | PostgreSQL via Prisma | Relational, free tier on Neon/Supabase, scales |
| ORM | Prisma | Type-safe, migrations, good DX |
| Real-time | SSE via Route Handler | Simple, no WS infra, works with Next.js |
| Background jobs | Vercel Cron + Route Handler | Zero infra for MVP on Vercel |
| RSS parsing | `rss-parser` npm | Lightweight, well-maintained |
| Article extraction | `@extractus/article-extractor` | Best accuracy, handles most sites |
| Caching | Next.js `unstable_cache` + ISR | Built-in, no Redis needed for MVP |

---

## Architecture Diagram (ASCII)

```
┌─────────────────────────────────────────────────────┐
│                   Next.js App                        │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │  App Router  │    │     Route Handlers        │   │
│  │  (RSC pages) │    │  /api/ingest  (cron)      │   │
│  │              │    │  /api/articles (REST)     │   │
│  │  - /         │    │  /api/alerts/sse (SSE)    │   │
│  │  - /articles │    │  /api/alerts (CRUD)       │   │
│  │  - /alerts   │    └──────────┬───────────────┘   │
│  └──────┬───────┘               │                   │
│         │ Server Components      │                   │
│         │ fetch + cache          │                   │
└─────────┼───────────────────────┼───────────────────┘
          │                       │
          ▼                       ▼
   ┌─────────────┐        ┌──────────────────┐
   │  PostgreSQL  │        │  External Sources │
   │  (Neon/      │        │  - News APIs      │
   │   Supabase)  │        │    (NewsAPI,      │
   └─────────────┘        │     GNews)        │
                           │  - RSS Feeds      │
                           └──────────────────┘
```

---

## Data Flow: Article Ingestion

```
Vercel Cron (every 15min)
  → GET /api/ingest
    → fetch RSS feeds + News APIs in parallel
    → deduplicate by URL hash
    → extract full content via @extractus/article-extractor
    → classify category (economic/political) via keyword match or AI
    → upsert to PostgreSQL (articles table)
    → check alert rules → push to SSE stream if breaking
    → return { ingested: N, skipped: M }
```

---

## Real-time Update Strategy Comparison

| Strategy | Complexity | Infra | Latency | Best For |
|---|---|---|---|---|
| Client polling | Low | None | ~30s | Simple MVP |
| SSE (Server-Sent Events) | Low-Med | None | ~1s | News alerts ✓ |
| WebSocket | High | WS server | <100ms | Chat, trading |
| Long polling | Med | None | ~1s | Fallback |

**Recommendation: SSE** — Route Handler streams events to client. Client uses `EventSource` API. No extra infra. Works on Vercel (with streaming enabled). Reconnects automatically.

SSE Route Handler pattern:
```ts
// app/api/alerts/sse/route.ts
export async function GET() {
  const stream = new ReadableStream({ start(ctrl) { /* push events */ } })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  })
}
```

---

## Database Schema Sketch

```sql
articles (
  id          uuid PK,
  url         text UNIQUE,
  title       text,
  summary     text,
  content     text,
  source      text,
  category    enum('economic','political','other'),
  published_at timestamptz,
  fetched_at  timestamptz,
  is_breaking boolean DEFAULT false
)

alert_rules (
  id        uuid PK,
  keywords  text[],
  category  text,
  user_id   uuid,  -- nullable for anonymous/global
  created_at timestamptz
)

alert_events (
  id          uuid PK,
  article_id  uuid FK articles,
  rule_id     uuid FK alert_rules,
  triggered_at timestamptz,
  delivered   boolean
)
```

---

## App Router Patterns

- **Server Components**: Fetch articles from DB directly (no API hop). Use `unstable_cache` with `revalidate: 60` for article lists.
- **Route Handlers**: `/api/ingest` for cron, `/api/alerts/sse` for streaming, `/api/articles` for client-side filtering.
- **Server Actions**: Use for alert rule CRUD (create/delete rules from forms without API boilerplate).
- **ISR**: Article detail pages use `generateStaticParams` + `revalidate: 300` for popular articles.

---

## Background Job Patterns

| Pattern | Pros | Cons |
|---|---|---|
| Vercel Cron → Route Handler | Zero infra, free tier | 1min min interval on free, cold starts |
| `setInterval` in API route | Simple | Doesn't survive serverless cold starts |
| External cron (GitHub Actions) | Reliable, free | Extra config |
| Inngest / Trigger.dev | Durable, retries | Extra service |

**MVP recommendation**: Vercel Cron calling `/api/ingest` every 15min. Upgrade to Inngest if reliability becomes issue.

---

## Article Content Extraction

- `@extractus/article-extractor`: Best for general sites, handles paywalls gracefully (returns partial)
- `@mozilla/readability` + `jsdom`: Mozilla's algorithm, same as Firefox Reader Mode, more control
- `cheerio`: Manual scraping, use as fallback for custom RSS-only sources

**Recommendation**: `@extractus/article-extractor` as primary, `cheerio` for known RSS sources with full content in feed.

---

## Alert/Notification Patterns

| Type | Complexity | Reach | MVP? |
|---|---|---|---|
| In-app (SSE banner) | Low | Tab open only | ✓ Yes |
| Browser Push API | Med | Background | Optional |
| Email (Resend/SendGrid) | Low | Always | ✓ Yes |
| Webhook | Low | Developers | Optional |

**MVP**: In-app SSE alerts + optional email via Resend (simple API, generous free tier).

---

## Key Trade-offs & Recommendations

1. **PostgreSQL over SQLite**: SQLite fine for local dev but Neon/Supabase free tier gives production-ready Postgres with zero ops. Use Prisma for both.
2. **SSE over WebSocket**: Sufficient for news (unidirectional), no extra infra, works on Vercel Edge.
3. **Keyword classification over AI**: For MVP, simple keyword arrays per category are fast and free. Add AI classification (OpenAI/local) later.
4. **Vercel Cron limitation**: Free tier = 1 job, 1min minimum. For more frequent updates, use client-side polling as supplement.
5. **Rate limiting**: Cache external API responses aggressively. NewsAPI free = 100 req/day. Use multiple sources.
6. **Content extraction**: Run async after initial article save to avoid blocking ingestion pipeline.

---

## Unresolved Questions

- User authentication needed for MVP? (affects alert_rules schema — user_id nullable or required)
- Target deployment: Vercel only, or self-hosted? (affects cron strategy)
- Number of news sources at launch? (affects rate limit planning)
- AI-based categorization budget? (keyword match vs LLM)
