/* KMS Capital – Setup card evidence (docs/architect-proof-layer.md §4, Phase 3). Pure functions, no DOM, no network.
   UMD: browser global SUC, node require('./setup-core.js'). setup.js renders; tests/setup-card-p3.mjs checks these directly.
   Each evidence line returns { st: 'g' | 'r' | 'n', ...numbers }: g = green (points the same way as an uptrend setup),
   r = red (points against it), n = grey (neutral, not available, too little data or low coverage). No line is summed with another:
   there is no combined score in v1. Every band below is fixed in advance and named in the doc; nothing is fitted. */
(function (root) {
  'use strict';
  const DAY = 864e5;
  const BAND = { rsDays: 30, rsMa: 50, fund: 10, smf: 5, lowCov: 50, ev: 48, minHist: 30 };
  const closed = (k, now) => (k || []).filter((x) => x && Number.isFinite(x.c) && x.c > 0 && (!Number.isFinite(x.t) || !Number.isFinite(now) || x.t + DAY <= now));

  /* Trend: the existing rule (verdict-core trend) with the distance of the last close to MA50 and MA200 */
  function trend(I) {
    if (!I || !I.plan || !I.plan.ready) return { st: 'n', trend: 'Insufficient' };
    const c = I.plan.close, d = (m) => (Number.isFinite(m) && m > 0 ? 100 * (c / m - 1) : null);
    return { st: I.trend === 'Uptrend' ? 'g' : I.trend === 'Downtrend' ? 'r' : 'n', trend: I.trend, ma50: d(I.ma50), ma200: d(I.ma200) };
  }

  /* Relative strength vs BTC on closed daily candles matched by open time: token ÷ BTC 30-day return, and the token/BTC ratio
     against its own 50-day average. Green = outperforming and above the average; red = underperforming and below; else grey. */
  function rs(tok, btc, now) {
    const a = closed(tok, now), b = closed(btc, now); if (!a.length || !b.length) return { st: 'n', why: 'nodata' };
    const bt = new Map(b.filter((x) => Number.isFinite(x.t)).map((x) => [x.t, x.c]));
    const r = a.filter((x) => Number.isFinite(x.t) && bt.has(x.t)).map((x) => ({ t: x.t, v: x.c / bt.get(x.t) }));
    if (r.length < BAND.rsMa) return { st: 'n', why: 'short', n: r.length };
    const last = r[r.length - 1], ago = r.find((x) => x.t === last.t - BAND.rsDays * DAY);
    if (!ago) return { st: 'n', why: 'short', n: r.length };
    const ma = r.slice(-BAND.rsMa).reduce((s, x) => s + x.v, 0) / BAND.rsMa;
    const rel = 100 * (last.v / ago.v - 1), above = last.v > ma, vsMa = 100 * (last.v / ma - 1);
    return { st: rel > 0 && above ? 'g' : rel < 0 && !above ? 'r' : 'n', rel, above, vsMa, at: last.t };
  }

  /* Derivatives (Phase 4 readings): funding percentile against the token's own 90 closed days (signed, as in "Which side is
     crowded") and the 24h OI change. Colour on the same 10 % bands as the ledger's funding_regime: top 10 % = longs paying the most
     = red; bottom 10 % = green; between = grey. Under 30 days of history, or when the ranked venues hold under 50 % of today's
     open interest (audit M4 coverage), the line is grey whatever the value. */
  function deriv(m) {
    if (!m) return { st: 'n', why: 'nodata' };
    const P = m.P || {}, out = { pct: P.fundSigned ?? null, oi24: Number.isFinite(m.oi24) ? m.oi24 : null, cov: Number.isFinite(m.covSide) ? m.covSide : null, days: P.days || 0, venues: P.fundVenues || [] };
    if (out.days < BAND.minHist) return { ...out, st: 'n', why: 'history' };
    if (out.pct == null) return { ...out, st: 'n', why: 'nodata' };
    out.regime = out.pct >= 100 - BAND.fund ? 'high' : out.pct <= BAND.fund ? 'low' : 'normal';
    if (out.cov != null && out.cov < BAND.lowCov) return { ...out, st: 'n', why: 'coverage' };
    return { ...out, st: out.regime === 'high' ? 'r' : out.regime === 'low' ? 'g' : 'n' };
  }

  /* Smart Money: the panel's 7-day net flow on this coin (smart_money.json flows.d7) as a share of the panel's gross position
     (long + short notional). Same ±5 % band as the ledger's sm_flow: above = net buying (green), below = net selling (red). */
  function smflow(sm, sym) {
    const w = sm && sm.flows && sm.flows.d7, f = w && w.coins ? w.coins[sym] : null, c = sm && sm.coins ? sm.coins[sym] : null;
    if (!w || !f || !Number.isFinite(f.net)) return { st: 'n', why: sm ? 'nocoin' : 'nodata' };
    const gross = c ? (c.ntlLong || 0) + (c.ntlShort || 0) : 0, pct = gross > 0 ? 100 * f.net / gross : null;
    const to = pct == null ? null : pct > BAND.smf ? 'net_buy' : pct < -BAND.smf ? 'net_sell' : 'flat';
    return { st: to === 'net_buy' ? 'g' : to === 'net_sell' ? 'r' : 'n', to, net: f.net, gross, pct, from: w.from, to_: w.to, hours: w.hours, gaps: w.gaps || 0, since: !!w.sinceSelection, why: pct == null ? 'nogross' : null };
  }

  /* Pattern: the best active (forming or confirmed, not invalidated) daily pattern, by score. rec(type) gives its display-rule
     record {few, weak, ty: {rate, nEff}} (patterns.js pTypeRec). Under the section 0 rule a type with nEff < 30 or a hit rate under
     35 % is grey; otherwise the line takes the pattern's direction (bullish green, bearish red, undirected grey). */
  function pattern(cands, rec) {
    const a = (cands || []).filter((x) => x && x.o && x.o.st !== 'inv'); if (!a.length) return { st: 'n', why: 'none' };
    const x = a.slice().sort((p, q) => q.conf - p.conf)[0], R = rec ? rec(x.type) : null, dir = x.dir || 0;
    const ok = R && !R.legacy && !R.few && !R.weak;
    return { st: ok ? (dir > 0 ? 'g' : dir < 0 ? 'r' : 'n') : 'n', type: x.type, conf: x.conf, dir, status: x.o.st, few: !!(R && R.few), weak: !!(R && R.weak), legacy: !R || !!R.legacy,
      rate: R && R.ty && Number.isFinite(R.ty.rate) ? R.ty.rate : null, nEff: R && R.ty ? R.ty.nEff : null, scope: R ? R.scope : null };
  }

  /* Event risk: a high-impact calendar event for this token, or a macro event (no token), starting within the next 48 h.
     ts(e) = the event's start in ms, or null for an all-day event (then its whole local day counts). Red when there is one;
     green when the calendar loaded and has none; grey when the calendar is unavailable. */
  function event(events, sym, now, ts, dayStart) {
    if (!Array.isArray(events)) return { st: 'n', why: 'nodata' };
    const end = now + BAND.ev * 36e5, hit = [];
    for (const e of events) {
      if (!e || e.impact !== 'high') continue;
      const toks = e.tokens || [], mine = toks.includes(sym), macro = e.type === 'macro' && !toks.length; if (!mine && !macro) continue;
      const t = ts(e);
      if (t != null) { if (t >= now && t <= end) hit.push({ e, t, allDay: false }); continue; }
      const d0 = dayStart(e); if (d0 == null) continue; if (d0 + DAY > now && d0 <= end) hit.push({ e, t: d0, allDay: true });
    }
    hit.sort((a, b) => a.t - b.t);
    return { st: hit.length ? 'r' : 'g', hits: hit, next: hit[0] || null };
  }

  /* Mirrored levels for a Downtrend (stored code Avoid): resistance zone above, invalidation above it, targets at the supports.
     Mirror of the daily plan (verdict-core compute): zone = [r1 - ATR/4, r1], invalidation = zone top + 1 ATR, targets = the supports
     below the zone, then 1R steps. Levels, not a short call. */
  function mirror(P) {
    if (!P || !P.ready || !Number.isFinite(P.atr) || P.atr <= 0) return null;
    const A = P.atr, ref = Number.isFinite(P.close) ? P.close : P.price;
    const r1 = (P.res || []).filter((x) => x > ref)[0]; if (!Number.isFinite(r1)) return null;
    const zh = r1, zl = Math.max(ref, r1 - 0.25 * A), em = (zl + zh) / 2, inv = zh + A, risk = inv - em;
    const tps = (P.sup || []).filter((x) => x < zl).slice(0, 3).map((x) => ({ price: x, basis: 'daily support' }));
    while (tps.length < 3) tps.push({ price: (tps.length ? Math.min(tps[tps.length - 1].price, em) : em) - risk, basis: 'R-multiple (no support left)' });
    tps.forEach((x) => { x.rr = (em - x.price) / risk; });
    return { zone: [zl, zh], inv, tps: tps.filter((x) => x.price > 0), risk };
  }

  /* Ledger record for a line: the summary row for this kind and state, the token's own row first, else all tokens pooled */
  function ledgerRow(sum, kind, to, sym) {
    const rows = sum && Array.isArray(sum.rows) ? sum.rows : []; if (!to) return null;
    return rows.find((r) => r.kind === kind && r.to === to && r.sym === sym) || rows.find((r) => r.kind === kind && r.to === to && r.sym === 'ALL') || null;
  }

  const API = { BAND, DAY, trend, rs, deriv, smflow, pattern, event, mirror, ledgerRow };
  if (typeof module === 'object' && module.exports) module.exports = API; else root.SUC = API;
})(typeof self !== 'undefined' ? self : this);
