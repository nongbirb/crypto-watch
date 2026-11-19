// v62/v63 Price & indicators tab, in node + Chromium:
//  - Stochastic 9/3/3 maths (verdict-core.js stoch) against a hand calculation, flat window = 50, nulls before a full window;
//  - one chart (lightweight-charts v5) with panes: price + one short pane per oscillator; labels pinned to each pane;
//  - switches: a new visitor sees Volume, RSI and Stochastic on, Bollinger, MACD and Fibonacci off; choices remembered;
//  - timeframes 15m / 1H / 4H / 1D / 1W load their own candles (different bar spacing), 1D has ~1000 candles, 1W the full history;
//  - v67: no range buttons; a default view per timeframe (3 months of 1D, 1 week of 15m) and one "See all" / "Latest" toggle;
//  - crosshair: hovering (desktop, price or oscillator pane) and press-and-drag (phone) move the value bar (with MA20/50/200) and every pane
//    label to that candle; every line series has a crosshair dot;
//  - Fibonacci: fixed on the latest big swing (zooming does not move it), golden zone shaded, note names the swing in the right order;
//  - HYPE: the setup reads Hyperliquid's long daily history (Binance lists HYPE since Sep 2026 only), so it is not "Insufficient";
//  - "?" help buttons stay round, menu says News / ข่าว, More menu grouped, image logos have no disc, no sideways scroll.
// EN + TH, 360 / 390 / 1280, light + dark. Usage: node tests/chart-ui.mjs [baseUrl]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const VC = createRequire(import.meta.url)('../verdict-core.js');
const B = process.argv[2] || process.env.U || 'http://localhost:8787/', EXP = Number(process.env.EXPECT_ASSETV || 72);
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };

// ---- Stochastic maths ----
{ const k = [[10, 8, 9], [11, 9, 10], [12, 9, 11], [12, 10, 12], [13, 11, 12], [14, 12, 13], [13, 11, 12], [15, 12, 14], [16, 13, 15], [15, 12, 13], [14, 11, 12], [13, 10, 11], [12, 10, 11]].map(([h, l, c]) => ({ h, l, c }));
  const S = VC.stoch(k, 9, 3, 3);
  const raw = (i) => { const w = k.slice(i - 8, i + 1), hh = Math.max(...w.map((x) => x.h)), ll = Math.min(...w.map((x) => x.l)); return 100 * (k[i].c - ll) / (hh - ll); };
  const K = (i) => (raw(i) + raw(i - 1) + raw(i - 2)) / 3, Dv = (i) => (K(i) + K(i - 1) + K(i - 2)) / 3;
  ok(S.k.slice(0, 10).every((x) => x == null) && S.k[10] != null, 'stoch: %K needs 9 + 3 - 1 bars');
  ok(Math.abs(S.k[12] - K(12)) < 1e-9 && Math.abs(S.d[12] - Dv(12)) < 1e-9, `stoch: %K ${S.k[12].toFixed(3)} and %D ${S.d[12].toFixed(3)} match the hand calculation`);
  ok(VC.stoch(Array.from({ length: 12 }, () => ({ h: 5, l: 5, c: 5 })), 9, 3, 3).k[11] === 50, 'stoch: a flat window gives 50');
  ok(VC.stoch(k).k[12] === S.k[12], 'stoch: default is 9 / 3 / 3'); }

