// v60 Estimated liquidation map (audit 2026-11-17): replays real BTC and MON venue inputs recorded that day
// (tests/fixtures/lev/heatmap-2026-11-17.json: Binance + Bybit hourly OI with native coin counts, OKX + Hyperliquid
// recorded hours) through aggOi() + heatmap() at every end hour. Before the fix one hourly drop larger than the
// in-window notional emptied the whole map. Checks: never all-zero after a partial drop, a 100% drop gives all zeros
// and the empty-state message (EN + TH), no negative bin, OI counted in coins (price alone does not shrink clusters),
// full window kept although Hyperliquid's record starts Nov 14, and the Phase 4 audit cases. No exchange requests:
// everything outside the local server is aborted. Usage: node tests/leverage-heatmap.mjs [baseUrl]
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/';
const FX = JSON.parse(readFileSync(new URL('./fixtures/lev/heatmap-2026-11-17.json', import.meta.url), 'utf8'));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };
const host = new URL(B).host;
async function page(lang) {
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await c.addInitScript((l) => localStorage.setItem('cw-lang', l), lang);
  await c.route('**/*', (r) => (new URL(r.request().url()).host === host ? r.continue() : r.abort()));
  const p = await c.newPage(); await p.goto(B + '#/markets'); await p.waitForFunction(() => typeof heatmap === 'function' && typeof aggOi === 'function');
  return p;
}
const p = await page('en');
// replay: every end hour of the last 7 days (each venue cut at that hour, the price = that hour's price)
const R = await p.evaluate((fx) => { const out = {};
  for (const [s, T] of Object.entries(fx.tokens)) {
    const pr = T.venues.find((v) => v.venue === 'binance' && v.oiHist.length > 24), ends = pr.oiHist.map((x) => x.t), rows = [];
    for (let e = 24; e < ends.length; e++) { const te = ends[e];
      const vs = T.venues.map((v) => ({ ...v, oiHist: v.oiHist.filter((x) => x.t <= te), ls: v.ls.filter((x) => x.t <= te), oiRec: v.oiRec ? v.oiRec.filter((x) => x.t <= te) : v.oiRec }));
      const prim = vs.find((v) => v.venue === 'binance'), agg = aggOi(vs, prim), tot = vs.reduce((a, v) => a + v.oiUsd, 0);
      const lsA = vs.filter((v) => v.ls.length), lsV = lsA.slice().sort((a, b) => b.oiUsd - a.oiUsd)[0];
      const H = heatmap({ price: agg[agg.length - 1].px }, { ...prim, oiHist: agg, oiUsd: tot }, lsV, vs);
      const nz = H.bins.filter((x) => x.long + x.short > 0).length, neg = H.bins.some((x) => x.long < 0 || x.short < 0 || !Number.isFinite(x.long + x.short));
      const drop = agg.some((x, i) => i && x.c < agg[i - 1].c), coinsOk = agg.every((x) => Number.isFinite(x.c) && x.c > 0);
      rows.push({ t: te, nz, neg, empty: H.empty, drop, coinsOk, n: agg.length, hrs: H.hrs }); }
    out[s] = rows; }
  return out; }, FX);
for (const [s, rows] of Object.entries(R)) {
  ok(rows.every((r) => !r.neg), `${s}: no negative / non-finite bin at any of ${rows.length} end hours`);
  ok(rows.every((r) => r.coinsOk), `${s}: every aggregated hour has a coin count (native or USD / hour price)`);
  ok(rows.some((r) => r.drop), `${s}: the replay contains hourly OI drops`);
  ok(rows.every((r) => !r.empty && r.nz > 0), `${s}: map never all-zero after a partial drop (min ${Math.min(...rows.map((r) => r.nz))} bins, last 12: ${rows.slice(-12).map((r) => r.nz).join(',')})`);
  const L = rows[rows.length - 1]; ok(L.n >= 160 && L.hrs >= 159, `${s}: full window kept although Hyperliquid starts Nov 14 (${L.n} hours, label ${L.hrs} h)`);
}
// synthetic drops on the real BTC shape: 60% drop keeps clusters, 100% drop empties every bin
const D = await p.evaluate((fx) => { const T = fx.tokens.BTC, vs = T.venues.map((v) => ({ ...v })), prim = vs.find((v) => v.venue === 'binance'), agg = aggOi(vs, prim), L = agg[agg.length - 1];
  const run = (f) => { const h = [...agg, { t: L.t + 36e5, usd: L.usd * f, c: L.c * f, px: L.px }]; const H = heatmap({ price: L.px }, { ...prim, oiHist: h, oiUsd: L.usd * f }, null, vs); return { sum: H.bins.reduce((s, x) => s + x.long + x.short, 0), empty: H.empty, neg: H.bins.some((x) => x.long < 0 || x.short < 0) }; };
  return { base: run(1), part: run(0.4), all: run(0) }; }, FX);
