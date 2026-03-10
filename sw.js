const CACHE_NAME = "shiro-notes-v2.2.0";
const OFFLINE_URL = "/offline.html";

const ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/pwa.css",
  "/pwa.js",
  "/workspace.css",
  "/workspace.js",
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
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigate = event.request.mode === "navigate";
  const isHtml = event.request.headers.get("accept")?.includes("text/html");

  if (isNavigate || isHtml) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && isSameOrigin) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || (await caches.match(OFFLINE_URL)) || new Response("Offline", { status: 503, statusText: "Offline" });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response.ok && isSameOrigin) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => new Response("Offline", { status: 503, statusText: "Offline" }));
    })
  );
});
