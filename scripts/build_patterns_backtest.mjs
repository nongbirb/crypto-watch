// Walk-forward backtest of the pattern engine (patterns.js) on real exchange candles. Keyless public APIs only.
// At each step only candles up to that bar are given to the detector (no lookahead). Each newly detected pattern
// (forming or confirmed) is recorded with the score it showed at that moment, then resolved on later candles:
// hit = target reached before invalidation, miss = invalidation close first, open/stale = excluded from hit rate.
import { createRequire } from 'module'; import fs from 'fs'; import { nEffResolved } from './proof-lib.mjs';
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
  const exs = new Set(t.sources.map((x) => x.ex));
  if (exs.has('binance')) try { const k = await getJ(`https://data-api.binance.vision/api/v3/klines?symbol=${s}USDT&interval=${b}&limit=1000`); if (k.length >= 60) return { src: 'Binance ' + s + 'USDT', k: k.map((x) => ({ t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], q: +x[7] })) }; } catch (e) { errs.push('binance ' + e.message); }
  if (exs.has('bybit')) try { const r = await getJ(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${s}USDT&interval=${y}&limit=1000`); const k = r.result.list.map((x) => ({ t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], q: +x[6] })).reverse(); if (k.length >= 60) return { src: 'Bybit ' + s + 'USDT', k }; } catch (e) { errs.push('bybit ' + e.message); }
  try { let all = [], after = ''; for (let p = 0; p < 4; p++) { const r = await getJ(`https://www.okx.com/api/v5/market/history-candles?instId=${s}-USDT&bar=${o}&limit=100${after}`); if (!r.data || !r.data.length) break; all = all.concat(r.data); after = '&after=' + r.data[r.data.length - 1][0]; await sleep(250); }
    const k = all.map((x) => ({ t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], q: +x[7] })).filter((x) => x.t).reverse(); if (k.length >= 60) return { src: 'OKX ' + s + '-USDT', k }; } catch (e) { errs.push('okx ' + e.message); }
  throw new Error((errs.length ? errs.join('; ') + '; ' : '') + 'fewer than 60 candles available');
}
// Each step keeps ALL candidates with their score parts, so any weight set can be replayed with the app's exact selection rule
// (best per type, score >= 35, top 3). Split by detection time: first 70% of steps = TRAIN (resolved only on candles before the
// split, so nothing from the future leaks into tuning), last 30% = TEST (never used for tuning).
const SPLIT = 0.7, W0 = { ...PE.W }, MINB = 10;
const score = (p, w) => Math.round(w.fit * p.fit + w.vol * p.vol + w.comp * p.comp + w.hist * p.hist) - (p.inv ? 15 : 0);
const lbl = (st) => st === 'hit' ? 'hit' : st === 'inv' ? 'miss' : 'open';
function collect(kAll, tf) {
  const k = kAll.slice(0, -1), steps = [], X = new Map(), cut = WARM + Math.floor(SPLIT * (k.length - WARM));
  for (let e = WARM; e <= k.length; e += STEP[tf]) {
    const r = PE.analyze(k.slice(0, e), { all: true }); const st = [];
    r.cands.forEach((x) => { if (x.o.st === 'inv') return; const key = x.type + ':' + x.from + ':' + x.end; if (!X.has(key)) X.set(key, x);
      st.push({ key, type: x.type, p: { fit: x.score.fit, vol: x.score.vol, comp: x.score.comp, hist: x.score.hist, inv: false } }); });
    steps.push({ e, st });
  }
  const R = {}; const kTr = k.slice(0, cut);
  X.forEach((x, key) => { const c = Object.assign(Object.create(Object.getPrototypeOf(x)), x); const oT = x.end < cut - 1 ? PE.resolve(kTr, c) : { st: 'open' }; const oF = PE.resolve(k, x);
    R[key] = { full: lbl(oF.st), train: lbl(oT.st), atF: oF.at, atT: oT.at }; });
  return { steps, res: R, cut };
}
function replay(S, w, part) { // part: 'all' | 'train' | 'test'
  const seen = new Map();
  S.steps.forEach(({ e, st }) => { if (part === 'train' && e >= S.cut) return; if (part === 'test' && e < S.cut) return;
    const best = {}; st.forEach((c) => { const v = score(c.p, w); if (!best[c.type] || best[c.type].v < v) best[c.type] = { ...c, v }; });
    Object.values(best).filter((c) => c.v >= 35).sort((a, b) => b.v - a.v).slice(0, 3).forEach((c) => { if (!seen.has(c.key)) seen.set(c.key, { ...c, e }); }); });
  // e - 1 = bar the pattern was first shown on; at = bar it resolved (hit or invalidation) on the same series
  return [...seen.values()].map((c) => ({ type: c.type, conf: c.v, st: S.res[c.key][part === 'train' ? 'train' : 'full'], e: c.e, at: S.res[c.key][part === 'train' ? 'atT' : 'atF'] }));
}
const agg = (recs) => BANDS.map(([b, lo, hi]) => { const r = recs.filter((x) => x.conf >= lo && x.conf <= hi), hit = r.filter((x) => x.st === 'hit').length, miss = r.filter((x) => x.st === 'miss').length, n = hit + miss;
  return { band: b, n, hit, miss, open: r.length - n, rate: n ? Math.round(1000 * hit / n) / 10 : null }; });
