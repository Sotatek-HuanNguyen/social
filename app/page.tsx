import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Category } from "@prisma/client";
import { BreakingNewsBanner } from "@/components/breaking-news-banner";
import { ArticleFeed } from "@/components/article-feed";
import { Skeleton } from "@/components/ui/skeleton";
import { X_HANDLES } from "@/lib/services/x-fetcher";
import { MacroDigest } from "@/components/macro-digest";

const VALID_CATEGORIES = ["ECONOMIC", "POLITICAL", "GENERAL", "CRYPTO", "TECH"];

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const categoryParam = params.category;
  const category =
    categoryParam && VALID_CATEGORIES.includes(categoryParam)
      ? (categoryParam as Category)
      : undefined;
  const source = params.source;
  const search = params.search;

  const where = {
    ...(category ? { category } : {}),
    ...(source
      ? source === "X/Twitter"
        ? { source: { in: X_HANDLES } }
        : { source }
      : {}),
    ...(search
      ? { title: { contains: search, mode: "insensitive" as const } }
      : {}),
  };

  const [articles, total, macroArticles] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: 20,
    }),
    prisma.article.count({ where }),
    prisma.article.findMany({
      where: {
        source: { in: ["Reuters", "Bloomberg", ...X_HANDLES] }
      },
      orderBy: { publishedAt: "desc" },
      take: 5
    })
  ]);

  // Serialize dates for client components
  const serialized = articles.map((a) => ({
    ...a,
    publishedAt: a.publishedAt.toISOString(),
    fetchedAt: a.fetchedAt.toISOString(),
  }));

  const serializedMacro = macroArticles.map((a) => ({
    id: a.id,
    title: a.title,
    url: a.url,
    source: a.source,
    category: a.category,
    publishedAt: a.publishedAt.toISOString()
  }));

  const showMacroDigest = !category && !source && !search;

  const filterParams: Record<string, string> = {};
  if (category) filterParams.category = category;
  if (source) filterParams.source = source;
  if (search) filterParams.search = search;

  return (
    <div>
      <Suspense fallback={<Skeleton className="h-10 w-full mb-4" />}>
        <BreakingNewsBanner />
      </Suspense>
      {showMacroDigest && <MacroDigest initialArticles={serializedMacro} />}
      <ArticleFeed
        key={JSON.stringify(filterParams)}
        initialArticles={serialized}
        initialTotal={total}
        searchParams={filterParams}
      />
    </div>
  );
}
