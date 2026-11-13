// Smart Money v2 (docs/architect-proof-layer.md §3) + Phase 1 audit F5: synthetic fixtures, no network.
// Position diff (open / close / increase / reduce / flip; pure price move = zero flow; cache miss = no flow), weekly panel rule,
// panel frozen between selections, no panel figure from before its selection, liquidation bins, who is underwater, history files,
// ledger sm_flow (state changes only, idempotent, no day after the signal), validator caps, fixed 4h window (F5).
// Usage: node tests/smart-v2.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { flowState, step, SMF_BAND } from '../scripts/build_ledger.mjs';
const VC = createRequire(import.meta.url)('../verdict-core.js');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', name); };
const py = (fn, ...args) => JSON.parse(execFileSync('python3', ['scripts/sm_lib.py'], { input: JSON.stringify({ fn, args }) }).toString());
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'smv2-'));
const val = (...a) => spawnSync('python3', ['scripts/validate.py', 'sm', ...a], { encoding: 'utf8' });

t('diff: open, close, increase, reduce, flip per side; counts and USD at the current mark', () => {
  const prev = { a: { BTC: 2, ETH: -10 }, b: { BTC: -1 }, c: { BTC: 1 }, d: {} };
  const cur = { a: { BTC: 3, ETH: -4 }, b: { BTC: 0.5 }, c: {}, d: { BTC: -2 } };
  const r = py('diff_flows', prev, cur, { BTC: 100000, ETH: 3000 }, ['BTC', 'ETH']), B = r.coins.BTC, E = r.coins.ETH;
  assert.deepEqual(B.L.inc, [1, 100000], 'a: long 2 -> 3 BTC = increased long $100k');
  assert.deepEqual(B.S.flip, [1, 100000], 'b: short 1 -> long 0.5 = flipped short (1 BTC closed)');
  assert.deepEqual(B.L.open, [1, 50000], 'b: ... and opened a long of 0.5 BTC');
  assert.deepEqual(B.L.close, [1, 100000], 'c: closed long 1 BTC');
  assert.deepEqual(B.S.open, [1, 200000], 'd: opened short 2 BTC');
  assert.deepEqual(E.S.red, [1, 18000], 'a: short 10 -> 4 ETH = reduced short $18k');
  assert.equal(B.dL, 100000 + 50000 - 100000); assert.equal(B.dS, 200000 - 100000); assert.equal(B.net, B.dL - B.dS);
  assert.equal(r.compared, 4);
});
t('diff: a pure price move is zero flow; size is measured in coins, never in USD value', () => {
  const pos = { a: { BTC: 2, ETH: -10 }, b: { BTC: -1 } };
  for (const m of [{ BTC: 50000, ETH: 1000 }, { BTC: 150000, ETH: 9000 }]) {
    const r = py('diff_flows', pos, JSON.parse(JSON.stringify(pos)), m, ['BTC', 'ETH']);
    for (const c of ['BTC', 'ETH']) { assert.equal(r.coins[c].net, 0); assert.equal(r.coins[c].dL, 0); assert.equal(r.coins[c].dS, 0);
      for (const sd of ['L', 'S']) for (const k of ['open', 'close', 'inc', 'red', 'flip']) assert.deepEqual(r.coins[c][sd][k], [0, 0]); }
  }
});
t('diff: a wallet missing in one run is never read as an open or a close; dust under $100 is not a flow', () => {
  const r = py('diff_flows', { a: { BTC: 1 }, gone: { BTC: 5 } }, { a: { BTC: 1.0000005 }, fresh: { BTC: -3 } }, { BTC: 100000 }, ['BTC']);
  assert.equal(r.compared, 1); assert.equal(r.missingPrev, 1); assert.equal(r.missingNow, 1); assert.equal(r.coins.BTC.net, 0); assert.equal(r.dust, 1);
  assert.deepEqual(r.coins.BTC.L.close, [0, 0]); assert.deepEqual(r.coins.BTC.S.open, [0, 0]);
});
t('cache miss, panel change or a snapshot older than the selection -> no flow, with the reason', () => {
  const sel = '2026-11-09T00:07:00Z', now = '2026-11-10T12:07:00Z';
  assert.match(py('flow_status', null, sel, now), /cache miss/);
  assert.match(py('flow_status', { t: '2026-11-10T11:37:00Z', panel: '2026-11-02T00:07:00Z', wallets: {} }, sel, now), /panel reselected/);
  assert.match(py('flow_status', { t: '2026-11-09T00:05:00Z', panel: sel, wallets: {} }, sel, now), /older than the panel selection/);
  assert.equal(py('flow_status', { t: '2026-11-10T11:37:00Z', panel: sel, wallets: {} }, sel, now), null);
});

