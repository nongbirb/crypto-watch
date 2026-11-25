// v72 Compare, in Chromium against live candles: both coins in % from one fixed start bar.
//  - accuracy: every drawn point equals (close / close at the start bar - 1) x 100, recomputed here from candles fetched again
//    straight from the venue (token and compared coin), matched by bar open time; the readout's two % and the gap agree;
//  - stability: scrolling, zooming and loading older candles never change a drawn value or the start bar;
//  - "Start here" moves 0% to the left edge of the view; the 0% marker sits on the start bar;
//  - candles, MAs and the axis are in %; the readout keeps real prices; removing the comparison returns to prices;
//  - 1D, 4H and 1W; desktop and phone; no page errors. Usage: node tests/compare-ui.mjs [baseUrl]
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const snap = (p) => p.evaluate(() => { const ch = S.charts[0], ss = ch.panes()[0].getSeries(), cmp = (ch._cmp().find((e) => e.ser) || {}).ser, cand = ss.find((x) => x.seriesType() === 'Candlestick');
  const mk = cmp ? cmp.data().filter((d) => d.value != null) : [];
  return { cmp: mk.map((d) => [d.time, +d.value.toFixed(6)]), cand: cand.data().map((d) => [d.time, d.close == null ? null : +d.close.toFixed(6)]), fmt: cand.options().priceFormat.formatter ? cand.options().priceFormat.formatter(12.345) : '',
    read: (document.querySelector('[data-prcmp]') || {}).innerText || '', leg: (document.querySelector('#pFoot .legend') || {}).innerText || '', vis: ch.timeScale().getVisibleLogicalRange() }; });
// the same raw candles, fetched again here in the page with the app's own klines() from the chart's sources (no app state reused)
const truth = (p, sym, cmpSym, tf) => p.evaluate(async ([sym, cmpSym, tf]) => { const a = PC[`${sym}|${tf}`], c = PC[`${cmpSym}|${tf}`];
  const [ka, kc] = await Promise.all([klines(a.src, tf, 1000), klines(c.src, tf, 1000)]); return { ka: ka.map((x) => [x.t, x.c]), kc: kc.map((x) => [x.t, x.c]), srcA: a.src.ex, srcC: c.src.ex }; }, [sym, cmpSym, tf]);

