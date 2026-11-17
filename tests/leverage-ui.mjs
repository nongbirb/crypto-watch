// Phase 4 Leverage tab in Chromium: two readings (never one summed score), own-history percentiles from data/lev (fixture = real
// OKX + Hyperliquid history built by scripts/lev_hist.py on 2026-11-13), "not enough history" without it, venues left out of the 24h
// OI change named, heatmap removes notional when OI falls, phone EN/TH no sideways scroll; Smart Money ladder lead line (audit L1).
// Venue data is live (whatever venues this machine reaches). Usage: node tests/leverage-ui.mjs [baseUrl]
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/', SHOT = process.env.SHOT || '';
const DAILY = readFileSync(new URL('./fixtures/lev/daily-2026.json', import.meta.url), 'utf8'), REC = readFileSync(new URL('./fixtures/lev/recent.json', import.meta.url), 'utf8');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };
if (SHOT) mkdirSync(SHOT, { recursive: true });
const overflow = (p) => p.evaluate(() => { const W = document.documentElement.clientWidth, m = document.querySelector('.lev'); // the Leverage tab only (the Markets table scrolls inside its own wrapper by design)
  const out = [...m.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.ui-help-body'); }).map((e) => e.className || e.tagName);
  return { doc: document.documentElement.scrollWidth > W, out: [...new Set(out)].slice(0, 6) }; });
async function lev(sym, w, lang, hist = true) {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, serviceWorkers: 'block', isMobile: w < 600, hasTouch: w < 600 });
  await c.addInitScript((l) => localStorage.setItem('cw-lang', l), lang);
  await c.route('**/data/lev/daily-2026.json*', (r) => (hist ? r.fulfill({ contentType: 'application/json', body: DAILY }) : r.fulfill({ status: 404, body: 'nf' })));
  await c.route('**/data/lev/daily-2025.json*', (r) => r.fulfill({ status: 404, body: 'nf' }));
  await c.route('**/data/lev/recent.json*', (r) => (hist ? r.fulfill({ contentType: 'application/json', body: REC }) : r.fulfill({ status: 404, body: 'nf' })));
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '#/markets'); await p.waitForSelector(`[data-sel="${sym}"]`, { timeout: 60000 }); await p.click(`[data-sel="${sym}"]`); await p.waitForTimeout(600);
  await p.click('[data-tab="lev"]'); await p.waitForSelector('.lev [data-lev2]', { timeout: 90000 }); await p.waitForTimeout(800);
  return { c, p, errs };
}
// 1) with history: two readings, own-history ranks, sources named
{ const { c, p, errs } = await lev('BTC', 1280, 'en');
  const r = await p.evaluate(() => { const M = levModel(tokBySym('BTC'), LEV.BTC), q = (s) => document.querySelector(s);
    return { txt: q('.lev .levscore').textContent, how: M.how, P: M.P, comp: Object.fromEntries(M.comp.map((x) => [x[0], x[2]])), shown: q('[data-lvhow]') && q('[data-lvhow]').textContent, side: q('[data-lvside]') && q('[data-lvside]').dataset.lvside,
      old: /Leverage risk/i.test(document.body.textContent), venues: M.vs.map((v) => v.venue), hist: q('[data-lvhist]').textContent, flat: M.oiFlat.map((v) => v.venue), excl: (q('[data-oiexcl]') || {}).textContent || '' }; });
  ok(/How much leverage/.test(r.txt) && /Which side is crowded/.test(r.txt) && !r.old, 'two readings, no single "Leverage risk" score');
  ok(r.P.days === 90 && r.P.fundVenues.length > 0, `ranked against 90 own closed days (${r.P.from} → ${r.P.to})`);
  const mean = [r.P.lev, r.P.mom].filter((x) => x != null); ok(mean.length && Math.abs(r.how - mean.reduce((a, x) => a + x, 0) / mean.length) < 1e-9 && r.shown.startsWith(String(Math.round(r.how))), 'How much = mean of the OI ÷ mcap and OI build-up percentiles');
  ok(r.comp.fund === r.P.fund && r.comp.lev === r.P.lev && r.comp.mom === r.P.mom, 'funding, OI ÷ mcap and OI build-up bars are the percentiles');
  ok(/OKX/.test(r.hist) && /Binance and Bybit have no stored history/.test(r.hist), 'history sources named');
  ok(!r.flat.length || r.flat.every((v) => r.excl.includes(EXN(v))), `venues left out of the 24h OI change are named (${r.flat.join(',') || 'none'})`);
  ok(!errs.length, 'no page errors ' + errs.join(';'));
  // 2) heatmap: an OI drop removes the same share from every open bin (it used to be skipped)
  const hm = await p.evaluate(() => { const t = { price: 100 }, H = (o) => { const h = [{ t: 0, usd: 0, px: 100 }, { t: 36e5, usd: 1000, px: 100 }, ...o]; const r = heatmap(t, { oiHist: h, oiUsd: h[h.length - 1].usd, mark: 100 }, null, [{ oiUsd: 1, maxLev: 100, mm: 0.005 }]); return r.bins.reduce((s, b) => s + b.long + b.short, 0); };
    return { up: H([]), down: H([{ t: 72e5, usd: 400, px: 100 }]), flat: H([{ t: 72e5, usd: 1000, px: 100 }]) }; });
  ok(hm.up > 0 && Math.abs(hm.down - hm.up * 0.4) < 1e-6 && Math.abs(hm.flat - hm.up) < 1e-9, `heatmap: OI 1000 → 400 keeps 40% in every bin (${hm.up.toFixed(1)} → ${hm.down.toFixed(1)})`);
  // Phase 4 audit L3: a wick to 85 liquidates the long tiers at 10x and above; that notional is closed, so a later OI drop is a share of
  // what is still open (1000 x (0.5 x (0.12 + 0.2) + 0.5) = 660), not of everything ever added (1000)
  const hw = await p.evaluate(() => { const t = { price: 100 }, H = (o) => { const h = [{ t: 0, usd: 0, px: 100 }, { t: 36e5, usd: 1000, px: 100 }, { t: 72e5, usd: 1000, px: 100, lo: 85, hi: 100 }, ...o];
    const r = heatmap(t, { oiHist: h, oiUsd: h[h.length - 1].usd, mark: 100 }, null, []); return r.bins.reduce((s, b) => s + b.long + b.short, 0); };
    return { wick: H([]), down: H([{ t: 108e5, usd: 500, px: 100 }]) }; });
  ok(hw.wick > 0 && Math.abs(hw.down - hw.wick * (1 - 500 / 660)) < 1e-6, `heatmap L3: after a wick, an OI drop of 500 removes 500/660 of what is still open (${hw.wick.toFixed(1)} → ${hw.down.toFixed(1)})`);
  if (SHOT) await p.locator('.lev').screenshot({ path: SHOT + '/v56-lev-btc-desktop.png' });
  await c.close(); }
