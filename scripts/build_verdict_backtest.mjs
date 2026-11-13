// Verdict backtest (docs/architect-proof-layer.md §2.2). Keyless public APIs only. Usage: node scripts/build_verdict_backtest.mjs [out.json]
// For every tracked token: fetch all daily history the venue gives (paginated), drop the open candle, then walk bar by bar.
// At each closed bar with 200+ bars of history the Long / Wait / Avoid state is computed by verdict-core.js from bars up to
// that bar only (no lookahead), on the same 299-bar window the app uses. Forward returns are read from later closes.
// Sample size: forward windows of consecutive days overlap, so every figure carries nEff (non-overlapping count) and a
// moving-block bootstrap interval (block = horizon, 1,000 resamples, fixed seed). Nothing here is tuned: there is no parameter.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { VC, DAY, HORIZONS, MIN_NEFF, WINDOW, BOOT, r2, walk, forward, tpBeforeStop, summarize, nEffResolved, blockBoot, seedOf, quantile, closedOnly } from './proof-lib.mjs';

const OUT = process.argv[2] || 'verdict_backtest.json';
const TOK = JSON.parse(fs.readFileSync('tokens.json', 'utf8')).tokens;
const SPLIT = 0.7, TP_MAX_BARS = 90, SHORT_YEARS = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJ(u, opt) { for (let i = 0; i < 4; i++) { try { const r = await fetch(u, { ...opt, headers: { 'user-agent': 'kms-capital', ...(opt && opt.headers) } }); if (r.ok) return await r.json(); throw new Error('HTTP ' + r.status); } catch (e) { if (i === 3) throw e; await sleep(1500 * (i + 1)); } } }
const bar = (t, o, h, l, c, v, q) => ({ t: +t, o: +o, h: +h, l: +l, c: +c, v: +v, q: +q });

