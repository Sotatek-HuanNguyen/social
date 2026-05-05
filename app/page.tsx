import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Category } from "@prisma/client";
import { BreakingNewsBanner } from "@/components/breaking-news-banner";
import { FilterBar } from "@/components/filter-bar";
import { ArticleFeed } from "@/components/article-feed";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const categoryParam = params.category;
  const category = categoryParam && ["ECONOMIC", "POLITICAL", "GENERAL"].includes(categoryParam)
    ? (categoryParam as Category)
    : undefined;
  const source = params.source;
  const search = params.search;

  const where = {
    ...(category ? { category } : {}),
    ...(source ? { source } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: 20,
    }),
    prisma.article.count({ where }),
  ]);

  // Serialize dates for client components
  const serialized = articles.map((a) => ({
    ...a,
    publishedAt: a.publishedAt.toISOString(),
    fetchedAt: a.fetchedAt.toISOString(),
  }));

  const filterParams: Record<string, string> = {};
  if (category) filterParams.category = category;
  if (source) filterParams.source = source;
  if (search) filterParams.search = search;

  return (
    <div>
      <BreakingNewsBanner />
      <Suspense fallback={<Skeleton className="h-10 w-full mb-4" />}>
        <FilterBar />
      </Suspense>
      <ArticleFeed
        initialArticles={serialized}
        initialTotal={total}
        searchParams={filterParams}
      />
    </div>
  );
}
