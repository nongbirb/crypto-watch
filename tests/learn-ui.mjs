// v66 Learn tab in Chromium: 15 short lessons (6 beginner, 9 intermediate); each chart lesson draws a real example from the app's
// own closed daily candles with a reading written from today's numbers (RSI checked against verdict-core); quick check gives
// feedback and saves progress across reloads; search filters lessons and the glossary; level filter; token switch; deep link
// #/learn/<id>; EN + TH, 1280 / 390 / 360, no sideways scroll, no page errors. Candles are live. Usage: node tests/learn-ui.mjs [baseUrl]
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/', EXP = Number(process.env.EXPECT_ASSETV || 69);
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
async function open(w, lang, hash = '#/learn') {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, serviceWorkers: 'block', isMobile: w < 600, hasTouch: w < 600 });
  await c.addInitScript((l) => { if (!sessionStorage.getItem('ln-init')) { localStorage.clear(); sessionStorage.setItem('ln-init', '1'); } localStorage.setItem('cw-lang', l); }, lang);
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + 'index.html' + hash); await p.waitForSelector('.ln-card', { timeout: 60000 });
  await p.waitForFunction(() => tokBySym('BTC') && tokBySym('BTC').d1 && tokBySym('BTC').d1.length > 200, null, { timeout: 60000 });
  return { c, p, errs };
}
const exIds = ['candles', 'trend', 'levels', 'volume', 'risk', 'rsi', 'macd', 'bb', 'stoch', 'fib'];

// 1) desktop EN: lesson list, every example, RSI value, quick check + progress, search, level, token switch
{ const { c, p, errs } = await open(1280, 'en');
  const g = await p.evaluate(() => ({ v: ASSETV, cards: [...document.querySelectorAll('.ln-card')].map((d) => d.dataset.ln), lv: [...document.querySelectorAll('.ln-lv')].map((x) => x.classList.contains('b') ? 'b' : 'i'), prog: document.querySelector('[data-lnprog] span').textContent, gl: document.querySelectorAll('#lnGl > div').length }));
  ok(g.v === EXP, `ASSETV ${g.v}`);
  ok(g.cards.length === 15 && g.lv.filter((x) => x === 'b').length === 6, `15 lessons, 6 beginner (${g.cards.join(', ')})`);
  ok(g.prog === '0 of 15 lessons done' && g.gl >= 30, `progress starts at 0 of 15; glossary has ${g.gl} terms`);
  for (const id of exIds) { await p.click(`[data-ln="${id}"] > summary`); await p.waitForSelector(`[data-ln="${id}"] [data-lnread]`, { timeout: 20000 });
    const r = await p.evaluate((id) => { const d = document.querySelector(`[data-ln="${id}"]`); return { svg: d.querySelectorAll('.ln-fig svg rect, .ln-fig svg line').length, read: d.querySelector('[data-lnread]').textContent, trap: !!d.querySelector('.ln-trap'), q: d.querySelectorAll('[data-lnopt]').length, go: d.querySelector('.ln-go').getAttribute('href') }; }, id);
    ok(r.svg > 40 && /BTC/.test(r.read) && /\d/.test(r.read) && r.trap && r.q === 3 && r.go.startsWith('#/'), `${id}: real BTC chart, reading "${r.read.slice(0, 90)}…", trap, 3-option check, link ${r.go}`);
    await p.click(`[data-ln="${id}"] > summary`); }
  // RSI reading matches verdict-core on the same closed candles
  await p.click('[data-ln="rsi"] > summary'); await p.waitForSelector('[data-ln="rsi"] [data-lnread]');
  const rs = await p.evaluate(() => { const k = tokBySym('BTC').d1.filter((x) => x.t + 864e5 <= Date.now()), r = VC.rsiSeries(k.map((x) => x.c)); return { calc: Math.round(r[r.length - 1]), read: document.querySelector('[data-ln="rsi"] [data-lnread]').textContent }; });
  ok(rs.read.startsWith(`BTC RSI is ${rs.calc},`), `RSI reading uses closed candles: ${rs.calc} (${rs.read.slice(0, 40)})`);
  // quick check: wrong, then right
  await p.click('[data-ln="rsi"] [data-lnopt="0"]'); const f1 = await p.$eval('[data-ln="rsi"] .ln-fb', (e) => e.textContent);
  ok(/^Not quite/.test(f1) && (await p.$eval('[data-lnprog] span', (e) => e.textContent)) === '0 of 15 lessons done', `wrong answer: "${f1.slice(0, 50)}", progress unchanged`);
  await p.click('[data-ln="rsi"] [data-lnopt="1"]'); const f2 = await p.$eval('[data-ln="rsi"] .ln-fb', (e) => e.textContent);
  ok(/^Right/.test(f2) && (await p.$eval('[data-lnprog] span', (e) => e.textContent)) === '1 of 15 lessons done' && (await p.$eval('[data-ln="rsi"] .ln-n', (e) => e.textContent)) === '✓', 'right answer: feedback, 1 of 15, tick on the card');
  // token switch
  await p.click('[data-lntok="ETH"]'); await p.waitForFunction(() => /^ETH RSI is \d+/.test((document.querySelector('[data-ln="rsi"] [data-lnread]') || {}).textContent || ''), null, { timeout: 20000 });
  ok(true, 'switching the example to ETH redraws the open lesson with ETH');
  // level filter + search
  await p.click('[data-lnlvl="b"]'); ok(await p.$$eval('.ln-card', (a) => a.length) === 6, 'Beginner filter: 6 lessons');
  await p.click('[data-lnlvl="all"]'); await p.fill('#lnQ', 'funding');
  const s1 = await p.evaluate(() => ({ cards: [...document.querySelectorAll('.ln-card')].map((d) => d.dataset.ln), gl: [...document.querySelectorAll('#lnGl > div b')].map((x) => x.textContent) }));
  ok(s1.cards.includes('funding') && s1.cards.length < 6 && s1.gl.some((x) => /Funding/.test(x)), `search "funding": lessons ${s1.cards.join(', ')}; terms ${s1.gl.join(', ')}`);
  await p.fill('#lnQ', 'zzqqx'); ok(await p.evaluate(() => !document.querySelector('#lnNone').hidden && !document.querySelector('.ln-card') && /No term/.test(document.querySelector('#lnGl').textContent)), 'no match: both empty states shown');
  await p.fill('#lnQ', '');
  ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'desktop: no sideways scroll');
  // progress survives a reload
  await p.reload(); await p.waitForSelector('.ln-card');
  ok((await p.$eval('[data-lnprog] span', (e) => e.textContent)) === '1 of 15 lessons done' && (await p.$eval('[data-ln="rsi"] .ln-n', (e) => e.textContent)) === '✓', 'progress kept after reload');
  ok(!errs.length, `no page errors ${errs[0] || ''}`); await c.close(); }

