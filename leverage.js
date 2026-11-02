/* KMS Capital – Leverage tab (derivatives). Free public APIs: Binance USDⓈ-M, Bybit v5, OKX v5, Hyperliquid. */
'use strict';
const LEV = {}; // cache per symbol
const HL = { ctx: null, at: 0 };
const num = (x) => x == null || x === '' ? null : +x;
function perpVenues(t) {
  const s = t.symbol, ex = new Set(t.sources.map((x) => x.ex)), o = t.perps || {};
  const v = [];
  if (o.binance !== false) v.push(['binance', o.binance || s + 'USDT']);
  if (o.bybit !== false) v.push(['bybit', o.bybit || s + 'USDT']);
  if (o.okx !== false) v.push(['okx', o.okx || s + '-USDT-SWAP']);
  if (o.hyperliquid !== false) v.push(['hyperliquid', o.hyperliquid || s]);
  return v;
}
const intervalH = (hist) => { if (hist.length < 3) return 8; const d = (hist[hist.length - 1].t - hist[hist.length - 2].t) / 36e5; return [1, 2, 4, 8].reduce((a, b) => Math.abs(b - d) < Math.abs(a - d) ? b : a, 8); };
async function vBinance(p) {
  const B = 'https://fapi.binance.com';
  const [pi, oi, fr, ls, tk] = await Promise.all([getJSON(`${B}/fapi/v1/premiumIndex?symbol=${p}`), getJSON(`${B}/futures/data/openInterestHist?symbol=${p}&period=1h&limit=168`),
    getJSON(`${B}/fapi/v1/fundingRate?symbol=${p}&limit=90`), getJSON(`${B}/futures/data/globalLongShortAccountRatio?symbol=${p}&period=1h&limit=48`).catch(() => []), getJSON(`${B}/fapi/v1/ticker/24hr?symbol=${p}`)]);
  const sv = await getJSON(`https://api.binance.com/api/v3/ticker/24hr?symbol=${p}`).then((x) => +x.quoteVolume).catch(() => null);
  const fh = fr.map((x) => ({ t: +x.fundingTime, r: +x.fundingRate })); const ih = intervalH(fh);
  return { venue: 'binance', pair: p, mark: +pi.markPrice, index: +pi.indexPrice, f8: +pi.lastFundingRate * 8 / ih, fh: fh.map((x) => ({ t: x.t, r: x.r * 8 / ih })),
    oiHist: oi.map((x) => ({ t: +x.timestamp, usd: +x.sumOpenInterestValue, px: +x.sumOpenInterestValue / +x.sumOpenInterest })), oiUsd: oi.length ? +oi[oi.length - 1].sumOpenInterestValue : null,
    ls: ls.map((x) => ({ t: +x.timestamp, r: +x.longShortRatio })), vol: +tk.quoteVolume, svol: sv, ih, next: +pi.lastFundingRate };
}
async function vBybit(p) {
  const B = 'https://api.bybit.com/v5/market';
  const tk = (await getJSON(`${B}/tickers?category=linear&symbol=${p}`)).result.list[0]; if (!tk) throw new Error('no pair');
  const [oi, kl, fr, ls] = await Promise.all([getJSON(`${B}/open-interest?category=linear&symbol=${p}&intervalTime=1h&limit=168`), getJSON(`${B}/kline?category=linear&symbol=${p}&interval=60&limit=168`),
    getJSON(`${B}/funding/history?category=linear&symbol=${p}&limit=90`), getJSON(`${B}/account-ratio?category=linear&symbol=${p}&period=1h&limit=48`).catch(() => null)]);
  const sv = await getJSON(`${B}/tickers?category=spot&symbol=${p}`).then((x) => +x.result.list[0].turnover24h).catch(() => null);
  const pxAt = new Map(kl.result.list.map((k) => [+k[0], +k[4]]));
  const fh = fr.result.list.map((x) => ({ t: +x.fundingRateTimestamp, r: +x.fundingRate })).reverse(); const ih = +tk.fundingIntervalHour || intervalH(fh);
  const oiHist = oi.result.list.map((x) => { const t = +x.timestamp, px_ = pxAt.get(t) ?? +tk.markPrice; return { t, usd: +x.openInterest * px_, px: px_ }; }).reverse();
  return { venue: 'bybit', pair: p, mark: +tk.markPrice, index: +tk.indexPrice, f8: +tk.fundingRate * 8 / ih, fh: fh.map((x) => ({ t: x.t, r: x.r * 8 / ih })), oiHist, oiUsd: +tk.openInterestValue,
    ls: ls && ls.result ? ls.result.list.map((x) => ({ t: +x.timestamp, r: +x.buyRatio / Math.max(1e-9, +x.sellRatio) })).reverse() : [], vol: +tk.turnover24h, svol: sv, ih, next: +tk.fundingRate };
}
async function vOkx(id) {
  const B = 'https://www.okx.com/api/v5'; const uly = id.replace('-SWAP', ''), ccy = id.split('-')[0];
  const ls = null; const [oi, fr, fh, tk, ins, liq] = await Promise.all([getJSON(`${B}/public/open-interest?instType=SWAP&instId=${id}`), getJSON(`${B}/public/funding-rate?instId=${id}`), getJSON(`${B}/public/funding-rate-history?instId=${id}&limit=90`),
    getJSON(`${B}/market/ticker?instId=${id}`), getJSON(`${B}/public/instruments?instType=SWAP&instId=${id}`), getJSON(`${B}/public/liquidation-orders?instType=SWAP&uly=${uly}&state=filled&limit=100`).catch(() => null)]);
  const [oh, st] = await Promise.all([null /* OKX rubik OI history is CORS-blocked in browsers: OKX is added flat */, getJSON(`${B}/market/ticker?instId=${uly}`).catch(() => null)]);
  if (!oi.data || !oi.data[0]) throw new Error('no pair');
  const f = fr.data[0], ih = f.nextFundingTime && f.fundingTime ? Math.max(1, Math.round((+f.nextFundingTime - +f.fundingTime) / 36e5)) : 8;
  const ct = +(ins.data[0] || {}).ctVal || 1, last = +tk.data[0].last;
  let lq = null; if (liq && liq.data && liq.data[0]) { const d = liq.data[0].details || []; let L = 0, Sh = 0, t0 = Infinity; d.forEach((x) => { const u = +x.sz * ct * +x.bkPx; if (x.posSide === 'long' || (x.posSide === 'net' && x.side === 'sell')) L += u; else Sh += u; t0 = Math.min(t0, +x.ts); }); lq = { long: L, short: Sh, since: t0, n: d.length }; }
  return { venue: 'okx', pair: id, mark: last, index: null, f8: +f.fundingRate * 8 / ih, fh: fh.data.map((x) => ({ t: +x.fundingTime, r: +x.realizedRate * 8 / ih })).reverse(), oiHist: oh && oh.data ? oh.data.map((x) => ({ t: +x[0], usd: +x[3] })).reverse() : [], oiUsd: +oi.data[0].oiUsd, ih, next: +f.fundingRate, svol: st && st.data && st.data[0] ? +st.data[0].volCcy24h : null,
    ls: ls && ls.data ? ls.data.slice(0, 48).map((x) => ({ t: +x[0], r: +x[1] })).reverse() : [], vol: +tk.data[0].volCcy24h * last, liq: lq };
}
async function vHyper(coin) {
  if (!HL.ctx || Date.now() - HL.at > 60e3) { HL.ctx = await getJSON('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"type":"metaAndAssetCtxs"}' }); HL.at = Date.now(); }
  const [m, c] = HL.ctx; const i = m.universe.findIndex((u) => u.name === coin); if (i < 0) throw new Error('no pair'); const x = c[i];
  const fh = await getJSON('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'fundingHistory', coin, startTime: Date.now() - 20 * 864e5 }) }).catch(() => []);
  // hourly funding -> 8h equivalent; downsample to 8h buckets
  const b = fh.map((y) => ({ t: +y.time, r: +y.fundingRate * 8 }));
  return { venue: 'hyperliquid', pair: coin, mark: +x.markPx, index: +x.oraclePx, f8: +x.funding * 8, fh: b, oiHist: [], oiUsd: +x.openInterest * +x.markPx, ls: [], vol: +x.dayNtlVlm, svol: null, ih: 1, next: +x.funding };
}
const VF = { binance: vBinance, bybit: vBybit, okx: vOkx, hyperliquid: vHyper };
async function loadLev(t, force) {
  const c = LEV[t.symbol]; if (c && !force && Date.now() - c.at < 60e3) return c;
  const vs = perpVenues(t); const res = await Promise.allSettled(vs.map(([v, p]) => VF[v](p)));
  const ok = res.map((r, i) => r.status === 'fulfilled' && r.value && r.value.oiUsd > 0 ? r.value : null).filter(Boolean);
  const errs = res.map((r, i) => r.status === 'rejected' ? `${EXNAME[vs[i][0]]}: ${r.reason && r.reason.message}` : null).filter(Boolean);
  const o = { at: Date.now(), venues: ok, errs }; LEV[t.symbol] = o; return o;
}
function levModel(t, D) {
  const vs = D.venues; if (!vs.length) return null;
  const prim = vs.find((v) => v.venue === 'binance' && v.oiHist.length > 24) || vs.find((v) => v.oiHist.length > 24) || vs[0];
  const agg = aggOi(vs, prim); const day = Date.now() - 864e5;
  vs.forEach((v) => { const r = v.fh.filter((x) => x.t >= day); v.last = v.fh.length ? v.fh[v.fh.length - 1] : null; v.avg24 = r.length ? r.reduce((a, x) => a + x.r, 0) / r.length : null; v.floor = Math.abs(v.next - 1e-4 * v.ih / 8) < 2e-8; });
  const oiTot = vs.reduce((s, v) => s + v.oiUsd, 0), volTot = vs.reduce((s, v) => s + (v.vol || 0), 0);
  const wf = vs.reduce((s, v) => s + v.f8 * v.oiUsd, 0) / oiTot; // OI-weighted next (predicted) 8h funding
  const wA = (k) => { const a = vs.filter((v) => v[k] != null); const w = a.reduce((s, v) => s + v.oiUsd, 0); return w ? a.reduce((s, v) => s + (k === 'last' ? v.last.r : v[k]) * v.oiUsd, 0) / w : null; };
  const wLast = wA('last'), wAvg = wA('avg24'), floorN = vs.filter((v) => v.floor).length; const fhAgg = aggFund(vs);
  const h = agg.length > 2 ? agg : prim.oiHist, last = h[h.length - 1];
  const ago = (n) => h.length > n ? h[h.length - 1 - n] : null;
  const oi24 = ago(24) ? (last.usd / ago(24).usd - 1) * 100 : null, oi7 = h.length > 100 ? (last.usd / h[0].usd - 1) * 100 : null;
  const px24 = ago(24) ? (last.px / ago(24).px - 1) * 100 : (ch24(t) ?? null);
  const lsA = vs.filter((v) => v.ls.length); const lsW = lsA.reduce((s, v) => s + v.oiUsd, 0); const ls = lsW ? Math.exp(lsA.reduce((s, v) => s + Math.log(v.ls[v.ls.length - 1].r) * v.oiUsd, 0) / lsW) : null; const lsV = lsA.slice().sort((a, b) => b.oiUsd - a.oiUsd)[0];
  const basisV = vs.slice().sort((a, b) => b.oiUsd - a.oiUsd).find((v) => v.index); const basis = basisV ? (basisV.mark / basisV.index - 1) * 100 : null;
  const cg = S.cg[t.coingecko] || {}, mcap = cg.market_cap; const vsv = vs.filter((v) => v.svol > 0); const spot = vsv.reduce((s, v) => s + v.svol, 0) || null, volLike = vsv.reduce((s, v) => s + (v.vol || 0), 0);
  const liqV = vs.find((v) => v.liq);
  const apr = (wAvg ?? wf) * 3 * 365 * 100;
  const comp = [
    ['fund', X('Funding', 'Funding'), lin(Math.abs(apr), 5, 40), 25],
    ['crowd', X('Crowding (L/S)', 'ฝั่งเดียวกันแน่น (L/S)'), ls ? lin(Math.abs(Math.log(ls)), 0.05, Math.log(3)) : null, 20],
    ['mom', X('OI build-up', 'OI สะสมเพิ่ม'), oi24 != null ? lin(oi24 - Math.abs(px24 || 0) * 0.5, -10, 15) : null, 20],
    ['lev', X('Leverage vs size', 'เลเวอเรจเทียบขนาดตลาด'), mcap ? lin(oiTot / mcap * 100, 1, 10) : spot ? lin(volLike / spot, 0.2, 2) : null, 25],
    ['basis', X('Basis', 'ส่วนต่าง Perp/Spot'), basis != null ? lin(Math.abs(basis), 0.02, 0.3) : null, 10]];
  const okc = comp.filter((x) => x[2] != null); const score = okc.reduce((s, x) => s + x[2] * x[3], 0) / (okc.reduce((s, x) => s + x[3], 0) || 1);
  return { vs, prim, agg: h, lsA, basisV, wLast, wAvg, floorN, fhAgg, volLike, vsv, oiTot, volTot, wf, apr, oi24, oi7, px24, ls, lsV, basis, spot, mcap, liqV, comp, score, heat: heatmap(t, { ...prim, oiHist: h, oiUsd: oiTot }, lsV) };
}
function aggOi(vs, prim) { // hourly sum across venues with history; venues without history (HL) added flat at current OI
  const H = vs.filter((v) => v.oiHist.length > 24), F = vs.filter((v) => v.oiHist.length <= 24).reduce((s, v) => s + v.oiUsd, 0); if (!H.length) return [];
  const hr = (t) => Math.round(t / 36e5) * 36e5; const maps = H.map((v) => new Map(v.oiHist.map((x) => [hr(x.t), x])));
  const ph = new Map(prim.oiHist.map((x) => [hr(x.t), x.px])); const ts = [...maps[0].keys()].filter((t) => maps.every((m) => m.has(t))).sort((a, b) => a - b);
  const pAt = (t) => ph.get(t) || (H.find((v) => v.oiHist.some((x) => x.px)) || {}).mark;
  return ts.map((t) => ({ t, usd: maps.reduce((s, m) => s + m.get(t).usd, 0) + F, px: pAt(t) || prim.mark })); }
