import { chromium } from 'playwright-core';
const URL = process.argv[2] || 'http://localhost:8787/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const cases = JSON.parse(process.argv[3] || '[]');
for (const [w, h, lang, scheme, sym, tf, out] of cases) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w > 1000 ? 1 : 2, isMobile: w < 600, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.addInitScript((l) => { localStorage.setItem('cw-lang', l); }, lang);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack||'').split('\n').slice(3,14).join(' | '))); p.on('console', (m) => m.type() === 'error' && errs.push('c:' + m.text().slice(0, 120)));
  await p.goto(URL + '#/markets'); await p.waitForTimeout(4000);
  await p.click(`[data-sel="${sym}"][data-chip]`).catch((e) => errs.push('nochip')); await p.waitForTimeout(1500);
  await p.click('[data-tab="pat"]'); await p.waitForTimeout(500);
  if (tf !== '1d') await p.click(`[data-ptf="${tf}"]`);
  await p.waitForSelector('.pcard, .pempty, #patBody .err', { timeout: 20000 }).catch(() => errs.push('timeout'));
  await p.waitForTimeout(1200);
  const info = await p.$$eval('.pcard', (c) => c.map((x) => x.querySelector('.pc-h').innerText.replace(/\n/g, ' ')));
  await p.screenshot({ path: out, fullPage: w < 1000 });
  console.log(w, lang, scheme, sym, tf, JSON.stringify(info), (await p.$eval('#patSrc', (e) => e.innerText).catch(() => '')), 'errs', errs);
  await ctx.close();
}
await b.close();
