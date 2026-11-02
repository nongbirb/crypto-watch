import { chromium } from 'playwright-core';
const U = process.env.U || 'http://localhost:8787/', S = process.env.S || 'shots/w4-flows-after-';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const [n, vp] of [['phone', { width: 390, height: 844 }], ['desk', { width: 1440, height: 900 }]]) {
  const c = await b.newContext({ viewport: vp, colorScheme: 'dark', deviceScaleFactor: 2 }); const p = await c.newPage();
  await p.addInitScript(() => { localStorage.setItem('cw-lang', 'en'); localStorage.setItem('cw-theme-v', 'dark'); });
  await p.goto(U + '#/onchain/flows');

  await p.waitForSelector('#sankey svg .node', { timeout: 60000 }).catch(() => console.log('no sankey')); await p.waitForTimeout(1500);
  await p.locator('#sankey').scrollIntoViewIfNeeded(); await p.locator('#sankey').screenshot({ path: S + n + '.png' }); console.log(n, await p.locator('#sankey').boundingBox());
  await c.close(); }
await b.close();
