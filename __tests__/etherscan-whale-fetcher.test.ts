import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchEtherscanWhaleTransfers } from "@/lib/services/etherscan-whale-fetcher";
import * as snapshotStore from "@/lib/services/crypto-snapshot-store";

vi.mock("@/lib/services/crypto-snapshot-store", () => ({
  getSnapshot: vi.fn(),
  upsertSnapshot: vi.fn(),
  calcPercentChange: vi.fn(),
}));

describe("fetchEtherscanWhaleTransfers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    delete process.env.ETHERSCAN_API_KEY;
  });

  it("returns empty array when ETHERSCAN_API_KEY not set", async () => {
    const result = await fetchEtherscanWhaleTransfers();
    expect(result).toHaveLength(0);
  });

  it("returns articles for transfers > 100 ETH", async () => {
    process.env.ETHERSCAN_API_KEY = "test-key";

    const mockResponse = {
      status: "1",
      message: "OK",
      result: [
        {
          hash: "0xabc123",
          from: "0x1111111111111111111111111111111111111111",
          to: "0x2222222222222222222222222222222222222222",
          value: "150000000000000000000", // 150 ETH in wei
          timeStamp: "1700000000",
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchEtherscanWhaleTransfers();

    expect(result).toHaveLength(1);
    expect(result[0].title).toContain("150");
    expect(result[0].title).toContain("ETH");
    expect(result[0].source).toBe("Etherscan");
  });

  it("skips transfers < 100 ETH", async () => {
    process.env.ETHERSCAN_API_KEY = "test-key";

    const mockResponse = {
      status: "1",
      message: "OK",
      result: [
        {
          hash: "0xabc123",
          from: "0x1111111111111111111111111111111111111111",
          to: "0x2222222222222222222222222222222222222222",
          value: "50000000000000000000", // 50 ETH in wei
          timeStamp: "1700000000",
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchEtherscanWhaleTransfers();

    expect(result).toHaveLength(0);
  });

  it("deduplicates against snapshot timestamp", async () => {
    process.env.ETHERSCAN_API_KEY = "test-key";

    const mockResponse = {
      status: "1",
      message: "OK",
      result: [
        {
          hash: "0xabc123",
          from: "0x1111111111111111111111111111111111111111",
          to: "0x2222222222222222222222222222222222222222",
          value: "150000000000000000000", // 150 ETH
          timeStamp: "1700000000",
        },
        {
          hash: "0xdef456",
          from: "0x1111111111111111111111111111111111111111",
          to: "0x3333333333333333333333333333333333333333",
          value: "120000000000000000000", // 120 ETH
          timeStamp: "1699999000", // older
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    // Snapshot exists with timestamp 1699999500 (between the two txs)
    (snapshotStore.getSnapshot as any).mockResolvedValue({
      value: 1699999500,
      metadata: { label: "ETH2 Deposit" },
    });
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchEtherscanWhaleTransfers();

    // Only the newer tx (1700000000) should be included
    expect(result).toHaveLength(1);
    expect(result[0].title).toContain("150");
  });

  it("returns empty array on API error", async () => {
    process.env.ETHERSCAN_API_KEY = "test-key";

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await fetchEtherscanWhaleTransfers();

    expect(result).toHaveLength(0);
  });

  it("generates correct RawArticle shape", async () => {
    process.env.ETHERSCAN_API_KEY = "test-key";

    const mockResponse = {
      status: "1",
      message: "OK",
      result: [
        {
          hash: "0xabc123",
          from: "0x1111111111111111111111111111111111111111",
          to: "0x2222222222222222222222222222222222222222",
          value: "150000000000000000000",
          timeStamp: "1700000000",
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    const result = await fetchEtherscanWhaleTransfers();

    expect(result[0]).toHaveProperty("url");
    expect(result[0]).toHaveProperty("title");
    expect(result[0]).toHaveProperty("summary");
    expect(result[0]).toHaveProperty("publishedAt");
    expect(result[0]).toHaveProperty("source");
    expect(result[0].url).toContain("etherscan.io/tx");
    expect(result[0].publishedAt).toBeInstanceOf(Date);
  });

  it("updates snapshot with max timestamp from batch", async () => {
    process.env.ETHERSCAN_API_KEY = "test-key";

    const mockResponse = {
      status: "1",
      message: "OK",
      result: [
        {
          hash: "0xabc123",
          from: "0x1111111111111111111111111111111111111111",
          to: "0x2222222222222222222222222222222222222222",
          value: "150000000000000000000",
          timeStamp: "1700000000",
        },
        {
          hash: "0xdef456",
          from: "0x1111111111111111111111111111111111111111",
          to: "0x3333333333333333333333333333333333333333",
          value: "120000000000000000000",
          timeStamp: "1700000100",
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    (snapshotStore.getSnapshot as any).mockResolvedValue(null);
    (snapshotStore.upsertSnapshot as any).mockResolvedValue(undefined);

    await fetchEtherscanWhaleTransfers();

    // Should upsert with max timestamp (1700000100)
    expect(snapshotStore.upsertSnapshot).toHaveBeenCalledWith(
      "etherscan",
      expect.any(String),
      1700000100,
      expect.any(Object)
    );
  });
});
