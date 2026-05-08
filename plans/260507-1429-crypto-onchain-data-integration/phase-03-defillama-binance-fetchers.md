# Phase 3: DeFiLlama + Binance Futures Fetchers

## Context
- [Plan overview](./plan.md)
- [Research report](../reports/researcher-260507-1429-crypto-onchain-data-apis.md)
- Pattern reference: `lib/services/currents-api-client.ts`
- Depends on: [Phase 1](./phase-01-schema-and-snapshot-storage.md) (snapshot store)

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 2.5h

Create two more fetcher services for DeFi TVL tracking and exchange open interest / funding rate monitoring. Both APIs are completely free with no API key required.

## Key Insights
- DeFiLlama: fully free, no auth, response includes `change_1d` field so we don't always need snapshot comparison
- Binance Futures: public market data endpoints, no auth, generous rate limits (1200 req/min)
- Both sources add unique signal types not covered by news RSS or price feeds
- Funding rate is available every 8 hours on Binance; OI updates continuously

---

## File 1: `lib/services/defillama-tvl-fetcher.ts`

### Architecture
```
DeFiLlama /api/protocols (1 call, returns all protocols)
  → Filter top N protocols by TVL
  → Check change_1d field for significant movements
  → Compare vs snapshot for inter-cycle detection
  → Return RawArticle[] for significant TVL shifts
```

### Endpoint
```
GET https://api.llama.fi/protocols
```
Single call returns all 1000+ protocols. No pagination, no auth.

### Filtering Strategy (avoid noise)
1. From response, take only protocols with `tvl > $500M` (top ~30-50 protocols)
2. Check `change_1d` field (provided by API) for abs > 10%
3. Additionally compare current `tvl` vs snapshot for inter-cycle changes > 5%
4. Cap output at 5 articles max per cycle to avoid flooding feed

### Monitored Protocols (dynamic, not hardcoded)
Rather than hardcoding protocol names, filter the full list by TVL threshold. This is self-maintaining as protocols grow/shrink.

### Thresholds
| Condition | Threshold | Rationale |
|-----------|-----------|-----------|
| API `change_1d` | abs > 10% | Large daily TVL swing |
| Snapshot delta (current vs stored) | abs > 5% | Catches intra-day movement between cron cycles |
| Minimum TVL | $500M | Ignore small protocols |
| Max articles per cycle | 5 | Prevent feed flooding |

### RawArticle Mapping
```typescript
{
  url: `https://defillama.com/protocol/${protocol.slug}`,
  title: `${protocol.name} TVL ${direction} ${changePct}% — now $${tvlFormatted}`,
  summary: `Category: ${protocol.category}. Chains: ${protocol.chains?.slice(0,3).join(", ")}.`,
  publishedAt: new Date(),
  source: "DeFiLlama",
}
```

### Implementation Steps
1. Export `fetchDefiLlamaTvl(): Promise<RawArticle[]>`
2. Fetch `https://api.llama.fi/protocols` with `AbortSignal.timeout(8_000)`
3. Filter: `protocol.tvl > 500_000_000`
4. For each qualifying protocol:
   a. Check `change_1d` > 10% threshold
   b. Get snapshot `("defillama", protocol.slug)`, compare vs current tvl
   c. If either threshold met, create article
   d. Upsert snapshot with current tvl
5. Sort results by abs(change), take top 5
6. Return results; wrap in try/catch, return `[]` on failure

### Response Shape (relevant fields only)
```typescript
interface DefiLlamaProtocol {
  name: string;
  slug: string;
  tvl: number;
  change_1h: number | null;
  change_1d: number | null;
  change_7d: number | null;
  chains: string[];
  category: string;
}
```

### Error Handling
- API down: return `[]`
- Malformed response: catch JSON parse error, return `[]`
- No significant changes: return `[]` (normal case most cycles)

---

## File 2: `lib/services/binance-futures-fetcher.ts`

### Architecture
```
Binance /fapi/v1/ticker/24hr (1 call, returns all symbols)
  → Extract OI + price change for monitored symbols
  → Compare OI vs snapshot for significant shifts
  → Fetch funding rate for context (1 additional call)
  → Return RawArticle[] for significant OI movements
```

### Endpoints
```
# 1) All futures tickers (includes OI approximation via quoteVolume)
GET https://fapi.binance.com/fapi/v1/ticker/24hr

# 2) Open Interest for specific symbol
GET https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT

# 3) Funding rate (latest)
GET https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1
```

