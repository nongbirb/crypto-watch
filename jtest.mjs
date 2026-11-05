import { chromium } from 'playwright-core';
const URL = process.argv[2] || 'http://localhost:8787/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const J = [{ id: 't10', token: 'HYPE', side: 'long', entry: 30, margin: 100, lev: 10, size: 1000, date: '2026-11-01', close: 33, notes: '10x test' },
  { id: 'old', token: 'MON', side: 'long', entry: 0.01668, size: 300, date: '2026-11-03', close: 0.01712, notes: '' }];
for (const [n, vp, m] of [['phone', { width: 390, height: 844 }, true], ['desk', { width: 1440, height: 900 }, false]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: m, hasTouch: m, colorScheme: 'dark' });
  await ctx.addInitScript((j) => { localStorage.setItem('cw-journal', j); }, JSON.stringify(J));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '#/journal'); await p.waitForTimeout(6000);
  await p.click('[data-jf="closed"]').catch(()=>{}); await p.waitForTimeout(400);
  console.log(n, await p.$$eval('.jrow', (r) => r.map((x) => x.innerText.replace(/\n/g, ' | '))), await p.$eval('.jstats', (e) => e.innerText.replace(/\n/g, ' ')));
  await p.click('[data-jedit="t10"]'); await p.waitForTimeout(800);
  console.log(n, 'calc', await p.$eval('#jcalc', (e) => e.innerText.replace(/\n/g, ' ')), await p.$eval('#jlive', (e) => e.textContent));
  await p.screenshot({ path: `shots/live-journal-edit-${n}.png` });
  await p.selectOption('#jform select[name=token]', 'MON'); await p.waitForTimeout(2500);
  console.log(n, 'after MON entry', await p.$eval('#jform [name=entry]', (e) => e.value), await p.$eval('#jlive', (e) => e.textContent));
  console.log('errs', errs); await ctx.close();
}
await b.close();
