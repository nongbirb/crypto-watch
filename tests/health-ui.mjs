// Market Health page (#/breadth) in Chromium: layout at 1920/1440/1280/1024/800/768/390/360 px (65/35 >= 1024, one column < 768, treemap before the
// metrics on phones, no sideways scroll, tile labels fit), EN + TH, accessible tabs and tile keyboard navigation, Simple/Pro, Thai tooltips,
// descriptive wording, and the loading / empty / stale / error / one-source-failed states. States are simulated in the browser only
// (route interception over the recorded real build in tests/fixtures/health/); production data is never touched.
// Usage: node tests/health-ui.mjs [baseUrl]   SHOT=dir saves screenshots (real data from the server + every state)
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/', SHOT = process.env.SHOT || '';
const FX = JSON.parse(fs.readFileSync(new URL('./fixtures/health/health.json', import.meta.url), 'utf8')), HIST = fs.readFileSync(new URL('./fixtures/health/history.json', import.meta.url), 'utf8');
const BAD = fs.readFileSync('scripts/thai_blocklist.txt', 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const PRED = /น่าซื้อ|ควรซื้อ|ควรขาย|จะขึ้น|จะลง|เข้าซื้อ|\bbuy\b|\bsell\b|will rise|will fall|forecast(?!,| it)/i;
if (SHOT) fs.mkdirSync(SHOT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
function fresh(f = (d) => d) { // the recorded build with its clock moved to now (so "fresh" is testable on any day), then an optional state change
  const d = structuredClone(FX), now = Date.now(), y = new Date(now - 864e5).toISOString().slice(0, 10);
  d.updated = iso(now - 6e5); d.official.day = y; d.official.at = iso(now - 9e5); d.leverage.at = iso(now - 6e5);
  for (const s of Object.values(d.sources)) { if (s.at) s.at = iso(now - 6e5); if (s.day) s.day = y; }
  return JSON.stringify(f(d));
}
async function open(w, lang, opt = {}) {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, serviceWorkers: 'block', isMobile: w < 600, hasTouch: w < 600, colorScheme: 'dark' });
  await c.addInitScript(([l, m]) => { localStorage.setItem('cw-lang', l); if (m) localStorage.setItem('cw-hm-mode', JSON.stringify(m)); }, [lang, opt.mode]);
  if (opt.body !== null) await c.route(/\/health\.json(\?|$)/, async (r) => { if (opt.delay) await new Promise((z) => setTimeout(z, opt.delay)); return opt.status ? r.fulfill({ status: opt.status, body: 'nf' }) : r.fulfill({ contentType: 'application/json', body: opt.body || fresh() }); });
  if (opt.body !== null) await c.route(/\/data\/health\/history\.json/, (r) => r.fulfill({ contentType: 'application/json', body: HIST }));
  const p = await c.newPage(), errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '#/breadth'); if (!opt.noWait) await p.waitForSelector(opt.wait || '.hm-grid', { timeout: 30000 }); await p.waitForTimeout(400);
  return { c, p, errs };
}
const layout = (p) => p.evaluate(() => { const W = document.documentElement.clientWidth, R = (s) => document.querySelector(s).getBoundingClientRect();
  const out = [...document.querySelectorAll('#hm *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && !e.closest('.tbl-wrap') && !e.closest('.ui-help-body'); }).map((e) => e.className || e.tagName);
  const clipped = [...document.querySelectorAll('.hm-t b')].filter((x) => x.getBoundingClientRect().width > x.parentElement.getBoundingClientRect().width + 1).map((x) => x.textContent);
  const tipless = [...document.querySelectorAll('.hm-m')].filter((m) => !/คืออะไร|What it is/.test((m.querySelector('.ui-help-body') || {}).textContent || '')).length;
  const l = R('.hm-l'), r = R('.hm-r'), page = R('#hm');
  const taps = W < 768 ? [...document.querySelectorAll('#hm a[href], #hm button, #hm summary, #hm [role=tab], #hm select, #hm input')].filter((e) => e.offsetWidth && !e.closest('[hidden]') && !e.closest('.ui-help-body') && getComputedStyle(e).display !== 'inline' && !e.classList.contains('hm-t')).filter((e) => e.getBoundingClientRect().height < 44).map((e) => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height)) : [];
  return { sw: document.documentElement.scrollWidth, cw: W, taps, doc: document.documentElement.scrollWidth > W, out: [...new Set(out)].slice(0, 5), clipped, tipless, split: l.width / (l.width + r.width), stacked: r.top >= l.bottom - 1, page: page.width, tiles: document.querySelectorAll('.hm-t').length }; });

// 1) layout, both languages, every width
for (const lang of ['en', 'th']) for (const w of [1920, 1440, 1280, 1024, 800, 768, 390, 360]) {
  const { c, p, errs } = await open(w, lang), L = await layout(p), tag = `${lang} ${w}px`;
  ok(!errs.length, `${tag}: no page errors ${errs.join(';')}`); ok(!L.doc && !L.out.length, `${tag}: no horizontal overflow ${L.out.join(',')}`); ok(L.sw <= L.cw, `${tag}: scrollWidth ${L.sw} <= clientWidth ${L.cw}`);
  if (w < 768) ok(!L.taps.length, `${tag}: every control is >=44px tall ${L.taps.slice(0, 6).join(',')}`);
  ok(L.tiles === FX.coins.length, `${tag}: ${L.tiles} tiles, each coin once`); ok(!L.clipped.length, `${tag}: tile labels fit (${L.clipped.join(',')})`); ok(L.tipless === 0, `${tag}: every metric has a what/why/today tooltip`);
  if (w >= 1024) ok(Math.abs(L.split - 0.65) < 0.03 && L.page <= 1401, `${tag}: 65/35 columns (${L.split.toFixed(3)}), max-width 1400 (${Math.round(L.page)})`);
  if (w < 768) ok(L.stacked, `${tag}: one column, treemap before the metrics`);
  const txt = await p.textContent('#hm');
  ok(lang === 'th' ? /บรรยายสภาพตลาด ไม่ใช่การทำนาย/.test(txt) : /Describes the market, not a forecast/.test(txt), `${tag}: descriptive label`);
  ok(await p.$('a[href="https://www.coingecko.com/"]') && /Data provided by CoinGecko/.test(txt), `${tag}: CoinGecko attribution`);
  if (w === 1440) {
    const lines = await p.evaluate((l) => [...hmSummary(HM.d, l), ...hmKnow(HM.d, l)], lang);
    ok(lines.length >= 5 && lines.every((s) => !PRED.test(s) && !BAD.some((x) => s.includes(x)) && !(lang === 'th' && /[;—]/.test(s))), `${tag}: summary + "what to know" are descriptive (${lines.length} lines)`);
    ok(/GMT|UTC|[A-Z]{2,4}[+-]?\d*/.test(await p.textContent('.hm-l .hm-sh')), `${tag}: update time with the viewer's zone`);
  }
  await c.close();
}
// 2) keyboard: tabs (aria-selected / tabpanel) and tiles (arrow keys, Enter pins, Esc closes)
{ const { c, p } = await open(1440, 'en');
  await p.focus('[data-hmtf="24h"]'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
  let s = await p.evaluate(() => ({ sel: document.querySelector('[role=tab][aria-selected=true]').dataset.hmtf, foc: document.activeElement.dataset.hmtf, lab: document.querySelector('#hmPanel').getAttribute('aria-labelledby'), roving: [...document.querySelectorAll('[role=tab]')].map((t) => t.tabIndex).join('') }));
  ok(s.sel === '7d' && s.foc === '7d' && s.lab === 'hmtab-7d' && s.roving === '-1-10-1', 'ArrowRight moves to 7D: aria-selected, focus, tabpanel label, roving tabindex');
  await p.keyboard.press('End'); await p.keyboard.press('Home'); await p.waitForTimeout(150); ok(await p.evaluate(() => document.activeElement.dataset.hmtf === '1h'), 'End / Home');
  await p.focus('[data-hmt="0"]'); await p.waitForTimeout(100); ok(await p.isVisible('#hmTip') && /Price/.test(await p.textContent('#hmTip')), 'focusing a tile shows its tooltip (name, price, mcap, volume, changes)');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(100); ok(await p.evaluate(() => document.activeElement.dataset.hmt === '1' && document.activeElement.tabIndex === 0 && document.querySelector('[data-hmt="0"]').tabIndex === -1), 'ArrowRight moves to the next tile');
  await p.keyboard.press('Escape'); ok(!(await p.isVisible('#hmTip')), 'Esc closes the tooltip');
  await p.keyboard.press('Enter'); ok(await p.isVisible('#hmTip'), 'Enter shows it again');
  if (SHOT) await p.locator('.hm-l').screenshot({ path: `${SHOT}/keyboard-tile-tooltip-en-1440.png` });
  await p.click('[data-hmview]'); await p.waitForSelector('.hm-tbl'); ok((await p.$$('#hmPanel tbody tr')).length === FX.coins.length, 'table view lists every coin');
  await p.click('[data-hmsort="c7"]'); const first = await p.evaluate(() => document.querySelector('#hmPanel tbody th').textContent); ok(first.length > 0 && await p.getAttribute('[data-hmsort="c7"]', 'type') === 'button', 'sortable table');
  await p.selectOption('[data-hmgrp]', 'cat'); await c.close(); }
// 3) Simple -> Pro (persists), liquidations unavailable, methodology and limits
{ const { c, p } = await open(1440, 'th');
  await p.click('[data-hmmode="pro"]'); await p.waitForSelector('.hm-meth'); const t = await p.textContent('#hm');
  ok(/Liquidations/.test(t) && /ไม่มีแหล่งข้อมูลทั้งตลาดแบบฟรี/.test(t) && /วิธีคำนวณและข้อจำกัด/.test(t) && /65%/.test(t) && /backtest/.test(t), 'Pro: liquidations unavailable, methodology with overlap and no-backtest limits');
  await p.reload(); await p.waitForSelector('.hm-meth'); ok(true, 'Pro mode persists after reload');
  if (SHOT) await p.screenshot({ path: `${SHOT}/pro-th-1440.png`, fullPage: true }); await c.close(); }
// 4) states
{ const { c, p } = await open(1440, 'th', { delay: 2500, noWait: true }); await p.waitForSelector('.hm-skel'); ok(await p.getAttribute('.hm', 'aria-busy') === 'true', 'loading: skeleton, aria-busy');
  if (SHOT) await p.screenshot({ path: `${SHOT}/state-loading-th-1440.png` }); await p.waitForSelector('.hm-grid', { timeout: 15000 }); ok(true, 'loading -> loaded'); await c.close(); }
{ const { c, p } = await open(390, 'th', { status: 404, wait: '[data-hmretry]' }); ok(/โหลดข้อมูลสุขภาพตลาดไม่สำเร็จ/.test(await p.textContent('#main')), 'error: page-level message with retry');
  if (SHOT) await p.screenshot({ path: `${SHOT}/state-error-th-390.png` });
  await c.unroute(/\/health\.json(\?|$)/); await c.route(/\/health\.json(\?|$)/, (r) => r.fulfill({ contentType: 'application/json', body: fresh() })); await p.click('[data-hmretry]'); await p.waitForSelector('.hm-grid'); ok(true, 'retry loads the page'); await c.close(); }
{ const body = fresh((d) => { d.coins = []; d.categories = []; d.official = { ...d.official, coins: [], n: 0, score: null, band: null, missing: ['universe', 'B', 'M', 'V', 'H', 'P'], comp: { B: null, M: null, V: null, H: null, P: null } }; d.leverage = { ...d.leverage, score: null, band: null, missing: ['F', 'O', 'X'], comp: { F: null, O: null, X: null }, coverage: 0 }; return d; });
  const { c, p, errs } = await open(390, 'en', { body }); const t = await p.textContent('#hm');
  ok(/No coins in this view/.test(t) && /missing: fewer than 90 coins/.test(t) && !errs.length, 'empty: no score, no tiles, no errors');
  ok(!(await layout(p)).doc, 'empty: no overflow'); if (SHOT) await p.screenshot({ path: `${SHOT}/state-empty-en-390.png`, fullPage: true }); await c.close(); }
{ const body = fresh((d) => { const old = Date.now() - 6 * 36e5; d.updated = iso(old); d.sources.cg_markets.at = iso(old); d.leverage.at = iso(old); d.official.day = new Date(Date.now() - 4 * 864e5).toISOString().slice(0, 10); return d; });
  const { c, p } = await open(1440, 'th', { body }); const t = await p.textContent('#hm');
  ok((await p.$$('.hm-chip.stale')).length >= 3 && /ข้อมูลเก่าเกินไป/.test(await p.textContent('.hm-top')) && !(await p.$('.hm-top .hm-big b')), 'stale: stale chips, spot and leverage scores hidden');
  if (SHOT) await p.screenshot({ path: `${SHOT}/state-stale-th-1440.png` }); await c.close(); }
{ const body = fresh((d) => { d.leverage = { ...d.leverage, score: null, band: null, missing: ['F', 'O', 'X'], comp: { F: null, O: null, X: null }, coverage: 0, errors: ['okx oi: HTTP 503', 'hyperliquid: HTTP 503'] }; d.sources.derivatives.errors = d.leverage.errors; return d; });
  const { c, p } = await open(1440, 'en', { body, mode: 'pro' });
  const s = await p.evaluate(() => ({ spot: !!document.querySelector('.hm-top .hm-score:first-child .hm-big b'), lev: document.querySelector('.hm-top .hm-score:last-child').textContent, na: [...document.querySelectorAll('.hm-m')].filter((m) => /Unavailable/.test(m.textContent)).map((m) => m.querySelector('.hm-mh span').textContent) }));
  ok(s.spot && /Unavailable/.test(s.lev) && s.na.join() === 'Open interest (OKX + Hyperliquid),Funding,Liquidations', `one source down: only its cards show Unavailable (${s.na.join(' | ')})`);
  if (SHOT) await p.screenshot({ path: `${SHOT}/state-derivatives-down-en-1440.png` }); await c.close(); }
// 5) real data from the server (no interception): screenshots for release review
if (SHOT) for (const lang of ['en', 'th']) for (const w of [1440, 390, 360]) { const { c, p, errs } = await open(w, lang, { body: null });
  ok(!errs.length, `real data ${lang} ${w}px renders`); await p.screenshot({ path: `${SHOT}/real-${lang}-${w}.png`, fullPage: true });
  if (w < 600) await p.locator('.hm-l').screenshot({ path: `${SHOT}/real-${lang}-${w}-treemap.png` }); await c.close(); }
await b.close(); console.log(`PASS health-ui (${n} checks)`);
