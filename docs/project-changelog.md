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

## [0.3.0] - 2026-05-07 - X/Twitter Integration + Crypto Onchain Data

### Added

- **X/Twitter News Integration**
  - `lib/services/x-fetcher.ts` - Fetch news tweets via X API v2
  - Integrated into `/api/ingest` pipeline via Promise.allSettled

- **Crypto Onchain/Market Data Integration**
  - `lib/services/coingecko-price-fetcher.ts` - Fetch crypto price alerts
  - `lib/services/etherscan-whale-fetcher.ts` - Fetch whale transfers via Etherscan V2 API (migrated from V1)
  - `lib/services/defillama-tvl-fetcher.ts` - Fetch DeFi TVL alerts
  - `lib/services/binance-futures-fetcher.ts` - Fetch futures open interest + funding rates
  - `prisma/schema.prisma` - Added `CryptoSnapshot` model for change detection (source, symbol, value, metadata)
  - All 4 fetchers integrated into `/api/ingest` pipeline

- **Enhanced Keyword Classifier**
  - Added CRYPTO category keywords: bitcoin, ethereum, crypto, blockchain, whale, tvl, defi, nft, web3, onchain, etc.
  - Added TECH category keywords: ai, artificial intelligence, machine learning, software, startup, etc.
  - Implemented word-boundary matching for more precise classification
  - Updated `prisma/schema.prisma` Category enum: ECONOMIC | POLITICAL | CRYPTO | TECH | GENERAL

- **Error Logging**
  - Added `console.warn()` for all silent catch blocks in fetchers for observability
  - Etherscan V2 API migration with proper error handling

### Changed

- **Cron Schedule**
  - Reverted to daily schedule (0 8 * * *) for Vercel Hobby tier compatibility
  - Removed literal secret from URL path (now uses Authorization header)

- **API Enhancements**
  - `/api/articles` now supports `excludeGeneral` query parameter
  - `/api/ingest` uses Promise.allSettled for 7 fetchers (RSS, X, Currents, CoinGecko, Etherscan, DeFiLlama, Binance)

### Technical Details

- 62 tests passing (keyword classifier, crypto fetchers, etc.)
- Etherscan V2 API migration complete
- All fetchers use consistent error handling patterns
- CryptoSnapshot upsert for tracking metric changes

## [0.4.0] - 2026-05-08 - UI Redesign (3-Column Layout)

### Added

- **3-Column Responsive Layout**
  - `components/layout/layout-shell.tsx` - Main layout wrapper with responsive grid
  - `components/layout/header-bar.tsx` - Sticky header with logo + notification bell
  - `components/layout/sidebar-left.tsx` - Fixed left sidebar (categories, sources, alerts)
  - `components/layout/sidebar-right.tsx` - Fixed right sidebar (breaking, trending, alerts)
  - `components/layout/mobile-drawer.tsx` - Hamburger drawer for mobile navigation
  - Responsive breakpoints: xl (3 cols) → lg (2 cols) → mobile (1 col + drawer)

- **Category Colors**
  - CRYPTO: orange
  - TECH: purple
  - ECONOMIC: blue (existing)
  - POLITICAL: red (existing)
  - GENERAL: gray (existing)

### Changed

- **Frontend Architecture**
  - Migrated from simple filter bar to FB-style 3-column layout
  - Home page now uses layout-shell wrapper
  - Improved mobile UX with hamburger drawer
  - Better visual hierarchy with sidebars

### Technical Stack

- Tailwind CSS responsive utilities for layout
- Mobile-first design approach
- Maintained all existing functionality (filters, SSE, push notifications)

