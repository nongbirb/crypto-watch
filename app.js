/* KMS Capital – live client-side app. No backend. Data layer + UI. */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const CG = 'https://api.coingecko.com/api/v3';
const VERSION = '2.1';
const S = { cfg: [], defaults: [], judg: null, cal: null, cg: {}, global: null, fng: null, sel: null, tab: 'chart', tf: '1D',
  errors: {}, lastOk: 0, ws: {}, charts: [], busy: false, route: 'markets', calView: 'list', calFilter: 'all', calMine: null, calPast: false, calMonth: null, calPick: null, jFilter: 'open' };
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
const tzL = (d = new Date()) => { try { const p = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(d).find((x) => x.type === 'timeZoneName'); return p ? p.value : ''; } catch (e) { return ''; } };
const jst = (d = new Date()) => d.toLocaleString(loc(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ' + tzL(d);
const lTime = (d) => new Date(d).toLocaleTimeString(loc(), { hour: 'numeric', minute: '2-digit' }) + ' ' + tzL(new Date(d));
const lYmd = (d = new Date()) => { const z = new Date(d); return z.getFullYear() + '-' + String(z.getMonth() + 1).padStart(2, '0') + '-' + String(z.getDate()).padStart(2, '0'); };
const calLocal = (c) => { if (c && c.events) c.events.forEach((e) => { if (e.time && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && /^\d{1,2}:\d{2}$/.test(e.time)) { const d = new Date(`${e.date}T${e.time.padStart(5, '0')}:00+09:00`); if (!isNaN(d)) { e.date = lYmd(d); e.time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); } } }); return c; };
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
    const ms = { '1h': 36e5, '4h': 144e5, '1d': 864e5, '1w': 6048e5 }[tf] || 864e5;
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
  const d = t.d1;
  if (!Array.isArray(d) || d.length < 15 || d.some((x) => !x || !['c','h','l','q'].every((k) => Number.isFinite(x[k])) || x.c <= 0 || x.h < x.l || x.q < 0)) throw new Error('Insufficient or malformed daily candles');
  const c = d.map((x) => x.c), p = t.price ?? c[c.length - 1];
  if (!Number.isFinite(p) || p <= 0) throw new Error('Invalid price');
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
  // Missing MA200 is not zero. Preserve the existing rule only with complete inputs.
  const ready = c.length >= 200 && [I.ma50, I.ma200, I.hist, A, risk, tps[0].rr].every(Number.isFinite) && A > 0 && risk > 0;
  const up = ready && p > I.ma200, dn = ready && p < I.ma50 && !up;
  const bias = !ready ? 'Insufficient' : dn ? 'Avoid' : up && I.hist > 0 && tps[0].rr >= 1.5 && p <= zh * 1.03 ? 'Long' : 'Wait';
  const trend = !ready ? 'Insufficient' : p > I.ma50 && p > I.ma200 ? 'Uptrend' : p < I.ma50 && p < I.ma200 ? 'Downtrend' : 'Mixed';
  I.plan = { ready, history: c.length, atr: A, sup: Sx, res: Rz, entry: [zl, zh], ref, stop: sl, tps, vwap, fair, bias, inZone: zl <= p && p <= zh, price: p };
  I.trend = trend;
  return I;
}
function biasWhy(t) {
  const I = t.I, P = I.plan, p = t.price, r = [];
  if (!P.ready) return 'Insufficient data: this ruleset needs at least 200 daily candles and valid volatility inputs. No trade verdict is issued.';
  r.push(p > I.ma200 ? 'above its 200-day average (long-term trend up)' : 'not above its 200-day average');
  r.push(p > I.ma50 ? 'above the 50-day' : 'not above the 50-day');
  r.push(I.hist > 0 ? 'MACD momentum positive' : 'MACD momentum not positive');
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
    if (ex === 'binance' && m.data) tick(m.data.s, +m.data.c, (m.data.c / m.data.o - 1) * 100, ex, +m.data.q);
    if (ex === 'bybit' && m.data && m.data.symbol) tick(m.data.symbol, +m.data.lastPrice, +m.data.price24hPcnt * 100, ex, +m.data.turnover24h);
    if (ex === 'okx' && m.data) m.data.forEach((x) => tick(x.instId, +x.last, (x.last / x.open24h - 1) * 100, ex, +x.volCcy24h));
  };
  ws.onclose = () => { clearInterval(ping); if (S.ws[ex] !== ws) return; S.ws[ex] = null; renderStatus(); setTimeout(() => { if (!S.ws[ex]) connectWS(ex); }, Math.min(30000, 3000 * n)); };
  ws.onerror = () => ws.close();
}
function tick(pair, price, ch24, ex, qv) {
  const t = S.cfg.find((x) => x._src && x._src.ex === ex && x._src.pair === pair); if (!t || !price) return;
  const prev = t.price; t.price = price; t.ch24live = ch24; if (qv > 0) t.qv = qv; t.liveAt = Date.now(); S.lastOk = Date.now();
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
  smart: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  markets: '<path d="M4 19V5M4 19h16M8 15l3.5-4 3 2.5L20 7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  watchlist: '<path d="M5 6h14M5 12h14M5 18h9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4 10h16M9 3v4M15 3v4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  journal: '<path d="M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 9h5M10 13h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  learn: '<path d="M3 9l9-4 9 4-9 4-9-4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7 11v4.5c1.5 1.3 3.2 2 5 2s3.5-.7 5-2V11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  onchain: '<path d="M4 7h6v4H4zM14 13h6v4h-6zM10 9h2.5a1.5 1.5 0 0 1 1.5 1.5v4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/>',
  settings: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
};
const svg = (k, sz = 20) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" aria-hidden="true">${ICONS[k]}</svg>`;
const ROUTES = ['markets', 'portfolio', 'onchain', 'screener', 'smart', 'watchlist', 'calendar', 'journal', 'reports', 'learn', 'settings'];
const SHOW_WALLETS = false; // feature flag: Wallets hidden from menus; #/portfolio route and wallets.js kept intact
const NAV = ['markets', ...(SHOW_WALLETS ? ['portfolio'] : []), 'onchain', 'screener', 'smart', 'calendar'];
const MORE = ['journal', 'reports', 'learn', 'watchlist', 'settings'];
const J = (sym) => (S.judg && S.judg.tokens && S.judg.tokens[sym]) || {};
const ch24 = (t) => t.ch24live ?? (S.cg[t.coingecko] || {}).price_change_percentage_24h_in_currency;
const logo = (t, c = '') => { const src = t.logo || (S.cg[t.coingecko] || {}).image; const lt = `<span class="logo lt ${c}">${esc((t.symbol || '?').slice(0, 1))}</span>`;
  return src ? `<img class="logo ${c}" src="${esc(src)}" alt="" loading="lazy" onerror="this.outerHTML='${lt.replace(/'/g, '&#39;').replace(/"/g, '&quot;')}'">` : lt; };