// ---------- panel ----------
const W = (pnl, roi, vlm) => ({ pnl: String(pnl), roi: String(roi), vlm: String(vlm) });
const row = (a, av, o = {}) => ({ ethAddress: a, accountValue: String(av), displayName: null,
  windowPerformances: [['day', W(1, 0, 0)], ['week', W(o.week ?? 10, 0.01, 0)], ['month', W(o.pnl ?? 1000, o.roi ?? 0.1, o.vlm ?? av)], ['allTime', W(o.all ?? 5000, 0.5, 0)]] });
const addr = (i) => '0x' + i.toString(16).padStart(40, '0');
t('panel rule: AV >= $100k, positive week + month + allTime, turnover cap, vaults and sub-accounts out, ROI capped, top N', () => {
  const rows = [row(addr(1), 50_000, { roi: 9 }), row(addr(2), 200_000, { week: -1, roi: 9 }), row(addr(3), 200_000, { all: -5, roi: 9 }),
    row(addr(4), 200_000, { roi: 9, vlm: 200_000 * 101 }), row(addr(5), 200_000, { roi: 9 }), row(addr(6), 200_000, { roi: 9 })];
  for (let i = 10; i < 410; i++) rows.push(row(addr(i), 150_000 + i, { roi: i / 1000, pnl: i }));
  const r = py('select_panel', rows, [addr(5)], { [addr(6)]: 'subAccount', [addr(409)]: 'user' }, '2026-11-11T08:07:00Z');
  const A = r.wallets.map((w) => w.a);
  assert.equal(A.length, 300); for (const x of [1, 2, 3, 4, 5, 6]) assert.ok(!A.includes(addr(x)), 'excluded ' + x);
  assert.equal(r.stats.vaultsExcluded, 1); assert.deepEqual(r.stats.rolesExcluded, { subAccount: 1 });
  assert.equal(A[0], addr(409), 'highest ROI first'); assert.ok(r.wallets.every((w, i) => !i || w.roi30 <= r.wallets[i - 1].roi30 || w.roi30 >= r.stats.roiCap), 'ranked by ROI');
  assert.equal(r.week, '2026-11-09T00:00:00Z', 'week = Monday 00:00 UTC'); assert.equal(r.selected, '2026-11-11T08:07:00Z');
  // ROI cap: an extreme ROI is capped at the 99th percentile, ties broken by 30-day PnL
  const r2 = py('select_panel', [...rows, row(addr(999), 300_000, { roi: 500, pnl: 1 })], [], {}, '2026-11-11T08:07:00Z');
  const capped = r2.wallets.filter((w) => w.roi30 >= r2.stats.roiCap);
  assert.ok(capped.length > 1 && capped[0].pnl30 >= capped[capped.length - 1].pnl30, 'tie at the cap broken by 30-day PnL');
  assert.notEqual(r2.wallets[0].a, addr(999), 'an outlier ROI does not top the list by itself');
});
t('panel is frozen inside its week and reselected from the next Monday 00:00 UTC', () => {
  const p = { week: '2026-11-09T00:00:00Z', selected: '2026-11-09T00:07:00Z' };
  assert.equal(py('needs_selection', p, '2026-11-15T23:59:00Z'), false);
  assert.equal(py('needs_selection', p, '2026-11-16T00:07:00Z'), true);
  assert.equal(py('needs_selection', null, '2026-11-12T00:07:00Z'), true);
});
const panelOf = (sel, week, ws) => ({ selected: sel, week, rule: 'r', params: { n: 300 }, stats: {}, wallets: ws.map((a) => ({ a, n: null, av: 1, roi30: 0.1, pnl30: 1, turn: 1 })) });
t('validator: members cannot change without a new selection; no reselection inside the same week', () => {
  const d = tmp(), pv = tmp(), sm = path.join(d, 'none.json');
  const P = panelOf('2026-11-09T00:07:00Z', '2026-11-09T00:00:00Z', [addr(1), addr(2)]);
  fs.writeFileSync(path.join(pv, 'panel.json'), JSON.stringify(P));
  fs.writeFileSync(path.join(d, 'panel.json'), JSON.stringify(P));
  const ok = val('--dir', d, '--prev-dir', pv, '--smart', sm, '--now', '2026-11-12T00:00:00Z'); assert.equal(ok.status, 0, ok.stdout);
  fs.writeFileSync(path.join(d, 'panel.json'), JSON.stringify({ ...P, wallets: P.wallets.slice(0, 1) }));
  assert.match(val('--dir', d, '--prev-dir', pv, '--smart', sm, '--now', '2026-11-12T00:00:00Z').stdout, /frozen between selections/);
  fs.writeFileSync(path.join(d, 'panel.json'), JSON.stringify(panelOf('2026-11-11T00:07:00Z', '2026-11-09T00:00:00Z', [addr(3)])));
  assert.match(val('--dir', d, '--prev-dir', pv, '--smart', sm, '--now', '2026-11-12T00:00:00Z').stdout, /reselected inside the same week/);
  fs.writeFileSync(path.join(d, 'panel.json'), JSON.stringify(panelOf('2026-11-16T00:07:00Z', '2026-11-16T00:00:00Z', [addr(3)])));
  assert.equal(val('--dir', d, '--prev-dir', pv, '--smart', sm, '--now', '2026-11-16T01:00:00Z').status, 0, 'new week: reselection allowed');
});

