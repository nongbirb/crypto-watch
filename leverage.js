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
  const [pi, oi, fr, ls, tk, kl] = await Promise.all([getJSON(`${B}/fapi/v1/premiumIndex?symbol=${p}`), getJSON(`${B}/futures/data/openInterestHist?symbol=${p}&period=1h&limit=168`),
    getJSON(`${B}/fapi/v1/fundingRate?symbol=${p}&limit=90`), getJSON(`${B}/futures/data/globalLongShortAccountRatio?symbol=${p}&period=1h&limit=48`).catch(() => []), getJSON(`${B}/fapi/v1/ticker/24hr?symbol=${p}`), getJSON(`${B}/fapi/v1/klines?symbol=${p}&interval=1h&limit=170`).catch(() => [])]);
  const hl = new Map(kl.map((k) => [+k[0], [+k[2], +k[3]]])); // hourly high/low by open time
  const sv = !has(await listed('bnSpot'), p) ? null : await getJSON(`https://api.binance.com/api/v3/ticker/24hr?symbol=${p}`).then((x) => Math.abs(+x.lastPrice / +pi.markPrice - 1) < 0.15 ? +x.quoteVolume : null).catch(() => null); // same ticker, different token (e.g. old Litentry LITUSDT) -> ignored
  const fh = fr.map((x) => ({ t: +x.fundingTime, r: +x.fundingRate })); const ih = intervalH(fh);
  return { venue: 'binance', pair: p, mark: +pi.markPrice, index: +pi.indexPrice, f8: +pi.lastFundingRate * 8 / ih, fh: fh.map((x) => ({ t: x.t, r: x.r * 8 / ih })),
    oiHist: oi.map((x) => { const t = +x.timestamp, k = hl.get(Math.round(t / 36e5) * 36e5 - 36e5); return { t, usd: +x.sumOpenInterestValue, px: +x.sumOpenInterestValue / +x.sumOpenInterest, hi: k ? k[0] : null, lo: k ? k[1] : null }; }), oiUsd: oi.length ? +oi[oi.length - 1].sumOpenInterestValue : null,
    ls: ls.map((x) => ({ t: +x.timestamp, r: +x.longShortRatio })), vol: +tk.quoteVolume, svol: sv, ih, next: +pi.lastFundingRate };
}
async function vBybit(p) {
  const B = 'https://api.bybit.com/v5/market';
  const tk = (await getJSON(`${B}/tickers?category=linear&symbol=${p}`)).result.list[0]; if (!tk) throw new Error('no pair');
  const [oi, kl, fr, ls] = await Promise.all([getJSON(`${B}/open-interest?category=linear&symbol=${p}&intervalTime=1h&limit=168`), getJSON(`${B}/kline?category=linear&symbol=${p}&interval=60&limit=168`),
    getJSON(`${B}/funding/history?category=linear&symbol=${p}&limit=90`), getJSON(`${B}/account-ratio?category=linear&symbol=${p}&period=1h&limit=48`).catch(() => null)]);
  const rl = await getJSON(`${B}/risk-limit?category=linear&symbol=${p}`).then((x) => x.result.list.find((y) => +y.isLowestRisk === 1) || x.result.list[0]).catch(() => null);
  const sv = await getJSON(`${B}/tickers?category=spot&symbol=${p}`).then((x) => { if (x.retCode !== 0) throw 0; return x; }).then((x) => +x.result.list[0].turnover24h).catch(() => null);
  const pxAt = new Map(kl.result.list.map((k) => [+k[0], +k[4]])), hlAt = new Map(kl.result.list.map((k) => [+k[0], [+k[2], +k[3]]]));
  const fh = fr.result.list.map((x) => ({ t: +x.fundingRateTimestamp, r: +x.fundingRate })).reverse(); const ih = +tk.fundingIntervalHour || intervalH(fh);
  const oiHist = oi.result.list.map((x) => { const t = +x.timestamp, px_ = pxAt.get(t) ?? +tk.markPrice; const k = hlAt.get(t); return { t, usd: +x.openInterest * px_, px: px_, hi: k ? k[0] : null, lo: k ? k[1] : null }; }).reverse();
  return { venue: 'bybit', pair: p, mark: +tk.markPrice, index: +tk.indexPrice, f8: +tk.fundingRate * 8 / ih, fh: fh.map((x) => ({ t: x.t, r: x.r * 8 / ih })), oiHist, oiUsd: +tk.openInterestValue,
    ls: ls && ls.result ? ls.result.list.map((x) => ({ t: +x.timestamp, r: +x.buyRatio / Math.max(1e-9, +x.sellRatio) })).reverse() : [], vol: +tk.turnover24h, svol: sv, ih, next: +tk.fundingRate, maxLev: rl ? +rl.maxLeverage || null : null, mm: rl ? +rl.maintenanceMargin || null : null };
}
async function vOkx(id) {
  const B = 'https://www.okx.com/api/v5'; const uly = id.replace('-SWAP', ''), ccy = id.split('-')[0];
  const ls = null; const [oi, fr, fh, tk, ins, liq] = await Promise.all([getJSON(`${B}/public/open-interest?instType=SWAP&instId=${id}`), getJSON(`${B}/public/funding-rate?instId=${id}`), getJSON(`${B}/public/funding-rate-history?instId=${id}&limit=90`),
    getJSON(`${B}/market/ticker?instId=${id}`), getJSON(`${B}/public/instruments?instType=SWAP&instId=${id}`), getJSON(`${B}/public/liquidation-orders?instType=SWAP&uly=${uly}&state=filled&limit=100`).catch(() => null)]);
  const spotOk = has(await listed('okSpot'), uly);
  const [oh, st, pt] = await Promise.all([null /* OKX rubik OI history is CORS-blocked in browsers: OKX is added flat */, spotOk ? getJSON(`${B}/market/ticker?instId=${uly}`).catch(() => null) : null, getJSON(`${B}/public/position-tiers?instType=SWAP&tdMode=cross&instFamily=${uly}`).catch(() => null)]);
  const t1 = pt && pt.data && pt.data.find((x) => x.tier === '1');
  if (!oi.data || !oi.data[0]) throw new Error('no pair');
  const f = fr.data[0], ih = f.nextFundingTime && f.fundingTime ? Math.max(1, Math.round((+f.nextFundingTime - +f.fundingTime) / 36e5)) : 8;
  const ct = +(ins.data[0] || {}).ctVal || 1, last = +tk.data[0].last;
  let lq = null; if (liq && liq.data && liq.data[0]) { const d = liq.data[0].details || []; let L = 0, Sh = 0, t0 = Infinity; d.forEach((x) => { const u = +x.sz * ct * +x.bkPx; if (x.posSide === 'long' || (x.posSide === 'net' && x.side === 'sell')) L += u; else Sh += u; t0 = Math.min(t0, +x.ts); }); lq = { long: L, short: Sh, since: t0, n: d.length }; }
  return { venue: 'okx', pair: id, mark: last, index: null, f8: +f.fundingRate * 8 / ih, fh: fh.data.map((x) => ({ t: +x.fundingTime, r: +x.realizedRate * 8 / ih })).reverse(), oiHist: oh && oh.data ? oh.data.map((x) => ({ t: +x[0], usd: +x[3] })).reverse() : [], oiUsd: +oi.data[0].oiUsd, ih, next: +f.fundingRate, svol: st && st.data && st.data[0] ? +st.data[0].volCcy24h : null,
    ls: ls && ls.data ? ls.data.slice(0, 48).map((x) => ({ t: +x[0], r: +x[1] })).reverse() : [], vol: +tk.data[0].volCcy24h * last, liq: lq, maxLev: +(ins.data[0] || {}).lever || (t1 ? +t1.maxLever : null) || null, mm: t1 ? +t1.mmr || null : null };
}
async function vHyper(coin) {
  if (!HL.ctx || Date.now() - HL.at > 60e3) { HL.ctx = await getJSON('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"type":"metaAndAssetCtxs"}' }); HL.at = Date.now(); }
  const [m, c] = HL.ctx; const i = m.universe.findIndex((u) => u.name === coin); if (i < 0) throw new Error('no pair'); const x = c[i];
  const fh = await getJSON('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'fundingHistory', coin, startTime: Date.now() - 20 * 864e5 }) }).catch(() => []);
  // hourly funding -> 8h equivalent; downsample to 8h buckets
  const b = fh.map((y) => ({ t: +y.time, r: +y.fundingRate * 8 }));
  return { venue: 'hyperliquid', pair: coin, mark: +x.markPx, index: +x.oraclePx, f8: +x.funding * 8, fh: b, oiHist: [], oiUsd: +x.openInterest * +x.markPx, ls: [], vol: +x.dayNtlVlm, svol: null, ih: 1, next: +x.funding, maxLev: +m.universe[i].maxLeverage || null, mm: +m.universe[i].maxLeverage ? 1 / (2 * m.universe[i].maxLeverage) : null };
}
const VF = { binance: vBinance, bybit: vBybit, okx: vOkx, hyperliquid: vHyper };
/* venue listings: one small public list per venue (cached 12h) so we never request a symbol a venue doesn't list (that was the stray HTTP 400s, e.g. Binance spot ticker for MON/LIT). null = list unreachable -> try anyway. */
const LST = {};
async function listed(key) {
  if (LST[key]) return LST[key];
  try { const c = JSON.parse(localStorage.getItem('cw-lst-' + key) || 'null'); if (c && Date.now() - c.at < 432e5) return (LST[key] = new Set(c.s)); } catch (e) {}
  const F = {
    bnPerp: () => getJSON('https://fapi.binance.com/fapi/v1/premiumIndex').then((r) => r.map((x) => x.symbol)),
    bnSpot: () => getJSON('https://api.binance.com/api/v3/ticker/price').catch(() => getJSON('https://data-api.binance.vision/api/v3/ticker/price')).then((r) => r.map((x) => x.symbol)),
    byPerp: () => getJSON('https://api.bybit.com/v5/market/instruments-info?category=linear&limit=1000').then((r) => r.result.list.filter((x) => x.status === 'Trading').map((x) => x.symbol)),
    okPerp: () => getJSON('https://www.okx.com/api/v5/public/instruments?instType=SWAP').then((r) => r.data.filter((x) => x.state === 'live').map((x) => x.instId)),
    okSpot: () => getJSON('https://www.okx.com/api/v5/public/instruments?instType=SPOT').then((r) => r.data.filter((x) => x.state === 'live').map((x) => x.instId)) };
  try { const a = await F[key](); if (!a || !a.length) return null; try { localStorage.setItem('cw-lst-' + key, JSON.stringify({ at: Date.now(), s: a })); } catch (e) {} return (LST[key] = new Set(a)); } catch (e) { return null; }
}
const has = (set, sym) => !set || set.has(sym);
const PERPLIST = { binance: 'bnPerp', bybit: 'byPerp', okx: 'okPerp' };
/* Phase 4 (docs/architect-proof-layer.md §5): stored history from scripts/lev_hist.py. data/lev/daily-YYYY.json (this and last year)
   and data/lev/recent.json (hourly OKX + Hyperliquid OI, 8 days). Loaded once per 10 min; missing files = "not enough history". */
