// Patterns backtest candle sources + calendar unlock note. Offline (stubbed fetchers). Usage: node tests/patterns-sources.mjs
import fs from 'node:fs'; import assert from 'node:assert/strict'; import { spawnSync } from 'node:child_process';
import { candles, hlSpotPair, hlRows } from '../scripts/klines-lib.mjs';
const DAY = 864e5, WEEK = 7 * DAY, T0 = Date.UTC(2024, 10, 25);
const binRows = (n, step) => Array.from({ length: n }, (_, i) => [T0 + i * step, '1', '2', '0.5', '1.5', '10', 0, '15']);
const okxRows = (n, step) => Array.from({ length: n }, (_, i) => [String(T0 + (n - 1 - i) * step), '1', '2', '0.5', '1.5', '10', '0', '15']); // newest first
const hlCandles = (n, step) => Array.from({ length: n }, (_, i) => ({ t: T0 + i * step, T: T0 + (i + 1) * step - 1, s: '@107', i: '1w', o: '1', c: '1.5', h: '2', l: '0.5', v: '10', n: 5 }));
const META = { tokens: [{ name: 'USDC', index: 0 }, { name: 'HYPE', index: 150 }, { name: 'PURR', index: 1 }], universe: [{ name: 'PURR/USDC', tokens: [1, 0], index: 0 }, { name: '@107', tokens: [150, 0], index: 107 }] };
const tok = (symbol, ...ex) => ({ symbol, sources: ex.map((e) => ({ ex: e })) });
function stub({ binance = 0, bybit = 403, okx = 0, hl = 0, meta = META }) {
  const calls = { get: [], post: [] }; let okxPage = 0;
  const getJ = async (u) => { calls.get.push(u);
    if (u.includes('binance')) { if (binance === 403) throw new Error('HTTP 403'); return binRows(binance, WEEK); }
    if (u.includes('bybit')) { if (bybit === 403) throw new Error('HTTP 403'); return { result: { list: okxRows(bybit, WEEK) } }; }
    if (u.includes('okx')) return { data: okxPage++ ? [] : okxRows(okx, WEEK) };
    throw new Error('unexpected ' + u); };
  const postJ = async (b) => { calls.post.push(b); if (b.type === 'spotMeta') return meta; if (b.type === 'candleSnapshot') return hlCandles(hl, WEEK); throw new Error('unexpected'); };
  return { io: { getJ, postJ }, calls };
}
// 1. first source that has >= 60 bars wins, unchanged row shape; later sources are not asked
{ const { io, calls } = stub({ binance: 483 }); const r = await candles(tok('BTC', 'binance', 'bybit', 'okx'), '1d', io);
  assert.equal(r.src, 'Binance BTCUSDT'); assert.equal(r.k.length, 483); assert.deepEqual(r.k[0], { t: T0, o: 1, h: 2, l: 0.5, c: 1.5, v: 10, q: 15 });
  assert.equal(calls.get.length, 1); assert.equal(calls.post.length, 0); }
// 2. HYPE weekly on a GitHub runner: Binance too short, Bybit 403, OKX too short -> Hyperliquid spot, named as such
{ const { io, calls } = stub({ binance: 8, okx: 54, hl: 103 }); const r = await candles(tok('HYPE', 'binance', 'hyperliquid', 'bybit'), '1w', io);
  assert.equal(r.src, 'Hyperliquid HYPE/USDC spot'); assert.equal(r.k.length, 103);
  assert.ok(r.k.every((x, i) => !i || x.t > r.k[i - 1].t), 'ascending'); assert.ok(r.k.every((x) => !('q' in x)), 'no invented quote volume');
  assert.equal(calls.post[0].type, 'spotMeta'); assert.equal(calls.post[1].req.coin, '@107'); assert.equal(calls.post[1].req.interval, '1w');
  assert.ok(calls.get.findIndex((u) => u.includes('binance')) < calls.get.findIndex((u) => u.includes('bybit')) && calls.get.findIndex((u) => u.includes('bybit')) < calls.get.findIndex((u) => u.includes('okx')), 'existing order kept'); }
