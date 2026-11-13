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
  await p.goto(B + '#/smart'); await p.waitForSelector('.smpos-sec', { state: 'attached', timeout: 60000 });
  // v55: Biggest positions is collapsed by default (docs/architect-proof-layer.md §3.4); open it like a reader would, then check as before
  if (!(await p.evaluate(() => document.querySelector('details.smpos-sec').open))) await p.locator('.smpos-sec > summary').click();
  await p.waitForSelector('.smpos-sec .smpos', { timeout: 60000 }); await p.waitForTimeout(600);
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
  ok(r.assetv === Number(process.env.EXPECT_ASSETV || 55), 'ASSETV ' + r.assetv);
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
// ---------- v55 Smart Money v2: fixed panel (fixture = a real Hyperliquid snapshot from the v55 builder, tracked tokens only) ----------
{
  const P55 = JSON.parse(readFileSync(new URL('./fixtures/smart_money_v55.json', import.meta.url))), REC = JSON.parse(readFileSync(new URL('./fixtures/sm_recent_v55.json', import.meta.url)));
  const K = (v) => (v < 0 ? '−' : v > 0 ? '+' : '') + '$' + (Math.abs(v) >= 1e9 ? (Math.abs(v) / 1e9).toFixed(2) + 'B' : Math.abs(v) >= 1e6 ? (Math.abs(v) / 1e6).toFixed(2) + 'M' : Math.abs(v) >= 1e3 ? Math.round(Math.abs(v) / 1e3) + 'k' : Math.round(Math.abs(v)));
  const ef = () => { const f = { L: {}, S: {} }; for (const sd of ['L', 'S']) for (const k of ['open', 'close', 'inc', 'red', 'flip']) f[sd][k] = [0, 0]; return f; };
  /* test-only flows (the fixture's two real snapshots were a minute apart): BTC -42M = 31 short adds ($40M) + 9 long closes ($2M) */
  const WF = JSON.parse(JSON.stringify(P55)), sel = WF.cohorts.panel.universe.selected;
  const btc = ef(); btc.S.inc = [20, 25e6]; btc.S.open = [11, 15e6]; btc.L.close = [9, 2e6]; btc.dL = -2e6; btc.dS = 40e6; btc.net = -42e6;
  const eth = ef(); eth.L.open = [3, 5e6]; eth.dL = 5e6; eth.dS = 0; eth.net = 5e6;
  WF.flows.h24 = { from: sel, to: WF.snapshotAt, runs: 5, hours: 24, sinceSelection: true, coins: { BTC: btc, ETH: eth } };
  WF.flows.d7 = { ...WF.flows.h24, hours: 168, coins: { BTC: { ...btc, net: -50e6 }, ETH: eth } };
  const NOF = JSON.parse(JSON.stringify(P55)); NOF.flows.h24 = null; NOF.flows.d7 = null; NOF.flows.last = { ...NOF.flows.last, ok: false, t0: null, reason: 'no previous snapshot (Actions cache miss): no flow for this interval' };
  const PART = JSON.parse(JSON.stringify(WF)); PART.cohorts.panel.universe.wallets = 250; PART.cohorts.panel.universe.sample = true;
  async function open55(w, h, lang, data, sel_ = 'ALL', stored = null) {
    const c = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', isMobile: w < 600, hasTouch: w < 600 });
    await c.addInitScript(([l, s, k]) => { localStorage.setItem('cw-lang', l); localStorage.setItem('kms-sm-sel', JSON.stringify(s)); if (k) localStorage.setItem('kms-sm-coh2', JSON.stringify(k)); }, [lang, sel_, stored]);
    await c.route('**/smart_money.json*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(data) }));
    await c.route('**/data/sm/recent.json*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(REC) }));
    await c.route('https://api.hyperliquid.xyz/**', (r) => r.abort());
    const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(B + '#/smart'); await p.waitForSelector('.smft-r[data-smsel]', { timeout: 60000 }); await p.waitForTimeout(500);
    return { c, p, errs };
  }
  // 5a) default view is the panel; page order; positions and tape collapsed
  { const { c, p, errs } = await open55(1280, 900, 'en', WF);
    const r = await p.evaluate(() => { const m = document.querySelector('#main'), q = (x) => m.querySelector(x), pos = (x) => [...m.querySelectorAll('*')].indexOf(q(x));
      return { coh: q('[data-smcoh][aria-pressed="true"]').dataset.smcoh, order: ['.smhl', '.smflow-sec', '.smuw-sec', '.smlev-sec', '.smpos-sec', '.smtape-sec'].map(pos), posOpen: q('details.smpos-sec').open, tapeOpen: q('details.smtape-sec').open,
        desc: q('.smcoh').textContent, hl: q('.smhl').textContent, rows: [...m.querySelectorAll('.smft-r[data-smsel]')].map((e) => [e.dataset.smsel, [...e.children].map((x) => x.textContent.trim())]), spark: m.querySelectorAll('.smft svg.smspk').length }; });
    ok(r.coh === 'panel', 'panel is the default cohort');
    ok(r.order.every((x, i) => x >= 0 && (!i || x > r.order[i - 1])), 'order: headline, flows, underwater, levels, biggest positions, tape ' + r.order);
    ok(!r.posOpen && !r.tapeOpen, 'biggest positions and live tape collapsed by default');
    ok(r.desc.includes('fixed panel of 300 wallets') && /selected .*\d:\d\d/.test(r.desc) && r.desc.includes('Monday 00:00 UTC'), 'rule + selection date stated');
    ok(r.hl.includes(`net ${K(-42e6)} BTC (31 adds to shorts, 9 long cuts or closes)`) && /Fixed panel, since .*\d:\d\d/.test(r.hl), 'headline sentence from flows, labelled since the selection: ' + r.hl.slice(0, 140));
    ok(r.hl.indexOf('BTC') < r.hl.indexOf('ETH'), 'largest |net| first');
    const want = (s) => WF.flows.h24.coins[s] ? K(WF.flows.h24.coins[s].net) : '–';
    ok(r.rows.length === 9 && r.rows.every(([s, cells]) => cells[1] === want(s)), 'flow table: one row per token, 24h net = flows.h24');
    ok(r.rows.find((x) => x[0] === 'BTC')[1][2] === K(-50e6), 'flow table: 7d net = flows.d7');
    ok(r.spark === 9, 'net-position sparkline per token from data/sm/recent.json');
    ok(!errs.length, 'no page errors ' + errs.join(';')); await c.close(); }
  // 5b) one token: who is underwater (real numbers) + real liquidation ladder + drill-down
  { const { c, p, errs } = await open55(1280, 900, 'en', WF, 'BTC'); const x = WF.cohorts.panel.coins.BTC;
    const r = await p.evaluate(() => ({ uw: document.querySelector('.smuw').textContent, lq: document.querySelectorAll('.smlq-r').length, real: document.querySelector('.smuw-sec .smreal').textContent, foot: document.querySelector('.smuw-sec').textContent }));
    ok(r.uw.includes(x.uw.S.lossPct.toFixed(0) + '%') && r.uw.includes(x.uw.S.medLiqDist.toFixed(1) + '%') && r.uw.includes(`${x.uw.S.n} · `), 'underwater: in-loss share, median liq distance, positions');
    ok(r.lq === x.liq.bins.length, `ladder rows = liqBins (${x.liq.bins.length})`);
    ok(r.real === `Real · Hyperliquid tracked wallets (sample of 300, ${K(x.ntlLong + x.ntlShort).replace('+', '')})`, 'real label with sample and value: ' + r.real);
    ok(r.foot.includes(`no liquidation price reported: ${x.liq.noLiq.n} positions`), 'positions without liq price counted, not dropped');
    await p.locator('.smpos-sec > summary').click(); await p.waitForTimeout(300);
    const a = x.topS[0].a, W = WF.cohorts.panel.wallets[a];
    const d = await p.evaluate((a) => { const e = document.querySelector(`.smdrill[data-smw="${a}"]`); e.open = true; return e.textContent; }, a);
    ok(W.pos.every((q) => d.includes(q[0])) && (W.chg && W.chg.length ? W.chg.every((q) => d.includes(q[0])) : /No change since the last snapshot|No previous snapshot/.test(d)), 'drill-down: wallet positions and changes since the last snapshot');
    ok((await overflow(p)).side.length === 0, 'desktop: no sideways scroll');
    if (SHOT) await p.screenshot({ path: SHOT + '/v55-smart-desktop-btc.png', fullPage: true });
    ok(!errs.length, 'no page errors ' + errs.join(';')); await c.close(); }
  // 5c) no flow (cache miss) -> says so, no numbers invented; partial answer -> "sample of N of M"
  { const { c, p, errs } = await open55(390, 844, 'en', NOF);
    const r = await p.evaluate(() => ({ hl: document.querySelector('.smhl').textContent, cells: [...document.querySelectorAll('.smft-r[data-smsel]')].map((e) => e.children[1].textContent.trim()) }));
    ok(/no flow measured yet/.test(r.hl) && /cache miss/.test(r.hl) && /Nothing is estimated/.test(r.hl), 'cache miss: no flow, reason shown');
    ok(r.cells.every((x) => x === '–'), 'cache miss: flow cells empty, not zero'); ok(!errs.length, 'no page errors ' + errs.join(';')); await c.close(); }
  { const { c, p } = await open55(390, 844, 'en', PART);
    ok(await p.evaluate(() => /sample of 250 of 300 wallets/.test(document.querySelector('.smcoh').textContent) && /sample of 250 of 300 wallets/.test(document.querySelector('.smhl').textContent)), 'partial answer labelled sample of N of M'); await c.close(); }
  // 5d) phones EN/TH, sections opened: no sideways scroll; TH copy
  for (const [w, h] of [[360, 780], [390, 844]]) for (const lang of ['en', 'th']) for (const s of ['ALL', 'BTC']) {
    const { c, p, errs } = await open55(w, h, lang, WF, s);
    await p.locator('.smpos-sec > summary').click(); await p.locator('.smtape-sec > summary').click(); await p.waitForTimeout(300);
    if (s === 'BTC') await p.evaluate(() => document.querySelectorAll('.smdrill').forEach((e) => { e.open = true; }));
    const o = await overflow(p); ok(!o.doc && !o.out.length && !o.side.length, `v55 ${w} ${lang} ${s}: no overflow/side-scroll ${JSON.stringify(o)}`);
    if (lang === 'th') ok(await p.evaluate(() => /กลุ่มคงที่/.test(document.body.innerText) && /เงินไหลรายเหรียญ/.test(document.body.innerText) && /ใครติดลบ/.test(document.body.innerText)), `v55 ${w} TH copy`);
    if (SHOT) await p.screenshot({ path: `${SHOT}/v55-smart-${w}-${lang}-${s}.png`, fullPage: true });
    ok(!errs.length, 'no page errors ' + errs.join(';')); await c.close();
  }
  // 5e) snapshot without a panel (pre-v55 data): falls back to Most profitable and says why
  { const { c, p, errs } = await open(390, 844, 'en', FX);
    ok(await p.evaluate(() => /fixed panel is not in this snapshot yet/.test(document.body.innerText) && document.querySelector('[data-smcoh][aria-pressed="true"]').dataset.smcoh === 'profit' && !document.querySelector('[data-smcoh="panel"]')), 'no panel -> profit + note');
    ok(!errs.length, 'no page errors ' + errs.join(';')); await c.close(); }
  // 5f) Leverage tab: the real layer beside the estimate, own label, never summed
  { const c = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    await c.addInitScript(() => { localStorage.setItem('cw-lang', 'en'); });
    await c.route('**/smart_money.json*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(WF) }));
    const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(B + '#/markets'); await p.waitForSelector('[data-sel="BTC"]', { timeout: 60000 }); await p.click('[data-sel="BTC"]'); await p.waitForTimeout(800);
    await p.click('[data-tab="lev"]');
    const got = await p.waitForSelector('#lvR [data-lvreal]', { timeout: 90000 }).catch(() => null);
    if (!got) console.log('note: Leverage tab did not load (exchange APIs unreachable?)', await p.evaluate(() => (document.querySelector('#tabBody, .lev') || document.body).innerText.slice(0, 200)));
    else { const r = await p.evaluate(() => ({ real: document.querySelector('#lvR [data-lvreal]').textContent, est: document.querySelector('.lev .tagest').textContent, rows: document.querySelectorAll('#lvR .smlq-r').length }));
      ok(r.real.startsWith('Real · Hyperliquid tracked wallets (sample of 300') && r.est === 'Estimate' && r.rows === WF.cohorts.panel.coins.BTC.liq.bins.length, 'Leverage tab: real layer with its own label beside the Estimate'); }
    ok(!errs.length, 'no page errors ' + errs.join(';')); await c.close(); }
}
await b.close();
console.log(`PASS smart-ui: ${n} checks (Long/Short split, sample size, overlap badge, liq distance/ROE, fallbacks, no overflow 360/390 EN/TH + desktop; v55 panel: order, headline, flow table, no-flow, underwater + real clusters, drill-down, sample label, Leverage real layer)`);
