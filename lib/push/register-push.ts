/**
 * Client-side push subscription management.
 * Registers/unregisters the service worker and push subscription.
 */

export async function registerPush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  // Save subscription to server
  await fetch("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify(sub),
    headers: { "Content-Type": "application/json" },
  });

  return sub;
}

export async function unregisterPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      body: JSON.stringify({ endpoint: sub.endpoint }),
      headers: { "Content-Type": "application/json" },
    });
    await sub.unsubscribe();
  }
}
