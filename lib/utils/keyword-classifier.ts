import { Category } from "@prisma/client";

const ECONOMIC_KEYWORDS = [
  "kinh tế",
  "chứng khoán",
  "lạm phát",
  "gdp",
  "tăng trưởng",
  "ngân hàng",
  "tỷ giá",
  "stock",
  "market",
  "inflation",
];

const POLITICAL_KEYWORDS = [
  "chính phủ",
  "bộ trưởng",
  "quốc hội",
  "chính sách",
  "bầu cử",
  "election",
  "government",
  "policy",
  "parliament",
];

export function classifyArticle(title: string, summary: string): Category {
  const text = `${title} ${summary}`.toLowerCase();
  if (ECONOMIC_KEYWORDS.some((k) => text.includes(k))) return "ECONOMIC";
  if (POLITICAL_KEYWORDS.some((k) => text.includes(k))) return "POLITICAL";
  return "GENERAL";
}
