const CACHE_NAME = "shiro-notes-v2.1.0";
const OFFLINE_URL = "/offline.html";

const ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/pwa.css",
  "/pwa.js",
  "/base.css",
  "/layout.css",
  "/components.css",
  "/dashboard.css",
  "/editor.css",
  "/search.css",
  "/security.css",
  "/calendar.css",
  "/canvas.css",
  "/audio.css",
  "/profile.css",
  "/export.css",
  "/app.js",
  "/ui.js",
  "/editor.js",
  "/canvas.js",
  "/security.js",
  "/search.js",
  "/scheduler.js",
  "/audio.js",
  "/export.js",
  "/profile.js",
  "/dist/tailwind.css",
  "/dist-ts/shiro-enhancements.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          const cloned = response.clone();
          if (response.ok && new URL(event.request.url).origin === self.location.origin) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
          return new Response("Offline", { status: 503, statusText: "Offline" });
        });
    })
  );
});
