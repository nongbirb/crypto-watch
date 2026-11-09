// Events v1 pipeline (docs/events-v1.md). Keyless public sources only. Every value carries its source URL and data time.
// Market reactions are read from 1-minute exchange candles at exact timestamps, so the result never depends on when this runs.
// Usage: node scripts/build_events.mjs <sync | lock ID | score [ID] | history | breaking | pulse | validate [--base REF]>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url); const E = require('../events-core.js');
export const DIR = process.env.EVENTS_DIR || 'data/events';
const H = 36e5, D = 864e5, MIN = 6e4;
const iso = (t) => new Date(t).toISOString().replace('.000Z', 'Z');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (v, d = 4) => (E.num(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
const readJ = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const TOK = () => readJ('tokens.json', { tokens: [] }).tokens;
async function get(u, { text = false, tries = 3, opt = {} } = {}) {
  let err; for (let i = 0; i < tries; i++) {
    try { const r = await fetch(u, { ...opt, headers: { 'user-agent': 'KMS-Capital-events-v1', ...(opt.headers || {}) }, signal: AbortSignal.timeout(25000) }); if (!r.ok) throw Error('HTTP ' + r.status); return text ? await r.text() : await r.json(); }
    catch (e) { err = e; await sleep(800 * (i + 1)); }
  } throw Error(`${u.split('?')[0]}: ${err.message}`);
}
/* ---------- time zones: wall clock in a zone -> UTC ms ---------- */
export function zoned(date, hm, tz) {
  const [y, m, d] = date.split(/[-/]/).map(Number), [hh, mm] = hm.split(':').map(Number); let t = Date.UTC(y, m - 1, d, hh, mm);
  for (let i = 0; i < 2; i++) { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(t)).map((x) => [x.type, x.value]));
    const w = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute); t += Date.UTC(y, m - 1, d, hh, mm) - w; }
  return t;
}
/* ---------- crypto prices at exact timestamps (1m candle that opens at t) ---------- */
export async function priceAt(src, t) {
  const p = encodeURIComponent(src.pair);
  if (src.ex === 'binance') { const url = `https://data-api.binance.vision/api/v3/klines?symbol=${p}&interval=1m&startTime=${t}&limit=1`; const r = await get(url); if (r[0] && +r[0][0] === t) return { price: +r[0][1], at: iso(t), src: `Binance ${src.pair} 1m open`, url }; }
  else if (src.ex === 'bybit') { const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${p}&interval=1&start=${t}&end=${t + 59999}&limit=1`; const r = await get(url); const x = r.result && r.result.list && r.result.list[0]; if (x && +x[0] === t) return { price: +x[1], at: iso(t), src: `Bybit ${src.pair} 1m open`, url }; }
  else if (src.ex === 'okx') { const url = `https://www.okx.com/api/v5/market/history-candles?instId=${p}&bar=1m&after=${t + MIN}&before=${t - 1}&limit=1`; const r = await get(url); const x = r.data && r.data[0]; if (x && +x[0] === t) return { price: +x[1], at: iso(t), src: `OKX ${src.pair} 1m open`, url }; }
  return null;
}
async function tokPrice(tok, t) { for (const s of tok.sources || []) { try { const r = await priceAt(s, t); if (r && r.price > 0) return r; } catch (e) { /* next source */ } } return null; }
export async function move(tok, t0, t1) {
  const a = await tokPrice(tok, t0); if (!a) return null; const b = await tokPrice(tok, t1); if (!b || b.src !== a.src) return null;
  return { pct: round((b.price / a.price - 1) * 100), from: a, to: b, measured_at: b.at };
}
// Usual move: mean and 98th percentile of |1h return| over the 30 days (720 closed hourly candles) before `end`, Binance/Bybit spot.
export async function usual1h(tok, end, base) {
  for (const s of tok.sources || []) {
    try {
      let k = null, url;
      if (s.ex === 'binance') { url = `https://data-api.binance.vision/api/v3/klines?symbol=${s.pair}&interval=1h&endTime=${end - 1}&limit=720`; k = (await get(url)).map((x) => [+x[0], +x[4]]); }
      else if (s.ex === 'bybit') { url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${s.pair}&interval=60&end=${end - 1}&limit=720`; k = (await get(url)).result.list.map((x) => [+x[0], +x[4]]).reverse(); }
      if (!k || k.length < 200) continue;
      const r = k.slice(1).map((x, i) => [x[0], (x[1] / k[i][1] - 1) * 100]);
      const st = (rows) => { const x = E.trailStats(rows.map((y) => y[1])); return x ? { avg: round(x.avg), p98: round(x.p98), n: x.n, src: url, r: rows } : null; };
      if (base) { const bm = new Map(base.r); return st(r.filter((x) => bm.has(x[0])).map((x) => [x[0], x[1] - bm.get(x[0])])); }
      return st(r);
    } catch (e) { /* next */ }
  }
  return null;
}
/* ---------- options-implied move (Deribit, BTC and ETH only) ----------
   Primary: the at-the-money STRADDLE (call + put mark price) of the nearest expiry after the release, as % of that expiry's forward,
   interpolated between the two strikes around the forward. It is the market's price of the expected |move| from now to that expiry.
   Taken by `lock` within 6h before the release (live only: Deribit has no free historical option marks). */
export async function impliedLive(cur, at, now = Date.now(), maxH = E.R.IMPLIED_MAX_AGE_H) { // maxH: only `prelive` (informational) looks further ahead
  if (!(now < at && at - now <= maxH * H)) return null;
  const url = `https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${cur}&kind=option`; const r = (await get(url)).result || [];
  const MON = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
  const exp = (n) => { const m = n.split('-')[1].match(/^(\d{1,2})([A-Z]{3})(\d{2})$/); return m ? Date.UTC(2000 + +m[3], MON[m[2]], +m[1], 8) : NaN; }; // Deribit expiry 08:00 UTC
  const rows = r.filter((x) => x.mark_price > 0 && x.underlying_price > 0 && x.estimated_delivery_price > 0).map((x) => ({ n: x.instrument_name, e: exp(x.instrument_name), k: +x.instrument_name.split('-')[2], cp: x.instrument_name.slice(-1), mk: x.mark_price, iv: x.mark_iv, F: x.underlying_price, idx: x.estimated_delivery_price }));
  const ex = [...new Set(rows.map((x) => x.e))].filter((e) => e > at + H).sort((a, b) => a - b)[0]; if (!ex) return null;
  const ch = rows.filter((x) => x.e === ex), F = ch[0].F, idx = ch[0].idx, byK = new Map();
  for (const x of ch) { const o = byK.get(x.k) || { k: x.k }; o[x.cp === 'C' ? 'c' : 'p'] = x.mk * idx / F * 100; o[x.cp === 'C' ? 'cn' : 'pn'] = x.n; o[x.cp === 'C' ? 'civ' : 'piv'] = x.iv; byK.set(x.k, o); }
  const ks = [...byK.values()].filter((o) => o.c != null && o.p != null), lo = ks.filter((o) => o.k <= F).sort((a, b) => b.k - a.k)[0], hi = ks.filter((o) => o.k >= F).sort((a, b) => a.k - b.k)[0];
  const st = E.straddleAt(F, [lo, hi].filter(Boolean)); if (!E.num(st)) return null;
  return { pct: round(st, 3), method: 'straddle', expiry: iso(ex), forward: F, strikes: [...new Set([lo.k, hi.k])], instruments: [lo.cn, lo.pn, hi.cn, hi.pn].filter((v, i, a) => a.indexOf(v) === i),
    iv_atm: round(((lo.civ + lo.piv + hi.civ + hi.piv) / 4), 2), at: iso(now), src: `Deribit ${cur} ATM straddle (mark), ${iso(ex).slice(0, 10)} expiry`, url: 'https://www.deribit.com/options/' + cur };
}
export async function impliedDvol(cur, at) { // fallback: Deribit DVOL (30-day implied vol index) 5 minutes before the release
  const t = at - 5 * MIN, url = `https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=${cur}&start_timestamp=${t - 10 * MIN}&end_timestamp=${t}&resolution=60`;
  const d = ((await get(url)).result || {}).data || []; const x = d.filter((r) => r[0] <= t).pop(); if (!x) return null;
  return { pct: round(E.impliedMove(x[4]), 3), iv: x[4], method: 'dvol30', at: iso(x[0]), src: 'Deribit DVOL (30-day implied volatility index)', url: 'https://www.deribit.com/statistics/' + cur + '/volatility-index' };
}
/* ---------- positioning snapshot 5 minutes before + CFTC COT ----------
   Funding: Hyperliquid perp funding history (hourly; public on-chain venue, reachable from GitHub's US runners, no display restriction found).
   Open interest: deliberately unavailable. Bybit blocks US runners (HTTP 403, probe run 42597995875); OKX (API Agreement 9.4), Deribit (ToS 4.6),
   Coinbase (Market Data Terms) prohibit displaying their market data publicly, Kraken restricts redistribution; Hyperliquid has no historical OI endpoint. */
export const OI_NA = 'No free open-interest source with public-display rights reachable from GitHub runners (Bybit blocks US runners; OKX, Deribit and Coinbase terms forbid public display, Kraken restricts redistribution; Hyperliquid has no OI history).';
export async function positioning(sym, at) {
  const t = at - 5 * MIN, o = { oi_na: OI_NA };
  try { const body = { type: 'fundingHistory', coin: sym, startTime: t - 3 * H, endTime: t }; const x = (await get('https://api.hyperliquid.xyz/info', { opt: { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } })).filter((r) => r.time <= t).pop();
    if (x && E.num(+x.fundingRate)) o.funding = { pct1h: round(+x.fundingRate * 100, 5), pct8h: round(+x.fundingRate * 800, 4), at: iso(x.time), src: `Hyperliquid ${sym} perp funding (hourly; shown x8 for an 8h rate)`, url: 'https://app.hyperliquid.xyz/trade/' + sym, data_url: 'https://api.hyperliquid.xyz/info', request: body }; } catch (e) { o.funding_err = e.message.slice(0, 120); }
  const code = { BTC: '133741', ETH: '146021' }[sym];
  if (code) try {
    const u = `https://publicreporting.cftc.gov/resource/gpe5-46if.json?$limit=3&$order=report_date_as_yyyy_mm_dd%20DESC&$where=cftc_contract_market_code='${code}'%20AND%20report_date_as_yyyy_mm_dd<='${iso(at).slice(0, 10)}'`;
    // as of Tuesday, published Friday 15:30 ET: use the latest report that was already public before the event
    const x = (await get(u)).find((r) => zoned(iso(Date.parse(r.report_date_as_yyyy_mm_dd.slice(0, 10) + 'T00:00:00Z') + 3 * D).slice(0, 10), '15:30', ET) < at);
    if (x) o.cot = { published: iso(zoned(iso(Date.parse(x.report_date_as_yyyy_mm_dd.slice(0, 10) + 'T00:00:00Z') + 3 * D).slice(0, 10), '15:30', ET)), lev_net: +x.lev_money_positions_long - +x.lev_money_positions_short, am_net: +x.asset_mgr_positions_long - +x.asset_mgr_positions_short, oi: +x.open_interest_all, report_date: x.report_date_as_yyyy_mm_dd.slice(0, 10), market: x.market_and_exchange_names, src: 'CFTC Traders in Financial Futures (weekly)', url: 'https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm', data_url: u };
  } catch (e) { /* unavailable */ }
  return o;
}
/* ---------- daily macro series: change across the release (last fixing before -> first fixing after) ---------- */
const ET = 'America/New_York';
export const SERIES = {
  us2y: { name: 'US 2-year yield', unit: 'bp', col: '2 Yr', fix: ['15:30', ET], lagD: 1, src: 'US Treasury daily par yield curve', page: 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve' },
  us10y: { name: 'US 10-year yield', unit: 'bp', col: '10 Yr', fix: ['15:30', ET], lagD: 1, src: 'US Treasury daily par yield curve', page: 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve' },
  jp10y: { name: 'Japan 10-year yield', unit: 'bp', fix: ['15:00', 'Asia/Tokyo'], lagD: 2, src: 'Japan Ministry of Finance JGB yields', page: 'https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/index.htm' },
  dollar: { name: 'Broad dollar index (Fed)', unit: 'pct', fred: 'DTWEXBGS', fix: ['12:00', ET], lagD: 10, src: 'Federal Reserve H.10 via FRED', page: 'https://fred.stlouisfed.org/series/DTWEXBGS' },
  usdjpy: { name: 'USD/JPY', unit: 'pct', fix: ['14:15', 'Europe/Berlin'], lagD: 2, src: 'ECB euro reference rates (JPY per USD cross)', page: 'https://data.ecb.europa.eu/data/datasets/EXR' },
  spx: { name: 'S&P 500', unit: 'pct', fred: 'SP500', fix: ['16:00', ET], lagD: 4, src: 'S&P Dow Jones Indices via FRED', page: 'https://fred.stlouisfed.org/series/SP500' },
  ndq: { name: 'Nasdaq Composite', unit: 'pct', fred: 'NASDAQCOM', fix: ['16:00', ET], lagD: 4, src: 'Nasdaq via FRED', page: 'https://fred.stlouisfed.org/series/NASDAQCOM' },
  vix: { name: 'VIX', unit: 'pct', fred: 'VIXCLS', fix: ['16:15', ET], lagD: 4, src: 'Cboe via FRED', page: 'https://fred.stlouisfed.org/series/VIXCLS' },
  oil: { name: 'WTI oil', unit: 'pct', fred: 'DCOILWTICO', fix: ['14:30', ET], lagD: 8, src: 'US EIA via FRED', page: 'https://fred.stlouisfed.org/series/DCOILWTICO' },
  gold: { name: 'Gold', unit: 'pct', none: 'No free official daily gold price with reuse terms (LBMA series left FRED).' },
  fedbs: { name: 'Fed balance sheet', unit: 'pct', fred: 'WALCL', fix: ['16:30', ET], lagD: 8, weekly: true, src: 'Federal Reserve H.4.1 via FRED (weekly, Wednesday level)', page: 'https://fred.stlouisfed.org/series/WALCL' },
  stables: { name: 'Stablecoin supply', unit: 'pct', fix: ['00:00', 'UTC'], lagD: 1, src: 'DefiLlama stablecoins (USD-pegged)', page: 'https://defillama.com/stablecoins' }
};
const fredRows = async (id, from) => { const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${from}`; const t = await get(url, { text: true }); return { url, rows: t.trim().split('\n').slice(1).map((l) => l.split(',')).filter((x) => x[1] && x[1] !== '.').map(([d, v]) => ({ d, v: +v })) }; };
async function seriesRows(key, at) {
  const S = SERIES[key], from = iso(at - 21 * D).slice(0, 10);
  if (S.fred) return fredRows(S.fred, from);
  if (key === 'us2y' || key === 'us10y') {
    const ys = [...new Set([new Date(at - 21 * D).getUTCFullYear(), new Date(at + 7 * D).getUTCFullYear()])]; let rows = [], url;
    for (const y of ys) { url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${y}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${y}&page&_format=csv`; const t = await get(url, { text: true }); const L = t.trim().split('\n'); const hd = L[0].split(',').map((x) => x.replace(/"/g, '')); const ci = hd.indexOf(S.col);
      rows = rows.concat(L.slice(1).map((l) => l.split(',')).filter((x) => x[ci]).map((x) => { const [m, d, yy] = x[0].split('/'); return { d: `${yy}-${m}-${d}`, v: +x[ci] }; })); }
    return { url, rows };
  }
  if (key === 'jp10y') {
    const url = 'https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/jgbcme.csv', all = 'https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/historical/jgbcme_all.csv';
    const parse = (t) => t.split('\n').map((l) => l.split(',')).filter((x) => /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(x[0]) && x[10] && x[10] !== '-').map((x) => { const [y, m, d] = x[0].split('/'); return { d: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, v: +x[10] }; });
    let rows = parse(await get(url, { text: true })); if (!rows.length || rows[0].d > from) rows = parse(await get(all, { text: true })).filter((r) => r.d >= from).concat(rows);
    return { url, rows: [...new Map(rows.map((r) => [r.d, r])).values()] };
  }
  if (key === 'usdjpy') {
    const url = `https://data-api.ecb.europa.eu/service/data/EXR/D.JPY+USD.EUR.SP00.A?startPeriod=${from}&format=csvdata`; const L = (await get(url, { text: true })).trim().split('\n'); const hd = L[0].split(','), ic = hd.indexOf('CURRENCY'), id = hd.indexOf('TIME_PERIOD'), iv = hd.indexOf('OBS_VALUE');
    const m = {}; L.slice(1).map((l) => l.split(',')).forEach((x) => { (m[x[id]] = m[x[id]] || {})[x[ic]] = +x[iv]; });
    return { url, rows: Object.entries(m).filter(([, o]) => o.JPY > 0 && o.USD > 0).map(([d, o]) => ({ d, v: round(o.JPY / o.USD, 4) })) };
  }
  if (key === 'stables') { const url = 'https://stablecoins.llama.fi/stablecoincharts/all'; const r = await get(url); return { url, rows: r.map((x) => ({ d: iso(+x.date * 1000).slice(0, 10), v: x.totalCirculatingUSD && x.totalCirculatingUSD.peggedUSD })).filter((x) => x.v > 0 && x.d >= from) }; }
  throw Error('unknown series ' + key);
}
export function across(S, rows, at, now) {
  const fx = (d) => zoned(d, S.fix[0], S.fix[1]); const s = rows.filter((r) => E.num(r.v)).sort((a, b) => a.d.localeCompare(b.d));
  const b = s.filter((r) => fx(r.d) < at).pop(), a = s.find((r) => fx(r.d) >= at);
  if (!b) return { status: 'unavailable', reason: 'no data before the release' };
  if (!a) { const late = now - at > (S.lagD + 1) * D; return { status: late ? 'late' : 'waiting', before: { d: b.d, v: b.v }, latest: s.length ? s[s.length - 1].d : null }; }
  const chg = S.unit === 'bp' ? round((a.v - b.v) * 100, 1) : round((a.v / b.v - 1) * 100, 3);
  return { status: 'ok', chg, before: { d: b.d, v: b.v }, after: { d: a.d, v: a.v } };
}
async function macro(ev, now) {
  const out = {};
  for (const k of Object.keys(SERIES)) {
    const S = SERIES[k]; if (S.none) { out[k] = { status: 'unavailable', reason: S.none }; continue; }
    const prev = ev.macro && ev.macro[k]; if (prev && prev.status === 'ok') { out[k] = prev; continue; } // a measured change is never re-fetched
    try { const { url, rows } = await seriesRows(k, Date.parse(ev.at)); out[k] = { ...across(S, rows, Date.parse(ev.at), now), src: S.src, url: S.page, data_url: url, fetched_at: iso(now), weekly: !!S.weekly };
    } catch (e) { out[k] = { status: 'unavailable', reason: e.message.slice(0, 160), src: S.src, url: S.page, fetched_at: iso(now) }; }
    if (prev && JSON.stringify({ ...prev, fetched_at: 0 }) === JSON.stringify({ ...out[k], fetched_at: 0 })) out[k] = prev; // nothing new: keep the file unchanged (no empty data commits)
  }
  return out;
}
/* ---------- event files ---------- */
const file = (id) => path.join(DIR, id + '.json');
export function save(ev, dir = DIR) {
  const f = path.join(dir, ev.id + '.json'), prev = readJ(f, null), errs = E.checkLocked(prev, ev);
  if (errs.length) throw Error(`${ev.id}: ${errs.join('; ')}`);
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f + '.tmp', JSON.stringify(ev, null, 1) + '\n'); fs.renameSync(f + '.tmp', f); return ev;
}
export function writeIndex(dir = DIR, now = Date.now()) {
  const old = readJ(path.join(dir, 'index.json'), {});
  const evs = fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.json$/.test(f)).map((f) => readJ(path.join(dir, f), null)).filter(Boolean)
    .map((e) => ({ id: e.id, kind: e.kind, type: e.type, title: e.title, th_title: e.th_title, at: e.at, time_known: e.time_known !== false, impact: e.impact, tokens: e.tokens || [], url: e.source && e.source.url, view: !!(e.view && e.view.locked_at), lockv: E.lockOk(e), scored: !!(e.post && e.post.d1 && e.post.d1.BTC), cands: e.kind === 'breaking' ? (e.candidates || []).map((c) => c.url) : undefined, nq: e.kind === 'breaking' && e.qualifies === false ? true : undefined, cu: e.kind === 'breaking' && (e.unclear || E.tokenUnclear((e.candidates || [])[0] && e.candidates[0].gate)) ? true : undefined }))
    .sort((a, b) => a.at.localeCompare(b.at));
  if (old.events && JSON.stringify(old.events) === JSON.stringify(evs)) return old; // unchanged: no rewrite, no empty data commit
  const idx = { schema: 1, updated: iso(now), launched: old.launched || null, events: evs };
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(idx, null, 1) + '\n'); return idx;
}
/* ---------- sync: scheduled events from the Calendar ---------- */
const KINDS = [['cpi', /\bcpi\b/i], ['ppi', /\bppi\b/i], ['jobs', /\b(jobs|payrolls|nfp|employment situation)\b/i], ['fomc', /\bfomc\b/i], ['pce', /\bpce\b/i], ['gdp', /\bgdp\b/i], ['boj', /\b(boj|bank of japan)\b/i], ['ecb', /\becb\b/i]];
export function kindOf(e, tracked) {
  if (e.type === 'unlock') { const t = (e.tokens || []).find((s) => tracked.has(s)); return t && e.impact === 'high' ? 'unlock-' + t.toLowerCase() : null; }
  if (e.type !== 'macro' || (e.tokens || []).length) return null; const k = KINDS.find(([, re]) => re.test(e.title || '')); return k ? k[0] : null;
}
const OFFICIAL = { cpi: ['BLS', 'https://www.bls.gov/schedule/news_release/cpi.htm'], ppi: ['BLS', 'https://www.bls.gov/schedule/news_release/ppi.htm'], jobs: ['BLS', 'https://www.bls.gov/schedule/news_release/empsit.htm'], fomc: ['Federal Reserve', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'], pce: ['BEA', 'https://www.bea.gov/news/schedule'], gdp: ['BEA', 'https://www.bea.gov/news/schedule'], boj: ['Bank of Japan', 'https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm'], ecb: ['ECB', 'https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html'] };
export function fromCalendar(cals, tracked, now, days = 30) {
  const out = new Map();
  for (const e of cals.flatMap((c) => c.events || [])) {
    const k = kindOf(e, tracked); if (!k || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) continue;
    const tk = !!(e.time && /^\d{1,2}:\d{2}$/.test(e.time)), at = Date.parse(`${e.date}T${tk ? e.time.padStart(5, '0') : '00:00'}:00+09:00`);
    if (!(at > now - 7 * D && at < now + days * D)) continue;
    const id = `${e.date}-${k}`; /* calendar (JST) date: manual and auto entries for one day merge */ if (out.has(id) && out.get(id).time_known) continue;
    const [sn, su] = OFFICIAL[k] || [e.src || 'Calendar', e.url];
    out.set(id, { schema: 1, id, kind: 'scheduled', type: k.split('-')[0], title: e.title, th_title: e.th_title || (e.th && e.th.title) || null, at: iso(at), time_known: tk, impact: e.impact || 'medium', tokens: e.tokens || [],
      source: { name: sn, url: /^https:\/\//.test(su || '') ? su : e.url }, calendar: { date_jst: e.date, time_jst: e.time || null, url: e.url || null } });
  }
  return [...out.values()];
}
async function sync(now = Date.now()) {
  const tracked = new Set(TOK().map((t) => t.symbol)); const cals = ['calendar.json', 'calendar_auto.json'].map((f) => readJ(f, { events: [] }));
  let n = 0; for (const ev of fromCalendar(cals, tracked, now)) { const prev = readJ(file(ev.id), null); if (prev) { if (!prev.view && prev.at !== ev.at) { save({ ...prev, at: ev.at, time_known: ev.time_known, title: ev.title, th_title: ev.th_title }); console.log('moved', ev.id); } continue; } save(ev); n++; console.log('created', ev.id); }
  writeIndex(); console.log('sync done, new', n);
}
/* ---------- lock: hand-entered consensus + view, plus the live options snapshot ---------- */
async function lock(id, now = Date.now()) {
  const ev = readJ(file(id), null); if (!ev) throw Error('no event ' + id); const at = Date.parse(ev.at), inp = readJ(path.join(DIR, 'inputs', id + '.json'), null);
  if (ev.kind === 'scheduled' && now >= at) throw Error(`${id}: release time passed (${ev.at}); a view can no longer be locked`);
  if (!inp || !inp.view || inp.view.status !== 'final') throw Error(`${id}: data/events/inputs/${id}.json needs view.status "final"`);
  const next = JSON.parse(JSON.stringify(ev));
  if (!next.consensus && inp.consensus && inp.consensus.value != null && /^https:\/\//.test(inp.consensus.url || '')) next.consensus = { ...inp.consensus, locked_at: iso(now) };
  if (!next.view) { const { status, ...v } = inp.view; next.view = { ...v, locked_at: iso(now), ...(ev.kind === 'breaking' ? { after_news: true, breaking: true } : {}) }; }
  next.pre = next.pre || {}; next.pre.implied = next.pre.implied || {};
  if (ev.kind === 'scheduled') for (const c of ['BTC', 'ETH']) if (!next.pre.implied[c]) try { const x = await impliedLive(c, at, now); if (x) next.pre.implied[c] = x; } catch (e) { console.log('implied', c, e.message); }
  save(next); writeIndex(); console.log('locked', id, next.view.locked_at, 'implied', Object.keys(next.pre.implied));
  // After the lock is saved: freeze the "What's priced in now" snapshot with the same straddle. A failure here never affects the lock.
  if (ev.kind === 'scheduled') try { await prelive(now, id, next.pre.implied); } catch (e) { console.log('prelive (informational) failed:', e.message); }
  console.log(`NEXT: commit and push now, before ${ev.at}:  git add ${DIR} && git commit -m "events: lock ${id}" && git push   (only a push GitHub records before the release counts as a verified lock)`);
}
/* ---------- prelive: "What's priced in now", an hourly pre-release snapshot (docs/events-v1.md §5b) ----------
   Informational only. Scoring still uses the lock's straddle (pre.implied) and the T-5m positioning (pos). Written to data/events/prelive.json,
   never into the event file, so no frozen field or lock proof is touched. Stops updating once the view is locked (lock writes the final copy). */
const PRE_DAYS = 8; // Deribit lists daily/weekly expiries, so a straddle for the nearest expiry after the release exists about a week ahead
const weekStart = (t) => { const d = new Date(t), dow = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow); }; // Monday 00:00 UTC
export async function preSnap(ev, now = Date.now(), im0 = {}) {
  const at = Date.parse(ev.at), t = Math.floor(now / MIN) * MIN - MIN /* last closed 1m candle */, byS = Object.fromEntries(TOK().map((x) => [x.symbol, x]));
  const hist = ((readJ(path.join(DIR, 'history.json'), { types: {} }).types || {})[ev.type] || []).filter((r) => Date.parse(r.at) < at), out = { at: iso(t), assets: {} };
  for (const c of ['BTC', 'ETH']) {
    const tok = byS[c], o = {}; if (!tok) continue;
    try { o.implied = im0[c] || await impliedLive(c, at, now, PRE_DAYS * 24); } catch (e) { o.implied_err = e.message.slice(0, 120); }
    if (o.implied && o.implied.method === 'straddle') { // baseline over the same window the straddle covers: same hours before and after each past release
      const pre = at - Date.parse(o.implied.at), post = Date.parse(o.implied.expiry) - at, mv = [];
      o.window = { before_h: round(pre / H, 2), after_h: round(post / H, 2) };
      for (const r of hist) { const T = Date.parse(r.at), m = await move(tok, Math.floor((T - pre) / MIN) * MIN, Math.floor((T + post) / MIN) * MIN); if (m) { mv.push(Math.abs(m.pct)); o.base_src = o.base_src || m.from.src; } }
      o.base = mv.length ? { avg: round(mv.reduce((x, y) => x + y, 0) / mv.length), n: mv.length, of: `${hist.length} past ${ev.type} releases (data/events/history.json dates)`, src: o.base_src } : null; delete o.base_src;
      const x = E.expectVsUsual(o.implied.pct, o.base); if (x) o.vs_usual = { ratio: round(x.ratio, 3), key: x.key, rule: `ratio > ${E.R.EXPECT_RATIO[1]} bigger, < ${E.R.EXPECT_RATIO[0]} smaller, else normal; needs n >= ${E.R.MIN_PAST_N}` };
    }
    o.run = {}; for (const [k, t0] of [['h24', t - D], ['d7', t - 7 * D], ['week', weekStart(t)]]) { const m = await move(tok, t0, t); if (m) o.run[k] = m; }
    const p = await positioning(c, t + 5 * MIN); if (p.funding) o.funding = p.funding; if (p.cot) o.cot = p.cot;
    out.assets[c] = o;
  }
  return out;
}
export async function prelive(now = Date.now(), only = null, im0 = null) {
  const f = path.join(DIR, 'prelive.json'), P = readJ(f, { schema: 1, events: {} }); let n = 0;
  for (const g of fs.readdirSync(DIR).filter((x) => /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.json$/.test(x))) {
    const ev = readJ(path.join(DIR, g), null); if (!ev || ev.kind !== 'scheduled' || ev.type === 'unlock' || (only && ev.id !== only)) continue;
    const at = Date.parse(ev.at), cur = P.events[ev.id];
    if (!(now < at && at - now <= PRE_DAYS * D) || (cur && cur.frozen_at)) continue;
    if (ev.view && ev.view.locked_at && !only) continue; // locked: only the lock itself writes the final copy
    const s = await preSnap(ev, now, im0 || {}); if (only && ev.view && ev.view.locked_at) s.frozen_at = ev.view.locked_at; P.events[ev.id] = s; n++;
    console.log('prelive', ev.id, Object.entries(s.assets).map(([k, v]) => `${k} straddle ${v.implied ? v.implied.pct : 'na'} base ${v.base ? v.base.avg + ' n' + v.base.n : 'na'} ${v.vs_usual ? v.vs_usual.key : ''}`).join(' | '));
  }
  for (const k of Object.keys(P.events)) if (Date.parse(P.events[k].at) < now - 30 * D) delete P.events[k]; // keep 30 days
  if (n) { P.updated = iso(now); fs.writeFileSync(f + '.tmp', JSON.stringify(P, null, 1) + '\n'); fs.renameSync(f + '.tmp', f); }
}
/* ---------- score: freeze the reactions that are due ---------- */
async function score(id, now = Date.now()) {
  const ev = readJ(file(id), null); if (!ev) throw Error('no event ' + id); const at = Date.parse(ev.at); if (now < at) { console.log(id, 'not released yet'); return; }
  const next = JSON.parse(JSON.stringify(ev)), toks = TOK(); next.post = next.post || {}; next.pre = next.pre || {}; next.pre.implied = next.pre.implied || {};
  for (const k of ['ref', 'before24h', 'h1', 'd1', 'to_expiry', 'lock_d1']) next.post[k] = next.post[k] || {};
  const lockT = next.view && next.view.locked_at ? Date.parse(next.view.locked_at) : null;
  if (ev.kind === 'scheduled' && lockT && !(next.lock_proof && next.lock_proof.verified)) { const pr = await proveFile(file(id), next); if (pr.verified) next.lock_proof = pr; else console.log(id, 'lock not verified:', pr.why); }
  for (const t of toks) {
    const s = t.symbol;
    if (!next.post.ref[s]) { const p = await tokPrice(t, at); if (p) next.post.ref[s] = p; }
    if (!next.post.before24h[s]) { const m = await move(t, at - D, at); if (m) next.post.before24h[s] = m; }
    if (ev.time_known !== false && !next.post.h1[s] && now >= at + H + MIN) { const m = await move(t, at, at + H); if (m) next.post.h1[s] = m; }
    if (!next.post.d1[s] && now >= at + D + MIN) { const m = await move(t, at, at + D); if (m) next.post.d1[s] = m; }
    const im = next.pre.implied[s]; if (im && im.method === 'straddle' && !next.post.to_expiry[s] && now >= Date.parse(im.expiry) + MIN) { const m = await move(t, at, Date.parse(im.expiry)); if (m) next.post.to_expiry[s] = m; }
    if (ev.kind === 'breaking' && lockT && !next.post.lock_d1[s] && now >= lockT + D + MIN && (s === 'BTC' || s === 'ETH')) { const t0 = Math.floor(lockT / MIN) * MIN + MIN, m = await move(t, t0, t0 + D); if (m) next.post.lock_d1[s] = m; }
  }
  if (ev.kind === 'scheduled') for (const c of ['BTC', 'ETH']) if (!next.pre.implied[c]) try { const x = await impliedDvol(c, at); if (x) next.pre.implied[c] = x; } catch (e) { console.log('dvol', c, e.message); }
  next.pos = next.pos || {}; for (const c of ['BTC', 'ETH']) if (!next.pos[c]) { const p = await positioning(c, at); // freeze when funding is in; after 2 days freeze as unavailable (no endless retries)
    if (p.funding) next.pos[c] = p; else if (now > at + 2 * D) next.pos[c] = { ...p, unavailable: true, reason: 'funding not available within 2 days: ' + (p.funding_err || 'no record'), checked_at: iso(now) }; }
  if (ev.type !== 'unlock' && ev.kind === 'scheduled') next.macro = await macro(next, now);
  const strip = (o) => JSON.stringify({ ...o, scored_at: 0 }); if (strip(next) === strip(ev)) { console.log(id, 'nothing new'); return; }
  next.scored_at = iso(now); save(next); writeIndex();
  console.log('scored', id, 'h1', Object.keys(next.post.h1).length, 'd1', Object.keys(next.post.d1).length, 'macro', Object.entries(next.macro || {}).map(([k, v]) => k + ':' + v.status).join(' '));
}
async function scoreAll(now = Date.now()) {
  for (const f of fs.readdirSync(DIR).filter((f) => /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.json$/.test(f))) {
    const ev = readJ(path.join(DIR, f), null), at = Date.parse(ev.at); const done = ev.post && ev.post.d1 && ev.post.d1.BTC && (!ev.macro || Object.values(ev.macro).every((m) => m.status !== 'waiting'));
    if (now >= at && now < at + 21 * D && !done) try { await score(ev.id, now); } catch (e) { console.log('score fail', ev.id, e.message); }
  }
}
/* ---------- history: moves after past same-type releases (real BLS dates only) ---------- */
async function history() {
  const hd = readJ(path.join(DIR, 'history_dates.json'), null), toks = TOK(), out = readJ(path.join(DIR, 'history.json'), { schema: 1, types: {} });
  for (const [type, dates] of Object.entries(hd.types)) {
    const have = new Map((out.types[type] || []).map((r) => [r.at, r])), rows = [];
    for (const d of dates) {
      const at = zoned(d, hd.time_et, ET), r = have.get(iso(at)) || { at: iso(at), date_et: d, moves: {} };
      for (const t of toks) if (!r.moves[t.symbol]) { const h1 = await move(t, at, at + H), d1 = await move(t, at, at + D); if (h1 || d1) r.moves[t.symbol] = { h1: h1 ? h1.pct : null, d1: d1 ? d1.pct : null, src: (h1 || d1).from.src }; }
      rows.push(r); process.stdout.write('.');
    }
    out.types[type] = rows;
  }
  out.sources = hd.sources; out.updated = iso(Date.now()); out.note = 'BTC/ETH/tracked-token % moves from the 1m candle opening at the release to the one opening 1h / 24h later.';
  fs.writeFileSync(path.join(DIR, 'history.json'), JSON.stringify(out, null, 1) + '\n'); console.log('\nhistory', Object.fromEntries(Object.entries(out.types).map(([k, v]) => [k, v.length])));
}
/* ---------- breaking: X Narrative headlines that moved markets ---------- */
export const xTime = (u) => { const m = /x\.com\/[^/]+\/status\/(\d{15,20})/.exec(u || ''); return m ? Number((BigInt(m[1]) >> 22n) + 1288834974657n) : null; };
export const GATE_RULE = `|1h| > max(${E.R.UNUSUAL_X}x mean, p${Math.round(E.R.UNUSUAL_PCTL * 100)}) of trailing ${E.R.UNUSUAL_WIN_H}h`;
async function gateFor(h, toks, byS) {
  const t0 = Math.floor(h.at / MIN) * MIN, m = {}, u = {}, ub = await usual1h(byS.BTC, t0), lite = (x) => (x ? { avg: x.avg, p98: x.p98, n: x.n } : null);
  for (const s of ['BTC', 'ETH']) { const x = await move(byS[s], t0, t0 + H); m[s.toLowerCase()] = x ? x.pct : null; u[s.toLowerCase()] = lite(s === 'BTC' ? ub : await usual1h(byS[s], t0)); }
  let tok = null; const named = toks.find((t) => t.symbol !== 'BTC' && t.symbol !== 'ETH' && new RegExp(`(\\$${t.symbol}\\b|\\b${t.name}\\b)`, 'i').test(h.text || ''));
  if (named && ub) { const x = await move(named, t0, t0 + H), ur = await usual1h(named, t0, ub); if (x && E.num(m.btc) && ur) tok = { sym: named.symbol, rel: round(x.pct - m.btc), usual: lite(ur) }; }
  return { ...E.gate(h, m, u, tok), m, u, tok, rule: GATE_RULE };
}
async function breaking(now = Date.now()) {
  const N = readJ('narrative.json', {}), eds = (N.editions || []).slice(0, 2), toks = TOK(), byS = Object.fromEntries(toks.map((t) => [t.symbol, t]));
  const heads = []; for (const ed of eds) for (const sec of ['macro', 'narratives', 'concerns']) for (const it of Array.isArray(ed[sec]) ? ed[sec] : []) {
    const s = (it.src || []).map((x) => ({ ...x, at: xTime(x.u) })).filter((x) => x.at && /^https:\/\//.test(x.u)).sort((a, b) => a.at - b.at)[0]; if (!s) continue;
    const title = it.title || it.name || {}; heads.push({ at: s.at, url: s.u, src: s.n, tier: s.tier, title: title.en || title, th_title: title.th || null, edition: ed.id, text: `${title.en || ''} ${(it.body || {}).en || ''}` });
  }
  const passed = [], seen = new Set();
  for (const h of heads) {
    if (seen.has(h.url) || h.at + H + MIN > now || h.at < now - 3 * D) continue; seen.add(h.url);
    const g = await gateFor(h, toks, byS); if (g.pass) passed.push({ ...h, gate: g });
  }
  // Re-check breaking events already on disk against the current gate rule; ones that no longer pass are marked, never forced through.
  for (const f of fs.readdirSync(DIR).filter((f) => /-brk-\d{4}\.json$/.test(f))) {
    const ev = readJ(path.join(DIR, f), null); if (!ev || (ev.gate_check && ev.gate_check.rule === GATE_RULE)) continue;
    const res = []; for (const c of ev.candidates || []) res.push(await gateFor({ ...c, at: Date.parse(c.at), text: `${c.title || ''}` }, toks, byS));
    const ok = res.some((g) => g.pass); save({ ...ev, qualifies: ok, gate_check: { rule: GATE_RULE, checked_at: iso(now), pass: ok, results: res } });
    console.log('re-gate', ev.id, ok ? 'qualifies' : 'does NOT qualify');
  }
  for (const c of E.cluster(passed)) {
    const id = `${iso(c.at).slice(0, 10)}-brk-${iso(c.at).slice(11, 16).replace(':', '')}`; if (fs.existsSync(file(id))) continue;
    const lead = c.cands[0]; const t0 = Math.floor(c.at / MIN) * MIN, pre = {};
    for (const s of ['BTC', 'ETH']) { const x = await move(byS[s], t0 - H, t0); if (x) pre[s] = x; }
    save({ schema: 1, id, kind: 'breaking', type: 'news', title: c.unclear ? 'Market move: cause unclear' : lead.title, th_title: c.unclear ? 'ตลาดขยับแรง ยังไม่ชัดว่าเพราะข่าวไหน' : lead.th_title, at: iso(t0), time_known: true, impact: 'high', tokens: lead.gate.tok ? [lead.gate.tok.sym] : [],
      source: { name: lead.src, url: lead.url }, unclear: c.unclear, candidates: c.cands.map((x) => ({ title: x.title, th_title: x.th_title, url: x.url, src: x.src, tier: x.tier, at: iso(x.at), gate: x.gate })), pre_move: pre, created_at: iso(now), qualifies: true, gate_check: { rule: GATE_RULE, checked_at: iso(now), pass: true, results: c.cands.map((x) => x.gate) } });
    console.log('breaking', id, c.cands.length, 'candidate(s)');
  }
  writeIndex();
}
/* ---------- pulse: cheap BTC/ETH check for the 15-minute workflow (no AI, no keys) ---------- */
async function pulse(now = Date.now()) {
  const toks = TOK(), f = path.join(DIR, 'candidates.json'), c = readJ(f, { schema: 1, moves: [] }), t1 = Math.floor(now / MIN) * MIN - MIN, t0 = t1 - H; let added = 0;
  for (const s of ['BTC', 'ETH']) { const t = toks.find((x) => x.symbol === s); const m = await move(t, t0, t1), u = await usual1h(t, t0);
    const thr = E.unusualThr(u); if (m && E.num(thr) && Math.abs(m.pct) > thr && !c.moves.some((x) => x.sym === s && Math.abs(Date.parse(x.to) - t1) < H)) { c.moves.unshift({ sym: s, pct: m.pct, usual: u.avg, p98: u.p98, thr: round(thr), rule: GATE_RULE, from: iso(t0), to: iso(t1), src: m.from.src, seen_at: iso(now) }); added++; } }
  c.moves = c.moves.slice(0, 50); if (added) { c.updated = iso(now); fs.writeFileSync(f, JSON.stringify(c, null, 1) + '\n'); } console.log('pulse', added ? 'new candidate move(s): ' + added : 'nothing unusual');
}
/* ---------- lock proof: git history + GitHub's server-side push timestamps ---------- */
const REPO = process.env.GITHUB_REPOSITORY || 'nongbirb/crypto-watch';
const git = (...a) => execFileSync('git', a, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
// First commit whose copy of the event file already holds this exact locked view.
export function lockCommit(f, view) {
  let shas = []; try { shas = git('log', '--reverse', '--format=%H', '--', f).split('\n').filter(Boolean); } catch (e) { return null; }
  const want = JSON.stringify(view); for (const c of shas) { try { const v = JSON.parse(git('show', `${c}:${f}`)).view; if (v && JSON.stringify(v) === want) return c; } catch (e) { /* not in this commit */ } }
  return null;
}
let PUSHES; export async function pushes() {
  if (PUSHES !== undefined) return PUSHES; if (process.env.EVENTS_PUSHES) return (PUSHES = readJ(process.env.EVENTS_PUSHES, null)); // tests: injected push list
  const out = [], h = process.env.GITHUB_TOKEN ? { authorization: 'Bearer ' + process.env.GITHUB_TOKEN } : {};
  try { for (let page = 1; page <= 10; page++) { const r = await get(`https://api.github.com/repos/${REPO}/activity?per_page=100&page=${page}`, { opt: { headers: { accept: 'application/vnd.github+json', ...h } } });
    for (const a of r) if (['push', 'branch_creation', 'force_push', 'merge_queue_merge', 'pr_merge'].includes(a.activity_type)) out.push({ after: a.after, ts: a.timestamp, ref: a.ref }); if (r.length < 100) break; }
    PUSHES = out; } catch (e) { console.log('lock proof: GitHub activity unavailable:', e.message); PUSHES = null; }
  return PUSHES;
}
const isAnc = (a, b) => { if (a === b) return true; try { execFileSync('git', ['merge-base', '--is-ancestor', a, b], { stdio: 'ignore' }); return true; } catch (e) { return false; } };
export async function proveFile(f, ev) { return E.proveLock(lockCommit(f, ev.view), ev.at, await pushes(), isAnc); }
/* ---------- validate: no locked field changed against a git base ---------- */
export async function validateProofs(dir = DIR) {
  const errs = [], notes = [];
  for (const f of fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.json$/.test(f))) {
    const ev = readJ(path.join(dir, f), null); if (!ev || ev.kind === 'breaking' || !ev.view || !ev.view.locked_at) continue;
    const pr = await proveFile(path.join(dir, f), ev);
    const P = await pushes(), oldest = P && P.length ? Math.min(...P.map((x) => Date.parse(x.ts))) : null, tooOld = oldest !== null && ev.lock_proof && Date.parse(ev.lock_proof.pushed_at) < oldest;
    if (ev.lock_proof && ev.lock_proof.verified) { if (tooOld && !pr.verified) notes.push(`${f}: lock proof older than GitHub's activity window, kept`); else if (pr.verified ? pr.commit !== ev.lock_proof.commit : P !== null) errs.push(`${f}: lock_proof claims ${ev.lock_proof.commit} pushed ${ev.lock_proof.pushed_at}, git/GitHub say: ${pr.why || pr.commit}`); }
    else notes.push(`${f}: lock not verified (${pr.why || 'not recorded yet'})`);
  }
  return { errs, notes };
}
export function validate(base = 'HEAD', dir = DIR) {
  const errs = [];
  for (const f of fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.json$/.test(f))) {
    const next = readJ(path.join(dir, f), null); if (!next) { errs.push(f + ': invalid JSON'); continue; }
    let prev = null; try { prev = JSON.parse(execFileSync('git', ['show', `${base}:${path.join(dir, f)}`], { stdio: ['ignore', 'pipe', 'ignore'] }).toString()); } catch (e) { prev = null; }
    errs.push(...E.checkLocked(prev, next).map((x) => f + ': ' + x)); if (next.id + '.json' !== f) errs.push(f + ': id mismatch');
  }
  return errs;
}
async function main() {
  const [cmd, arg] = process.argv.slice(2); fs.mkdirSync(DIR, { recursive: true });
  if (cmd === 'sync') return sync();
  if (cmd === 'lock') return lock(arg);
  if (cmd === 'score') return arg ? score(arg) : scoreAll();
  if (cmd === 'history') return history();
  if (cmd === 'breaking') return breaking();
  if (cmd === 'pulse') return pulse();
  if (cmd === 'prelive') return prelive();
  if (cmd === 'validate') { const b = process.argv.indexOf('--base'); const e = validate(b > 0 ? process.argv[b + 1] : 'HEAD'); const p = await validateProofs(); p.notes.forEach((n) => console.log('note', n)); e.push(...p.errs);
    if (e.length) { console.error(e.join('\n')); process.exitCode = 1; } else console.log('validate ok'); return; }
  console.log('usage: node scripts/build_events.mjs <sync | lock ID | score [ID] | history | breaking | pulse | validate [--base REF]>'); process.exitCode = 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch((e) => { console.error(e.message || e); process.exitCode = 1; });
