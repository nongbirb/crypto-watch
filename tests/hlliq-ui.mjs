// v65 Hyperliquid On-chain liquidation map (data/hlliq.json, largest 5,000 accounts), in Chromium:
//  - bins are drawn at real prices (mark x (1 + i x step %)), longs below / shorts above, coverage and accounts in the chips;
//  - levels the price already reached since the snapshot (Hyperliquid 5m high / low, then live ticks) are faded and left out of the totals;
//  - a live tick moves the price line on both maps and fades the long levels it crossed; the Estimated map is redrawn at the live price;
//  - low coverage (< 25 %) is flagged; a coin missing from the file falls back to the Smart Money panel ladder;
//  - phone 390 TH: chips in two columns, no sideways scroll.
// Venue data is live (the Leverage tab needs the exchanges); the file and the 5m candles are fixtures. Usage: node tests/hlliq-ui.mjs [baseUrl]
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });

// fixture: bins in % of the snapshot mark (step 0.5): longs at -1, -3, -6, -12 %, shorts at +1, +4, +9 %
const FIX = (mark, cov) => ({ updated: new Date(Date.now() - 20 * 6e4).toISOString().replace(/\.\d+Z$/, 'Z'), source: 'fixture', step: 0.5, range: 30, positions: 1234,
  accounts: { ranked: 48159, read: 4990, asked: 5000, minAv: 388763, avShare: 95.6 },
  coins: { BTC: { mark, oi: 2.5e9, cov, n: 900, long: 9.1e8, short: 4.6e8, L: [[-24, 2e8], [-12, 3e8], [-6, 1.5e8], [-2, 1e8]], S: [[1, 9e7], [7, 1.2e8], [17, 2e8]],
    noLiq: { n: 40, long: 1.5e8, short: 4e7 }, outside: { long: 1e7, short: 1e7 } } } });
async function open(w, lang, cov = 31.4, coins = null) {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, serviceWorkers: 'block', isMobile: w < 600, hasTouch: w < 600 });
  await c.addInitScript((l) => localStorage.setItem('cw-lang', l), lang);
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '#/markets'); await p.waitForSelector('[data-sel="BTC"]', { timeout: 60000 });
  await p.waitForFunction(() => tokBySym('BTC') && tokBySym('BTC').price > 0, null, { timeout: 60000 });
  const mark = await p.evaluate(() => tokBySym('BTC').price), fx = FIX(mark, cov); if (coins) fx.coins = coins(fx.coins);
  await c.route('**/data/hlliq.json*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(fx) }));
  await c.route('https://api.hyperliquid.xyz/info', async (r) => { const q = JSON.parse(r.request().postData() || '{}');
    if (q.type !== 'candleSnapshot') return r.continue(); // since the snapshot: low -1.6 %, high +0.8 %
    if (q.req.interval === '1h') return r.fulfill({ contentType: 'application/json', body: JSON.stringify(Array.from({ length: 72 }, (_, i) => ({ t: Date.now() - (72 - i) * 36e5, o: mark, h: mark, l: mark, c: mark * (1 + 0.004 * Math.sin(i / 6)) }))) });
    const t0 = Date.parse(fx.updated); r.fulfill({ contentType: 'application/json', body: JSON.stringify([{ t: t0, o: mark, h: mark * 1.008, l: mark * 0.984, c: mark }]) }); });
  await p.click('[data-sel="BTC"]'); await p.waitForTimeout(600); await p.click('[data-tab="lev"]');
  await p.waitForSelector('.lev [data-lev2]', { timeout: 90000 }); await p.click('[data-lvtab="real"]');
  return { c, p, errs, mark, fx };
}
const read = (p) => p.evaluate(() => { const q = (s) => document.querySelector(s), A = (s) => [...document.querySelectorAll(s)];
  const now = q('#lvR [data-hlqnow]');
  return { chips: A('#lvR .hlq-k').map((x) => [x.className.replace('hlq-k', '').trim(), x.querySelector('span').textContent, x.querySelector('b').textContent]),
    bands: A('#lvR .lhm-heat i').map((i) => ({ s: i.classList.contains('s'), x: i.classList.contains('x'), t: i.title })), now: now && now.textContent, nowTop: now && now.style.top,
    estTop: (q('#lvH .lhm-heat .lhm-now') || {}).style?.top, call: (q('#lvR [data-hlqcall]') || {}).textContent || '', keys: (q('#lvR [data-hlqkeys]') || {}).textContent || '',
    bul: A('#lvR .lvbul li').map((x) => x.textContent), src: (q('#lvSrcR') || {}).textContent, meth: (q('#lvPan-real .lvmeth') || {}).textContent || '', ow: document.documentElement.scrollWidth - innerWidth,
    cols: getComputedStyle(q('#lvR .hlq-ks')).gridTemplateColumns.split(' ').length }; });

