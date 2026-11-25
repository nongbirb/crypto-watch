// v76 Events UI in Chromium, desktop + phone, EN + TH. Usage: node tests/events-ui.mjs  (server on U, default :8787)
//  - menu: Events right after Markets, NEW badge only in the first 14 days, "Up next" card, accent dot rule; Calendar rows link to their event;
//  - page: two tabs (economic calendar / sharp moves); calendar grouped by day with countdowns and the BTC 1h / 1d move of released events;
//    sharp moves leave out "cause unclear" and not-qualifying entries;
//  - event: forecast / previous / actual, the reaction chart (% from the price at the release, real 15m candles), 1h / 1d chips equal to the
//    measured moves, past same-type releases (stats recomputed from history.json), in-depth folded; no chain diagram, no "priced in" badge;
//  - broken numbers never show 0 / NaN; index down shows retry; a locked view without a verified push is not scored; phones never scroll sideways.
import fs from 'node:fs';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.env.U || process.argv[2] || 'http://localhost:8787/', SHOT = process.env.SHOT || '/tmp'; fs.mkdirSync(SHOT, { recursive: true });
const idx = JSON.parse(fs.readFileSync('data/events/index.json')), hist = JSON.parse(fs.readFileSync('data/events/history.json'));
const CPI = '2026-11-10-cpi', cpi = JSON.parse(fs.readFileSync(`data/events/${CPI}.json`)), next = idx.events.filter((e) => Date.parse(e.at) > Date.now()).sort((a, b) => a.at.localeCompare(b.at))[0];
const brks = idx.events.filter((e) => e.kind === 'breaking'), shown = brks.filter((e) => !(e.nq || e.cu || /cause unclear/i.test(e.title))), brk = shown[shown.length - 1];
const nextJobs = idx.events.find((e) => e.type === 'jobs' && Date.parse(e.at) > Date.now());
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const fails = []; let n = 0; const ok = (c, m) => { if (!c) fails.push(m); else { n++; console.log('ok', m); } };
const noJunk = (t) => !/<span|<\/|&lt;|&amp;|\bNaN\b|undefined|\bnull\b/.test(t);
for (const [vp, nm] of [[{ width: 1440, height: 1000 }, 'desktop'], [{ width: 390, height: 844 }, 'phone']]) for (const lang of ['en', 'th']) {
  const tag = `${nm}-${lang}`, c = await b.newContext({ viewport: vp, serviceWorkers: 'block', isMobile: nm === 'phone', hasTouch: nm === 'phone' }), p = await c.newPage();
  p.on('pageerror', (e) => fails.push(`${tag} PAGEERROR ${e.message}`));
  await p.addInitScript((l) => { if (!sessionStorage.getItem('t')) { localStorage.setItem('cw-lang', l); sessionStorage.setItem('t', 1); } }, lang);
  // Markets: menu, NEW badge rule, Up next, accent dot
  await p.goto(B + '#/markets'); await p.waitForSelector('#evUp', { timeout: 30000 });
  const nav = await p.$$eval(nm === 'desktop' ? '.nav a[href^="#/"]' : '.tabbar a[href^="#/"]', (a) => a.map((x) => x.getAttribute('href')));
  ok(nav[0] === '#/markets' && nav[1] === '#/events', `${tag} menu order ${nav.slice(0, 3)}`);
  if (nm === 'desktop') { const isNew = Date.now() < Date.parse(idx.launched) + 14 * 864e5, txt = await p.$eval('.nav a[href="#/events"]', (a) => a.textContent); ok(isNew === /NEW|ใหม่/.test(txt), `${tag} NEW badge only in the first 14 days (${isNew ? 'shown' : 'gone'})`); }
  ok(await p.$eval('#evUp', (e, id) => !!e.querySelector('[data-evcd]') && e.querySelector('a').getAttribute('href').endsWith(id), next.id), `${tag} Up next -> ${next.id}`);
  { const want = idx.events.some((e) => e.impact === 'high' && !e.nq && Math.abs(Date.parse(e.at) - Date.now()) < 864e5), dots = (await p.$$('.evdot')).length; ok(want ? dots > 0 : dots === 0, `${tag} accent dot only near a big event (want ${want}, dots ${dots})`); }
  if (nm === 'desktop' && lang === 'en') { await p.goto(B + '#/calendar'); await p.waitForTimeout(3000); const l = await p.$$eval('.evsee', (a) => a.map((x) => x.textContent)); ok(l.length > 0 && l.every((x) => /Open event/.test(x)), `${tag} Calendar rows link to their event (${l.length})`); }
  // events home: calendar tab, grouped by day, countdowns, released moves = index
  await p.goto(B + '#/events'); await p.waitForSelector('.evlist2 .evr', { timeout: 30000 }); await p.waitForTimeout(800);
  const L = await p.evaluate(() => ({ tab: document.querySelector('[data-evtab][aria-pressed="true"]').dataset.evtab, days: document.querySelectorAll('.evlist2 .evday').length,
    rows: [...document.querySelectorAll('.evlist2 .evr')].map((a) => ({ id: a.getAttribute('href').split('/').pop(), cd: !!a.querySelector('[data-evcd]'), mv: [...a.querySelectorAll('.evmv b')].map((x) => x.textContent) })), sel: (document.querySelector('.evr.on') || { getAttribute: () => '' }).getAttribute('href') }));
  const sched = idx.events.filter((e) => e.kind === 'scheduled'), upIds = sched.filter((e) => Date.parse(e.at) > Date.now()).map((e) => e.id);
  ok(L.tab === 'cal' && L.days >= 3 && L.rows.every((r) => sched.some((e) => e.id === r.id)), `${tag} calendar tab: ${L.rows.length} scheduled events in ${L.days} day groups, no sharp moves mixed in`);
  ok(L.rows.filter((r) => upIds.includes(r.id)).every((r) => r.cd), `${tag} upcoming rows count down`);
  const pct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}%`, rel = L.rows.filter((r) => !upIds.includes(r.id) && idx.events.find((e) => e.id === r.id).b1 != null);
  ok(rel.length >= 3 && rel.every((r) => { const e = idx.events.find((x) => x.id === r.id); return r.mv[0] === pct(e.b1) && (e.bd == null || r.mv[1] === pct(e.bd)); }), `${tag} released rows show BTC 1h / 1d = measured (${rel.length} rows)`);
  { const now = Date.now(), recent = sched.filter((e) => Date.parse(e.at) <= now && now - Date.parse(e.at) < 3 * 864e5).sort((a, b) => b.at.localeCompare(a.at))[0], want = (recent || sched.filter((e) => Date.parse(e.at) > now).sort((a, b) => a.at.localeCompare(b.at))[0]).id;
    ok(L.sel.endsWith(want), `${tag} opens on ${want} (released in the last 3 days, else the next one)`); }
  // CPI: numbers, reaction chart, chips, past releases, in-depth, nothing removed comes back
  await p.goto(B + `#/events/${CPI}`); await p.waitForSelector('[data-evreact]', { timeout: 30000 }); await p.waitForFunction(() => S.charts.length && S.charts[0].panes()[0].getSeries()[0].data().length > 50, null, { timeout: 45000 }); await p.waitForTimeout(600);
  const G = await p.evaluate(() => { const q = (s) => document.querySelector(s); const T = (s) => (q(s) || {}).innerText || '';
    const sr = S.charts[0].panes()[0].getSeries()[0], d = sr.data();
    return { nums: [...document.querySelectorAll('[data-evnums] tbody tr')].map((r) => [...r.cells].map((c) => c.innerText.trim())), chips: [...document.querySelectorAll('[data-evreact] .evst2 b')].map((x) => x.textContent), chart: d.length, last: d[d.length - 1].value,
      past: T('[data-evpast]'), deep: !!q('details[data-evdeep]') && !q('details[data-evdeep]').open, chain: !!q('#evChain, .evnode, .evlinks'), txt: T('#evPg'), rd: T('#evChR') }; });
  ok(G.nums.length >= 2 && G.nums[0][1] === '0.2%' && /^0\.3%/.test(G.nums[0][3]) && (lang === 'en' ? /hotter than expected/.test(G.nums[0][3]) : /ร้อนกว่าคาด/.test(G.nums[0][3])), `${tag} CPI numbers: forecast 0.2%, actual 0.3% hotter than expected (${G.nums.map((r) => r.join(' | ')).join(' ; ')})`);
  ok(G.chips[0] === pct(cpi.post.before24h.BTC.pct) && G.chips[1] === pct(cpi.post.h1.BTC.pct) && G.chips[2] === pct(cpi.post.d1.BTC.pct), `${tag} reaction chips = measured BTC moves (${G.chips.join(' ')})`);
  ok(G.chart > 100 && Number.isFinite(G.last) && /\$/.test(G.rd), `${tag} reaction chart: ${G.chart} 15m bars, % from the release price (${G.rd.replace(/\s+/g, ' ')})`);
  { const rows = hist.types.cpi.filter((r) => Date.parse(r.at) < Date.parse(cpi.at) && r.moves.BTC && Number.isFinite(r.moves.BTC.h1)), a = rows.reduce((x, r) => x + Math.abs(r.moves.BTC.h1), 0) / rows.length;
    ok(G.past.includes(`±${a.toFixed(2)}%`) && G.past.includes(String(rows.length)), `${tag} past CPI releases: average 1h ±${a.toFixed(2)}% over ${rows.length} (history.json)`); }
  ok(G.deep && !G.chain && !/PRICED IN|price in ไป|Already priced in/i.test(G.txt), `${tag} in-depth folded; no chain diagram, no "priced in" badge`);
  ok(noJunk(G.txt), `${tag} no raw HTML / NaN / undefined`);
  await p.click('[data-evsym="ETH"]'); await p.waitForFunction(() => /ETH/.test((document.querySelector('#evChR') || {}).textContent || ''), null, { timeout: 30000 });
  ok((await p.$$eval('[data-evreact] .evst2 b', (x) => x.map((y) => y.textContent)))[1] === pct(cpi.post.h1.ETH.pct), `${tag} ETH switch: chart and chips follow`);
  await p.click('[data-evsym="BTC"]');
  if (lang === 'en') await p.screenshot({ path: `${SHOT}/events76-${nm}-cpi.png`, fullPage: true });
  // upcoming event: countdown, forecast table or nothing, no reaction card, past releases when the type has history
  if (nextJobs) { await p.goto(B + `#/events/${nextJobs.id}`); await p.waitForSelector('.evhead [data-evcd]', { timeout: 30000 }); await p.waitForTimeout(500);
    const U = await p.evaluate(() => ({ react: !!document.querySelector('[data-evreact]'), past: !!document.querySelector('[data-evpast]') })); ok(!U.react && U.past, `${tag} upcoming jobs report: countdown, no reaction yet, past releases shown`); }
  // sharp moves tab
  await p.click('[data-evtab="move"]'); await p.waitForSelector('[data-evtab="move"][aria-pressed="true"]', { timeout: 10000 }); await p.waitForTimeout(800);
  const M = await p.evaluate(() => ({ ids: [...document.querySelectorAll('.evlist2 .evr')].map((a) => a.getAttribute('href').split('/').pop()), nums: !!document.querySelector('[data-evnums]'), near: !!document.querySelector('[data-evnear]'), react: !!document.querySelector('[data-evreact]') }));
  ok(M.ids.length === Math.min(20, shown.length) && M.ids.every((id) => shown.some((e) => e.id === id)) && !M.ids.some((id) => brks.find((e) => e.id === id && (e.cu || e.nq))), `${tag} sharp moves: ${M.ids.length} with a headline; ${brks.length - shown.length} "cause unclear" / not qualifying left out`);
  ok(M.react && M.near && !M.nums, `${tag} sharp move page: reaction + headlines near it, no forecast table`);
  // phone: no sideways scroll on any of these pages
  if (nm === 'phone') for (const id of [CPI, next.id, brk.id]) { await p.goto(B + `#/events/${id}`); await p.waitForSelector('.evhead', { timeout: 30000 }); await p.waitForTimeout(1200);
    const ov = await p.evaluate(() => { const W = document.documentElement.clientWidth; return { doc: document.documentElement.scrollWidth - W, out: [...document.querySelectorAll('#evPg *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && !e.closest('.tscroll'); }).map((e) => e.className || e.tagName).slice(0, 4) }; });
    ok(ov.doc <= 0 && !ov.out.length, `${tag} ${id}: no sideways scroll ${JSON.stringify(ov)}`); }
  await c.close();
}
// broken numbers: "unavailable" / dashes, never 0 or NaN; index down: error with retry
{ const c = await b.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' }), p = await c.newPage(); p.on('pageerror', (e) => fails.push(`broken PAGEERROR ${e.message}`));
  const ev = JSON.parse(JSON.stringify(cpi)); ev.post = { h1: { BTC: { pct: 'x' } } }; ev.pre = {}; ev.pos = {}; ev.consensus = { value: 'bad' }; delete ev.actual;
  await p.route(`**/data/events/${CPI}.json*`, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(ev) }));
  await p.goto(B + `#/events/${CPI}`); await p.waitForSelector('[data-evreact]', { timeout: 30000 }); await p.waitForTimeout(800);
  const t = await p.$eval('[data-evreact] .evsts', (e) => e.innerText); ok(!/(^|\s)[+-]?0(\.0+)?%/.test(t) && !/NaN/.test(t) && /waiting/.test(t), `broken moves show "waiting", never 0 / NaN (${t.replace(/\s+/g, ' ')})`);
  ok(!(await p.$('[data-evnums]')), 'a broken consensus is dropped, not shown as 0');
  await p.route('**/data/events/index.json*', (r) => r.abort()); await p.goto(B + '#/markets'); await p.goto(B + '#/events'); await p.reload(); await p.waitForTimeout(4000);
  ok(/retry|ลองใหม่/i.test(await p.$eval('#main', (e) => e.innerText)) && !!(await p.$('[data-evretry]')), 'index down: error with a retry button'); await c.close(); }
// lock proof: unverified -> tagged and not scored; verified -> tagged with the push time (inside "In depth")
for (const proof of [null, { verified: true, commit: 'a'.repeat(40), pushed_at: '2026-11-06T12:00:00Z', ref: 'refs/heads/main' }]) {
  const c = await b.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' }), p = await c.newPage(); p.on('pageerror', (e) => fails.push(`lock PAGEERROR ${e.message}`));
  const ev = JSON.parse(JSON.stringify(cpi)); ev.view = { locked_at: new Date(Date.parse(ev.at) - 2 * 36e5).toISOString(), metric: 'test', scenarios: [{ key: 'a', label: 'A', min: null, max: null, btc: 'down' }] }; ev.actual = { value: 1, unit: '', url: 'https://www.bls.gov/' };
  if (proof) ev.lock_proof = proof; else delete ev.lock_proof;
  await p.route(`**/data/events/${CPI}.json*`, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(ev) }));
  await p.goto(B + `#/events/${CPI}`); await p.waitForSelector('details[data-evdeep]', { timeout: 30000 }); await p.click('details[data-evdeep] summary'); await p.waitForTimeout(300);
  const tg = await p.$eval('[data-evproof]', (e) => e.dataset.evproof + ' ' + e.textContent).catch(() => 'none');
  if (!proof) ok(/^no lock not verified/.test(tg) && !!(await p.$('[data-evunv]')) && !/Direction matched|Direction missed|proven wrong/.test(await p.$eval('#evPg', (e) => e.innerText)), 'unverified lock tagged and not scored: ' + tg);
  else ok(/^ok lock verified: pushed/.test(tg) && !(await p.$('[data-evunv]')), 'verified lock tagged and scored: ' + tg);
  await c.close(); }
await b.close();
if (fails.length) { console.log('FAIL\n' + fails.join('\n')); process.exit(1); } else console.log(`PASS events-ui: ${n} checks`);
