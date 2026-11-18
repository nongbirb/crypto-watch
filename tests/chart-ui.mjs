// v62 in node + Chromium:
//  - Stochastic 9/3/3 maths (verdict-core.js stoch) against a hand calculation, flat window = 50, nulls before a full window;
//  - Price tab: RSI, MACD, Volume, Bollinger and Stochastic live there with one switch each; a new visitor sees Volume, RSI and
//    Stochastic on, Bollinger and MACD off; a choice is remembered after reload; the old RSI/MACD, Volume and Bands tabs are gone and
//    their ids open the Price tab; every pane explains how to read it;
//  - "?" help buttons stay a round 20px circle (44px tap area on phones, no stretched oval);
//  - the menu says News / ข่าว instead of X Narrative;
//  - an image token logo has no coloured disc behind it.
// EN + TH, 360 / 390 / 1280, light + dark, no sideways scroll. Usage: node tests/chart-ui.mjs [baseUrl]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const VC = createRequire(import.meta.url)('../verdict-core.js');
const B = process.argv[2] || process.env.U || 'http://localhost:8787/', EXP = Number(process.env.EXPECT_ASSETV || 62);
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
for (const [w, h, lang, sch] of [[1280, 900, 'en', 'dark'], [390, 844, 'th', 'dark'], [360, 780, 'en', 'light'], [390, 844, 'en', 'light']]) {
  const tag = `${w}-${lang}-${sch}`, ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: sch }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(B + 'index.html#/markets'); await p.evaluate((l) => { localStorage.clear(); localStorage.setItem('cw-lang', l); localStorage.setItem('cw-sel', 'SOL'); }, lang);
  await p.reload(); await p.waitForSelector('#tabBody .indt', { timeout: 60000 }); await p.waitForTimeout(2000);
  const g = await p.evaluate(() => ({ assetv: ASSETV, tabs: [...document.querySelectorAll('.tabs [data-tab]')].map((x) => x.dataset.tab),
    ind: Object.fromEntries([...document.querySelectorAll('[data-ind]')].map((x) => [x.dataset.ind, x.getAttribute('aria-pressed')])),
    panes: [...document.querySelectorAll('[data-indp]')].map((x) => ({ k: x.dataset.indp, txt: x.innerText, canvas: x.querySelectorAll('canvas').length, chip: !!x.querySelector('.ind-chip'), help: (x.querySelector('.ui-help-body') || {}).textContent || '' })),
    range: (document.querySelector('[data-prange][aria-pressed="true"]') || {}).dataset?.prange, rangeBtns: [...document.querySelectorAll('[data-prange]')].map((x) => x.dataset.prange).join(), read: document.querySelector('#pRead').innerText,
    psw: S.charts.map((c) => c.priceScale('right').width()), groups: [...document.querySelectorAll('#gearMenu .gm-sep')].map((x) => x.textContent),
    volNote: !!document.querySelector('[data-indn="vol"]'), bbNote: !!document.querySelector('[data-indn="bb"]'), ow: document.documentElement.scrollWidth - innerWidth,
    help: [...document.querySelectorAll('.ui-help>summary')].filter((s) => s.offsetParent).slice(0, 6).map((s) => { const r = s.getBoundingClientRect(), cs = getComputedStyle(s), bf = getComputedStyle(s, '::before');
      return { w: r.width, h: r.height, bw: parseFloat(cs.borderTopWidth), rw: bf.content === 'none' ? null : parseFloat(bf.width), rh: bf.content === 'none' ? null : parseFloat(bf.height) }; }),
    nav: [...document.querySelectorAll('a[href="#/narrative"]')].map((a) => a.innerText.trim()).filter(Boolean),
    logo: (() => { const i = document.querySelector('.dh img.logo'); return i ? getComputedStyle(i).backgroundColor : 'none'; })() }));
  ok(g.assetv === EXP, `${tag} ASSETV ${g.assetv}`);
  ok(JSON.stringify(g.tabs) === JSON.stringify(['chart', 'pat', 'plan', 'lev', 'pos']), `${tag} RSI/MACD, Volume and Bands tabs folded into the Price tab: ${g.tabs}`);
  ok(g.ind.vol === 'true' && g.ind.rsi === 'true' && g.ind.stoch === 'true' && g.ind.bb === 'false' && g.ind.macd === 'false', `${tag} new-visitor defaults: Volume, RSI, Stochastic on; Bollinger, MACD off`);
  ok(g.panes.map((x) => x.k).join() === 'rsi,stoch' && g.panes.every((x) => x.canvas > 0), `${tag} RSI and Stochastic panes drawn`);
  ok(g.panes.find((x) => x.k === 'stoch').txt.includes('9/3/3') && g.panes.every((x) => x.help.length > 80 && x.chip), `${tag} each pane names its settings, shows a status chip and explains how to read it in its "?"`);
  ok(g.range === '3M' && g.rangeBtns === '1M,3M,6M,1Y' && g.read.length > 20, `${tag} range buttons 1M/3M/6M/1Y (default 3M) and an OHLC readout: ${g.read.slice(0, 60)}`);
  ok(g.psw.length > 1 && g.psw.every((x) => x === g.psw[0]), `${tag} every chart on the tab has the same price-scale width, so dates line up (${g.psw})`);
  ok(JSON.stringify(g.groups) === JSON.stringify(lang === 'th' ? ['วิเคราะห์', 'เครื่องมือของคุณ', 'แอป'] : ['Research', 'Your tools', 'App']), `${tag} More menu in labelled groups: ${g.groups}`);
  ok(g.volNote && !g.bbNote, `${tag} Volume note shown, Bollinger note hidden while off`);
  ok(g.ow <= 0, `${tag} no sideways scroll (${g.ow})`);
  ok(g.help.length > 0 && g.help.every((x) => (w < 768 ? x.w === 44 && x.h === 44 && x.bw === 0 && x.rw === 20 && x.rh === 20 : x.w === 20 && x.h === 20 && x.bw === 1)), `${tag} "?" is a round 20px circle${w < 768 ? ' inside a 44px tap area' : ''}: ${JSON.stringify(g.help[0])}`);
  ok(g.nav.length > 0 && g.nav.every((x) => x === (lang === 'th' ? 'ข่าว' : 'News')), `${tag} menu label ${g.nav[0]}`);
  ok(g.logo === 'rgba(0, 0, 0, 0)', `${tag} image logo has no disc behind it (${g.logo})`);
  // crosshair: hovering the price chart moves every pane's readout to that day
  { const el = await p.$('#ch1'); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); const r = await el.boundingBox(); const r0 = await p.evaluate(() => [document.querySelector('#pRead').innerText, document.querySelector('#pv-rsi').innerText]);
    await p.mouse.move(r.x + 5, r.y + 5); await p.mouse.move(r.x + r.width * 0.35, r.y + r.height * 0.5, { steps: 5 }); await p.waitForTimeout(400);
    const r1 = await p.evaluate(() => [document.querySelector('#pRead').innerText, document.querySelector('#pv-rsi').innerText]);
    ok(r1[0] !== r0[0] && !/last close|ปิดล่าสุด/.test(r1[0]) && r1[1] !== r0[1], `${tag} hover moves the readout and the RSI value to the hovered day (${r1[0].split('\n')[0]}, RSI ${r1[1]})`);
    await p.mouse.move(2, 2); await p.click('[data-prange="1M"]'); await p.waitForTimeout(500);
    const vr = await p.evaluate(() => S.charts.map((c) => { const x = c.timeScale().getVisibleLogicalRange(); return Math.round(x.to - x.from); }));
    ok(vr.every((x) => x === vr[0] && x <= 34), `${tag} 1M shows about 30 days in every chart (${vr})`);
    await p.click('[data-prange="3M"]'); await p.waitForTimeout(300); }
  // switches: toggle, remembered after reload; an old tab id opens the Price tab
  await p.click('[data-ind="macd"]'); await p.click('[data-ind="stoch"]'); await p.click('[data-ind="bb"]');
  ok(await p.evaluate(() => [...document.querySelectorAll('[data-indp]')].map((x) => x.dataset.indp).join()) === 'rsi,macd' && await p.evaluate(() => !!document.querySelector('[data-indn="bb"]')), `${tag} switches add MACD and Bollinger, remove Stochastic`);
  await p.reload(); await p.waitForSelector('#tabBody .indt'); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => [...document.querySelectorAll('[data-ind]')].map((x) => x.dataset.ind + x.getAttribute('aria-pressed')).join()) === 'voltrue,bbtrue,rsitrue,macdtrue,stochfalse', `${tag} choices remembered after reload`);
  await p.evaluate(() => { S.tab = 'mom'; renderDetail(); }); await p.waitForTimeout(600);
  ok(await p.evaluate(() => S.tab === 'chart' && !!document.querySelector('#tabBody .indt')), `${tag} old tab id "mom" opens the Price tab`);
  ok(!errs.length, `${tag} no page errors ${errs[0] || ''}`);
  await ctx.close();
}
await b.close();
console.log(`PASS chart-ui: ${n} checks (stochastic 9/3/3 maths, indicator switches and defaults, help buttons, News label, logo)`);
