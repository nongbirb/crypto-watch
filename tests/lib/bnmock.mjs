// Binance USDⓈ-M futures answered locally for UI tests: the test machines are in a region Binance blocks (HTTP 451), while users'
// browsers reach it. Prices come from data/hlliq.json marks so the "same ticker, different token" check passes. Values are fixed per call
// so a test can recompute exactly what the page should show: account long % = acc(sym), big traders' position long % = pos(sym).
import fs from 'node:fs';
const HL = JSON.parse(fs.readFileSync('data/hlliq.json', 'utf8')).coins;
export const acc = (sym) => 60 + (sym.charCodeAt(0) % 20); // 60..79 % of accounts long
export const pos = (sym) => 40 + (sym.charCodeAt(1 % sym.length) % 15); // 40..54 % of big traders' money long
export const oiUsd = (sym) => (HL[sym] ? HL[sym].oi * 2 : 1e8); // twice Hyperliquid's
export async function mockBinance(ctx, { unlisted = [] } = {}) {
  await ctx.route('https://fapi.binance.com/**', (r) => {
    const u = new URL(r.request().url()), q = u.searchParams, p = q.get('symbol') || '', sym = p.replace(/USDT$/, ''), now = Date.now(), per = q.get('period') === '4h' ? 4 * 36e5 : 36e5, lim = +(q.get('limit') || 30);
    const send = (body, status = 200) => r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    const mark = HL[sym] ? HL[sym].mark : null; if (p && (!mark || unlisted.includes(sym))) return send({ code: -1121, msg: 'Invalid symbol.' }, 400);
    const series = (f) => Array.from({ length: lim }, (_, i) => f(Math.floor(now / per) * per - (lim - 1 - i) * per, i));
    const path = u.pathname;
    if (path === '/fapi/v1/premiumIndex') return send(p ? { symbol: p, markPrice: String(mark), indexPrice: String(mark), lastFundingRate: '0.0001', time: now } : Object.keys(HL).filter((k) => /^[A-Z0-9]+$/.test(k) && !unlisted.includes(k)).map((k) => ({ symbol: k + 'USDT' })));
    if (path === '/futures/data/openInterestHist') return send(series((t) => ({ symbol: p, sumOpenInterest: String(oiUsd(sym) / mark), sumOpenInterestValue: String(oiUsd(sym)), timestamp: t })));
    if (path === '/fapi/v1/fundingRate') return send(Array.from({ length: lim }, (_, i) => ({ symbol: p, fundingRate: '0.0001', fundingTime: now - (lim - i) * 8 * 36e5 })));
    if (path === '/fapi/v1/ticker/24hr') return send({ symbol: p, quoteVolume: '1000000000', lastPrice: String(mark) });
    if (path === '/fapi/v1/klines') return send([]);
    const ratio = (l) => series((t) => ({ symbol: p, longAccount: String(l / 100), shortAccount: String(1 - l / 100), longShortRatio: String(l / (100 - l)), timestamp: t }));
    if (path === '/futures/data/globalLongShortAccountRatio') return send(ratio(acc(sym)));
    if (path === '/futures/data/topLongShortAccountRatio') return send(ratio(acc(sym) - 5));
    if (path === '/futures/data/topLongShortPositionRatio') return send(ratio(pos(sym)));
    return send({ code: -1, msg: 'not mocked ' + path }, 404);
  });
}
