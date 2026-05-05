import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/utils/api-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });

  if (!article) return jsonError("Article not found", 404);
  return Response.json(article);
}
