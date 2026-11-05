import { chromium } from 'playwright-core';
const B = process.env.B || 'http://localhost:8787/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const out = [];
for (const [tz, w, lang, theme] of [['Asia/Tokyo', 1440, 'en', 'dark'], ['Asia/Bangkok', 1440, 'th', 'light'], ['America/New_York', 390, 'en', 'light'], ['Asia/Tokyo', 390, 'th', 'dark'], ['America/New_York', 2560, 'en', 'dark']]) {
  const c = await b.newContext({ timezoneId: tz, viewport: { width: w, height: w < 500 ? 844 : 1100 }, serviceWorkers: 'block' });
  await c.addInitScript(([l, t]) => { localStorage.setItem('cw-lang', l); localStorage.setItem('cw-theme-v', t); localStorage.setItem('cw-theme', t); }, [lang, theme]);
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('PE ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await p.goto(B + '#/smart'); await p.waitForTimeout(20000);
  const info = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, st: JSON.stringify(SM.st), n: SM.tr.length, tape: document.querySelectorAll('.smtr').length }));
  await p.screenshot({ path: `shots/sm-${w}-${lang}-${theme}-${tz.split('/')[1]}.png`, fullPage: true });
  await p.click('[data-smsel="HYPE"]'); await p.waitForTimeout(1500); await p.screenshot({ path: `shots/sm-${w}-${lang}-${theme}-HYPE.png`, fullPage: true });
  await p.selectOption('[data-smthr]', '50000').catch((e) => errs.push('sel ' + e.message)); await p.waitForTimeout(800);
  const routes = ['markets', 'onchain/chains', 'onchain/flows', 'screener', 'calendar', 'journal', 'reports', 'learn', 'watchlist', 'settings'];
  for (const r of routes) { await p.goto(B + '#/' + r); await p.waitForTimeout(2500); }
  const closed = await p.evaluate(() => Object.values(SM.ws).every((x) => !x));
  out.push([tz, w, lang, theme, info.sw > info.iw + 1 ? 'OVERFLOW' : 'ok', info, 'wsClosedAfterLeave=' + closed, errs]); await c.close();
}
console.log(JSON.stringify(out, null, 1)); await b.close();
