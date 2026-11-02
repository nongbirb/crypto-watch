// Caches the app shell so the home-screen app opens instantly and offline. Live data is always fetched from the network.
const V = 'cw-shell-v18';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'i18n.js', 'onchain.js', 'interop.js', 'leverage.js', 'extra.js', 'wallets.js', 'narrative.js', 'wallets/evm.json', 'narrative.json', 'sources_tiers.json', 'news.json', 'screener.json', 'calendar.json', 'reports/index.json', 'icons/chains/base.jpg', 'icons/tokens/btc.png', 'icons/tokens/mon.png', 'icons/tokens/hype.png', 'icons/tokens/aave.png', 'icons/tokens/lit.png', 'manifest.webmanifest', 'vendor/lightweight-charts.standalone.production.js', 'icons/icon-192.png', 'icons/apple-touch-icon.png', 'icons/favicon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // APIs go straight to network
  if (/\/(judgment|tokens|calendar|onchain|flows|news|narrative|sources_tiers|evm|screener|index|weekly-[\d-]+)\.json$/.test(u.pathname)) { // network first, cached fallback
    e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(V).then((c) => c.put(u.pathname, cp)); return r; }).catch(() => caches.match(u.pathname)));
    return;
  }
  if (e.request.mode === 'navigate' || /\.(js|css|html|webmanifest)$/.test(u.pathname) || u.pathname.endsWith('/')) { // app code: network first so updates land immediately; cache only offline
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(V).then((c) => c.put(u.pathname, cp)); } return r; }).catch(() => caches.match(u.pathname).then((h) => h || caches.match(e.request, { ignoreSearch: true }))));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => { const net = fetch(e.request).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(V).then((c) => c.put(e.request, cp)); } return r; }).catch(() => hit); return hit || net; }));
});
