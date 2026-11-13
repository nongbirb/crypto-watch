// Proof Layer shared maths (docs/architect-proof-layer.md §2.2, §2.3). Pure functions, no network; used by
// scripts/build_verdict_backtest.mjs, scripts/build_ledger.mjs, scripts/build_patterns_backtest.mjs and tests/proof-layer.mjs.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const VC = require('../verdict-core.js');
export const DAY = 864e5;
export const HORIZONS = [1, 7, 30];
export const MIN_NEFF = 20; // display gate: a rate is shown only with nEff >= 20 (UI: "not enough samples (n=…)")
export const WINDOW = 299; // closed daily bars the app sees: it fetches 300 and drops the open one (app.js loadToken + closedOnly)
export const BOOT = { B: 1000, lo: 0.05, hi: 0.95 };

export const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
/* deterministic PRNG so every bootstrap is reproducible */
export function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function seedOf(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
/* linear-interpolation quantile of an ascending array */
export function quantile(a, q) { if (!a.length) return null; const p = (a.length - 1) * q, i = Math.floor(p), f = p - i; return i + 1 < a.length ? a[i] + f * (a[i + 1] - a[i]) : a[i]; }
const median = (v) => quantile([...v].sort((x, y) => x - y), 0.5);
const share = (v) => (v.length ? (100 * v.filter((x) => x > 0).length) / v.length : null);

/* Effective n: walk cases in time order, count one, then skip every case that starts fewer than h days after the last counted one. */
export function nEffByTime(times, hDays) {
  const s = [...times].sort((a, b) => a - b); let n = 0, last = -Infinity;
  for (const t of s) if (t - last >= hDays * DAY) { n++; last = t; }
  return n;
}
/* Effective n for cases with a known end (patterns, TP1/stop): count one, skip every case detected before the counted one resolved.
   recs: [{at0, at1}] = detection bar index and resolution bar index on the same series. */
export function nEffResolved(recs) {
  const s = [...recs].sort((a, b) => a.at0 - b.at0); let n = 0, last = -Infinity;
  for (const r of s) if (r.at0 > last) { n++; last = r.at1; }
  return n;
}
/* Moving-block bootstrap of stat(values): block length L (= horizon), B resamples, fixed seed. Returns [5th, 95th] percentile. */
export function blockBoot(vals, L, stat, seed, B = BOOT.B) {
  const n = vals.length; if (n < 2) return null;
  const b = Math.max(1, Math.min(L, n)), rnd = mulberry32(seed), out = new Array(B);
  for (let k = 0; k < B; k++) { const s = []; while (s.length < n) { const st = Math.floor(rnd() * (n - b + 1)); for (let j = st; j < st + b && s.length < n; j++) s.push(vals[j]); } out[k] = stat(s); }
  out.sort((x, y) => x - y); return [r2(quantile(out, BOOT.lo)), r2(quantile(out, BOOT.hi))];
}
/* Statistics of forward returns (%) for one group and horizon. cases: [{t, r}] (t = signal bar open time, ms). */
export function summarize(cases, hDays, key) {
  const c = [...cases].sort((a, b) => a.t - b.t), v = c.map((x) => x.r), n = v.length;
  if (!n) return { n: 0, nEff: 0 };
  const s = [...v].sort((x, y) => x - y), seed = seedOf(key), nEff = nEffByTime(c.map((x) => x.t), hDays), gate = nEff >= MIN_NEFF;
  // Audit F7: no interval is stored below the display gate (nEff < MIN_NEFF): ci and ciPos are null there
  return { n, nEff, med: r2(quantile(s, 0.5)), p25: r2(quantile(s, 0.25)), p75: r2(quantile(s, 0.75)), pos: r2(share(v)),
    ci: gate ? blockBoot(v, hDays, median, seed) : null, ciPos: gate ? blockBoot(v, hDays, share, seed ^ 0x9e3779b9) : null };
}

/* Closed daily candles only: drop the bar that is still open at `now`. */
export const closedOnly = (k, now = Date.now()) => k.filter((x) => Number.isFinite(x.t) && x.t + DAY <= now);

/* Walk-forward states. For every closed bar i with >= 200 bars of history, the state is computed from bars <= i only
   (the app's 299-bar window ending at i), exactly as the app would have shown it right after that bar closed. No 4h data. */
export function walk(k, win = WINDOW) {
  const out = [];
  for (let i = 199; i < k.length; i++) {
    const w = k.slice(Math.max(0, i - win + 1), i + 1); let I;
    try { I = VC.compute({ d1: w, price: w[w.length - 1].c, h4: null }, { closedOnly: true, now: k[i].t + DAY }); } catch (e) { out.push({ i, t: k[i].t, state: 'Insufficient', err: e.message }); continue; }
    const P = I.plan;
    out.push({ i, t: k[i].t, c: k[i].c, state: P.bias, trend: I.trend, zl: P.entry[0], zh: P.entry[1], stop: P.stop, tp1: P.tps[0] ? P.tps[0].price : null });
  }
  return out;
}
/* Close-to-close forward return in %, matched by time (a missing bar = no case, never a guess). */
export function forward(k, byT, i, h) { const j = byT.get(k[i].t + h * DAY); return j == null ? null : (k[j].c / k[i].c - 1) * 100; }
/* Long only: from the signal close, does price reach TP1 before the stop? Same-bar touch of both counts as the stop (conservative).
   Unresolved after maxBars: timeout, marked to that close. Data ends first: open (excluded). R = (exit - entry) / (entry - stop). */
export function tpBeforeStop(k, i, stop, tp1, maxBars = 90) {
  const e = k[i].c, risk = e - stop; if (!(risk > 0) || !(tp1 > e)) return null;
  for (let j = i + 1; j < k.length && j <= i + maxBars; j++) {
    if (k[j].l <= stop) return { st: 'stop', at: j, R: -1 };
    if (k[j].h >= tp1) return { st: 'tp1', at: j, R: (tp1 - e) / risk };
  }
  if (i + maxBars < k.length) { const j = i + maxBars; return { st: 'timeout', at: j, R: (k[j].c - e) / risk }; }
  return { st: 'open' };
}
