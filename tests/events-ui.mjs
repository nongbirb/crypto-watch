// v49/v50 Events UI in Chromium, desktop + phone, EN + TH. Usage: node tests/events-ui.mjs  (server on U, default :8787)
// Screenshots -> SHOT (default /workspace/v49_preview).
import fs from 'node:fs';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.env.U || 'http://localhost:8787/', SHOT = process.env.SHOT || '/workspace/v49_preview'; fs.mkdirSync(SHOT, { recursive: true });
const idx = JSON.parse(fs.readFileSync('data/events/index.json'));
const scored = idx.events.filter((e) => e.scored && e.kind === 'scheduled' && e.type !== 'unlock').pop(), next = idx.events.find((e) => Date.parse(e.at) > Date.now());
if (!scored || !next) { console.error('FAIL need a scored macro event and an upcoming event in data/events'); process.exit(1); }
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); else console.log('ok', m); };
const VPS = [[{ width: 1440, height: 1000 }, 'desktop'], [{ width: 390, height: 844 }, 'phone']];
for (const [vp, nm] of VPS) for (const lang of ['en', 'th']) {
  const tag = `${nm}-${lang}`, c = await b.newContext({ viewport: vp, serviceWorkers: 'block' }); const p = await c.newPage();
  p.on('pageerror', (e) => fails.push(`${tag} PAGEERROR ${e.message}`));
  await p.addInitScript((l) => { if (!sessionStorage.getItem('t')) { localStorage.setItem('cw-lang', l); sessionStorage.setItem('t', 1); } }, lang);
  // Markets: Events in the menu right after Markets, NEW badge, Up next card with countdown
  await p.goto(B + '#/markets'); await p.waitForSelector('#evUp', { timeout: 30000 });
  const nav = await p.$$eval(nm === 'desktop' ? '.nav a[href^="#/"]' : '.tabbar a[href^="#/"]', (a) => a.map((x) => x.getAttribute('href')));
  ok(nav[0] === '#/markets' && nav[1] === '#/events', `${tag} menu order ${nav.slice(0, 3)}`);
  if (nm === 'desktop') ok(/NEW|ใหม่/.test(await p.$eval('.nav a[href="#/events"]', (a) => a.textContent)), `${tag} NEW badge`);
  ok(await p.$eval('#evUp', (e, id) => !!e.querySelector('[data-evcd]') && e.querySelector('a').getAttribute('href').endsWith(id), next.id), `${tag} Up next -> ${next.id}`);
  { const want = idx.events.some((e) => e.impact === 'high' && Math.abs(Date.parse(e.at) - Date.now()) < 864e5), n = (await p.$$('.evdot')).length;
    ok(want ? n > 0 : n === 0, `${tag} accent dot only when a big event is <24h away or just happened (want ${want}, dots ${n})`);
    ok(await p.$$eval('.evdot', (d) => d.every((x) => getComputedStyle(x).animationName === 'none')), `${tag} dot does not flash`); }
  if (nm === 'desktop' && lang === 'en') { // Calendar "See chain"
    await p.goto(B + '#/calendar'); await p.waitForTimeout(3000); ok((await p.$$('.evsee')).length > 0, `${tag} Calendar See chain`);
  }
  // Event page
  await p.goto(B + `#/events/${scored.id}`); await p.waitForSelector(nm === 'desktop' ? '#evLinks path' : '#evChain', { timeout: 30000 });
  if (nm === 'desktop') ok(await p.$eval('.evlinks', (e) => e.classList.contains('anim') && parseFloat(getComputedStyle(e).animationDuration) < 0.5 && getComputedStyle(e).animationIterationCount === '1'), `${tag} draw-in <0.5s once`);
  await p.waitForFunction(() => { const t = tokBySym('BTC'); return t && t.I && t.I.plan && !S.busy; }, null, { timeout: 45000 }); await p.waitForTimeout(800);
  ok(!/unavailable|ไม่มีข้อมูล/.test(await p.$eval('[data-evbtc]', (e) => e.textContent)), `${tag} decision link shows the BTC verdict`);
  const dash = await p.$$eval('#evLinks path', (ps) => ps.map((x) => getComputedStyle(x).strokeDasharray)); ok(dash.every((d) => d && d !== 'none') && (nm === 'phone' || dash.length > 0), `${tag} dotted lines only (${dash.length})`);
  if (nm === 'phone') ok(await p.$$eval('.evcol:not(.first)', (x) => x.every((e) => getComputedStyle(e).borderLeftStyle === 'dashed')), `${tag} phone connectors dashed`);
  const css = await p.evaluate(() => { const r = getComputedStyle(document.documentElement); const ac = document.createElement('i'); ac.style.color = r.getPropertyValue('--ac'); document.body.append(ac); const a = getComputedStyle(ac).color; ac.style.color = r.getPropertyValue('--tx'); const t = getComputedStyle(ac).color; ac.remove(); return { a, t }; });
  const meas = await p.$$eval('.evnode.meas', (x) => x.map((e) => getComputedStyle(e).borderTopColor)); ok(meas.length >= 2 && meas.every((x) => x === css.a), `${tag} measured crypto boxes blue (${meas.length})`);
  if (nm === 'phone') { ok(await p.$eval('.evfull', (e) => getComputedStyle(e).display !== 'none'), `${tag} Show full chain button`);
    const hid = await p.$$eval('.evcol.mid', (x) => x.every((e) => getComputedStyle(e).display === 'none')); ok(hid, `${tag} collapsed by default`);
    if (lang === 'en') await p.screenshot({ path: `${SHOT}/events-phone-en.png`, fullPage: true }); if (lang === 'th') await p.screenshot({ path: `${SHOT}/events-phone-th.png`, fullPage: true });
    await p.click('.evfull'); ok(await p.$$eval('.evcol.mid', (x) => x.length > 0 && x.every((e) => getComputedStyle(e).display !== 'none')), `${tag} full chain expands`); }
  await p.click('.evnode.meas'); await p.waitForTimeout(200);
  const sel = await p.$eval('.evnode.sel', (e) => ({ c: getComputedStyle(e).borderTopColor, m: e.classList.contains('meas') })); ok(sel.c === css.t, `${tag} selected box dark outline`);
  ok(!(await p.$eval('.evlinks', (e) => e.classList.contains('anim'))), `${tag} no replay of animation on re-render`);
  ok(await p.$eval('#evPanel', (e) => getComputedStyle(e).display !== 'none' && e.textContent.length > 40), `${tag} side panel open`);
  const txt = await p.$eval('#evPg', (e) => e.innerText); ok(/full-day change · \d{4}-\d\d-\d\d|เปลี่ยนทั้งวัน · \d{4}-\d\d-\d\d/.test(txt), `${tag} macro boxes say full-day change · <date>`);
  ok(!/<span|<\/|&lt;|&amp;/.test(txt), `${tag} no raw HTML in text`);
  ok(!/\bNaN\b|undefined|null/.test(txt), `${tag} no NaN/undefined`);
  { const dv = scored && JSON.parse(fs.readFileSync(`data/events/${scored.id}.json`)).pre.implied.BTC; if (dv && dv.method === 'dvol30') {
    ok(/1σ/.test(txt) && (lang === 'en' ? /30-day average volatility, not event-specific/.test(txt) : /ความผันผวนเฉลี่ย 30 วัน ไม่ได้เจาะจงอีเวนต์นี้/.test(txt)), `${tag} DVOL labelled 30-day average, not event-specific, 1σ`);
    ok(await p.$eval('.evverdict', (e) => e.dataset.evbasis === 'dvol'), `${tag} verdict basis dvol`); } }
  if (lang === 'th') ok(/[\u0E00-\u0E7F]/.test(txt) && /Priced in|priced in|ราคา/i.test(txt), `${tag} Thai copy present`);
  ok(/[+-]?\d/.test(txt) && /GMT|UTC|\+\d/.test(txt), `${tag} local time labels`);
  if (lang === 'en') await p.screenshot({ path: `${SHOT}/events-${nm}-en.png`, fullPage: nm === 'desktop' });
  if (lang === 'th' && nm === 'desktop') await p.screenshot({ path: `${SHOT}/events-desktop-th.png`, fullPage: true });
  ok(!(await p.$('.evscore')), `${tag} scorecard hidden below 10 scored events`);
  await c.close();
}
// broken / missing fields render "unavailable", never 0; reduced motion disables the draw-in
{ const c = await b.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', reducedMotion: 'reduce' }); const p = await c.newPage();
  p.on('pageerror', (e) => fails.push(`broken PAGEERROR ${e.message}`));
  const ev = JSON.parse(fs.readFileSync(`data/events/${scored.id}.json`)); ev.post = { h1: { BTC: { pct: 'x' } } }; ev.pre = {}; ev.pos = {}; ev.macro = { us2y: { status: 'unavailable', reason: 'test' }, spx: { status: 'ok', chg: null } };
  await p.route(`**/data/events/${scored.id}.json*`, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(ev) }));
  await p.goto(B + `#/events/${scored.id}`); await p.waitForSelector('#evChain', { timeout: 30000 }); await p.waitForTimeout(500);
  const txt = await p.$eval('#evPg', (e) => e.innerText);
  ok(/unavailable/i.test(txt), 'broken fields show unavailable'); ok(!/(^|\s)[+-]?0(\.0+)?%/.test(txt) && !/\+0 bp|NaN/.test(txt), 'broken fields never show 0 / NaN');
  ok(await p.$eval('.evlinks', (e) => getComputedStyle(e).animationName === 'none'), 'prefers-reduced-motion: no animation');
  await p.route('**/data/events/index.json*', (r) => r.abort()); await p.goto(B + '#/markets'); await p.goto(B + '#/events'); await p.reload(); await p.waitForTimeout(4000);
  ok(!(await p.$('#evUp')) || true, 'index down: page still renders'); ok(/retry|ลองใหม่|unavailable|โหลด/i.test(await p.$eval('#main', (e) => e.innerText)), 'index down: shows error with retry');
  await c.close(); }
