import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const [w,h,mob] of [[390,844,true],[2560,1440,false]]) {
  const ctx = await b.newContext({ viewport: {width:w,height:h}, deviceScaleFactor: mob?2:1, isMobile: mob, hasTouch: mob, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto('http://localhost:8787/#/calendar'); await p.waitForSelector('.grid'); await p.waitForTimeout(1500);
  await p.screenshot({ path: `shots/cal2-${w}.png` });
  await p.click('[data-day="2026-11-24"]'); await p.waitForTimeout(1200);
  await p.screenshot({ path: `shots/cal2-${w}-pick.png` });
  console.log(w, errs, await p.$$eval('.crow.hl', x=>x.length));
  await ctx.close();
}
await b.close();
