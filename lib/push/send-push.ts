import { prisma } from "@/lib/db";
import { webPush } from "./vapid";

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send push notification to all registered subscribers.
 * Automatically cleans up expired subscriptions (410 Gone).
 */
export async function sendPushToAll(payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return;

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys as { p256dh: string; auth: string },
        },
        JSON.stringify(payload)
      )
    )
  );

  // Remove expired subscriptions (410 Gone from push service)
  const expiredIds = results
    .map((r, i) =>
      r.status === "rejected" && r.reason?.statusCode === 410
        ? subs[i].id
        : null
    )
    .filter(Boolean) as string[];

  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: expiredIds } },
    });
  }
}