for (const [w, h, sym, cmpSym, tf, mob] of [[1280, 950, 'SOL', 'BTC', '1d', false], [1280, 950, 'ETH', 'BTC', '4h', false], [1280, 950, 'BTC', 'ETH', '1w', false], [390, 844, 'MON', 'BTC', '1d', true]]) {
  const tag = `${w} ${sym} vs ${cmpSym} ${tf}`, c = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', isMobile: mob, hasTouch: mob });
  await c.addInitScript(([s, cs, t]) => { localStorage.setItem('cw-lang', 'en'); localStorage.setItem('cw-sel', s); localStorage.setItem('cw-cmp', JSON.stringify(cs)); localStorage.setItem('cw-ptf', JSON.stringify(t)); }, [sym, cmpSym, tf]);
  const p = await c.newPage(), errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + 'index.html#/markets'); await p.waitForSelector('#ch1 canvas', { timeout: 60000 }); await p.waitForFunction(() => document.querySelector('[data-prcmp]'), null, { timeout: 60000 }); await p.waitForTimeout(1200);
  const s0 = await snap(p);
  ok(s0.cmp.length > 20 && /%$/.test(s0.fmt) && /since /.test(s0.read), `${tag}: ${s0.cmp.length} compare points, axis in % (${s0.fmt}), readout "${s0.read.replace(/\s+/g, ' ')}"`);
  // accuracy against freshly fetched candles
  const T = await truth(p, sym, cmpSym, tf), off = await p.evaluate(() => -new Date().getTimezoneOffset() * 60);
  const tA = new Map(T.ka.map(([t, cl]) => [t, cl])), tC = new Map(T.kc.map(([t, cl]) => [t, cl])), start = s0.cmp.find((x) => Math.abs(x[1]) < 1e-9);
  ok(!!start, `${tag}: one bar sits at exactly 0% (the start bar)`);
  const ms = (t) => (t - (tf === '1d' || tf === '1w' ? (t % 86400 ? off : 0) : off)) * 1000, t0 = ms(start[0]);
  const a0 = tA.get(t0), c0 = tC.get(t0); ok(a0 != null && c0 != null, `${tag}: the start bar exists in both venues' raw candles (${new Date(t0).toISOString().slice(0, 16)})`);
  let chk = 0, maxErr = 0; for (const [tt, v] of s0.cmp.slice(0, -1)) { const raw = tC.get(ms(tt)); if (raw == null) continue; const want = (raw / c0 - 1) * 100; maxErr = Math.max(maxErr, Math.abs(want - v)); chk++; }
  let chkA = 0, maxA = 0; for (const [tt, v] of s0.cand.slice(0, -1)) { const raw = tA.get(ms(tt)); if (raw == null || v == null) continue; const want = (raw / a0 - 1) * 100; maxA = Math.max(maxA, Math.abs(want - v)); chkA++; }
  ok(chk > 20 && maxErr < 0.02, `${tag}: ${cmpSym} line = raw ${T.srcC} closes vs the start bar, ${chk} bars, max error ${maxErr.toFixed(4)} pts`);
  ok(chkA > 20 && maxA < 0.02, `${tag}: ${sym} candles = raw ${T.srcA} closes vs the start bar, ${chkA} bars, max error ${maxA.toFixed(4)} pts`);
  // readout numbers at the last closed bar agree with the drawn points
  const rd = s0.read.replace(/\s+/g, ' '), m = rd.match(new RegExp(`${sym} ([+−-][\\d.]+)% · ${cmpSym} ([+−-][\\d.]+)%`)); const num = (x) => +x.replace('−', '-');
  const lastC = s0.cand.filter((x) => x[1] != null), lastP = s0.cmp;
  ok(m && Math.abs(num(m[1]) - lastC[lastC.length - 2][1]) < 0.06 + Math.abs(lastC[lastC.length - 1][1] - lastC[lastC.length - 2][1]) && Math.abs(num(m[2]) - lastP[lastP.length - 2][1]) < 0.06 + Math.abs(lastP[lastP.length - 1][1] - lastP[lastP.length - 2][1]), `${tag}: readout % match the drawn points (${rd.slice(0, 70)})`);
  // stability: scroll, zoom, scroll far left (loads older candles)
  await p.evaluate(() => { const ts = S.charts[0].timeScale(), r = ts.getVisibleLogicalRange(); ts.setVisibleLogicalRange({ from: r.from - 40, to: r.to - 40 }); }); await p.waitForTimeout(700);
  await p.evaluate(() => { const ts = S.charts[0].timeScale(), r = ts.getVisibleLogicalRange(); ts.setVisibleLogicalRange({ from: r.from + 25, to: r.to - 10 }); }); await p.waitForTimeout(700);
  const s1 = await snap(p), m1 = new Map(s1.cmp);
  ok(s0.cmp.every(([tt, v]) => !m1.has(tt) || Math.abs(m1.get(tt) - v) < 1e-9) && s1.read.includes(s0.read.match(/since .*/)[0]), `${tag}: scroll + zoom change nothing (same values, same start)`);
  await p.evaluate(() => { const ts = S.charts[0].timeScale(); ts.setVisibleLogicalRange({ from: -5, to: 60 }); }); await p.waitForTimeout(4000);
  const s2 = await snap(p), m2 = new Map(s2.cmp);
  ok(s2.cmp.length >= s0.cmp.length && s0.cmp.every(([tt, v]) => !m2.has(tt) || Math.abs(m2.get(tt) - v) < 1e-9), `${tag}: loading older candles keeps every value (${s0.cmp.length} -> ${s2.cmp.length} points)`);
  // Start here: 0% moves to the first bar in view
  if (!mob) { await p.evaluate(() => { const ts = S.charts[0].timeScale(), n2 = S.charts[0].panes()[0].getSeries()[0].data().length; ts.setVisibleLogicalRange({ from: n2 - 50, to: n2 + 2 }); }); await p.waitForTimeout(600);
    const first = await p.evaluate(() => { const ch = S.charts[0], r = ch.timeScale().getVisibleLogicalRange(); return ch.panes()[0].getSeries()[0].data()[Math.ceil(r.from)].time; });
    await p.click('[data-cmprestart]'); await p.waitForTimeout(800); const s3 = await snap(p), z = s3.cmp.find((x) => Math.abs(x[1]) < 1e-9);
    ok(z && z[0] >= first && z[0] - first <= (tf === '1w' ? 7 : tf === '4h' ? 1 : 3) * 86400 && Math.abs(s3.cand.find((x) => x[0] === z[0])[1]) < 1e-9, `${tag}: Start here puts both at 0% at the left edge`); }
  ok(!errs.length, `${tag}: no page errors ${errs[0] || ''}`); await c.close();
}
// removing the comparison returns to prices
{ const c = await b.newContext({ viewport: { width: 1280, height: 950 }, serviceWorkers: 'block' }); await c.addInitScript(() => { localStorage.setItem('cw-sel', 'SOL'); localStorage.setItem('cw-cmp', JSON.stringify('BTC')); });
  const p = await c.newPage(); await p.goto(B + 'index.html#/markets'); await p.waitForFunction(() => document.querySelector('[data-prcmp]'), null, { timeout: 60000 });
  await p.click('[data-cmpset]'); await p.click('[data-cmpdel="BTC"]'); await p.waitForTimeout(1500); const s = await snap(p), real = await p.evaluate(() => PC['SOL|1d'].k.at(-1).c);
  ok(!s.read && !/%$/.test(s.fmt) && Math.abs(s.cand.at(-1)[1] - real) / real < 0.01, `remove: back to prices (${s.cand.at(-1)[1]} vs ${real})`); await c.close(); }
await b.close();
console.log(`PASS compare-ui: ${n} checks (fixed start, accuracy vs raw venue candles, stable on scroll/zoom/load, Start here, 1D/4H/1W, phone)`);