function aggFund(vs) { // settled funding, 8h-equivalent, bucketed to UTC 00/08/16 slots; OI-weighted across venues
  const S8 = 8 * 36e5, slots = new Map();
  vs.forEach((v) => v.fh.forEach((x) => { const k = Math.floor((x.t - 1) / S8) * S8 + S8; const o = slots.get(k) || {}; (o[v.venue] = o[v.venue] || []).push(x.r); slots.set(k, o); }));
  const now = Date.now(); return [...slots.entries()].filter(([k]) => k <= now + 6e4).sort((a, b) => a[0] - b[0]).map(([t, o]) => { const per = {}; let w = 0, s = 0;
    vs.forEach((v) => { const a = o[v.venue]; if (!a) return; const r = a.reduce((x, y) => x + y, 0) / a.length; per[v.venue] = r; s += r * v.oiUsd; w += v.oiUsd; }); return { t, r: s / w, per, n: Object.keys(per).length }; }).filter((x) => x.n >= Math.min(2, vs.length)); }
function heatmap(t, prim, lsV) { // ESTIMATE: new OI each hour opened at that hour's price, split by long/short accounts, across common leverage tiers
  const h = prim.oiHist; const p = t.price || (h.length ? h[h.length - 1].px : prim.mark); if (!p) return null;
  const tiers = [[3, .12], [5, .2], [10, .3], [25, .23], [50, .1], [100, .05]], mm = 0.005, span = 0.3, N = 40;
  const bins = Array.from({ length: N }, (_, i) => ({ lo: p * (1 - span + 2 * span * i / N), hi: p * (1 - span + 2 * span * (i + 1) / N), long: 0, short: 0 }));
  const lsAt = (tm) => { if (!lsV || !lsV.ls.length) return 0.5; let r = lsV.ls[0].r; for (const x of lsV.ls) if (x.t <= tm) r = x.r; return r / (1 + r); };
  const src = h.length > 2 ? h : [{ t: Date.now() - 1, usd: 0, px: p }, { t: Date.now(), usd: prim.oiUsd, px: prim.mark || p }];
  for (let i = 1; i < src.length; i++) { const d = src[i].usd - src[i - 1].usd; if (d <= 0) continue; const e = src[i].px, lf = lsAt(src[i].t);
    let mn = Infinity, mx = 0; for (let j = i; j < src.length; j++) { mn = Math.min(mn, src[j].px); mx = Math.max(mx, src[j].px); }
    tiers.forEach(([L, w]) => { const lp = e * (1 - 1 / L + mm), sp = e * (1 + 1 / L - mm);
      if (lp < mn && lp < p) { const b = Math.floor((lp / p - (1 - span)) / (2 * span) * N); if (b >= 0 && b < N) bins[b].long += d * w * lf; }
      if (sp > mx && sp > p) { const b = Math.floor((sp / p - (1 - span)) / (2 * span) * N); if (b >= 0 && b < N) bins[b].short += d * w * (1 - lf); } }); }
  const max = Math.max(...bins.map((b) => b.long + b.short), 1);
  const topL = bins.filter((b) => b.hi < p).sort((a, b) => b.long - a.long)[0], topS = bins.filter((b) => b.lo > p).sort((a, b) => b.short - a.short)[0];
  return { bins, max, p, topL: topL && topL.long ? topL : null, topS: topS && topS.short ? topS : null, est: h.length <= 2 };
}
function levInsights(M) {
  const out = [], f = M.apr, ls = M.ls, oi = M.oi24, px_ = M.px24 ?? 0;
  const P = (en, th, tone = '') => out.push([X(en, th), tone]);
  if (f > 15 && ls && ls > 1.4 && (oi ?? 0) > 0) P('Crowded longs and expensive funding: if price slips, forced selling can snowball (squeeze-down risk).', 'ฝั่ง Long แน่นและจ่าย Funding แพง ถ้าราคาย่อ อาจโดนบังคับขายต่อเนื่องจนร่วงแรง (เสี่ยงโดนทุบล้าง Long)', 'dn');
  else if (f > 15) P('Funding is rich: longs are paying up to stay in. Rallies may be fragile.', 'Funding สูง ฝั่ง Long ยอมจ่ายแพงเพื่อถือต่อ ขาขึ้นอาจเปราะ', 'dn');
  if (f < -5 && ls && ls < 0.9) P('Crowded shorts with negative funding: a pop higher can force shorts to buy back (short-squeeze risk).', 'ฝั่ง Short แน่นและ Funding ติดลบ ถ้าราคาเด้งขึ้น อาจบีบให้ Short ต้องซื้อคืน (เสี่ยง Short squeeze)', 'up');
  else if (f < -5) P('Negative funding: shorts are paying longs. Sentiment is bearish, which often marks local lows.', 'Funding ติดลบ ฝั่ง Short จ่ายให้ Long แปลว่าตลาดมองลบ ซึ่งมักเกิดใกล้จุดต่ำระยะสั้น', 'up');
  if (oi != null) {
    if (oi > 5 && px_ > 1) P('Open interest and price are rising together: new money is chasing the move.', 'OI กับราคาขึ้นพร้อมกัน มีเงินใหม่ตามเข้ามา');
    else if (oi > 5 && Math.abs(px_) <= 1) P('Open interest is building while price stalls: leverage is piling up, so expect a sharp move either way.', 'OI เพิ่มแต่ราคาไม่ไปไหน เลเวอเรจกำลังสะสม เตรียมรับการเหวี่ยงแรงทางใดทางหนึ่ง', 'dn');
    else if (oi > 5 && px_ < -1) P('Open interest up while price falls: new shorts are pressing.', 'OI เพิ่มขณะที่ราคาลง มี Short ใหม่เข้ามากด', 'dn');
    else if (oi < -5 && px_ < -1) P('Open interest is falling with price: longs are being flushed out. Selling may be close to exhausted.', 'OI ลดลงพร้อมราคา Long กำลังถูกล้างออก แรงขายอาจใกล้หมด', 'up');
    else if (oi < -5 && px_ > 1) P('Price is up while open interest drops: a short-covering rally that may lack follow-through.', 'ราคาขึ้นแต่ OI ลด เป็นการปิด Short มากกว่าแรงซื้อใหม่ อาจไปต่อได้ไม่ไกล');
    else if (Math.abs(oi) <= 5) P('Open interest is steady: no big leverage shift in the last 24h.', 'OI ทรงตัว 24 ชม. ที่ผ่านมาไม่มีการเปลี่ยนแปลงเลเวอเรจมาก');
  }
  if (M.spot && M.volTot / M.spot < 0.25) P('Perp volume on these venues is small next to total market volume: price is mostly spot-led, so leverage matters less.', 'วอลุ่ม Perp บนกระดานเหล่านี้ยังน้อยเมื่อเทียบกับวอลุ่มรวมทั้งตลาด ราคาขับเคลื่อนด้วย Spot เป็นหลัก เลเวอเรจมีผลน้อย', 'up');
  else if (M.spot && M.volTot / M.spot > 1) P(`Perp volume on 4 venues is ${(M.volTot / M.spot).toFixed(1)}× total market volume: price is driven by leverage.`, `วอลุ่ม Perp แค่ 4 กระดานก็มากกว่าวอลุ่มรวมทั้งตลาด ${(M.volTot / M.spot).toFixed(1)} เท่า ราคาถูกขับด้วยเลเวอเรจ`, 'dn');
  const H = M.heat; if (H && H.topL) P(`Largest estimated long-liquidation cluster near ${px((H.topL.lo + H.topL.hi) / 2)} (${pct(((H.topL.lo + H.topL.hi) / 2 / H.p - 1) * 100, 1)}).`, `กลุ่ม Long ที่น่าจะโดนล้างพอร์ตมากที่สุด (ประมาณ) อยู่แถว ${px((H.topL.lo + H.topL.hi) / 2)} (${pct(((H.topL.lo + H.topL.hi) / 2 / H.p - 1) * 100, 1)})`);
  if (H && H.topS) P(`Largest estimated short-liquidation cluster near ${px((H.topS.lo + H.topS.hi) / 2)} (${pct(((H.topS.lo + H.topS.hi) / 2 / H.p - 1) * 100, 1)}).`, `กลุ่ม Short ที่น่าจะโดนล้างพอร์ตมากที่สุด (ประมาณ) อยู่แถว ${px((H.topS.lo + H.topS.hi) / 2)} (${pct(((H.topS.lo + H.topS.hi) / 2 / H.p - 1) * 100, 1)})`);
  return out;
}
async function renderLev(t, b) {
  b.innerHTML = `<div class="sk" style="height:16px;width:40%"></div><div class="sk" style="height:220px;margin-top:14px"></div>`;
  let D; try { D = await loadLev(t); } catch (e) { D = { venues: [], errs: [e.message] }; }
  if (S.tab !== 'lev' || S.sel !== t.symbol || !b.isConnected) return;
  const M = levModel(t, D);
  if (!M) { b.innerHTML = `<p class="err">${esc(X('No perpetual market data found for this token.', 'ไม่พบข้อมูลตลาด Perp ของเหรียญนี้'))}</p><p class="sub">${esc(D.errs.join(' · '))}</p>`; return; }
  const band = M.score >= 60 ? ['Avoid', X('High', 'สูง')] : M.score >= 35 ? ['Wait', X('Elevated', 'ปานกลาง')] : ['Long', X('Low', 'ต่ำ')];
  const k = (l, v, d = '') => `<div><div class="eyebrow">${esc(l)}</div><div class="v">${v}</div><div class="d">${d || '&nbsp;'}</div></div>`;
  const vn = (v) => EXNAME[v.venue]; const fp = (r) => r == null ? '–' : (r >= 0 ? '+' : '−') + Math.abs(r * 100).toFixed(4) + '%';
  const hm = (t) => new Date(t).toLocaleTimeString(loc(), { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Tokyo' }) + ' JST';
  const srcs = (a) => a.map(vn).join('+'); const withH = M.vs.filter((v) => v.oiHist.length > 24), flat = M.vs.filter((v) => v.oiHist.length <= 24);
  const oiSrc = srcs(withH) + (flat.length ? ' + ' + srcs(flat) + ' ' + X('(flat)', '(คงที่)') : '');
  const lq = M.liqV && M.liqV.liq;
  const H = M.heat;
  b.innerHTML = `<div class="lev">
    <div class="levscore"><div><div class="eyebrow">${esc(X('Leverage risk', 'ความเสี่ยงจากเลเวอเรจ'))}</div><div class="sc-n">${cu('lv-' + t.symbol, M.score, 'int')}<small>/100</small></div><span class="vd ${band[0]}">${esc(band[1])}</span></div>
      <div class="bars">${M.comp.map(([id, n, v, w]) => `<div class="bar-r"><span>${esc(n)} <small class="mut">${w}%</small></span><div class="bt"><i style="width:${v == null ? 0 : v.toFixed(0)}%"></i></div><b class="num">${v == null ? '–' : v.toFixed(0)}</b></div>`).join('')}</div></div>
    <ul class="insights">${levInsights(M).map(([s, c]) => `<li class="${c}">${esc(s)}</li>`).join('')}</ul>
    <div class="kv lkv">${k(X('Open interest', 'Open interest'), cu('lo-' + t.symbol, M.oiTot, 'big'), (M.oi24 != null ? `<span class="${cls(M.oi24)}">${pct(M.oi24, 1)}</span> 24h${M.oi7 != null ? ` · <span class="${cls(M.oi7)}">${pct(M.oi7, 1)}</span> 7d` : ''}<br>` : '') + `<small class="mut">${esc(X('All venues', 'ทุกกระดาน'))} · ${esc(hm(D.at))}</small>`)}
      ${k(X('Funding 24h avg (8h)', 'Funding เฉลี่ย 24 ชม. (ต่อ 8 ชม.)'), `<span class="num ${cls(M.wAvg ?? M.wf)}">${fp(M.wAvg ?? M.wf)}</span>`, `${esc(X('Last settled', 'รอบล่าสุด'))} <span class="num ${cls(M.wLast)}">${fp(M.wLast)}</span> · ${esc(X('Next', 'รอบถัดไป'))} <span class="num ${cls(M.wf)}">${fp(M.wf)}</span>${M.floorN ? ` <span class="tagest" title="${esc(X('Exchange default rate when the market is calm', 'อัตราพื้นฐานของกระดานตอนตลาดนิ่ง'))}">${esc(X('default', 'ค่าพื้นฐาน'))} ${M.floorN}/${M.vs.length}</span>` : ''}<br><small class="mut">${pct(M.apr, 1)} ${esc(X('a year', 'ต่อปี'))} · ${esc(X('OI-weighted', 'ถ่วงด้วย OI'))} · ${esc(hm(D.at))}</small>`)}
      ${k(X('Long / short', 'Long / Short'), M.ls ? `<span class="num">${M.ls.toFixed(2)}</span>` : '–', M.ls ? `${(M.ls / (1 + M.ls) * 100).toFixed(0)}% ${X('of accounts long', 'ของบัญชีถือ Long')} · ${srcs(M.lsA)}${M.lsA.length > 1 ? ' ' + X('OI-weighted', 'ถ่วงด้วย OI') : ''}` : X('not available', 'ไม่มีข้อมูล'))}
      ${k(X('Perp vol / spot vol', 'วอลุ่ม Perp / วอลุ่ม Spot'), M.spot ? `<span class="num">${(M.volLike / M.spot).toFixed(1)}×</span>` : '–', M.spot ? `${big(M.volLike)} / ${big(M.spot)} · 24h · ${srcs(M.vsv)}` : X('no spot market on these venues', 'ไม่มีตลาด Spot ในกระดานเหล่านี้'))}
      ${k(X('Basis', 'Basis (Perp−Spot)'), M.basis != null ? `<span class="num ${cls(M.basis)}">${pct(M.basis, 3)}</span>` : '–', X('mark vs index', 'ราคา Mark เทียบ Index') + (M.basisV ? ' · ' + vn(M.basisV) : ''))}
      ${k(X('Liquidations', 'โดนล้างพอร์ต'), lq ? `<span class="num">${big(lq.long + lq.short)}</span>` : '–', lq ? `${X('long', 'Long')} ${big(lq.long)} · ${X('short', 'Short')} ${big(lq.short)} <br><small class="mut">OKX · ${X('last', 'ล่าสุด')} ${lq.n} ${X('fills since', 'รายการ ตั้งแต่')} ${hm(lq.since)}</small>` : X('no free REST feed for this pair', 'ไม่มีข้อมูลฟรีสำหรับคู่นี้'))}</div>
    <div class="two sec">
      <div><div class="chartbar"><b>${esc(X('Open interest', 'Open interest'))}</b><span class="sub">7d · ${esc(oiSrc)}</span></div><div class="mchart" id="lvOi"></div></div>
      <div><div class="chartbar"><b>${esc(X('Funding history', 'ประวัติ Funding'))}</b><span class="sub">${esc(X('Settled · 8h slots UTC 00/08/16 · OI-weighted', 'ที่จ่ายจริง · ช่อง 8 ชม. UTC 00/08/16 · ถ่วงด้วย OI'))}</span></div><div id="lvF" class="fbars"></div></div></div>
    <div class="two sec">
      <div><div class="chartbar"><b>${esc(X('Liquidation map', 'แผนที่จุดล้างพอร์ต'))}</b><span class="tagest">${esc(X('Estimate', 'ค่าประมาณ'))}</span></div><div class="lhm" id="lvH"></div>
        <p class="expl">${esc(X('Estimated from hourly open-interest increases over 7 days, the long/short account split and common leverage tiers (3–100×). Clusters already crossed by price are removed. Not actual liquidation orders.', 'ประมาณจาก OI ที่เพิ่มขึ้นรายชั่วโมงใน 7 วัน สัดส่วนบัญชี Long/Short และเลเวอเรจที่นิยมใช้ (3–100 เท่า) จุดที่ราคาวิ่งผ่านไปแล้วจะถูกตัดออก ไม่ใช่คำสั่งล้างพอร์ตจริง'))}</p></div>
      <div><div class="chartbar"><b>${esc(X('Open interest by venue', 'OI แยกตามกระดาน'))}</b></div><div class="venues">${M.vs.slice().sort((a, b) => b.oiUsd - a.oiUsd).map((v) => `<div class="bar-r"><span>${esc(vn(v))} <small class="mut">${esc(v.pair)}</small></span><div class="bt"><i style="width:${(v.oiUsd / M.oiTot * 100).toFixed(1)}%"></i></div><b class="num">${big(v.oiUsd)}</b></div>`).join('')}</div>
        <div class="ftab"><div class="fh"><span>${esc(X('Funding (8h-eq.)', 'Funding (เทียบ 8 ชม.)'))}</span><span>${esc(X('Next', 'ถัดไป'))}</span><span>${esc(X('Last', 'ล่าสุด'))}</span><span>24h</span></div>${M.vs.map((v) => `<div><span>${esc(vn(v))} <small class="mut">${v.ih}${esc(X('h', ' ชม.'))}</small></span><span class="num ${cls(v.f8)}">${fp(v.f8)}${v.floor ? '<sup class="mut" title="default">●</sup>' : ''}</span><span class="num ${cls(v.last && v.last.r)}">${fp(v.last && v.last.r)}</span><span class="num ${cls(v.avg24)}">${fp(v.avg24)}</span></div>`).join('')}</div>
        ${D.errs.length ? `<p class="sub mt">${esc(X('Unavailable: ', 'ดึงไม่ได้: '))}${esc(D.errs.map((e) => e.split(':')[0]).join(', '))}</p>` : ''}</div></div>
    <p class="nfa">${esc(X('Leverage risk is a model, not a signal. Funding is OI-weighted across venues and normalised to 8 hours; the score uses the 24h average of settled rates.', 'คะแนนความเสี่ยงเป็นแบบจำลอง ไม่ใช่สัญญาณซื้อขาย Funding ถ่วงน้ำหนักด้วย OI ของทุกกระดาน ปรับเป็นรอบ 8 ชม. คะแนนใช้ค่าเฉลี่ย 24 ชม. ของรอบที่จ่ายจริง'))}</p></div>`;
  const oiP = M.agg.length > 2 ? M.agg.map((x) => ({ t: x.t / 1000, v: x.usd })) : null;
  if (oiP) mchart($('#lvOi'), oiP, { h: 190, id: 'oi' }); else $('#lvOi').innerHTML = `<p class="mut">${esc(X('No OI history from this venue.', 'กระดานนี้ไม่มีประวัติ OI'))}</p>`;
  const fv = M.fhAgg.length ? { fh: M.fhAgg } : null; if (fv) { const a = fv.fh.slice(innerWidth < 600 ? -36 : -60), mx = Math.max(...a.map((x) => Math.abs(x.r)), 1e-9);
    $('#lvF').innerHTML = `<div class="fb">${a.map((x) => `<i class="${x.r >= 0 ? 'p' : 'n'}" style="--h:${(Math.abs(x.r) / mx * 50).toFixed(1)}%" title="${new Date(x.t).toLocaleString(loc(), { timeZone: 'Asia/Tokyo', month: 'short', day: 'numeric', hour: 'numeric' })}: ${fp(x.r)}${Object.entries(x.per).map(([e, r]) => `&#10;${EXNAME[e]} ${fp(r)}`).join('')}"></i>`).join('')}</div><div class="fb-ax"><span>${new Date(a[0].t).toLocaleDateString(loc(), { month: 'short', day: 'numeric' })}</span><span>±${(mx * 100).toFixed(4)}%</span><span>${new Date(a[a.length - 1].t).toLocaleDateString(loc(), { month: 'short', day: 'numeric' })}</span></div>`; }
  if (H) liqHeat($('#lvH'), H, M.agg);
  countUps(b);
}

function liqHeat(el, H, hist) {
  const p = H.p, bins = H.bins, mx = H.max; const act = bins.filter((b) => b.long + b.short > mx * 0.03);
  const ph = (hist || []).map((x) => x.px).filter(Boolean);
  let lo = Math.min(p * 0.9, ...ph, ...act.map((b) => b.lo)), hi = Math.max(p * 1.1, ...ph, ...act.map((b) => b.hi)); const pad = (hi - lo) * 0.03; lo -= pad; hi += pad;
  const y = (v) => ((hi - v) / (hi - lo) * 100);
  const bands = bins.filter((b) => b.hi > lo && b.lo < hi && b.long + b.short > 0).map((b) => { const isS = b.lo >= p, v = isS ? b.short : b.long, a = Math.pow(v / mx, 0.6);
    return `<i class="${isS ? 's' : 'l'}" style="top:${y(b.hi).toFixed(2)}%;height:${(y(b.lo) - y(b.hi)).toFixed(2)}%;--a:${Math.max(0.05, a).toFixed(3)};--w:${(30 + 70 * v / mx).toFixed(1)}%" title="${px(b.lo)}–${px(b.hi)}: ${big(v)}"></i>`; }).join('');
  let line = '';
  if (ph.length > 2) { const n = ph.length; line = `<svg class="lp" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline vector-effect="non-scaling-stroke" points="${ph.map((v, i) => `${(i / (n - 1) * 100).toFixed(2)},${y(v).toFixed(2)}`).join(' ')}"/></svg>`; }
  const ticks = Array.from({ length: 5 }, (_, i) => lo + (hi - lo) * (i + 0.5) / 5).map((v) => `<span style="top:${y(v).toFixed(2)}%">${px(v)}</span>`).join('');
  const big_ = bins.filter((b) => b.long + b.short >= mx * 0.45).map((b) => ({ b, m: (b.lo + b.hi) / 2 })).sort((a, b) => Math.abs(a.m - p) - Math.abs(b.m - p))[0];
  let call = '', read = '';
  if (big_) { const d = (big_.m / p - 1) * 100, isS = big_.m > p, v = isS ? big_.b.short : big_.b.long;
    call = `<div class="lhm-call ${isS ? 's' : 'l'}">${esc(X('Nearest big cluster', 'กลุ่มใหญ่ที่ใกล้ที่สุด'))}: <b class="num">${px(big_.m)}</b>, <span class="num">${pct(d, 1)}</span> ${esc(X('away', 'จากราคาตอนนี้'))} · ~${big(v)}</div>`;
    read = isS ? X(`Shorts are stacked about ${Math.abs(d).toFixed(1)}% above. A push there could force buybacks and speed the move up.`, `Short กองอยู่สูงกว่าราคาราว ${Math.abs(d).toFixed(1)}% ถ้าราคาไปถึง อาจบีบให้ Short ซื้อคืนและเร่งให้ราคาวิ่งเร็วขึ้น`)
      : X(`Longs are stacked about ${Math.abs(d).toFixed(1)}% below. A drop there could trigger forced selling and a fast flush.`, `Long กองอยู่ต่ำกว่าราคาราว ${Math.abs(d).toFixed(1)}% ถ้าราคาหลุดลงไป อาจเกิดแรงขายบังคับและร่วงเร็ว`); }
  el.innerHTML = `${call}<div class="lhm-box"><div class="lhm-ax">${ticks}</div><div class="lhm-pc">${line}<div class="lhm-now" style="top:${y(p).toFixed(2)}%"></div></div><div class="lhm-heat">${bands}<div class="lhm-now" style="top:${y(p).toFixed(2)}%"><span class="num">${px(p)}</span></div></div></div>
    <div class="legend"><span><i class="lg-s"></i>${esc(X('Short liquidations above (forced buys)', 'Short โดนล้างด้านบน (บังคับซื้อ)'))}</span><span><i class="lg-l"></i>${esc(X('Long liquidations below (forced sells)', 'Long โดนล้างด้านล่าง (บังคับขาย)'))}</span><span class="mut">${esc(X('Brighter = larger · 7d price on the left', 'สีเข้ม = ก้อนใหญ่ · ซ้ายคือราคา 7 วัน'))}</span></div>
    ${read ? `<p class="lhm-read">${esc(read)}</p>` : ''}`;
}
