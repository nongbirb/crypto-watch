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

t('history: daily funding = mean 8h-equivalent; excess = average - the venue default (100 ppm), continuous (audit M3); settlements counted', () => {
  const h = 36e5, rows = [[D0 + 0 * h, 1e-4], [D0 + 8 * h, 3e-4], [D0 + 16 * h, -2e-4], [D0 + 24 * h, 1e-4], [D0 + 48 * h, 0.99e-4]];
  const r = pyc(`print(json.dumps(H.fund_days(${JSON.stringify(rows)})))`);
  assert.deepEqual(r[dk(0)], [66.67, -33.33, 3]); assert.deepEqual(r[dk(1)], [100, 0, 1], 'a day at the default = 0 excess');
  assert.deepEqual(r[dk(2)], [99, -1, 1], 'just under the default is just below 0, not 99 ppm of excess');
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
    const fx = f.fx ? f.fx(i) : 30 + 30 * osc; // stored fx = f - 100 (audit M3)
    days[d] = { BTC: [100 * (1 + 0.01 * osc), 2000, [fx + 100, fx, 3, f.oi ? f.oi(i) : 1e6 * (1 + 0.05 * osc), 24], f.hl && i >= f.hl ? [120, 20, 24, 5e5, 12] : [120, 20, 24, null, null]] };
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
  // Phase 4 audit L2: OI ranks use only days where both venues have a reading, and say how many
  assert.equal(P2.days, 90); assert.equal(P2.oiDays, 40, 'the OI window shrinks to the 40 days with a Hyperliquid reading'); assert.equal(P2.oiFrom, dk(100));
  assert.equal(P.oiDays, 90, 'OKX alone: every day');
});
t('Phase 4 audit L1: funding across venues is one measure every day (plain mean), with or without OI, in history and live', () => {
  const r = { BTC: [100, 2000, [150, 50, 3, 3e6, 24], [110, 10, 24, null, null]] }, r2 = { BTC: [100, 2000, [150, 50, 3, 3e6, 24], [110, 10, 24, 1e6, 12]] };
  assert.equal(LC.fund(r, 'BTC', ['okx', 'hyperliquid']), 30, 'no Hyperliquid OI: (50 + 10) / 2');
  assert.equal(LC.fund(r2, 'BTC', ['okx', 'hyperliquid']), 30, 'with Hyperliquid OI: the same, not OI-weighted (it was (50 x 3 + 10) / 4 = 40)');
  const P = LC.percentiles(hist(60), 'BTC', { fx: { okx: 50, hyperliquid: 10 }, oiUsd: { okx: 3e9, hyperliquid: 1e9 }, mcap: 2e9 }, ['okx', 'hyperliquid']);
  assert.equal(P.fxNow, 30, 'live: the same plain mean, not weighted by live OI');
});
t('live excess funding is the same measure: 24h mean - the default of 0.01 %/8h (audit M3)', () => {
  const now = Date.now(), fh = [{ t: now - 3e7, r: 1e-4 }, { t: now - 2e7, r: 1e-4 }, { t: now - 1e7, r: 3e-4 }, { t: now - 9e7, r: 9e-4 }];
  assert.equal(Math.round(LC.liveExcess(fh, now)), 67, '(100 + 100 + 300) / 3 - 100; settlements older than 24h ignored');
  assert.equal(Math.round(LC.liveExcess([{ t: now - 1e7, r: 0.99e-4 }], now)), -1);
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
  const G = JSON.parse(JSON.stringify(F)); G.days[dk(3)].BTC[2][3] = 1; fs.writeFileSync(path.join(d, 'daily-2026.json'), JSON.stringify(G));
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
  // audit H1: a rejected data/lev never blocks positioning.json: validate (continue-on-error) -> restore data/lev -> commit -> fail the job
  const ix = (x) => pw.indexOf(x); assert.match(pw, /id: levval\s+continue-on-error: true\s+run: python3 scripts\/validate\.py lev/);
  assert.ok(ix('validate.py lev') < ix('git checkout HEAD -- data/lev') && ix('git checkout HEAD -- data/lev') < ix('name: Commit') && ix('name: Commit') < ix("::error::validate.py lev rejected"), 'restore before commit, fail after');
  assert.match(pw, /git add positioning\.json; if \[ -d data\/lev \]; then git add data\/lev; fi/); assert.match(hb, /for w in [^\n]*\bpositioning\.yml\b/); assert.match(hb, /-50 min/);
  assert.match(fs.readFileSync('scripts/build_positioning.py', 'utf8'), /lev_hist\.main\(\)/);
  assert.match(fs.readFileSync('index.html', 'utf8'), /min\/lev-core\.js\?v=\d+"><\/script>\s*<script src="min\/leverage\.js/); assert.match(fs.readFileSync('sw.js', 'utf8'), /'min\/lev-core\.js'/);
  assert.match(fs.readFileSync('scripts/build_min.sh', 'utf8'), /\blev-core\b/);
});

