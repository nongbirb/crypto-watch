import { chromium } from 'playwright-core';
const B = process.env.B || 'http://localhost:8787/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const out = [];
async function page(tz, w, lang, theme) {
  const c = await b.newContext({ timezoneId: tz, viewport: { width: w, height: w < 500 ? 844 : 1300 }, serviceWorkers: 'block' });
  await c.addInitScript(([l, t]) => { localStorage.setItem('cw-lang', l); localStorage.setItem('cw-theme-v', t); }, [lang, theme]);
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('PE ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  return { c, p, errs };
}
const tag = (s) => s.replace(/[^\w]+/g, '-');
for (const tz of ['Asia/Bangkok', 'America/New_York', 'Asia/Tokyo', 'UTC', 'Europe/London', 'Australia/Sydney']) {
  const { c, p, errs } = await page(tz, 1280, 'en', 'light');
  await p.goto(B + '#/markets'); await p.waitForTimeout(5000);
  await p.click('[data-tab="plan"]').catch(()=>{}); await p.waitForTimeout(1500);
  for (const tf of ['4H', '1D']) { await p.click(`[data-tf="${tf}"]`).catch(()=>{}); await p.waitForTimeout(2500); await p.screenshot({ path: `shots/fix-plan${tf}-${tag(tz)}.png` }); }
  await p.click('[data-tab="pat"]').catch(()=>{}); await p.waitForTimeout(2000);
  for (const tf of ['1h', '4h', '1d', '1w']) { await p.click(`[data-ptf="${tf}"]`).catch(()=>{}); await p.waitForTimeout(2500); }
  await p.screenshot({ path: `shots/fix-pat-${tag(tz)}.png` });
  await p.click('[data-tab="lev"]').catch(()=>{}); await p.waitForTimeout(6000); await p.screenshot({ path: `shots/fix-lev-${tag(tz)}.png` });
  out.push([tz, errs]); await c.close();
}
const routes = ['markets', 'onchain/chains', 'onchain/flows', 'onchain/health', 'screener', 'calendar', 'journal', 'reports', 'learn', 'watchlist', 'settings', 'narrative'];
for (const [w, lang, theme] of [[390, 'th', 'dark'], [390, 'en', 'light'], [2560, 'en', 'dark'], [2560, 'th', 'light']]) {
  const { c, p, errs } = await page('Asia/Tokyo', w, lang, theme);
  for (const r of routes) {
    await p.goto(B + '#/' + r); await p.waitForTimeout(r === 'markets' ? 5000 : 3500);
    const info = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth,
      noName: [...document.querySelectorAll('button,a[href],[role=button],select,input')].filter((e) => e.offsetParent && !(e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent.trim() || (e.labels && e.labels.length) || e.getAttribute('placeholder'))).map((e) => e.outerHTML.slice(0, 120)),
      noAlt: [...document.querySelectorAll('img')].filter((e) => !e.hasAttribute('alt')).map((e) => e.outerHTML.slice(0, 100)),
      stale: [...document.querySelectorAll('.fresh')].map((e) => (e.classList.contains('stale') ? 'STALE ' : '') + e.textContent.trim()) }));
    out.push([w, lang, theme, r, info.sw > info.iw + 1 ? 'OVERFLOW ' + info.sw : 'ok', info.noName.slice(0, 5), info.noAlt.slice(0, 3), info.stale]);
    await p.screenshot({ path: `shots/fix-${w}-${lang}-${theme}-${tag(r)}.png` });
  }
  out.push([w, lang, 'errors', errs]); await c.close();
}
console.log(JSON.stringify(out, null, 1)); await b.close();
