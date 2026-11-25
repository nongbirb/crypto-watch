// v73 compare panes and list, in Chromium against live candles:
//  - pane order is always price, compare panes (in list order), then indicators; each compare pane holds the coin's real candles
//    matched to the main bars by open time (checked against candles fetched again from the venue), own price axis;
//  - two independent toggles per coin (on the main chart / chart below), up to 4 coins, ↑ / ↓ and drag reorder the panes, − removes;
//  - pane labels and value tags follow the pointer; pointing in a lower pane keeps a price tag on the main chart;
//  - desktop separator drag: the dragged pane takes the new height, the next pane keeps its height, the chart grows, labels follow;
//  - Reset: price chart only, every setting back to default; the old single-coin setting (cw-cmp) is carried over.
// Usage: node tests/compare-panes-ui.mjs [baseUrl]
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const L0 = [{ s: 'BTC', o: true, p: true, c: 0 }, { s: 'ETH', o: false, p: true, c: 1 }];
const open = async (w, h, list, ind, mob = false) => { const c = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', isMobile: mob, hasTouch: mob });
  await c.addInitScript(([l, i]) => { if (sessionStorage.getItem('init')) return; sessionStorage.setItem('init', '1'); localStorage.clear(); localStorage.setItem('cw-lang', 'en'); localStorage.setItem('cw-sel', 'SOL'); localStorage.setItem('cw-cmpl', JSON.stringify(l)); if (i) localStorage.setItem('cw-ind', JSON.stringify(i)); }, [list, ind]);
  const p = await c.newPage(), errs = []; p.on('pageerror', (e) => errs.push(String(e))); await p.goto(B + 'index.html#/markets'); await p.waitForSelector('#ch1 canvas', { timeout: 60000 });
  await p.waitForFunction(() => S.charts[0] && S.charts[0].panes().slice(1).some((q) => q.getSeries().some((x) => x.seriesType() === 'Candlestick' && x.data().some((d) => d.close != null))), null, { timeout: 60000 }); await p.waitForTimeout(1200); return { c, p, errs }; };
const panes = (p) => p.evaluate(() => S.charts[0].panes().map((q) => ({ h: Math.round(q.getHeight()), s: q.getSeries().map((x) => x.seriesType()).join('+') })));
const labels = (p) => p.evaluate(() => [...document.querySelectorAll('.pc-lbl')].map((x) => ({ k: x.dataset.pl, top: parseFloat(x.style.top) })));
const paneTops = (p) => p.evaluate(() => { const wr = document.querySelector('#pcw').getBoundingClientRect(); return S.charts[0].panes().map((q) => Math.round(q.getHTMLElement().getBoundingClientRect().top - wr.top)); });

