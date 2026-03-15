// sw.js - Service Worker (오프라인 캐싱 + PWA)

const CACHE_NAME = 'nonogram-galaxy-v2';

const PRECACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/storage.js',
  '/js/puzzle.js',
  '/js/stages.js',
  '/js/particles.js',
  '/js/renderer.js',
  '/js/scenes.js',
  '/js/main.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── 설치 ─────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── 활성화 ───────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── fetch: Cache-first ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        if (resp && resp.status === 200 && event.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return resp;
      }).catch(() => cached || new Response('오프라인 상태입니다', { status: 503 }));
    })
  );
});
