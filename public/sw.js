/*
 * WorkIn.ai Service Worker
 *
 * Strategy:
 *   Navigation (HTML)  → Network-first, cache fallback (always get latest deploy)
 *   Hashed assets       → Cache-first  (immutable — Vite adds content hash)
 *   API / Supabase      → Network-only (never cache auth or data)
 *   Everything else     → Stale-while-revalidate
 *
 * The CACHE_VERSION is bumped automatically by Vite's build hash in the
 * asset URLs, so old un-hashed entries are pruned on activate.
 */

const CACHE_NAME = 'workin-v2';

// ── Install ────────────────────────────────────────────────────────
self.addEventListener('install', () => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Helpers ────────────────────────────────────────────────────────
function isNavigationRequest(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
  );
}

function isApiOrAuth(url) {
  return (
    url.includes('/api/') ||
    url.includes('supabase.co') ||
    url.includes('/auth/') ||
    url.includes('/rest/') ||
    url.includes('/realtime/')
  );
}

function isHashedAsset(url) {
  // Vite outputs filenames like index-BtZ-3UBR.js / index-CrqPoF5K.css
  return /\/assets\/.*-[a-zA-Z0-9]{6,}\.(js|css|woff2?|png|jpg|svg|webp)(\?|$)/.test(url);
}

// ── Fetch ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1) API / Supabase — always network, never cache
  if (isApiOrAuth(request.url)) {
    event.respondWith(fetch(request));
    return;
  }

  // 2) Navigation (HTML pages) — Network-first
  //    This is the KEY fix: always try the network so new deploys load
  //    without clearing cache. Fall back to cache only when offline.
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match('/')))
    );
    return;
  }

  // 3) Hashed assets — Cache-first (immutable, content-addressed)
  if (isHashedAsset(request.url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          }),
      ),
    );
    return;
  }

  // 4) Everything else — Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
      return cached ?? networkFetch;
    }),
  );
});
