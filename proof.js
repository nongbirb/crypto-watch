/* KMS Capital – Proof Layer UI (docs/architect-proof-layer.md §2.4). Loaded after app.js (shares its globals).
   - trade plan card: the verdict's own backtest record (verdict_backtest.json), gated on independent cases (nEff >= 20)
   - "What changed" strip on Markets: ledger entries since the viewer's last visit (data/ledger/YYYY-MM.json)
   - #/record: the ledger summary per signal kind (data/ledger/summary.json) and the verdict backtest per token. Plain tables. */
Object.assign(ICONS, {
  record: '<path d="M5 19V9M10 19V5M15 19v-7M20 19v-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M3.5 19.5h17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
});
Object.assign(I18N.en, { record: 'Track record' });
Object.assign(I18N.th, { record: 'สถิติสัญญาณ' });
const PRF = { vbt: undefined, led: undefined, sum: undefined, since: null, req: null };
/* last visit: read once per page load, then move the mark to now */
PRF.since = store.get('cw-chg-seen', null); store.set('cw-chg-seen', Date.now());
const prfMonths = () => { const d = new Date(), a = d.toISOString().slice(0, 7), p = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7); return [p, a]; };
function prfLoad() {
  if (PRF.req) return PRF.req;
  const q = '?t=' + Math.floor(Date.now() / 6e5);
  PRF.req = Promise.allSettled([getJSON('verdict_backtest.json' + q), getJSON('data/ledger/summary.json' + q), ...prfMonths().map((m) => getJSON(`data/ledger/${m}.json${q}`))]).then(([v, s, ...m]) => {
    PRF.vbt = v.status === 'fulfilled' ? v.value : false; PRF.sum = s.status === 'fulfilled' ? s.value : false;
    const ok = m.filter((x) => x.status === 'fulfilled' && x.value && Array.isArray(x.value.entries));
    PRF.led = ok.length ? ok.flatMap((x) => x.value.entries) : false;
  }).finally(() => { setTimeout(() => { PRF.req = null; }, 6e5); });
  return PRF.req;
}
const prfMin = () => (PRF.vbt && PRF.vbt.minNEff) || 20;
const prfOk = (s) => s && Number.isFinite(s.nEff) && s.nEff >= prfMin() && Number.isFinite(s.med);
const prfFew = (s) => XL(`not enough samples (n=${s ? s.nEff : 0})`, `ตัวอย่างไม่พอ (n=${s ? s.nEff : 0})`);
const prfDate = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString(loc(), { year: 'numeric', month: 'short', day: 'numeric' }); };
const prfKind = (k) => ({ verdict: T('setup'), pattern: XL('Chart pattern', 'แพทเทิร์นกราฟ'), funding_regime: XL('Funding regime', 'ภาวะ funding'), oi_regime: XL('Open interest regime', 'ภาวะ OI'), sm_flow: XL('Smart Money flow', 'เงิน Smart Money') }[k] || k);
const PRF_SMF = { net_buy: ['Net buying', 'ซื้อสุทธิ'], net_sell: ['Net selling', 'ขายสุทธิ'], flat: ['Flat', 'ทรงตัว'] };
const PRF_REG = { funding_regime: { high: ['High (top 10% of own 90 days)', 'สูง (top 10% ของ 90 วัน)'], low: ['Low (bottom 10%)', 'ต่ำ (ล่างสุด 10%)'], normal: ['Normal', 'ปกติ'] },
  oi_regime: { building: ['Building (top 10% of own 90 days)', 'สะสมเพิ่ม (top 10% ของ 90 วัน)'], unwinding: ['Unwinding (bottom 10%)', 'ลดลง (ล่างสุด 10%)'], normal: ['Normal', 'ปกติ'] } };
