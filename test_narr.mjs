import { chromium } from 'playwright-core';
const U = process.env.U || 'http://localhost:8787/', S = process.env.S || 'shots/n-';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0;
for (const [n, vp, lang, cs] of [['desk-en-dark', { width: 1280, height: 900 }, 'en', 'dark'], ['desk-th-light', { width: 1280, height: 900 }, 'th', 'light'], ['phone-th-light', { width: 390, height: 844 }, 'th', 'light'], ['phone-en-dark', { width: 390, height: 844 }, 'en', 'dark']]) {
  const c = await b.newContext({ viewport: vp, colorScheme: cs, deviceScaleFactor: 2 }); const p = await c.newPage(); const errs = [];
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push('PE ' + e.message));
  await p.addInitScript((l) => { localStorage.setItem('cw-lang', l); }, lang);
  await p.goto(U + '#/narrative'); await p.waitForSelector('.ncard', { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(2500);
  const cards = await p.locator('.ncard').count(), ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  console.log(n, 'cards', cards, 'overflow', ow, 'h1', await p.locator('h1').first().innerText().catch(() => ''), 'ERR', errs.slice(0, 4));
  if (cards < 12 || ow || errs.length) bad++;
  await p.screenshot({ path: S + n + '.png', fullPage: true }); await c.close(); }
await b.close(); process.exit(bad ? 1 : 0);
