/* Crypto Watch – live client-side dashboard. No backend. */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const CG = 'https://api.coingecko.com/api/v3';
const COLORS = { BTC: '#f7931a', MON: '#836ef9', HYPE: '#2fd3b0', AAVE: '#9b6bd8', LIT: '#3b82f6' };
const S = { cfg: [], judg: null, tok: {}, cg: {}, global: null, fng: null, sel: null, tab: 'Price & MAs', tf: '1D',
  errors: {}, lastOk: 0, ws: {}, charts: [], busy: false };

/* ---------- formatting ---------- */
const px = (v) => v == null || isNaN(v) ? '–' : '$' + (v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v >= 1 ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v >= 0.01 ? v.toFixed(4) : v.toPrecision(4));
const big = (v) => v == null ? '–' : v >= 1e12 ? '$' + (v / 1e12).toFixed(2) + 'T' : v >= 1e9 ? '$' + (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : '$' + Math.round(v).toLocaleString();
const pct = (v, d = 2) => v == null || isNaN(v) ? '–' : (v > 0 ? '+' : '') + v.toFixed(d) + '%';
const cls = (v) => v > 0 ? 'up' : v < 0 ? 'dn' : 'mut';
const jst = (d = new Date()) => d.toLocaleString('en-US', { timeZone: 'Asia/Tokyo', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }) + ' JST';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); };

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
async function loadJudgment() {
  try { S.judg = await getJSON('judgment.json?ts=' + Date.now()); S.errors.judg = null; } catch (e) { S.errors.judg = 'judgment.json: ' + e.message; }
}
async function refreshAll(manual) {
  if (S.busy) return; S.busy = true; $('#refreshBtn').classList.add('spin');
  await Promise.all([loadJudgment(), loadCG(), loadGlobal(), ...S.cfg.map(loadToken)]);
  syncWS(); S.lastCG = Date.now(); S.busy = false; $('#refreshBtn').classList.remove('spin');
  renderAll(); if (manual) toast(S.cfg.some((t) => t.err) ? 'Refreshed with some errors' : 'All data refreshed');
}
async function refreshCandles() {
  if (S.busy || document.hidden) return;
  await Promise.all(S.cfg.map(loadToken)); renderAll(true);
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
  if (S.sel === t.symbol && S.live && S.live.candle && t.d1) { const l = t.d1[t.d1.length - 1]; try { S.live.candle.update({ time: ts(l.t), open: l.o, high: l.h, low: l.l, close: l.c }); } catch (e) {} }
}

/* ---------- status ---------- */
function renderStatus() {
  const el = $('#status'); const anyWS = Object.values(S.ws).some((w) => w && w.readyState === 1);
  const age = Date.now() - S.lastOk; let c = '', txt = 'Connecting';
  if (!navigator.onLine) { c = 'off'; txt = 'Offline'; }
  else if (!S.lastOk) { c = ''; txt = 'Connecting'; }
  else if (age > 180e3) { c = 'stale'; txt = 'Stale'; }
  else { c = 'live'; txt = anyWS ? 'Live' : 'Online'; }
  el.className = 'pill ' + c; el.querySelector('b').textContent = txt;
  el.title = anyWS ? 'Live price stream connected' : 'Polling every 60s';
  $('#updated').textContent = S.lastOk ? 'Updated ' + jst(new Date(S.lastOk)) : (navigator.onLine ? 'Loading…' : 'No connection');
}

/* ---------- render ---------- */
const J = (sym) => (S.judg && S.judg.tokens && S.judg.tokens[sym]) || {};
const ico = (t) => `<span class="tico" style="background:${COLORS[t.symbol] || '#5b8cff'}">${esc(t.symbol.slice(0, 4))}</span>`;
const biasTag = (b) => `<span class="tag ${b === 'Long' ? 'g' : b === 'Avoid' ? 'r' : 'y'}">${b}</span>`;
const trendTag = (tr) => `<span class="tag ${tr === 'Uptrend' ? 'g' : tr === 'Downtrend' ? 'r' : 'y'}">${tr === 'Uptrend' ? '▲' : tr === 'Downtrend' ? '▼' : '◆'} ${tr}</span>`;
const riskTag = (r) => r ? `<span class="tag ${r === 'Medium' ? 'y' : 'r'}">${esc(r)} risk</span>` : '';
const ch24 = (t) => t.ch24live ?? (S.cg[t.coingecko] || {}).price_change_percentage_24h_in_currency;

