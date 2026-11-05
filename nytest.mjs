import { chromium } from 'playwright-core';
const B = process.env.B;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (let run = 0; run < 2; run++) {
const c = await b.newContext({ timezoneId: 'America/New_York', viewport: { width: 1280, height: 1300 }, serviceWorkers: 'block' });
const p = await c.newPage(); let step = 'load';
p.on('pageerror', (e) => console.log(run, step, e.message, (e.stack||'').split('\n').slice(1,4).join(' | ')));
await p.goto(B + '#/markets'); await p.waitForTimeout(5000);
for (const [s, sel] of [['plan','[data-tab="plan"]'],['4H','[data-tf="4H"]'],['1D','[data-tf="1D"]'],['pat','[data-tab="pat"]'],['p1h','[data-ptf="1h"]'],['p4h','[data-ptf="4h"]'],['p1d','[data-ptf="1d"]'],['p1w','[data-ptf="1w"]'],['lev','[data-tab="lev"]']]) { step = s; await p.click(sel).catch(()=>{}); await p.waitForTimeout(3000); }
await c.close(); }
await b.close();
