import webPush from "web-push";

let initialized = false;

export function getWebPush() {
  if (!initialized) {
    webPush.setVapidDetails(
      process.env.VAPID_EMAIL || "mailto:admin@example.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    initialized = true;
  }
  return webPush;
}