function EXN(v) { return { binance: 'Binance', bybit: 'Bybit', okx: 'OKX', hyperliquid: 'Hyperliquid' }[v]; }
// 2b) audit M4: when the ranked venues hold under 50 % of today's open interest the reading says so and the number is greyed
for (const sym of ['HYPE', 'BTC']) { const { c, p, errs } = await lev(sym, 390, 'en');
  const r = await p.evaluate((s) => { const M = levModel(tokBySym(s), LEV[s]), how = document.querySelector('[data-lvhow]'), tag = document.querySelector('[data-lvlow="how"]');
    const share = 100 * M.vs.filter((v) => M.P.oiVenues.includes(v.venue)).reduce((a, v) => a + v.oiUsd, 0) / M.oiTot;
    return { share, cov: M.covHow, tag: tag && tag.textContent, grey: !!how && how.classList.contains('lvgrey'), side: M.covSide, sideTag: !!document.querySelector('[data-lvlow="side"]') }; }, sym);
  ok(Math.abs(r.cov - r.share) < 1e-9, `${sym}: coverage = ranked venues' share of live OI (${r.share.toFixed(1)}%)`);
  ok(r.cov < 50 ? r.tag === `Low coverage: ${r.cov.toFixed(0)}% of open interest` && r.grey : r.tag === null && !r.grey, `${sym}: low-coverage label + grey only under 50% (${r.tag || 'none'})`);
  ok(r.side == null || (r.side < 50) === r.sideTag, `${sym}: side reading labelled the same way`);
  if (sym === 'HYPE') ok(r.cov < 50, 'HYPE: OKX-only OI ranks cover a small part of HYPE open interest, and the tab says so');
  ok(!errs.length, 'no page errors ' + errs.join(';')); await c.close(); }
