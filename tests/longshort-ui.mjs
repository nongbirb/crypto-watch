// v77 long / short in Chromium, desktop + phone (Binance futures answered by tests/lib/bnmock.mjs: test machines are geo-blocked):
//  - Positioning tab: real money (Hyperliquid $ from data/hlliq.json), big traders' money (Binance + OKX top-trader POSITION ratios) and
//    head count (account ratios) as three separate bars, each recomputed here; OI total and OI-weighted funding; per-venue rows with
//    Hyperliquid in dollars; history chart from Binance 4h, or from OKX 4h (positioning.json) when Binance does not answer;
//  - Market health: long / short of the 25 largest coins + your coins, recomputed from hlliq.json, sortable, Binance head count per coin
//    ("–" where Binance does not list it); no sideways scroll on a phone.
// Usage: node tests/longshort-ui.mjs [baseUrl]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '../node_modules/playwright-core/index.mjs';
import { mockBinance, acc, pos } from './lib/bnmock.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/';
const HL = JSON.parse(fs.readFileSync('data/hlliq.json', 'utf8')), PJ = JSON.parse(fs.readFileSync('positioning.json', 'utf8'));
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const lp = (l, s) => (100 * l) / (l + s), f1 = (v) => v.toFixed(1);
const open = async (vp, route, opt = {}) => { const c = await b.newContext({ viewport: vp, serviceWorkers: 'block', isMobile: vp.width < 500, hasTouch: vp.width < 500 }); await mockBinance(c, opt);
  await c.addInitScript(() => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('cw-lang', 'en'); localStorage.setItem('cw-sel', 'BTC'); localStorage.setItem('cw-tab', JSON.stringify('pos')); localStorage.removeItem('cw-hm-ls'); });
  const p = await c.newPage(), errs = []; p.on('pageerror', (e) => errs.push(String(e))); await p.goto(B + route); return { c, p, errs }; };
const toPos = async (p) => { await p.waitForSelector('[data-tab="pos"]', { timeout: 60000 }); if (!(await p.$('[data-lssum]'))) await p.click('[data-tab="pos"]'); await p.waitForSelector('[data-lssum]', { timeout: 60000 }); await p.waitForTimeout(2500); };
// 1) Positioning tab, BTC
for (const vp of [{ width: 1280, height: 1000 }, { width: 390, height: 844 }]) { const tag = vp.width < 500 ? 'phone' : 'desktop';
  const { c, p, errs } = await open(vp, 'index.html#/markets'); await toPos(p);
  const g = await p.evaluate(() => { const D = PO.c.BTC, bar = (k) => { const r = document.querySelector(`[data-lssum] [data-ls="${k}"]`); return r ? +r.querySelector('.lsh .up').textContent.replace(/[^\d.]/g, '') : null; };
    const oi = Object.fromEntries(D.oi.map((v) => [v.venue, v.oiUsd])), w = (rows) => { const W = rows.reduce((a, x) => a + x.w, 0); return W ? rows.reduce((a, x) => a + x.v * x.w, 0) / W : null; };
    return { hl: bar('hl'), top: bar('top'), acc: bar('acc'), topExp: w(D.F.filter((x) => x.topPos != null && oi[x.v]).map((x) => ({ v: x.topPos, w: oi[x.v] }))), accExp: w(D.F.filter((x) => oi[x.v]).map((x) => ({ v: x.lp, w: oi[x.v] }))),
      F: D.F.map((x) => [x.v, x.lp, x.topPos]), fund: (document.querySelector('[data-lssum] .lssts') || {}).innerText, fundExp: w(D.oi.filter((v) => v.f8 != null).map((v) => ({ v: v.f8 * 100, w: v.oiUsd }))), oiTot: D.oi.reduce((a, v) => a + v.oiUsd, 0),
      hlRow: (document.querySelector('.porow:has(b)') && [...document.querySelectorAll('.pos .porow')].find((r) => /Hyperliquid/.test(r.querySelector('b').textContent)) || {}).innerText,
      ch: S.charts.length ? S.charts[S.charts.length - 1].panes()[0].getSeries().map((s) => s.data().length) : [], src: (document.querySelector('#lsChS') || {}).textContent, ov: document.documentElement.scrollWidth - innerWidth }; });
  const h = HL.coins.BTC; ok(g.hl === +f1(lp(h.long, h.short)), `${tag} real money: Hyperliquid ${g.hl}% long = hlliq.json ($${(h.long / 1e6).toFixed(0)}M / $${(h.short / 1e6).toFixed(0)}M)`);
  const bnF = g.F.find((x) => x[0] === 'binance'), okF = g.F.find((x) => x[0] === 'okx'), okTop = PJ.futures.BTC.okx.top4;
  ok(bnF && bnF[1] === acc('BTC') && bnF[2] === pos('BTC') && (!okTop || Math.abs(okF[2] - lp(okTop[okTop.length - 1][1], 1)) < 1e-9), `${tag} venue figures: Binance accounts ${bnF && bnF[1]}% / money ${bnF && bnF[2]}%, OKX money from positioning.json`);
  ok(g.top === +f1(g.topExp) && g.acc === +f1(g.accExp), `${tag} big traders ${g.top}% and head count ${g.acc}% = OI-weighted venue figures`);
  ok(g.top < g.acc, `${tag} three separate bars, money and head count differ (${g.top}% vs ${g.acc}%)`);
  ok(/longs pay shorts|shorts pay longs|balanced/.test(g.fund) && g.fund.includes((g.fundExp > 0 ? '+' : '') + g.fundExp.toFixed(4) + '%'), `${tag} funding OI-weighted ${g.fundExp.toFixed(4)}%/8h with who pays`);
  ok(/real money/.test(g.hlRow) && /\$708|\$\d/.test(g.hlRow), `${tag} Hyperliquid row in dollars: ${g.hlRow.replace(/\s+/g, ' ').slice(0, 90)}`);
  ok(g.ch.length >= 2 && g.ch.some((x) => x === 180) && /Binance BTCUSDT · 4h/.test(g.src), `${tag} history: Binance 4h, 180 points per line (${g.ch.join(', ')}) + price`);
  ok(g.ov <= 0, `${tag} no sideways scroll`); ok(errs.length === 0, `${tag} no page errors ${errs.join(' | ')}`); await c.close(); }
