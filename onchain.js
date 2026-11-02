/* Crypto Watch – On-chain: Chains / Flows / Health. Data: onchain.json (precomputed daily from DefiLlama free API). */
'use strict';
const X = (en, th) => (LANG === 'th' ? th : en);
const OC = { data: null, loading: null, err: null, sort: { k: 'tvl', d: -1 }, sel: null, metric: 'tvl', range: 90, win: 7, hsel: null, prevSankey: null };
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const CHAIN_COLOR = { Ethereum: '#627EEA', Bitcoin: '#F7931A', Base: '#2f6bff', Solana: '#9a5cf5', Tron: '#e0324a', BSC: '#e0a800', 'Hyperliquid L1': '#3fbfae', Arbitrum: '#28A0F0', 'Robinhood Chain': '#7cb342', Monad: '#836EF9', Polygon: '#8247E5', Avalanche: '#E84142', Arc: '#64748b', Plasma: '#14a37f', Sui: '#4DA2FF', 'OP Mainnet': '#ff0420' };
const OFF = '__off', OTHER = '__other';
const ccol = (n) => CHAIN_COLOR[n] || (n === OFF ? '#9ca3af' : n === OTHER ? '#a1a1aa' : '#8a8a92');
const cname = (n) => n === OFF ? X('Off-chain / CEX', 'นอกเชน / CEX') : n === OTHER ? X('Other chains', 'เชนอื่น ๆ') : n === 'Hyperliquid L1' ? 'Hyperliquid' : n;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lin = (v, lo, hi) => clamp((v - lo) / (hi - lo)) * 100; // lo->0, hi->100
const sbig = (v) => v == null || isNaN(v) ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + big(Math.abs(v));
const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ---------- count-up ---------- */
const CU = new Map();
const FMT = { big: (v) => big(v), sbig, pct: (v) => pct(v, 1), int: (v) => Math.round(v).toString(), px: (v) => px(v), r2: (v) => v.toFixed(2), apr: (v) => pct(v, 1), f4: (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(4) + '%' };
function countUps(root = document) {
  $$('[data-cu]', root).forEach((el) => {
    const k = el.dataset.cu, v = +el.dataset.v, f = FMT[el.dataset.f] || String; if (isNaN(v)) return;
    const from = CU.has(k) ? CU.get(k) : (el.dataset.f === 'int' ? 0 : v * 0.6); CU.set(k, v);
    if (RM() || from === v) { el.textContent = f(v); return; }
    const t0 = performance.now(), d = 650;
    const step = (now) => { const p = clamp((now - t0) / d); el.textContent = f(from + (v - from) * (1 - Math.pow(1 - p, 3))); if (p < 1 && el.isConnected) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
const cu = (key, v, f, c = '') => v == null || isNaN(v) ? `<span class="${c}">–</span>` : `<span class="num ${c}" data-cu="${esc(key)}" data-v="${v}" data-f="${f}">${FMT[f](v)}</span>`;

/* ---------- morphing area chart (SVG) ---------- */
function resample(a, n) { if (!a.length) return Array(n).fill(0); if (a.length === 1) return Array(n).fill(a[0]); const o = []; for (let i = 0; i < n; i++) { const x = i * (a.length - 1) / (n - 1), j = Math.floor(x), f = x - j; o.push(a[j] + ((a[j + 1] ?? a[j]) - a[j]) * f); } return o; }
function mchart(el, pts, o = {}) {
  const N = 96, W = Math.max(280, el.clientWidth || 600), H = o.h || 220, pr = 56, pt = 10, pb = 22, iw = W - pr, ih = H - pt - pb;
  const vals = pts.map((p) => p.v), ts_ = pts.map((p) => p.t);
  let mn = Math.min(...vals), mx = Math.max(...vals); if (o.zero) mn = Math.min(0, mn); const padv = (mx - mn) * 0.08 || Math.abs(mx) * 0.05 || 1; mn = o.zero && mn >= 0 ? 0 : mn - padv; mx += padv;
  const tgt = resample(vals, N).map((v) => pt + ih - (v - mn) / (mx - mn) * ih);
  const color = o.color || 'var(--ac)';
  if (!el._svg || el._W !== W || el._H !== H) {
    el.innerHTML = `<svg class="mch" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none"><defs><linearGradient id="mg${o.id || 'x'}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".16"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><g class="gy"></g><g class="gx"></g><path class="ar" fill="url(#mg${o.id || 'x'})"/><path class="ln" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line class="hv" y1="${pt}" y2="${pt + ih}" stroke="var(--line2)" visibility="hidden"/><circle class="hd" r="3.5" fill="${color}" stroke="var(--bg)" stroke-width="2" visibility="hidden"/></svg><div class="mtip" hidden></div>`;
    el._svg = $('svg', el); el._W = W; el._H = H; el._ys = null;
    el.addEventListener('pointermove', (e) => { const r = el._svg.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * W; if (x > iw) return hide(); const i = Math.round(clamp(x / iw) * (N - 1)); const d = el._d; if (!d) return;
      const raw = Math.round(i * (d.vals.length - 1) / (N - 1)); const xx = i * iw / (N - 1), yy = el._ys[i];
      $('.hv', el).setAttribute('x1', xx); $('.hv', el).setAttribute('x2', xx); $('.hv', el).setAttribute('visibility', 'visible'); const c = $('.hd', el); c.setAttribute('cx', xx); c.setAttribute('cy', yy); c.setAttribute('visibility', 'visible');
      const tp = $('.mtip', el); tp.hidden = false; tp.innerHTML = `<small>${new Date(d.ts[raw] * 1000).toLocaleDateString(loc(), { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</small><b class="num">${esc(d.fmt(d.vals[raw]))}</b>`;
      tp.style.left = clamp(xx / W * r.width - 60, 0, r.width - 130) + 'px'; });
    const hide = () => { $('.hv', el)?.setAttribute('visibility', 'hidden'); $('.hd', el)?.setAttribute('visibility', 'hidden'); const tp = $('.mtip', el); if (tp) tp.hidden = true; };
    el.addEventListener('pointerleave', hide);
  }
  const fmt = o.fmt || big; el._d = { vals, ts: ts_, fmt };
  const gy = $('.gy', el); gy.innerHTML = [0, .5, 1].map((f) => { const y = pt + ih * (1 - f); return `<line x1="0" x2="${iw}" y1="${y}" y2="${y}" stroke="var(--line)" ${f === 0 ? '' : 'stroke-dasharray="2 4"'}/><text x="${W - 4}" y="${y + 4}" text-anchor="end">${esc(fmt(mn + (mx - mn) * f))}</text>`; }).join('');
  const dl = (t) => new Date(t * 1000).toLocaleDateString(loc(), { month: 'short', day: 'numeric', timeZone: 'UTC' });
  $('.gx', el).innerHTML = ts_.length ? `<text x="0" y="${H - 6}">${dl(ts_[0])}</text><text x="${iw / 2}" y="${H - 6}" text-anchor="middle">${dl(ts_[Math.floor(ts_.length / 2)])}</text><text x="${iw}" y="${H - 6}" text-anchor="end">${dl(ts_[ts_.length - 1])}</text>` : '';
  const draw = (ys) => { const xs = (i) => (i * iw / (N - 1)).toFixed(1); const d = ys.map((y, i) => (i ? 'L' : 'M') + xs(i) + ',' + y.toFixed(1)).join(''); $('.ln', el).setAttribute('d', d); $('.ar', el).setAttribute('d', d + `L${iw},${pt + ih}L0,${pt + ih}Z`); el._ys = ys; };
  const from = el._ys || tgt.map(() => pt + ih);
  cancelAnimationFrame(el._raf);
  if (RM()) return draw(tgt);
  const t0 = performance.now(); const step = (now) => { const p = ease(clamp((now - t0) / 520)); draw(from.map((f, i) => f + (tgt[i] - f) * p)); if (p < 1) el._raf = requestAnimationFrame(step); }; el._raf = requestAnimationFrame(step);
}
const sparkS = (a, up) => { const v = a.filter((x) => x != null); if (v.length < 2) return ''; const mn = Math.min(...v), mx = Math.max(...v); const pts = v.map((x, i) => `${(i / (v.length - 1) * 100).toFixed(1)},${(23 - (x - mn) / (mx - mn || 1) * 21).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="${(up ?? v[v.length - 1] >= v[0]) ? 'var(--up)' : 'var(--dn)'}" stroke-width="1.4" vector-effect="non-scaling-stroke" points="${pts}"/></svg>`; };

/* ---------- metrics ---------- */
async function ensureOC(force) {
  if (OC.data && !force) return OC.data;
  if (!OC.loading || force) OC.loading = getJSON('onchain.json?ts=' + (force ? Date.now() : Math.floor(Date.now() / 36e5)), {}, 30000).then((d) => { OC.data = d; OC.err = null; return d; }).catch((e) => { OC.err = e.message; OC.loading = null; throw e; });
  return OC.loading;
}
const at = (a, i) => (a && i >= 0 && a[i] != null ? a[i] : null);
const sumW = (a, L, w) => { if (!a) return null; let s = 0; for (let i = L - w + 1; i <= L; i++) s += a[i] || 0; return s; };
const chgW = (a, L, w) => { const x = at(a, L), y = at(a, L - w); return x != null && y ? (x / y - 1) * 100 : null; };
const BETA = 0.5; // assumed share of a chain's TVL that moves with its native token price
function flowM(c, w) {
  const L = OC.data.days.length - 1, t1 = at(c.tvl, L), t0 = at(c.tvl, L - w), s1 = at(c.stables, L), s0 = at(c.stables, L - w), p1 = at(c.price, L), p0 = at(c.price, L - w);
  const r = p1 && p0 ? p1 / p0 - 1 : 0;
  const bridge = t1 != null && t0 != null ? t1 - t0 * (1 + r * BETA) : 0;
  const stable = s1 != null && s0 != null ? s1 - s0 : 0;
  const net = bridge + stable, gross = sumW(c.bridge_agg, L, w) || 0;
  return { bridge, stable, net, inc: gross / 2 + Math.max(net, 0), out: gross / 2 + Math.max(-net, 0), gross };
}
function chainRow(c) {
  const L = OC.data.days.length - 1;
  return { c, name: c.name, tvl: at(c.tvl, L), d1: chgW(c.tvl, L, 1), d7: chgW(c.tvl, L, 7), d30: chgW(c.tvl, L, 30), st: at(c.stables, L), st7: chgW(c.stables, L, 7),
    br1: flowM(c, 1).bridge, br7: flowM(c, 7).bridge, fees: at(c.fees, L), rev: at(c.revenue, L), dex: at(c.dex, L),
    dex7: c.dex ? (sumW(c.dex, L, 7) / (sumW(c.dex, L - 7, 7) || NaN) - 1) * 100 : null, fees7: c.fees ? (sumW(c.fees, L, 7) / (sumW(c.fees, L - 7, 7) || NaN) - 1) * 100 : null };
}
const growth = (a, L, w) => a ? ((sumW(a, L, w) / (sumW(a, L - w, w) || NaN)) - 1) * 100 : null;
function fqs(c) { // Flow Quality Score, 30d basis
  const L = OC.data.days.length - 1, f30 = flowM(c, 30); let pos = 0;
  for (let i = L - 29; i <= L; i++) { const t1 = at(c.tvl, i), t0 = at(c.tvl, i - 1), p1 = at(c.price, i), p0 = at(c.price, i - 1), s1 = at(c.stables, i), s0 = at(c.stables, i - 1);
    const d = (t1 != null && t0 != null ? t1 - t0 * (1 + ((p1 && p0) ? p1 / p0 - 1 : 0) * BETA) : 0) + (s1 != null && s0 != null ? s1 - s0 : 0); if (d >= 0) pos++; }
  const t0 = at(c.tvl, L - 30) || 1, tvl = at(c.tvl, L) || 1, st = at(c.stables, L);
  const ret = 0.6 * (pos / 30) * 100 + 0.4 * lin(f30.bridge / t0 * 100, -10, 10);
  const stg = c.stables ? lin(chgW(c.stables, L, 30) ?? 0, -10, 10) : null;
  const dep = st ? clamp(tvl / st) * 100 : null;
  const feeY = c.fees ? sumW(c.fees, L, 30) * 12.17 / tvl * 100 : null, dexT = c.dex ? sumW(c.dex, L, 30) / tvl : null;
  const org = feeY == null && dexT == null ? null : ((feeY != null ? lin(Math.log10(1 + feeY), 0, Math.log10(31)) : 0) + (dexT != null ? lin(Math.log10(1 + dexT), 0, Math.log10(6)) : 0)) / ((feeY != null) + (dexT != null));
  const gs = [growth(c.fees, L, 30), growth(c.dex, L, 30)].filter((x) => x != null && isFinite(x)); const act = gs.length ? lin(gs.reduce((a, b) => a + b, 0) / gs.length, -50, 50) : null;
  const comp = [['ret', X('Retention', 'เงินอยู่ต่อ'), ret, 25], ['stg', X('Stablecoin growth', 'สเตเบิลคอยน์โต'), stg, 20], ['dep', X('DeFi deployment', 'นำเงินไปใช้ใน DeFi'), dep, 15], ['org', X('Organic usage', 'การใช้งานจริง'), org, 25], ['act', X('Activity growth', 'กิจกรรมโต'), act, 15]];
  const ok = comp.filter((x) => x[2] != null); const score = ok.reduce((s, x) => s + x[2] * x[3], 0) / (ok.reduce((s, x) => s + x[3], 0) || 1);
  return { score, comp, f30 };
}
function fqsText(c, q) {
  const ok = q.comp.filter((x) => x[2] != null).sort((a, b) => b[2] - a[2]); const hi = ok[0], lo = ok[ok.length - 1]; const n = cname(c.name), s = q.score;
  const lead = s >= 65 ? X(`${n}'s inflows look sticky and productive.`, `เงินที่ไหลเข้า ${n} ดูอยู่ยาวและถูกใช้งานจริง`) : s >= 45 ? X(`${n}'s flows are mixed.`, `กระแสเงินของ ${n} ยังก้ำกึ่ง`) : X(`${n}'s flows look weak or speculative.`, `กระแสเงินของ ${n} ยังอ่อนหรือเป็นเงินร้อน`);
  return `${lead} ${X(`Strongest: ${hi[1].toLowerCase()} (${hi[2].toFixed(0)}). Weakest: ${lo[1].toLowerCase()} (${lo[2].toFixed(0)}).`, `จุดแข็งคือ${hi[1]} (${hi[2].toFixed(0)}) ส่วนจุดอ่อนคือ${lo[1]} (${lo[2].toFixed(0)})`)}`;
}
function healthM(c) {
  const L = OC.data.days.length - 1, tvl = at(c.tvl, L) || 1;
  const tv30 = chgW(c.tvl, L, 30), tv90 = chgW(c.tvl, L, 90);
  const comp = [
    ['tvl', X('TVL trend', 'แนวโน้ม TVL'), tv30 == null ? null : 0.6 * lin(tv30, -20, 20) + 0.4 * lin(tv90 ?? tv30, -40, 40)],
    ['st', X('Stablecoins', 'สเตเบิลคอยน์'), c.stables ? lin(chgW(c.stables, L, 30) ?? 0, -10, 10) : null],
    ['fee', X('Fees & revenue', 'ค่าธรรมเนียม/รายได้'), (() => { const g = [growth(c.fees, L, 30), growth(c.revenue, L, 30)].filter((x) => x != null && isFinite(x)); return g.length ? lin(g.reduce((a, b) => a + b, 0) / g.length, -50, 50) : null; })()],
    ['act', X('Activity', 'กิจกรรม'), (() => { const g = growth(c.dex, L, 30); return g != null && isFinite(g) ? lin(g, -50, 50) : null; })()],
    ['conc', X('Decentralization', 'การกระจุกตัว'), c.protocols && c.protocols.length ? 100 - lin(c.hhi, 0.05, 0.45) : null],
    ['sec', X('Security', 'ความปลอดภัย'), 100 - lin((c.hacks_usd_365 || 0) / tvl * 100, 0, 5) * 0.8 - Math.min(20, (c.hacks_n_365 || 0) * 0.15)]];
  const ok = comp.filter((x) => x[2] != null); const score = ok.reduce((s, x) => s + x[2], 0) / (ok.length || 1);
  const verdict = score >= 62 ? 'Healthy' : score >= 45 ? 'Cooling' : 'At risk';
  return { score, comp, verdict, tv30 };
}
const VD = { Healthy: ['Long', 'Healthy', 'แข็งแรง'], Cooling: ['Wait', 'Cooling', 'เริ่มชะลอ'], 'At risk': ['Avoid', 'At risk', 'น่าห่วง'] };
const vtag = (v) => `<span class="vd ${VD[v][0]}">${esc(X(VD[v][1], VD[v][2]))}</span>`;
function healthText(c, h) {
  const n = cname(c.name), ok = h.comp.filter((x) => x[2] != null).sort((a, b) => a[2] - b[2]), lo = ok[0], hi = ok[ok.length - 1];
  const base = h.verdict === 'Healthy' ? X(`${n} is in good shape: capital and usage are holding up.`, `${n} ยังแข็งแรงดี เงินทุนและการใช้งานยังไปได้ดี`) : h.verdict === 'Cooling' ? X(`${n} is cooling off: some metrics are slipping, but nothing is breaking.`, `${n} เริ่มชะลอตัว มีบางตัวชี้วัดที่แผ่วลง แต่ยังไม่มีอะไรน่ากังวลมาก`) : X(`${n} needs caution: several signals are weakening at once.`, `${n} ต้องระวัง สัญญาณหลายตัวอ่อนแรงลงพร้อมกัน`);
  const hk = c.hacks_n_365 ? X(` ${c.hacks_n_365} exploit${c.hacks_n_365 > 1 ? 's' : ''} on DefiLlama in the past year (${big(c.hacks_usd_365)} lost).`, ` ปีที่ผ่านมามีโดนแฮก ${c.hacks_n_365} ครั้งตามข้อมูล DefiLlama (เสียหาย ${big(c.hacks_usd_365)})`) : X(' No exploits recorded in the past year.', ' ปีที่ผ่านมาไม่มีบันทึกการโดนแฮก');
  return base + ' ' + X(`Best: ${hi[1].toLowerCase()} (${hi[2].toFixed(0)}). Weakest: ${lo[1].toLowerCase()} (${lo[2].toFixed(0)}).`, `จุดแข็ง: ${hi[1]} (${hi[2].toFixed(0)}) จุดอ่อน: ${lo[1]} (${lo[2].toFixed(0)})`) + hk;
}

/* ---------- radar ---------- */
function radar(el, comp, size, key) {
  const n = comp.length, R = size / 2 - (size > 120 ? 34 : 4), cx = size / 2, cy = size / 2, sm = size <= 120;
  const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v / 100, cy + Math.sin(a) * R * v / 100]; };
  const tgt = comp.map((x) => x[2] ?? 0);
  if (!el._r || el._size !== size) {
    const rings = [25, 50, 75, 100].map((v) => `<polygon points="${comp.map((_, i) => pt(i, v).join(',')).join(' ')}" fill="none" stroke="var(--line)" ${v < 100 ? 'stroke-dasharray="2 3"' : ''}/>`).join('');
    const spokes = comp.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, 100)[0]}" y2="${pt(i, 100)[1]}" stroke="var(--line)"/>`).join('');
    el.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="radar">${rings}${spokes}<polygon class="rp" fill="var(--ac-sf)" stroke="var(--ac)" stroke-width="1.5" stroke-linejoin="round"/>${sm ? '' : comp.map((x, i) => { const [x1, y1] = pt(i, 122); return `<text x="${x1}" y="${y1 + 4}" text-anchor="${Math.abs(x1 - cx) < 4 ? 'middle' : x1 > cx ? 'start' : 'end'}">${esc(x[1])}</text>`; }).join('')}</svg>`;
    el._r = $('.rp', el); el._size = size; el._v = null;
  } else if (!sm) $$('text', el).forEach((t, i) => t.textContent = comp[i][1]);
  const from = el._v || tgt.map(() => 0); const draw = (v) => { el._r.setAttribute('points', v.map((x, i) => pt(i, Math.max(2, x)).join(',')).join(' ')); el._v = v; };
  if (RM()) return draw(tgt);
  const t0 = performance.now(); cancelAnimationFrame(el._raf); const step = (now) => { const p = ease(clamp((now - t0) / 600)); draw(from.map((f, i) => f + (tgt[i] - f) * p)); if (p < 1) el._raf = requestAnimationFrame(step); }; el._raf = requestAnimationFrame(step);
}

/* ---------- page shell ---------- */
const SUBS = ['chains', 'flows', 'health'];
const clogo = (c, cl = '') => c.logo ? `<img class="logo ${cl}" src="${esc(c.logo)}" alt="" loading="lazy">` : `<span class="logo lt ${cl}">${esc(cname(c.name).slice(0, 1))}</span>`;
const nodeLogo = (n, cl) => { const c = OC.data.chains.find((x) => x.name === n); return c ? clogo(c, cl) : `<span class="logo lt ${cl}">·</span>`; };
async function pOnchain(soft) {
  const sub = SUBS.includes(S.sub) ? S.sub : 'chains'; S.sub = sub;
  const m = $('#main');
  const seg = `<div class="subnav seg">${SUBS.map((s) => `<a href="#/onchain/${s}" aria-pressed="${s === sub}" role="button">${esc(T(s))}</a>`).join('')}</div>`;
  const head = pageHead(T(sub), `<span class="sub" id="ocUpd"></span>`);
  if (!(soft && $('#oc') && $('#oc').dataset.sub === sub)) m.innerHTML = `<div class="page" id="oc" data-sub="${sub}">${seg}${head}<div id="ocBody"><div class="sk" style="height:18px;width:40%"></div><div class="sk" style="height:300px;margin-top:16px"></div></div></div>`;
  try { await ensureOC(); } catch (e) { $('#ocBody').innerHTML = `<p class="err">onchain.json: ${esc(e.message)} <button data-ocretry>${esc(T('retry'))}</button></p>`; return; }
  if (S.route !== 'onchain' || S.sub !== sub) return;
  $('#ocUpd').textContent = X('DefiLlama · updated ', 'DefiLlama · อัปเดต ') + jst(new Date(OC.data.updated));
  ({ chains: ocChains, flows: ocFlows, health: ocHealth })[sub](soft);
  countUps($('#ocBody'));
}

/* ---------- CHAINS ---------- */
const COLS = () => [['name', X('Chain', 'เชน'), 'l'], ['tvl', 'TVL'], ['d1', '1d'], ['d7', '7d'], ['d30', '30d'], ['st', X('Stablecoins', 'สเตเบิล')], ['st7', X('Stables 7d', 'สเตเบิล 7d')], ['br1', X('Net flow 24h*', 'เงินไหลสุทธิ 24ชม.*')], ['br7', X('Net flow 7d*', 'เงินไหลสุทธิ 7d*')], ['fees', X('Fees 24h', 'ค่าธรรมเนียม 24ชม.')], ['rev', X('Revenue 24h', 'รายได้ 24ชม.')], ['dex', X('DEX vol 24h', 'วอลุ่ม DEX 24ชม.')], ['dex7', X('DEX 7d', 'DEX 7d')], ['sp', X('TVL 30d', 'TVL 30 วัน'), 'l']];
function ocChains(soft) {
  const rows = OC.data.chains.map(chainRow); const { k, d } = OC.sort;
  rows.sort((a, b) => k === 'name' ? d * a.name.localeCompare(b.name) : d * ((a[k] ?? -Infinity) - (b[k] ?? -Infinity)));
  if (!OC.sel) OC.sel = rows[0].name;
  const L = OC.data.days.length - 1;
  const cell = (r, key) => { const v = r[key];
    if (key === 'name') return `<td><div class="tok">${clogo(r.c)}<div><b>${esc(cname(r.name))}</b><small>${esc(r.c.symbol || '')}</small></div></div></td>`;
    if (key === 'sp') return `<td>${sparkS(r.c.tvl.slice(L - 30))}</td>`;
    if (['d1', 'd7', 'd30', 'st7', 'dex7'].includes(key)) return `<td class="num ${cls(v)}">${v == null || !isFinite(v) ? '–' : pct(v, 1)}</td>`;
    if (key === 'br1' || key === 'br7') return `<td class="num ${cls(v)}">${sbig(v)}</td>`;
    return `<td class="num">${v == null ? '–' : big(v)}</td>`; };
  const prev = $('#ocBody .tbl-wrap'); const sx = prev ? prev.scrollLeft : 0;
  const tbl = `<div class="tbl-wrap"><table class="ov sortable"><thead><tr>${COLS().map(([key, n, l]) => `<th class="${l || ''}" ${key !== 'sp' ? `data-ocsort="${key}" aria-sort="${k === key ? (d > 0 ? 'ascending' : 'descending') : 'none'}"` : ''}>${esc(n)}${k === key ? `<span class="arr">${d > 0 ? '↑' : '↓'}</span>` : ''}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr data-ocrow="${esc(r.name)}" class="${OC.sel === r.name ? 'sel' : ''}">${COLS().map(([key]) => cell(r, key)).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="sub note">${esc(X('* Estimated: DefiLlama bridge data is paid-only, so net flow = price-adjusted TVL change. Tap a row for charts and top protocols.', '* ค่าประมาณ: ข้อมูลบริดจ์ของ DefiLlama ต้องเสียเงิน จึงประมาณเงินไหลสุทธิจากการเปลี่ยนแปลงของ TVL ที่ตัดผลราคาออกแล้ว แตะแถวเพื่อดูกราฟและโปรโตคอลหลัก'))}</p>`;
  if (!$('#ocBody #chTbl')) $('#ocBody').innerHTML = `<div id="chTbl"></div><section class="detail" id="chDet"></section>`;
  $('#chTbl').innerHTML = tbl; const w = $('#chTbl .tbl-wrap'); w.scrollLeft = sx; const f = () => w.classList.toggle('scrolled', w.scrollLeft > 2); w.addEventListener('scroll', f, { passive: true }); f();
  chainDetail();
}
const METRICS = () => [['tvl', 'TVL'], ['stables', X('Stablecoins', 'สเตเบิลคอยน์')], ['fees', X('Fees', 'ค่าธรรมเนียม')], ['dex', X('DEX volume', 'วอลุ่ม DEX')]];
function chainDetail() {
  const c = OC.data.chains.find((x) => x.name === OC.sel); const el = $('#chDet'); if (!c || !el) return;
  const r = chainRow(c), L = OC.data.days.length - 1, q = fqs(c);
  const kv = (l, v, d = '') => `<div><div class="eyebrow">${esc(l)}</div><div class="v">${v}</div><div class="d">${d || '&nbsp;'}</div></div>`;
  const same = el.dataset.c === c.name;
  if (!same) {
    el.dataset.c = c.name;
    el.innerHTML = `<div class="dh">${clogo(c, 'lg')}<div><div class="nm">${esc(c.symbol || X('No native token', 'ไม่มีเหรียญหลัก'))}</div><div><span class="big">${esc(cname(c.name))}</span></div></div></div>
      <div class="kv" id="chKv"></div>
      <div class="chartbar mt"><div class="tabs" role="tablist" id="chMet"></div><div class="seg sm" id="chRng"></div></div>
      <div class="mchart" id="chChart"></div>
      <div class="sec two"><div><div class="sec-h"><h2>${esc(X('Top protocols', 'โปรโตคอลหลัก'))}</h2><span class="sub">${esc(X('share of chain TVL', 'สัดส่วนของ TVL'))}</span></div><div class="plist" id="chProt"></div></div>
      <div><div class="sec-h"><h2>${esc(X('Flow quality', 'คุณภาพกระแสเงิน'))}</h2><span class="sub">30d</span></div><div id="chFq"></div></div></div>`;
  }
  $('#chKv').innerHTML = kv('TVL', cu('ck-tvl', r.tvl, 'big'), `<span class="${cls(r.d7)}">${pct(r.d7, 1)}</span> 7d`) + kv(X('Stablecoins', 'สเตเบิลคอยน์'), cu('ck-st', r.st, 'big'), r.st7 != null ? `<span class="${cls(r.st7)}">${pct(r.st7, 1)}</span> 7d` : '')
    + kv(X('Fees 30d', 'ค่าธรรมเนียม 30 วัน'), cu('ck-f', sumW(c.fees, L, 30), 'big'), c.revenue ? X('Revenue ', 'รายได้ ') + big(sumW(c.revenue, L, 30)) : '') + kv(X('DEX vol 30d', 'วอลุ่ม DEX 30 วัน'), cu('ck-d', sumW(c.dex, L, 30), 'big'), r.dex7 != null && isFinite(r.dex7) ? `<span class="${cls(r.dex7)}">${pct(r.dex7, 1)}</span> ${X('wk/wk', 'เทียบสัปดาห์ก่อน')}` : '')
    + kv(X('Net flow 30d*', 'เงินไหลสุทธิ 30 วัน*'), cu('ck-n', q.f30.net, 'sbig', cls(q.f30.net)), X('bridge* + stablecoins', 'บริดจ์* + สเตเบิล')) + kv(X('Protocols', 'โปรโตคอล'), cu('ck-p', c.protocol_count, 'int'), X('top-1 share ', 'อันดับ 1 ครอง ') + (c.protocols[0] ? (c.protocols[0].share * 100).toFixed(0) + '%' : '–'));
  const ms = METRICS().filter(([k]) => c[k]); if (!c[OC.metric]) OC.metric = 'tvl';
  $('#chMet').innerHTML = ms.map(([k, n]) => `<button class="tab" aria-selected="${OC.metric === k}" data-ocm="${k}">${esc(n)}</button>`).join('');
  $('#chRng').innerHTML = [30, 90, 365].map((d) => `<button data-ocr="${d}" aria-pressed="${OC.range === d}">${d === 365 ? '1Y' : d + 'D'}</button>`).join('');
  const a = c[OC.metric], days = OC.data.days; const pts = []; for (let i = L - OC.range + 1; i <= L; i++) if (a[i] != null) pts.push({ t: days[i], v: a[i] });
  // smooth daily flow metrics with a 7d mean on long ranges
  const sm = (OC.metric === 'fees' || OC.metric === 'dex') && OC.range > 30 ? pts.map((p, i) => ({ t: p.t, v: pts.slice(Math.max(0, i - 6), i + 1).reduce((s, x) => s + x.v, 0) / Math.min(7, i + 1) })) : pts;
  mchart($('#chChart'), sm, { h: innerWidth < 600 ? 200 : 260, id: 'ch', color: ccol(c.name) === '#e0a800' ? 'var(--ac)' : 'var(--ac)', zero: OC.metric !== 'tvl' && OC.metric !== 'stables' });
  $('#chProt').innerHTML = c.protocols.length ? c.protocols.slice(0, 8).map((p) => `<a class="prow" ${p.url ? `href="${esc(p.url)}" target="_blank" rel="noopener"` : ''}>${p.logo ? `<img class="logo sm" src="${esc(p.logo)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<span class="logo sm lt">·</span>'}<div class="pn"><b>${esc(p.name)}</b><small>${esc(p.category || '')}</small></div><div class="pb"><i style="width:${(p.share * 100).toFixed(1)}%"></i></div><span class="num pv">${big(p.tvl)}</span><span class="num pc ${cls(p.change_7d)}">${p.change_7d != null ? pct(p.change_7d, 1) : ''}</span></a>`).join('') : `<p class="mut">${esc(X('No protocol breakdown on DefiLlama.', 'DefiLlama ไม่มีข้อมูลแยกโปรโตคอล'))}</p>`;
  $('#chFq').innerHTML = fqsBlock(c, q, 'd');
  countUps(el);
}
function fqsBlock(c, q, k) {
  return `<div class="score"><div class="sc-n">${cu('fq-' + k + c.name, q.score, 'int')}<small>/100</small></div><p>${esc(fqsText(c, q))}</p></div>
    <div class="bars">${q.comp.map(([id, n, v, w]) => `<div class="bar-r"><span>${esc(n)} <small class="mut">${w}%</small></span><div class="bt"><i style="width:${v == null ? 0 : v.toFixed(0)}%"></i></div><b class="num">${v == null ? '–' : v.toFixed(0)}</b></div>`).join('')}</div>`;
}

/* ---------- FLOWS ---------- */
function ocFlows() {
  const w = OC.win; const rows = OC.data.chains.map((c) => ({ c, m: flowM(c, w), q: fqs(c) })).sort((a, b) => b.m.net - a.m.net);
  if (!$('#ocBody #flowWrap')) $('#ocBody').innerHTML = `<div id="flowWrap"><div class="chartbar"><div class="seg" id="flWin"></div><span class="sub" id="flSum"></span></div><div class="sankey" id="sankey"></div>
    <p class="sub note">${esc(X('Estimated routes. DefiLlama route-level bridge data is paid-only, so each chain\'s net flow is estimated (price-adjusted TVL change + stablecoin supply change) and outflows are split across inflow chains in proportion to their size. The gap is shown as off-chain / CEX.', 'เส้นทางเป็นค่าประมาณ เพราะข้อมูลบริดจ์รายเส้นทางของ DefiLlama ต้องเสียเงิน เราจึงประมาณเงินไหลสุทธิของแต่ละเชน (TVL ที่ตัดผลราคาออก + สเตเบิลคอยน์ที่เพิ่มหรือลด) แล้วกระจายเงินที่ไหลออกไปยังเชนที่มีเงินไหลเข้าตามสัดส่วน ส่วนต่างที่เหลือแสดงเป็นนอกเชน / CEX'))}</p>
    <div class="sec"><div class="sec-h"><h2>${esc(X('Net flows', 'เงินไหลสุทธิ'))}</h2></div><div class="tbl-wrap" id="flTbl"></div></div>
    <div class="sec"><div class="sec-h"><h2>${esc(X('Flow Quality Score', 'คะแนนคุณภาพกระแสเงิน'))}</h2><span class="sub">${esc(X('30d · is new money sticking and being used?', '30 วัน · เงินใหม่อยู่ต่อและถูกใช้งานจริงไหม'))}</span></div><div class="fqgrid" id="fqGrid"></div>
    <p class="sub note">${esc(X('Unique depositors and active addresses are not available from a free source, so organic usage uses fees and DEX volume relative to TVL as the proxy.', 'ไม่มีแหล่งข้อมูลฟรีสำหรับจำนวนผู้ฝากหรือ Active address จึงใช้ค่าธรรมเนียมและวอลุ่ม DEX เทียบกับ TVL แทนการใช้งานจริง'))}</p></div></div>`;
  $('#flWin').innerHTML = [[1, '24h'], [7, '7d'], [30, '30d']].map(([d, n]) => `<button data-ocwin="${d}" aria-pressed="${w === d}">${n}</button>`).join('');
  const tot = rows.reduce((s, r) => s + r.m.net, 0), top = rows[0];
  $('#flSum').innerHTML = `${esc(X('Tracked chains net', 'รวมทุกเชนสุทธิ'))} <b class="num ${cls(tot)}">${sbig(tot)}</b> · ${esc(X('top inflow', 'ไหลเข้ามากสุด'))} <b>${esc(cname(top.c.name))}</b>`;
  sankey($('#sankey'), rows.map((r) => ({ name: r.c.name, v: r.m.net })));
  $('#flTbl').innerHTML = `<table class="ov"><thead><tr><th>${esc(X('Chain', 'เชน'))}</th><th>${esc(X('Incoming*', 'ไหลเข้า*'))}</th><th>${esc(X('Outgoing*', 'ไหลออก*'))}</th><th>${esc(X('Net bridge*', 'บริดจ์สุทธิ*'))}</th><th>${esc(X('Net stablecoin', 'สเตเบิลสุทธิ'))}</th><th>${esc(X('Net flow*', 'สุทธิรวม*'))}</th><th class="l">${esc(X('Flow quality', 'คุณภาพ'))}</th></tr></thead><tbody>${rows.map(({ c, m, q }) => `<tr data-ocgo="${esc(c.name)}"><td><div class="tok">${clogo(c)}<div><b>${esc(cname(c.name))}</b></div></div></td><td class="num">${big(m.inc)}</td><td class="num">${big(m.out)}</td><td class="num ${cls(m.bridge)}">${sbig(m.bridge)}</td><td class="num ${cls(m.stable)}">${c.stables ? sbig(m.stable) : '–'}</td><td class="num ${cls(m.net)}"><b>${sbig(m.net)}</b></td><td class="l"><div class="minibar"><i style="width:${q.score.toFixed(0)}%"></i></div><span class="num">${q.score.toFixed(0)}</span></td></tr>`).join('')}</tbody></table>`;
  const tw = $('#flTbl'); const f = () => tw.classList.toggle('scrolled', tw.scrollLeft > 2); tw.onscroll = f; f();
  $('#fqGrid').innerHTML = rows.slice().sort((a, b) => b.q.score - a.q.score).map(({ c, q }) => `<div class="fqc"><div class="tok">${clogo(c)}<div><b>${esc(cname(c.name))}</b></div><span class="sc num">${q.score.toFixed(0)}</span></div>${fqsBlock(c, q, 'g').replace(/<div class="score">[\s\S]*?<\/div><p>/, '<p class="fqt">')}</div>`).join('');
}
function sankey(el, items) {
  const outs = items.filter((x) => x.v < 0).map((x) => ({ id: x.name, v: -x.v })).sort((a, b) => b.v - a.v), ins = items.filter((x) => x.v > 0).map((x) => ({ id: x.name, v: x.v })).sort((a, b) => b.v - a.v);
  const group = (a, n) => a.length <= n ? a : [...a.slice(0, n - 1), { id: OTHER, v: a.slice(n - 1).reduce((s, x) => s + x.v, 0) }];
  const phone = el.clientWidth < 600; let Ls = group(outs, phone ? 5 : 7), Rs = group(ins, phone ? 5 : 7);
  const sL = Ls.reduce((s, x) => s + x.v, 0), sR = Rs.reduce((s, x) => s + x.v, 0);
  if (sR > sL) Ls.push({ id: OFF, v: sR - sL }); else if (sL > sR) Rs.push({ id: OFF, v: sL - sR });
  const total = Math.max(sL, sR) || 1;
  const W = Math.max(320, el.clientWidth), H = phone ? 340 : 400, lw = phone ? 96 : 150, nw = 8, gap = phone ? 8 : 10;
  const lay = (arr, x) => { const k = (H - gap * (arr.length - 1)) / total; let y = 0; return arr.map((n) => { const h = Math.max(2, n.v * k); const o = { ...n, x, y, h, k }; y += h + gap; return o; }); };
  const LN = lay(Ls, lw), RN = lay(Rs, W - lw - nw);
  const links = []; const offR = {}; LN.forEach((l) => { let oy = l.y; RN.forEach((r) => { const v = l.v * r.v / total; const h = v * l.k; const ry = r.y + (offR[r.id] || 0); offR[r.id] = (offR[r.id] || 0) + v * r.k; links.push({ id: l.id + '>' + r.id, s: l.id, t: r.id, v, sy: oy, sh: h, ty: ry, th: v * r.k }); oy += h; }); });
  const target = { nodes: [...LN.map((n) => ({ ...n, side: 'L' })), ...RN.map((n) => ({ ...n, side: 'R' }))], links };
  if (!el._init || el._W !== W) {
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H + 4}" width="100%" height="${H + 4}" role="img" aria-label="${esc(X('Estimated cross-chain flows', 'กระแสเงินข้ามเชน (ประมาณ)'))}"><defs></defs><g class="lk"></g><g class="pt"></g><g class="nd"></g></svg><div class="mtip" hidden></div>`;
    el._init = true; el._W = W; el._cur = null; el._els = {};
    el.addEventListener('pointermove', (e) => { const g = e.target.closest('[data-l]'); const tp = $('.mtip', el); if (!g) { tp.hidden = true; $$('.lk path', el).forEach((p) => p.classList.remove('dim', 'hi')); return; }
      const l = el._tgt.links.find((x) => x.id === g.dataset.l); if (!l) return; $$('.lk path', el).forEach((p) => { p.classList.toggle('hi', p.dataset.l === l.id); p.classList.toggle('dim', p.dataset.l !== l.id); });
      const r = el.getBoundingClientRect(); tp.hidden = false; tp.innerHTML = `<small>${esc(cname(l.s))} → ${esc(cname(l.t))} · ${esc(X('est.', 'ประมาณ'))}</small><b class="num">${big(l.v)}</b>`; tp.style.left = clamp(e.clientX - r.left - 70, 0, r.width - 170) + 'px'; tp.style.top = (e.clientY - r.top - 58) + 'px'; });
    el.addEventListener('pointerleave', () => { $('.mtip', el).hidden = true; $$('.lk path', el).forEach((p) => p.classList.remove('dim', 'hi')); });
  }
  el._tgt = target;
  const svgE = $('svg', el), defs = $('defs', svgE), gL = $('.lk', svgE), gP = $('.pt', svgE), gN = $('.nd', svgE), NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, parent, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
  // ensure elements per key
  const want = new Set();
  target.links.forEach((l) => { want.add('l' + l.id); if (!el._els['l' + l.id]) { const gid = 'sg' + Math.random().toString(36).slice(2, 8);
      const gr = mk('linearGradient', defs, { id: gid, gradientUnits: 'userSpaceOnUse', x1: lw + nw, x2: W - lw - nw, y1: 0, y2: 0 }); mk('stop', gr, { offset: '0', 'stop-color': ccol(l.s) }); mk('stop', gr, { offset: '1', 'stop-color': ccol(l.t) });
      const p = mk('path', gL, { fill: `url(#${gid})`, 'data-l': l.id, class: 'rib' }); const q = mk('path', gP, { class: 'flow', fill: 'none' }); q.style.animationDelay = (-Math.random() * 3).toFixed(2) + 's';
      el._els['l' + l.id] = { p, q, gr }; } });
  target.nodes.forEach((n) => { const k = 'n' + n.side + n.id; want.add(k); if (!el._els[k]) { const g = mk('g', gN, { class: 'node' }); mk('rect', g, { width: nw, rx: 2, fill: ccol(n.id) }); const t = mk('text', g, {}); el._els[k] = { g, t }; } });
  const prev = el._cur || { nodes: target.nodes.map((n) => ({ ...n, h: 0, y: n.y + n.h / 2 })), links: target.links.map((l) => ({ ...l, sh: 0, th: 0, sy: l.sy + l.sh / 2, ty: l.ty + l.th / 2 })) };
  const pm = new Map(prev.nodes.map((n) => ['n' + n.side + n.id, n])), plm = new Map(prev.links.map((l) => ['l' + l.id, l]));
  const x0 = lw + nw, x1 = W - lw - nw, xm = (x0 + x1) / 2;
  const fmtV = (v) => big(v);
  const frame = (p) => {
    const cur = { nodes: [], links: [] };
    target.nodes.forEach((n) => { const k = 'n' + n.side + n.id, a = pm.get(k) || { y: n.y + n.h / 2, h: 0 }; const y = a.y + (n.y - a.y) * p, h = a.h + (n.h - a.h) * p; cur.nodes.push({ ...n, y, h });
      const e = el._els[k]; e.g.style.opacity = 1; const r = e.g.firstChild; r.setAttribute('x', n.x); r.setAttribute('y', y + 2); r.setAttribute('height', Math.max(1, h));
      const ty = y + 2 + h / 2; const lx = n.side === 'L' ? n.x - 8 : n.x + nw + 8; e.t.setAttribute('x', lx); e.t.setAttribute('y', ty); e.t.setAttribute('text-anchor', n.side === 'L' ? 'end' : 'start');
      e.t.innerHTML = `<tspan class="tn" x="${lx}" dy="${h > 26 ? -3 : 4}">${esc(cname(n.id))}</tspan>${h > 26 ? `<tspan class="tv" x="${lx}" dy="14">${n.side === 'L' ? '−' : '+'}${esc(fmtV(n.v))}</tspan>` : ''}`; });
    target.links.forEach((l) => { const k = 'l' + l.id, a = plm.get(k) || { sy: l.sy + l.sh / 2, sh: 0, ty: l.ty + l.th / 2, th: 0 };
      const sy = a.sy + (l.sy - a.sy) * p + 2, sh = a.sh + (l.sh - a.sh) * p, ty = a.ty + (l.ty - a.ty) * p + 2, th = a.th + (l.th - a.th) * p; cur.links.push({ ...l, sy: sy - 2, sh, ty: ty - 2, th });
      const e = el._els[k]; e.p.setAttribute('d', `M${x0},${sy}C${xm},${sy} ${xm},${ty} ${x1},${ty}L${x1},${ty + th}C${xm},${ty + th} ${xm},${sy + sh} ${x0},${sy + sh}Z`);
      const cy0 = sy + sh / 2, cy1 = ty + th / 2; e.q.setAttribute('d', `M${x0},${cy0}C${xm},${cy0} ${xm},${cy1} ${x1},${cy1}`); e.q.style.strokeWidth = clamp(Math.min(sh, th) * 0.45, 0, 3.2).toFixed(2); e.q.style.opacity = Math.min(sh, th) < 1.2 ? 0 : '';
    });
    el._cur = cur;
  };
  // remove stale keys (fade out)
  Object.keys(el._els).forEach((k) => { if (!want.has(k)) { const e = el._els[k]; [e.p, e.q, e.g, e.gr].forEach((x) => x && x.remove()); delete el._els[k]; } });
  cancelAnimationFrame(el._raf);
  if (RM() || !el._cur) { if (RM()) { frame(1); el.classList.add('still'); return; } }
  const t0 = performance.now(); const step = (now) => { const p = ease(clamp((now - t0) / 700)); frame(p); if (p < 1) el._raf = requestAnimationFrame(step); }; el._raf = requestAnimationFrame(step);
}

/* ---------- HEALTH ---------- */
function ocHealth() {
  const hs = OC.data.chains.map((c) => ({ c, h: healthM(c) })).sort((a, b) => b.h.score - a.h.score);
  if (!OC.hsel) OC.hsel = hs[0].c.name;
  const s = hs.find((x) => x.c.name === OC.hsel) || hs[0];
  if (!$('#ocBody #hWrap')) $('#ocBody').innerHTML = `<div id="hWrap"><section class="hdet" id="hDet"></section><div class="sec"><div class="sec-h"><h2>${esc(X('All chains', 'ทุกเชน'))}</h2><span class="sub">${esc(X('tap a card', 'แตะการ์ดเพื่อดูรายละเอียด'))}</span></div><div class="hgrid" id="hGrid"></div></div>
    <p class="sub note">${esc(X('Score 0–100 from 30/90-day DefiLlama trends: TVL, stablecoins, fees and revenue, DEX activity, protocol concentration (HHI of protocol TVL) and exploits in the past year. 62+ Healthy, 45–62 Cooling, under 45 At risk.', 'คะแนน 0–100 จากแนวโน้ม 30/90 วันของ DefiLlama ได้แก่ TVL สเตเบิลคอยน์ ค่าธรรมเนียมและรายได้ กิจกรรม DEX การกระจุกตัวของโปรโตคอล และการโดนแฮกในรอบปี 62 ขึ้นไป = แข็งแรง, 45–62 = เริ่มชะลอ, ต่ำกว่า 45 = น่าห่วง'))}</p></div>`;
  const c = s.c, h = s.h;
  if ($('#hDet').dataset.c !== c.name || $('#hDet').dataset.lang !== LANG) {
    $('#hDet').dataset.c = c.name; $('#hDet').dataset.lang = LANG;
    $('#hDet').innerHTML = `<div class="hd-l"><div class="dh">${clogo(c, 'lg')}<div><div class="nm">${esc(X('Chain health', 'สุขภาพเชน'))}</div><div class="big">${esc(cname(c.name))}</div></div></div>
      <div class="score"><div class="sc-n" id="hScore"></div><div id="hVd"></div></div><p class="take" id="hTxt"></p><div class="bars" id="hBars"></div><div id="hHacks"></div></div><div class="hd-r" id="hRadar"></div>`;
  }
  $('#hScore').innerHTML = cu('hs-' + c.name, h.score, 'int') + '<small>/100</small>'; $('#hVd').innerHTML = vtag(h.verdict); $('#hTxt').textContent = healthText(c, h);
  $('#hBars').innerHTML = h.comp.map(([id, n, v]) => `<div class="bar-r"><span>${esc(n)}</span><div class="bt"><i style="width:${v == null ? 0 : v.toFixed(0)}%"></i></div><b class="num">${v == null ? '–' : v.toFixed(0)}</b></div>`).join('');
  $('#hHacks').innerHTML = c.hacks.length ? `<div class="eyebrow mt">${esc(X('Recent exploits', 'เหตุการณ์โดนแฮกล่าสุด'))}</div><div class="hacks">${c.hacks.slice(0, 4).map((k) => `<div><span class="mut num">${new Date(k.date * 1000).toLocaleDateString(loc(), { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span><b>${esc(k.name)}</b><span class="num dn">${k.amount ? big(k.amount) : '–'}</span></div>`).join('')}</div>` : '';
  radar($('#hRadar'), h.comp, innerWidth < 600 ? Math.min(330, innerWidth - 40) : 340, 'big');
  $('#hGrid').innerHTML = hs.map(({ c, h }) => `<button class="hcard ${c.name === OC.hsel ? 'on' : ''}" data-hsel="${esc(c.name)}"><div class="tok">${clogo(c)}<div><b>${esc(cname(c.name))}</b>${vtag(h.verdict)}</div></div><div class="hc-r"><div class="mini" data-mini="${esc(c.name)}"></div><span class="num sc">${h.score.toFixed(0)}</span></div></button>`).join('');
  $$('[data-mini]').forEach((m) => { const x = hs.find((y) => y.c.name === m.dataset.mini); radar(m, x.h.comp, 56, 'm'); });
  countUps($('#hDet'));
}

/* ---------- events ---------- */
document.addEventListener('click', (e) => {
  const q = (s) => e.target.closest(s); let el;
  if ((el = q('[data-ocsort]'))) { const k = el.dataset.ocsort; OC.sort = { k, d: OC.sort.k === k ? -OC.sort.d : (k === 'name' ? 1 : -1) }; return ocChains(); }
  if ((el = q('[data-ocrow]'))) { OC.sel = el.dataset.ocrow; $$('[data-ocrow]').forEach((r) => r.classList.toggle('sel', r.dataset.ocrow === OC.sel)); chainDetail(); $('#chDet').scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'start' }); return; }
  if ((el = q('[data-ocm]'))) { OC.metric = el.dataset.ocm; return chainDetail(); }
  if ((el = q('[data-ocr]'))) { OC.range = +el.dataset.ocr; return chainDetail(); }
  if ((el = q('[data-ocwin]'))) { OC.win = +el.dataset.ocwin; ocFlows(); return; }
  if ((el = q('[data-ocgo]'))) { OC.sel = el.dataset.ocgo; location.hash = '#/onchain/chains'; return; }
  if ((el = q('[data-hsel]'))) { OC.hsel = el.dataset.hsel; ocHealth(); if (innerWidth < 1024) $('#hDet').scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'start' }); return; }
  if ((el = q('[data-ocretry]'))) { OC.loading = null; pOnchain(); }
});
let ocRz; addEventListener('resize', () => { clearTimeout(ocRz); ocRz = setTimeout(() => { if (S.route === 'onchain' && OC.data) { const sk = $('#sankey'); if (sk) sk._init = false; pOnchain(true); } }, 200); });