// ---------- history + no lookahead ----------
const SEL = '2026-11-09T00:07:00Z';
const flow = (dL, dS) => { const f = { L: {}, S: {} }; for (const sd of ['L', 'S']) for (const k of ['open', 'close', 'inc', 'red', 'flip']) f[sd][k] = [0, 0]; f.L.inc = [3, dL]; f.S.inc = [2, dS]; f.dL = dL; f.dS = dS; f.net = dL - dS; return f; };
const run = (t, t0, dL, dS, panel = SEL) => ({ t, t0, panel, w: 300, m: 300, nf: t0 ? null : 'no previous snapshot', c: { BTC: [10, 20, 50000, 90000, 100000, t0 ? py('flow_row', flow(dL, dS)) : null] } });
t('history: recent.json keeps 7 days in order; daily rows sum flows once per run; totals never use flows before the selection', () => {
  let R = null, D = null; const rs = [run('2026-11-08T23:37:00Z', '2026-11-08T23:07:00Z', 9e6, 0, '2026-11-02T00:07:00Z'), run('2026-11-09T00:37:00Z', null, 0, 0),
    run('2026-11-09T01:07:00Z', '2026-11-09T00:37:00Z', 2e6, 1e6), run('2026-11-10T01:07:00Z', '2026-11-09T01:07:00Z', 4e6, 0)];
  for (const r of rs) { R = py('recent_add', R, r, '2026-11-10T02:00:00Z'); D = py('daily_add', D, r, 2026); }
  D = py('daily_add', D, rs[3], 2026); // same run twice: added once
  assert.deepEqual(R.runs.map((x) => x.t), rs.map((x) => x.t));
  assert.deepEqual(D.days['2026-11-09'].c.BTC.slice(5), [2000, 1000]); assert.equal(D.days['2026-11-09'].flowRuns, 1); assert.equal(D.days['2026-11-09'].runs, 2);
  assert.deepEqual(D.days['2026-11-10'].c.BTC.slice(5), [4000, 0]); assert.equal(D.days['2026-11-10'].runs, 1);
  const T = py('totals', R, SEL, '2026-11-10T02:00:00Z', 168);
  assert.equal(T.coins.BTC.net, 2e6 - 1e6 + 4e6, 'the old panel\'s 9M flow is not counted'); assert.equal(T.from, '2026-11-09T00:37:00Z'); assert.equal(T.sinceSelection, true);
  const T24 = py('totals', R, SEL, '2026-11-10T02:00:00Z', 24); assert.equal(T24.coins.BTC.net, 4e6); assert.equal(T24.runs, 1);
  assert.equal(py('totals', R, '2026-11-10T01:30:00Z', '2026-11-10T02:00:00Z', 24), null, 'nothing measured since a newer selection');
});
t('validator: a flow interval starting before the panel selection, a future run or a changed closed day fails', () => {
  const d = tmp(), sm = path.join(d, 'none.json'), now = '2026-11-12T00:00:00Z';
  fs.writeFileSync(path.join(d, 'panel.json'), JSON.stringify(panelOf(SEL, '2026-11-09T00:00:00Z', [addr(1)])));
  let R = py('recent_add', null, run('2026-11-09T01:07:00Z', '2026-11-09T00:37:00Z', 1e6, 0), '2026-11-09T02:00:00Z');
  fs.writeFileSync(path.join(d, 'recent.json'), JSON.stringify(R)); assert.equal(val('--dir', d, '--smart', sm, '--now', now, '--prev-dir', tmp()).status, 0);
  R.runs[0].t0 = '2026-11-09T00:01:00Z'; fs.writeFileSync(path.join(d, 'recent.json'), JSON.stringify(R));
  assert.match(val('--dir', d, '--smart', sm, '--now', now, '--prev-dir', tmp()).stdout, /after the panel selection/);
  R.runs[0].t0 = '2026-11-09T00:37:00Z'; R.runs[0].t = '2026-11-13T01:07:00Z'; fs.writeFileSync(path.join(d, 'recent.json'), JSON.stringify(R));
  assert.match(val('--dir', d, '--smart', sm, '--now', now, '--prev-dir', tmp()).stdout, /future/);
  fs.rmSync(path.join(d, 'recent.json'));
  let D = null; for (const r of [run('2026-11-09T01:07:00Z', '2026-11-09T00:37:00Z', 1e6, 0), run('2026-11-10T01:07:00Z', '2026-11-09T01:07:00Z', 1e6, 0)]) D = py('daily_add', D, r, 2026);
  const pv = tmp(); fs.writeFileSync(path.join(pv, 'daily-2026.json'), JSON.stringify(D));
  const D2 = JSON.parse(JSON.stringify(D)); D2.days['2026-11-09'].c.BTC[5] = 7; fs.writeFileSync(path.join(d, 'daily-2026.json'), JSON.stringify(D2));
  assert.match(val('--dir', d, '--smart', sm, '--now', now, '--prev-dir', pv).stdout, /closed day changed/);
  const D3 = JSON.parse(JSON.stringify(D)); D3.days['2026-11-09'].flowFrom = '2026-11-08T23:00:00Z'; fs.writeFileSync(path.join(d, 'daily-2026.json'), JSON.stringify(D3));
  assert.match(val('--dir', d, '--smart', sm, '--now', now, '--prev-dir', tmp()).stdout, /before the panel selection/);
});
t('validator: size caps on data/sm files and smart_money.json (700 KB)', () => {
  const d = tmp(), sm = path.join(d, 'sm.json');
  fs.writeFileSync(sm, JSON.stringify({ updated: '2026-11-10T00:00:00Z', pad: 'x'.repeat(701 * 1024) }));
  assert.match(val('--dir', d, '--smart', sm, '--prev-dir', tmp()).stdout, /over the 700 KB cap/);
  const R = { v: 1, unit: 'kUSD', runs: [], pad: 'x'.repeat(201 * 1024) }; fs.writeFileSync(path.join(d, 'recent.json'), JSON.stringify(R)); fs.rmSync(sm);
  assert.match(val('--dir', d, '--smart', sm, '--prev-dir', tmp()).stdout, /recent.json: .* over the 200 KB cap/);
});

