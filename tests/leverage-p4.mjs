// Phase 4 (docs/architect-proof-layer.md §5) + Phase 2 audit L1-L5: synthetic fixtures, no network.
// Leverage history (floor = 0, settlement counts, OI reading rules, closed days never change), own-history percentiles (30-day minimum,
// Hyperliquid joins when its record is long enough), funding / OI regimes (no lookahead), ledger kinds, validator lev, L2 / L3 / L5.
// Usage: node tests/leverage-p4.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { step, levState, flowState } from '../scripts/build_ledger.mjs';
const LC = createRequire(import.meta.url)('../lev-core.js');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', name); };
const pyc = (code) => JSON.parse(execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'scripts'); import lev_hist as H, sm_lib as L\n${code}`]).toString());
const sm = (fn, ...args) => JSON.parse(execFileSync('python3', ['scripts/sm_lib.py'], { input: JSON.stringify({ fn, args }) }).toString());
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'levp4-'));
const DAY = 864e5, D0 = Date.UTC(2026, 6, 1), dk = (i) => new Date(D0 + i * DAY).toISOString().slice(0, 10);

t('history: daily funding = mean 8h-equivalent; a settlement at the floor counts 0 in the excess; settlements counted', () => {
  const h = 36e5, rows = [[D0 + 0 * h, 1e-4], [D0 + 8 * h, 3e-4], [D0 + 16 * h, -2e-4], [D0 + 24 * h, 1e-4]];
  const r = pyc(`print(json.dumps(H.fund_days(${JSON.stringify(rows)})))`);
  assert.deepEqual(r[dk(0)], [66.67, 33.33, 3]); assert.deepEqual(r[dk(1)], [100, 0, 1], 'a day at the floor = 0 excess');
});
t('history: funding replaced only by a value with at least as many settlements; OI only by a later reading of the same day; closes never revised', () => {
  const r = pyc(`row = {}
