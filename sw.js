/* Service worker: aplikasi tetap bisa dibuka tanpa internet; file web selalu diambil dari jaringan lebih dulu agar update terbaru terbaca. */
const VER = 'eko-pwa-v1';
const CDN = ['cdnjs.cloudflare.com', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(['./', 'index.html', 'style.css', 'script.js', 'cod.js', 'pwa.js', 'products-seed.js', 'manifest.webmanifest', 'icon-192.png']).catch(() => { })).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) { // file milik web ini: jaringan dulu, cadangan dari cache
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)) } return res })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
  } else if (CDN.includes(u.hostname)) { // library CDN (berversi): cache dulu
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)) } return res })));
  } // selain itu (Firestore dll) tidak disentuh
});
