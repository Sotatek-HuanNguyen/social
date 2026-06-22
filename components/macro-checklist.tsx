"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, ExternalLink, RotateCcw, Newspaper, Calendar, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ProgressProps {
  value: number;
  className?: string;
}

function Progress({ value, className }: ProgressProps) {
  return (
    <div className={cn("relative w-full bg-muted rounded-full overflow-hidden", className)}>
      <div
        className="h-full bg-primary transition-all duration-300 ease-in-out rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

interface Task {
  id: string;
  title: string;
  source: string;
  description: string;
  detail: string;
  url: string;
  category: "news" | "calendar" | "twitter";
}

const MACRO_TASKS: Task[] = [
  {
    id: "reuters",
    title: "Xem Headline Reuters",
    source: "Reuters",
    description: "Cập nhật các dòng sự kiện lớn toàn cầu.",
    detail: "Tập trung vào trang chủ hoặc chuyên mục Kinh doanh (Business/Markets). Đọc lướt qua 5-10 headlines chính.",
    url: "https://www.reuters.com",
    category: "news",
  },
  {
    id: "bloomberg",
    title: "Xem Headline Bloomberg",
    source: "Bloomberg",
    description: "Nhận định thị trường tài chính chuyên sâu.",
    detail: "Đọc qua góc nhìn thị trường Mỹ/Châu Á. Xem tiêu đề nổi bật về chính sách tiền tệ và dòng tiền.",
    url: "https://www.bloomberg.com",
    category: "news",
  },
  {
    id: "calendar",
    title: "Kiểm tra Lịch sự kiện kinh tế",
    source: "Investing Calendar",
    description: "Theo dõi số liệu vĩ mô sắp công bố.",
    detail: "Tìm kiếm các tin tức 3 sao (đặc biệt là CPI, Quyết định lãi suất FED/FOMC, Non-farm Payrolls).",
    url: "https://www.investing.com/economic-calendar/",
    category: "calendar",
  },
  {
    id: "kobeissi",
    title: "Đọc The Kobeissi Letter",
    source: "X/Twitter @KobeissiLetter",
    description: "Phân tích vĩ mô tuần & góc nhìn kỹ thuật.",
    detail: "Theo dõi các bài viết phân tích xu hướng thị trường vốn, so sánh lịch sử vĩ mô toàn diện.",
    url: "https://x.com/KobeissiLetter",
    category: "twitter",
  },
  {
    id: "deltaone",
    title: "Cập nhật Walter Bloomberg",
    source: "X/Twitter @DeItaone",
    description: "Tin nhanh vĩ mô dạng text (Headline Feed).",
    detail: "Kênh cung cấp tin tức nhanh nhất về các phát ngôn của FED, số liệu kinh tế vừa được công bố.",
    url: "https://x.com/DeItaone",
    category: "twitter",
  },
  {
    id: "zerohedge",
    title: "Đọc nhanh Zerohedge",
    source: "X/Twitter @zerohedge",
    description: "Góc nhìn phản biện, tin tức tài chính độc lập.",
    detail: "Điểm qua góc nhìn trái chiều về rủi ro thanh khoản, nợ công, chính sách tài khóa.",
    url: "https://x.com/zerohedge",
    category: "twitter",
  },
];

interface MacroChecklistProps {
  variant?: "default" | "compact";
  className?: string;
}

export function MacroChecklist({ variant = "default", className }: MacroChecklistProps) {
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  // Get current date string in YYYY-MM-DD
  const getTodayKey = () => {
    const today = new Date();
    return `macro-checklist-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      const saved = localStorage.getItem(getTodayKey());
      if (saved) {
        setCheckedIds(JSON.parse(saved));
      } else {
        // Clear old macro checklist keys to save space
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("macro-checklist-")) {
            localStorage.removeItem(key);
          }
        });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleToggle = (id: string) => {
    const next = checkedIds.includes(id)
      ? checkedIds.filter((x) => x !== id)
      : [...checkedIds, id];
    setCheckedIds(next);
    localStorage.setItem(getTodayKey(), JSON.stringify(next));
  };

  const handleReset = () => {
    setCheckedIds([]);
    localStorage.setItem(getTodayKey(), JSON.stringify([]));
  };

  const handleTaskClick = (id: string, url: string) => {
    // Open in new window
    window.open(url, "_blank", "noopener,noreferrer");
    // Auto check if not checked yet
    if (!checkedIds.includes(id)) {
      handleToggle(id);
    }
  };

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-1/3 bg-muted rounded"></div>
        <div className="h-20 bg-muted rounded-lg"></div>
      </div>
    );
  }

  const completedCount = checkedIds.length;
  const totalCount = MACRO_TASKS.length;
  const percent = Math.round((completedCount / totalCount) * 100);

  if (variant === "compact") {
    return (
      <div className={cn("space-y-4", className)}>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Checklist Vĩ Mô ({completedCount}/{totalCount})
            </span>
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              title="Reset checklist"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={percent} className="h-2 flex-1" />
            <span className="text-xs font-bold shrink-0 tabular-nums">
              {percent}%
            </span>
          </div>
        </div>

        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
          {MACRO_TASKS.map((task) => {
            const isChecked = checkedIds.includes(task.id);
            return (
              <div
                key={task.id}
                className={cn(
                  "group flex items-center justify-between p-2 rounded-lg text-xs transition-all border",
                  isChecked 
                    ? "bg-primary/5 border-primary/20" 
                    : "bg-muted/40 hover:bg-muted/70 border-transparent"
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    onClick={() => handleToggle(task.id)}
                    className={cn(
                      "h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-all",
                      isChecked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/40 hover:border-muted-foreground"
                    )}
                  >
                    {isChecked && <CheckCircle2 className="h-3 w-3 fill-current stroke-[3px]" />}
                  </button>
                  <button
                    onClick={() => handleTaskClick(task.id, task.url)}
                    className="text-left font-medium truncate hover:underline group-hover:text-primary transition-colors flex-1"
                  >
                    {task.title}
                  </button>
                </div>
                <button
                  onClick={() => handleTaskClick(task.id, task.url)}
                  className="text-muted-foreground opacity-50 group-hover:opacity-100 p-0.5 transition-opacity"
                >
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>

        <Link
          href="/macro"
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-medium border bg-card hover:bg-accent text-foreground transition-all"
        >
          Trang tổng quan vĩ mô
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress Card */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/5 blur-xl"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <h2 className="text-xl font-bold tracking-tight">Hôm nay của bạn</h2>
            <p className="text-sm text-muted-foreground">
              Duy trì thói quen quét tin vĩ mô nhanh để nắm bắt xu thế thị trường.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-2xl font-extrabold tracking-tight tabular-nums">
                {completedCount} / {totalCount}
              </span>
              <span className="text-xs text-muted-foreground">Nhiệm vụ đã làm</span>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-background hover:bg-muted text-xs font-medium transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Làm mới
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={percent} className="h-2.5 flex-1" />
          <span className="text-sm font-bold w-10 text-right tabular-nums">{percent}%</span>
        </div>
      </div>

      {/* Task Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {MACRO_TASKS.map((task) => {
          const isChecked = checkedIds.includes(task.id);
          return (
            <div
              key={task.id}
              className={cn(
                "group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 bg-card hover:shadow-md",
                isChecked
                  ? "border-primary/30 ring-1 ring-primary/10 shadow-sm"
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleToggle(task.id)}
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0 rounded-md border flex items-center justify-center transition-all",
                    isChecked
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30 hover:border-muted-foreground/60"
                  )}
                >
                  {isChecked && <CheckCircle2 className="h-4 w-4 fill-current stroke-[3px]" />}
                </button>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {task.source}
                    </span>
                    {task.category === "calendar" && (
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {task.category === "news" && (
                      <Newspaper className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">
                    {task.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 font-normal leading-relaxed">
                    {task.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-muted/50 flex flex-col gap-3">
                <p className="text-xs text-muted-foreground/80 italic font-light leading-relaxed">
                  💡 {task.detail}
                </p>
                <button
                  onClick={() => handleTaskClick(task.id, task.url)}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm hover:shadow transition-all"
                >
                  Mở liên kết nguồn
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
