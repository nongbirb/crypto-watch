// Phase 3 Setup card (docs/architect-proof-layer.md §4): synthetic fixtures, no network. Usage: node tests/setup-card-p3.mjs
// Hysteresis (one rule for app, ledger and backtest; two consecutive closed bars; Insufficient at once; no lookahead), stored codes and
// display labels, every evidence-line rule in setup-core.js (trend, strength vs BTC, derivatives with coverage, Smart Money 7-day flow,
// pattern display rule, 48 h event risk), mirrored levels for a Downtrend, ledger rows, release wiring (v57).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { walk, mulberry32 } from '../scripts/proof-lib.mjs';
import { observe } from '../scripts/build_ledger.mjs';
const require = createRequire(import.meta.url);
const VC = require('../verdict-core.js'), SUC = require('../setup-core.js');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', name); };
const DAY = 864e5, T0 = Date.UTC(2025, 0, 1);
/* deterministic random walk with drifting regimes, so the rule changes state often */
function series(len, seed) { const r = mulberry32(seed), k = []; let c = 100;
  for (let i = 0; i < len; i++) { const drift = Math.sin(i / 11) * 0.02, o = c; c = Math.max(1, c * (1 + drift + (r() - 0.5) * 0.08));
    k.push({ t: T0 + i * DAY, o, c, h: Math.max(o, c) * (1 + r() * 0.02), l: Math.min(o, c) * (1 - r() * 0.02), v: 1, q: 1000 + r() * 100 }); }
  return k; }

// ---------- hysteresis ----------
t('holdAt: a state changes only after two consecutive bars agree; Insufficient starts and ends at once', () => {
  const raw = ['Insufficient', 'Wait', 'Long', 'Wait', 'Long', 'Long', 'Avoid', 'Wait', 'Wait', 'Insufficient', 'Long', 'Avoid'];
  assert.deepEqual(VC.holdSeries(raw), ['Insufficient', 'Wait', 'Wait', 'Wait', 'Wait', 'Long', 'Long', 'Long', 'Wait', 'Insufficient', 'Long', 'Long']);
  assert.deepEqual(VC.holdSeries(['Long', 'Avoid', 'Avoid']), ['Long', 'Long', 'Avoid'], 'the first bar of a series has nothing to hold');
});
t('holdAt: no qualifying bar within HOLD_BACK bars keeps the state at the oldest bar looked at', () => {
  const alt = Array.from({ length: 80 }, (_, i) => (i % 2 ? 'Long' : 'Wait')), h = VC.holdAt((j) => alt[j], 79);
  assert.equal(h.at, 79 - VC.HOLD_BACK); assert.equal(h.state, alt[79 - VC.HOLD_BACK]);
});
t('computeHeld (app / ledger) = holdSeries over the walk-forward states (backtest), bar by bar; changes only on two agreeing closes', () => {
  const tot = { raw: 0, held: 0, pend: 0 };
  for (const seed of [3, 7, 11, 19]) {
    const k = series(460, seed), rows = walk(k), raw = rows.map((r) => r.state), held = VC.holdSeries(raw);
    for (let j = 0; j < rows.length; j++) { const i = rows[j].i, d = k.slice(0, i + 1);
      const I = VC.computeHeld({ d1: d, h4: null, price: d[i].c }, { now: d[i].t + DAY, win: 299 });
      assert.equal(I.plan.raw, raw[j], `seed ${seed}: raw at bar ${i}`); assert.equal(I.plan.bias, held[j], `seed ${seed}: held at bar ${i}`);
      assert.equal(I.plan.pending, raw[j] !== held[j] ? raw[j] : null);
      if (j && held[j] !== held[j - 1]) { tot.held++; assert.ok(raw[j] === raw[j - 1] || raw[j] === 'Insufficient' || raw[j - 1] === 'Insufficient', `seed ${seed} bar ${i}: changed without two agreeing closes`); }
      if (j && raw[j] !== raw[j - 1]) tot.raw++; if (I.plan.pending) tot.pend++; } }
  assert.ok(tot.raw >= 20 && tot.held < tot.raw && tot.pend > 0, `the fixtures exercise the rule: ${JSON.stringify(tot)}`);
});
t('computeHeld: no lookahead (bars after the signal bar never change it) and the open candle is dropped', () => {
  const k = series(420, 11), i = 380, now = k[i].t + DAY, base = VC.computeHeld({ d1: k.slice(0, i + 1), price: k[i].c }, { now, win: 299 }).plan;
  const open = { ...k[i + 1], c: k[i].c * 3, h: k[i].c * 3 }, withOpen = VC.computeHeld({ d1: [...k.slice(0, i + 1), open], price: open.c }, { now: k[i + 1].t + 36e5, win: 299 }).plan;
  assert.equal(withOpen.bias, base.bias); assert.equal(withOpen.raw, base.raw); assert.equal(withOpen.openDropped, true);
});
t('ledger observe() stores the held state and the raw one in ctx', () => {
  const k = series(520, 7), rows = walk(k), held = VC.holdSeries(rows.map((r) => r.state)), j = rows.findIndex((r, x) => x && r.state !== held[x]);
  assert.ok(j > 0, 'fixture has a pending bar'); const i = rows[j].i, ob = observe('XYZ', k.slice(0, i + 1), null, k[i].t + DAY + 36e5, 'test:XYZ');
  assert.equal(ob.verdict.to, held[j]); assert.equal(ob.verdict.ctx.raw, rows[j].state); assert.notEqual(ob.verdict.to, ob.verdict.ctx.raw);
});
t('backtest: hysteresis on by default, --raw for the comparison, state changes counted both ways', () => {
  const src = fs.readFileSync('scripts/build_verdict_backtest.mjs', 'utf8');
  assert.match(src, /VC\.holdSeries\(rows\.map\(\(r\) => r\.state\)\)/); assert.match(src, /process\.argv\.includes\('--raw'\)/); assert.match(src, /changes: \{ raw: flips\[0\], held: flips\[1\] \}/);
  const vb = JSON.parse(fs.readFileSync('verdict_backtest.json', 'utf8'));
  assert.match(vb.method.hysteresis, /^on:/, 'the committed backtest is the held rule the app shows');
  for (const [s, x] of Object.entries(vb.tokens)) assert.ok(x.changes && x.changes.held <= x.changes.raw, `${s}: held changes <= raw changes`);
});

