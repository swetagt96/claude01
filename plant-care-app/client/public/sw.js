/* PlantPal service worker — handles background push notifications. */

self.addEventListener("install", (event) => {
  // Activate immediately so reminders work without a reload.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A pass-through fetch handler. Its presence is part of the PWA install
// criteria; we let the network handle requests normally (no offline caching).
self.addEventListener("fetch", () => {
  // intentionally empty — do not call respondWith, so the browser proceeds as usual
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "PlantPal", body: event.data ? event.data.text() : "Time to water a plant." };
  }

  const title = data.title || "🌿 PlantPal reminder";
  const options = {
    body: data.body || "One of your plants needs watering.",
    tag: data.tag || "plantpal",
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌿</text></svg>'
      ),
    badge:
      "data:image/svg+xml," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌿</text></svg>'
      ),
    data: { url: data.url || "/" },
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
