import Parser from "rss-parser";
import { RawArticle } from "@/types/article";

// X/Twitter accounts to fetch via Nitter RSS
const X_ACCOUNTS = [
  { handle: "CryptoCred", source: "CryptoCred" },
  { handle: "AltCryptoBet", source: "AltCryptoBet" },
  { handle: "BTC_Archive", source: "BTC_Archive" },
  { handle: "CoinDesk", source: "CoinDesk" },
  { handle: "CryptoNews", source: "CryptoNews" },
];

// Nitter instances (fallback list)
const NITTER_INSTANCES = [
  "nitter.uest.cc",
  "nitter.poast.org",
  "nitter.net",
];

const parser = new Parser({ timeout: 10_000 });

async function fetchFromNitter(
  handle: string,
  instance: string
): Promise<RawArticle[]> {
  try {
    const url = `https://${instance}/${handle}/rss`;
    const parsed = await parser.parseURL(url);

    return (parsed.items ?? []).map((item) => ({
      url: item.link ?? `https://x.com/${handle}/status/${item.id}`,
      title: item.title ?? "",
      summary: (item.contentSnippet ?? item.content ?? "").slice(0, 300),
      imageUrl: item.enclosure?.url,
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      source: handle,
    }));
  } catch {
    return [];
  }
}

export async function fetchXFeeds(): Promise<RawArticle[]> {
  const results: RawArticle[] = [];

  for (const account of X_ACCOUNTS) {
    for (const instance of NITTER_INSTANCES) {
      const articles = await fetchFromNitter(account.handle, instance);
      if (articles.length > 0) {
        results.push(...articles);
        break; // Success from this account, move to next
      }
    }
  }

  return results.filter((a) => a.url);
}