### Strategy: Minimize API Calls
- Call `/fapi/v1/openInterest` for each monitored symbol (5 symbols = 5 calls)
- Call `/fapi/v1/fundingRate` only for symbols where OI change is significant (0-5 calls)
- Total: 5-10 calls per cycle. Well within 1200 req/min.

### Monitored Symbols (MVP)
```typescript
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT"];
```

### Thresholds
| Condition | Threshold | Rationale |
|-----------|-----------|-----------|
| OI change vs snapshot | abs > 10% | Significant positioning shift |
| Funding rate | abs > 0.05% (0.0005) | Extreme funding = liquidation risk |
| Max articles per cycle | 5 | Prevent flooding |

### Funding Rate Interpretation (for summary text)
```
rate > 0.03%  → "Extremely bullish leverage — liquidation risk for longs"
rate > 0.01%  → "Bullish sentiment — longs paying shorts"
rate > -0.01% → "Neutral funding"
rate > -0.03% → "Bearish sentiment — shorts paying longs"
rate <= -0.03% → "Extremely bearish leverage — liquidation risk for shorts"
```

### RawArticle Mapping
```typescript
{
  url: `https://www.binance.com/en/futures/${symbol}`,
  title: `${symbol} Open Interest ${direction} ${changePct}% — Funding: ${fundingRate}%`,
  summary: `OI: ${oiFormatted}. ${sentimentText}. Current price: $${price}.`,
  publishedAt: new Date(),
  source: "Binance Futures",
}
```

### Implementation Steps
1. Export `fetchBinanceFuturesData(): Promise<RawArticle[]>`
2. For each symbol in SYMBOLS:
   a. Fetch `/fapi/v1/openInterest?symbol=${symbol}` with 8s timeout
   b. Get snapshot `("binance", symbol)`
   c. Compute OI % change vs snapshot
   d. If OI change > threshold, fetch `/fapi/v1/fundingRate?symbol=${symbol}&limit=1`
   e. Build article with OI + funding context
   f. Upsert snapshot with current OI value and funding rate in metadata
3. Return results array; try/catch per symbol, skip failures
4. Outer try/catch returns `[]` on total failure

### Response Shapes
```typescript
// /fapi/v1/openInterest
interface BinanceOI {
  openInterest: string; // e.g. "10500.123"
  symbol: string;
  time: number;
}

// /fapi/v1/fundingRate
interface BinanceFundingRate {
  symbol: string;
  fundingRate: string; // e.g. "0.00015"
  fundingTime: number;
}
```

### Rate Limit Management
- 5 OI calls + up to 5 funding calls = max 10 calls per cycle
- Binance limit: 1200 req/min. No risk.
- No auth required for public market data endpoints

### Error Handling
- Binance returns HTTP 451 in restricted regions: return `[]` with console warning
- Symbol delisted: individual try/catch skips it
- Rate limit (HTTP 429): return `[]`, log warning

---

## Related Code Files

### Files to Create
- `lib/services/defillama-tvl-fetcher.ts` (~80 lines)
- `lib/services/binance-futures-fetcher.ts` (~120 lines)

### Files Modified
- None (wiring in Phase 4)

## Todo List
- [ ] Create `lib/services/defillama-tvl-fetcher.ts`
- [ ] Create `lib/services/binance-futures-fetcher.ts`
- [ ] Test DeFiLlama fetcher in isolation
- [ ] Test Binance fetcher in isolation
- [ ] Verify both return valid `RawArticle[]`

## Success Criteria
- `fetchDefiLlamaTvl()` returns articles for protocols with >10% daily TVL change
- `fetchBinanceFuturesData()` returns articles for symbols with >10% OI change
- Both return `[]` gracefully on errors
- Both complete within 8s
- No new npm dependencies

## Risk Assessment
- **DeFiLlama large response:** `/protocols` returns ~500KB JSON. Parses fine within 8s timeout.
- **Binance geo-restrictions:** Some regions block Binance API. Vercel US regions should work. If blocked, fetcher returns `[]` gracefully.
- **Binance futures data:** OI can be volatile during liquidation cascades, may generate many alerts. Mitigated by max 5 articles cap.

## Security Considerations
- No API keys needed for either service
- No user input reaches API calls
- Binance data is public market data, no auth tokens involved

## Next Steps
- Phase 4 wires all 4 fetchers into the ingest route
