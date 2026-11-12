// Proof Layer Phase 1 (docs/architect-proof-layer.md §2): shared verdict core, closed candles, no lookahead, nEff + bootstrap,
// time split, ledger append-only / idempotent / graded, validator rejects edited locked fields. Synthetic fixtures, no network.
// Usage: node tests/proof-layer.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { VC, DAY, walk, forward, nEffByTime, nEffResolved, blockBoot, summarize, quantile, tpBeforeStop, closedOnly } from '../scripts/proof-lib.mjs';
import { evaluate } from '../scripts/build_verdict_backtest.mjs';
import { observe, step, grade, saveLedger, loadLedger, buildSummary, fmtMonth, LOCKED, prove } from '../scripts/build_ledger.mjs';
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', name); };

// deterministic synthetic daily series with trend, cycles and noise (never market results)
const T0 = Date.UTC(2024, 0, 1);
function series(len, seed = 1) { let s = seed, c = 100; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); const k = [];
  for (let i = 0; i < len; i++) { const o = c; c = Math.max(1, c * (1 + 0.012 * Math.sin(i / 23) + 0.004 * Math.sin(i / 71) + (r() - 0.5) * 0.05)); k.push({ t: T0 + i * DAY, o, h: Math.max(o, c) * (1 + r() * 0.02), l: Math.min(o, c) * (1 - r() * 0.02), c, v: 1000, q: 1000 * c }); }
  return k; }
const clone = (k) => k.map((x) => ({ ...x }));