/* ---------- full daily history per venue (paginated) ---------- */
async function binance(pair) {
  let out = [], start = Date.UTC(2017, 0, 1);
  for (let p = 0; p < 20; p++) { const r = await getJ(`https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=1d&startTime=${start}&limit=1000`);
    if (!Array.isArray(r) || !r.length) break; out = out.concat(r.map((x) => bar(x[0], x[1], x[2], x[3], x[4], x[5], x[7]))); if (r.length < 1000) break; start = +r[r.length - 1][0] + DAY; await sleep(200); }
  return out;
}
async function bybit(pair) {
  let out = [], end = Date.now();
  for (let p = 0; p < 20; p++) { const r = await getJ(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${pair}&interval=D&limit=1000&end=${end}`);
    if (r.retCode !== 0) throw new Error(r.retMsg); const l = r.result.list; if (!l.length) break; out = out.concat(l.map((x) => bar(x[0], x[1], x[2], x[3], x[4], x[5], x[6])));
    if (l.length < 1000) break; end = +l[l.length - 1][0] - 1; await sleep(200); }
  return out;
}
async function okx(pair) {
  let out = [], after = '';
  for (let p = 0; p < 60; p++) { const r = await getJ(`https://www.okx.com/api/v5/market/history-candles?instId=${pair}&bar=1Dutc&limit=100${after}`);
    if (r.code !== '0') throw new Error(r.msg); if (!r.data || !r.data.length) break; out = out.concat(r.data.map((x) => bar(x[0], x[1], x[2], x[3], x[4], x[5], x[7])));
    if (r.data.length < 100) break; after = '&after=' + r.data[r.data.length - 1][0]; await sleep(220); }
  return out;
}
async function hyperliquid(pair) { // the Info API returns at most the latest 5,000 candles
  const r = await getJ('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'candleSnapshot', req: { coin: pair, interval: '1d', startTime: 0 } }) });
  return r.map((x) => bar(x.t, x.o, x.h, x.l, x.c, x.v, +x.v * +x.c));
}
const FETCH = { binance, bybit, okx, hyperliquid }, EXN = { binance: 'Binance', bybit: 'Bybit', okx: 'OKX', hyperliquid: 'Hyperliquid' };
function clean(k) { // ascending, unique, UTC-midnight bars with sane numbers only
  const m = new Map(); for (const x of k) if ([x.t, x.o, x.h, x.l, x.c].every(Number.isFinite) && x.c > 0 && x.h >= x.l && x.t % DAY === 0) m.set(x.t, { ...x, q: Number.isFinite(x.q) && x.q >= 0 ? x.q : 0 });
  return [...m.values()].sort((a, b) => a.t - b.t);
}
/* every source in tokens.json is tried; the one with the longest closed history is used (one venue per token, never stitched) */
async function history(t, now) {
  let best = null; const errs = [];
  for (const s of t.sources) { try { const k = closedOnly(clean(await FETCH[s.ex](s.pair)), now);
    if (k.length && now - k[k.length - 1].t > 3 * DAY) throw new Error('stale'); if (!best || k.length > best.k.length) best = { k, src: `${EXN[s.ex]} ${s.pair}` }; } catch (e) { errs.push(`${EXN[s.ex]}: ${e.message}`); } }
  if (!best || best.k.length < 230) throw new Error((errs.join('; ') || 'no source') + (best ? `; only ${best.k.length} closed daily bars` : ''));
  return { ...best, errs };
}

/* ---------- statistics for one part (full / train / test) ---------- */
function evaluate(sym, k, rows, inPart, partName) {
  const byT = new Map(k.map((x, i) => [x.t, i])), out = { states: {}, baseline: {} };
  const tag = (g, h) => `${sym}|${partName}|${g}|h${h}`;
  for (const h of HORIZONS) {
    const all = [];
    for (const r of rows) { if (!inPart(r.t, r.t + h * DAY)) continue; const f = forward(k, byT, r.i, h); if (f == null) continue; all.push({ t: r.t, r: f, s: r.state }); }
    out.baseline['h' + h] = summarize(all, h, tag('any', h));
    for (const s of ['Long', 'Wait', 'Avoid']) { const g = out.states[s] || (out.states[s] = { days: rows.filter((r) => r.state === s && inPart(r.t, r.t)).length }); g['h' + h] = summarize(all.filter((x) => x.s === s), h, tag(s, h)); }
  }
  // Long: TP1 before the stop, and the result in R (entry = signal close; same-bar stop+TP counts as the stop)
  const res = [];
  for (const r of rows) { if (r.state !== 'Long') continue; const o = tpBeforeStop(k, r.i, r.stop, r.tp1, TP_MAX_BARS); if (!o || o.st === 'open') continue; if (!inPart(r.t, k[o.at].t)) continue; res.push({ t: r.t, at0: r.i, at1: o.at, hit: o.st === 'tp1' ? 1 : 0, R: o.R, st: o.st }); }
  if (res.length) {
    const L = Math.max(1, Math.round(quantile(res.map((x) => x.at1 - x.at0).sort((a, b) => a - b), 0.5))), seed = seedOf(`${sym}|${partName}|tp`);
    const hits = res.map((x) => x.hit), Rs = res.map((x) => x.R), mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
    out.states.Long.tp1BeforeStop = { n: res.length, nEff: nEffResolved(res), hit: hits.reduce((a, b) => a + b, 0), timeout: res.filter((x) => x.st === 'timeout').length, rate: r2(100 * mean(hits)), ci: blockBoot(hits.map((x) => 100 * x), L, mean, seed) };
    out.states.Long.avgR = { n: res.length, nEff: nEffResolved(res), mean: r2(mean(Rs)), med: r2(quantile([...Rs].sort((a, b) => a - b), 0.5)), ci: blockBoot(Rs, L, mean, seed ^ 7) };
  } else if (out.states.Long) { out.states.Long.tp1BeforeStop = { n: 0, nEff: 0 }; out.states.Long.avgR = { n: 0, nEff: 0 }; }
  return out;
}

async function main() {
  const now = Date.now(), out = {
    updated: new Date(now).toISOString().replace(/\.\d+Z$/, 'Z'),
    method: {
      rule: 'verdict-core.js compute() with closedOnly, on the 299 closed daily bars the app sees, ending at each bar (no lookahead). Daily levels only: the backtest has no 4h history, so it uses the daily entry zone; the app refines that zone with 4h candles when it has them, so a live Long can differ.',
      cases: 'every closed UTC daily bar with at least 200 bars of history; one venue per token (the source in tokens.json with the longest closed history), never stitched',
      returns: 'close-to-close % from the signal close to the close h days later (h = 1, 7, 30); a missing bar is no case',
      tp1: `Long only: from the signal close, TP1 reached before the stop (a bar touching both counts as the stop); unresolved after ${TP_MAX_BARS} bars = timeout marked to that close; R = (exit - entry) / (entry - stop)`,
      nEff: 'per state and horizon h: cases in time order, count one, skip every case starting fewer than h days after the last counted one; TP1: skip cases that start before the counted one resolved',
      ci: `moving-block bootstrap, block length = horizon (TP1: median bars to resolution), ${BOOT.B} resamples, fixed seed; [5th, 95th] percentile of the median (ci) and of the share positive (ciPos)`,
      gate: `a rate is shown only with nEff >= ${MIN_NEFF}`,
      baseline: 'the same statistics for all evaluated days of that token over the same period',
      split: `by time per token: first ${SPLIT * 100}% of evaluated days = train (forward window must end before the cut), last ${100 - SPLIT * 100}% = test. There is no tunable parameter; nothing is fitted on either part.`,
      short: `history under ${SHORT_YEARS} years = short history`,
    },
    minNEff: MIN_NEFF, horizons: HORIZONS, tokens: {}, failed: {}, all: {},
  };
  const pooled = { Long: {}, Wait: {}, Avoid: {} };
  for (const t of TOK) {
    try {
      const { k, src, errs } = await history(t, now), t0 = Date.now(), rows = walk(k, WINDOW);
      const gaps = k.slice(1).filter((x, i) => x.t - k[i].t > DAY).length, cutIdx = Math.floor(SPLIT * rows.length), cut = rows[cutIdx].t;
      const years = (k[k.length - 1].t + DAY - k[0].t) / (365.25 * DAY);
      const full = evaluate(t.symbol, k, rows, () => true, 'full');
      const train = evaluate(t.symbol, k, rows, (a, b) => a < cut && b < cut, 'train');
      const test = evaluate(t.symbol, k, rows, (a) => a >= cut, 'test');
      out.tokens[t.symbol] = { src, from: new Date(k[0].t).toISOString().slice(0, 10), to: new Date(k[k.length - 1].t).toISOString().slice(0, 10), years: r2(years), short: years < SHORT_YEARS,
        bars: k.length, evaluated: rows.length, gaps, insufficient: rows.filter((r) => r.state === 'Insufficient').length, cut: new Date(cut).toISOString().slice(0, 10),
        states: full.states, baseline: full.baseline, train, test, ...(errs.length ? { notes: errs.map((e) => e.slice(0, 120)) } : {}) };
      const byT = new Map(k.map((x, i) => [x.t, i]));
      for (const s of Object.keys(pooled)) for (const h of HORIZONS) { const a = pooled[s]['h' + h] || (pooled[s]['h' + h] = []); rows.forEach((r) => { if (r.state !== s) return; const f = forward(k, byT, r.i, h); if (f != null) a.push({ t: r.t, r: f }); }); }
      const st = full.states; console.log(t.symbol, src, `${k.length} bars ${r2(years)}y`, `${Date.now() - t0}ms`, ['Long', 'Wait', 'Avoid'].map((s) => `${s} days=${st[s].days} h7 n=${st[s].h7.n} nEff=${st[s].h7.nEff} med=${st[s].h7.med}`).join(' | '), `base h7 med=${full.baseline.h7.med}`);
    } catch (e) { out.failed[t.symbol] = String(e.message || e).slice(0, 300); console.log(t.symbol, 'FAIL', e.message); }
  }
  // pooled across tokens: tokens move together, so pooled cases are not independent; nEff counts at most one case per h days across all tokens
  for (const s of Object.keys(pooled)) { out.all[s] = {}; for (const h of HORIZONS) out.all[s]['h' + h] = summarize(pooled[s]['h' + h] || [], h, `ALL|${s}|h${h}`); }
  out.all.note = 'pooled across tokens; tokens move together, so nEff counts at most one case per horizon across all tokens. The app shows per-token figures.';
  const ok = Object.keys(out.tokens).length;
  if (ok < Math.ceil(TOK.length / 2)) { console.log('FAIL: too few tokens', ok, 'of', TOK.length); process.exit(1); }
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log('wrote', OUT, (fs.statSync(OUT).size / 1024).toFixed(1) + ' KB', 'tokens', ok, 'failed', Object.keys(out.failed).join(',') || 'none');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch((e) => { console.error(e); process.exit(1); });
export { evaluate, clean, history };
