// Candle sources for scripts/build_patterns_backtest.mjs (keyless public APIs). Order per token: Binance, Bybit (only if listed in
// tokens.json), OKX, then Hyperliquid spot (only if listed). The first source with at least 60 bars wins and is named in `src`;
// if every source fails the error lists each source's reason and bar count, and the caller marks that series unavailable.
// Every source returns the bar still forming as its last row; collect() in the backtest drops it (closed candles only).
export const TFS = { '1h': ['1h', '1H', '60'], '4h': ['4h', '4H', '240'], '1d': ['1d', '1Dutc', 'D'], '1w': ['1w', '1Wutc', 'W'] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJ(u) { for (let i = 0; i < 3; i++) { try { const r = await fetch(u, { headers: { 'user-agent': 'kms-capital' } }); if (r.ok) return await r.json(); throw new Error('HTTP ' + r.status); } catch (e) { if (i === 2) throw e; await sleep(1500 * (i + 1)); } } }
const sym = (t) => t.symbol;
// Hyperliquid spot candles (keyless POST /info; reachable from GitHub runners, unlike Bybit which answers 403 there).
// Only for tokens that list 'hyperliquid' in tokens.json and only after Binance, Bybit and OKX have failed. The pair is looked
// up from spotMeta (one request per run, cached) instead of a hard-coded index. Same row shape as the other sources; no quote
// volume is published, so q is left out (patterns.js then uses v * c, as it does for any source without q).
const HL = 'https://api.hyperliquid.xyz/info', HLTF = { '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w' };
async function postJ(body) { for (let i = 0; i < 3; i++) { try { const r = await fetch(HL, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'kms-capital' }, body: JSON.stringify(body) }); if (r.ok) return await r.json(); throw new Error('HTTP ' + r.status); } catch (e) { if (i === 2) throw e; await sleep(1500 * (i + 1)); } } }
const hlMeta = new WeakMap(); // spotMeta, fetched once per run
export function hlSpotPair(meta, s) { // meta = spotMeta response; returns { coin: '@N', name: 'HYPE/USDC' } or null
  const ix = new Map((meta.tokens || []).map((x) => [x.index, x.name]));
  const u = (meta.universe || []).find((p) => ix.get(p.tokens[0]) === s && ix.get(p.tokens[1]) === 'USDC');
  return u ? { coin: u.name, name: s + '/USDC' } : null;
}
export function hlRows(r) { return (Array.isArray(r) ? r : []).map((x) => ({ t: +x.t, o: +x.o, h: +x.h, l: +x.l, c: +x.c, v: +x.v })).filter((x) => x.t && x.c > 0).sort((a, b) => a.t - b.t); }
export async function candles(t, tf, io = { getJ, postJ }) {
  const { getJ: gJ, postJ: pJ } = io;
  const [b, o, y] = TFS[tf], s = sym(t), errs = [];
  const exs = new Set(t.sources.map((x) => x.ex));
  if (exs.has('binance')) try { const k = await gJ(`https://data-api.binance.vision/api/v3/klines?symbol=${s}USDT&interval=${b}&limit=1000`); if (k.length >= 60) return { src: 'Binance ' + s + 'USDT', k: k.map((x) => ({ t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], q: +x[7] })) }; errs.push('binance ' + k.length + ' bars'); } catch (e) { errs.push('binance ' + e.message); }
  if (exs.has('bybit')) try { const r = await gJ(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${s}USDT&interval=${y}&limit=1000`); const k = r.result.list.map((x) => ({ t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], q: +x[6] })).reverse(); if (k.length >= 60) return { src: 'Bybit ' + s + 'USDT', k }; errs.push('bybit ' + k.length + ' bars'); } catch (e) { errs.push('bybit ' + e.message); }
  try { let all = [], after = ''; for (let p = 0; p < 4; p++) { const r = await gJ(`https://www.okx.com/api/v5/market/history-candles?instId=${s}-USDT&bar=${o}&limit=100${after}`); if (!r.data || !r.data.length) break; all = all.concat(r.data); after = '&after=' + r.data[r.data.length - 1][0]; await sleep(250); }
    const k = all.map((x) => ({ t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], q: +x[7] })).filter((x) => x.t).reverse(); if (k.length >= 60) return { src: 'OKX ' + s + '-USDT', k }; errs.push('okx ' + k.length + ' bars'); } catch (e) { errs.push('okx ' + e.message); }
  if (exs.has('hyperliquid')) try { if (!hlMeta.has(pJ)) hlMeta.set(pJ, await pJ({ type: 'spotMeta' })); const pr = hlSpotPair(hlMeta.get(pJ), s); if (!pr) throw new Error('no ' + s + '/USDC spot pair');
    // same depth as the other sources (at most 1000 bars); like them the last row is the bar still forming, which collect() drops
    const ms = { '1h': 36e5, '4h': 144e5, '1d': 864e5, '1w': 6048e5 }[tf], k = hlRows(await pJ({ type: 'candleSnapshot', req: { coin: pr.coin, interval: HLTF[tf], startTime: Date.now() - 1000 * ms } })).slice(-1000);
    if (k.length >= 60) return { src: 'Hyperliquid ' + pr.name + ' spot', k }; errs.push('hyperliquid ' + k.length + ' bars'); } catch (e) { errs.push('hyperliquid ' + e.message); }
  throw new Error((errs.length ? errs.join('; ') + '; ' : '') + 'fewer than 60 candles available');
}
