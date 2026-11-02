/* KMS Capital – live client-side app. No backend. Data layer + UI. */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const CG = 'https://api.coingecko.com/api/v3';
const VERSION = '2.1';
const S = { cfg: [], defaults: [], judg: null, cal: null, cg: {}, global: null, fng: null, sel: null, tab: 'chart', tf: '1D',
  errors: {}, lastOk: 0, ws: {}, charts: [], busy: false, route: 'markets', calView: 'month', calFilter: 'all', calMonth: null, calPick: null, jFilter: 'open' };
let LANG = (() => { try { return localStorage.getItem('cw-lang') || 'en'; } catch (e) { return 'en'; } })();
const T = (k) => (I18N[LANG] && I18N[LANG][k] !== undefined ? I18N[LANG][k] : I18N.en[k] !== undefined ? I18N.en[k] : k);
/* pick localized text from a judgment/calendar object: obj.th[key] (or obj['th_'+key]) when Thai */
const L = (o, k) => { if (!o) return ''; if (LANG === 'th') { const v = (o.th && o.th[k]) ?? o['th_' + k]; if (v != null && v !== '') return v; } return o[k]; };

/* ---------- formatting ---------- */
const px = (v) => v == null || isNaN(v) ? '–' : '$' + (v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v >= 1 ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v >= 0.01 ? v.toFixed(4) : v.toPrecision(4));
const big = (v) => v == null ? '–' : v >= 1e12 ? '$' + (v / 1e12).toFixed(2) + 'T' : v >= 1e9 ? '$' + (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : '$' + Math.round(v).toLocaleString();
const pct = (v, d = 2) => v == null || isNaN(v) ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d) + '%';
const usd = (v) => v == null || isNaN(v) ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cls = (v) => v > 0 ? 'up' : v < 0 ? 'dn' : 'mut';
const loc = () => LANG === 'th' ? 'th-TH-u-ca-gregory' : 'en-US';
const jst = (d = new Date()) => d.toLocaleString(loc(), { timeZone: 'Asia/Tokyo', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' JST';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); };
const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
/* ---------- fetch helpers ---------- */
async function getJSON(url, opt = {}, ms = 12000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { ...opt, signal: c.signal, cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
const IV = { binance: { '1d': '1d', '4h': '4h' }, bybit: { '1d': 'D', '4h': '240' }, okx: { '1d': '1Dutc', '4h': '4H' }, hyperliquid: { '1d': '1d', '4h': '4h' } };
const EXNAME = { binance: 'Binance', bybit: 'Bybit', okx: 'OKX', hyperliquid: 'Hyperliquid' };
/** -> [{t,o,h,l,c,v,q}] ascending, t in ms */
async function klines(src, tf, limit) {
  const i = IV[src.ex][tf];
  if (src.ex === 'binance') {
    let r; try { r = await getJSON(`https://api.binance.com/api/v3/klines?symbol=${src.pair}&interval=${i}&limit=${limit}`); }
    catch (e) { r = await getJSON(`https://data-api.binance.vision/api/v3/klines?symbol=${src.pair}&interval=${i}&limit=${limit}`); }
    return r.map((x) => ({ t: x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], q: +x[7] }));
  }
  if (src.ex === 'bybit') {
    const r = await getJSON(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${src.pair}&interval=${i}&limit=${limit}`);
    if (r.retCode !== 0) throw new Error(r.retMsg);
    return r.result.list.map((x) => ({ t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], q: +x[6] })).reverse();
  }
  if (src.ex === 'okx') {
    const r = await getJSON(`https://www.okx.com/api/v5/market/candles?instId=${src.pair}&bar=${i}&limit=${Math.min(limit, 300)}`);
    if (r.code !== '0') throw new Error(r.msg);
    return r.data.map((x) => ({ t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], q: +x[7] })).reverse();
  }
  if (src.ex === 'hyperliquid') {
    const ms = tf === '1d' ? 864e5 : 144e5;
    const r = await getJSON('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'candleSnapshot', req: { coin: src.pair, interval: i, startTime: Date.now() - limit * ms } }) });
    return r.map((x) => ({ t: x.t, o: +x.o, h: +x.h, l: +x.l, c: +x.c, v: +x.v, q: +x.v * +x.c }));
  }
  throw new Error('unknown exchange ' + src.ex);
}
/* first source with fresh candles wins (rejects stale/delisted pairs) */
async function loadCandles(t, tf, limit) {
  const errs = [];
  const order = t._src ? [t._src, ...t.sources.filter((s) => s !== t._src)] : t.sources;
  for (const s of order) {
    try {
      const k = await klines(s, tf, limit);
      const maxAge = tf === '1d' ? 3 * 864e5 : 864e5;
      if (!k.length || Date.now() - k[k.length - 1].t > maxAge) throw new Error('stale data');
      return { k, src: s };
    } catch (e) { errs.push(`${EXNAME[s.ex]}: ${e.message}`); }
  }
  throw new Error(errs.join(' · '));
}

/* ---------- indicators (same maths as update.py) ---------- */
const sma = (a, n) => a.map((_, i) => i < n - 1 ? null : a.slice(i - n + 1, i + 1).reduce((x, y) => x + y, 0) / n);
const ema = (a, n) => { const k = 2 / (n + 1); const o = [a[0]]; for (let i = 1; i < a.length; i++) o.push(a[i] * k + o[i - 1] * (1 - k)); return o; };
function rsiSeries(a, n = 14) {
  const o = Array(a.length).fill(null); if (a.length < n + 1) return o;
  let ag = 0, al = 0;
  for (let i = 1; i <= n; i++) { const d = a[i] - a[i - 1]; ag += Math.max(d, 0); al += Math.max(-d, 0); }
  ag /= n; al /= n; o[n] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  for (let i = n + 1; i < a.length; i++) { const d = a[i] - a[i - 1]; ag = (ag * (n - 1) + Math.max(d, 0)) / n; al = (al * (n - 1) + Math.max(-d, 0)) / n; o[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); }
  return o;
}
function bb(a, n = 20) {
  const up = [], lo = [], mid = [];
  a.forEach((_, i) => { if (i < n - 1) { up.push(null); lo.push(null); mid.push(null); return; }
    const w = a.slice(i - n + 1, i + 1); const mu = w.reduce((x, y) => x + y, 0) / n; const sd = Math.sqrt(w.reduce((x, y) => x + (y - mu) ** 2, 0) / n);
    up.push(mu + 2 * sd); lo.push(mu - 2 * sd); mid.push(mu); });
  return { up, lo, mid };
}
function atr(k, n = 14) {
  const tr = []; for (let i = 1; i < k.length; i++) tr.push(Math.max(k[i].h - k[i].l, Math.abs(k[i].h - k[i - 1].c), Math.abs(k[i].l - k[i - 1].c)));
  if (tr.length < n) return null;
  let a = tr.slice(0, n).reduce((x, y) => x + y, 0) / n; for (const x of tr.slice(n)) a = (a * (n - 1) + x) / n; return a;
}
function swings(k, w = 3, look = 120) {
  k = k.slice(-look); const lo = [], hi = [];
  for (let i = w; i < k.length - w; i++) { const win = k.slice(i - w, i + w + 1);
    if (k[i].l === Math.min(...win.map((x) => x.l))) lo.push(k[i].l);
    if (k[i].h === Math.max(...win.map((x) => x.h))) hi.push(k[i].h); }
  return { lo, hi };
}
const dedupe = (v, gap, rev) => { const o = []; [...v].sort((a, b) => rev ? b - a : a - b).forEach((x) => { if (o.every((y) => Math.abs(x - y) > gap)) o.push(x); }); return o; };

function compute(t) {
  const d = t.d1, c = d.map((x) => x.c), p = t.price ?? c[c.length - 1];
  const last = (a) => a[a.length - 1];
  const ma20 = sma(c, 20), ma50 = sma(c, 50), ma200 = sma(c, 200);
  const e26 = ema(c, 26); const m = ema(c, 12).map((x, i) => x - e26[i]);
  const sg = Array(25).fill(null).concat(c.length > 25 ? ema(m.slice(25), 9) : []);
  const hist = m.map((x, i) => sg[i] == null ? null : x - sg[i]);
  const rs = rsiSeries(c), b = bb(c);
  let vol30 = null;
  if (c.length >= 31) { const r = []; for (let i = c.length - 30; i < c.length; i++) r.push(Math.log(c[i] / c[i - 1])); const mu = r.reduce((x, y) => x + y, 0) / 30; vol30 = Math.sqrt(r.reduce((x, y) => x + (y - mu) ** 2, 0) / 29) * Math.sqrt(365) * 100; }
  const I = { rsi: last(rs), ma20: last(ma20), ma50: last(ma50), ma200: last(ma200), macd: last(m), sig: last(sg), hist: last(hist), bbUp: last(b.up), bbLo: last(b.lo), bbMid: last(b.mid), vol30,
    series: { ma20, ma50, ma200, rsi: rs, macd: m, sig: sg, hist, bbUp: b.up, bbLo: b.lo, bbMid: b.mid } };
  // ---- trade plan: daily levels, 4h entry refinement (mirrors update.py plan()) ----
  const dk = d.slice(-200); const A = atr(dk);
  const sw = swings(dk);
  let Sx = dedupe(sw.lo.filter((x) => x < p), 0.5 * A, true).slice(0, 3);
  const Rz = dedupe(sw.hi.filter((x) => x > p), 0.5 * A, false).slice(0, 3);
  if (!Sx.length) Sx = [Math.min(...dk.slice(-90).map((x) => x.l))];
  const s1 = Sx[0]; let zl = s1, zh = s1 + 0.25 * A, ref = 'daily (no 4h data)';
  if (t.h4 && t.h4.length) {
    const l4 = swings(t.h4, 3, 180).lo; const cand = l4.filter((x) => x >= s1 - 0.5 * A && x < p);
    if (cand.length) { zl = Math.min(...cand) >= s1 - 0.5 * A ? Math.min(s1, Math.min(...cand)) : s1; zh = Math.min(Math.max(...cand), zl + A, p); ref = '4h swing lows'; }
    if (zh <= zl) zh = zl + 0.25 * A;
  }
  const em = (zl + zh) / 2, sl = zl - A, risk = em - sl;
  const tps = Rz.filter((x) => x > zh).map((x) => ({ price: x, basis: 'daily resistance' }));
  while (tps.length < 3) tps.push({ price: tps.length ? Math.max(tps[tps.length - 1].price, em) + risk : em + 2 * risk, basis: 'R-multiple (no resistance left)' });
  tps.forEach((x) => x.rr = (x.price - em) / risk);
  const v90 = d.slice(-90); const vwap = v90.reduce((s, x) => s + x.c * x.q, 0) / v90.reduce((s, x) => s + x.q, 0);
  const comps = [I.ma50, I.ma200, vwap].filter((x) => x); const fair = comps.reduce((x, y) => x + y, 0) / comps.length;
  const up = p > (I.ma200 || 0), dn = p < (I.ma50 || 0) && !up;
  const bias = dn ? 'Avoid' : up && (I.hist || 0) > 0 && tps[0].rr >= 1.5 && p <= zh * 1.03 ? 'Long' : 'Wait';
  const trend = I.ma50 && I.ma200 ? (p > I.ma50 && p > I.ma200 ? 'Uptrend' : p < I.ma50 && p < I.ma200 ? 'Downtrend' : 'Mixed') : (p > (I.ma50 || p) ? 'Uptrend' : 'Downtrend');
  I.plan = { atr: A, sup: Sx, res: Rz, entry: [zl, zh], ref, stop: sl, tps, vwap, fair, bias, inZone: zl <= p && p <= zh, price: p };
  I.trend = trend;
  return I;
}
function biasWhy(t) {
  const I = t.I, P = I.plan, p = t.price, r = [];
  r.push(p > I.ma200 ? 'above its 200-day average (long-term trend up)' : 'below its 200-day average (long-term trend down)');
  r.push(p > I.ma50 ? 'above the 50-day' : 'below the 50-day');
  r.push(I.hist > 0 ? 'MACD momentum positive' : 'MACD momentum negative');
  r.push(`TP1 pays ${P.tps[0].rr.toFixed(2)}× the risk`);
  const lead = P.bias === 'Long' ? 'Conditions line up: ' : P.bias === 'Avoid' ? 'Trend is down: ' : 'Mixed signals: ';
  return lead + r.join(', ') + (P.inZone ? '. Price is inside the entry zone now.' : p > P.entry[1] ? '. Price is above the entry zone; patience means waiting for a dip into it.' : '. Price is below the entry zone; the stop-loss is the line to respect.');
}

/* ---------- data loading ---------- */
async function loadToken(t) {
  try {
    const [D, H] = await Promise.all([loadCandles(t, '1d', 300), loadCandles(t, '4h', 180).catch(() => null)]);
    t._src = D.src; t.d1 = D.k; t.h4 = H ? H.k : null; t.src4 = H ? H.src : null;
    if (!t.liveAt || Date.now() - t.liveAt > 90e3) t.price = D.k[D.k.length - 1].c;
    t.I = compute(t); t.err = null; t.at = Date.now(); S.lastOk = Date.now();
  } catch (e) { t.err = e.message; }
}
async function loadCG() {
  try {
    const ids = S.cfg.map((t) => t.coingecko).join(',');
    const r = await getJSON(`${CG}/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d,30d`);
    r.forEach((x) => S.cg[x.id] = x); S.errors.cg = null;
  } catch (e) { S.errors.cg = 'CoinGecko market data: ' + e.message; }
}
async function loadGlobal() {
  await Promise.all([
    getJSON(`${CG}/global`).then((r) => { S.global = r.data; S.errors.global = null; }).catch((e) => S.errors.global = 'CoinGecko global: ' + e.message),
    getJSON('https://api.alternative.me/fng/?limit=8').then((r) => { S.fng = r.data; S.errors.fng = null; }).catch((e) => S.errors.fng = 'Fear & Greed: ' + e.message),
  ]);
}
/* ---------- live ticks ---------- */
S.wsKey = {}; S.wsTry = {};
function syncWS() { // (re)connect one stream per exchange whenever the set of pairs changes
  for (const ex of ['binance', 'bybit', 'okx']) {
    const key = S.cfg.filter((t) => t._src && t._src.ex === ex).map((t) => t._src.pair).join(',');
    if (key === S.wsKey[ex] && S.ws[ex]) continue;
    S.wsKey[ex] = key; if (S.ws[ex]) { S.ws[ex].onclose = null; S.ws[ex].close(); S.ws[ex] = null; }
    if (key) connectWS(ex);
  }
}
function connectWS(ex) {
  const toks = S.cfg.filter((t) => t._src && t._src.ex === ex); if (!toks.length || ex === 'hyperliquid') return;
  let ws; const n = S.wsTry[ex] = (S.wsTry[ex] || 0) + 1;
  try {
    if (ex === 'binance') ws = new WebSocket((n % 2 ? 'wss://stream.binance.com:443' : 'wss://data-stream.binance.vision') + '/stream?streams=' + toks.map((t) => t._src.pair.toLowerCase() + '@miniTicker').join('/'));
    if (ex === 'bybit') ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');
    if (ex === 'okx') ws = new WebSocket('wss://ws.okx.com/ws/v5/public');
  } catch (e) { return; }
  S.ws[ex] = ws; let ping;
  ws.onopen = () => { S.wsTry[ex] = n % 2 ? 0 : 1;
    if (ex === 'bybit') { ws.send(JSON.stringify({ op: 'subscribe', args: toks.map((t) => 'tickers.' + t._src.pair) })); ping = setInterval(() => ws.send('{"op":"ping"}'), 20000); }
    if (ex === 'okx') { ws.send(JSON.stringify({ op: 'subscribe', args: toks.map((t) => ({ channel: 'tickers', instId: t._src.pair })) })); ping = setInterval(() => ws.send('ping'), 25000); }
    renderStatus();
  };
  ws.onmessage = (ev) => {
    if (ev.data === 'pong') return; let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (ex === 'binance' && m.data) tick(m.data.s, +m.data.c, (m.data.c / m.data.o - 1) * 100, ex);
    if (ex === 'bybit' && m.data && m.data.symbol) tick(m.data.symbol, +m.data.lastPrice, +m.data.price24hPcnt * 100, ex);
    if (ex === 'okx' && m.data) m.data.forEach((x) => tick(x.instId, +x.last, (x.last / x.open24h - 1) * 100, ex));
  };
  ws.onclose = () => { clearInterval(ping); if (S.ws[ex] !== ws) return; S.ws[ex] = null; renderStatus(); setTimeout(() => { if (!S.ws[ex]) connectWS(ex); }, Math.min(30000, 3000 * n)); };
  ws.onerror = () => ws.close();
}
function tick(pair, price, ch24, ex) {
  const t = S.cfg.find((x) => x._src && x._src.ex === ex && x._src.pair === pair); if (!t || !price) return;
  const prev = t.price; t.price = price; t.ch24live = ch24; t.liveAt = Date.now(); S.lastOk = Date.now();
  if (t.d1) { const l = t.d1[t.d1.length - 1]; l.c = price; l.h = Math.max(l.h, price); l.l = Math.min(l.l, price); }
  document.querySelectorAll(`[data-px="${t.symbol}"]`).forEach((el) => {
    el.textContent = px(price);
    if (prev && price !== prev) { el.classList.remove('flash-up', 'flash-dn'); void el.offsetWidth; el.classList.add(price > prev ? 'flash-up' : 'flash-dn'); }
  });
  document.querySelectorAll(`[data-ch="${t.symbol}"]`).forEach((el) => { el.textContent = pct(ch24); el.className = el.className.replace(/\b(up|dn|mut)\b/g, '') + ' ' + cls(ch24); });
  onTick(t);
  if (S.sel === t.symbol && S.live && S.live.candle && t.d1) { const l = t.d1[t.d1.length - 1]; try { S.live.candle.update({ time: ts(l.t), open: l.o, high: l.h, low: l.l, close: l.c }); } catch (e) {} }
}

/* =====================================================================
   UI
   ===================================================================== */
const ICONS = {
  markets: '<path d="M4 19V5M4 19h16M8 15l3.5-4 3 2.5L20 7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  watchlist: '<path d="M5 6h14M5 12h14M5 18h9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4 10h16M9 3v4M15 3v4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  journal: '<path d="M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 9h5M10 13h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  learn: '<path d="M3 9l9-4 9 4-9 4-9-4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7 11v4.5c1.5 1.3 3.2 2 5 2s3.5-.7 5-2V11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  onchain: '<path d="M4 7h6v4H4zM14 13h6v4h-6zM10 9h2.5a1.5 1.5 0 0 1 1.5 1.5v4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/>',
  settings: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
};
const svg = (k, sz = 20) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" aria-hidden="true">${ICONS[k]}</svg>`;
const ROUTES = ['markets', 'portfolio', 'onchain', 'screener', 'watchlist', 'calendar', 'journal', 'reports', 'learn', 'settings'];
const NAV = ['markets', 'portfolio', 'onchain', 'screener', 'calendar'];
const MORE = ['journal', 'reports', 'learn', 'watchlist', 'settings'];
const J = (sym) => (S.judg && S.judg.tokens && S.judg.tokens[sym]) || {};
const ch24 = (t) => t.ch24live ?? (S.cg[t.coingecko] || {}).price_change_percentage_24h_in_currency;
const logo = (t, c = '') => { const src = t.logo || (S.cg[t.coingecko] || {}).image; const lt = `<span class="logo lt ${c}">${esc((t.symbol || '?').slice(0, 1))}</span>`;
  return src ? `<img class="logo ${c}" src="${esc(src)}" alt="" loading="lazy" onerror="this.outerHTML='${lt.replace(/'/g, '&#39;').replace(/"/g, '&quot;')}'">` : lt; };
const vd = (b) => `<span class="vd ${b}">${esc(T(b))}</span>`;
const tokBySym = (s) => S.cfg.find((x) => x.symbol === s);

function renderShell() {
  document.documentElement.lang = LANG;
  const href = (r) => r === 'onchain' ? '#/onchain/' + (S.sub || 'chains') : '#/' + r;
  const items = NAV.map((r) => `<a href="${href(r)}" data-route="${r}" ${S.route === r ? 'aria-current="page"' : ''}>${svg(r)}<span>${esc(T(r))}</span></a>`);
  $('#sideNav').innerHTML = NAV.map((r, i) => items[i] + (r === 'onchain' ? `<div class="subitems">${['chains', 'flows', 'health'].map((s) => `<a href="#/onchain/${s}" ${S.route === 'onchain' && S.sub === s ? 'aria-current="page"' : ''}>${esc(T(s))}</a>`).join('')}</div>` : '')).join('') + `<div class="nav-sep">${esc(T('more'))}</div>` + MORE.map((r) => `<a href="#/${r}" data-route="${r}" ${S.route === r ? 'aria-current="page"' : ''}>${svg(r)}<span>${esc(T(r))}</span></a>`).join('');
  $('#tabBar').innerHTML = items.join('') + `<button class="tb-more ${MORE.includes(S.route) ? 'on' : ''}" data-gear aria-haspopup="true" aria-expanded="false">${svg('more')}<span>${esc(T('more'))}</span></button>`;
  $('#pageTitle').textContent = T(S.route);
  $('#gearMenu').innerHTML = `${MORE.map((r) => `<a href="#/${r}" ${S.route === r ? 'aria-current="page"' : ''}>${svg(r, 18)}<span>${esc(T(r))}</span></a>`).join('')}<hr>
    <div class="gm-row"><span>${esc(T('language'))}</span><div class="seg sm"><button data-lang="en" aria-pressed="${LANG === 'en'}">EN</button><button data-lang="th" aria-pressed="${LANG === 'th'}">ไทย</button></div></div>
    <div class="gm-row"><span>${esc(T('theme'))}</span><div class="seg sm">${['auto', 'light', 'dark'].map((k) => `<button data-theme="${k}" aria-pressed="${store.get('cw-theme-v', 'auto') === k}">${esc(T(k))}</button>`).join('')}</div></div>`;
  $$('[data-langsw]').forEach((el) => el.innerHTML = `<button data-lang="en" aria-pressed="${LANG === 'en'}">EN</button><button data-lang="th" aria-pressed="${LANG === 'th'}">ไทย</button>`);
  $$('[data-i]').forEach((el) => el.textContent = T(el.dataset.i));
  renderStatus();
}
function renderStatus() {
  const anyWS = Object.values(S.ws).some((w) => w && w.readyState === 1); const age = Date.now() - S.lastOk;
  let c = '', txt = T('connecting');
  if (!navigator.onLine) { c = 'off'; txt = T('offline'); } else if (!S.lastOk) { c = ''; } else if (age > 180e3) { c = 'stale'; txt = T('stale'); } else { c = 'live'; txt = anyWS ? T('live') : T('online'); }
  $$('.status').forEach((el) => { el.className = 'status ' + c; el.querySelector('span').textContent = txt; });
  $('#updS').textContent = S.lastOk ? T('updated') + ' ' + jst(new Date(S.lastOk)) : '';
}

/* ---------- data loading (UI side) ---------- */
async function loadJudgment() { try { S.judg = await getJSON('judgment.json?ts=' + Date.now()); S.errors.judg = null; } catch (e) { S.errors.judg = 'judgment.json: ' + e.message; } }
async function loadCalendar() { try { S.cal = await getJSON('calendar.json?ts=' + Date.now()); S.errors.cal = null; } catch (e) { S.errors.cal = 'calendar.json: ' + e.message; } }
async function refreshAll(manual) {
  if (S.busy) return; S.busy = true; $$('[data-refresh]').forEach((b) => b.classList.add('spin'));
  await Promise.all([loadJudgment(), loadCalendar(), loadNews(), loadCG(), loadGlobal(), ...S.cfg.map(loadToken)]);
  syncWS(); S.busy = false; $$('[data-refresh]').forEach((b) => b.classList.remove('spin'));
  render(true); if (manual) toast(S.cfg.some((t) => t.err) ? T('refreshedErr') : T('refreshed'));
}
async function refreshCandles() { if (S.busy || document.hidden) return; await Promise.all(S.cfg.map(loadToken)); if (S.route === 'markets') render(true); else renderStatus(); }

/* ---------- router ---------- */
function route() {
  const m = location.hash.match(/^#\/(\w+)(?:\/(\w+))?/) || [];
  S.route = ROUTES.includes(m[1]) ? m[1] : 'markets'; if (S.route === 'onchain') S.sub = m[2] || S.sub || 'chains';
  closeGear();
  render(); scrollTo(0, 0);
}
function render(soft) {
  renderShell();
  const y = scrollY;
  if (S.route !== 'markets') killCharts();
  ({ markets: pMarkets, portfolio: pPortfolio, screener: pScreener, reports: pReports, watchlist: pWatchlist, calendar: pCalendar, journal: pJournal, learn: pLearn, settings: pSettings, onchain: pOnchain })[S.route](soft);
  if (soft) scrollTo(0, y);
}
const pageHead = (title, right = '') => `<div class="page-h"><h1>${esc(title)}</h1>${right}</div>`;

/* ---------- MARKETS ---------- */
function pMarkets(soft) {
  const m = $('#main');
  if (soft && $('#mk')) { renderMarketTop(); renderOverview(); renderDetail(true); return; }
  m.innerHTML = `<div class="page" id="mk">${pageHead(T('markets'), `<span class="sub" id="mkUpd"></span>`)}
    <div id="mtop"></div><div class="sec" id="ovSec"></div><section class="detail" id="detail"></section>
    <div class="foot">${esc(T('nfa'))}<br>${esc(T('srcLine'))} <span id="srcErr" class="err"></span></div></div>`;
  renderMarketTop(); renderOverview(); renderDetail();
}
function renderMarketTop() {
  const g = S.global, f = S.fng;
  const st = (l, v, d, ex = '') => `<div class="mstat"><div class="eyebrow">${l}</div><div class="v num">${v}</div><div class="d">${d}</div>${ex}</div>`;
  const sk = '<div class="mstat"><div class="sk" style="height:10px;width:50%"></div><div class="sk" style="height:18px;width:70%;margin-top:8px"></div></div>';
  let h = '';
  h += g ? st(esc(T('totalCap')), big(g.total_market_cap.usd), `<span class="${cls(g.market_cap_change_percentage_24h_usd)}">${pct(g.market_cap_change_percentage_24h_usd)}</span> ${esc(T('d24'))}`) : sk;
  h += g ? st(esc(T('btcDom')), g.market_cap_percentage.btc.toFixed(1) + '%', 'BTC') : sk;
  if (f) { const v = +f[0].value; const lbl = LANG === 'th' ? ({ 'Extreme Fear': 'กลัวสุด ๆ', Fear: 'กลัว', Neutral: 'กลาง ๆ', Greed: 'โลภ', 'Extreme Greed': 'โลภสุด ๆ' }[f[0].value_classification] || f[0].value_classification) : f[0].value_classification;
    h += st(esc(T('fng')), `${v} <span style="font-size:13px;font-weight:500;color:var(--tx2)">${esc(lbl)}</span>`, `${esc(T('yesterday'))} ${f[1]?.value ?? '–'} · ${esc(T('weekAgo'))} ${f[7]?.value ?? '–'}`, `<div class="fngbar"><b style="left:${v}%"></b></div>`); }
  else h += sk;
  const j = S.judg;
  const brief = j ? `<div class="brief"><span class="bar"></span><div><div class="eyebrow">${esc(T('brief'))} · ${esc(fmtUpdated(j.updated))}</div><p>${esc(L(j, 'market_note') || '')}</p></div></div>` : (S.errors.judg ? `<p class="err" style="margin-top:16px">${esc(T('analysisFail'))}</p>` : '');
  $('#mtop').innerHTML = `<div class="mstats">${h}</div>${brief}`;
  const u = $('#mkUpd'); if (u) u.textContent = S.lastOk ? T('updated') + ' ' + jst(new Date(S.lastOk)) : '';
  const errs = Object.values(S.errors).filter(Boolean); const se = $('#srcErr'); if (se) se.textContent = errs.join(' · ');
}
const fmtUpdated = (iso) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? iso : jst(d); };
function spark(t) {
  if (!t.d1) return ''; const c = t.d1.slice(-30).map((x) => x.c); const mn = Math.min(...c), mx = Math.max(...c);
  const pts = c.map((v, i) => `${(i / (c.length - 1) * 100).toFixed(1)},${(23 - (v - mn) / (mx - mn || 1) * 21).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="${c[c.length - 1] >= c[0] ? 'var(--up)' : 'var(--dn)'}" stroke-width="1.4" vector-effect="non-scaling-stroke" points="${pts}"/></svg>`;
}
function renderOverview() {
  const rows = S.cfg.map((t) => {
    const cg = S.cg[t.coingecko] || {}, I = t.I, sel = S.sel === t.symbol ? 'sel' : '';
    const tok = `<div class="tok">${logo(t)}<div><b>${esc(t.symbol)}</b><small>${esc(t.name)}</small></div></div>`;
    if (!I) return `<tr class="${sel}" data-sel="${t.symbol}"><td>${tok}</td><td colspan="10" class="l">${t.err ? `<span class="err">${esc(T('feedFail'))}</span> <button class="link" data-retry="${t.symbol}">${esc(T('retry'))}</button>` : '<div class="sk" style="height:12px;width:200px"></div>'}</td></tr>`;
    return `<tr class="${sel}" data-sel="${t.symbol}"><td>${tok}</td>
      <td class="num px" data-px="${t.symbol}">${px(t.price)}</td><td class="num ${cls(ch24(t))}" data-ch="${t.symbol}">${pct(ch24(t))}</td>
      <td class="l">${vd(I.plan.bias)}</td><td>${spark(t)}</td>
      <td class="num ${cls(cg.price_change_percentage_7d_in_currency)}">${pct(cg.price_change_percentage_7d_in_currency)}</td>
      <td class="num ${cls(cg.price_change_percentage_30d_in_currency)}">${pct(cg.price_change_percentage_30d_in_currency)}</td>
      <td class="num">${I.rsi?.toFixed(0) ?? '–'}</td><td class="l">${esc(T(I.trend))}</td>
      <td class="num">${px(I.plan.entry[0])} – ${px(I.plan.entry[1])}</td><td class="num">${big(cg.market_cap)}</td></tr>`;
  }).join('');
  const prev = $('#ovSec .tbl-wrap'); const sx = prev ? prev.scrollLeft : 0;
  $('#ovSec').innerHTML = `<div class="tbl-wrap"><table class="ov"><thead><tr><th>${esc(T('token'))}</th><th>${esc(T('price'))}</th><th>${esc(T('d24'))}</th><th class="l">${esc(T('setup'))}</th><th>30d</th><th>${esc(T('d7'))}</th><th>${esc(T('d30'))}</th><th>${esc(T('rsi'))}</th><th class="l">${esc(T('trend'))}</th><th>${esc(T('entryZone'))}</th><th>${esc(T('mcap'))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  const w = $('#ovSec .tbl-wrap'); w.scrollLeft = sx; const f = () => w.classList.toggle('scrolled', w.scrollLeft > 2); w.addEventListener('scroll', f, { passive: true }); f();
}
const TABS = ['chart', 'plan', 'lev', 'mom', 'vol', 'bb'];
function renderDetail(soft) {
  const t = tokBySym(S.sel), el = $('#detail'); if (!t || !el) return;
  const chips = `<div class="chips" role="tablist">${S.cfg.map((x) => `<button class="chip" role="tab" data-sel="${x.symbol}" data-chip aria-pressed="${x.symbol === S.sel}">${logo(x, 'sm')}${esc(x.symbol)}</button>`).join('')}</div>`;
  if (!t.I) { killCharts(); el.innerHTML = chips + (t.err ? `<p class="err">${esc(T('feedFail'))}: ${esc(t.err)} <button data-retry="${t.symbol}">${esc(T('retry'))}</button></p>` : `<div class="sk" style="height:40px;width:50%"></div><div class="sk" style="height:320px;margin-top:16px"></div>`); return; }
  if (soft && el.dataset.sym === t.symbol && $('#tabBody')) { // light refresh: keep charts, update numbers
    $('#planBox').innerHTML = planHTML(t); $('#kv').innerHTML = kvHTML(t); $('#indBox').innerHTML = indHTML(t); return;
  }
  el.dataset.sym = t.symbol;
  const j = J(t.symbol), I = t.I, P = I.plan;
  el.innerHTML = chips + `<div class="dh">${logo(t, 'lg')}<div><div class="nm">${esc(t.name)} · ${esc(t.symbol)}</div>
      <div><span class="big num" data-px="${t.symbol}">${px(t.price)}</span><span class="chg num ${cls(ch24(t))}" data-ch="${t.symbol}">${pct(ch24(t))}</span></div></div></div>
    ${L(j, 'what') ? `<p class="what">${esc(L(j, 'what'))}</p>` : ''}
    <div class="meta dmeta"><span>${esc(T('trend'))} <b>${esc(T(I.trend))}</b></span><span>${esc(T('setup'))} ${vd(P.bias)}</span>${j.risk ? `<span>${esc(T('risk'))} <b>${esc(T(j.risk))}</b></span>` : ''}${j.sentiment ? `<span>X <b>${esc(T(j.sentiment))}</b></span>` : ''}</div>
    <div class="dgrid"><div style="min-width:0"><div class="tabs" role="tablist">${TABS.map((x) => `<button class="tab" role="tab" aria-selected="${S.tab === x}" data-tab="${x}">${esc(T('tabs')[x])}</button>`).join('')}</div><div id="tabBody"></div></div>
      <div class="plan" id="planBox">${planHTML(t)}</div></div>
    <div class="sec"><div class="sec-h"><h2>${esc(T('stats'))}</h2></div><div class="kv" id="kv">${kvHTML(t)}</div></div>
    <div class="sec"><div class="sec-h"><h2>${esc(T('indicators'))}</h2><span class="sub">${esc(T('liveFrom'))} ${esc(EXNAME[t._src.ex])}</span></div><div class="ind" id="indBox">${indHTML(t)}</div></div>
    ${analysisHTML(t)}`;
  renderTab(t);
}
function biasWhyL(t) {
  const I = t.I, P = I.plan, p = t.price, th = LANG === 'th', r = [];
  if (th) {
    r.push(p > I.ma200 ? 'อยู่เหนือเส้น 200 วัน (ภาพใหญ่ยังขาขึ้น)' : 'อยู่ใต้เส้น 200 วัน (ภาพใหญ่เป็นขาลง)');
    r.push(p > I.ma50 ? 'เหนือเส้น 50 วัน' : 'ใต้เส้น 50 วัน'); r.push(I.hist > 0 ? 'MACD เป็นบวก' : 'MACD ยังติดลบ');
    r.push(`TP1 ได้ ${P.tps[0].rr.toFixed(2)} เท่าของความเสี่ยง`);
    const lead = P.bias === 'Long' ? 'สัญญาณเข้าทาง: ' : P.bias === 'Avoid' ? 'เทรนด์ยังเป็นขาลง: ' : 'สัญญาณยังปนกัน: ';
    return lead + r.join(' · ') + (P.inZone ? ' ตอนนี้ราคาอยู่ในโซนเข้าซื้อพอดี' : p > P.entry[1] ? ' ราคายังอยู่เหนือโซนเข้าซื้อ ใจเย็นรอให้ย่อลงมาก่อน' : ' ราคาหลุดโซนเข้าซื้อลงมาแล้ว ให้ระวังจุดตัดขาดทุน');
  }
  r.push(p > I.ma200 ? 'above its 200-day average (long-term trend up)' : 'below its 200-day average (long-term trend down)');
  r.push(p > I.ma50 ? 'above the 50-day' : 'below the 50-day'); r.push(I.hist > 0 ? 'MACD positive' : 'MACD negative');
  r.push(`TP1 pays ${P.tps[0].rr.toFixed(2)}× the risk`);
  const lead = P.bias === 'Long' ? 'Conditions line up: ' : P.bias === 'Avoid' ? 'Trend is down: ' : 'Mixed signals: ';
  return lead + r.join(', ') + (P.inZone ? '. Price is inside the entry zone now.' : p > P.entry[1] ? '. Price is above the entry zone; wait for a dip into it.' : '. Price is below the entry zone; respect the stop-loss.');
}
const LC = { tp: 'var(--up)', stop: 'var(--dn)', entry: 'var(--ac)', sup: 'var(--tx3)', res: 'var(--tx3)' };
function planHTML(t) {
  const I = t.I, P = I.plan, p = t.price, j = J(t.symbol), em = (P.entry[0] + P.entry[1]) / 2;
  const d = (x) => pct((x - p) / p * 100, 1);
  const row = (k, c, v, dd, cl = '') => `<tr class="${cl}"><td class="k"><i style="background:${c}"></i>${k}</td><td class="num">${v}</td><td class="num">${dd}</td></tr>`;
  const rows = [
    ...P.tps.map((x, i) => [i, x]).reverse().map(([i, x]) => row(`TP${i + 1} <span class="mut" style="font-size:11px">${x.rr.toFixed(1)}R</span>`, LC.tp, px(x.price), d(x.price))),
    ...P.res.filter((r) => !P.tps.some((x) => x.price === r)).map((r) => row(esc(T('resistance')), LC.res, px(r), d(r))),
    row(esc(T('now')), 'var(--tx)', `<span data-px="${t.symbol}">${px(p)}</span>`, '', 'now'),
    row(esc(T('entryZone')), LC.entry, `${px(P.entry[0])} – ${px(P.entry[1])}`, d(em)),
    ...P.sup.filter((s) => s !== P.entry[0]).map((s, i) => row(`${esc(T('support'))} ${i + 1}`, LC.sup, px(s), d(s))),
    row(esc(T('stop')), LC.stop, px(P.stop), d(P.stop))].join('');
  const note = L(j, 'verdict_note');
  return `<div class="verdict"><div class="eyebrow">${esc(T('tradePlan'))}</div><div style="margin-top:4px">${vd(P.bias)}</div><p>${esc(note || biasWhyL(t))}</p>${note ? `<p class="mut" style="font-size:12px">${esc(biasWhyL(t))}</p>` : ''}</div>
    <table class="lv"><tbody>${rows}</tbody></table>
    <div class="fair"><div class="eyebrow">${esc(T('fair'))}</div><div class="v num">${px(P.fair)} <span class="${cls(P.fair - p)}" style="font-size:13px;font-weight:500">${pct((P.fair - p) / p * 100, 1)} ${esc(T('vsNow'))}</span></div><p>${esc(T('fairHow')(px(I.ma50), px(I.ma200), px(P.vwap)))}</p></div>
    <p class="nfa">${esc(T('nfa'))}</p>`;
}
function kvHTML(t) {
  const cg = S.cg[t.coingecko] || {}, I = t.I;
  const k = (l, v, d = '', c = '') => `<div><div class="eyebrow">${esc(l)}</div><div class="v num ${c}">${v}</div><div class="d">${d || '&nbsp;'}</div></div>`;
  return k(T('d7'), pct(cg.price_change_percentage_7d_in_currency), '', cls(cg.price_change_percentage_7d_in_currency)) + k(T('d30'), pct(cg.price_change_percentage_30d_in_currency), '', cls(cg.price_change_percentage_30d_in_currency))
    + k(T('mcap'), big(cg.market_cap), cg.fully_diluted_valuation ? T('fdv') + ' ' + big(cg.fully_diluted_valuation) : '') + k(T('vol24'), big(cg.total_volume))
    + k(T('ath'), px(cg.ath), cg.ath_change_percentage != null ? pct(cg.ath_change_percentage, 1) + ' ' + T('fromAth') : '')
    + k(T('volat'), I.vol30 ? I.vol30.toFixed(0) + T('perYr') : '–', I.vol30 > 80 ? T('wild') : I.vol30 > 50 ? T('choppy') : T('calm'));
}
function indHTML(t) {
  const I = t.I, r = I.rsi, th = LANG === 'th', bbp = (t.price - I.bbLo) / (I.bbUp - I.bbLo) * 100;
  const rows = th ? [
    ['RSI (14)', r.toFixed(1), r > 70 ? 'ขึ้นมาเร็วไป (overbought) ระวังย่อ' : r < 30 ? 'โดนเทขายหนัก (oversold) มักมีเด้ง' : r > 50 ? 'ฝั่งซื้อคุมเกมนิด ๆ' : 'ฝั่งขายคุมเกมนิด ๆ'],
    [T('trend') + ' (MA50 / MA200)', T(I.trend), `เทียบราคากับ MA50 ${px(I.ma50)} และ MA200 ${I.ma200 ? px(I.ma200) : '–'}`],
    ['MACD', I.hist > 0 ? 'บวก' : 'ลบ', I.hist > 0 ? 'แรงซื้อกำลังมา' : 'แรงส่งกำลังแผ่ว'],
    ['Bollinger', bbp.toFixed(0) + '%', 'ตำแหน่งราคาในกรอบปกติ 20 วัน (0% = ขอบล่าง, 100% = ขอบบน)'],
    [T('volat'), I.vol30 ? I.vol30.toFixed(0) + T('perYr') : '–', 'ยิ่งสูงยิ่งเหวี่ยงแรง ควรลดขนาดไม้ลง']]
  : [
    ['RSI (14)', r.toFixed(1), r > 70 ? 'Overbought: ran up fast, pullbacks are common.' : r < 30 ? 'Oversold: sold off hard, bounces are common.' : r > 50 ? 'Buyers slightly in control.' : 'Sellers slightly in control.'],
    ['Trend (MA50 / MA200)', T(I.trend), `Price vs MA50 ${px(I.ma50)} and MA200 ${I.ma200 ? px(I.ma200) : 'n/a'}.`],
    ['MACD', I.hist > 0 ? 'Positive' : 'Negative', I.hist > 0 ? 'Momentum building up.' : 'Momentum fading.'],
    ['Bollinger', bbp.toFixed(0) + '%', 'Where price sits in its normal 20-day range (0% bottom, 100% top).'],
    ['Volatility', I.vol30 ? I.vol30.toFixed(0) + '%/yr' : '–', 'How violently it swings. Size smaller when this is high.']];
  return rows.map(([n, v, s]) => `<div><span class="n">${esc(n)}</span><b class="num">${esc(v)}</b><span class="s">${esc(s)}</span></div>`).join('');
}
function analysisHTML(t) {
  if (S.errors.judg) return `<p class="err sec">${esc(T('analysisFail'))}</p>`;
  const j = J(t.symbol); const arr = (k) => (LANG === 'th' && j.th && Array.isArray(j.th[k]) && j.th[k].length ? j.th[k] : j[k]) || [];
  const list = (a, c = '') => `<ul class="bl ${c}">${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return `<div class="sec"><div class="sec-h"><h2>${esc(T('proTake'))}</h2><span class="sub">${esc(T('analysisAt'))} · ${esc(fmtUpdated(S.judg && S.judg.updated))}</span></div><p class="take">${esc(L(j, 'take') || T('noAnalysis'))}</p></div>
    <div class="sec two"><div><div class="h3 up">${esc(T('bull'))}</div>${list(arr('bull'), 'g')}</div><div><div class="h3 dn">${esc(T('bear'))}</div>${list(arr('bear'), 'r')}</div></div>
    <div class="sec"><div class="sec-h"><h2>${esc(T('watchFor'))}</h2></div>${list(arr('watch'))}</div>
    ${xHTML(t, j)}${newsHTML(t, j)}`;
}
function renderTab(t) {
  const I = t.I, P = I.plan, b = $('#tabBody'); if (!b) return; killCharts();
  const lg = (items) => `<div class="legend">${items.map(([n, c]) => `<span><i style="background:${c}"></i>${esc(n)}</span>`).join('')}</div>`;
  const C = chartColors(); const src = `${EXNAME[t._src.ex]} ${t._src.pair}`; const th = LANG === 'th';
  const bar = (right = '') => `<div class="chartbar"><span class="sub">${esc(T('dailyCandles'))} · ${esc(src)}</span>${right}</div>`;
  if (S.tab === 'lev') return renderLev(t, b);
  if (S.tab === 'chart') {
    const ab = (v) => th ? (t.price > v ? 'เหนือ' : 'ใต้') : (t.price > v ? 'above' : 'below');
    b.innerHTML = bar() + `<div class="chart" id="ch1"></div>${lg([[T('ma20'), C.ma20], [T('ma50'), C.ma50], [T('ma200'), C.ma200]])}
      <p class="expl">${th ? `ราคาอยู่เหนือเส้นไหน = เทรนด์ช่วงนั้นเป็นขาขึ้น ตอนนี้ราคาอยู่${ab(I.ma20)} MA20 (${px(I.ma20)}), ${ab(I.ma50)} MA50 (${px(I.ma50)})${I.ma200 ? ` และ${ab(I.ma200)} MA200 (${px(I.ma200)})` : ''}` : `Price above an average means that trend is up. Now: ${ab(I.ma20)} MA20 (${px(I.ma20)}), ${ab(I.ma50)} MA50 (${px(I.ma50)})${I.ma200 ? ` and ${ab(I.ma200)} MA200 (${px(I.ma200)})` : ''}.`}</p>`;
    const c = mkChart('#ch1'); const cs = candles(c, t.d1); S.live = { candle: cs };
    line(c, t.d1, I.series.ma20, C.ma20, 1.5); line(c, t.d1, I.series.ma50, C.ma50, 1.5); line(c, t.d1, I.series.ma200, C.ma200, 1.5); fit(c, t.d1, 120);
  }
  if (S.tab === 'plan') {
    b.innerHTML = `<div class="chartbar"><span class="sub">${th ? 'ระดับจากกราฟรายวัน · โซนเข้าซื้อปรับละเอียดด้วยกราฟ 4 ชม.' : 'Levels from daily candles · entry refined on 4h'}</span><div class="seg sm">${['1D', '4H'].map((x) => `<button aria-pressed="${S.tf === x}" data-tf="${x}">${x}</button>`).join('')}</div></div>
      <div class="chart" id="ch1"></div>${lg([[T('entryZone'), C.ac], [T('stop'), C.dn], ['TP', C.up], [T('support') + ' / ' + T('resistance'), C.mut]])}`;
    const k = S.tf === '1D' ? t.d1 : (t.h4 || t.d1);
    const c = mkChart('#ch1'); const cs = candles(c, k); S.live = S.tf === '1D' ? { candle: cs } : {};
    const pl = (price, color, title, style = 0, w = 1) => cs.createPriceLine({ price, color, lineWidth: w, lineStyle: style, axisLabelVisible: true, title });
    pl(P.entry[1], C.ac, '', 2); pl(P.entry[0], C.ac, LANG === 'th' ? 'โซนเข้า' : 'Entry', 2); pl(P.stop, C.dn, 'SL');
    P.tps.forEach((x, i) => pl(x.price, C.up, 'TP' + (i + 1)));
    P.sup.forEach((s, i) => { if (s !== P.entry[0]) pl(s, C.mut, 'S' + (i + 1), 1); });
    P.res.filter((r) => !P.tps.some((x) => x.price === r)).forEach((r) => pl(r, C.mut, 'R', 1));
    fit(c, k, S.tf === '1D' ? 90 : 120);
  }
  if (S.tab === 'mom') {
    const r = I.rsi, rt = th ? (r > 70 ? 'ขึ้นมาเร็วไป มักมีย่อ' : r < 30 ? 'โดนขายหนัก มักมีเด้ง' : r > 50 ? 'ฝั่งซื้อคุมนิด ๆ' : 'ฝั่งขายคุมนิด ๆ') : (r > 70 ? 'overbought, pullbacks are common' : r < 30 ? 'oversold, bounces are common' : r > 50 ? 'buyers slightly in control' : 'sellers slightly in control');
    b.innerHTML = `<div class="chartbar"><span><b>RSI ${r.toFixed(1)}</b> <span class="sub">${esc(rt)}</span></span></div><div class="chart sm" id="ch1"></div>
      <div class="chartbar" style="margin-top:18px"><span><b>MACD</b> <span class="sub ${cls(I.hist)}">${th ? (I.hist > 0 ? 'แรงซื้อกำลังมา' : 'แรงส่งกำลังแผ่ว') : (I.hist > 0 ? 'momentum up' : 'momentum down')}</span></span></div><div class="chart sm" id="ch2"></div>
      ${lg([['MACD', C.ac], ['Signal', C.ma50]])}<p class="expl">${th ? 'RSI เกิน 70 = ร้อนเกิน ต่ำกว่า 30 = ขายมากเกิน ส่วน MACD ถ้าแท่งเป็นสีเขียว แรงส่งกำลังกลับขึ้น ถ้าแดงคือแรงกำลังหมด' : 'RSI above 70 is overbought, below 30 oversold. MACD bars above zero mean momentum is turning up; below zero, fading.'}</p>`;
    const c1 = mkChart('#ch1'); const rs = line(c1, t.d1, I.series.rsi, C.ac, 1.5);
    rs.createPriceLine({ price: 70, color: C.mut, lineStyle: 2, lineWidth: 1, title: '70' }); rs.createPriceLine({ price: 30, color: C.mut, lineStyle: 2, lineWidth: 1, title: '30' }); fit(c1, t.d1, 120);
    const c2 = mkChart('#ch2'); const h = c2.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });
    h.setData(t.d1.map((x, i) => I.series.hist[i] == null ? null : { time: ts(x.t), value: I.series.hist[i], color: I.series.hist[i] >= 0 ? C.upA : C.dnA }).filter(Boolean));
    line(c2, t.d1, I.series.macd, C.ac, 1.5); line(c2, t.d1, I.series.sig, C.ma50, 1.5); fit(c2, t.d1, 120); syncCharts(c1, c2);
  }
  if (S.tab === 'vol') {
    const v = t.d1.slice(-30).map((x) => x.q), avg = v.reduce((a, c) => a + c, 0) / v.length, yd = t.d1[t.d1.length - 2].q;
    b.innerHTML = `<div class="chartbar"><span><b class="num">${big(yd)}</b> <span class="sub">${th ? 'เมื่อวาน · เฉลี่ย 30 วัน' : 'yesterday · 30-day avg'} ${big(avg)}</span></span><span class="sub">${esc(src)}</span></div><div class="chart" id="ch1"></div>
      <p class="expl">${th ? 'ราคาขยับพร้อมวอลุ่มที่เพิ่มขึ้น = น่าเชื่อถือ ถ้าวอลุ่มบางมักไปต่อไม่ไกล' : 'Moves on rising volume are more trustworthy; moves on thin volume fade easily.'}</p>`;
    const c = mkChart('#ch1'); const h = c.addHistogramSeries({ priceFormat: { type: 'custom', formatter: big }, priceLineVisible: false });
    h.setData(t.d1.map((x) => ({ time: ts(x.t), value: x.q, color: x.c >= x.o ? C.upA : C.dnA }))); fit(c, t.d1, 120);
  }
  if (S.tab === 'bb') {
    const pos = (t.price - I.bbLo) / (I.bbUp - I.bbLo) * 100;
    b.innerHTML = bar(`<span class="sub num">${pos.toFixed(0)}%</span>`) + `<div class="chart" id="ch1"></div>${lg([[th ? 'ขอบบน / ล่าง' : 'Upper / lower band', C.mut], [th ? 'เส้นกลาง (MA20)' : 'Middle (MA20)', C.ac]])}
      <p class="expl">${th ? `ใกล้ขอบบน = ราคายืดขึ้นมาเยอะ ใกล้ขอบล่าง = ยืดลงมาเยอะ กรอบแคบมักเกิดก่อนราคาจะวิ่งแรง ตอนนี้ ${pos > 80 ? 'อยู่ใกล้ขอบบน' : pos < 20 ? 'อยู่ใกล้ขอบล่าง' : 'อยู่กลางกรอบ'}` : `Near the upper band = stretched high, near the lower band = stretched low. A narrow band often comes before a big move. Now: ${pos > 80 ? 'near the top' : pos < 20 ? 'near the bottom' : 'mid-channel'}.`}</p>`;
    const c = mkChart('#ch1'); const cs = candles(c, t.d1); S.live = { candle: cs };
    line(c, t.d1, I.series.bbUp, C.mut, 1); line(c, t.d1, I.series.bbMid, C.ac, 1); line(c, t.d1, I.series.bbLo, C.mut, 1); fit(c, t.d1, 120);
  }
}

/* ---------- charts ---------- */
const ts = (ms) => Math.floor(ms / 1000) + 9 * 3600; // JST wall-clock
function chartColors() {
  const cs = getComputedStyle(document.documentElement), g = (k) => cs.getPropertyValue(k).trim();
  const up = g('--up'), dn = g('--dn'); const a = (hex, al) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${al})`; };
  return { bg: g('--bg'), tx: g('--tx3'), line: g('--line'), up, dn, upA: a(up, .45), dnA: a(dn, .45), ac: g('--ac'), mut: g('--tx3'), ma20: g('--ac'), ma50: '#d4a017', ma200: g('--tx2') };
}
function mkChart(sel) {
  const el = $(sel), C = chartColors();
  const c = LightweightCharts.createChart(el, { autoSize: true, layout: { background: { color: 'transparent' }, textColor: C.tx, fontSize: 11, fontFamily: getComputedStyle(document.body).fontFamily },
    grid: { vertLines: { visible: false }, horzLines: { color: C.line } }, rightPriceScale: { borderVisible: false }, timeScale: { borderVisible: false, timeVisible: S.tab === 'plan' && S.tf === '4H' },
    crosshair: { mode: 0, vertLine: { color: C.mut, labelBackgroundColor: C.tx }, horzLine: { color: C.mut, labelBackgroundColor: C.tx } }, handleScroll: { vertTouchDrag: false },
    localization: { priceFormatter: (v) => Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : Math.abs(v) >= 1 ? v.toFixed(2) : v.toPrecision(4) } });
  S.charts.push(c); return c;
}
function candles(c, k) { const C = chartColors(); const s = c.addCandlestickSeries({ upColor: C.up, downColor: C.dn, borderVisible: false, wickUpColor: C.up, wickDownColor: C.dn, priceLineVisible: false }); s.setData(k.map((x) => ({ time: ts(x.t), open: x.o, high: x.h, low: x.l, close: x.c }))); return s; }
function line(c, k, vals, color, w = 2) { const s = c.addLineSeries({ color, lineWidth: w, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }); s.setData(k.map((x, i) => vals[i] == null ? null : { time: ts(x.t), value: vals[i] }).filter(Boolean)); return s; }
function fit(c, k, n) { const a = k.length; c.timeScale().setVisibleLogicalRange({ from: Math.max(0, a - n), to: a + 2 }); }
function syncCharts(a, b) { let lock = false; const f = (s, d) => s.timeScale().subscribeVisibleLogicalRangeChange((r) => { if (lock || !r) return; lock = true; d.timeScale().setVisibleLogicalRange(r); lock = false; }); f(a, b); f(b, a); }
function killCharts() { S.charts.forEach((c) => { try { c.remove(); } catch (e) {} }); S.charts = []; S.live = null; }

/* ---------- WATCHLIST ---------- */
const cfgOnly = (t) => ({ symbol: t.symbol, name: t.name, coingecko: t.coingecko, logo: t.logo, sources: t.sources });
function saveCfg() { store.set('cw-tokens', S.cfg.map(cfgOnly)); }
function pWatchlist() {
  const rows = S.cfg.map((t, i) => `<div class="wl-row">${'<div class="tok">' + logo(t) + `<div><b>${esc(t.symbol)}</b><small>${esc(t.name)}</small></div></div>`}
    <span class="src">${esc(T('feeds'))}: ${esc(EXNAME[(t._src || t.sources[0]).ex])}</span>
    <div class="wl-act"><button data-mv="${i}:-1" aria-label="${esc(T('moveUp'))}" ${i === 0 ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
    <button data-mv="${i}:1" aria-label="${esc(T('moveDown'))}" ${i === S.cfg.length - 1 ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
    <button class="x" data-rm="${t.symbol}" aria-label="${esc(T('remove'))}"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div></div>`).join('');
  $('#main').innerHTML = `<div class="page narrow">${pageHead(T('watchlist'))}<p class="p" style="margin-bottom:16px">${esc(T('wlIntro'))}</p>
    <div class="wl">${rows}</div>
    <div class="sec"><div class="sec-h"><h2>${esc(T('addToken'))}</h2></div><div class="search"><input id="q" type="search" autocomplete="off" placeholder="${esc(T('searchPh'))}"></div><div class="results" id="res"></div></div>
    <div class="sec"><button class="btn ghost" data-reset>${esc(T('reset'))}</button></div></div>`;
  let tmr; $('#q').addEventListener('input', (e) => { clearTimeout(tmr); const q = e.target.value.trim(); if (q.length < 2) { $('#res').innerHTML = ''; return; } tmr = setTimeout(() => searchCoins(q), 300); });
}
async function searchCoins(q) {
  try { const r = await getJSON(`${CG}/search?query=${encodeURIComponent(q)}`);
    $('#res').innerHTML = r.coins.slice(0, 8).map((c) => `<button data-add='${esc(JSON.stringify({ id: c.id, symbol: c.symbol.toUpperCase(), name: c.name, logo: c.large || c.thumb }))}'><img class="logo" src="${esc(c.thumb)}" alt=""><div class="tok"><div><b>${esc(c.symbol.toUpperCase())}</b><small>${esc(c.name)}${c.market_cap_rank ? ' · #' + c.market_cap_rank : ''}</small></div></div><span class="add">+ ${esc(T('addToken'))}</span></button>`).join('');
  } catch (e) { $('#res').innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}
async function addToken(c) {
  if (tokBySym(c.symbol)) return toast(T('already'));
  toast(T('checking'));
  const t = { symbol: c.symbol, name: c.name, coingecko: c.id, logo: c.logo, sources: [{ ex: 'binance', pair: c.symbol + 'USDT' }, { ex: 'bybit', pair: c.symbol + 'USDT' }, { ex: 'okx', pair: c.symbol + '-USDT' }] };
  try { await loadCandles(t, '1d', 5); } catch (e) { return toast(T('noPair')); }
  S.cfg.push(t); saveCfg(); toast(T('added')(c.symbol)); if (S.route === 'watchlist') pWatchlist();
  await Promise.all([loadToken(t), loadCG()]); syncWS();
}

/* ---------- CALENDAR ---------- */
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
const todayJ = () => ymd(new Date());
const dayDiff = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);
function calEvents() {
  const ev = (S.cal && S.cal.events) || []; const f = S.calFilter;
  return ev.filter((e) => f === 'all' || (f === 'unlock' || f === 'airdrop' ? e.type === f : f === 'macro' ? !e.tokens.length && e.type !== 'airdrop' : e.tokens.includes(f))).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
}
function pCalendar() {
  if (!S.calMonth) S.calMonth = todayJ().slice(0, 7);
  const syms = [...new Set([...S.cfg.map((t) => t.symbol)])];
  const filt = `<div class="filters">${[['all', T('all')], ['unlock', T('etype').unlock], ['airdrop', T('etype').airdrop], ['macro', T('macro')], ...syms.map((s) => [s, s])].map(([k, n]) => { const t = tokBySym(k); return `<button class="chip ${t ? '' : 'np'}" data-cf="${k}" aria-pressed="${S.calFilter === k}">${t ? logo(t, 'sm') : ''}${esc(n)}</button>`; }).join('')}</div>`;
  const [y, m] = S.calMonth.split('-').map(Number); const mName = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(loc(), { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const tools = `<div class="cal-tools"><div class="seg"><button data-cv="month" aria-pressed="${S.calView === 'month'}">${esc(T('month'))}</button><button data-cv="list" aria-pressed="${S.calView === 'list'}">${esc(T('list'))}</button></div>
    ${S.calView === 'month' ? `<div class="cal-nav"><button class="icon-btn" data-cm="-1" aria-label="prev"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button><h2>${esc(mName)}</h2><button class="icon-btn" data-cm="1" aria-label="next"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button><button class="btn ghost" data-cm="0">${esc(T('today'))}</button></div>` : ''}</div>`;
  const evs = calEvents(); let body = '';
  if (S.calView === 'month') {
    const first = new Date(Date.UTC(y, m - 1, 1)); const off = (first.getUTCDay() + 6) % 7; const start = new Date(first - off * 864e5);
    const cells = []; for (let i = 0; i < 42; i++) { const d = new Date(start.getTime() + i * 864e5); cells.push(d); if (i >= 34 && d.getUTCMonth() !== m - 1 && (i + 1) % 7 === 0) break; }
    const td = todayJ();
    body = `<div class="grid">${T('dows').map((d) => `<div class="dow">${esc(d)}</div>`).join('')}${cells.map((d) => { const k = d.toISOString().slice(0, 10); const de = evs.filter((e) => e.date === k);
      return `<button class="day ${d.getUTCMonth() !== m - 1 ? 'out' : ''} ${k === td ? 'today' : ''} ${S.calPick === k ? 'pick' : ''}" data-day="${k}"><span class="dn_ num">${d.getUTCDate()}</span>${de.slice(0, 3).map((e) => `<span class="ev ${e.impact}">${esc(e.tokens[0] || '')}${e.tokens.length ? ' · ' : ''}${esc(L(e, 'title'))}</span>`).join('')}${de.length ? `<span class="dots">${de.slice(0, 3).map((e) => `<i class="${e.impact}"></i>`).join('')}</span>` : ''}</button>`; }).join('')}</div>`;
    const list = S.calPick ? evs.filter((e) => e.date === S.calPick) : evs.filter((e) => e.date.slice(0, 7) === S.calMonth);
    body += `<div class="sec">${eventList(list, S.calPick ? new Date(S.calPick + 'T00:00:00Z').toLocaleDateString(loc(), { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }) : null)}</div>`;
  } else body = eventList(evs.filter((e) => dayDiff(e.date, todayJ()) >= -7));
  $('#main').innerHTML = `<div class="page">${pageHead(T('calendar'), `<span class="sub">${esc(T('jst'))}</span>`)}${filt}${tools}${body}</div>`;
}
function eventList(list, heading) {
  if (!list.length) return `<div class="empty">${esc(T('noEvents'))}</div>`;
  const td = todayJ(); let out = '', lastM = '';
  if (heading) out += `<div class="egroup">${esc(heading)}</div>`;
  list.forEach((e) => {
    const d = new Date(e.date + 'T00:00:00Z'); const mk = d.toLocaleDateString(loc(), { month: 'long', year: 'numeric', timeZone: 'UTC' });
    if (!heading && mk !== lastM) { out += `<div class="egroup">${esc(mk)}</div>`; lastM = mk; }
    const n = dayDiff(e.date, td); const toks = e.tokens.map((s) => { const t = tokBySym(s); return t ? `<span class="tok" style="gap:5px">${logo(t, 'sm')}${esc(s)}</span>` : esc(s); }).join(' ');
    out += `<div class="erow ${n < 0 ? 'past' : ''}"><div class="dt"><b class="num">${d.getUTCDate()}</b><small>${esc(d.toLocaleDateString(loc(), { weekday: 'short', timeZone: 'UTC' }))}</small></div>
      <div><div class="t">${esc(L(e, 'title'))}</div>${L(e, 'note') ? `<div class="n">${esc(L(e, 'note'))}</div>` : ''}
      <div class="m"><span>${esc(T('etype')[e.type] || e.type)}</span>${toks ? `<span>${toks}</span>` : ''}<span class="imp ${e.impact}">${esc(T('impact')[e.impact] || '')}</span>${e.type === 'unlock' && e.supply_pct != null ? `<span class="num">${esc(TF('ulSup', e.supply_pct))}</span>` : ''}${e.vs_vol != null ? `<span class="num ${e.vs_vol >= 1 ? 'dn' : ''}">${esc(TF('ulVol', e.vs_vol))}</span>` : ''}${e.kind ? `<span>${esc(T('akind')[e.kind] || e.kind)}</span>` : ''}<span>${e.time ? esc(e.time) + ' JST' : esc(T('allDay'))}</span><span>${esc(n >= 0 ? T('inDays')(n) : T('ago')(-n))}</span>${e.url ? `<a class="link" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(T('source'))} ↗</a>` : ''}</div></div></div>`;
  });
  return `<div class="elist">${out}</div>`;
}

/* ---------- JOURNAL ---------- */
const JR = () => store.get('cw-journal', []);
const JRset = (a) => store.set('cw-journal', a);
const livePx = (sym) => { const t = tokBySym(sym); return t && t.price; };
function tradePnl(tr) {
  const exit = tr.close != null && tr.close !== '' ? +tr.close : livePx(tr.token); if (!exit || !tr.entry) return { pnl: null, pct: null, r: null };
  const dir = tr.side === 'short' ? -1 : 1; const p = dir * (exit / tr.entry - 1); const r = tr.sl ? (dir * (exit - tr.entry)) / Math.abs(tr.entry - tr.sl) : null;
  return { pnl: p * tr.size, pct: p * 100, r, exit };
}
function pJournal() {
  const all = JR(); const open = all.filter((x) => x.close == null || x.close === ''), done = all.filter((x) => !(x.close == null || x.close === ''));
  const realized = done.reduce((s, x) => s + (tradePnl(x).pnl || 0), 0), unreal = open.reduce((s, x) => s + (tradePnl(x).pnl || 0), 0);
  const wins = done.filter((x) => tradePnl(x).pnl > 0).length; const rs = done.map((x) => tradePnl(x).r).filter((x) => x != null);
  const st = (l, v, c = '', id = '') => `<div><div class="eyebrow">${esc(l)}</div><div class="v num ${c}" ${id ? `id="${id}"` : ''}>${v}</div></div>`;
  const list = (S.jFilter === 'open' ? open : done).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const rows = list.map((x) => { const t = tokBySym(x.token) || { symbol: x.token, name: '' }; const p = tradePnl(x);
    return `<div class="jrow" data-jedit="${x.id}"><div class="tok">${logo(t)}<div><b>${esc(x.token)}<span class="side-tag">${x.side === 'short' ? 'SHORT' : 'LONG'}</span></b><small>${esc(x.date || '')} · ${px(+x.entry)} → ${p.exit ? `<span ${x.close ? '' : `data-px="${esc(x.token)}"`}>${px(p.exit)}</span>` : '–'}</small></div></div>
      <div class="r"><b class="num ${cls(p.pnl)}" data-jp="${x.id}">${usd(p.pnl)}</b><span class="num sub ${cls(p.pct)}" data-jq="${x.id}">${pct(p.pct)}${p.r != null ? ' · ' + p.r.toFixed(2) + 'R' : ''}</span></div>
      <div class="meta"><span>${esc(T('size'))} <b class="num">$${(+x.size).toLocaleString('en-US')}</b></span>${x.sl ? `<span>SL <b class="num">${px(+x.sl)}</b></span>` : ''}${x.tp ? `<span>TP <b class="num">${px(+x.tp)}</b></span>` : ''}${x.notes ? `<span>${esc(x.notes)}</span>` : ''}</div></div>`; }).join('');
  $('#main').innerHTML = `<div class="page">${pageHead(T('journal'), `<button class="btn pri" data-jnew>+ ${esc(T('newTrade'))}</button>`)}
    <div class="jstats">${st(T('unreal'), usd(unreal), cls(unreal), 'jUnreal')}${st(T('realized'), usd(realized), cls(realized))}${st(T('winRate'), done.length ? Math.round(wins / done.length * 100) + '%' : '–')}${st(rs.length ? T('avgR') : T('trades'), rs.length ? (rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(2) + 'R' : `${all.length}`)}</div>
    <div class="jtools"><div class="seg"><button data-jf="open" aria-pressed="${S.jFilter === 'open'}">${esc(T('openPos'))} · ${open.length}</button><button data-jf="closed" aria-pressed="${S.jFilter === 'closed'}">${esc(T('closed'))} · ${done.length}</button></div>
      <div style="display:flex;gap:6px"><button class="btn pri jnew-m" data-jnew style="display:none">+ ${esc(T('newTrade'))}</button><button class="btn ghost" data-jexp>${esc(T('exp'))}</button><label class="btn ghost" style="cursor:pointer">${esc(T('imp'))}<input type="file" accept="application/json,.json" id="jimp" hidden></label></div></div>
    <div>${rows || `<div class="empty">${esc(T('jEmpty'))}<div style="margin-top:14px"><button class="btn pri" data-jnew>+ ${esc(T('newTrade'))}</button></div></div>`}</div>
    <p class="sub" style="margin-top:16px">${esc(T('jSaved'))}</p></div>`;
  if (matchMedia('(max-width:1023px)').matches) $$('.jnew-m').forEach((b) => b.style.display = '');
  $('#jimp').addEventListener('change', importJ);
}
function onTick() {
  if (S.route !== 'journal') return;
  const all = JR(); let unreal = 0;
  all.forEach((x) => { if (x.close != null && x.close !== '') return; const p = tradePnl(x); unreal += p.pnl || 0;
    const a = $(`[data-jp="${x.id}"]`), b = $(`[data-jq="${x.id}"]`);
    if (a) { a.textContent = usd(p.pnl); a.className = 'num ' + cls(p.pnl); } if (b) { b.textContent = pct(p.pct) + (p.r != null ? ' · ' + p.r.toFixed(2) + 'R' : ''); b.className = 'num sub ' + cls(p.pct); } });
  const u = $('#jUnreal'); if (u) { u.textContent = usd(unreal); u.className = 'v num ' + cls(unreal); }
}
function tradeDialog(id) {
  const all = JR(); const x = all.find((r) => r.id === id) || { token: S.sel || (S.cfg[0] && S.cfg[0].symbol), side: 'long', entry: livePx(S.sel) ? +livePx(S.sel).toPrecision(6) : '', size: 100, date: todayJ() };
  const f = (k, lbl, type = 'number', opt = false, full = false) => `<div class="fld ${full ? 'full' : ''}"><label>${esc(lbl)}${opt ? ` <small>(${esc(T('optional'))})</small>` : ''}</label><input class="input" name="${k}" type="${type}" ${type === 'number' ? 'step="any" inputmode="decimal"' : ''} value="${esc(x[k] ?? '')}"></div>`;
  const d = $('#dlg');
  d.innerHTML = `<form method="dialog" id="jform"><div class="dlg-h"><h2>${esc(id ? T('edit') : T('newTrade'))}</h2><button class="icon-btn" value="cancel" aria-label="close"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
    <div class="dlg-b"><div class="fld"><label>${esc(T('token'))}</label><select class="input" name="token">${[...new Set([...S.cfg.map((t) => t.symbol), x.token])].map((s) => `<option ${s === x.token ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
      <div class="fld"><label>${esc(T('side'))}</label><div class="seg" style="display:flex;height:42px"><button type="button" style="flex:1" data-side="long" aria-pressed="${x.side !== 'short'}">Long</button><button type="button" style="flex:1" data-side="short" aria-pressed="${x.side === 'short'}">Short</button></div><input type="hidden" name="side" value="${x.side || 'long'}"></div>
      ${f('entry', T('entry'))}${f('size', T('size'))}${f('sl', T('sl'), 'number', true)}${f('tp', T('tp'), 'number', true)}${f('date', T('date'), 'date')}
      <div class="fld"><label>${esc(T('closePx'))} <small>(${esc(T('optional'))})</small></label><input class="input" name="close" type="number" step="any" inputmode="decimal" value="${esc(x.close ?? '')}"></div>
      <div class="fld full"><label>${esc(T('notes'))} <small>(${esc(T('optional'))})</small></label><textarea class="input" name="notes">${esc(x.notes || '')}</textarea></div></div>
    <div class="dlg-f">${id ? `<button type="button" class="btn ghost danger sp" data-jdel="${id}">${esc(T('del'))}</button>` : ''}${id && !(x.close) ? `<button type="button" class="btn" data-jclose>${esc(T('closeTrade'))}</button>` : ''}<button class="btn ghost" value="cancel">${esc(T('cancel'))}</button><button class="btn pri" value="ok">${esc(T('save'))}</button></div></form>`;
  const fm = $('#jform');
  fm.addEventListener('click', (e) => { const s = e.target.closest('[data-side]'); if (s) { fm.side.value = s.dataset.side; $$('[data-side]', fm).forEach((b) => b.setAttribute('aria-pressed', b === s)); }
    if (e.target.closest('[data-jclose]')) { const p = livePx(fm.token.value); if (p) fm.close.value = +p.toPrecision(6); fm.close.focus(); }
    const del = e.target.closest('[data-jdel]'); if (del && confirm(T('confirmDel'))) { JRset(JR().filter((r) => r.id !== id)); d.close(); pJournal(); } });
  d.onclose = () => { if (d.returnValue !== 'ok') return; const v = Object.fromEntries(new FormData(fm));
    if (!(+v.entry > 0) || !(+v.size > 0)) return;
    const rec = { id: id || Date.now().toString(36), token: v.token, side: v.side, entry: +v.entry, size: +v.size, sl: v.sl ? +v.sl : null, tp: v.tp ? +v.tp : null, date: v.date, close: v.close ? +v.close : null, notes: v.notes.trim() };
    const a = JR(); const i = a.findIndex((r) => r.id === rec.id); if (i >= 0) a[i] = rec; else a.push(rec); JRset(a); if (rec.close) S.jFilter = 'closed'; pJournal(); };
  d.returnValue = ''; d.showModal();
}
function exportJ() { const b = new Blob([JSON.stringify({ app: 'kms-capital', version: 1, trades: JR() }, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `kms-capital-journal-${todayJ()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
async function importJ(e) {
  const f = e.target.files[0]; if (!f) return;
  try { const j = JSON.parse(await f.text()); const tr = Array.isArray(j) ? j : j.trades; if (!Array.isArray(tr)) throw 0;
    const a = JR(); const ids = new Set(a.map((x) => x.id)); const add = tr.filter((x) => x && x.token && x.entry && !ids.has(x.id)); JRset(a.concat(add)); toast(T('imported')(add.length)); pJournal();
  } catch (err) { toast(T('badFile')); }
}

/* ---------- LEARN / SETTINGS ---------- */
function pLearn() {
  const g = (S.judg && S.judg.glossary) || [];
  $('#main').innerHTML = `<div class="page narrow">${pageHead(T('learn'))}<p class="p">${esc(T('learnIntro'))}</p>
    <div class="sec"><div class="sec-h"><h2>${esc(T('howTo'))}</h2></div><ol class="steps">${T('howToSteps').map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
    <div class="sec"><div class="sec-h"><h2>${esc(T('tradePlan'))}</h2></div><div class="gl" style="border-top:1px solid var(--line)">${T('planTerms').map(([a, b]) => `<div><b>${esc(a)}</b><p>${esc(b)}</p></div>`).join('')}</div></div>
    <div class="sec"><div class="sec-h"><h2>${esc(T('indicators'))}</h2></div><div class="gl" style="border-top:1px solid var(--line)">${g.map((x) => `<div><b>${esc(L(x, 'term'))}</b><p>${esc(L(x, 'def'))}</p></div>`).join('')}</div></div></div>`;
}
function pSettings() {
  const th = store.get('cw-theme-v', 'auto');
  $('#main').innerHTML = `<div class="page narrow">${pageHead(T('settings'))}<div class="set">
    <div><div class="l"><b>${esc(T('language'))}</b><small>English · ภาษาไทย</small></div><div class="seg"><button data-lang="en" aria-pressed="${LANG === 'en'}">English</button><button data-lang="th" aria-pressed="${LANG === 'th'}">ไทย</button></div></div>
    <div><div class="l"><b>${esc(T('theme'))}</b></div><div class="seg">${['auto', 'light', 'dark'].map((k) => `<button data-theme="${k}" aria-pressed="${th === k}">${esc(T(k))}</button>`).join('')}</div></div>
    <div><div class="l"><b>${esc(T('about'))}</b><small>${esc(T('aboutTxt'))}</small></div></div>
    <div><div class="l"><b>${esc(T('sources'))}</b><small>${esc(T('srcLine'))}</small></div></div>
    <div><div class="l"><b>${esc(T('version'))}</b><small>${VERSION} · ${esc(T('analysisAt'))} ${esc(fmtUpdated(S.judg && S.judg.updated))}</small></div></div></div>
    <p class="nfa" style="margin-top:20px">${esc(T('nfa'))}</p></div>`;
}
function applyTheme(k) {
  const r = document.documentElement; if (k === 'auto') delete r.dataset.theme; else r.dataset.theme = k;
  try { localStorage.setItem('cw-theme', k); } catch (e) {} store.set('cw-theme-v', k);
  const dark = k === 'dark' || (k === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('#tcLight').content = $('#tcDark').content = dark ? '#0c0c0d' : '#fafaf9'; if (k === 'auto') { $('#tcLight').content = '#fafaf9'; $('#tcDark').content = '#0c0c0d'; }
}

/* ---------- events ---------- */
function select(sym) {
  S.sel = sym; try { localStorage.setItem('cw-sel', sym); } catch (e) {}
  $$('.ov tbody tr').forEach((r) => r.classList.toggle('sel', r.dataset.sel === sym)); renderDetail();
}
document.addEventListener('click', (e) => {
  const q = (s) => e.target.closest(s);
  let el;
  if ((el = q('[data-gear]'))) { const m = $('#gearMenu'); if (m.hidden) openGear(el); else closeGear(); return; }
  if (!q('#gearMenu') && !$('#gearMenu').hidden) closeGear();
  if ((el = q('[data-sel]'))) { const fromTable = !el.hasAttribute('data-chip'); select(el.dataset.sel); if (fromTable) $('#detail').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if ((el = q('[data-tab]'))) { S.tab = el.dataset.tab; $$('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x.dataset.tab === S.tab)); return renderTab(tokBySym(S.sel)); }
  if ((el = q('[data-tf]'))) { S.tf = el.dataset.tf; return renderTab(tokBySym(S.sel)); }
  if ((el = q('[data-retry]'))) { const t = tokBySym(el.dataset.retry); t.err = null; render(); loadToken(t).then(() => render(true)); return; }
  if ((el = q('[data-refresh]'))) return refreshAll(true);
  if ((el = q('[data-lang]'))) { LANG = el.dataset.lang; try { localStorage.setItem('cw-lang', LANG); } catch (er) {} const d = $('#detail'); if (d) d.dataset.sym = ''; render(); return; }
  if ((el = q('[data-theme]')) && el.tagName === 'BUTTON') { applyTheme(el.dataset.theme); render(); return; }
  if ((el = q('[data-mv]'))) { const [i, dd] = el.dataset.mv.split(':').map(Number); const a = S.cfg; [a[i], a[i + dd]] = [a[i + dd], a[i]]; saveCfg(); pWatchlist(); return; }
  if ((el = q('[data-rm]'))) { const s = el.dataset.rm; if (S.cfg.length <= 1) return; S.cfg = S.cfg.filter((t) => t.symbol !== s); if (S.sel === s) S.sel = S.cfg[0].symbol; saveCfg(); syncWS(); toast(T('removed')(s)); pWatchlist(); return; }
  if ((el = q('[data-add]'))) return addToken(JSON.parse(el.dataset.add));
  if ((el = q('[data-reset]'))) { S.cfg = S.defaults.map((t) => ({ ...t })); try { localStorage.removeItem('cw-tokens'); } catch (er) {} toast(T('resetDone')); pWatchlist(); Promise.all(S.cfg.map(loadToken)).then(syncWS); return; }
  if ((el = q('[data-cf]'))) { S.calFilter = el.dataset.cf; return pCalendar(); }
  if ((el = q('[data-cv]'))) { S.calView = el.dataset.cv; return pCalendar(); }
  if ((el = q('[data-cm]'))) { const n = +el.dataset.cm; if (!n) { S.calMonth = todayJ().slice(0, 7); S.calPick = null; } else { const [y, m] = S.calMonth.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); S.calMonth = d.toISOString().slice(0, 7); S.calPick = null; } return pCalendar(); }
  if ((el = q('[data-day]'))) { const k = el.dataset.day; S.calPick = S.calPick === k ? null : k; if (k.slice(0, 7) !== S.calMonth) S.calMonth = k.slice(0, 7); return pCalendar(); }
  if ((el = q('[data-jf]'))) { S.jFilter = el.dataset.jf; return pJournal(); }
  if ((el = q('[data-jnew]'))) return tradeDialog(null);
  if ((el = q('[data-jedit]'))) return tradeDialog(el.dataset.jedit);
  if ((el = q('[data-jexp]'))) return exportJ();
});
function openGear(btn) { const m = $('#gearMenu'), r = btn.getBoundingClientRect(); m.hidden = false; m.style.top = (r.bottom + 6 > innerHeight - 260 ? Math.max(8, r.top - m.offsetHeight - 6) : r.bottom + 6) + 'px'; m.style.left = Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)) + 'px'; $$('[data-gear]').forEach((b) => b.setAttribute('aria-expanded', 'true')); }
function closeGear() { const m = $('#gearMenu'); if (m) m.hidden = true; $$('[data-gear]').forEach((b) => b.setAttribute('aria-expanded', 'false')); }
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeGear(); });
addEventListener('hashchange', route);
addEventListener('scroll', () => $('#top').classList.toggle('scrolled', scrollY > 4), { passive: true });
addEventListener('online', () => { renderStatus(); refreshAll(); });
addEventListener('offline', renderStatus);
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - S.lastOk > 60e3) refreshAll(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.route === 'markets') { const d = $('#detail'); if (d) d.dataset.sym = ''; renderDetail(); } });

/* ---------- boot ---------- */
(async function boot() {
  applyTheme(store.get('cw-theme-v', (() => { try { return localStorage.getItem('cw-theme') || 'auto'; } catch (e) { return 'auto'; } })()));
  { const m = location.hash.match(/^#\/(\w+)(?:\/(\w+))?/) || []; S.route = ROUTES.includes(m[1]) ? m[1] : 'markets'; if (S.route === 'onchain') S.sub = m[2] || 'chains'; }
  try { S.defaults = (await getJSON('tokens.json?ts=' + Date.now())).tokens.map((t) => ({ ...t, logo: t.logo || `icons/tokens/${t.symbol.toLowerCase()}.png` })); }
  catch (e) { $('#main').innerHTML = `<p class="err">tokens.json: ${esc(e.message)} <button onclick="location.reload()">Reload</button></p>`; return; }
  const saved = store.get('cw-tokens', null);
  S.cfg = (Array.isArray(saved) && saved.length ? saved : S.defaults).map((t) => ({ ...t }));
  const ss = (() => { try { return localStorage.getItem('cw-sel'); } catch (e) { return null; } })();
  S.sel = tokBySym(ss) ? ss : S.cfg[0]?.symbol;
  render(); await refreshAll();
  setInterval(refreshCandles, 60e3);
  setInterval(() => { if (!document.hidden) Promise.all([loadCG(), loadGlobal()]).then(() => { if (S.route === 'markets') { renderMarketTop(); } }); }, 5 * 60e3);
  setInterval(renderStatus, 5e3);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
