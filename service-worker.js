const CACHE_NAME = "studypilot-v1.0.0-yashdesai";
const CORE = [
  "./","./index.html","./styles.css","./app.js","./manifest.webmanifest",
  "./storage/database.js","./core/academic-engine.js","./core/revision-engine.js",
  "./core/analytics-engine.js","./security/validation.js","./assets/icon.svg","./assets/icon-192.png","./assets/icon-512.png","./PRIVACY.md","./TERMS.md","./privacy.html","./terms.html"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response && response.ok) { const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)); }
    return response;
  }).catch(() => caches.match("./index.html"))));
});