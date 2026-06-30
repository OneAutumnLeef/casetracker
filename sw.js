/* CaseTracker service worker — makes the app installable & offline-friendly.
   App shell is cached; Firebase/Firestore and Google APIs always hit the
   network so live data is never stale. Bump CACHE to invalidate old caches. */
const CACHE = 'casetracker-v2';
const SHELL = [self.registration.scope, self.registration.scope + 'index.html'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never intercept live-data / third-party hosts — let the network handle them.
  if (/googleapis|firebaseio|firebase|gstatic|firebaseinstallations/.test(url.hostname)) return;

  // Navigations: network-first, fall back to cached app shell (offline = app still opens).
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(self.registration.scope + 'index.html')));
    return;
  }

  // Same-origin static assets: cache-first with runtime caching.
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res.ok && url.origin === self.location.origin) {
        const copy = res.clone();
        (await caches.open(CACHE)).put(req, copy);
      }
      return res;
    } catch {
      return cached;
    }
  })());
});