const LEVH = { at: 0, req: null, files: [], recent: null };
function levHist() {
  if (LEVH.req && Date.now() - LEVH.at < 6e5) return LEVH.req;
  const y = new Date().getUTCFullYear(), q = '?t=' + Math.floor(Date.now() / 6e5); LEVH.at = Date.now();
  return (LEVH.req = Promise.allSettled([getJSON(`data/lev/daily-${y - 1}.json${q}`), getJSON(`data/lev/daily-${y}.json${q}`), getJSON('data/lev/recent.json' + q)]).then(([a, b, r]) => {
    LEVH.files = [a, b].filter((x) => x.status === 'fulfilled').map((x) => x.value); LEVH.recent = r.status === 'fulfilled' ? r.value : null; return LEVH; }));
}
/* recorded hourly OI of a venue that has no history in the browser (OKX: CORS-blocked; Hyperliquid: no endpoint), as [{t, usd}] */
function recOi(sym, venue) { const R = LEVH.recent, i = venue === 'okx' ? 0 : venue === 'hyperliquid' ? 1 : -1; if (!R || !R.hours || i < 0) return [];
  return Object.entries(R.hours).map(([h, row]) => ({ t: Date.parse(h + ':00:00Z'), usd: row[sym] && row[sym][i] ? row[sym][i] * 1e3 : null })).filter((x) => x.usd).sort((a, b) => a.t - b.t); }