// ---------- audit M1, M2: readings stored under the moment they describe ----------
t('M1: OKX open-interest rows hold the value at the END of their period: 1D at ts + 24h, 1H at ts + 1h, open periods skipped', () => {
  const ms = (s) => Date.parse(s), NOW = ms('2026-11-13T22:02:00Z');
  const r = pyc(`
def fake(u, body=None):
    if 'period=1D' in u: return {'code': '0', 'data': [[str(${ms('2026-11-13T16:00:00Z')}), '0', '0', '2312500000'], [str(${ms('2026-11-12T16:00:00Z')}), '0', '0', '2361500000']]}
    return {'code': '0', 'data': [[str(${ms('2026-11-13T21:00:00Z')}), '0', '0', '2312500000'], [str(${ms('2026-11-13T15:00:00Z')}), '0', '0', '2361500000'], [str(${ms('2026-11-12T23:00:00Z')}), '0', '0', '2400000000']]}
H.get = fake
print(json.dumps({'d': H.okx_oi('BTC-USDT-SWAP', '1D', ${NOW}), 'h': H.okx_oi('BTC-USDT-SWAP', '1H', ${NOW}), 'at': [H.at(${ms('2026-11-13T16:00:00Z')}), H.at(${ms('2026-11-13T00:00:00Z')}), H.at(${ms('2026-11-13T07:55:00Z')})]}))`);
  assert.deepEqual(r.d, [[ms('2026-11-13T16:00:00Z'), 2361500000]], '1D "11-12 16:00" is the reading at 11-13 16:00; the in-progress "11-13 16:00" row is skipped');
  assert.deepEqual(r.h.find((x) => x[1] === 2361500000), [ms('2026-11-13T16:00:00Z'), 2361500000], 'the same value as the hourly row "15:00" + 1h');
  assert.deepEqual(r.h.find((x) => x[1] === 2400000000)[0], ms('2026-11-13T00:00:00Z'));
  assert.deepEqual(r.at, [['2026-11-13', 16], ['2026-11-12', 24], ['2026-11-13', 7]], '00:00 UTC is the close of the day before (hour 24)');
});
t('M2: CoinGecko\'s 00:00 UTC point of day D is stored as the close of D - 1; the intraday point is skipped', () => {
  const ms = (s) => Date.parse(s);
  const r = pyc(`
H.get = lambda u, body=None: {'prices': [[${ms('2026-11-12T00:00:00Z')}, 74015.2], [${ms('2026-11-13T00:00:00Z')}, 71460.4], [${ms('2026-11-13T22:02:11Z')}, 70999.0]], 'market_caps': [[${ms('2026-11-12T00:00:00Z')}, 1.47e12], [${ms('2026-11-13T00:00:00Z')}, 1.42e12], [${ms('2026-11-13T22:02:11Z')}, 1.41e12]]}
print(json.dumps(H.cg_daily('bitcoin')))`);
  assert.deepEqual(r, { '2026-11-11': [74015.2, 1470000], '2026-11-12': [71460.4, 1420000] });
});

