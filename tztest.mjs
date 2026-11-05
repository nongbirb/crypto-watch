import { chromium } from 'playwright-core';
const URL = process.argv[2] || 'http://localhost:8787/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const tz of ['Asia/Bangkok', 'America/New_York', 'Asia/Tokyo']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, timezoneId: tz, colorScheme: 'dark', serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push('c:' + m.text().slice(0, 100)));
  await p.goto(URL + '#/calendar'); await p.waitForTimeout(5000);
  await p.click('[data-cv="list"]').catch(() => {}); await p.waitForTimeout(500);
  const rows = await p.$$eval('.erow', (r) => r.slice(0, 6).map((x) => x.innerText.replace(/\n/g, ' | ').slice(0, 110)));
  console.log(tz, await p.$eval('.page .sub', (e) => e.innerText).catch(() => ''), '\n ', rows.join('\n  '));
  if (tz === 'Asia/Bangkok') await p.screenshot({ path: 'shots/tz-calendar-bangkok.png' });
  for (const r of ['markets', 'narrative', 'news', 'screener', 'onchain']) { await p.goto(URL + '#/' + r); await p.waitForTimeout(2500); }
  console.log(' upd', await p.$eval('#ocUpd', (e) => e.innerText).catch(() => '-'), 'errs', errs);
  await ctx.close();
}
await b.close();
