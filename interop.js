/* KMS Capital – Flows: L2BEAT-style interop map. Data: interop.json, extracted every 2h from l2beat.com/interop/summary (24h). */
'use strict';
const IX = { d: null, sel: null, a: null, b: null, sheet: false };
const tr2 = (x) => (Math.floor(x * 100 + 1e-9) / 100).toFixed(2); // L2BEAT truncates to 2 decimals
const u2 = (v) => v == null || isNaN(v) ? '–' : (v < 0 ? '−' : '') + '$' + ((a) => a >= 1e9 ? tr2(a / 1e9) + 'B' : a >= 1e6 ? tr2(a / 1e6) + 'M' : a >= 1e3 ? tr2(a / 1e3) + 'K' : tr2(a))(Math.abs(v));
const su2 = (v) => (v > 0 ? '+' : '') + u2(v);
const n2 = (v) => v == null ? '–' : v >= 1e6 ? tr2(v / 1e6) + 'M' : v >= 1e3 ? tr2(v / 1e3) + 'K' : String(Math.round(v));
const dur = (s) => s == null ? '–' : s < 60 ? Math.round(s) + 's' : s < 3600 ? Math.floor(s / 60) + 'm ' + Math.round(s % 60) + 's' : Math.floor(s / 3600) + 'h ' + Math.round(s % 3600 / 60) + 'm';
const durOf = (a) => !a ? null : a.type === 'single' ? a.duration : a.duration ?? null;
const ixC = (id) => IX.d.chains.find((c) => c.id === id) || { id, name: id, color: '#888' };
const ixIco = (u, cl = '') => u ? `<img class="ixi ${cl}" src="${esc(u)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : `<span class="ixi ${cl}"></span>`;
const full = () => IX.sel.size === IX.d.chains.length;

async function ixLoad(force) {
  if (IX.d && !force) return IX.d;
  IX.d = await getJSON('interop.json?ts=' + (force ? Date.now() : Math.floor(Date.now() / 6e5)), {}, 30000);
  if (!IX.sel) IX.sel = new Set(IX.d.chains.map((c) => c.id));
  return IX.d;
}
/* recompute everything that the flow rows determine for the current chain selection */
function ixAgg() {
  const rows = IX.d.flows.filter((f) => IX.sel.has(f.srcChain) && IX.sel.has(f.dstChain) && f.volume > 0);
  const ch = {}; IX.d.chains.forEach((c) => ch[c.id] = { inflow: 0, outflow: 0, tIn: 0, tOut: 0, peers: new Set() });
  let vol = 0, tr = 0;
  rows.forEach((f) => { vol += f.volume; tr += f.transferCount; const s = ch[f.srcChain], t = ch[f.dstChain]; if (!s || !t) return;
    s.outflow += f.volume; s.tOut += f.transferCount; t.inflow += f.volume; t.tIn += f.transferCount; s.peers.add(f.dstChain); t.peers.add(f.srcChain); });
  for (const k in ch) { const c = ch[k]; c.total = c.inflow + c.outflow; c.net = c.inflow - c.outflow; c.tr = c.tIn + c.tOut; }
  const top = rows.slice().sort((a, b) => b.volume - a.volume)[0];
  const tc = Object.entries(ch).filter(([k]) => IX.sel.has(k)).sort((a, b) => b[1].total - a[1].total)[0];
  return { rows, ch, vol, tr, top, topChain: tc && { id: tc[0], v: tc[1].total } };
}
function ixRender() {
  const body = $('#ocBody'), d = IX.d, A = ixAgg(); IX.A = A;
  if (IX.a && !IX.sel.has(IX.a)) IX.a = IX.b = null; if (IX.b && !IX.sel.has(IX.b)) IX.b = null;
  if (!$('#ixWrap', body)) {
    body.innerHTML = `<div id="ixWrap"><div class="ixtop"><div class="ixf" id="ixFil"></div><div class="ixhint" id="ixHint"></div></div>
      <div class="ixgrid"><aside class="ixcard ixstats" id="ixStats"></aside><div class="ixmapw"><div class="ixmap" id="ixMap"><canvas></canvas><div class="ixnodes"></div></div><div class="ixleg" id="ixLeg"></div></div>
      <aside class="ixcard ixsel" id="ixSel"></aside></div>
      <div class="sec"><div class="sec-h"><h2>${esc(X('Net flows by chain', 'เงินไหลสุทธิรายเชน'))}</h2><span class="sub" id="ixTsub"></span></div><div class="tbl-wrap" id="ixTbl"></div></div>
      <p class="sub note" id="ixNote"></p></div>`;
    ixMapInit();
  }
  // filters
  const pr = d.protocols;
  $('#ixFil').innerHTML = `<details class="ixdd"><summary><span class="ixcnt">${IX.sel.size}/${d.chains.length}</span>${esc(X('Chains', 'เชน'))}<span class="ixstack">${d.chains.slice(0, 5).map((c) => ixIco(c.iconUrl)).join('')}</span></summary>
      <div class="ixpop"><div class="ixpa"><button data-ixall="1">${esc(X('Select all', 'เลือกทั้งหมด'))}</button><button data-ixall="0">${esc(X('Top 5 only', 'เฉพาะ 5 อันดับแรก'))}</button></div>${d.chains.map((c) => `<button class="chip" data-ixc="${c.id}" aria-pressed="${IX.sel.has(c.id)}">${ixIco(c.iconUrl)}${esc(c.name)}</button>`).join('')}</div></details>
    <details class="ixdd"><summary><span class="ixcnt">${pr.length}/${pr.length}</span>${esc(X('Protocols', 'โปรโตคอล'))}<span class="ixstack">${pr.slice(0, 5).map((p) => ixIco(p.iconUrl)).join('')}</span></summary>
      <div class="ixpop"><p class="sub">${esc(X('All protocols included. L2BEAT publishes the per-protocol split only through its API, which we do not call, so this list cannot filter.', 'รวมทุกโปรโตคอล L2BEAT เปิดข้อมูลแยกรายโปรโตคอลผ่าน API เท่านั้น ซึ่งเราไม่ได้เรียกใช้ รายการนี้จึงกรองไม่ได้'))}</p>${pr.map((p) => `<span class="chip ro">${ixIco(p.iconUrl)}${esc(p.name)}</span>`).join('')}</div></details>`;
  $('#ixHint').textContent = !IX.a ? X('Tap a chain to see its flows', 'แตะเชนเพื่อดูรายละเอียด') : !IX.b ? X('Select a second chain to see the pair', 'เลือกเชนที่สองเพื่อดูคู่เส้นทาง') : '';
  ixStats(A); ixSel(A); ixTable(A); ixMapData(A);
  const up = new Date(d.updated), age = (Date.now() - up) / 36e5;
  $('#ocUpd').innerHTML = `${esc(X('Updated ', 'อัปเดต '))}${esc(up.toLocaleTimeString(loc(), { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false }))} JST · <a href="https://l2beat.com/interop/summary" target="_blank" rel="noopener">${esc(X('Data: L2BEAT', 'ข้อมูล: L2BEAT'))}</a>${age > 6 ? ` <b class="warn">· ${esc(X(`stale (${Math.floor(age)}h old)`, `ข้อมูลเก่า (${Math.floor(age)} ชม.)`))}</b>` : ''}`;
  $('#ixNote').innerHTML = esc(X('Past 24h, all interop protocols tracked by L2BEAT, top 15 chains by volume. Chain filters recompute volume, routes, transfers and in/out from the route rows. Token, bridge and transfer-time figures come from L2BEAT for the full set of 15 chains, so they are hidden when the filter is narrowed. ', 'ย้อนหลัง 24 ชม. ทุกโปรโตคอลที่ L2BEAT ติดตาม 15 เชนที่มีวอลุ่มสูงสุด ตัวกรองเชนคำนวณวอลุ่ม เส้นทาง จำนวนรายการ และเข้า/ออกใหม่จากข้อมูลรายเส้นทาง ส่วนตัวเลขเหรียญ บริดจ์ และเวลาโอนมาจาก L2BEAT สำหรับครบ 15 เชน จึงซ่อนไว้เมื่อกรองเชนออก ')) + `<a href="https://l2beat.com/interop/summary" target="_blank" rel="noopener">Data: L2BEAT</a>`;
}
const kvr = (l, v, c = '') => `<div class="ixkv"><span>${esc(l)}</span><b class="num ${c}">${v}</b></div>`;
function ixStats(A) {
  const s = IX.d.stats, F = full(), tr = A.top, tch = F ? s.topChain : A.topChain && { chainId: A.topChain.id, totalVolume: A.topChain.v };
  const box = (l, v, x = '') => `<div class="ixbox"><div class="eyebrow">${esc(l)}</div><b class="num">${v}</b>${x}</div>`;
  $('#ixStats').innerHTML = `<div class="ixh"><h3>${esc(X('General stats', 'ภาพรวม'))}</h3><small>${esc(X('Past 24h, selected chains and protocols', '24 ชม. ล่าสุด เฉพาะเชนและโปรโตคอลที่เลือก'))}</small></div>
    <div class="ixrow">${box(X('Volume', 'วอลุ่ม'), u2(A.vol))}${box(X('Active routes', 'เส้นทางที่ใช้งาน'), A.rows.length)}${box(X('Transfers', 'จำนวนรายการ'), n2(A.tr))}${box(X('Unique tokens', 'จำนวนเหรียญ'), F ? s.tokenCount : '–', F ? `<div class="ixstack">${s.topTokens.items.slice(0, 5).map((t) => ixIco(t.iconUrl)).join('')}${s.topTokens.remainingCount ? `<small>+${s.topTokens.remainingCount}</small>` : ''}</div>` : '')}
    ${box(X('Top route', 'เส้นทางหลัก'), tr ? `<span class="ixroute">${ixIco(ixC(tr.srcChain).iconUrl)}→${ixIco(ixC(tr.dstChain).iconUrl)}</span>` : '–', tr ? `<small>${esc(ixC(tr.srcChain).name)} → ${esc(ixC(tr.dstChain).name)} · ${u2(tr.volume)}</small>` : '')}
    ${box(X('Top chain', 'เชนหลัก'), tch ? esc(ixC(tch.chainId).name) : '–', tch ? `<small>${(Math.floor(tch.totalVolume / A.vol * 1000) / 10).toFixed(1)}% ${esc(X('of volume', 'ของวอลุ่ม'))} (${u2(tch.totalVolume)})</small>` : '')}
    ${box(X('Top protocol', 'โปรโตคอลหลัก'), F ? esc(s.topProtocol.name) : '–', F ? `<small>${u2(s.topProtocol.volume)}</small>` : '')}
    ${box(X('Top token', 'เหรียญหลัก'), F ? `${ixIco(s.topToken.iconUrl)} ${esc(s.topToken.symbol)}` : '–', F ? `<small>${u2(s.topToken.volume)}</small>` : '')}</div>`;
}
function ixSel(A) {
  const el = $('#ixSel'), F = full(), d = IX.d;
  if (!IX.a) { el.innerHTML = `<div class="ixh"><h3>${esc(X('Selected path', 'เส้นทางที่เลือก'))}</h3><small>${esc(X('Tap a chain on the map', 'แตะเชนบนแผนที่'))}</small></div><p class="mut ixempty">${esc(X('Pick a chain to see its volume in and out, net flow, transfers, top routes, tokens and bridges. Pick a second chain for the pair between them.', 'เลือกเชนเพื่อดูวอลุ่มเข้าออก เงินไหลสุทธิ จำนวนรายการ เส้นทาง เหรียญ และบริดจ์หลัก เลือกเชนที่สองเพื่อดูข้อมูลระหว่างคู่นั้น'))}</p>`; document.body.classList.remove('ixsheet'); return; }
  const a = ixC(IX.a), b = IX.b && ixC(IX.b);
  let st, tok = null, prot = null, dsec = null, routes, sub;
  if (!b) {
    const c = A.ch[IX.a], cd = F ? d.chainData.find((x) => x.chainId === IX.a) : null;
    st = [[X('Total volume', 'วอลุ่มรวม'), u2(c.total)], [X('Volume in', 'วอลุ่มเข้า'), u2(c.inflow)], [X('Volume out', 'วอลุ่มออก'), u2(c.outflow)], [X('Net flow', 'ไหลสุทธิ'), su2(c.net), cls(c.net)], [X('Total transfers', 'จำนวนรายการ'), n2(c.tr)], [X('Unique tokens', 'จำนวนเหรียญ'), cd ? cd.tokenCount : '–'], [X('Transfers in', 'รายการเข้า'), n2(c.tIn)], [X('Transfers out', 'รายการออก'), n2(c.tOut)], [X('Avg. transfer value', 'มูลค่าเฉลี่ยต่อรายการ'), c.tr ? u2(c.total / c.tr) : '–'], [X('Avg. transfer time', 'เวลาโอนเฉลี่ย'), cd ? dur(durOf(cd.avgDuration)) : '–'], [X('Connected', 'เชื่อมต่อ'), c.peers.size + ' ' + X('chains', 'เชน')], [X('Avg. value per second', 'มูลค่าเฉลี่ยต่อวินาที'), u2(c.total / 86400) + '/s']];
    if (cd) { tok = cd.topTokens; prot = cd.topProtocols; }
    routes = A.rows.filter((f) => f.srcChain === IX.a || f.dstChain === IX.a).sort((x, y) => y.volume - x.volume).slice(0, 3);
    sub = `${esc(a.name)} ↔ ${IX.sel.size - 1} ${esc(X('selected chains', 'เชนที่เลือก'))}`;
  } else {
    const ab = d.flows.find((f) => f.srcChain === IX.a && f.dstChain === IX.b) || { volume: 0, transferCount: 0 }, ba = d.flows.find((f) => f.srcChain === IX.b && f.dstChain === IX.a) || { volume: 0, transferCount: 0 };
    const tot = ab.volume + ba.volume, trs = ab.transferCount + ba.transferCount, pd = d.chainPairData.find((p) => p.chains.includes(IX.a) && p.chains.includes(IX.b));
    st = [[X('Total volume', 'วอลุ่มรวม'), u2(tot)], [`${a.name} → ${b.name}`, u2(ab.volume)], [`${b.name} → ${a.name}`, u2(ba.volume)], [X('Net flow to ', 'ไหลสุทธิเข้า ') + a.name, su2(ba.volume - ab.volume), cls(ba.volume - ab.volume)], [X('Total transfers', 'จำนวนรายการ'), n2(trs)], [X('Avg. transfer value', 'มูลค่าเฉลี่ยต่อรายการ'), trs ? u2(tot / trs) : '–'], [X('Avg. transfer time', 'เวลาโอนเฉลี่ย'), pd ? dur(durOf(pd.avgDuration)) : '–'], [X('Avg. value per second', 'มูลค่าเฉลี่ยต่อวินาที'), u2(tot / 86400) + '/s']];
    if (pd) { tok = pd.topTokens; prot = pd.topProtocols; }
    routes = [{ ...ab, srcChain: IX.a, dstChain: IX.b }, { ...ba, srcChain: IX.b, dstChain: IX.a }].filter((r) => r.volume).sort((x, y) => y.volume - x.volume);
    sub = `${esc(a.name)} ↔ ${esc(b.name)}`;
  }
  const list = (h, arr) => `<div class="ixsec"><h4>${esc(h)}</h4>${arr && arr.length ? arr.join('') : `<p class="mut sm">${esc(X('Shown for all 15 chains only', 'แสดงเฉพาะเมื่อเลือกครบ 15 เชน'))}</p>`}</div>`;
  el.innerHTML = `<div class="ixh"><h3>${esc(X('Selected path', 'เส้นทางที่เลือก'))}</h3><small>${sub}</small><button class="icon-btn ixx" data-ixclose aria-label="${esc(X('Close', 'ปิด'))}">✕</button></div>
    <div class="ixsec"><h4>${esc(X('Stats', 'สถิติ'))}</h4>${st.map(([l, v, c]) => kvr(l, v, c)).join('')}</div>
    ${list(X('Top routes', 'เส้นทางหลัก'), routes.map((r) => `<div class="ixkv"><span class="ixroute" title="${esc(ixC(r.srcChain).name)} → ${esc(ixC(r.dstChain).name)}">${ixIco(ixC(r.srcChain).iconUrl)}→${ixIco(ixC(r.dstChain).iconUrl)}<small>${esc(ixC(r.srcChain).name)} → ${esc(ixC(r.dstChain).name)}</small></span><b class="num">${u2(r.volume)}</b></div>`))}
    ${list(X('Top tokens', 'เหรียญหลัก'), tok && tok.map((t) => `<div class="ixkv"><span>${ixIco(t.iconUrl)} ${esc(t.symbol)}</span><b class="num">${u2(t.volume)}</b></div>`))}
    ${list(X('Top bridges', 'บริดจ์หลัก'), prot && prot.map((p) => `<div class="ixkv"><span>${ixIco(p.iconUrl)} ${esc(p.name)}</span><b class="num">${u2(p.volume)}</b></div>`))}
    <a class="ixbtn" href="${esc(a.href || 'https://l2beat.com/interop/summary')}" target="_blank" rel="noopener">${esc(X('View chain on L2BEAT', 'ดูเชนบน L2BEAT'))} ↗</a>`;
  document.body.classList.toggle('ixsheet', IX.sheet && innerWidth < 900);
}
function ixTable(A) {
  const F = full(), rows = IX.d.chains.filter((c) => IX.sel.has(c.id)).map((c) => ({ c, m: A.ch[c.id], cd: F ? IX.d.chainData.find((x) => x.chainId === c.id) : null })).sort((a, b) => b.m.net - a.m.net);
  $('#ixTsub').textContent = '24h · L2BEAT';
  $('#ixTbl').innerHTML = `<table class="ov"><thead><tr><th>${esc(X('Chain', 'เชน'))}</th><th>${esc(X('Inflow', 'ไหลเข้า'))}</th><th>${esc(X('Outflow', 'ไหลออก'))}</th><th>${esc(X('Net', 'สุทธิ'))}</th><th>${esc(X('Transfers', 'รายการ'))}</th><th>${esc(X('Avg. time', 'เวลาเฉลี่ย'))}</th><th class="l">${esc(X('Top token', 'เหรียญหลัก'))}</th><th class="l">${esc(X('Top bridge', 'บริดจ์หลัก'))}</th></tr></thead><tbody>${rows.map(({ c, m, cd }) => `<tr data-ixc2="${c.id}" class="${IX.a === c.id ? 'sel' : ''}"><td><div class="tok">${ixIco(c.iconUrl, 'logo')}<div><b>${esc(c.name)}</b></div></div></td><td class="num">${u2(m.inflow)}</td><td class="num">${u2(m.outflow)}</td><td class="num"><span class="nb ${cls(m.net)}">${su2(m.net)}</span></td><td class="num">${n2(m.tr)}</td><td class="num">${cd ? dur(durOf(cd.avgDuration)) : '–'}</td><td class="l">${cd && cd.topTokens[0] ? `${esc(cd.topTokens[0].symbol)} <span class="mut num">${u2(cd.topTokens[0].volume)}</span>` : '–'}</td><td class="l">${cd && cd.topProtocols[0] ? `${esc(cd.topProtocols[0].name)} <span class="mut num">${u2(cd.topProtocols[0].volume)}</span>` : '–'}</td></tr>`).join('')}</tbody></table>`;
  const tw = $('#ixTbl'); const fs = () => tw.classList.toggle('scrolled', tw.scrollLeft > 2); tw.onscroll = fs; fs();
}

/* ---------- radial map: HTML nodes + one canvas for links and particles, clipped to the map box ---------- */
function ixMapInit() {
  const el = $('#ixMap'), cv = $('canvas', el); el._vis = true; el._parts = [];
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { el._vis = es[0].isIntersecting; ixLoop(); }).observe(el);
  document.addEventListener('visibilitychange', ixLoop);
  new ResizeObserver(() => { if (IX.A) ixMapData(IX.A); }).observe(el);
  cv.setAttribute('aria-hidden', 'true');
}
function ixMapData(A) {
  const el = $('#ixMap'); if (!el) return; const cv = $('canvas', el), W = el.clientWidth, H = el.clientHeight; if (!W || !H) return;
  const dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); el._dpr = dpr; el._W = W; el._H = H;
  // symmetric layout: n chains evenly on one true circle, first at 12 o'clock; all nodes the same size, volume = thin ring share
  const ph = W < 520, cs = IX.d.chains.filter((c) => IX.sel.has(c.id)), n = cs.length, S = Math.min(W, H), cx = W / 2, cy = H / 2;
  const nr = ph ? 12 : Math.round(Math.max(18, Math.min(28, S * 0.026))), lw = ph ? 50 : Math.round(Math.max(86, Math.min(120, S * 0.11))), lh = ph ? 26 : 34;
  let R = S / 2 - nr - (ph ? 5 : 8) - lw - (ph ? 4 : 14);
  const tot = cs.reduce((s, c) => s + A.ch[c.id].total, 0) || 1, mx = Math.max(...cs.map((c) => A.ch[c.id].total), 1), P = {};
  const box = $('.ixnodes', el);
  const lay = () => {
  cs.forEach((c, i) => { const ang = -Math.PI / 2 + i / n * Math.PI * 2, m = A.ch[c.id]; P[c.id] = { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang), ang, r: nr, c, m }; });
  el._P = P; el._c = [cx, cy]; el._R = R; el.style.setProperty('--nr', nr * 2 + 'px');
  box.innerHTML = cs.map((c) => { const p = P[c.id], on = IX.a === c.id || IX.b === c.id, dim = IX.a && !on && !(IX.a && IX.d.flows.some((f) => (f.srcChain === IX.a && f.dstChain === c.id) || (f.dstChain === IX.a && f.srcChain === c.id)));
    const co = Math.cos(p.ang), si = Math.sin(p.ang), g = nr + (ph ? 5 : 8), side = Math.abs(co) < 0.12 ? (si < 0 ? 't' : 'b') : co < 0 ? 'l' : 'r', sh = p.m.total / tot;
    const nm = ph ? ({ hyperliquid: 'HL', hyperevm: 'HyperEVM', robinhood: 'Robinhood' })[c.id] || c.name.replace(/ (Smart Chain|Chain|One|PoS|Mainnet)$/, '') : c.name;
    return `<button class="ixn ${on ? 'on' : ''} ${dim ? 'dim' : ''}" data-ixn="${c.id}" style="left:${p.x.toFixed(1)}px;top:${p.y.toFixed(1)}px;--cc:${c.color};--p:${Math.max(0.02, p.m.total / mx).toFixed(3)}" aria-pressed="${on}" title="${esc(c.name)} · ${esc(X('volume', 'วอลุ่ม'))} ${u2(p.m.total)} (${(sh * 100).toFixed(1)}%) · ${esc(X('net', 'สุทธิ'))} ${su2(p.m.net)}"><span class="ixb">${ixIco(c.iconUrl)}</span><span class="ixl s${side}" style="--dx:${(co * g).toFixed(1)}px;--dy:${(si * g).toFixed(1)}px"><b>${esc(nm)}</b>${ph ? '' : `<small class="num ${cls(p.m.net)}">${su2(p.m.net)}</small>`}</span></button>`; }).join('');

  };
  lay();
  // fit: measure real label sizes and shrink the circle so no label touches the frame
  { const pad = ph ? 4 : 14, g = nr + (ph ? 5 : 8), H2 = S / 2 - pad; let lim = Infinity;
    $$('.ixn', box).forEach((n) => { const l = $('.ixl', n), p = P[n.dataset.ixn], co = Math.abs(Math.cos(p.ang)), si = Math.abs(Math.sin(p.ang)), w = l.offsetWidth, h = l.offsetHeight, s = l.classList;
      const side = s.contains('sl') || s.contains('sr');
      const hx = side ? w : w / 2, vy = side ? h / 2 : h; // label extent beyond its anchor
      if (co > 0.01) lim = Math.min(lim, (H2 - hx) / co - g); if (si > 0.01) lim = Math.min(lim, (H2 - vy) / si - g);
      lim = Math.min(lim, H2 - nr - 2); });
    if (isFinite(lim) && Math.abs(lim - R) > 1) { R = lim; lay(); } }
  // particles: 1 particle = $100 of 24h volume, emitted at the real per-second rate of each route
  const rate = A.vol / 86400, unit = 100;
  el._links = A.rows.map((f) => ({ s: f.srcChain, t: f.dstChain, v: f.volume, rate: f.volume / 86400 / unit, acc: Math.random() }));
  el._parts = el._parts.filter((p) => P[p.s] && P[p.t]);
  $('#ixLeg').innerHTML = `<span><i class="ixdot"></i> 1 ${esc(X('particle', 'จุด'))} ≈ ${u2(unit).replace('.00', '')}</span><span>${esc(X('Avg value per second', 'มูลค่าเฉลี่ยต่อวินาที'))} ≈ <b class="num">${u2(rate)}</b></span><a href="https://l2beat.com/interop/summary" target="_blank" rel="noopener">Data: L2BEAT</a>`;
  ixDraw(performance.now()); ixLoop();
}
/* particle colour = source chain brand colour (L2BEAT interopChains.color); very dark/light ones are lifted so they stay visible on the theme */
const ixPcM = {}; function ixPc(h, dark) { const k = h + dark; if (ixPcM[k]) return ixPcM[k];
  let [r, g, b] = [1, 3, 5].map((i) => parseInt((h || '#888888').slice(i, i + 2), 16)); const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (dark && L < 0.35) { const t = (0.45 - L) / (1 - L); [r, g, b] = [r, g, b].map((v) => Math.round(v + (255 - v) * t)); }
  if (!dark && L > 0.7) { const t = 0.35; [r, g, b] = [r, g, b].map((v) => Math.round(v * (1 - t))); }
  return (ixPcM[k] = `rgb(${r},${g},${b})`); }
const ixCurve = (el, a, b) => { const [cx, cy] = el._c; return [a.x, a.y, cx + (a.x + b.x - 2 * cx) * 0.18, cy + (a.y + b.y - 2 * cy) * 0.18, b.x, b.y]; };
function ixDraw(now) {
  const el = $('#ixMap'); if (!el || !el._P) return; const cv = $('canvas', el), ctx = cv.getContext('2d'), P = el._P, dt = Math.min(0.1, (now - (el._t || now)) / 1000); el._t = now;
  ctx.setTransform(el._dpr, 0, 0, el._dpr, 0, 0); ctx.clearRect(0, 0, el._W, el._H);
  const dark = getComputedStyle(document.documentElement).colorScheme.includes('dark'), sel = IX.a, pair = IX.b;
  const on = (l) => !sel || (pair ? (l.s === sel && l.t === pair) || (l.s === pair && l.t === sel) : l.s === sel || l.t === sel);
  const mxv = Math.max(...el._links.map((l) => l.v), 1);
  el._links.forEach((l) => { const a = P[l.s], b = P[l.t]; if (!a || !b) return; const q = ixCurve(el, a, b), act = on(l);
    ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.quadraticCurveTo(q[2], q[3], q[4], q[5]);
    ctx.strokeStyle = act ? (dark ? `rgba(160,170,255,${sel ? .3 : .06 + .14 * Math.sqrt(l.v / mxv)})` : `rgba(60,70,180,${sel ? .3 : .05 + .12 * Math.sqrt(l.v / mxv)})`) : (dark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.03)');
    ctx.lineWidth = act && sel ? 0.8 : 0.5; ctx.stroke();
    if (!RM() && act) { l.acc += l.rate * dt * (sel ? 1 : 1); while (l.acc >= 1 && el._parts.length < 1500) { l.acc -= 1; el._parts.push({ s: l.s, t: l.t, c: ixPc(P[l.s].c.color, dark), u: 0, sp: (el._R * 0.42) / (Math.hypot(b.x - a.x, b.y - a.y) || 1) }); } } });
  el._parts = el._parts.filter((p) => { p.u += p.sp * dt; if (p.u >= 1) return false; const a = P[p.s], b = P[p.t]; if (!a || !b) return false;
    const l = { s: p.s, t: p.t }; if (!on(l)) return false; const q = ixCurve(el, a, b), u = p.u, w = 1 - u;
    const x = w * w * q[0] + 2 * w * u * q[2] + u * u * q[4], y = w * w * q[1] + 2 * w * u * q[3] + u * u * q[5];
    ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(x, y, Math.max(1.4, Math.min(2.4, el._R / 190)), 0, 6.2832); ctx.fill(); return true; });
  el._links.forEach((l) => { if (l.acc > 2) l.acc = 2; }); // over the cap: drop backlog instead of bursting
}
function ixLoop() { const el = $('#ixMap'); if (!el || el._raf || !el._vis || document.hidden || RM()) return;
  const f = (now) => { el._raf = 0; if (!el.isConnected || !el._vis || document.hidden) return; ixDraw(now); el._raf = requestAnimationFrame(f); }; el._t = performance.now(); el._raf = requestAnimationFrame(f); }

async function ocFlows() {
  try { await ixLoad(); } catch (e) { $('#ocBody').innerHTML = `<p class="err">interop.json: ${esc(e.message)} <button data-ocretry>${esc(T('retry'))}</button></p>`; return; }
  if (S.route !== 'onchain' || S.sub !== 'flows') return; ixRender();
}
document.addEventListener('click', (e) => {
  const q = (s) => e.target.closest(s); let el;
  if ((el = q('[data-ixn]')) || (el = q('[data-ixc2]'))) { const id = el.dataset.ixn || el.dataset.ixc2;
    if (!IX.a || (IX.a && IX.b) || el.dataset.ixc2) { IX.a = IX.a === id && !IX.b ? null : id; IX.b = null; } else if (id === IX.a) IX.a = null; else IX.b = id;
    IX.sheet = !!IX.a; ixRender(); if (el.dataset.ixc2 && innerWidth >= 900) $('#ixMap').scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'center' }); return; }
  if ((el = q('[data-ixc]'))) { const id = el.dataset.ixc; if (IX.sel.has(id)) { if (IX.sel.size > 2) IX.sel.delete(id); } else IX.sel.add(id); ixRender(); $$('.ixdd')[0].open = true; return; }
  if ((el = q('[data-ixall]'))) { IX.sel = new Set(el.dataset.ixall === '1' ? IX.d.chains.map((c) => c.id) : IX.d.chains.slice(0, 5).map((c) => c.id)); ixRender(); $$('.ixdd')[0].open = true; return; }
  if (q('[data-ixclose]')) { IX.a = IX.b = null; IX.sheet = false; ixRender(); return; }
  if (!q('.ixdd')) $$('.ixdd[open]').forEach((d) => d.open = false);
});
