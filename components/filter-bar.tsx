"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useRef, useCallback } from "react";

const CATEGORIES = ["ALL", "ECONOMIC", "POLITICAL", "GENERAL"] as const;
const SOURCES = ["ALL", "VnExpress", "CafeF", "VietnamNet", "TuoiTre", "ThanhNien", "CurrentsAPI"] as const;

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timerRef = useRef<NodeJS.Timeout>(null);

  const category = searchParams.get("category") ?? "ALL";
  const source = searchParams.get("source") ?? "ALL";
  const search = searchParams.get("search") ?? "";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "ALL" || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page"); // reset pagination on filter change
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearch = (value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => updateParams("search", value), 300);
  };

  const hasFilters = category !== "ALL" || source !== "ALL" || search !== "";

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <Select value={category} onValueChange={(v) => updateParams("category", v ?? "ALL")}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Danh mục" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c === "ALL" ? "Tất cả" : c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={source} onValueChange={(v) => updateParams("source", v ?? "ALL")}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Nguồn" />
        </SelectTrigger>
        <SelectContent>
          {SOURCES.map((s) => (
            <SelectItem key={s} value={s}>
              {s === "ALL" ? "Tất cả" : s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Tìm kiếm..."
        defaultValue={search}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-[200px]"
      />

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}
