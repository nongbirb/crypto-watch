// Release test: loads every route + On-chain sub-tabs + Positioning views, fails on page errors / blank tabs.
// Usage: node tests/release.mjs [baseUrl]   (default http://localhost:8787/)
// LIVEJSON=1 serves data JSON from the live site (except files listed in KEEP) so local code is checked against live data.
import { chromium, webkit } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || 'http://localhost:8787/', LIVE = 'https://nongbirb.github.io/crypto-watch/';
const KEEP = (process.env.KEEP || '').split(',').filter(Boolean), SHOT = process.env.SHOT || '', ENG = (process.env.ENGINES || 'chromium,webkit').split(',');
const ROUTES = ['markets', 'portfolio', 'onchain/chains', 'onchain/flows', 'onchain/health', 'screener', 'smart', 'watchlist', 'calendar', 'journal', 'reports', 'learn', 'settings'];
const fails = [];
for (const eng of ENG) {
  let br; try { br = eng === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); }
  catch (e) { console.log(`SKIP ${eng}: ${e.message.split('\n')[0]}`); continue; }
  for (const [vp, nm] of eng === 'webkit' ? [[{ width: 390, height: 844 }, 'iphone']] : [[{ width: 1440, height: 1000 }, 'desktop'], [{ width: 390, height: 844 }, 'phone']]) {
    const c = await br.newContext({ viewport: vp, serviceWorkers: 'block', ...(nm === 'iphone' ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' } : {}) });
    if (process.env.LIVEJSON) await c.route(/\/[a-z_]+\.json(\?|$)/, async (r) => { const f = new URL(r.request().url()).pathname.split('/').pop(); if (KEEP.includes(f) || !r.request().url().startsWith(B)) return r.continue(); const res = await fetch(LIVE + f + '?t=' + Date.now()).catch(() => null); res && res.ok ? r.fulfill({ status: 200, contentType: 'application/json', body: await res.text() }) : r.continue(); });
    const p = await c.newPage(); let cur = '';
    p.on('pageerror', (e) => fails.push(`${eng}/${nm} ${cur} PAGEERROR ${e.message}`));
    for (const r of ROUTES) {
      cur = r; await p.goto(B + '#/' + r); await p.waitForTimeout(r.startsWith('onchain') ? 7000 : 3500);
      const t = (await p.textContent('#main').catch(() => '')) || '';
      if (t.trim().length < 40) fails.push(`${eng}/${nm} ${r} BLANK`);
      if (/undefined is not an object|Cannot read properties|is not a function|TypeError/.test(t)) fails.push(`${eng}/${nm} ${r} ERROR-TEXT ${t.match(/.{0,60}(undefined is not|Cannot read|TypeError).{0,60}/)?.[0]}`);
      const na = await p.$$eval('.cardna', (x) => x.length).catch(() => 0); if (na) console.log(`note ${eng}/${nm} ${r}: ${na} card(s) show 'data unavailable'`);
      if (SHOT && /onchain/.test(r)) await p.screenshot({ path: `${SHOT}-${eng}-${nm}-${r.replace('/', '-')}.png`, fullPage: false });
    }
    cur = 'positioning'; await p.goto(B + '#/markets'); await p.waitForTimeout(4000);
    for (const s of ['BTC', 'SOL', 'NEAR', 'HYPE', 'MON', 'AAVE']) {
      cur = 'pos ' + s; if (!(await p.$(`[data-sel="${s}"]`))) { console.log('no row', s); continue; }
      await p.click(`[data-sel="${s}"]`); await p.waitForTimeout(600); await p.click('[data-tab="pos"]'); await p.waitForTimeout(2500);
      await p.click('[data-potab="chain"]'); if (!(await p.waitForSelector('#poBody .pogrid', { timeout: 20000 }).catch(() => null))) { fails.push(`${eng}/${nm} pos ${s} no on-chain grid`); continue; }
      await p.waitForTimeout(1500);
      if (SHOT) for (let i = 0; i < 3; i++) { try { await p.locator('.pos').scrollIntoViewIfNeeded({ timeout: 5000 }); await p.waitForTimeout(300); await p.locator('.pos').screenshot({ path: `${SHOT}-${eng}-${nm}-pos-${s}.png`, timeout: 8000 }); break; } catch { await p.waitForTimeout(1500); } }
      if (nm === 'desktop') console.log(`pos ${s}:`, ((await p.textContent('#poBody')) || '').replace(/\s+/g, ' ').slice(0, 700));
    }
    await c.close();
  }
  await br.close();
}
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS'); process.exit(fails.length ? 1 : 0);