const uiHelp = (text, label = XL('Explanation', 'คำอธิบาย')) => `<details class="ui-help"><summary aria-label="${esc(label)}">?</summary><div class="ui-help-body">${esc(text)}</div></details>`;
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
async function loadCalendar() {
  const [m, a] = await Promise.allSettled([getJSON('calendar.json?ts=' + Date.now()), getJSON('calendar_auto.json?ts=' + Date.now())]);
  if (m.status !== 'fulfilled' && a.status !== 'fulfilled') { S.errors.cal = 'calendar.json: ' + m.reason.message; return; }
  const man = m.status === 'fulfilled' ? m.value : { events: [] }, au = a.status === 'fulfilled' ? a.value : { events: [] };
  const kw = (e) => { const t = (e.title || '').toLowerCase(); const m = t.match(/\b(cpi|ppi|fomc|jobs|nfp|payrolls|gdp|pce)\b/); return e.type + '|' + (m ? (m[1] === 'nfp' || m[1] === 'payrolls' ? 'jobs' : m[1]) : (e.tokens || []).join(',') + '|' + (t.match(/[a-z0-9]+/) || [''])[0]); };
  const mk = new Set(man.events.map((e) => e.date + '|' + kw(e)));
  const ev = [...man.events.map((e) => ({ ...e, src: e.src || 'KMS' })), ...au.events.filter((e) => !mk.has(e.date + '|' + kw(e)) && !(e.type === 'unlock' && man.events.some((x) => x.type === 'unlock' && x.date === e.date && (x.tokens || []).some((t) => e.tokens.includes(t)))))];
  ev.forEach((e) => { e.tokens = e.tokens || []; });
  S.cal = calLocal({ updated: [man.updated, au.updated].filter(Boolean).sort().pop(), sources: au.sources || {}, events: ev }); S.errors.cal = null;
}
async function refreshAll(manual) {
  if (S.busy) return; S.busy = true; $$('[data-refresh]').forEach((b) => b.classList.add('spin'));
  await Promise.all([loadJudgment(), loadCalendar(), typeof loadNews === 'function' ? loadNews() : null, loadCG(), loadGlobal(), ...S.cfg.map(loadToken)]);
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
/* Lazy-loaded modules (Flows map, Wallets): fetched on first use only. */
const ASSETV = 51, LAZY = {};
const loadJS = (name) => LAZY[name] || (LAZY[name] = new Promise((ok, no) => { const s = document.createElement('script'); s.src = `min/${name}.js?v=${ASSETV}`; s.onload = ok; s.onerror = () => { delete LAZY[name]; no(new Error(name + '.js failed to load')); }; document.body.appendChild(s); }));
const pPortfolioL = (soft) => loadJS('wallets').then(() => { if (S.route === 'portfolio') pPortfolio(soft); }).catch((e) => { $('#main').innerHTML = `<p class="err">${esc(e.message)}</p>`; });
function render(soft) {
  renderShell();
  const y = scrollY;
  if (S.route !== 'markets') killCharts();
  const pg = { markets: () => pMarkets, portfolio: () => pPortfolioL, screener: () => pScreener, smart: () => pSmart, reports: () => pReports, watchlist: () => pWatchlist, calendar: () => pCalendar, journal: () => pJournal, learn: () => pLearn, settings: () => pSettings, onchain: () => pOnchain }[S.route];
  let fn; try { fn = pg && pg(); } catch (e) { fn = null; } // a page script that failed to load must not crash the app
  if (typeof fn !== 'function') { $('#main').innerHTML = `<div class="page"><div class="empty empty-cat"><img class="cat-quiet" src="icons/favicon.png" alt="" width="40" height="40" decoding="async"><p class="err">${esc(XL('This page did not load.', 'หน้านี้โหลดไม่สำเร็จ'))}</p><button class="btn" type="button" onclick="location.reload()">${esc(T('retry'))}</button></div></div>`; return; }
  try { const r = fn(soft); if (r && r.catch) r.catch((e) => console.warn('page', e)); } catch (e) { console.warn('page', e); }
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
function briefNow() {
  const g = S.global, f = S.fng, b = S.cfg.find((t) => t.symbol === 'BTC'); const parts = [];
  if (f) parts.push(`F&G ${f[0].value}`);
  if (g) parts.push(`${XL('market cap', 'มาร์เก็ตแคป')} ${big(g.total_market_cap.usd)} (${pct(g.market_cap_change_percentage_24h_usd, 1)})`);
  if (b && b.price) parts.push(`BTC ${px(b.price)} (${pct(ch24(b), 1)})`);
  return parts.length ? esc(XL('Live now: ', 'ตอนนี้: ') + parts.join(' · ')) : '';
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
  else if (S.errors.fng) h += st(esc(T('fng')), `<span style="font-size:15px;font-weight:500;color:var(--tx2)">${esc(T('unavail'))}</span>`, `<button class="btn ghost" data-fngretry style="padding:2px 8px;font-size:12px">${esc(T('retry'))}</button>`);
  else h += sk;
  const j = S.judg;
  const brief = j ? `<div class="brief"><span class="bar"></span><div><div class="eyebrow">${esc(T('brief'))} · ${esc(XL('written ', 'เขียนเมื่อ ') + fmtUpdated(j.updated))} ${fresh(j.updated, 24)}</div><p>${esc(L(j, 'market_note') || '')}</p><p class="brnow"><b>${esc(XL('Numbers above are as of ', 'ตัวเลขข้างบน ณ เวลา ') + (fmtUpdated(j.updated) || '').replace(/^.*?, /, ''))}.</b> ${briefNow()}</p></div></div>` : (S.errors.judg ? `<p class="err" style="margin-top:16px">${esc(T('analysisFail'))}</p>` : '');
  $('#mtop').innerHTML = `<div class="mstats">${h}</div>${brief}`;
  const u = $('#mkUpd'); if (u) u.textContent = S.lastOk ? T('updated') + ' ' + jst(new Date(S.lastOk)) : '';
  const errs = Object.values(S.errors).filter(Boolean); const se = $('#srcErr'); if (se) se.textContent = errs.join(' · ');
}
const XL = (en, th) => (LANG === 'th' ? th : en);
/* Shared freshness badge: amber + "stale" when older than 2x the expected refresh interval (hrs). */
const fresh = (iso, hrs, label = '') => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return '';
  const age = (Date.now() - d) / 36e5, st = age > 2 * hrs, ev = hrs >= 24 ? XL(`every ${Math.round(hrs / 24)}d`, `ทุก ${Math.round(hrs / 24)} วัน`).replace(/every 1d|ทุก 1 วัน/, XL('daily', 'รายวัน')) : hrs < 1 ? XL(`every ${Math.round(hrs * 60)} min`, `ทุก ${Math.round(hrs * 60)} นาที`) : XL(`every ${hrs}h`, `ทุก ${hrs} ชม.`);
  const ago = age < 1 ? XL(`${Math.max(1, Math.round(age * 60))}m ago`, `${Math.max(1, Math.round(age * 60))} นาทีที่แล้ว`) : age < 36 ? XL(`${Math.round(age)}h ago`, `${Math.round(age)} ชม.ที่แล้ว`) : XL(`${Math.round(age / 24)}d ago`, `${Math.round(age / 24)} วันที่แล้ว`);
  return `<span class="fresh${st ? ' stale' : ''}" title="${esc(XL('Updated ', 'อัปเดต ') + jst(d) + ' · ' + XL('refreshes ', 'อัปเดต ') + ev + (st ? XL(' · late: older than 2× the usual interval', ' · ล่าช้า: เก่ากว่า 2 เท่าของรอบปกติ') : ''))}"><i aria-hidden="true"></i>${label ? esc(label) + ' · ' : ''}${esc(ago)}${st ? ' · ' + esc(XL('stale', 'ข้อมูลเก่า')) : ''}</span>`; };
/* Column-header tooltips: units, timeframe and source for every data table. */
const TIPS = () => ({
  ov: [XL('Your watchlist tokens', 'เหรียญที่ติดตาม'), XL('Last trade, exchange spot USDT pair (Binance, else Bybit/OKX/Hyperliquid), live', 'ราคาซื้อขายล่าสุด คู่ USDT บนกระดาน (Binance หรือ Bybit/OKX/Hyperliquid) แบบสด'), XL('Rolling 24h % change, exchange ticker', '% เปลี่ยนแปลง 24 ชม. ล่าสุด จากกระดาน'), XL('Technical rules from chart data, not the daily research or a win probability. Tap ? for the reason.', 'กฎเทคนิคจากข้อมูลกราฟ ไม่ใช่บทวิเคราะห์รายวันหรือโอกาสชนะ แตะ ? เพื่อดูเหตุผล'), XL('Daily closes, last 30 days (exchange candles)', 'ราคาปิดรายวัน 30 วันล่าสุด'), XL('7-day % change, CoinGecko', '% เปลี่ยนแปลง 7 วัน จาก CoinGecko'), XL('30-day % change, CoinGecko', '% เปลี่ยนแปลง 30 วัน จาก CoinGecko'), XL('RSI(14) on daily closes. Below 30 = oversold, above 70 = overbought', 'RSI(14) จากราคาปิดรายวัน ต่ำกว่า 30 = ขายมากเกิน สูงกว่า 70 = ซื้อมากเกิน'), XL('Price vs 50/200-day moving averages', 'ราคาเทียบเส้นค่าเฉลี่ย 50/200 วัน'), XL('Formula zone from nearest daily supports. Not advice', 'โซนจากสูตร อิงแนวรับรายวันที่ใกล้ที่สุด ไม่ใช่คำแนะนำ'), XL('Market cap, USD, CoinGecko', 'มาร์เก็ตแคป USD จาก CoinGecko')],
  sc: { rank: XL('Market-cap rank, CoinGecko', 'อันดับมาร์เก็ตแคป CoinGecko'), p: XL('USD. CoinGecko at build time; watchlist rows use the live exchange price', 'USD จาก CoinGecko ตอนสร้างข้อมูล แถวที่ติดตามใช้ราคาสด'), c24: XL('Rolling 24h % change, CoinGecko', '% 24 ชม. จาก CoinGecko'), c7: XL('7-day % change, CoinGecko', '% 7 วัน จาก CoinGecko'), rsi: XL('RSI(14), daily candles (Binance spot, else Bybit)', 'RSI(14) แท่งรายวัน (Binance หรือ Bybit)'), dsup: XL('% price is above the nearest daily swing-low support (last 120 days)', '% ที่ราคาอยู่เหนือแนวรับ swing-low รายวันที่ใกล้ที่สุด (120 วัน)'), d50: XL('% from the 50-day simple moving average', '% ห่างจากเส้นค่าเฉลี่ย 50 วัน'), vs: XL('Rolling 24h volume ÷ average daily volume of the last 20 completed days (exchange USDT pair). 2× or more = spike', 'วอลุ่ม 24 ชม. ล่าสุด ÷ วอลุ่มเฉลี่ยรายวัน 20 วันที่ปิดแล้ว (คู่ USDT) 2 เท่าขึ้นไป = พุ่ง'), f: XL('Perp funding rate, % per 8h (Binance USDT-M, else Bybit, else Hyperliquid ×8). Positive = longs pay shorts', 'Funding ของ perp % ต่อ 8 ชม. (Binance USDT-M หรือ Bybit หรือ Hyperliquid ×8) บวก = ฝั่ง long จ่าย'), mc: XL('Market cap, USD, CoinGecko', 'มาร์เก็ตแคป USD จาก CoinGecko') },
  oc: { name: XL('Chain', 'เชน'), tvl: XL('Total value locked, USD, DefiLlama daily snapshot', 'มูลค่าที่ล็อก (TVL) USD จาก DefiLlama รายวัน'), d1: XL('TVL % change, 1 day', '% เปลี่ยนแปลง TVL 1 วัน'), d7: XL('TVL % change, 7 days', '% เปลี่ยนแปลง TVL 7 วัน'), d30: XL('TVL % change, 30 days', '% เปลี่ยนแปลง TVL 30 วัน'), st: XL('Stablecoin supply on the chain, USD, DefiLlama', 'อุปทานสเตเบิลบนเชน USD จาก DefiLlama'), st7: XL('Stablecoin supply % change, 7 days', '% เปลี่ยนแปลงสเตเบิล 7 วัน'), br1: XL('Bridged in minus out, past 24h, USD. Source: L2BEAT interop', 'ไหลเข้าลบไหลออก 24 ชม. USD ที่มา: L2BEAT'), br7: XL('Bridged in minus out, past 7 days, USD. Our Wormhole + LayerZero + Across tracker', 'ไหลเข้าลบไหลออก 7 วัน USD จากตัวติดตาม Wormhole + LayerZero + Across ของเรา'), fees: XL('Fees paid by users, past 24h, USD, DefiLlama', 'ค่าธรรมเนียมที่ผู้ใช้จ่าย 24 ชม. USD จาก DefiLlama'), rev: XL('Revenue kept by the chain/protocols, past 24h, USD, DefiLlama', 'รายได้ที่เชน/โปรโตคอลเก็บไว้ 24 ชม. USD จาก DefiLlama'), dex: XL('DEX trading volume, past 24h, USD, DefiLlama', 'วอลุ่ม DEX 24 ชม. USD จาก DefiLlama'), dex7: XL('DEX volume, last 7 days vs the 7 days before, %', 'วอลุ่ม DEX 7 วันล่าสุดเทียบ 7 วันก่อนหน้า %') },
  rp: [XL('Watchlist token', 'เหรียญที่ติดตาม'), XL('Close of the last day of the week, USD (UTC daily candle)', 'ราคาปิดวันสุดท้ายของสัปดาห์ USD (แท่งรายวัน UTC)'), XL('Change over the week, Monday to Sunday UTC, close to close', '% เปลี่ยนแปลงตลอดสัปดาห์ จันทร์–อาทิตย์ UTC'), XL('Lowest low to highest high of the week', 'ต่ำสุดถึงสูงสุดของสัปดาห์')],
  ix: [XL('Chain', 'เชน'), XL('USD bridged into the chain, past 24h, L2BEAT', 'USD ที่บริดจ์เข้า 24 ชม. จาก L2BEAT'), XL('USD bridged out of the chain, past 24h, L2BEAT', 'USD ที่บริดจ์ออก 24 ชม. จาก L2BEAT'), XL('Inflow minus outflow, USD', 'ไหลเข้าลบไหลออก USD'), XL('Number of transfers, past 24h', 'จำนวนรายการ 24 ชม.'), XL('Average transfer time', 'เวลาโอนเฉลี่ย'), XL('Token with the most volume', 'เหรียญที่มีวอลุ่มสูงสุด'), XL('Bridge protocol with the most volume', 'บริดจ์ที่มีวอลุ่มสูงสุด')],
});
function applyTips(root = document) {
  const t = TIPS(); const set = (th, tip) => { if (!th || !tip || th.dataset.tipd === LANG) return; th.title = tip; th.dataset.tipd = LANG; th.classList.add('tipd'); };
  root.querySelectorAll('#ovSec thead th').forEach((th, i) => set(th, t.ov[i]));
  root.querySelectorAll('table.sc th[data-scsort]').forEach((th) => set(th, t.sc[th.dataset.scsort]));
  root.querySelectorAll('th[data-ocsort]').forEach((th) => set(th, t.oc[th.dataset.ocsort]));
  root.querySelectorAll('table.rpt thead th').forEach((th, i) => set(th, t.rp[i]));
  root.querySelectorAll('#ixTbl thead th').forEach((th, i) => set(th, t.ix[i]));
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
      <td class="l">${vd(I.plan.bias)} ${uiHelp(biasWhyL(t), XL('Why this technical verdict?', 'ทำไมได้มุมมองนี้'))}</td><td>${spark(t)}</td>
      <td class="num ${cls(cg.price_change_percentage_7d_in_currency)}">${pct(cg.price_change_percentage_7d_in_currency)}</td>
      <td class="num ${cls(cg.price_change_percentage_30d_in_currency)}">${pct(cg.price_change_percentage_30d_in_currency)}</td>
      <td class="num">${I.rsi?.toFixed(0) ?? '–'}</td><td class="l">${esc(T(I.trend))}</td>
      <td class="num">${I.plan.ready ? px(I.plan.entry[0]) + ' – ' + px(I.plan.entry[1]) : '–'}</td><td class="num">${big(cg.market_cap)}</td></tr>`;
  }).join('');
  const prev = $('#ovSec .tbl-wrap'); const sx = prev ? prev.scrollLeft : 0;
  $('#ovSec').innerHTML = `<div class="tbl-wrap"><table class="ov"><thead><tr><th>${esc(T('token'))}</th><th>${esc(T('price'))}</th><th>${esc(T('d24'))}</th><th class="l">${esc(T('setup'))}</th><th>${esc(XL('30d chart', 'กราฟ 30 วัน'))}</th><th>${esc(T('d7'))}</th><th>${esc(XL('30d %', '30 วัน %'))}</th><th>${esc(T('rsi'))}</th><th class="l">${esc(T('trend'))}</th><th>${esc(T('entryZone'))}</th><th>${esc(T('mcap'))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  const w = $('#ovSec .tbl-wrap'); w.scrollLeft = sx; const f = () => w.classList.toggle('scrolled', w.scrollLeft > 2); w.addEventListener('scroll', f, { passive: true }); f();
}
const TABS = ['chart', 'pat', 'plan', 'lev', 'pos', 'mom', 'vol', 'bb'];
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
  if (!P.ready) return th ? 'ข้อมูลไม่พอ ต้องมีแท่งรายวันอย่างน้อย 200 แท่งและข้อมูลความผันผวนครบ จึงจะประเมินด้วยกฎนี้ได้' : biasWhy(t);
  if (th) {
    r.push(p > I.ma200 ? 'อยู่เหนือเส้น 200 วัน (ภาพใหญ่ยังขาขึ้น)' : 'ยังไม่อยู่เหนือเส้น 200 วัน');
    r.push(p > I.ma50 ? 'เหนือเส้น 50 วัน' : 'ยังไม่อยู่เหนือเส้น 50 วัน'); r.push(I.hist > 0 ? 'MACD เป็นบวก' : 'MACD ยังไม่เป็นบวก');
    r.push(`TP1 ได้ ${P.tps[0].rr.toFixed(2)} เท่าของความเสี่ยง`);
    const lead = P.bias === 'Long' ? 'สัญญาณเข้าทาง: ' : P.bias === 'Avoid' ? 'เทรนด์ยังเป็นขาลง: ' : 'สัญญาณยังปนกัน: ';
    return lead + r.join(' · ') + (P.inZone ? ' ตอนนี้ราคาอยู่ในโซนเข้าซื้อพอดี' : p > P.entry[1] ? ' ราคายังอยู่เหนือโซนเข้าซื้อ ใจเย็นรอให้ย่อลงมาก่อน' : ' ราคาหลุดโซนเข้าซื้อลงมาแล้ว ให้ระวังจุดตัดขาดทุน');
  }
  r.push(p > I.ma200 ? 'above its 200-day average (long-term trend up)' : 'not above its 200-day average');
  r.push(p > I.ma50 ? 'above the 50-day' : 'not above the 50-day'); r.push(I.hist > 0 ? 'MACD positive' : 'MACD not positive');
  r.push(`TP1 pays ${P.tps[0].rr.toFixed(2)}× the risk`);
  const lead = P.bias === 'Long' ? 'Conditions line up: ' : P.bias === 'Avoid' ? 'Trend is down: ' : 'Mixed signals: ';
  return lead + r.join(', ') + (P.inZone ? '. Price is inside the entry zone now.' : p > P.entry[1] ? '. Price is above the entry zone; wait for a dip into it.' : '. Price is below the entry zone; respect the stop-loss.');
}
const LC = { tp: 'var(--up)', stop: 'var(--dn)', entry: 'var(--ac)', sup: 'var(--tx3)', res: 'var(--tx3)' };
function planHTML(t) {
  const I = t.I, P = I.plan, p = t.price, j = J(t.symbol), em = (P.entry[0] + P.entry[1]) / 2;
  if (!P.ready) return `<div class="verdict"><div class="eyebrow">${esc(T('setup'))}</div>${vd(P.bias)}<p>${esc(biasWhyL(t))}</p><p class="sub">${esc(XL('No entry, stop or target is issued with incomplete inputs.', 'ยังไม่ให้โซนเข้า SL หรือเป้าหมาย เมื่อข้อมูลไม่ครบ'))}</p></div>`;
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
  return `<div class="verdict"><div class="eyebrow">${esc(T('tradePlan'))}</div><div style="margin-top:4px">${vd(P.bias)}</div><p>${esc(biasWhyL(t))}</p><p class="sub">${esc(XL('Technical checklist, not a validated trading edge.', 'เช็กลิสต์เทคนิค ยังไม่ผ่านการทดสอบว่าให้ความได้เปรียบในการเทรด'))}</p>${note ? `<details><summary>${esc(T('analysisAt'))} · ${esc(fmtUpdated(S.judg?.updated))}</summary><p>${esc(note)}</p></details>` : ''}</div>
    <table class="lv"><tbody>${rows}</tbody></table>
    <div class="fair"><div class="eyebrow">${esc(T('fair'))}</div><div class="v num">${px(P.fair)} <span class="${cls(P.fair - p)}" style="font-size:13px;font-weight:500">${pct((P.fair - p) / p * 100, 1)} ${esc(T('vsNow'))}</span></div><p>${esc(T('fairHow')(px(I.ma50), px(I.ma200), px(P.vwap)))}</p></div>
    <p class="nfa">${esc(T('nfa'))}</p>`;
}
function kvHTML(t) {
  const cg = S.cg[t.coingecko] || {}, I = t.I;
  const k = (l, v, d = '', c = '') => `<div><div class="eyebrow">${esc(l)}</div><div class="v num ${c}">${v}</div><div class="d">${d || '&nbsp;'}</div></div>`;
  return k(T('d7'), pct(cg.price_change_percentage_7d_in_currency), '', cls(cg.price_change_percentage_7d_in_currency)) + k(T('d30'), pct(cg.price_change_percentage_30d_in_currency), '', cls(cg.price_change_percentage_30d_in_currency))
    + k(T('mcap'), big(cg.market_cap), cg.fully_diluted_valuation ? T('fdv') + ' ' + big(cg.fully_diluted_valuation) : '') + k(XL('Volume 24h · all exchanges · CoinGecko', 'วอลุ่ม 24 ชม. · ทุกกระดาน · CoinGecko'), big(cg.total_volume), 'CoinGecko') + k(XL('Volume 24h · ', 'วอลุ่ม 24 ชม. · ') + (t._src ? t._src.ex[0].toUpperCase() + t._src.ex.slice(1) : '') + XL(' pair', ''), t.qv ? big(t.qv) : '–', t._src ? t._src.pair + (t.qv ? '' : XL(' · waiting for live ticker', ' · รอข้อมูลสด')) : '')
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
  return `<div class="sec"><div class="sec-h"><h2>${esc(T('proTake'))}</h2><span class="sub">${esc(T('analysisAt'))} · ${esc(fmtUpdated(S.judg && S.judg.updated))} ${fresh(S.judg && S.judg.updated, 24)}</span></div><p class="take">${esc(L(j, 'take') || T('noAnalysis'))}</p></div>
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
  if (S.tab === 'pos') return renderPos(t, b);
  if (S.tab === 'pat') return renderPat(t, b);
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
    if (P.ready) { pl(P.entry[1], C.ac, '', 2); pl(P.entry[0], C.ac, LANG === 'th' ? 'โซนเข้า' : 'Entry', 2); pl(P.stop, C.dn, 'SL');
    P.tps.forEach((x, i) => pl(x.price, C.up, 'TP' + (i + 1))); }
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
const ts = (ms, intra) => Math.floor(ms / 1000) + (intra || ms % 864e5 !== 0 ? -new Date().getTimezoneOffset() * 60 : 0); // one current offset for every bar: DST changes can't make duplicate/out-of-order times // local wall-clock; daily/weekly bars keep their UTC date, intraday bars always shift
const isIntra = (k) => !!(k && k.length > 1 && k[1].t - k[0].t < 864e5);
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
function candles(c, k) { const C = chartColors(); const s = c.addCandlestickSeries({ upColor: C.up, downColor: C.dn, borderVisible: false, wickUpColor: C.up, wickDownColor: C.dn, priceLineVisible: false }); const ii = isIntra(k); s.setData(k.map((x) => ({ time: ts(x.t, ii), open: x.o, high: x.h, low: x.l, close: x.c }))); return s; }
function line(c, k, vals, color, w = 2) { const s = c.addLineSeries({ color, lineWidth: w, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }); const ii = isIntra(k); s.setData(k.map((x, i) => vals[i] == null ? null : { time: ts(x.t, ii), value: vals[i] }).filter(Boolean)); return s; }
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
const todayJ = () => ymd(new Date()); // JST day key used for stored portfolio history
const todayL = () => lYmd();
const dayDiff = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);
const CAT = (e) => e.type === 'macro' ? 'macro' : e.type === 'unlock' ? 'unlock' : e.type === 'airdrop' ? 'airdrop' : (e.type === 'listing' || e.type === 'exchange') ? 'listing' : 'other';
function calEvents(all) {
  const ev = (S.cal && S.cal.events) || []; const f = S.calFilter; const mine = new Set(S.cfg.map((t) => t.symbol));
  return ev.filter((e) => (all || f === 'all' || CAT(e) === f) && (all || !S.calMine || (e.type === 'macro' && !e.tokens.length || e.tokens.some((x) => mine.has(x))))).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
}
const evTs = (e) => e.time ? new Date(`${e.date}T${e.time}:00`).getTime() : null; // e.date/time already local
function cdown(e) {
  const td = todayL(), n = dayDiff(e.date, td); const ts = evTs(e);
  if (ts && n === 0) { const ms = ts - Date.now(); if (ms <= 0) return { t: T('cNow'), c: 'past' }; const h = Math.floor(ms / 36e5), mi = Math.floor(ms % 36e5 / 6e4); return { t: T('cIn')(h ? `${h}h ${mi}m` : `${mi}m`), c: 'soon' }; }
  return n >= 0 ? { t: T('inDays')(n), c: n <= 1 ? 'soon' : '' } : { t: T('ago')(-n), c: 'past' };
}
function pCalendar() {
  if (!S.calMonth) S.calMonth = todayL().slice(0, 7);
  if (S.calMine === null) S.calMine = store.get('cw-calmine', false);
  const mine = new Set(S.cfg.map((t) => t.symbol)); const allEv = calEvents(true).filter((e) => dayDiff(e.date, todayL()) >= 0 && (!S.calMine || (e.type === 'macro' && !e.tokens.length || e.tokens.some((x) => mine.has(x))))); const cnt = (k) => allEv.filter((e) => k === 'all' || CAT(e) === k).length;
  const cats = [['all', T('all')], ['macro', T('macro')], ['unlock', T('etype').unlock], ['airdrop', T('etype').airdrop], ['listing', T('cListings')], ['other', T('cOther')]];
  if (!cats.some(([k]) => k === S.calFilter)) S.calFilter = 'all';
  const filt = `<div class="filters calf">${cats.map(([k, n]) => `<button class="chip np" data-cf="${k}" aria-pressed="${S.calFilter === k}">${k !== 'all' ? `<i class="cdot ${k}"></i>` : ''}${esc(n)}<small class="num">${cnt(k)}</small></button>`).join('')}<span class="fsep"></span><button class="chip np" data-cmine aria-pressed="${!!S.calMine}">★ ${esc(T('cMine'))}</button></div>`;
  const [y, m] = S.calMonth.split('-').map(Number); const mName = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(loc(), { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const tools = `<div class="cal-tools"><div class="cal-nav"><button class="icon-btn" data-cm="-1" aria-label="prev"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button><h2>${esc(mName)}</h2><button class="icon-btn" data-cm="1" aria-label="next"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button><button class="btn ghost" data-cm="0">${esc(T('today'))}</button></div><button class="btn ghost" data-cpast aria-pressed="${!!S.calPast}">${esc(S.calPast ? T('cHidePast') : T('cShowPast'))}</button></div>`;
  const evs = calEvents(); let body = '';
  {
    const first = new Date(Date.UTC(y, m - 1, 1)); const off = (first.getUTCDay() + 6) % 7; const start = new Date(first - off * 864e5);
    const cells = []; for (let i = 0; i < 42; i++) { const d = new Date(start.getTime() + i * 864e5); cells.push(d); if (i >= 34 && d.getUTCMonth() !== m - 1 && (i + 1) % 7 === 0) break; }
    const td = todayL();
    body = `<div class="grid">${T('dows').map((d) => `<div class="dow">${esc(d)}</div>`).join('')}${cells.map((d) => { const k = d.toISOString().slice(0, 10); const de = evs.filter((e) => e.date === k);
      return `<button class="day ${d.getUTCMonth() !== m - 1 ? 'out' : ''} ${k === td ? 'today' : ''} ${S.calPick === k ? 'pick' : ''}" data-day="${k}"><span class="dn_ num">${d.getUTCDate()}</span>${de.slice(0, 3).map((e) => `<span class="ev ${e.impact}">${esc(e.tokens[0] || '')}${e.tokens.length ? ' · ' : ''}${esc(L(e, 'title'))}</span>`).join('')}${de.length > 3 ? `<span class="ev more">+${de.length - 3}</span>` : ''}${de.length ? `<span class="dots">${de.slice(0, 3).map((e) => `<i class="${e.impact}"></i>`).join('')}</span>` : ''}</button>`; }).join('')}</div>`;
    const lo = S.calPast ? -7 : 0; const pk = S.calPick && dayDiff(S.calPick, td) < lo ? S.calPick : null;
    body += `<div class="sec cagenda">${eventList(evs.filter((e) => dayDiff(e.date, td) >= lo || e.date === pk))}</div>`;
  }
  const src = S.cal && S.cal.sources ? Object.entries(S.cal.sources).map(([k, v]) => `<span class="${v.ok ? '' : 'dn'}" title="${esc(v.err || '')}">${esc(k)} <b class="num">${v.n}</b></span>`).join('') : '';
  $('#main').innerHTML = `<div class="page cal2">${pageHead(T('calendar'), `<span class="sub">${esc(T('jst'))} ${esc(tzL())} ${fresh(S.cal && S.cal.updated, 24)}</span>`)}${filt}${tools}${body}${src ? `<div class="csrc"><span>${esc(T('cSources'))}</span>${src}</div>` : ''}</div>`;
}
function eventList(list, flat) {
  if (!list.length) return `<div class="empty cempty empty-cat"><img class="cat-quiet" src="icons/favicon.png" alt="" width="40" height="40" decoding="async"><div>${esc(T('noEvents'))}</div>${S.calFilter !== 'all' || S.calMine ? `<button class="btn ghost" data-creset>${esc(T('cReset'))}</button>` : ''}</div>`;
  const td = todayL(); let out = '', lastG = '', lastD = '';
  const grp = (n, d) => n < 0 ? T('cPast') : n === 0 ? T('today') : n === 1 ? T('cTomorrow') : n < 7 ? T('cWeek') : n < 14 ? T('cNextWeek') : d.toLocaleDateString(loc(), { month: 'long', year: 'numeric', timeZone: 'UTC' });
  list.forEach((e) => {
    const d = new Date(e.date + 'T00:00:00Z'); const n = dayDiff(e.date, td);
    if (!flat) { const g = grp(n, d); if (g !== lastG) { out += `<div class="cgrp ${n === 0 ? 'now' : ''}">${esc(g)}</div>`; lastG = g; lastD = ''; } }
    const dk = e.date; const newDay = dk !== lastD; lastD = dk;
    const toks = e.tokens.map((s) => { const t = tokBySym(s); return t ? `<span class="tok">${logo(t, 'sm')}${esc(s)}</span>` : `<span class="tok">${esc(s)}</span>`; }).join('');
    const cd = cdown(e); const c = CAT(e);
    out += `<div class="crow ${n < 0 ? 'past' : ''} ${newDay ? 'nd' : ''} ${S.calPick === dk ? 'hl' : ''}" data-cday="${dk}"><div class="cdt">${newDay ? `<b class="num">${d.getUTCDate()}</b><small>${esc(d.toLocaleDateString(loc(), { weekday: 'short', month: 'short', timeZone: 'UTC' }))}</small>` : ''}</div>
      <div class="ctm num">${e.time ? esc(e.time) : `<span>${esc(T('allDay'))}</span>`}</div>
      <div class="cbody"><div class="t"><i class="idot ${e.impact}" title="${esc(T('impact')[e.impact] || '')}"></i>${esc(L(e, 'title'))}</div>${L(e, 'note') ? `<div class="n">${esc(L(e, 'note'))}</div>` : ''}
      <div class="m">${typeof evChain === 'function' ? evChain(e) : ''}<span class="ctag ${c}">${esc(c === 'listing' ? T('cListings') : c === 'other' ? (T('etype')[e.type] || T('cOther')) : T('etype')[c] || c)}</span>${toks}${e.type === 'unlock' && e.supply_pct != null ? `<span class="num">${esc(TF('ulSup', e.supply_pct))}</span>` : ''}${e.vs_vol != null ? `<span class="num ${e.vs_vol >= 1 ? 'dn' : ''}">${esc(TF('ulVol', e.vs_vol))}</span>` : ''}${e.url ? `<a class="link" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.src && e.src !== 'KMS' ? e.src : T('source'))} ↗</a>` : ''}</div></div>
      <div class="ccd ${cd.c}">${esc(cd.t)}</div></div>`;
  });
  return `<div class="clist">${out}</div>`;
}

/* ---------- JOURNAL (v41: Perp + Spot) ---------- */
Object.assign(I18N.en, { jAll: 'All', jPerp: 'Perp', jSpot: 'Spot', jRealF: 'Realized P&L after fees', jOpenF: 'Open P&L after fees', jWinAll: 'Win rate (across all trade types)', jBest: 'Best trade', jWorst: 'Worst trade', jExcl: (n) => `excludes ${n} trade${n > 1 ? 's' : ''} without a price`, jAllTok: 'All tokens', jKind: 'Type', jBuy: 'Buy', jQty: 'Quantity', jUsd: 'Size (USD)', jFeeIn: 'Entry fee (USD)', jFeeOut: 'Exit fee (USD)', jSellPx: 'Sell price', jManual: 'manual', jNoLive: 'No live price. Type it in (marked manual).', jNoLiveP: 'live P&L unavailable', jPickTok: 'Pick a token', jCurve: 'Equity curve (realized P&L by close date)', jCurveNone: 'Close at least two trades to draw the curve.', jSplit: 'Split', jCdate: 'Close date', jQuick: 'Your watchlist', jFees: 'Fees', jSpotNote: 'Spot: one buy and one sell per trade. Averaging and partial sells come later.' });
Object.assign(I18N.th, { jAll: 'ทั้งหมด', jPerp: 'Perp', jSpot: 'Spot', jRealF: 'กำไร/ขาดทุนที่ปิดแล้ว หลังหักค่าธรรมเนียม', jOpenF: 'กำไร/ขาดทุนที่ยังเปิด หลังหักค่าธรรมเนียม', jWinAll: 'อัตราชนะ (รวมทุกประเภทเทรด)', jBest: 'เทรดที่ดีที่สุด', jWorst: 'เทรดที่แย่ที่สุด', jExcl: (n) => `ไม่รวม ${n} เทรดที่ไม่มีราคา`, jAllTok: 'ทุกเหรียญ', jKind: 'ประเภท', jBuy: 'ซื้อ', jQty: 'จำนวนเหรียญ', jUsd: 'มูลค่า (USD)', jFeeIn: 'ค่าธรรมเนียมตอนเข้า (USD)', jFeeOut: 'ค่าธรรมเนียมตอนออก (USD)', jSellPx: 'ราคาขาย', jManual: 'ใส่เอง', jNoLive: 'ไม่มีราคาสด พิมพ์ราคาเอง (จะติดป้าย "ใส่เอง")', jNoLiveP: 'ไม่มีกำไร/ขาดทุนแบบสด', jPickTok: 'เลือกเหรียญ', jCurve: 'กราฟผลสะสม (กำไร/ขาดทุนที่ปิดแล้ว ตามวันปิด)', jCurveNone: 'ปิดเทรดอย่างน้อย 2 รายการเพื่อแสดงกราฟ', jSplit: 'แยกตามประเภท', jCdate: 'วันที่ปิด', jQuick: 'รายการเหรียญของคุณ', jFees: 'ค่าธรรมเนียม', jSpotNote: 'Spot: ซื้อหนึ่งครั้ง ขายหนึ่งครั้งต่อเทรด การถัวเฉลี่ยและขายบางส่วนจะมาในเวอร์ชันถัดไป' });
const JR = () => store.get('cw-journal', []).map(jMig);
const JRset = (a) => store.set('cw-journal', a);
const isOpenT = (x) => x.close == null || x.close === '';
const livePx = (sym) => { const t = tokBySym(sym); if (!t) return null; const c = t.coingecko && S.cg[t.coingecko]; return t.price || (c && c.current_price) || null; };
const pxById = (id) => { if (!id) return null; const t = S.cfg.find((x) => x.coingecko === id); if (t && t.price) return t.price; const c = (S.pfPx || {})[id]; if (c && c.p) return c.p; return (S.cg[id] && S.cg[id].current_price) || null; };
const jLive = (x) => x.cg ? pxById(x.cg) : livePx(x.token);
async function fetchPxId(id) { const p = pxById(id); if (p) return p; if (!id) return null;
  try { const r = await getJSON(`${CG}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_24hr_change=true`); const v = r[id]; if (v && v.usd) { (S.pfPx = S.pfPx || {})[id] = { p: v.usd, c: v.usd_24h_change }; return v.usd; } } catch (e) {} return null; }
async function fetchPx(sym) { const t = tokBySym(sym); return t && t.coingecko ? fetchPxId(t.coingecko) : livePx(sym); }
const jMig = (x) => { x.kind = x.kind === 'spot' ? 'spot' : 'perp'; x.feeIn = +x.feeIn || 0; x.feeOut = +x.feeOut || 0;
  if (!x.cg) { const t = tokBySym(x.token); if (t && t.coingecko) x.cg = t.coingecko; }
  if (x.kind === 'perp') { if (x.margin == null) { x.margin = +x.size || 0; x.lev = 1; } x.lev = +x.lev || 1; x.size = x.margin * x.lev; }
  else { x.side = 'long'; x.qty = +x.qty || 0; x.size = x.qty * (+x.entry || 0); }
  return x; };
const liqPx = (entry, lev, side) => lev > 1 ? (side === 'short' ? entry * (1 + 1 / lev - 0.005) : entry * (1 - 1 / lev + 0.005)) : null; // 0.5% maintenance margin, same as Leverage tab
function tradePnl(tr) {
  const exit = !isOpenT(tr) ? +tr.close : tr.manual ? null : jLive(tr); if (!exit || !tr.entry) return { pnl: null, pct: null, r: null };
  const spot = tr.kind === 'spot', dir = !spot && tr.side === 'short' ? -1 : 1, fee = (+tr.feeIn || 0) + (isOpenT(tr) ? 0 : (+tr.feeOut || 0));
  const r = !spot && tr.sl ? (dir * (exit - tr.entry)) / Math.abs(tr.entry - tr.sl) : null; let gross, base;
  if (spot) { gross = tr.qty * (exit - tr.entry); base = tr.qty * tr.entry; }
  else { const lev = +tr.lev || 1, margin = tr.margin != null ? +tr.margin : +tr.size; gross = dir * (exit / tr.entry - 1) * margin * lev; base = margin; }
  const pnl = gross - fee; return { pnl, pct: base ? pnl / base * 100 : null, r, exit };
}
function jStats(list) {
  const open = list.filter(isOpenT), done = list.filter((x) => !isOpenT(x)); let unreal = 0, excl = 0;
  open.forEach((x) => { const p = tradePnl(x).pnl; if (p == null) excl++; else unreal += p; });
  const dp = done.map((x) => ({ x, p: tradePnl(x).pnl })).filter((o) => o.p != null); const realized = dp.reduce((s, o) => s + o.p, 0);
  const wins = dp.filter((o) => o.p > 0).length; const rs = done.map((x) => tradePnl(x).r).filter((v) => v != null);
  const srt = dp.slice().sort((a, b) => b.p - a.p);
  return { open, done, unreal, excl, realized, wins, win: dp.length ? wins / dp.length * 100 : null, avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null, best: srt[0] || null, worst: srt[srt.length - 1] || null, n: list.length };
}
const jCurve = (done) => { let c = 0; const pts = done.map((x) => ({ d: x.cdate || x.date || '', p: tradePnl(x).pnl })).filter((o) => o.p != null).sort((a, b) => a.d.localeCompare(b.d)).map((o) => ({ d: o.d, v: +(c += o.p).toFixed(2) })); return pts.length ? [{ d: pts[0].d, v: 0 }, ...pts] : []; };
const kTag = (k) => `<span class="side-tag ktag ${k}">${k === 'spot' ? 'SPOT' : 'PERP'}</span>`;
function pJournal() {
  const raw = store.get('cw-journal', []); const all = JR(); if (raw.some((x) => !x.kind || x.feeIn == null)) JRset(all); // one-time migration: old trades become perp, fees 0
  if (!['all', 'perp', 'spot'].includes(S.jView)) S.jView = store.get('cw-jview', 'all');
  const inView = all.filter((x) => S.jView === 'all' || x.kind === S.jView);
  const toks = [...new Map(inView.map((x) => [x.cg || x.token, x.token])).entries()]; if (S.jTok && !toks.some(([k]) => k === S.jTok)) S.jTok = '';
  const vis = inView.filter((x) => !S.jTok || (x.cg || x.token) === S.jTok); const s = jStats(vis);
  if (all.some((x) => isOpenT(x) && x.cg && !x.manual && !pxById(x.cg)) && !S.jFetching) { S.jFetching = 1; const ids = [...new Set(all.filter((x) => isOpenT(x) && x.cg && !pxById(x.cg)).map((x) => x.cg))];
    getJSON(`${CG}/simple/price?ids=${ids.map(encodeURIComponent).join(',')}&vs_currencies=usd&include_24hr_change=true`).then((r) => { Object.entries(r).forEach(([k, v]) => { (S.pfPx = S.pfPx || {})[k] = { p: v.usd, c: v.usd_24h_change }; }); if (S.route === 'journal') pJournal(); }).catch(() => {}); }
  const st = (l, v, c = '', id = '', sub = '') => `<div><div class="eyebrow">${esc(l)}</div><div class="v num ${c}" ${id ? `id="${id}"` : ''}>${v}</div>${sub}</div>`;
  const exN = (n) => `<small class="sub" id="jExcl">${n ? esc(TF('jExcl', n)) : ''}</small>`;
  const bw = (o) => o ? `${usd(o.p)} <small class="sub">${esc(o.x.token)}</small>` : '–';
  let stats;
  if (S.jView === 'all') { const sp = (k) => jStats(vis.filter((x) => x.kind === k));
    const P = sp('perp'), Q = sp('spot'); const ln = (n, z) => `<span><b>${esc(n)}</b> ${esc(T('realized'))} <b class="num ${cls(z.realized)}">${usd(z.realized)}</b> · ${esc(T('unreal'))} <b class="num ${cls(z.unreal)}">${usd(z.unreal)}</b> · ${esc(T('winRate'))} <b class="num">${z.win != null ? Math.round(z.win) + '%' : '–'}</b></span>`;
    stats = `<div class="jstats j6">${st(T('jRealF'), usd(s.realized), cls(s.realized))}${st(T('jOpenF'), usd(s.unreal), cls(s.unreal), 'jUnreal', exN(s.excl))}${st(T('trades'), `${s.n}`)}${st(T('jWinAll'), s.win != null ? Math.round(s.win) + '%' : '–')}${st(T('jBest'), bw(s.best), s.best ? cls(s.best.p) : '')}${st(T('jWorst'), bw(s.worst), s.worst ? cls(s.worst.p) : '')}</div>
      <div class="jsplit"><span class="eyebrow">${esc(T('jSplit'))}</span>${ln(T('jPerp'), P)}${ln(T('jSpot'), Q)}</div>`; }
  else stats = `<div class="jstats">${st(T('jRealF'), usd(s.realized), cls(s.realized))}${st(T('jOpenF'), usd(s.unreal), cls(s.unreal), 'jUnreal', exN(s.excl))}${st(T('winRate'), s.win != null ? Math.round(s.win) + '%' : '–')}${S.jView === 'perp' && s.avgR != null ? st(T('avgR'), s.avgR.toFixed(2) + 'R') : st(T('trades'), `${s.n}`)}</div>`;
  const cv = jCurve(s.done);
  const curve = `<div class="card jcurve"><div class="sec-h"><h2>${esc(T('jCurve'))}</h2></div>${cv.length > 1 ? sparkSVG(cv) + `<div class="sub" style="display:flex;justify-content:space-between"><span>${esc(cv[0].d)}</span><span class="num ${cls(cv[cv.length - 1].v)}">${usd(cv[cv.length - 1].v)}</span><span>${esc(cv[cv.length - 1].d)}</span></div>` : `<p class="sub">${esc(T('jCurveNone'))}</p>`}</div>`;
  const list = (S.jFilter === 'open' ? s.open : s.done).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const rows = list.map((x) => { const t = (x.cg && S.cfg.find((c) => c.coingecko === x.cg)) || tokBySym(x.token) || { symbol: x.token, name: x.name || '', logo: x.logo }; const p = tradePnl(x); const op = isOpenT(x);
    const na = op && p.pnl == null ? `<span class="sub" style="display:block">${esc(T('jNoLiveP'))}</span>` : '';
    const meta = x.kind === 'spot' ? `<span>${esc(T('jQty'))} <b class="num">${(+x.qty).toLocaleString('en-US', { maximumFractionDigits: 8 })}</b></span><span>${esc(T('jUsd'))} <b class="num">$${(+x.size).toLocaleString('en-US', { maximumFractionDigits: 2 })}</b></span>`
      : `<span>${esc(T('margin'))} <b class="num">$${(+x.margin).toLocaleString('en-US')}</b></span><span>${esc(T('lev'))} <b class="num">${+x.lev}x</b></span><span>${esc(T('posSize'))} <b class="num">$${(+x.size).toLocaleString('en-US', { maximumFractionDigits: 2 })}</b></span>${x.sl ? `<span>SL <b class="num">${px(+x.sl)}</b></span>` : ''}${x.tp ? `<span>TP <b class="num">${px(+x.tp)}</b></span>` : ''}`;
    const fees = x.feeIn || x.feeOut ? `<span>${esc(T('jFees'))} <b class="num">$${(x.feeIn + x.feeOut).toLocaleString('en-US', { maximumFractionDigits: 2 })}</b></span>` : '';
    return `<div class="jrow" data-jedit="${x.id}"><div class="tok">${logo(t)}<div><b>${esc(x.token)}${kTag(x.kind)}${x.kind === 'perp' ? `<span class="side-tag">${x.side === 'short' ? 'SHORT' : 'LONG'}</span>` : ''}${x.manual ? `<span class="side-tag">${esc(T('jManual'))}</span>` : ''}</b><small>${esc(x.date || '')} · ${px(+x.entry)} → ${p.exit ? `<span>${px(p.exit)}</span>` : '–'}</small></div></div>
      <div class="r"><b class="num ${cls(p.pnl)}" data-jp="${x.id}">${usd(p.pnl)}</b><span class="num sub ${cls(p.pct)}" data-jq="${x.id}">${pct(p.pct)}${p.r != null ? ' · ' + p.r.toFixed(2) + 'R' : ''}</span>${na}</div>
      <div class="meta">${meta}${fees}${x.notes ? `<span>${esc(x.notes)}</span>` : ''}</div></div>`; }).join('');
  const views = [['all', T('jAll'), all.length], ['perp', T('jPerp'), all.filter((x) => x.kind === 'perp').length], ['spot', T('jSpot'), all.filter((x) => x.kind === 'spot').length]];
  $('#main').innerHTML = `<div class="page">${pageHead(T('journal'), `<button class="btn pri" data-jnew>+ ${esc(T('newTrade'))}</button>`)}
    <div class="jtools jviews"><div class="seg">${views.map(([k, n, c]) => `<button data-jv="${k}" aria-pressed="${S.jView === k}">${esc(n)} · ${c}</button>`).join('')}</div></div>
    ${stats}${curve}
    <div class="jtools"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><div class="seg"><button data-jf="open" aria-pressed="${S.jFilter === 'open'}">${esc(T('openPos'))} · ${s.open.length}</button><button data-jf="closed" aria-pressed="${S.jFilter === 'closed'}">${esc(T('closed'))} · ${s.done.length}</button></div>
      <select class="input jtok" id="jtok" aria-label="${esc(T('token'))}"><option value="">${esc(T('jAllTok'))}</option>${toks.map(([k, n]) => `<option value="${esc(k)}" ${S.jTok === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
      <div style="display:flex;gap:6px"><button class="btn pri jnew-m" data-jnew style="display:none">+ ${esc(T('newTrade'))}</button><button class="btn ghost" data-jexp>${esc(T('exp'))}</button><label class="btn ghost" style="cursor:pointer">${esc(T('imp'))}<input type="file" accept="application/json,.json" id="jimp" hidden></label></div></div>
    <div>${rows || `<div class="empty">${esc(T('jEmpty'))}<div style="margin-top:14px"><button class="btn pri" data-jnew>+ ${esc(T('newTrade'))}</button></div></div>`}</div>
    <p class="sub" style="margin-top:16px">${esc(T('jSaved'))}</p></div>`;
  if (matchMedia('(max-width:1023px)').matches) $$('.jnew-m').forEach((b) => b.style.display = '');
  $('#jimp').addEventListener('change', importJ);
  $('#jtok').addEventListener('change', (e) => { S.jTok = e.target.value; pJournal(); });
}
function onTick() {
  if (S.route !== 'journal') return;
  const all = JR(); const vis = all.filter((x) => (S.jView === 'all' || !S.jView || x.kind === S.jView) && (!S.jTok || (x.cg || x.token) === S.jTok)); let unreal = 0, excl = 0;
  vis.forEach((x) => { if (!isOpenT(x)) return; const p = tradePnl(x); if (p.pnl == null) excl++; else unreal += p.pnl;
    const a = $(`[data-jp="${x.id}"]`), b = $(`[data-jq="${x.id}"]`);
    if (a) { a.textContent = usd(p.pnl); a.className = 'num ' + cls(p.pnl); } if (b) { b.textContent = pct(p.pct) + (p.r != null ? ' · ' + p.r.toFixed(2) + 'R' : ''); b.className = 'num sub ' + cls(p.pct); } });
  const u = $('#jUnreal'); if (u) { u.textContent = usd(unreal); u.className = 'v num ' + cls(unreal); }
  const ex = $('#jExcl'); if (ex) ex.textContent = excl ? TF('jExcl', excl) : '';
}
function tradeDialog(id) {
  const all = JR(); const t0 = tokBySym(S.sel) || S.cfg[0] || {};
  const x = all.find((r) => r.id === id) || { kind: S.jView === 'spot' ? 'spot' : 'perp', token: t0.symbol, cg: t0.coingecko, name: t0.name, logo: t0.logo, side: 'long', entry: '', margin: 100, lev: 1, qty: '', feeIn: 0, feeOut: 0, date: lYmd() };
  let pick = x.token ? { id: x.cg || null, sym: x.token, name: x.name || '', logo: x.logo } : null, kind = x.kind;
  const f = (k, lbl, type = 'number', opt = false, full = false, cl = '') => `<div class="fld ${full ? 'full' : ''} ${cl}"><label>${esc(lbl)}${opt ? ` <small>(${esc(T('optional'))})</small>` : ''}</label><input class="input" name="${k}" type="${type}" ${type === 'number' ? 'step="any" inputmode="decimal"' : ''} value="${esc(x[k] ?? '')}"></div>`;
  const qp = (t) => `<button type="button" class="res" data-jpick='${esc(JSON.stringify({ id: t.coingecko, sym: t.symbol, name: t.name, logo: t.logo }))}'>${logo(t, 'sm')}<b>${esc(t.symbol)}</b><span class="sub">${esc(t.name || '')}</span></button>`;
  const d = $('#dlg');
  d.innerHTML = `<form method="dialog" id="jform"><div class="dlg-h"><h2>${esc(id ? T('edit') : T('newTrade'))}</h2><button class="icon-btn" value="cancel" aria-label="close"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
    <div class="dlg-b"><div class="fld full"><label>${esc(T('jKind'))}</label><div class="seg" style="display:flex;height:42px"><button type="button" style="flex:1" data-jk="perp" aria-pressed="${kind === 'perp'}" ${id ? 'disabled' : ''}>Perp</button><button type="button" style="flex:1" data-jk="spot" aria-pressed="${kind === 'spot'}" ${id ? 'disabled' : ''}>Spot</button></div></div>
      <div class="fld full"><label>${esc(T('token'))}</label><div id="jPick" class="pfpick"></div><input class="input" id="jq" placeholder="${esc(T('pfSearch'))}" autocomplete="off"><div class="results" id="jres"><div class="sub" style="padding:4px 0">${esc(T('jQuick'))}</div>${S.cfg.map(qp).join('')}</div></div>
      <div class="fld kp"><label>${esc(T('side'))}</label><div class="seg" style="display:flex;height:42px"><button type="button" style="flex:1" data-side="long" aria-pressed="${x.side !== 'short'}">Long</button><button type="button" style="flex:1" data-side="short" aria-pressed="${x.side === 'short'}">Short</button></div><input type="hidden" name="side" value="${x.side || 'long'}"></div>
      <div class="fld ks"><label>${esc(T('side'))}</label><div class="seg" style="display:flex;height:42px"><button type="button" style="flex:1" aria-pressed="true">${esc(T('jBuy'))}</button></div></div>
      <div class="fld full"><label>${esc(T('entry'))} <small id="jlive"></small></label><input class="input" name="entry" type="number" step="any" inputmode="decimal" value="${esc(x.entry ?? '')}"></div>
      ${f('margin', T('margin'), 'number', false, false, 'kp')}<div class="fld kp"><label>${esc(T('lev'))}</label><input class="input" name="lev" type="number" step="any" min="1" inputmode="decimal" value="${esc(x.lev ?? 1)}"></div>
      <div class="fld full kp"><div class="levp">${[1, 2, 3, 5, 10, 20].map((n) => `<button type="button" data-lev="${n}">${n}x</button>`).join('')}</div></div>
      ${f('qty', T('jQty'), 'number', false, false, 'ks')}<div class="fld ks"><label>${esc(T('jUsd'))}</label><input class="input" name="usdsz" type="number" step="any" inputmode="decimal" value="${x.kind === 'spot' && x.qty && x.entry ? +(x.qty * x.entry).toFixed(2) : ''}"></div>
      <div class="fld full jcalc" id="jcalc"></div>
      ${f('sl', T('sl'), 'number', true, false, 'kp')}${f('tp', T('tp'), 'number', true, false, 'kp')}${f('feeIn', T('jFeeIn'))}${f('feeOut', T('jFeeOut'))}${f('date', T('date'), 'date')}
      <div class="fld"><label><span class="kp">${esc(T('closePx'))}</span><span class="ks">${esc(T('jSellPx'))}</span> <small>(${esc(T('optional'))})</small></label><input class="input" name="close" type="number" step="any" inputmode="decimal" value="${esc(x.close ?? '')}"></div>
      <div class="fld full"><label>${esc(T('notes'))} <small>(${esc(T('optional'))})</small></label><textarea class="input" name="notes">${esc(x.notes || '')}</textarea></div>
      <p class="sub full ks" style="grid-column:1/-1">${esc(T('jSpotNote'))}</p></div>
    <div class="dlg-f">${id ? `<button type="button" class="btn ghost danger sp" data-jdel="${id}">${esc(T('del'))}</button>` : ''}${id && isOpenT(x) ? `<button type="button" class="btn" data-jclose>${esc(T('closeTrade'))}</button>` : ''}<button class="btn ghost" value="cancel">${esc(T('cancel'))}</button><button class="btn pri" value="ok">${esc(T('save'))}</button></div></form>`;
  const fm = $('#jform'); let curLive = null, tokChanged = false, tmr;
  const showKind = () => { $$('.kp', fm).forEach((e) => e.style.display = kind === 'perp' ? '' : 'none'); $$('.ks', fm).forEach((e) => e.style.display = kind === 'spot' ? '' : 'none'); $$('[data-jk]', fm).forEach((b) => b.setAttribute('aria-pressed', b.dataset.jk === kind)); };
  const calc = () => { const e = +fm.entry.value, ex = +fm.close.value || curLive, fee = (+fm.feeIn.value || 0) + (+fm.close.value ? (+fm.feeOut.value || 0) : 0); let pl = '–', ro = '–', c = '';
    if (kind === 'spot') { const q = +fm.qty.value;
      if (e > 0 && q > 0 && ex) { const p = q * (ex - e) - fee; pl = usd(p); ro = pct(p / (q * e) * 100); c = cls(p); }
      $('#jcalc').innerHTML = `<div><span>${esc(T('jUsd'))}</span><b class="num">${e > 0 && q > 0 ? '$' + (q * e).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '–'}</b></div><div><span>${esc(T('pnl'))} (${esc(T('jFees'))} −)</span><b class="num ${c}">${pl}</b></div><div><span>%</span><b class="num ${c}">${ro}</b></div>`; return; }
    const m = +fm.margin.value, l = Math.max(1, +fm.lev.value || 1), sd = fm.side.value; const sz = m * l;
    $$('[data-lev]', fm).forEach((b) => b.setAttribute('aria-pressed', +b.dataset.lev === l));
    if (e > 0 && m > 0 && ex) { const p = (sd === 'short' ? -1 : 1) * (ex / e - 1) * sz - fee; pl = usd(p); ro = pct(p / m * 100); c = cls(p); }
    const lq = e > 0 ? liqPx(e, l, sd) : null;
    $('#jcalc').innerHTML = `<div><span>${esc(T('posSize'))}</span><b class="num">${m > 0 ? '$' + sz.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '–'}</b></div><div><span>${esc(T('estLiq'))}</span><b class="num">${lq ? px(lq) : '–'}</b></div><div><span>${esc(T('pnl'))}</span><b class="num ${c}">${pl}</b></div><div><span>ROE</span><b class="num ${c}">${ro}</b></div>`; };
  const setLive = async (fill) => { if (!pick) return; const id0 = pick.id; $('#jlive').textContent = '…'; const p = id0 ? await fetchPxId(id0) : livePx(pick.sym); if (!pick || pick.id !== id0) return; curLive = p;
    $('#jlive').textContent = p ? `· ${T('liveHint')} ${px(p)}` : `· ${T('jNoLive')}`; if (fill && p) fm.entry.value = +p.toPrecision(6); calc(); };
  const setPick = (p, fill) => { pick = p; $('#jPick').innerHTML = p ? `<b>${esc(p.sym)}</b> ${esc(p.name || '')}` : `<span class="sub">${esc(T('jPickTok'))}</span>`; $$('[data-jpick]', fm).forEach((b) => b.setAttribute('aria-pressed', JSON.parse(b.dataset.jpick).id === (p && p.id))); setLive(fill); };
  const syncUsd = () => { const e = +fm.entry.value, q = +fm.qty.value; if (e > 0 && q > 0) fm.usdsz.value = +(q * e).toFixed(2); };
  fm.entry.addEventListener('input', () => { syncUsd(); calc(); });
  fm.qty.addEventListener('input', () => { syncUsd(); calc(); });
  fm.usdsz.addEventListener('input', () => { const e = +fm.entry.value, u = +fm.usdsz.value; if (e > 0 && u > 0) fm.qty.value = +(u / e).toPrecision(10); calc(); });
  ['margin', 'lev', 'close', 'feeIn', 'feeOut'].forEach((k) => fm[k].addEventListener('input', calc));
  $('#jq').addEventListener('input', (e) => { clearTimeout(tmr); const q = e.target.value.trim(); if (q.length < 2) return; tmr = setTimeout(async () => {
    try { const r = await getJSON(`${CG}/search?query=${encodeURIComponent(q)}`); $('#jres').innerHTML = r.coins.slice(0, 8).map((c) => `<button type="button" class="res" data-jpick='${esc(JSON.stringify({ id: c.id, sym: c.symbol.toUpperCase(), name: c.name, logo: c.large || c.thumb }))}'><img class="logo sm" src="${esc(c.thumb)}" alt=""><b>${esc(c.symbol.toUpperCase())}</b><span class="sub">${esc(c.name)}</span></button>`).join('') || `<p class="sub">–</p>`; } catch (er) {} }, 350); });
  showKind(); setPick(pick, !id && !x.entry); calc();
  fm.addEventListener('click', (e) => { const lv = e.target.closest('[data-lev]'); if (lv) { fm.lev.value = lv.dataset.lev; calc(); }
    const jp = e.target.closest('[data-jpick]'); if (jp) { tokChanged = true; setPick(JSON.parse(jp.dataset.jpick), !fm.entry.value || !id); }
    const k = e.target.closest('[data-jk]'); if (k && !id) { kind = k.dataset.jk; showKind(); calc(); }
    const s = e.target.closest('[data-side]'); if (s) { fm.side.value = s.dataset.side; $$('[data-side]', fm).forEach((b) => b.setAttribute('aria-pressed', b === s)); calc(); }
    if (e.target.closest('[data-jclose]')) { const p = curLive || jLive(x); if (p) fm.close.value = +p.toPrecision(6); fm.close.focus(); }
    const del = e.target.closest('[data-jdel]'); if (del && confirm(T('confirmDel'))) { JRset(JR().filter((r) => r.id !== id)); d.close(); pJournal(); } });
  d.onclose = () => { if (d.returnValue !== 'ok' || !pick) return; const v = Object.fromEntries(new FormData(fm)); if (!(+v.entry > 0)) return;
    const base = { id: id || Date.now().toString(36), kind, token: pick.sym, cg: pick.id || null, name: pick.name || '', logo: pick.logo || '', entry: +v.entry, feeIn: Math.max(0, +v.feeIn || 0), feeOut: Math.max(0, +v.feeOut || 0), date: v.date, close: v.close ? +v.close : null, notes: v.notes.trim(),
      manual: id && !tokChanged ? !!x.manual : !curLive };
    base.cdate = base.close != null ? (x.cdate && x.close != null ? x.cdate : lYmd()) : null;
    let rec;
    if (kind === 'spot') { if (!(+v.qty > 0)) return; rec = { ...base, side: 'long', qty: +v.qty, size: +v.qty * base.entry }; }
    else { if (!(+v.margin > 0)) return; const lev = Math.max(1, +v.lev || 1); rec = { ...base, side: v.side, margin: +v.margin, lev, size: +v.margin * lev, sl: v.sl ? +v.sl : null, tp: v.tp ? +v.tp : null }; }
    const a = JR(); const i = a.findIndex((r) => r.id === rec.id); if (i >= 0) a[i] = rec; else a.push(rec); JRset(a); if (rec.close) S.jFilter = 'closed'; pJournal(); };
  d.returnValue = ''; d.showModal();
}
function exportJ() { const b = new Blob([JSON.stringify({ app: 'kms-capital', version: 2, trades: JR() }, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `kms-capital-journal-${lYmd()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function importJData(j) { const tr = Array.isArray(j) ? j : j && j.trades; if (!Array.isArray(tr)) throw 0;
  const a = JR(); const ids = new Set(a.map((x) => x.id)); const add = tr.filter((x) => x && x.token && x.entry && !ids.has(x.id)).map(jMig); JRset(a.concat(add)); return add.length; }
async function importJ(e) {
  const f = e.target.files[0]; if (!f) return;
  try { const n = importJData(JSON.parse(await f.text())); toast(T('imported')(n)); pJournal(); } catch (err) { toast(T('badFile')); }
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
  if (e.target.closest('.ui-help')) return;
  const q = (s) => e.target.closest(s);
  let el;
  if ((el = q('[data-gear]'))) { const m = $('#gearMenu'); if (m.hidden) openGear(el); else closeGear(); return; }
  if (!q('#gearMenu') && !$('#gearMenu').hidden) closeGear();
  if ((el = q('[data-sel]'))) { const fromTable = !el.hasAttribute('data-chip'); select(el.dataset.sel); if (fromTable) $('#detail').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if ((el = q('[data-tab]'))) { S.tab = el.dataset.tab; $$('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x.dataset.tab === S.tab)); return renderTab(tokBySym(S.sel)); }
  if ((el = q('[data-tf]'))) { S.tf = el.dataset.tf; return renderTab(tokBySym(S.sel)); }
  if (q('[data-fngretry]')) { S.errors.fng = null; renderMarketTop(); loadGlobal().then(() => { if (S.route === 'markets') renderMarketTop(); }); return; }
  if ((el = q('[data-retry]'))) { const t = tokBySym(el.dataset.retry); t.err = null; render(); loadToken(t).then(() => render(true)); return; }
  if ((el = q('[data-refresh]'))) return refreshAll(true);
  if ((el = q('[data-lang]'))) { LANG = el.dataset.lang; try { localStorage.setItem('cw-lang', LANG); } catch (er) {} const d = $('#detail'); if (d) d.dataset.sym = ''; render(); return; }
  if ((el = q('[data-theme]')) && el.tagName === 'BUTTON') { applyTheme(el.dataset.theme); render(); return; }
  if ((el = q('[data-mv]'))) { const [i, dd] = el.dataset.mv.split(':').map(Number); const a = S.cfg; [a[i], a[i + dd]] = [a[i + dd], a[i]]; saveCfg(); pWatchlist(); return; }
  if ((el = q('[data-rm]'))) { const s = el.dataset.rm; if (S.cfg.length <= 1) return; S.cfg = S.cfg.filter((t) => t.symbol !== s); if (S.sel === s) S.sel = S.cfg[0].symbol; saveCfg(); syncWS(); toast(T('removed')(s)); pWatchlist(); return; }
  if ((el = q('[data-add]'))) return addToken(JSON.parse(el.dataset.add));
  if ((el = q('[data-reset]'))) { S.cfg = S.defaults.map((t) => ({ ...t })); try { localStorage.removeItem('cw-tokens'); } catch (er) {} toast(T('resetDone')); pWatchlist(); Promise.all(S.cfg.map(loadToken)).then(syncWS); return; }
  if ((el = q('[data-cf]'))) { S.calFilter = el.dataset.cf; return pCalendar(); }
  if (q('[data-cmine]')) { S.calMine = !S.calMine; store.set('cw-calmine', S.calMine); return pCalendar(); }
  if (q('[data-cpast]')) { S.calPast = !S.calPast; return pCalendar(); }
  if (q('[data-creset]')) { S.calFilter = 'all'; S.calMine = false; store.set('cw-calmine', false); return pCalendar(); }
    if ((el = q('[data-cm]'))) { const n = +el.dataset.cm; if (!n) { S.calMonth = lYmd().slice(0, 7); S.calPick = null; } else { const [y, m] = S.calMonth.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); S.calMonth = d.toISOString().slice(0, 7); S.calPick = null; } return pCalendar(); }
  if ((el = q('[data-day]'))) { const k = el.dataset.day; S.calPick = S.calPick === k ? null : k; if (k.slice(0, 7) !== S.calMonth) S.calMonth = k.slice(0, 7); pCalendar(); if (S.calPick) { const r = $(`[data-cday="${k}"]`); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'center' }); else toast(T('noEvents')); } return; }
  if ((el = q('[data-jf]'))) { S.jFilter = el.dataset.jf; return pJournal(); }
  if ((el = q('[data-jv]'))) { S.jView = el.dataset.jv; store.set('cw-jview', S.jView); return pJournal(); }
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
  // v49: one-time add of ETH (directly below BTC) to customised lists saved before ETH joined tokens.json; a later removal sticks.
  if (Array.isArray(saved) && saved.length && !store.get('cw-mig-eth', false)) { const e = S.defaults.find((t) => t.symbol === 'ETH');
    if (e && !S.cfg.some((t) => t.symbol === 'ETH')) { S.cfg.splice(S.cfg.findIndex((t) => t.symbol === 'BTC') + 1, 0, { ...e }); saveCfg(); } store.set('cw-mig-eth', true); }
  const ss = (() => { try { return localStorage.getItem('cw-sel'); } catch (e) { return null; } })();
  S.sel = tokBySym(ss) ? ss : S.cfg[0]?.symbol;
  render(); await refreshAll();
  setInterval(refreshCandles, 60e3);
  setInterval(() => { if (!document.hidden) Promise.all([loadCG(), loadGlobal()]).then(() => { if (S.route === 'markets') { renderMarketTop(); } }); }, 5 * 60e3);
  setInterval(renderStatus, 5e3);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') { const had = !!navigator.serviceWorker.controller; let rl = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !rl) { rl = true; const b = document.createElement('button'); b.className = 'upd-bar'; b.type = 'button'; b.textContent = XL('New version available — tap to refresh', 'มีเวอร์ชันใหม่ — แตะเพื่อรีเฟรช'); b.onclick = () => location.reload(); document.body.appendChild(b); } }); navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => { r.update().catch(() => {}); document.addEventListener('visibilitychange', () => { if (!document.hidden) r.update().catch(() => {}); }); }).catch(() => {}); }
})();
/* a1: header tooltips on every render; chip rows lose their edge fade once scrolled to the end. */
{ let raf = 0; const mainEl = document.getElementById('main');
  const chipEnds = () => document.querySelectorAll('#main .filters, #main .chips').forEach((el) => el.classList.toggle('end', el.scrollLeft + el.clientWidth >= el.scrollWidth - 4));
  if (mainEl) new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { applyTips(mainEl); chipEnds(); }); }).observe(mainEl, { childList: true, subtree: true });
  document.addEventListener('scroll', (e) => { const t = e.target; if (t && t.classList && (t.classList.contains('filters') || t.classList.contains('chips'))) t.classList.toggle('end', t.scrollLeft + t.clientWidth >= t.scrollWidth - 4); }, { capture: true, passive: true });
  addEventListener('resize', chipEnds, { passive: true }); }

// Tap/focus disclosures, also usable without a mouse.
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.ui-help[open]').forEach((d) => d.removeAttribute('open')); });
document.addEventListener('click', (e) => { document.querySelectorAll('.ui-help[open]').forEach((d) => { if (!d.contains(e.target)) d.removeAttribute('open'); }); });
