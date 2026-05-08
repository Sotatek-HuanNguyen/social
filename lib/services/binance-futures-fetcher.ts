import { RawArticle } from "@/types/article";
import {
  getSnapshot,
  upsertSnapshot,
  calcPercentChange,
} from "./crypto-snapshot-store";

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT"];

// Thresholds
const OI_CHANGE_THRESHOLD = 10; // % OI change vs snapshot
const MAX_ARTICLES_PER_CYCLE = 5;

interface BinanceOI {
  openInterest: string;
  symbol: string;
  time: number;
}

interface BinanceFundingRate {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
}

function fundingRateSentiment(rate: number): string {
  if (rate > 0.0003) return "Extremely bullish leverage — long liquidation risk";
  if (rate > 0.0001) return "Bullish sentiment — longs paying shorts";
  if (rate > -0.0001) return "Neutral funding";
  if (rate > -0.0003) return "Bearish sentiment — shorts paying longs";
  return "Extremely bearish leverage — short liquidation risk";
}

async function fetchOI(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`,
      { signal: AbortSignal.timeout(8_000) }
    );
    if (!res.ok) return null;
    const data: BinanceOI = await res.json();
    return parseFloat(data.openInterest);
  } catch (err) {
    console.warn(`Binance OI fetch failed for ${symbol}:`, err);
    return null;
  }
}

async function fetchFundingRate(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`,
      { signal: AbortSignal.timeout(8_000) }
    );
    if (!res.ok) return null;
    const data: BinanceFundingRate[] = await res.json();
    if (!data[0]) return null;
    return parseFloat(data[0].fundingRate);
  } catch (err) {
    console.warn(`Binance funding rate fetch failed for ${symbol}:`, err);
    return null;
  }
}

interface Candidate {
  article: RawArticle;
  absChange: number;
}

export async function fetchBinanceFuturesData(): Promise<RawArticle[]> {
  // Fetch OI + snapshots in parallel (H4 fix: avoid serial worst-case timeout)
  const [ois, snapshots] = await Promise.all([
    Promise.all(SYMBOLS.map((s) => fetchOI(s))),
    Promise.all(SYMBOLS.map((s) => getSnapshot("binance", s))),
  ]);

  // Determine which symbols need funding rate (only significant movers)
  const significantIndexes: number[] = [];
  SYMBOLS.forEach((_, i) => {
    const currentOI = ois[i];
    const snapshot = snapshots[i];
    if (currentOI === null || !snapshot) return;
    const pct = calcPercentChange(snapshot.value, currentOI);
    if (Math.abs(pct) >= OI_CHANGE_THRESHOLD) significantIndexes.push(i);
  });

  // Fetch funding rates only for significant symbols
  const fundingRates = await Promise.all(
    significantIndexes.map((i) => fetchFundingRate(SYMBOLS[i]))
  );
  const fundingMap = new Map<number, number | null>();
  significantIndexes.forEach((i, idx) => fundingMap.set(i, fundingRates[idx]));

  const candidates: Candidate[] = [];
  const upserts: Promise<void>[] = [];
  const now = Date.now();

  SYMBOLS.forEach((symbol, i) => {
    const currentOI = ois[i];
    if (currentOI === null) return;

    const snapshot = snapshots[i];
    const oiChangePct = snapshot
      ? calcPercentChange(snapshot.value, currentOI)
      : 0;

    if (snapshot && Math.abs(oiChangePct) >= OI_CHANGE_THRESHOLD) {
      const fundingRate = fundingMap.get(i) ?? null;
      const fundingPct = fundingRate !== null ? fundingRate * 100 : null;
      const sentiment =
        fundingRate !== null
          ? fundingRateSentiment(fundingRate)
          : "Funding data unavailable";
      const direction = oiChangePct >= 0 ? "up" : "down";

      candidates.push({
        article: {
          // Include timestamp in URL to avoid upsert dedup for new events (H6 fix)
          url: `https://www.binance.com/en/futures/${symbol}?t=${now}`,
          title: `${symbol} Open Interest ${direction} ${Math.abs(oiChangePct).toFixed(2)}%${
            fundingPct !== null ? ` — Funding: ${fundingPct.toFixed(4)}%` : ""
          }`,
          summary: `OI: ${currentOI.toLocaleString()}. ${sentiment}.`,
          publishedAt: new Date(now),
          source: "Binance Futures",
        },
        absChange: Math.abs(oiChangePct),
      });
    }

    upserts.push(upsertSnapshot("binance", symbol, currentOI));
  });

  await Promise.all(upserts);

  candidates.sort((a, b) => b.absChange - a.absChange);
  return candidates.slice(0, MAX_ARTICLES_PER_CYCLE).map((c) => c.article);
}
