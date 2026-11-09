// Breaking-news gate false-pass rate on REAL hourly data (tests/fixtures/hourly_btc_eth.json: Binance 1h closes, 395 days to 2026-11-09).
// A "random headline" lands in a random hour; the false-pass rate = share of hours whose own 1h move already passes the gate.
// Refresh the fixture: node scripts/fetch_gate_fixture.mjs.  Usage: node tests/events-gate.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('../events-core.js');
const F = JSON.parse(fs.readFileSync('tests/fixtures/hourly_btc_eth.json')), W = E.R.UNUSUAL_WIN_H, R = {};
for (const s of ['BTC', 'ETH']) { const c = F.closes[s]; R[s] = c.slice(1).map((x, i) => (x != null && c[i] != null ? (x / c[i] - 1) * 100 : null)); }
const H = { url: 'https://x.com/a/status/1', at: 1 }; let n = 0, passNew = 0, pass2x = 0; const one = { BTC: 0, ETH: 0 };
for (let i = W; i < R.BTC.length; i++) {
  const u = { btc: E.trailStats(R.BTC.slice(i - W, i)), eth: E.trailStats(R.ETH.slice(i - W, i)) }, m = { btc: R.BTC[i], eth: R.ETH[i] }; if (!u.btc || !u.eth) continue; n++;
  if (E.gate(H, m, u).pass) passNew++;
  if (Math.abs(m.btc) > 2 * u.btc.avg || Math.abs(m.eth) > 2 * u.eth.avg) pass2x++;
  for (const s of ['BTC', 'ETH']) if (Math.abs(m[s.toLowerCase()]) > E.unusualThr(u[s.toLowerCase()])) one[s]++;
}
const pc = (x) => (100 * x / n).toFixed(2) + '%';
console.log(`hours ${n} | old rule 2x mean: ${pc(pass2x)} pass | new rule max(3x mean, p98): ${pc(passNew)} pass (BTC ${pc(one.BTC)}, ETH ${pc(one.ETH)})`);
assert.ok(n > 8000, 'a year of hours');
assert.ok(pass2x / n > 0.12, 'old rule reproduces the audit finding');
assert.ok(passNew / n < 0.04, 'new rule: under 4% of random hours pass (either asset)');
assert.ok(one.BTC / n <= 0.03 && one.ETH / n <= 0.03, 'per asset at most ~2-3% (p98 floor)');
// Nov 8 breaking events: stored numbers re-checked through the same rule
for (const [id, want] of [['2026-11-08-brk-1630', false], ['2026-11-08-brk-2220', true]]) {
  const ev = JSON.parse(fs.readFileSync(`data/events/${id}.json`)), g = ev.gate_check.results[0];
  assert.equal(E.gate(H, g.m, g.u).pass, want, id); assert.equal(ev.qualifies, want, id + ' file flag');
  console.log(id, want ? 'qualifies' : 'does NOT qualify', JSON.stringify(g.m), 'thr', JSON.stringify(g.thr));
}
console.log('PASS events-gate');
