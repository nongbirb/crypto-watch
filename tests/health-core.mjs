// Market Health math, universe rules, validator and release wiring (docs/market-health-p6.md). Usage: node tests/health-core.mjs
// Fixture tests/fixtures/health/ = a real build of scripts/build_health.mjs (2026-11-17, closed day 2026-11-16), recorded for tests only.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { createRequire } from 'node:module'; import { execFileSync, spawnSync } from 'node:child_process';
import { whyOut, primary, ecosystem, EXCL } from '../scripts/build_health.mjs';
const H = createRequire(import.meta.url)('../health-core.js'), FX = (f) => JSON.parse(fs.readFileSync(new URL('./fixtures/health/' + f, import.meta.url), 'utf8'));
const D = FX('health.json'), MEM = FX('categories.json').mem;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const near = (a, b, e = 0.06) => assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);

t('spot score recomputes from the recorded closed-candle stats', () => {
  const r = H.spot(D.official.coins.map((c) => ({ id: c.id, st: c })));
  assert.equal(r.score, D.official.score); assert.deepEqual(r.missing, []);
  const C = r.comp, want = (30 * C.B.v + 25 * C.M.v + 15 * C.V.v + 10 * C.H.v + 10 * C.P.v) / 90; near(r.score, want, 0.051);
  near(C.B.v, 0.4 * C.B.adv1 + 0.6 * C.B.adv7, 0.06); near(C.M.v, 0.5 * C.M.a50 + 0.5 * C.M.a200, 0.06);
  near(C.V.v, 50 + 50 * C.V.d * C.V.w, 0.06); near(C.H.v, 50 + (50 * (C.H.nh - C.H.nl)) / Math.max(C.H.nh + C.H.nl, 0.1 * C.H.n), 0.01);
  assert.ok(!('L' in C), 'no leverage-safety component inside the spot score');
});
t('formula v1 (rev 2) is locked to the recorded closed day 2026-11-16', () => {
  const C = D.official.comp; assert.equal(D.official.formula, 'v1'); assert.equal(D.official.day, '2026-11-16');
  assert.deepEqual([C.B.v, C.M.v, C.V.v, C.H.v, C.P.v, D.official.score, D.official.band], [12, 13.67, 43.01, 0, 47.63, 20.3, 'Weak']);
  assert.deepEqual([D.leverage.score, D.leverage.band], [3.8, 'Low']);
  near(C.P.v, 50 + 50 * (0.5 * H.clamp(C.P.s1 / 5, -1, 1) + 0.5 * H.clamp(C.P.s7 / 10, -1, 1)), 0.06);
});
t('leverage risk = 0.40F + 0.35O + 0.25X, separate from spot', () => { const c = D.leverage.comp; near(D.leverage.score, 0.4 * c.F.v + 0.35 * c.O.v + 0.25 * c.X.v, 0.051); near(c.F.v, H.clamp((100 * Math.abs(c.F.fbar - 0.01)) / 0.09), 0.06); });
t('coins under 200 bars are left out of MA200, not counted as below, and do not break coverage', () => {
  const st = (n, up) => ({ n, d1: 1, d7: 1, ma50: up, ma200: n >= 200 ? up : null, hi30: false, lo30: false, q: 1, vr: 1 });
  const coins = Array.from({ length: 100 }, (_, i) => ({ id: i ? 'c' + i : 'bitcoin', st: st(i < 60 ? 220 : 120, i < 30) })); // 60 eligible, 30 of them above
  const r = H.spot(coins); assert.equal(r.comp.M.n200, 60); assert.equal(r.comp.M.a200, 50); assert.ok(r.score != null);
  const few = coins.map((c, i) => ({ ...c, st: { ...c.st, n: i < 40 ? 220 : 120, ma200: i < 40 ? true : null } })); assert.equal(H.spot(few).comp.M, null, 'fewer than 50 eligible -> MA part missing -> no score'); assert.equal(H.spot(few).score, null);
});
t('volume: one coin is capped at 10% of the total weight', () => {
  const coins = Array.from({ length: 100 }, (_, i) => ({ id: i ? 'c' + i : 'bitcoin', st: { n: 220, d1: i ? -1 : 1, d7: -1, ma50: false, ma200: false, hi30: false, lo30: false, q: i ? 1 : 900, vr: 1.5 } }));
  const v = H.spot(coins).comp.V; near(v.d, (99.9 - 99) / (99.9 + 99), 0.002); assert.ok(v.d < 0.05, 'BTC (90% of raw volume, up) is capped at 10% of the total: uncapped the direction would read +0.80');
});
t('missing data -> no score; fewer than 90 coins -> no score', () => {
  const coins = D.official.coins.map((c) => ({ id: c.id, st: c }));
  assert.equal(H.spot(coins.slice(0, 89)).score, null); assert.ok(H.spot(coins.slice(0, 89)).missing.includes('universe'));
  assert.equal(H.spot(coins.filter((c) => c.id !== 'bitcoin')).comp.P, null); assert.equal(H.leverage([], []).score, null);
});
t('bands and ±3 hysteresis on labels only', () => {
  const b = (s, p) => H.band(s, H.SPOT_BANDS, p);
  assert.deepEqual([b(70), b(69.9), b(55), b(54.9), b(40), b(39.9)], ['Strong', 'Healthy', 'Healthy', 'Mixed', 'Mixed', 'Weak']);
  assert.equal(b(67, 'Strong'), 'Strong'); assert.equal(b(66.9, 'Strong'), 'Healthy'); assert.equal(b(57.9, 'Mixed'), 'Mixed'); assert.equal(b(58, 'Mixed'), 'Healthy');
  const l = (s, p) => H.band(s, H.LEV_BANDS, p); assert.deepEqual([l(19.9), l(20), l(40), l(60), l(80)], ['Low', 'Normal', 'Elevated', 'High', 'Extreme']); assert.equal(l(22, 'Low'), 'Low');
});
t('coinStats uses closed candles: changes, MA, 30-day high/low, volume ratio', () => {
  const k = Array.from({ length: 210 }, (_, i) => ({ t: Date.UTC(2026, 3, 1) + i * 864e5, c: 100 + i, q: 10 })); k[209].q = 20;
  const s = H.coinStats(k); near(s.d1, (309 / 308 - 1) * 100, 0.001); near(s.d7, (309 / 302 - 1) * 100, 0.001); assert.equal(s.ma200, true); assert.equal(s.hi30, true); assert.equal(s.lo30, false); assert.equal(s.vr, 2);
  assert.equal(H.coinStats(k.slice(0, 120)).ma200, null);
});
t('squarify: areas proportional, inside the box, no overlap; each coin once per grouping', () => {
  const items = D.coins.map((c) => ({ id: c.id, v: c.mc })), W = 900, Hh = 500, r = H.squarify(items, 0, 0, W, Hh), tot = items.reduce((a, i) => a + i.v, 0);
  assert.equal(r.length, items.length);
  for (const x of r) { near((x.w * x.h) / (W * Hh), x.v / tot, 1e-6); assert.ok(x.x >= -1e-6 && x.y >= -1e-6 && x.x + x.w <= W + 1e-6 && x.y + x.h <= Hh + 1e-6); }
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], b = r[j]; assert.ok(a.x + a.w <= b.x + 1e-6 || b.x + b.w <= a.x + 1e-6 || a.y + a.h <= b.y + 1e-6 || b.y + b.h <= a.y + 1e-6, 'overlap'); }
  for (const key of ['tier', 'cat', 'eco']) { const g = {}; D.coins.forEach((c) => (g[c[key]] = g[c[key]] || []).push({ id: c.id, v: c.mc }));
    const ids = H.groupLayout(Object.entries(g).map(([k, items]) => ({ k, items })), 800, 500, 18).flatMap((x) => x.tiles.map((y) => y.id)); assert.equal(ids.length, D.coins.length); assert.equal(new Set(ids).size, ids.length); }
});
t('universe rules: stables / wrapped / staked / tokenized credit out, protocol tokens in', () => {
  const c = (id, symbol, extra = {}) => ({ id, symbol, current_price: 5, total_volume: 1e8, price_change_percentage_30d_in_currency: -10, ...extra });
  for (const id of ['tether', 'usd-coin', 'figure-heloc', 'pax-gold', MEM['bridged-tokens'][0], MEM['tokenized-stock'][0]]) assert.equal(whyOut(c(id, 'x'), MEM), 'category', id);
  // CoinGecko's top-250 markets list no wrapped / liquid-staking ids today, so the cached membership has none; check the rule directly
  for (const [k, id] of [['wrapped-tokens', 'wrapped-bitcoin'], ['liquid-staking-tokens', 'staked-ether'], ['liquid-restaking-tokens', 'ether-fi-staked-eth']]) assert.equal(whyOut(c(id, 'x'), { [k]: [id] }), 'category', id);
  for (const id of ['ondo-finance', 'chainlink', 'hyperliquid', 'bitcoin']) assert.equal(whyOut(c(id, 'x'), MEM), null, id);
  assert.equal(whyOut(c('some-new-usd', 'abcusd'), {}), 'symbol'); assert.equal(whyOut(c('pegged', 'pgd', { current_price: 1.001, price_change_percentage_30d_in_currency: 0.2 }), {}), 'pegged');
  assert.equal(whyOut(c('thin', 'thn', { total_volume: 4.9e6 }), {}), 'illiquid');
  assert.ok(['stablecoins', 'wrapped-tokens', 'bridged-tokens', 'liquid-staking-tokens', 'tokenized-private-credit', 'tokenized-credit'].every((k) => EXCL.includes(k)));
  assert.equal(primary('chainlink', MEM), 'Other'); assert.equal(primary('hyperliquid', MEM), 'L1'); assert.equal(primary('dogecoin', MEM), 'Meme'); assert.equal(ecosystem('solana', MEM), 'Solana');
});
t('validate.py health: passes the fixture, rejects edits to past history rows, too few coins, duplicates, future days', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-')), w = (f, o) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), JSON.stringify(o)); };
  const git = (...a) => execFileSync('git', ['-C', dir, ...a], { stdio: 'pipe' }), v = () => spawnSync('python3', ['scripts/validate.py', 'health', '--dir', dir, '--base', 'HEAD'], { encoding: 'utf8' });
  const hist = FX('history.json'); w('health.json', D); w('data/health/history.json', hist); w('data/health/categories.json', FX('categories.json'));
  git('init', '-q'); git('-c', 'user.email=t@t', '-c', 'user.name=t', 'add', '.'); git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'fx');
  assert.equal(v().status, 0, v().stdout + v().stderr);
  w('data/health/history.json', { ...hist, rows: hist.rows.map((r) => ({ ...r, spot: r.spot + 1 })) }); assert.match(v().stdout, /append-only/); w('data/health/history.json', hist);
  const bad = (f, msg) => { w('health.json', f(structuredClone(D))); const r = v(); assert.notEqual(r.status, 0, msg); w('health.json', D); };
  bad((d) => { d.official.coins = d.official.coins.slice(0, 80); d.official.n = 80; d.coins = d.coins.slice(0, 80); return d; }, 'score with 80 coins');
  bad((d) => { d.coins[1] = d.coins[0]; return d; }, 'duplicate coin'); bad((d) => { d.official.day = '2999-01-01'; return d; }, 'future day');
  bad((d) => { d.leverage.band = 'Low'; d.leverage.score = null; return d; }, 'band without score');
  fs.rmSync(dir, { recursive: true });
});
t('wiring: route under More, workflow builds + validates, heartbeat backup, assets 61, lazy modules cached', () => {
  const app = fs.readFileSync('app.js', 'utf8'), sw = fs.readFileSync('sw.js', 'utf8'), idx = fs.readFileSync('index.html', 'utf8'), wf = fs.readFileSync('.github/workflows/health.yml', 'utf8');
  assert.match(app, /const MORE = \['breadth',/); assert.match(app, /const ASSETV = 71,/); assert.match(sw, /cw-shell-v71'/); assert.ok(!/\?v=(?!71)\d+/.test(idx), 'index.html ?v=71 everywhere');
  assert.match(sw, /'min\/health-core\.js', 'min\/health\.js'/); assert.match(fs.readFileSync('scripts/build_min.sh', 'utf8'), / health-core health( learn)?; do/);
  assert.match(wf, /node scripts\/build_health\.mjs/); assert.match(wf, /validate\.py health/); assert.match(fs.readFileSync('.github/workflows/heartbeat.yml', 'utf8'), /ledger\.yml health\.yml positioning\.yml onchain\.yml; do/);
  assert.match(fs.readFileSync('i18n.js', 'utf8'), /breadth: 'สุขภาพตลาด'/);
});
console.log(`PASS health-core (${n} tests)`);
