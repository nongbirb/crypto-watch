// Phase 5 Business Pulse (docs/architect-proof-layer.md §6, docs/business-pulse-p5.md): builder maths and stored-history rules, no network.
// Day stamping (a day under the moment it describes), 30-day totals and changes from stored history, ratios "last 30 days x 12",
// final days never rewritten, a failed or lagging source keeps a day open, grace, pruning, cards = stored history (validator),
// missing values omitted, workflow / heartbeat wiring. Usage: node tests/pulse-p5.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', name); };
const py = (code) => JSON.parse(execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'scripts'); import pulse as P\n${code}`]).toString().trim().split('\n').pop());
const DAY = 86400, ts = (d) => Date.parse(d + 'T00:00:00Z') / 1000, iso = (s) => new Date(s * 1000).toISOString().slice(0, 10);

t('day stamping: a DefiLlama day point is that day (the open day dropped); a level snapshot at D 00:00 is the close of D - 1', () => {
  const r = py(`T='2026-11-15'
print(json.dumps({'day': P.day_points([[${ts('2026-11-13')}, 5], [${ts('2026-11-14')}, 6], [${ts('2026-11-15')}, 7], [${ts('2026-11-14') + 3600}, 9]], T),
  'close': P.close_points([[${ts('2026-11-14')}, 50], [${ts('2026-11-15')}, 60], [${ts('2026-11-15') + 32100}, 61]], T)}))`);
  assert.deepEqual(r.day, { '2026-11-13': 5, '2026-11-14': 6 }, 'today (still open) and an intraday point are not stored');
  assert.deepEqual(r.close, { '2026-11-13': 50, '2026-11-14': 60 }, 'the 11-15 00:00 snapshot is the close of 11-14; the live point is skipped');
});
const mk = (key, f, n0 = 70, end = '2026-11-14') => { const o = {}; for (let i = 0; i < n0; i++) { const d = iso(ts(end) - i * DAY); o[d] = { [key]: f(i) }; } return o; };
t('30-day totals need 30 days in a row; the change compares with the 30 days before; per-day average divides by 30', () => {
  const days = mk('hl.fees', (i) => (i < 30 ? 2 : 1)), r = py(`D=json.loads('${JSON.stringify(days)}')
print(json.dumps([P.sum_line(D, 'hl.fees', [], per_day=True), P.sum_line(D, 'hl.fees', []), P.sum30(P.ser(D, 'hl.fees'), '2026-11-14')]))`);
  assert.equal(r[0].v, 2); assert.equal(r[0].chg, 100, '60 vs 30 = +100 %'); assert.equal(r[0].win, 30); assert.equal(r[0].day, '2026-11-14'); assert.equal(r[1].v, 60); assert.equal(r[2], 60);
  delete days['2026-11-01']; const g = py(`D=json.loads('${JSON.stringify(days)}')
print(json.dumps(P.sum_line(D, 'hl.fees', [])))`);
  assert.equal(g, null, 'a gap inside every recent 30-day window: no total at all (never filled)');
  const r2 = py(`D=json.loads('${JSON.stringify(mk('x', () => 1, 35))}')
print(json.dumps(P.sum30(P.ser(D, 'x'), '2026-11-14')))`); assert.equal(r2, 30);
  const gap = py(`D=json.loads('${JSON.stringify(days)}')
print(json.dumps(P.sum30(P.ser(D, 'hl.fees'), '2026-11-14')))`); assert.equal(gap, null, 'one missing day inside the 30 = no total (never filled)');
});
t('level lines: % change for amounts, percentage points for shares, a signed difference for flows; no change without a value 30 days earlier', () => {
  const days = { ...mk('mon.tvl', (i) => (i === 0 ? 90 : 100), 31) }; days['2026-11-14']['sol.stake'] = 67.3; days['2026-10-15']['sol.stake'] = 65.0; days['2026-11-14']['eth.l2net'] = -5; days['2026-10-15']['eth.l2net'] = 7;
  const r = py(`D=json.loads('${JSON.stringify(days)}')
