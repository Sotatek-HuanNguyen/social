"use client";

import { useEffect, useState } from "react";
import { Sparkles, ExternalLink } from "lucide-react";
import { timeAgo } from "@/lib/utils/format-date";
import { Badge } from "@/components/ui/badge";

interface MacroArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  category: string;
  publishedAt: string;
}

interface MacroDigestProps {
  initialArticles: MacroArticle[];
}

const MACRO_SOURCES = ["Reuters", "Bloomberg", "KobeissiLetter", "DeItaone", "zerohedge"];

const SOURCE_COLORS: Record<string, string> = {
  Reuters: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  Bloomberg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  KobeissiLetter: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  DeItaone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  zerohedge: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export function MacroDigest({ initialArticles }: MacroDigestProps) {
  const [articles, setArticles] = useState<MacroArticle[]>(initialArticles);

  // Poll every 30s client-side to pick up newly ingested items
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/articles?limit=20");
        if (!res.ok) return;
        const data = await res.json();
        const filtered = (data.articles ?? [])
          .filter((a: MacroArticle) => MACRO_SOURCES.includes(a.source))
          .slice(0, 6);
        if (filtered.length > 0) setArticles(filtered);
      } catch {
        // silent fail
      }
    };

    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (articles.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold tracking-wide">Tin Vĩ Mô</span>
          <span className="text-[10px] text-muted-foreground">• Reuters · Bloomberg · X</span>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
          </span>
          Live
        </span>
      </div>

      {/* Articles */}
      <div className="divide-y divide-border/50">
        {articles.map((article) => {
          const isX = ["KobeissiLetter", "DeItaone", "zerohedge"].includes(article.source);
          const label = isX ? `@${article.source}` : article.source;
          const colorClass = SOURCE_COLORS[article.source] ?? "bg-muted text-muted-foreground";

          return (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${colorClass}`}>
                    {label}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {timeAgo(article.publishedAt)}
                  </span>
                </div>
                <p className="text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {article.title}
                </p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-1 transition-colors" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
