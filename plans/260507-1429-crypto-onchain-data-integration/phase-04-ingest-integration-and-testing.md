# Phase 4: Ingest Route Integration + Testing

## Context
- [Plan overview](./plan.md)
- Ingest route: `app/api/ingest/route.ts`
- Keyword classifier: `lib/utils/keyword-classifier.ts`
- Depends on: [Phase 1](./phase-01-schema-and-snapshot-storage.md), [Phase 2](./phase-02-coingecko-etherscan-fetchers.md), [Phase 3](./phase-03-defillama-binance-fetchers.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 1.5h

Wire all 4 crypto fetchers into the existing ingest pipeline, update keyword classifier with new crypto-specific terms, add env var documentation, and write unit tests.

## Key Insights
- Ingest route already uses `Promise.allSettled()` — adding more fetchers is trivial
- All crypto articles will naturally classify as CRYPTO via existing keyword-classifier (titles contain "ETH", "BTC", "DeFi", etc.)
- Adding a few more keywords to classifier improves coverage for edge cases ("TVL", "open interest", "funding rate")
- Tests should mock `fetch` and `prisma` to avoid real API calls

---

## Part 1: Wire Fetchers into Ingest Route

### File to Modify: `app/api/ingest/route.ts`

### Changes
1. Import 4 new fetchers at top
2. Add them to the `Promise.allSettled()` array
3. Spread results into the `all` array

### Before (lines 19-29)
```typescript
const [rssResult, xResult, currentsResult] = await Promise.allSettled([
  fetchRssFeeds(),
  fetchXFeeds(),
  fetchCurrentsApi(),
]);

const all: RawArticle[] = [
  ...(rssResult.status === "fulfilled" ? rssResult.value : []),
  ...(xResult.status === "fulfilled" ? xResult.value : []),
  ...(currentsResult.status === "fulfilled" ? currentsResult.value : []),
];
```

### After
```typescript
const [
  rssResult, xResult, currentsResult,
  coinGeckoResult, etherscanResult, defiLlamaResult, binanceResult,
] = await Promise.allSettled([
  fetchRssFeeds(),
  fetchXFeeds(),
  fetchCurrentsApi(),
  fetchCoinGeckoPrices(),
  fetchEtherscanWhaleTransfers(),
  fetchDefiLlamaTvl(),
  fetchBinanceFuturesData(),
]);

const all: RawArticle[] = [
  ...(rssResult.status === "fulfilled" ? rssResult.value : []),
  ...(xResult.status === "fulfilled" ? xResult.value : []),
  ...(currentsResult.status === "fulfilled" ? currentsResult.value : []),
  ...(coinGeckoResult.status === "fulfilled" ? coinGeckoResult.value : []),
  ...(etherscanResult.status === "fulfilled" ? etherscanResult.value : []),
  ...(defiLlamaResult.status === "fulfilled" ? defiLlamaResult.value : []),
  ...(binanceResult.status === "fulfilled" ? binanceResult.value : []),
];
```

### Imports to Add
```typescript
import { fetchCoinGeckoPrices } from "@/lib/services/coingecko-price-fetcher";
import { fetchEtherscanWhaleTransfers } from "@/lib/services/etherscan-whale-fetcher";
import { fetchDefiLlamaTvl } from "@/lib/services/defillama-tvl-fetcher";
import { fetchBinanceFuturesData } from "@/lib/services/binance-futures-fetcher";
```

---

## Part 2: Update Keyword Classifier

### File to Modify: `lib/utils/keyword-classifier.ts`

### Add to CRYPTO_KEYWORDS array
```typescript
// Onchain/market data terms
"whale",
"tvl",
"open interest",
"funding rate",
"liquidation",
"defillama",
"etherscan",
"coingecko",
"transfer",
"onchain",
"on-chain",
```

These ensure auto-generated article titles (e.g. "BTCUSDT Open Interest up 15%") correctly classify as CRYPTO even if they don't contain existing keywords.

---

## Part 3: Environment Variables

### File to Modify: `.env.example` (or create if not exists)

### Add
```bash
# Crypto data sources (Phase: crypto-onchain-data-integration)
ETHERSCAN_API_KEY=        # Free: https://etherscan.io/apis → register
# No key needed: CoinGecko (free v3), DeFiLlama, Binance Futures
```

### Vercel Dashboard
Add `ETHERSCAN_API_KEY` to Vercel environment variables for production.

---

## Part 4: Update README

### File to Modify: `README.md`

### Add to env table
| `ETHERSCAN_API_KEY` | Etherscan API key for whale tracking | [etherscan.io](https://etherscan.io/apis) - free registration |

### Add to "Nguon tin" section
```
- CoinGecko (Price alerts for top coins)
- Etherscan (Whale transfer monitoring)
- DeFiLlama (DeFi TVL changes)
- Binance Futures (Open Interest + funding rates)
```

---

## Part 5: Unit Tests

### Files to Create
- `__tests__/coingecko-price-fetcher.test.ts`
- `__tests__/etherscan-whale-fetcher.test.ts`
- `__tests__/defillama-tvl-fetcher.test.ts`
- `__tests__/binance-futures-fetcher.test.ts`
- `__tests__/crypto-snapshot-store.test.ts`

### Test Strategy
- Mock `global.fetch` with `vi.fn()` to return canned API responses
- Mock `@/lib/db` prisma client for snapshot operations
- Test each fetcher independently

### Test Cases per Fetcher

**coingecko-price-fetcher.test.ts:**
- returns articles when 24h change exceeds 5%
- returns empty array when all changes below threshold
- returns empty array on API error (non-200 status)
- returns empty array on network timeout
- generates correct RawArticle shape (url, title, summary, publishedAt, source)

**etherscan-whale-fetcher.test.ts:**
- returns empty array when ETHERSCAN_API_KEY not set
- returns articles for transfers > 100 ETH
- skips transfers < 100 ETH
- deduplicates against snapshot timestamp
- returns empty array on API error

**defillama-tvl-fetcher.test.ts:**
- returns articles for protocols with >10% daily change
- filters out protocols with TVL < $500M
- caps output at 5 articles
- returns empty array on API error

**binance-futures-fetcher.test.ts:**
- returns articles when OI change exceeds 10%
- includes funding rate context when available
- returns empty array on API error (451 geo-block)
- returns empty array when all OI changes below threshold

**crypto-snapshot-store.test.ts:**
- getSnapshot returns null for non-existent key
- upsertSnapshot creates new record
- upsertSnapshot updates existing record
- calcPercentChange returns correct values
- calcPercentChange handles zero division

---

## Implementation Steps

1. Modify `app/api/ingest/route.ts` — add imports and wire fetchers
2. Modify `lib/utils/keyword-classifier.ts` — add new crypto keywords
3. Update `.env.example` — add `ETHERSCAN_API_KEY`
4. Update `README.md` — add new data sources and env var
5. Create test files (5 files)
6. Run `npm test` — verify all pass
7. Run `npm run build` — verify no compile errors
8. Run `npm run lint` — fix any lint issues
9. Manual test: `curl "http://localhost:3000/api/ingest?secret=<CRON_SECRET>"`
10. Verify new articles appear in DB with CRYPTO category

## Todo List
- [ ] Wire 4 fetchers into `app/api/ingest/route.ts`
- [ ] Add crypto keywords to `lib/utils/keyword-classifier.ts`
- [ ] Update `.env.example` with `ETHERSCAN_API_KEY`
- [ ] Update `README.md` with new data sources
- [ ] Create unit tests for all 4 fetchers + snapshot store
- [ ] Run `npm test` — all pass
- [ ] Run `npm run build` — no errors
- [ ] Manual integration test via ingest endpoint

## Success Criteria
- Ingest endpoint calls all 7 fetchers via `Promise.allSettled()`
- Crypto data articles appear in DB with `category: CRYPTO`
- Build succeeds with no errors
- All unit tests pass
- Failure of any single crypto fetcher does not break overall ingestion
- README documents new env vars and data sources

## Risk Assessment
- **Ingest timeout:** 7 fetchers running in parallel via `Promise.allSettled()`. Each has 8s timeout. Total wall-clock time is max of all, not sum. Should stay under Vercel 10s. If close, reduce individual timeouts to 6s.
- **DB write volume:** Crypto fetchers produce max ~20 articles per cycle (5 CoinGecko + 3 Etherscan + 5 DeFiLlama + 5 Binance). Upsert handles duplicates. No risk.
- **Push notification spam:** All crypto articles are non-GENERAL, so they trigger push. The existing push logic only sends for `newBreaking[0]` (first article). No spam risk.

## Security Considerations
- `ETHERSCAN_API_KEY` must be in Vercel env vars, not committed to repo
- `.env.example` contains placeholder only, no real keys
- Verify `.gitignore` includes `.env.local`

## Next Steps
- After this phase, feature is complete for MVP
- Future enhancements: configurable thresholds via UI, more whale addresses, WebSocket for real-time alerts
