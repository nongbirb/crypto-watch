/* KMS Capital – chart pattern engine. Deterministic, rule-based (no AI). Pure functions; also loaded by node tests. */
'use strict';
const PE = (() => {
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  function atrS(k, n = 14) { const o = []; let a = 0; for (let i = 0; i < k.length; i++) { const x = k[i], tr = i ? Math.max(x.h - x.l, Math.abs(x.h - k[i - 1].c), Math.abs(x.l - k[i - 1].c)) : x.h - x.l; a = i < n ? (a * i + tr) / (i + 1) : (a * (n - 1) + tr) / n; o.push(a); } return o; }
  /* ATR-scaled zigzag: a swing is confirmed once price reverses m×ATR from its extreme. Last element is the running (tentative) extreme. */
  function zigzag(k, atr, m) {
    const P = []; let dir = 0, hi = 0, lo = 0;
    for (let i = 1; i < k.length; i++) {
      if (dir === 0) { if (k[i].h > k[hi].h) hi = i; if (k[i].l < k[lo].l) lo = i; if (k[hi].h - k[lo].l >= m * atr[i]) { if (hi > lo) { P.push({ i: lo, p: k[lo].l, h: false }); dir = 1; } else { P.push({ i: hi, p: k[hi].h, h: true }); dir = -1; } } continue; }
      if (dir === 1) { if (k[i].h >= k[hi].h) hi = i; else if (k[hi].h - k[i].l >= m * atr[hi]) { P.push({ i: hi, p: k[hi].h, h: true }); dir = -1; lo = i; } }
      else { if (k[i].l <= k[lo].l) lo = i; else if (k[i].h - k[lo].l >= m * atr[lo]) { P.push({ i: lo, p: k[lo].l, h: false }); dir = 1; hi = i; } }
    }
    if (dir === 1) P.push({ i: hi, p: k[hi].h, h: true, t: true }); else if (dir === -1) P.push({ i: lo, p: k[lo].l, h: false, t: true });
    return P;
  }
  const L2 = (a, b) => (i) => a.p + (b.p - a.p) * (i - a.i) / ((b.i - a.i) || 1);
  function lsq(pts) { const n = pts.length, mx = pts.reduce((s, q) => s + q.i, 0) / n, my = pts.reduce((s, q) => s + q.p, 0) / n; let sxy = 0, sxx = 0; pts.forEach((q) => { sxy += (q.i - mx) * (q.p - my); sxx += (q.i - mx) ** 2; }); const s = sxx ? sxy / sxx : 0; const f = (i) => my + s * (i - mx); f.s = s; return f; }
  /* scan bars after a pattern: breakout close, then target hit or invalidation close */
  function outcome(k, start, brk, inv, tgt, dir, maxWait) {
    let b = -1;
    for (let i = start; i < k.length; i++) {
      const c = k[i].c;
      if (b < 0) {
        if (dir > 0 ? c < inv : c > inv) return { st: 'inv', at: i, b: -1 };
        if (dir > 0 ? c > brk(i) : c < brk(i)) { b = i; if (dir > 0 ? k[i].h >= tgt : k[i].l <= tgt) return { st: 'hit', at: i, b }; continue; }
        if (i - start > maxWait) return { st: 'stale', at: i, b: -1 };
      } else {
        if (dir > 0 ? k[i].h >= tgt : k[i].l <= tgt) return { st: 'hit', at: i, b };
        if (dir > 0 ? c < inv : c > inv) return { st: 'inv', at: i, b };
      }
    }
    return { st: b < 0 ? 'forming' : 'confirmed', b, at: b };
  }
  const P = (q, lb) => ({ i: q.i, p: q.p, lb });

  /* ---------- detectors: (ctx, j) -> candidate | null; j = index of the pattern's last pivot ---------- */
  function dTop(ctx, j, s) { // double top (s=1) / bottom (s=-1)
    const { k, piv, atr } = ctx; if (j < 3) return null;
    const A = piv[j - 2], N = piv[j - 1], B = piv[j], P0 = piv[j - 3];
    if (B.t || (s > 0) !== B.h) return null;
    const a = atr[B.i], top = (A.p + B.p) / 2, depth = s * (top - N.p), diff = Math.abs(A.p - B.p), tol = 0.6 * a;
    if (diff > tol || depth < 2 * a || B.i - A.i < 6 || s * (top - P0.p) < 1.3 * depth) return null;
    const ext = s > 0 ? Math.max(A.p, B.p) : Math.min(A.p, B.p);
    const fit = 0.6 * (1 - diff / tol) + 0.4 * clamp(depth / (4 * a));
    const lb = s > 0 ? ['Top 1', 'Top 2'] : ['Bottom 1', 'Bottom 2'];
    return { type: s > 0 ? 'dtop' : 'dbot', dir: -s, pts: [P(A, lb[0]), P(N, 'Neck'), P(B, lb[1])], lines: [{ a: { i: A.i, p: N.p }, b: { i: B.i, p: N.p }, kind: 'neck', ext: true }],
      brk: () => N.p, inv: ext, tgt: N.p - s * depth, from: A.i, end: B.i, h: depth, fit, rev: true, peaks: [A.i, B.i] };
  }
  function dTriple(ctx, j, s) {
    const { piv, atr } = ctx; if (j < 5) return null;
    const A = piv[j - 4], N1 = piv[j - 3], B = piv[j - 2], N2 = piv[j - 1], C = piv[j], P0 = piv[j - 5];
    if (C.t || (s > 0) !== C.h) return null;
    const a = atr[C.i], hs = [A.p, B.p, C.p], top = (A.p + B.p + C.p) / 3, spread = Math.max(...hs) - Math.min(...hs), tol = 0.8 * a;
    const neck = L2(N1, N2), depth = s * (top - (N1.p + N2.p) / 2);
    if (spread > tol || depth < 2 * a || Math.abs(N1.p - N2.p) > 0.4 * depth || s * (top - P0.p) < 1.3 * depth || C.i - A.i < 10) return null;
    const ext = s > 0 ? Math.max(...hs) : Math.min(...hs);
    const fit = 0.5 * (1 - spread / tol) + 0.25 * (1 - Math.abs(N1.p - N2.p) / (0.4 * depth)) + 0.25 * clamp(depth / (4 * a));
    const lb = s > 0 ? 'Top ' : 'Bottom ';
    return { type: s > 0 ? 'ttop' : 'tbot', dir: -s, pts: [P(A, lb + 1), P(N1, ''), P(B, lb + 2), P(N2, ''), P(C, lb + 3)], lines: [{ a: N1, b: N2, kind: 'neck', ext: true }],
      brk: neck, inv: ext, tgt: neck(C.i) - s * depth, from: A.i, end: C.i, h: depth, fit, rev: true, peaks: [A.i, B.i, C.i] };
  }
  function dHS(ctx, j, s) { // head & shoulders (s=1) / inverse (s=-1)
    const { piv, atr } = ctx; if (j < 5) return null;
    const LS = piv[j - 4], N1 = piv[j - 3], H = piv[j - 2], N2 = piv[j - 1], RS = piv[j], P0 = piv[j - 5];
    if (RS.t || (s > 0) !== RS.h) return null;
    const a = atr[RS.i], neck = L2(N1, N2), ht = s * (H.p - neck(H.i));
    const prom = s * (H.p - (s > 0 ? Math.max(LS.p, RS.p) : Math.min(LS.p, RS.p)));
    const sh = Math.abs(LS.p - RS.p), shMax = 0.35 * ht, nk = Math.abs(N1.p - N2.p), nkMax = 0.4 * ht;
    const d1 = H.i - LS.i, d2 = RS.i - H.i, sym = Math.min(d1, d2) / Math.max(d1, d2);
    if (ht < 2.5 * a || prom < 0.6 * a || sh > shMax || nk > nkMax || sym < 0.35 || s * (LS.p - neck(LS.i)) < 0.8 * a || s * (RS.p - neck(RS.i)) < 0.8 * a || s * (neck(P0.i) - P0.p) < 0) return null;
    const fit = 0.3 * (1 - sh / shMax) + 0.2 * (1 - nk / nkMax) + 0.25 * sym + 0.25 * clamp(prom / (1.5 * a));
    const lb = s > 0 ? ['LS', 'Head', 'RS'] : ['LS', 'Head', 'RS'];
    return { type: s > 0 ? 'hs' : 'ihs', dir: -s, pts: [P(LS, lb[0]), P(N1, ''), P(H, lb[1]), P(N2, ''), P(RS, lb[2])], lines: [{ a: N1, b: N2, kind: 'neck', ext: true }],
      brk: neck, inv: RS.p, tgt: neck(RS.i) - s * ht, from: LS.i, end: RS.i, h: ht, fit, rev: true, peaks: [LS.i, H.i, RS.i] };
  }
  function dLines(ctx, j, c) { // triangles, wedges, channels from the last c alternating pivots
    const { k, piv, atr } = ctx; if (j < c - 1) return null;
    const pts = piv.slice(j - c + 1, j + 1); if (pts[pts.length - 1].t) return null;
    const hs = pts.filter((q) => q.h), ls = pts.filter((q) => !q.h); if (hs.length < 2 || ls.length < 2) return null;
    const s0 = pts[0].i, e = pts[pts.length - 1].i, W = e - s0; if (W < 12) return null;
    const a = atr[Math.round((s0 + e) / 2)], U = lsq(hs), D = lsq(ls), tol = 0.45 * a;
    const ru = Math.max(...hs.map((q) => Math.abs(q.p - U(q.i)))), rl = Math.max(...ls.map((q) => Math.abs(q.p - D(q.i))));
    if (ru > tol || rl > tol) return null;
    const h0 = U(s0) - D(s0), h1 = U(e) - D(e); if (h0 <= 2 * a || h1 <= 0.5 * a) return null;
    let out = 0; for (let i = s0; i <= e; i++) if (k[i].c > U(i) + 0.3 * a || k[i].c < D(i) - 0.3 * a) out++;
    if (out > 0.08 * (W + 1)) return null;
    const du = U(e) - U(s0), dl = D(e) - D(s0), f = 0.25 * Math.max(h0, h1), r = h1 / h0;
    let type = null, dir = 0;
    if (r < 0.72) {
      if (Math.abs(du) < f && dl > f) { type = 'atri'; dir = 1; }
      else if (Math.abs(dl) < f && du < -f) { type = 'dtri'; dir = -1; }
      else if (du < -f && dl > f) { type = 'stri'; dir = 0; }
      else if (du > 0 && dl > 0 && dl > du + 0.1 * h0) { type = 'rwedge'; dir = -1; }
      else if (du < 0 && dl < 0 && du < dl - 0.1 * h0) { type = 'fwedge'; dir = 1; }
    } else if (r <= 1.35) {
      if (du > f && dl > f) { type = 'chup'; dir = 0; }
      else if (du < -f && dl < -f) { type = 'chdn'; dir = 0; }
      else if (Math.abs(du) < f && Math.abs(dl) < f && h1 >= 4 * a && pts.length >= 6) { type = 'range'; dir = 0; }
    }
    if (!type) return null;
    const fit = 0.45 * (1 - (ru + rl) / (2 * tol)) + 0.3 * clamp((pts.length - 4) / 2) + 0.25 * (1 - out / Math.max(1, 0.08 * (W + 1)));
    const apex = U.s !== D.s ? (D(0) - U(0)) / (U.s - D.s) : Infinity;
    const lab = pts.map((q) => P(q, ''));
    return { type, dir, bi: true, pts: lab, lines: [{ a: { i: s0, p: U(s0) }, b: { i: e, p: U(e) }, kind: 'edge', ext: true, f: U }, { a: { i: s0, p: D(s0) }, b: { i: e, p: D(e) }, kind: 'edge', ext: true, f: D }],
      U, D, from: s0, end: e, h: type === 'chup' || type === 'chdn' || type === 'range' ? h1 : h0, fit, apex, touches: pts.length };
  }
  function dFlag(ctx, j) {
    const { k, piv, atr } = ctx; if (j < 1) return null;
    const A = piv[j - 1], B = piv[j]; if (B.t) return null;
    const s = B.h ? 1 : -1, ph = s * (B.p - A.p), pb = B.i - A.i, a = atr[B.i];
    if (ph < 4 * a || pb > 15 || pb < 2 || ph / pb < 0.45 * a) return null;
    const maxM = Math.min(25, Math.max(8, 3 * pb)), n = k.length;
    let res = null;
    for (let m = Math.max(5, Math.ceil(pb * 0.6)); m <= maxM && B.i + m < n; m++) {
      const w = k.slice(B.i + 1, B.i + m + 1), base = B.i + 1;
      const ext = s > 0 ? Math.min(...w.map((x) => x.l)) : Math.max(...w.map((x) => x.h));
      if (s * (B.p - ext) > 0.5 * ph) return null; // deep retrace: not a flag
      const ww = k.slice(B.i, B.i + m + 1), half = Math.ceil(ww.length / 2), am = (lo, hi, f) => { let b = lo; for (let q = lo; q < hi; q++) if (f(ww[q]) > f(ww[b])) b = q; return b; };
      const u1 = am(0, half, (x) => x.h), u2 = am(half, ww.length, (x) => x.h), l1 = am(0, half, (x) => -x.l), l2 = am(half, ww.length, (x) => -x.l);
      const Uf = L2({ i: B.i + u1, p: ww[u1].h }, { i: B.i + u2, p: ww[u2].h }), Df = L2({ i: B.i + l1, p: ww[l1].l }, { i: B.i + l2, p: ww[l2].l });
      Uf.s = (ww[u2].h - ww[u1].h) / ((u2 - u1) || 1); Df.s = (ww[l2].l - ww[l1].l) / ((l2 - l1) || 1);
      const uo = Math.max(0, ...w.map((x, q) => x.h - Uf(base + q))), lo = Math.max(0, ...w.map((x, q) => Df(base + q) - x.l));
      const U = (i) => Uf(i) + uo, D = (i) => Df(i) - lo, last = B.i + m;
      const nxt = last + 1; const isLast = nxt >= n;
      const brkNow = !isLast && (s > 0 ? k[nxt].c > U(nxt) : k[nxt].c < D(nxt));
      if (!brkNow && !isLast) continue;
      const r0 = U(base) - D(base), r1 = U(last) - D(last); if (r0 > 0.55 * ph || r0 <= 0) { if (isLast) return null; continue; }
      const slopeAgainst = s * (Uf.s + Df.s) / 2 * m; // + means drifting with pole
      let type = null;
      if (r1 / r0 < 0.7 && Uf.s < 0 && Df.s > 0) type = s > 0 ? 'bpen' : 'spen';
      else if (Math.abs(r1 / r0 - 1) < 0.35 && slopeAgainst <= 0.1 * ph) type = s > 0 ? 'bflag' : 'sflag';
      if (!type) { if (isLast) return null; continue; }
      const retr = s * (B.p - ext) / ph;
      const fit = 0.4 * clamp(1 - r0 / (0.55 * ph)) + 0.3 * clamp(1 - retr / 0.5) + 0.3 * clamp(ph / (6 * a));
      res = { type, dir: s, pts: [P(A, 'Pole'), P(B, '')], lines: [{ a: A, b: B, kind: 'pole' }, { a: { i: base, p: U(base) }, b: { i: last, p: U(last) }, kind: 'edge', ext: true }, { a: { i: base, p: D(base) }, b: { i: last, p: D(last) }, kind: 'edge', ext: true }],
        brk: s > 0 ? U : D, inv: ext, tgt: null, pole: ph, from: A.i, end: last, startScan: last + 1, h: ph, fit, cons: true };
      break;
    }
    return res;
  }
  function dCup(ctx, j) {
    const { k, piv, atr } = ctx; const B = piv[j]; if (!B || !B.h || B.t) return null;
    const a = atr[B.i];
    for (let q = j - 2; q >= Math.max(0, j - 10); q -= 2) {
      const A = piv[q]; if (!A.h) continue;
      const w = B.i - A.i; if (w < 15) continue;
      if (Math.abs(A.p - B.p) > Math.max(a, 0.03 * B.p)) continue;
      let bi = A.i, mx = 0; for (let i = A.i + 1; i < B.i; i++) { if (k[i].l < k[bi].l) bi = i; mx = Math.max(mx, k[i].h); }
      const rim = Math.min(A.p, B.p); if (mx > Math.max(A.p, B.p) + 0.3 * a) continue;
      const D = rim - k[bi].l; if (D < 3 * a || D / rim < 0.06 || D / rim > 0.5) continue;
      const pos = (bi - A.i) / w; if (pos < 0.25 || pos > 0.75) continue;
      let low = 0; for (let i = A.i; i <= B.i; i++) if (k[i].l <= k[bi].l + 0.33 * D) low++;
      const round = low / (w + 1); if (round < 0.2) continue;
      const pre = q > 0 ? piv[q - 1] : null; if (pre && pre.p > k[bi].l + 0.5 * D) continue; // need an advance into the left rim
      // handle: bars after B until breakout over the rim
      const n = k.length; let hl = B.i, b = -1;
      for (let i = B.i + 1; i < n && i - B.i <= Math.max(5, 0.5 * w); i++) { if (k[i].c > B.p && i - B.i >= 3) { b = i; break; } if (k[i].l < k[hl].l || hl === B.i) hl = i; }
      if (hl === B.i) continue; const hd = B.p - k[hl].l; if (hd > 0.5 * D || hd < 0.8 * a) continue;
      if (b < 0 && n - 1 - B.i > Math.max(5, 0.5 * w)) continue;
      const fit = 0.35 * clamp(round / 0.45) + 0.25 * (1 - Math.abs(pos - 0.5) * 2) + 0.2 * (1 - Math.abs(A.p - B.p) / Math.max(a, 0.03 * B.p)) + 0.2 * clamp(1 - hd / (0.5 * D));
      return { type: 'cup', dir: 1, pts: [P(A, 'Rim'), { i: bi, p: k[bi].l, lb: 'Cup' }, P(B, 'Rim'), { i: hl, p: k[hl].l, lb: 'Handle' }], lines: [{ a: { i: A.i, p: B.p }, b: { i: B.i, p: B.p }, kind: 'neck', ext: true }], arc: [A.i, bi, B.i],
        brk: () => B.p, inv: k[hl].l, tgt: B.p + D, from: A.i, end: hl, startScan: hl + 1, h: D, fit, cons: true };
    }
    return null;
  }
  const DET = [(c, j) => dTriple(c, j, 1), (c, j) => dTriple(c, j, -1), (c, j) => dHS(c, j, 1), (c, j) => dHS(c, j, -1), (c, j) => dTop(c, j, 1), (c, j) => dTop(c, j, -1),
    (c, j) => dLines(c, j, 6) || dLines(c, j, 5), dFlag, dCup];

  /* resolve status for a candidate */
  function resolve(k, x) {
    const n = k.length, start = x.startScan != null ? x.startScan : x.end + 1, wait = Math.max(10, x.end - x.from);
    if (x.bi) { // two-sided: first close outside either edge decides
      const a = x.U, d = x.D; let b = -1, side = 0;
      const apexLim = isFinite(x.apex) && x.apex > x.end ? x.apex : Infinity;
      for (let i = start; i < n; i++) { if (k[i].c > a(i)) { b = i; side = 1; break; } if (k[i].c < d(i)) { b = i; side = -1; break; } if (i - start > wait || i > apexLim) return { st: 'stale' }; }
      if (b < 0) { x.tgtU = a(n - 1) + x.h; x.tgtD = d(n - 1) - x.h; return { st: 'forming', b: -1 }; }
      if (x.dir && side !== x.dir) return { st: 'inv', at: b, b: -1, side };
      x.dir = side; x.inv = side > 0 ? d(x.end) : a(x.end); x.tgt = side > 0 ? a(b) + x.h : d(b) - x.h;
      const o = outcome(k, b, side > 0 ? a : d, x.inv, x.tgt, side, 1e9); return o;
    }
    if (x.cons && x.type !== 'cup') { const f = x.brk; const tg = (i) => f(i) + x.dir * x.pole; let o = outcome(k, start, f, x.inv, 0, x.dir, wait); // target depends on breakout point
      if (o.b >= 0) { x.tgt = tg(o.b); o = outcome(k, start, f, x.inv, x.tgt, x.dir, wait); } else x.tgt = tg(n - 1); return o; }
    return outcome(k, start, x.brk, x.inv, x.tgt, x.dir, wait);
  }
  function scan(k, m) { const atr = atrS(k); const piv = zigzag(k, atr, m); return { k, atr, piv, m }; }
  /* historical hit rate of each pattern type on this same series (resolved cases only) */
  function backtest(ctxs, liveKeys) {
    const H = {};
    ctxs.forEach((ctx) => { for (let j = 3; j < ctx.piv.length; j++) DET.forEach((d) => { const x = d(ctx, j); if (!x || liveKeys.has(x.type + ':' + x.end)) return; const o = resolve(ctx.k, x); const r = H[x.type] || (H[x.type] = { w: 0, l: 0, seen: new Set() }); const key = x.from + ':' + x.end; if (r.seen.has(key)) return; if (o.st === 'hit') { r.w++; r.seen.add(key); } else if (o.st === 'inv' && o.b >= 0) { r.l++; r.seen.add(key); } }); });
    return H;
  }
  const qv = (x) => x.q || x.v * x.c || 0;
  function volScore(k, x, o) {
    const avg = (a, b) => { let s = 0, c = 0; for (let i = Math.max(0, a); i <= Math.min(k.length - 1, b); i++) { s += qv(k[i]); c++; } return c ? s / c : 0; };
    if (o.b >= 0) { const r = qv(k[o.b]) / (avg(o.b - 20, o.b - 1) || 1); return { v: Math.round(clamp((r - 0.8) / 1.0) * 100), r, kind: 'brk' }; }
    if (x.rev && x.peaks) { const p = x.peaks, v1 = avg(p[0] - 2, p[0] + 2), v2 = avg(p[p.length - 1] - 2, p[p.length - 1] + 2); const r = v2 / (v1 || 1); return { v: r < 0.85 ? 80 : r < 1.05 ? 55 : 30, r, kind: 'peaks' }; }
    const mid = Math.round((x.from + x.end) / 2), r = avg(mid, x.end) / (avg(x.from, mid) || 1); return { v: r < 0.85 ? 75 : r < 1.05 ? 55 : 35, r, kind: 'contract' };
  }
  /* support / resistance zones from clustered pivots */
  function zones(k, piv, atr) {
    const n = k.length, a = atr[n - 1], last = k[n - 1].c, ps = piv.filter((q) => !q.t && q.i > n - 250).sort((x, y) => x.p - y.p), cl = [];
    ps.forEach((q) => { const c = cl[cl.length - 1]; if (c && q.p - c.hi <= 0.6 * a && q.p - c.lo <= 1.2 * a) { c.pts.push(q); c.hi = q.p; } else cl.push({ lo: q.p, hi: q.p, pts: [q] }); });
    const z = cl.filter((c) => c.pts.length >= 3).map((c) => { const pad = Math.max(0, (0.4 * a - (c.hi - c.lo)) / 2); return { lo: c.lo - pad, hi: c.hi + pad, n: c.pts.length, lastI: Math.max(...c.pts.map((q) => q.i)) }; });
    const sup = z.filter((x) => x.hi < last).sort((x, y) => y.hi - x.hi)[0] || null, res = z.filter((x) => x.lo > last).sort((x, y) => x.lo - y.lo)[0] || null;
    return { sup, res };
  }
  function analyze(k) {
    if (!k || k.length < 60) return { cands: [], zones: { sup: null, res: null }, short: true };
    const n = k.length, ctxs = [scan(k, 1.5), scan(k, 2.5)], cands = [];
    ctxs.forEach((ctx) => { const pv = ctx.piv; for (let j = pv.length - 1; j >= Math.max(1, pv.length - 6); j--) DET.forEach((d) => { const x = d(ctx, j); if (!x) return; const o = resolve(k, x); if (o.st === 'hit' || o.st === 'stale') return;
      if (o.st === 'inv' && n - 1 - o.at > 3) return; if (o.st === 'confirmed' && n - 1 - o.b > Math.max(20, x.end - x.from)) return; if (x.fit < 0.4) return; x.o = o; x.m = ctx.m; cands.push(x); }); });
    // triple beats double on the same final pivot
    const fin = cands.filter((x) => !((x.type === 'dtop' || x.type === 'dbot') && cands.some((y) => (y.type === (x.type === 'dtop' ? 'ttop' : 'tbot')) && y.end === x.end)));
    const live = new Set(fin.map((x) => x.type + ':' + x.end)); const H = backtest(ctxs, live);
    fin.forEach((x) => { const o = x.o, hb = H[x.type] || { w: 0, l: 0 }, Y = hb.w + hb.l; const vs = volScore(k, x, o);
      let comp; if (o.st === 'confirmed') comp = 100; else if (o.st === 'inv') comp = 0; else { const lv = x.bi ? null : x.brk(n - 1); comp = lv == null ? 45 : Math.round(30 + 50 * clamp(1 - Math.abs(k[n - 1].c - lv) / (x.h || 1))); }
      const hist = Y >= 3 ? Math.round((hb.w + 1) / (Y + 2) * 100) : 50, fit = Math.round(clamp(x.fit) * 100);
      x.score = { fit, vol: vs.v, volR: vs.r, volKind: vs.kind, comp, hist, w: hb.w, y: Y };
      x.conf = Math.round(0.4 * fit + 0.2 * vs.v + 0.2 * comp + 0.2 * hist) - (o.st === 'inv' ? 15 : 0); });
    const best = {}; fin.forEach((x) => { if (!best[x.type] || best[x.type].conf < x.conf) best[x.type] = x; });
    const out = Object.values(best).filter((x) => x.conf >= 35).sort((a, b) => b.conf - a.conf).slice(0, 3);
    return { cands: out, zones: zones(k, ctxs[0].piv, ctxs[0].atr), atr: ctxs[0].atr[n - 1] };
  }
  return { atrS, zigzag, analyze, scan, DET, resolve };
})();
if (typeof module !== 'undefined') module.exports = PE;

