import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/utils/api-helpers";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.alertRule.delete({ where: { id } });
    return Response.json({ deleted: true });
  } catch {
    return jsonError("Alert rule not found", 404);
  }
}
