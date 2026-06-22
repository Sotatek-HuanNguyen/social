import { NextRequest } from "next/server";
import { Category } from "@prisma/client";
import { prisma } from "@/lib/db";
import { paginate } from "@/lib/utils/api-helpers";
import { X_HANDLES } from "@/lib/services/x-fetcher";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const categoryParam = params.get("category");
  const validCategories = ["ECONOMIC", "POLITICAL", "GENERAL", "CRYPTO", "TECH"];
  const category = categoryParam && validCategories.includes(categoryParam)
    ? (categoryParam as Category)
    : null;
  const source = params.get("source");
  const search = params.get("search");
  const excludeGeneral = params.get("excludeGeneral") === "true";
  const page = Number(params.get("page") ?? 1);
  const limit = Number(params.get("limit") ?? 20);

  const { skip, take } = paginate(page, limit);

  const where = {
    ...(category ? { category } : {}),
    ...(excludeGeneral ? { category: { not: "GENERAL" as Category } } : {}),
    ...(source
      ? source === "X/Twitter"
        ? { source: { in: X_HANDLES } }
        : { source }
      : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({ where, orderBy: { publishedAt: "desc" }, skip, take }),
    prisma.article.count({ where }),
  ]);

  return Response.json({ articles, total, page, limit: take });
}