print(json.dumps([P.level_line(D, 'mon.tvl', []), P.level_line(D, 'sol.stake', [], kind='pp'), P.level_line(D, 'eth.l2net', [], kind='abs'), P.level_line({'2026-11-14': {'mon.tvl': 5}}, 'mon.tvl', [])]))`);
  assert.equal(r[0].chg, -10); assert.equal(Math.round(r[1].chg * 100) / 100, 2.3); assert.equal(r[2].chg, -12); assert.equal(r[3].chg, null); assert.equal(r[3].v, 5);
});
t('ratios state their window: market cap at the close of D / (sum of the 30 days ending D x 12)', () => {
  const days = mk('lt.fees', () => 1000, 61); for (const d of Object.keys(days)) days[d]['LIT.mcap'] = d === '2026-11-14' ? 720000 : 360000;
  const r = py(`D=json.loads('${JSON.stringify(days)}')
print(json.dumps(P.ratio_line(D, 'lit.mcf', 'LIT.mcap', 'lt.fees', [])))`);
  assert.equal(r.v, 2, '720000 / (30000 x 12)'); assert.equal(r.annualise, '30x12'); assert.equal(r.chg, 100, 'vs 360000 / (30000 x 12) = 1');
});
t('shares and utilisation: Lighter / (Lighter + Hyperliquid) OI; Aave borrowed / (borrowed + TVL)', () => {
  const days = { '2026-11-14': { 'lt.oi': 1, 'hl.oi': 9, 'aave.borrowed': 30, 'aave.tvl': 70 }, '2026-10-15': { 'lt.oi': 1, 'hl.oi': 4, 'aave.borrowed': 20, 'aave.tvl': 80 } };
  const r = py(`D=json.loads('${JSON.stringify(days)}')
print(json.dumps([P.share_line(D, []), P.util_line(D, [])]))`);
  assert.equal(r[0].v, 10); assert.equal(r[0].chg, -10); assert.equal(r[0].kind, 'pp'); assert.equal(r[1].v, 30); assert.equal(r[1].chg, 10);
});
t('HYPE net per day = 30-day average buybacks - new circulating supply / 30 x price at the close; needs 30 days of stored supply', () => {
  const days = mk('hl.hrev', () => 3000, 61); for (const d of Object.keys(days)) { days[d]['HYPE.px'] = 10; }
  days['2026-11-14']['HYPE.circ'] = 1300; days['2026-10-15']['HYPE.circ'] = 1000;
  const r = py(`D=json.loads('${JSON.stringify(days)}')
print(json.dumps(P.hype_net(D, [])))`);
  assert.equal(r.v, 3000 - (300 / 30) * 10, '3000 - 100'); assert.equal(r.chg, null, 'no supply reading 60 days back, so no change');
  delete days['2026-10-15']['HYPE.circ']; const z = py(`D=json.loads('${JSON.stringify(days)}')
print(json.dumps(P.hype_net(D, [])))`); assert.equal(z, null, 'without a supply reading 30 days earlier the line is left out');
});
t('MON next unlock as % of circulating: supply_pct of max supply x max (else total) / circulating', () => {
  const r = py(`cal={'events':[{'type':'unlock','tokens':['MON'],'date':'2026-11-24','supply_pct':16.76,'url':'u'},{'type':'unlock','tokens':['MON'],'date':'2026-11-01','supply_pct':50}]}
mk={'monad':{'max_supply':None,'total_supply':100e9,'circulating_supply':11.8e9}}
print(json.dumps(P.mon_unlock(cal, mk, ${ts('2026-11-15')})))`);
  assert.equal(r[0], Math.round(1676e9 / 11.8e9 * 100) / 100); assert.equal(r[1].date, '2026-11-24', 'the next one, not a past one');
});

// ---------- runs with fake sources ----------
function fakeRun(file, when, opt = {}) {
  const code = `import sys, json, calendar, time; sys.path.insert(0, 'scripts'); import pulse as P
