import { chromium } from 'playwright-core';
const U = process.env.U || 'http://localhost:8787/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const sizes = [['1440x900', 1440, 900], ['1920x1080', 1920, 1080], ['2560x1440', 2560, 1440], ['3440x1440', 3440, 1440], ['phone', 390, 844]];
for (const [n, w, h] of sizes) {
  const c = await b.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark', deviceScaleFactor: 1, isMobile: n === 'phone', hasTouch: n === 'phone' });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(U + '#/onchain/flows'); await p.waitForSelector('.ixn', { timeout: 30000 }); await p.waitForTimeout(3500);
  const m = await p.evaluate(() => { const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; }; return { map: r('#ixMap'), grid: r('.ixgrid'), nav: [...document.querySelectorAll('#sideNav a, .tabbar a')].some((a) => /portfolio/.test(a.getAttribute('href') || '')) }; });
  console.log(n, JSON.stringify(m), 'errors', errs);
  await p.screenshot({ path: `shots/i3-${n}.png` });
  if (n === '1920x1080' || n === 'phone') { await p.goto(U + '#/onchain/chains'); await p.waitForSelector('table.ov', { timeout: 30000 }); await p.waitForTimeout(1500);
    const v = await p.evaluate(() => { const hs = [...document.querySelectorAll('table.ov th')].map((t) => t.textContent); const i = hs.findIndex((t) => t.includes('Net flow 24h')); return [...document.querySelectorAll('table.ov tbody tr')].map((r) => r.cells[0].innerText.split('\n')[0] + '=' + r.cells[i].innerText); });
    console.log('chains', v.join(' | ')); await p.screenshot({ path: `shots/i3-chains-${n}.png`, fullPage: n !== 'phone' }); }
  await c.close();
}
await b.close();
