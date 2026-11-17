// Market Health builder (docs/market-health-p6.md) -> health.json, data/health/history.json, data/health/categories.json.
// Keyless sources only: CoinGecko (universe, intraday view, categories, dominance), Binance vision -> OKX -> Gate daily candles
// (the official score, closed candles only), OKX + Hyperliquid perps (Leverage Risk; Binance/Bybit are geo-blocked on GitHub runners).
// Every run: CoinGecko markets + global (2 calls), OKX/Hyperliquid snapshot. Once per closed UTC day (or --heavy): candles + score +
// one history row. Categories: once per UTC day, cached. Usage: node scripts/build_health.mjs [--heavy]   env CG_GAP=ms between CoinGecko calls
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
import { candles } from './klines-lib.mjs';
const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname)), P = (f) => path.join(ROOT, f);
const H = createRequire(import.meta.url)('../health-core.js');
const CG = 'https://api.coingecko.com/api/v3', OKX = 'https://www.okx.com/api/v5', HL = 'https://api.hyperliquid.xyz/info';
const CG_GAP = +(process.env.CG_GAP || 13000), HEAVY = process.argv.includes('--heavy'), N_UNI = 100, MIN_VOL = 5e6;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = new Date(), iso = (d) => d.toISOString().replace(/\.\d+Z$/, 'Z');
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(P(f), 'utf8')); } catch { return d; } };
async function getJ(u, body, tries = 4) {
  for (let i = 0; ; i++) {
    try { const r = await fetch(u, { method: body ? 'POST' : 'GET', headers: { 'user-agent': 'kms-capital', 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
      if (r.ok) return await r.json(); throw new Error('HTTP ' + r.status); }
    catch (e) { if (i >= tries - 1) throw e; await sleep((/429/.test(e.message) ? 20000 : 2000) * (i + 1)); }
  }
}
// candle requests: a 4xx (pair not listed) fails at once so the source chain moves on; network errors and 429/5xx retry
const kGet = async (u) => { for (let i = 0; ; i++) { const r = await fetch(u, { headers: { 'user-agent': 'kms-capital' }, signal: AbortSignal.timeout(20000) }).catch((e) => ({ ok: false, status: 0, e }));
  if (r.ok) return r.json(); if ((r.status >= 400 && r.status < 500 && r.status !== 429) || i >= 2) throw new Error(r.e ? r.e.message : 'HTTP ' + r.status); await sleep(1500 * (i + 1)); } };
let cgLast = 0; const cg = async (q) => { const w = cgLast + CG_GAP - Date.now(); if (w > 0) await sleep(w); try { return await getJ(CG + q); } finally { cgLast = Date.now(); } };

// ---- universe rules (docs §3). CoinGecko category ids; membership comes from /coins/markets?category=<id>
export const EXCL = ['stablecoins', 'yield-bearing-stablecoins', 'us-treasury-backed-stablecoin', 'wrapped-tokens', 'bridged-tokens', 'binance-peg-tokens',
  'liquid-staking-tokens', 'liquid-restaking-tokens', 'leveraged-token', 'tokenized-btc', 'tokenized-gold', 'tokenized-commodities', 'tokenized-stock',
  'tokenized-exchange-traded-funds-etfs', 'tokenized-treasuries', 'tokenized-money-market-fund-mmfs', 'tokenized-credit', 'tokenized-private-credit', 'tokenized-closed-end-funds-cefs'];
const THEME = [['meme-token', 'Meme'], ['layer-1', 'L1'], ['layer-2', 'L2'], ['artificial-intelligence', 'AI'], ['gaming', 'Gaming'], ['depin', 'DePIN'], ['real-world-assets-rwa', 'RWA'], ['decentralized-finance-defi', 'DeFi']];
const ECO = [['bitcoin-ecosystem', 'Bitcoin'], ['ethereum-ecosystem', 'Ethereum'], ['solana-ecosystem', 'Solana'], ['binance-smart-chain', 'BNB Chain'], ['base-ecosystem', 'Base'], ['arbitrum-ecosystem', 'Arbitrum'],
  ['tron-ecosystem', 'Tron'], ['hyperliquid-ecosystem', 'Hyperliquid'], ['sui-ecosystem', 'Sui'], ['avalanche-ecosystem', 'Avalanche'], ['ton-ecosystem', 'TON'], ['cosmos-ecosystem', 'Cosmos']];
const NATIVE = { bitcoin: 'Bitcoin', ethereum: 'Ethereum', solana: 'Solana', binancecoin: 'BNB Chain', tron: 'Tron', hyperliquid: 'Hyperliquid', sui: 'Sui', 'avalanche-2': 'Avalanche', 'the-open-network': 'TON', cosmos: 'Cosmos' };
const CAT_OVERRIDE = { chainlink: 'Other', polkadot: 'L1' }; // LINK: oracle network (CoinGecko's RWA tag would put it next to asset issuers); DOT: tagged Layer 0 only
const STABLE = new Set('usdt usdc dai usde fdusd tusd usds pyusd usd1 usdd frax gusd usdp busd eurc usdtb rlusd usdf susde susds bsc-usd usdg usdx lusd crvusd gho usd0 eure xaut paxg bfusd syrupusdc usdy ousg buidl usyc usdai usdc.e'.split(' ')); // = build_screener.py
export function whyOut(c, mem) {
  for (const k of EXCL) if (mem[k] && mem[k].includes(c.id)) return 'category';
  const s = (c.symbol || '').toLowerCase();
  if (STABLE.has(s) || s.endsWith('usd') || /^(wrapped|staked|bridged|binance-peg)/.test(c.id)) return 'symbol';
  if (c.current_price > 0.97 && c.current_price < 1.03 && Math.abs(c.price_change_percentage_30d_in_currency ?? 99) < 1.5) return 'pegged';
  if (!(c.total_volume >= MIN_VOL)) return 'illiquid';
  return null;
}
export const primary = (id, mem) => CAT_OVERRIDE[id] || (THEME.find(([k]) => mem[k] && mem[k].includes(id)) || [, 'Other'])[1];
export const ecosystem = (id, mem) => NATIVE[id] || (mem['layer-1'] && mem['layer-1'].includes(id) ? 'OtherL1' : (ECO.find(([k]) => mem[k] && mem[k].includes(id)) || [, 'Other'])[1]);

async function categories(keep) { // keep = ids in today's top 250: the cache stores only those (small daily diff)
  const old = read('data/health/categories.json', null), day = iso(now).slice(0, 10);
  if (old && old.fetched === day) return old;
  const mem = { ...(old ? old.mem : {}) }, errs = [];
  for (const k of [...EXCL, ...THEME.map((x) => x[0]), ...ECO.map((x) => x[0])]) {
    try { mem[k] = (await cg(`/coins/markets?vs_currency=usd&category=${k}&order=market_cap_desc&per_page=250&page=1`)).map((x) => x.id).filter((id) => keep.has(id)); }
    catch (e) { errs.push(k + ': ' + e.message); } // keep yesterday's list for this category
  }
  const out = { fetched: errs.length && old ? old.fetched : day, tried: iso(now), errors: errs, mem };
  if (Object.keys(mem).length) fs.writeFileSync(P('data/health/categories.json'), JSON.stringify(out));
  return out;
}

async function derivatives(uni, st) {
  const out = { at: iso(new Date()), perps: [], oiChg: [], err: [] };
  let oi = {}, fr = {}, hl = {};
  try { for (const x of (await getJ(OKX + '/public/open-interest?instType=SWAP')).data) oi[x.instId] = +x.oiUsd; } catch (e) { out.err.push('okx oi: ' + e.message); }
  try { for (const x of (await getJ(OKX + '/public/funding-rate?instId=ANY')).data) { const ih = Math.max(1, (+x.nextFundingTime - +x.fundingTime) / 36e5); fr[x.instId] = (+x.fundingRate * 100 * 8) / ih; } } catch (e) { out.err.push('okx funding: ' + e.message); }
  try { const [m, c] = await getJ(HL, { type: 'metaAndAssetCtxs' }); m.universe.forEach((a, i) => { hl[a.name] = { f: +c[i].funding * 8 * 100, oi: +c[i].openInterest * +c[i].markPx }; }); } catch (e) { out.err.push('hyperliquid: ' + e.message); }
  for (const c of uni) {
    const s = c.s, legs = [], o = s + '-USDT-SWAP';
    if (o in fr && oi[o] > 0) legs.push({ f: fr[o], oi: oi[o] });
    if (hl[s] && hl[s].oi > 0) legs.push(hl[s]);
    const t = legs.reduce((a, x) => a + x.oi, 0);
    if (t > 0) out.perps.push({ s, f: legs.reduce((a, x) => a + x.f * x.oi, 0) / t, oi: t, okx: oi[o] || 0, hl: (hl[s] || {}).oi || 0 });
  }
  const top = out.perps.filter((p) => p.okx > 0).sort((a, b) => b.okx - a.okx).slice(0, 20);
  for (const p of top) { // OKX daily OI (USD), turned into coin terms with the coin's own 7-day closed-candle change
    try { const h = (await getJ(`${OKX}/rubik/stat/contracts/open-interest-volume?ccy=${p.s}&period=1D`)).data, d7 = (st[p.s] || {}).d7;
      if (h.length > 7 && +h[7][1] > 0 && Number.isFinite(d7)) out.oiChg.push({ s: p.s, chg: ((+h[0][1] / +h[7][1]) / (1 + d7 / 100) - 1) * 100, oi: p.okx }); }
    catch (e) { out.err.push('okx oi history ' + p.s + ': ' + e.message); }
    await sleep(450);
  }
  return out;
}

async function main() {
  const prev = read('health.json', null), hist = read('data/health/history.json', { v: 1, rows: [] }), errs = {};
  const closed = iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 864e5)).slice(0, 10); // last completed UTC day
  const mk = await cg('/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&price_change_percentage=1h,24h,7d,30d'); // no fallback: without it nothing is written
  const mkAt = iso(new Date());
  let glob = null; try { glob = (await cg('/global')).data; } catch (e) { errs.cg_global = e.message; }
  const cats = await categories(new Set(mk.map((c) => c.id))), mem = cats.mem || {};
  const byId = Object.fromEntries(mk.map((c) => [c.id, c]));
  let off = prev && prev.official;
  if (HEAVY || !off || off.day !== closed) { // official score for the closed day: closed candles of one exchange per coin
    const excl = {}, uni = [], seen = new Set();
    for (const c of mk) {
      if (uni.length >= N_UNI) break;
      let w = whyOut(c, mem); const s = c.symbol.toUpperCase();
      if (!w && seen.has(s)) w = 'duplicate';
      if (!w) {
        const check = (k) => { const last = k[k.length - 2]; if (!last || iso(new Date(last.t)).slice(0, 10) !== closed) return 'no closed candle for ' + closed; return Math.abs(last.c / c.current_price - 1) > 0.25 ? 'price differs from CoinGecko by >25% (other token?)' : ''; };
        try { const r = await candles({ symbol: s, sources: [{ ex: 'binance' }, { ex: 'gate' }] }, '1d', { getJ: kGet }, { limit: 231, min: 32, check });
          const k = r.k.slice(0, -1); // drop the forming candle: closed days only
          uni.push({ id: c.id, s, src: r.src.split(' ')[0], st: H.coinStats(k) }); seen.add(s); }
        catch (e) { w = 'no_candles'; }
      }
      if (w) excl[w] = (excl[w] || 0) + 1;
      await sleep(120);
    }
    const sp = H.spot(uni), lastRow = hist.rows[hist.rows.length - 1];
    off = { day: closed, at: iso(new Date()), formula: H.FORMULA, n: uni.length, last_rank: uni.length ? byId[uni[uni.length - 1].id].market_cap_rank : null, excluded: excl,
      score: sp.score, band: H.band(sp.score, H.SPOT_BANDS, lastRow && lastRow.d < closed ? lastRow.band : null), missing: sp.missing, comp: sp.comp,
      coins: uni.map((u) => ({ id: u.id, s: u.s, src: u.src, ...u.st })) };
  }
  const st = Object.fromEntries(off.coins.map((c) => [c.s, c]));
  const dv = await derivatives(off.coins, st), lv = H.leverage(dv.perps, dv.oiChg);
  const lev = { at: dv.at, score: lv.score, band: H.band(lv.score, H.LEV_BANDS, prev && prev.leverage && prev.leverage.band), missing: lv.missing, comp: lv.comp,
    coverage: dv.perps.length, of: off.coins.length, venues: ['okx', 'hyperliquid'], status: 'estimated', errors: dv.err,
    oi_mcap: null, liquidations: null, liq_reason: 'no_free_marketwide_source' };
  // intraday view (CoinGecko, unscored) for the same universe
  const coins = off.coins.map((u, i) => { const c = byId[u.id]; return { id: u.id, s: u.s, n: c ? c.name : u.s, rank: c ? c.market_cap_rank : null, tier: H.tierOf(i),
    p: c ? c.current_price : null, mc: c ? c.market_cap : null, v: c ? c.total_volume : null,
    c1h: c ? c.price_change_percentage_1h_in_currency : null, c24: c ? c.price_change_percentage_24h_in_currency : null, c7: c ? c.price_change_percentage_7d_in_currency : null, c30: c ? c.price_change_percentage_30d_in_currency : null,
    cat: cats.mem ? primary(u.id, mem) : null, eco: cats.mem ? ecosystem(u.id, mem) : null }; });
  const umc = coins.reduce((a, c) => a + (c.mc || 0), 0), btc = st.BTC, eth = st.ETH, alts = off.coins.filter((c) => c.s !== 'BTC');
  lev.oi_mcap = lev.comp.F && umc ? +(100 * lev.comp.F.oi / umc).toFixed(3) : null;
  const beat = (k) => (btc && Number.isFinite(btc[k]) ? +(100 * alts.filter((c) => Number.isFinite(c[k]) && c[k] > btc[k]).length / alts.filter((c) => Number.isFinite(c[k])).length).toFixed(1) : null);
  const rel = (k) => (btc && eth && Number.isFinite(btc[k]) && Number.isFinite(eth[k]) ? +(((1 + eth[k] / 100) / (1 + btc[k] / 100) - 1) * 100).toFixed(2) : null);
  const domRows = hist.rows.filter((r) => r.btc_dom != null), btcDom = glob ? +glob.market_cap_percentage.btc.toFixed(2) : null;
  const ctx = { btc_dom: btcDom, btc_dom_7d: domRows.length >= 7 && btcDom != null ? +(btcDom - domRows[domRows.length - 7].btc_dom).toFixed(2) : null,
    btc_dom_ex_stables: umc && coins[0] && coins[0].id === 'bitcoin' ? +(100 * coins[0].mc / umc).toFixed(2) : null, eth_dom: glob ? +glob.market_cap_percentage.eth.toFixed(2) : null,
    total_mc: glob ? glob.total_market_cap.usd : null, ethbtc_7d: rel('d7'), ethbtc_30d: rel('d30'), alts_beat_btc_7d: beat('d7'), alts_beat_btc_30d: beat('d30') };
  const groups = {}; coins.forEach((c, i) => { if (c.cat) (groups[c.cat] = groups[c.cat] || []).push([c, off.coins[i]]); });
  const categoriesOut = Object.entries(groups).map(([k, a]) => ({ k, n: a.length, med: Object.fromEntries(['c1h', 'c24', 'c7', 'c30'].map((f) => [f, H.median(a.map(([c]) => c[f]))])),
    d7: H.median(a.map(([, s]) => s.d7)), adv7: +(100 * a.filter(([, s]) => s.d7 > 0).length / a.length).toFixed(1), a200: (() => { const e = a.filter(([, s]) => s.ma200 != null); return e.length ? +(100 * e.filter(([, s]) => s.ma200).length / e.length).toFixed(1) : null; })() }))
    .sort((a, b) => b.n - a.n);
  const out = { v: 1, updated: iso(new Date()), formula: H.FORMULA,
    sources: { cg_markets: { at: mkAt, status: 'delayed' }, cg_global: glob ? { at: iso(new Date(glob.updated_at * 1000)), status: 'delayed' } : { err: errs.cg_global },
      candles: { day: off.day, at: off.at, status: 'daily_close' }, derivatives: { at: dv.at, status: 'estimated', errors: dv.err },
      categories: cats.fetched ? { fetched: cats.fetched, errors: cats.errors || [] } : { err: 'no category data' } },
    official: off, leverage: lev, context: ctx, categories: categoriesOut, coins };
  fs.writeFileSync(P('health.json'), JSON.stringify(out));
  if (!hist.rows.some((r) => r.d === off.day)) { // append-only: one row per closed UTC day, never rewritten (validate.py health)
    hist.rows.push({ d: off.day, f: off.formula, spot: off.score, band: off.band, comp: Object.fromEntries(Object.entries(off.comp).map(([k, v]) => [k, v ? v.v : null])),
      lev: lev.score, lev_band: lev.band, btc_dom: btcDom, oi: lev.comp.F ? lev.comp.F.oi : null, n: off.n, excl: off.excluded, uni: off.coins.map((c) => c.id) });
    fs.writeFileSync(P('data/health/history.json'), JSON.stringify(hist));
  }
  console.log(`health: day ${off.day} n=${off.n} spot=${off.score} ${off.band} missing=${off.missing.join(',') || '-'} | lev=${lev.score} ${lev.band} cov=${lev.coverage} | excl ${JSON.stringify(off.excluded)}`);
}
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main().catch((e) => { console.error('health build failed:', e.message); process.exit(1); });
