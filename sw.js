'use strict';
/* Offline support: the app shell is cached on install; pages are fetched fresh
   when online (cache as fallback), other files are served from the cache and
   refreshed in the background. Bump VERSION whenever a precached file changes. */

const VERSION = 'v21';
const CACHE = `structorizer-${VERSION}`;
const SHELL = [
  './',
  'index.html',
  'clear-old-cookies.js',
  'vendor/fonts/fonts.css',
  'vendor/fonts/inter-latin-wght-normal.woff2',
  'vendor/fonts/jetbrains-mono-latin-wght-normal.woff2',
  'style.css?v=23',
  'themes.css?v=1',
  'themes.js?v=1',
  'i18n.js?v=16',
  'app.js?v=17',
  'codegen.js?v=1',
  'run.js?v=7',
  'samples.js?v=2',
  'favicon.svg',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'workspace.js?v=1',
  'vendor/html2canvas/html2canvas.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('structorizer-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    // network first, so a new version shows up right away when online
    e.respondWith(
      fetch(req)
        .then((res) => { put(req, res.clone()); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./'))),
    );
    return;
  }

  // stale-while-revalidate
  e.respondWith(
    caches.match(req).then((cached) => {
      const fresh = fetch(req).then((res) => { put(req, res.clone()); return res; });
      if (cached) { e.waitUntil(fresh.catch(() => {})); return cached; }
      return fresh;
    }),
  );
});

function put(req, res) {
  if (res.ok || res.type === 'opaque') caches.open(CACHE).then((c) => c.put(req, res));
}
