// Live signal ledger (docs/architect-proof-layer.md §2.3). Keyless public APIs only.
// Usage: node scripts/build_ledger.mjs [run | prove | grade | summary]   (default run = prove + observe + grade + summary)
// Every run reads closed daily candles for each token in tokens.json, computes the Long / Wait / Avoid state with verdict-core.js
// and the active chart patterns with patterns.js (both on closed candles only), and APPENDS STATE CHANGES ONLY to
// data/ledger/YYYY-MM.json. Entries are graded later (r1 / r7 / r30 from closed candles). Locked fields never change after creation;
// lock time is proven from GitHub's server-side push timestamp (same rule as Events: events-core.js proveLock).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { VC, DAY, HORIZONS, WINDOW, r2, summarize, closedOnly } from './proof-lib.mjs';
const require = createRequire(import.meta.url);
const PE = require('../patterns.js'), E = require('../events-core.js');

export const DIR = process.env.LEDGER_DIR || 'data/ledger';
export const KINDS = ['verdict', 'pattern', 'funding_regime', 'oi_regime', 'sm_flow'];
export const LOCKED = ['id', 't', 'sym', 'kind', 'from', 'to', 'px', 'ctx'];
export const CAP = { month: 200 * 1024, summary: 100 * 1024 };
const H4 = 4 * 36e5, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
const sig = (x) => (Number.isFinite(x) ? +x.toPrecision(6) : null);
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const stamp = (ms) => iso(ms).slice(0, 13).replace(/[-:]/g, ''); // 20261113T00

/* ---------- ledger files ---------- */
export function loadLedger(dir = DIR) {
  const files = {}; if (!fs.existsSync(dir)) return { files, all: [] };
  for (const f of fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).sort()) files[f.slice(0, 7)] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  return { files, all: Object.keys(files).sort().flatMap((m) => files[m].entries) };
}
/* one entry per line: small diffs, and `git log -S '"id":"…"'` finds the commit that added an entry */
export const fmtMonth = (m) => `{"month":${JSON.stringify(m.month)},"entries":[\n${m.entries.map((e) => JSON.stringify(e)).join(',\n')}\n]}\n`;
export function saveLedger(L, dir = DIR, only = null) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [m, f] of Object.entries(L.files)) { if (only && !only.has(m)) continue; const p = path.join(dir, m + '.json'), s = fmtMonth(f); if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== s) fs.writeFileSync(p, s); }
}

