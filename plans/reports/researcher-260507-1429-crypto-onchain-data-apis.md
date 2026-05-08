# Crypto Onchain/Market Data APIs Research Report

**Date:** 2026-05-07
**Project:** News Tracker - Crypto Data Integration
**Scope:** 5 crypto data sources for Next.js news tracker app
**Target Format:** `RawArticle { url, title, summary, publishedAt, source }`

---

## Executive Summary

Researched 5 crypto data sources for integrating onchain/market alerts into existing news tracker. Current app ingests RSS, X/Twitter, and CurrentsAPI into normalized `RawArticle` format. Goal: add crypto whale transfers, price changes, TVL shifts, and exchange open interest as additional "articles" or alerts.

**Key Finding:** Most sources require paid tiers for production use. Free tiers exist but with significant rate/volume limits. Recommend hybrid approach: free tier for MVP, upgrade to paid for production scale.

---

## 1. Whale Alert API

### Overview
Real-time monitoring of large crypto transfers ($1M+) across blockchains. Specializes in whale wallet activity detection.

### Pricing & Free Tier
- **NO free tier** for production APIs
- **Custom Alerts API:** $29.95/month (7-day free trial)
  - 100 alerts/hour
  - Max 2 concurrent WebSocket connections
- **Enterprise REST API:** $699/month
  - 1000 calls per minute (CPM)
- **Developer API (deprecated):** 10 req/min free, 60 req/min paid
- **Historical Archive:** Free downloadable dataset for backtesting

### Authentication
- API key passed as query parameter: `?api_key=YOUR_API_KEY`
- Separate developer account required (not dashboard account)

### Supported Blockchains
13+ chains: Bitcoin, Ethereum, Tron, Solana, Dogecoin, Litecoin, Ripple, Cardano, Polkadot, Cosmos, Avalanche, Polygon, Arbitrum

### Endpoints & Data Format

**WebSocket (Real-time Alerts)**
```
wss://leviathan.whale-alert.io/ws?api_key=YOUR_API_KEY
```
- Subscribe to whale transfer alerts
- Subscribe to social media posts
- Real-time streaming (no polling needed)

**REST API (Enterprise)**
```
GET /status                          # Supported blockchains
GET /transactions                    # Transaction stream (paginated)
GET /transaction/{hash}              # Specific transaction details
GET /address/{hash}/transactions     # Address history
```

### Example Response (Whale Transfer)
```json
{
  "id": "whale-alert-12345",
  "blockchain": "ethereum",
  "transaction_hash": "0xabc...",
  "from_address": "0x123...",
  "to_address": "0x456...",
  "amount": 1500000,
  "amount_usd": 2850000000,
  "token": "ETH",
  "timestamp": "2026-05-07T14:30:00Z",
  "type": "transfer"
}
```