async function loadLev(t, force) {
  const c = LEV[t.symbol]; if (c && !force && Date.now() - c.at < 60e3) return c;
  const all = perpVenues(t); const lists = await Promise.all(all.map(([v]) => PERPLIST[v] ? listed(PERPLIST[v]) : null));
  const na = all.filter(([v, p], i) => !has(lists[i], p)).map(([v]) => v); // venue does not list this perp: shown as "not listed", never requested
  const vs = all.filter(([v, p], i) => has(lists[i], p)); const res = await Promise.allSettled(vs.map(([v, p]) => VF[v](p)));
  const ok = res.map((r, i) => r.status === 'fulfilled' && r.value && r.value.oiUsd > 0 ? r.value : null).filter(Boolean);
  const errs = res.map((r, i) => r.status === 'rejected' ? `${EXNAME[vs[i][0]]}: ${r.reason && r.reason.message}` : null).filter(Boolean);
  await levHist().catch(() => null);
  ok.forEach((v) => { if (!v.oiHist.length) v.oiRec = recOi(t.symbol, v.venue); });
  const o = { at: Date.now(), venues: ok, errs, na }; LEV[t.symbol] = o; return o;
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
  const w7 = h.length && last.t - h[0].t >= 7 * 864e5 - 2 * 36e5 ? h.find((x) => x.t >= last.t - 7 * 864e5 - 36e5) : null; // 7d only over a real 7-day span
  const oi24 = ago(24) ? (last.usd / ago(24).usd - 1) * 100 : null, oi7 = w7 ? (last.usd / w7.usd - 1) * 100 : null;
  const px24 = ago(24) ? (last.px / ago(24).px - 1) * 100 : (ch24(t) ?? null);
  const lsA = vs.filter((v) => v.ls.length); const lsW = lsA.reduce((s, v) => s + v.oiUsd, 0); const ls = lsW ? Math.exp(lsA.reduce((s, v) => s + Math.log(v.ls[v.ls.length - 1].r) * v.oiUsd, 0) / lsW) : null; const lsV = lsA.slice().sort((a, b) => b.oiUsd - a.oiUsd)[0];
  const basisV = vs.slice().sort((a, b) => b.oiUsd - a.oiUsd).find((v) => v.index); const basis = basisV ? (basisV.mark / basisV.index - 1) * 100 : null;
  const cg = S.cg[t.coingecko] || {}, mcap = cg.market_cap; const vsv = vs.filter((v) => v.svol > 0); const spot = vsv.reduce((s, v) => s + v.svol, 0) || null, volLike = vsv.reduce((s, v) => s + (v.vol || 0), 0);
  const liqV = vs.find((v) => v.liq);
  const apr = (wAvg ?? wf) * 3 * 365 * 100;
  // Phase 4: funding, leverage-vs-size and OI build-up are ranked against this token's own last 90 closed days (data/lev), not fixed
  // bounds; a settlement at the venue floor (0.01 % / 8h, the calm default) counts as 0. Under 30 days: "not enough history".
  const live = vs.filter((v) => LEVC.VEN.includes(v.venue)), byV = (f) => Object.fromEntries(live.map((v) => [v.venue, f(v)]));
  const P = typeof LEVC !== 'undefined' && LEVH.files.length ? LEVC.percentiles(LEVH.files, t.symbol, { fx: byV((v) => LEVC.liveExcess(v.fh, Date.now())), oiUsd: byV((v) => v.oiUsd), mcap,
    oi24: recOi24(live.filter((v) => LEVC.oiVenues(LEVC.merge(LEVH.files).slice(-LEVC.WIN), t.symbol).includes(v.venue))), px24 }, live.map((v) => v.venue)) : { days: 0, fundVenues: [], oiVenues: [] };
  const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
  const comp = [
    ['fund', X('Funding (vs own 90d)', 'Funding (เทียบ 90 วันของตัวเอง)'), P.fund ?? null, 25, 'hist'],
    ['crowd', X('Crowding (L/S accounts)', 'คนแห่ฝั่งเดียว (L/S บัญชี)'), ls ? lin(Math.abs(Math.log(ls)), 0.05, Math.log(3)) : null, 20],
    ['mom', X('OI build-up (vs own 90d)', 'OI สะสมเพิ่ม (เทียบ 90 วันของตัวเอง)'), P.mom ?? null, 20, 'hist'],
    ['lev', X('OI ÷ market cap (vs own 90d)', 'OI ÷ มาร์เก็ตแคป (เทียบ 90 วันของตัวเอง)'), P.lev ?? null, 25, 'hist'],
    ['basis', X('Basis', 'Basis (Perp vs Spot)'), basis != null ? lin(Math.abs(basis), 0.02, 0.3) : null, 10]];
  // two readings instead of one score: how much leverage (size), which side is crowded (direction). Never summed into one number.
  const mean = (a) => { const b = a.filter((x) => x != null); return b.length ? b.reduce((s, x) => s + x, 0) / b.length : null; };
  const how = mean([P.lev, P.mom]);
  const sideParts = [P.fundSigned != null ? 2 * (P.fundSigned - 50) : null, ls ? sgn(Math.log(ls)) * lin(Math.abs(Math.log(ls)), 0.05, Math.log(3)) : null, basis != null ? sgn(basis) * lin(Math.abs(basis), 0.02, 0.3) : null];
  const side = mean(sideParts);
  const oiFlat = vs.filter((v) => v.oiFlat), oiRec = vs.filter((v) => v.oiRecorded);
  return { vs, prim, agg: h, lsA, basisV, wLast, wAvg, floorN, fhAgg, volLike, vsv, oiTot, volTot, wf, apr, oi24, oi7, px24, ls, lsV, basis, spot, mcap, liqV, comp, P, how, side, sideN: sideParts.filter((x) => x != null).length, oiFlat, oiRec, heat: heatmap(t, { ...prim, oiHist: h, oiUsd: oiTot }, lsV, vs) };
}
const REC_TOL = 2 * 36e5;
const recAt = (rec, t) => { let b = null; for (const x of rec) { if (x.t > t) break; b = x; } return b && t - b.t <= REC_TOL ? b.usd : null; };
function aggOi(vs, prim) { // hourly sum across venues with history; recorded OKX / Hyperliquid OI joins where it covers the hours; the rest is added flat (and named)
  const H = vs.filter((v) => v.oiHist.length > 24), hr = (t) => Math.round(t / 36e5) * 36e5, maps = H.map((v) => new Map(v.oiHist.map((x) => [hr(x.t), x])));
  // timeline: hours every browser-side history shares; with none (e.g. only OKX + Hyperliquid reachable), the recorded hours themselves
  const recBase = vs.filter((v) => v.oiRec && v.oiRec.length > 24).sort((a, b) => b.oiRec.length - a.oiRec.length)[0];
  let ts = H.length ? [...maps[0].keys()].filter((t) => maps.every((m) => m.has(t))).sort((a, b) => a - b) : recBase ? recBase.oiRec.map((x) => x.t) : [];
  if (!ts.length) { vs.forEach((v) => { v.oiFlat = true; v.oiRecorded = false; }); return []; }
  const ph = new Map(prim.oiHist.map((x) => [hr(x.t), x.px]));
  const last = ts[ts.length - 1], ago = ts.find((t) => t >= last - 864e5);
  const Rv = vs.filter((v) => v.oiHist.length <= 24 && v.oiRec && v.oiRec.length && recAt(v.oiRec, last) != null && recAt(v.oiRec, ago) != null);
  const Fv = vs.filter((v) => v.oiHist.length <= 24 && !Rv.includes(v)), F = Fv.reduce((s, v) => s + v.oiUsd, 0);
  vs.forEach((v) => { v.oiFlat = Fv.includes(v); v.oiRecorded = Rv.includes(v); });
  ts = ts.filter((t) => Rv.every((v) => recAt(v.oiRec, t) != null));
  const pAt = (t) => ph.get(t) || ((H.find((v) => v.oiHist.some((x) => x.px)) || {}).mark) || null;
  return ts.map((t) => ({ t, usd: maps.reduce((s, m) => s + m.get(t).usd, 0) + Rv.reduce((s, v) => s + recAt(v.oiRec, t), 0) + F, px: pAt(t) || prim.mark })); }