// k = 1 - drop / (pool + open): tiers already liquidated by a wick left `open` but are still in the venues' OI, so pool + open <= total coins and k <= 0.4
ok(!D.part.empty && D.part.sum > 0 && D.part.sum / D.base.sum <= 0.4 + 1e-9, `60% OI drop keeps clusters, scaled by k = 1 + d / (pool + open) = ${(D.part.sum / D.base.sum).toFixed(4)} (<= 0.4)`);
ok(D.all.empty && D.all.sum === 0 && !D.all.neg, '100% OI drop: all bins 0, flagged empty, none negative');
// coin terms: a price move with the coin count unchanged must not shrink the clusters (rows with c, and USD-only rows via usd / px)
const C = await p.evaluate(() => { const v = [{ oiUsd: 1, maxLev: 100, mm: 0.005 }];
  const S = (px, withC) => { const r = (usd, c, x) => (withC ? { usd, c, px: x } : { usd, px: x }); const h = [{ t: 0, ...r(0, 0, 100) }, { t: 36e5, ...r(1000, 10, 100) }, { t: 72e5, ...r(10 * px, 10, px) }];
    return heatmap({ price: 100 }, { oiHist: h, oiUsd: 10 * px, mark: 100 }, null, v).bins.reduce((s, x) => s + x.long + x.short, 0); };
  return { flat: S(100, true), down: S(99.6, true), flatU: S(100, false), downU: S(99.6, false) }; });
ok(C.flat > 0 && Math.abs(C.down / C.flat - 1) < 1e-12, `price -0.4% with coins unchanged keeps every cluster (${C.down.toFixed(3)} vs ${C.flat.toFixed(3)})`);
ok(Math.abs(C.downU / C.flatU - 1) < 1e-12, 'same for USD-only rows (coins = usd / that hour\'s price)');
// Phase 4 audit cases unchanged (they start at 0 OI, so the pool is 0)
const A = await p.evaluate(() => { const t = { price: 100 }, H = (o, v) => { const h = [{ t: 0, usd: 0, px: 100 }, { t: 36e5, usd: 1000, px: 100 }, ...o]; return heatmap(t, { oiHist: h, oiUsd: h[h.length - 1].usd, mark: 100 }, null, v).bins.reduce((s, b) => s + b.long + b.short, 0); };
  const v1 = [{ oiUsd: 1, maxLev: 100, mm: 0.005 }]; const a = H([], v1), d = H([{ t: 72e5, usd: 400, px: 100 }], v1), f = H([{ t: 72e5, usd: 1000, px: 100 }], v1);
  return { a, d, f }; });
ok(Math.abs(A.d / A.a - 0.4) < 1e-9 && Math.abs(A.f / A.a - 1) < 1e-12, `audit: OI 1000→400 keeps 40%, 1000→1000 flat (${(A.d / A.a).toFixed(3)})`);
// empty state in the UI, EN and TH: message shown, no bands, no callouts
for (const lang of ['en', 'th']) { const q = lang === 'en' ? p : await page('th');
  const E = await q.evaluate(() => { const T = { price: 100 }, h = [{ t: 0, usd: 0, px: 100 }, { t: 36e5, usd: 1000, c: 10, px: 100 }, { t: 72e5, usd: 0, c: 0, px: 100 }];
    const H = heatmap(T, { oiHist: h, oiUsd: 0, mark: 100 }, null, [{ oiUsd: 1, maxLev: 100, mm: 0.005 }]); const el = document.createElement('div'); el.className = 'lev'; el.style.width = '600px'; document.body.appendChild(el); liqHeat(el, H, h);
    const m = el.querySelector('[data-lvempty]'), r = m && m.getBoundingClientRect(); return { empty: H.empty, txt: m ? m.textContent : null, vis: !!(r && r.width > 0 && r.height > 0), bands: el.querySelectorAll('.lhm-heat i').length, w: m ? m.scrollWidth <= m.clientWidth + 1 : false }; });
  const want = lang === 'en' ? 'No estimated liquidation clusters right now' : 'ตอนนี้ยังไม่มีกลุ่ม liquidation ที่ประมาณได้';
  ok(E.empty && E.txt === want && E.vis && E.bands === 0 && E.w, `${lang}: all-zero map shows "${want}" and draws no band`); }
await b.close(); console.log(`leverage-heatmap: ${n} checks passed`);
