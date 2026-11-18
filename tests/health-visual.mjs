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

const fix = { ...H, coins: H.coins.map((c, i) => ({ ...c, img: i % 7 === 3 ? null : 'icons/tokens/btc.png' })) }; // every 7th coin without a logo -> letter
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
  ok(/20%/.test(g.legend), `${tag} legend explains the 20% cap`);
  ok(g.gauges.length === 2 && g.gauges.every((x) => /\d+ \/ 100 · \S/.test(x)), `${tag} two gauges with number and band: ${g.gauges.join(' | ')}`);
  ok(g.bars.length === 2 && g.bars.every((x) => { const m = x.match(/\d+/g).map(Number); return m[0] + m[1] + m[2] === m[3]; }), `${tag} breadth bars add up: ${g.bars.join(' | ')}`);
  ok(g.hist, `${tag} score history chart vs BTC`);
  ok(g.ow <= 0, `${tag} no sideways scroll (${g.ow})`);
  // details on hover (desktop) / tap (phone)
  const t = p.locator('.hm-t').nth(7); await t.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); if (w < 768) await t.click(); else await t.hover(); await p.waitForTimeout(300);
  const tip = await p.evaluate(() => { const x = document.querySelector('#hmTip'); return x && !x.hidden ? x.innerText : ''; });
  ok(/\$/.test(tip) && /24h/.test(tip), `${tag} ${w < 768 ? 'tap' : 'hover'} shows the coin's details: ${tip.split('\n')[0]}`);
  ok(!errs.length, `${tag} no page errors ${errs[0] || ''}`);
  await p.close();
}
await b.close();
console.log(`PASS health-visual: ${n} checks (20% cap, monotone sizes, logo tiles, gauges, breadth bars, history vs BTC, hover/tap details)`);