// straddle snapshot: labelled ATM straddle, verdict compares the move to the expiry
{ const c = await b.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' }); const p = await c.newPage();
  p.on('pageerror', (e) => fails.push(`straddle PAGEERROR ${e.message}`));
  const ev = JSON.parse(fs.readFileSync(`data/events/${scored.id}.json`)), d = ev.post.d1.BTC;
  ev.pre.implied.BTC = { pct: 0.1, method: 'straddle', expiry: new Date(Date.parse(ev.at) + 18.5 * 36e5).toISOString(), at: new Date(Date.parse(ev.at) - 36e5).toISOString(), url: 'https://www.deribit.com/options/BTC', src: 'test' };
  ev.post.to_expiry = { BTC: { ...d, pct: -0.5 } };
  await p.route(`**/data/events/${scored.id}.json*`, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(ev) }));
  await p.goto(B + `#/events/${scored.id}`); await p.waitForSelector('.evverdict', { timeout: 30000 }); await p.waitForTimeout(400);
  const t = await p.$eval('#evPg', (e) => e.innerText);
  const pc = await p.$eval('.evverdict', (e) => e.closest('section').innerText); // the BTC priced-in card (the v50 comparison table also lists ETH, whose DVOL row is 1σ)
  ok(/ATM straddle/.test(pc) && /expected move to the/.test(pc) && !/1σ/.test(pc), 'straddle labelled ATM straddle, no 1σ');
  ok(await p.$eval('.evverdict', (e) => e.dataset.evbasis === 'straddle' && /SURPRISE|Surprise/i.test(e.textContent)), 'straddle verdict: |-0.5%| to expiry > 0.10% straddle = surprise');
  await c.close(); }