/* 24h change of the recorded OI of venues `vs` (the venue set the history percentiles use), from data/lev/recent.json */
function recOi24(vs) { const a = vs.map((v) => v.oiRec || []); if (!vs.length || a.some((x) => !x.length)) return null;
  const now = Math.min(...a.map((x) => x[x.length - 1].t)), n = a.map((x) => recAt(x, now)), p = a.map((x) => recAt(x, now - 864e5));
  return n.every((x) => x) && p.every((x) => x) ? (n.reduce((s, x) => s + x, 0) / p.reduce((s, x) => s + x, 0) - 1) * 100 : null; }
function aggFund(vs) { // settled funding, 8h-equivalent, bucketed to UTC 00/08/16 slots; OI-weighted across venues
  const S8 = 8 * 36e5, slots = new Map();
  vs.forEach((v) => v.fh.forEach((x) => { const k = Math.floor((x.t - 1) / S8) * S8 + S8; const o = slots.get(k) || {}; (o[v.venue] = o[v.venue] || []).push(x.r); slots.set(k, o); }));
  const now = Date.now(); return [...slots.entries()].filter(([k]) => k <= now + 6e4).sort((a, b) => a[0] - b[0]).map(([t, o]) => { const per = {}; let w = 0, s = 0;
    vs.forEach((v) => { const a = o[v.venue]; if (!a) return; const r = a.reduce((x, y) => x + y, 0) / a.length; per[v.venue] = r; s += r * v.oiUsd; w += v.oiUsd; }); return { t, r: s / w, per, n: Object.keys(per).length }; }).filter((x) => x.n >= Math.min(2, vs.length)); }
