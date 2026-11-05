import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const c = await b.newContext({ serviceWorkers: 'block' }); const p = await c.newPage(); const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.route('**/min/extra.js*', (r) => r.abort());
await p.goto('http://localhost:8787/#/screener'); await p.waitForTimeout(4000);
console.log(JSON.stringify({ errs, txt: (await p.textContent('#main')).slice(0, 80) })); await b.close();
