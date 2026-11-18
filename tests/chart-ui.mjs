// v62/v63 Price & indicators tab, in node + Chromium:
//  - Stochastic 9/3/3 maths (verdict-core.js stoch) against a hand calculation, flat window = 50, nulls before a full window;
//  - one chart (lightweight-charts v5) with panes: price + one short pane per oscillator; labels pinned to each pane;
//  - switches: a new visitor sees Volume, RSI and Stochastic on, Bollinger, MACD and Fibonacci off; choices remembered;
//  - timeframes 15m / 1H / 4H / 1D / 1W load their own candles (different bar spacing), 1D has ~1000 candles, 1W the full history;
//  - range buttons 1W / 1M / 3M / 6M / 1Y / All (a span with too few or too many bars is disabled);
//  - crosshair: hovering (desktop) and press-and-drag (phone, touch) move the value bar and every pane label to that candle;
//  - Fibonacci: levels from the biggest swing in view, its own colour, note names the swing in the right order;
//  - HYPE: the setup reads Hyperliquid's long daily history (Binance lists HYPE since Sep 2026 only), so it is not "Insufficient";
//  - "?" help buttons stay round, menu says News / ข่าว, More menu grouped, image logos have no disc, no sideways scroll.
// EN + TH, 360 / 390 / 1280, light + dark. Usage: node tests/chart-ui.mjs [baseUrl]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const VC = createRequire(import.meta.url)('../verdict-core.js');
const B = process.argv[2] || process.env.U || 'http://localhost:8787/', EXP = Number(process.env.EXPECT_ASSETV || 65);
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
  src: (document.querySelector('.psrc') || {}).innerText || '', ow: document.documentElement.scrollWidth - innerWidth,
  spans: [...document.querySelectorAll('[data-pspan]')].map((x) => x.dataset.pspan + (x.disabled ? '-' : '') + (x.getAttribute('aria-pressed') === 'true' ? '*' : '')).join(),
  tfs: [...document.querySelectorAll('[data-ptf]')].map((x) => x.textContent).join(), help: [...document.querySelectorAll('.ui-help>summary')].filter((s) => s.offsetParent).slice(0, 4).map((s) => { const r = s.getBoundingClientRect(), bf = getComputedStyle(s, '::before'); return { w: r.width, h: r.height, rw: bf.content === 'none' ? null : parseFloat(bf.width) }; }),
  nav: [...document.querySelectorAll('a[href="#/narrative"]')].map((a) => a.innerText.trim()).filter(Boolean), groups: [...document.querySelectorAll('#gearMenu .gm-sep')].map((x) => x.textContent),
  logo: (() => { const i = document.querySelector('.dh img.logo'); return i ? getComputedStyle(i).backgroundColor : 'none'; })(),
  spacing: S.charts[0] ? S.charts[0].timeScale().options().barSpacing : null, nbar: (() => { const m = /(\d+) candles loaded|โหลดแล้ว (\d+) แท่ง/.exec((document.querySelector('.psrc') || {}).innerText || ''); return m ? +(m[1] || m[2]) : 0; })() }));
const open = async (ctx, sym, lang, ind) => { const p = await ctx.newPage(), errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(B + 'index.html#/markets'); await p.evaluate(([s, l, i]) => { localStorage.clear(); localStorage.setItem('cw-lang', l); localStorage.setItem('cw-sel', s); if (i) localStorage.setItem('cw-ind', JSON.stringify(i)); }, [sym, lang, ind]);
  await p.reload(); await p.waitForSelector('#pcw canvas', { timeout: 60000 }); await p.waitForTimeout(2500); return { p, errs }; };

