"use client";

import { useState } from "react";
import { ArticleCard } from "@/components/article-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  category: string;
  summary?: string | null;
  publishedAt: string;
  imageUrl?: string | null;
}

interface ArticleFeedProps {
  initialArticles: Article[];
  initialTotal: number;
  searchParams: Record<string, string>;
}

export function ArticleFeed({ initialArticles, initialTotal, searchParams }: ArticleFeedProps) {
  const [articles, setArticles] = useState(initialArticles);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const hasMore = articles.length < total;

  const loadMore = async () => {
    setLoading(true);
    const nextPage = page + 1;
    const params = new URLSearchParams(searchParams);
    params.set("page", String(nextPage));

    try {
      const res = await fetch(`/api/articles?${params.toString()}`);
      const data = await res.json();
      setArticles((prev) => [...prev, ...data.articles]);
      setTotal(data.total);
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  };

  if (articles.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">Không có bài viết nào</p>
        <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc quay lại sau</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {articles.map((article) => (
        <ArticleCard key={article.id} {...article} />
      ))}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <div className="text-center pt-2">
          <Button variant="outline" onClick={loadMore}>
            Tải thêm
          </Button>
        </div>
      )}
    </div>
  );
}