// nEff (docs/architect-proof-layer.md §2.2): per token, timeframe and type, a pattern shown before the previous counted one
// resolved is skipped, so overlapping cases of one move count once. Display gate for pattern types reads nEff (section 0 rule).
const byType = (recs) => { const o = {}, g = {}; recs.forEach((x) => { if (x.st === 'open') return; const a = o[x.type] || (o[x.type] = { n: 0, hit: 0 }); a.n++; if (x.st === 'hit') a.hit++;
    const gk = x.type + '|' + (x.sym || '') + '|' + (x.tf || ''); (g[gk] || (g[gk] = [])).push({ at0: x.e - 1, at1: x.at }); });
  Object.values(o).forEach((a) => { a.rate = Math.round(1000 * a.hit / a.n) / 10; a.nEff = 0; });
  Object.entries(g).forEach(([gk, l]) => { o[gk.split('|')[0]].nEff += nEffResolved(l); }); return o; };
// calibration quality: AUC (does a higher score rank hits above misses?) + band monotonicity over bands with n >= MINB
function auc(recs) { const r = recs.filter((x) => x.st !== 'open'); const P = r.filter((x) => x.st === 'hit').map((x) => x.conf), N = r.filter((x) => x.st === 'miss').map((x) => x.conf); if (!P.length || !N.length) return null;
  let s = 0; P.forEach((p) => N.forEach((q) => { s += p > q ? 1 : p === q ? 0.5 : 0; })); return Math.round(1e4 * s / (P.length * N.length)) / 1e4; }
function mono(bands) { const r = bands.filter((b) => b.n >= MINB).map((b) => b.rate); return r.length >= 2 && r.every((v, i) => !i || v >= r[i - 1]); }

const out = { updated: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), method: 'walk-forward, no lookahead; hit = target before invalidation; open/stale excluded; min n for a band rate = 10; types carry nEff (a pattern shown before the previous counted one of the same token, timeframe and type resolved is not counted); pattern-type display gate uses nEff >= 30', bands: BANDS.map((b) => b[0]), weights: W0, series: {}, all: {}, types: {} };
const SER = [];
for (const t of TOK) { out.series[t.symbol] = {};
  for (const tf of Object.keys(TFS)) {
    try { const { src, k } = await candles(t, tf); const t0 = Date.now(); const S = collect(k, tf); S.sym = t.symbol; S.tf = tf; SER.push(S); const recs = replay(S, W0, 'all');
      out.series[t.symbol][tf] = { src, candles: k.length - 1, from: k[0].t, to: k[k.length - 2].t, patterns: recs.length, bands: agg(recs) };
      console.log(t.symbol, tf, src, k.length, 'patterns', recs.length, (Date.now() - t0) + 'ms', JSON.stringify(agg(recs).map((b) => [b.band, b.n, b.rate]))); }
    catch (e) { out.series[t.symbol][tf] = { err: String(e.message || e).slice(0, 200) }; console.log(t.symbol, tf, 'FAIL', e.message); }
  } }
if (SER.length < 8) { console.log('FAIL: too few series', SER.length); process.exit(1); }
const run = (w, part) => SER.flatMap((S) => replay(S, w, part).map((r) => ({ ...r, tf: S.tf, sym: S.sym })));
// tune on TRAIN only: grid over weights (step 0.1, each >= 0.1); must beat current by > 0.005 AUC on train to be a candidate
let bestW = W0, bestA = auc(run(W0, 'train'));
for (let a = 1; a <= 7; a++) for (let b = 1; b <= 7; b++) for (let c = 1; c <= 7; c++) { const d = 10 - a - b - c; if (d < 1) continue;
  const w = { fit: a / 10, vol: b / 10, comp: c / 10, hist: d / 10 }; const A = auc(run(w, 'train')); if (A != null && A > bestA + 0.005) { bestA = A; bestW = w; } }
const evalW = (w) => { const te = run(w, 'test'), tr = run(w, 'train'); return { weights: w, train: { auc: auc(tr), bands: agg(tr) }, test: { auc: auc(te), bands: agg(te), mono: mono(agg(te)), types: byType(te) } }; };
const cur = evalW(W0), cand = evalW(bestW);
const better = bestW !== W0 && cand.test.auc != null && cur.test.auc != null && cand.test.auc > cur.test.auc && cand.test.mono;
out.oos = { split: SPLIT, rule: 'ship tuned weights only if held-out AUC improves AND held-out band hit rates rise monotonically (bands with n>=10)', current: cur, tuned: cand, shipped: better ? 'tuned' : 'current' };
const SHIP = better ? bestW : W0; out.weights = SHIP;
if (better) { const f = 'patterns.js', src = fs.readFileSync(f, 'utf8'); fs.writeFileSync(f, src.replace(/const W = \{[^}]*\};/, `const W = { fit: ${SHIP.fit}, vol: ${SHIP.vol}, comp: ${SHIP.comp}, hist: ${SHIP.hist} };`)); }
SER.forEach((S) => { const recs = replay(S, SHIP, 'all'); out.series[S.sym][S.tf].patterns = recs.length; out.series[S.sym][S.tf].bands = agg(recs); out.series[S.sym][S.tf].types = byType(recs); });
const every = run(SHIP, 'all');
for (const tf of Object.keys(TFS)) { const r = every.filter((x) => x.tf === tf); out.all[tf] = agg(r); out.types[tf] = byType(r); }
out.all.any = agg(every); out.types.any = byType(every);
fs.writeFileSync('patterns_backtest.json', JSON.stringify(out));
const sh = (e) => JSON.stringify({ w: e.weights, trainAuc: e.train.auc, testAuc: e.test.auc, mono: e.test.mono, bands: e.test.bands.map((b) => [b.band, b.n, b.rate]) });
console.log('OOS current', sh(cur)); console.log('OOS tuned  ', sh(cand));
console.log('test types (current)', JSON.stringify(cur.test.types)); console.log('test types (tuned)', JSON.stringify(cand.test.types));
console.log('shipped', out.oos.shipped, 'series ok', SER.length, 'all', JSON.stringify(out.all.any.map((b) => [b.band, b.n, b.rate])), 'types', JSON.stringify(out.types.any));
