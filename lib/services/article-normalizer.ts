import { RawArticle } from "@/types/article";

/** Strip HTML tags from a string */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/** Normalize a raw article into a Prisma-ready shape */
export function normalizeArticle(raw: RawArticle) {
  return {
    url: raw.url.trim(),
    title: raw.title.trim(),
    summary: raw.summary ? stripHtml(raw.summary) : null,
    imageUrl: raw.imageUrl || null,
    publishedAt: raw.publishedAt instanceof Date && !isNaN(raw.publishedAt.getTime())
      ? raw.publishedAt
      : new Date(),
    source: raw.source,
  };
}