// ---------- codes and labels ----------
t('stored codes unchanged; only the display labels change (EN + TH)', () => {
  assert.deepEqual(VC.STATES, ['Long', 'Wait', 'Avoid', 'Insufficient']);
  const ctx = {}; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync('i18n.js', 'utf8'), ctx); const I = ctx.I18N;
  assert.deepEqual([I.en.Long, I.en.Wait, I.en.Avoid, I.en.Insufficient], ['Uptrend setup', 'Mixed', 'Downtrend', 'Insufficient data']);
  assert.deepEqual([I.th.Long, I.th.Wait, I.th.Avoid, I.th.Insufficient], ['เซ็ตอัปขาขึ้น', 'ยังไม่ชัด', 'ขาลง', 'ข้อมูลไม่พอ']);
  const vb = JSON.parse(fs.readFileSync('verdict_backtest.json', 'utf8')); assert.deepEqual(Object.keys(Object.values(vb.tokens)[0].states).sort(), ['Avoid', 'Long', 'Wait']);
});

// ---------- evidence lines ----------
t('trend line: the existing rule, with the distance to MA50 / MA200', () => {
  const up = VC.compute({ d1: Array.from({ length: 260 }, (_, i) => ({ c: 100 + i, h: 101 + i, l: 99 + i, q: 1 })), price: 359 }, { closedOnly: true });
  const r = SUC.trend(up); assert.equal(r.st, 'g'); assert.equal(r.trend, 'Uptrend'); assert.ok(r.ma50 > 0 && r.ma200 > 0);
  assert.equal(SUC.trend({ plan: { ready: false } }).st, 'n');
  const dn = VC.compute({ d1: Array.from({ length: 260 }, (_, i) => ({ c: 500 - i, h: 501 - i, l: 499 - i, q: 1 })), price: 241 }, { closedOnly: true });
  assert.equal(SUC.trend(dn).st, 'r');
});
t('strength vs BTC: 30-day return ratio and the ratio against its 50-day average; matched by open time, closed bars only', () => {
  const mk = (f) => Array.from({ length: 80 }, (_, i) => ({ t: T0 + i * DAY, c: f(i) })), btc = mk(() => 100), now = T0 + 80 * DAY;
  const strong = SUC.rs(mk((i) => 10 + i * 0.1), btc, now); assert.equal(strong.st, 'g'); assert.ok(Math.abs(strong.rel - 100 * (17.9 / 14.9 - 1)) < 1e-9); assert.equal(strong.above, true);
  assert.equal(SUC.rs(mk((i) => 20 - i * 0.1), btc, now).st, 'r');
  const mixed = SUC.rs(mk((i) => (i < 75 ? 10 + i * 0.1 : 15)), btc, now); assert.ok(mixed.rel > 0 && !mixed.above); assert.equal(mixed.st, 'n', 'up over 30 days but under its 50-day average = grey');
  assert.equal(SUC.rs(mk((i) => 10 + i), btc.slice(0, 40), now).why, 'short');
  const open = SUC.rs(mk((i) => 10 + i * 0.1), btc, T0 + 79 * DAY + 1); assert.equal(open.at, T0 + 78 * DAY, 'the bar still open at now is not used');
});
t('derivatives: same 10% bands as funding_regime; grey under 30 days or under 50% coverage, whatever the value', () => {
  const M = (pct, cov = 80, days = 90) => ({ P: { fundSigned: pct, days, fundVenues: ['okx'] }, oi24: 1.5, covSide: cov });
  assert.deepEqual([SUC.deriv(M(95)).st, SUC.deriv(M(90)).st, SUC.deriv(M(50)).st, SUC.deriv(M(10)).st, SUC.deriv(M(5)).st], ['r', 'r', 'n', 'g', 'g']);
  assert.deepEqual([SUC.deriv(M(95)).regime, SUC.deriv(M(50)).regime, SUC.deriv(M(5)).regime], ['high', 'normal', 'low']);
  const low = SUC.deriv(M(95, 6)); assert.equal(low.st, 'n'); assert.equal(low.why, 'coverage'); assert.equal(low.regime, 'high', 'the regime is still named for the ledger row');
  assert.equal(SUC.deriv(M(95, 80, 12)).why, 'history'); assert.equal(SUC.deriv(null).st, 'n'); assert.equal(SUC.deriv(M(95)).oi24, 1.5);
});
t('Smart Money: 7-day net as a share of the panel position, the ledger\'s ±5% band', () => {
  const sm = (net, L = 600, Sh = 400) => ({ flows: { d7: { from: 'a', to: 'b', hours: 168, gaps: 0, coins: { BTC: { net } } } }, coins: { BTC: { ntlLong: L, ntlShort: Sh } } });
  assert.equal(SUC.smflow(sm(60), 'BTC').st, 'g'); assert.equal(SUC.smflow(sm(60), 'BTC').to, 'net_buy');
  assert.equal(SUC.smflow(sm(50), 'BTC').to, 'flat', 'exactly 5% is flat'); assert.equal(SUC.smflow(sm(-51), 'BTC').st, 'r');
  assert.equal(SUC.smflow(sm(10), 'ETH').why, 'nocoin'); assert.equal(SUC.smflow(sm(10, 0, 0), 'BTC').why, 'nogross'); assert.equal(SUC.smflow(null, 'BTC').why, 'nodata');
  const real = JSON.parse(fs.readFileSync('smart_money.json', 'utf8')), r = SUC.smflow(real, 'BTC');
  assert.ok(r.why || ['net_buy', 'net_sell', 'flat'].includes(r.to), 'reads the committed smart_money.json');
});
t('pattern: best active daily pattern; under the section 0 rule a few-cases or weak type is grey, else its direction', () => {
  const c = [{ type: 'dtop', conf: 80, dir: -1, o: { st: 'confirmed' } }, { type: 'hs', conf: 95, dir: -1, o: { st: 'inv' } }, { type: 'dbot', conf: 60, dir: 1, o: { st: 'forming' } }];
  const ok = (ty) => ({ ty: { rate: 50, nEff: 40 }, few: false, weak: false, scope: 'tf' });
  const p = SUC.pattern(c, ok); assert.equal(p.type, 'dtop', 'invalidated patterns are skipped; highest score wins'); assert.equal(p.st, 'r');
  assert.equal(SUC.pattern([c[2]], ok).st, 'g');
  assert.equal(SUC.pattern(c, () => ({ ty: { rate: 20, nEff: 70 }, few: false, weak: true })).st, 'n', 'weak record (< 35%) = grey');
  assert.equal(SUC.pattern(c, () => ({ ty: { rate: 60, nEff: 12 }, few: true, weak: false })).st, 'n', 'nEff < 30 = grey');
  assert.equal(SUC.pattern([{ type: 'stri', conf: 70, dir: 0, o: { st: 'forming' } }], ok).st, 'n', 'no direction = grey');
  assert.equal(SUC.pattern([], ok).why, 'none'); assert.equal(SUC.pattern(c, null).st, 'n', 'no record loaded = grey');
});
t('event risk: high-impact token or macro event within 48 h = red; medium, other tokens, past or later = ignored', () => {
  const now = Date.UTC(2026, 10, 14, 12), H = 36e5, ts = (e) => e._t ?? null, d0 = (e) => e._d ?? null;
  const E = [{ impact: 'high', type: 'macro', tokens: [], _t: now + 20 * H, title: 'FOMC' }, { impact: 'high', type: 'unlock', tokens: ['MON'], _t: now + 10 * H },
    { impact: 'medium', type: 'macro', tokens: [], _t: now + 5 * H }, { impact: 'high', type: 'macro', tokens: [], _t: now + 49 * H }, { impact: 'high', type: 'macro', tokens: [], _t: now - H }];
  const b = SUC.event(E, 'BTC', now, ts, d0); assert.equal(b.st, 'r'); assert.equal(b.hits.length, 1); assert.equal(b.next.e.title, 'FOMC');
  assert.equal(SUC.event(E, 'MON', now, ts, d0).next.t, now + 10 * H, 'the nearest one first');
  assert.equal(SUC.event(E.slice(2), 'BTC', now, ts, d0).st, 'g'); assert.equal(SUC.event(null, 'BTC', now, ts, d0).st, 'n');
  const allDay = [{ impact: 'high', type: 'macro', tokens: [], _d: now - 6 * H }]; assert.equal(SUC.event(allDay, 'BTC', now, ts, d0).next.allDay, true, 'an all-day event of today counts');
  assert.equal(SUC.event([{ impact: 'high', type: 'macro', tokens: [], _d: now - 30 * H }], 'BTC', now, ts, d0).st, 'g', 'yesterday\'s all-day event does not');
});
t('mirrored levels (Downtrend): resistance zone above, invalidation 1 ATR above it, targets at supports below, then 1R steps', () => {
  const P = { ready: true, atr: 4, close: 100, price: 101, res: [110, 120], sup: [95, 90] }, M = SUC.mirror(P);
  assert.deepEqual(M.zone, [109, 110]); assert.equal(M.inv, 114); assert.equal(M.risk, 4.5);
  assert.deepEqual(M.tps.map((x) => x.price), [95, 90, 85.5]); assert.deepEqual(M.tps.map((x) => x.basis), ['daily support', 'daily support', 'R-multiple (no support left)']);
  assert.ok(Math.abs(M.tps[0].rr - (109.5 - 95) / 4.5) < 1e-12);
  assert.equal(SUC.mirror({ ...P, res: [] }), null, 'no resistance above: no mirrored plan'); assert.equal(SUC.mirror({ ...P, ready: false }), null);
  assert.deepEqual(SUC.mirror({ ...P, res: [100.5] }).zone, [100, 100.5], 'the zone never starts below the close');
});
t('ledger row: the token\'s own row first, else all tokens pooled; nothing for a missing state', () => {
  const sum = { rows: [{ kind: 'sm_flow', to: 'net_buy', sym: 'ALL', entries: 3 }, { kind: 'sm_flow', to: 'net_buy', sym: 'BTC', entries: 1 }, { kind: 'pattern', to: 'dtop', sym: 'ALL', entries: 2 }] };
  assert.equal(SUC.ledgerRow(sum, 'sm_flow', 'net_buy', 'BTC').sym, 'BTC'); assert.equal(SUC.ledgerRow(sum, 'sm_flow', 'net_buy', 'ETH').sym, 'ALL');
  assert.equal(SUC.ledgerRow(sum, 'pattern', 'hs', 'BTC'), null); assert.equal(SUC.ledgerRow(null, 'pattern', 'dtop', 'BTC'), null);
});