function renderMarket() {
  const g = S.global, f = S.fng, el = $('#market');
  const card = (l, v, d, extra = '') => `<div class="mcard"><div class="l">${l}</div><div class="v num">${v}</div><div class="d">${d}</div>${extra}</div>`;
  const sk = '<div class="mcard"><div class="sk" style="height:12px;width:60%"></div><div class="sk" style="height:22px;width:80%;margin-top:8px"></div></div>';
  let h = '';
  if (g) {
    const ch = g.market_cap_change_percentage_24h_usd;
    h += card('Total crypto market', big(g.total_market_cap.usd), `<span class="${cls(ch)}">${pct(ch)}</span> in 24h`);
    h += card('BTC dominance', g.market_cap_percentage.btc.toFixed(1) + '%', 'Share of all crypto value in BTC');
  } else h += S.errors.global ? card('Market data', '–', esc(S.errors.global)) + card('BTC dominance', '–', 'unavailable') : sk + sk;
  if (f) {
    const v = +f[0].value, c = v < 25 ? 'dn' : v < 45 ? 'warn' : v <= 55 ? 'mut' : 'up';
    h += card('Fear & Greed', `<span class="${c}">${v}</span> <small style="font-size:14px">${esc(f[0].value_classification)}</small>`, `Yesterday ${f[1]?.value ?? '–'} · week ago ${f[7]?.value ?? '–'}`, `<div class="fng-bar"><b style="left:${v}%"></b></div>`);
  } else h += S.errors.fng ? card('Fear & Greed', '–', esc(S.errors.fng)) : sk;
  const b = S.cfg.find((t) => t.symbol === 'BTC');
  h += b && b.price ? card('Bitcoin', `<span data-px="BTC">${px(b.price)}</span>`, `<span data-ch="BTC" class="${cls(ch24(b))}">${pct(ch24(b))}</span> 24h · the market's anchor`) : sk;
  el.innerHTML = h;
}
function spark(t) {
  if (!t.d1) return ''; const c = t.d1.slice(-30).map((x) => x.c); const mn = Math.min(...c), mx = Math.max(...c);
  const pts = c.map((v, i) => `${(i / (c.length - 1) * 100).toFixed(1)},${(30 - (v - mn) / (mx - mn || 1) * 28 - 1).toFixed(1)}`).join(' ');
  const col = c[c.length - 1] >= c[0] ? 'var(--up)' : 'var(--dn)';
  return `<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke" points="${pts}"/></svg>`;
}
function renderOverview() {
  const el = $('#overview');
  const cards = S.cfg.map((t) => {
    const cg = S.cg[t.coingecko] || {};
    if (!t.I && !t.err) return `<div class="tcard"><span class="tico sk"></span><div class="sk" style="height:14px;width:50%"></div><div class="sk" style="height:14px;width:60px"></div><div class="sk" style="height:12px;width:70%"></div><div></div></div>`;
    if (!t.I) return `<div class="tcard">${ico(t)}<div class="nm">${esc(t.symbol)}<small>${esc(t.name)}</small></div><div></div><div class="err" style="grid-column:2/-1;margin:0">Price feed failed. <button data-retry="${t.symbol}">Retry</button></div></div>`;
    const j = J(t.symbol);
    return `<button class="tcard ${S.sel === t.symbol ? 'sel' : ''}" data-sel="${t.symbol}">${ico(t)}
      <div class="nm">${esc(t.symbol)}<small>${esc(t.name)}</small></div><div class="px num" data-px="${t.symbol}">${px(t.price)}</div>
      <div class="row2">${trendTag(t.I.trend)}${biasTag(t.I.plan.bias)}${riskTag(j.risk)}</div><div class="ch num ${cls(ch24(t))}" data-ch="${t.symbol}">${pct(ch24(t))}</div>
      ${spark(t)}</button>`;
  }).join('');
  const rows = S.cfg.map((t) => {
    const cg = S.cg[t.coingecko] || {}, j = J(t.symbol), I = t.I;
    if (!I) return `<tr><td><div class="tokcell">${ico(t)}<b>${esc(t.symbol)}</b></div></td><td colspan="11" class="tl">${t.err ? `<span class="dn">Price feed failed</span> <button class="tag" data-retry="${t.symbol}">Retry</button>` : '<div class="sk" style="height:14px"></div>'}</td></tr>`;
    const rsiC = I.rsi > 70 ? 'dn' : I.rsi < 30 ? 'up' : '';
    return `<tr class="${S.sel === t.symbol ? 'sel' : ''}" data-sel="${t.symbol}"><td><div class="tokcell">${ico(t)}<div><b>${esc(t.symbol)}</b><div class="note">${esc(t.name)}</div></div></div></td>
      <td class="num" data-px="${t.symbol}">${px(t.price)}</td><td class="num ${cls(ch24(t))}" data-ch="${t.symbol}">${pct(ch24(t))}</td>
      <td class="num ${cls(cg.price_change_percentage_7d_in_currency)}">${pct(cg.price_change_percentage_7d_in_currency)}</td>
      <td class="num ${cls(cg.price_change_percentage_30d_in_currency)}">${pct(cg.price_change_percentage_30d_in_currency)}</td>
      <td class="num ${rsiC}">${I.rsi?.toFixed(0) ?? '–'}</td><td>${trendTag(I.trend)}</td><td>${biasTag(I.plan.bias)}</td>
      <td class="num">${px(I.plan.entry[0])}–${px(I.plan.entry[1])}</td><td>${riskTag(j.risk) || '–'}</td>
      <td class="num">${big(cg.market_cap)}</td><td class="num">${big(cg.total_volume)}</td></tr>`;
  }).join('');
  el.innerHTML = `<div class="ov-cards">${cards}</div><div class="ov-table"><table><thead><tr><th>Token</th><th>Price</th><th>24h</th><th>7d</th><th>30d</th><th>RSI</th><th class="tl">Trend</th><th class="tl">Setup</th><th>Entry zone</th><th class="tl">Risk</th><th>Market cap</th><th>Volume 24h</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function renderTokbar() {
  $('#tokbar').innerHTML = S.cfg.map((t) => `<button class="tokbtn" role="tab" aria-selected="${S.sel === t.symbol}" data-sel="${t.symbol}">${esc(t.symbol)}</button>`).join('');
}
const TABS = ['Price & MAs', 'Trade Plan', 'RSI & MACD', 'Volume', 'Bollinger'];
function renderDetail(soft) {
  const t = S.cfg.find((x) => x.symbol === S.sel), el = $('#detail');
  if (!t) return;
  if (!t.I) { killCharts(); el.innerHTML = t.err ? `<div class="err">Couldn't load ${esc(t.symbol)}: ${esc(t.err)} <button data-retry="${t.symbol}">Retry</button></div>` : `<div class="sk" style="height:40px;width:50%"></div><div class="sk" style="height:340px;margin-top:14px"></div>`; return; }
  const cg = S.cg[t.coingecko] || {}, j = J(t.symbol), I = t.I, P = I.plan;
  const stat = (l, v, d = '', c = '') => `<div class="stat"><div class="l">${l}</div><div class="v num ${c}">${v}</div>${d ? `<div class="d">${d}</div>` : ''}</div>`;
  const head = `<div class="dh">${ico(t)}<div><div class="mut" style="font-weight:650">${esc(t.name)} · ${esc(t.symbol)}</div><div class="big num" data-px="${t.symbol}">${px(t.price)}</div></div>
    <div class="chg num ${cls(ch24(t))}" data-ch="${t.symbol}">${pct(ch24(t))}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${trendTag(I.trend)}${biasTag(P.bias)}${riskTag(j.risk)}</div></div>
    <p class="what">${esc(j.what || '')}</p>
    <div class="stats">${stat('7 days', pct(cg.price_change_percentage_7d_in_currency), '', cls(cg.price_change_percentage_7d_in_currency))}${stat('30 days', pct(cg.price_change_percentage_30d_in_currency), '', cls(cg.price_change_percentage_30d_in_currency))}
    ${stat('Market cap', big(cg.market_cap), cg.fully_diluted_valuation ? 'FDV ' + big(cg.fully_diluted_valuation) : '')}${stat('Volume 24h', big(cg.total_volume))}
    ${stat('All-time high', px(cg.ath), cg.ath_change_percentage != null ? pct(cg.ath_change_percentage, 1) + ' from ATH' : '')}${stat('Volatility (30d)', I.vol30 ? I.vol30.toFixed(0) + '%/yr' : '–', I.vol30 > 80 ? 'Wild swings' : I.vol30 > 50 ? 'Choppy' : 'Calm for crypto')}</div>`;
  const tabs = `<div class="tabs" role="tablist">${TABS.map((x) => `<button class="tab" role="tab" aria-selected="${S.tab === x}" data-tab="${x}">${x}</button>`).join('')}</div>`;
  el.innerHTML = head + tabs + `<div id="tabBody"></div>` + insights(t);
  renderTab(t);
}
function renderTab(t) {
  const I = t.I, P = I.plan, j = J(t.symbol), b = $('#tabBody'); killCharts();
  const lg = (items) => `<div class="legend">${items.map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('')}</div>`;
  const src = `${EXNAME[t._src.ex]} ${t._src.pair}`;
  if (S.tab === 'Price & MAs') {
    b.innerHTML = `<div class="row"><span class="sub">Daily candles · ${esc(src)}</span></div><div class="chart" id="ch1"></div>${lg([['MA20 short-term', '#5b8cff'], ['MA50 medium-term', '#f5b545'], ['MA200 long-term', '#c084fc']])}
      <p class="expl">Price above an average = that trend is up. Now: price is ${t.price > I.ma20 ? 'above' : 'below'} MA20 (${px(I.ma20)}), ${t.price > I.ma50 ? 'above' : 'below'} MA50 (${px(I.ma50)}) and ${I.ma200 ? (t.price > I.ma200 ? 'above' : 'below') + ' MA200 (' + px(I.ma200) + ')' : 'MA200 needs 200 days of history'}.</p>`;
    const c = mkChart('#ch1'); const cs = candles(c, t.d1); S.live = { candle: cs };
    line(c, t.d1, I.series.ma20, '#5b8cff'); line(c, t.d1, I.series.ma50, '#f5b545'); line(c, t.d1, I.series.ma200, '#c084fc'); fit(c, t.d1, 120);
  }
  if (S.tab === 'Trade Plan') {
    const p = t.price, em = (P.entry[0] + P.entry[1]) / 2;
    const dist = (x) => `<span class="${cls(x - p)}">${pct((x - p) / p * 100, 1)}</span>`;
    const rows = [
      ...P.tps.map((x, i) => [i, x]).reverse().map(([i, x]) => `<tr><td class="tl up">TP${i + 1}</td><td class="num">${px(x.price)}</td><td class="num">${dist(x.price)}</td><td class="num">${x.rr.toFixed(2)} : 1</td><td>Take-profit: sell part here (${esc(x.basis)}).</td></tr>`),
      ...P.res.filter((r) => !P.tps.some((x) => x.price === r)).map((r) => `<tr><td class="tl dn">Resistance</td><td class="num">${px(r)}</td><td class="num">${dist(r)}</td><td></td><td>A ceiling where sellers showed up before.</td></tr>`),
      `<tr class="now"><td class="tl">Now</td><td class="num" data-px="${t.symbol}">${px(p)}</td><td></td><td></td><td>Live price.</td></tr>`,
      `<tr><td class="tl warn">Entry zone</td><td class="num">${px(P.entry[0])} – ${px(P.entry[1])}</td><td class="num">${dist(P.entry[1])} / ${dist(P.entry[0])}</td><td></td><td>Where buying makes sense: near support, refined with ${esc(P.ref)}.</td></tr>`,
      ...P.sup.map((s, i) => `<tr><td class="tl up">Support ${i + 1}</td><td class="num">${px(s)}</td><td class="num">${dist(s)}</td><td></td><td>A floor where buyers stepped in before.</td></tr>`),
      `<tr><td class="tl dn">Stop-loss</td><td class="num">${px(P.stop)}</td><td class="num">${dist(P.stop)}</td><td class="num">risk ${pct(-(em - P.stop) / em * 100, 1)}</td><td>Exit if price closes here: entry-zone bottom minus 1× ATR(14) (${px(P.atr)}).</td></tr>`].join('');
    const bt = P.bias === 'Long' ? 'g' : P.bias === 'Avoid' ? 'r' : 'y';
    b.innerHTML = `<div class="callout ${bt}"><b class="bias">Setup: ${P.bias}</b>${esc(biasWhy(t))}${j.verdict_note ? `<div style="margin-top:6px"><b>Analyst note:</b> ${esc(j.verdict_note)}</div>` : ''}</div>
      <div class="row"><span class="sub">Levels from daily candles · entry refined on 4h (${esc(t.src4 ? EXNAME[t.src4.ex] : 'unavailable')})</span>
      <div class="tfsw" role="group" aria-label="Chart timeframe">${['1D', '4H'].map((x) => `<button aria-pressed="${S.tf === x}" data-tf="${x}">${x}</button>`).join('')}</div></div>
      <div class="chart" id="ch1"></div>${lg([['Entry zone', '#f5b545'], ['Stop-loss', '#f6465d'], ['Take-profit', '#22d399'], ['Support', '#5b8cff'], ['Resistance', '#c084fc']])}
      <div class="lv"><table><thead><tr><th class="tl">Level</th><th>Price</th><th>From now</th><th>Reward : risk</th><th>What it means</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="grid2" style="margin-top:12px"><div class="box"><h3>Fair value (estimate)</h3><div class="big num" style="font-size:24px;font-weight:750">${px(P.fair)} <span class="${cls(P.fair - p)}" style="font-size:14px">${pct((P.fair - p) / p * 100, 1)} vs now</span></div>
      <p class="expl" style="margin:6px 0 0">Method: average of the 50-day MA (${px(I.ma50)}), 200-day MA (${px(I.ma200)}) and 90-day VWAP (${px(P.vwap)}). A rough guide to where the market has "agreed" on price lately, not a valuation of the project.</p></div>
      <div class="callout y" style="margin:0"><b>Not financial advice.</b> These levels come from a formula applied to past prices. They are a study aid, not a signal; crypto can blow through any stop-loss.</div></div>
      <div class="ind" style="margin-top:12px">${[['Entry zone', 'The price range where buying has the best odds: near support, so the stop can sit close.'], ['Stop-loss (SL)', 'Where you admit the idea was wrong and sell to cap the loss.'], ['Take-profit (TP1/2/3)', 'Prices to sell parts of the position into strength, usually the next resistances.'], ['ATR(14)', `Average daily move (now ${px(P.atr)}). The stop sits 1 ATR below the zone so normal noise doesn't trigger it.`], ['Reward : risk', 'Potential gain ÷ potential loss from the middle of the entry zone. Aim for 1.5–2 : 1 or better.'], ['VWAP', 'Volume-weighted average price: the average price paid, weighting busy days more.'], ['Setup (Long / Wait / Avoid)', 'Long = trend, momentum and R:R line up now. Wait = decent but poor timing. Avoid = trend down.']].map(([n, s]) => `<div class="indr"><span class="n">${n}</span><span class="s">${s}</span></div>`).join('')}</div>`;
    const k = S.tf === '1D' ? t.d1 : (t.h4 || t.d1);
    const c = mkChart('#ch1'); const cs = candles(c, k); S.live = S.tf === '1D' ? { candle: cs } : {};
    const pl = (price, color, title, style = 0) => cs.createPriceLine({ price, color, lineWidth: 2, lineStyle: style, axisLabelVisible: true, title });
    pl(P.entry[1], '#f5b545', 'Entry top', 2); pl(P.entry[0], '#f5b545', 'Entry bottom', 2); pl(P.stop, '#f6465d', 'SL');
    P.tps.forEach((x, i) => pl(x.price, '#22d399', 'TP' + (i + 1)));
    P.sup.forEach((s, i) => { if (s !== P.entry[0]) pl(s, '#5b8cff', 'S' + (i + 1), 1); });
    P.res.filter((r) => !P.tps.some((x) => x.price === r)).forEach((r) => pl(r, '#c084fc', 'R', 1));
    fit(c, k, S.tf === '1D' ? 90 : 120);
  }
  if (S.tab === 'RSI & MACD') {
    const r = I.rsi, rt = r > 70 ? 'overbought: ran up fast, pullbacks are common' : r < 30 ? 'oversold: sold off hard, bounces are common' : r > 50 ? 'buyers slightly in control' : 'sellers slightly in control';
    b.innerHTML = `<div class="row"><b>RSI (14): <span class="${r > 70 ? 'dn' : r < 30 ? 'up' : ''}">${r.toFixed(1)}</span></b><span class="sub">${rt}</span></div><div class="chart sm" id="ch1"></div>
      <p class="expl">Above 70 = overbought, below 30 = oversold, 50 = balanced.</p>
      <div class="row"><b>MACD: <span class="${cls(I.hist)}">${I.hist > 0 ? 'momentum up' : 'momentum down'}</span></b><span class="sub">MACD ${I.macd.toPrecision(3)} · signal ${I.sig.toPrecision(3)}</span></div><div class="chart sm" id="ch2"></div>
      ${lg([['MACD line', '#5b8cff'], ['Signal line', '#f5b545'], ['Histogram', '#22d399']])}<p class="expl">When the MACD line is above its signal line (green bars), momentum is turning up; red bars mean it is fading.</p>`;
    const c1 = mkChart('#ch1'); const rs = line(c1, t.d1, I.series.rsi, '#c084fc');
    rs.createPriceLine({ price: 70, color: '#f6465d', lineStyle: 2, lineWidth: 1, title: '70' }); rs.createPriceLine({ price: 30, color: '#22d399', lineStyle: 2, lineWidth: 1, title: '30' });
    fit(c1, t.d1, 120);
    const c2 = mkChart('#ch2'); const h = c2.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });
    h.setData(t.d1.map((x, i) => I.series.hist[i] == null ? null : { time: ts(x.t), value: I.series.hist[i], color: I.series.hist[i] >= 0 ? 'rgba(34,211,153,.6)' : 'rgba(246,70,93,.6)' }).filter(Boolean));
    line(c2, t.d1, I.series.macd, '#5b8cff'); line(c2, t.d1, I.series.sig, '#f5b545'); fit(c2, t.d1, 120); syncCharts(c1, c2);
  }
  if (S.tab === 'Volume') {
    const v = t.d1.slice(-30).map((x) => x.q), avg = v.reduce((a, b) => a + b, 0) / v.length, today = t.d1[t.d1.length - 2].q;
    b.innerHTML = `<div class="row"><b>Yesterday ${big(today)}</b><span class="sub">30-day average ${big(avg)} · ${esc(src)} only</span></div><div class="chart" id="ch1"></div>
      <p class="expl">Daily USD volume on ${esc(EXNAME[t._src.ex])} (green = up day, red = down day). Price moves on rising volume are more trustworthy; moves on thin volume fade easily. Total volume across all exchanges is ${big((S.cg[t.coingecko] || {}).total_volume)} (CoinGecko).</p>`;
    const c = mkChart('#ch1'); const h = c.addHistogramSeries({ priceFormat: { type: 'custom', formatter: big }, priceLineVisible: false });
    h.setData(t.d1.map((x) => ({ time: ts(x.t), value: x.q, color: x.c >= x.o ? 'rgba(34,211,153,.65)' : 'rgba(246,70,93,.65)' }))); fit(c, t.d1, 120);
  }
  if (S.tab === 'Bollinger') {
    const pos = (t.price - I.bbLo) / (I.bbUp - I.bbLo) * 100;
    b.innerHTML = `<div class="row"><b>Band position: ${pos.toFixed(0)}%</b><span class="sub">Upper ${px(I.bbUp)} · mid ${px(I.bbMid)} · lower ${px(I.bbLo)}</span></div><div class="chart" id="ch1"></div>
      ${lg([['Upper band', '#f6465d'], ['Middle (MA20)', '#5b8cff'], ['Lower band', '#22d399']])}
      <p class="expl">Bollinger bands (20, 2σ): near the upper band = stretched high, near the lower band = stretched low. A narrow band often comes before a big move. Now: ${pos > 80 ? 'near the top band' : pos < 20 ? 'near the bottom band' : 'mid-channel'}.</p>`;
    const c = mkChart('#ch1'); const cs = candles(c, t.d1); S.live = { candle: cs };
    line(c, t.d1, I.series.bbUp, '#f6465d'); line(c, t.d1, I.series.bbMid, '#5b8cff', 1); line(c, t.d1, I.series.bbLo, '#22d399'); fit(c, t.d1, 120);
  }
}
function insights(t) {
  const I = t.I, j = J(t.symbol); const r = I.rsi;
  const ind = [
    ['RSI (14)', r.toFixed(1), r > 70 ? 'Overbought: ran up fast.' : r < 30 ? 'Oversold: sold off hard.' : r > 50 ? 'Leaning bullish.' : 'Leaning bearish.'],
    ['Trend (MA50 / MA200)', I.trend, `Price vs MA50 ${px(I.ma50)} and MA200 ${I.ma200 ? px(I.ma200) : 'n/a'}.`],
    ['MACD', I.hist > 0 ? 'Positive' : 'Negative', I.hist > 0 ? 'Momentum building up.' : 'Momentum fading.'],
    ['Bollinger', ((t.price - I.bbLo) / (I.bbUp - I.bbLo) * 100).toFixed(0) + '%', 'Where price sits inside its normal 20-day range (0% bottom, 100% top).'],
    ['Volatility', I.vol30 ? I.vol30.toFixed(0) + '%/yr' : '–', 'How violently it swings. Size positions smaller when this is high.']];
  const list = (a) => `<ul class="bl">${(a || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const stale = S.judg && S.judg.updated ? `<span class="note">Analysis written ${esc(S.judg.updated_label || S.judg.updated)}</span>` : '';
  return `<div class="sec-h" style="margin-top:18px"><h2>Indicators, explained</h2><span class="sub">Recomputed live from ${esc(EXNAME[t._src.ex])}</span></div>
    <div class="ind">${ind.map(([n, v, s]) => `<div class="indr"><span class="n">${n}</span><b class="num">${esc(v)}</b><span class="s">${s}</span></div>`).join('')}</div>
    ${S.errors.judg ? `<div class="err">Daily analysis failed to load (${esc(S.errors.judg)}). Live data still works.</div>` : `
    <div class="sec-h" style="margin-top:18px"><h2>Pro take</h2>${stale}</div><div class="box" style="font-size:14.5px">${esc(j.take || 'No analysis yet for this token.')}</div>
    <div class="grid2" style="margin-top:12px"><div class="box"><h3 class="up">Bull case</h3>${list(j.bull)}</div><div class="box"><h3 class="dn">Bear case</h3>${list(j.bear)}</div></div>
    <div class="box" style="margin-top:12px"><h3>What to watch</h3>${list(j.watch)}</div>
    <div class="sec-h" style="margin-top:18px"><h2>Mood on X</h2>${j.sentiment ? `<span class="tag ${j.sentiment === 'Bullish' ? 'g' : j.sentiment === 'Bearish' ? 'r' : 'y'}">${esc(j.sentiment)}</span>` : ''}</div><p style="margin:0;font-size:14px">${esc(j.sentiment_note || '–')}</p>
    <div class="sec-h" style="margin-top:18px"><h2>News</h2></div><div class="news">${(j.news || []).map((n) => `<a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}<small>${esc(n.source)} ↗</small></a>`).join('') || '<p class="mut">No news saved.</p>'}</div>`}`;
}
function renderGlossary() {
  const g = (S.judg && S.judg.glossary) || [];
  $('#glossary').innerHTML = `<div class="gl">${g.map((x) => `<div><b>${esc(x.term)}</b>${esc(x.def)}</div>`).join('')}</div>`;
}
function renderSources() {
  const s = S.cfg.filter((t) => t._src).map((t) => `${t.symbol}: ${EXNAME[t._src.ex]}`).join(' · ');
  const errs = Object.values(S.errors).filter(Boolean);
  $('#sources').innerHTML = `Prices &amp; candles — ${esc(s)}. Market cap &amp; ATH: CoinGecko. Fear &amp; Greed: alternative.me.` + (errs.length ? `<br><span class="dn">${errs.map(esc).join(' · ')}</span>` : '');
}
function renderAll(soft) {
  renderStatus(); renderMarket(); renderOverview(); renderTokbar(); renderGlossary(); renderSources();
  if (soft && S.sel && $('#tabBody')) { const t = S.cfg.find((x) => x.symbol === S.sel); if (t && t.I) { const y = scrollY; renderDetail(true); scrollTo(0, y); return; } }
  renderDetail();
}

/* ---------- charts ---------- */
const ts = (ms) => Math.floor(ms / 1000) + 9 * 3600; // shift to JST wall-clock
function themeColors() { const cs = getComputedStyle(document.documentElement); return { bg: cs.getPropertyValue('--card').trim(), tx: cs.getPropertyValue('--tx2').trim(), line: cs.getPropertyValue('--line').trim() }; }
function mkChart(sel) {
  const el = $(sel), th = themeColors();
  const c = LightweightCharts.createChart(el, { autoSize: true, layout: { background: { color: th.bg }, textColor: th.tx, fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' },
    grid: { vertLines: { color: th.line + '66' }, horzLines: { color: th.line + '66' } }, rightPriceScale: { borderColor: th.line }, timeScale: { borderColor: th.line, timeVisible: S.tab === 'Trade Plan' && S.tf === '4H' },
    crosshair: { mode: 0 }, handleScroll: { vertTouchDrag: false }, localization: { priceFormatter: (v) => Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : Math.abs(v) >= 1 ? v.toFixed(2) : v.toPrecision(4) } });
  S.charts.push(c); return c;
}
function candles(c, k) { const s = c.addCandlestickSeries({ upColor: '#22d399', downColor: '#f6465d', borderVisible: false, wickUpColor: '#22d399', wickDownColor: '#f6465d' }); s.setData(k.map((x) => ({ time: ts(x.t), open: x.o, high: x.h, low: x.l, close: x.c }))); return s; }
function line(c, k, vals, color, w = 2) { const s = c.addLineSeries({ color, lineWidth: w, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }); s.setData(k.map((x, i) => vals[i] == null ? null : { time: ts(x.t), value: vals[i] }).filter(Boolean)); return s; }
function fit(c, k, n) { const a = k.length; c.timeScale().setVisibleLogicalRange({ from: Math.max(0, a - n), to: a + 2 }); }
function syncCharts(a, b) { let lock = false; const f = (src, dst) => src.timeScale().subscribeVisibleLogicalRangeChange((r) => { if (lock || !r) return; lock = true; dst.timeScale().setVisibleLogicalRange(r); lock = false; }); f(a, b); f(b, a); }
function killCharts() { S.charts.forEach((c) => { try { c.remove(); } catch (e) {} }); S.charts = []; S.live = null; }

/* ---------- events ---------- */
function select(sym, scroll) {
  S.sel = sym; try { localStorage.setItem('cw-sel', sym); } catch (e) {}
  renderOverview(); renderTokbar(); renderDetail();
  if (scroll) $('#detailSec').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.addEventListener('click', (e) => {
  const s = e.target.closest('[data-sel]'); if (s) return select(s.dataset.sel, !s.classList.contains('tokbtn'));
  const tb = e.target.closest('[data-tab]'); if (tb) { S.tab = tb.dataset.tab; document.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x.dataset.tab === S.tab)); return renderTab(S.cfg.find((x) => x.symbol === S.sel)); }
  const tf = e.target.closest('[data-tf]'); if (tf) { S.tf = tf.dataset.tf; return renderTab(S.cfg.find((x) => x.symbol === S.sel)); }
  const r = e.target.closest('[data-retry]'); if (r) { const t = S.cfg.find((x) => x.symbol === r.dataset.retry); t.err = null; renderAll(); loadToken(t).then(() => renderAll()); }
});
$('#refreshBtn').onclick = () => refreshAll(true);
$('#themeBtn').onclick = () => {
  const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n;
  try { localStorage.setItem('cw-theme', n); } catch (e) {}
  $('#themeColor').content = n === 'dark' ? '#0b0e14' : '#f4f6fa'; if (S.sel) renderTab(S.cfg.find((x) => x.symbol === S.sel));
};
addEventListener('online', () => { renderStatus(); refreshAll(); });
addEventListener('offline', renderStatus);
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - S.lastOk > 60e3) refreshAll(); });

/* ---------- boot ---------- */
(async function boot() {
  if (document.documentElement.dataset.theme === 'light') $('#themeColor').content = '#f4f6fa';
  renderMarket();
  try { S.cfg = (await getJSON('tokens.json?ts=' + Date.now())).tokens; }
  catch (e) { $('#overview').innerHTML = `<div class="err">Couldn't load tokens.json (${esc(e.message)}). <button onclick="location.reload()">Reload</button></div>`; return; }
  let saved = null; try { saved = localStorage.getItem('cw-sel'); } catch (e) {}
  S.sel = S.cfg.some((t) => t.symbol === saved) ? saved : S.cfg[0]?.symbol;
  renderAll(); await refreshAll();
  setInterval(refreshCandles, 60e3);
  setInterval(() => { if (!document.hidden) Promise.all([loadCG(), loadGlobal()]).then(() => { renderMarket(); renderSources(); }); }, 5 * 60e3);
  setInterval(renderStatus, 5e3);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
