// v74 RS (Mansfield relative strength) and the compare pointer marks, in Chromium against live candles:
//  - RS pane: Mansfield RS = (close / benchmark close) / its N-bar average - 1, x 100, recomputed here from the raw cached candles
//    (benchmark matched by open time); N = the chosen period in bars; label, chip and value tag follow the pointer;
//  - RS new-high dots: RS ratio above its prior 3-month high while the price is under its own 3-month high, checked bar by bar;
//  - RS Rank 1-99 against the coins in the list, relative returns 1W..1Y vs the benchmark recomputed from daily candles;
//  - settings: benchmark chips / other coin / period; viewing the benchmark itself switches to ETH (BTC) automatically; Reset;
//  - compare overlays get a dot on the line and a tag "SYM +x% · $price" that follows the pointer; compare panes get a candle dot;
//    the main tag in % mode shows the price next to the %; tags never sit on the pointer tag.
// Usage: node tests/rs-ui.mjs [baseUrl]
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const RSONLY = { ma: false, vol: false, bb: false, fib: false, rsi: false, macd: false, stoch: false, rs: true };
const open = async ({ w = 1280, h = 1200, sel = 'SOL', list = [], ind = RSONLY, rs = null, mob = false } = {}) => {
  const c = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', isMobile: mob, hasTouch: mob });
  await c.addInitScript(([s0, l, i, r]) => { if (sessionStorage.getItem('init')) return; sessionStorage.setItem('init', '1'); localStorage.clear(); localStorage.setItem('cw-lang', 'en'); localStorage.setItem('cw-sel', s0);
    localStorage.setItem('cw-cmpl', JSON.stringify(l)); localStorage.setItem('cw-ind', JSON.stringify(i)); if (r) localStorage.setItem('cw-rs', JSON.stringify(r)); }, [sel, list, ind, rs]);
  const p = await c.newPage(), errs = []; p.on('pageerror', (e) => errs.push(String(e))); await p.goto(B + 'index.html#/markets'); await p.waitForSelector('#ch1 canvas', { timeout: 60000 });
  if (ind.rs) await p.waitForFunction(() => S.charts[0] && S.charts[0]._rsDbg && S.charts[0]._rsDbg().m && S.charts[0]._rsDbg().m.some((v) => v != null), null, { timeout: 60000 });
  await p.waitForTimeout(1200); return { c, p, errs }; };
const dbg = (p) => p.evaluate(() => S.charts[0]._rsDbg());

