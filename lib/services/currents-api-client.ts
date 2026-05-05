import { RawArticle } from "@/types/article";

interface CurrentsApiResponse {
  news: Array<{
    url: string;
    title: string;
    description: string;
    image: string;
    published: string;
  }>;
}

export async function fetchCurrentsApi(): Promise<RawArticle[]> {
  const apiKey = process.env.CURRENTS_API_KEY;
  if (!apiKey) return [];

  const res = await fetch(
    `https://api.currentsapi.services/v1/latest-news?language=vi&apiKey=${apiKey}`,
    { signal: AbortSignal.timeout(10_000) }
  );

  if (!res.ok) {
    console.error(`CurrentsAPI error: ${res.status}`);
    return [];
  }

  const data: CurrentsApiResponse = await res.json();

  return (data.news ?? []).map((item) => ({
    url: item.url,
    title: item.title,
    summary: (item.description ?? "").slice(0, 300),
    imageUrl: item.image || undefined,
    publishedAt: item.published ? new Date(item.published) : new Date(),
    source: "CurrentsAPI",
  }));
}