// 1) desktop EN: real prices, reached levels faded, totals without them
{ const { c, p, errs, mark } = await open(1280, 'en'); await p.waitForSelector('#lvR [data-hlqks]', { timeout: 30000 }); const r = await read(p);
  const M = await p.evaluate(() => { const C = HLQ.cur; return hlqModel(C.x, C.d, tokBySym('BTC').price, C.ext); });
  ok(/Real liquidation prices .* largest 5,000 Hyperliquid accounts/.test(r.meth), 'method line names the largest 5,000 Hyperliquid accounts');
  ok(r.chips.map((x) => x[2]).join('|').startsWith('4,990|31%|'), `chips: accounts read and OI covered (${r.chips.map((x) => x[1] + ' ' + x[2]).join(' · ')})`);
  ok(r.bands.length === 7 && r.bands.filter((x) => x.s).length === 3, `7 real bands, 3 short (${r.bands.length})`);
  // reached: long -1 % bin (mid -0.75 %) and short +0.5 % bin (mid +0.75 %) sit inside the -1.6 % / +0.8 % range since the snapshot
  const hit = r.bands.filter((x) => x.x); ok(hit.length === 2 && hit.some((x) => x.s) && hit.some((x) => !x.s) && hit.every((x) => /already reached/.test(x.t)), `2 levels already reached are faded (${hit.map((x) => x.t).join(' | ')})`);
  ok(M.hitL === 1e8 && M.hitS === 9e7, `reached totals: long ${M.hitL}, short ${M.hitS}`);
  ok(M.n5L === 1.5e8 && M.n5S === 1.2e8 && M.n10L === 4.5e8, `within 5 %: long ${M.n5L} short ${M.n5S}; within 10 % long ${M.n10L} (reached levels left out)`);
  ok(r.chips[2][2] === '$150.0M' || /150/.test(r.chips[2][2]), `long-within-5% chip ${r.chips[2][2]}`);
  const lvl = (i) => mark * (1 + i * 0.005), tL = r.bands.find((x) => !x.s && /\$/.test(x.t) && x.t.includes('300'));
  ok(tL && tL.t.startsWith(await p.evaluate((v) => px(v), lvl(-12))), `the -6 % bin is drawn at its real price (${tL && tL.t})`);
  ok(/Largest real short cluster/.test(r.keys) && /Largest real long cluster/.test(r.keys), 'key levels: largest live long and short clusters');
  ok(r.bul.some((x) => /31% of BTC's open interest on Hyperliquid/.test(x)) && r.bul.some((x) => /20 min ago/.test(x)) && r.bul.some((x) => /no liquidation price/.test(x)), 'notes: coverage, snapshot age, positions without a liquidation price');
  ok(/largest 5,000 accounts, snapshot/.test(r.src), `side source line: ${r.src}`);
  ok(await p.evaluate(() => document.querySelector('#lvR .lhm-pc polyline').getAttribute('points').split(' ').length) === 72 && r.bul.some((x) => /last 72 hours/.test(x)), 'left column: the last 72 hours of Hyperliquid price');
  // 2) live tick 3 % lower: the price line moves on both maps, the -2.5 % long bin (mid -2.75 %) is now reached
  const before = { now: r.nowTop, est: r.estTop };
  await p.evaluate((v) => { lvTick.at = 0; tokBySym("BTC").price = v; S.live.onTick(v); }, mark * 0.97); await p.waitForTimeout(300); const r2 = await read(p);
  ok(r2.nowTop !== before.now && r2.now === await p.evaluate((v) => px(v), mark * 0.97), `live tick moves the on-chain price line to ${r2.now}`);
  ok(r2.estTop && r2.estTop !== before.est, `the Estimated map is redrawn at the live price (${before.est} -> ${r2.estTop})`);
  ok(r2.bands.filter((x) => x.x && !x.s).length === 2, 'the long level the live price crossed is now faded too');
  ok(r.ow <= 0 && !errs.length, `no sideways scroll, no page errors ${errs[0] || ''}`); await c.close(); }

// 3) phone TH, low coverage: flagged, two chip columns, no sideways scroll
{ const { c, p, errs } = await open(390, 'th', 12); await p.waitForSelector('#lvR [data-hlqks]', { timeout: 30000 }); const r = await read(p);
  ok(r.chips[1][0] === 'low' && r.bul.some((x) => /ครอบคลุมน้อย/.test(x)), `low coverage flagged (${r.chips[1][2]})`);
  ok(r.cols === 2 && r.ow <= 0, `phone: 2 chip columns, no sideways scroll (${r.ow})`);
  ok(/Long liq/.test(r.chips[2][1]) && r.bul.length >= 3, 'Thai labels and notes');
  ok(!errs.length, `no page errors ${errs[0] || ''}`); await c.close(); }

// 4) coin missing from the file: the Smart Money panel ladder (or its "not available" note), never an empty map
{ const { c, p, errs } = await open(1280, 'en', 31, () => ({ ETH: FIX(3000, 20).coins.BTC })); await p.waitForTimeout(2500); const t = await p.evaluate(() => document.querySelector('#lvR').innerText);
  ok(!(await p.$('#lvR [data-hlqks]')) && (/Real · Hyperliquid tracked wallets|not available for this token/.test(t)), `missing coin -> panel fallback (${t.slice(0, 70)})`);
  ok(!errs.length, `no page errors ${errs[0] || ''}`); await c.close(); }
await b.close();
console.log(`PASS hlliq-ui: ${n} checks (real prices, reached levels faded, live price on both maps, coverage, fallback, phone TH)`);
