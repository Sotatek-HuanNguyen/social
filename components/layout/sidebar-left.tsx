"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid,
  Bitcoin,
  Cpu,
  TrendingUp,
  Landmark,
  Newspaper,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "", label: "Tất cả", icon: LayoutGrid },
  { value: "CRYPTO", label: "Crypto", icon: Bitcoin },
  { value: "TECH", label: "Công nghệ", icon: Cpu },
  { value: "ECONOMIC", label: "Kinh tế", icon: TrendingUp },
  { value: "POLITICAL", label: "Chính trị", icon: Landmark },
  { value: "GENERAL", label: "Tổng hợp", icon: Newspaper },
] as const;

const SOURCES = [
  "VnExpress",
  "CafeF",
  "VietnamNet",
  "TuoiTre",
  "ThanhNien",
  "CurrentsAPI",
  "X/Twitter",
  "CoinGecko",
  "Etherscan",
  "DeFiLlama",
  "Binance Futures",
] as const;

interface SidebarLeftProps {
  className?: string;
  onNavigate?: () => void;
}

export function SidebarLeft({ className, onNavigate }: SidebarLeftProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") ?? "";
  const activeSource = searchParams.get("source") ?? "";

  const navigate = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    router.push(`/?${params.toString()}`);
    onNavigate?.();
  };

  return (
    <aside className={cn("w-60 p-4 space-y-6 overflow-y-auto", className)}>
      {/* Categories */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Danh mục
        </h3>
        <nav className="space-y-0.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => navigate("category", cat.value)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {cat.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sources */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Nguồn tin
        </h3>
        <nav className="space-y-0.5">
          <button
            onClick={() => navigate("source", "")}
            className={cn(
              "w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors",
              activeSource === ""
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted text-foreground"
            )}
          >
            Tất cả nguồn
          </button>
          {SOURCES.map((src) => (
            <button
              key={src}
              onClick={() => navigate("source", src)}
              className={cn(
                "w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors truncate",
                activeSource === src
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              {src}
            </button>
          ))}
        </nav>
      </div>

      {/* Alerts shortcut */}
      <div>
        <Link
          href="/alerts"
          onClick={() => onNavigate?.()}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
        >
          <Bell className="h-4 w-4 shrink-0" />
          Quản lý cảnh báo
        </Link>
      </div>
    </aside>
  );
}