// ---------- release wiring ----------
t('release: v57 in both places, setup-core.js and setup.js in index.html, sw.js and build_min.sh, min/ built', () => {
  const app = fs.readFileSync('app.js', 'utf8'), sw = fs.readFileSync('sw.js', 'utf8'), idx = fs.readFileSync('index.html', 'utf8'), mk = fs.readFileSync('scripts/build_min.sh', 'utf8');
  assert.match(app, /const ASSETV = 57,/); assert.match(sw, /cw-shell-v57'/);
  for (const f of ['setup-core', 'setup']) { assert.ok(idx.includes(`min/${f}.js?v=57`), `index.html loads ${f}`); assert.ok(sw.includes(`'min/${f}.js'`), `sw.js caches ${f}`); assert.match(mk, new RegExp(`\\b${f}\\b`)); assert.ok(fs.existsSync(`min/${f}.js`)); }
  assert.ok(idx.indexOf('min/setup-core.js') < idx.indexOf('min/setup.js') && idx.indexOf('min/app.js') < idx.indexOf('min/setup.js'));
  assert.match(app, /suHTML\(t\)/, 'planHTML renders the evidence'); assert.match(app, /suMirrorRows\(t, row, d\)/, 'a Downtrend shows the mirrored levels');
});
console.log(`PASS setup-card-p3 (${n} groups)`);
