/* Knockout Isles offline support: the game and its 3D engine are saved on the device. The page itself is fetched fresh when online (network first). */
const CACHE = 'ki-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'ki-192.png', 'ki-512.png', 'ki-touch.png', 'ninebolt-icon-round.png', 'ninebolt-dark.png', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('ki-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url), same = url.origin === self.location.origin;
  if (same && (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'))) {
    const cached = () => caches.open(CACHE).then(c => c.match('index.html'));
    e.respondWith(new Promise(resolve => { let done = false; const fin = r => { if (!done && r) { done = true; resolve(r); } };
      const t = setTimeout(() => cached().then(fin), 4000);
      fetch(req).then(r => { clearTimeout(t); if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put('index.html', cp)); } fin(r); })
        .catch(() => { clearTimeout(t); cached().then(r => fin(r || Response.error())); }); }));
    return;
  }
  if (same || /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|www\.gstatic\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//.test(req.url)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => { const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit); return hit || net; })));
  }
});
