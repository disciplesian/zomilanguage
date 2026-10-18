/* Zomi Translator service worker.
 * Network-first with offline cache fallback: the site (including the
 * bundled dictionary) stays fully usable with no connection
 * after the first visit. API/streaming requests always go to the network.
 */
const CACHE_NAME = 'zomi-translator-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Same-origin app shell and assets only; never cache third-party APIs.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // Offline navigation to an uncached route falls back to the shell.
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return Response.error();
        })
      )
  );
});
