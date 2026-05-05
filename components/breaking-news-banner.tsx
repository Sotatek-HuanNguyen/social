"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface BreakingArticle {
  id: string;
  title: string;
  url: string;
}

export function BreakingNewsBanner() {
  const [articles, setArticles] = useState<BreakingArticle[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackTimer: NodeJS.Timeout | null = null;

    // Try SSE first
    try {
      eventSource = new EventSource("/api/alerts/sse");

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data) as BreakingArticle[];
        setArticles(data);
        setDismissed(false);
      };

      eventSource.onerror = () => {
        // SSE failed — fall back to polling
        eventSource?.close();
        eventSource = null;
        startPolling();
      };
    } catch {
      startPolling();
    }

    function startPolling() {
      fallbackTimer = setInterval(async () => {
        try {
          const res = await fetch("/api/articles?isBreaking=true&limit=5");
          const data = await res.json();
          if (data.articles?.length > 0) {
            setArticles(data.articles);
            setDismissed(false);
          }
        } catch {
          // silently skip polling errors
        }
      }, 60_000);
    }

    return () => {
      eventSource?.close();
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, []);

  if (dismissed || articles.length === 0) return null;

  return (
    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <Badge className="bg-red-600 text-white">TIN NÓNG</Badge>
        <button
          onClick={() => setDismissed(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Đóng
        </button>
      </div>
      <ul className="space-y-1">
        {articles.map((a) => (
          <li key={a.id}>
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline"
            >
              {a.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
