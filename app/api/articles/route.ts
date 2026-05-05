import { NextRequest } from "next/server";
import { Category } from "@prisma/client";
import { prisma } from "@/lib/db";
import { paginate } from "@/lib/utils/api-helpers";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const categoryParam = params.get("category");
  const category = categoryParam && ["ECONOMIC", "POLITICAL", "GENERAL"].includes(categoryParam)
    ? (categoryParam as Category)
    : null;
  const source = params.get("source");
  const search = params.get("search");
  const page = Number(params.get("page") ?? 1);
  const limit = Number(params.get("limit") ?? 20);

  const { skip, take } = paginate(page, limit);

  const where = {
    ...(category ? { category } : {}),
    ...(source ? { source } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({ where, orderBy: { publishedAt: "desc" }, skip, take }),
    prisma.article.count({ where }),
  ]);

  return Response.json({ articles, total, page, limit: take });
}