/* ---------- Patterns tab UI (browser only) ---------- */
const PT = { tf: '1d', cache: {}, req: 0, sel: 0 };
const PTF = { '1h': ['1H', 36e5, 3], '4h': ['4H', 144e5, 3], '1d': ['1D', 864e5, 3], '1w': ['1W', 6048e5, 2.2] };
const PD = {
  dtop: { d: -1, i: '2,20 8,5 13,13 18,5 24,20', en: ['Double top', 'Price hits the same ceiling twice and fails both times. It often means buyers are running out of steam. The pattern is only confirmed when price closes below the dip between the two tops (the neckline).', 'Buyers pushed to the same high twice and could not break it; sellers defended that level.'], th: ['ดับเบิลท็อป (สองยอด)', 'ราคาขึ้นไปชนเพดานเดิมสองครั้งแล้วไปต่อไม่ได้ มักแปลว่าแรงซื้อเริ่มหมด แพทเทิร์นจะยืนยันก็ต่อเมื่อราคาปิดต่ำกว่าจุดย่อระหว่างสองยอด (เส้นคอ)', 'ฝั่งซื้อดันขึ้นไปที่จุดสูงเดิมสองรอบแต่ทะลุไม่ได้ ฝั่งขายตั้งรับที่ระดับนั้น'] },
  dbot: { d: 1, i: '2,4 8,19 13,11 18,19 24,4', en: ['Double bottom', 'Price drops to the same floor twice and bounces both times. It often means sellers are exhausted. It is confirmed when price closes above the peak between the two lows (the neckline).', 'Sellers pushed to the same low twice and could not break it; buyers stepped in at that level.'], th: ['ดับเบิลบอททอม (สองก้น)', 'ราคาลงมาแตะพื้นเดิมสองครั้งแล้วเด้งกลับ มักแปลว่าแรงขายเริ่มหมด จะยืนยันเมื่อราคาปิดเหนือยอดระหว่างสองก้น (เส้นคอ)', 'ฝั่งขายกดลงมาที่จุดต่ำเดิมสองรอบแต่หลุดไม่ได้ ฝั่งซื้อเข้ามารับที่ระดับนั้น'] },
  ttop: { d: -1, i: '1,20 5,5 9,13 13,5 17,13 21,5 25,20', en: ['Triple top', 'Like a double top but the ceiling is tested three times. Each failure shows sellers are firmly in control at that price. Confirmed by a close below the neckline.', 'Three attempts at the same high all failed; buyers are losing conviction.'], th: ['ทริปเปิลท็อป (สามยอด)', 'คล้ายดับเบิลท็อปแต่ชนเพดานสามครั้ง ทุกครั้งที่ไม่ผ่านแสดงว่าฝั่งขายคุมราคานั้นอยู่ ยืนยันเมื่อปิดต่ำกว่าเส้นคอ', 'พยายามทะลุจุดสูงเดิมสามรอบแต่ล้มเหลว ฝั่งซื้อเริ่มหมดความมั่นใจ'] },
  tbot: { d: 1, i: '1,4 5,19 9,11 13,19 17,11 21,19 25,4', en: ['Triple bottom', 'Like a double bottom but the floor holds three times. Buyers keep defending the same price. Confirmed by a close above the neckline.', 'Three drops to the same low all bounced; sellers are running out of force.'], th: ['ทริปเปิลบอททอม (สามก้น)', 'คล้ายดับเบิลบอททอมแต่พื้นรับได้สามครั้ง ฝั่งซื้อปกป้องราคาเดิมตลอด ยืนยันเมื่อปิดเหนือเส้นคอ', 'ลงมาที่จุดต่ำเดิมสามรอบแล้วเด้งทุกครั้ง แรงขายเริ่มหมด'] },
  hs: { d: -1, i: '1,20 5,10 8,14 13,3 18,14 21,10 25,20', en: ['Head and shoulders', 'Three peaks with the middle one (the head) highest. The last rally (right shoulder) is weaker, showing buyers fading. A close below the neckline joining the two dips confirms a likely move down.', 'Buyers made a higher high (head) but the next rally fell short; momentum is shifting to sellers.'], th: ['หัวและไหล่', 'ยอดสามยอดโดยยอดกลาง (หัว) สูงสุด รอบขึ้นสุดท้าย (ไหล่ขวา) อ่อนกว่า แสดงว่าแรงซื้อแผ่ว ถ้าปิดต่ำกว่าเส้นคอที่ลากผ่านจุดย่อทั้งสองถือว่ายืนยันขาลง', 'ฝั่งซื้อทำจุดสูงใหม่ (หัว) ได้ แต่รอบถัดไปขึ้นไม่ถึง แรงส่งเริ่มเปลี่ยนเป็นฝั่งขาย'] },
  ihs: { d: 1, i: '1,4 5,14 8,10 13,21 18,10 21,14 25,4', en: ['Inverse head and shoulders', 'The upside-down version: three lows with the middle one deepest. The last dip is shallower, showing sellers fading. A close above the neckline confirms a likely move up.', 'Sellers made a lower low (head) but the next drop was shallower; buyers are taking over.'], th: ['หัวและไหล่กลับหัว', 'แบบกลับหัว: จุดต่ำสามจุดโดยจุดกลางลึกสุด รอบลงสุดท้ายตื้นกว่า แสดงว่าแรงขายแผ่ว ถ้าปิดเหนือเส้นคอถือว่ายืนยันขาขึ้น', 'ฝั่งขายกดทำจุดต่ำใหม่ได้ แต่รอบถัดไปลงไม่ลึกเท่า ฝั่งซื้อเริ่มคุม'] },
  atri: { d: 1, i: '2,19 7,6 11,15 15,6 19,11 23,6 25,4', en: ['Ascending triangle', 'A flat ceiling with rising lows. Buyers keep paying higher prices while sellers hold one level. It usually breaks upward; confirmed by a close above the ceiling.', 'Buyers step in at higher and higher prices while sellers keep defending the same ceiling.'], th: ['สามเหลี่ยมขาขึ้น', 'เพดานแบนแต่จุดต่ำยกตัวขึ้นเรื่อย ๆ ฝั่งซื้อยอมจ่ายแพงขึ้น ส่วนฝั่งขายตั้งรับที่ระดับเดิม มักทะลุขึ้น ยืนยันเมื่อปิดเหนือเพดาน', 'ฝั่งซื้อเข้ารับที่ราคาสูงขึ้นทุกรอบ ฝั่งขายยังตั้งรับที่เพดานเดิม'] },
  dtri: { d: -1, i: '2,5 7,18 11,9 15,18 19,13 23,18 25,20', en: ['Descending triangle', 'A flat floor with falling highs. Sellers accept lower and lower prices while buyers hold one level. It usually breaks down; confirmed by a close below the floor.', 'Sellers keep selling at lower prices while buyers defend the same floor.'], th: ['สามเหลี่ยมขาลง', 'พื้นแบนแต่จุดสูงต่ำลงเรื่อย ๆ ฝั่งขายยอมขายถูกลง ฝั่งซื้อรับที่ระดับเดิม มักหลุดลง ยืนยันเมื่อปิดต่ำกว่าพื้น', 'ฝั่งขายยอมขายถูกลงเรื่อย ๆ ฝั่งซื้อยังรับที่พื้นเดิม'] },
  stri: { d: 0, i: '2,4 6,20 10,7 14,17 18,10 22,14 25,12', en: ['Symmetrical triangle', 'Lower highs and higher lows squeeze price into a point. Neither side is winning yet; the breakout direction decides the next move. It needs a close outside one of the lines.', 'Buyers and sellers are both giving ground; the range is tightening before a decision.'], th: ['สามเหลี่ยมสมมาตร', 'จุดสูงต่ำลงและจุดต่ำสูงขึ้น บีบราคาเข้าหากัน ยังไม่มีฝั่งไหนชนะ ทิศทางที่ทะลุจะบอกการเคลื่อนไหวต่อไป ต้องรอปิดนอกเส้นใดเส้นหนึ่ง', 'ทั้งฝั่งซื้อและขายต่างถอย กรอบแคบลงก่อนจะเลือกทาง'] },
  rwedge: { d: -1, i: '2,21 7,11 10,16 15,7 18,10 22,5 25,14', en: ['Rising wedge', 'Price climbs inside two rising lines that are getting closer. Each push up gains less, a sign the rally is tiring. It usually breaks down; confirmed by a close below the lower line.', 'Price is still rising but each push gains less; buyers are tiring.'], th: ['ลิ่มขาขึ้น (Rising wedge)', 'ราคาไต่ขึ้นในเส้นสองเส้นที่ชันขึ้นและบีบเข้าหากัน แต่ละรอบขึ้นได้น้อยลง แสดงว่าแรงขึ้นเริ่มหมด มักหลุดลง ยืนยันเมื่อปิดต่ำกว่าเส้นล่าง', 'ราคายังขึ้นแต่แต่ละรอบได้น้อยลง ฝั่งซื้อเริ่มเหนื่อย'] },
  fwedge: { d: 1, i: '2,3 7,13 10,8 15,17 18,14 22,19 25,10', en: ['Falling wedge', 'Price falls inside two falling lines that are getting closer. Each drop loses less, a sign selling is drying up. It usually breaks up; confirmed by a close above the upper line.', 'Price is still falling but each drop is smaller; sellers are tiring.'], th: ['ลิ่มขาลง (Falling wedge)', 'ราคาไหลลงในเส้นสองเส้นที่ลาดลงและบีบเข้าหากัน แต่ละรอบลงน้อยลง แสดงว่าแรงขายเริ่มหมด มักทะลุขึ้น ยืนยันเมื่อปิดเหนือเส้นบน', 'ราคายังลงแต่แต่ละรอบลงน้อยลง ฝั่งขายเริ่มเหนื่อย'] },
  chup: { d: 1, i: '2,20 7,12 10,16 16,7 19,11 25,3', en: ['Ascending channel', 'Price rises between two parallel lines: higher highs and higher lows. The trend is up while it stays inside. A close below the lower line warns the trend is breaking.', 'Buyers keep the trend up in an orderly way; dips get bought near the lower line.'], th: ['ช่องราคาขาขึ้น', 'ราคาขึ้นระหว่างเส้นขนานสองเส้น จุดสูงและจุดต่ำยกตัว เทรนด์ยังขึ้นตราบที่อยู่ในช่อง ถ้าปิดต่ำกว่าเส้นล่างเป็นสัญญาณเตือนว่าเทรนด์เริ่มเสีย', 'ฝั่งซื้อพาเทรนด์ขึ้นอย่างเป็นระเบียบ ย่อมาใกล้เส้นล่างมีคนรับ'] },
  chdn: { d: -1, i: '2,4 7,12 10,8 16,17 19,13 25,21', en: ['Descending channel', 'Price falls between two parallel lines: lower highs and lower lows. The trend is down while it stays inside. A close above the upper line suggests the downtrend is ending.', 'Sellers keep the trend down; rallies get sold near the upper line.'], th: ['ช่องราคาขาลง', 'ราคาลงระหว่างเส้นขนานสองเส้น จุดสูงและจุดต่ำต่ำลง เทรนด์ยังลงตราบที่อยู่ในช่อง ถ้าปิดเหนือเส้นบนแปลว่าขาลงอาจจบ', 'ฝั่งขายคุมเทรนด์ลง เด้งขึ้นใกล้เส้นบนมีแรงขายออก'] },
  range: { d: 0, i: '2,18 6,6 10,18 14,6 18,18 22,6 25,12', en: ['Range (sideways channel)', 'Price bounces between a flat ceiling and a flat floor. Neither side is in control. Traders buy near the floor and sell near the ceiling until a close outside the box.', 'Buyers defend the floor, sellers defend the ceiling; the market is waiting for news.'], th: ['กรอบไซด์เวย์', 'ราคาวิ่งไปมาระหว่างเพดานแบนและพื้นแบน ยังไม่มีฝั่งไหนคุม คนมักซื้อใกล้พื้นและขายใกล้เพดานจนกว่าจะปิดนอกกรอบ', 'ฝั่งซื้อรับที่พื้น ฝั่งขายขายที่เพดาน ตลาดรอข่าวหรือแรงใหม่'] },
  bflag: { d: 1, i: '2,22 8,5 11,9 14,7 17,11 20,9 25,2', en: ['Bull flag', 'A sharp rise (the pole) followed by a small, gently falling pause (the flag). It is a breather before the next leg up; confirmed by a close above the flag.', 'After a strong burst of buying, traders take small profits but sellers cannot push price far back.'], th: ['ธงขาขึ้น (Bull flag)', 'ราคาพุ่งแรง (เสาธง) แล้วพักตัวลงเบา ๆ ในกรอบแคบ (ธง) เป็นการพักก่อนขึ้นต่อ ยืนยันเมื่อปิดเหนือกรอบธง', 'หลังแรงซื้อพุ่ง มีคนขายทำกำไรบ้างแต่ฝั่งขายกดราคาลงไม่ได้มาก'] },
  sflag: { d: -1, i: '2,2 8,19 11,15 14,17 17,13 20,15 25,22', en: ['Bear flag', 'A sharp drop (the pole) followed by a small, gently rising pause (the flag). It is a pause before the next leg down; confirmed by a close below the flag.', 'After a strong burst of selling, the bounce is weak; buyers cannot win back much ground.'], th: ['ธงขาลง (Bear flag)', 'ราคาร่วงแรง (เสาธง) แล้วเด้งขึ้นเบา ๆ ในกรอบแคบ (ธง) เป็นการพักก่อนลงต่อ ยืนยันเมื่อปิดต่ำกว่ากรอบธง', 'หลังแรงขายถล่ม การเด้งอ่อนแรง ฝั่งซื้อดึงราคากลับได้ไม่มาก'] },
  bpen: { d: 1, i: '2,22 8,4 11,10 14,6 17,9 19,7 25,2', en: ['Bullish pennant', 'A sharp rise followed by a small triangle that tightens. Like a flag, it is a short pause before the trend usually continues up; confirmed by a close above the pennant.', 'After the burst up, buying and selling balance briefly in a tight squeeze.'], th: ['ธงสามเหลี่ยมขาขึ้น (Pennant)', 'ราคาพุ่งแรงแล้วพักตัวเป็นสามเหลี่ยมเล็ก ๆ ที่บีบแคบลง คล้ายธง เป็นการพักสั้น ๆ ก่อนมักขึ้นต่อ ยืนยันเมื่อปิดเหนือกรอบ', 'หลังพุ่งขึ้น แรงซื้อขายสมดุลชั่วคราวในกรอบแคบ'] },
  spen: { d: -1, i: '2,2 8,20 11,14 14,18 17,15 19,17 25,22', en: ['Bearish pennant', 'A sharp drop followed by a small triangle that tightens. It is a short pause before the trend usually continues down; confirmed by a close below the pennant.', 'After the drop, buying and selling balance briefly before sellers usually return.'], th: ['ธงสามเหลี่ยมขาลง (Pennant)', 'ราคาร่วงแรงแล้วพักตัวเป็นสามเหลี่ยมเล็ก ๆ ที่บีบแคบลง เป็นการพักสั้น ๆ ก่อนมักลงต่อ ยืนยันเมื่อปิดต่ำกว่ากรอบ', 'หลังร่วงลง แรงซื้อขายสมดุลชั่วคราวก่อนฝั่งขายมักกลับมา'] },
  cup: { d: 1, i: '2,5 4,12 8,18 13,19 18,18 20,10 21,6 23,9 25,4', en: ['Cup and handle', 'A rounded dip and recovery (the cup) followed by a small pullback (the handle). The slow, round bottom shows selling dried up gradually. Confirmed by a close above the rim.', 'Sellers gave up slowly through the rounded bottom; the small handle shakes out the last weak holders.'], th: ['ถ้วยและหูจับ (Cup & handle)', 'ราคาลงแล้วค่อย ๆ ฟื้นเป็นรูปถ้วย ตามด้วยการย่อเล็ก ๆ (หูจับ) ก้นถ้วยที่โค้งช้า ๆ แสดงว่าแรงขายค่อย ๆ หมด ยืนยันเมื่อปิดเหนือขอบถ้วย', 'ฝั่งขายค่อย ๆ หมดแรงตลอดก้นถ้วย หูจับเป็นการเขย่าคนถือที่ใจไม่แข็งออกไป'] },
};
const PTX = (en, th) => LANG === 'th' ? th : en;
const pName = (ty) => PD[ty][LANG === 'th' ? 'th' : 'en'][0];
const pIcon = (ty, w = 26) => `<svg class="picon" viewBox="0 0 26 24" width="${w}" height="${Math.round(w * 24 / 26)}" aria-hidden="true"><polyline points="${PD[ty].i}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
if (typeof document !== 'undefined') { Object.assign(IV.binance, { '1h': '1h', '1w': '1w' }); Object.assign(IV.bybit, { '1h': '60', '1w': 'W' }); Object.assign(IV.okx, { '1h': '1H', '1w': '1Wutc' }); Object.assign(IV.hyperliquid, { '1h': '1h', '1w': '1w' }); }
async function patCandles(t, tf) {
  const key = t.symbol + ':' + tf, c = PT.cache[key]; if (c && Date.now() - c.at < 5 * 6e4) return c;
  const order = t._src ? [t._src, ...t.sources.filter((s) => s !== t._src)] : t.sources; let best = null; const errs = [];
  for (const s of order) {
    try { const k = await klines(s, tf, 1000); if (!k.length || Date.now() - k[k.length - 1].t > PTF[tf][1] * PTF[tf][2] + 36e5) throw new Error('stale'); if (!best || k.length > best.k.length) best = { k, src: s }; if (best.k.length >= 300) break; }
    catch (e) { errs.push(EXNAME[s.ex] + ': ' + e.message); }
  }
  if (!best) throw new Error(errs.join(' · '));
  best.r = PE.analyze(best.k); best.at = Date.now(); PT.cache[key] = best; return best;
}
const pDate = (ms) => { const d = new Date(ms), intra = PT.tf === '1h' || PT.tf === '4h'; return d.toLocaleDateString(loc(), { month: 'short', day: 'numeric', ...(PT.tf === '1w' ? { year: '2-digit' } : {}) }) + (intra ? ' ' + d.toLocaleTimeString(loc(), { hour: 'numeric', minute: '2-digit' }) + ' ' + tzL(d) : ''); };
const keyAt = (x, n) => x.bi ? null : x.brk(x.o.b >= 0 ? x.o.b : n - 1);
function pStatus(x) { const s = x.o.st; return s === 'confirmed' ? ['ok', PTX('Confirmed', 'ยืนยันแล้ว')] : s === 'inv' ? ['bad', PTX('Invalidated', 'ล้มเหลว')] : ['wait', PTX('Forming', 'กำลังก่อตัว')]; }
function pDirLbl(x) { const d = x.o.st === 'forming' && x.bi ? (PD[x.type].d) : x.dir; return d > 0 ? ['up', PTX('Bullish', 'ขาขึ้น')] : d < 0 ? ['dn', PTX('Bearish', 'ขาลง')] : ['mut', PTX('Neutral', 'เป็นกลาง')]; }
function pText(x, k, sym) {
  const n = k.length, last = k[n - 1].c, th = LANG === 'th', d = (i) => pDate(k[i].t), o = x.o, lab = x.pts.filter((q) => q.lb && q.lb !== 'Neck');
  const LB = { 'Top 1': 'ยอด 1', 'Top 2': 'ยอด 2', 'Top 3': 'ยอด 3', 'Bottom 1': 'ก้น 1', 'Bottom 2': 'ก้น 2', 'Bottom 3': 'ก้น 3', LS: 'ไหล่ซ้าย', Head: 'หัว', RS: 'ไหล่ขวา', Rim: 'ขอบถ้วย', Cup: 'ก้นถ้วย', Handle: 'หูจับ', Pole: 'ฐานเสาธง' };
  const lb = (s) => th ? (LB[s] || s) : s, pc = (a, b) => ((b - a) / a * 100);
  let geo = '';
  if (x.bi) { const W = x.end - x.from, u0 = x.U(x.from), u1 = x.U(x.end), l0 = x.D(x.from), l1 = x.D(x.end);
    geo = th ? `เส้นบนจาก ${px(u0)} ไป ${px(u1)} และเส้นล่างจาก ${px(l0)} ไป ${px(l1)} ใน ${W} แท่ง แตะเส้นรวม ${x.touches} ครั้ง` : `Upper line runs from ${px(u0)} to ${px(u1)} and lower line from ${px(l0)} to ${px(l1)} over ${W} candles, with ${x.touches} touches in total.`;
    if (x.type !== 'chup' && x.type !== 'chdn' && x.type !== 'range') geo += th ? ` กรอบแคบลงจาก ${px(u0 - l0)} เหลือ ${px(u1 - l1)}` : ` The range narrowed from ${px(u0 - l0)} to ${px(u1 - l1)}.`; }
  else if (x.pole) { const A = x.pts[0], B = x.pts[1], m = x.end - B.i; geo = th ? `ราคา${x.dir > 0 ? 'พุ่ง' : 'ร่วง'} ${pct(pc(A.p, B.p), 1)} จาก ${px(A.p)} ไป ${px(B.p)} ใน ${B.i - A.i} แท่ง (เสาธง) แล้วพักตัวในกรอบแคบ ${m} แท่ง` : `Price moved ${pct(pc(A.p, B.p), 1)} from ${px(A.p)} to ${px(B.p)} in ${B.i - A.i} candles (the pole), then paused in a tight range for ${m} candles.`; }
  else geo = (th ? 'จุดสำคัญ: ' : 'Key points: ') + lab.map((q) => `${lb(q.lb)} ${px(q.p)} (${d(q.i)})`).join(' → ') + '.';
  if (x.type === 'dtop' || x.type === 'dbot') { const a = x.pts[0], b = x.pts[2]; geo += th ? ` สองจุดห่างกันเพียง ${Math.abs(pc(a.p, b.p)).toFixed(1)}% และเส้นคออยู่ที่ ${px(x.pts[1].p)}` : ` The two ${x.type === 'dtop' ? 'tops' : 'lows'} are only ${Math.abs(pc(a.p, b.p)).toFixed(1)}% apart, with the neckline at ${px(x.pts[1].p)}.`; }
  const kl = keyAt(x, n), up = x.dir > 0;
  let st;
  if (o.st === 'confirmed') st = th ? `ยืนยันเมื่อ ${d(o.b)}: แท่งเทียนปิด${up ? 'เหนือ' : 'ต่ำกว่า'} ${px(x.bi ? (up ? x.U(o.b) : x.D(o.b)) : kl)}` : `Confirmed on ${d(o.b)}: a candle closed ${up ? 'above' : 'below'} ${px(x.bi ? (up ? x.U(o.b) : x.D(o.b)) : kl)}.`;
  else if (o.st === 'inv') st = th ? `ล้มเหลวเมื่อ ${d(o.at)}: ราคาปิด${o.side ? (o.side > 0 ? 'ทะลุขึ้นผิดทาง' : 'หลุดลงผิดทาง') : (up ? 'ต่ำกว่า' : 'เหนือ') + ' ' + px(x.inv)} แพทเทิร์นจึงใช้ไม่ได้แล้ว` : `Invalidated on ${d(o.at)}: price closed ${o.side ? (o.side > 0 ? 'out of the top, the wrong way' : 'out of the bottom, the wrong way') : (up ? 'below ' : 'above ') + px(x.inv)}, so the setup failed.`;
  else if (x.bi) st = th ? `ยังไม่ทะลุ: ถ้าปิดเหนือ ${px(x.U(n - 1))} หรือต่ำกว่า ${px(x.D(n - 1))} จะเป็นตัวตัดสินทิศทาง` : `No breakout yet: a close above ${px(x.U(n - 1))} or below ${px(x.D(n - 1))} decides the direction.`;
  else st = th ? `ยังไม่ยืนยัน: ต้องมีแท่งปิด${up ? 'เหนือ' : 'ต่ำกว่า'} ${px(kl)} ก่อน จนกว่าจะถึงตอนนั้นเป็นแค่ความเป็นไปได้` : `Not confirmed yet: it needs a candle close ${up ? 'above' : 'below'} ${px(kl)}. Until then it is only a possibility.`;
  const sc = x.score, vr = sc.volR;
  const vol = sc.volKind === 'brk' ? (th ? `วอลุ่มแท่งที่ทะลุ ${vr.toFixed(1)} เท่าของค่าเฉลี่ย 20 แท่ง ${vr >= 1.3 ? '(แรง ช่วยเพิ่มความน่าเชื่อ)' : vr < 1 ? '(บาง การทะลุที่วอลุ่มต่ำมักล้มเหลวบ่อยกว่า)' : '(ปกติ)'}` : `Breakout candle volume was ${vr.toFixed(1)}× the 20-candle average ${vr >= 1.3 ? '(strong, adds conviction)' : vr < 1 ? '(weak; low-volume breakouts fail more often)' : '(about normal)'}.`)
    : sc.volKind === 'peaks' ? (th ? `วอลุ่มที่จุดสุดท้าย${vr < 1 ? 'ต่ำกว่า' : 'สูงกว่า'}จุดแรก (${vr.toFixed(2)} เท่า) ${vr < 0.85 ? 'แรงเริ่มแผ่ว ตรงตามตำรา' : 'ยังไม่เห็นแรงแผ่วชัด'}` : `Volume at the last ${x.dir < 0 ? 'peak' : 'low'} was ${vr < 1 ? 'lower' : 'higher'} than at the first (${vr.toFixed(2)}×): ${vr < 0.85 ? 'fading participation, typical for this pattern.' : 'no clear fade yet.'}`)
    : (th ? `วอลุ่มช่วงหลังของแพทเทิร์น${vr < 0.85 ? 'ลดลง' : 'ไม่ได้ลดลง'} (${vr.toFixed(2)} เท่าของช่วงแรก) ${vr < 0.85 ? 'ตรงตามตำราก่อนการทะลุ' : 'ไม่ค่อยตรงตำรา'}` : `Volume ${vr < 0.85 ? 'shrank' : 'did not shrink'} during the pattern (${vr.toFixed(2)}× the first half): ${vr < 0.85 ? 'typical before a breakout.' : 'less textbook.'}`);
  const hist = sc.y === 0 ? PTX(`No past cases of this pattern on ${sym} ${PTF[PT.tf][0]}; scored neutral.`, `ยังไม่เคยเกิดแพทเทิร์นนี้ในกราฟ ${sym} ${PTF[PT.tf][0]} ให้คะแนนกลาง ๆ`)
    : PTX(`Worked ${sc.w} of ${sc.y} times on ${sym} ${PTF[PT.tf][0]} history${sc.y < 3 ? ' (too few cases to judge; scored neutral)' : sc.y < 8 ? ' (small sample)' : ''}.`, `เคยได้ผล ${sc.w} จาก ${sc.y} ครั้งในกราฟ ${sym} ${PTF[PT.tf][0]}${sc.y < 3 ? ' (ตัวอย่างน้อยเกินไป ให้คะแนนกลาง ๆ)' : sc.y < 8 ? ' (ตัวอย่างยังน้อย)' : ''}`);
  return { geo, st, vol, hist, psych: PD[x.type][th ? 'th' : 'en'][2], last };
}
function pLevels(x, k) {
  const n = k.length, last = k[n - 1].c, o = x.o, th = LANG === 'th', rel = (v) => `<span class="${cls(v - last)}">${pct((v - last) / last * 100, 1)}</span>`;
  if (x.bi && o.st === 'forming') return [[PTX('Key levels', 'ระดับสำคัญ'), `${px(x.U(n - 1))} / ${px(x.D(n - 1))}`], [PTX('Target if up', 'เป้าถ้าขึ้น'), `${px(x.tgtU)} ${rel(x.tgtU)}`], [PTX('Target if down', 'เป้าถ้าลง'), `${px(x.tgtD)} ${rel(x.tgtD)}`]];
  const kl = x.bi ? (x.dir > 0 ? x.U(n - 1) : x.D(n - 1)) : keyAt(x, n);
  return [[PTX(x.bi ? 'Breakout line' : x.pole ? 'Flag edge' : x.type === 'cup' ? 'Rim' : 'Neckline', x.bi ? 'เส้นทะลุ' : x.pole ? 'ขอบธง' : x.type === 'cup' ? 'ขอบถ้วย' : 'เส้นคอ'), px(kl)],
    [PTX('Target', 'เป้าหมาย'), o.st === 'inv' ? '–' : `${px(x.tgt)} ${rel(x.tgt)}`], [PTX('Invalidation', 'จุดยกเลิก'), `${PTX(x.dir > 0 ? 'close below' : 'close above', x.dir > 0 ? 'ปิดต่ำกว่า' : 'ปิดเหนือ')} ${px(x.inv)}`]];
}
function patCard(x, i, k, sym, on) {
  const [sc, sl] = pStatus(x), [dc, dl] = pDirLbl(x), tx = pText(x, k, sym), s = x.score, L1 = PD[x.type][LANG === 'th' ? 'th' : 'en'];
  return `<div class="pcard${on ? ' on' : ''}"><button class="pc-h" data-pi="${i}" aria-expanded="${on}">${pIcon(x.type)}<span class="pc-t"><b>${esc(pName(x.type))}</b><span class="pc-m"><span class="${dc}">${esc(dl)}</span><i>·</i><span class="pst ${sc}">${esc(sl)}</span></span></span><span class="pc-c"><b class="num">${x.conf}%</b><small>${esc(PTX('pattern score', 'คะแนนแพทเทิร์น'))}</small></span><svg class="chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
    <div class="pbar"><i class="${dc}" style="width:${Math.max(3, x.conf)}%"></i></div>
    ${on ? `<div class="pc-b"><p class="pc-sum">${esc(tx.psych)}</p>
      <div class="plv">${pLevels(x, k).map(([a, b]) => `<div><span>${esc(a)}</span><b class="num">${b}</b></div>`).join('')}</div>
      <h4>${esc(PTX('What happened', 'เกิดอะไรขึ้น'))}</h4><p>${esc(tx.geo)} ${esc(tx.st)}</p>
      <h4>${esc(PTX('Volume', 'วอลุ่ม'))}</h4><p>${esc(tx.vol)}</p>
      <h4>${esc(PTX('Track record', 'สถิติย้อนหลัง'))}</h4><p>${esc(tx.hist)}</p>
      <div class="pscore">${[[PTX('Fit', 'ความตรงรูป'), s.fit], [PTX('Volume', 'วอลุ่ม'), s.vol], [PTX('Completion', 'ความคืบหน้า'), s.comp], [PTX('History', 'สถิติ'), s.hist]].map(([a, b]) => `<span>${esc(a)} <b class="num">${b}</b></span>`).join('')}</div>
      <details class="pwhat"><summary>${pIcon(x.type, 30)}<span>${esc(PTX('What is this pattern?', 'แพทเทิร์นนี้คืออะไร?'))}</span></summary><p>${esc(L1[1])}</p></details></div>` : ''}</div>`;
}
function zoneHTML(z, k) {
  const last = k[k.length - 1].c, it = (zz, isS) => zz ? `<div class="pkl"><span class="pkl-l">${esc(isS ? PTX('Support zone', 'โซนแนวรับ') : PTX('Resistance zone', 'โซนแนวต้าน'))}</span><b class="num">${px(zz.lo)} – ${px(zz.hi)}</b><span class="sub">${zz.n} ${esc(PTX('touches', 'ครั้งที่แตะ'))} · <span class="${isS ? 'dn' : 'up'}">${pct(((isS ? zz.hi : zz.lo) - last) / last * 100, 1)}</span></span></div>` : '';
  return z.sup || z.res ? `<div class="pkls">${it(z.sup, true)}${it(z.res, false)}</div>` : '';
}
function renderPat(t, b) {
  const th = LANG === 'th';
  b.innerHTML = `<div class="pat"><div class="chartbar"><span class="sub" id="patSrc">${esc(PTX('Pattern scan', 'สแกนแพทเทิร์น'))}</span><div class="seg sm">${Object.keys(PTF).map((x) => `<button aria-pressed="${PT.tf === x}" data-ptf="${x}">${PTF[x][0]}</button>`).join('')}</div></div>
    <div class="pchart"><div class="chart" id="ch1"><div class="sk" style="height:100%"></div></div><svg class="pov" id="pov" aria-hidden="true"></svg><span class="ptag" id="ptag" hidden>${esc(PTX('Estimate', 'ประมาณการ'))}</span></div>
    <div class="legend plg"><span><i class="pl-s"></i>${esc(PTX('Formed', 'เกิดขึ้นแล้ว'))}</span><span><i class="pl-d"></i>${esc(PTX('Projected (estimate)', 'คาดการณ์ (ประมาณการ)'))}</span><span><i class="pl-x"></i>${esc(PTX('Invalidation', 'จุดยกเลิก'))}</span><span><i class="pl-z"></i>${esc(PTX('Support / resistance zone', 'โซนแนวรับ / แนวต้าน'))}</span></div>
    <div id="patBody"><div class="sk" style="height:64px;margin-top:16px"></div><div class="sk" style="height:64px;margin-top:10px"></div></div></div>`;
  const wrap = $('.pat', b);
  wrap.addEventListener('click', (e) => { const f = e.target.closest('[data-ptf]'); if (f) { if (PT.tf !== f.dataset.ptf) { PT.tf = f.dataset.ptf; PT.sel = 0; PT.c = null; PT.cur = null; killCharts(); renderPat(t, b); } return; }
    const c = e.target.closest('[data-pi]'); if (c) { const i = +c.dataset.pi; PT.sel = PT.sel === i ? -1 : i; patDraw(); patCards(); } });
  const rq = ++PT.req;
  patCandles(t, PT.tf).then((d) => { if (rq !== PT.req || S.tab !== 'pat' || S.sel !== t.symbol || !$('#pov')) return; PT.cur = { d, t }; if (PT.sel >= d.r.cands.length) PT.sel = 0; patChart(); patCards(); })
    .catch((e) => { if (rq !== PT.req || !$('#patBody')) return; $('#ch1').innerHTML = ''; $('#patBody').innerHTML = `<p class="err">${esc(T('feedFail'))}: ${esc(e.message)}</p>`; });
}
function patCards() {
  const { d, t } = PT.cur, k = d.k, r = d.r, el = $('#patBody'); if (!el) return;
  $('#patSrc').textContent = `${PTX('Pattern scan', 'สแกนแพทเทิร์น')} · ${EXNAME[d.src.ex]} ${d.src.pair} · ${k.length} ${PTX('candles', 'แท่ง')}`;
  const head = `<div class="pat-h"><h3>${esc(PTX('Detected patterns', 'แพทเทิร์นที่พบ'))}</h3><span class="sub">${esc(PTX('Rule-based · updated', 'ตามกฎ · อัปเดต'))} ${esc(lTime(d.at))}</span></div>`;
  const body = r.short ? `<div class="pempty"><b>${esc(PTX('Not enough history', 'ข้อมูลย้อนหลังไม่พอ'))}</b><p>${esc(PTX(`Only ${k.length} candles on this timeframe. Pattern rules need at least 60. Try a shorter timeframe.`, `กรอบเวลานี้มีเพียง ${k.length} แท่ง ต้องมีอย่างน้อย 60 แท่ง ลองกรอบเวลาที่สั้นลง`))}</p></div>`
    : r.cands.length ? r.cands.map((x, i) => patCard(x, i, k, t.symbol, PT.sel === i)).join('')
    : `<div class="pempty">${pIcon('range', 34)}<b>${esc(PTX('No clear pattern right now', 'ตอนนี้ยังไม่มีแพทเทิร์นชัดเจน'))}</b><p>${esc(PTX('No shape on this chart passes the rules closely enough. That is normal; most of the time price is not in a textbook pattern. Check another timeframe or the key zones below.', 'ยังไม่มีรูปแบบไหนบนกราฟนี้ผ่านเกณฑ์ได้ใกล้พอ ซึ่งเป็นเรื่องปกติ ส่วนใหญ่ราคาไม่ได้อยู่ในแพทเทิร์นตามตำรา ลองดูกรอบเวลาอื่นหรือโซนสำคัญด้านล่าง'))}</p></div>`;
  el.innerHTML = head + body + zoneHTML(r.zones, k) + `<details class="pmeth"><summary>${esc(PTX('How this works', 'ระบบนี้ทำงานอย่างไร'))}</summary><p>${esc(PTX('Patterns are found by fixed maths rules on real candles from the exchange, not by AI. The app marks swing highs and lows (scaled to normal volatility), then checks them against each pattern\'s geometry with set tolerances. A pattern is confirmed only after a candle closes beyond its neckline or edge. Pattern score = 40% fit quality + 20% volume + 20% completion + 20% how often the same pattern worked on this token and timeframe before. Targets use the classic measured move and are estimates, not predictions. Not financial advice.', 'แพทเทิร์นหาด้วยกฎคณิตศาสตร์ตายตัวจากแท่งเทียนจริงของกระดานเทรด ไม่ใช่ AI ระบบจะหาจุดสูง/ต่ำสำคัญ (ปรับตามความผันผวนปกติ) แล้วเทียบกับรูปทรงของแต่ละแพทเทิร์นภายในค่าคลาดเคลื่อนที่กำหนด จะยืนยันเมื่อแท่งเทียนปิดผ่านเส้นคอหรือขอบเท่านั้น คะแนนแพทเทิร์น = 40% ความตรงรูป + 20% วอลุ่ม + 20% ความคืบหน้า + 20% สถิติที่แพทเทิร์นเดียวกันเคยได้ผลในเหรียญและกรอบเวลานี้ เป้าหมายใช้วิธีวัดระยะแบบคลาสสิก เป็นการประมาณ ไม่ใช่คำทำนาย ไม่ใช่คำแนะนำการลงทุน'))}</p></details>`;
}
function patChart() {
  const { d } = PT.cur, k = d.k, n = k.length, C = chartColors(), el = $('#ch1'); el.innerHTML = '';
  const c = mkChart('#ch1'); c.applyOptions({ timeScale: { timeVisible: PT.tf === '1h' || PT.tf === '4h' }, handleScale: { axisPressedMouseMove: { time: true, price: false } } });
  const intra = PT.tf === '1h' || PT.tf === '4h', pts = (ms) => Math.floor(ms / 1000) + (intra ? -new Date(ms).getTimezoneOffset() * 60 : 0);
  const cs = c.addCandlestickSeries({ upColor: C.up, downColor: C.dn, borderVisible: false, wickUpColor: C.up, wickDownColor: C.dn, priceLineVisible: false }); cs.setData(k.map((x) => ({ time: pts(x.t), open: x.o, high: x.h, low: x.l, close: x.c }))); S.live = {};
  const vs = c.addHistogramSeries({ priceScaleId: 'vol', priceLineVisible: false, lastValueVisible: false }); c.priceScale('vol').applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
  vs.setData(k.map((x) => ({ time: pts(x.t), value: x.q || x.v, color: x.c >= x.o ? C.upA.replace(/[\d.]+\)$/, '.22)') : C.dnA.replace(/[\d.]+\)$/, '.22)') })));
  cs.applyOptions({ autoscaleInfoProvider: (orig) => { const r = orig(), x = PT.cur && PT.cur.d.r.cands[PT.sel]; if (!r || !x) return r; const lv = [x.inv, ...(x.o.st === 'inv' ? [] : x.bi && x.o.st === 'forming' ? [x.tgtU, x.tgtD] : [x.tgt])].filter((v) => v != null && isFinite(v));
    return { priceRange: { minValue: Math.min(r.priceRange.minValue, ...lv), maxValue: Math.max(r.priceRange.maxValue, ...lv) }, margins: r.margins }; } });
  PT.c = c; PT.cs = cs; PT.k = k;
  let raf = 0; const rd = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(patSvg); };
  c.timeScale().subscribeVisibleLogicalRangeChange(rd); c.timeScale().subscribeSizeChange(rd);
  patDraw();
}
function patDraw() { // set view for the selected pattern, then redraw overlay
  if (!PT.c || !PT.cur) return; const k = PT.k, n = k.length, x = PT.cur.d.r.cands[PT.sel];
  const span = Math.min(n, $('#ch1').clientWidth < 600 ? 90 : 150); let from = n - span, proj = 10;
  if (x) { const w = x.end - x.from; from = Math.min(n - 60, x.from - Math.max(12, Math.round(w * 0.8))); proj = Math.max(8, Math.min(30, Math.round((x.end - x.from) * 0.45))); }
  PT.proj = proj; PT.c.timeScale().setVisibleLogicalRange({ from: Math.max(0, from), to: n - 1 + proj + 2 });
  requestAnimationFrame(patSvg);
}
function patSvg() { try { patSvg0(); } catch (e) { /* chart torn down mid-frame */ } }
function patSvg0() {
  const sv = $('#pov'); if (!sv || !PT.c) return; const c = PT.c, cs = PT.cs, k = PT.k, n = k.length, r = PT.cur.d.r, x = r.cands[PT.sel];
  const W = $('#ch1').clientWidth, H = $('#ch1').clientHeight, pw = W - c.priceScale('right').width(), tsH = c.timeScale().height();
  const X = (i) => c.timeScale().logicalToCoordinate(i), Y = (p) => cs.priceToCoordinate(p), ok = (v) => v != null && isFinite(v);
  sv.setAttribute('viewBox', `0 0 ${W} ${H}`); sv.setAttribute('width', W); sv.setAttribute('height', H);
  let s = `<defs><clipPath id="pclip"><rect x="0" y="0" width="${pw}" height="${H - tsH}"/></clipPath></defs><g clip-path="url(#pclip)">`;
  const ln = (i1, p1, i2, p2, cl) => { const a = X(i1), b = Y(p1), c2 = X(i2), d = Y(p2); return ok(a) && ok(b) && ok(c2) && ok(d) ? `<line x1="${a.toFixed(1)}" y1="${b.toFixed(1)}" x2="${c2.toFixed(1)}" y2="${d.toFixed(1)}" class="${cl}"/>` : ''; };
  const tx = (i, p, str, cl, dy = 0, anchor = 'middle') => { const a = X(i), b = Y(p); return ok(a) && ok(b) ? `<text x="${a.toFixed(1)}" y="${(b + dy).toFixed(1)}" text-anchor="${anchor}" class="${cl}">${esc(str)}</text>` : ''; };
  const zone = (z, cl) => { if (!z) return ''; const a = Y(z.hi), b = Y(z.lo); return ok(a) && ok(b) ? `<rect x="0" y="${a.toFixed(1)}" width="${pw}" height="${Math.max(1, b - a).toFixed(1)}" class="${cl}"/>` : ''; };
  s += zone(r.zones.sup, 'pz') + zone(r.zones.res, 'pz');
  const lst = n - 1, pe = lst + PT.proj, th = LANG === 'th'; let est = false;
  if (x) {
    const o = x.o, dc = x.dir > 0 ? 'up' : x.dir < 0 ? 'dn' : 'mut', endL = o.b >= 0 ? Math.min(lst, o.b + 2) : lst;
    if (x.pole) s += ln(x.pts[0].i, x.pts[0].p, x.pts[1].i, x.pts[1].p, 'ps pole');
    else if (!x.bi && x.type !== 'cup') s += `<polyline class="ps zz" points="${x.pts.map((q) => { const a = X(q.i), b = Y(q.p); return ok(a) && ok(b) ? a.toFixed(1) + ',' + b.toFixed(1) : ''; }).filter(Boolean).join(' ')}"/>`;
    if (x.arc) { const [a, m, b2] = x.arc, A = [X(a), Y(k[a].h)], M = [X(m), Y(k[m].l)], B = [X(b2), Y(k[b2].h)]; if ([...A, ...M, ...B].every(ok)) s += `<path class="ps zz" d="M${A[0]},${A[1]} Q${M[0]},${2 * M[1] - (A[1] + B[1]) / 2} ${B[0]},${B[1]}"/>`; }
    x.lines.forEach((l) => { if (l.kind === 'pole') return; const f = l.f || L2f(l.a, l.b); s += ln(l.a.i, l.a.p, l.b.i, l.b.p, 'ps ' + (l.kind === 'neck' ? 'neck' : 'edge')); if (l.ext) s += ln(l.b.i, l.b.p, endL, f(endL), 'pdash'); });
    if (x.bi && o.b >= 0) {} // edges already extended to breakout
    x.pts.forEach((q) => { const hi = k[q.i] && Math.abs(q.p - k[q.i].h) <= Math.abs(q.p - k[q.i].l); const a = X(q.i), b = Y(q.p); if (ok(a) && ok(b)) s += `<circle cx="${a.toFixed(1)}" cy="${b.toFixed(1)}" r="3" class="pdot"/>`;
      if (q.lb && q.lb !== 'Neck') { const LB = { 'Top 1': 'ยอด 1', 'Top 2': 'ยอด 2', 'Top 3': 'ยอด 3', 'Bottom 1': 'ก้น 1', 'Bottom 2': 'ก้น 2', 'Bottom 3': 'ก้น 3', LS: 'ไหล่ซ้าย', Head: 'หัว', RS: 'ไหล่ขวา', Rim: 'ขอบ', Cup: 'ก้นถ้วย', Handle: 'หูจับ', Pole: 'เสาธง' };
        s += tx(q.i, q.p, th ? (LB[q.lb] || q.lb) : q.lb, 'plb', hi ? -20 : 26) + tx(q.i, q.p, px(q.p), 'plb sub2', hi ? -8 : 38); } });
    const nk = x.lines.find((l) => l.kind === 'neck'); if (nk && x.type !== 'cup') { const f = L2f(nk.a, nk.b); s += tx(endL, f(endL), (th ? (x.type === 'cup' ? 'ขอบถ้วย ' : 'เส้นคอ ') : (x.type === 'cup' ? 'Rim ' : 'Neckline ')) + px(f(endL)), 'plb side', -6, 'end'); }
    if (o.st !== 'inv') {
      const proj1 = (fromI, fromP, tgt, cl, label) => { est = true; const yz = Math.abs(tgt - fromP) * 0.08; let z = ''; const a = X(lst), b = X(pe), y1 = Y(tgt + yz), y2 = Y(tgt - yz); if ([a, b, y1, y2].every(ok)) z = `<rect x="${a.toFixed(1)}" y="${Math.min(y1, y2).toFixed(1)}" width="${(b - a).toFixed(1)}" height="${Math.abs(y2 - y1).toFixed(1)}" class="pzone ${cl}"/>`;
        return z + ln(fromI, fromP, pe - 1, tgt, 'pproj ' + cl) + tx(pe, tgt, label, 'plb side ' + cl, tgt > fromP ? -8 : 16, 'end'); };
      const lab = (v) => `${th ? 'เป้า' : 'Target'} ~${px(v)}`;
      if (x.bi && o.st === 'forming') { s += proj1(lst, x.U(lst), x.tgtU, 'up', (th ? 'ทะลุขึ้น → ' : 'Break up → ') + px(x.tgtU)) + proj1(lst, x.D(lst), x.tgtD, 'dn', (th ? 'หลุดลง → ' : 'Break down → ') + px(x.tgtD)); }
      else { const fp = o.b >= 0 ? k[lst].c : (x.bi ? (x.dir > 0 ? x.U(lst) : x.D(lst)) : x.brk(lst)); s += proj1(lst, fp, x.tgt, dc, lab(x.tgt) + (th ? ' (ประมาณ)' : ' (estimate)'));
        s += ln(x.end, x.inv, pe, x.inv, 'pinv') + tx(pe, x.inv, (th ? (x.dir > 0 ? 'ยกเลิกถ้าต่ำกว่า ' : 'ยกเลิกถ้าเหนือ ') : (x.dir > 0 ? 'Invalid below ' : 'Invalid above ')) + px(x.inv), 'plb side pinvt', x.dir > 0 ? 16 : -8, 'end'); }
    }
  }
  sv.innerHTML = s + '</g>'; const tg = $('#ptag'); if (tg) tg.hidden = !est;
}
const L2f = (a, b) => (i) => a.p + (b.p - a.p) * (i - a.i) / ((b.i - a.i) || 1);
if (typeof I18N !== 'undefined') { I18N.en.tabs.pat = 'Patterns'; I18N.th.tabs.pat = 'แพทเทิร์น'; }