// ---------- liquidation bins + underwater ----------
t('liquidation bins: 1% bins from -30% to +30% of mark at each real liquidationPx; no liq and outside counted apart', () => {
  const ps = [{ side: 'L', ntl: 1000, liq: 95, sz: 10, entry: 110 }, { side: 'L', ntl: 500, liq: 95.5, sz: 5, entry: 90 }, { side: 'S', ntl: 700, liq: 112.2, sz: 7, entry: 105 },
    { side: 'S', ntl: 300, liq: 200, sz: 3, entry: 95 }, { side: 'L', ntl: 50, liq: null, sz: 1, entry: 100 }];
  const r = py('liq_bins', ps, 100);
  assert.deepEqual(r.bins, [{ lo: 95, hi: 96, long: 1500, short: 0 }, { lo: 112, hi: 113, long: 0, short: 700 }]);
  assert.deepEqual(r.noLiq, { n: 1, long: 50, short: 0 }); assert.deepEqual(r.outside, { long: 0, short: 300 }); assert.equal(r.positions, 5);
  const u = py('underwater', ps, 100);
  assert.equal(u.L.n, 3); assert.equal(u.L.lossPct, +(100 * 1000 / 1550).toFixed(1), 'long entry 110 > mark: in loss'); assert.equal(u.L.avgEntry, +((110 * 10 + 90 * 5 + 100) / 16).toPrecision(6));
  assert.equal(u.S.lossPct, 30, 'shorts entered at 105 (in profit) and 95 (in loss at mark 100): $300 of $1000'); assert.equal(u.S.medLiqDist, 12.2, 'size-weighted median distance');
});

