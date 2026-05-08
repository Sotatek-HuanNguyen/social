"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRef, useCallback } from "react";
import { Menu, Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NotificationPermissionButton } from "@/components/notification-permission-button";

interface HeaderBarProps {
  onMenuToggle: () => void;
}

export function HeaderBar({ onMenuToggle }: HeaderBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timerRef = useRef<NodeJS.Timeout>(null);

  const search = searchParams.get("search") ?? "";

  const handleSearch = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "") {
          params.delete("search");
        } else {
          params.set("search", value);
        }
        params.delete("page");
        router.push(`/?${params.toString()}`);
      }, 300);
    },
    [router, searchParams]
  );

  return (
    <header className="sticky top-0 z-50 bg-background border-b h-14 px-4 flex items-center gap-3">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0"
        onClick={onMenuToggle}
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Logo */}
      <Link href="/" className="font-bold text-lg shrink-0 whitespace-nowrap">
        Tin Tức
      </Link>

      {/* Search — centered on desktop, expands on mobile */}
      <div className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm bài viết..."
            defaultValue={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-0 focus-visible:bg-background focus-visible:border"
          />
        </div>
      </div>

      {/* Right nav icons */}
      <div className="flex items-center gap-1 shrink-0">
        <NotificationPermissionButton />
        <Link
          href="/alerts"
          aria-label="Cảnh báo"
          className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
        >
          <Bell className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
