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

const CRYPTO_KEYWORDS = [
  "bitcoin",
  "ethereum",
  "crypto",
  "blockchain",
  "tiền mã hóa",
  "tiền điện tử",
  "altcoin",
  "defi",
  "nft",
  "web3",
  "binance",
  "solana",
  "token",
  "mining",
  "đào coin",
];

const TECH_KEYWORDS = [
  "ai",
  "artificial intelligence",
  "trí tuệ nhân tạo",
  "machine learning",
  "công nghệ",
  "phần mềm",
  "software",
  "startup",
  "smartphone",
  "iphone",
  "android",
  "apple",
  "google",
  "microsoft",
  "openai",
  "chatgpt",
  "meta",
  "nvidia",
  "samsung",
  "chip",
  "semiconductor",
  "cloud",
  "saas",
  "robot",
  "vr",
  "ar",
];

export function classifyArticle(title: string, summary: string): Category {
  const text = `${title} ${summary}`.toLowerCase();
  if (CRYPTO_KEYWORDS.some((k) => text.includes(k))) return "CRYPTO";
  if (TECH_KEYWORDS.some((k) => text.includes(k))) return "TECH";
  if (ECONOMIC_KEYWORDS.some((k) => text.includes(k))) return "ECONOMIC";
  if (POLITICAL_KEYWORDS.some((k) => text.includes(k))) return "POLITICAL";
  return "GENERAL";
}
