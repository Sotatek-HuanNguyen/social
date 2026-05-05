# Phase 03 — API Endpoints

## Overview

- **Effort**: 2h
- **Status**: complete
- **Depends on**: Phase 01, 02 complete
- **Goal**: Build REST API + SSE endpoint for articles and alert rules

---

## Requirements

- List articles with filters (category, source, search, pagination)
- CRUD for alert rules (create, list, delete)
- SSE stream for breaking news notifications
- No auth — all endpoints public

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/articles` | List articles, filterable |
| GET | `/api/articles/[id]` | Single article |
| POST | `/api/alerts` | Create alert rule |
| GET | `/api/alerts` | List all alert rules |
| DELETE | `/api/alerts/[id]` | Delete alert rule |
| GET | `/api/alerts/sse` | SSE stream for breaking news |

---

## Related Code Files

**Create:**
- `app/api/articles/route.ts`
- `app/api/articles/[id]/route.ts`
- `app/api/alerts/route.ts`
- `app/api/alerts/[id]/route.ts`
- `app/api/alerts/sse/route.ts`
- `lib/utils/api-helpers.ts` — shared response helpers

---

## Query Params: GET /api/articles

```
?category=ECONOMIC|POLITICAL|GENERAL
?source=VnExpress|CafeF|...
?search=keyword
?page=1
?limit=20 (max 50)
```

Prisma query:
```ts
const articles = await prisma.article.findMany({
  where: {
    ...(category ? { category: category as Category } : {}),
    ...(source ? { source } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
  },
  orderBy: { publishedAt: "desc" },
  skip: (page - 1) * limit,
  take: limit,
});
```

---

## SSE Implementation (app/api/alerts/sse/route.ts)

```ts
export const runtime = "edge"; // Use edge for long-lived connections

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Poll DB every 30s for new isBreaking articles
      const interval = setInterval(async () => {
        const breaking = await prisma.article.findMany({
          where: { isBreaking: true, publishedAt: { gte: new Date(Date.now() - 60_000) } },
          orderBy: { publishedAt: "desc" },
          take: 5,
        });
        if (breaking.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(breaking)}\n\n`));
        }
      }, 30_000);

      // Send keep-alive every 15s
      const ping = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15_000);

      return () => { clearInterval(interval); clearInterval(ping); };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

**Note**: Vercel free tier limits SSE to ~30s. Use polling fallback on frontend if SSE closes.

---

## Alert Rule Validation (POST /api/alerts)

```ts
// Minimal validation — no auth, no rate limit for MVP
const body = await req.json();
if (!body.keywords?.length) return Response.json({ error: "keywords required" }, { status: 400 });
const rule = await prisma.alertRule.create({
  data: { keywords: body.keywords, category: body.category ?? null },
});
return Response.json(rule, { status: 201 });
```

---

## Implementation Steps

1. Create `lib/utils/api-helpers.ts`:
   - `paginate(page, limit)` → `{ skip, take }` with bounds checking
   - `jsonError(msg, status)` → `Response.json({ error: msg }, { status })`

2. Create `app/api/articles/route.ts` — GET with filters + pagination.

3. Create `app/api/articles/[id]/route.ts` — GET single, 404 if not found.

4. Create `app/api/alerts/route.ts` — GET list + POST create with validation.

5. Create `app/api/alerts/[id]/route.ts` — DELETE by id.

6. Create `app/api/alerts/sse/route.ts` — SSE stream as shown above.

7. Test all endpoints with `curl` or Postman locally.

---

## Todo List

- [x] Create `lib/utils/api-helpers.ts`
- [x] `app/api/articles/route.ts` — GET with filters
- [x] `app/api/articles/[id]/route.ts` — GET single
- [x] `app/api/alerts/route.ts` — GET + POST
- [x] `app/api/alerts/[id]/route.ts` — DELETE
- [x] `app/api/alerts/sse/route.ts` — SSE stream
- [x] Test all endpoints locally
- [x] Verify pagination math is correct

---

## Success Criteria

- `GET /api/articles?category=ECONOMIC` returns filtered results
- `POST /api/alerts` creates rule, `DELETE /api/alerts/:id` removes it
- SSE endpoint sends keep-alive pings every 15s without disconnecting
- All 404/400 errors return JSON with `{ error: "..." }`

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| SSE drops on Vercel free tier (30s timeout) | Frontend polls `/api/articles` every 60s as fallback |
| No rate limiting — abuse | Acceptable for MVP; add rate limiting post-MVP |
| Large result sets | `limit` capped at 50; add DB indexes (already in schema) |