// 3) without history files: "not enough history", no rank invented
{ const { c, p, errs } = await lev('ETH', 390, 'en', false);
  const r = await p.evaluate(() => ({ how: (document.querySelector('[data-lvhow]') || {}).dataset, none: !!document.querySelector('[data-lvhow="none"]'), txt: document.querySelector('.lev .levscore').textContent, M: (() => { const M = levModel(tokBySym('ETH'), LEV.ETH); return { fund: M.comp[0][2], lev: M.comp[3][2], mom: M.comp[2][2] }; })() }));
  ok(r.none && /not enough history \(0 of 30 days\)/.test(r.txt) && r.M.fund == null && r.M.lev == null && r.M.mom == null, 'no history: "not enough history", the three ranked bars empty');
  ok(!errs.length, 'no page errors ' + errs.join(';')); await c.close(); }
// 4) phones EN/TH: no sideways scroll
for (const [w, lang, sym] of [[360, 'en', 'HYPE'], [390, 'th', 'BTC'], [360, 'th', 'MON']]) {
  const { c, p, errs } = await lev(sym, w, lang); const o = await overflow(p);
  ok(!o.doc && !o.out.length, `${w} ${lang} ${sym}: no sideways scroll ${JSON.stringify(o)}`);
  if (lang === 'th') ok(/เลเวอเรจมากแค่ไหน/.test(await p.evaluate(() => document.body.textContent)) && /ฝั่งไหนแน่น/.test(await p.evaluate(() => document.body.textContent)), `${w} TH copy`);
  if (SHOT) await p.locator('.lev').screenshot({ path: `${SHOT}/v56-lev-${sym}-${w}-${lang}.png` });
  ok(!errs.length, 'no page errors ' + errs.join(';')); await c.close(); }
