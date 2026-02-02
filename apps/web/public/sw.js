// Torre Tempo Service Worker
// Version 3.0.0 - NUCLEAR CACHE BUSTING (Network-First Strategy)

const CACHE_NAME = "torre-tempo-v3.0-20260202-1820";
const STATIC_ASSETS = ["/manifest.json", "/icon.svg"];

// Install event - cache only static assets (NOT HTML/JS/CSS)
self.addEventListener("install", (event) => {
  console.log("[SW v3] Installing with network-first strategy...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW v3] Caching static assets only");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("[SW v3] Service worker installed - skipping wait");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW v3] Installation failed:", error);
      }),
  );
});

// Activate event - NUKE ALL OLD CACHES
self.addEventListener("activate", (event) => {
  console.log("[SW v3] Activating - deleting ALL old caches...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log("[SW v3] 🗑️ NUKING old cache:", cacheName);
              return caches.delete(cacheName);
            }),
        );
      })
      .then(() => {
        console.log("[SW v3] ✅ Service worker activated - claiming clients");
        return self.clients.claim();
      }),
  );
});

// Fetch event - NETWORK FIRST for everything except icons
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip API requests (always fetch fresh)
  if (url.pathname.includes("/api/")) {
    return;
  }

  // NETWORK FIRST STRATEGY (opposite of old cache-first)
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache static assets (manifest, icons) - NOT HTML/JS/CSS
        const isStaticAsset =
          response &&
          response.status === 200 &&
          (url.pathname.endsWith("manifest.json") ||
            url.pathname.endsWith(".svg") ||
            url.pathname.endsWith(".png") ||
            url.pathname.endsWith(".ico"));

        if (isStaticAsset) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }

        return response;
      })
      .catch((error) => {
        console.warn("[SW v3] Network failed, trying cache:", request.url);

        // Only use cache as fallback for static assets
        if (
          url.pathname.endsWith(".svg") ||
          url.pathname.endsWith(".png") ||
          url.pathname.endsWith("manifest.json")
        ) {
          return caches.match(request);
        }

        // For HTML/JS/CSS, don't serve stale cache - fail gracefully
        console.error("[SW v3] No cache fallback for:", request.url);
        throw error;
      }),
  );
});

// Background sync (future enhancement)
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync:", event.tag);

  if (event.tag === "sync-time-entries") {
    event.waitUntil(syncTimeEntries());
  }
});

// Push notifications (future enhancement)
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  const data = event.data ? event.data.json() : {};
  const title = data.title || "Torre Tempo";
  const options = {
    body: data.body || "Nueva notificación",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    data: data.data,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");
  event.notification.close();

  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});

// Helper functions
async function syncTimeEntries() {
  console.log("[SW] Syncing time entries...");
  // Future implementation: sync offline time entries
  return Promise.resolve();
}
