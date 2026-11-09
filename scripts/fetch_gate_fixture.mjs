// Refresh tests/fixtures/hourly_btc_eth.json: 395 days of Binance 1h closes for BTCUSDT and ETHUSDT (real data for the breaking-gate false-pass test).
// Usage: node scripts/fetch_gate_fixture.mjs [endISO]
import fs from 'node:fs';
const H = 36e5, end = Math.floor(Date.parse(process.argv[2] || new Date().toISOString()) / H) * H, start = end - 395 * 24 * H;
const out = { src: 'https://data-api.binance.vision/api/v3/klines (interval=1h, close)', start: new Date(start).toISOString(), step_ms: H, closes: {} };
for (const s of ['BTCUSDT', 'ETHUSDT']) {
  const c = []; for (let t = start; t < end; t += 1000 * H) {
    const r = await (await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${s}&interval=1h&startTime=${t}&endTime=${Math.min(end, t + 1000 * H) - 1}&limit=1000`)).json();
    for (const k of r) { const i = (k[0] - start) / H; c[i] = +k[4]; }
  }
  out.closes[s.replace('USDT', '')] = Array.from({ length: (end - start) / H }, (_, i) => c[i] ?? null);
}
fs.writeFileSync('tests/fixtures/hourly_btc_eth.json', JSON.stringify(out) + '\n'); console.log('saved', out.start, Object.fromEntries(Object.entries(out.closes).map(([k, v]) => [k, v.filter((x) => x != null).length])));