// 2) deep link, phone TH 390 and 360
for (const w of [390, 360]) { const { c, p, errs } = await open(w, 'th', '#/learn/fib');
  await p.waitForSelector('[data-ln="fib"][open] [data-lnread]', { timeout: 20000 });
  const r = await p.evaluate(() => { const d = document.querySelector('[data-ln="fib"]'), fs = parseFloat(getComputedStyle(d.querySelector('.ln-tx')).fontSize), sv = d.querySelector('.ln-fig svg'), sc = sv.getBoundingClientRect().width / 640;
    return { title: d.querySelector('.ln-tt b').textContent, read: d.querySelector('[data-lnread]').textContent, px: fs * sc, ow: document.documentElement.scrollWidth - innerWidth, lv: getComputedStyle(d.querySelector('.ln-lv')).gridColumnStart, trap: d.querySelector('.ln-trap b').textContent }; });
  ok(/สวิงใหญ่สุดของ BTC/.test(r.read) && r.trap === 'กับดักที่เจอบ่อย', `${w} TH: deep link #/learn/fib opens Fibonacci with a Thai reading (${r.read.slice(0, 50)}…)`);
  ok(r.px >= 9, `${w}: chart labels readable on a phone (${r.px.toFixed(1)}px on screen)`);
  ok(r.ow <= 0, `${w}: no sideways scroll (${r.ow})`);
  ok(!errs.length, `${w}: no page errors ${errs[0] || ''}`); await c.close(); }
await b.close();
console.log(`PASS learn-ui: ${n} checks (15 lessons, real-chart examples, RSI vs verdict-core, quick check + progress, search, level, token switch, deep link, TH phones)`);
