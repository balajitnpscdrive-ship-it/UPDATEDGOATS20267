// ============================================================
// sw.js – PWA Service Worker | G.O.A.T.S Championship Portal
// ============================================================

const CACHE_NAME = 'goats-portal-v1';
const ASSETS = [
  './',
  './student_portal.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon.svg',
  './screenshot-mobile.png',
  './screenshot-desktop.png'
];

// Install Event: cache static resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: network-first for pages (to prevent loops), cache-first for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and Apps Script Web App API calls
  if (event.request.method !== 'GET' || url.href.includes('script.google.com')) {
    return;
  }

  // 1. Navigation requests (HTML pages): Network-First, fall back to cached page
  if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the latest successful page response
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline fallback: return the cached file of the exact requested URL (or default student_portal.html)
          return caches.match(event.request).then(cachedResponse => {
            return cachedResponse || caches.match('./student_portal.html');
          });
        })
    );
  } else {
    // 2. Static Assets (CSS, JS, SVG, Fonts): Cache-First, fallback to network
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          // Fetch update in background for next time
          fetch(event.request).then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
            }
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(event.request);
      })
    );
  }
});
