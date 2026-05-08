# Phase 2: CoinGecko + Etherscan Fetchers

## Context
- [Plan overview](./plan.md)
- [Research report](../reports/researcher-260507-1429-crypto-onchain-data-apis.md)
- Pattern reference: `lib/services/currents-api-client.ts`, `lib/services/x-fetcher.ts`
- Depends on: [Phase 1](./phase-01-schema-and-snapshot-storage.md) (snapshot store)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 3h

Create two fetcher services that poll free APIs, detect significant changes vs stored snapshots, and return `RawArticle[]`.

## Key Insights
- CoinGecko free tier: no API key, ~30 calls/min, single call to `/simple/price` covers multiple coins
- Etherscan free tier: needs API key (free registration), 5 req/s, 100k req/day
- Both fit comfortably within Vercel 10s function timeout using `AbortSignal.timeout(8_000)`
- Existing keyword-classifier already has "bitcoin", "ethereum", "crypto", "defi" etc. -- all generated articles will auto-classify as CRYPTO

## Requirements

### Functional
- CoinGecko: detect price changes >5% (24h) for top coins; generate 1 article per significant mover
- Etherscan: detect large ETH transfers (>100 ETH) from monitored whale addresses; generate 1 article per transfer

### Non-Functional
- Graceful degradation: return `[]` on API errors or missing env vars
- HTTP timeout: 8s max per external call
- No new npm dependencies

---

## File 1: `lib/services/coingecko-price-fetcher.ts`

### Architecture
```
CoinGecko /simple/price (1 call, multiple coins)
  → Compare each coin's 24h_change against ±5% threshold
  → Compare current price vs snapshot for additional 1h spike detection
  → Upsert snapshot
  → Return RawArticle[] for significant movers
```

### Monitored Coins (MVP)
```typescript
const COINS = ["bitcoin", "ethereum", "solana", "ripple", "cardano", "dogecoin"];
```

### Endpoint
```
GET https://api.coingecko.com/api/v3/simple/price
  ?ids=bitcoin,ethereum,solana,ripple,cardano,dogecoin
  &vs_currencies=usd
  &include_24hr_change=true
  &include_24hr_vol=true
  &include_market_cap=true
```
Single call returns all coins. No pagination needed.

### Thresholds
| Condition | Threshold | Rationale |
|-----------|-----------|-----------|
| 24h change (from API response) | abs > 5% | Filters normal volatility |
| Snapshot delta (current vs last stored price) | abs > 3% | Catches intra-cycle spikes |

### RawArticle Mapping
```typescript
{
  url: `https://www.coingecko.com/en/coins/${coinId}`,
  title: `${coinName} ${direction} ${changePct}% — now $${price.toLocaleString()}`,
  summary: `24h vol: $${vol}. Market cap: $${mcap}.`,
  publishedAt: new Date(),
  source: "CoinGecko",
}
```

### Implementation Steps
1. Export `fetchCoinGeckoPrices(): Promise<RawArticle[]>`
2. Call `/simple/price` with `AbortSignal.timeout(8_000)`
3. For each coin, check if `usd_24h_change` exceeds threshold
4. Also call `getSnapshot("coingecko", coinId)` and compare current price vs stored
5. If either threshold exceeded, push article to results
6. `upsertSnapshot("coingecko", coinId, currentPrice, { vol, mcap })` for all coins
7. Return results
8. Wrap entire body in try/catch, return `[]` on failure

### Error Handling
- API returns 429 (rate limit): log warning, return `[]`
- API returns non-200: log status, return `[]`
- JSON parse failure: catch, return `[]`

---

## File 2: `lib/services/etherscan-whale-fetcher.ts`

### Architecture
```
Etherscan /api?module=account&action=txlist (per whale address)
  → Filter transactions with value > 100 ETH (in wei)
  → Deduplicate against snapshot store (store last seen tx hash)
  → Return RawArticle[] for new large transfers
