/// <reference lib="webworker" />

// Push event: show OS notification even when offline/tab closed
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    // Fallback for plain text push (e.g. DevTools test)
    data = { title: "Tin mới", body: event.data?.text() || "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Tin mới", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: data.tag || "news", // group same tag → replace old notification
      data: { url: data.url || "/" },
    })
  );
});

// Click notification → open article URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // Focus existing tab if already open at that URL
      for (const client of clientList) {
        if (client.url === event.notification.data.url && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(event.notification.data.url);
    })
  );
});
