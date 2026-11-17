// QA for the #14 merge: token page Liquidation map + bell, 7 widths x EN/TH. usage: node qa_pr14_merge.mjs
import { chromium } from '/workspace/v60/node_modules/playwright-core/index.mjs';
const B = 'http://localhost:8787/', O = '/workspace/v60/docs/qa/pr14-merge';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const fails = [], rows = [];
const audit = ({ sel, mobile }) => {
  const out = { clip: [], off: [], small: [], overlap: [] }, W = document.documentElement.clientWidth;
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('[hidden]'); };
  const nm = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].join('.')) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"';
  for (const root of document.querySelectorAll(sel)) {
    if (!vis(root)) continue;
    for (const e of root.querySelectorAll('*')) {
      if (!vis(e)) continue; const r = e.getBoundingClientRect(), s = getComputedStyle(e);
      if (r.right > W + 0.5 || r.left < -0.5) { if (!e.closest('.lhm,svg,canvas')) out.off.push(nm(e)); }
      if (s.overflowX !== 'visible' && s.overflowX !== 'auto' && s.overflowX !== 'scroll' && e.scrollWidth > e.clientWidth + 1 && e.children.length === 0 && e.textContent.trim()) out.clip.push(nm(e));
      if (s.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1) out.clip.push(nm(e));
      if (mobile && e.matches('button,[role=tab],summary,a[href],select,input') && !e.closest('p,li:not(.bell-list li),.lhm')) {
        if (r.height < 43.5 || r.width < 43.5) out.small.push(nm(e) + ` ${Math.round(r.width)}x${Math.round(r.height)}`); }
    }
  }
  for (const gsel of ['.lvtabs [role=tab]', '.top-in > *', '#tabBar a, #tabBar button']) { const groups = [...document.querySelectorAll(gsel)].filter(vis);
  for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) { const a = groups[i].getBoundingClientRect(), c = groups[j].getBoundingClientRect();
    if (groups[i].contains(groups[j]) || groups[j].contains(groups[i])) continue;
    if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) out.overlap.push(nm(groups[i]) + ' x ' + nm(groups[j])); } }
  return out;
};
for (const [w, lang] of [360, 390, 768, 1024, 1280, 1440, 1920].flatMap((w) => [[w, 'en'], [w, 'th']])) {
  const mobile = w < 768, tag = `${w}-${lang}`;
  const c = await b.newContext({ viewport: { width: w, height: mobile ? 820 : 900 }, serviceWorkers: 'block', isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1, timezoneId: 'Asia/Tokyo' });
  await c.addInitScript((l) => { if (!sessionStorage.getItem('t')) { localStorage.setItem('cw-lang', l); sessionStorage.setItem('t', 1); } }, lang);
  const p = await c.newPage(); p.on('pageerror', (e) => fails.push(`${tag} PAGEERROR ${e.message}`));
  await p.goto(B + '#/markets'); await p.waitForSelector('[data-sel="BTC"]', { timeout: 60000 }); await p.click('[data-sel="BTC"]'); await p.waitForTimeout(800);
  await p.click('[data-tab="lev"]'); await p.waitForSelector('.lvmap .lhm-box', { timeout: 120000 }); await p.waitForTimeout(2500);
  const m = await p.evaluate(() => { const g = document.querySelector('.lvmap-grid'), mn = document.querySelector('.lvmap-main').getBoundingClientRect(), sd = document.querySelector('.lvmap-side').getBoundingClientRect();
    return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, main: Math.round(mn.width), side: Math.round(sd.width), sideBeside: sd.top < mn.bottom - 10 && sd.left >= mn.right - 1, chartFirst: mn.top < sd.top,
      tabs: [...document.querySelectorAll('.lvtab')].map((t) => t.getAttribute('aria-selected')).join(','), errs: (window.LEV && LEV.BTC || {}).errs, hrs: (document.querySelector('[data-lvsrc]') || {}).textContent?.match(/\d+\s*(hours|ชม\.)/)?.[0] }; });
  // keyboard: ArrowRight moves to the Real tab
  await p.focus('.lvtab[aria-selected=true]'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300);
  const kb = await p.evaluate(() => ({ sel: document.querySelector('.lvtab[aria-selected=true]')?.dataset.lvtab, foc: document.activeElement?.dataset.lvtab }));
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300);
  const a1 = await p.evaluate(audit, { sel: '.top,.lvmap,#tabBar', mobile });
  await p.locator('.lvmap').screenshot({ path: `${O}/token-lev-${tag}.jpg`, type: 'jpeg', quality: 55, style: '.top,#tabBar{visibility:hidden!important}' });
  // bell
  const bell = (await p.$('.bell-m')) && await p.isVisible('.bell-m') ? '.bell-m' : '.bell-d';
  await p.click(bell); await p.waitForTimeout(1500);
  const bs = await p.evaluate(() => { const pn = document.querySelector('#bellPanel'), r = pn.getBoundingClientRect(); return { open: !pn.hidden, l: r.left, r: r.right, W: innerWidth, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; });
  const a2 = await p.evaluate(audit, { sel: '#bellPanel,.top', mobile });
  await p.screenshot({ path: `${O}/bell-${tag}.jpg`, type: 'jpeg', quality: 55 });
  const split = m.sideBeside ? (m.main / (m.main + m.side) * 100).toFixed(1) : 'stacked';
  rows.push(`${tag}: sw/cw ${m.sw}/${m.cw} map ${m.main}/${m.side} split ${split} chartFirst ${m.chartFirst} tabs ${m.tabs} kb→${kb.sel}/${kb.foc} hrs "${m.hrs}" venueErrs ${JSON.stringify(m.errs || [])} | bell open ${bs.open} ${Math.round(bs.l)}-${Math.round(bs.r)}/${bs.W} sw/cw ${bs.sw}/${bs.cw}`);
  const F = (x) => fails.push(`${tag} ${x}`);
  if (m.sw > m.cw) F('page overflow'); if (bs.sw > bs.cw) F('overflow with bell open');
  if (w >= 1024 && !(m.sideBeside && Math.abs(m.main / (m.main + m.side) - 0.65) < 0.03)) F(`not 65/35 (${m.main}/${m.side})`);
  if (w < 768 && !m.chartFirst) F('chart not first');
  if (kb.sel !== 'real' || kb.foc !== 'real') F('keyboard tabs ' + JSON.stringify(kb));
  if (!bs.open || bs.l < 0 || bs.r > bs.W + 0.5) F('bell panel off screen/closed');
  for (const [k, v] of Object.entries(a1)) if (v.length) F(`map ${k}: ${v.slice(0, 6).join(' ; ')}`);
  for (const [k, v] of Object.entries(a2)) if (v.length) F(`bell ${k}: ${v.slice(0, 6).join(' ; ')}`);
  await c.close();
}
await b.close();
console.log(rows.join('\n')); console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS pr14-merge QA');