// 2) Binance not answering: OKX history from positioning.json, the summary still shows Hyperliquid and OKX
{ const { c, p, errs } = await open({ width: 1280, height: 1000 }, 'index.html#/markets', { unlisted: ['BTC'] }); await toPos(p);
  const g = await p.evaluate(() => ({ src: (document.querySelector('#lsChS') || {}).textContent, rows: [...document.querySelectorAll('[data-lssum] [data-ls]')].map((r) => r.dataset.ls), n: S.charts.length ? S.charts[S.charts.length - 1].panes()[0].getSeries().map((s) => s.data().length) : [] }));
  const p4 = PJ.futures.BTC.okx.pts4; // written by the positioning Action from v77 on; an older file has no history, so the chart is hidden
  if (p4) ok(/OKX BTC-USDT-SWAP · 4h/.test(g.src) && g.n.some((x) => x === p4.length), `no Binance: history from OKX 4h (${g.n.join(', ')} points)`);
  else ok(await p.evaluate(() => document.querySelector('.lsch').hidden), 'no Binance and no OKX history yet: the history chart is hidden, not empty');
  ok(g.rows.join() === (PJ.futures.BTC.okx.top4 ? 'hl,top,acc' : 'hl,acc'), `no Binance: bars from Hyperliquid + OKX (${g.rows.join()})`); ok(errs.length === 0, 'no page errors ' + errs.join(' | ')); await c.close(); }
// 3) Market health table
for (const vp of [{ width: 1280, height: 1000 }, { width: 390, height: 844 }]) { const tag = vp.width < 500 ? 'phone' : 'desktop';
  const { c, p, errs } = await open(vp, 'index.html#/breadth', { unlisted: ['ZEC'] }); await p.waitForSelector('#hmLs table', { timeout: 60000 }); await p.waitForFunction(() => ![...document.querySelectorAll('#hmLs [data-bn]')].some((x) => x.textContent === '…'), null, { timeout: 60000 });
  const rows = () => p.evaluate(() => [...document.querySelectorAll('#hmLs tbody tr')].map((r) => ({ k: r.cells[0].querySelector('b').textContent, l: +r.cells[1].querySelector('.up').textContent.replace('%', ''), bn: r.cells[3].textContent.trim(), mine: r.classList.contains('mine') })));
  const R = await rows(), mine = await p.evaluate(() => S.cfg.map((x) => x.symbol)), top25 = Object.entries(HL.coins).filter(([, x]) => x.long + x.short > 0 && x.oi > 0).sort((a, b) => b[1].oi - a[1].oi).slice(0, 25).map(([k]) => k);
  ok(top25.every((k) => R.some((r) => r.k === k)) && R.filter((r) => r.mine).every((r) => mine.includes(r.k)) && R.slice(0, 3).map((r) => r.k).join() === top25.slice(0, 3).join(), `${tag} 25 largest coins by OI + your coins (${R.length} rows), largest first`);
  ok(R.every((r) => r.l === Math.round(lp(HL.coins[r.k].long, HL.coins[r.k].short))), `${tag} long % = hlliq.json for every row`);
  ok(R.filter((r) => /^[A-Z0-9]{2,10}$/.test(r.k) && r.k !== 'ZEC').every((r) => r.bn === `${acc(r.k).toFixed(0)}%`) && R.find((r) => r.k === 'ZEC').bn === '–', `${tag} Binance head count per coin, "–" where Binance has no pair (ZEC)`);
  await p.click('[data-hmls="short"]'); await p.waitForFunction(() => document.querySelector('[data-hmls="short"]').getAttribute('aria-pressed') === 'true'); const S2 = await rows();
  ok(S2.every((r, i) => i === 0 || S2[i - 1].l <= r.l) && S2[0].l <= 40, `${tag} "Most short" sorts by long % ascending (${S2.slice(0, 3).map((r) => r.k + ' ' + r.l + '%').join(', ')})`);
  await p.click('[data-hmls="long"]'); await p.waitForFunction(() => document.querySelector('[data-hmls="long"]').getAttribute('aria-pressed') === 'true'); const L2 = await rows();
  ok(L2.every((r, i) => i === 0 || L2[i - 1].l >= r.l), `${tag} "Most long" sorts descending (${L2.slice(0, 3).map((r) => r.k + ' ' + r.l + '%').join(', ')})`);
  ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 0), `${tag} no sideways scroll`); ok(errs.length === 0, `${tag} no page errors ${errs.join(' | ')}`); await c.close(); }
await b.close(); console.log(`PASS longshort-ui: ${n} checks`);
