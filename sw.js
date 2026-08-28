// Service worker — makes the app installable (Add to Home Screen) and lets
// the app shell load offline.
//
// Deliberately conservative: it ONLY handles top-level page navigations
// (i.e. loading the app itself). It does not touch any other request type,
// so it can never interfere with blob: URLs, downloads, CDN library loads,
// backend API calls, or anything a tool does while running.
const CACHE_NAME = 'pdf-tools-shell-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['./index.html', './manifest.json']))
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

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return; // only the page load itself
  event.respondWith(
    fetch(event.request).catch(() => caches.match('./index.html'))
  );
});
