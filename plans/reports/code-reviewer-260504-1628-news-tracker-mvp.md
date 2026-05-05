# Code Review: News Tracker MVP

**Score: 7/10**

## Scope

- Files reviewed: 25 (types, lib/, services, API routes, components, prisma schema, tests)
- LOC: ~750
- Focus: full implementation review

## Overall Assessment

Solid MVP. Clean file structure, good separation of concerns, sensible use of Prisma + Next.js conventions. Several security and robustness issues need addressing before production.

---

## Critical Issues

### 1. SSE cleanup uses unsafe controller property injection

**File:** `app/api/alerts/sse/route.ts` lines 41-47

Storing interval refs by mutating `controller` via `as unknown as Record<string, NodeJS.Timeout>` is fragile. If the runtime changes the controller shape or freezes the object, intervals leak silently -- no cleanup, growing memory and DB connections.

**Fix:** Use a closure-scoped variable instead:

```ts
let interval: NodeJS.Timeout;
let ping: NodeJS.Timeout;
const stream = new ReadableStream({
  start(controller) {
    interval = setInterval(/* ... */);
    ping = setInterval(/* ... */);
  },
  cancel() {
    clearInterval(interval);
    clearInterval(ping);
  },
});
```

### 2. Ingest endpoint auth uses GET + query param secret

**File:** `app/api/ingest/route.ts` line 10-13

`CRON_SECRET` passed as `?secret=...` in a GET request. Query params are logged in server access logs, browser history, CDN caches, and referrer headers. This is a credential exposure risk.

**Fix:** Switch to POST with `Authorization: Bearer <CRON_SECRET>` header, or at minimum validate via a custom header like `x-cron-secret`.

### 3. Unvalidated `category` cast from query param

**File:** `app/api/articles/route.ts` line 8

```ts
const category = params.get("category") as Category | null;
```

Arbitrary user input is cast directly to the `Category` enum. If a user passes `?category=ADMIN`, this goes straight into the Prisma `where` clause. Prisma will likely reject it, but the error surfaces as an unhandled 500.

**Fix:** Validate against allowed enum values:

```ts
const validCategories = ["ECONOMIC", "POLITICAL", "GENERAL"];
const rawCat = params.get("category");
const category = rawCat && validCategories.includes(rawCat) ? rawCat as Category : null;
```

Same issue in `app/page.tsx` line 15.

---

## High Priority

### 4. No error handling on `loadMore` fetch failure

**File:** `components/article-feed.tsx` line 39-47

`loadMore` has `try/finally` but no `catch`. A network error leaves the user with no feedback. Add a catch block with error state or toast.

### 5. Ingest route processes articles sequentially

**File:** `app/api/ingest/route.ts` lines 26-40

Each article is upserted one-by-one in a for-loop. With hundreds of RSS items, this is slow. Use `prisma.$transaction` with `createMany` or batch upserts.

### 6. Optimistic delete with no rollback

**File:** `components/alert-rule-list.tsx` line 39-43

`handleDelete` removes the item from UI immediately but never checks if the API call succeeded. If the DELETE fails, the item disappears from the UI but still exists in DB. Add error handling to restore the item on failure.

### 7. Missing `try/catch` around articles route DB queries

**File:** `app/api/articles/route.ts`

The GET handler has no error handling. A DB connection failure will throw an unhandled exception resulting in a 500 with a stack trace leak.

### 8. SSE polling queries every 30s with no connection limit

**File:** `app/api/alerts/sse/route.ts`

Each SSE connection creates a persistent polling interval. With N concurrent users, the DB receives N queries every 30 seconds. No connection limit, no cleanup on server restart. Consider a pub/sub or a shared polling mechanism.

---

## Medium Priority

### 9. Duplicated `where` clause logic between `app/page.tsx` and `app/api/articles/route.ts`

Lines 19-23 of `page.tsx` and lines 16-20 of `route.ts` build identical Prisma where objects. Extract to a shared helper.

### 10. `Article` interface duplicated in `article-feed.tsx`

`components/article-feed.tsx` lines 8-17 re-defines an Article interface. Should import a shared type (or extend the Prisma-generated type with serialized dates).

### 11. Breaking news fallback polls wrong endpoint

**File:** `components/breaking-news-banner.tsx` line 43

Polls `/api/articles?isBreaking=true&limit=5` but the articles API route (`app/api/articles/route.ts`) does not handle `isBreaking` or `limit` params for filtering by breaking status. The fallback silently returns all articles instead of breaking ones only.

### 12. `stripHtml` regex is naive

**File:** `lib/services/article-normalizer.ts` line 5

`/<[^>]*>/g` does not handle malformed HTML, HTML entities, or encoded angle brackets. For RSS content this is acceptable for MVP, but consider a proper sanitizer (e.g., `sanitize-html`) before production.

### 13. AlertRule `category` is `String?` instead of `Category?`

**File:** `prisma/schema.prisma` line 36

`AlertRule.category` is typed as `String?` while `Article.category` uses the `Category` enum. This allows storing arbitrary strings. Should be `Category?` for consistency and type safety.

### 14. No input length limits on alert keywords

**File:** `app/api/alerts/route.ts` POST handler

No validation on keyword array length, individual keyword length, or total payload size. A malicious user could POST thousands of keywords.

---

## Low Priority

### 15. `timeAgo` hardcoded to Vietnamese

`lib/utils/format-date.ts` -- fine for this project, but note for future i18n.

### 16. No CORS headers on API routes

Not an issue if only used by the same-origin frontend, but worth noting if mobile/third-party clients will consume these APIs later.

### 17. Test coverage is minimal

Only `keyword-classifier` and `article-normalizer` have tests. No tests for API routes, pagination helper, or SSE stream.

---

## Positive Observations

- Clean file organization following Next.js 16 app router conventions
- `Promise.allSettled` for resilient RSS fetching -- one feed failure doesn't break the pipeline
- Pagination helper with safe bounds (`paginate()`)
- Prisma singleton pattern in `lib/db.ts` prevents connection leaks in dev
- `noopener noreferrer` on external links
- Good use of Suspense + Skeleton loading states
- Debounced search input in FilterBar
- Prisma indexes on `publishedAt` and `[category, publishedAt]` -- good query optimization

---

## Recommended Actions (priority order)

1. Fix SSE cleanup to use closure variables instead of controller mutation
2. Change ingest auth from query param to header-based auth
3. Validate `category` enum from user input in API routes and `page.tsx`
4. Add error handling to `loadMore` and optimistic delete
5. Batch ingest upserts with `$transaction`/`createMany`
6. Fix breaking news fallback polling to actually filter by `isBreaking`
7. Unify `Article` type and `where` builder across server page and API route
8. Change `AlertRule.category` schema from `String?` to `Category?`
9. Add input length validation on POST `/api/alerts`
10. Add API route error handling wrappers

## Metrics

- Type Coverage: ~85% (some `as` casts bypass safety)
- Test Coverage: ~15% (2 util modules only)
- Linting Issues: not run (no lint config reviewed)

## Unresolved Questions

- Is `isBreaking` ever set to `true`? No code path in the ingest route sets it. The schema defaults to `false`, so the breaking news banner will never show data unless manually set in DB or via another mechanism.
- Are alert rules actively evaluated anywhere? `AlertRule` records are created/deleted, but no code checks incoming articles against alert rules to trigger notifications.
