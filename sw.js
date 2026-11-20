// Sube CACHE en cada sesión (y VERSION en app.js y --css-ver en styles.css) para que el móvil coja la versión nueva.
const CACHE = 'escapadas-v15';
// Calles del mapa (OpenStreetMap): solo las zonas que se han visto; no se borra al actualizar.
const MAPA = 'escapadas-mapa';
// Fotos de Wikimedia Commons: las que se han visto (o descargado en Más); tampoco se borra al actualizar.
const FOTOS = 'escapadas-fotos';
const FILES = [
  './', './index.html', './styles.css', './app.js', './nube.js', './finde.js', './diario.js', './islas.js', './eventos.js', './planes.js', './data/fotos.json', './firebase-config.js', './manifest.json', './data/sitios.json',
  './vendor/firebase-10.14.1/firebase-app-compat.js', './vendor/firebase-10.14.1/firebase-auth-compat.js', './vendor/firebase-10.14.1/firebase-firestore-compat.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  // cache: 'reload' evita guardar copias viejas que el navegador tenga en memoria.
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== MAPA && k !== FOTOS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Teselas de OpenStreetMap: primero lo guardado; si no, red y se guarda.
  if (url.hostname === 'tile.openstreetmap.org') {
    e.respondWith(caches.open(MAPA).then(async c => {
      const g = await c.match(req.url); if (g) return g;
      const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req.url, r.clone()); return r;
    }));
    return;
  }
  if (url.hostname === 'thumb.wikimedia.org' || url.hostname === 'upload.wikimedia.org') {
    e.respondWith(caches.open(FOTOS).then(async c => {
      const g = await c.match(req.url); if (g) return g;
      const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req.url, r.clone()); return r;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // Con conexión: primero la red (así llegan las versiones nuevas) y se guarda copia.
  // Sin conexión o si la red tarda más de 3 s: la copia guardada.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const red = fetch(req, { cache: 'no-cache' }).then(r => { if (r.ok) cache.put(req, r.clone()); return r; });
    const guardada = await cache.match(req, { ignoreSearch: true });
    const tiempo = new Promise(ok => setTimeout(ok, 3000));
    try {
      const r = await (guardada ? Promise.race([red, tiempo]) : red);
      if (r) return r;
    } catch (err) { /* sin conexión */ }
    return guardada || (await cache.match('./index.html')) || Response.error();
  })());
});
