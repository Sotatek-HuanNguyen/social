import { ArrowLeft, Newspaper, Calendar, TrendingUp, Shield, Zap, Lightbulb, ExternalLink } from "lucide-react";
import Link from "next/link";

const SOURCES = [
  {
    icon: Newspaper,
    color: "bg-orange-500/10 text-orange-500",
    name: "Reuters",
    tag: "reuters.com",
    url: "https://www.reuters.com",
    what: "Tin tức toàn cầu uy tín nhất. Mở vào đầu ngày.",
    how: "Đọc lướt 5–10 headline trên trang chủ hoặc chuyên mục Business/Markets.",
  },
  {
    icon: TrendingUp,
    color: "bg-blue-500/10 text-blue-500",
    name: "Bloomberg",
    tag: "bloomberg.com",
    url: "https://www.bloomberg.com",
    what: "Góc nhìn tài chính chuyên sâu, nhận định thị trường.",
    how: "Tập trung vào Markets & Economics. Xem xu hướng dòng tiền lớn.",
  },
  {
    icon: Calendar,
    color: "bg-emerald-500/10 text-emerald-500",
    name: "Lịch kinh tế",
    tag: "investing.com/economic-calendar",
    url: "https://www.investing.com/economic-calendar/",
    what: "Biết trước hôm nay có sự kiện gây biến động không.",
    how: "Lọc sự kiện ★★★ — đặc biệt CPI, FOMC, Non-farm Payrolls.",
  },
  {
    icon: Zap,
    color: "bg-purple-500/10 text-purple-500",
    name: "@KobeissiLetter",
    tag: "X / Twitter",
    url: "https://x.com/KobeissiLetter",
    what: "Phân tích vĩ mô trung–dài hạn, so sánh lịch sử.",
    how: "Đọc thread mới nhất. Chú ý các biểu đồ so sánh lịch sử thị trường.",
  },
  {
    icon: Zap,
    color: "bg-sky-500/10 text-sky-500",
    name: "@DeItaone",
    tag: "X / Twitter",
    url: "https://x.com/DeItaone",
    what: "Headline feed nhanh nhất — phát ngôn FED, số liệu vừa công bố.",
    how: "Scroll 2–3 phút để nắm tin nóng ngay lúc vừa ra.",
  },
  {
    icon: Shield,
    color: "bg-red-500/10 text-red-500",
    name: "@zerohedge",
    tag: "X / Twitter",
    url: "https://x.com/zerohedge",
    what: "Góc nhìn phản biện — rủi ro thanh khoản, nợ công, địa chính trị.",
    how: "Đọc nhanh để nhận diện các rủi ro đang bị thị trường bỏ qua.",
  },
];

export default function MacroPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Quay lại bảng tin
        </Link>

        <div className="border-b pb-5">
          <h1 className="text-2xl font-bold tracking-tight">Combo Macro cho người mới</h1>
          <p className="text-sm text-muted-foreground mt-1">
            6 nguồn tin tối giản — đọc 10 phút mỗi sáng, nắm đủ bức tranh vĩ mô.
          </p>
        </div>
      </div>

      {/* Source cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {SOURCES.map((src) => {
          const Icon = src.icon;
          return (
            <a
              key={src.name}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-3 p-5 rounded-2xl border bg-card hover:shadow-md hover:border-muted-foreground/20 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${src.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{src.name}</p>
                    <p className="text-[11px] text-muted-foreground">{src.tag}</p>
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 mt-1 transition-colors" />
              </div>

              <div className="space-y-1.5 pl-12">
                <p className="text-xs font-medium text-foreground">{src.what}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  💡 {src.how}
                </p>
              </div>
            </a>
          );
        })}
      </div>

      {/* Tip */}
      <div className="flex gap-3 items-start rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Mẹo:</strong> Đừng đọc hết — chỉ cần 10 phút mỗi sáng để lướt qua headline các nguồn này. 
          Thói quen đều đặn quan trọng hơn lượng thông tin nạp vào mỗi lần.
        </p>
      </div>
    </div>
  );
}
