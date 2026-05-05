import Parser from "rss-parser";
import { RawArticle } from "@/types/article";

const RSS_FEEDS = [
  { url: "https://vnexpress.net/rss/kinh-doanh.rss", source: "VnExpress" },
  { url: "https://cafef.vn/rss/thi-truong-chung-khoan.rss", source: "CafeF" },
  { url: "https://vietnamnet.vn/rss/kinh-te.rss", source: "VietnamNet" },
  { url: "https://tuoitre.vn/rss/kinh-te.rss", source: "TuoiTre" },
  { url: "https://thanhnien.vn/rss/kinh-te.rss", source: "ThanhNien" },
  // Crypto feeds
  { url: "https://cointelegraph.com/rss", source: "CoinTelegraph" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk" },
  // Tech feeds
  { url: "https://vnexpress.net/rss/so-hoa.rss", source: "VnExpress" },
  { url: "https://tuoitre.vn/rss/nhip-song-so.rss", source: "TuoiTre" },
  { url: "https://thanhnien.vn/rss/cong-nghe.rss", source: "ThanhNien" },
];

const parser = new Parser({ timeout: 10_000 });

export async function fetchRssFeeds(): Promise<RawArticle[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return (parsed.items ?? []).map((item) => ({
        url: item.link ?? "",
        title: item.title ?? "Untitled",
        summary: (item.contentSnippet ?? item.content ?? "").slice(0, 300),
        imageUrl: item.enclosure?.url,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        source: feed.source,
      }));
    })
  );

  const articles: RawArticle[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      articles.push(...r.value);
    }
  }
  return articles.filter((a) => a.url);
}
