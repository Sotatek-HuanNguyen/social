"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AlertRule {
  id: string;
  keywords: string[];
  category: string | null;
  createdAt: string;
}

interface AlertRuleListProps {
  refreshKey: number;
}

export function AlertRuleList({ refreshKey }: AlertRuleListProps) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      setRules(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules, refreshKey]);

  const handleDelete = async (id: string) => {
    // Optimistic removal
    setRules((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Chưa có quy tắc cảnh báo nào
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rules.map((rule) => (
        <Card key={rule.id}>
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex flex-wrap items-center gap-2">
              {rule.keywords.map((kw) => (
                <Badge key={kw} variant="secondary">{kw}</Badge>
              ))}
              {rule.category && (
                <Badge variant="outline" className="text-xs">
                  {rule.category}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
              onClick={() => handleDelete(rule.id)}
            >
              Xóa
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
