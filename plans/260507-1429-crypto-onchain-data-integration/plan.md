---
title: "Crypto Onchain/Market Data Integration"
description: "Add whale movements, price alerts, ETH events, DeFi TVL, and exchange OI data as RawArticle feeds"
status: pending
priority: P1
effort: 8h
branch: main
tags: [crypto, onchain, market-data, fetchers, prisma]
created: 2026-05-07
---

# Crypto Onchain/Market Data Integration

## Goal
Integrate 4 free crypto data sources into existing news ingestion pipeline. Each source produces `RawArticle[]`, matching existing fetcher pattern (x-fetcher, rss-fetcher, currents-api-client).

## Data Sources (All Free)

| # | Source | Data | Polling | Phase |
|---|--------|------|---------|-------|
| 1 | CoinGecko (free v3) | Price + market cap changes | 15 min | 1 |
| 2 | Etherscan (free) | Large ETH/token transfers | 10 min | 1 |
| 3 | DeFiLlama (free) | Protocol TVL changes | 30 min | 2 |
| 4 | Binance Futures (free) | OI, funding rates, long/short | 15 min | 2 |

**Note:** Whale Alert skipped for MVP (requires $30/mo minimum).

## Phases

| Phase | Description | Status | Effort |
|-------|-------------|--------|--------|
| [Phase 1](./phase-01-schema-and-snapshot-storage.md) | Prisma schema + snapshot table | pending | 1h |
| [Phase 2](./phase-02-coingecko-etherscan-fetchers.md) | CoinGecko + Etherscan fetchers | pending | 3h |
| [Phase 3](./phase-03-defillama-binance-fetchers.md) | DeFiLlama + Binance fetchers | pending | 2.5h |
| [Phase 4](./phase-04-ingest-integration-and-testing.md) | Wire into ingest route + tests | pending | 1.5h |

## Key Design Decisions
- No new `RawArticle` fields -- reuse existing interface as-is
- All crypto alerts auto-classified as `CRYPTO` category via keyword-classifier (already has keywords)
- `CryptoSnapshot` table stores previous values for change detection + dedup
- Fetchers gracefully return `[]` when API key missing (Etherscan) or on errors
- All HTTP calls use `AbortSignal.timeout(8_000)` (under Vercel 10s limit)
- Cron remains at current schedule; crypto fetchers added to `Promise.allSettled()`

## Dependencies
- No new npm packages required (all REST APIs via native `fetch`)
- Etherscan API key (free) stored in `ETHERSCAN_API_KEY` env var
- CoinGecko, DeFiLlama, Binance: no API key needed

## Research Report
[Researcher report](../reports/researcher-260507-1429-crypto-onchain-data-apis.md)