// 1) order, data, labels, tags (desktop, MACD + Stochastic on)
{ const { c, p, errs } = await open(1280, 1300, L0, { ma: true, vol: true, bb: false, fib: false, rsi: false, macd: true, stoch: true });
  const P = await panes(p), lb = await labels(p);
  ok(P.length === 5 && /^Candlestick\+/.test(P[0].s) && P[1].s === 'Candlestick' && P[2].s === 'Candlestick' && /Histogram/.test(P[3].s) && P[4].s === 'Line+Line', `order: price, BTC pane, ETH pane, MACD, Stochastic (${P.map((x) => x.s).join(' | ')})`);
  ok(lb.map((x) => x.k).join() === 'c:BTC,c:ETH,macd,stoch', `pane labels in the same order (${lb.map((x) => x.k).join()})`);
  const tops = await paneTops(p); ok(lb.every((x, i) => Math.abs(x.top - (tops[i + 1] + 4)) <= 2), 'each label sits at the top of its pane');
  // the BTC pane = BTC's raw candles matched by open time
  const chk = await p.evaluate(async () => { const pane = S.charts[0].panes()[1].getSeries()[0].data(), raw = await klines(PC['BTC|1d'].src, '1d', 1000), m = new Map(raw.map((x) => [Math.floor(x.t / 1000), x]));
    let n2 = 0, bad = 0; pane.slice(0, -1).forEach((d) => { if (d.close == null) return; const r = m.get(d.time); if (!r) return; n2++; if (Math.abs(r.c - d.close) > 1e-9 || Math.abs(r.h - d.high) > 1e-9 || Math.abs(r.l - d.low) > 1e-9 || Math.abs(r.o - d.open) > 1e-9) bad++; }); return { n2, bad }; });
  ok(chk.n2 > 200 && chk.bad === 0, `BTC pane candles = raw BTC candles (${chk.n2} bars, ${chk.bad} differ)`);
  // pointer inside the ETH pane
  const el = await p.$('#pcw'); await el.scrollIntoViewIfNeeded(); const r = await el.boundingBox(), t2 = await paneTops(p);
  await p.mouse.move(r.x + r.width * 0.5, r.y + t2[2] + 60, { steps: 4 }); await p.waitForTimeout(500);
  const g = await p.evaluate(() => ({ eth: document.querySelector('[data-pl="c:ETH"] .pl-v').innerText, tags: [...document.querySelectorAll('.pc-vts span:not(.lv)')].map((x) => x.textContent), hl: [...document.querySelectorAll('.pc-hl')].filter((x) => !x.hidden).length, read: document.querySelector('#pRead').innerText.split('\n')[0] }));
  ok(/\$[\d,.]+/.test(g.eth) && g.tags.length === 7 && g.hl === 2 && !/live|last close/.test(g.read), `pointing in the ETH pane: its label and all 7 tags (v74: with the BTC % · price tag) show that bar, plus a price tag on the main chart (${g.eth.replace(/\s+/g, ' ')})`);
  await p.mouse.move(1, 1);
  // separator drag: BTC pane grows, ETH keeps its height, the chart grows, labels follow
  const H0 = await panes(p), W0 = await p.evaluate(() => document.querySelector('#pcw').offsetHeight), t3 = await paneTops(p);
  const sepY = r.y + t3[2] - 1; await p.mouse.move(r.x + 300, sepY); await p.mouse.down(); await p.mouse.move(r.x + 300, sepY + 60, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(900);
  const H1 = await panes(p), W1 = await p.evaluate(() => document.querySelector('#pcw').offsetHeight), lb1 = await labels(p), t4 = await paneTops(p);
  ok(H1[1].h > H0[1].h + 30 && Math.abs(H1[2].h - H0[2].h) <= 3 && W1 > W0 + 30, `separator drag: BTC pane ${H0[1].h} -> ${H1[1].h}px, ETH keeps ${H0[2].h} -> ${H1[2].h}px, chart ${W0} -> ${W1}px`);
  ok(lb1.every((x, i) => Math.abs(x.top - (t4[i + 1] + 4)) <= 2), 'labels move with their panes after the drag');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('cw-ph')).cmp > 0), 'the dragged height is remembered');
  ok(!errs.length, `no page errors ${errs[0] || ''}`); await c.close(); }