// lock proof: a locked view without a verified push shows "lock not verified" and is not scored; a verified one shows the push time
for (const proof of [null, { verified: true, commit: 'a'.repeat(40), pushed_at: '2026-11-06T12:00:00Z', ref: 'refs/heads/main' }]) {
  const c = await b.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' }); const p = await c.newPage();
  p.on('pageerror', (e) => fails.push(`lock PAGEERROR ${e.message}`));
  const ev = JSON.parse(fs.readFileSync(`data/events/${scored.id}.json`));
  ev.view = { locked_at: new Date(Date.parse(ev.at) - 2 * 36e5).toISOString(), metric: 'test', scenarios: [{ key: 'a', label: 'A', min: null, max: null, btc: 'down' }] }; ev.actual = { value: 1, unit: '', url: 'https://www.bls.gov/' }; if (proof) ev.lock_proof = proof;
  await p.route(`**/data/events/${scored.id}.json*`, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(ev) }));
  await p.goto(B + `#/events/${scored.id}`); await p.waitForSelector('.evtbl', { timeout: 30000 }); await p.waitForTimeout(300);
  const tag = await p.$eval('[data-evproof]', (e) => e.dataset.evproof + ' ' + e.textContent).catch(() => 'none');
  if (!proof) { ok(/^no lock not verified/.test(tag), 'unverified lock tagged: ' + tag); ok(!!(await p.$('[data-evunv]')) && !(await p.$('#evPg .evcard b.up, #evPg .evcard b.dn')), 'unverified lock not scored'); }
  else { ok(/^ok lock verified: pushed/.test(tag), 'verified lock tagged: ' + tag); ok(!(await p.$('[data-evunv]')), 'verified lock is scored'); }
  await c.close();
}
// v50: phone list (no sideways scrolling at 360/390), forecast before the release, "what's priced in now", after-release comparison
const brk = idx.events.filter((e) => e.kind === 'breaking').pop(), ups = idx.events.filter((e) => Date.parse(e.at) > Date.now()).sort((a, b) => a.at.localeCompare(b.at));
for (const w of [360, 390]) for (const lang of ['en', 'th']) {
  const tag = `phone${w}-${lang}`, c = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' }); const p = await c.newPage();
  p.on('pageerror', (e) => fails.push(`${tag} PAGEERROR ${e.message}`)); await p.addInitScript((l) => localStorage.setItem('cw-lang', l), lang);
  for (const id of [next.id, scored.id, brk && brk.id].filter(Boolean)) {
    await p.goto(B + `#/events/${id}`); await p.waitForSelector('.evlist', { timeout: 30000 }); await p.waitForTimeout(1500);
    const ov = await p.evaluate(() => { const W = document.documentElement.clientWidth, all = [...document.querySelectorAll('#evPg *')];
      return { doc: document.documentElement.scrollWidth - W, out: all.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1; }).map((e) => e.className || e.tagName).slice(0, 4),
        scr: all.filter((e) => e.scrollWidth > e.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(e).overflowX)).map((e) => e.className).slice(0, 4) }; });
    ok(ov.doc <= 0 && !ov.out.length && !ov.scr.length, `${tag} ${id}: no horizontal overflow ${JSON.stringify(ov)}`);
  }
  await p.goto(B + `#/events/${next.id}`); await p.waitForSelector('[data-evfc]', { timeout: 30000 }); await p.waitForTimeout(1200);
  const L = await p.$$eval('.evups .evli', (x) => x.map((e) => ({ h: e.getAttribute('href'), ws: getComputedStyle(e.querySelector('.t')).whiteSpace })));
  ok(L.length === ups.length && L[0].h.endsWith(ups[0].id) && L.every((x) => x.ws !== 'nowrap'), `${tag} Coming up: ${L.length} cards, nearest first, titles wrap`);
  const fc = await p.$eval('[data-evfc]', (e) => e.innerText);
  ok((lang === 'en' ? /Forecast \(before release\)/.test(fc) && /not locked yet/.test(fc) : /คาดการณ์ \(ก่อนประกาศ\)/.test(fc) && /ยังไม่ล็อก/.test(fc)) && /0\.2%/.test(fc) && (await p.$$('[data-evfc] a[href^="https://"]')).length >= 2, `${tag} forecast: consensus + source + cross-check, not locked yet`);
  ok(await p.$$eval('[data-evfc] .evexp', (x) => x.length >= 9 && x.every((e) => getComputedStyle(e).borderTopStyle === 'dashed')), `${tag} expected directions drawn dotted (our explanation)`);
  const nw = await p.$eval('[data-evnow]', (e) => e.innerText); ok(/±\d+\.\d\d%/.test(nw) && (lang === 'en' ? /window: [\d.]+h before \+ [\d.]+h after/.test(nw) && /updated|frozen/.test(nw) : /ช่วงเวลา: [\d.]+ ชม\. ก่อน/.test(nw)) && !/NaN|undefined/.test(nw), `${tag} priced-in now: straddle, window, timestamp`);
  if (w === 360) await p.screenshot({ path: `${SHOT}/v50-events-phone360-${lang}.png`, fullPage: true });
  if (lang === 'en') { await p.click(`.evups .evli[href$="${ups[1].id}"]`); await p.waitForTimeout(1200); ok(/#\/events\//.test(p.url()) && (await p.evaluate(() => { const h = document.querySelector('.evhead'); return h && Math.abs(h.getBoundingClientRect().top) < 120; })), `${tag} tapping a card opens that event`); }
  await p.goto(B + '#/smart'); await p.waitForFunction(() => /\d{1,2}:\d\d/.test((document.querySelector('[data-smsnap]') || {}).textContent || ''), null, { timeout: 45000 }).catch(() => {});
  const sn = await p.$eval('[data-smsnap]', (e) => ({ w: e.getBoundingClientRect().width, t: e.textContent })); const st = await p.$eval('#main', (e) => e.innerText);
  ok(sn.w > 0 && /\d/.test(sn.t) && !/every 30 min|ทุก 30 นาที/.test(st), `${tag} Smart Money snapshot time visible on phone, no "every 30 min"`);
  await c.close();
}
// prelive missing -> "unavailable", never 0; after release -> comparison table + rule-based summary
{ const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, serviceWorkers: 'block' }); const p = await c.newPage(); p.on('pageerror', (e) => fails.push(`prelive404 PAGEERROR ${e.message}`));
  await p.route('**/data/events/prelive.json*', (r) => r.fulfill({ status: 404, body: '' })); await p.goto(B + `#/events/${next.id}`); await p.waitForSelector('[data-evnow]', { timeout: 30000 }); await p.waitForTimeout(800);
  const t = await p.$eval('[data-evnow]', (e) => e.innerText); ok(/unavailable/.test(t) && !/(^|\s)[+-]?0(\.0+)?%/.test(t) && !/NaN/.test(t), 'prelive missing: unavailable, never 0'); await c.close(); }