H.merge_day(row, 'BTC', 'okx', f=[50, 20, 3]); H.merge_day(row, 'BTC', 'okx', f=[10, 10, 1])
H.merge_day(row, 'BTC', 'okx', oi=2e9, oih=23); H.merge_day(row, 'BTC', 'okx', oi=1e9, oih=16)
H.merge_day(row, 'BTC', None, pxmc=[100, 5]); H.merge_day(row, 'BTC', None, pxmc=[101, 6])
print(json.dumps(row))`);
  assert.deepEqual(r.BTC, [100, 5, [50, 20, 3, 2000000, 23], null]);
});
t('history: hour stamps are the UTC hour that contains the reading (never a later hour)', () => {
  assert.equal(pyc(`print(json.dumps(H.hour_of(${Date.UTC(2026, 10, 13, 7, 55)})))`), '2026-11-13T07');
});

// ---------- synthetic history files ----------
function hist(nDays, f = {}) { const days = {}, fin = {};
  for (let i = 0; i < nDays; i++) { const d = dk(i), osc = Math.sin(i / 5);
    days[d] = { BTC: [100 * (1 + 0.01 * osc), 2000, [f.fx ? f.fx(i) : 50 + 30 * osc, f.fx ? f.fx(i) : 30 + 30 * osc, 3, f.oi ? f.oi(i) : 1e6 * (1 + 0.05 * osc), 23], f.hl && i >= f.hl ? [40, 20, 24, 5e5, 12] : [40, 20, 24, null, null]] };
    fin[d] = true; }
  return [{ year: 2026, cols: ['px', 'mc', 'okx', 'hyperliquid'], days, final: fin }]; }
t('percentiles: own 90 days; under 30 days -> null ("not enough history"); Hyperliquid OI joins only with 30 recorded days', () => {
  assert.equal(LC.pctRank([1, 2, 3], 2), null, 'fewer than 30 values');
  const v = Array.from({ length: 40 }, (_, i) => i); assert.equal(LC.pctRank(v, 20), 51.25); assert.equal(LC.pctRank(v, 100), 100);
  const P29 = LC.percentiles(hist(29), 'BTC', { fx: { okx: 80 }, oiUsd: { okx: 1e9 }, mcap: 2e9 }, ['okx']);
  assert.equal(P29.fund, null); assert.equal(P29.lev, null); assert.equal(P29.days, 29);
  const P = LC.percentiles(hist(120, { hl: 100 }), 'BTC', { fx: { okx: 80, hyperliquid: 40 }, oiUsd: { okx: 1.06e9, hyperliquid: 5e8 }, mcap: 2e9 }, ['okx', 'hyperliquid']);
  assert.equal(P.days, 90); assert.deepEqual(P.oiVenues, ['okx'], 'Hyperliquid has 20 OI days: left out of OI ranks'); assert.deepEqual(P.fundVenues, ['okx', 'hyperliquid']);
  assert.ok(P.fund > 90 && P.lev > 90, `high funding / OI rank high (${P.fund}, ${P.lev})`);
  const P2 = LC.percentiles(hist(140, { hl: 100 }), 'BTC', { fx: { okx: 0 }, oiUsd: { okx: 1e9, hyperliquid: 5e8 }, mcap: 2e9 }, ['okx', 'hyperliquid']);
  assert.deepEqual(P2.oiVenues, ['okx', 'hyperliquid'], 'with 40 recorded days Hyperliquid joins');
});
t('floor funding is neutral live too: settlements at 0.01 %/8h count 0', () => {
  const now = Date.now(), fh = [{ t: now - 3e7, r: 1e-4 }, { t: now - 2e7, r: 1e-4 }, { t: now - 1e7, r: 3e-4 }];
  assert.equal(Math.round(LC.liveExcess(fh, now)), 100);
});
t('regimes: ranked against the 90 closed days BEFORE the day; later days and open days are never read', () => {
  const F = hist(130, { fx: (i) => (i === 120 ? 500 : 50 + (i % 7)) }), day = dk(120);
  const a = LC.regimes(F, 'BTC', day); assert.equal(a.funding_regime.to, 'high'); assert.equal(a.funding_regime.ctx.days, 90);
  const G = JSON.parse(JSON.stringify(F)); for (let i = 121; i < 130; i++) G[0].days[dk(i)].BTC[2] = [-999, -999, 3, 1, 23];
  assert.deepEqual(LC.regimes(G, 'BTC', day), a, 'changing every later day changes nothing');
  const O = JSON.parse(JSON.stringify(F)); delete O[0].final[day]; assert.deepEqual(LC.regimes(O, 'BTC', day), {}, 'a day not yet final: no regime');
  const U = hist(130, { oi: (i) => (i === 120 ? 1.5e6 : 1e6 * (1 + 0.01 * Math.sin(i))) }); assert.equal(LC.regimes(U, 'BTC', day).oi_regime.to, 'building');
  const W = hist(130, { oi: (i) => (i === 120 ? 0.6e6 : 1e6 * (1 + 0.01 * Math.sin(i))) }); assert.equal(LC.regimes(W, 'BTC', day).oi_regime.to, 'unwinding');
  assert.deepEqual(LC.regimes(hist(25), 'BTC', dk(20)), {}, 'under 30 prior days: none');
});
t('ledger: funding_regime / oi_regime at the daily close, first = start (from null), then changes only, idempotent', () => {
  const F = hist(130, { fx: (i) => (i >= 120 ? 500 : 50 + (i % 7)) }), L = { files: {}, all: [] };
  const ob = (i) => { const tt = D0 + (i + 1) * DAY; return { t: tt, px: 100, patterns: [], verdict: { to: 'Wait', ctx: { seen: new Date(tt + 36e5).toISOString().replace(/\.\d+Z$/, 'Z') } }, lev: levState(F, tt, 'BTC') }; };
  const k = (r) => r.add.filter((e) => e.kind !== 'verdict').map((e) => [e.kind, e.from, e.to]);
  assert.deepEqual(k(step(L, 'BTC', ob(116))), [['funding_regime', null, 'normal'], ['oi_regime', null, 'normal']]);
  assert.deepEqual(k(step(L, 'BTC', ob(116))), [], 'same observation twice adds nothing');
  assert.deepEqual(k(step(L, 'BTC', ob(120))), [['funding_regime', 'normal', 'high']]);
  const e = L.all.find((x) => x.kind === 'funding_regime' && x.to === 'high'); assert.equal(e.t, new Date(D0 + 121 * DAY).toISOString().replace(/\.\d+Z$/, 'Z')); assert.ok(e.ctx.seen && e.ctx.pct >= 90);
});
t('validator lev: schema, future days / hours, a closed day that changed, size caps', () => {
  const val = (...a) => spawnSync('python3', ['scripts/validate.py', 'lev', ...a], { encoding: 'utf8' });
  const d = tmp(), pv = tmp(), F = hist(40)[0]; F.year = 2026; F.cols = ['px', 'mc', 'okx', 'hyperliquid'];
  fs.writeFileSync(path.join(d, 'daily-2026.json'), JSON.stringify(F)); fs.writeFileSync(path.join(pv, 'daily-2026.json'), JSON.stringify(F));
  fs.writeFileSync(path.join(d, 'recent.json'), JSON.stringify({ v: 1, unit: 'kUSD', hours: { '2026-08-09T05': { BTC: [1000, null] } } }));
  const NOW = ['--now', '2026-08-15T00:00:00Z']; let r = val('--dir', d, '--prev-dir', pv, ...NOW); assert.equal(r.status, 0, r.stdout);
  const G = JSON.parse(JSON.stringify(F)); G.days[dk(3)].BTC[2][0] = 1; fs.writeFileSync(path.join(d, 'daily-2026.json'), JSON.stringify(G));
  assert.match(val('--dir', d, '--prev-dir', pv, ...NOW).stdout, /a closed day changed/);
  fs.writeFileSync(path.join(d, 'daily-2026.json'), JSON.stringify(F)); assert.match(val('--dir', d, '--prev-dir', pv, '--now', '2026-08-05T00:00:00Z').stdout, /future day|final before it ended/);
  const B = JSON.parse(JSON.stringify(F)); B.days[dk(2)].BTC[2] = [1, 2, 0, 5, 23]; fs.writeFileSync(path.join(d, 'daily-2026.json'), JSON.stringify(B));
  assert.match(val('--dir', d, '--prev-dir', tmp(), ...NOW).stdout, /funding \/ settlements/);
  fs.writeFileSync(path.join(d, 'daily-2026.json'), JSON.stringify(F)); fs.writeFileSync(path.join(d, 'recent.json'), JSON.stringify({ v: 1, unit: 'kUSD', hours: { '2026-08-16T05': { BTC: [1, null] } } }));
  assert.match(val('--dir', d, '--prev-dir', pv, ...NOW).stdout, /none in the future/);
  fs.writeFileSync(path.join(d, 'recent.json'), JSON.stringify({ v: 1, unit: 'kUSD', hours: {}, pad: 'x'.repeat(151 * 1024) }));
  assert.match(val('--dir', d, '--prev-dir', pv, ...NOW).stdout, /over the 150 KB cap/);
});
t('workflows: positioning builds and validates data/lev and is in the heartbeat; lev-core shipped', () => {
  const pw = fs.readFileSync('.github/workflows/positioning.yml', 'utf8'), hb = fs.readFileSync('.github/workflows/heartbeat.yml', 'utf8');
  assert.match(pw, /validate\.py lev/); assert.match(pw, /git add positioning\.json data\/lev/); assert.match(hb, /for w in [^\n]*\bpositioning\.yml\b/); assert.match(hb, /-50 min/);
  assert.match(fs.readFileSync('scripts/build_positioning.py', 'utf8'), /lev_hist\.main\(\)/);
  assert.match(fs.readFileSync('index.html', 'utf8'), /min\/lev-core\.js\?v=\d+"><\/script>\s*<script src="min\/leverage\.js/); assert.match(fs.readFileSync('sw.js', 'utf8'), /'min\/lev-core\.js'/);
  assert.match(fs.readFileSync('scripts/build_min.sh', 'utf8'), /\blev-core\b/);
});

// ---------- Phase 2 audit L2, L3, L5 ----------
t('L2: recent.json flow amounts are whole USD (v2); a v1 file is migrated, not dropped; the daily file stays kUSD', () => {
  const f = { L: {}, S: {} }; for (const sd of ['L', 'S']) for (const k of ['open', 'close', 'inc', 'red', 'flip']) f[sd][k] = [0, 0]; f.S.inc = [1, 450]; f.dL = 0; f.dS = 450; f.net = -450;
  const row = sm('flow_row', f); assert.equal(row[1], 450); assert.equal(row[2 + 10 + 4 + 1], 450, 'S.inc usd');
  const v1 = { v: 1, unit: 'kUSD', runs: [{ t: '2026-11-09T01:07:00Z', t0: '2026-11-09T00:37:00Z', panel: '2026-11-09T00:07:00Z', c: { BTC: [1, 2, 3, 4, 5, [2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 7, 0, 0, 0, 0, 0, 0, 0, 0]] } }] };
  const R = sm('recent_add', v1, { t: '2026-11-09T02:07:00Z', t0: '2026-11-09T01:07:00Z', panel: '2026-11-09T00:07:00Z', w: 1, m: 1, nf: null, c: { BTC: [1, 2, 3, 4, 5, row] } }, '2026-11-09T03:00:00Z');
  assert.equal(R.v, 2); assert.equal(R.flowUnit, 'USD'); assert.equal(R.runs.length, 2); assert.deepEqual(R.runs[0].c.BTC[5].slice(0, 2), [2000, 1000]); assert.equal(R.runs[0].c.BTC[5][12], 3, 'counts unchanged'); assert.equal(R.runs[0].c.BTC[5][13], 7000);
  const D = sm('daily_add', null, R.runs[1], 2026); assert.deepEqual(D.days['2026-11-09'].c.BTC.slice(5), [0, 0], '450 USD = 0 kUSD in the daily file');
});
t('L3: sm_flow reads a day only once a run of a later day is in the file', () => {
  const SEL = '2026-11-09T00:07:00Z', row = (dL) => ({ panel: SEL, first: '', last: '', runs: 4, flowRuns: 3, flowFrom: SEL, c: { BTC: [1, 1, 50000, 50000, 1, dL, 0] } });
  const days = { '2026-11-10': { ...row(9000), last: '2026-11-10T23:37:00Z' }, '2026-11-11': { ...row(9000), last: '2026-11-11T23:07:00Z' } }, sig = Date.UTC(2026, 10, 12);
  assert.equal(flowState(days, sig, 'BTC'), null, 'the 23:37 run of 11-11 may still be uncommitted');
  days['2026-11-12'] = { ...row(0), last: '2026-11-12T00:07:00Z' }; assert.equal(flowState(days, sig, 'BTC').to, 'net_buy');
});
t('L5: weekly panel members kept (first week full, later weeks add / drop), idempotent, rebuilds exactly', () => {
  const P = (sel, week, as) => ({ selected: sel, week, wallets: as.map((a) => ({ a })) });
  let H = sm('panels_add', null, P('2026-11-09T00:07:00Z', '2026-11-09T00:00:00Z', ['0xa', '0xb', '0xc']));
  H = sm('panels_add', H, P('2026-11-09T00:07:00Z', '2026-11-09T00:00:00Z', ['0xa', '0xb', '0xc']));
  H = sm('panels_add', H, P('2026-11-16T00:07:00Z', '2026-11-16T00:00:00Z', ['0xb', '0xc', '0xd']));
  assert.equal(H.weeks.length, 2); assert.deepEqual(H.weeks[0].full, ['0xa', '0xb', '0xc']); assert.deepEqual([H.weeks[1].add, H.weeks[1].drop], [['0xd'], ['0xa']]);
  const m = JSON.parse(execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'scripts'); import sm_lib as L; print(json.dumps([sorted(x[2]) for x in L.panels_members(json.loads(sys.argv[1]))]))`, JSON.stringify(H)]).toString());
  assert.deepEqual(m, [['0xa', '0xb', '0xc'], ['0xb', '0xc', '0xd']]);
  const d = tmp(); fs.writeFileSync(path.join(d, 'panels-2026.json'), JSON.stringify(H));
  const pv = tmp(), Hp = JSON.parse(JSON.stringify(H)); Hp.weeks[0].full = ['0xa', '0xb', '0xz']; fs.writeFileSync(path.join(pv, 'panels-2026.json'), JSON.stringify(Hp));
  const r = spawnSync('python3', ['scripts/validate.py', 'sm', '--dir', d, '--smart', path.join(d, 'none.json'), '--prev-dir', pv, '--now', '2026-11-17T00:00:00Z'], { encoding: 'utf8' });
  assert.match(r.stdout, /an earlier week changed/);
});
console.log(`PASS leverage-p4 (${n} groups)`);