```

### Monitored Addresses (MVP — well-known whale/exchange wallets)
```typescript
const WHALE_ADDRESSES = [
  { address: "0x00000000219ab540356cbb839cbe05303d7705fa", label: "ETH2 Deposit" },
  { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", label: "WETH Contract" },
  { address: "0x28C6c06298d514Db089934071355E5743bf21d60", label: "Binance Hot Wallet" },
];
```

### Endpoints (2 calls per address max)
```
GET https://api.etherscan.io/api
  ?module=account
  &action=txlist
  &address={ADDR}
  &startblock=0
  &endblock=99999999
  &page=1
  &offset=10
  &sort=desc
  &apikey={KEY}
```
- `offset=10`: only fetch 10 most recent txs per address
- 3 addresses x 1 call = 3 API calls total per cycle (well within 5 req/s)

### Thresholds
| Condition | Threshold | Rationale |
|-----------|-----------|-----------|
| ETH value | > 100 ETH (100e18 wei) | Filters small transfers |

### Deduplication Strategy
- Snapshot key: `("etherscan", address)`
- Snapshot value: timestamp of most recent processed tx
- On each cycle: only process txs with `timeStamp` > stored value
- After processing: upsert snapshot with latest tx timestamp

### RawArticle Mapping
```typescript
{
  url: `https://etherscan.io/tx/${tx.hash}`,
  title: `Whale Transfer: ${ethValue} ETH ($${usdEstimate}) — ${label}`,
  summary: `From ${tx.from.slice(0,8)}... to ${tx.to.slice(0,8)}...`,
  publishedAt: new Date(parseInt(tx.timeStamp) * 1000),
  source: "Etherscan",
}
```

**USD estimate:** Use a hardcoded approximate ETH price or skip USD. For MVP, just show ETH amount. Avoids extra API call.

### Implementation Steps
1. Export `fetchEtherscanWhaleTransfers(): Promise<RawArticle[]>`
2. Check `process.env.ETHERSCAN_API_KEY` — return `[]` if missing
3. For each whale address:
   a. Fetch 10 most recent txs via Etherscan API
   b. Get snapshot for dedup timestamp
   c. Filter txs: `value > 100e18` AND `timeStamp > lastSeen`
   d. Map qualifying txs to `RawArticle`
   e. Upsert snapshot with latest tx timestamp
4. Wrap each address in try/catch (skip failures, continue others)
5. Return combined results

### Rate Limit Management
- 3 addresses x 1 call = 3 calls per cycle
- Etherscan free tier: 5 req/s — no issue
- Add small delay (200ms) between calls as courtesy

### Error Handling
- Missing API key: return `[]` silently (same pattern as x-fetcher.ts)
- API error responses (status "0"): log, skip that address
- Network timeout: caught by AbortSignal

---

## Related Code Files

### Files to Create
- `lib/services/coingecko-price-fetcher.ts` (~80 lines)
- `lib/services/etherscan-whale-fetcher.ts` (~100 lines)

### Files Modified
- None in this phase (wiring happens in Phase 4)

## Todo List
- [ ] Create `lib/services/coingecko-price-fetcher.ts`
- [ ] Create `lib/services/etherscan-whale-fetcher.ts`
- [ ] Manually test each fetcher in isolation (import + call in a scratch script)
- [ ] Verify both return valid `RawArticle[]` arrays

## Success Criteria
- `fetchCoinGeckoPrices()` returns articles for coins with >5% 24h change
- `fetchEtherscanWhaleTransfers()` returns articles for >100 ETH transfers
- Both return `[]` gracefully when APIs are unreachable or keys missing
- Both complete within 8s
- No new npm dependencies added

## Risk Assessment
- **CoinGecko rate limit:** Free tier is 10-30 calls/min. We make 1 call per cycle. No risk.
- **Etherscan rate limit:** 5 req/s, we make 3. No risk.
- **CoinGecko IP ban:** Possible if many Vercel functions share IP. Mitigation: respect rate limits, add User-Agent header.
- **Etherscan data lag:** Txs may take 1-2 blocks to appear. Acceptable for cron-based ingestion.

## Security Considerations
- `ETHERSCAN_API_KEY` stored in env vars, never logged or exposed in responses
- No user-supplied input reaches API calls (addresses are hardcoded)

## Next Steps
- Phase 3 adds DeFiLlama + Binance fetchers (independent, can start after Phase 1)
- Phase 4 wires all fetchers into ingest route