// ---------- audit H1: a failed fetch at the day boundary leaves the day open; final days are never written ----------
t('H1: a day is final only after a fully successful run (or 3 days after it was first written); a final day is never written again', () => {
  const dir = tmp(), runs = [];
  const run = (when, fail = [], f = 1.5e-4, oi = 2e9, prev) => {
    const out = JSON.parse(execFileSync('python3', ['-c', `
import sys, json, datetime as dt; sys.path.insert(0, 'scripts'); import lev_hist as H
H.DIR = ${JSON.stringify(dir)}; FAIL = set(${JSON.stringify(fail)}); NOW = dt.datetime.fromisoformat(${JSON.stringify(when)}.replace('Z', '+00:00')); N = int(NOW.timestamp() * 1000)
def settl(since, step, r): return [(t, r) for t in range((since // step + 1) * step, N + 1, step)]
src = {'sleep': lambda s: None,
  'hl_ctx': lambda: None if 'ctx' in FAIL else {s: ${oi} for s in ['BTC', 'ETH', 'MON', 'HYPE', 'AAVE', 'LIT', 'SOL', 'NEAR', 'PENDLE']},
  'okx_funding': lambda inst, since: None if 'okxf' in FAIL else settl(since, 8 * 3600000, ${f}),
  'hl_funding': lambda coin, since: None if 'hlf' in FAIL else settl(since, 3600000, ${f} / 8 * 8),
  'okx_oi': lambda inst, per, now: None if 'oi' in FAIL else [(t, ${oi}) for t in range(((now - 100 * 3600000) // 3600000) * 3600000, now + 1, 3600000 if per == '1H' else 86400000) if t <= now],
  'cg_daily': lambda cid: None if 'cg' in FAIL else {H.day_of(t - 1): [100.0, 5] for t in range(((N - 90 * 86400000) // 86400000 + 1) * 86400000, N + 1, 86400000)}}
H.main(NOW, src); Y = json.load(open(H.DIR + '/daily-2026.json')); print('RESULT ' + json.dumps({'final': sorted(Y['final']), 'pending': Y.get('pending', {}), 'd12': Y['days'].get('2026-11-12', {}).get('BTC')}))`]).toString().split('\n').find((l) => l.startsWith('RESULT ')).slice(7));
    const snap = fs.mkdtempSync(path.join(os.tmpdir(), 'levsnap-')); for (const x of fs.readdirSync(dir)) fs.copyFileSync(path.join(dir, x), path.join(snap, x)); runs.push(snap);
    if (prev) { const v = spawnSync('python3', ['scripts/validate.py', 'lev', '--dir', dir, '--prev-dir', prev, '--now', when], { encoding: 'utf8' }); assert.equal(v.status, 0, `${when}: ${v.stdout}`); }
    return out; };
  const a = run('2026-11-12T20:00:00Z');                                      // complete, 11-12 still open (today)
  assert.ok(!a.final.includes('2026-11-12') && a.final.includes('2026-11-11'));
  const b = run('2026-11-13T00:30:00Z', ['hlf', 'cg'], 1.5e-4, 2e9, runs[0]); // first run after midnight, two fetches fail
  assert.ok(!b.final.includes('2026-11-12'), 'a failed fetch keeps 11-12 open'); assert.ok(b.pending['2026-11-12']);
  const c = run('2026-11-13T01:30:00Z', [], 1.5e-4, 2e9, runs[1]);            // complete: the gap is filled, then final; validator passes
  assert.ok(c.final.includes('2026-11-12')); assert.equal(c.d12[3][2], 24, 'Hyperliquid funding completed (24 settlements)'); assert.equal(c.d12[0], 100);
  const d = run('2026-11-13T02:30:00Z', [], 9e-4, 3e9, runs[2]);              // different values later: the final day is not written
  assert.deepEqual(d.d12, c.d12, 'a final day never changes');
  // grace: failures every run -> a day is final as it is 3 days after it was first written
  const g1 = run('2026-11-13T03:30:00Z', ['ctx'], 1.5e-4, 2e9, runs[3]); assert.ok(!g1.final.includes('2026-11-13'));
  const g2 = run('2026-11-16T04:00:00Z', ['ctx', 'cg'], 1.5e-4, 2e9); assert.ok(g2.final.includes('2026-11-13'), '3 days after first written: final as it is');
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
