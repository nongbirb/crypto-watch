// v59 in Chromium: daily brief bullets, the "What's new" bell (dot, accessible popover, three sources, unavailable states,
// 48h rule, deep links), X Narrative as a main tab with Screener in More, the neutral entry-zone line.
// Fixtures are built from the repo's real files with only timestamps/flags changed, so no invented market data reaches the UI.
// Usage: node tests/bell-ui.mjs [baseUrl]
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/';
const rd = (f) => JSON.parse(readFileSync(new URL('../' + f, import.meta.url), 'utf8'));
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };
const now = Date.now(), iso = (t) => new Date(t).toISOString();
const jsonR = (o) => ({ contentType: 'application/json', body: JSON.stringify(o) });

// Real files, re-timed so the test does not depend on when it runs.
const narr = rd('narrative.json'); narr.editions[0].generated_at = iso(now - 2 * 36e5);
const scr = rd('screener.json'); scr.updated = iso(now - 36e5);
const btc = scr.coins.find((c) => c.s === 'BTC'), oth = scr.coins.find((c) => c.s !== 'BTC' && !rd('tokens.json').tokens.some((t) => t.symbol === c.s) && c.rsi != null);
Object.assign(btc, { brk: true, vs2: 2.1, rsi: 61 }); Object.assign(oth, { brk: true, vs2: 1.6, rsi: 58 }); // the preset's own thresholds
const nf = (c) => !(c.brk && c.vs2 >= 1.5 && c.rsi >= 55 && c.rsi <= 75); scr.coins.forEach((c) => { if (c !== btc && c !== oth && !nf(c)) c.brk = false; });
const cal = rd('calendar.json'); cal.updated = iso(now - 36e5);
const jstParts = (t) => { const d = new Date(t + 9 * 36e5); return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) }; };
cal.events = [{ ...jstParts(now + 2 * 36e5), type: 'macro', tokens: [], impact: 'high', title: 'Test-window event in 2h', th_title: 'อีเวนต์ทดสอบใน 2 ชม.', note: '', th_note: '', url: 'https://example.org' },
  { ...jstParts(now + 30 * 36e5), type: 'macro', tokens: [], impact: 'high', title: 'Outside-window event in 30h', th_title: 'นอกช่วง 30 ชม.', note: '', th_note: '', url: 'https://example.org' }];
const calAuto = { updated: iso(now - 36e5), sources: {}, events: [] };
const judg = rd('judgment.json'); judg.updated = iso(now - 36e5);
judg.market_note = 'U.S. CPI rose 0.3% vs. the Nov. forecast. BTC held ~$64.9K. Not financial advice.';

async function open(w, lang, o = {}) {
  const c = await b.newContext({ viewport: { width: w, height: 860 }, serviceWorkers: 'block', isMobile: w < 600, hasTouch: w < 600, timezoneId: 'Asia/Tokyo' });
  await c.addInitScript(([l, seen]) => { if (!sessionStorage.getItem('t')) { localStorage.setItem('cw-lang', l); if (seen) localStorage.setItem('cw-bell-seen', String(seen)); sessionStorage.setItem('t', 1); } }, [lang, o.seen || 0]);
  await c.route('**/narrative.json*', (r) => r.fulfill(jsonR(o.narr || narr)));
  await c.route('**/screener.json*', (r) => (o.scr === 404 ? r.fulfill({ status: 404, body: 'nope' }) : r.fulfill(jsonR(o.scr || scr))));
  await c.route('**/calendar.json*', (r) => r.fulfill(jsonR(o.cal || cal)));
  await c.route('**/calendar_auto.json*', (r) => r.fulfill(jsonR(calAuto)));
  await c.route('**/judgment.json*', (r) => r.fulfill(jsonR(o.judg || judg)));
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + (o.hash || '#/markets')); await p.waitForSelector('[data-bell]', { state: 'attached', timeout: 60000 });
  await p.waitForFunction(() => typeof NX !== 'undefined' && NX.d && S.scr && S.cal, null, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(600);
  return { c, p, errs };
}
const vis = (p) => (w < 1024 ? '.bell-m' : '.bell-d');
let w;
const panel = (p) => p.evaluate(() => { const pn = document.querySelector('#bellPanel');
  return { hidden: pn.hidden, secs: Object.fromEntries([...pn.querySelectorAll('.bell-sec')].map((s) => [s.dataset.bellsec, { na: !!s.querySelector('[data-bellna]'), items: [...s.querySelectorAll('.bell-list a')].map((a) => ({ h: a.getAttribute('href'), t: a.querySelector('.bell-t').textContent, when: a.querySelector('.bell-when').textContent, isNew: !!a.querySelector('.bell-new') })) }])), text: pn.innerText }; });

