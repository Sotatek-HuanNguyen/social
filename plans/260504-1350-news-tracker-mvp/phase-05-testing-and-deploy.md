# Phase 05 — Testing & Deploy

## Overview

- **Effort**: 2h
- **Status**: in_progress
- **Depends on**: All previous phases complete
- **Goal**: Unit tests for ingestion pipeline, deploy to Vercel, smoke test production

**Implementation Notes:**
- vitest downgraded to v2 for Node 20 compatibility
- 12/12 tests pass
- `npm run build` passes
- Production deployment and DB migration still pending

---

## Requirements

- Unit tests for keyword classifier and article normalizer
- API route smoke tests
- Vercel deployment with env vars
- Neon DB accessible from Vercel
- Production smoke test checklist

---

## Related Code Files

**Create:**
- `__tests__/keyword-classifier.test.ts`
- `__tests__/article-normalizer.test.ts`

**Modify:**
- `package.json` — add test script

---

## Test Setup

Install Vitest (lightweight, no config needed with Next.js):
```bash
npm install -D vitest @vitejs/plugin-react
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node" } });
```

---

## Unit Tests

### `__tests__/keyword-classifier.test.ts`
```ts
import { describe, it, expect } from "vitest";
import { classifyArticle } from "@/lib/utils/keyword-classifier";

describe("classifyArticle", () => {
  it("classifies economic article", () => {
    expect(classifyArticle("Chứng khoán tăng mạnh", "VN-Index tăng")).toBe("ECONOMIC");
  });
  it("classifies political article", () => {
    expect(classifyArticle("Quốc hội họp bàn chính sách", "")).toBe("POLITICAL");
  });
  it("defaults to GENERAL", () => {
    expect(classifyArticle("Thời tiết hôm nay", "")).toBe("GENERAL");
  });
});
```

### `__tests__/article-normalizer.test.ts`
```ts
import { describe, it, expect } from "vitest";
import { normalizeArticle } from "@/lib/services/article-normalizer";

describe("normalizeArticle", () => {
  it("strips HTML from summary", () => {
    const result = normalizeArticle({
      url: "https://example.com/1",
      title: "Test",
      summary: "<p>Hello <b>world</b></p>",
      source: "Test",
      publishedAt: new Date(),
    });
    expect(result.summary).toBe("Hello world");
  });
  it("falls back publishedAt to now if missing", () => {
    const result = normalizeArticle({
      url: "https://example.com/2",
      title: "Test",
      source: "Test",
      publishedAt: undefined as any,
    });
    expect(result.publishedAt).toBeInstanceOf(Date);
  });
});
```

---

## Deployment Steps

### 1. Neon Database

1. Create account at [neon.tech](https://neon.tech)
2. Create project → copy connection strings
3. Use **pooled** connection for `DATABASE_URL`, **direct** for `DIRECT_URL`

### 2. CurrentsAPI

1. Register at [currentsapi.services](https://currentsapi.services)
2. Copy API key

### 3. Vercel Deployment

```bash
npm install -g vercel
vercel login
vercel --prod
```

Add env vars in Vercel dashboard (or via CLI):
```bash
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add CURRENTS_API_KEY production
vercel env add CRON_SECRET production
```

### 4. Run DB Migration on Neon

```bash
DATABASE_URL="<neon-direct-url>" npx prisma migrate deploy
```

### 5. Verify Cron

- Go to Vercel dashboard → project → Cron Jobs tab
- Confirm `/api/ingest` shows with `*/15 * * * *` schedule
- Manually trigger: visit `https://<your-app>.vercel.app/api/ingest?secret=<CRON_SECRET>`

---

## Production Smoke Test Checklist

- [ ] Home page loads without JS errors in browser console
- [ ] Articles appear (after first cron run or manual trigger)
- [ ] Category filter returns correct subset
- [ ] Search filter works
- [ ] `/alerts` page loads, can create alert rule
- [ ] Alert rule appears in list, can be deleted
- [ ] `/api/alerts/sse` responds with `text/event-stream` content type
- [ ] Breaking news banner dismisses on click
- [ ] Mobile view (DevTools 375px) renders correctly
- [ ] Dark mode toggle works

---

## Todo List

- [x] Install vitest
- [x] Create `vitest.config.ts`
- [x] Write `__tests__/keyword-classifier.test.ts`
- [x] Write `__tests__/article-normalizer.test.ts`
- [x] Run `npm test` — all pass (12/12)
- [x] Run `npm run build` — passes
- [ ] Create Neon project, copy URLs
- [ ] Register CurrentsAPI, copy key
- [ ] Deploy to Vercel with env vars
- [ ] Run `prisma migrate deploy` against Neon
- [ ] Manually trigger `/api/ingest` in production
- [ ] Complete production smoke test checklist

---

## Success Criteria

- `npm test` passes with 0 failures
- Production URL accessible and shows articles
- Vercel Cron runs every 15min (check logs after 30min)
- No 500 errors in Vercel function logs

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Neon connection string format wrong | Use exact format from Neon dashboard; pooled vs direct matters |
| Cron not firing on free tier | Vercel free tier supports cron; verify `vercel.json` is at root |
| RSS feeds blocked by Vercel IPs | Test each feed from production; add User-Agent header if blocked |
| Migration fails on Neon | Use `DIRECT_URL` (non-pooled) for migrations only |

---

## Unresolved Questions

- Should `isBreaking` be set manually or auto-detected? (MVP: auto-detect if keywords match "breaking", "khẩn", "nóng")
- Vercel free tier SSE max duration: confirm if 30s limit applies to Edge Runtime or only Serverless