/* ---------- observation: what the app shows right after the last daily close ---------- */
export function observe(sym, k1d, h4, now, src) {
  const d = closedOnly(k1d, now); if (d.length < 15) throw new Error(`only ${d.length} closed daily bars`); // short history = Insufficient, as in the app
  const last = d[d.length - 1], t = last.t + DAY; // close time of the last closed daily bar = signal time
  if (now - t > 2 * DAY) throw new Error('stale: last closed daily bar ' + iso(last.t));
  const seen = iso(now), out = { t, px: last.c, patterns: [] };
  const I = VC.compute({ d1: d.slice(-WINDOW), h4: h4 || null, price: last.c }, { closedOnly: true, now: t }), P = I.plan;
  out.verdict = { to: P.bias, ctx: { trend: I.trend, close: sig(P.close), ma50: sig(I.ma50), ma200: sig(I.ma200), hist: sig(I.hist), rr1: P.tps[0] ? r2(P.tps[0].rr) : null,
    entry: [sig(P.entry[0]), sig(P.entry[1])], stop: sig(P.stop), tp1: P.tps[0] ? sig(P.tps[0].price) : null, ref: P.ref, bars: P.history, src, seen } };
  const kp = d.slice(-1000), r = PE.analyze(kp);
  // one formation = type + the bar it starts on; the same formation growing a new pivot is not a new signal
  for (const x of r.cands || []) { if (!x.o || x.o.st === 'inv') continue;
    const key = `${x.type}:${kp[x.from].t}`;
    out.patterns.push({ to: x.type, key, ctx: { key, st: x.o.st, dir: x.dir || 0, conf: x.conf, tgt: sig(x.tgt), inv: sig(x.inv), src, seen } }); }
  return out;
}
/* Append state changes only. Idempotent: the same observation twice adds nothing. Never edits an existing entry. */
export function step(L, sym, ob) {
  const all = L.all, mine = all.filter((e) => e.sym === sym), add = [];
  const maxT = all.length ? Math.max(...all.map((e) => Date.parse(e.t))) : -Infinity;
  if (ob.t < maxT) return { add, skip: `observation ${iso(ob.t)} is older than the newest entry ${iso(maxT)}` }; // keeps t increasing
  const t = iso(ob.t), knownSym = mine.some((e) => e.kind === 'verdict');
  const lastV = mine.filter((e) => e.kind === 'verdict').pop();
  if (!mine.some((e) => e.kind === 'verdict' && e.t === t) && (!lastV || lastV.to !== ob.verdict.to))
    add.push({ id: `${stamp(ob.t)}-${sym}-verdict-${ob.verdict.to}`, t, sym, kind: 'verdict', from: lastV ? lastV.to : null, to: ob.verdict.to, px: sig(ob.px), ctx: ob.verdict.ctx });
  const keys = new Set(mine.filter((e) => e.kind === 'pattern').map((e) => e.ctx && e.ctx.key));
  for (const p of ob.patterns) if (!keys.has(p.key)) { keys.add(p.key);
    add.push({ id: `${stamp(ob.t)}-${sym}-pattern-${hash(p.key)}`, t, sym, kind: 'pattern', from: knownSym ? 'none' : null, to: p.to, px: sig(ob.px), ctx: p.ctx }); }
  const ids = new Set(all.map((e) => e.id));
  for (const e of add) { if (ids.has(e.id)) continue; ids.add(e.id); const m = e.t.slice(0, 7); (L.files[m] || (L.files[m] = { month: m, entries: [] })).entries.push(e); all.push(e); }
  return { add: add.filter((e) => all.includes(e)) };
}
/* Grade: r_h = close of the daily bar that closes h days after the signal time ÷ px − 1, in %. Filled once, never changed. */
export function grade(L, candles) {
  let n = 0; const changed = new Set();
  for (const e of L.all) { const k = candles[e.sym]; if (!k) continue; const by = new Map(k.map((x) => [x.t, x]));
    for (const h of HORIZONS) { const f = 'r' + h; if (e[f] != null) continue; const b = by.get(Date.parse(e.t) + (h - 1) * DAY); if (!b) continue; e[f] = r2((b.c / e.px - 1) * 100); n++; changed.add(e.t.slice(0, 7)); } }
  return { n, changed };
}
/* Summary per kind and `to` state: n, nEff, medians, share positive, against the token baseline (all days, same period). */
export function buildSummary(L, candles, now) {
  const real = L.all.filter((e) => e.from !== null), since = L.all.length ? L.all[0].t : null, rows = [];
  const base = (syms) => { const o = {}; for (const h of HORIZONS) { const cs = [];
    for (const s of syms) { const k = candles[s]; if (!k || !since) continue; const by = new Map(k.map((x) => [x.t, x])); for (const x of k) { if (x.t + DAY < Date.parse(since)) continue; const y = by.get(x.t + h * DAY); if (y) cs.push({ t: x.t, r: (y.c / x.c - 1) * 100 }); } }
    const s = summarize(cs, h, `base|${syms.join(',')}|${h}`); o['h' + h] = { n: s.n, nEff: s.nEff, med: s.med, pos: s.pos }; } return o; };
  const allSyms = Object.keys(candles), bAll = base(allSyms), bSym = Object.fromEntries(allSyms.map((s) => [s, base([s])]));
  const groups = new Map(); for (const e of real) { for (const g of [`${e.kind}|${e.to}|ALL`, ...(e.kind === 'verdict' ? [`${e.kind}|${e.to}|${e.sym}`] : [])]) { if (!groups.has(g)) groups.set(g, []); groups.get(g).push(e); } }
  for (const [g, es] of [...groups].sort()) { const [kind, to, sym] = g.split('|'), row = { kind, to, sym, entries: es.length };
    for (const h of HORIZONS) { const s = summarize(es.filter((e) => e['r' + h] != null).map((e) => ({ t: Date.parse(e.t), r: e['r' + h] })), h, g + '|' + h); row['h' + h] = s; }
    row.base = sym === 'ALL' ? bAll : bSym[sym] || null; rows.push(row); }
  return { since, entries: L.all.length, changes: real.length, kinds: KINDS, counts: Object.fromEntries(KINDS.map((k) => [k, real.filter((e) => e.kind === k).length])), rows,
    note: 'Changes only (the first observation of each token is not counted). nEff: cases in time order across all tokens, one per horizon window. ALL rows compare with all tracked tokens pooled; token rows with that token. Not advice.' };
}
export function writeSummary(sum, dir = DIR, now = Date.now()) {
  const p = path.join(dir, 'summary.json'); let prev = null; try { prev = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { /* first run */ }
  if (prev) { const { updated, ...rest } = prev; if (JSON.stringify(rest) === JSON.stringify(sum)) return false; } // only rewrite on real change (repo growth)
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(p, JSON.stringify({ updated: iso(now), ...sum }) + '\n'); return true;
}

/* ---------- lock proof: first commit that holds the entry + GitHub push timestamp ---------- */
const REPO = process.env.GITHUB_REPOSITORY || 'nongbirb/crypto-watch';
// git runs inside the ledger folder, so the same code proves entries in this repo and in a test repo
export function entryCommit(file, id) { try { return execFileSync('git', ['log', '--reverse', '--format=%H', '-S', `"id":${JSON.stringify(id)}`, '--', path.basename(file)], { cwd: path.dirname(file), stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n').filter(Boolean)[0] || null; } catch (e) { return null; } }
const isAnc = (dir) => (a, b) => { if (a === b) return true; try { execFileSync('git', ['merge-base', '--is-ancestor', a, b], { cwd: dir, stdio: 'ignore' }); return true; } catch (e) { return false; } };
async function pushes() {
  if (process.env.LEDGER_PUSHES) return JSON.parse(fs.readFileSync(process.env.LEDGER_PUSHES, 'utf8')); // tests: injected push list
  const out = [], h = process.env.GITHUB_TOKEN ? { authorization: 'Bearer ' + process.env.GITHUB_TOKEN } : {};
  try { for (let page = 1; page <= 10; page++) { const r = await (await fetch(`https://api.github.com/repos/${REPO}/activity?per_page=100&page=${page}`, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'kms-capital', ...h } })).json();
    if (!Array.isArray(r)) throw new Error(r && r.message || 'bad response'); for (const a of r) if (['push', 'branch_creation', 'force_push', 'merge_queue_merge', 'pr_merge'].includes(a.activity_type)) out.push({ after: a.after, ts: a.timestamp, ref: a.ref }); if (r.length < 100) break; }
    return out; } catch (e) { console.log('lock proof: GitHub activity unavailable:', e.message); return null; }
}
export async function prove(L, dir = DIR, now = Date.now()) {
  const P = await pushes(); if (!P) return { n: 0, changed: new Set() }; let n = 0; const changed = new Set();
  for (const e of L.all) { if (e.proof) continue; const c = entryCommit(path.join(dir, e.t.slice(0, 7) + '.json'), e.id); if (!c) continue;
    const pr = E.proveLock(c, iso(now), P, isAnc(dir)); if (!pr.verified) continue; e.proof = { commit: pr.commit, pushed_at: pr.pushed_at, ref: pr.ref }; n++; changed.add(e.t.slice(0, 7)); }
  return { n, changed };
}

/* ---------- candles (same venues and order as the app: first source with fresh candles wins) ---------- */
async function getJ(u, opt) { for (let i = 0; i < 3; i++) { try { const r = await fetch(u, { ...opt, headers: { 'user-agent': 'kms-capital', ...(opt && opt.headers) } }); if (r.ok) return await r.json(); throw new Error('HTTP ' + r.status); } catch (e) { if (i === 2) throw e; await sleep(1200 * (i + 1)); } } }
const B = (t, o, h, l, c, v, q) => ({ t: +t, o: +o, h: +h, l: +l, c: +c, v: +v, q: +q });
async function kl(s, tf, limit) {
  const iv = { binance: { '1d': '1d', '4h': '4h' }, bybit: { '1d': 'D', '4h': '240' }, okx: { '1d': '1Dutc', '4h': '4H' }, hyperliquid: { '1d': '1d', '4h': '4h' } }[s.ex][tf];
  if (s.ex === 'binance') return (await getJ(`https://data-api.binance.vision/api/v3/klines?symbol=${s.pair}&interval=${iv}&limit=${limit}`)).map((x) => B(x[0], x[1], x[2], x[3], x[4], x[5], x[7]));
  if (s.ex === 'bybit') { const r = await getJ(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${s.pair}&interval=${iv}&limit=${limit}`); if (r.retCode !== 0) throw new Error(r.retMsg); return r.result.list.map((x) => B(x[0], x[1], x[2], x[3], x[4], x[5], x[6])).reverse(); }
  if (s.ex === 'okx') { let all = [], after = ''; while (all.length < limit) { const r = await getJ(`https://www.okx.com/api/v5/market/history-candles?instId=${s.pair}&bar=${iv}&limit=100${after}`); if (r.code !== '0') throw new Error(r.msg); if (!r.data.length) break; all = all.concat(r.data); if (r.data.length < 100) break; after = '&after=' + r.data[r.data.length - 1][0]; await sleep(220); }
    // history-candles can lag the newest bars; the live endpoint fills the most recent 300
    const live = await getJ(`https://www.okx.com/api/v5/market/candles?instId=${s.pair}&bar=${iv}&limit=300`); const m = new Map(); [...all, ...(live.data || [])].forEach((x) => m.set(+x[0], B(x[0], x[1], x[2], x[3], x[4], x[5], x[7]))); return [...m.values()].sort((a, b) => a.t - b.t); }
  if (s.ex === 'hyperliquid') { const ms = tf === '4h' ? H4 : DAY; return (await getJ('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'candleSnapshot', req: { coin: s.pair, interval: iv, startTime: Date.now() - limit * ms } }) })).map((x) => B(x.t, x.o, x.h, x.l, x.c, x.v, +x.v * +x.c)); }
  throw new Error('unknown exchange ' + s.ex);
}
async function tokenCandles(t, now) {
  const errs = [];
  for (const s of t.sources) { try { const k = await kl(s, '1d', 1000); if (!k.length || now - k[k.length - 1].t > 3 * DAY) throw new Error('stale data');
    let h4 = null; try { h4 = await kl(s, '4h', 180); if (!h4.length || now - h4[h4.length - 1].t > DAY) h4 = null; } catch (e) { h4 = null; }
    return { k, h4, src: `${s.ex}:${s.pair}` }; } catch (e) { errs.push(`${s.ex}: ${e.message}`); } }
  throw new Error(errs.join(' · '));
}

async function main() {
  const cmd = process.argv[2] || 'run', now = Date.now(), L = loadLedger(), touched = new Set();
  const tok = JSON.parse(fs.readFileSync('tokens.json', 'utf8')).tokens;
  if (cmd === 'prove' || cmd === 'run') { const p = await prove(L); p.changed.forEach((m) => touched.add(m)); console.log('proved', p.n); if (cmd === 'prove') { saveLedger(L, DIR, touched); return; } }
  const candles = {};
  for (const t of tok) {
    try { const { k, h4, src } = await tokenCandles(t, now); candles[t.symbol] = closedOnly(k, now);
      if (cmd === 'run') { const ob = observe(t.symbol, k, h4, now, src), r = step(L, t.symbol, ob); r.add.forEach((e) => touched.add(e.t.slice(0, 7)));
        console.log(t.symbol, src, 'state', ob.verdict.to, 'patterns', ob.patterns.map((p) => p.to).join(',') || '-', r.skip ? 'SKIP ' + r.skip : 'new ' + r.add.map((e) => e.kind + ':' + e.to).join(',')); }
    } catch (e) { console.log(t.symbol, 'FAIL', e.message); }
  }
  if (!Object.keys(candles).length) { console.log('FAIL: no token returned candles'); process.exit(1); }
  if (!fs.existsSync('data/lev')) console.log('skip funding_regime / oi_regime: data/lev/ is built in Phase 4');
  if (!fs.existsSync('data/sm')) console.log('skip sm_flow: Smart Money flow history (data/sm/) is built in Phase 2; smart_money.json alone has levels, not flows');
  if (cmd === 'run' || cmd === 'grade') { const g = grade(L, candles); g.changed.forEach((m) => touched.add(m)); console.log('graded', g.n); }
  saveLedger(L, DIR, touched);
  const wrote = writeSummary(buildSummary(L, candles, now), DIR, now); console.log('entries', L.all.length, 'summary', wrote ? 'updated' : 'unchanged');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch((e) => { console.error(e); process.exit(1); });
