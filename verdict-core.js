/* KMS Capital – verdict core (Proof Layer, docs/architect-proof-layer.md §2.1). Indicators and the Long / Wait / Avoid /
   Insufficient rule, moved unchanged from app.js so the browser, scripts/build_verdict_backtest.mjs and scripts/build_ledger.mjs
   run the exact same code. UMD like events-core.js: browser global VC, or require('./verdict-core.js') in node.
   Stored state codes Long / Wait / Avoid / Insufficient never change; only display labels do (i18n.js). */
(function (root) {
  'use strict';
  const DAY = 864e5, H4 = 4 * 36e5, H4N = 168; // H4N: closed 4h bars kept (28 days; 180 fetched minus at most 6 not yet closed by the daily close)
  const sma = (a, n) => a.map((_, i) => i < n - 1 ? null : a.slice(i - n + 1, i + 1).reduce((x, y) => x + y, 0) / n);
  const ema = (a, n) => { const k = 2 / (n + 1); const o = [a[0]]; for (let i = 1; i < a.length; i++) o.push(a[i] * k + o[i - 1] * (1 - k)); return o; };
  function rsiSeries(a, n = 14) {
    const o = Array(a.length).fill(null); if (a.length < n + 1) return o;
    let ag = 0, al = 0;
    for (let i = 1; i <= n; i++) { const d = a[i] - a[i - 1]; ag += Math.max(d, 0); al += Math.max(-d, 0); }
    ag /= n; al /= n; o[n] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    for (let i = n + 1; i < a.length; i++) { const d = a[i] - a[i - 1]; ag = (ag * (n - 1) + Math.max(d, 0)) / n; al = (al * (n - 1) + Math.max(-d, 0)) / n; o[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); }
    return o;
  }
  function bb(a, n = 20) {
    const up = [], lo = [], mid = [];
    a.forEach((_, i) => { if (i < n - 1) { up.push(null); lo.push(null); mid.push(null); return; }
      const w = a.slice(i - n + 1, i + 1); const mu = w.reduce((x, y) => x + y, 0) / n; const sd = Math.sqrt(w.reduce((x, y) => x + (y - mu) ** 2, 0) / n);
      up.push(mu + 2 * sd); lo.push(mu - 2 * sd); mid.push(mu); });
    return { up, lo, mid };
  }
  function atr(k, n = 14) {
    const tr = []; for (let i = 1; i < k.length; i++) tr.push(Math.max(k[i].h - k[i].l, Math.abs(k[i].h - k[i - 1].c), Math.abs(k[i].l - k[i - 1].c)));
    if (tr.length < n) return null;
    let a = tr.slice(0, n).reduce((x, y) => x + y, 0) / n; for (const x of tr.slice(n)) a = (a * (n - 1) + x) / n; return a;
  }
  function swings(k, w = 3, look = 120) {
    k = k.slice(-look); const lo = [], hi = [];
    for (let i = w; i < k.length - w; i++) { const win = k.slice(i - w, i + w + 1);
      if (k[i].l === Math.min(...win.map((x) => x.l))) lo.push(k[i].l);
      if (k[i].h === Math.max(...win.map((x) => x.h))) hi.push(k[i].h); }
    return { lo, hi };
  }
  const dedupe = (v, gap, rev) => { const o = []; [...v].sort((a, b) => rev ? b - a : a - b).forEach((x) => { if (o.every((y) => Math.abs(x - y) > gap)) o.push(x); }); return o; };

  function compute(t, opt) {
    let d = t.d1;
    if (!Array.isArray(d) || d.length < 15 || d.some((x) => !x || !['c','h','l','q'].every((k) => Number.isFinite(x[k])) || x.c <= 0 || x.h < x.l || x.q < 0)) throw new Error('Insufficient or malformed daily candles');
    // closedOnly: indicators, levels and bias read closed daily candles only. The still-open daily candle (last bar whose
    // open time + 1 day is after `now`) is dropped, and 4h candles count only if they closed by that last daily close.
    // The live price (t.price) is then used only to show distance to the levels (plan.price, plan.inZone).
    const o = opt || {}, now = Number.isFinite(o.now) ? o.now : Date.now();
    let h4 = t.h4, closedAt = null, dropped = false;
    if (o.closedOnly) {
      const lb = d[d.length - 1];
      if (Number.isFinite(lb.t) && lb.t + DAY > now) { d = d.slice(0, -1); dropped = true; }
      if (d.length < 15) throw new Error('Insufficient or malformed daily candles');
      const lt = d[d.length - 1].t; closedAt = Number.isFinite(lt) ? lt + DAY : null;
      // Audit F5: then keep a fixed count (H4N, the newest closed bars), so the 4h window and the entry zone cannot move
      // within a day as more 4h bars of the new day close. The app and the ledger fetch 180 bars; at most 6 are dropped.
      if (h4 && h4.length && closedAt != null) h4 = h4.filter((x) => x && Number.isFinite(x.t) && x.t + H4 <= closedAt).slice(-H4N);
    }
    const c = d.map((x) => x.c), live = t.price ?? c[c.length - 1];
    if (!Number.isFinite(live) || live <= 0) throw new Error('Invalid price');
    const p = o.closedOnly ? c[c.length - 1] : live;
    const last = (a) => a[a.length - 1];
    const ma20 = sma(c, 20), ma50 = sma(c, 50), ma200 = sma(c, 200);
    const e26 = ema(c, 26); const m = ema(c, 12).map((x, i) => x - e26[i]);
    const sg = Array(25).fill(null).concat(c.length > 25 ? ema(m.slice(25), 9) : []);
    const hist = m.map((x, i) => sg[i] == null ? null : x - sg[i]);
    const rs = rsiSeries(c), b = bb(c);
    let vol30 = null;
    if (c.length >= 31) { const r = []; for (let i = c.length - 30; i < c.length; i++) r.push(Math.log(c[i] / c[i - 1])); const mu = r.reduce((x, y) => x + y, 0) / 30; vol30 = Math.sqrt(r.reduce((x, y) => x + (y - mu) ** 2, 0) / 29) * Math.sqrt(365) * 100; }
    const I = { rsi: last(rs), ma20: last(ma20), ma50: last(ma50), ma200: last(ma200), macd: last(m), sig: last(sg), hist: last(hist), bbUp: last(b.up), bbLo: last(b.lo), bbMid: last(b.mid), vol30,
      series: { ma20, ma50, ma200, rsi: rs, macd: m, sig: sg, hist, bbUp: b.up, bbLo: b.lo, bbMid: b.mid } };
    // ---- trade plan: daily levels, 4h entry refinement (mirrors update.py plan()) ----
    const dk = d.slice(-200); const A = atr(dk);
    const sw = swings(dk);
    let Sx = dedupe(sw.lo.filter((x) => x < p), 0.5 * A, true).slice(0, 3);
    const Rz = dedupe(sw.hi.filter((x) => x > p), 0.5 * A, false).slice(0, 3);
    if (!Sx.length) Sx = [Math.min(...dk.slice(-90).map((x) => x.l))];
    const s1 = Sx[0]; let zl = s1, zh = s1 + 0.25 * A, ref = 'daily (no 4h data)';
    if (h4 && h4.length) {
      const l4 = swings(h4, 3, 180).lo; const cand = l4.filter((x) => x >= s1 - 0.5 * A && x < p);
      if (cand.length) { zl = Math.min(...cand) >= s1 - 0.5 * A ? Math.min(s1, Math.min(...cand)) : s1; zh = Math.min(Math.max(...cand), zl + A, p); ref = '4h swing lows'; }
      if (zh <= zl) zh = zl + 0.25 * A;
    }
    const em = (zl + zh) / 2, sl = zl - A, risk = em - sl;
    const tps = Rz.filter((x) => x > zh).map((x) => ({ price: x, basis: 'daily resistance' }));
    while (tps.length < 3) tps.push({ price: tps.length ? Math.max(tps[tps.length - 1].price, em) + risk : em + 2 * risk, basis: 'R-multiple (no resistance left)' });
    tps.forEach((x) => x.rr = (x.price - em) / risk);
    const v90 = d.slice(-90); const vwap = v90.reduce((s, x) => s + x.c * x.q, 0) / v90.reduce((s, x) => s + x.q, 0);
    const comps = [I.ma50, I.ma200, vwap].filter((x) => x); const fair = comps.reduce((x, y) => x + y, 0) / comps.length;
    // Missing MA200 is not zero. Preserve the existing rule only with complete inputs.
    const ready = c.length >= 200 && [I.ma50, I.ma200, I.hist, A, risk, tps[0].rr].every(Number.isFinite) && A > 0 && risk > 0;
    const up = ready && p > I.ma200, dn = ready && p < I.ma50 && !up;
    const bias = !ready ? 'Insufficient' : dn ? 'Avoid' : up && I.hist > 0 && tps[0].rr >= 1.5 && p <= zh * 1.03 ? 'Long' : 'Wait';
    const trend = !ready ? 'Insufficient' : p > I.ma50 && p > I.ma200 ? 'Uptrend' : p < I.ma50 && p < I.ma200 ? 'Downtrend' : 'Mixed';
    I.plan = { ready, history: c.length, atr: A, sup: Sx, res: Rz, entry: [zl, zh], ref, stop: sl, tps, vwap, fair, bias, inZone: zl <= live && live <= zh, price: live,
      close: p, closedOnly: !!o.closedOnly, closedAt, openDropped: dropped };
    I.trend = trend;
    return I;
  }
  /* ---- Phase 3 hysteresis (docs/architect-proof-layer.md §4): a stored state changes only after two consecutive closed daily bars agree.
     rawAt(j) = the state the rule gives at closed bar j. Walking back from bar i, the held state is raw(j) at the newest bar j where
     raw(j) = raw(j - 1). Insufficient (incomplete inputs) starts and ends at once: no levels can be issued without the inputs, and there
     is no earlier state to hold. If no bar within HOLD_BACK bars qualifies, the state at the oldest bar looked at is kept. The app, the
     ledger and the backtest all call this one function. */
  const HOLD_BACK = 30, INS = 'Insufficient';
  function holdAt(rawAt, i, lo = 0) {
    const stop = Math.max(lo, i - HOLD_BACK);
    for (let j = i; j > stop; j--) { const a = rawAt(j), b = rawAt(j - 1); if (a === b || a === INS || b === INS) return { state: a, at: j }; }
    return { state: rawAt(stop), at: stop };
  }
  /* held states for a whole series of raw states (backtest) */
  function holdSeries(raw) { return raw.map((_, i) => holdAt((j) => raw[j], i).state); }
  /* compute() plus the held state. plan.bias = the held (stored, shown) state; plan.raw = what the newest closed bar alone gives;
     plan.pending = that raw state when it differs (it becomes the state if the next close agrees); plan.since = open time of the bar
     where the held state was confirmed. opt.win = closed bars per evaluation (the ledger passes 299, as the backtest); default all. */
  function computeHeld(t, opt) {
    const o = { ...(opt || {}), closedOnly: true }, now = Number.isFinite(o.now) ? o.now : Date.now(), win = o.win || Infinity;
    let d = Array.isArray(t.d1) ? t.d1 : [], dropped = false; const lb = d[d.length - 1];
    if (lb && Number.isFinite(lb.t) && lb.t + DAY > now) { d = d.slice(0, -1); dropped = true; }
    const cut = (j) => d.slice(Math.max(0, j + 1 - win), j + 1);
    const I = compute({ ...t, d1: cut(d.length - 1) }, o), P = I.plan, n = d.length, memo = new Map([[n - 1, P.bias]]);
    P.openDropped = P.openDropped || dropped;
    const rawAt = (j) => { if (!memo.has(j)) { let s; try { const w = cut(j); s = compute({ d1: w, h4: t.h4, price: w[w.length - 1].c }, { closedOnly: true, now: Number.isFinite(w[w.length - 1].t) ? w[w.length - 1].t + DAY : now }).plan.bias; } catch (e) { s = INS; } memo.set(j, s); } return memo.get(j); };
    const h = holdAt(rawAt, n - 1);
    P.raw = P.bias; P.bias = h.state; P.pending = P.raw !== h.state ? P.raw : null; P.since = Number.isFinite(d[h.at] && d[h.at].t) ? d[h.at].t : null; P.held = true;
    return I;
  }
  const API = { sma, ema, rsiSeries, bb, atr, swings, dedupe, compute, computeHeld, holdAt, holdSeries, HOLD_BACK, DAY, H4N, STATES: ['Long', 'Wait', 'Avoid', 'Insufficient'] };
  if (typeof module === 'object' && module.exports) module.exports = API; else root.VC = API;
})(typeof self !== 'undefined' ? self : this);