// 1) desktop + phone, EN + TH: dot, popover a11y, sources, deep links, no sideways scroll
for (const [ww, lang] of [[1440, 'en'], [390, 'th'], [360, 'en'], [360, 'th']]) {
  w = ww; const tag = `${w}-${lang}`; const { c, p, errs } = await open(w, lang);
  const sel = vis(p);
  ok(await p.$eval(sel, (b) => getComputedStyle(b).display !== 'none' && b.offsetWidth > 0), `${tag} bell visible in ${w < 1024 ? 'header' : 'side bar'}`);
  ok(await p.$eval(sel + ' .bell-dot', (d) => !d.hidden), `${tag} red dot when nothing was seen yet`);
  ok(await p.$eval(sel, (b) => b.getAttribute('aria-expanded') === 'false' && b.getAttribute('aria-controls') === 'bellPanel'), `${tag} aria-expanded=false, aria-controls`);
  await p.focus(sel); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  let P = await panel(p);
  ok(!P.hidden && await p.evaluate(() => document.activeElement.id === 'bellTitle'), `${tag} Enter opens, focus moves into the panel`);
  ok(await p.$eval(sel, (b) => b.getAttribute('aria-expanded') === 'true'), `${tag} aria-expanded=true`);
  ok(P.secs.news.items.length >= 1 && P.secs.news.items.length <= 3 && P.secs.news.items.every((x) => x.h === '#/narrative' && x.isNew && x.when), `${tag} news: top 1-3 of the edition, new, timed, link to Narrative`);
  ok(P.secs.momo.items.length === 2 && P.secs.momo.items[0].h === '#/markets/BTC' && P.secs.momo.items[1].h === '#/screener/momo', `${tag} momentum: the preset's 2 matches, watchlist token -> its page, other -> Screener preset`);
  ok(P.secs.momo.items.every((x) => /120/.test(x.t) && !/\b(buy|sell|should|entry)\b|ซื้อ|ขาย|น่าเข้า/i.test(x.t)), `${tag} momentum wording is descriptive`);
  ok(P.secs.cal.items.length === 1 && /2h|2 ชม\./.test(P.secs.cal.items[0].t) && P.secs.cal.items[0].h === '#/calendar' && /GMT\+9/.test(P.secs.cal.items[0].when), `${tag} calendar: only the event inside 24h, in the viewer's time zone`);
  ok(lang === 'th' ? /มีอะไรใหม่/.test(P.text) && /ข่าวเด่น/.test(P.text) && /ไม่ใช่คำแนะนำการลงทุน/.test(P.text) : /What's new/.test(P.text) && /Not financial advice/.test(P.text), `${tag} labels in ${lang}`);
  ok(await p.evaluate(() => { const r = document.querySelector('#bellPanel').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }), `${tag} panel inside the viewport`);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${tag} no sideways scroll with the panel open`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  ok(await p.evaluate((s) => document.querySelector('#bellPanel').hidden && document.activeElement === document.querySelector(s), sel), `${tag} Esc closes and returns focus to the bell`);
  ok(await p.$eval(sel + ' .bell-dot', (d) => d.hidden), `${tag} dot clears after opening`);
  await p.reload(); await p.waitForSelector('[data-bell]', { state: 'attached' }); await p.waitForTimeout(1500);
  ok(await p.$eval(sel + ' .bell-dot', (d) => d.hidden), `${tag} dot stays clear after reload (localStorage)`);
  await p.click(sel); await p.waitForTimeout(200); P = await panel(p);
  ok(P.secs.news.items.every((x) => !x.isNew), `${tag} seen items are not marked new again`);
  await p.click('#bellPanel a[href="#/markets/BTC"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => S.route === 'markets' && S.sel === 'BTC' && document.querySelector('#bellPanel').hidden), `${tag} deep link opens BTC's page and closes the panel`);
  // tab bar / side nav: Narrative is a main tab, Screener is in More, old #/screener still works
  const nav = await p.evaluate(() => [...document.querySelectorAll(innerWidth >= 1024 ? '#sideNav > a' : '#tabBar > a')].map((a) => a.getAttribute('href')));
  ok(nav.includes('#/narrative') && (w >= 1024 ? nav.indexOf('#/screener') > nav.indexOf('#/calendar') : !nav.includes('#/screener')), `${tag} Narrative in the main nav, Screener moved to More (${nav.join(' ')})`);
  if (w < 1024) {
    ok(await p.evaluate(() => [...document.querySelectorAll('#tabBar a span, #tabBar button span')].every((s) => s.scrollWidth <= s.clientWidth + 1 && s.getBoundingClientRect().bottom <= document.querySelector('#tabBar').getBoundingClientRect().bottom)), `${tag} tab labels fit (no cut or overflow)`);
    await p.click('#tabBar .tb-more'); ok(await p.$('#gearMenu a[href="#/screener"]'), `${tag} Screener is in More`); await p.keyboard.press('Escape');
  }
  await p.goto(B + '#/screener'); await p.waitForSelector('#scp', { timeout: 30000 }); ok(true, `${tag} #/screener still opens the Screener`);
  await p.goto(B + '#/screener/momo'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => S.sc.preset === 'momo' && !!document.querySelector('[data-scp="momo"][aria-pressed="true"]')), `${tag} #/screener/momo opens the Momentum breakout preset`);
  await p.evaluate(() => { S.sc.preset = 'all'; scSave(); });
  ok(!errs.length, `${tag} no page errors ${errs.join(' | ')}`);
  await c.close();
}
w = 390;
// 2) highlights win over top; a stale edition (>48h) shows Unavailable for news only
{ const n2 = structuredClone(narr); n2.editions[0].highlights = [{ en: 'Highlight one', th: 'ไฮไลต์หนึ่ง', link: '#/calendar' }, { en: 'Highlight two', th: 'ไฮไลต์สอง', link: 'javascript:alert(1)' }];
  const { c, p } = await open(390, 'th', { narr: n2 }); await p.click('.bell-m'); const P = await panel(p);
  ok(P.secs.news.items.map((x) => x.t).join() === 'ไฮไลต์หนึ่ง,ไฮไลต์สอง' && P.secs.news.items[0].h === '#/calendar' && P.secs.news.items[1].h === '#/narrative', 'highlights used, unsafe link falls back to #/narrative'); await c.close(); }
{ const n3 = structuredClone(narr); n3.editions[0].generated_at = iso(now - 50 * 36e5);
  const { c, p } = await open(390, 'th', { narr: n3 }); await p.click('.bell-m'); const P = await panel(p);
  ok(P.secs.news.na && !P.secs.momo.na && !P.secs.cal.na && /ไม่พร้อมใช้งาน/.test(P.text), 'edition older than 48h: news says ไม่พร้อมใช้งาน, other sections unaffected'); await c.close(); }
