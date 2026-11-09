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
t('verdict', () => {
  assert.equal(E.verdict(-0.19, 2.17).key, 'priced'); assert.equal(E.verdict(3, 2.17).key, 'surprise'); assert.equal(E.verdict(3, 2.17).basis, 'options');
  assert.equal(E.verdict(null, 2).key, 'nodata', 'no measured move -> no data, never 0');
  assert.equal(E.verdict(1, null, { avg: 2, n: 5 }).key, 'nohist', 'fewer than 6 past events');
  assert.equal(E.verdict(3, null, { avg: 2, n: 6 }).key, 'surprise'); assert.equal(E.verdict(3, null, { avg: 2, n: 6 }).basis, 'past');
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
  const base = { id: 'x', kind: 'scheduled', at: '2026-11-10T13:30:00Z', consensus: { value: 0.2, locked_at: '2026-11-10T12:00:00Z' }, post: { h1: { BTC: { pct: 1 } } }, pos: {} };
  assert.deepEqual(E.checkLocked(base, JSON.parse(JSON.stringify(base))), []);
  assert.match(E.checkLocked(base, { ...base, consensus: { value: 0.3, locked_at: base.consensus.locked_at } }).join(), /consensus/);
  assert.match(E.checkLocked(base, { ...base, post: { h1: { BTC: { pct: 2 } } } }).join(), /post\.h1\.BTC/);
  assert.match(E.checkLocked(base, { ...base, post: { h1: {} } }).join(), /post\.h1\.BTC/, 'deleting a frozen value is a change');
  assert.deepEqual(E.checkLocked(base, { ...base, post: { h1: { BTC: { pct: 1 }, ETH: { pct: 3 } } } }), [], 'a missing asset may be filled later');
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
console.log(`PASS events (${n} groups)`);
