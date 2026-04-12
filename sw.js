// Bump VERSION every time you push an update.
// This is what tells browsers "new version exists, throw away old cache".
const VERSION = 'v4';
const CACHE = `smartgrow-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  'https://unpkg.com/mqtt/dist/mqtt.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache Firebase, Google APIs, or MQTT — they must be live
  if (url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebaseapp.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('emqxsl.com') ||
      url.protocol === 'wss:') {
    return;
  }

  // NETWORK-FIRST for index.html and the root path.
  // This is the magic that makes updates actually show up — the browser
  // always tries to fetch fresh HTML, falling back to cache only when offline.
  if (e.request.mode === 'navigate' ||
      e.request.url.endsWith('/') ||
      e.request.url.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // CACHE-FIRST for everything else (fonts, MQTT lib, images)
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(resp => {
        if (resp.ok && e.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached)
    )
  );
});