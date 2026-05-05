# Phase 02 — News Ingestion

## Overview

- **Effort**: 4h
- **Status**: complete
- **Depends on**: Phase 01 complete
- **Goal**: Build ingestion pipeline — fetch RSS + CurrentsAPI, normalize, deduplicate, classify, persist

---

## Requirements

- Poll 5 Vietnamese RSS feeds every 15min via Vercel Cron
- Poll CurrentsAPI hourly (600 req/day limit)
- Deduplicate by URL (DB unique constraint)
- Classify articles into ECONOMIC / POLITICAL / GENERAL via keywords
- Store title + summary + link only (no full body)
- Cron endpoint protected by `CRON_SECRET` header

---

## Architecture

```
Vercel Cron → GET /api/ingest?secret=CRON_SECRET
    ├── fetchRssFeeds()       → lib/services/rss-fetcher.ts
    ├── fetchCurrentsApi()    → lib/services/currents-api-client.ts
    ├── normalizeArticle()    → lib/services/article-normalizer.ts
    ├── classifyArticle()     → lib/utils/keyword-classifier.ts
    └── prisma.article.upsert() (deduplicate by url)
```

---

## Related Code Files

**Create:**

- `lib/services/rss-fetcher.ts` — RSS feed fetching + parsing
- `lib/services/currents-api-client.ts` — CurrentsAPI HTTP client
- `lib/services/article-normalizer.ts` — Unified RawArticle → Article shape
- `lib/utils/keyword-classifier.ts` — Category keyword matching
- `app/api/ingest/route.ts` — Cron route handler

---

## RSS Sources Config

```ts
// lib/services/rss-fetcher.ts (top of file)
const RSS_FEEDS = [
  { url: "https://vnexpress.net/rss/kinh-doanh.rss", source: "VnExpress" },
  { url: "https://cafef.vn/rss/thi-truong-chung-khoan.rss", source: "CafeF" },
  { url: "https://vietnamnet.vn/rss/kinh-te.rss", source: "VietnamNet" },
  { url: "https://tuoitre.vn/rss/kinh-te.rss", source: "TuoiTre" },
  { url: "https://thanhnien.vn/rss/kinh-te.rss", source: "ThanhNien" }
];
```

---

## Keyword Classifier Logic

```ts
// lib/utils/keyword-classifier.ts
const ECONOMIC_KEYWORDS = [
  "kinh tế",
  "chứng khoán",
  "lạm phát",
  "gdp",
  "tăng trưởng",
  "ngân hàng",
  "tỷ giá",
  "stock",
  "market",
  "inflation"
];
const POLITICAL_KEYWORDS = [
  "chính phủ",
  "bộ trưởng",
  "quốc hội",
  "chính sách",
  "bầu cử",
  "election",
  "government",
  "policy",
  "parliament"
];

export function classifyArticle(title: string, summary: string): Category {
  const text = `${title} ${summary}`.toLowerCase();
  if (ECONOMIC_KEYWORDS.some((k) => text.includes(k))) return "ECONOMIC";
  if (POLITICAL_KEYWORDS.some((k) => text.includes(k))) return "POLITICAL";
  return "GENERAL";
}
```

---

## RawArticle Type (types/article.ts)

```ts
export interface RawArticle {
  url: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  publishedAt: Date;
  source: string;
}
```

---

## Implementation Steps

1. **Install rss-parser** (done in Phase 01), import in `rss-fetcher.ts`.

2. **Create `lib/services/rss-fetcher.ts`**:
   - Import `Parser` from `rss-parser`
   - Loop over RSS_FEEDS, fetch each, map items to `RawArticle`
   - Use `item.contentSnippet` or `item.content` for summary (truncate to 300 chars)
   - Return flat `RawArticle[]`

3. **Create `lib/services/currents-api-client.ts`**:
   - Fetch `https://api.currentsapi.services/v1/latest-news?language=vi&apiKey=${key}`
   - Map response to `RawArticle[]`
   - Guard: skip if `CURRENTS_API_KEY` not set

4. **Create `lib/services/article-normalizer.ts`**:
   - Accept `RawArticle`, return Prisma-ready shape
   - Strip HTML tags from summary
   - Fallback `publishedAt` to `new Date()` if missing

5. **Create `lib/utils/keyword-classifier.ts`** — as shown above.

6. **Create `app/api/ingest/route.ts`**:

   ```ts
   export async function GET(req: Request) {
     const secret = new URL(req.url).searchParams.get("secret");
     if (secret !== process.env.CRON_SECRET)
       return Response.json({ error: "Unauthorized" }, { status: 401 });

     const [rssArticles, currentsArticles] = await Promise.allSettled([
       fetchRssFeeds(),
       fetchCurrentsApi()
     ]);
     const all: RawArticle[] = [
       ...(rssArticles.status === "fulfilled" ? rssArticles.value : []),
       ...(currentsArticles.status === "fulfilled"
         ? currentsArticles.value
         : [])
     ];

     let saved = 0;
     for (const raw of all) {
       const normalized = normalizeArticle(raw);
       const category = classifyArticle(
         normalized.title,
         normalized.summary ?? ""
       );
       try {
         await prisma.article.upsert({
           where: { url: normalized.url },
           update: {},
           create: { ...normalized, category }
         });
         saved++;
       } catch {
         /* skip duplicates */
       }
     }
     return Response.json({ saved, total: all.length });
   }
   ```

7. **Hourly guard for CurrentsAPI**: Track last fetch time in DB or use `isBreaking` heuristic — simpler: just let 600/day budget handle it (15min × 24h = 96 calls/day well under limit if RSS is separate).

8. Test locally: `curl "http://localhost:3000/api/ingest?secret=test"`

---

## Todo List

- [x] Create `types/article.ts` with RawArticle interface
- [x] Create `lib/utils/keyword-classifier.ts`
- [x] Create `lib/services/rss-fetcher.ts`
- [x] Create `lib/services/currents-api-client.ts`
- [x] Create `lib/services/article-normalizer.ts`
- [x] Create `app/api/ingest/route.ts`
- [x] Test RSS fetch locally for each source
- [x] Test CurrentsAPI client with real key
- [x] Verify deduplication (run ingest twice, count should stay same)

---

## Success Criteria

- `/api/ingest` returns `{ saved: N, total: M }` without errors
- Running twice yields 0 new saves (deduplication works)
- Articles have correct `category` assigned
- Vercel Cron shows green in dashboard after deploy

---

## Risk Assessment

| Risk                         | Mitigation                                                              |
| ---------------------------- | ----------------------------------------------------------------------- |
| RSS feed format changes      | Use `try/catch` per feed, log source on error, continue others          |
| CurrentsAPI 600/day limit    | RSS is primary; CurrentsAPI is additive. 96 polls/day well within limit |
| Vietnamese encoding issues   | `rss-parser` handles UTF-8 natively                                     |
| Cold start timeout on Vercel | Process feeds with `Promise.allSettled`, set max 10s timeout per fetch  |
