// Service worker — makes the app installable (Add to Home Screen) and lets
// the app shell load offline.
//
// Deliberately conservative: it ONLY handles top-level page navigations
// (i.e. loading the app itself). It does not touch any other request type,
// so it can never interfere with blob: URLs, downloads, CDN library loads,
// backend API calls, or anything a tool does while running.
const CACHE_NAME = 'pdf-tools-shell-v111';
// The business app (/app) also works offline: its page and the few script files it needs are kept (network first, cache when offline).
const APP_FILES = ['/category-biz.js', '/category-bizapp.js', '/libs/qrcode-generator.js', '/app-manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['./index.html', './manifest.json', './app.html', ...APP_FILES]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      // old copies of the app shell, and the retired free-Tamil-voice model (pocket-tts-*, ~110 MB) — the AI model caches of
      // tools still in use (bg-models-*) are kept
      Promise.all(keys.filter((k) => k !== CACHE_NAME && (k.indexOf('pdf-tools-shell') === 0 || k.indexOf('pocket-tts') === 0)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'GET' && url.origin === self.location.origin && APP_FILES.indexOf(url.pathname) >= 0) {
    event.respondWith(fetch(event.request).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(url.pathname, copy)); } return res; }).catch(() => caches.match(url.pathname)));
    return;
  }
  if (event.request.mode !== 'navigate') return; // only the page load itself
  if (url.pathname === '/app' || url.pathname === '/app.html') { event.respondWith(fetch(event.request).catch(() => caches.match('./app.html'))); return; }
  if (new URL(event.request.url).pathname.indexOf('/matrimony') === 0) return; // matrimony is its own app: never fall back to the tools shell
  event.respondWith(
    fetch(event.request).catch(() => caches.match('./index.html'))
  );
});
