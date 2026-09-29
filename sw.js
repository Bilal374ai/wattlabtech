/* Wattlab Service Worker v3 */
const CACHE_NAME = 'wattlab-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/ev-news.html',
  '/car-reviews.html',
  '/best-electric-cars-2026.html',
  '/ai-self-driving-cars.html',
  '/tesla-vs-rivian.html',
  '/ev-charging-guide-2026.html',
  '/tech-articles.html',
  '/videos.html',
  '/about.html',
  '/contact.html',
  '/tools-hub.html',
  '/break-even.html',
  '/charging-time.html',
  '/calculator.html',
  '/tco.html',
  '/tax-credit.html',
  '/editorial-policy.html',
  '/ev-battery-technology-2026.html',
  '/ev-cost-of-ownership-2026.html',
  '/how-to-charge-ev-at-home-2026.html',
  '/404.html',
  '/css/style.css',
  '/css/tw-site.css',
  '/css/tw-tools.css',
  '/js/script.js',
  '/js/consent.js',
  '/assets/favicon.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

/* ── Install: pre-cache shell assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(() => { /* non-fatal: proceed without full pre-cache */ })
  );
  self.skipWaiting();
});

/* ── Activate: purge old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: network-first, cache fallback ── */
self.addEventListener('fetch', event => {
  /* Skip non-GET and cross-origin requests */
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/.netlify/')) return; /* never cache API/function responses */

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(r => r || (event.request.mode === 'navigate' ? caches.match('/404.html') : undefined)))
  );
});
