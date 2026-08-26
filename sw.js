// Service worker — makes the app installable and lets the free, client-side
// tools keep working even with no internet connection (after the first visit).
// Paid/Fast-Server-Mode/AI tools still need internet (they talk to your backend).
const CACHE_NAME = 'pdf-tools-shell-v1';
const APP_SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for the app shell itself (so updates are picked up quickly),
// falling back to cache when offline. Everything else (CDN libraries, backend
// API calls) is left to the network as normal — we only cache our own shell.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // don't touch cross-origin (CDNs, backend API)

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
