/* Events v1 rules (docs/events-v1.md). Pure functions shared by the browser (events.js) and Node (scripts/build_events.mjs, tests).
   Every rule here is published in the spec; change both together. */
(function (root) {
  'use strict';
  const R = {
    MIN_PAST_N: 6,            // "vs past average" needs at least this many past same-type events
    SCORECARD_MIN: 10,        // scorecard hidden until this many events are scored
    FLAT: { h1: 0.3, d1: 1.0 }, // |BTC move| below this (in %) counts as "flat" when scoring a view
    UNUSUAL_X: 3,             // breaking gate: 1h move > 3x the 30-day mean absolute 1h move ...
    UNUSUAL_PCTL: 0.98,       // ... AND above the 98th percentile of |1h| moves in the same 30-day window (the stricter of the two)
    UNUSUAL_WIN_H: 720,       // trailing window: 30 days of closed hourly candles
    IMPLIED_MAX_AGE_H: 6,     // a live options snapshot must be taken within 6h before the release
    STRENGTH: { bp: [3, 8], pct: [0.3, 1.0], crypto: [0.5, 1.0] } // weak < a <= medium < b <= strong; crypto uses |move| / implied move
  };
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  const sgn = (v, flat) => (!num(v) ? null : Math.abs(v) < flat ? 'flat' : v > 0 ? 'up' : 'down');
  // Implied 1-day move (1 sigma, %) from an annualised IV in % (crypto trades 365 days).
  const impliedMove = (iv) => (num(iv) && iv > 0 ? iv / Math.sqrt(365) : null);
  // Priced-in verdict for one asset. d1 = 1-day move %, implied = options 1-day move % (or null), past = {avg, n} of |1d move| after past same-type events.
  function verdict(d1, implied, past) {
    if (!num(d1)) return { key: 'nodata' };
    if (num(implied) && implied > 0) return { key: Math.abs(d1) > implied ? 'surprise' : 'priced', basis: 'options', ref: implied };
    if (past && num(past.avg) && past.n >= R.MIN_PAST_N) return { key: Math.abs(d1) > past.avg ? 'surprise' : 'priced', basis: 'past', ref: past.avg, n: past.n };
    return { key: past && past.n > 0 ? 'nohist' : 'nodata', n: past ? past.n || 0 : 0 };
  }
  function strength(unit, v, ref) {
    if (!num(v)) return null; const a = Math.abs(v);
    if (unit === 'crypto') { if (!num(ref) || ref <= 0) return null; const x = a / ref, [lo, hi] = R.STRENGTH.crypto; return x < lo ? 'weak' : x <= hi ? 'medium' : 'strong'; }
    const [lo, hi] = R.STRENGTH[unit === 'bp' ? 'bp' : 'pct']; return a < lo ? 'weak' : a <= hi ? 'medium' : 'strong';
  }
  /* Confidence (low / medium / high), fixed rules:
     high   = measured crypto reaction at an exact timestamp (1m candle), scheduled event, strength medium or strong
     medium = measured crypto reaction that is weak, or a daily macro change across the release whose direction matches the locked view and is not stale
     low    = everything else: stale or late data, direction against the view, no view, breaking news (cause not isolated), weekly data */
  function confidence(n) {
    if (!n || !num(n.v)) return null;
    if (n.breaking) return 'low';
    if (n.measured) return n.strength === 'weak' ? 'medium' : 'high';
    if (n.stale || n.weekly || !n.expected) return 'low';
    return sgn(n.v, 1e-9) === n.expected ? 'medium' : 'low';
  }
  function scenarioFor(actual, scen) {
    if (!num(actual) || !Array.isArray(scen)) return null;
    const s = scen.find((x) => (!num(x.min) || actual >= x.min - 1e-9) && (!num(x.max) || actual <= x.max + 1e-9)); return s ? s.key : null;
  }
  // Score a locked view: which scenario happened (from the actual print), did BTC move the expected way at 1h / 1d, was the invalidation hit.
  function scoreView(view, actual, post) {
    const out = { scenario: null, h1: null, d1: null, wrong: null };
    if (!view || !view.locked_at) return out;
    const btc = (h) => post && post[h] && post[h].BTC && post[h].BTC.pct;
    const sc = view.breaking ? (view.scenarios || [])[0] : (view.scenarios || []).find((x) => x.key === scenarioFor(actual, view.scenarios));
    if (!sc) return out; out.scenario = sc.key;
    for (const h of ['h1', 'd1']) { if (view.breaking && h === 'h1') continue; const d = sgn(btc(h), R.FLAT[h]); if (d) out[h] = d === sc.btc; }
    const d1 = btc('d1'); if (num(d1) && sc.btc && sc.btc !== 'flat') out.wrong = sgn(d1, R.FLAT.d1) === (sc.btc === 'up' ? 'down' : 'up');
    else if (num(d1) && sc.btc === 'flat') out.wrong = Math.abs(d1) > R.FLAT.d1 * 2;
    return out;
  }
  // Trailing stats of absolute 1h moves (%): mean and 98th percentile (nearest-rank on the sorted window).
  function trailStats(abs) {
    const a = (abs || []).filter(num).map(Math.abs).sort((x, y) => x - y); if (a.length < 200) return null;
    return { avg: a.reduce((s, x) => s + x, 0) / a.length, p98: a[Math.floor(R.UNUSUAL_PCTL * (a.length - 1))], n: a.length };
  }
  // Unusual-move threshold: the stricter of 3x the mean and the 98th percentile.
  const unusualThr = (st) => (st && num(st.avg) && st.avg > 0 ? Math.max(R.UNUSUAL_X * st.avg, num(st.p98) ? st.p98 : 0) : null);
  /* Breaking-news gate. m = {btc, eth} 1h moves % after the headline; u = {btc, eth} trailing stats {avg, p98} of |1h| moves.
     tok = optional {sym, rel, usual: {avg, p98}}: a tracked token named in the headline, its 1h move minus BTC's, and stats of |relative| 1h moves. */
  function gate(h, m, u, tok) {
    if (!h || !/^https:\/\//.test(h.url || '') || !num(h.at)) return { pass: false, why: 'no source link or time' };
    const thr = {}; for (const a of ['btc', 'eth']) thr[a] = unusualThr(u && u[a]);
    for (const a of ['btc', 'eth']) if (num(m[a]) && num(thr[a]) && Math.abs(m[a]) > thr[a]) return { pass: true, by: a.toUpperCase(), thr };
    if (tok && tok.sym && num(tok.rel)) { const t = unusualThr(tok.usual); thr.token = t; if (num(t) && Math.abs(tok.rel) > t) return { pass: true, by: tok.sym, token: true, thr }; }
    return { pass: false, why: 'no unusual move', thr };
  }
  // Group headlines that passed the gate within 60 minutes of each other; >1 headline means the cause is unclear (show top 3).
  function cluster(hs) {
    const s = hs.slice().sort((a, b) => a.at - b.at), out = [];
    for (const h of s) { const c = out[out.length - 1]; if (c && h.at - c[0].at <= 36e5) c.push(h); else out.push([h]); }
    return out.map((c) => ({ at: c[0].at, unclear: c.length > 1, cands: c.slice().sort((a, b) => (a.tier || 'T9').localeCompare(b.tier || 'T9') || a.at - b.at).slice(0, 3) }));
  }
  function status(ev, now) { if (ev.kind === 'breaking') return 'breaking'; return now < Date.parse(ev.at) ? 'upcoming' : 'released'; }
  /* Locked fields. Once a path holds a value it may never change. view/consensus must have been locked before the release (scheduled events). */
  const FROZEN = ['id', 'kind', 'type', 'at', 'consensus', 'view', 'actual'];
  const PER = ['pre.implied', 'post.ref', 'post.before24h', 'post.h1', 'post.d1', 'pos']; // frozen per asset: a missing asset may be filled later, a filled one never changes
  const get = (o, p) => p.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function checkLocked(prev, next) {
    const errs = [];
    if (next.kind === 'scheduled' || !next.kind) {
      for (const k of ['view', 'consensus']) { const l = next[k] && next[k].locked_at; if (l && !(Date.parse(l) < Date.parse(next.at))) errs.push(`${k} locked at or after the release`); }
    } else if (next.view && !next.view.after_news) errs.push('breaking view must be marked written after the news');
    if (prev) for (const p of FROZEN) { const a = get(prev, p); if (a !== undefined && a !== null && !same(a, get(next, p))) errs.push(`locked field changed: ${p}`); }
    if (prev) for (const p of PER) { const a = get(prev, p) || {}, b = get(next, p) || {}; for (const k of Object.keys(a)) if (a[k] != null && !same(a[k], b[k])) errs.push(`locked field changed: ${p}.${k}`); }
    return errs;
  }
  const API = { R, num, sgn, impliedMove, trailStats, unusualThr, verdict, strength, confidence, scenarioFor, scoreView, gate, cluster, status, checkLocked, FROZEN, PER };
  if (typeof module === 'object' && module.exports) module.exports = API; else root.EVC = API;
})(typeof self !== 'undefined' ? self : this);