// 5) audit L1: Smart Money ladder leads with the share beyond ±30 % when most value is there (fixture: real v55 snapshot)
{ const FX = JSON.parse(readFileSync(new URL('./fixtures/smart_money_v55.json', import.meta.url))), q = FX.cohorts.panel.coins.BTC.liq;
  const inR = q.bins.reduce((s, x) => s + x.long + x.short, 0), far = q.outside.long + q.outside.short + q.noLiq.long + q.noLiq.short;
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', isMobile: true });
  await c.addInitScript(() => { localStorage.setItem('cw-lang', 'en'); localStorage.setItem('kms-sm-sel', '"BTC"'); });
  await c.route('**/smart_money.json*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(FX) }));
  await c.route('https://api.hyperliquid.xyz/**', (r) => r.abort());
  const p = await c.newPage(); await p.goto(B + '#/smart'); await p.waitForSelector('.smuw-sec', { timeout: 60000 });
  const lead = await p.evaluate(() => (document.querySelector('[data-smlqlead]') || {}).textContent || null);
  ok(far > inR ? lead && lead.startsWith(`${(100 * far / (far + inR)).toFixed(0)}% of this position value`) && lead.includes(`only ${(100 * inR / (far + inR)).toFixed(0)}%`) : lead === null, `L1: ladder lead line (${lead ? lead.slice(0, 60) : 'none'})`);
  await c.close(); }
// 6) v60 Liquidation map tabs: WAI-ARIA tabs + keyboard, badges, one-line methods, 65/35 at >=1024 with room, one column below,
// chart 420-480px at full width, no clipped numbers, 3-5 bullets + closed "How it's calculated and limits".
const lvState = (p) => p.evaluate(() => { const q = (s) => document.querySelector(s), R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  const tabs = [...document.querySelectorAll('.lvtabs [role=tab]')], pans = [...document.querySelectorAll('.lvmap [role=tabpanel]')], map = q('.lvmap'), m = map.getBoundingClientRect();
  const clipped = [...map.querySelectorAll('.num, .lhm-ax span, .lhm-now span, .lvkeys dd, .ftab span, .venues b')].filter((e) => { const r = e.getBoundingClientRect(); if (!r.width || e.closest('[hidden]')) return false;
    return (getComputedStyle(e).display !== 'inline' && e.scrollWidth > e.clientWidth + 1) || r.right > m.right + 1 || r.left < m.left - 1; }).map((e) => e.className || e.textContent);
  return { tablist: q('.lvtabs').getAttribute('role'), label: q('.lvtabs').getAttribute('aria-label'),
    tabs: tabs.map((t) => ({ k: t.dataset.lvtab, sel: t.getAttribute('aria-selected'), ti: t.tabIndex, ctl: t.getAttribute('aria-controls'), txt: t.textContent, focus: document.activeElement === t })),
    pans: pans.map((x) => ({ id: x.id, by: x.getAttribute('aria-labelledby'), hidden: x.hidden, shown: x.offsetHeight > 0 })),
    est: (q('[data-lvpan=est] [data-lvest]') || {}).textContent, realBadge: (q('[data-lvpan=real] .lvmeth .smreal') || {}).textContent,
    meth: [...document.querySelectorAll('.lvmeth')].map((x) => x.textContent), bul: document.querySelectorAll('.lvbul li').length, how: q('.lvhow summary').textContent, howOpen: q('.lvhow').open,
    main: R(q('.lvmap-main')), side: R(q('.lvmap-side')), grid: getComputedStyle(q('.lvmap-grid')).columnGap, chart: R(q('.lhm-box')), lvH: R(q('#lvH')), mapW: m.width, maxW: getComputedStyle(map).maxWidth,
    keys: !!q('[data-lvkeys]'), clipped }; });
for (const [w, lang] of [[1440, 'en'], [1440, 'th'], [1024, 'en'], [390, 'th'], [360, 'en'], [360, 'th']]) {
  const { c, p, errs } = await lev('BTC', w, lang); const tag = `lv-tabs ${w} ${lang}`;
  await p.waitForSelector('.lvmap .lhm-box', { timeout: 60000 }); let r = await lvState(p);
  ok(r.tablist === 'tablist' && r.label && r.tabs.length === 2 && r.tabs[0].k === 'est' && r.tabs[0].sel === 'true' && r.tabs[0].ti === 0 && r.tabs[1].sel === 'false' && r.tabs[1].ti === -1, `${tag}: tablist, Estimated selected, roving tabindex`);
  ok(r.tabs.every((t) => r.pans.some((x) => x.id === t.ctl && x.by === 'lvTab-' + t.k)), `${tag}: aria-controls -> tabpanel, aria-labelledby back`);
  ok(r.tabs[0].txt === 'Estimated' && r.tabs[1].txt === 'Hyperliquid On-chain' && r.est === 'Estimated' && r.realBadge === 'Hyperliquid On-chain', `${tag}: tab names and badges`);
  ok(r.meth.length === 2 && r.meth.every((x) => x.length > 40), `${tag}: one-line method on each tab`);
  ok(r.pans[0].shown && r.pans[1].hidden && !r.pans[1].shown, `${tag}: only the selected panel shows`);
  ok(r.bul >= 3 && r.bul <= 5 && !r.howOpen && r.how === (lang === 'th' ? 'วิธีคำนวณและข้อจำกัด' : "How it's calculated and limits"), `${tag}: ${r.bul} bullets, collapsed "${r.how}"`);
  ok(r.chart.h >= 420 && r.chart.h <= 480 && Math.abs(r.chart.w - r.lvH.w) < 1 && Math.abs(r.lvH.w - r.main.w) < 1, `${tag}: chart ${r.chart.h}px tall, full width of its column`);
  ok(r.maxW === '1400px' && r.keys, `${tag}: max-width 1400px, key levels shown`);
  const two = w >= 1024 && r.mapW >= 700;
  if (two) ok(Math.abs(r.side.t - r.main.t) < 1 && Math.abs(r.main.w / (r.main.w + r.side.w) - 0.65) < 0.01 && r.grid === '24px', `${tag}: two columns 65/35, gap 24px (${r.main.w.toFixed(0)} / ${r.side.w.toFixed(0)})`);
  else ok(r.side.t >= r.main.b - 1 && Math.abs(r.side.w - r.main.w) < 1, `${tag}: one column, chart before OI (map ${r.mapW.toFixed(0)}px wide)`);
  if (w === 1440) ok(two, `${tag}: desktop 1440 gets the two-column layout`);
  if (w === 1024) ok(!two, `${tag}: 1024 with the 340px rail stays one column (map ${r.mapW.toFixed(0)}px)`);
  ok(!r.clipped.length, `${tag}: no clipped prices / dollar values ${JSON.stringify(r.clipped.slice(0, 4))}`);
  const o = await overflow(p); ok(!o.doc && !o.out.length, `${tag}: no sideways scroll ${JSON.stringify(o)}`);
  await p.focus('#lvTab-est'); await p.keyboard.press('ArrowRight'); r = await lvState(p);
  ok(r.tabs[1].sel === 'true' && r.tabs[1].focus && r.tabs[1].ti === 0 && r.tabs[0].ti === -1 && r.pans[1].shown && r.pans[0].hidden, `${tag}: ArrowRight selects Hyperliquid On-chain`);
  await p.keyboard.press('ArrowRight'); r = await lvState(p); ok(r.tabs[0].sel === 'true' && r.tabs[0].focus, `${tag}: ArrowRight wraps to Estimated`);
  await p.keyboard.press('End'); r = await lvState(p); ok(r.tabs[1].sel === 'true' && r.tabs[1].focus, `${tag}: End`);
  await p.keyboard.press('Home'); r = await lvState(p); ok(r.tabs[0].sel === 'true' && r.tabs[0].focus, `${tag}: Home`);
  await p.keyboard.press('ArrowLeft'); r = await lvState(p); ok(r.tabs[1].sel === 'true' && r.pans[1].shown, `${tag}: ArrowLeft wraps to Hyperliquid On-chain`);
  ok(await p.evaluate(() => S.lvTab === 'real'), `${tag}: choice kept for the session`);
  await p.click('#lvTab-est'); r = await lvState(p); ok(r.tabs[0].sel === 'true' && r.pans[0].shown, `${tag}: click selects`);
  ok(!errs.length, 'no page errors ' + errs.join(';')); if (SHOT) await p.locator('.lvmap').screenshot({ path: `${SHOT}/v60-lvmap-${w}-${lang}.png` }); await c.close(); }
await b.close();
console.log(`PASS leverage-ui: ${n} checks (two readings, own-history ranks, not enough history, excluded venues named, heatmap OI decline, phones EN/TH, L1 ladder lead, M4 coverage label, v60 liquidation-map tabs: ARIA, keyboard, layout)`);
