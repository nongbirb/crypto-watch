// Caches the app shell so the home-screen app opens instantly and offline. Live data is always fetched from the network.
const V = 'cw-shell-v6';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'i18n.js', 'onchain.js', 'leverage.js', 'icons/chains/base.jpg', 'icons/tokens/btc.png', 'icons/tokens/mon.png', 'icons/tokens/hype.png', 'icons/tokens/aave.png', 'icons/tokens/lit.png', 'manifest.webmanifest', 'vendor/lightweight-charts.standalone.production.js', 'icons/icon-192.png', 'icons/apple-touch-icon.png', 'icons/favicon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // APIs go straight to network
  if (/\/(judgment|tokens|calendar|onchain|flows)\.json$/.test(u.pathname)) { // network first, cached fallback
    e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(V).then((c) => c.put(u.pathname, cp)); return r; }).catch(() => caches.match(u.pathname)));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => { const net = fetch(e.request).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(V).then((c) => c.put(e.request, cp)); } return r; }).catch(() => hit); return hit || net; }));
});
