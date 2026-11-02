import { chromium } from 'playwright-core';
const U = process.env.U || 'http://localhost:8787/', P = process.env.S || 'shots/m1-';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const [n, vp, sym, lang] of [['desk', { width: 1440, height: 900 }, 'MON', 'en'], ['phone', { width: 390, height: 844 }, 'MON', 'th'], ['desk-btc', { width: 1440, height: 900 }, 'BTC', 'en']]) {
  const c = await b.newContext({ viewport: vp, colorScheme: 'dark', deviceScaleFactor: 2 }); const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(([s, l]) => { localStorage.setItem('cw-sel', s); localStorage.setItem('cw-lang', l); }, [sym, lang]);
  await p.goto(U); await p.waitForSelector('[data-tab="lev"]', { timeout: 60000 }); await p.click('[data-tab="lev"]');
  await p.waitForSelector('.lev .lkv', { timeout: 90000 }).catch(() => console.log('no lev'));
  await p.waitForTimeout(1500);
  console.log('==', n, sym, (await p.locator('.lkv').innerText().catch(() => '')).replace(/\n/g, ' | '));
  console.log('FT', (await p.locator('.ftab').innerText().catch(() => '')).replace(/\n/g, ' | '), '| VEN', (await p.locator('.venues').innerText().catch(() => '')).replace(/\n/g, ' '));
  console.log('SUBS', await p.$$eval('.lev .chartbar .sub', (a) => a.map((x) => x.innerText)), 'FB', await p.$$eval('#lvF i', (a) => a.length + ' ' + (a[a.length - 1] || {}).title));
  await p.locator('.lkv').screenshot({ path: P + n + '-cards.png' }); await p.locator('.lev .two.sec').first().screenshot({ path: P + n + '-charts.png' }); await p.locator('.lev .two.sec').nth(1).screenshot({ path: P + n + '-venues.png' });
  console.log('ERR', errs); await c.close(); }
await b.close();