### Mapping to RawArticle
```typescript
{
  url: `https://whale-alert.io/tx/${tx.transaction_hash}`,
  title: `Whale Alert: ${tx.amount} ${tx.token} transferred (${tx.amount_usd} USD)`,
  summary: `Large transfer from ${tx.from_address.slice(0,6)}... to ${tx.to_address.slice(0,6)}... on ${tx.blockchain}`,
  publishedAt: new Date(tx.timestamp),
  source: "Whale Alert"
}
```

### Webhook vs Polling
- **WebSocket streaming** (preferred): Real-time, no polling overhead
- **REST polling:** Requires manual pagination cursor management
- WebSocket more efficient for high-volume alerts

### Verdict
**Cost:** High for production ($30-700/month)
**Best for:** Whale transfer alerts, high-value transaction monitoring
**Integration Complexity:** Medium (WebSocket handling required)

---

## 2. CoinGecko API

### Overview
Largest independent crypto data aggregator. Covers 18,000+ cryptocurrencies, 600+ categories, 1,000+ exchanges. Provides price, volume, market cap, 24h % change, historical data.

### Pricing & Free Tier
- **Free Tier (v3):**
  - 10-50 calls/minute (rate limit varies)
  - No API key required for public endpoints
  - Limited to basic price/market data
  - No real-time WebSocket

- **Pro API (Analyst Plan):**
  - Higher rate limits (500+ calls/minute)
  - WebSocket real-time streaming (prices, trades, OHLCV)
  - Advanced endpoints
  - Pricing: ~$50-500/month depending on tier

### Authentication
- **Free:** No authentication required
- **Pro:** API key in header: `x-cg-pro-api-key: YOUR_KEY`

### Best Endpoints for "Significant Price Changes"

**Free Tier:**
```
GET /simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true
GET /coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1
GET /coins/{id}/market_chart?vs_currency=usd&days=1  # 24h price history
```

**Pro Tier (WebSocket):**
```
wss://stream.coingecko.com/v1/prices
wss://stream.coingecko.com/v1/trades
wss://stream.coingecko.com/v1/ohlcv
```

### Example Response (Price Data)
```json
{
  "bitcoin": {
    "usd": 42500,
    "usd_market_cap": 835000000000,
    "usd_24h_vol": 28000000000,
    "usd_24h_change": 3.45
  },
  "ethereum": {
    "usd": 2250,
    "usd_market_cap": 270000000000,
    "usd_24h_vol": 12000000000,
    "usd_24h_change": -1.23
  }
}
```

### Detecting Significant Price Changes
**Algorithm (client-side):**
1. Poll `/simple/price` every 5-15 minutes (free tier)
2. Compare current price vs previous snapshot
3. Calculate % change: `((new - old) / old) * 100`
4. Trigger alert if `|% change| > threshold` (e.g., 5%, 10%)
5. Store snapshots in DB to avoid duplicate alerts

**Pro Tier:** Use WebSocket for real-time detection, lower latency

### Rate Limits
- **Free:** 10-50 calls/minute (exact limit undocumented, varies by endpoint)
- **Pro:** 500+ calls/minute depending on plan
- Shared across REST and WebSocket

### Mapping to RawArticle
```typescript
{
  url: `https://www.coingecko.com/en/coins/${coin_id}`,
  title: `${coin_name} price ${direction}: ${old_price} → ${new_price} USD (${change_pct}%)`,
  summary: `24h volume: ${volume_usd}, Market cap: ${market_cap_usd}`,
  publishedAt: new Date(),
  source: "CoinGecko"
}
```

### Verdict
**Cost:** Free tier available, pro tier $50-500/month
**Best for:** Price monitoring, market cap tracking, general crypto metrics
**Integration Complexity:** Low (simple REST, optional WebSocket)
**Recommendation:** Start with free tier for MVP

---

## 3. Etherscan API

### Overview
Blockchain explorer API for Ethereum and 60+ EVM-compatible chains (BSC, Polygon, Arbitrum, Optimism, etc.). Provides smart contract events, token transfers, holder analysis, address labeling.

### Pricing & Free Tier
- **Free Tier:**
  - 5 requests/second (hard limit)
  - 100,000 requests/day
  - Single API key for all chains
  - No authentication required (but API key recommended for higher limits)

- **Pro Tier:**
  - Higher rate limits (20+ req/s)
  - Priority support
  - Pricing: ~$100-1000/month

### Authentication
- API key in query param: `?apikey=YOUR_KEY`
- Free tier works without key but rate-limited

### Supported Chains
- **Ethereum:** etherscan.io
- **BSC:** bscscan.com
- **Polygon:** polygonscan.com
- **Arbitrum:** arbiscan.io
- **Optimism:** optimistic.etherscan.io
- **Avalanche:** snowtrace.io
- **Fantom:** ftmscan.com
- **And 50+ others** (unified API key across all)

### Best Endpoints for Whale/Large Transfer Monitoring

**Token Transfers (ERC-20, ERC-721, ERC-1155):**
```
GET /api?module=account&action=tokentx&address=0x...&startblock=0&endblock=99999999&sort=desc&apikey=KEY
GET /api?module=account&action=token1155tx&address=0x...&apikey=KEY
```

**Internal Transactions (ETH transfers):**
```
GET /api?module=account&action=txlistinternal&address=0x...&startblock=0&endblock=99999999&sort=desc&apikey=KEY
```

**Smart Contract Events (Logs):**
```
GET /api?module=logs&action=getLogs&address=0x...&topic0=0x...&fromBlock=0&toBlock=latest&apikey=KEY
```

**Address Info:**
```
GET /api?module=account&action=balance&address=0x...&apikey=KEY
GET /api?module=account&action=txlist&address=0x...&startblock=0&endblock=99999999&sort=desc&apikey=KEY
```

### Example Response (Token Transfer)
```json
{
  "status": "1",
  "message": "OK",
  "result": [
    {
      "blockNumber": "18500000",
      "timeStamp": "1715000000",
      "hash": "0xabc...",
      "nonce": "123",
      "blockHash": "0x...",
      "from": "0x123...",
      "contractAddress": "0x...",
      "to": "0x456...",
      "value": "1500000000000000000",
      "tokenName": "Ethereum",
      "tokenSymbol": "ETH",
      "tokenDecimal": "18",
      "transactionIndex": "45",
      "gas": "21000",
      "gasPrice": "50000000000",
      "gasUsed": "21000",
      "cumulativeGasUsed": "8500000",
      "input": "0x",
      "confirmations": "100"
    }
  ]
}
```

### Detecting Large Transfers
**Algorithm:**
1. Poll `/api?module=account&action=tokentx&address=WHALE_ADDRESS` every 5 min
2. Filter by `value > threshold` (e.g., 100 ETH, 1M USDC)
3. Normalize decimals: `value / 10^tokenDecimal`
4. Check if transfer is new (not in DB)
5. Create alert

### Rate Limits
- **Free:** 5 req/s, 100k req/day
- **Pro:** 20+ req/s, higher daily limits
- Shared across all chains

### Mapping to RawArticle
```typescript
{
  url: `https://etherscan.io/tx/${tx.hash}`,
  title: `Large ${tx.tokenSymbol} transfer: ${normalized_value} ${tx.tokenSymbol}`,
  summary: `From ${tx.from.slice(0,6)}... to ${tx.to.slice(0,6)}... on ${chain_name}`,
  publishedAt: new Date(parseInt(tx.timeStamp) * 1000),
  source: `Etherscan (${chain_name})`
}
```

### Verdict
**Cost:** Free tier available (5 req/s), pro tier $100-1000/month
**Best for:** Whale transfer monitoring, smart contract events, multi-chain tracking
**Integration Complexity:** Medium (pagination, multi-chain coordination)
**Recommendation:** Excellent for MVP, free tier sufficient for moderate volume

---

## 4. DeFiLlama API

### Overview
Tracks Total Value Locked (TVL) across 1000+ DeFi protocols, 250+ blockchains. Provides protocol rankings, TVL history, yield data.

### Pricing & Free Tier
- **Completely Free**
  - No API key required
  - No documented rate limits (appears unlimited for reasonable use)
  - Open-source data aggregator
  - Community-driven

### Authentication
- None required
- Public endpoints

### Best Endpoints for TVL Change Detection

**Protocol TVL:**
```
GET /api/protocols                    # All protocols with current TVL
GET /api/protocol/{protocol_name}     # Specific protocol TVL history
GET /api/tvl/{protocol_name}          # TVL time series
```

**Chain TVL:**
```
GET /api/chains                       # TVL by chain
GET /api/chain/{chain_name}           # Chain TVL history
```

**Yields:**
```
GET /api/yields                       # Yield opportunities
GET /api/yields/pools                 # Pool-level yields
```

### Example Response (Protocol TVL)
```json
{
  "protocols": [
    {
      "name": "Aave",
      "tvl": 12500000000,
      "change_1h": 0.5,
      "change_1d": 2.3,
      "change_7d": -1.2,
      "chains": ["ethereum", "polygon", "arbitrum"],
      "category": "Lending",
      "url": "https://aave.com"
    },
    {
      "name": "Uniswap",
      "tvl": 5800000000,
      "change_1h": -0.2,
      "change_1d": 1.5,
      "change_7d": 3.1,
      "chains": ["ethereum", "polygon", "arbitrum", "optimism"],
      "category": "DEX",
      "url": "https://uniswap.org"
    }
  ]
}
```

### Detecting Significant TVL Changes
**Algorithm:**
1. Poll `/api/protocols` every 30 min
2. Compare current TVL vs previous snapshot
3. Calculate % change: `((new_tvl - old_tvl) / old_tvl) * 100`
4. Trigger alert if `|% change| > threshold` (e.g., 5%, 10%)
5. Store snapshots in DB

### Data Freshness
- TVL updates: ~5-15 minutes behind real-time
- Historical data: Available for 1+ years
- Suitable for trend detection, not real-time alerts

### Rate Limits
- **Undocumented** but appears unlimited for reasonable use
- Community-driven, no commercial rate limiting
- Recommend: 1 request per 30 minutes per protocol to be respectful

### Mapping to RawArticle
```typescript
{
  url: `https://defillama.com/protocol/${protocol_name}`,
  title: `${protocol_name} TVL ${direction}: $${old_tvl} → $${new_tvl} (${change_pct}%)`,
  summary: `TVL change across ${chains.join(", ")}. Category: ${category}`,
  publishedAt: new Date(),
  source: "DeFiLlama"
}
```

### Verdict
**Cost:** Free
**Best for:** TVL trend monitoring, protocol rankings, long-term DeFi trends
**Integration Complexity:** Low (simple REST)
**Data Freshness:** 5-15 min delay (not real-time)
**Recommendation:** Excellent for MVP, no cost barrier

---

## 5. Open Interest / Positions Data from Top Exchanges

### Overview
Exchanges provide APIs for open interest (OI), long/short ratio, funding rates. Useful for detecting leverage shifts, liquidation risks, market sentiment.

### Exchange Comparison

#### Binance Futures API
**Free Tier:**
- Unlimited requests (no documented rate limit)
- Public market data endpoints
- WebSocket streams available

**Rate Limits:**
- Market data: 1200 requests/minute
- User data: 100 requests/minute
- WebSocket: Unlimited connections

**Key Endpoints:**
```
GET /fapi/v1/openInterest                    # Current OI for symbol
GET /fapi/v1/openInterestHist                # OI history
GET /fapi/v1/fundingRate                     # Funding rates
GET /fapi/v1/fundingRateHist                 # Funding rate history
GET /fapi/v1/longShortRatio                  # Long/short ratio
GET /fapi/v1/topLongShortAccountRatio        # Top trader long/short ratio
GET /fapi/v1/topLongShortPositionRatio       # Top trader position ratio
```

**WebSocket Streams:**
```
wss://fstream.binance.com:9443/ws/btcusdt@openInterest
wss://fstream.binance.com:9443/ws/btcusdt@markPrice
wss://fstream.binance.com:9443/ws/btcusdt@fundingRate
```

**Example Response (Open Interest):**
```json
{
  "openInterest": "10500.123",
  "symbol": "BTCUSDT",
  "time": 1715000000000
}
```

**Example Response (Funding Rate):**
```json
{
  "symbol": "BTCUSDT",
  "fundingRate": "0.00015",
  "fundingTime": 1715000000000
}
```

#### Bybit API
**Free Tier:**
- Unlimited public market data
- WebSocket + REST available

**Rate Limits:**
- Public endpoints: 10 requests/second
- Private endpoints: 5 requests/second

**Key Endpoints:**
```
GET /v5/market/open-interest                 # Open interest
GET /v5/market/funding/history               # Funding rate history
GET /v5/market/tickers                       # Current prices + OI
```

**WebSocket:**
```
wss://stream.bybit.com/v5/public/linear
# Subscribe to: openInterest, fundingRate, tickers
```

#### OKX API
**Free Tier:**
- Public market data endpoints
- Rate limits: 20 requests/second

**Key Endpoints:**
```
GET /api/v5/public/open-interest             # Open interest
GET /api/v5/public/funding-rate              # Funding rates
GET /api/v5/market/tickers                   # Market data
```

**Authentication:**
- Public endpoints: No auth
- Private endpoints: HMAC-SHA256 signature required

#### Bitget API
**Free Tier:**
- Public market data
- Rate limits: 10 requests/second

**Key Endpoints:**
```
GET /mix/v1/market/open-interest             # Open interest
GET /mix/v1/market/funding-rate              # Funding rates
```

### Detecting Significant OI Changes
**Algorithm:**
1. Poll `/fapi/v1/openInterest` every 5-15 min for major symbols (BTC, ETH)
2. Compare current OI vs previous snapshot
3. Calculate % change: `((new_oi - old_oi) / old_oi) * 100`
4. Trigger alert if `|% change| > threshold` (e.g., 10%, 20%)
5. Combine with funding rate: if OI ↑ + funding rate ↑ = bullish leverage
6. Store snapshots in DB

**Funding Rate Interpretation:**
- Positive funding: Longs paying shorts (bullish sentiment)
- Negative funding: Shorts paying longs (bearish sentiment)
- Extreme funding (>0.1%): Potential liquidation risk

### Mapping to RawArticle
```typescript
{
  url: `https://www.binance.com/en/futures/${symbol}`,
  title: `${symbol} Open Interest ${direction}: ${old_oi} → ${new_oi} (${change_pct}%)`,
  summary: `Funding rate: ${funding_rate}%. Long/Short ratio: ${long_short_ratio}. ${sentiment}`,
  publishedAt: new Date(),
  source: `Binance Futures`
}
```

### Verdict
**Cost:** Free (all major exchanges)
**Best for:** Leverage sentiment, liquidation risk detection, market structure analysis
**Integration Complexity:** Medium (multiple exchanges, data normalization)
**Data Freshness:** Real-time (WebSocket) or 5-15 min (REST polling)
**Recommendation:** Excellent for MVP, combine Binance + Bybit for coverage

---

## Integration Architecture Recommendation

### Proposed Data Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    Crypto Data Sources                       │
├─────────────────────────────────────────────────────────────┤
│ • Whale Alert (WebSocket)                                   │
│ • CoinGecko (REST polling)                                  │
│ • Etherscan (REST polling, multi-chain)                     │
│ • DeFiLlama (REST polling)                                  │
│ • Binance/Bybit (REST polling + WebSocket)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  Normalization Layer       │
        │  (RawArticle format)       │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  Deduplication & Filtering │
        │  (DB snapshots)            │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  Article Storage (Prisma)  │
        │  + Push Notifications      │
        └────────────────────────────┘
```

