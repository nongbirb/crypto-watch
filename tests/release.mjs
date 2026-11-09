// Release test: loads every route + On-chain sub-tabs + Positioning views, fails on page errors / blank tabs.
// Usage: node tests/release.mjs [baseUrl]   (default http://localhost:8787/)
// LIVEJSON=1 serves data JSON from the live site (except files listed in KEEP) so local code is checked against live data.
import { chromium, webkit } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || 'http://localhost:8787/', LIVE = 'https://nongbirb.github.io/crypto-watch/';
const KEEP = (process.env.KEEP || '').split(',').filter(Boolean), SHOT = process.env.SHOT || '', ENG = (process.env.ENGINES || 'chromium,webkit').split(',');
const ROUTES = ['markets', 'events', 'narrative', 'portfolio', 'onchain/chains', 'onchain/flows', 'onchain/health', 'screener', 'smart', 'watchlist', 'calendar', 'journal', 'reports', 'learn', 'settings'];
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
    // v41 journal tests: migration of an old trade, spot P&L with fees, summary totals, manual-price trade
    cur = 'journal-tests';
    await p.goto(B + '#/settings'); await p.waitForTimeout(800);
    await p.evaluate(() => { localStorage.setItem('cw-jview', '"all"'); localStorage.setItem('cw-journal', JSON.stringify([
      { id: 'old1', token: 'BTC', side: 'long', entry: 100, size: 50, date: '2026-10-01', close: 110, notes: 'old v1 trade' },
      { id: 'sp1', kind: 'spot', token: 'BTC', cg: 'bitcoin', side: 'long', entry: 100, qty: 2, feeIn: 1, feeOut: 1.5, date: '2026-10-02', close: 120, cdate: '2026-10-05' },
      { id: 'mn1', kind: 'spot', token: 'ZZZ', cg: 'zzz-not-a-coin', side: 'long', entry: 1, qty: 10, date: '2026-10-03', manual: true },
      { id: 'pp1', kind: 'perp', token: 'SOL', side: 'short', entry: 200, margin: 100, lev: 5, feeIn: 2, date: '2026-10-04', close: 190, cdate: '2026-10-06' }])); });
    await p.goto(B + '#/journal'); await p.waitForTimeout(2500);
    const J = await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('cw-journal')); const g = (id) => st.find((x) => x.id === id); const a = JR(); const s = jStats(a);
      return { old: g('old1'), sp: tradePnl(a.find((x) => x.id === 'sp1')).pnl, pp: tradePnl(a.find((x) => x.id === 'pp1')).pnl, mn: tradePnl(a.find((x) => x.id === 'mn1')).pnl, realized: s.realized, excl: s.excl,
        sumParts: jStats(a.filter((x) => x.kind === 'perp')).realized + jStats(a.filter((x) => x.kind === 'spot')).realized, text: document.querySelector('#main').textContent,
        imp: (() => { const n = importJData({ app: 'kms-capital', version: 1, trades: [{ id: 'imp1', token: 'BTC', side: 'long', entry: 50, size: 10, date: '2026-09-01' }] }); const r = JR().find((x) => x.id === 'imp1'); return n === 1 && r.kind === 'perp' && r.feeIn === 0; })() }; });
    const ok = (c, m) => { if (!c) fails.push(`${eng}/${nm} journal ${m}`); };
    ok(J.old && J.old.kind === 'perp' && J.old.feeIn === 0 && J.old.feeOut === 0 && J.old.margin === 50 && J.old.lev === 1 && J.old.notes === 'old v1 trade', 'migration ' + JSON.stringify(J.old));
    ok(Math.abs(J.sp - 37.5) < 1e-9, 'spot pnl ' + J.sp); ok(Math.abs(J.pp - 23) < 1e-9, 'perp pnl ' + J.pp); ok(J.mn === null && J.excl === 1, 'manual trade ' + J.mn + ' excl ' + J.excl);
    ok(Math.abs(J.realized - 65.5) < 1e-9 && Math.abs(J.sumParts - J.realized) < 1e-9, 'summary ' + J.realized + ' vs parts ' + J.sumParts);
    ok(/\+\$65\.50/.test(J.text) && /excludes 1 trade without a price/.test(J.text) && /across all trade types/.test(J.text), 'summary text'); ok(J.imp, 'import v1');
    await p.click('[data-jf="open"]'); await p.waitForTimeout(300); ok(/manual/.test(await p.textContent('#main')), 'manual tag');
    await p.click('[data-jv="spot"]'); await p.waitForTimeout(300); ok(!(await p.$('[data-jedit="pp1"]')), 'spot view shows perp');
    await p.click('[data-jv="perp"]'); await p.waitForTimeout(300); await p.locator('[data-jnew]:visible').first().click(); await p.waitForTimeout(800);
    ok(await p.isVisible('#jform [name="margin"]') && await p.isVisible('#jform [data-lev="10"]') && !(await p.isVisible('#jform [name="qty"]')), 'perp form');
    await p.click('#jform [data-jk="spot"]'); await p.waitForTimeout(200); ok(await p.isVisible('#jform [name="qty"]') && !(await p.isVisible('#jform [name="margin"]')), 'spot form');
    await p.fill('#jform [name="entry"]', '50'); await p.fill('#jform [name="usdsz"]', '200'); ok((await p.inputValue('#jform [name="qty"]')) === '4', 'usd->qty');
    if (SHOT) await p.screenshot({ path: `${SHOT}-${eng}-${nm}-jform.png` });
    await p.keyboard.press('Escape'); await p.click('[data-jv="all"]'); await p.waitForTimeout(300); if (SHOT) await p.screenshot({ path: `${SHOT}-${eng}-${nm}-journal.png`, fullPage: true });
    await p.evaluate(() => localStorage.removeItem('cw-journal'));
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
