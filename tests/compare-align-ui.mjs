// v75 compare accuracy, in Chromium against live candles:
//  - Hyperliquid's own 1W bars start on Thursday and its 1M bars on odd days; they are now built from its daily candles so every venue
//    uses Monday weeks and calendar months; checked against daily candles fetched again from Hyperliquid;
//  - a compare candle is used only when it opens at exactly the same time as the main candle (HYPE main vs Binance BTC / ETH weekly,
//    SOL main vs Hyperliquid HYPE weekly and monthly): no bar borrowed from another week; the latest candle is the current one;
//  - HYPE's monthly chart has its whole history (the request used to start before 1970 and fail);
//  - pointing in a compare pane: the line, dot and tag snap to that candle's O/H/L/C and the pane label lists O/H/L/C.
// Usage: node tests/compare-align-ui.mjs [baseUrl]
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const OFF = { ma: false, vol: false, bb: false, fib: false, rsi: false, macd: false, stoch: false, rs: false };
const open = async (sel, tf, list) => { const c = await b.newContext({ viewport: { width: 1280, height: 1200 }, serviceWorkers: 'block' });
  await c.addInitScript(([s0, t0, l]) => { if (sessionStorage.getItem('init')) return; sessionStorage.setItem('init', '1'); localStorage.clear(); localStorage.setItem('cw-lang', 'en'); localStorage.setItem('cw-sel', s0); localStorage.setItem('cw-ptf', JSON.stringify(t0));
    localStorage.setItem('cw-cmpl', JSON.stringify(l.map((s, i) => ({ s, o: true, p: true, c: i })))); localStorage.setItem('cw-ind', JSON.stringify({ ma: false, vol: false, bb: false, fib: false, rsi: false, macd: false, stoch: false, rs: false })); }, [sel, tf, list]);
  const p = await c.newPage(), errs = []; p.on('pageerror', (e) => errs.push(String(e))); await p.goto(B + 'index.html#/markets'); await p.waitForSelector('#ch1 canvas', { timeout: 60000 });
  await p.waitForFunction((nn) => S.charts[0] && S.charts[0]._cmp && S.charts[0]._cmp().filter((e) => e.pser && e.pser.data().some((d) => d.close != null)).length === nn, list.filter((x) => x !== sel).length, { timeout: 90000 }); await p.waitForTimeout(1500); return { c, p, errs }; };
// every compare pane candle = the compare coin's bar with the same open time; starts of the periods
const audit = (p, sel, tf) => p.evaluate(([m, t0]) => { const intra = TFMS[t0] < 864e5, main = PC[`${m}|${t0}`];
  return S.charts[0]._cmp().map((e) => { const raw = PC[`${e.s}|${t0}`], byT = new Map(raw.k.map((x) => [ts(x.t, intra), x])), data = e.pser.data(); let exact = 0, bad = 0, gaps = 0;
    data.forEach((d) => { if (d.close == null) { gaps++; return; } const x = byT.get(d.time); if (x && x.o === d.open && x.h === d.high && x.l === d.low && x.c === d.close) exact++; else bad++; });
    const starts = raw.k.map((x) => new Date(x.t)), mon = starts.every((d) => d.getUTCDay() === 1 && d.getUTCHours() === 0), first = starts.every((d) => d.getUTCDate() === 1 && d.getUTCHours() === 0);
    const mstarts = main.k.map((x) => new Date(x.t)), mmon = mstarts.every((d) => d.getUTCDay() === 1), mfirst = mstarts.every((d) => d.getUTCDate() === 1);
    return { s: e.s, src: raw.src.ex, msrc: main.src.ex, n: data.length, exact, bad, gaps, mon, first, mmon, mfirst, lastT: raw.k[raw.k.length - 1].t, mainLastT: main.k[main.k.length - 1].t, mainN: main.k.length }; }); }, [sel, tf]);