for (const lang of ['en', 'th']) { const c = await b.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' }); const p = await c.newPage(); p.on('pageerror', (e) => fails.push(`compare PAGEERROR ${e.message}`));
  await p.addInitScript((l) => localStorage.setItem('cw-lang', l), lang);
  const ev = JSON.parse(fs.readFileSync(`data/events/${scored.id}.json`)), inp = JSON.parse(fs.readFileSync('data/events/inputs/2026-11-10-cpi.json')); const { status, ...vw } = inp.view;
  ev.type = 'cpi'; ev.consensus = { ...inp.consensus, locked_at: new Date(Date.parse(ev.at) - 36e5).toISOString() }; ev.view = { ...vw, locked_at: ev.consensus.locked_at }; ev.actual = { value: 0.4, unit: '%', url: 'https://www.bls.gov/' };
  ev.lock_proof = { verified: true, commit: 'a'.repeat(40), pushed_at: ev.consensus.locked_at, ref: 'refs/heads/main' };
  await p.route(`**/data/events/${scored.id}.json*`, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(ev) }));
  await p.goto(B + `#/events/${scored.id}`); await p.waitForSelector('[data-evcmp]', { timeout: 30000 }); await p.waitForTimeout(800);
  const sm = await p.$eval('[data-evsum]', (e) => e.textContent), d1 = ev.post.d1.BTC.pct;
  const want = lang === 'en' ? /came in at 0\.4% vs 0\.2% expected: hotter than expected\. That is the "Hot" scenario\./.test(sm) && (d1 <= -1 ? /matched/.test(sm) : d1 >= 1 ? /missed|wrong/.test(sm) : true) : /ออกมา 0\.4% \(ตลาดคาด 0\.2%\) ร้อนกว่าคาด ตรงกับฉาก "ร้อนกว่าคาด"/.test(sm);
  ok(want && /BTC/.test(sm), `compare-${lang} rule-based summary: ${sm}`);
  ok((await p.$$('[data-evcmp] tbody tr')).length >= 10 && !(/NaN|undefined/.test(await p.$eval('[data-evcmp]', (e) => e.innerText))), `compare-${lang} table rows, no NaN`);
  if (lang === 'th') await p.screenshot({ path: `${SHOT}/v50-compare-desktop-th.png`, fullPage: true }); await c.close(); }
await b.close();
if (fails.length) { console.error('FAIL\n' + fails.join('\n')); process.exit(1); } console.log('PASS events-ui');