const LT = [[3, .12], [5, .2], [10, .3], [25, .23], [50, .1], [100, .05]], MM0 = 0.005;
function levMix(vs) { // assumed tier mix, capped at each venue's real max leverage and renormalised; venues weighted by current OI share
  const tot = vs.reduce((a, v) => a + (v.oiUsd || 0), 0) || 1, out = [];
  vs.forEach((v) => { const cap = v.maxLev || 100; let ts = LT.filter(([L]) => L <= cap); if (!ts.length) ts = [[cap, 1]];
    const ws = ts.reduce((a, x) => a + x[1], 0), sh = (v.oiUsd || 0) / tot, mm = v.mm || MM0;
    ts.forEach(([L, w]) => out.push([L, w / ws * sh, mm])); });
  return out.length ? out : LT.map(([L, w]) => [L, w, MM0]); }
function heatmap(t, prim, lsV, vs) { // ESTIMATE: new OI each hour opened at that hour's price, split by long/short accounts, across common leverage tiers
  const h = prim.oiHist; const p = t.price || (h.length ? h[h.length - 1].px : prim.mark); if (!p) return null;
  const tiers = levMix(vs || []), span = 0.3, N = 40;
  const bins = Array.from({ length: N }, (_, i) => ({ lo: p * (1 - span + 2 * span * i / N), hi: p * (1 - span + 2 * span * (i + 1) / N), long: 0, short: 0 }));
  const lsAt = (tm) => { if (!lsV || !lsV.ls.length) return 0.5; let r = lsV.ls[0].r; for (const x of lsV.ls) if (x.t <= tm) r = x.r; return r / (1 + r); };
  const src = h.length > 2 ? h : [{ t: Date.now() - 1, usd: 0, px: p }, { t: Date.now(), usd: prim.oiUsd, px: prim.mark || p }];
  let open = 0; // notional added so far (all tiers, in or out of the drawn range); an OI drop removes the same share from every open bin
  for (let i = 1; i < src.length; i++) { const d = src[i].usd - src[i - 1].usd;
    if (d < 0) { if (open > 0) { const k = Math.max(0, 1 + d / open); bins.forEach((b) => { b.long *= k; b.short *= k; }); open *= k; } continue; }
    if (d === 0) continue; open += d; const e = src[i].px, lf = lsAt(src[i].t);
    let mn = src[i].px, mx = src[i].px; for (let j = i + 1; j < src.length; j++) { mn = Math.min(mn, src[j].lo || src[j].px); mx = Math.max(mx, src[j].hi || src[j].px); } // wicks: hourly high/low when the venue gives them
    tiers.forEach(([L, w, mm]) => { const lp = e * (1 - 1 / L + mm), sp = e * (1 + 1 / L - mm);
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
  const band = M.how == null ? null : M.how >= 60 ? ['Avoid', X('High', 'สูง')] : M.how >= 35 ? ['Wait', X('Elevated', 'ปานกลาง')] : ['Long', X('Low', 'ต่ำ')];
  const sd = M.side == null ? null : M.side > 20 ? ['dn', X('Longs crowded', 'ฝั่ง Long แน่น')] : M.side < -20 ? ['up', X('Shorts crowded', 'ฝั่ง Short แน่น')] : ['', X('Balanced', 'สมดุล')];
  const nh = X(`not enough history (${M.P.days} of 30 days)`, `ประวัติยังไม่พอ (${M.P.days} จาก 30 วัน)`);
  const histNote = M.P.days >= 30 ? X(`Ranked against this token's own last ${M.P.days} closed days (${M.P.from} → ${M.P.to}). Funding: ${M.P.fundVenues.map((v) => EXNAME[v]).join(' + ') || '–'}; open interest: ${M.P.oiVenues.map((v) => EXNAME[v]).join(' + ') || '–'}. Binance and Bybit have no stored history (blocked from the data servers), so they are not in these ranks.`, `จัดอันดับเทียบกับ ${M.P.days} วันที่ปิดแล้วล่าสุดของเหรียญนี้เอง (${M.P.from} → ${M.P.to}) Funding: ${M.P.fundVenues.map((v) => EXNAME[v]).join(' + ') || '–'} · OI: ${M.P.oiVenues.map((v) => EXNAME[v]).join(' + ') || '–'} · Binance และ Bybit ไม่มีประวัติที่เก็บไว้ (เซิร์ฟเวอร์ข้อมูลเข้าไม่ได้) จึงไม่อยู่ในอันดับนี้`) : nh;
  const k = (l, v, d = '') => `<div><div class="eyebrow">${esc(l)}</div><div class="v">${v}</div><div class="d">${d || '&nbsp;'}</div></div>`;
  const vn = (v) => EXNAME[v.venue]; const fp = (r) => r == null ? '–' : (r >= 0 ? '+' : '−') + Math.abs(r * 100).toFixed(4) + '%';
  const hm = (t) => lTime(t);
  const srcs = (a) => a.map(vn).join('+'); const withH = M.vs.filter((v) => v.oiHist.length > 24), flat = M.vs.filter((v) => v.oiHist.length <= 24);
  const oiSrc = srcs(withH) + (flat.length ? ' + ' + srcs(flat) + ' ' + X('(flat)', '(คงที่)') : '');
  const lq = M.liqV && M.liqV.liq;
  const H = M.heat;
  b.innerHTML = `<div class="lev">
    <div class="levscore lev2" data-lev2><div class="lvread"><div class="eyebrow">${esc(X('How much leverage', 'เลเวอเรจมากแค่ไหน'))}</div>${M.how == null ? `<div class="sub" data-lvhow="none">${esc(nh)}</div>` : `<div class="sc-n" data-lvhow>${cu('lv-' + t.symbol, M.how, 'int')}<small>/100</small></div><span class="vd ${band[0]}">${esc(band[1])}</span>`}<div class="sub">${esc(X('OI ÷ market cap and OI build-up, each vs this token\'s own 90 days', 'OI ÷ มาร์เก็ตแคป และ OI ที่สะสมเพิ่ม เทียบ 90 วันของเหรียญนี้เอง'))}</div></div>
      <div class="lvread"><div class="eyebrow">${esc(X('Which side is crowded', 'ฝั่งไหนแน่น'))}</div>${sd ? `<div class="sc-n ${sd[0]}" data-lvside="${M.side > 20 ? 'L' : M.side < -20 ? 'S' : '0'}">${esc(sd[1])} <small>${Math.abs(M.side).toFixed(0)}/100</small></div>` : `<div class="sub" data-lvside="none">${esc(X('not available', 'ไม่มีข้อมูล'))}</div>`}<div class="sub">${esc(X(`signed funding vs own 90 days, long/short share of accounts (not of money), basis · ${M.sideN} of 3 inputs`, `Funding (มีเครื่องหมาย) เทียบ 90 วันของตัวเอง สัดส่วนบัญชี Long/Short (ไม่ใช่สัดส่วนเงิน) และ basis · มีข้อมูล ${M.sideN} จาก 3`))}</div></div>
      <div class="bars">${M.comp.map(([id, n, v, w, hist]) => `<div class="bar-r" data-comp="${id}"><span>${esc(n)} <small class="mut">${w}%</small></span><div class="bt"><i style="width:${v == null ? 0 : v.toFixed(0)}%"></i></div><b class="num">${v == null ? (hist ? `<small class="mut">${esc(X('n/a', 'ไม่มี'))}</small>` : '–') : v.toFixed(0)}</b></div>`).join('')}</div>
      <p class="sub lvhist" data-lvhist>${esc(histNote)}</p></div>
    <ul class="insights">${levInsights(M).map(([s, c]) => `<li class="${c}">${esc(s)}</li>`).join('')}</ul>
    <div class="kv lkv">${k(X('Open interest', 'Open interest'), cu('lo-' + t.symbol, M.oiTot, 'big'), (M.oi24 != null ? `<span class="${cls(M.oi24)}">${pct(M.oi24, 1)}</span> 24h${M.oi7 != null ? ` · <span class="${cls(M.oi7)}">${pct(M.oi7, 1)}</span> 7d` : ''}<br>` : '') + (M.oi24 != null && M.oiFlat.length ? `<small class="warn" data-oiexcl>${esc(X(`% excludes ${srcs(M.oiFlat)} (no history for these hours)`, `% ไม่รวม ${srcs(M.oiFlat)} (ไม่มีประวัติช่วงนี้)`))}</small><br>` : '') + (M.oiRec.length ? `<small class="mut" data-oirec>${esc(X(`${srcs(M.oiRec)} from recorded hourly history`, `${srcs(M.oiRec)} จากประวัติรายชั่วโมงที่เก็บไว้`))}</small><br>` : '') + `<small class="mut">${esc(X('All venues', 'ทุกกระดาน'))} · ${esc(hm(D.at))}</small>`)}
      ${k(X('Funding 24h avg (8h)', 'Funding เฉลี่ย 24 ชม. (ต่อ 8 ชม.)'), `<span class="num ${cls(M.wAvg ?? M.wf)}">${fp(M.wAvg ?? M.wf)}</span>`, `${esc(X('Last settled', 'รอบล่าสุด'))} <span class="num ${cls(M.wLast)}">${fp(M.wLast)}</span> · ${esc(X('Next', 'รอบถัดไป'))} <span class="num ${cls(M.wf)}">${fp(M.wf)}</span>${M.floorN ? ` <span class="tagest" title="${esc(X('Exchange default rate when the market is calm', 'อัตราพื้นฐานของกระดานตอนตลาดนิ่ง'))}">${esc(X('default', 'ค่าพื้นฐาน'))} ${M.floorN}/${M.vs.length}</span>` : ''}<br><small class="mut">${pct(M.apr, 1)} ${esc(X('a year', 'ต่อปี'))} · ${esc(X('OI-weighted', 'ถ่วงด้วย OI'))} · ${esc(hm(D.at))}</small>`)}
      ${k(X('Long / short accounts', 'Long / Short (จำนวนบัญชี)'), M.ls ? `<span class="num">${M.ls.toFixed(2)}</span>` : '–', M.ls ? `${(M.ls / (1 + M.ls) * 100).toFixed(0)}% ${X('of accounts long (share of accounts, not of money)', 'ของบัญชีถือ Long (สัดส่วนบัญชี ไม่ใช่สัดส่วนเงิน)')} · ${srcs(M.lsA)}${M.lsA.length > 1 ? ' ' + X('OI-weighted', 'ถ่วงด้วย OI') : ''}` : X('not available', 'ไม่มีข้อมูล'))}
      ${k(X('Perp vol / spot vol', 'วอลุ่ม Perp / วอลุ่ม Spot'), M.spot ? `<span class="num">${(M.volLike / M.spot).toFixed(1)}×</span>` : '–', M.spot ? `${big(M.volLike)} / ${big(M.spot)} · 24h · ${srcs(M.vsv)}` : X('no spot market on these venues', 'ไม่มีตลาด Spot ในกระดานเหล่านี้'))}
      ${k(X('Basis', 'Basis (Perp−Spot)'), M.basis != null ? `<span class="num ${cls(M.basis)}">${pct(M.basis, 3)}</span>` : '–', X('mark vs index', 'ราคา Mark เทียบ Index') + (M.basisV ? ' · ' + vn(M.basisV) : ''))}
      ${k(X('Liquidations', 'โดนล้างพอร์ต'), lq ? `<span class="num">${big(lq.long + lq.short)}</span>` : '–', lq ? `${X('long', 'Long')} ${big(lq.long)} · ${X('short', 'Short')} ${big(lq.short)} <br><small class="mut">OKX · ${X('last', 'ล่าสุด')} ${lq.n} ${X('fills since', 'รายการ ตั้งแต่')} ${hm(lq.since)}</small>` : X('no free REST feed for this pair', 'ไม่มีข้อมูลฟรีสำหรับคู่นี้'))}</div>
    <div class="two sec">
      <div><div class="chartbar"><b>${esc(X('Open interest', 'Open interest'))}</b><span class="sub">7d · ${esc(oiSrc)}</span></div><div class="mchart" id="lvOi"></div></div>
      <div><div class="chartbar"><b>${esc(X('Funding history', 'ประวัติ Funding'))}</b><span class="sub">${esc(X('Settled · 8h slots UTC 00/08/16 · OI-weighted', 'ที่จ่ายจริง · ช่อง 8 ชม. UTC 00/08/16 · ถ่วงด้วย OI'))}</span></div><div id="lvF" class="fbars"></div></div></div>
    <div class="two sec">
      <div><div class="chartbar"><b>${esc(X('Liquidation map', 'แผนที่จุดล้างพอร์ต'))}</b><span class="tagest">${esc(X('Estimate', 'ค่าประมาณ'))}</span></div><div class="lhm" id="lvH"></div>
        <p class="sub lvcap"><span class="tagest">${esc(X('Model estimate · assumed leverage mix capped at max leverage', 'ค่าประมาณจากแบบจำลอง · สมมติสัดส่วนเลเวอเรจ จำกัดไม่เกินเลเวอเรจสูงสุดจริง'))}</span> ${M.vs.map((v) => `${esc(vn(v))} ${v.maxLev ? esc(X('max', 'สูงสุด')) + ' ' + v.maxLev + '×' : esc(X('max 100× assumed', 'สมมติสูงสุด 100×'))} · MM ${v.mm ? (v.mm * 100).toFixed(2) + '%' : '0.5% ' + esc(X('assumed', 'สมมติ'))}`).join(' | ')}</p>
        <p class="expl">${esc(X('Estimated from hourly open-interest changes over 7 days: an increase is opened at that hour\'s price, a decrease removes the same share from every open cluster. New positions are split by the long/short share of accounts (not of money), with an assumed leverage mix (3–100×), capped at each venue\'s max leverage and weighted by its share of open interest. Maintenance margin comes from each venue\'s public tiers where available (Hyperliquid: half the initial margin at max leverage); Binance has no keyless leverage data, so 100× and 0.5% are assumed there. Clusters already crossed by price are removed. Not actual liquidation orders.', 'ประมาณจาก OI ที่เปลี่ยนรายชั่วโมงใน 7 วัน OI เพิ่ม = เปิดที่ราคาชั่วโมงนั้น OI ลด = ตัดออกจากทุกกลุ่มในสัดส่วนเท่ากัน แบ่งฝั่งตามสัดส่วนบัญชี Long/Short (ไม่ใช่สัดส่วนเงิน) และสัดส่วนเลเวอเรจที่สมมติ (3–100 เท่า) จำกัดไม่เกินเลเวอเรจสูงสุดของแต่ละกระดานและถ่วงด้วยสัดส่วน OI ค่า Maintenance margin ใช้ข้อมูลสาธารณะของแต่ละกระดานถ้ามี (Hyperliquid: ครึ่งหนึ่งของ initial margin ที่เลเวอเรจสูงสุด) Binance ไม่มีข้อมูลเลเวอเรจแบบไม่ใช้คีย์ จึงสมมติ 100 เท่าและ 0.5% จุดที่ราคาวิ่งผ่านไปแล้วจะถูกตัดออก ไม่ใช่คำสั่งล้างพอร์ตจริง'))}</p><div class="lvreal" id="lvR"></div></div>
      <div><div class="chartbar"><b>${esc(X('Open interest by venue', 'OI แยกตามกระดาน'))}</b></div><div class="venues">${M.vs.slice().sort((a, b) => b.oiUsd - a.oiUsd).map((v) => `<div class="bar-r"><span>${esc(vn(v))} <small class="mut">${esc(v.pair)}</small></span><div class="bt"><i style="width:${(v.oiUsd / M.oiTot * 100).toFixed(1)}%"></i></div><b class="num">${big(v.oiUsd)}</b></div>`).join('')}</div>
        <div class="ftab"><div class="fh"><span>${esc(X('Funding (8h-eq.)', 'Funding (เทียบ 8 ชม.)'))}</span><span>${esc(X('Next', 'ถัดไป'))}</span><span>${esc(X('Last', 'ล่าสุด'))}</span><span>24h</span></div>${M.vs.map((v) => `<div><span>${esc(vn(v))} <small class="mut">${v.ih}${esc(X('h', ' ชม.'))}</small></span><span class="num ${cls(v.f8)}">${fp(v.f8)}${v.floor ? '<sup class="mut" title="default">●</sup>' : ''}</span><span class="num ${cls(v.last && v.last.r)}">${fp(v.last && v.last.r)}</span><span class="num ${cls(v.avg24)}">${fp(v.avg24)}</span></div>`).join('')}</div>
        ${D.errs.length ? `<p class="sub mt">${esc(X('Unavailable: ', 'ดึงไม่ได้: '))}${esc(D.errs.map((e) => e.split(':')[0]).join(', '))}</p>` : ''}${D.na && D.na.length ? `<p class="sub">${esc(X('No perp market for this token on: ', 'ไม่มีตลาด Perp ของเหรียญนี้บน: '))}${esc(D.na.map((v) => EXNAME[v]).join(', '))}</p>` : ''}</div></div>
    <p class="nfa">${esc(X('Both readings are models, not signals, and are never added into one score. Funding is OI-weighted across venues, normalised to 8 hours, from the 24h average of settled rates; a rate at the venue default (0.01 % per 8h) counts as neutral.', 'ทั้งสองค่าเป็นแบบจำลอง ไม่ใช่สัญญาณซื้อขาย และไม่ได้รวมเป็นคะแนนเดียว Funding ถ่วงด้วย OI ของทุกกระดาน ปรับเป็นรอบ 8 ชม. ใช้ค่าเฉลี่ย 24 ชม. ของรอบที่จ่ายจริง ถ้าเท่ากับอัตราพื้นฐานของกระดาน (0.01% ต่อ 8 ชม.) นับเป็นกลาง'))}</p></div>`;
  const oiP = M.agg.length > 2 ? M.agg.map((x) => ({ t: x.t / 1000, v: x.usd })) : null;
  if (oiP) mchart($('#lvOi'), oiP, { h: 190, id: 'oi' }); else $('#lvOi').innerHTML = `<p class="mut">${esc(X('No OI history from this venue.', 'กระดานนี้ไม่มีประวัติ OI'))}</p>`;
  const fv = M.fhAgg.length ? { fh: M.fhAgg } : null; if (fv) { const a = fv.fh.slice(innerWidth < 600 ? -36 : -60), mx = Math.max(...a.map((x) => Math.abs(x.r)), 1e-9);
    $('#lvF').innerHTML = `<div class="fb">${a.map((x) => `<i class="${x.r >= 0 ? 'p' : 'n'}" style="--h:${(Math.abs(x.r) / mx * 50).toFixed(1)}%" title="${new Date(x.t).toLocaleString(loc(), { month: 'short', day: 'numeric', hour: 'numeric' })}: ${fp(x.r)}${Object.entries(x.per).map(([e, r]) => `&#10;${EXNAME[e]} ${fp(r)}`).join('')}"></i>`).join('')}</div><div class="fb-ax"><span>${new Date(a[0].t).toLocaleDateString(loc(), { month: 'short', day: 'numeric' })}</span><span>±${(mx * 100).toFixed(4)}%</span><span>${new Date(a[a.length - 1].t).toLocaleDateString(loc(), { month: 'short', day: 'numeric' })}</span></div>`; }
  if (H) liqHeat($('#lvH'), H, M.agg);
  levReal(t);
  countUps(b);
}

/* v55 (docs/architect-proof-layer.md §3.3): the real layer from the Smart Money panel (smart_money.json, every panel position at its
   real Hyperliquid liquidationPx), drawn beside the estimate with its own label. The two are never added together. */
async function levReal(t) {
  const el = $('#lvR'); if (!el || typeof SM === 'undefined' || typeof smLoadSnap !== 'function') return;
  if (!SM.d && !SM.err) await smLoadSnap();
  const r = $('#lvR'); if (!r || S.sel !== t.symbol) return;
  const P = SM.d && SM.d.cohorts && SM.d.cohorts.panel, x = P && P.coins[t.symbol];
  if (!x || !x.liq) { r.innerHTML = `<p class="sub">${esc(X('Real layer (Hyperliquid tracked wallets): not available for this token.', 'ข้อมูลจริง (กระเป๋าที่ติดตามบน Hyperliquid): ไม่มีสำหรับเหรียญนี้'))}</p>`; return; }
  r.innerHTML = `<div class="chartbar"><b>${esc(X('Liquidation map', 'แผนที่จุดล้างพอร์ต'))}</b><span class="smreal" data-lvreal>${esc(smRealLbl(x))}</span></div>${smLadder(x.liq)}
    <p class="sub lvcap">${esc(X(`Every position of the Smart Money fixed panel on Hyperliquid at its real liquidation price, snapshot ${jst(new Date(SM.d.snapshotAt || SM.d.updated))}. A sample of one venue, shown beside the estimate above and never added to it.`, `ทุกโพซิชันของกลุ่มคงที่ Smart Money บน Hyperliquid ที่ราคา liq จริง รอบ ${jst(new Date(SM.d.snapshotAt || SM.d.updated))} เป็นตัวอย่างจากกระดานเดียว แสดงคู่กับค่าประมาณด้านบน ไม่เอามารวมกัน`))}</p>`;
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