// 3) screener.json missing: only that section is unavailable; stale screener (>12h) too
{ const { c, p, errs } = await open(390, 'en', { scr: 404 }); await p.click('.bell-m'); const P = await panel(p);
  ok(P.secs.momo.na && P.secs.news.items.length && P.secs.cal.items.length && !errs.length, 'screener.json 404: momentum Unavailable only, no page error'); await c.close(); }
{ const s2 = structuredClone(scr); s2.updated = iso(now - 13 * 36e5); const { c, p } = await open(390, 'en', { scr: s2 }); await p.click('.bell-m'); const P = await panel(p);
  ok(P.secs.momo.na, 'screener older than 12h: momentum Unavailable'); await c.close(); }
// 4) 48h rule: items older than the last open are not new; nothing older than 48h is new even with no last-seen time
{ const { c, p } = await open(390, 'en', { seen: now + 6e4 }); ok(await p.$eval('.bell-m .bell-dot', (d) => d.hidden), 'no dot when everything is older than the last open'); await c.close(); }
{ const n4 = structuredClone(narr); n4.editions[0].generated_at = iso(now - 47.9 * 36e5); const s4 = structuredClone(scr); s4.coins.forEach((x) => { x.brk = false; }); const c4 = structuredClone(cal); c4.events = [];
  const { c, p } = await open(390, 'en', { narr: n4, scr: s4, cal: c4 }); ok(!(await p.$eval('.bell-m .bell-dot', (d) => d.hidden)), '47.9h-old edition still counts as new');
  const r = await p.evaluate(() => bellIsNew({ key: 'x', ts: Date.now() - 49 * 36e5 })); ok(r === false, 'an item older than 48h is never new'); await c.close(); }
