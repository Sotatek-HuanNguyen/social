# Code Standards

## File Naming
- All source files: **kebab-case** (`article-card.tsx`, `rss-fetcher.ts`)
- Types/interfaces: Pascal-case where appropriate within kebab files

## Component Patterns

### Server Components (data fetching)
- Pages (`app/page.tsx`, `app/alerts/page.tsx`): Server Components by default
- Direct DB access via Prisma singleton
- Serialize Date objects to ISO strings before passing to Client Components
```tsx
const serialized = articles.map((a) => ({
  ...a,
  publishedAt: a.publishedAt.toISOString(),
  fetchedAt: a.fetchedAt.toISOString(),
}));
```

### Client Components (interactivity)
- Mark with `"use client"` directive
- Use React hooks for state/effects
- Pass data from Server Components via props (serialized)

## API Patterns

### Route Handlers (`app/api/*/route.ts`)
```ts
// GET with query params
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  // ...
  return Response.json({ data });
}

// POST with body
export async function POST(req: NextRequest) {
  const body = await req.json();
  // ...
}
```

### Authentication
- Ingest endpoint protected by CRON_SECRET comparison
- All other endpoints public

## Error Handling

- Use `try/catch` with silent skip for non-critical operations (RSS feed failures, individual article upserts)
- Return `Response.json({ error, ... }, status)` for API errors
- `Promise.allSettled` for parallel external fetches to isolate failures

## Classification

- Rule-based keyword matching with word-boundary detection in `lib/utils/keyword-classifier.ts`
- ECONOMIC keywords: kinh tế, chứng khoán, lạm phát, GDP, ngân hàng, stock, market, inflation...
- POLITICAL keywords: chính phủ, bộ trưởng, quốc hội, chính sách, bầu cử...
- CRYPTO keywords: bitcoin, ethereum, crypto, blockchain, tiền mã hóa, whale, tvl, defi, nft, web3, onchain...
- TECH keywords: ai, artificial intelligence, trí tuệ nhân tạo, machine learning, công nghệ, software, startup...
- Default: GENERAL

## Testing (Vitest)

- Config: `vitest.config.ts` with `@/` alias pointing to project root
- Tests: `__tests__/**/*.test.ts`
- Run: `npm test` (vitest run), `npm run test:watch`
- Environment: `node` (not jsdom)

## Prisma Conventions

- Singleton pattern via `globalThis` to prevent multiple instances in dev
- `upsert` for article ingestion (dedupe by URL)
- `@default(uuid())` for all `id` fields
- `@@index` on frequently filtered/sorted fields

## Next.js Conventions

- `export const dynamic = "force-dynamic"` on SSE routes
- Server Components fetch data directly, pass serialized data to Client Components
- `Suspense` + `Skeleton` for loading states
- shadcn/ui primitives in `components/ui/`
