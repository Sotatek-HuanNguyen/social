import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchCoinGeckoPrices } from "@/lib/services/coingecko-price-fetcher";
import * as snapshotStore from "@/lib/services/crypto-snapshot-store";

// Mock the snapshot store
vi.mock("@/lib/services/crypto-snapshot-store", () => ({
  getSnapshot: vi.fn(),
  upsertSnapshot: vi.fn(),
  calcPercentChange: vi.fn((oldVal, newVal) => {
    if (oldVal === 0) return 0;
    return ((newVal - oldVal) / Math.abs(oldVal)) * 100;
  }),
}));

describe("fetchCoinGeckoPrices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("returns articles when 24h change exceeds 5%", async () => {
    const mockResponse = {
      bitcoin: {
        usd: 50000,
        usd_24h_change: 6.5,
        usd_24h_vol: 30e9,
        usd_market_cap: 1e12,
      },
      ethereum: {
        usd: 3000,
        usd_24h_change: 2.0,
        usd_24h_vol: 15e9,
        usd_market_cap: 360e9,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchCoinGeckoPrices();

    expect(result).toHaveLength(1);
    expect(result[0].title).toContain("Bitcoin");
    expect(result[0].title).toContain("up");
    expect(result[0].title).toContain("6.50%");
    expect(result[0].source).toBe("CoinGecko");
  });

  it("returns empty array when all changes below threshold", async () => {
    const mockResponse = {
      bitcoin: {
        usd: 50000,
        usd_24h_change: 2.0,
        usd_24h_vol: 30e9,
        usd_market_cap: 1e12,
      },
      ethereum: {
        usd: 3000,
        usd_24h_change: 1.5,
        usd_24h_vol: 15e9,
        usd_market_cap: 360e9,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchCoinGeckoPrices();

    expect(result).toHaveLength(0);
  });

  it("returns empty array on API error (non-200 status)", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await fetchCoinGeckoPrices();

    expect(result).toHaveLength(0);
  });

  it("returns empty array on network timeout", async () => {
    (global.fetch as any).mockRejectedValueOnce(
      new Error("AbortError: The operation was aborted")
    );

    const result = await fetchCoinGeckoPrices();

    expect(result).toHaveLength(0);
  });

  it("generates correct RawArticle shape", async () => {
    const mockResponse = {
      bitcoin: {
        usd: 50000,
        usd_24h_change: 7.0,
        usd_24h_vol: 30e9,
        usd_market_cap: 1e12,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchCoinGeckoPrices();

    expect(result[0]).toHaveProperty("url");
    expect(result[0]).toHaveProperty("title");
    expect(result[0]).toHaveProperty("summary");
    expect(result[0]).toHaveProperty("publishedAt");
    expect(result[0]).toHaveProperty("source");
    expect(result[0].url).toContain("coingecko.com");
    expect(result[0].publishedAt).toBeInstanceOf(Date);
  });

  it("detects negative 24h change", async () => {
    const mockResponse = {
      bitcoin: {
        usd: 50000,
        usd_24h_change: -6.5,
        usd_24h_vol: 30e9,
        usd_market_cap: 1e12,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchCoinGeckoPrices();

    expect(result).toHaveLength(1);
    expect(result[0].title).toContain("down");
    expect(result[0].title).toContain("6.50%");
  });

  it("calls upsertSnapshot for each coin", async () => {
    const mockResponse = {
      bitcoin: {
        usd: 50000,
        usd_24h_change: 6.5,
        usd_24h_vol: 30e9,
        usd_market_cap: 1e12,
      },
      ethereum: {
        usd: 3000,
        usd_24h_change: 2.0,
        usd_24h_vol: 15e9,
        usd_market_cap: 360e9,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    await fetchCoinGeckoPrices();

    expect(snapshotStore.upsertSnapshot).toHaveBeenCalledWith(
      "coingecko",
      "bitcoin",
      50000,
      expect.objectContaining({
        vol: 30e9,
        mcap: 1e12,
        change24h: 6.5,
      })
    );
  });
});
