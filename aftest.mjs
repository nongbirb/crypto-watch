import { chromium } from 'playwright-core';
const B = process.env.B || 'http://localhost:8787/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const out = [];
for (const [tz, w, lang, theme] of [['Asia/Tokyo', 1440, 'en', 'dark'], ['Asia/Bangkok', 1440, 'th', 'light'], ['America/New_York', 390, 'en', 'light'], ['Asia/Tokyo', 390, 'th', 'dark'], ['America/New_York', 1440, 'th', 'dark'], ['Asia/Bangkok', 390, 'en', 'dark']]) {
  const c = await b.newContext({ timezoneId: tz, viewport: { width: w, height: w < 500 ? 844 : 1100 }, serviceWorkers: 'block' });
  await c.addInitScript(([l, t]) => { localStorage.setItem('cw-lang', l); localStorage.setItem('cw-theme-v', t); localStorage.setItem('cw-theme', t); localStorage.setItem('cw-sel', 'MON'); }, [lang, theme]);
  const p = await c.newPage(); const errs = []; const tag = `${w}-${lang}-${theme}-${tz.split('/')[1]}`;
  p.on('pageerror', (e) => errs.push('PE ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await p.goto(B + '#/markets'); await p.waitForTimeout(6000);
  await p.click('[data-tab="lev"]'); await p.waitForTimeout(9000);
  const lev = await p.evaluate(() => { const e = document.querySelector('.lvcap'); return e ? e.textContent : null; });
  await p.locator('#lvH').scrollIntoViewIfNeeded().catch(() => {}); await p.screenshot({ path: `shots/af-lev-${tag}.png` });
  await p.click('[data-tab="pat"]'); await p.waitForTimeout(9000);
  await p.evaluate(() => { const d = document.querySelector('.pmeth'); if (d) d.open = true; const c = document.querySelector('.pc-h'); });
  const pat = await p.evaluate(() => ({ score: [...document.querySelectorAll('.pc-c')].map((x) => x.textContent), bt: (document.querySelector('.pbt') || {}).textContent || null, table: !!document.querySelector('.pbtt'), pct: /\d+%\s*(pattern score|คะแนน)/.test(document.body.innerText) }));
  await p.screenshot({ path: `shots/af-pat-${tag}.png`, fullPage: true });
  await p.goto(B + '#/smart'); await p.waitForTimeout(12000);
  await p.click('[data-smsel="MON"]').catch((e) => errs.push('mon ' + e.message)); await p.waitForTimeout(1500);
  const sm = await p.evaluate(() => ({ warn: !!document.querySelector('.smwarn'), alevTh: [...document.querySelectorAll('.smp th')].map((x) => x.textContent).filter((t) => /Acct|บัญชี/.test(t)), alev: [...document.querySelectorAll('.smp tbody tr')].slice(0, 3).map((r) => r.children[2] && r.children[2].textContent), sw: document.documentElement.scrollWidth, iw: innerWidth }));
  await p.screenshot({ path: `shots/af-sm-${tag}.png`, fullPage: true });
  for (const r of ['markets', 'onchain/chains', 'onchain/flows', 'screener', 'calendar', 'journal', 'reports', 'learn', 'watchlist', 'settings']) { await p.goto(B + '#/' + r); await p.waitForTimeout(2000); }
  await p.goto(B + '#/markets'); await p.waitForTimeout(3000);
  for (const t of await p.$$eval('[data-tab]', (a) => a.map((x) => x.dataset.tab))) { await p.click(`[data-tab="${t}"]`); await p.waitForTimeout(2500); }
  out.push({ tag, lev, pat, sm, overflow: sm.sw > sm.iw + 1, errs }); await c.close();
}
console.log(JSON.stringify(out, null, 1)); await b.close();