const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const state = (p) => p.evaluate(() => ({ assetv: ASSETV, tabs: [...document.querySelectorAll('.tabs [data-tab]')].map((x) => x.dataset.tab),
  ind: Object.fromEntries([...document.querySelectorAll('[data-ind]')].map((x) => [x.dataset.ind, x.getAttribute('aria-pressed')])),
  panes: S.charts[0] ? S.charts[0].panes().length : 0, lbls: [...document.querySelectorAll('.pc-lbl')].map((x) => x.dataset.pl),
  lblTxt: [...document.querySelectorAll('.pc-lbl')].map((x) => x.innerText), read: (document.querySelector('#pRead') || {}).innerText || '',
  src: (() => { const d = (document.querySelector('#pcw') || {}).dataset || {}; return d.pcSrc ? `${d.pcTf} ${d.pcSrc} from ${d.pcFrom}` : ''; })(), ow: document.documentElement.scrollWidth - innerWidth,
  spans: document.querySelectorAll('[data-pspan]').length, psrc: !!document.querySelector('.psrc, #main .foot, #tabBody .nfa'), all: ((document.querySelector('[data-pall]') || {}).textContent || '') + ((document.querySelector('[data-pall]') || {}).getAttribute?.('aria-pressed') === 'true' ? '*' : ''),
  vis: S.charts[0] ? (() => { const r = S.charts[0].timeScale().getVisibleLogicalRange(); return r ? Math.round(r.to - r.from) : 0; })() : 0,
  dots: S.charts[0] ? S.charts[0].panes().map((q, i) => q.getSeries().filter((x) => x.seriesType() === 'Line').map((x) => `${i}:${x.options().crosshairMarkerVisible}`)).flat() : [],
  tfs: [...document.querySelectorAll('[data-ptf]')].map((x) => x.textContent).join(), help: [...document.querySelectorAll('.ui-help>summary')].filter((s) => s.offsetParent).slice(0, 4).map((s) => { const r = s.getBoundingClientRect(), bf = getComputedStyle(s, '::before'); return { w: r.width, h: r.height, rw: bf.content === 'none' ? null : parseFloat(bf.width) }; }),
  nav: [...document.querySelectorAll('a[href="#/narrative"]')].map((a) => a.innerText.trim()).filter(Boolean), groups: [...document.querySelectorAll('#gearMenu .gm-sep')].map((x) => x.textContent),
  logo: (() => { const i = document.querySelector('.dh img.logo'); return i ? getComputedStyle(i).backgroundColor : 'none'; })(),
  spacing: S.charts[0] ? S.charts[0].timeScale().options().barSpacing : null, nbar: +(((document.querySelector('#pcw') || {}).dataset || {}).pcBars || 0) }));
const open = async (ctx, sym, lang, ind) => { const p = await ctx.newPage(), errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(B + 'index.html#/markets'); await p.evaluate(([s, l, i]) => { localStorage.clear(); localStorage.setItem('cw-lang', l); localStorage.setItem('cw-sel', s); if (i) localStorage.setItem('cw-ind', JSON.stringify(i)); }, [sym, lang, ind]);
  await p.reload(); await p.waitForSelector('#pcw canvas', { timeout: 60000 }); await p.waitForTimeout(2500); return { p, errs }; };

