# Code Review: Crypto Data Integration

**Date:** 2026-05-07
**Reviewer:** code-reviewer
**Scope:** 4 new fetchers + snapshot store + schema + ingest wiring
**Verdict:** PASS with HIGH/MEDIUM follow-ups

---

## Scope

### Files reviewed (NEW)
- `/Users/huannguyen/Desktop/Demo/social/lib/services/crypto-snapshot-store.ts` (33 LOC)
- `/Users/huannguyen/Desktop/Demo/social/lib/services/coingecko-price-fetcher.ts` (109 LOC)
- `/Users/huannguyen/Desktop/Demo/social/lib/services/etherscan-whale-fetcher.ts` (104 LOC)
- `/Users/huannguyen/Desktop/Demo/social/lib/services/defillama-tvl-fetcher.ts` (100 LOC)
- `/Users/huannguyen/Desktop/Demo/social/lib/services/binance-futures-fetcher.ts` (110 LOC)

### Files modified
- `/Users/huannguyen/Desktop/Demo/social/prisma/schema.prisma` (CryptoSnapshot added)
- `/Users/huannguyen/Desktop/Demo/social/app/api/ingest/route.ts` (4 new fetchers wired)
- `/Users/huannguyen/Desktop/Demo/social/lib/utils/keyword-classifier.ts` (crypto keywords)
- `/Users/huannguyen/Desktop/Demo/social/.env.example` (ETHERSCAN_API_KEY)

### Focus: recent changes
### LOC: ~456 LOC new
### Scout findings: see "Edge Cases" section

---

## Overall Assessment

Implementation is clean, follows existing fetcher conventions (`RawArticle` shape, `AbortSignal.timeout`, `Promise.allSettled` at ingest layer, graceful fallback to `[]` on failure). Pattern consistency with `x-fetcher.ts` / `currents-api-client.ts` / `rss-fetcher.ts` is good. All files under the 200 LOC guideline. Type safety is solid. 62/62 tests pass per tester report.

---

## Critical Issues

**None.** No security vulnerabilities, data-loss risks, or breaking changes found.

---

## High Priority

### H1. Etherscan V1 endpoint deprecation risk
`etherscan-whale-fetcher.ts` line 42 uses `api.etherscan.io/api?module=account&action=txlist` — V1 API has been migrated to V2 (`api.etherscan.io/v2/api` with `chainid` required). V1 still works but is deprecated; new keys issued in 2024+ may be V2-only. Impact: silent `status != "1"` → empty result → no whale alerts. Recommend migrate to V2 now:
```
https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&...
```

### H2. Snapshot `value` as Float for wei-scale timestamps is OK but undocumented
`crypto-snapshot-store.ts` uses `Float`. Etherscan stores unix timestamps (~1.7e9) — safe. Binance OI can be large floats (~1e10 BTC). All safe within Float64 (~2^53). However Etherscan stores timestamps in the same column as prices (semantic mismatch). Consider documenting in schema comment or adding a `valueType` discriminator later. Not a bug, but confusing.

### H3. DeFiLlama: `toUpsert` condition writes on ANY drift ≥ 1%
`defillama-tvl-fetcher.ts` line 81: `if (!snapshot || Math.abs(snapshotDelta) >= 1)` — with hundreds of qualifying protocols (TVL ≥ $500M), this fires an upsert per drift ≥ 1% per cycle. On a 5-minute cron, this is dozens-to-hundreds of DB round trips. `Promise.all` parallelizes, but Prisma's connection pool on serverless (Neon pooled) can be tight. Consider batching via `prisma.$transaction([...])` or raising the drift threshold to 3-5% (aligning with SNAPSHOT_DELTA_THRESHOLD).