// ---------- ledger sm_flow ----------
const DAY = 864e5, sig = Date.UTC(2026, 10, 12); // t = close of 2026-11-11
const dayRow = (panel, dL, dS, flowRuns = 3, last) => ({ panel, first: last || '', last: last || '', runs: 4, flowRuns, flowFrom: panel, c: { BTC: [10, 20, 50000, 50000, 1e5, dL, dS] } });
t('ledger sm_flow: 7 UTC days ending at the signal day, same panel only, nothing after the signal time; band = flat', () => {
  const days = {};
  for (let i = 0; i < 9; i++) { const d = new Date(sig - (i + 1) * DAY).toISOString().slice(0, 10); days[d] = dayRow(SEL, 1000, 0, 3, d + 'T23:37:00Z'); }
  days['2026-11-12'] = dayRow(SEL, -1e9, 0, 3, '2026-11-12T00:37:00Z'); // after the signal: must not count
  for (const d of ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']) days[d].panel = '2026-11-02T00:07:00Z'; // previous panel
  const r = flowState(days, sig, 'BTC');
  assert.equal(r.ctx.days, 3, '11-09..11-11 only (same panel)'); assert.equal(r.ctx.net, 3e6); assert.equal(r.ctx.gross, 1e8); assert.equal(r.ctx.pct, 3); assert.equal(r.to, 'flat', '3% <= band');
  for (const d of ['2026-11-09', '2026-11-10', '2026-11-11']) days[d].c.BTC[6] = 3000; assert.equal(flowState(days, sig, 'BTC').to, 'net_sell');
  for (const d of ['2026-11-09', '2026-11-10', '2026-11-11']) days[d].c.BTC[5] = 4000; assert.equal(flowState(days, sig, 'BTC').to, 'flat', '+3%');
  for (const d of ['2026-11-09', '2026-11-10', '2026-11-11']) days[d].c.BTC[6] = 0; assert.equal(flowState(days, sig, 'BTC').to, 'net_buy'); assert.equal(SMF_BAND, 5);
  days['2026-11-11'].flowRuns = 0; assert.equal(flowState(days, sig, 'BTC'), null, 'signal day without a measured flow: no observation');
  assert.equal(flowState(null, sig, 'BTC'), null);
});
t('ledger sm_flow: first observation is a start (from null), then state changes only, idempotent', () => {
  const L = { files: {}, all: [] }, ob = (to, d = 0) => ({ t: sig + d * DAY, px: 100, patterns: [], verdict: { to: 'Wait', ctx: { seen: new Date(sig + d * DAY + 36e5).toISOString().replace(/\.\d+Z$/, 'Z') } }, smflow: { to, ctx: { net: 1 } } });
  assert.deepEqual(step(L, 'BTC', ob('flat')).add.map((e) => [e.kind, e.from, e.to]), [['verdict', null, 'Wait'], ['sm_flow', null, 'flat']]);
  assert.equal(step(L, 'BTC', ob('flat')).add.length, 0, 'same observation twice adds nothing');
  assert.equal(step(L, 'BTC', ob('flat', 1)).add.length, 0, 'no change, no entry');
  const e = step(L, 'BTC', ob('net_buy', 2)).add; assert.deepEqual(e.map((x) => [x.kind, x.from, x.to]), [['sm_flow', 'flat', 'net_buy']]);
  assert.equal(e[0].ctx.seen, ob('x', 2).verdict.ctx.seen); assert.match(e[0].id, /-BTC-sm_flow-net_buy$/);
});

// ---------- audit F5: fixed 4h window ----------
t('F5: the 4h entry zone cannot move within a day (fixed count after filtering to bars closed by the daily close)', () => {
  const T0 = Date.UTC(2025, 0, 1), H4 = 4 * 36e5; let s = 7, c = 100; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const h4all = []; for (let i = 0; i < 6 * 330; i++) { const o = c; c = Math.max(1, c * (1 + 0.003 * Math.sin(i / 17) + (r() - 0.5) * 0.03)); h4all.push({ t: T0 + i * H4, o, h: Math.max(o, c) * (1 + r() * 0.01), l: Math.min(o, c) * (1 - r() * 0.01), c, v: 1, q: c }); }
  const d1 = []; for (let i = 0; i + 6 <= h4all.length; i += 6) { const g = h4all.slice(i, i + 6); d1.push({ t: g[0].t, o: g[0].o, h: Math.max(...g.map((x) => x.h)), l: Math.min(...g.map((x) => x.l)), c: g[5].c, v: 6, q: g.reduce((a, x) => a + x.q, 0) }); }
  const day = d1[d1.length - 2].t + DAY, iDay = h4all.findIndex((x) => x.t === day); // a UTC day; the app fetches the last 180 4h bars at `now`
  // plant a 4h swing low 172 bars before the day starts: inside a 180-bar fetch early in the day, outside it late in the day
  const A0 = VC.compute({ d1: d1.filter((x) => x.t <= day), h4: h4all.slice(iDay - 179, iDay + 1), price: 1 }, { closedOnly: true, now: day + 18e5 }).plan;
  const low = A0.sup[0] - 0.4999 * A0.atr, // the lowest a 4h low can be and still count (s1 - 0.5 ATR)
    j = iDay - 172; h4all[j] = { ...h4all[j], l: low, o: Math.max(h4all[j].o, low), c: Math.max(h4all[j].c, low) };
  const zones = new Set(), refs = new Set();
  for (let h = 0.5; h < 24; h += 1) { const now = day + h * 36e5, D = d1.filter((x) => x.t <= now), H = h4all.filter((x) => x.t <= now).slice(-180);
    const I = VC.compute({ d1: D, h4: H, price: D[D.length - 1].c }, { closedOnly: true, now }); zones.add(I.plan.entry.join(',')); refs.add(I.plan.ref); }
  assert.equal(zones.size, 1, 'one entry zone all day: ' + [...zones].join(' | ')); assert.equal(VC.H4N, 168);
});

// ---------- audit M1: lost intervals are counted, the cache is saved only after the commit ----------
t('M1: totals count missing intervals (a run whose snapshot was never committed, or a run without a flow)', () => {
  // r1 = selection run; r2 measured from r1; a run at 03:07 failed to push (not in recent.json) but its snapshot was cached,
  // so r4 measured from 03:07; r5 had a cache miss; r6 measured from r5
  const rs = [run('2026-11-09T01:07:00Z', null, 0, 0), run('2026-11-09T02:07:00Z', '2026-11-09T01:07:00Z', 1e6, 0), run('2026-11-09T04:07:00Z', '2026-11-09T03:07:00Z', 1e6, 0),
    run('2026-11-09T05:07:00Z', null, 0, 0), run('2026-11-09T06:07:00Z', '2026-11-09T05:07:00Z', 1e6, 0)];
  let R = null; for (const r of rs) R = py('recent_add', R, r, '2026-11-09T07:00:00Z');
  const T = py('totals', R, SEL, '2026-11-09T07:00:00Z', 24);
  assert.equal(T.gaps, 2, 'one uncommitted run + one cache miss'); assert.equal(T.runs, 3);
  assert.equal(py('totals', R, SEL, '2026-11-09T07:00:00Z', 1.5).gaps, 0, 'only the last interval in the window: no gap');
  const ok = rs.filter((r, i) => i !== 2 && i !== 3); ok[2] = run('2026-11-09T06:07:00Z', '2026-11-09T02:07:00Z', 1e6, 0); let R2 = null; for (const r of ok) R2 = py('recent_add', R2, r, '2026-11-09T07:00:00Z');
  assert.equal(py('totals', R2, SEL, '2026-11-09T07:00:00Z', 24).gaps, 0, 'a long interval measured from the last committed run is not a gap');
  const old = run('2026-11-09T00:37:00Z', '2026-11-09T00:07:00Z', 1e6, 0, '2026-11-02T00:07:00Z'); let R3 = py('recent_add', null, old, '2026-11-09T07:00:00Z'); for (const r of rs.slice(0, 2)) R3 = py('recent_add', R3, r, '2026-11-09T07:00:00Z');
  assert.equal(py('totals', R3, SEL, '2026-11-09T07:00:00Z', 24).gaps, 0, 'the selection run (first run of the panel) is not a gap');
});
t('M1: the workflow saves the positions cache only after the commit step', () => {
  const w = fs.readFileSync('.github/workflows/smart_money.yml', 'utf8'), i = (s) => w.indexOf(s);
  assert.ok(i('actions/cache/restore') < i('name: Build') && i('name: Build') < i('name: Commit') && i('name: Commit') < i('actions/cache/save'), 'restore, build, commit, then save');
  assert.match(w.slice(i('name: Save panel positions')), /if: success\(\)/);
});
t('M1: validator accepts flows.gaps as a whole number >= 0 and rejects anything else', () => {
  const d = tmp(), sm = path.join(d, 'sm.json'), P = panelOf(SEL, '2026-11-09T00:00:00Z', [addr(1)]);
  fs.writeFileSync(path.join(d, 'panel.json'), JSON.stringify(P));
  const S = (g) => ({ updated: '2026-11-10T00:00:00Z', cohorts: { panel: { universe: { selected: SEL, wallets: 1, members: 1 }, coins: {} } }, flows: { h24: { from: '2026-11-09T01:00:00Z', to: '2026-11-09T23:00:00Z', runs: 3, gaps: g } } });
  fs.writeFileSync(sm, JSON.stringify(S(2))); assert.equal(val('--dir', d, '--smart', sm, '--prev-dir', tmp(), '--now', '2026-11-10T00:00:00Z').status, 0);
  for (const g of [-1, 1.5, '2']) { fs.writeFileSync(sm, JSON.stringify(S(g))); assert.match(val('--dir', d, '--smart', sm, '--prev-dir', tmp(), '--now', '2026-11-10T00:00:00Z').stdout, /gaps must be a whole number/, String(g)); }
});
console.log(`PASS smart-v2 (${n} groups)`);