for (const [w, h, lang, sch] of [[1280, 900, 'en', 'dark'], [390, 844, 'th', 'dark'], [360, 780, 'en', 'light']]) {
  const tag = `${w}-${lang}-${sch}`, mob = w < 768, ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: sch, hasTouch: mob, isMobile: mob });
  const { p, errs } = await open(ctx, 'BTC', lang);
  let g = await state(p);
  ok(g.assetv === EXP, `${tag} ASSETV ${g.assetv}`);
  ok(JSON.stringify(g.tabs) === JSON.stringify(['chart', 'pat', 'plan', 'lev', 'pos']), `${tag} one Price & indicators tab (old indicator tabs folded in)`);
  ok(g.ind.ma === 'true' && g.ind.vol === 'true' && g.ind.rsi === 'true' && g.ind.stoch === 'true' && g.ind.bb === 'false' && g.ind.macd === 'false' && g.ind.fib === 'false', `${tag} new-visitor defaults: Volume, RSI, Stochastic on; Bollinger, MACD, Fibonacci off`);
  ok(g.panes === 3 && g.lbls.join() === 'rsi,stoch', `${tag} one chart: price pane + RSI and Stochastic panes (${g.panes}), a label on each oscillator pane`);
  ok(g.lblTxt.every((x) => /\d/.test(x)) && /O .*H .*L .*C /s.test(g.read), `${tag} value bar shows O/H/L/C and each pane label its value`);
  ok(g.tfs === '15m,1H,4H,1D,1W,1M' && g.nbar >= 900 && / from \d{4}-\d\d-\d\d$/.test(g.src) && !g.psrc, `${tag} timeframes 15m..1M; 1D has ${g.nbar} candles loaded`);
  ok(g.spans === 0 && g.all === (lang === 'th' ? 'ดูทั้งหมด' : 'See all') && g.vis >= 88 && g.vis <= 100, `${tag} no range buttons; one "${g.all}" button; 1D opens on ~3 months (${g.vis} bars)`);
  ok(g.dots.length >= 5 && g.dots.every((x) => (x.startsWith('0:') ? x === '0:false' : x.endsWith(':true'))), `${tag} indicator lines have crosshair dots, price-pane lines (MAs) do not: ${g.dots.join(' ')}`);
  ok(/MA20\s*\S+.*MA50\s*\S+.*MA200\s*\S+/s.test(g.read), `${tag} value bar shows the moving averages: ${g.read.replace(/\n/g, ' ').slice(-60)}`);
  ok(g.ow <= 0, `${tag} no sideways scroll (${g.ow})`);
  ok(g.help.length > 0 && g.help.every((x) => (mob ? x.w === 44 && x.h === 44 && x.rw === 20 : x.w === 20 && x.h === 20)), `${tag} "?" help buttons are round: ${JSON.stringify(g.help[0])}`);
  ok(g.nav.every((x) => x === (lang === 'th' ? 'ข่าว' : 'News')) && g.nav.length > 0, `${tag} menu label ${g.nav[0]}`);
  ok(JSON.stringify(g.groups) === JSON.stringify(lang === 'th' ? ['วิเคราะห์', 'เครื่องมือของคุณ', 'แอป'] : ['Research', 'Your tools', 'App']), `${tag} More menu groups ${g.groups}`);
  ok(g.logo === 'rgba(0, 0, 0, 0)', `${tag} image logo has no disc behind it`);
  // crosshair: hover on desktop, press-and-drag on a phone
  { const el = await p.$('#pcw'); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); const r = await el.boundingBox(), r0 = (await state(p)).read; let cdp = null;
    if (!mob) { await p.mouse.move(r.x + 5, r.y + 5); await p.mouse.move(r.x + r.width * 0.35, r.y + 150, { steps: 5 }); await p.waitForTimeout(400); }
    else { cdp = await ctx.newCDPSession(p); const x0 = r.x + r.width * 0.3, y0 = r.y + 140; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] }); await p.waitForTimeout(700);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + 30, y: y0 }] }); await p.waitForTimeout(300); }
    const r1 = await state(p);
    if (!mob) { const m = await p.evaluate(() => { const hl = document.querySelector('.pc-hl'), dot = document.querySelector('.pc-cdot'), rd = document.querySelector('#pRead').innerText;
        const ohlc = ['O', 'H', 'L', 'C'].map((k) => (new RegExp(k + '\\s*\\$([\\d,.]+)').exec(rd) || [])[1]);
        return { on: hl && !hl.hidden && dot && !dot.hidden, lbl: hl && hl.innerText.trim(), ohlc }; });
      ok(m.on && m.ohlc.includes(m.lbl), `${tag} the horizontal line snaps to the candle: ${m.lbl} is one of O/H/L/C ${m.ohlc.join('/')}`); }
    ok(r1.read.split('\n')[0] !== r0.split('\n')[0] && !/last close|ปิดล่าสุด|live/.test(r1.read.split('\n')[0]), `${tag} ${mob ? 'press-and-drag' : 'hover'} moves the value bar to that candle (${r1.read.split('\n')[0]})`);
    if (mob) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400); ok(/last close|ปิดล่าสุด|live|ล่าสุด/.test((await state(p)).read), `${tag} letting go returns to the latest candle`); }
    else { // pointing at an oscillator pane moves the value bar and every pane label too
      const lb0 = (await state(p)).lblTxt.join('|'); await p.mouse.move(r.x + r.width * 0.6, r.y + r.height - 60, { steps: 5 }); await p.waitForTimeout(400); const r2 = await state(p);
      const tg = await p.evaluate(() => { const hl = document.querySelector('.pc-hl'), ch = S.charts[0], osc = ch.panes().slice(1).flatMap((q) => q.getSeries()).filter((x) => x.seriesType() === 'Line');
        return { tag: hl && !hl.hidden ? hl.innerText.trim() : '', vts: [...document.querySelectorAll('.pc-vts span:not(.lv)')].map((x) => x.textContent), lv: [...document.querySelectorAll('.pc-vts span.lv')].map((x) => x.textContent), osc: osc.length, rng: ch.panes().slice(1).map((q) => { const sr = q.getSeries()[0], h = q.getHeight(); return [sr.coordinateToPrice(0), sr.coordinateToPrice(h)]; }) }; });
      await p.mouse.move(2, 2); await p.waitForTimeout(300); const vt0 = await p.evaluate(() => [...document.querySelectorAll('.pc-vts span:not(.lv)')].map((x) => x.textContent));
      ok(/^-?\d+(\.\d)?$/.test(tg.tag) && tg.vts.length === tg.osc && tg.vts.join() !== vt0.join() && tg.lv.length >= 2, `${tag} indicator panes: pointer tag (${tg.tag}), value tags follow the pointer (${tg.vts.join(' ')} -> latest ${vt0.join(' ')}), levels on the axis (${tg.lv.join(' ')})`);
      ok(tg.rng.every(([top, bot]) => top < 125 && bot > -25), `${tag} indicator scales stay close to their range (${tg.rng.map((r) => r.map((v) => v.toFixed(0)).join('..')).join(' | ')})`);
      ok(r2.read.split('\n')[0] !== r1.read.split('\n')[0] && r2.lblTxt.join('|') !== lb0, `${tag} hovering the Stochastic pane moves the value bar and the pane labels (${r2.read.split('\n')[0]})`);
      await p.mouse.move(2, 2); } }
  // timeframes: each loads its own candles
  if (!mob) { const sp = {}; for (const tf of ['15m', '4h', '1w']) { await p.click(`[data-ptf="${tf}"]`); await p.waitForSelector('#pcw canvas', { timeout: 30000 }); await p.waitForTimeout(2500); const x = await state(p); sp[tf] = x; }
    ok(/^15m /.test(sp['15m'].src) && /^4H /.test(sp['4h'].src) && /^1W /.test(sp['1w'].src), `${tag} timeframes load their own candles: ${['15m', '4h', '1w'].map((k) => sp[k].src.slice(0, 40)).join(' | ')}`);
    ok(/2017|2018|2019/.test(sp['1w'].src), `${tag} 1W reaches back years: ${sp['1w'].src.slice(0, 70)}`);
    ok(sp['15m'].vis >= 660 && sp['15m'].vis <= 690, `${tag} 15m opens on about a week (${sp['15m'].vis} bars)`);
    { // v72 regression: a drag on the chart (pan) and on the price axis (stretch) stays after the mouse is released; the chart is not rebuilt
      const el = await p.$('#pcw'); await el.scrollIntoViewIfNeeded(); const r = await el.boundingBox();
      const st = () => p.evaluate(() => { const ch = S.charts[0], v = ch.timeScale().getVisibleLogicalRange(), s0 = ch.panes()[0].getSeries()[0]; window.__c0 = window.__c0 || ch; return { same: window.__c0 === ch, from: +v.from.toFixed(1), auto: ch.priceScale('right', 0).options().autoScale, top: +s0.coordinateToPrice(10).toFixed(4) }; });
      const g0 = await st(); await p.mouse.move(r.x + 500, r.y + 200); await p.mouse.down(); await p.mouse.move(r.x + 350, r.y + 200, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(800);
      const ax = r.x + r.width - 25; await p.mouse.move(ax, r.y + 150); await p.mouse.down(); await p.mouse.move(ax, r.y + 230, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(1500); const g1 = await st();
      ok(g1.same && g1.from > g0.from + 3 && g1.auto === false && g1.top !== g0.top, `${tag} drag to pan and to stretch the price axis stays after release (bar ${g0.from} -> ${g1.from}, same chart)`);
      await p.mouse.dblclick(ax, r.y + 150); await p.waitForTimeout(500); ok(await p.evaluate(() => S.charts[0].priceScale('right', 0).options().autoScale === true), `${tag} double-click on the price axis resets the scale`); }
    await p.click('[data-ptf="1M"]'); await p.waitForSelector('#pcw canvas', { timeout: 30000 }); await p.waitForTimeout(2500);
    { const x = await state(p); ok(/^1M /.test(x.src) && x.nbar >= 60, `${tag} 1M: monthly candles (${x.nbar}) ${x.src}`); }
    await p.click('[data-ptf="1d"]'); await p.waitForTimeout(2500);
    { const h0 = await p.evaluate(() => document.querySelector('#pcw').offsetHeight); await p.click('[data-psz="l"]'); await p.waitForTimeout(1200);
      const h1 = await p.evaluate(() => document.querySelector('#pcw').offsetHeight); await p.click('[data-psz="m"]'); await p.waitForTimeout(1200);
      ok(h1 > h0, `${tag} pane height L makes the indicator panes taller (${h0} -> ${h1}px)`); }
    { await p.click('[data-maset]'); await p.uncheck('#maSet [name="on2"]'); await p.fill('#maSet [name="n0"]', '21'); await p.check('#maSet [name="type"][value="ema"]'); await p.click('#maSet button[type="submit"]'); await p.waitForTimeout(1500);
      const m = await p.evaluate(() => ({ lines: S.charts[0].panes()[0].getSeries().filter((x) => x.seriesType() === 'Line').length, read: document.querySelector('#pRead').innerText }));
      ok(m.lines === 2 && /EMA21/.test(m.read) && /EMA50/.test(m.read) && !/EMA200|MA200/.test(m.read), `${tag} MA settings: EMA21 + EMA50 shown, the third line off (${m.lines} lines)`);
      await p.click('[data-maset]'); await p.click('[data-mareset]'); await p.waitForTimeout(1200);
      await p.click('[data-ind="ma"]'); await p.waitForTimeout(1200); ok(await p.evaluate(() => S.charts[0].panes()[0].getSeries().filter((x) => x.seriesType() === 'Line').length === 0), `${tag} the MA switch hides every MA line`);
      await p.click('[data-ind="ma"]'); await p.waitForTimeout(1200); }
    { await p.click('[data-cmpset]'); await p.click('[data-cmppick="ETH"]'); await p.waitForFunction(() => document.querySelector('[data-prcmp]'), null, { timeout: 30000 });
      const c = await p.evaluate(() => ({ mode: /%$/.test(S.charts[0].panes()[0].getSeries()[0].options().priceFormat.formatter(5)) ? 2 : 0, cmp: document.querySelector('[data-prcmp]').innerText.replace(/\s+/g, ' '), btn: document.querySelector('[data-cmpset]').innerText, leg: document.querySelector('#pFoot .legend').innerText }));
      ok(c.mode === 2 && /^BTC [+−-][\d.]+% · ETH [+−-][\d.]+% \(BTC (ahead|behind) by [\d.]+ pts\) since /.test(c.cmp) && /ETH/.test(c.btn) && /ETH/.test(c.leg), `${tag} compare with ETH: % scale, both changes in the value bar (${c.cmp})`);
      await p.click('[data-cmpset]'); await p.click('[data-cmpoff]'); await p.waitForTimeout(1500);
      ok(await p.evaluate(() => !/%$/.test(S.charts[0].panes()[0].getSeries()[0].options().priceFormat.formatter(5)) && !document.querySelector('[data-prcmp]')), `${tag} removing the comparison returns to the price scale`); }
    // See all / Latest
    await p.click('[data-pall]'); await p.waitForFunction(() => { const r = S.charts[0] && S.charts[0].timeScale().getVisibleLogicalRange(); return r && r.from <= 1; }, null, { timeout: 60000 }); let x = await state(p);
    ok(x.all === 'Latest*' && x.vis > 1000, `${tag} See all shows the whole history (${x.vis} bars) and turns into "${x.all}"`);
    await p.click('[data-pall]'); await p.waitForTimeout(2500); x = await state(p); ok(x.all === 'See all' && x.vis <= 100, `${tag} Latest returns to ~3 months (${x.vis} bars)`); }
  // switches and Fibonacci
  await p.click('[data-ind="macd"]'); await p.waitForTimeout(1200); await p.click('[data-ind="fib"]'); await p.waitForTimeout(1500);
  g = await state(p);
  ok(g.panes === 4 && g.lbls.join() === 'rsi,macd,stoch', `${tag} MACD adds a pane (${g.panes})`);
  const fib = await p.evaluate(() => (document.querySelector('[data-indn="fib"]') || {}).innerText || '');
  ok(/Fibonacci/.test(fib) && /latest big swing|สวิงใหญ่ล่าสุด/.test(fib) && (/up-swing low .*→ high|down-swing high .*→ low|สวิงขึ้น ต่ำ|สวิงลง สูง/s.test(fib.replace(/\n/g, ' '))), `${tag} Fibonacci note names the latest big swing in order: ${fib.replace(/\n/g, ' ').slice(0, 90)}`);
  { const z0 = await p.evaluate(() => { const z = document.querySelector('.pc-fibz'); return z && !z.hidden ? z.getBoundingClientRect().height : 0; });
    await p.evaluate(() => { const ts = S.charts[0].timeScale(), r = ts.getVisibleLogicalRange(); ts.setVisibleLogicalRange({ from: r.to - 30, to: r.to }); }); await p.waitForTimeout(800);
    const fib2 = await p.evaluate(() => (document.querySelector('[data-indn="fib"]') || {}).innerText || '');
    ok(z0 > 2 && fib2 === fib, `${tag} golden zone shaded (${z0.toFixed(0)}px) and zooming in does not move the levels`); }
  await p.reload(); await p.waitForSelector('#pcw canvas'); await p.waitForTimeout(2000);
  ok(await p.evaluate(() => [...document.querySelectorAll('[data-ind]')].map((x) => x.dataset.ind + x.getAttribute('aria-pressed')).join()) === 'matrue,voltrue,bbfalse,fibtrue,rsitrue,macdtrue,stochtrue', `${tag} choices remembered after reload`);
  await p.evaluate(() => { S.tab = 'mom'; renderDetail(); }); await p.waitForTimeout(800);
  ok(await p.evaluate(() => S.tab === 'chart' && !!document.querySelector('#pcw')), `${tag} old tab id "mom" opens the Price tab`);
  ok(!errs.length, `${tag} no page errors ${errs[0] || ''}`);
  await ctx.close();
}
// HYPE: the setup has enough daily history now
{ const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }), { p, errs } = await open(ctx, 'HYPE', 'en');
  const r = await p.evaluate(() => { const t = tokBySym('HYPE'); return { bias: t.I.plan.bias, bars: t.d1.length, hsrc: t._hsrc && t._hsrc.ex, live: t._src && t._src.ex, src: ((document.querySelector('#pcw') || {}).dataset || {}).pcSrc || '', _x: (document.querySelector('.psrc') || {}).innerText }; });
  ok(r.bias !== 'Insufficient' && r.bars >= 220 && r.hsrc === 'hyperliquid', `HYPE setup ${r.bias} on ${r.bars} daily candles from ${r.hsrc} (live price ${r.live})`);
  ok(/Hyperliquid HYPE/.test(r.src), `HYPE chart reads the long history: ${r.src}`);
  ok(!errs.length, `HYPE no page errors ${errs[0] || ''}`); await ctx.close(); }
await b.close();
console.log(`PASS chart-ui: ${n} checks (stochastic maths, v5 panes, switches, timeframes, ranges, hover + touch scrub, Fibonacci, HYPE history, help, menu, logo)`);
