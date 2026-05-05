import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  // Closure-scoped refs for cleanup
  let interval: NodeJS.Timeout;
  let ping: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      // Poll DB every 30s for breaking articles from the last minute
      interval = setInterval(async () => {
        try {
          const breaking = await prisma.article.findMany({
            where: {
              isBreaking: true,
              publishedAt: { gte: new Date(Date.now() - 60_000) },
            },
            orderBy: { publishedAt: "desc" },
            take: 5,
          });

          if (breaking.length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(breaking)}\n\n`)
            );
          }
        } catch {
          // silently skip DB errors during polling
        }
      }, 30_000);

      // Keep-alive ping every 15s
      ping = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15_000);

      // Send initial ping immediately
      controller.enqueue(encoder.encode(": connected\n\n"));
    },
    cancel() {
      clearInterval(interval);
      clearInterval(ping);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
