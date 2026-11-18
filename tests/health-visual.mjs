// v64 Market Health visuals, in node + Chromium:
//  - tile sizes: market cap compressed by a power so the largest coin is exactly 20% of the map; bigger coin = bigger tile (monotone);
//  - logo-only tiles (logo, or the first letter when there is no logo), % only on tiles big enough, details on hover / tap / focus;
//  - two half-circle gauges with the number and band in words; breadth bars for 24h and 7 days that add up to the coin count;
//  - score history chart vs BTC once two days are logged; no sideways scroll at 360 / 390 / 1440, EN + TH.
// Uses the repo's real health.json and history.json; logos are pointed at a local icon so the test needs no network.
// Usage: node tests/health-visual.mjs [baseUrl]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };

// ---- sizing maths (the function from health.js, evaluated in isolation) ----
const src = fs.readFileSync('health.js', 'utf8'), fn = src.slice(src.indexOf('const HM_CAP'), src.indexOf('function hmGroups'));
const { hmCapSizes, HM_CAP } = new Function(fn + '; return { hmCapSizes, HM_CAP };')();
const H = JSON.parse(fs.readFileSync('health.json', 'utf8')), mc = H.coins.map((c) => c.mc || 0), sz = hmCapSizes(mc), T = sz.reduce((a, x) => a + x, 0);
ok(Math.abs(Math.max(...sz) / T - HM_CAP) < 0.002, `largest tile is ${(100 * Math.max(...sz) / T).toFixed(1)}% of the map (cap ${HM_CAP * 100}%)`);
const ord = mc.map((m, i) => [m, sz[i]]).sort((a, b) => b[0] - a[0]); ok(ord.every((x, i) => !i || x[1] <= ord[i - 1][1] + 1e-6), 'bigger market cap always gets a bigger tile');
ok(Math.abs(T - mc.reduce((a, x) => a + x, 0)) / T < 1e-9, 'sizes keep the same total as the market caps');
ok(JSON.stringify(hmCapSizes([3, 3, 3, 3, 3, 3])) === JSON.stringify([3, 3, 3, 3, 3, 3]), 'no compression when no coin is over the cap (each 16.7%)');

