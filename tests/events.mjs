// v49 Events: published rules, locked-field validator, gate/cluster, time maths, and the data files. No network.
// Usage: node tests/events.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { zoned, across, xTime, save, validate, SERIES, kindOf, fromCalendar } from '../scripts/build_events.mjs';
const E = createRequire(import.meta.url)('../events-core.js');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', name); };

t('published constants', () => { assert.equal(E.R.MIN_PAST_N, 6); assert.equal(E.R.SCORECARD_MIN, 10); assert.equal(E.R.UNUSUAL_X, 3); assert.equal(E.R.UNUSUAL_PCTL, 0.98); assert.equal(E.R.UNUSUAL_WIN_H, 720); assert.equal(E.R.IMPLIED_MAX_AGE_H, 6); });
t('implied move = IV/sqrt(365)', () => { assert.equal(+E.impliedMove(41.4).toFixed(3), 2.167); assert.equal(E.impliedMove(null), null); assert.equal(E.impliedMove(0), null); });
t('verdict: straddle first, DVOL labelled 1 sigma, then past average', () => {
  const st = { method: 'straddle', pct: 1.69, expiry: '2026-11-11T08:00:00Z', at: '2026-11-10T12:30:00Z' }, dv = { method: 'dvol30', pct: 2.17 };
  assert.equal(E.verdict({ toExp: -1.2, d1: 5, implied: st }).key, 'priced', 'straddle compares the move to expiry, not the 1-day move');
  assert.equal(E.verdict({ toExp: 2.0, implied: st }).key, 'surprise'); assert.equal(E.verdict({ toExp: 2.0, implied: st }).basis, 'straddle');
  assert.equal(E.verdict({ d1: 3, implied: st }).key, 'nodata', 'straddle without the expiry move -> wait, never fall back silently');
  assert.equal(E.verdict({ d1: -0.19, implied: dv }).key, 'priced'); assert.equal(E.verdict({ d1: 3, implied: dv }).basis, 'dvol');
  assert.equal(E.verdict({ d1: null, implied: dv }).key, 'nodata', 'no measured move -> no data, never 0');
  assert.equal(E.verdict({ d1: 1, past: { avg: 2, n: 5 } }).key, 'nohist', 'fewer than 6 past events');
  assert.equal(E.verdict({ d1: 3, past: { avg: 2, n: 6 } }).basis, 'past');
});
t('straddle maths', () => {
  assert.equal(E.straddleAt(100, [{ k: 95, c: 6, p: 1 }, { k: 105, c: 1, p: 6 }]), 7, 'interpolated at the forward');
  assert.equal(+E.straddleAt(74097.18, [{ k: 74000, c: 0.9, p: 0.77 }, { k: 74500, c: 0.66, p: 1.2 }]).toFixed(4), +((0.9 + 0.77) * (1 - 97.18 / 500) + (0.66 + 1.2) * (97.18 / 500)).toFixed(4));
  assert.equal(E.straddleAt(100, [{ k: 105, c: 1, p: 6 }]), null, 'needs strikes on both sides');
  const s1 = E.sigma1d({ method: 'straddle', pct: 1.69, expiry: '2026-11-11T08:00:00Z', at: '2026-11-10T08:00:00Z' }); assert.equal(+s1.toFixed(3), +(1.69 / Math.sqrt(2 / Math.PI)).toFixed(3));
  assert.equal(E.sigma1d({ method: 'dvol30', pct: 2.17 }), 2.17); assert.equal(E.sigma1d(null), null);
});
t('strength', () => { assert.equal(E.strength('bp', 2), 'weak'); assert.equal(E.strength('bp', 5), 'medium'); assert.equal(E.strength('bp', -9), 'strong');
  assert.equal(E.strength('pct', 0.2), 'weak'); assert.equal(E.strength('crypto', 1, 2), 'medium'); assert.equal(E.strength('crypto', 1, null), null); assert.equal(E.strength('bp', null), null); });
