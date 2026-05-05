import webPush from "web-push";

webPush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:admin@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export { webPush };
