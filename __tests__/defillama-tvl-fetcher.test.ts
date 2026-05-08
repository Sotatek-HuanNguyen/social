import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchDefiLlamaTvl } from "@/lib/services/defillama-tvl-fetcher";
import * as snapshotStore from "@/lib/services/crypto-snapshot-store";

vi.mock("@/lib/services/crypto-snapshot-store", () => ({
  getSnapshot: vi.fn(),
  upsertSnapshot: vi.fn(),
  calcPercentChange: vi.fn((oldVal, newVal) => {
    if (oldVal === 0) return 0;
    return ((newVal - oldVal) / Math.abs(oldVal)) * 100;
  }),
}));

describe("fetchDefiLlamaTvl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("returns articles for protocols with >10% daily change", async () => {
    const mockResponse = [
      {
        name: "Aave",
        slug: "aave",
        tvl: 10e9, // $10B
        change_1h: 0.5,
        change_1d: 12.0, // >10%
        change_7d: 5.0,
        chains: ["Ethereum", "Polygon"],
        category: "Lending",
      },
      {
        name: "Curve",
        slug: "curve",
        tvl: 5e9, // $5B
        change_1h: 0.2,
        change_1d: 2.0, // <10%
        change_7d: 1.0,
        chains: ["Ethereum"],
        category: "DEX",
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchDefiLlamaTvl();

    expect(result).toHaveLength(1);
    expect(result[0].title).toContain("Aave");
    expect(result[0].title).toContain("up");
    expect(result[0].title).toContain("12.00%");
  });

  it("filters out protocols with TVL < $500M", async () => {
    const mockResponse = [
      {
        name: "Aave",
        slug: "aave",
        tvl: 10e9, // $10B (qualifies)
        change_1h: 0.5,
        change_1d: 12.0,
        change_7d: 5.0,
        chains: ["Ethereum"],
        category: "Lending",
      },
      {
        name: "SmallProto",
        slug: "smallproto",
        tvl: 100e6, // $100M (filtered out)
        change_1h: 0.5,
        change_1d: 15.0,
        change_7d: 5.0,
        chains: ["Ethereum"],
        category: "Other",
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchDefiLlamaTvl();

    expect(result).toHaveLength(1);
    expect(result[0].title).toContain("Aave");
  });

  it("caps output at 5 articles", async () => {
    const mockResponse = Array.from({ length: 10 }, (_, i) => ({
      name: `Protocol${i}`,
      slug: `proto${i}`,
      tvl: 10e9,
      change_1h: 0.5,
      change_1d: 15.0 - i * 0.5, // Varying changes
      change_7d: 5.0,
      chains: ["Ethereum"],
      category: "DeFi",
    }));

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchDefiLlamaTvl();

    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("returns empty array on API error", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await fetchDefiLlamaTvl();

    expect(result).toHaveLength(0);
  });

  it("generates correct RawArticle shape", async () => {
    const mockResponse = [
      {
        name: "Aave",
        slug: "aave",
        tvl: 10e9,
        change_1h: 0.5,
        change_1d: 12.0,
        change_7d: 5.0,
        chains: ["Ethereum", "Polygon"],
        category: "Lending",
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchDefiLlamaTvl();

    expect(result[0]).toHaveProperty("url");
    expect(result[0]).toHaveProperty("title");
    expect(result[0]).toHaveProperty("summary");
    expect(result[0]).toHaveProperty("publishedAt");
    expect(result[0]).toHaveProperty("source");
    expect(result[0].url).toContain("defillama.com");
    expect(result[0].publishedAt).toBeInstanceOf(Date);
    expect(result[0].source).toBe("DeFiLlama");
  });

  it("detects negative daily change", async () => {
    const mockResponse = [
      {
        name: "Aave",
        slug: "aave",
        tvl: 10e9,
        change_1h: 0.5,
        change_1d: -12.0, // Negative
        change_7d: 5.0,
        chains: ["Ethereum"],
        category: "Lending",
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchDefiLlamaTvl();

    expect(result).toHaveLength(1);
    expect(result[0].title).toContain("down");
    expect(result[0].title).toContain("12.00%");
  });

  it("sorts by absolute change descending", async () => {
    const mockResponse = [
      {
        name: "Proto1",
        slug: "proto1",
        tvl: 10e9,
        change_1h: 0.5,
        change_1d: 15.0,
        change_7d: 5.0,
        chains: ["Ethereum"],
        category: "DeFi",
      },
      {
        name: "Proto2",
        slug: "proto2",
        tvl: 10e9,
        change_1h: 0.5,
        change_1d: 25.0, // Larger change
        change_7d: 5.0,
        chains: ["Ethereum"],
        category: "DeFi",
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchDefiLlamaTvl();

    expect(result[0].title).toContain("Proto2");
    expect(result[1].title).toContain("Proto1");
  });

  it("handles null change_1d gracefully", async () => {
    const mockResponse = [
      {
        name: "Aave",
        slug: "aave",
        tvl: 10e9,
        change_1h: 0.5,
        change_1d: null, // null
        change_7d: 5.0,
        chains: ["Ethereum"],
        category: "Lending",
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchDefiLlamaTvl();

    // Should not crash, returns empty since change_1d is null (treated as 0)
    expect(result).toHaveLength(0);
  });
});
