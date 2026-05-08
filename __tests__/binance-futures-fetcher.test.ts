import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchBinanceFuturesData } from "@/lib/services/binance-futures-fetcher";
import * as snapshotStore from "@/lib/services/crypto-snapshot-store";

vi.mock("@/lib/services/crypto-snapshot-store", () => ({
  getSnapshot: vi.fn(),
  upsertSnapshot: vi.fn(),
  calcPercentChange: vi.fn((oldVal, newVal) => {
    if (oldVal === 0) return 0;
    return ((newVal - oldVal) / Math.abs(oldVal)) * 100;
  }),
}));

describe("fetchBinanceFuturesData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("returns articles when OI change exceeds 10%", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ openInterest: "1000000", symbol: "BTCUSDT", time: 1700000000 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ symbol: "BTCUSDT", fundingRate: "0.0001", fundingTime: 1700000000 }],
      });

    (snapshotStore.getSnapshot as any).mockResolvedValue({
      value: 900000, // 11% change
      metadata: {},
    });
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchBinanceFuturesData();

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].title).toContain("BTCUSDT");
    expect(result[0].title).toContain("Open Interest");
    expect(result[0].source).toBe("Binance Futures");
  });

  it("includes funding rate context when available", async () => {
    // Parallel flow: mock fetch by URL (OI calls fire first in parallel, then funding)
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes("openInterest")) {
        if (url.includes("BTCUSDT")) {
          return Promise.resolve({ ok: true, json: async () => ({ openInterest: "1000000", symbol: "BTCUSDT", time: 1700000000 }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ openInterest: "1000000", symbol: "OTHER", time: 1700000000 }) });
      }
      if (url.includes("fundingRate")) {
        return Promise.resolve({ ok: true, json: async () => [{ symbol: "BTCUSDT", fundingRate: "0.0002", fundingTime: 1700000000 }] });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    // BTC: 11% change. Others: 0% (same snapshot value as OI).
    (snapshotStore.getSnapshot as any).mockImplementation((_source: string, symbol: string) => {
      if (symbol === "BTCUSDT") return Promise.resolve({ value: 900000, metadata: {} });
      return Promise.resolve({ value: 1000000, metadata: {} });
    });
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchBinanceFuturesData();

    expect(result[0].title).toContain("Funding:");
    expect(result[0].summary).toContain("Bullish");
  });

  it("returns empty array on API error (451 geo-block)", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 451,
    });

    const result = await fetchBinanceFuturesData();

    expect(result).toHaveLength(0);
  });

  it("returns empty array when all OI changes below threshold", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ openInterest: "1000000", symbol: "BTCUSDT", time: 1700000000 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ symbol: "BTCUSDT", fundingRate: "0.0001", fundingTime: 1700000000 }],
      });

    (snapshotStore.getSnapshot as any).mockResolvedValue({
      value: 990000, // Only 1% change
      metadata: {},
    });
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchBinanceFuturesData();

    expect(result).toHaveLength(0);
  });

  it("generates correct RawArticle shape", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ openInterest: "1000000", symbol: "BTCUSDT", time: 1700000000 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ symbol: "BTCUSDT", fundingRate: "0.0001", fundingTime: 1700000000 }],
      });

    (snapshotStore.getSnapshot as any).mockResolvedValue({
      value: 900000,
      metadata: {},
    });
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchBinanceFuturesData();

    expect(result[0]).toHaveProperty("url");
    expect(result[0]).toHaveProperty("title");
    expect(result[0]).toHaveProperty("summary");
    expect(result[0]).toHaveProperty("publishedAt");
    expect(result[0]).toHaveProperty("source");
    expect(result[0].url).toContain("binance.com/en/futures");
    expect(result[0].publishedAt).toBeInstanceOf(Date);
  });

  it("detects negative OI change", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ openInterest: "900000", symbol: "BTCUSDT", time: 1700000000 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ symbol: "BTCUSDT", fundingRate: "0.0001", fundingTime: 1700000000 }],
      });

    (snapshotStore.getSnapshot as any).mockResolvedValue({
      value: 1000000, // -10% change
      metadata: {},
    });
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchBinanceFuturesData();

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].title).toContain("down");
  });

  it("handles missing funding rate gracefully", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ openInterest: "1000000", symbol: "BTCUSDT", time: 1700000000 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    (snapshotStore.getSnapshot as any).mockResolvedValue({
      value: 900000,
      metadata: {},
    });
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchBinanceFuturesData();

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].title).not.toContain("Funding:");
    expect(result[0].summary).toContain("Funding data unavailable");
  });

  it("skips symbols with no snapshot (first run)", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ openInterest: "1000000", symbol: "BTCUSDT", time: 1700000000 }),
      });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null); // No snapshot
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchBinanceFuturesData();

    // Should not generate article on first run (no baseline)
    expect(result).toHaveLength(0);
  });

  it("caps output at 5 articles", async () => {
    const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT"];

    // Mock all OI fetches
    symbols.forEach(() => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ openInterest: "1000000", symbol: "BTCUSDT", time: 1700000000 }),
      });
    });

    // Mock all funding rate fetches
    symbols.forEach(() => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ symbol: "BTCUSDT", fundingRate: "0.0001", fundingTime: 1700000000 }],
      });
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue({
      value: 900000,
      metadata: {},
    });
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchBinanceFuturesData();

    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("sorts by absolute OI change descending", async () => {
    // BTC current OI: 1100000 (snapshot 1000000 → +10%)
    // ETH current OI: 1200000 (snapshot 1000000 → +20%)
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes("openInterest")) {
        if (url.includes("BTCUSDT")) return Promise.resolve({ ok: true, json: async () => ({ openInterest: "1100000", symbol: "BTCUSDT", time: 1700000000 }) });
        if (url.includes("ETHUSDT")) return Promise.resolve({ ok: true, json: async () => ({ openInterest: "1200000", symbol: "ETHUSDT", time: 1700000000 }) });
        // All others: no change
        return Promise.resolve({ ok: true, json: async () => ({ openInterest: "1000000", symbol: "X", time: 1700000000 }) });
      }
      if (url.includes("fundingRate")) {
        return Promise.resolve({ ok: true, json: async () => [{ symbol: "X", fundingRate: "0.0001", fundingTime: 1700000000 }] });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    (snapshotStore.getSnapshot as any).mockImplementation((_source: string, symbol: string) => {
      if (symbol === "BTCUSDT" || symbol === "ETHUSDT") return Promise.resolve({ value: 1000000, metadata: {} });
      return Promise.resolve({ value: 1000000, metadata: {} }); // no change for others
    });
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchBinanceFuturesData();

    // ETH (20%) should come before BTC (10%)
    expect(result[0].title).toContain("ETHUSDT");
  });

  it("calls upsertSnapshot for each symbol", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ openInterest: "1000000", symbol: "BTCUSDT", time: 1700000000 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ symbol: "BTCUSDT", fundingRate: "0.0001", fundingTime: 1700000000 }],
      });

    (snapshotStore.getSnapshot as any).mockResolvedValue({
      value: 900000,
      metadata: {},
    });
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    await fetchBinanceFuturesData();

    expect(snapshotStore.upsertSnapshot).toHaveBeenCalledWith(
      "binance",
      expect.any(String),
      expect.any(Number)
    );
  });
});
