export interface RawArticle {
  url: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  publishedAt: Date;
  source: string;
}