const NOW = new Date().toISOString(), fresh = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, v && typeof v === 'object' && 'at' in v ? { ...v, at: NOW } : v]));
// every 7th coin without a logo -> letter; timestamps set to now so the real file's age never hides a gauge (stale data has its own test in health-ui)
const fix = { ...H, sources: fresh(H.sources), leverage: { ...H.leverage, at: NOW }, coins: H.coins.map((c, i) => ({ ...c, img: i % 7 === 3 ? null : 'icons/tokens/btc.png' })) };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const [w, h, lang] of [[1440, 1000, 'en'], [390, 844, 'th'], [360, 780, 'en']]) {
  const tag = `${w}-${lang}`, p = await b.newPage({ viewport: { width: w, height: h } }), errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route('**/health.json*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(fix) }));
  await p.goto(B + 'index.html#/breadth'); await p.evaluate((l) => { localStorage.clear(); localStorage.setItem('cw-lang', l); }, lang); await p.reload();
  await p.waitForSelector('.hm-t', { timeout: 60000 }); await p.waitForTimeout(1500);
  const g = await p.evaluate(() => { const t = [...document.querySelectorAll('.hm-t')], m = document.querySelector('[data-hmmap]').getBoundingClientRect(), A = m.width * m.height, ar = (x) => { const r = x.getBoundingClientRect(); return r.width * r.height; };
    const lab = (s) => t.find((x) => x.getAttribute('aria-label').startsWith(s + ' '));
    return { tiles: t.length, btc: ar(lab('BTC')) / A, eth: ar(lab('ETH')) / A, text: t.filter((x) => x.querySelector('b')).length, logo: t.filter((x) => x.querySelector('img')).length, ini: t.filter((x) => x.querySelector('.hm-ini')).length,
      gauges: [...document.querySelectorAll('.hm-gauge svg')].map((s) => s.getAttribute('aria-label')), bars: [...document.querySelectorAll('.hm-bar')].map((x) => x.getAttribute('aria-label')),
      hist: !!document.querySelector('.hm-hc'), ow: document.documentElement.scrollWidth - innerWidth, legend: (document.querySelector('.hm-legend') || {}).textContent || '' }; });
  ok(g.tiles === H.coins.length, `${tag} ${g.tiles} tiles, each coin once`);
  ok(g.btc > 0.15 && g.btc < 0.22 && g.eth < g.btc, `${tag} BTC tile ${(g.btc * 100).toFixed(1)}% of the map (layout gaps make it a little under 20%), ETH ${(g.eth * 100).toFixed(1)}%`);
  ok(g.text === 0, `${tag} no coin names on the tiles (logos only)`);
  ok(g.logo > 10 && g.ini > 0, `${tag} logos (${g.logo}) and a letter where a coin has no logo (${g.ini})`);
  ok(!g.legend, `${tag} no explanatory legend under the map (v68: clean)`);
  ok(g.gauges.length === 2 && g.gauges.every((x) => /\d+ \/ 100 · \S/.test(x)), `${tag} two gauges with number and band: ${g.gauges.join(' | ')}`);
  ok(g.bars.length === 2 && g.bars.every((x) => { const m = x.match(/\d+/g).map(Number); return m[0] + m[1] + m[2] === m[3]; }), `${tag} breadth bars add up: ${g.bars.join(' | ')}`);
  ok(g.hist, `${tag} score history chart vs BTC`);
  await p.waitForLoadState('networkidle').catch(() => {}); // the page redraws once the score history arrives
  { const k = w < 768 ? 'd7:u' : 'h24:d', el = await p.$(`.hm-brl [data-hmbr="${k}"]`); await el.evaluate((e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(200); if (w < 768) await el.tap(); else await (await p.$(`.hm-bar [data-hmbr="${k}"]`)).hover(); await p.waitForTimeout(400);
    const L = await p.evaluate((k) => { const pop = document.querySelector('#hmBrPop'), v = [...pop.querySelectorAll('li .num')].map((x) => parseFloat(x.textContent.replace('−', '-'))), n = +(document.querySelector(`.hm-brl [data-hmbr="${k}"]`).textContent.match(/\d+/) || [0])[0], r = pop.getBoundingClientRect();
      return { open: !pop.hidden, v, n, head: pop.querySelector('.hm-brph b').textContent, inView: r.left >= 0 && r.right <= innerWidth + 1, scroll: getComputedStyle(pop.querySelector('.hm-brlist') || pop).overflowY }; }, k);
    const sorted = L.v.every((x, i) => !i || (k.endsWith(':u') ? x <= L.v[i - 1] : x >= L.v[i - 1]));
    ok(L.open && L.v.length === L.n && sorted && L.inView && L.scroll === 'auto', `${tag} ${w < 768 ? 'tap' : 'hover'} on "${k}" lists all ${L.n} coins, ${k.endsWith(':u') ? 'biggest gain' : 'biggest loss'} first (${L.v.slice(0, 3).join(', ')}): ${L.head}`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await p.evaluate(() => document.querySelector('#hmBrPop').hidden), `${tag} Escape closes the list`);
    if (w < 768) await p.mouse.move(1, 1); }
  ok(g.ow <= 0, `${tag} no sideways scroll (${g.ow})`);
  // details on hover (desktop) / tap (phone)
  const t = p.locator('.hm-t').nth(7); await t.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); if (w < 768) await t.click(); else await t.hover(); await p.waitForTimeout(300);
  const tip = await p.evaluate(() => { const x = document.querySelector('#hmTip'); return x && !x.hidden ? x.innerText : ''; });
  ok(/\$/.test(tip) && /24h/.test(tip), `${tag} ${w < 768 ? 'tap' : 'hover'} shows the coin's details: ${tip.split('\n')[0]}`);
  // v68 map controls: Group by Performance (bands in order, every coin once), Show losers = the breadth "down" count, Size equal
  { await p.selectOption('[data-hmgrp]', 'perf'); await p.waitForTimeout(500);
    const pf = await p.evaluate(() => ({ bands: [...document.querySelectorAll('.hm-g span')].map((x) => x.textContent), tiles: document.querySelectorAll('.hm-t').length, n: HM.d.coins.filter((c) => c.mc > 0 && c.c24 != null).length,
      tops: [...document.querySelectorAll('.hm-g')].map((x) => parseFloat(x.style.top) + parseFloat(x.style.left) * 1000) }));
    const order = ['▲ ≥', '▲ +0.5', '± 0.5', '▼ −0.5', '▼ ≤'], idx = pf.bands.map((b) => order.findIndex((o) => b.startsWith(o)));
    ok(idx.every((x, i) => x >= 0 && (!i || x > idx[i - 1])) && pf.tiles === pf.n && pf.tops.every((x, i) => !i || x > pf.tops[i - 1]), `${tag} Performance: bands in order ${pf.bands.join(' | ')}, ${pf.tiles} coins`);
    await p.click('[data-hmshow="dn"]'); await p.waitForTimeout(400);
    const dn = await p.evaluate(() => ({ t: document.querySelectorAll('.hm-t').length, d: HMB.lists.h24.d.length }));
    ok(dn.t === dn.d, `${tag} Show losers: ${dn.t} tiles = ${dn.d} coins down in 24h`);
    await p.click('[data-hmshow="all"]'); await p.selectOption('[data-hmsize]', 'eq'); await p.selectOption('[data-hmgrp]', 'none'); await p.waitForTimeout(500);
    const eq = await p.evaluate(() => { const a = [...document.querySelectorAll('.hm-t')].map((x) => x.offsetWidth * x.offsetHeight); return Math.max(...a) / Math.min(...a); });
    ok(eq < 1.6, `${tag} Size equal, no groups: tiles within ${eq.toFixed(2)}× of each other`);
    await p.selectOption('[data-hmsize]', 'mcap'); await p.selectOption('[data-hmgrp]', 'mcap'); await p.waitForTimeout(300); }
  ok(!errs.length, `${tag} no page errors ${errs[0] || ''}`);
  await p.close();
}
await b.close();
console.log(`PASS health-visual: ${n} checks (20% cap, monotone sizes, logo tiles, gauges, breadth bars, history vs BTC, hover/tap details)`);
