// Walk-forward backtest of the pattern engine (patterns.js) on real exchange candles. Keyless public APIs only.
// At each step only candles up to that bar are given to the detector (no lookahead). Each newly detected pattern
// (forming or confirmed) is recorded with the score it showed at that moment, then resolved on later candles:
// hit = target reached before invalidation, miss = invalidation close first, open/stale = excluded from hit rate.
import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire(import.meta.url); const PE = require('../patterns.js');
const TOK = JSON.parse(fs.readFileSync('tokens.json', 'utf8')).tokens;
const TFS = { '1h': ['1h', '1H', '60'], '4h': ['4h', '4H', '240'], '1d': ['1d', '1Dutc', 'D'], '1w': ['1w', '1Wutc', 'W'] };
const BANDS = [['<50', 0, 49], ['50-69', 50, 69], ['70-84', 70, 84], ['85+', 85, 999]];
const STEP = { '1h': 4, '4h': 3, '1d': 2, '1w': 1 }, WARM = 120;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJ(u) { for (let i = 0; i < 3; i++) { try { const r = await fetch(u, { headers: { 'user-agent': 'kms-capital' } }); if (r.ok) return await r.json(); throw new Error('HTTP ' + r.status); } catch (e) { if (i === 2) throw e; await sleep(1500 * (i + 1)); } } }
const sym = (t) => t.symbol;
async function candles(t, tf) {
  const [b, o, y] = TFS[tf], s = sym(t), errs = [];
  try { const k = await getJ(`https://data-api.binance.vision/api/v3/klines?symbol=${s}USDT&interval=${b}&limit=1000`); if (k.length >= 60) return { src: 'Binance ' + s + 'USDT', k: k.map((x) => ({ t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], q: +x[7] })) }; } catch (e) { errs.push('binance ' + e.message); }
  try { const r = await getJ(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${s}USDT&interval=${y}&limit=1000`); const k = r.result.list.map((x) => ({ t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], q: +x[6] })).reverse(); if (k.length >= 60) return { src: 'Bybit ' + s + 'USDT', k }; } catch (e) { errs.push('bybit ' + e.message); }
  try { let all = [], after = ''; for (let p = 0; p < 4; p++) { const r = await getJ(`https://www.okx.com/api/v5/market/history-candles?instId=${s}-USDT&bar=${o}&limit=100${after}`); if (!r.data || !r.data.length) break; all = all.concat(r.data); after = '&after=' + r.data[r.data.length - 1][0]; await sleep(250); }
    const k = all.map((x) => ({ t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], q: +x[7] })).filter((x) => x.t).reverse(); if (k.length >= 60) return { src: 'OKX ' + s + '-USDT', k }; } catch (e) { errs.push('okx ' + e.message); }
  throw new Error((errs.length ? errs.join('; ') + '; ' : '') + 'fewer than 60 candles available');
}
const done = (k) => { const n = k.length; return n && Date.now() - k[n - 1].t < 0 ? k.slice(0, -1) : k; };
function run(kAll, tf) {
  // drop the still-open last candle (its close is not final)
  const k = kAll.slice(0, -1), seen = new Map();
  for (let e = WARM; e <= k.length; e += STEP[tf]) {
    const r = PE.analyze(k.slice(0, e)); if (!r.cands) continue;
    r.cands.forEach((x) => { if (x.o.st === 'inv') return; const key = x.type + ':' + x.from + ':' + x.end; if (!seen.has(key)) seen.set(key, { x, conf: x.conf, at: e }); });
  }
  const recs = [];
  seen.forEach(({ x, conf }) => { const o = PE.resolve(k, x); recs.push({ type: x.type, conf, st: o.st === 'hit' ? 'hit' : o.st === 'inv' ? 'miss' : 'open' }); });
  return recs;
}
const agg = (recs) => BANDS.map(([b, lo, hi]) => { const r = recs.filter((x) => x.conf >= lo && x.conf <= hi), hit = r.filter((x) => x.st === 'hit').length, miss = r.filter((x) => x.st === 'miss').length, n = hit + miss;
  return { band: b, n, hit, miss, open: r.length - n, rate: n ? Math.round(1000 * hit / n) / 10 : null }; });
const out = { updated: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), method: 'walk-forward, no lookahead; hit = target before invalidation; open/stale excluded; min n for a rate = 10', bands: BANDS.map((b) => b[0]), series: {}, all: {} };
const ALL = { '1h': [], '4h': [], '1d': [], '1w': [] }, every = [];
for (const t of TOK) { out.series[t.symbol] = {};
  for (const tf of Object.keys(TFS)) {
    try { const { src, k } = await candles(t, tf); const t0 = Date.now(); const recs = run(k, tf); ALL[tf].push(...recs); every.push(...recs);
      out.series[t.symbol][tf] = { src, candles: k.length - 1, from: k[0].t, to: k[k.length - 2].t, patterns: recs.length, bands: agg(recs) };
      console.log(t.symbol, tf, src, k.length, 'patterns', recs.length, (Date.now() - t0) + 'ms', JSON.stringify(agg(recs).map((b) => [b.band, b.n, b.rate]))); }
    catch (e) { out.series[t.symbol][tf] = { err: String(e.message || e).slice(0, 200) }; console.log(t.symbol, tf, 'FAIL', e.message); }
  } }
for (const tf of Object.keys(ALL)) out.all[tf] = agg(ALL[tf]);
out.all.any = agg(every);
const ok = Object.values(out.series).flatMap((s) => Object.values(s)).filter((x) => !x.err).length;
if (ok < 8) { console.log('FAIL: too few series', ok); process.exit(1); }
fs.writeFileSync('patterns_backtest.json', JSON.stringify(out));
console.log('series ok', ok, 'all', JSON.stringify(out.all.any));