// Hyperliquid weekly / monthly bars = aggregation of Hyperliquid daily candles fetched again here
const hlCheck = (p, sym, tf) => p.evaluate(async ([s, t0]) => { const raw = PC[`${s}|${t0}`]; if (raw.src.ex !== 'hyperliquid') return { src: raw.src.ex };
  const r = await (await fetch('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'candleSnapshot', req: { coin: raw.src.pair, interval: '1d', startTime: 0, endTime: Date.now() } }) })).json();
  const key = (t) => { const d = new Date(t); return t0 === '1M' ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) : t - ((d.getUTCDay() + 6) % 7) * 864e5; }, agg = new Map();
  r.forEach((x) => { const kk = key(x.t), a = agg.get(kk); const o = +x.o, h = +x.h, l = +x.l, c = +x.c; if (!a) agg.set(kk, { o, h, l, c }); else { a.h = Math.max(a.h, h); a.l = Math.min(a.l, l); a.c = c; } });
  let n2 = 0, bad = 0; raw.k.slice(0, -1).forEach((x) => { const a = agg.get(x.t); if (!a) return; n2++; if (a.o !== x.o || a.h !== x.h || a.l !== x.l || a.c !== x.c) bad++; }); return { src: raw.src.ex, n2, bad, bars: raw.k.length }; }, [sym, tf]);

// 1) HYPE (Hyperliquid) weekly vs BTC / ETH (Binance)
{ const { c, p, errs } = await open('HYPE', '1w', ['BTC', 'ETH']); const A = await audit(p, 'HYPE', '1w');
  ok(A[0].msrc === 'hyperliquid' && A[0].mmon, `HYPE weekly from Hyperliquid, every week starts on Monday (${A[0].mainN} weeks)`);
  A.forEach((x) => ok(x.n > 90 && x.exact === x.n - x.gaps && x.bad === 0 && x.mon, `${x.s} pane on HYPE 1W: ${x.exact} candles, each the same Monday week as HYPE's (${x.bad} from another week)`));
  ok(A.every((x) => x.lastT === x.mainLastT), 'the latest candle of each coin is the current week');
  const h = await hlCheck(p, 'HYPE', '1w'); ok(h.n2 > 90 && h.bad === 0, `HYPE weekly bars = Hyperliquid daily candles added up per Monday week (${h.n2} weeks, ${h.bad} differ)`);
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | ')); await c.close(); }

// 2) SOL (Binance) weekly and monthly vs HYPE (Hyperliquid)
for (const tf of ['1w', '1M']) { const { c, p, errs } = await open('SOL', tf, ['HYPE']); const [x] = await audit(p, 'SOL', tf);
  ok(x.src === 'hyperliquid' && (tf === '1w' ? x.mon : x.first), `HYPE ${tf} bars from Hyperliquid start on ${tf === '1w' ? 'Monday' : 'the 1st of the month'}`);
  ok(x.exact > (tf === '1w' ? 90 : 20) && x.bad === 0 && x.lastT === x.mainLastT, `HYPE pane on SOL ${tf}: ${x.exact} candles, all the same period as SOL's, latest = current (${x.gaps} empty before HYPE listed)`);
  if (tf === '1M') { const h = await hlCheck(p, 'HYPE', '1M'); ok(h.n2 > 20 && h.bad === 0, `HYPE monthly bars = Hyperliquid daily candles per calendar month (${h.n2} months, ${h.bad} differ)`); }
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | ')); await c.close(); }

// 3) HYPE monthly has its full history
{ const { c, p, errs } = await open('HYPE', '1M', ['BTC']); const [x] = await audit(p, 'HYPE', '1M');
  ok(x.msrc === 'hyperliquid' && x.mainN >= 20 && x.mfirst, `HYPE 1M: ${x.mainN} months from Hyperliquid, each starting on the 1st`);
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | ')); await c.close(); }

// 4) pointer in a compare pane snaps to that candle
{ const { c, p, errs } = await open('SOL', '1d', ['BTC']);
  const el = await p.$('#pcw'); await el.scrollIntoViewIfNeeded(); const r = await el.boundingBox();
  const top = await p.evaluate(() => { const wr = document.querySelector('#pcw').getBoundingClientRect(), q = S.charts[0].panes()[1]; return [q.getHTMLElement().getBoundingClientRect().top - wr.top, q.getHeight()]; });
  let seen = new Set();
  for (const f of [0.12, 0.3, 0.5, 0.7, 0.88]) { await p.mouse.move(r.x + r.width * 0.55, r.y + top[0] + top[1] * f, { steps: 3 }); await p.waitForTimeout(350);
    const g = await p.evaluate(() => { const e = S.charts[0]._cmp()[0], wr = document.querySelector('#pcw').getBoundingClientRect(), pr = S.charts[0].panes()[e.pi].getHTMLElement().getBoundingClientRect();
      const hl = [...document.querySelectorAll('.pc-hl')].find((x) => !x.hidden && parseFloat(x.style.top) > pr.top - wr.top), lbl = document.querySelector('[data-pl="c:BTC"]').innerText.replace(/\s+/g, ' ');
      const m = lbl.match(/O ([\d,.]+) H ([\d,.]+) L ([\d,.]+) C ([\d,.]+)/), o = m && m.slice(1).map((v) => Number(v.replace(/,/g, ''))), y = hl ? parseFloat(hl.style.top) - (pr.top - wr.top) : null, v = y == null ? null : e.pser.coordinateToPrice(y);
      const dot = [...document.querySelectorAll('.pc-cdot')].filter((x) => !x.hidden).map((x) => parseFloat(x.style.top)).find((t) => t > pr.top - wr.top);
      return { o, v, y, tag: hl && !hl.firstChild.hidden ? hl.firstChild.textContent : null, dotY: dot == null ? null : dot - (pr.top - wr.top) }; });
    const near = g.o && g.v != null ? g.o.reduce((a, x) => (Math.abs(x - g.v) < Math.abs(a - g.v) ? x : a)) : null, which = near == null ? '?' : 'OHLC'[g.o.indexOf(near)];
    ok(g.o && near != null && Math.abs(near - g.v) / near < 0.002 && Math.abs(g.dotY - g.y) < 1.5 && (which === 'C' ? g.tag === null : Number(g.tag.replace(/,/g, '')) === near), `pointer at ${Math.round(f * 100)}% of the BTC pane snaps to ${which} ${near} (tag ${g.tag || 'on the close tag'}, dot on it)`);
    seen.add(which); }
  ok(seen.size >= 2, `the snap follows the pointer between prices of the candle (${[...seen].join(', ')})`);
  ok(await p.evaluate(() => S.charts[0].panes()[0].getSeries().every((x) => !x.options().title)), 'no frozen title labels on the main axis');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | ')); await c.close(); }
await b.close(); console.log(`PASS compare-align-ui: ${n} checks`);