// 2) list controls: toggles, ↑, drag reorder, remove, limit of 4
{ const { c, p, errs } = await open(1280, 1100, L0, null);
  await p.click('[data-cmpset]'); await p.click('[data-cmptog="ETH:o"]'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => S.charts[0]._cmp().filter((e) => e.ser).map((e) => e.s).join()) === 'BTC,ETH', 'ETH "on the main chart" adds its % line next to BTC');
  await p.click('[data-cmptog="BTC:p"]'); await p.waitForTimeout(1500);
  ok((await panes(p)).filter((x) => x.s === 'Candlestick').length === 1 && (await labels(p))[0].k === 'c:ETH', 'BTC "chart below" off: only the ETH pane is left, BTC stays on the main chart');
  await p.click('[data-cmptog="BTC:p"]'); await p.waitForTimeout(1200); await p.click('[data-cmpmv="ETH:-1"]'); await p.waitForTimeout(1200);
  ok((await labels(p)).slice(0, 2).map((x) => x.k).join() === 'c:ETH,c:BTC', '↑ moves ETH above BTC (panes follow the list order)');
  // drag the BTC row above ETH
  const hb = await (await p.$('[data-cmprow="BTC"] [data-cmpdrag]')).boundingBox(), he = await (await p.$('[data-cmprow="ETH"]')).boundingBox();
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.mouse.down(); await p.mouse.move(hb.x + hb.width / 2, he.y + 4, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('cw-cmpl')).map((x) => x.s).join()) === 'BTC,ETH' && (await labels(p))[0].k === 'c:BTC', 'drag on ⋮⋮ reorders the list and the panes');
  for (const s of ['HYPE', 'AAVE']) { await p.click(`[data-cmppick="${s}"]`); await p.waitForTimeout(900); }
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('cw-cmpl')).length === 4 && [...document.querySelectorAll('[data-cmppick]')].every((x) => x.disabled) && /limit|ครบ/.test(document.querySelector('[data-cmperr]').textContent)), 'four coins is the limit: the add buttons are disabled and say so');
  await p.click('[data-cmpdel="AAVE"]'); await p.waitForTimeout(900);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('cw-cmpl')).map((x) => x.s).join()) === 'BTC,ETH,HYPE', '− removes one coin and keeps the rest');
  ok(!errs.length, `no page errors ${errs[0] || ''}`); await c.close(); }

// 3) Reset, and the old single-coin setting is carried over
{ const c = await b.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: 'block' });
  await c.addInitScript(() => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', '1'); localStorage.clear(); localStorage.setItem('cw-sel', 'SOL'); localStorage.setItem('cw-cmp', JSON.stringify('ETH')); localStorage.setItem('cw-stoch', JSON.stringify([14, 3, 3])); });
  const p = await c.newPage(); await p.goto(B + 'index.html#/markets'); await p.waitForFunction(() => document.querySelector('[data-prcmp]'), null, { timeout: 60000 });
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('cw-cmpl') || 'null') === null && /ETH/.test(document.querySelector('[data-prcmp]').innerText)), 'old setting (one coin on the main chart) still works');
  await p.click('[data-preset]'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({ panes: S.charts[0].panes().length, ser: S.charts[0].panes()[0].getSeries().map((x) => x.seriesType()).join(), on: [...document.querySelectorAll('[data-ind][aria-pressed="true"]')].length, cmpl: localStorage.getItem('cw-cmpl'), st: document.querySelector('[data-ind="stoch"] small').textContent, fmt: S.charts[0].panes()[0].getSeries()[0].options().priceFormat.formatter(5) }));
  ok(r.panes === 1 && r.ser === 'Candlestick' && r.on === 0 && r.cmpl === '[]' && r.st === '9/3/3' && !/%/.test(r.fmt), `Reset: price chart only, no switches on, compare list empty, Stochastic back to 9/3/3 (${JSON.stringify(r)})`);
  await p.reload(); await p.waitForSelector('#ch1 canvas'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => S.charts[0].panes().length === 1 && S.charts[0].panes()[0].getSeries().length === 1), 'Reset is kept after a reload'); await c.close(); }

// 4) phone: compare panes fit, no sideways scroll, settings rows usable
{ const { c, p, errs } = await open(390, 844, L0, null, true);
  await p.click('[data-cmpset]'); await p.waitForTimeout(300);
  const m = await p.evaluate(() => ({ ow: document.documentElement.scrollWidth - innerWidth, tog: [...document.querySelectorAll('.cmpl-t')].map((x) => Math.round(x.getBoundingClientRect().height)), lbl: [...document.querySelectorAll('.pc-lbl')].map((x) => x.dataset.pl) }));
  ok(m.ow <= 0 && m.tog.every((h) => h >= 40) && m.lbl.slice(0, 2).join() === 'c:BTC,c:ETH', `phone: no sideways scroll, toggles ${m.tog.join('/')}px tall, BTC and ETH panes`);
  ok(!errs.length, `no page errors ${errs[0] || ''}`); await c.close(); }
await b.close();
console.log(`PASS compare-panes-ui: ${n} checks (pane order, raw-candle panes, toggles, reorder, limit, separator drag grows the chart, reset, migration, phone)`);
