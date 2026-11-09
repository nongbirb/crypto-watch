// Lock proof: the commit holding the locked view must be in a push GitHub recorded before the release. Usage: node tests/events-lock.mjs  (NET=0 skips the live GitHub check)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('../events-core.js'), ROOT = process.cwd();
const at = '2026-11-10T13:30:00Z', anc = (a, b) => a === b || (a === 'L' && b === 'C');
// 1) pure rule
assert.equal(E.proveLock('L', at, [{ after: 'C', ts: '2026-11-10T12:40:00Z', ref: 'refs/heads/main' }], anc).verified, true, 'a push before the release that contains the lock');
assert.equal(E.proveLock('L', at, [{ after: 'C', ts: '2026-11-10T13:31:00Z' }], anc).verified, false, 'pushed after the release');
assert.equal(E.proveLock('L', at, [{ after: 'X', ts: '2026-11-10T12:00:00Z' }], anc).verified, false, 'push does not contain the lock commit');
assert.equal(E.proveLock('L', at, null, anc).why, 'push history unavailable'); assert.equal(E.proveLock(null, at, [], anc).verified, false);
assert.equal(E.proveLock('L', at, [{ after: 'C', ts: '2026-11-10T13:00:00Z' }, { after: 'L', ts: '2026-11-10T12:00:00Z' }], anc).pushed_at, '2026-11-10T12:00:00Z', 'earliest proving push');
const v = { locked_at: '2026-11-10T12:30:00Z', scenarios: [{ key: 'hot', min: 0.3, btc: 'down' }] }, post = { d1: { BTC: { pct: -2 } } };
assert.equal(E.scoreView(v, 0.4, post, false).scenario, null, 'unverified lock is not scored'); assert.equal(E.scoreView(v, 0.4, post, true).d1, true);
assert.equal(E.lockOk({ kind: 'scheduled', view: v }), false); assert.equal(E.lockOk({ kind: 'scheduled', view: v, lock_proof: { verified: true } }), true);
assert.ok(E.FROZEN.includes('lock_proof'), 'proof is frozen once written');
console.log('ok proveLock rule');
// 2) real git: first commit containing the locked view, validate rejects a forged proof
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'evlock-')), g = (...a) => execFileSync('git', a, { cwd: d, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
g('init', '-q'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't'); fs.mkdirSync(path.join(d, 'data/events'), { recursive: true });
const f = 'data/events/2026-11-10-cpi.json', ev = { schema: 1, id: '2026-11-10-cpi', kind: 'scheduled', type: 'cpi', at, source: { url: 'https://www.bls.gov/' } };
fs.writeFileSync(path.join(d, f), JSON.stringify(ev)); g('add', '-A'); g('commit', '-qm', 'event');
fs.writeFileSync(path.join(d, f), JSON.stringify({ ...ev, view: v })); g('add', '-A'); g('commit', '-qm', 'lock'); const lockSha = g('rev-parse', 'HEAD');
fs.writeFileSync(path.join(d, f), JSON.stringify({ ...ev, view: v, post })); g('add', '-A'); g('commit', '-qm', 'score'); const head = g('rev-parse', 'HEAD');
process.chdir(d); process.env.EVENTS_DIR = 'data/events';
const pf = path.join(d, 'pushes.json'); fs.writeFileSync(pf, JSON.stringify([{ after: head, ts: '2026-11-10T12:45:00Z', ref: 'refs/heads/main' }])); process.env.EVENTS_PUSHES = pf;
const B = await import(path.join(ROOT, 'scripts/build_events.mjs'));
assert.equal(B.lockCommit(f, v), lockSha, 'first commit that holds the exact locked view');
const pr = await B.proveFile(f, { ...ev, view: v }); assert.equal(pr.verified, true); assert.equal(pr.commit, lockSha); assert.equal(pr.pushed_at, '2026-11-10T12:45:00Z');
fs.writeFileSync(path.join(d, f), JSON.stringify({ ...ev, view: v, post, lock_proof: pr })); let r = await B.validateProofs('data/events'); assert.deepEqual(r.errs, [], 'genuine proof passes');
fs.writeFileSync(path.join(d, f), JSON.stringify({ ...ev, view: v, post, lock_proof: { ...pr, commit: 'f'.repeat(40) } })); r = await B.validateProofs('data/events'); assert.equal(r.errs.length, 1, 'forged proof rejected');
fs.writeFileSync(path.join(d, f), JSON.stringify({ ...ev, view: v, post })); r = await B.validateProofs('data/events'); assert.match(r.notes.join(), /lock not verified/, 'no proof -> note, not scored');
process.chdir(ROOT); console.log('ok git lock commit + validate');
// 3) live GitHub: this branch's real push history (events commit 13c494e was first pushed 2026-11-09T09:48:39Z)
if (process.env.NET !== '0') {
  const acts = await (await fetch('https://api.github.com/repos/nongbirb/crypto-watch/activity?per_page=100', { headers: { accept: 'application/vnd.github+json' } })).json();
  const P = acts.map((a) => ({ after: a.after, ts: a.timestamp, ref: a.ref })), isA = (a, b) => { try { execFileSync('git', ['merge-base', '--is-ancestor', a, b], { stdio: 'ignore' }); return true; } catch (e) { return false; } };
  const sha = execFileSync('git', ['rev-parse', '13c494e']).toString().trim();
  const yes = E.proveLock(sha, '2026-11-09T10:00:00Z', P, isA), no = E.proveLock(sha, '2026-11-09T09:40:00Z', P, isA);
  assert.equal(yes.verified, true, 'real push before 10:00Z'); assert.equal(no.verified, false, 'nothing pushed before 09:40Z');
  console.log('ok live GitHub activity: 13c494e pushed', yes.pushed_at, 'via', yes.ref);
}
console.log('PASS events-lock');
