import { createRequire } from 'module'; import fs from 'fs'; const require = createRequire(import.meta.url); const PE = require('./patterns_engine.js');
const toks = JSON.parse(fs.readFileSync('tokens.json')).tokens;
const IV = { binance: { '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w' }, bybit: { '1h': '60', '4h': '240', '1d': 'D', '1w': 'W' }, okx: { '1h': '1H', '4h': '4H', '1d': '1Dutc', '1w': '1Wutc' }, hyperliquid: { '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w' } };
const J = async (u, o) => { const r = await fetch(u, o); if (!r.ok) throw new Error(r.status); return r.json(); };
async function kl(s, tf) { const i = IV[s.ex][tf];
  if (s.ex === 'binance') { let r; try { r = await J(`https://api.binance.com/api/v3/klines?symbol=${s.pair}&interval=${i}&limit=1000`); } catch (e) { r = await J(`https://data-api.binance.vision/api/v3/klines?symbol=${s.pair}&interval=${i}&limit=1000`); } return r.map((x) => ({ t: x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], q: +x[7] })); }
  if (s.ex === 'bybit') { const r = await J(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${s.pair}&interval=${i}&limit=1000`); return r.result.list.map((x) => ({ t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], q: +x[6] })).reverse(); }
  if (s.ex === 'okx') { const r = await J(`https://www.okx.com/api/v5/market/candles?instId=${s.pair}&bar=${i}&limit=300`); return r.data.map((x) => ({ t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], q: +x[7] })).reverse(); }
  if (s.ex === 'hyperliquid') { const ms = { '1h': 36e5, '4h': 144e5, '1d': 864e5, '1w': 6048e5 }[tf]; const r = await J('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'candleSnapshot', req: { coin: s.pair, interval: i, startTime: Date.now() - 1000 * ms } }) }); return r.map((x) => ({ t: x.t, o: +x.o, h: +x.h, l: +x.l, c: +x.c, v: +x.v, q: +x.v * +x.c })); }
  throw new Error('skip'); }
const out = {};
for (const t of toks) for (const tf of ['1h', '4h', '1d', '1w']) { let k = null, src;
  for (const s of t.sources) { try { const kk = await kl(s, tf); if (!k || kk.length > k.length) { k = kk; src = s.ex; } if (k.length >= 300) break; } catch (e) {} }
  if (!k) { console.log(t.symbol, tf, 'NO DATA'); continue; }
  fs.mkdirSync('/tmp/kc', { recursive: true }); fs.writeFileSync(`/tmp/kc/${t.symbol}_${tf}.json`, JSON.stringify(k));
  const r = PE.analyze(k); console.log(t.symbol.padEnd(6), tf, src, k.length, r.cands.map((x) => `${x.type}(${x.o.st},${x.conf}; fit${x.score.fit} v${x.score.vol} c${x.score.comp} h${x.score.w}/${x.score.y})`).join(' | ') || '—', '| S', r.zones.sup ? r.zones.sup.lo.toPrecision(4) + '-' + r.zones.sup.hi.toPrecision(4) + 'x' + r.zones.sup.n : '-', 'R', r.zones.res ? r.zones.res.lo.toPrecision(4) + '-' + r.zones.res.hi.toPrecision(4) + 'x' + r.zones.res.n : '-'); }
