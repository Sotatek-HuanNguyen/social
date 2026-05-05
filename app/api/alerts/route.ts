import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/utils/api-helpers";

export async function GET() {
  const rules = await prisma.alertRule.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json(rules);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.keywords?.length) {
      return jsonError("keywords required", 400);
    }

    const rule = await prisma.alertRule.create({
      data: {
        keywords: body.keywords,
        category: body.category ?? null,
      },
    });

    return Response.json(rule, { status: 201 });
  } catch {
    return jsonError("Invalid request body", 400);
  }
}
