/* KMS Capital – Market Health math (docs/market-health-p6.md). UMD: browser `HMC`, node `require`.
   One place for the formulas, so scripts/build_health.mjs (writes health.json) and health.js (renders it) use the same numbers.
   Spot Market Health reads closed daily candles only. Leverage Risk is a separate reading and never enters the spot score.
   Both describe the market as it is ("บรรยายสภาพตลาด ไม่ใช่การทำนาย"): the weights and thresholds are judgment calls, not fitted. */
(function (root) {
  const FORMULA = 'v1';
  const W = { B: 30, M: 25, V: 15, H: 10, P: 10 }; // sum 90 (leverage safety left out on purpose: the two readings are never merged)
  const MIN_N = 90, MIN_MA200 = 50, VOL_CAP = 0.10, LEV_MIN = 70, OI_MIN = 10, HYST = 3;
  const SPOT_BANDS = [[70, 'Strong'], [55, 'Healthy'], [40, 'Mixed'], [-Infinity, 'Weak']];
  const LEV_BANDS = [[80, 'Extreme'], [60, 'High'], [40, 'Elevated'], [20, 'Normal'], [-Infinity, 'Low']];
  const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
  const fin = (x) => typeof x === 'number' && Number.isFinite(x);
  const median = (a) => { const s = a.filter(fin).sort((x, y) => x - y), m = s.length >> 1; return !s.length ? null : s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const share = (a) => (a.length ? (100 * a.filter(Boolean).length) / a.length : null);
  const r2 = (x, d = 2) => (fin(x) ? Math.round(x * 10 ** d) / 10 ** d : null);

  /* band for a score; with `prev` the label only changes once the score is HYST points past the edge (numbers always show the true value) */
  function band(score, bands, prev) {
    if (!fin(score)) return null;
    const i = bands.findIndex(([lo]) => score >= lo), raw = bands[i][1], j = bands.findIndex(([, b]) => b === prev);
    if (j < 0 || j === i) return raw;
    const lo = bands[j][0], hi = j ? bands[j - 1][0] : Infinity;
    return score >= lo - HYST && score < hi + HYST ? prev : raw;
  }

  /* per-coin facts from CLOSED daily candles, ascending [{t, c, q}] (the forming candle already dropped) */
  function coinStats(k) {
    const c = k.map((x) => x.c), n = c.length, last = c[n - 1];
    const ch = (d) => (n > d && c[n - 1 - d] > 0 ? (last / c[n - 1 - d] - 1) * 100 : null);
    const sma = (p) => c.slice(-p).reduce((a, x) => a + x, 0) / p;
    const prior = c.slice(-31, -1), base = n >= 31 ? k.slice(-31, -1).reduce((a, x) => a + x.q, 0) / 30 : null;
    return { day: new Date(k[n - 1].t).toISOString().slice(0, 10), n, c: last, d1: r2(ch(1), 3), d7: r2(ch(7), 3), d30: r2(ch(30), 3),
      ma50: n >= 50 ? last > sma(50) : null, ma200: n >= 200 ? last > sma(200) : null,
      hi30: n >= 31 ? last >= Math.max(...prior) : null, lo30: n >= 31 ? last <= Math.min(...prior) : null,
      q: k[n - 1].q, vr: base > 0 ? r2(k[n - 1].q / base, 3) : null };
  }

  /* Spot Market Health from closed-candle stats. coins: [{id, st}] (st = coinStats). Any missing component -> no score. */
  function spot(coins, btcId = 'bitcoin') {
    const N = coins.length, st = coins.map((x) => x.st), miss = [], C = {};
    const cov = (vals, elig) => (elig ? vals.length / elig : 0);
    if (N < MIN_N) miss.push('universe');
    { const a1 = st.filter((s) => fin(s.d1)), a7 = st.filter((s) => fin(s.d7));
      const adv1 = share(a1.map((s) => s.d1 > 0)), adv7 = share(a7.map((s) => s.d7 > 0));
      C.B = cov(a1, N) >= 0.9 && cov(a7, N) >= 0.9 ? { v: r2(0.4 * adv1 + 0.6 * adv7), adv1: r2(adv1, 1), adv7: r2(adv7, 1),
        dec1: r2(share(a1.map((s) => s.d1 < 0)), 1), dec7: r2(share(a7.map((s) => s.d7 < 0)), 1), n: a7.length } : null; }
    { const e50 = st.filter((s) => s.n >= 50), e200 = st.filter((s) => s.n >= 200); // coins too young for an MA are left out of that MA, not counted as below it
      const a50 = share(e50.map((s) => s.ma50)), a200 = share(e200.map((s) => s.ma200));
      C.M = e50.length >= 0.9 * N && e200.length >= MIN_MA200 ? { v: r2(0.5 * a50 + 0.5 * a200), a50: r2(a50, 1), a200: r2(a200, 1), n50: e50.length, n200: e200.length } : null; }
    { const ok = st.filter((s) => fin(s.vr) && fin(s.d1) && s.q > 0), tot = ok.reduce((a, s) => a + s.q, 0), cap = VOL_CAP * tot;
      const w = (s) => Math.min(s.q, cap), den = ok.reduce((a, s) => a + w(s), 0);
      const d = den ? ok.reduce((a, s) => a + w(s) * Math.sign(s.d1), 0) / den : null, R = median(ok.map((s) => s.vr)), k = fin(R) ? clamp((R - 0.5) / 1.0, 0, 1) : null;
      C.V = cov(ok, N) >= 0.9 && fin(d) ? { v: r2(50 + 50 * d * k), R: r2(R, 3), d: r2(d, 3), w: r2(k, 3), cap: VOL_CAP, n: ok.length } : null; }
    { const e = st.filter((s) => s.hi30 != null), nh = e.filter((s) => s.hi30).length, nl = e.filter((s) => s.lo30).length;
      C.H = cov(e, N) >= 0.9 ? { v: r2(50 + (50 * (nh - nl)) / Math.max(nh + nl, 0.1 * e.length)), nh, nl, n: e.length } : null; }
    { const b = coins.find((x) => x.id === btcId), alts = st.filter((s, i) => coins[i].id !== btcId);
      const m1 = median(alts.map((s) => s.d1)), m7 = median(alts.map((s) => s.d7));
      C.P = b && fin(b.st.d1) && fin(b.st.d7) && fin(m1) && fin(m7) ? (() => { const s1 = m1 - b.st.d1, s7 = m7 - b.st.d7;
        return { v: r2(50 + 50 * (0.5 * clamp(s1 / 5, -1, 1) + 0.5 * clamp(s7 / 10, -1, 1))), btc1: b.st.d1, btc7: b.st.d7, alt1: r2(m1, 3), alt7: r2(m7, 3), s1: r2(s1, 3), s7: r2(s7, 3) }; })() : null; }
    for (const k of Object.keys(W)) if (!C[k]) miss.push(k);
    const score = miss.length ? null : r2(clamp(Object.keys(W).reduce((a, k) => a + W[k] * C[k].v, 0) / 90), 1);
    return { score, missing: miss, comp: C };
  }

  /* Leverage Risk. perps: [{s, f (%/8h), oi (USD)}]; oiChg: [{s, chg (% in coin terms, 7d), oi}] */
  function leverage(perps, oiChg) {
    const P = perps.filter((p) => fin(p.f) && p.oi > 0), O = (oiChg || []).filter((x) => fin(x.chg) && x.oi > 0), miss = [];
    const toi = P.reduce((a, p) => a + p.oi, 0), fbar = toi ? P.reduce((a, p) => a + p.f * p.oi, 0) / toi : null;
    const xs = P.length ? (100 * P.filter((p) => Math.abs(p.f) >= 0.05).length) / P.length : null;
    const ow = O.reduce((a, x) => a + x.oi, 0), oc = ow ? O.reduce((a, x) => a + x.chg * x.oi, 0) / ow : null;
    const C = { F: P.length >= LEV_MIN ? { v: r2(clamp((100 * Math.abs(fbar - 0.01)) / 0.09)), fbar: r2(fbar, 4), n: P.length, oi: Math.round(toi) } : null,
      O: O.length >= OI_MIN ? { v: r2(clamp((100 * Math.max(0, oc)) / 30)), chg: r2(oc, 2), n: O.length } : null,
      X: P.length >= LEV_MIN ? { v: r2(clamp(4 * xs)), share: r2(xs, 1), n: P.length } : null };
    for (const k of ['F', 'O', 'X']) if (!C[k]) miss.push(k);
    return { score: miss.length ? null : r2(clamp(0.4 * C.F.v + 0.35 * C.O.v + 0.25 * C.X.v), 1), missing: miss, comp: C };
  }

  /* Squarified treemap (Bruls, Huizing, van Wijk 2000). items [{v>0, ...}] -> same items with x, y, w, h inside the rectangle. */
  function squarify(items, X, Y, Wd, Ht) {
    const tot = items.reduce((a, i) => a + (i.v > 0 ? i.v : 0), 0), out = [];
    if (!(tot > 0) || !(Wd > 0) || !(Ht > 0)) return out;
    const sc = (Wd * Ht) / tot, rest = items.filter((i) => i.v > 0).sort((a, b) => b.v - a.v).map((i) => ({ i, a: i.v * sc }));
    const worst = (row, side) => { const s = row.reduce((a, r) => a + r.a, 0), mx = Math.max(...row.map((r) => r.a)), mn = Math.min(...row.map((r) => r.a)); return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn)); };
    const lay = (row) => { const s = row.reduce((a, r) => a + r.a, 0);
      if (Wd >= Ht) { const cw = s / Ht; let y = Y; for (const r of row) { const h = r.a / cw; out.push({ ...r.i, x: X, y, w: cw, h }); y += h; } X += cw; Wd -= cw; }
      else { const rh = s / Wd; let x = X; for (const r of row) { const w = r.a / rh; out.push({ ...r.i, x, y: Y, w, h: rh }); x += w; } Y += rh; Ht -= rh; } };
    let row = [];
    while (rest.length) { const side = Math.min(Wd, Ht), c = rest[0]; if (!row.length || worst([...row, c], side) <= worst(row, side)) { row.push(c); rest.shift(); } else { lay(row); row = []; } }
    if (row.length) lay(row);
    return out;
  }
  /* two levels: groups [{k, items}] laid out by their total, then the coins inside each (minus a label strip of `head` px) */
  function groupLayout(groups, Wd, Ht, head = 0, gap = 2) {
    const g = squarify(groups.map((x) => ({ k: x.k, items: x.items, v: x.items.reduce((a, i) => a + i.v, 0) })), 0, 0, Wd, Ht);
    return g.map((r) => { const hh = head && r.h > head * 2.5 && r.w > 40 ? head : 0;
      return { k: r.k, x: r.x, y: r.y, w: r.w, h: r.h, head: hh, tiles: squarify(r.items, r.x + gap / 2, r.y + hh + gap / 2, Math.max(0, r.w - gap), Math.max(0, r.h - hh - gap)) }; });
  }
  /* market-cap tiers inside the universe (rank order), the "group by market cap" view */
  const tierOf = (i) => (i < 10 ? 'Top 10' : i < 30 ? '#11–30' : '#31–100');

  const API = { FORMULA, W, MIN_N, MIN_MA200, VOL_CAP, LEV_MIN, OI_MIN, HYST, SPOT_BANDS, LEV_BANDS, clamp, median, band, coinStats, spot, leverage, squarify, groupLayout, tierOf };
  if (typeof module === 'object' && module.exports) module.exports = API; else root.HMC = API;
})(typeof self !== 'undefined' ? self : this);