// 1) maths against the raw candles, dots, rank, relative returns (desktop, SOL vs BTC, 6M)
{ const { c, p, errs } = await open();
  const P = await p.evaluate(() => S.charts[0].panes().map((q) => q.getSeries().map((x) => x.seriesType()).join('+')));
  ok(P.length === 2 && P[1] === 'Baseline', `panes: price, RS (${P.join(' | ')})`);
  const m = await p.evaluate(() => { const d = S.charts[0]._rsDbg(), A = PC['SOL|1d'].k, Bm = new Map(PC['BTC|1d'].k.map((x) => [x.t, x.c])), N = d.n;
    const r = A.map((x) => (Bm.has(x.t) ? x.c / Bm.get(x.t) : null)); let n2 = 0, bad = 0, maxe = 0;
    for (let i = N - 1; i < A.length; i++) { const w = r.slice(i - N + 1, i + 1); if (w.some((v) => v == null)) continue; const exp = (r[i] / (w.reduce((a, v) => a + v, 0) / N) - 1) * 100, j = d.t.indexOf(A[i].t), got = j >= 0 ? d.m[j] : undefined;
      if (got == null) { bad++; continue; } n2++; maxe = Math.max(maxe, Math.abs(got - exp)); }
    const ser = S.charts[0].panes()[1].getSeries()[0].data().filter((x) => x.value != null), sm = new Map(ser.map((x) => [x.time, x.value])); let sb = 0;
    d.t.forEach((t, i) => { if (d.m[i] != null && Math.abs(sm.get(Math.floor(t / 1000)) - d.m[i]) > 1e-9) sb++; });
    return { N, n2, bad, maxe, sb, ns: ser.length }; });
  ok(m.N === 182, `6M on a daily chart = 182 bars (${m.N})`);
  ok(m.n2 > 100 && m.bad === 0 && m.maxe < 1e-9, `Mansfield RS = recomputed from raw SOL / BTC candles on ${m.n2} bars (max error ${m.maxe.toExponential(1)}, ${m.bad} missing)`);
  ok(m.sb === 0 && m.ns === m.n2, `the RS line plots exactly those values (${m.ns} points)`);
  const h = await p.evaluate(() => { const d = S.charts[0]._rsDbg(), A = PC['SOL|1d'].k.filter((x) => d.t.includes(x.t)), Bm = new Map(PC['BTC|1d'].k.map((x) => [x.t, x.c])), W = d.w, r = A.map((x) => x.c / Bm.get(x.t)), exp = [];
    for (let i = W; i < A.length; i++) { const rh = Math.max(...r.slice(i - W, i)), ph = Math.max(...A.slice(i - W, i).map((x) => x.h)); if (r[i] > rh && A[i].c < ph && d.m[i] != null && !(exp.length && exp[exp.length - 1] === i - 1)) exp.push(i); }
    return { W, got: d.h, exp }; });
  ok(h.W === 91 && JSON.stringify(h.got) === JSON.stringify(h.exp), `RS new-high dots: ${h.got.length} bars, same as recomputed (3-month window ${h.W} bars)`);
  const rk = await p.evaluate(() => { const d = S.charts[0]._rsDbg(), cut = Date.now(), sc = (k) => { const c = k.filter((x) => x.t + 864e5 <= cut).map((x) => x.c), n = c.length - 1, q = (a, b2) => (n - b2 >= 0 ? c[n - a] / c[n - b2] - 1 : null);
      const ps = [[q(0, 63), 0.4], [q(63, 126), 0.2], [q(126, 189), 0.2], [q(189, 252), 0.2]].filter((x) => x[0] != null), ws = ps.reduce((a, x) => a + x[1], 0); return ws ? ps.reduce((a, x) => a + x[0] * x[1], 0) / ws : null; };
    const all = S.cfg.filter((t) => t.d1).map((t) => [t.symbol, sc(t.d1)]).filter((x) => x[1] != null), me = all.find((x) => x[0] === 'SOL'), below = all.filter((x) => x[1] < me[1]).length;
    return { got: d.rank, exp: Math.round(1 + (98 * below) / (all.length - 1)), n: all.length, chip: (document.querySelector('[data-pl="rs"] .rk') || {}).textContent }; });
  ok(rk.got && rk.got.r === rk.exp && rk.got.n === rk.n && rk.got.r >= 1 && rk.got.r <= 99 && rk.chip === `RS Rank ${rk.exp}`, `RS Rank ${rk.got && rk.got.r} = recomputed among ${rk.n} coins in the list (#${rk.got && rk.got.pos})`);
  await p.waitForFunction(() => S.charts[0]._rsDbg().perf, null, { timeout: 30000 });
  const pf = await p.evaluate(() => { const d = S.charts[0]._rsDbg(), cut = Date.now(), cl = (a) => a.filter((x) => x.t + 864e5 <= cut), A = cl(PC['SOL|1d'].k), Bk = new Map(cl(PC['BTC|1d'].k).map((x) => [x.t, x.c])), last = A[A.length - 1];
    const exp = [7, 30, 91, 182, 365].map((dd) => { const a0 = A.find((x) => x.t >= last.t - dd * 864e5); return a0 && Bk.has(a0.t) ? ((last.c / a0.c) / (Bk.get(last.t) / Bk.get(a0.t)) - 1) * 100 : null; });
    return { got: d.perf, exp, txt: (document.querySelector('[data-indn="rs"]') || {}).innerText }; });
  ok(pf.got.length === 5 && pf.got.every(([, v], i) => (v == null ? pf.exp[i] == null : Math.abs(v - pf.exp[i]) < 1e-9)) && /vs BTC/.test(pf.txt) && /1W[\s\S]*1Y/.test(pf.txt), `relative returns vs BTC 1W..1Y = recomputed (${pf.got.map(([l, v]) => `${l} ${v == null ? '–' : v.toFixed(1)}`).join(', ')})`);
  const lb0 = await p.evaluate(() => document.querySelector('[data-pl="rs"]').innerText.replace(/\s+/g, ' '));
  const lastv = await p.evaluate(() => { const d = S.charts[0]._rsDbg(), n2 = d.t.length, i = d.t[n2 - 1] + 864e5 > Date.now() ? n2 - 2 : n2 - 1; return d.m[i]; });
  ok(lb0.startsWith('RS · BTC · 6M') && lb0.includes((lastv >= 0 ? '+' : '') + lastv.toFixed(1)) && /(Stronger|Weaker) than BTC/.test(lb0), `label: ${lb0}`);
  // pointer over the RS pane: label, tag and colour follow the bar
  const el = await p.$('#pcw'); await el.scrollIntoViewIfNeeded(); const r = await el.boundingBox(), top = await p.evaluate(() => S.charts[0].panes()[1].getHTMLElement().getBoundingClientRect().top - document.querySelector('#pcw').getBoundingClientRect().top);
  await p.mouse.move(r.x + r.width * 0.45, r.y + top + 40, { steps: 4 }); await p.waitForTimeout(400);
  const g = await p.evaluate(() => { const d = S.charts[0]._rsDbg(), lbl = document.querySelector('[data-pl="rs"] .pl-v b').textContent, tg = [...document.querySelectorAll('.pc-vts span:not(.lv)')].map((x) => [x.textContent, getComputedStyle(x).backgroundColor]); return { lbl, tg }; });
  ok(g.tg.length === 1 && g.tg[0][0] === g.lbl.replace('+', '') && g.lbl !== (lastv >= 0 ? '+' : '') + lastv.toFixed(1), `pointing at an older bar: label ${g.lbl}, tag ${g.tg[0] && g.tg[0][0]} (${g.tg[0] && g.tg[0][1]})`);
  await p.mouse.move(1, 1);
  // settings: ETH, 3M
  await p.click('[data-rsset]'); ok(await p.isVisible('#rsSet'), 'the RS settings open');
  await p.click('#rsSet label.rs-b:has(input[value="ETH"])'); await p.click('#rsSet .maset-type label:has(input[value="3M"])'); await p.click('#rsSet button[type="submit"]');
  await p.waitForFunction(() => S.charts[0]._rsDbg && S.charts[0]._rsDbg().b === 'ETH' && S.charts[0]._rsDbg().m && S.charts[0]._rsDbg().m.some((v) => v != null), null, { timeout: 60000 });
  const s2 = await p.evaluate(() => ({ d: S.charts[0]._rsDbg().n, st: JSON.parse(localStorage.getItem('cw-rs')), lbl: document.querySelector('[data-pl="rs"]').innerText }));
  ok(s2.d === 91 && s2.st.b === 'ETH' && s2.st.per === '3M' && /RS · ETH · 3M/.test(s2.lbl), `benchmark ETH, 3M = 91 bars, saved (${JSON.stringify(s2.st)})`);
  await p.click('[data-rsset]'); await p.fill('#rsSet .rs-bin', '!!'); await p.click('#rsSet button[type="submit"]');
  ok(/Pick a benchmark/.test(await p.textContent('[data-rserr]')), 'a bad benchmark is refused with a message');
  await p.click('[data-rsreset]'); await p.waitForFunction(() => S.charts[0]._rsDbg && S.charts[0]._rsDbg().b === 'BTC', null, { timeout: 60000 });
  ok(await p.evaluate(() => localStorage.getItem('cw-rs') === 'null' || localStorage.getItem('cw-rs') == null), 'Reset goes back to BTC · 6M');
  await p.click('[data-preset]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => !JSON.parse(localStorage.getItem('cw-ind')).rs && S.charts[0].panes().length === 1), 'the chart Reset turns RS off');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await c.close(); }

// 2) viewing BTC itself with the benchmark BTC: measured against ETH
{ const { c, p, errs } = await open({ sel: 'BTC' });
  const d = await dbg(p), lb = await p.evaluate(() => document.querySelector('[data-pl="rs"]').innerText);
  ok(d.b === 'ETH' && /RS · ETH/.test(lb), `BTC is measured against ETH (${lb.split('\n')[0]})`);
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | ')); await c.close(); }

// 3) compare marks: overlay dot + following tag with the price, pane candle dot, main tag "% · $price"
{ const { c, p, errs } = await open({ list: [{ s: 'BTC', o: true, p: true, c: 0 }], ind: { ...RSONLY, rs: false } });
  await p.waitForFunction(() => S.charts[0].panes()[1].getSeries()[0].data().some((d) => d.close != null), null, { timeout: 60000 }); await p.waitForTimeout(800);
  const ov = await p.evaluate(() => { const s = S.charts[0].panes()[0].getSeries().find((x) => x.seriesType() === 'Line' && x.options().color === '#ec4899'); return s && { dot: s.options().crosshairMarkerVisible, last: s.options().lastValueVisible }; });
  ok(ov && ov.dot && !ov.last, 'the overlay line has a crosshair dot, no frozen last-value tag');
  const el = await p.$('#pcw'); await el.scrollIntoViewIfNeeded(); const r = await el.boundingBox();
  await p.mouse.move(r.x + r.width * 0.4, r.y + 200, { steps: 4 }); await p.waitForTimeout(400);
  const g = await p.evaluate(() => { const vt = [...document.querySelectorAll('.pc-vts span:not(.lv)')].map((x) => ({ t: x.textContent, top: parseFloat(x.style.top) })), hl = [...document.querySelectorAll('.pc-hl')].filter((x) => !x.hidden).map((x) => ({ t: x.innerText, top: parseFloat(x.style.top) }));
    const btc = S.charts[0].panes()[1].getSeries()[0].data(), ln = S.charts[0].panes()[0].getSeries().find((x) => x.options().color === '#ec4899').data(), rd = document.querySelector('#pRead').innerText;
    const dots = [...document.querySelectorAll('.pc-cdot')].filter((x) => !x.hidden).map((x) => parseFloat(x.style.top));
    return { vt, hl, rd, dots, n: btc.length, ln: ln.length }; });
  const ovt = g.vt.find((x) => /^BTC [+−]?\d/.test(x.t));
  ok(ovt && /^BTC [+−]?[\d.]+% · \$[\d,.]+$/.test(ovt.t), `overlay tag shows % and price: "${ovt && ovt.t}"`);
  const chk = await p.evaluate((txt) => { const m = txt.match(/\$([\d,.]+)/), pv = Number(m[1].replace(/,/g, '')), lbl = document.querySelector('[data-pl="c:BTC"] .pl-v').innerText; return { pv, lbl }; }, ovt.t);
  ok(chk.lbl.includes('$' + chk.pv.toLocaleString('en-US')), `the tag's price is the BTC close of the hovered bar (${chk.lbl.replace(/\s+/g, ' ')})`);
  ok(g.hl.length === 1 && /^[+−]?[\d.]+% · \$[\d,.]+$/.test(g.hl[0].t), `main pointer tag in % mode: "${g.hl[0] && g.hl[0].t}"`);
  ok(g.vt.every((x) => Math.abs(x.top - g.hl[0].top) >= 16 || x.top > g.hl[0].top + 100), 'value tags step around the pointer tag');
  ok(g.dots.length === 2, `a dot on the main candle and on the BTC pane candle (${g.dots.length})`);
  const pd = await p.evaluate(() => { const pe = S.charts[0].panes()[1], s = pe.getSeries()[0], wr = document.querySelector('#pcw').getBoundingClientRect(), pr = pe.getHTMLElement().getBoundingClientRect(), lbl = document.querySelector('[data-pl="c:BTC"] .pl-v b').textContent;
    const v = Number(lbl.replace(/[$,]/g, '')), y = pr.top - wr.top + s.priceToCoordinate(v), dot = [...document.querySelectorAll('.pc-cdot')].filter((x) => !x.hidden).map((x) => parseFloat(x.style.top)).find((t) => t > pr.top - wr.top); return { y, dot }; });
  ok(pd.dot != null && Math.abs(pd.dot - pd.y) < 1.5, `the BTC pane dot sits on that candle's close (${pd.dot && pd.dot.toFixed(1)} vs ${pd.y.toFixed(1)})`);
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | ')); await c.close(); }

// 4) phone: RS settings usable, nothing wider than the screen
{ const { c, p, errs } = await open({ w: 390, h: 844, mob: true });
  await p.click('[data-rsset]'); await p.waitForTimeout(300);
  const ph = await p.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, bin: document.querySelector('#rsSet .rs-bin').getBoundingClientRect().height, fs: parseFloat(getComputedStyle(document.querySelector('#rsSet .rs-bin')).fontSize), lbl: document.querySelector('[data-pl="rs"]').innerText }));
  ok(ph.over <= 0 && ph.bin >= 40 && ph.fs >= 16, `phone: no sideways scroll (${ph.over}), input ${ph.bin}px / ${ph.fs}px text`);
  ok(/RS · BTC · 6M/.test(ph.lbl), 'phone: RS pane labelled');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | ')); await c.close(); }
await b.close(); console.log(`rs-ui: ${n} checks passed`);
