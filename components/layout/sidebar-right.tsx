"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/utils/format-date";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

interface AlertRule {
  id: string;
  keywords: string[];
  category: string | null;
}

interface TrendingSource {
  source: string;
  count: number;
}

export function SidebarRight({ className }: { className?: string }) {
  const [breaking, setBreaking] = useState<Article[]>([]);
  const [trending, setTrending] = useState<TrendingSource[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);

  useEffect(() => {
    // Fetch breaking news (top 5 non-general, last 24h)
    fetch("/api/articles?limit=5&excludeGeneral=true")
      .then((r) => r.json())
      .then((d) => setBreaking(d.articles ?? []))
      .catch(() => {});

    // Fetch alert rules
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => setAlerts(Array.isArray(d) ? d : []))
      .catch(() => {});

    // Fetch trending sources (reuse articles endpoint, aggregate client-side)
    fetch("/api/articles?limit=50")
      .then((r) => r.json())
      .then((d) => {
        const articles: Article[] = d.articles ?? [];
        const counts: Record<string, number> = {};
        articles.forEach((a) => {
          counts[a.source] = (counts[a.source] ?? 0) + 1;
        });
        const sorted = Object.entries(counts)
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setTrending(sorted);
      })
      .catch(() => {});
  }, []);

  return (
    <aside className={className}>
      <div className="w-70 p-4 space-y-5 overflow-y-auto">
        {/* Breaking news */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Tin nổi bật
          </h3>
          {breaking.length === 0 ? (
            <p className="text-xs text-muted-foreground">Chưa có tin mới</p>
          ) : (
            <div className="space-y-2">
              {breaking.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <p className="text-sm leading-snug group-hover:underline line-clamp-2">
                    {article.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {article.source} · {timeAgo(article.publishedAt)}
                  </p>
                </a>
              ))}
            </div>
          )}
        </section>

        <Separator />

        {/* Trending sources */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Nguồn phổ biến
          </h3>
          {trending.length === 0 ? (
            <p className="text-xs text-muted-foreground">Đang tải...</p>
          ) : (
            <div className="space-y-1.5">
              {trending.map((t) => (
                <div
                  key={t.source}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate">{t.source}</span>
                  <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                    {t.count}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        <Separator />

        {/* Active alerts summary */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cảnh báo đang bật
            </h3>
            <Link
              href="/alerts"
              className="text-xs text-primary hover:underline"
            >
              Quản lý
            </Link>
          </div>
          {alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Chưa có cảnh báo nào
            </p>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex flex-wrap gap-1">
                  {alert.keywords.map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                  {alert.category && (
                    <Badge className="text-xs">{alert.category}</Badge>
                  )}
                </div>
              ))}
              {alerts.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  +{alerts.length - 5} cảnh báo khác
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