for (const [w, h, lang, sch] of [[1280, 900, 'en', 'dark'], [390, 844, 'th', 'dark'], [360, 780, 'en', 'light']]) {
  const tag = `${w}-${lang}-${sch}`, mob = w < 768, ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: sch, hasTouch: mob, isMobile: mob });
  const { p, errs } = await open(ctx, 'BTC', lang);
  let g = await state(p);
  ok(g.assetv === EXP, `${tag} ASSETV ${g.assetv}`);
  ok(JSON.stringify(g.tabs) === JSON.stringify(['chart', 'pat', 'plan', 'lev', 'pos']), `${tag} one Price & indicators tab (old indicator tabs folded in)`);
  ok(g.ind.vol === 'true' && g.ind.rsi === 'true' && g.ind.stoch === 'true' && g.ind.bb === 'false' && g.ind.macd === 'false' && g.ind.fib === 'false', `${tag} new-visitor defaults: Volume, RSI, Stochastic on; Bollinger, MACD, Fibonacci off`);
  ok(g.panes === 3 && g.lbls.join() === 'rsi,stoch', `${tag} one chart: price pane + RSI and Stochastic panes (${g.panes}), a label on each oscillator pane`);
  ok(g.lblTxt.every((x) => /\d/.test(x)) && /O .*H .*L .*C /s.test(g.read), `${tag} value bar shows O/H/L/C and each pane label its value`);
  ok(g.tfs === '15m,1H,4H,1D,1W' && g.nbar >= 900 && /from|ตั้งแต่/.test(g.src), `${tag} timeframes 15m..1W; 1D has ${g.nbar} candles loaded`);
  ok(/1W-/.test(g.spans) && /3M\*/.test(g.spans) && /All/.test(g.spans), `${tag} ranges ${g.spans} (1W disabled on 1D: too few bars; 3M default)`);
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
    ok(r1.read.split('\n')[0] !== r0.split('\n')[0] && !/last close|ปิดล่าสุด|live/.test(r1.read.split('\n')[0]), `${tag} ${mob ? 'press-and-drag' : 'hover'} moves the value bar to that candle (${r1.read.split('\n')[0]})`);
    if (mob) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400); ok(/last close|ปิดล่าสุด|live|ล่าสุด/.test((await state(p)).read), `${tag} letting go returns to the latest candle`); }
    else await p.mouse.move(2, 2); }
  // timeframes: each loads its own candles
  if (!mob) { const sp = {}; for (const tf of ['15m', '4h', '1w']) { await p.click(`[data-ptf="${tf}"]`); await p.waitForSelector('#pcw canvas', { timeout: 30000 }); await p.waitForTimeout(2500); const x = await state(p); sp[tf] = x; }
    ok(/^15m /.test(sp['15m'].src) && /^4H /.test(sp['4h'].src) && /^1W /.test(sp['1w'].src), `${tag} timeframes load their own candles: ${['15m', '4h', '1w'].map((k) => sp[k].src.slice(0, 40)).join(' | ')}`);
    ok(/2017|2018|2019/.test(sp['1w'].src), `${tag} 1W reaches back years: ${sp['1w'].src.slice(0, 70)}`);
    ok(/1W\*/.test(sp['15m'].spans) && /1Y-/.test(sp['15m'].spans), `${tag} 15m: 1W default, 1Y disabled (too many bars): ${sp['15m'].spans}`);
    await p.click('[data-ptf="1d"]'); await p.waitForTimeout(2500); }
  // switches and Fibonacci
  await p.click('[data-ind="macd"]'); await p.waitForTimeout(1200); await p.click('[data-ind="fib"]'); await p.waitForTimeout(1500);
  g = await state(p);
  ok(g.panes === 4 && g.lbls.join() === 'rsi,macd,stoch', `${tag} MACD adds a pane (${g.panes})`);
  const fib = await p.evaluate(() => (document.querySelector('[data-indn="fib"]') || {}).innerText || '');
  ok(/Fibonacci/.test(fib) && (/up-swing low .*→ high|down-swing high .*→ low|สวิงขึ้น ต่ำ|สวิงลง สูง/s.test(fib.replace(/\n/g, ' '))), `${tag} Fibonacci note names the swing in order: ${fib.replace(/\n/g, ' ').slice(0, 80)}`);
  await p.reload(); await p.waitForSelector('#pcw canvas'); await p.waitForTimeout(2000);
  ok(await p.evaluate(() => [...document.querySelectorAll('[data-ind]')].map((x) => x.dataset.ind + x.getAttribute('aria-pressed')).join()) === 'voltrue,bbfalse,fibtrue,rsitrue,macdtrue,stochtrue', `${tag} choices remembered after reload`);
  await p.evaluate(() => { S.tab = 'mom'; renderDetail(); }); await p.waitForTimeout(800);
  ok(await p.evaluate(() => S.tab === 'chart' && !!document.querySelector('#pcw')), `${tag} old tab id "mom" opens the Price tab`);
  ok(!errs.length, `${tag} no page errors ${errs[0] || ''}`);
  await ctx.close();
}
// HYPE: the setup has enough daily history now
{ const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }), { p, errs } = await open(ctx, 'HYPE', 'en');
  const r = await p.evaluate(() => { const t = tokBySym('HYPE'); return { bias: t.I.plan.bias, bars: t.d1.length, hsrc: t._hsrc && t._hsrc.ex, live: t._src && t._src.ex, src: (document.querySelector('.psrc') || {}).innerText }; });
  ok(r.bias !== 'Insufficient' && r.bars >= 220 && r.hsrc === 'hyperliquid', `HYPE setup ${r.bias} on ${r.bars} daily candles from ${r.hsrc} (live price ${r.live})`);
  ok(/Hyperliquid HYPE/.test(r.src), `HYPE chart reads the long history: ${r.src.slice(0, 60)}`);
  ok(!errs.length, `HYPE no page errors ${errs[0] || ''}`); await ctx.close(); }
await b.close();
console.log(`PASS chart-ui: ${n} checks (stochastic maths, v5 panes, switches, timeframes, ranges, hover + touch scrub, Fibonacci, HYPE history, help, menu, logo)`);