### H4. Binance fetcher: sequential `for` loop instead of parallel
`binance-futures-fetcher.ts` line 71: `for (const symbol of SYMBOLS)` is awaited serially. With 5 symbols × 8s timeout × 2 fetches each → worst case 80s, exceeding Vercel default function timeout (10s hobby / 60s pro). CoinGecko/DeFiLlama correctly use `Promise.all`. Recommend:
```ts
const snapshots = await Promise.all(SYMBOLS.map(s => getSnapshot("binance", s)));
const ois = await Promise.all(SYMBOLS.map(fetchOI));
// then compute diffs, conditionally fetch funding rates in parallel
```

### H5. CoinGecko free-tier rate-limit headroom is thin
CoinGecko free tier = 5-15 req/min per IP (unauthenticated, shared serverless IPs). Current usage is 1 req per ingest cycle — fine. BUT: vercel deployments share egress IPs; if cron runs every minute you may hit 429 from neighbor noise. No retry/backoff implemented. Consider either (a) adding the `x-cg-demo-api-key` header if a demo key is available, or (b) documenting cron interval ≥ 2 min and catching 429 explicitly to avoid confusing `res.status` logs.

---

## Medium Priority

### M1. Silent catch blocks hide diagnostic signal
- `binance-futures-fetcher.ts` lines 43, 58: `catch {}` swallows errors from OI/funding fetch without logging. A 451 geo-block returns ok=false, but a TLS error / DNS failure is lost. At minimum `console.warn('binance OI ${symbol}', err)`.
- `app/api/ingest/route.ts` lines 61, 76: silent catches. Article upsert errors should at least be counted (e.g., `failed++`) for observability.

### M2. Ingest route does not isolate individual fetcher logging
`app/api/ingest/route.ts` lines 23-31 use `Promise.allSettled` correctly. But rejected promises' reasons are dropped. Consider:
```ts
results.forEach((r, i) => {
  if (r.status === 'rejected') console.warn(`fetcher[${i}] failed:`, r.reason);
});
```
Useful for debugging production cron failures.

### M3. Etherscan fetcher: `lastSeen = snapshot?.value` stored as Float
`etherscan-whale-fetcher.ts` line 67: `snapshot?.value` is `number`. Unix seconds (10-digit int) is safely representable. When/if Etherscan V2 returns blockNumber or a larger tracking value, the Float store still suffices. No action needed but worth a code comment noting intent.

### M4. Whale wallet label list is a hard-coded MVP seed
`WHALE_ADDRESSES` in `etherscan-whale-fetcher.ts` only has 3 addresses. Binance Hot Wallet rotates (current address may churn). No mechanism to refresh. Acceptable for MVP per scope, but track in roadmap.

