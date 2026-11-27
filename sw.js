/* Service worker: aplikasi cepat dibuka & tetap jalan tanpa internet.
   - halaman utama (index.html): jaringan dulu, tapi jika lebih dari 3 detik langsung pakai salinan tersimpan
   - script / css / ikon (alamatnya berversi ?v=): langsung dari cache, tidak menunggu jaringan
   - pustaka CDN berversi: dari cache. Firestore tidak disentuh. */
const VER = 'eko-pwa-v2';
const CDN = ['cdnjs.cloudflare.com', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const put = (r, res) => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)) } return res };
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(['index.html', 'manifest.webmanifest', 'icon-192.png']).catch(() => { })).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin && r.mode === 'navigate') {
    e.respondWith(new Promise(res => {
      let done = false; const use = m => { if (!done && m) { done = true; res(m); return true } return false };
      const t = setTimeout(() => caches.match('index.html').then(use), 3000);
      fetch(r).then(x => { clearTimeout(t); if (x.ok) caches.open(VER).then(c => c.put('index.html', x.clone())); use(x) })
        .catch(() => { clearTimeout(t); caches.match('index.html').then(m => { if (!use(m)) { done = true; res(Response.error()) } }) });
    }));
  } else if (u.origin === location.origin || CDN.includes(u.hostname)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => put(r, res)).catch(() => Response.error())));
  }
});