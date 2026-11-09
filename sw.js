// Caches the app shell so the home-screen app opens instantly and offline. Live data is always fetched from the network.
const V = 'cw-shell-v49';
const SHELL = ['./', 'index.html', 'style.css', 'fonts/fonts.css', 'fonts/o-0bIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5a7duw.woff2', 'fonts/o-0bIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5aDdu2ui.woff2', 'fonts/iJWQBXeUZi_OHPqn4wq6hQ2_hbJ1xyN9wd43SofNWcdfKI2hX2g.woff2', 'fonts/iJWQBXeUZi_OHPqn4wq6hQ2_hbJ1xyN9wd43SofNWcdfMo2hX2g.woff2', 'fonts/iJWQBXeUZi_OHPqn4wq6hQ2_hbJ1xyN9wd43SofNWcdfPI2h.woff2', 'min/app.js', 'min/i18n.js', 'min/onchain.js', 'min/interop.js', 'min/leverage.js', 'min/extra.js', 'min/wallets.js', 'min/narrative.js', 'min/patterns.js', 'min/smartmoney.js', 'min/positioning.js', 'min/events-core.js', 'min/events.js', 'data/events/index.json', 'wallets/evm.json', 'narrative.json', 'sources_tiers.json', 'news.json', 'screener.json', 'calendar.json', 'calendar_auto.json', 'patterns_backtest.json', 'reports/index.json', 'icons/chains/base.jpg', 'icons/tokens/btc.png', 'icons/tokens/eth.png', 'icons/tokens/mon.png', 'icons/tokens/hype.png', 'icons/tokens/aave.png', 'icons/tokens/lit.png', 'icons/tokens/sol.png', 'icons/tokens/near.png', 'icons/tokens/pendle.png', 'manifest.webmanifest', 'vendor/lightweight-charts.standalone.production.js', 'icons/icon-192.png', 'icons/icon-192.webp', 'icons/apple-touch-icon.png', 'icons/favicon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // APIs go straight to network
  if (/\.json$/.test(u.pathname)) { // network first, cached fallback
    e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(V).then((c) => c.put(u.pathname, cp)); } return r; }).catch(() => caches.match(u.pathname)));
    return;
  }
  if (e.request.mode === 'navigate' || /\.(js|css|html|webmanifest)$/.test(u.pathname) || u.pathname.endsWith('/')) { // app code: network first so updates land immediately; cache only offline
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(V).then((c) => c.put(u.pathname, cp)); } return r; }).catch(() => caches.match(u.pathname).then((h) => h || caches.match(e.request, { ignoreSearch: true }))));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => { const net = fetch(e.request).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(V).then((c) => c.put(u.pathname + (/\.(png|svg|jpe?g|webp|ico|woff2?)$/.test(u.pathname) ? '' : u.search), cp)); } return r; }).catch(() => hit); return hit || net; }));
});