// 3. token without Hyperliquid listed and too little history everywhere: unavailable with each reason, never zero bars returned
{ const { io, calls } = stub({ okx: 34 }); await assert.rejects(candles(tok('MON', 'bybit', 'okx'), '1w', io), /^Error: bybit HTTP 403; okx 34 bars; fewer than 60 candles available$/); assert.equal(calls.post.length, 0); }
// 4. Hyperliquid listed but too short, or no USDC pair: still unavailable, reasons recorded
{ const { io } = stub({ binance: 8, okx: 54, hl: 59 }); await assert.rejects(candles(tok('HYPE', 'binance', 'hyperliquid', 'bybit'), '1w', io), /binance 8 bars; bybit HTTP 403; okx 54 bars; hyperliquid 59 bars; fewer than 60/); }
{ const { io } = stub({ okx: 10, meta: { tokens: [], universe: [] } }); await assert.rejects(candles(tok('HYPE', 'hyperliquid'), '1w', io), /hyperliquid no HYPE\/USDC spot pair/); }
assert.deepEqual(hlSpotPair(META, 'PURR'), { coin: 'PURR/USDC', name: 'PURR/USDC' }); assert.equal(hlSpotPair(META, 'MON'), null);
assert.deepEqual(hlRows([{ t: 2, o: '1', h: '1', l: '1', c: '1', v: '1' }, { t: 1, o: '1', h: '1', l: '1', c: '0', v: '1' }, { t: 0, o: '1', h: '1', l: '1', c: '1', v: '1' }]), [{ t: 2, o: 1, h: 1, l: 1, c: 1, v: 1 }]);
// 5. the daily Action never edits app code: weight write only behind --write-weights; workflow restores stray files before syncing
{ const s = fs.readFileSync('scripts/build_patterns_backtest.mjs', 'utf8');
  assert.match(s, /const better = passes && WRITE_W;/); assert.match(s, /const WRITE_W = process\.argv\.includes\('--write-weights'\);/);
  assert.equal((s.match(/writeFileSync\(f,/g) || []).length, 1); assert.match(s, /if \(better\) \{ const f = 'patterns\.js'/);
  assert.match(s, /const k = kAll\.slice\(0, -1\)/, 'still-forming bar dropped (closed candles only)');
  const y = fs.readFileSync('.github/workflows/patterns_backtest.yml', 'utf8'), ix = (x) => { const i = y.indexOf(x); assert.ok(i >= 0, x); return i; };
  assert.ok(ix("stray=$(git diff --name-only -- . ':!patterns_backtest.json')") < ix('git add patterns_backtest.json') && ix('git add patterns_backtest.json') < ix('do git pull --rebase'));
  assert.ok(ix('git checkout -- $stray') < ix('do git pull --rebase')); ix('41898282+github-actions[bot]@users.noreply.github.com');
  assert.ok(!/git add (-A|\.|--all)/.test(y), 'adds only its own file'); }
// 6. calendar: DefiLlama description templates never leak placeholders into notes
{ const py = `import sys, json; sys.path.insert(0, 'scripts'); import build_calendar as b
cases = json.loads(sys.argv[1]); print(json.dumps([b.unlock_source(d, c) for d, c in cases]))`;
  const cases = [['A cliff of {tokens[0]} tokens will unlock from Team on {timestamp}', 'insiders'], ['Linear unlock will increase from {tokens[0]} to {tokens[1]} tokens per week from Team on {timestamp}', 'insiders'],
    ['On {timestamp} {tokens[0]} of Category Labs Treasury tokens will be unlocked', 'noncirculating'], ['On {timestamp} {tokens[0]} of LEND core development tokens were unlocked', null],
    ['A cliff of {tokens[0]} tokens was unlocked from Staking Rewards on {timestamp}', 'farming'], ['Something new {tokens[0]}', 'privateSale'], ['', null], ['{tokens[0]} from {tokens[1]}', null]];
  const r = spawnSync('python3', ['-c', py, JSON.stringify(cases)], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), ['Team', 'Team', 'Category Labs Treasury', 'LEND core development', 'Staking Rewards', 'privateSale', 'unspecified', 'unspecified']); }
console.log('PASS patterns-sources (source order, Hyperliquid fallback, unavailable reasons, no app-code writes, calendar unlock source)');