### Recommended MVP Stack (Free Tier)

| Source | Endpoint | Polling Interval | Cost | Priority |
|--------|----------|------------------|------|----------|
| CoinGecko | `/simple/price` | 15 min | Free | High |
| Etherscan | `/api?module=account&action=tokentx` | 10 min | Free | High |
| DeFiLlama | `/api/protocols` | 30 min | Free | Medium |
| Binance | `/fapi/v1/openInterest` | 15 min | Free | Medium |
| Whale Alert | WebSocket (trial) | Real-time | $30/mo | Low (paid) |

### Implementation Steps

1. **Create crypto data fetchers** (parallel to existing RSS/X/CurrentsAPI):
   - `lib/services/coingecko-client.ts`
   - `lib/services/etherscan-client.ts`
   - `lib/services/defillama-client.ts`
   - `lib/services/binance-futures-client.ts`

2. **Extend RawArticle format** (optional):
   - Add `dataType: "whale" | "price" | "tvl" | "oi"` field
   - Add `metadata: { oldValue, newValue, changePercent }` for tracking

3. **Update ingest endpoint** (`app/api/ingest/route.ts`):
   - Add crypto fetchers to `Promise.allSettled()`
   - Normalize all sources to RawArticle
   - Classify as "CRYPTO" category

4. **Add snapshot storage** (for deduplication):
   - Create `CryptoSnapshot` table in Prisma
   - Store `{ source, symbol, value, timestamp }`
   - Query before creating alert to avoid duplicates