### M5. Keyword classifier: `btc` and `eth` substring collision
`keyword-classifier.ts` lines 55-56 adds `btc` and `eth`. These are 3-letter substrings that will match words like "fetch" ("etch" contains "etch" — no, but "etch" is close), "betcha" (contains "btc"? no — "etch" doesn't contain "eth"). Actual risk: "sketch" contains "etch" not "eth". "Fetch" contains "etch" not "eth". Low collision risk in practice BUT still substring-matching. Example of real collision: "meth" (in drug-related news) → CRYPTO. "Bethesda" → CRYPTO. Consider word-boundary match or remove the 3-letter aliases:
```ts
const re = new RegExp(`\\b${kw}\\b`, 'i');
```

### M6. Classifier: CRYPTO must run before TECH to steal crypto+AI articles
Current order is CRYPTO first — correct. Worth a comment explaining intent (article mentioning "AI + crypto" lands CRYPTO). Otherwise future maintainer may reorder.

### M7. Ingest push notification: only sends for `newBreaking[0]`
`app/api/ingest/route.ts` line 68: sends push for the FIRST item in `newBreaking`, which is whichever fetcher returned first (order is rss → x → currents → coingecko → ...). Not necessarily the "most significant" breaking event. Consider ranking by `isBreaking` flag or category priority (e.g., CRYPTO spike > general news). Not a bug, but UX-impacting.

### M8. Article duplicate detection on `url` misses CoinGecko/DeFiLlama
CoinGecko article URL is `https://www.coingecko.com/en/coins/${coin.id}` — SAME url every cycle. Current `upsert` `update: {}` is a no-op, so re-runs silently deduplicate (no new article) but also DON'T update the title/price (which changes each cycle). The push logic at line 57 checks `result.id && category !== "GENERAL"` — upserts always return an id, so EVERY CoinGecko cycle will re-trigger a push for the same stale URL. HIGH UX impact but behaviorally: users get repeated pushes for same URL with stale titles. Promote to HIGH:

**Promote to H6.** Re-classify.

### H6. (Promoted from M8) Duplicate push notifications from stable URLs
Coingecko + DeFiLlama + Binance Futures generate URLs that are identical across cycles (coin-id, protocol-slug, symbol). The ingest route treats every successful upsert as a candidate for breaking push regardless of whether it was newly created. Fix: detect creation via Prisma's `upsert` returning created-vs-updated signal. Prisma doesn't expose this directly; options:
1. Use `prisma.article.findUnique` first, push only if null, then create.
2. Include a unique suffix in url when the event is novel (e.g., timestamp for CoinGecko: `.../bitcoin?t=1730000000`).
3. Gate push by `createdAt === updatedAt` with an explicit timestamp field on the model.
Option 2 is simplest — include event timestamp in url query so same-price re-fetches stay deduped but real price moves generate new rows.

### M9. DeFiLlama: `change_1h`, `change_7d` unused
`DefiLlamaProtocol` interface declares 1h/7d but only 1d is used. YAGNI says fine, but note: if 1d is null and 1h is available, falling back would reduce false negatives on fresh protocols. Minor.

### M10. Binance `MAX_ARTICLES_PER_CYCLE = 5` == SYMBOLS.length
Cap equals array length — cap is a no-op. Either remove the cap or reduce it (e.g., top 3 per cycle) to reduce alert noise.

---

## Low Priority

- L1. `coingecko-price-fetcher.ts` line 83: `$${price.toLocaleString()}` uses default locale on server (varies by region). Pin with `toLocaleString('en-US')` for determinism.
- L2. Ingest route imports are getting long (7 fetchers). Consider a `lib/services/fetchers/index.ts` barrel: `export const ALL_FETCHERS = [fetchRssFeeds, fetchXFeeds, ...]`.
- L3. `crypto-snapshot-store.ts` `metadata: unknown` on return is fine but callers currently don't read metadata. YAGNI — could remove from return type.
- L4. `.env.example` comment "No key needed: ... Binance Futures" — true for REST but note Binance may geo-block (451) from some IPs (Vercel edge in restricted regions). Worth a line.

---

## Edge Cases Found by Scout

### EC1. Etherscan: txs.length=0 but snapshot missing → no snapshot created
`etherscan-whale-fetcher.ts` line 89: only upserts when `txs.length > 0`. If a new whale address has zero txs on first run, no snapshot is created, and next run starts from scratch (lastSeen=0) — benign but means the "dedup by timestamp" only engages after first non-empty batch.

### EC2. Etherscan: `parseInt(tx.timeStamp)` silent fail
If API returns non-numeric string, `parseInt` yields NaN, `Math.max(...[NaN, ...])` = NaN, stored snapshot value = NaN → next run `lastSeen = NaN`, filter `ts > NaN` always false → whale detection silently dies. Add `.filter(Number.isFinite)` before Math.max.

### EC3. BigInt overflow protection OK, but error on malformed value
`BigInt(tx.value)` on line 71/77 throws on malformed input. Wrapped in try/catch at outer level — good, but one bad tx kills the whole batch for that wallet. Consider per-tx try/catch.

### EC4. CoinGecko: `data[coin.id]` can be undefined if CoinGecko renames a coin ID
Handled on line 60 (`if (!priceData) continue`). Good. But upsert loop (line 92-102) also guards — consistent.

### EC5. DeFiLlama: `protocols` payload is large (~3000 entries, multi-MB)
`await res.json()` fully buffers. On serverless this allocates ~5-10MB per call. Memory is fine, but cold-start parsing is ~100-300ms. Consider `api.llama.fi/protocols` only returns what's needed — no filter param available, so acceptable.

### EC6. Binance: first run produces NO alerts (no snapshot)
Line 81: `if (snapshot && ...)` — correct behavior (no baseline → no diff), but means fresh DB runs yield zero crypto articles until 2nd cycle. Already tested per tester report. Document in runbook.

### EC7. Ingest route: fetcher order affects push winner
Per H6 above. First-to-return pushes, not highest-impact.

### EC8. Race: two concurrent ingest cron fires
If Vercel fires cron twice due to retry, both invocations race the same upsert. Prisma `upsert` is atomic per-row — fine. But both may generate different push notifications for the same spike. Low probability, acceptable.

### EC9. Snapshot `metadata: undefined` passes Prisma Json as NULL
`crypto-snapshot-store.ts` line 24-25: `metadata: metadata ?? undefined` — Prisma treats undefined as "do not update", but in create path, it yields NULL (column nullable). Consistent. No bug.

### EC10. Classifier keyword "token" is extremely broad
"authentication token", "CSRF token", "token bucket" — all crypto? Already accepted since it's in the list, but noting that it will pull non-crypto tech articles into CRYPTO.

---

## Positive Observations

- Consistent shape: every fetcher returns `RawArticle[]`, catches errors, returns `[]` on failure.
- `Promise.allSettled` at the ingest boundary isolates fetcher failures.
- `AbortSignal.timeout(8_000)` everywhere prevents indefinite hangs.
- `calcPercentChange` correctly handles negative `oldValue` via `Math.abs`.
- Snapshot store uses `@@unique([source, symbol])` composite for clean upsert semantics.
- Type interfaces declared per API (no `any`).
- Categorization with crypto-first priority is sensible.
- Binance fetcher caps noise with `MAX_ARTICLES_PER_CYCLE` + sort (though cap is a no-op, see M10).
- User-Agent set on CoinGecko (good API etiquette).

---

## Recommended Actions (priority order)

1. **H1** — Migrate Etherscan to V2 endpoint before V1 deprecation.
2. **H6** — Fix duplicate push notifications for stable-URL fetchers (CoinGecko, DeFiLlama, Binance). Highest user-visible impact.
3. **H4** — Parallelize Binance fetcher to avoid Vercel timeout.
4. **H3** — Add drift threshold or batch DB writes in DeFiLlama fetcher.
5. **EC2** — Guard Etherscan `parseInt` for NaN contamination.
6. **M1, M2** — Add logging for dropped errors.
7. **M5** — Word-boundary match for `btc`/`eth` keywords.
8. **M10** — Lower Binance cap or remove.
9. **H5, L4** — Document rate-limit and geo-block in README.

---

## Metrics

- Type Coverage: 100% of new code (no `any`, no `@ts-ignore`)
- Test Coverage: 62/62 passing (per tester report)
- Linting Issues: 0 blocker (tsc warning is for unrelated `debug-crypto/route.js` — not in review scope)
- File size: all files under 200 LOC guideline
- Pattern consistency: matches existing fetchers (x-fetcher, currents-api-client, rss-fetcher)

---

## Unresolved Questions

1. Is there an approved CoinGecko demo API key available to lift rate-limit headroom (H5)?
2. Is the Vercel deployment on Hobby (10s timeout) or Pro (60s) tier? Affects H4 urgency.
3. Should duplicate-push prevention (H6) be solved by URL-versioning or by tracking `createdAt === updatedAt` via new DB field? Prefer URL versioning for zero-migration fix.
4. Whale address list refresh cadence — manual for MVP or future automated discovery?
5. Is Binance Futures geo-block (451) handling required for the target deployment region?
