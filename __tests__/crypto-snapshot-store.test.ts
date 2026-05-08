import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getSnapshot,
  upsertSnapshot,
  calcPercentChange,
} from "@/lib/services/crypto-snapshot-store";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    cryptoSnapshot: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("crypto-snapshot-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSnapshot", () => {
    it("returns null for non-existent key", async () => {
      (prisma.cryptoSnapshot.findUnique as any).mockResolvedValueOnce(null);

      const result = await getSnapshot("coingecko", "bitcoin");

      expect(result).toBeNull();
      expect(prisma.cryptoSnapshot.findUnique).toHaveBeenCalledWith({
        where: { source_symbol: { source: "coingecko", symbol: "bitcoin" } },
      });
    });

    it("returns snapshot with value and metadata", async () => {
      const mockRecord = {
        source: "coingecko",
        symbol: "bitcoin",
        value: 50000,
        metadata: { vol: 30e9, mcap: 1e12 },
      };

      (prisma.cryptoSnapshot.findUnique as any).mockResolvedValueOnce(mockRecord);

      const result = await getSnapshot("coingecko", "bitcoin");

      expect(result).toEqual({
        value: 50000,
        metadata: { vol: 30e9, mcap: 1e12 },
      });
    });

    it("queries with correct composite key", async () => {
      (prisma.cryptoSnapshot.findUnique as any).mockResolvedValueOnce(null);

      await getSnapshot("etherscan", "0xabc123");

      expect(prisma.cryptoSnapshot.findUnique).toHaveBeenCalledWith({
        where: {
          source_symbol: { source: "etherscan", symbol: "0xabc123" },
        },
      });
    });
  });

  describe("upsertSnapshot", () => {
    it("creates new record", async () => {
      (prisma.cryptoSnapshot.upsert as any).mockResolvedValueOnce({
        source: "coingecko",
        symbol: "bitcoin",
        value: 50000,
        metadata: { vol: 30e9 },
      });

      await upsertSnapshot("coingecko", "bitcoin", 50000, { vol: 30e9 });

      expect(prisma.cryptoSnapshot.upsert).toHaveBeenCalledWith({
        where: { source_symbol: { source: "coingecko", symbol: "bitcoin" } },
        update: { value: 50000, metadata: { vol: 30e9 } },
        create: {
          source: "coingecko",
          symbol: "bitcoin",
          value: 50000,
          metadata: { vol: 30e9 },
        },
      });
    });

    it("updates existing record", async () => {
      (prisma.cryptoSnapshot.upsert as any).mockResolvedValueOnce({
        source: "coingecko",
        symbol: "bitcoin",
        value: 51000,
        metadata: { vol: 31e9 },
      });

      await upsertSnapshot("coingecko", "bitcoin", 51000, { vol: 31e9 });

      expect(prisma.cryptoSnapshot.upsert).toHaveBeenCalledWith({
        where: { source_symbol: { source: "coingecko", symbol: "bitcoin" } },
        update: { value: 51000, metadata: { vol: 31e9 } },
        create: expect.any(Object),
      });
    });

    it("handles undefined metadata", async () => {
      (prisma.cryptoSnapshot.upsert as any).mockResolvedValueOnce({
        source: "binance",
        symbol: "BTCUSDT",
        value: 1000000,
        metadata: undefined,
      });

      await upsertSnapshot("binance", "BTCUSDT", 1000000);

      expect(prisma.cryptoSnapshot.upsert).toHaveBeenCalledWith({
        where: { source_symbol: { source: "binance", symbol: "BTCUSDT" } },
        update: { value: 1000000, metadata: undefined },
        create: {
          source: "binance",
          symbol: "BTCUSDT",
          value: 1000000,
          metadata: undefined,
        },
      });
    });

    it("uses correct composite key for upsert", async () => {
      (prisma.cryptoSnapshot.upsert as any).mockResolvedValueOnce({});

      await upsertSnapshot("defillama", "aave", 10e9, { category: "Lending" });

      expect(prisma.cryptoSnapshot.upsert).toHaveBeenCalledWith({
        where: { source_symbol: { source: "defillama", symbol: "aave" } },
        update: expect.any(Object),
        create: expect.any(Object),
      });
    });
  });

  describe("calcPercentChange", () => {
    it("returns correct percentage change", () => {
      const result = calcPercentChange(100, 110);
      expect(result).toBe(10);
    });

    it("returns negative percentage change", () => {
      const result = calcPercentChange(100, 90);
      expect(result).toBe(-10);
    });

    it("handles zero division (oldValue = 0)", () => {
      const result = calcPercentChange(0, 100);
      expect(result).toBe(0);
    });

    it("handles large numbers", () => {
      const result = calcPercentChange(1e9, 1.1e9);
      expect(result).toBe(10);
    });

    it("handles small decimal changes", () => {
      const result = calcPercentChange(50000, 50100);
      expect(result).toBeCloseTo(0.2, 5);
    });

    it("handles negative oldValue", () => {
      const result = calcPercentChange(-100, -110);
      expect(result).toBe(-10);
    });

    it("handles transition from negative to positive", () => {
      const result = calcPercentChange(-100, 100);
      // Formula: ((100 - (-100)) / abs(-100)) * 100 = (200 / 100) * 100 = 200
      expect(result).toBe(200);
    });

    it("returns 0 for identical values", () => {
      const result = calcPercentChange(100, 100);
      expect(result).toBe(0);
    });

    it("handles very small oldValue", () => {
      const result = calcPercentChange(0.001, 0.002);
      expect(result).toBe(100);
    });

    it("handles percentage change from 1 to 1.05 (5% increase)", () => {
      const result = calcPercentChange(1, 1.05);
      // Floating point precision: expect close to 5
      expect(result).toBeCloseTo(5, 10);
    });
  });
});
