/* KMS Capital – leverage history math (docs/architect-proof-layer.md §5, Phase 4). UMD: browser `LEVC` (app.js already has a const LC), node `require`.
   Reads data/lev/daily-YYYY.json rows: day -> {SYM: [px, mc_MUSD, okx, hyperliquid]}, venue = [f_ppm, fx_ppm, n, oi_kUSD, oiHour].
   One place for the token's own-history percentiles (Leverage tab) and the funding / OI regimes (signal ledger), so both read the
   same numbers. A day's figures use only that day's row and earlier rows: nothing after the day is ever read. */
(function (root) {
  'use strict';
  const VEN = ['okx', 'hyperliquid'], VI = { okx: 2, hyperliquid: 3 }, WIN = 90, MIN_DAYS = 30, BAND = 10; // regimes: top / bottom 10 % of the token's prior 90 days
  /* share of window values below x, ties counted half (0..100); null under MIN_DAYS values */
  function pctRank(vals, x) { const v = vals.filter(Number.isFinite); if (v.length < MIN_DAYS || !Number.isFinite(x)) return null;
    let lo = 0, eq = 0; for (const y of v) { if (y < x) lo++; else if (y === x) eq++; } return 100 * (lo + eq / 2) / v.length; }
  /* merge yearly files into one ascending [[day, row]] list; only final (closed) days unless includeOpen */
  function merge(files, includeOpen) { const out = {}; for (const Y of files || []) { if (!Y || !Y.days) continue; for (const [d, r] of Object.entries(Y.days)) if (includeOpen || (Y.final && Y.final[d])) out[d] = r; }
    return Object.keys(out).sort().map((d) => [d, out[d]]); }
  const vrow = (r, sym, v) => (r && r[sym] && r[sym][VI[v]]) || null;
  /* excess funding (floor settlements counted as 0, ppm per 8h) for venues `vs`, open-interest weighted when every venue has OI, else a plain mean */
  function fund(r, sym, vs, key = 1) { const a = vs.map((v) => vrow(r, sym, v)).filter((x) => x && x[key] != null); if (!a.length) return null;
    const w = a.every((x) => x[3] > 0) ? a.map((x) => x[3]) : a.map(() => 1), W = w.reduce((s, x) => s + x, 0); return a.reduce((s, x, i) => s + x[key] * w[i], 0) / W; }
  /* summed OI (USD) of venues `vs`; null unless every one of them has a reading that day */
  function oi(r, sym, vs) { const a = vs.map((v) => vrow(r, sym, v)); return a.every((x) => x && x[3] > 0) ? a.reduce((s, x) => s + x[3] * 1e3, 0) : null; }
  const px = (r, sym) => (r && r[sym] && r[sym][0]) || null, mc = (r, sym) => (r && r[sym] && r[sym][1] ? r[sym][1] * 1e6 : null);
  /* daily metrics for one token, venue set `vs` */
  function series(days, sym, vs) {
    return days.map(([d, r], i) => { const p = i ? days[i - 1][1] : null, o = oi(r, sym, vs), op = p ? oi(p, sym, vs) : null, x = px(r, sym), xp = p ? px(p, sym) : null;
      return { d, fx: fund(r, sym, vs), oi: o, lev: o && mc(r, sym) ? 100 * o / mc(r, sym) : null,
        mom: o && op && x && xp && days[i - 1][0] === prevDay(d) ? 100 * (o / op - 1) - 0.5 * Math.abs(100 * (x / xp - 1)) : null }; }); }
  function prevDay(d) { const t = Date.parse(d + 'T00:00:00Z') - 864e5; return new Date(t).toISOString().slice(0, 10); }
  /* venues usable for OI percentiles: those with OI on at least MIN_DAYS of the window (Hyperliquid joins once its recorded history is long enough) */
  function oiVenues(days, sym, want) { const w = days.slice(-WIN); return (want || VEN).filter((v) => w.filter(([, r]) => (vrow(r, sym, v) || [])[3] > 0).length >= MIN_DAYS); }
  function fundVenues(days, sym, want) { const w = days.slice(-WIN); return (want || VEN).filter((v) => w.filter(([, r]) => (vrow(r, sym, v) || [])[1] != null).length >= MIN_DAYS); }
  /* Leverage tab: today's live values ranked against the token's own last 90 closed days. cur = {fx, oiUsd: {venue: usd}, mcap, oi24, px24} */
  function percentiles(files, sym, cur, live) {
    const days = merge(files).slice(-WIN), fv = fundVenues(days, sym, live), ov = oiVenues(days, sym, live), out = { days: days.length, fundVenues: fv, oiVenues: ov, from: days.length ? days[0][0] : null, to: days.length ? days[days.length - 1][0] : null };
    const sf = fv.length ? series(days, sym, fv) : [], so = ov.length ? series(days, sym, ov) : [];
    const fxNow = cur.fx ? fv.length ? weighted(cur.fx, cur.oiUsd, fv) : null : null;
    out.fund = fxNow == null ? null : pctRank(sf.map((x) => Math.abs(x.fx)), Math.abs(fxNow));
    out.fundSigned = fxNow == null ? null : pctRank(sf.map((x) => x.fx), fxNow);
    const oiNow = ov.length && ov.every((v) => cur.oiUsd && cur.oiUsd[v] > 0) ? ov.reduce((s, v) => s + cur.oiUsd[v], 0) : null;
    out.lev = oiNow && cur.mcap ? pctRank(so.map((x) => x.lev), 100 * oiNow / cur.mcap) : null;
    out.mom = cur.oi24 != null ? pctRank(so.map((x) => x.mom), cur.oi24 - 0.5 * Math.abs(cur.px24 || 0)) : null;
    out.fxNow = fxNow; return out; }
  function weighted(fx, oiUsd, vs) { const a = vs.filter((v) => fx[v] != null); if (!a.length) return null; const w = a.every((v) => oiUsd && oiUsd[v] > 0) ? a.map((v) => oiUsd[v]) : a.map(() => 1), W = w.reduce((s, x) => s + x, 0); return a.reduce((s, v, i) => s + fx[v] * w[i], 0) / W; }
  /* excess 8h funding (ppm) of a live venue: mean of its settlements in the last 24h, a settlement at the floor (0.01 % / 8h) counted as 0 */
  function liveExcess(fh, now) { const r = (fh || []).filter((x) => x.t >= now - 864e5); if (!r.length) return null; return 1e6 * r.reduce((s, x) => s + (Math.abs(x.r - 1e-4) < 2e-8 ? 0 : x.r), 0) / r.length; }
  /* Signal ledger: regimes at closed day `day` (a day of the file), ranked against the 90 closed days before it (never that day itself or later).
     funding_regime: high / low / normal = excess funding in the top / bottom BAND % / between; oi_regime: building / unwinding / normal on the daily OI build-up. */
  function regimes(files, sym, day) {
    const all = merge(files), i = all.findIndex(([d]) => d === day); if (i < 1) return {};
    const prior = all.slice(Math.max(0, i - WIN), i), here = all[i], out = {};
    const fv = fundVenues(prior, sym), ov = oiVenues(prior, sym);
    if (fv.length) { const s = series([...prior, here], sym, fv), now = s[s.length - 1].fx, p = pctRank(s.slice(0, -1).map((x) => x.fx), now);
      if (p != null) out.funding_regime = { to: p >= 100 - BAND ? 'high' : p <= BAND ? 'low' : 'normal', ctx: { fx: r2(now), pct: r2(p), days: prior.length, venues: fv, band: BAND } }; }
    if (ov.length) { const s = series(all.slice(Math.max(0, i - WIN - 1), i + 1), sym, ov), now = s[s.length - 1].mom, p = pctRank(s.slice(1, -1).map((x) => x.mom), now);
      if (p != null) out.oi_regime = { to: p >= 100 - BAND ? 'building' : p <= BAND ? 'unwinding' : 'normal', ctx: { mom: r2(now), oi: Math.round(s[s.length - 1].oi), pct: r2(p), days: prior.length, venues: ov, band: BAND } }; }
    return out; }
  const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
  const API = { VEN, WIN, MIN_DAYS, BAND, pctRank, merge, fund, oi, series, oiVenues, fundVenues, percentiles, liveExcess, regimes, prevDay };
  if (typeof module === 'object' && module.exports) module.exports = API; else root.LEVC = API;
})(typeof self !== 'undefined' ? self : this);
