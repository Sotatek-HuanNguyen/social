import { describe, it, expect } from "vitest";
import { classifyArticle } from "@/lib/utils/keyword-classifier";

describe("classifyArticle", () => {
  it("classifies economic article by Vietnamese keyword", () => {
    expect(classifyArticle("Chứng khoán tăng mạnh", "VN-Index tăng")).toBe("ECONOMIC");
  });

  it("classifies economic article by English keyword", () => {
    expect(classifyArticle("Stock market rally", "")).toBe("ECONOMIC");
  });

  it("classifies political article by Vietnamese keyword", () => {
    expect(classifyArticle("Quốc hội họp bàn chính sách", "")).toBe("POLITICAL");
  });

  it("classifies political article by English keyword", () => {
    expect(classifyArticle("Government policy update", "")).toBe("POLITICAL");
  });

  it("defaults to GENERAL for unmatched content", () => {
    expect(classifyArticle("Thời tiết hôm nay", "Trời nắng đẹp")).toBe("GENERAL");
  });

  it("checks both title and summary", () => {
    expect(classifyArticle("Tin mới nhất", "Ngân hàng điều chỉnh lãi suất")).toBe("ECONOMIC");
  });

  it("is case-insensitive", () => {
    expect(classifyArticle("GDP tăng trưởng", "")).toBe("ECONOMIC");
  });
});