5. **Implement threshold detection**:
   - Store configurable thresholds per source
   - Calculate % change vs previous snapshot
   - Trigger alert only if threshold exceeded

---

## Unresolved Questions

1. **Whale Alert WebSocket:** Does 7-day trial provide full WebSocket access, or limited to REST?
2. **CoinGecko free tier exact limits:** Documentation unclear on exact rate limit (10 vs 50 calls/min)
3. **Etherscan multi-chain:** Can single API key be used across all 60+ chains simultaneously, or per-chain rate limits?
4. **DeFiLlama rate limits:** No documented limits; what's the practical threshold before being rate-limited?
5. **Binance OI history depth:** How far back does `/fapi/v1/openInterestHist` return data?
6. **Exchange funding rate frequency:** How often do Binance/Bybit update funding rates (hourly, 8-hourly)?

---

## Recommendations

### For MVP (Week 1-2)
- Start with **CoinGecko** (free, simple) + **Etherscan** (free, multi-chain)
- Implement basic polling + snapshot deduplication
- Test with 2-3 major symbols (BTC, ETH, USDC)
- Cost: $0

### For Beta (Week 3-4)
- Add **DeFiLlama** (free, TVL trends)
- Add **Binance Futures** (free, OI sentiment)
- Implement threshold-based alerts
- Cost: $0

### For Production (Month 2+)
- Evaluate **Whale Alert** ($30/mo) for real-time whale transfers
- Consider **CoinGecko Pro** ($50-500/mo) for WebSocket real-time prices
- Upgrade **Etherscan** to pro tier if hitting rate limits
- Cost: $80-530/month

### Architecture Notes
- Keep crypto fetchers modular (separate from existing RSS/X/CurrentsAPI)
- Use same `RawArticle` format for consistency
- Add `source` field to distinguish crypto alerts from news
- Consider separate "Crypto Alerts" category in UI
- Implement exponential backoff for rate limit handling
