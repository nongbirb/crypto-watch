import { chromium } from 'playwright-core';
const U = process.env.U || 'http://localhost:8787/', S = process.env.S || 'shots/i2-';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const [n, vp, th, lang] of [['desk', { width: 1440, height: 900 }, 'dark', 'en'], ['phone', { width: 390, height: 844 }, 'dark', 'en'], ['desk-light-th', { width: 1440, height: 900 }, 'light', 'th']]) {
  const c = await b.newContext({ viewport: vp, colorScheme: th, deviceScaleFactor: 1.5 }); const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.addInitScript(([l]) => { localStorage.setItem('cw-lang', l); }, [lang]);
  await p.goto(U + '#/onchain/flows'); await p.waitForSelector('.ixn', { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.screenshot({ path: S + n + '.png' });
  const st = await p.$$eval('.ixbox b', (e) => e.slice(0, 4).map((x) => x.textContent)); console.log(n, 'stats', st, 'upd', await p.textContent('#ocUpd'));
  await p.click('[data-ixn="monad"]'); await p.waitForTimeout(800);
  await p.screenshot({ path: S + n + '-selected.png' });
  console.log(n, 'monad', (await p.$$eval('#ixSel .ixkv', (e) => e.slice(0, 12).map((x) => x.textContent.trim()))).join(' | '));
  if (n === 'desk') { await p.click('[data-ixn="ethereum"]'); await p.waitForTimeout(800); await p.screenshot({ path: S + n + '-pair.png' }); console.log('pair', (await p.$$eval('#ixSel .ixkv', (e) => e.slice(0, 8).map((x) => x.textContent.trim()))).join(' | '));
    await p.locator('#ixTbl').scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await p.screenshot({ path: S + n + '-table.png' });
    const cv = await p.$eval('#ixMap canvas', (c) => { const r = c.getBoundingClientRect(), m = c.parentElement.getBoundingClientRect(); return [r.top - m.top, r.height - m.height, getComputedStyle(c.parentElement).overflow]; }); console.log('canvas vs map', cv);
    await p.click('summary'); await p.click('[data-ixc="ethereum"]'); await p.waitForTimeout(500); console.log('filtered', await p.$$eval('.ixbox b', (e) => e.slice(0, 3).map((x) => x.textContent))); }
  console.log(n, 'errors', errs); await c.close(); }
await b.close();
