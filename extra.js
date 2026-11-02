/* KMS Capital: news, X sentiment, portfolio, screener, reports. Loaded after app.js (shares its globals). */
Object.assign(ICONS, {
  portfolio: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 4v8l5.7 5.7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  screener: '<path d="M4 5h16l-6 7.5V19l-4-2v-4.5L4 5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  reports: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20V3.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 12h5M10 15.5h5M14 3.5V8h4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  more: '<circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/>',
});
Object.assign(I18N.en, {
  portfolio: 'Portfolio', screener: 'Screener', reports: 'Reports', more: 'More',
  justNow: 'just now', mAgo: (n) => `${n}m ago`, hAgo: (n) => `${n}h ago`, dAgo: (n) => `${n}d ago`, showMore: (n) => `Show ${n} more`, showLess: 'Show less',
  xSplit: 'Bullish / neutral / bearish', xVol: 'Mentions (7d)', xDaily:'Daily mentions, last 7 days',xVsPrev: 'vs prior week', xPoints: 'Key talking points', xTop: 'Top posts', xAcct: 'Notable accounts', xSample: (n, d) => `Sample of ${n} posts · ${d}`, xNone: 'No X read yet. The daily update fills this in.',
  newsSrc: 'Free RSS: CoinDesk, The Block, Decrypt, Cointelegraph, Google News', bull3: 'Bullish', neu3: 'Neutral', bear3: 'Bearish',
  pfValue: 'Value', pfCost: 'Cost basis', pfPnl: 'Unrealized P&L', pf24: '24h', pfAdd: 'Add holding', pfEdit: 'Edit holding', pfQty: 'Quantity', pfAvg: 'Avg buy price (USD)', pfAlloc: 'Allocation', pfHist: 'Value history', pfEmpty: 'No holdings yet. Add what you hold to track value and P&L. Nothing leaves this device.',
  pfSaved: 'Saved only on this device (localStorage). No wallet connection. Export a backup now and then.', pfFromJ: 'Add open Journal trades', pfFromJn: (n) => n ? `Added ${n} from Journal` : 'No open long trades to add', pfSearch: 'Search coin (name or symbol)', pfHistNote: 'One snapshot per day, saved when you open this page.', pfTrades: 'Linked trades',
  scUni: (n, d) => `${n} coins · top 200 by market cap + watchlist · data ${d}`, scPreset: 'Presets', scAll: 'All', scOversold: 'Oversold near support', scMomo: 'Momentum breakout', scFund: 'Funding reset', scFilters: 'Filters', scRsi: 'RSI', scSup: '% above support', scMa: '% from 50D MA', scCh24: '24h %', scCh7: '7d %', scVs: 'Volume spike ×', scFundL: 'Funding %/8h', scMc: 'Mkt cap $B', scMin: 'min', scMax: 'max', scReset: 'Clear', scNone: 'No coins match. Loosen a filter.', scAdd: '+ Watch', scAdded: 'Watching', scNote: 'RSI, MAs, support and volume use daily candles from a daily build; price, 24h/7d and market cap refresh live from CoinGecko. Funding: Binance, Bybit or Hyperliquid perps.', scResults: (n) => `${n} results`,
  scHelp: { oversold: 'RSI under 35 and within 6% of daily support', momo: 'Closing at a 120-day high on 1.5×+ volume, RSI 55–75', fund: 'Funding at or below zero while price holds above the 50-day MA' },
  rpWeek: 'Week', rpPerf: 'Token performance', rpVerdicts: 'Verdict changes', rpFlows: 'Flows', rpAhead: 'Key events ahead', rpSummary: 'Summary', rpNone: 'No reports yet.', rpGen: (d) => `Generated ${d}`, rpFrom: 'from', rpTo: 'to',
  ulSup: (p) => `${p}% of circ. supply`, ulVol: (v) => `${v}× daily volume`, akind: { snapshot: 'Snapshot', claim: 'Claim deadline', deadline: 'Deadline', tge: 'Token launch' },
  unlock: 'Token unlock', airdrop: 'Airdrop / snapshot', pctSupply: '% of supply', vsVol: '× daily volume',
});
Object.assign(I18N.th, {
  portfolio: 'พอร์ต', screener: 'สแกนเหรียญ', reports: 'รายงาน', more: 'เพิ่มเติม',
  justNow: 'เมื่อสักครู่', mAgo: (n) => `${n} นาทีที่แล้ว`, hAgo: (n) => `${n} ชม.ที่แล้ว`, dAgo: (n) => `${n} วันที่แล้ว`, showMore: (n) => `ดูเพิ่มอีก ${n}`, showLess: 'ย่อ',
  xSplit: 'บวก / กลาง / ลบ', xVol: 'จำนวนการพูดถึง (7 วัน)', xDaily: 'การพูดถึงรายวัน 7 วันล่าสุด', xVsPrev: 'เทียบสัปดาห์ก่อน', xPoints: 'ประเด็นที่คนพูดถึง', xTop: 'โพสต์เด่น', xAcct: 'มุมมองจากบัญชีดัง', xSample: (n, d) => `จากตัวอย่าง ${n} โพสต์ · ${d}`, xNone: 'ยังไม่มีข้อมูลจาก X อัปเดตรายวันจะเติมให้',
  newsSrc: 'RSS ฟรี: CoinDesk, The Block, Decrypt, Cointelegraph, Google News', bull3: 'บวก', neu3: 'กลาง', bear3: 'ลบ',
  pfValue: 'มูลค่า', pfCost: 'ต้นทุน', pfPnl: 'กำไร/ขาดทุนที่ยังไม่ขาย', pf24: '24 ชม.', pfAdd: 'เพิ่มเหรียญ', pfEdit: 'แก้ไขเหรียญ', pfQty: 'จำนวน', pfAvg: 'ราคาซื้อเฉลี่ย (USD)', pfAlloc: 'สัดส่วนพอร์ต', pfHist: 'มูลค่าย้อนหลัง', pfEmpty: 'ยังไม่มีเหรียญ ใส่สิ่งที่ถืออยู่เพื่อดูมูลค่าและกำไรขาดทุน ข้อมูลไม่ออกจากเครื่องนี้',
  pfSaved: 'บันทึกไว้ในเครื่องนี้เท่านั้น (localStorage) ไม่ต้องเชื่อมกระเป๋า ควร Export สำรองไว้เป็นระยะ', pfFromJ: 'ดึงเทรดที่เปิดอยู่จากบันทึกเทรด', pfFromJn: (n) => n ? `เพิ่มจากบันทึกเทรด ${n} รายการ` : 'ไม่มีเทรด Long ที่เปิดอยู่', pfSearch: 'ค้นหาเหรียญ (ชื่อหรือตัวย่อ)', pfHistNote: 'เก็บวันละหนึ่งจุด ตอนที่คุณเปิดหน้านี้', pfTrades: 'เทรดที่เชื่อมไว้',
  scUni: (n, d) => `${n} เหรียญ · ท็อป 200 ตามมาร์เก็ตแคป + รายการที่ติดตาม · ข้อมูล ${d}`, scPreset: 'ชุดตัวกรองสำเร็จรูป', scAll: 'ทั้งหมด', scOversold: 'ขายมากเกิน ใกล้แนวรับ', scMomo: 'โมเมนตัมเบรกขึ้น', scFund: 'Funding รีเซ็ต', scFilters: 'ตัวกรอง', scRsi: 'RSI', scSup: '% เหนือแนวรับ', scMa: '% ห่างจาก MA50', scCh24: '24 ชม. %', scCh7: '7 วัน %', scVs: 'วอลุ่มพุ่ง ×', scFundL: 'Funding %/8 ชม.', scMc: 'มาร์เก็ตแคป $B', scMin: 'ต่ำสุด', scMax: 'สูงสุด', scReset: 'ล้าง', scNone: 'ไม่มีเหรียญที่ตรง ลองผ่อนตัวกรองลง', scAdd: '+ ติดตาม', scAdded: 'ติดตามแล้ว', scNote: 'RSI, MA, แนวรับ และวอลุ่ม ใช้แท่งรายวันจากการอัปเดตรายวัน ส่วนราคา 24 ชม./7 วัน และมาร์เก็ตแคปดึงสดจาก CoinGecko Funding มาจาก Binance, Bybit หรือ Hyperliquid', scResults: (n) => `${n} เหรียญ`,
  scHelp: { oversold: 'RSI ต่ำกว่า 35 และห่างแนวรับรายวันไม่เกิน 6%', momo: 'ปิดที่จุดสูงสุด 120 วัน วอลุ่ม 1.5 เท่าขึ้นไป RSI 55–75', fund: 'Funding ศูนย์หรือติดลบ ขณะที่ราคายังยืนเหนือ MA50' },
  rpWeek: 'สัปดาห์', rpPerf: 'ผลงานของแต่ละเหรียญ', rpVerdicts: 'มุมมองที่เปลี่ยน', rpFlows: 'เงินไหลข้ามเชน', rpAhead: 'เหตุการณ์สำคัญข้างหน้า', rpSummary: 'สรุป', rpNone: 'ยังไม่มีรายงาน', rpGen: (d) => `สร้างเมื่อ ${d}`, rpFrom: 'จาก', rpTo: 'เป็น',
  ulSup: (p) => `${p}% ของเหรียญหมุนเวียน`, ulVol: (v) => `${v}× วอลุ่มต่อวัน`, akind: { snapshot: 'สแนปช็อต', claim: 'ปิดเคลม', deadline: 'เส้นตาย', tge: 'เปิดตัวเหรียญ' },
  unlock: 'ปลดล็อกโทเคน', airdrop: 'แอร์ดรอป / สแนปช็อต', pctSupply: '% ของซัพพลาย', vsVol: '× วอลุ่มต่อวัน',
});
const TF = (k, ...a) => { const v = T(k); return typeof v === 'function' ? v(...a) : v; };
const jstFull = (d) => new Date(d).toLocaleString(loc(), { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' JST';
const relT = (d) => { const s = (Date.now() - Date.parse(d)) / 1e3; if (isNaN(s)) return ''; if (s < 90) return T('justNow'); if (s < 3600) return TF('mAgo', Math.round(s / 60)); if (s < 86400 * 1.5) return TF('hAgo', Math.round(s / 3600)); return TF('dAgo', Math.round(s / 86400)); };
async function loadNews() { try { S.news = await getJSON('news.json?ts=' + Date.now()); } catch (e) { S.news = null; } }

/* ---------- NEWS ---------- */
function newsHTML(t, j) {
  const auto = ((S.news && S.news.tokens && S.news.tokens[t.symbol]) || []);
  const cur = (j.news || []).filter((n) => !auto.some((a) => a.url === n.url)).map((n) => ({ ...n, pick: 1 }));
  const all = [...cur, ...auto].slice(0, 15); const open = S.newsOpen === t.symbol; const shown = open ? all : all.slice(0, 6);
  const row = (n) => `<a href="${esc(n.url)}" target="_blank" rel="noopener"><span class="t">${esc(L(n, 'title'))}</span><small>${n.pick ? `<span class="pick">★</span>` : ''}<span class="src">${esc(n.source || '')}</span>${n.date ? ` · <time datetime="${esc(n.date)}" title="${esc(jstFull(n.date))}">${esc(relT(n.date))}</time>` : ''} ↗</small></a>`;
  return `<div class="sec"><div class="sec-h"><h2>${esc(T('news'))}</h2><span class="sub">${esc(T('newsSrc'))}${S.news ? ' · ' + esc(relT(S.news.updated)) : ''}</span></div>
    <div class="news news2">${shown.map(row).join('') || `<p class="mut">${esc(T('noNews'))}</p>`}</div>
    ${all.length > 6 ? `<button class="btn ghost more-btn" data-newsmore="${esc(t.symbol)}">${esc(open ? T('showLess') : TF('showMore', all.length - 6))}</button>` : ''}</div>`;
}

/* ---------- X SENTIMENT ---------- */
function xHTML(t, j) {
  const x = j.x; const pill = j.sentiment ? `<span class="vd ${j.sentiment === 'Bullish' ? 'Long' : j.sentiment === 'Bearish' ? 'Avoid' : 'Wait'}">${esc(T(j.sentiment))}</span>` : '';
  const head = `<div class="sec-h"><h2>${esc(T('xMood'))}</h2>${pill}</div>`;
  if (!x) return `<div class="sec">${head}<p class="p">${esc(L(j, 'sentiment_note') || T('xNone'))}</p></div>`;
  const sp = x.split || {}; const b = +sp.bull || 0, n = +sp.neu || 0, r = +sp.bear || 0, tot = b + n + r || 1;
  const m = x.mentions || {}; const dv = m.prev ? (m.now / m.prev - 1) * 100 : null;
  const arr = (k) => (LANG === 'th' && x.th && Array.isArray(x.th[k]) && x.th[k].length ? x.th[k] : x[k]) || [];
  const acc = (x.accounts || []).map((a, i) => { const tk = (LANG === 'th' && x.th && x.th.accounts && x.th.accounts[i]) || a.take;
    return `<li><a href="https://x.com/${esc(a.handle)}" target="_blank" rel="noopener" class="h">@${esc(a.handle)}</a> <span class="st ${a.stance}">${esc(T(a.stance + '3'))}</span><span class="tk">${esc(tk)}</span></li>`; }).join('');
  const top = (x.top || []).slice(0, 5).map((p, i) => { const tx = (LANG === 'th' && x.th && x.th.top && x.th.top[i]) || p.text;
    return `<a href="${esc(p.url)}" target="_blank" rel="noopener" class="xp"><span class="t">${esc(tx)}</span><small>@${esc(p.author)}${p.date ? ` · <time title="${esc(jstFull(p.date))}">${esc(relT(p.date))}</time>` : ''}${p.likes ? ` · ♥ ${(+p.likes).toLocaleString('en-US')}` : ''} ↗</small></a>`; }).join('');
  return `<div class="sec xsec">${head}<p class="p">${esc(L(j, 'sentiment_note') || '')}</p>
    <div class="xgrid"><div><div class="eyebrow">${esc(T('xSplit'))}</div><div class="xbar"><i class="b" style="width:${b / tot * 100}%"></i><i class="n" style="width:${n / tot * 100}%"></i><i class="r" style="width:${r / tot * 100}%"></i></div>
      <div class="xleg"><span class="up">${esc(T('bull3'))} ${Math.round(b / tot * 100)}%</span><span class="mut">${esc(T('neu3'))} ${Math.round(n / tot * 100)}%</span><span class="dn">${esc(T('bear3'))} ${Math.round(r / tot * 100)}%</span></div></div>
      <div><div class="eyebrow">${esc(T('xVol'))}</div><div class="xv"><b class="num">${m.now != null ? (+m.now).toLocaleString('en-US') : '–'}</b>${dv != null ? ` <span class="num ${cls(dv)}">${pct(dv, 0)}</span> <span class="sub">${esc(T('xVsPrev'))}</span>` : ''}</div>${Array.isArray(m.daily) && m.daily.length ? (() => { const mx = Math.max(...m.daily) || 1; return `<div class="xdays" title="${esc(T('xDaily'))}">${m.daily.map((v) => `<i style="height:${Math.max(8, v / mx * 100)}%"></i>`).join('')}</div><div class="sub">${esc(T('xDaily'))}</div>`; })() : ''}</div></div>
    ${arr('points').length ? `<div class="h3">${esc(T('xPoints'))}</div><ul class="bl">${arr('points').map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    ${top ? `<div class="h3">${esc(T('xTop'))}</div><div class="news xposts">${top}</div>` : ''}
    ${acc ? `<div class="h3">${esc(T('xAcct'))}</div><ul class="xacc">${acc}</ul>` : ''}
    ${x.sample ? `<p class="sub" style="margin-top:8px">${esc(TF('xSample', x.sample, x.updated ? jstFull(x.updated) : ''))}</p>` : ''}</div>`;
}

/* ---------- PORTFOLIO ---------- */
const PF = () => store.get('kms-portfolio', { holdings: [], hist: [] });
const PFset = (v) => store.set('kms-portfolio', v);
S.pfPx = {};
async function pfPrices() {
  const ids = [...new Set(PF().holdings.map((h) => h.id))].filter(Boolean); if (!ids.length) return;
  try { const r = await getJSON(`${CG}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`); Object.entries(r).forEach(([k, v]) => S.pfPx[k] = { p: v.usd, c: v.usd_24h_change }); } catch (e) { S.errors.pf = e.message; }
}
const hPx = (h) => { const t = S.cfg.find((x) => x.coingecko === h.id); if (t && t.price) return { p: t.price, c: ch24(t) }; return S.pfPx[h.id] || (S.cg[h.id] ? { p: S.cg[h.id].current_price, c: S.cg[h.id].price_change_percentage_24h_in_currency } : null); };
function donut(parts, size = 168) {
  const tot = parts.reduce((s, p) => s + p.v, 0) || 1; let a = -Math.PI / 2; const R = size / 2, r = R - 22;
  const seg = parts.map((p) => { const f = p.v / tot; if (f >= 0.9999) return `<circle cx="${R}" cy="${R}" r="${R - 11}" fill="none" stroke="${p.c}" stroke-width="22"/>`;
    const a2 = a + f * Math.PI * 2; const l = f > 0.5 ? 1 : 0; const P = (ang, rr) => `${R + rr * Math.cos(ang)},${R + rr * Math.sin(ang)}`;
    const d = `M${P(a, R)} A${R},${R} 0 ${l} 1 ${P(a2, R)} L${P(a2, r)} A${r},${r} 0 ${l} 0 ${P(a, r)}Z`; a = a2; return `<path d="${d}" fill="${p.c}"><title>${esc(p.n)} ${(f * 100).toFixed(1)}%</title></path>`; }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="donut">${seg}</svg>`;
}
const PAL = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#64748b'];
function sparkSVG(pts, w = 600, h = 120) {
  if (pts.length < 2) return '';
  const vs = pts.map((p) => p.v), mn = Math.min(...vs), mx = Math.max(...vs), sp = mx - mn || 1;
  const xy = pts.map((p, i) => [i / (pts.length - 1) * w, h - 6 - (p.v - mn) / sp * (h - 12)]);
  const d = xy.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(''); const up = vs[vs.length - 1] >= vs[0];
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="spark ${up ? 'up' : 'dn'}"><path d="${d}L${w},${h}L0,${h}Z" class="a"/><path d="${d}" class="l" vector-effect="non-scaling-stroke"/></svg>`;
}
function pPortfolio(soft) {
  const pf = PF(); let val = 0, cost = 0, d24 = 0, known = true;
  const rows = pf.holdings.map((h, i) => { const q = hPx(h); const v = q ? q.p * h.qty : null; const c = h.avg ? h.avg * h.qty : null;
    if (v != null) { val += v; if (q.c != null) d24 += v - v / (1 + q.c / 100); } else known = false; if (c != null) cost += c;
    return { h, i, q, v, c, pnl: v != null && c != null ? v - c : null }; }).sort((a, b) => (b.v || 0) - (a.v || 0));
  const pnl = val - cost;
  if (val > 0 && known) { const day = todayJ(); const hs = pf.hist.filter((x) => x.d !== day); hs.push({ d: day, v: +val.toFixed(2), c: +cost.toFixed(2) }); pf.hist = hs.slice(-400); PFset(pf); }
  const parts = rows.filter((r) => r.v > 0).map((r, k) => ({ n: r.h.sym, v: r.v, c: PAL[k % PAL.length] }));
  const st = (l, v, c = '') => `<div><div class="eyebrow">${esc(l)}</div><div class="v num ${c}">${v}</div></div>`;
  const jt = JR();
  const list = rows.map((r) => { const t = { symbol: r.h.sym, logo: r.h.logo }; const lt = jt.filter((x) => x.token === r.h.sym && (x.close == null || x.close === '')).length;
    return `<div class="jrow pfrow" data-pfedit="${r.i}"><div class="tok">${logo(t)}<div><b>${esc(r.h.sym)}</b><small>${(+r.h.qty).toLocaleString('en-US', { maximumFractionDigits: 6 })} · ${r.q ? px(r.q.p) : '–'}${r.h.avg ? ` · ${esc(T('pfAvg').split(' (')[0])} ${px(r.h.avg)}` : ''}${lt ? ` · <a class="link" href="#/journal">${lt} ${esc(T('pfTrades'))}</a>` : ''}</small></div></div>
      <div class="r"><b class="num">${r.v != null ? '$' + r.v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '–'}</b><span class="num sub ${cls(r.pnl)}">${r.pnl != null ? usd(r.pnl) + ' · ' + pct(r.pnl / r.c * 100) : r.q && r.q.c != null ? pct(r.q.c) + ' 24h' : ''}</span></div></div>`; }).join('');
  const tot = parts.reduce((s, p) => s + p.v, 0);
  $('#main').innerHTML = `<div class="page">${pageHead(T('portfolio'), `<button class="btn pri" data-pfadd>+ ${esc(T('pfAdd'))}</button>`)}
    <div class="jstats">${st(T('pfValue'), val ? '$' + val.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '–')}${st(T('pfPnl'), cost ? usd(pnl) + `<small class="${cls(pnl)}"> ${pct(pnl / cost * 100)}</small>` : '–', cls(pnl))}${st(T('pfCost'), cost ? '$' + cost.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '–')}${st(T('pf24'), val ? usd(d24) : '–', cls(d24))}</div>
    ${pf.holdings.length ? `<div class="pfgrid"><div class="card pfalloc"><div class="sec-h"><h2>${esc(T('pfAlloc'))}</h2></div><div class="dwrap">${donut(parts)}<ul class="dleg">${parts.map((p) => `<li><i style="background:${p.c}"></i><b>${esc(p.n)}</b><span class="num">${(p.v / tot * 100).toFixed(1)}%</span></li>`).join('')}</ul></div></div>
      <div class="card"><div class="sec-h"><h2>${esc(T('pfHist'))}</h2><span class="sub">${esc(T('pfHistNote'))}</span></div>${pf.hist.length > 1 ? sparkSVG(pf.hist) + `<div class="sub" style="display:flex;justify-content:space-between"><span>${esc(pf.hist[0].d)}</span><span>${esc(pf.hist[pf.hist.length - 1].d)}</span></div>` : `<p class="sub">${esc(T('pfHistNote'))}</p>`}</div></div>` : ''}
    <div class="jtools"><button class="btn pri jnew-m" data-pfadd>+ ${esc(T('pfAdd'))}</button><div style="display:flex;gap:6px;flex-wrap:wrap;margin-left:auto"><button class="btn ghost" data-pffromj>${esc(T('pfFromJ'))}</button><button class="btn ghost" data-pfexp>${esc(T('exp'))}</button><label class="btn ghost" style="cursor:pointer">${esc(T('imp'))}<input type="file" accept="application/json,.json" id="pfimp" hidden></label></div></div>
    <div>${list || `<div class="empty">${esc(T('pfEmpty'))}<div style="margin-top:14px"><button class="btn pri" data-pfadd>+ ${esc(T('pfAdd'))}</button></div></div>`}</div>
    <p class="sub" style="margin-top:16px">${esc(T('pfSaved'))}</p></div>`;
  $('#pfimp').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; try { const j = JSON.parse(await f.text()); if (!Array.isArray(j.holdings)) throw 0; PFset({ holdings: j.holdings, hist: j.hist || [] }); toast(TF('imported', j.holdings.length)); pPortfolio(); } catch (er) { toast(T('badFile')); } });
  if (!soft && pf.holdings.some((h) => !hPx(h))) pfPrices().then(() => { if (S.route === 'portfolio') pPortfolio(true); });
}
function pfDialog(i) {
  const pf = PF(); const h = i != null ? pf.holdings[i] : null; let pick = h ? { id: h.id, sym: h.sym, name: h.name, logo: h.logo } : null;
  const d = $('#dlg');
  d.innerHTML = `<form method="dialog" id="pform"><div class="dlg-h"><h2>${esc(h ? T('pfEdit') : T('pfAdd'))}</h2><button class="icon-btn" value="cancel" aria-label="close"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
    <div class="dlg-b"><div class="fld full"><label>${esc(T('token'))}</label><div id="pfPick" class="pfpick">${pick ? `<b>${esc(pick.sym)}</b> ${esc(pick.name || '')}` : ''}</div>
      <input class="input" id="pfq" placeholder="${esc(T('pfSearch'))}" autocomplete="off"><div class="results" id="pfres">${S.cfg.map((t) => `<button type="button" class="res" data-pfpick='${esc(JSON.stringify({ id: t.coingecko, sym: t.symbol, name: t.name, logo: t.logo }))}'>${logo(t, 'sm')}<b>${esc(t.symbol)}</b><span class="sub">${esc(t.name)}</span></button>`).join('')}</div></div>
      <div class="fld"><label>${esc(T('pfQty'))}</label><input class="input" name="qty" type="number" step="any" inputmode="decimal" value="${h ? h.qty : ''}"></div>
      <div class="fld"><label>${esc(T('pfAvg'))} <small>(${esc(T('optional'))})</small></label><input class="input" name="avg" type="number" step="any" inputmode="decimal" value="${h && h.avg ? h.avg : ''}"></div></div>
    <div class="dlg-f">${h ? `<button type="button" class="btn ghost danger sp" data-pfdel>${esc(T('del'))}</button>` : ''}<button class="btn ghost" value="cancel">${esc(T('cancel'))}</button><button class="btn pri" value="ok">${esc(T('save'))}</button></div></form>`;
  const fm = $('#pform'); let tmr;
  const setPick = (p) => { pick = p; $('#pfPick').innerHTML = `<b>${esc(p.sym)}</b> ${esc(p.name || '')}`; $$('[data-pfpick]', fm).forEach((b) => b.setAttribute('aria-pressed', JSON.parse(b.dataset.pfpick).id === p.id)); if (!fm.avg.value) { const q = hPx(p); if (q) fm.avg.placeholder = px(q.p); } };
  fm.addEventListener('click', (e) => { const b = e.target.closest('[data-pfpick]'); if (b) setPick(JSON.parse(b.dataset.pfpick));
    if (e.target.closest('[data-pfdel]') && confirm(T('confirmDel'))) { pf.holdings.splice(i, 1); PFset(pf); d.close(); pPortfolio(); } });
  $('#pfq').addEventListener('input', (e) => { clearTimeout(tmr); const q = e.target.value.trim(); if (q.length < 2) return; tmr = setTimeout(async () => {
    try { const r = await getJSON(`${CG}/search?query=${encodeURIComponent(q)}`); $('#pfres').innerHTML = r.coins.slice(0, 8).map((c) => `<button type="button" class="res" data-pfpick='${esc(JSON.stringify({ id: c.id, sym: c.symbol.toUpperCase(), name: c.name, logo: c.large || c.thumb }))}'><img class="logo sm" src="${esc(c.thumb)}" alt=""><b>${esc(c.symbol.toUpperCase())}</b><span class="sub">${esc(c.name)}</span></button>`).join(''); } catch (er) {} }, 350); });
  d.onclose = () => { if (d.returnValue !== 'ok' || !pick || !(+fm.qty.value > 0)) return;
    const rec = { ...pick, qty: +fm.qty.value, avg: +fm.avg.value || null }; if (h) pf.holdings[i] = rec; else { const k = pf.holdings.findIndex((x) => x.id === rec.id); if (k >= 0) { const o = pf.holdings[k]; const q = o.qty + rec.qty; rec.avg = o.avg && rec.avg ? (o.avg * o.qty + rec.avg * rec.qty) / q : (o.avg || rec.avg); rec.qty = q; pf.holdings[k] = rec; } else pf.holdings.push(rec); }
    PFset(pf); pPortfolio(); };
  d.returnValue = ''; d.showModal();
}
function pfFromJournal() {
  const pf = PF(); const used = new Set(pf.holdings.flatMap((h) => h.jids || [])); let n = 0;
  JR().filter((x) => (x.close == null || x.close === '') && x.side !== 'short' && !used.has(x.id)).forEach((x) => { const t = tokBySym(x.token); if (!t) return;
    const qty = x.size / x.entry; const k = pf.holdings.findIndex((h) => h.id === t.coingecko);
    if (k >= 0) { const o = pf.holdings[k]; const q = o.qty + qty; o.avg = o.avg ? (o.avg * o.qty + x.entry * qty) / q : x.entry; o.qty = q; (o.jids = o.jids || []).push(x.id); }
    else pf.holdings.push({ id: t.coingecko, sym: t.symbol, name: t.name, logo: t.logo, qty, avg: x.entry, jids: [x.id] }); n++; });
  PFset(pf); toast(TF('pfFromJn', n)); pPortfolio();
}
function pfExport() { const b = new Blob([JSON.stringify({ app: 'kms-capital', kind: 'portfolio', version: 1, ...PF() }, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `kms-capital-portfolio-${todayJ()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

/* ---------- SCREENER ---------- */
const SCF = [['rsi', 'scRsi'], ['dsup', 'scSup'], ['d50', 'scMa'], ['c24', 'scCh24'], ['c7', 'scCh7'], ['vs', 'scVs'], ['f', 'scFundL'], ['mcb', 'scMc']];
const PRESETS = { oversold: { rsi: [null, 35], dsup: [0, 6] }, momo: { brk: true, vs2: [1.5, null], rsi: [55, 75] }, fund: { f: [null, 0], d50: [0, null] } };
S.sc = store.get('kms-screener', { preset: 'all', f: {}, sort: 'rank', dir: 1 });
async function loadScreener() {
  if (!S.scr) { try { S.scr = await getJSON('screener.json?ts=' + Date.now()); } catch (e) { S.errors.scr = e.message; S.scr = { coins: [] }; } }
  if (!S.scrLive || Date.now() - S.scrLive > 5 * 60e3) {
    try { const r = await getJSON(`${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&price_change_percentage=24h,7d`); const m = Object.fromEntries(r.map((x) => [x.id, x]));
      S.scr.coins.forEach((c) => { const x = m[c.id]; if (x) Object.assign(c, { p: x.current_price, mc: x.market_cap, vol: x.total_volume, c24: x.price_change_percentage_24h_in_currency, c7: x.price_change_percentage_7d_in_currency, rank: x.market_cap_rank }); }); S.scrLive = Date.now(); } catch (e) {}
  }
}
function scRows() {
  const rows = (S.scr && S.scr.coins || []).map((c) => ({ ...c, mcb: c.mc ? c.mc / 1e9 : null }));
  S.cfg.forEach((t) => { if (!t.I) return; let r = rows.find((x) => x.id === t.coingecko); const P = t.I.plan; const sup = P.sup[0];
    const live = { p: t.price, rsi: +t.I.rsi.toFixed(1), d50: t.I.ma50 ? +((t.price / t.I.ma50 - 1) * 100).toFixed(2) : null, d200: t.I.ma200 ? +((t.price / t.I.ma200 - 1) * 100).toFixed(2) : null, sup, dsup: sup ? +((t.price / sup - 1) * 100).toFixed(2) : null, wl: 1 };
    if (r) Object.assign(r, live); else { const g = S.cg[t.coingecko] || {}; rows.push({ id: t.coingecko, s: t.symbol, n: t.name, img: t.logo, rank: g.market_cap_rank, mc: g.market_cap, mcb: g.market_cap ? g.market_cap / 1e9 : null, c24: ch24(t), c7: g.price_change_percentage_7d_in_currency, ...live }); } });
  const p = PRESETS[S.sc.preset] || {}; const f = { ...p, ...S.sc.f };
  const ok = (c) => Object.entries(f).every(([k, v]) => { if (k === 'brk') return !v || c.brk; const [a, b] = v; if (a == null && b == null) return true; const x = c[k]; if (x == null) return false; return (a == null || x >= a) && (b == null || x <= b); });
  const k = S.sc.sort, d = S.sc.dir; return rows.filter(ok).sort((a, b) => ((a[k] ?? (d > 0 ? 1e18 : -1e18)) - (b[k] ?? (d > 0 ? 1e18 : -1e18))) * d);
}
async function pScreener(soft) {
  const m = $('#main');
  if (!S.scr) m.innerHTML = `<div class="page">${pageHead(T('screener'))}<div class="sk" style="height:300px"></div></div>`;
  await loadScreener(); if (S.route !== 'screener') return;
  const rows = scRows(); const inWl = new Set(S.cfg.map((t) => t.coingecko));
  const pr = [['all', 'scAll'], ['oversold', 'scOversold'], ['momo', 'scMomo'], ['fund', 'scFund']];
  const fv = (k, i) => { const v = (S.sc.f[k] || [])[i]; return v == null ? '' : v; };
  const th = (k, l, cl = '') => `<th class="${cl}" data-scsort="${k}">${esc(l)}${S.sc.sort === k ? `<span class="arr">${S.sc.dir > 0 ? '↑' : '↓'}</span>` : ''}</th>`;
  const num = (v, d = 1, suf = '') => v == null ? '<span class="mut">–</span>' : (+v).toFixed(d) + suf;
  const rsiC = (v) => v == null ? '' : v < 30 ? 'up' : v > 70 ? 'dn' : '';
  const body = rows.slice(0, 250).map((c) => `<tr><td><div class="tok"><img class="logo sm" src="${esc(c.img || '')}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><div><b>${esc(c.s)}</b><small>#${c.rank || '–'}${c.wl ? ' · ★' : ''}</small></div></div></td>
    <td class="num">${px(c.p)}</td><td class="num ${cls(c.c24)}">${pct(c.c24, 1)}</td><td class="num ${cls(c.c7)}">${pct(c.c7, 1)}</td><td class="num ${rsiC(c.rsi)}">${num(c.rsi, 0)}</td><td class="num">${c.dsup == null ? '–' : num(c.dsup, 1, '%')}</td><td class="num ${cls(c.d50)}">${c.d50 == null ? '–' : pct(c.d50, 1)}</td><td class="num ${c.vs >= 2 ? 'up' : ''}">${num(c.vs, 1, '×')}</td><td class="num ${c.f < 0 ? 'up' : c.f > 0.03 ? 'dn' : ''}">${c.f == null ? '–' : (c.f >= 0 ? '+' : '') + (+c.f).toFixed(4)}</td><td class="num">${big(c.mc)}</td>
    <td>${inWl.has(c.id) ? `<span class="sub">${esc(T('scAdded'))}</span>` : `<button class="link" data-scadd='${esc(JSON.stringify({ id: c.id, symbol: c.s, name: c.n, logo: c.img }))}'>${esc(T('scAdd'))}</button>`}</td></tr>`).join('');
  m.innerHTML = `<div class="page" id="scp">${pageHead(T('screener'), `<span class="sub">${esc(TF('scUni', (S.scr.coins || []).length, S.scr.updated ? relT(S.scr.updated) : '–'))}</span>`)}
    <div class="filters">${pr.map(([k, l]) => `<button class="chip np" data-scp="${k}" aria-pressed="${S.sc.preset === k}">${esc(T(l))}</button>`).join('')}</div>
    ${S.sc.preset !== 'all' ? `<p class="sub" style="margin:-6px 0 12px">${esc(T('scHelp')[S.sc.preset])}</p>` : ''}
    <details class="scf" ${Object.keys(S.sc.f).length ? 'open' : ''}><summary>${esc(T('scFilters'))}${Object.keys(S.sc.f).length ? ` · ${Object.keys(S.sc.f).length}` : ''}</summary><div class="scgrid">${SCF.map(([k, l]) => `<label><span>${esc(T(l))}</span><span class="mm"><input class="input" type="number" step="any" inputmode="decimal" placeholder="${esc(T('scMin'))}" data-scf="${k}:0" value="${fv(k, 0)}"><input class="input" type="number" step="any" inputmode="decimal" placeholder="${esc(T('scMax'))}" data-scf="${k}:1" value="${fv(k, 1)}"></span></label>`).join('')}<button class="btn ghost" data-scclear>${esc(T('scReset'))}</button></div></details>
    <div class="sec-h" style="margin-top:12px"><span class="sub">${esc(TF('scResults', rows.length))}</span></div>
    ${rows.length ? `<div class="tbl-wrap"><table class="ov sc"><thead><tr>${th('rank', T('token'), 'l')}${th('p', T('price'))}${th('c24', '24h')}${th('c7', '7d')}${th('rsi', 'RSI')}${th('dsup', T('scSup'))}${th('d50', 'MA50')}${th('vs', 'Vol×')}${th('f', 'Funding')}${th('mc', 'MCap')}<th></th></tr></thead><tbody>${body}</tbody></table></div>` : `<div class="empty">${esc(T('scNone'))}</div>`}
    <p class="sub" style="margin-top:14px">${esc(T('scNote'))}</p></div>`;
  const w = $('#scp .tbl-wrap'); if (w) w.addEventListener('scroll', () => w.classList.toggle('scrolled', w.scrollLeft > 2), { passive: true });
}
const scSave = () => store.set('kms-screener', S.sc);

/* ---------- REPORTS ---------- */
async function pReports() {
  const m = $('#main');
  if (!S.rpIdx) { try { S.rpIdx = await getJSON('reports/index.json?ts=' + Date.now()); } catch (e) { S.rpIdx = { reports: [] }; } }
  const list = S.rpIdx.reports || []; if (!list.length) { m.innerHTML = `<div class="page narrow">${pageHead(T('reports'))}<div class="empty">${esc(T('rpNone'))}</div></div>`; return; }
  const file = S.rpSel || list[0].file; S.rpCache = S.rpCache || {};
  if (!S.rpCache[file]) { m.innerHTML = `<div class="page narrow">${pageHead(T('reports'))}<div class="sk" style="height:300px"></div></div>`; try { S.rpCache[file] = await getJSON('reports/' + file + '?ts=' + Date.now()); } catch (e) { m.innerHTML = `<p class="err">${esc(e.message)}</p>`; return; } }
  if (S.route !== 'reports') return;
  const r = S.rpCache[file]; const arr = (o, k) => (LANG === 'th' && o.th && Array.isArray(o.th[k]) ? o.th[k] : o[k]) || [];
  const perf = (r.performance || []).map((p) => { const t = tokBySym(p.symbol) || { symbol: p.symbol }; return `<tr><td><div class="tok">${logo(t, 'sm')}<b>${esc(p.symbol)}</b></div></td><td class="num">${px(p.close)}</td><td class="num ${cls(p.w)}">${pct(p.w, 1)}</td><td class="num">${px(p.low)} – ${px(p.high)}</td><td>${p.verdict ? vd(p.verdict) : ''}</td></tr>`; }).join('');
  const vch = (r.verdicts || []).map((v) => `<li><b>${esc(v.symbol)}</b> ${vd(v.from)} → ${vd(v.to)} <span class="sub">${esc(v.date || '')}</span><div class="p">${esc(L(v, 'why'))}</div></li>`).join('');
  const ahead = (r.ahead || []).map((e) => `<li><b class="num">${esc(e.date)}</b> ${esc(L(e, 'title'))}${e.tokens && e.tokens.length ? ` <span class="sub">${esc(e.tokens.join(', '))}</span>` : ''}</li>`).join('');
  const fl = r.flows || {};
  m.innerHTML = `<div class="page narrow rp">${pageHead(T('reports'))}
    <div class="filters">${list.map((x) => `<button class="chip np" data-rp="${esc(x.file)}" aria-pressed="${x.file === file}">${esc(T('rpWeek'))} ${esc(x.week)}</button>`).join('')}</div>
    <h2 class="rp-t">${esc(L(r, 'title'))}</h2><p class="sub">${esc(r.from)} → ${esc(r.to)} · ${esc(TF('rpGen', jstFull(r.generated)))}</p>
    <div class="sec"><div class="sec-h"><h2>${esc(T('rpSummary'))}</h2></div><ul class="bl">${arr(r, 'summary').map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
    <div class="sec"><div class="sec-h"><h2>${esc(T('rpPerf'))}</h2></div><div class="tbl-wrap"><table class="ov rpt"><thead><tr><th class="l">${esc(T('token'))}</th><th>${esc(T('price'))}</th><th>7d</th><th>Range</th><th></th></tr></thead><tbody>${perf}</tbody></table></div></div>
    <div class="sec"><div class="sec-h"><h2>${esc(T('rpVerdicts'))}</h2></div>${vch ? `<ul class="rpv">${vch}</ul>` : `<p class="sub">–</p>`}</div>
    <div class="sec"><div class="sec-h"><h2>${esc(T('rpFlows'))}</h2></div><ul class="bl">${arr(fl, 'points').map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
    <div class="sec"><div class="sec-h"><h2>${esc(T('rpAhead'))}</h2></div><ul class="rpa">${ahead}</ul></div>
    <p class="foot">${esc(T('nfa'))}</p></div>`;
}

/* ---------- events ---------- */
document.addEventListener('click', (e) => {
  const q = (s) => e.target.closest(s); let el;
  if ((el = q('[data-newsmore]'))) { S.newsOpen = S.newsOpen === el.dataset.newsmore ? null : el.dataset.newsmore; const t = tokBySym(el.dataset.newsmore); const sec = el.closest('.sec'); const tmp = document.createElement('div'); tmp.innerHTML = newsHTML(t, J(t.symbol)); sec.replaceWith(tmp.firstElementChild); return; }
  if ((el = q('[data-pfadd]'))) return pfDialog(null);
  if ((el = q('[data-pfedit]')) && !q('a')) return pfDialog(+el.dataset.pfedit);
  if ((el = q('[data-pffromj]'))) return pfFromJournal();
  if ((el = q('[data-pfexp]'))) return pfExport();
  if ((el = q('[data-scp]'))) { S.sc.preset = el.dataset.scp; scSave(); return pScreener(); }
  if ((el = q('[data-scsort]'))) { const k = el.dataset.scsort; if (S.sc.sort === k) S.sc.dir *= -1; else { S.sc.sort = k; S.sc.dir = k === 'rank' || k === 'rsi' || k === 'dsup' || k === 'f' ? 1 : -1; } scSave(); return pScreener(); }
  if ((el = q('[data-scclear]'))) { S.sc.f = {}; scSave(); return pScreener(); }
  if ((el = q('[data-scadd]'))) { addToken(JSON.parse(el.dataset.scadd)); el.outerHTML = `<span class="sub">${esc(T('scAdded'))}</span>`; return; }
  if ((el = q('[data-rp]'))) { S.rpSel = el.dataset.rp; return pReports(); }
});
document.addEventListener('change', (e) => { const el = e.target.closest('[data-scf]'); if (!el) return; const [k, i] = el.dataset.scf.split(':'); const v = el.value === '' ? null : +el.value; const a = S.sc.f[k] || [null, null]; a[+i] = v; if (a[0] == null && a[1] == null) delete S.sc.f[k]; else S.sc.f[k] = a; scSave(); pScreener(); });