// 5) brief: one-paragraph EN note -> sentence bullets, "U.S." and "Nov." do not split, NFA is a footer; TH lines -> bullets
{ const { c, p } = await open(390, 'en'); await p.waitForSelector('.brief-list');
  const r = await p.evaluate(() => ({ li: [...document.querySelectorAll('.brief-list li')].map((x) => x.textContent), f: document.querySelector('.brief-nfa').textContent }));
  ok(r.li.length === 2 && r.li[0] === 'U.S. CPI rose 0.3% vs. the Nov. forecast.' && r.f === 'Not financial advice.', `EN paragraph split into bullets, footer kept (${JSON.stringify(r.li)})`);
  await p.evaluate(() => { localStorage.setItem('cw-lang', 'th'); }); await c.close(); }
{ const j2 = structuredClone(judg); j2.th.market_note = 'บรรทัดหนึ่ง\nบรรทัดสอง ไม่ใช่คำแนะนำการลงทุน';
  const { c, p } = await open(360, 'th', { judg: j2 }); await p.waitForSelector('.brief-list');
  const r = await p.evaluate(() => ({ li: [...document.querySelectorAll('.brief-list li')].map((x) => x.textContent), f: document.querySelector('.brief-nfa').textContent, sw: document.documentElement.scrollWidth <= innerWidth }));
  ok(r.li.join('|') === 'บรรทัดหนึ่ง|บรรทัดสอง' && r.f === 'ไม่ใช่คำแนะนำการลงทุน' && r.sw, 'TH lines -> bullets, trailing NFA moved to the footer, no sideways scroll at 360'); await c.close(); }
{ const j3 = structuredClone(judg); j3.market_note = 'One single sentence without a break'; const { c, p } = await open(390, 'en', { judg: j3 }); await p.waitForSelector('.brief .brief-nfa');
  ok(await p.evaluate(() => !document.querySelector('.brief-list') && /One single sentence/.test(document.querySelector('.brief p').textContent)), 'unsplittable note stays a paragraph'); await c.close(); }
// 6) entry-zone line is descriptive (no "wait for a dip" / "ใจเย็น")
{ const src = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  ok(!/wait for a dip|patience means|respect the stop|ใจเย็น|ให้ระวังจุดตัดขาดทุน/.test(src), 'entry-zone lines carry no advice'); }
await b.close();
console.log(`PASS bell-ui: ${n} checks`);