t('confidence rules', () => {
  assert.equal(E.confidence({ v: 1, measured: true, strength: 'strong' }), 'high');
  assert.equal(E.confidence({ v: 1, measured: true, strength: 'weak' }), 'medium');
  assert.equal(E.confidence({ v: 5, expected: 'up' }), 'medium'); assert.equal(E.confidence({ v: 5, expected: 'down' }), 'low');
  assert.equal(E.confidence({ v: 5, expected: 'up', stale: true }), 'low'); assert.equal(E.confidence({ v: 5, expected: 'up', weekly: true }), 'low');
  assert.equal(E.confidence({ v: 5 }), 'low', 'no view'); assert.equal(E.confidence({ v: 1, measured: true, strength: 'strong', breaking: true }), 'low');
  assert.equal(E.confidence({ v: null }), null);
});
const view = { locked_at: '2026-11-10T12:00:00Z', scenarios: [{ key: 'hot', min: 0.3, btc: 'down' }, { key: 'inline', min: 0.2, max: 0.2, btc: 'flat' }, { key: 'cool', max: 0.1, btc: 'up' }] };
t('scenario + scoreView', () => {
  assert.equal(E.scenarioFor(0.2, view.scenarios), 'inline'); assert.equal(E.scenarioFor(0.4, view.scenarios), 'hot'); assert.equal(E.scenarioFor(0.0, view.scenarios), 'cool'); assert.equal(E.scenarioFor(null, view.scenarios), null);
  const s = E.scoreView(view, 0.4, { h1: { BTC: { pct: -0.8 } }, d1: { BTC: { pct: 1.6 } } }); assert.equal(s.scenario, 'hot'); assert.equal(s.h1, true); assert.equal(s.d1, false); assert.equal(s.wrong, true);
  assert.deepEqual(E.scoreView(null, 0.4, {}), { scenario: null, h1: null, d1: null, wrong: null }, 'no locked view -> nothing scored');
  assert.equal(E.scoreView(view, 0.2, { h1: { BTC: { pct: 0.1 } } }).h1, true, 'flat expected, flat move');
});
t('breaking gate: stricter of 3x mean and p98', () => {
  const h = { url: 'https://x.com/a/status/1', at: 1 }, u = { btc: { avg: 0.25, p98: 1.0 }, eth: { avg: 0.4, p98: 1.0 } };
  assert.equal(E.unusualThr(u.btc), 1.0, 'p98 stricter than 3x0.25'); assert.equal(+E.unusualThr({ avg: 0.5, p98: 1.0 }).toFixed(6), 1.5, '3x stricter than p98');
  assert.equal(E.gate(h, { btc: 1.1, eth: 0.2 }, u).pass, true); assert.equal(E.gate(h, { btc: 0.9, eth: 0.9 }, u).pass, false, '3.6x mean but under p98');
  assert.equal(E.gate(h, { btc: 0.6, eth: 0 }, { btc: { avg: 0.2, p98: 0.5 } }).pass, false, 'above p98 but not 3x mean');
  assert.equal(E.gate({ url: '', at: 1 }, { btc: 9 }, u).pass, false, 'no source link');
  assert.equal(E.gate(h, { btc: null, eth: null }, u).pass, false, 'missing data never passes'); assert.equal(E.gate(h, { btc: 5 }, { btc: null }).pass, false, 'no stats never passes');
  assert.equal(E.gate(h, { btc: 0.1, eth: 0.1 }, u, { sym: 'MON', rel: 3, usual: { avg: 0.5, p98: 2 } }).by, 'MON');
  const st = E.trailStats(Array.from({ length: 1000 }, (_, i) => i / 1000)); assert.equal(st.p98, 0.979); assert.equal(E.trailStats([1, 2]), null, 'too few hours');
});
t('cluster', () => {
  const c = E.cluster([{ at: 0, tier: 'T2' }, { at: 30 * 60e3, tier: 'T1' }, { at: 5 * 36e5 }]); assert.equal(c.length, 2); assert.equal(c[0].unclear, true); assert.equal(c[0].cands[0].tier, 'T1'); assert.equal(c[1].unclear, false);
  const many = E.cluster([0, 1, 2, 3, 4].map((i) => ({ at: i * 60e3 }))); assert.equal(many[0].cands.length, 3, 'top 3 only');
});
t('zoned: DST-aware wall clock', () => {
  assert.equal(new Date(zoned('2026-11-10', '08:30', 'America/New_York')).toISOString(), '2026-11-10T13:30:00.000Z'); // EST
  assert.equal(new Date(zoned('2026-07-15', '08:30', 'America/New_York')).toISOString(), '2026-07-15T12:30:00.000Z'); // EDT
  assert.equal(new Date(zoned('2026-11-06', '15:00', 'Asia/Tokyo')).toISOString(), '2026-11-06T06:00:00.000Z');
});
t('across the release: per-series fixing time, waiting vs late, never 0', () => {
  const at = Date.parse('2026-11-06T13:30:00Z'), S = SERIES.us2y; const rows = [{ d: '2026-11-05', v: 3.5 }, { d: '2026-11-06', v: 3.55 }];
  const ok = across(S, rows, at, at + 2 * 864e5); assert.equal(ok.status, 'ok'); assert.equal(ok.chg, 5); assert.equal(ok.before.d, '2026-11-05'); assert.equal(ok.after.d, '2026-11-06');
  assert.equal(across(S, rows.slice(0, 1), at, at + 864e5).status, 'waiting'); assert.equal(across(S, rows.slice(0, 1), at, at + 5 * 864e5).status, 'late');
  assert.equal(across(S, [], at, at).status, 'unavailable'); assert.equal(across(S, [], at, at).chg, undefined);
  const J = across(SERIES.jp10y, [{ d: '2026-11-06', v: 1.7 }], at, at + 864e5); assert.equal(J.status, 'waiting', 'JGB 15:00 JST fixing is before a 22:30 JST release');
  assert.equal(SERIES.gold.none.length > 0, true);
});
t('X status id -> time', () => { assert.equal(new Date(xTime('https://x.com/a/status/1985000000000000000')).toISOString().slice(0, 4), '2025'); assert.equal(xTime('https://example.com'), null); });
t('calendar -> events', () => {
  const tr = new Set(['BTC', 'ETH', 'MON']);
  assert.equal(kindOf({ type: 'macro', title: 'US CPI (Oct)' }, tr), 'cpi'); assert.equal(kindOf({ type: 'macro', title: 'US CPI', tokens: ['X'] }, tr), null);
  assert.equal(kindOf({ type: 'unlock', tokens: ['MON'], impact: 'high' }, tr), 'unlock-mon'); assert.equal(kindOf({ type: 'unlock', tokens: ['MON'], impact: 'low' }, tr), null);
  const now = Date.parse('2026-11-09T00:00:00Z'); const evs = fromCalendar([{ events: [{ type: 'macro', title: 'US CPI', date: '2026-11-10', time: '22:30' }, { type: 'macro', title: 'US CPI', date: '2026-11-10' }] }], tr, now);
  assert.equal(evs.length, 1, 'manual + auto merge on calendar date'); assert.equal(Date.parse(evs[0].at), Date.parse('2026-11-10T13:30:00Z')); assert.equal(evs[0].time_known, true);
});
t('validator: locked fields', () => {
  const base = { id: 'x', kind: 'scheduled', at: '2026-11-10T13:30:00Z', consensus: { value: 0.2, locked_at: '2026-11-10T12:00:00Z' }, post: { h1: { BTC: { pct: 1 } }, to_expiry: { ETH: { pct: 2 } } }, pos: {} };
  assert.deepEqual(E.checkLocked(base, JSON.parse(JSON.stringify(base))), []);
  assert.match(E.checkLocked(base, { ...base, consensus: { value: 0.3, locked_at: base.consensus.locked_at } }).join(), /consensus/);
  assert.match(E.checkLocked(base, { ...base, post: { h1: { BTC: { pct: 2 } } } }).join(), /post\.h1\.BTC/);
  assert.match(E.checkLocked(base, { ...base, post: { h1: {} } }).join(), /post\.h1\.BTC/, 'deleting a frozen value is a change');
  assert.match(E.checkLocked(base, { ...base, post: { ...base.post, to_expiry: { ETH: { pct: 1 } } } }).join(), /post\.to_expiry\.ETH/);
  assert.deepEqual(E.checkLocked(base, { ...base, post: { ...base.post, h1: { BTC: { pct: 1 }, ETH: { pct: 3 } } } }), [], 'a missing asset may be filled later');
  assert.match(E.checkLocked(null, { ...base, view: { locked_at: '2026-11-10T13:31:00Z' } }).join(), /view locked at or after/);
  assert.match(E.checkLocked(null, { id: 'b', kind: 'breaking', at: base.at, view: { locked_at: base.at } }).join(), /after the news/);
});
t('save() refuses a locked edit on disk', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ev-')); const ev = { id: '2026-01-01-cpi', kind: 'scheduled', at: '2026-01-01T13:30:00Z', actual: { value: 0.3 } };
  save(ev, d); assert.throws(() => save({ ...ev, actual: { value: 0.2 } }, d), /locked field changed: actual/); assert.equal(JSON.parse(fs.readFileSync(path.join(d, ev.id + '.json'))).actual.value, 0.3);
});
t('repo event files: valid, no locked edits vs HEAD, real sources only', () => {
  assert.deepEqual(validate('HEAD'), []);
  const idx = JSON.parse(fs.readFileSync('data/events/index.json')); assert.equal(idx.schema, 1); assert.ok(idx.events.length > 0);
  for (const e of idx.events) {
    const f = JSON.parse(fs.readFileSync(`data/events/${e.id}.json`)); assert.ok(/^https:\/\//.test(f.source && f.source.url), e.id + ' source');
    for (const k of ['h1', 'd1', 'before24h']) for (const [s, m] of Object.entries((f.post || {})[k] || {})) { assert.ok(Number.isFinite(m.pct), `${e.id} ${k} ${s}`); assert.ok(/^https:\/\//.test(m.from.url || m.url || ''), `${e.id} ${k} ${s} url`); }
    for (const [k, m] of Object.entries(f.macro || {})) { if (m.status === 'ok') assert.ok(Number.isFinite(m.chg), k); else assert.equal(m.chg, undefined, `${e.id} ${k}: no number unless measured`); }
  }
  const inp = JSON.parse(fs.readFileSync('data/events/inputs/2026-11-10-cpi.json')); assert.ok(/^https:\/\//.test(inp.consensus.url));
});
t('v50 pre-release: options vs usual move, same window, fixed thresholds', () => {
  assert.deepEqual(E.R.EXPECT_RATIO, [0.8, 1.25]);
  assert.equal(E.expectVsUsual(2.5, { avg: 2, n: 21 }).key, 'normal'); assert.equal(E.expectVsUsual(2.6, { avg: 2, n: 21 }).key, 'bigger'); assert.equal(E.expectVsUsual(1.5, { avg: 2, n: 21 }).key, 'smaller');
  assert.equal(E.expectVsUsual(2.5, { avg: 2, n: 5 }), null, 'needs MIN_PAST_N'); assert.equal(E.expectVsUsual(null, { avg: 2, n: 21 }), null); assert.equal(E.expectVsUsual(2, { avg: 0, n: 21 }), null, 'no divide by zero');
  const P = JSON.parse(fs.readFileSync('data/events/prelive.json')); for (const [id, x] of Object.entries(P.events)) for (const [s, a] of Object.entries(x.assets)) {
    assert.ok(Date.parse(x.at), id + ' time'); if (a.implied) { assert.equal(a.implied.method, 'straddle'); assert.ok(/^https:\/\//.test(a.implied.url)); assert.ok(a.window && a.window.after_h > 0, id + ' window shown'); }
    if (a.vs_usual) assert.equal(a.vs_usual.key, E.expectVsUsual(a.implied.pct, a.base).key, `${id} ${s} label follows the rule`);
    for (const m of Object.values(a.run || {})) assert.ok(Number.isFinite(m.pct) && /^https:\/\//.test(m.to.url)); }
});
t('v50 print vs consensus + token-named breaking news', () => {
  assert.equal(E.printVs(0.3, 0.2), 'above'); assert.equal(E.printVs(0.1, 0.2), 'below'); assert.equal(E.printVs(0.2, 0.2), 'match'); assert.equal(E.printVs(null, 0.2), null);
  assert.equal(E.tokenUnclear({ pass: true, by: 'ETH', tok: { sym: 'PENDLE', rel: -0.34 } }), true, 'named token did not move: cause unclear');
  assert.equal(E.tokenUnclear({ pass: true, by: 'PENDLE', token: true, tok: { sym: 'PENDLE', rel: 3 } }), false); assert.equal(E.tokenUnclear({ pass: true, by: 'BTC' }), false);
  const b = JSON.parse(fs.readFileSync('data/events/2026-11-09-brk-0625.json')); assert.equal(E.tokenUnclear(b.candidates[0].gate), true, '2026-11-09-brk-0625 (PENDLE named, passed on ETH) is cause unclear');
});
t('flat rule: flat move vs up/down scenario = no call, edge is a call (v53)', () => {
  // uses the shared test view: hot (>=0.3) expects BTC down, inline (0.2) expects flat
  // sgn edge: strictly below the threshold is flat, exactly at it is a call
  assert.equal(E.sgn(0.3, E.R.FLAT.h1), 'up'); assert.equal(E.sgn(-0.3, E.R.FLAT.h1), 'down'); assert.equal(E.sgn(0.2999, E.R.FLAT.h1), 'flat');
  assert.equal(E.sgn(1.0, E.R.FLAT.d1), 'up'); assert.equal(E.sgn(-1.0, E.R.FLAT.d1), 'down'); assert.equal(E.sgn(-0.9999, E.R.FLAT.d1), 'flat');
  // flat move at 1h and at 1d: neither right nor wrong
  const f = E.scoreView(view, 0.4, { h1: { BTC: { pct: -0.1 } }, d1: { BTC: { pct: 0.5 } } });
  assert.equal(f.h1, null); assert.equal(f.d1, null); assert.deepEqual(f.flat, { h1: true, d1: true }); assert.equal(f.wrong, false, 'flat is never proven wrong');
  // exactly at the edge counts as a call (right and wrong both possible)
  const e1 = E.scoreView(view, 0.4, { h1: { BTC: { pct: -0.3 } }, d1: { BTC: { pct: -1.0 } } }); assert.equal(e1.h1, true); assert.equal(e1.d1, true); assert.deepEqual(e1.flat, { h1: false, d1: false });
  const e2 = E.scoreView(view, 0.4, { h1: { BTC: { pct: 0.3 } }, d1: { BTC: { pct: 1.0 } } }); assert.equal(e2.h1, false); assert.equal(e2.d1, false); assert.equal(e2.wrong, true);
  // just under the edge = flat
  const u = E.scoreView(view, 0.4, { h1: { BTC: { pct: -0.2999 } }, d1: { BTC: { pct: -0.9999 } } }); assert.equal(u.h1, null); assert.equal(u.d1, null); assert.deepEqual(u.flat, { h1: true, d1: true });
  // flat expected (In line) + flat move is still a hit
  assert.equal(E.scoreView(view, 0.2, { d1: { BTC: { pct: 0.5 } } }).d1, true);
  assert.equal(E.dirResult(0.5, 1, 'up'), 'flat'); assert.equal(E.dirResult(0.5, 1, 'flat'), true); assert.equal(E.dirResult(1, 1, 'up'), true); assert.equal(E.dirResult(null, 1, 'up'), null); assert.equal(E.dirResult(1, 1, null), null);
  assert.deepEqual(E.tally([{ d1: true }, { d1: false }, { d1: null, flat: { d1: true } }, { d1: null }]), { right: 1, calls: 2, nocall: 1 });
});
t('Nov 10 CPI replay: 1h right, 1d no call, not proven wrong (v53)', () => {
  const ev = JSON.parse(fs.readFileSync('data/events/2026-11-10-cpi.json'));
  const r = E.scoreView(ev.view, ev.actual.value, ev.post, E.lockOk(ev));
  assert.equal(r.scenario, 'hot'); assert.equal(r.h1, true, 'BTC -0.85% in 1h, hot expects down'); assert.equal(r.d1, null, 'BTC -0.73% in 1d is under 1.00%');
  assert.equal(r.flat.d1, true); assert.equal(r.wrong, false); assert.deepEqual(E.tally([r]), { right: 0, calls: 0, nocall: 1 });
});
console.log(`PASS events (${n} groups)`);
