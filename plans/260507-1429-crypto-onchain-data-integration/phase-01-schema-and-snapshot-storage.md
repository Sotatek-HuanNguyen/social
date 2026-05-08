# Phase 1: Prisma Schema + Snapshot Storage

## Context
- [Plan overview](./plan.md)
- [Research report](../reports/researcher-260507-1429-crypto-onchain-data-apis.md)
- Schema: `prisma/schema.prisma`

## Overview
- **Priority:** P1 (blocks all other phases)
- **Status:** pending
- **Effort:** 1h

Add a `CryptoSnapshot` table to store previous data points for change detection and deduplication. Without snapshots, fetchers cannot determine whether a price change or TVL shift is "significant" since the app only runs via cron (no persistent in-memory state on Vercel).

## Key Insights
- Vercel serverless = no in-memory state between invocations; must persist snapshots in DB
- Snapshots serve dual purpose: change detection AND dedup (prevent re-alerting same movement)
- Single table covers all 4 data sources via `source` + `symbol` composite key
- Keep schema minimal; store raw numeric `value` -- interpretation lives in fetcher logic

## Requirements

### Functional
- Store last-known value per (source, symbol) pair
- Upsert on each fetch cycle
- Query previous value to compute % change

### Non-Functional
- Fast lookups by (source, symbol) -- composite unique index
- Minimal storage footprint

## Architecture

```
CryptoSnapshot
├── id         (uuid, PK)
├── source     (string) — "coingecko" | "etherscan" | "defillama" | "binance"
├── symbol     (string) — "BTC", "ETH", "aave", "BTCUSDT"
├── value      (float)  — price, TVL, OI, transfer amount
├── metadata   (json?)  — extra context (funding rate, volume, etc.)
├── updatedAt  (datetime, auto)
└── @@unique([source, symbol])
```

## Related Code Files

### Files to Modify
- `prisma/schema.prisma` — add `CryptoSnapshot` model

### Files to Create
- `lib/services/crypto-snapshot-store.ts` — helper functions for snapshot CRUD

## Implementation Steps

### Step 1: Add CryptoSnapshot model to Prisma schema
After the `PushSubscription` model in `prisma/schema.prisma`, add:

```prisma
model CryptoSnapshot {
  id        String   @id @default(uuid())
  source    String   // "coingecko", "etherscan", "defillama", "binance"
  symbol    String   // "BTC", "ETH", "aave", "BTCUSDT"
  value     Float    // last known numeric value
  metadata  Json?    // optional extra data (funding rate, volume, etc.)
  updatedAt DateTime @updatedAt

  @@unique([source, symbol])
  @@index([source])
}
```

### Step 2: Run migration
```bash
npx prisma migrate dev --name add-crypto-snapshot
npx prisma generate
```

### Step 3: Create snapshot store helper (`lib/services/crypto-snapshot-store.ts`)

Provides 2 functions:
```typescript
// Get previous value for change detection
getSnapshot(source: string, symbol: string): Promise<{ value: number; metadata: any } | null>

// Upsert current value after fetch
upsertSnapshot(source: string, symbol: string, value: number, metadata?: any): Promise<void>
```

Both use `prisma.cryptoSnapshot.findUnique` / `prisma.cryptoSnapshot.upsert` with the `@@unique([source, symbol])` constraint.

Helper should also export:
```typescript
// Calculate % change, returns null if no previous snapshot
calcPercentChange(oldValue: number, newValue: number): number
```

Keep file under 50 lines. Import `prisma` from `@/lib/db`.

## Todo List
- [ ] Add `CryptoSnapshot` model to `prisma/schema.prisma`
- [ ] Run `prisma migrate dev`
- [ ] Create `lib/services/crypto-snapshot-store.ts`
- [ ] Verify migration on local DB (`npx prisma studio`)

## Success Criteria
- `CryptoSnapshot` table exists in DB with correct columns and unique index
- `getSnapshot` / `upsertSnapshot` / `calcPercentChange` functions work correctly
- `npx prisma generate` succeeds without errors

## Risk Assessment
- **Migration conflicts:** Low risk -- only adding new model, no changes to existing tables
- **Neon compatibility:** Prisma + Neon fully supported, no issues expected

## Next Steps
- Phase 2 (CoinGecko + Etherscan fetchers) depends on this phase completing first
