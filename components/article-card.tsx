import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils/format-date";

interface ArticleCardProps {
  title: string;
  url: string;
  source: string;
  category: string;
  summary?: string | null;
  publishedAt: string;
  imageUrl?: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  ECONOMIC: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  POLITICAL: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  GENERAL: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export function ArticleCard({
  title,
  url,
  source,
  category,
  summary,
  publishedAt,
  imageUrl,
}: ArticleCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">{source}</Badge>
          <Badge className={`text-xs ${CATEGORY_COLORS[category] ?? ""}`}>
            {category}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            {timeAgo(publishedAt)}
          </span>
        </div>
        <CardTitle className="text-base leading-snug">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {title}
          </a>
        </CardTitle>
      </CardHeader>
      {(summary || imageUrl) && (
        <CardContent className="pt-0">
          <div className="flex gap-3">
            {summary && (
              <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                {summary}
              </p>
            )}
            {imageUrl && (
              <img
                src={imageUrl}
                alt=""
                className="w-20 h-14 object-cover rounded shrink-0"
              />
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
