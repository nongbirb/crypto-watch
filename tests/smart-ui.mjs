// v51 Smart Money: Long/Short biggest positions ranked separately, sample size vs Hyperliquid OI, in-both-groups badge,
// liq distance / ROE, old-snapshot fallback, missing-market 'unavailable', and no sideways scroll at 360/390 EN/TH + desktop.
// Usage: node tests/smart-ui.mjs [baseUrl]   (default http://localhost:8787/)
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/', SHOT = process.env.SHOT || '';
const FX = JSON.parse(readFileSync(new URL('./fixtures/smart_money_v51.json', import.meta.url)));
const OLD = JSON.parse(JSON.stringify(FX)); /* pre-v51 shape: mixed top 12 only, no roe/b/both/marketAt */
delete OLD.marketAt; for (const c of Object.values(OLD.cohorts)) { delete c.universe.both; for (const x of Object.values(c.coins)) { delete x.topL; delete x.topS; (x.top || []).forEach((p) => { delete p.roe; delete p.b; }); } }
const NOMK = JSON.parse(JSON.stringify(FX)); delete NOMK.market; delete NOMK.marketAt;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
if (SHOT) mkdirSync(SHOT, { recursive: true });
async function open(w, h, lang, data, sel = 'ALL', coh = 'profit') {
  const c = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', isMobile: w < 600, hasTouch: w < 600 });
  await c.addInitScript(([l, s, k]) => { localStorage.setItem('cw-lang', l); localStorage.setItem('kms-sm-sel', JSON.stringify(s)); localStorage.setItem('kms-sm-coh', JSON.stringify(k)); }, [lang, sel, coh]);
  await c.route('**/smart_money.json*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(data) }));
  await c.route('https://api.hyperliquid.xyz/**', (r) => r.abort()); /* keep market numbers = fixture snapshot */
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '#/smart'); await p.waitForSelector('.smpos-sec .smpos', { timeout: 60000 }); await p.waitForTimeout(600);
  return { c, p, errs };
}
const overflow = (p) => p.evaluate(() => { const W = document.documentElement.clientWidth, m = document.querySelector('#main');
  const out = [...m.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.ui-help-body'); }).map((e) => e.className || e.tagName);
  const side = [...m.querySelectorAll('*')].filter((e) => e.offsetParent !== null && e.scrollWidth > e.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(e).overflowX)).map((e) => e.className || e.tagName);
  return { doc: document.documentElement.scrollWidth > W, out: [...new Set(out)].slice(0, 6), side }; });

