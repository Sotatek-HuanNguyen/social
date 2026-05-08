import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fetchRssFeeds } from "@/lib/services/rss-fetcher";
import { fetchXFeeds } from "@/lib/services/x-fetcher";
import { fetchCurrentsApi } from "@/lib/services/currents-api-client";
import { fetchCoinGeckoPrices } from "@/lib/services/coingecko-price-fetcher";
import { fetchEtherscanWhaleTransfers } from "@/lib/services/etherscan-whale-fetcher";
import { fetchDefiLlamaTvl } from "@/lib/services/defillama-tvl-fetcher";
import { fetchBinanceFuturesData } from "@/lib/services/binance-futures-fetcher";
import { normalizeArticle } from "@/lib/services/article-normalizer";
import { classifyArticle } from "@/lib/utils/keyword-classifier";
import { sendPushToAll } from "@/lib/push/send-push";
import { RawArticle } from "@/types/article";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "")
    ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fetcherNames = ["RSS", "X/Twitter", "Currents", "CoinGecko", "Etherscan", "DeFiLlama", "Binance"];
  const results = await Promise.allSettled([
    fetchRssFeeds(),
    fetchXFeeds(),
    fetchCurrentsApi(),
    fetchCoinGeckoPrices(),
    fetchEtherscanWhaleTransfers(),
    fetchDefiLlamaTvl(),
    fetchBinanceFuturesData(),
  ]);

  // Log rejected fetchers for observability (M2 fix)
  results.forEach((r, i) => {
    if (r.status === "rejected") console.warn(`Fetcher ${fetcherNames[i]} failed:`, r.reason);
  });

  const all: RawArticle[] = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  );

  let saved = 0;
  const newBreaking: { title: string; url: string; source: string }[] = [];

  for (const raw of all) {
    const normalized = normalizeArticle(raw);
    const category = classifyArticle(normalized.title, normalized.summary ?? "");

    try {
      const result = await prisma.article.upsert({
        where: { url: normalized.url },
        update: {},
        create: { ...normalized, category },
      });
      // Track newly created breaking/non-general articles for push
      if (result.id && category !== "GENERAL") {
        newBreaking.push({ title: normalized.title, url: normalized.url, source: normalized.source });
      }
      saved++;
    } catch (err) {
      console.warn(`Article upsert failed for ${normalized.url}:`, err);
    }
  }

  // Send push notification for the most recent breaking article
  if (newBreaking.length > 0) {
    const latest = newBreaking[0];
    try {
      await sendPushToAll({
        title: `${latest.source}`,
        body: latest.title,
        url: latest.url,
        tag: "breaking",
      });
    } catch (err) {
      console.warn("Push notification failed:", err);
    }
  }

  return Response.json({ saved, total: all.length });
}
