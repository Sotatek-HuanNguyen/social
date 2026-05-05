"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface AlertRuleFormProps {
  onCreated: () => void;
}

export function AlertRuleForm({ onCreated }: AlertRuleFormProps) {
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState("ALL");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywords.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          category: category === "ALL" ? null : category,
        }),
      });

      if (res.ok) {
        setKeywords("");
        setCategory("ALL");
        onCreated();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-6">
      <Input
        placeholder="Từ khóa (phân cách bằng dấu phẩy)"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        className="flex-1 min-w-[200px]"
      />
      <Select value={category} onValueChange={(v) => setCategory(v ?? "ALL")}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Danh mục" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tất cả</SelectItem>
          <SelectItem value="ECONOMIC">ECONOMIC</SelectItem>
          <SelectItem value="POLITICAL">POLITICAL</SelectItem>
          <SelectItem value="GENERAL">GENERAL</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" disabled={submitting || !keywords.trim()}>
        {submitting ? "Đang tạo..." : "Tạo cảnh báo"}
      </Button>
    </form>
  );
}
