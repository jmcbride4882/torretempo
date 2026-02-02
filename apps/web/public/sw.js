// Torre Tempo Service Worker
// Version 2.0.0 - Fixed aggressive caching of hashed assets

const CACHE_NAME = "torre-tempo-v2-20260202";
const ASSETS_TO_CACHE = ["/", "/index.html", "/manifest.json", "/icon.svg"];

// Install event - cache assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching app shell");
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log("[SW] Service worker installed");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Installation failed:", error);
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }),
        );
      })
      .then(() => {
        console.log("[SW] Service worker activated");
        return self.clients.claim();
      }),
  );
});

// Fetch event - serve from cache, fallback to network
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

  // Skip hashed assets (JS/CSS with version hash in filename)
  // Vite generates filenames like: index-DxCAcxTs.js, index-BokcDq__.css
  // These change on every build, so NO caching needed
  if (url.pathname.match(/\/assets\/.*-[a-zA-Z0-9_-]+\.(js|css)$/)) {
    console.log("[SW] Skipping cache for hashed asset:", request.url);
    return; // Let browser handle (will fetch fresh)
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log("[SW] Serving from cache:", request.url);
        return cachedResponse;
      }

      console.log("[SW] Fetching from network:", request.url);
      return fetch(request)
        .then((response) => {
          // Only cache app shell (HTML, manifest, icons)
          // Do NOT cache hashed assets (handled above)
          const shouldCache =
            response &&
            response.status === 200 &&
            (url.pathname === "/" ||
              url.pathname.endsWith(".html") ||
              url.pathname.endsWith("manifest.json") ||
              url.pathname.endsWith(".svg") ||
              url.pathname.endsWith(".png"));

          if (shouldCache) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch((error) => {
          console.error("[SW] Fetch failed:", error);
          // Return offline page if available
          return caches.match("/offline.html");
        });
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
