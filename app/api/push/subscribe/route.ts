import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { endpoint, keys } = await req.json();

    if (!endpoint || !keys) {
      return Response.json({ error: "Missing endpoint or keys" }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { keys },
      create: { endpoint, keys },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return Response.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return Response.json({ error: "Missing endpoint" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return Response.json({ error: "Failed to remove subscription" }, { status: 500 });
  }
}
