import { describe, it, expect } from "vitest";
import { normalizeArticle } from "@/lib/services/article-normalizer";

describe("normalizeArticle", () => {
  it("strips HTML from summary", () => {
    const result = normalizeArticle({
      url: "https://example.com/1",
      title: "Test Article",
      summary: "<p>Hello <b>world</b></p>",
      source: "Test",
      publishedAt: new Date("2025-01-01"),
    });
    expect(result.summary).toBe("Hello world");
  });

  it("trims title and url", () => {
    const result = normalizeArticle({
      url: "  https://example.com/2  ",
      title: "  Spaced Title  ",
      source: "Test",
      publishedAt: new Date("2025-01-01"),
    });
    expect(result.url).toBe("https://example.com/2");
    expect(result.title).toBe("Spaced Title");
  });

  it("falls back publishedAt to now if invalid", () => {
    const before = Date.now();
    const result = normalizeArticle({
      url: "https://example.com/3",
      title: "Test",
      source: "Test",
      publishedAt: new Date("invalid"),
    });
    expect(result.publishedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("sets summary to null when not provided", () => {
    const result = normalizeArticle({
      url: "https://example.com/4",
      title: "Test",
      source: "Test",
      publishedAt: new Date("2025-01-01"),
    });
    expect(result.summary).toBeNull();
  });

  it("sets imageUrl to null when empty", () => {
    const result = normalizeArticle({
      url: "https://example.com/5",
      title: "Test",
      source: "Test",
      imageUrl: "",
      publishedAt: new Date("2025-01-01"),
    });
    expect(result.imageUrl).toBeNull();
  });
});
