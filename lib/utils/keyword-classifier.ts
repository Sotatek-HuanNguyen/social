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
  // Onchain/market data terms
  "whale",
  "tvl",
  "open interest",
  "funding rate",
  "liquidation",
  "defillama",
  "etherscan",
  "coingecko",
  "onchain",
  "on-chain",
  "btc",
  "eth",
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
  "frontend",
  "backend",
  "fullstack",
  "developer",
  "coding",
  "programming",
  "javascript",
  "typescript",
  "react",
  "vue",
  "angular",
  "nodejs",
  "python",
  "java",
  "golang",
  "css",
  "html",
  "lập trình",
];

export function classifyArticle(title: string, summary: string): Category {
  const text = `${title} ${summary}`.toLowerCase();
  // Use word-boundary matching to avoid substring collisions (e.g. "btc" vs "Bethesda")
  const matches = (keyword: string) => {
    const k = keyword.toLowerCase();
    // For Vietnamese multi-word phrases, fall back to substring match (word boundaries don't work well with diacritics)
    if (/[^a-z0-9 ]/.test(k) || k.includes(" ")) return text.includes(k);
    const re = new RegExp(`\\b${k}\\b`, "i");
    return re.test(text);
  };
  if (CRYPTO_KEYWORDS.some(matches)) return "CRYPTO";
  if (TECH_KEYWORDS.some(matches)) return "TECH";
  if (ECONOMIC_KEYWORDS.some(matches)) return "ECONOMIC";
  if (POLITICAL_KEYWORDS.some(matches)) return "POLITICAL";
  return "GENERAL";
}
