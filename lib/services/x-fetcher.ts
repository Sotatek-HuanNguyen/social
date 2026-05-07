import { TwitterApi } from "twitter-api-v2";
import { RawArticle } from "@/types/article";

// X accounts to monitor (handle → cached user ID)
const X_ACCOUNTS = [
  { handle: "CryptoCred" },
  { handle: "AltCryptoBet" },
  { handle: "BTC_Archive" },
  { handle: "CoinDesk" },
  { handle: "CryptoNews" },
];

// In-memory user ID cache (persists across invocations in warm serverless)
const userIdCache = new Map<string, string>();

export async function fetchXFeeds(): Promise<RawArticle[]> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) return [];

  const client = new TwitterApi(token).readOnly;
  const results: RawArticle[] = [];

  for (const account of X_ACCOUNTS) {
    try {
      // Resolve handle → user ID (cached)
      let userId = userIdCache.get(account.handle);
      if (!userId) {
        const user = await client.v2.userByUsername(account.handle);
        if (!user.data) continue;
        userId = user.data.id;
        userIdCache.set(account.handle, userId);
      }

      // Fetch recent tweets (original only, no RTs/replies)
      const timeline = await client.v2.userTimeline(userId, {
        max_results: 10,
        "tweet.fields": ["created_at", "text"],
        exclude: ["retweets", "replies"],
      });

      for (const tweet of timeline.data?.data ?? []) {
        results.push({
          url: `https://x.com/${account.handle}/status/${tweet.id}`,
          title: tweet.text.slice(0, 120),
          summary: tweet.text.slice(0, 300),
          publishedAt: tweet.created_at
            ? new Date(tweet.created_at)
            : new Date(),
          source: account.handle,
        });
      }
    } catch {
      // Skip failed accounts, continue others
    }
  }

  return results;
}