// 1) BTC, Most profitable: lists, totals, sample size, liq distance, ROE, badges
{
  const { c, p, errs } = await open(1280, 900, 'en', FX, 'BTC');
  const x = FX.cohorts.profit.coins.BTC, mk = FX.market.BTC;
  const r = await p.evaluate(() => { const col = (i) => [...document.querySelectorAll('.smpcols .smpc')[i].querySelectorAll('.smpos')];
    const v = (e) => e.querySelector('.smpos-v').textContent; return { L: col(0).map((e) => [e.classList.contains('l'), v(e), !!e.querySelector('.smbadge'), e.textContent]), S: col(1).map((e) => [e.classList.contains('s'), v(e), !!e.querySelector('.smbadge'), e.textContent]),
      sum: document.querySelector('.smls').textContent, shown: [...document.querySelectorAll('.smpcols .smpc')].map((e) => e.querySelectorAll(':scope > .smpl > .smpos').length), assetv: ASSETV }; });
  ok(r.assetv === Number(process.env.EXPECT_ASSETV || 51), 'ASSETV ' + r.assetv);
  ok(r.L.length === x.topL.length && r.S.length === x.topS.length, `top ${x.topL.length} longs + top ${x.topS.length} shorts stored and shown separately`);
  ok(r.L.every((e) => e[0]) && r.S.every((e) => e[0]), 'long column only longs, short column only shorts');
  ok(r.shown.every((k) => k <= 5), '5 visible per side, rest behind Show more');
  const K = (v) => '$' + (v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : Math.round(v / 1e3) + 'k');
  ok(r.L[0][1] === K(x.topL[0].ntl) && r.S[0][1] === K(x.topS[0].ntl), 'biggest long/short = fixture topL[0]/topS[0]');
  ok(r.sum.includes(K(x.ntlLong)) && r.sum.includes(K(x.ntlShort)), 'long/short totals = fixture ntlLong/ntlShort');
  ok(r.sum.includes((100 * x.ntlLong / mk.oiUsd).toFixed(1) + '% of all Hyperliquid longs') && r.sum.includes((100 * x.ntlShort / mk.oiUsd).toFixed(1) + '% of all Hyperliquid shorts'), 'sample size = side notional / HL open interest');
  ok(/as of .*\d:\d\d/.test(r.sum) && r.sum.includes('Hyperliquid API'), 'sample size timestamped + sourced');
  ok(!/% of OI|ของ OI/.test(await p.evaluate(() => document.body.innerHTML)), 'no gross-as-%-of-OI wording (v47 rule)');
  ok(/whichever side won recently/.test(r.sum) && new RegExp(`${FX.cohorts.profit.universe.both} of 500 wallets`).test(r.sum), 'cohort note + overlap count');
  ok(r.L.filter((e) => e[2]).length === x.topL.filter((q) => q.b).length && r.S.filter((e) => e[2]).length === x.topS.filter((q) => q.b).length, '"in both groups" badge = b flag');
  const q = x.topL.find((t) => t.liq), mkp = q.ntl / q.sz, dist = (100 * (mkp - q.liq) / mkp).toFixed(1) + '% away';
  ok(r.L.some((e) => e[3].includes(dist)), 'long liq distance ' + dist);
  const qs = x.topS.find((t) => t.liq), ms = qs.ntl / qs.sz; ok(r.S.some((e) => e[3].includes((100 * (qs.liq - ms) / ms).toFixed(1) + '% away')), 'short liq distance');
  const roe = x.topL[0].roe * 100; ok(r.L[0][3].includes((roe > 0 ? '+' : '') + roe.toFixed(1) + '%'), 'ROE from Hyperliquid returnOnEquity');
  ok((await overflow(p)).side.length === 0, 'desktop 1280: no sideways scroll ' + JSON.stringify(await overflow(p)));
  await p.locator('[data-smcoh="size"]').click(); await p.waitForTimeout(500);
  const sz = await p.evaluate(() => [document.querySelector('.smpcols .smpos-v').textContent, document.querySelector('.smls').textContent]);
  ok(sz[0] === K(FX.cohorts.size.coins.BTC.topL[0].ntl) && /Ranked by account size/.test(sz[1]), 'cohort switch keeps groups separate');
  if (SHOT) await p.screenshot({ path: SHOT + '/smart-ui-desktop.png', fullPage: true });
  ok(!errs.length, 'no page errors ' + errs.join(';')); await c.close();
}
// 2) phones EN/TH: no sideways scroll, cards visible, table hidden
for (const [w, h] of [[360, 780], [390, 844]]) for (const lang of ['en', 'th']) {
  const { c, p, errs } = await open(w, h, lang, FX);
  const o = await overflow(p); ok(!o.doc && !o.out.length && !o.side.length, `${w} ${lang} no overflow/side-scroll ${JSON.stringify(o)}`);
  ok(await p.evaluate(() => document.querySelectorAll('.smls .smwhale').length > 0), `${w} ${lang} All tracked: whale badges rendered`);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.smtw')).display === 'none' && document.querySelectorAll('.smtm .smtc').length > 0), `${w} ${lang} per-token cards instead of wide table`);
  await p.locator('.smmore summary').first().click(); await p.waitForTimeout(200);
  const o2 = await overflow(p); ok(!o2.doc && !o2.out.length, `${w} ${lang} no overflow with Show more open`);
  if (lang === 'th') ok(await p.evaluate(() => /Long ใหญ่สุด/.test(document.body.innerText) && /ของ Long ทั้งหมดบน Hyperliquid/.test(document.body.innerText) && /อยู่ทั้ง 2 กลุ่ม/.test(document.body.innerText)), 'TH copy');
  if (SHOT) await p.screenshot({ path: `${SHOT}/smart-ui-${w}-${lang}.png`, fullPage: true });
  ok(!errs.length, 'no page errors ' + errs.join(';')); await c.close();
}
// 2b) whale warning: one wallet > 50% of a coin/side in this group -> badge on summary row + that wallet's card; below 50% -> none
{
  const hi = Object.entries(FX.cohorts.profit.coins).find(([, x]) => x.conc && x.conc.L && x.conc.L.pct > 50 && x.topL.some((p) => p.a === x.conc.L.a));
  const lo = Object.entries(FX.cohorts.profit.coins).find(([, x]) => x.conc && x.conc.L && x.conc.L.pct > 40 && x.conc.L.pct <= 50);
  ok(hi && lo, 'fixture has a coin/side above and one below 50%');
  for (const lang of ['en', 'th']) {
    const { c, p, errs } = await open(390, 844, lang, FX, hi[0]);
    const pct = hi[1].conc.L.pct.toFixed(0), want = lang === 'en' ? `1 wallet = ${pct}% of ${hi[0]} longs` : `กระเป๋าเดียวถือ ${pct}% ของ Long ${hi[0]}`;
    const r = await p.evaluate(() => ({ sum: [...document.querySelectorAll('.smls .smls-r')].map((e) => e.querySelector('.smwhale')?.textContent || ''),
      cards: [...document.querySelectorAll('.smpos')].filter((e) => e.querySelector('.smwhale')).map((e) => [e.classList.contains('l'), e.querySelector('a').title, e.querySelector('.smwhale').textContent]) }));
    ok(r.sum[0] === want && r.sum[1] === '', `${lang} ${hi[0]} summary: whale badge on Longs only (${r.sum[0]})`);
    ok(r.cards.length === 1 && r.cards[0][0] && r.cards[0][1] === hi[1].conc.L.a && r.cards[0][2] === want, `${lang} ${hi[0]} badge on that wallet's card only`);
    const o = await overflow(p); ok(!o.doc && !o.out.length && !o.side.length, `${lang} 390 whale badges no overflow`);
    ok(!errs.length, 'no page errors ' + errs.join(';')); await c.close();
  }
  const { c, p } = await open(390, 844, 'en', FX, lo[0]);
  ok(await p.evaluate(() => document.querySelectorAll('.smwhale').length === 0), `${lo[0]} at ${lo[1].conc.L.pct}% (<= 50%): no whale badge`); await c.close();
}
// 3) pre-v51 snapshot still renders (split from mixed top 12), ROE/overlap shown as unavailable
{
  const { c, p, errs } = await open(390, 844, 'en', OLD, 'BTC');
  const r = await p.evaluate(() => ({ t: document.querySelector('.smpos-sec').textContent, L: document.querySelectorAll('.smpcols .smpc')[0].querySelectorAll('.smpos.l').length, S: document.querySelectorAll('.smpcols .smpc')[1].querySelectorAll('.smpos.s').length }));
  const t = OLD.cohorts.profit.coins.BTC.top; ok(r.L === t.filter((q) => q.side === 'L').length && r.S === t.filter((q) => q.side === 'S').length, 'old snapshot split from mixed top');
  ok(/before Long and Short were stored separately/.test(r.t) && /ROEUnavailable/.test(r.t) && /Overlap between the two groups: unavailable/.test(r.t), 'old snapshot: notes + unavailable');
  ok(!errs.length, 'no page errors ' + errs.join(';')); await c.close();
}
// 4) market context missing -> sample size 'unavailable', nothing invented
{
  const { c, p, errs } = await open(1280, 900, 'en', NOMK, 'BTC');
  const t = await p.evaluate(() => document.querySelector('.smls').textContent);
  ok(/share of Hyperliquid: unavailable/.test(t) && /open interest for this selection: unavailable/.test(t), 'missing market -> unavailable');
  ok(!errs.length, 'no page errors ' + errs.join(';')); await c.close();
}
await b.close();
console.log(`PASS smart-ui: ${n} checks (Long/Short split, sample size, overlap badge, liq distance/ROE, fallbacks, no overflow 360/390 EN/TH + desktop)`);