NOW = calendar.timegm(time.strptime(${JSON.stringify(when)}, '%Y-%m-%dT%H:%M')); FAIL = set(${JSON.stringify(opt.fail || [])}); V = ${opt.v || 1}; PRE = ${opt.prelim ? 'True' : 'False'}
def pts(lag=0, mid=False):
    end = (NOW // 86400 - lag) * 86400; return [[end - i * 86400, V * 1000.0 + i] for i in range(70)]
def dim(slug, kind): return None if 'dim' in FAIL else pts(lag=1 if slug == 'lighter' and 'lag' in FAIL else 0)
SRC = {'dim': dim, 'oi': lambda s: pts(), 'protocol': lambda s: {'tvl': pts(), 'borrowed': pts()}, 'chain_tvl': lambda c: pts(), 'stables': lambda c=None: pts(),
  'cg_chart': lambda cid: {'mcap': pts(), 'px': pts()}, 'cg_markets': lambda ids: {'monad': {'max_supply': None, 'total_supply': 100.0, 'circulating_supply': 10.0}},
  'file': lambda n: {'positioning.json': {'updated': ${JSON.stringify(when)} + ':00Z', 'native': {'BTC': {'exflow': {'net': -5.0 * V, 'day': time.strftime('%Y-%m-%d', time.gmtime(NOW - 86400)), 'prelim': PRE}},
      'SOL': {'stake': {'pct': 60.0 + V, 'at': ${JSON.stringify(when)} + ':00Z'}}, 'HYPE': {'stake': {'circ': 300.0 * V, 'at': ${JSON.stringify(when)} + ':00Z'}}}},
    'interop.json': {'updated': ${JSON.stringify(when)} + ':00Z', 'chainData': [{'chainId': 'ethereum', 'netFlow': 7.0 * V}]},
    'calendar_auto.json': {'events': [{'type': 'unlock', 'tokens': ['MON'], 'date': '2099-01-01', 'supply_pct': 1.0}]}}.get(n)}
d = P.main(NOW, SRC, ${JSON.stringify(file)}); print(json.dumps({'final': sorted(d['final']), 'pending': d['pending'], 'failed': d['failed'], 'days': d['days'], 'cards': d['cards']}))`;
  return JSON.parse(execFileSync('python3', ['-c', code]).toString().trim().split('\n').pop());
}
const validate = (file, prev, now, extra = []) => spawnSync('python3', ['scripts/validate.py', 'pulse', '--file', file, ...(prev ? ['--prev', prev] : ['--base', 'NONE']), '--now', now, ...extra], { encoding: 'utf8' });
t('runs: backfill, a failed source keeps the newest day open, a preliminary flow keeps its day open, final days never change, grace, pruning', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-')), f = path.join(dir, 'pulse.json'), snap = (k) => { const p = path.join(dir, k + '.json'); fs.copyFileSync(f, p); return p; };
  const a = fakeRun(f, '2026-11-15T03:00'); const pa = snap('a');
  assert.ok(a.final.includes('2026-11-13') && a.final.includes('2026-11-14'), 'a complete run finalises the closed days');
  assert.ok(!a.final.includes('2026-11-15'), 'today is never final'); assert.equal(validate(f, null, '2026-11-15T03:00:00Z').status, 0);
  assert.equal(Object.keys(a.days).length, 62, 'KEEP = 61 closed days + today'); assert.equal(a.days['2026-11-15']['sol.stake'], 61, 'a reading is stored under the day it was read');
  assert.equal(a.days['2026-11-14']['stables'], 1000, 'the 11-15 00:00 snapshot is the 11-14 close');
  const b = fakeRun(f, '2026-11-16T01:00', { fail: ['dim'], v: 2 }); const pb = snap('b');
  assert.ok(!b.final.includes('2026-11-15') && b.pending['2026-11-15'], 'a failed source keeps 11-15 open'); assert.ok(b.failed.length);
  assert.equal(b.days['2026-11-14']['stables'], 1000, 'a final day is never written again (the source now says 2000)');
  let v = validate(f, pa, '2026-11-16T01:00:00Z'); assert.equal(v.status, 0, v.stdout);
  const c = fakeRun(f, '2026-11-16T04:00', { v: 2, prelim: true }); snap('c');
  assert.ok(!c.final.includes('2026-11-15'), 'the Coin Metrics day 11-15 is still preliminary: the day stays open'); assert.equal(c.days['2026-11-15']['btc.exnet'], -10);
  v = validate(f, pb, '2026-11-16T04:00:00Z'); assert.equal(v.status, 0, v.stdout);
  const d = fakeRun(f, '2026-11-16T07:00', { v: 2 }); assert.ok(d.final.includes('2026-11-15'), 'complete and no longer preliminary: final');
  const e = fakeRun(f, '2026-11-16T09:00', { v: 3 }); assert.deepEqual(e.days['2026-11-15'], d.days['2026-11-15'], 'a final day never changes');
  // grace: failing every run, a closed day becomes final 3 days after it ended, with whatever it holds
  const g = fakeRun(f, '2026-11-20T01:00', { fail: ['dim'], v: 3 }); assert.ok(g.final.includes('2026-11-16'), '11-16 ended 3+ days ago: final as it is'); assert.ok(!g.final.includes('2026-11-19'));
  assert.ok(!Object.keys(g.days).some((x) => x < '2026-09-20'), 'days older than the kept window are dropped');
  v = validate(f, path.join(dir, 'c.json'), '2026-11-20T01:00:00Z'); assert.equal(v.status, 0, v.stdout);
});
t('validator: rejects a changed closed day, a card number that is not the stored history, a line without a source, a future day', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulsev-')), base = path.join(dir, 'base.json'); fs.copyFileSync('tests/fixtures/pulse/pulse.json', base);
  const P = JSON.parse(fs.readFileSync(base, 'utf8')), now = P.updated, bad = (f, m) => { const q = JSON.parse(JSON.stringify(P)); f(q); const p = path.join(dir, 'x.json'); fs.writeFileSync(p, JSON.stringify(q)); const r = validate(p, base, now); assert.equal(r.status, 1, m); assert.match(r.stdout, /FAIL/); return r.stdout; };
  assert.equal(validate(base, base, now).status, 0);
  const d0 = Object.keys(P.final)[5]; const k0 = Object.keys(P.days[d0])[0];
  assert.match(bad((q) => { q.days[d0][k0] *= 1.01; }, 'closed day edited'), /closed day changed|card value differs/);
  bad((q) => { q.cards.AAVE[0].v *= 2; }, 'card value not from history');
  bad((q) => { q.cards.AAVE[0].src = []; }, 'no source');
  bad((q) => { q.cards.HYPE.push(q.cards.HYPE[0], q.cards.HYPE[0]); }, 'more than three numbers');
  bad((q) => { q.days['2099-01-01'] = {}; }, 'future day');
  bad((q) => { q.cards.MON = q.cards.MON.slice(1); }, 'a number the history supports is missing');
});
t('missing values: a line whose value is missing is omitted, not estimated', () => {
  const P = JSON.parse(fs.readFileSync('tests/fixtures/pulse/pulse.json', 'utf8'));
  for (const d of Object.keys(P.days)) delete P.days[d]['aave.borrowed'];
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pm-')), 'days.json'); fs.writeFileSync(f, JSON.stringify(P.days));
  const r = py(`c = P.cards(json.load(open(${JSON.stringify(f)})), {}); print(json.dumps([x['key'] for x in c['AAVE']]))`);
  assert.deepEqual(r, ['aave.rev', 'aave.mcr'], 'no utilisation line without the borrowed series');
});
t('wiring: build_onchain calls the pulse without blocking onchain.json; the workflow validates, restores, commits, then fails; heartbeat ~3-hourly', () => {
  const bo = fs.readFileSync('scripts/build_onchain.py', 'utf8'); assert.match(bo, /try:\n\s+import sys; sys\.path\.insert\(0, .*\); import pulse; pulse\.main\(\)\nexcept Exception as e:/);
  const w = fs.readFileSync('.github/workflows/onchain.yml', 'utf8'), ix = (x) => w.indexOf(x);
  assert.match(w, /id: pulseval\s+continue-on-error: true\s+run: python3 scripts\/validate\.py pulse/);
  assert.ok(ix('validate.py pulse') < ix('git checkout HEAD -- data/pulse.json') && ix('git checkout HEAD -- data/pulse.json') < ix('name: Commit') && ix('name: Commit') < ix('::error::validate.py pulse rejected'));
  const h = fs.readFileSync('.github/workflows/heartbeat.yml', 'utf8'); assert.match(h, /positioning\.yml onchain\.yml; do/); assert.match(h, /\[ "\$w" = onchain\.yml \] && recent3h "\$w"/); assert.match(h, /recent3h\(\) \{[^}]*-170 min/); assert.match(h, /-50 min/, 'the 50-minute guard of the others is unchanged');
});
console.log(`PASS pulse-p5 (${n} groups)`);
