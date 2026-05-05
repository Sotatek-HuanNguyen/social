# Project Changelog

## [0.1.0] - 2026-05-04 - Initial MVP Release

### Added

- **News Ingestion Pipeline**
  - RSS fetcher for 5 Vietnamese feeds (VnExpress, CafeF, VietnamNet, TuoiTre, ThanhNien)
  - CurrentsAPI client for international news
  - Article normalizer (HTML stripping, date validation)
  - Keyword classifier (ECONOMIC / POLITICAL / GENERAL)
  - URL-based deduplication via Prisma upsert
  - CRON_SECRET-protected ingestion endpoint

- **REST API**
  - `GET /api/articles` - Paginated article feed with category/source/search filters
  - `GET /api/articles/[id]` - Single article detail
  - `GET /api/alerts` - List all alert rules
  - `POST /api/alerts` - Create alert rule
  - `DELETE /api/alerts/[id]` - Delete alert rule
  - `GET /api/ingest` - Trigger news ingestion (CRON_SECRET protected)

- **Real-time Breaking News**
  - `GET /api/alerts/sse` - SSE stream (30s DB polling, 15s keep-alive ping)
  - `BreakingNewsBanner` component with SSE + HTTP polling fallback

- **Frontend**
  - Home page with SSR article feed
  - Category/source/search filter bar
  - Article cards with image, source badge, time ago
  - Client-side load more pagination
  - Alerts management page with create/delete forms
  - shadcn/ui component library (Button, Input, Select, Badge, Card, Separator, Skeleton)

- **Infrastructure**
  - Prisma 6 schema with Article + AlertRule models
  - Neon PostgreSQL database integration
  - Vercel deployment with cron job configuration
  - Vitest test setup
  - `.env.example` for environment setup

### Technical Stack

- Next.js 16.2.4 (App Router, TypeScript, React 19)
- Prisma 6.19.3 with PostgreSQL
- Tailwind CSS 4 + shadcn/ui
- rss-parser 3.13.0
- Vitest 2.1.9
- Deployment: Vercel (production: https://social-eosin-zeta.vercel.app)

## [0.2.0] - 2026-05-05 - PWA + Push Notifications + Roboto Font

### Added

- **PWA Support**
  - `public/manifest.json` - PWA manifest for installability
  - `public/sw.js` - Service Worker with push event handler + notification click

- **Web Push Notifications**
  - `lib/push/vapid.ts` - VAPID key config via web-push
  - `lib/push/send-push.ts` - `sendPushToAll()` sends push to all subscribers, auto-cleans 410 (Gone) responses
  - `lib/push/register-push.ts` - Client-side subscribe/unsubscribe helpers
  - `app/api/push/subscribe/route.ts` - POST/DELETE push subscription endpoints
  - `components/notification-permission-button.tsx` - Bell toggle in header nav
  - `prisma/schema.prisma` - Added `PushSubscription` model (id, endpoint unique, keys Json, createdAt)
  - Ingest endpoint triggers push notification for non-GENERAL articles
  - Env vars: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`

- **Roboto Font**
  - Replaced Geist with Roboto (latin + vietnamese subsets) in `app/layout.tsx`
  - Updated `app/globals.css` to use `var(--font-roboto)`

- **Dependencies**: `web-push` + `@types/web-push`