const prfState = (kind, to) => (kind === 'verdict' ? T(to) : kind === 'sm_flow' && PRF_SMF[to] ? XL(...PRF_SMF[to]) : PRF_REG[kind] && PRF_REG[kind][to] ? XL(...PRF_REG[kind][to]) : kind === 'pattern' && typeof pName === 'function' && typeof PD !== 'undefined' && PD[to] ? pName(to) : to);
/* help text required by the brief: what the record is, and the closed-candle timing change */
function prfHelp(tk) {
  const d = PRF.vbt, src = tk ? `${tk.src}, ${prfDate(tk.from)} – ${prfDate(tk.to)}` : '', up = d && d.updated ? prfDate(d.updated) : '';
  return XL(`The record is a walk-forward backtest of this exact rule on closed daily candles${src ? ` (${src}; updated ${up})` : ''}: at each past day the rule only saw candles up to that day. Independent cases: overlapping 7-day windows are counted once. Range = 90% bootstrap interval of the median. Any day = median 7-day return of every day of this token over the same period. With fewer than ${prfMin()} independent cases no rate is shown. The backtest uses daily levels; the live card also refines the entry zone with 4h candles. Timing: the setup reads closed daily candles only and, since v57, changes only after two daily closes in a row agree, so a state can change up to two days later than it did before Phase 1. The backtest applies the same rule. The daily brief is written around 09:10 JST, just after the 00:00 UTC close, so its notes agree with this card. Past results do not predict future results.`,
    `สถิตินี้มาจากการทดสอบย้อนหลังแบบ walk-forward ของกฎเดียวกันนี้ บนแท่งรายวันที่ปิดแล้ว${src ? ` (${src} อัปเดต ${up})` : ''} ในแต่ละวันกฎเห็นแค่แท่งถึงวันนั้น ไม่มองอนาคต เคสไม่ทับกัน = ช่วง 7 วันที่ซ้อนกันนับเป็นครั้งเดียว ช่วง = ช่วง 90% ของค่ามัธยฐานจาก bootstrap ทุกวัน = มัธยฐานผลตอบแทน 7 วันของทุกวันของเหรียญนี้ในช่วงเดียวกัน ถ้าเคสไม่ทับกันน้อยกว่า ${prfMin()} จะไม่โชว์ตัวเลข ทดสอบย้อนหลังใช้ระดับจากแท่งรายวัน ส่วนการ์ดสดปรับโซนเข้าด้วยแท่ง 4 ชม. เพิ่ม เรื่องเวลา มุมมองใช้เฉพาะแท่งรายวันที่ปิดแล้ว และตั้งแต่ v57 จะเปลี่ยนเมื่อแท่งปิดรายวันสองแท่งติดกันยืนยันตรงกันเท่านั้น สถานะจึงอาจเปลี่ยนช้ากว่าก่อน Phase 1 ได้ถึง 2 วัน ผลทดสอบย้อนหลังก็ใช้กฎเดียวกัน บทสรุปรายวันเขียนราว 09:10 JST หลังแท่ง 00:00 UTC ปิด เลยตรงกับการ์ดนี้ ผลในอดีตไม่รับประกันอนาคต`);
}
/* trade plan card line. Old line stays when there is no record or fewer than 20 independent cases. */
function prfRecordHTML(t) {
  const P = t.I.plan, sym = t.symbol, old = `<p class="sub">${esc(XL('Technical checklist, not a validated trading edge.', 'เช็กลิสต์เทคนิค ยังไม่ผ่านการทดสอบว่าให้ความได้เปรียบในการเทรด'))}</p>`;
  const d = PRF.vbt, tk = d && d.tokens && d.tokens[sym], st = tk && tk.states && tk.states[P.bias], h = st && st.h7, b = tk && tk.baseline && tk.baseline.h7;
  const help = uiHelp(prfHelp(tk), XL('How is this measured?', 'วัดผลยังไง'));
  if (!h || !b) return `<div class="prf-rec">${old}${help}</div>`;
  const sh = tk.short ? ` <span class="prf-short">${esc(XL(`short history (${tk.years} yrs)`, `ประวัติสั้น (${tk.years} ปี)`))}</span>` : '';
  // Audit F6: name the backtest venue when it is not the venue this card reads (the backtest uses the longest closed history)
  const cv = t._src && typeof EXNAME !== 'undefined' ? `${EXNAME[t._src.ex] || t._src.ex} ${t._src.pair}` : null;
  const ven = tk.src && cv && tk.src !== cv ? ` <span class="prf-ven" data-prfven>${esc(XL(`backtest on ${tk.src}`, `ทดสอบย้อนหลังบน ${tk.src}`))}</span>` : '';
  // Audit F9: "18 independent cases from 43 days: not enough to show a rate"
  if (!prfOk(h)) return `<div class="prf-rec" data-prfrec="few">${old}<p class="sub">${esc(XL(`This state on ${sym}: ${h.nEff} independent cases from ${h.n} days: not enough to show a rate`, `สถานะนี้ใน ${sym}: ${h.nEff} เคสไม่ทับกัน จาก ${h.n} วัน ยังน้อยเกินกว่าจะโชว์อัตรา`))}${sh}${ven}</p>${help}</div>`;
  const rg = h.ci ? XL(` (range ${pct(h.ci[0], 1)} to ${pct(h.ci[1], 1)})`, ` (ช่วง ${pct(h.ci[0], 1)} ถึง ${pct(h.ci[1], 1)})`) : '';
  return `<div class="prf-rec" data-prfrec="ok"><p class="sub">${esc(XL(`This state on ${sym}: ${h.nEff} independent cases · median +7d ${pct(h.med, 1)}${rg} · any day ${pct(b.med, 1)}`, `สถานะนี้ใน ${sym}: ${h.nEff} เคสไม่ทับกัน · มัธยฐาน 7 วัน ${pct(h.med, 1)}${rg} · ทุกวัน ${pct(b.med, 1)}`))}${sh}${ven} <a href="#/record">${esc(XL('Track record', 'ดูสถิติ'))}</a></p>${help}</div>`;
}
/* Markets: "What changed" since the viewer's last visit, newest first, at most 8 */
function prfChanged() {
  const el = $('#chg'); if (!el) return;
  if (!PRF.led) { el.innerHTML = ''; return; }
  const seenT = (e) => Date.parse((e.ctx && e.ctx.seen) || e.t), since = PRF.since || Date.now() - 3 * 864e5;
  const list = PRF.led.filter((e) => e && e.from !== null && seenT(e) > since).sort((a, b) => seenT(b) - seenT(a)).slice(0, 8);
  const head = `<span class="eyebrow">${esc(XL('What changed', 'มีอะไรเปลี่ยน'))}</span>`;
  const rec = `<a class="chg-all" href="#/record">${esc(T('record'))}</a>`;
  if (!list.length) { el.innerHTML = `<div class="chg">${head}<span class="sub">${esc(PRF.since ? XL(`No signal changes since your last visit (${jst(new Date(PRF.since))}).`, `ไม่มีสัญญาณเปลี่ยนตั้งแต่เข้ามาครั้งก่อน (${jst(new Date(PRF.since))})`) : XL('No signal changes in the last 3 days.', 'ไม่มีสัญญาณเปลี่ยนใน 3 วันที่ผ่านมา'))}</span>${rec}</div>`; return; }
  const item = (e) => { const tok = tokBySym(e.sym), what = e.kind === 'verdict' ? `${vd(e.from)} → ${vd(e.to)}` : `${esc(prfKind(e.kind))}: <b>${esc(prfState(e.kind, e.to))}</b>`;
    const inner = `<b>${esc(e.sym)}</b> ${what} <span class="sub">${esc(jst(new Date(seenT(e))))}</span>`;
    return tok ? `<li><button type="button" class="chg-i" data-sel="${esc(e.sym)}">${inner}</button></li>` : `<li><span class="chg-i">${inner}</span></li>`; };
  el.innerHTML = `<div class="chg">${head}<ul>${list.map(item).join('')}</ul>${rec}</div>`;
}
/* #/record */
async function pRecord() {
  const m = $('#main');
  if (PRF.vbt === undefined) { m.innerHTML = `<div class="page">${pageHead(T('record'))}<div class="sk" style="height:300px"></div></div>`; await prfLoad(); if (S.route !== 'record') return; }
  const cell = (s) => (prfOk(s) ? `<span class="${cls(s.med)}">${pct(s.med, 1)}</span> <small class="mut">n=${s.nEff}</small>` : `<span class="mut">${esc(prfFew(s))}</span>`);
  const S_ = PRF.sum, rows = S_ && Array.isArray(S_.rows) ? S_.rows : [];
  const LH = [XL('Signal', 'สัญญาณ'), XL('Changed to', 'เปลี่ยนเป็น'), XL('Changes', 'ครั้ง'), '+1d', '+7d', '+30d', XL('Any day +7d', 'ทุกวัน +7 วัน')], dl = (i) => ` data-l="${esc(LH[i])}"`;
  // Audit F4: pattern rows are graded in the pattern's direction (bearish: price falling counts as positive), marked ↕
  const lrow = (r) => `<tr><td class="l"${dl(0)}>${esc(prfKind(r.kind))}${r.sym !== 'ALL' ? ` · ${esc(r.sym)}` : ''}</td><td class="l"${dl(1)}>${r.kind === 'verdict' ? vd(r.to) : esc(prfState(r.kind, r.to))}${r.dirAdj ? ' <span class="mut" data-prfdir title="' + esc(XL("graded in the pattern's direction", 'วัดตามทิศของแพทเทิร์น')) + '">↕</span>' : ''}</td><td class="num"${dl(2)}>${r.entries}</td><td class="num" data-col="h1"${dl(3)}>${cell(r.h1)}</td><td class="num" data-col="h7"${dl(4)}>${cell(r.h7)}</td><td class="num" data-col="h30"${dl(5)}>${cell(r.h30)}</td><td class="num"${dl(6)}>${r.base && r.base.h7 && Number.isFinite(r.base.h7.med) ? pct(r.base.h7.med, 1) : '–'}</td></tr>`;
  const lhead = `<thead><tr>${LH.map((x, i) => `<th${i < 2 ? ' class="l"' : ''}>${esc(x)}</th>`).join('')}</tr></thead>`;
  const dirNote = rows.some((r) => r.dirAdj) ? `<p class="sub" data-prfdirnote>${esc(XL("↕ Chart patterns are graded in the pattern's direction: for a bearish pattern, price falling counts as a gain. Patterns with no direction yet are counted but not graded.", '↕ แพทเทิร์นกราฟวัดผลตามทิศของแพทเทิร์น ถ้าเป็นแพทเทิร์นขาลง ราคาลงนับเป็นบวก แพทเทิร์นที่ยังไม่มีทิศจะนับจำนวน แต่ไม่วัดผล'))}</p>` : '';
  const all = rows.filter((r) => r.sym === 'ALL'), per = rows.filter((r) => r.sym !== 'ALL');
  const ledger = !S_ ? `<p class="sub">${esc(XL('The ledger has not recorded anything yet. It checks about hourly; changes appear after the next daily close (00:00 UTC).', 'บันทึกสัญญาณยังว่างอยู่ ระบบเช็กราวทุกชั่วโมง สัญญาณแรกจะขึ้นหลังแท่งรายวันปิด (00:00 UTC)'))}</p>`
    : `<p class="sub">${esc(XL(`Since ${prfDate(S_.since)} · ${S_.changes} state changes recorded · last change written ${jst(new Date(S_.updated))}`, `ตั้งแต่ ${prfDate(S_.since)} · บันทึกการเปลี่ยนสถานะ ${S_.changes} ครั้ง · เขียนล่าสุด ${jst(new Date(S_.updated))}`))} ${fresh(S_.updated, 24)}</p>`
      + (all.length ? `<div class="tbl-wrap prf-wrap"><table class="ov prft">${lhead}<tbody>${all.map(lrow).join('')}</tbody></table></div>${dirNote}` : `<p class="sub">${esc(XL('No state changes yet. The first observation of each token is a starting point, not a change, so it is not counted.', 'ยังไม่มีการเปลี่ยนสถานะ การเห็นครั้งแรกของแต่ละเหรียญเป็นจุดเริ่มต้น ไม่นับเป็นการเปลี่ยน'))}</p>`)
      + (per.length ? `<details class="prf-more"><summary>${esc(XL('Setup by token', 'มุมมองเทคนิคแยกเหรียญ'))}</summary><div class="tbl-wrap prf-wrap"><table class="ov prft">${lhead}<tbody>${per.map(lrow).join('')}</tbody></table></div></details>` : '');
  const d = PRF.vbt, toks = d && d.tokens ? S.cfg.map((t) => t.symbol).filter((s) => d.tokens[s]).concat(Object.keys(d.tokens).filter((s) => !tokBySym(s))) : [];
  const BH = [T('token'), T('setup'), XL('Days', 'วัน'), XL('+7d median', 'มัธยฐาน 7 วัน'), XL('Up', 'ขึ้น'), XL('Any day +7d', 'ทุกวัน +7 วัน'), XL('Held-out 30%', 'ช่วงทดสอบ 30%')], bl = (i) => ` data-l="${esc(BH[i])}"`;
  // rows 2-3 of a token repeat its name (hidden on wide screens, shown on the phone cards)
  const brow = (sym) => { const tk = d.tokens[sym]; return ['Long', 'Wait', 'Avoid'].map((st, i) => { const g = tk.states[st] || {}, h = g.h7, te = tk.test && tk.test.states && tk.test.states[st] ? tk.test.states[st].h7 : null;
    return `<tr${i ? '' : ' class="prf-first"'}>${i ? `<td class="l prf-cont"${bl(0)}><b>${esc(sym)}</b></td>` : `<td class="l"${bl(0)}><b>${esc(sym)}</b>${tk.short ? ` <span class="prf-short">${esc(XL('short history', 'ประวัติสั้น'))}</span>` : ''}<br><small class="mut">${esc(tk.years)} ${esc(XL('yrs', 'ปี'))} · ${esc(tk.src)}</small></td>`}
      <td class="l"${bl(1)}>${vd(st)}</td><td class="num"${bl(2)}>${g.days ?? 0}</td><td class="num" data-col="h7"${bl(3)}>${cell(h)}${prfOk(h) && h.ci ? `<br><small class="mut">${pct(h.ci[0], 1)} … ${pct(h.ci[1], 1)}</small>` : ''}</td><td class="num"${bl(4)}>${prfOk(h) ? `${h.pos.toFixed(0)}%` : '–'}</td><td class="num"${bl(5)}>${tk.baseline && tk.baseline.h7 && Number.isFinite(tk.baseline.h7.med) ? pct(tk.baseline.h7.med, 1) : '–'}</td><td class="num" data-col="test"${bl(6)}>${cell(te)}</td></tr>`; }).join(''); };
  const bt = !d ? `<p class="sub">${esc(XL('Backtest: Unavailable', 'ผลทดสอบย้อนหลัง: ดึงไม่ได้'))}</p>`
    : `<p class="sub">${esc(XL(`Updated ${jst(new Date(d.updated))} · weekly`, `อัปเดต ${jst(new Date(d.updated))} · ทุกสัปดาห์`))} ${fresh(d.updated, 168)}</p>
      <div class="tbl-wrap prf-wrap"><table class="ov prft prfbt"><thead><tr>${BH.map((x, i) => `<th${i < 2 ? ' class="l"' : ''}>${esc(x)}</th>`).join('')}</tr></thead><tbody>${toks.map(brow).join('')}</tbody></table></div>
      <p class="sub">${esc(XL(`n = independent cases: overlapping 7-day windows count once. Range under the median = 90% bootstrap interval. Held-out = the last 30% of each token's history, never used to set anything (the rule has no tuned parameter). Under ${prfMin()} independent cases no rate is shown. History under 2 years is marked short.`, `n = เคสไม่ทับกัน ช่วง 7 วันที่ซ้อนกันนับครั้งเดียว ตัวเลขใต้ค่ามัธยฐาน = ช่วง 90% จาก bootstrap ช่วงทดสอบ = 30% หลังสุดของประวัติแต่ละเหรียญ ไม่ได้ใช้ตั้งค่าอะไรเลย (กฎนี้ไม่มีค่าที่จูน) ถ้าเคสไม่ทับกันน้อยกว่า ${prfMin()} จะไม่โชว์ตัวเลข ประวัติไม่ถึง 2 ปีจะติดป้ายประวัติสั้น`))}</p>`;
  m.innerHTML = `<div class="page prf">${pageHead(T('record'))}
    <p class="p">${esc(XL('Every signal the app shows is recorded when it changes and graded later from closed daily candles. This page shows that record and the backtest of the setup rule. It is evidence, not advice.', 'ทุกสัญญาณที่แอปโชว์จะถูกบันทึกตอนที่เปลี่ยน แล้วให้คะแนนทีหลังจากแท่งรายวันที่ปิดแล้ว หน้านี้คือสถิติจริงของสัญญาณและผลทดสอบย้อนหลังของกฎมุมมองเทคนิค เป็นหลักฐาน ไม่ใช่คำแนะนำ'))}</p>
    <div class="sec"><div class="sec-h"><h2>${esc(XL('Live signal ledger', 'บันทึกสัญญาณสด'))}</h2></div>${ledger}
      <p class="sub">${esc(XL('Recorded now: technical setup changes, new chart patterns and the direction of the Smart Money panel\'s 7-day flow (net buying, net selling, or flat when within ±5% of the panel\'s position on that coin). Since v56 also funding and open-interest regimes: a token\'s funding or daily OI build-up in the top or bottom 10% of its own previous 90 closed days (OKX and Hyperliquid history). The ledger checks about hourly.', 'ตอนนี้บันทึก: การเปลี่ยนมุมมองเทคนิค แพทเทิร์นกราฟใหม่ และทิศเงินของกลุ่ม Smart Money ใน 7 วัน (ซื้อสุทธิ ขายสุทธิ หรือทรงตัวถ้าไม่เกิน ±5% ของโพซิชันกลุ่มในเหรียญนั้น) ตั้งแต่ v56 บันทึกภาวะ funding และ OI ด้วย คือ funding หรือ OI ที่สะสมเพิ่มรายวันอยู่ใน 10% บนสุดหรือล่างสุดของ 90 วันที่ปิดแล้วก่อนหน้าของเหรียญนั้น (ประวัติจาก OKX และ Hyperliquid) ระบบเช็กราวทุกชั่วโมง'))}</p></div>
    <div class="sec"><div class="sec-h"><h2>${esc(XL('Setup backtest', 'ทดสอบย้อนหลังมุมมองเทคนิค'))}</h2></div>${bt}</div>
    <div class="foot">${esc(T('nfa'))}</div></div>`;
}
/* first data load; app.js refreshAll() also calls prfLoad() and re-renders */
prfLoad().then(() => { if (S.route === 'record') pRecord(); else if (S.route === 'markets') { prfChanged(); const b = $('#planBox'), t = tokBySym(S.sel); if (b && t && t.I) b.innerHTML = planHTML(t); } });