t('app.js uses the shared core (no second copy of the rule)', () => {
  const app = fs.readFileSync('app.js', 'utf8'), idx = fs.readFileSync('index.html', 'utf8'), mk = fs.readFileSync('scripts/build_min.sh', 'utf8');
  assert.doesNotMatch(app, /function compute\(/, 'compute lives in verdict-core.js'); assert.doesNotMatch(app, /function rsiSeries\(|function swings\(|function atr\(/);
  assert.match(app, /VC\.compute\(t, \{ closedOnly: true/, 'the app defaults to closed candles');
  assert.ok(idx.indexOf('min/verdict-core.js') > 0 && idx.indexOf('min/verdict-core.js') < idx.indexOf('min/app.js'), 'verdict-core loads before app.js');
  assert.match(mk, /\bverdict-core\b/, 'build_min.sh minifies verdict-core');
  assert.deepEqual(VC.STATES, ['Long', 'Wait', 'Avoid', 'Insufficient'], 'stored state codes unchanged');
});

t('closed candles: the bias does not change when only the open candle changes', () => {
  const k = series(320, 7), open = { ...k[k.length - 1], t: k[k.length - 1].t + DAY }, now = open.t + 5 * 36e5; // 05:00 UTC into the open day
  const h4 = []; for (let i = 0; i < 180; i++) { const tt = open.t - (170 - i) * 4 * 36e5, b = k.find((x) => x.t <= tt && tt < x.t + DAY) || open; h4.push({ t: tt, o: b.o, h: b.h, l: b.l, c: b.c, v: 1, q: b.c }); }
  const base = { d1: [...clone(k), open], h4, price: open.c };
  const A = VC.compute(base, { closedOnly: true, now });
  for (const m of [0.5, 0.8, 1.25, 2]) {
    const o2 = { ...open, c: open.c * m, h: Math.max(open.h, open.c * m), l: Math.min(open.l, open.c * m) };
    const h4b = h4.map((x) => (x.t + 4 * 36e5 > A.plan.closedAt ? { ...x, l: x.l * m * 0.9, c: x.c * m } : x)); // open 4h bars move too
    const B = VC.compute({ d1: [...clone(k), o2], h4: h4b, price: o2.c }, { closedOnly: true, now });
    for (const f of ['bias', 'stop', 'fair', 'vwap', 'close']) assert.equal(B.plan[f], A.plan[f], `${f} at ×${m}`);
    assert.deepEqual(B.plan.entry, A.plan.entry); assert.deepEqual(B.plan.tps, A.plan.tps); assert.equal(B.trend, A.trend);
    for (const f of ['ma50', 'ma200', 'hist', 'rsi']) assert.equal(B[f], A[f], f);
    assert.equal(B.plan.price, o2.c, 'live price is still shown');
  }
  assert.equal(A.plan.openDropped, true); assert.equal(A.plan.closedAt, open.t);
  const L1 = VC.compute(base), L2 = VC.compute({ ...base, d1: [...clone(k), { ...open, c: open.c * 2, h: open.c * 2 }] });
  assert.notEqual(L1.ma50, L2.ma50, 'without closedOnly the open candle does move the indicators (the bug this fixes)');
  // a candle without timestamps is never dropped (fixtures in tests/verdict.mjs keep their meaning)
  assert.equal(VC.compute({ d1: k.map(({ t: _, ...x }) => x), price: 5 }, { closedOnly: true }).plan.history, k.length);
});

t('no lookahead: changing bar t+1 (and everything after) never changes the state at t', () => {
  const k = series(520, 3), rows = walk(k), states = rows.map((r) => r.state);
  assert.ok(new Set(states).size >= 2, 'fixture produces more than one state ' + [...new Set(states)]);
  for (const cut of [210, 260, 333, 400, 480]) {
    const k2 = clone(k); for (let j = cut + 1; j < k2.length; j++) { const f = j % 2 ? 3 : 0.3; k2[j] = { ...k2[j], o: k2[j].o * f, h: k2[j].h * f * 1.1, l: k2[j].l * f * 0.9, c: k2[j].c * f }; }
    const r2 = walk(k2); for (let x = 0; rows[x] && rows[x].i <= cut; x++) assert.deepEqual(r2[x], rows[x], `state at bar ${rows[x].i} changed after editing bar ${cut + 1}`);
  }
  assert.equal(rows[0].i, 199, 'first case has 200 bars of history');
});

t('forward returns by time; TP1-before-stop is conservative on a bar that touches both', () => {
  const k = series(60, 9), by = new Map(k.map((x, i) => [x.t, i]));
  assert.equal(forward(k, by, 10, 7), (k[17].c / k[10].c - 1) * 100);
  const g = k.filter((_, i) => i !== 17), byg = new Map(g.map((x, i) => [x.t, i])); assert.equal(forward(g, byg, 10, 7), null, 'missing bar = no case, not a guess');
  const f = [{ t: 0, o: 10, h: 10, l: 10, c: 10 }, { t: DAY, o: 10, h: 13, l: 8, c: 10 }];
  assert.equal(tpBeforeStop(f, 0, 9, 12).st, 'stop', 'both touched on one bar = stop');
  assert.equal(tpBeforeStop([...f.slice(0, 1), { t: DAY, o: 10, h: 12.5, l: 9.5, c: 12 }], 0, 9, 12).R, 2);
  assert.equal(tpBeforeStop(f.slice(0, 1), 0, 9, 12).st, 'open');
});

t('effective n: one case per horizon window; resolved-case rule for patterns', () => {
  const d = (a) => a.map((x) => T0 + x * DAY);
  assert.equal(nEffByTime(d([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]), 7), 2);
  assert.equal(nEffByTime(d([0, 7, 8, 15]), 7), 3); assert.equal(nEffByTime(d([0, 1, 2]), 1), 3); assert.equal(nEffByTime(d(Array.from({ length: 300 }, (_, i) => i)), 30), 10, '300 consecutive days are 10 independent 30-day cases');
  assert.equal(nEffResolved([{ at0: 0, at1: 10 }, { at0: 5, at1: 12 }, { at0: 11, at1: 15 }, { at0: 16, at1: 20 }]), 3);
  assert.equal(nEffResolved([{ at0: 3, at1: 9 }, { at0: 9, at1: 9 }]), 1, 'detected on the resolution bar = not independent');
});

t('bootstrap: reproducible, ordered, fixed seed; summary never reports raw n as nEff', () => {
  const v = Array.from({ length: 200 }, (_, i) => Math.sin(i / 3) * 4 + (i % 7) - 3);
  const med = (a) => quantile([...a].sort((x, y) => x - y), 0.5);
  const a = blockBoot(v, 7, med, 42), b = blockBoot(v, 7, med, 42), c = blockBoot(v, 7, med, 43);
  assert.deepEqual(a, b); assert.notDeepEqual(a, c); assert.ok(a[0] <= med(v) && med(v) <= a[1], 'interval holds the sample median');
  const s = summarize(v.map((r, i) => ({ t: T0 + i * DAY, r })), 30, 'x'); assert.equal(s.n, 200); assert.equal(s.nEff, 7); assert.ok(s.ci[0] <= s.med && s.med <= s.ci[1]);
  assert.deepEqual(summarize([], 7, 'x'), { n: 0, nEff: 0 });
});

t('split by time: train windows end before the cut, test starts at it; baseline = same days', () => {
  const k = series(700, 5), rows = walk(k), cut = rows[Math.floor(0.7 * rows.length)].t;
  const tr = evaluate('X', k, rows, (a, b) => a < cut && b < cut, 'train'), te = evaluate('X', k, rows, (a) => a >= cut, 'test'), full = evaluate('X', k, rows, () => true, 'full');
  const by = new Map(k.map((x, i) => [x.t, i]));
  for (const h of [1, 7, 30]) {
    const expTr = rows.filter((r) => r.t < cut && r.t + h * DAY < cut && forward(k, by, r.i, h) != null).length, expTe = rows.filter((r) => r.t >= cut && forward(k, by, r.i, h) != null).length;
    assert.equal(tr.baseline['h' + h].n, expTr, 'train baseline ' + h); assert.equal(te.baseline['h' + h].n, expTe, 'test baseline ' + h);
    const sum = ['Long', 'Wait', 'Avoid'].reduce((a, s) => a + full.states[s]['h' + h].n, 0), ins = rows.filter((r) => r.state === 'Insufficient' && forward(k, by, r.i, h) != null).length;
    assert.equal(sum + ins, full.baseline['h' + h].n, 'states + insufficient = all days of the baseline');
    for (const s of ['Long', 'Wait', 'Avoid']) assert.ok(full.states[s]['h' + h].nEff <= full.states[s]['h' + h].n);
  }
  assert.equal(JSON.stringify(evaluate('X', k, rows, () => true, 'full')), JSON.stringify(full), 'reproducible');
});

/* ---------- ledger ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-'));
const val = (dir, prev) => { try { execFileSync('python3', ['scripts/validate.py', 'ledger', '--dir', dir, '--prev-dir', prev], { stdio: 'pipe' }); return 'OK'; } catch (e) { return String(e.stdout); } };
t('ledger: state changes only, idempotent, graded once, append-only, validator rejects edits', () => {
  const k = series(400, 11), D1 = path.join(tmp, 'a'), P0 = path.join(tmp, 'prev'); fs.mkdirSync(P0);
  const L = loadLedger(D1); const now = k[349].t + DAY + 3 * 36e5; // 03:00 UTC on day 350: bars 0..349 closed, bar 350 open
  const ob = observe('XYZ', k.slice(0, 351), null, now, 'test:XYZ');
  assert.equal(ob.t, k[349].t + DAY, 'signal time = close of the last closed bar'); assert.equal(ob.px, k[349].c, 'px = that close');
  const r1 = step(L, 'XYZ', ob); assert.equal(r1.add.filter((e) => e.kind === 'verdict').length, 1); assert.equal(r1.add[0].from, null, 'first observation is marked, not counted'); assert.equal(r1.add[0].px, +k[349].c.toPrecision(6));
  assert.equal(step(L, 'XYZ', ob).add.length, 0, 'running twice adds nothing');
  const ob2 = observe('XYZ', [...k.slice(0, 350), { ...k[350], c: k[350].c * 3, h: k[350].c * 3 }], null, now, 'test:XYZ');
  assert.equal(step(L, 'XYZ', ob2).add.length, 0, 'open candle changes add nothing');
  saveLedger(L, D1); const first = fs.readFileSync(path.join(D1, '2024-12.json'), 'utf8'); assert.equal(first, fmtMonth(L.files['2024-12']));
  assert.equal(val(D1, P0), 'OK'); fs.copyFileSync(path.join(D1, '2024-12.json'), path.join(P0, '2024-12.json'));
  // a later state change, then grading from closed candles
  const flip = { ...ob, t: ob.t + 2 * DAY, px: 50, verdict: { ...ob.verdict, to: ob.verdict.to === 'Avoid' ? 'Wait' : 'Avoid' }, patterns: [] };
  const r3 = step(L, 'XYZ', flip); assert.equal(r3.add.length, 1); assert.equal(r3.add[0].from, ob.verdict.to); assert.equal(r3.add[0].to, flip.verdict.to);
  assert.equal(step(L, 'XYZ', { ...flip, t: ob.t + DAY }).add.length, 0, 'an observation older than the newest entry is skipped (t never decreases)');
  const g = grade(L, { XYZ: closedOnly(k, k[399].t + DAY) }), e0 = L.all[0];
  assert.ok(g.n >= 3); const rr = (j) => Math.round((k[j].c / e0.px - 1) * 100 * 100) / 100; assert.equal(e0.r1, rr(350)); assert.equal(e0.r7, rr(356)); assert.equal(e0.r30, rr(379));
  assert.equal(grade(L, { XYZ: k }).n, 0, 'grades are filled once');
  saveLedger(L, D1); assert.equal(val(D1, P0), 'OK', 'appending + grading passes');
  fs.copyFileSync(path.join(D1, '2024-12.json'), path.join(P0, '2024-12.json'));
  const sum = buildSummary(L, { XYZ: k }, now); assert.equal(sum.changes, L.all.filter((e) => e.from !== null).length); assert.ok(sum.rows.every((r) => r.h7.nEff <= r.h7.n));
  // tampering
  const good = fs.readFileSync(path.join(D1, '2024-12.json'), 'utf8'), m = JSON.parse(good), wr = (o) => fs.writeFileSync(path.join(D1, '2024-12.json'), fmtMonth(o));
  for (const f of LOCKED) { const o = JSON.parse(good); const e = o.entries[0];
    const other = (v) => ['Long', 'Wait', 'Avoid'].find((x) => x !== v);
    e[f] = f === 'ctx' ? { ...e.ctx, close: 1 } : f === 'px' ? e.px * 1.01 : f === 't' ? e.t.replace(':00:00Z', ':00:01Z') : f === 'from' || f === 'to' ? other(e[f]) : e[f] + 'x';
    wr(o); assert.match(val(D1, P0), /FAIL/, 'edited locked field ' + f); }
  { const o = JSON.parse(good); o.entries[0].r1 += 1; wr(o); assert.match(val(D1, P0), /r1 changed/); }
  { const o = JSON.parse(good); o.entries.shift(); wr(o); assert.match(val(D1, P0), /FAIL/, 'removed entry'); }
  { const o = JSON.parse(good); o.entries.reverse(); wr(o); assert.match(val(D1, P0), /FAIL/, 'reordered'); }
  { const o = JSON.parse(good); o.entries.push({ ...o.entries[0], id: 'x' }); wr(o); assert.match(val(D1, P0), /t must not decrease|FAIL/); }
  { const o = JSON.parse(good); o.entries[1].to = 'Bullish'; wr(o); assert.match(val(D1, P0), /FAIL/, 'verdict entries keep the stored codes'); }
  wr(m); assert.equal(val(D1, P0), 'OK');
  fs.writeFileSync(path.join(D1, '2024-12.json'), 'x'.repeat(201 * 1024)); assert.match(val(D1, P0), /cap/, 'size cap');
  fs.writeFileSync(path.join(D1, '2024-12.json'), good);
});

await (async () => { // lock proof: first commit holding the entry + a GitHub push (server timestamp) that contains it
  const R = path.join(tmp, 'repo'); fs.mkdirSync(R); const g = (...a) => execFileSync('git', a, { cwd: R, stdio: 'pipe' }).toString().trim();
  g('init', '-q'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
  const L = { files: { '2024-12': { month: '2024-12', entries: [{ id: 'A', t: '2024-12-16T00:00:00Z', sym: 'X', kind: 'verdict', from: null, to: 'Wait', px: 1, ctx: {} }] } } }; L.all = L.files['2024-12'].entries;
  saveLedger(L, R); g('add', '.'); g('commit', '-qm', 'a'); const c1 = g('rev-parse', 'HEAD');
  L.files['2024-12'].entries.push({ id: 'B', t: '2024-12-17T00:00:00Z', sym: 'X', kind: 'verdict', from: 'Wait', to: 'Avoid', px: 1, ctx: {} }); saveLedger(L, R); g('commit', '-qam', 'b'); const c2 = g('rev-parse', 'HEAD');
  const pf = path.join(tmp, 'pushes.json'); fs.writeFileSync(pf, JSON.stringify([{ after: c1, ts: '2024-12-16T03:00:00Z', ref: 'refs/heads/main' }]));
  process.env.LEDGER_PUSHES = pf; let r = await prove(L, R);
  assert.equal(r.n, 1); assert.deepEqual(L.all[0].proof, { commit: c1, pushed_at: '2024-12-16T03:00:00Z', ref: 'refs/heads/main' }); assert.equal(L.all[1].proof, undefined, 'B is not in any push yet');
  fs.writeFileSync(pf, JSON.stringify([{ after: c1, ts: '2024-12-16T03:00:00Z' }, { after: c2, ts: '2024-12-17T02:00:00Z' }])); r = await prove(L, R);
  assert.equal(r.n, 1, 'only the unproven entry'); assert.equal(L.all[1].proof.commit, c2); assert.equal(L.all[0].proof.pushed_at, '2024-12-16T03:00:00Z', 'a proof is never rewritten');
  delete process.env.LEDGER_PUSHES; n++; console.log('ok ledger lock proof from the push timestamp');
})();

t('workflows: ledger every 3h and in the heartbeat list; verdict backtest weekly; validate before commit', () => {
  const hb = fs.readFileSync('.github/workflows/heartbeat.yml', 'utf8'), lw = fs.readFileSync('.github/workflows/ledger.yml', 'utf8'), vw = fs.readFileSync('.github/workflows/verdict_backtest.yml', 'utf8');
  assert.match(hb, /for w in [^\n]*\bledger\.yml\b/, 'heartbeat dispatches the ledger'); assert.match(hb, /-50 min/, 'same 50-minute guard');
  assert.match(lw, /cron: '\d+ \*\/3 \* \* \*'/); assert.match(lw, /fetch-depth: 0/, 'full history for the lock proof'); assert.match(lw, /validate\.py ledger/);
  assert.match(vw, /cron: '\d+ \d+ \* \* \d'/, 'weekly'); assert.match(vw, /validate\.py verdict_bt/);
  for (const w of [lw, vw]) assert.match(w, /41898282\+github-actions\[bot\]@users\.noreply\.github\.com/);
});
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`PASS proof-layer (${n} groups)`);
