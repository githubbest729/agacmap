const VERSION = 'algurg-map-v14';
const TILES = 'algurg-tiles-v7';
const CARTO_KEY = 'cb1_57cr_1_f31ce75418c7d6e7e9f3426f';

const SHELL = [
  './', 'index.html', 'manifest.json', 'css/styles.css', 'js/app.js',
  'assets/icon.svg', 'assets/fonts/inter-latin-wght-normal.woff2',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css',
  'vendor/leaflet/images/marker-icon.png', 'icons/icon-192.png',
  'icons/icon-512.png', 'icons/apple-touch-icon.png', 'favicon.ico'
];

// Pre-warm core Dubai & Jebel Ali HQ dark tiles (z=11 & z=12) for immediate offline availability
const PREFETCH_TILES = [
  `https://basemaps.cartocdn.com/rastertiles/dark_all/11/1337/876.png?key=${CARTO_KEY}`,
  `https://basemaps.cartocdn.com/rastertiles/dark_all/11/1337/877.png?key=${CARTO_KEY}`,
  `https://basemaps.cartocdn.com/rastertiles/dark_all/11/1338/876.png?key=${CARTO_KEY}`,
  `https://basemaps.cartocdn.com/rastertiles/dark_all/11/1338/877.png?key=${CARTO_KEY}`,
  `https://basemaps.cartocdn.com/rastertiles/dark_all/12/2675/1753.png?key=${CARTO_KEY}`,
  `https://basemaps.cartocdn.com/rastertiles/dark_all/12/2675/1754.png?key=${CARTO_KEY}`,
  `https://basemaps.cartocdn.com/rastertiles/dark_all/12/2676/1752.png?key=${CARTO_KEY}`,
  `https://basemaps.cartocdn.com/rastertiles/dark_all/12/2676/1753.png?key=${CARTO_KEY}`
];

self.addEventListener('install', e => {
  e.waitUntil(
    Promise.all([
      caches.open(VERSION).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))),
      caches.open(TILES).then(c => Promise.allSettled(PREFETCH_TILES.map(u => c.add(u))))
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== TILES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname.endsWith('basemaps.cartocdn.com') || url.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open(TILES).then(async c => {
        const hit = await c.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) {
            c.put(req, res.clone());
            c.keys().then(k => k.length > 600 && k.slice(0, k.length - 600).forEach(x => c.delete(x)));
          }
          return res;
        } catch {
          return Response.error();
        }
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put('index.html', copy));
        return res;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }

  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
