import { RawArticle } from "@/types/article";
import {
  getSnapshot,
  upsertSnapshot,
  calcPercentChange,
} from "./crypto-snapshot-store";

// Top coins to monitor (CoinGecko coin IDs)
const COINS = [
  { id: "bitcoin", name: "Bitcoin" },
  { id: "ethereum", name: "Ethereum" },
  { id: "solana", name: "Solana" },
  { id: "ripple", name: "XRP" },
  { id: "cardano", name: "Cardano" },
  { id: "dogecoin", name: "Dogecoin" },
];

// Thresholds for generating alerts
const CHANGE_24H_THRESHOLD = 5; // API-provided 24h change %
const SNAPSHOT_DELTA_THRESHOLD = 3; // intra-cycle spike %

interface CoinGeckoPriceData {
  usd: number;
  usd_24h_change?: number;
  usd_24h_vol?: number;
  usd_market_cap?: number;
}

type CoinGeckoResponse = Record<string, CoinGeckoPriceData>;

export async function fetchCoinGeckoPrices(): Promise<RawArticle[]> {
  try {
    const ids = COINS.map((c) => c.id).join(",");
    const url =
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}` +
      `&vs_currencies=usd&include_24hr_change=true` +
      `&include_24hr_vol=true&include_market_cap=true`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "news-tracker/1.0" },
    });

    if (!res.ok) {
      console.warn(`CoinGecko API error: ${res.status}`);
      return [];
    }

    const data: CoinGeckoResponse = await res.json();
    const results: RawArticle[] = [];

    // Parallel fetch all snapshots
    const snapshots = await Promise.all(
      COINS.map((c) => getSnapshot("coingecko", c.id))
    );

    for (let i = 0; i < COINS.length; i++) {
      const coin = COINS[i];
      const priceData = data[coin.id];
      if (!priceData) continue;

      const price = priceData.usd;
      const change24h = priceData.usd_24h_change ?? 0;
      const vol = priceData.usd_24h_vol ?? 0;
      const mcap = priceData.usd_market_cap ?? 0;

      const snapshot = snapshots[i];
      const snapshotDelta = snapshot
        ? calcPercentChange(snapshot.value, price)
        : 0;

      const isSignificant24h = Math.abs(change24h) >= CHANGE_24H_THRESHOLD;
      const isSignificantDelta =
        snapshot && Math.abs(snapshotDelta) >= SNAPSHOT_DELTA_THRESHOLD;

      if (isSignificant24h || isSignificantDelta) {
        const pct = isSignificant24h ? change24h : snapshotDelta;
        const direction = pct >= 0 ? "up" : "down";
        const window = isSignificant24h ? "24h" : "recent";
        const now = Date.now();

        results.push({
          // Include timestamp to avoid upsert dedup silencing new events (H6 fix)
          url: `https://www.coingecko.com/en/coins/${coin.id}?t=${now}`,
          title: `${coin.name} ${direction} ${Math.abs(pct).toFixed(2)}% (${window}) — $${price.toLocaleString()}`,
          summary: `24h vol: $${(vol / 1e9).toFixed(2)}B. Market cap: $${(mcap / 1e9).toFixed(2)}B.`,
          publishedAt: new Date(now),
          source: "CoinGecko",
        });
      }
    }

    // Parallel upsert all snapshots
    await Promise.all(
      COINS.map((coin) => {
        const pd = data[coin.id];
        if (!pd) return Promise.resolve();
        return upsertSnapshot("coingecko", coin.id, pd.usd, {
          vol: pd.usd_24h_vol ?? 0,
          mcap: pd.usd_market_cap ?? 0,
          change24h: pd.usd_24h_change ?? 0,
        });
      })
    );

    return results;
  } catch (err) {
    console.warn("CoinGecko fetcher failed:", err);
    return [];
  }
}
