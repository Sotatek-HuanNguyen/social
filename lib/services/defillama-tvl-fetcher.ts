import { RawArticle } from "@/types/article";
import {
  getSnapshot,
  upsertSnapshot,
  calcPercentChange,
} from "./crypto-snapshot-store";

// Thresholds
const MIN_TVL = 500_000_000; // $500M
const CHANGE_1D_THRESHOLD = 10; // % (API-provided daily change)
const SNAPSHOT_DELTA_THRESHOLD = 5; // % (inter-cycle change)
const MAX_ARTICLES_PER_CYCLE = 5;

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

interface Candidate {
  article: RawArticle;
  absChange: number;
}

export async function fetchDefiLlamaTvl(): Promise<RawArticle[]> {
  try {
    const res = await fetch("https://api.llama.fi/protocols", {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.warn(`DeFiLlama API error: ${res.status}`);
      return [];
    }

    const protocols: DefiLlamaProtocol[] = await res.json();
    const qualifying = protocols.filter((p) => p.tvl && p.tvl >= MIN_TVL);

    // Parallel fetch all snapshots (single round trip via Promise.all)
    const snapshots = await Promise.all(
      qualifying.map((p) => getSnapshot("defillama", p.slug))
    );

    const candidates: Candidate[] = [];
    const toUpsert: { slug: string; tvl: number; category: string }[] = [];

    qualifying.forEach((p, i) => {
      const change1d = p.change_1d ?? 0;
      const snapshot = snapshots[i];
      const snapshotDelta = snapshot
        ? calcPercentChange(snapshot.value, p.tvl)
        : 0;

      const isSignificant1d = Math.abs(change1d) >= CHANGE_1D_THRESHOLD;
      const isSignificantDelta =
        snapshot && Math.abs(snapshotDelta) >= SNAPSHOT_DELTA_THRESHOLD;

      if (isSignificant1d || isSignificantDelta) {
        const pct = isSignificant1d ? change1d : snapshotDelta;
        const direction = pct >= 0 ? "up" : "down";
        const window = isSignificant1d ? "24h" : "recent";
        const tvlB = (p.tvl / 1e9).toFixed(2);
        const now = Date.now();

        candidates.push({
          article: {
            // Include timestamp to avoid upsert dedup silencing new events (H6 fix)
            url: `https://defillama.com/protocol/${p.slug}?t=${now}`,
            title: `${p.name} TVL ${direction} ${Math.abs(pct).toFixed(2)}% (${window}) — $${tvlB}B`,
            summary: `Category: ${p.category || "n/a"}. Chains: ${(p.chains ?? []).slice(0, 3).join(", ") || "n/a"}.`,
            publishedAt: new Date(now),
            source: "DeFiLlama",
          },
          absChange: Math.abs(pct),
        });
      }

      // H3 fix: tighter drift threshold to reduce DB writes (was 1%, now 3%)
      if (!snapshot || Math.abs(snapshotDelta) >= 3) {
        toUpsert.push({ slug: p.slug, tvl: p.tvl, category: p.category });
      }
    });

    // Parallel upsert (typically small subset)
    await Promise.all(
      toUpsert.map((u) =>
        upsertSnapshot("defillama", u.slug, u.tvl, { category: u.category })
      )
    );

    // Sort by abs change, take top N
    candidates.sort((a, b) => b.absChange - a.absChange);
    return candidates.slice(0, MAX_ARTICLES_PER_CYCLE).map((c) => c.article);
  } catch (err) {
    console.warn("DeFiLlama fetcher failed:", err);
    return [];
  }
}
