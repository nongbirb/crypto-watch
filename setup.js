/* KMS Capital – Setup card (docs/architect-proof-layer.md §4, Phase 3). Loaded after app.js, patterns.js, leverage.js, proof.js and
   smartmoney.js (shares their globals). Under the state chip of the trade plan card: an evidence checklist, one line per source,
   each green / grey / red with its number and source tab, and its ledger record where the ledger records that kind. No summed score.
   The maths is in setup-core.js (SUC). Data is loaded lazily per token and the card re-renders when it arrives. */
const SU = { sm: undefined, smAt: 0, smReq: null, lev: {}, pat: {}, req: {} };
const SU_TTL = { sm: 6e5, lev: 3e5, pat: 3e5 };
function suRefresh(sym) {
  if (S.route !== 'markets' || S.sel !== sym) return;
  const b = $('#planBox'), t = tokBySym(sym); if (b && t && t.I) b.innerHTML = planHTML(t);
}
function suOnce(key, fn, sym) { if (SU.req[key]) return; SU.req[key] = fn().catch(() => null).finally(() => { SU.req[key] = null; suRefresh(sym); }); }
/* start whatever this token's lines still need; each finished load re-renders the card once */
function suLoad(t) {
  const now = Date.now(), sym = t.symbol;
  if (SU.sm === undefined || now - SU.smAt > SU_TTL.sm) suOnce('sm', async () => {
    SU.smAt = Date.now(); if (typeof SM !== 'undefined' && SM.d) { SU.sm = SM.d; return; }
    try { SU.sm = await getJSON('smart_money.json?t=' + Math.floor(Date.now() / 6e5)); } catch (e) { SU.sm = false; } }, sym);
  const LV = SU.lev[sym]; if ((!LV || now - LV.at > SU_TTL.lev) && typeof loadLev === 'function') suOnce('lev:' + sym, async () => {
    SU.lev[sym] = { at: Date.now(), M: SU.lev[sym] ? SU.lev[sym].M : undefined };
    try { const D = await loadLev(t); SU.lev[sym].M = levModel(t, D); } catch (e) { SU.lev[sym].M = null; } }, sym);
  const Pt = SU.pat[sym]; if ((!Pt || now - Pt.at > SU_TTL.pat) && typeof patCandles === 'function') suOnce('pat:' + sym, async () => {
    if (typeof pBTLoad === 'function') pBTLoad();
    try { const r = await patCandles(t, '1d'); SU.pat[sym] = { at: Date.now(), cands: (r.r && r.r.cands) || [], src: r.src }; } catch (e) { SU.pat[sym] = { at: Date.now(), cands: null, err: e.message }; } }, sym);
  if (typeof PRF !== 'undefined' && PRF.sum === undefined && typeof prfLoad === 'function') suOnce('prf', () => prfLoad(), sym);
}
const suPct = (v, d = 1) => (Number.isFinite(v) ? pct(v, d) : '–');
const suUsd = (v) => (Number.isFinite(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + big(Math.abs(v)) : '–');
const suOrd = (p) => { const n = Math.round(p); if (LANG === 'th') return `${n}`; const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'; return n + s; };
/* ledger record of a line (data/ledger/summary.json, the same gate as the track record: nEff >= 20) */
function suLed(kind, to, sym) {
  if (typeof PRF === 'undefined' || !to) return '';
  if (PRF.sum === undefined) return '';
  const r = SUC.ledgerRow(PRF.sum, kind, to, sym), lab = typeof prfState === 'function' ? prfState(kind, to) : to;
  if (!r) return `<div class="su-led" data-suled="none">${esc(XL(`Ledger: no recorded change to "${lab}" yet`, `บันทึกสัญญาณ: ยังไม่มีการเปลี่ยนเป็น "${lab}"`))}</div>`;
  const h = r.h7, b = r.base && r.base.h7, who = r.sym === 'ALL' ? XL('all tokens', 'ทุกเหรียญ') : r.sym;
  if (typeof prfOk === 'function' && prfOk(h)) return `<div class="su-led" data-suled="ok">${esc(XL(`Ledger (${who}): after a change to "${lab}", median +7d ${pct(h.med, 1)} (${h.nEff} independent)${b && Number.isFinite(b.med) ? ` · any day ${pct(b.med, 1)}` : ''}`, `บันทึกสัญญาณ (${who}): หลังเปลี่ยนเป็น "${lab}" มัธยฐาน 7 วัน ${pct(h.med, 1)} (ไม่ทับกัน ${h.nEff})${b && Number.isFinite(b.med) ? ` · ทุกวัน ${pct(b.med, 1)}` : ''}`))}</div>`;
  return `<div class="su-led" data-suled="few">${esc(XL(`Ledger (${who}): ${r.entries} changes to "${lab}", not enough samples (n=${h ? h.nEff : 0})`, `บันทึกสัญญาณ (${who}): เปลี่ยนเป็น "${lab}" ${r.entries} ครั้ง ตัวอย่างยังไม่พอ (n=${h ? h.nEff : 0})`))}</div>`;
}
const SU_ST = { g: ['green: favourable', 'เขียว: เป็นบวก'], r: ['red: unfavourable', 'แดง: เป็นลบ'], n: ['grey: neutral or not enough data', 'เทา: กลาง ๆ หรือข้อมูลไม่พอ'] };
function suLine(key, st, name, val, src, extra = '') {
  const s = src.tab ? `<button type="button" class="su-src" data-sutab="${src.tab}">${esc(src.l)}</button>` : `<a class="su-src" href="${src.href}">${esc(src.l)}</a>`;
  return `<li class="su-l su-${st}" data-su="${key}" data-sust="${st}"><i class="su-d" aria-hidden="true"></i><div class="su-b"><div class="su-h"><b>${esc(name)}</b><span class="su-sr">${esc(XL(...SU_ST[st]))}</span>${s}</div><div class="su-v">${val}</div>${extra}</div></li>`;
}
const SU_LOADING = () => `<span class="mut">${esc(XL('loading…', 'กำลังโหลด…'))}</span>`;
/* the six evidence lines */
function suLines(t) {
  const I = t.I, sym = t.symbol, out = [], now = Date.now();
  // 1. Trend (existing rule)
  const tr = SUC.trend(I);
  out.push(suLine('trend', tr.st, XL('Trend', 'เทรนด์'), tr.trend === 'Insufficient' ? esc(XL('not enough history (needs 200 daily candles)', 'ประวัติไม่พอ (ต้องมีแท่งรายวัน 200 แท่ง)'))
    : `<b>${esc(T(tr.trend))}</b> · ${esc(XL(`close ${suPct(tr.ma50)} vs MA50, ${suPct(tr.ma200)} vs MA200`, `ราคาปิด ${suPct(tr.ma50)} เทียบ MA50 และ ${suPct(tr.ma200)} เทียบ MA200`))}`, { tab: 'chart', l: T('tabs').chart }));
  // 2. Relative strength vs BTC
  const btc = tokBySym('BTC'); let rsV, rsSt = 'n';
  if (sym === 'BTC') rsV = esc(XL('BTC is the benchmark', 'BTC เป็นตัวเทียบ'));
  else if (!btc || !btc.d1) rsV = btc && !btc.err ? SU_LOADING() : esc(XL('BTC candles not available', 'ยังไม่มีแท่งเทียน BTC'));
  else { const r = SUC.rs(t.d1, btc.d1, now); rsSt = r.st;
    rsV = r.why ? esc(XL(`not enough shared daily history with BTC (${r.n || 0} of ${SUC.BAND.rsMa} days)`, `ประวัติรายวันที่ตรงกับ BTC ไม่พอ (${r.n || 0} จาก ${SUC.BAND.rsMa} วัน)`))
      : `<b class="num ${cls(r.rel)}">${suPct(r.rel)}</b> ${esc(XL(`vs BTC over ${SUC.BAND.rsDays} days · ${sym}/BTC ${r.above ? 'above' : 'below'} its 50-day average (${suPct(r.vsMa)})`, `เทียบ BTC ใน ${SUC.BAND.rsDays} วัน · ${sym}/BTC ${r.above ? 'อยู่เหนือ' : 'อยู่ใต้'}ค่าเฉลี่ย 50 วัน (${suPct(r.vsMa)})`))}`; }
  out.push(suLine('rs', rsSt, XL('Strength vs BTC', 'แรงเทียบ BTC'), rsV, { tab: 'chart', l: T('tabs').chart }));
  // 3. Derivatives (Phase 4 readings, with their coverage label)
  const LV = SU.lev[sym], M = LV ? LV.M : undefined; let dv, dSt = 'n', dLed = ''; // not `L`: that is app.js's localised-text helper
  if (M === undefined) dv = SU_LOADING();
  else if (M === null) dv = esc(XL('no perp data for this token', 'ยังไม่มีข้อมูล Perp ของเหรียญนี้'));
  else { const d = SUC.deriv(M); dSt = d.st;
    const oi = `OI 24h <b class="num ${cls(d.oi24)}">${suPct(d.oi24)}</b>`;
    if (d.why === 'history') dv = `${esc(XL(`Funding: not enough history (${d.days} of ${SUC.BAND.minHist} days)`, `Funding: ประวัติยังไม่พอ (${d.days} จาก ${SUC.BAND.minHist} วัน)`))} · ${oi}`;
    else if (d.pct == null) dv = `${esc(XL('Funding: not available', 'Funding: ยังไม่มีข้อมูล'))} · ${oi}`;
    else { const cov = d.why === 'coverage' ? ` <span class="tagest lvlow" data-lvlow="setup">${esc(XL(`Low coverage: ${d.cov.toFixed(0)}% of open interest`, `ครอบคลุมน้อย: ${d.cov.toFixed(0)}% ของ OI`))}</span>` : '';
      dv = `${esc(XL('Funding', 'Funding'))} <b class="num">${esc(XL(`${suOrd(d.pct)} percentile`, `เปอร์เซ็นไทล์ที่ ${suOrd(d.pct)}`))}</b> ${esc(XL(`of own ${d.days} days`, `ของ ${d.days} วันของตัวเอง`))} · ${oi}${cov}`;
      dLed = suLed('funding_regime', d.regime, sym); } }
  out.push(suLine('deriv', dSt, XL('Derivatives', 'อนุพันธ์ (Perp)'), dv, { tab: 'lev', l: T('tabs').lev }, dLed));
  // 4. Smart Money: panel 7-day flow
  let smV, smSt = 'n', smLed = '';
  if (SU.sm === undefined) smV = SU_LOADING();
  else if (!SU.sm) smV = esc(XL('Smart Money data not available', 'ยังดึงข้อมูล Smart Money ไม่ได้'));
  else { const f = SUC.smflow(SU.sm, sym); smSt = f.st;
    if (f.why === 'nocoin' || f.why === 'nogross') smV = esc(XL(`the panel holds no ${sym} position`, `กลุ่ม Smart Money ไม่ได้ถือ ${sym}`));
    else if (f.why) smV = esc(XL('7-day flow not available yet', 'ยังไม่มีข้อมูลกระแส 7 วัน'));
    else { const lab = { net_buy: XL('net buying', 'ซื้อสุทธิ'), net_sell: XL('net selling', 'ขายสุทธิ'), flat: XL('flat', 'ทรงตัว') }[f.to];
      const span = f.since ? XL(` · since ${jst(new Date(f.from))} (panel reselected)`, ` · ตั้งแต่ ${jst(new Date(f.from))} (เพิ่งเลือกกลุ่มใหม่)`) : '';
      const gp = f.gaps ? XL(` · ${f.gaps} intervals missing`, ` · ขาด ${f.gaps} ช่วง`) : '';
      smV = `<b class="num ${cls(f.net)}">${suUsd(f.net)}</b> ${esc(XL(`7-day net = ${suPct(f.pct)} of the panel's ${sym} position: ${lab}${span}${gp}`, `สุทธิ 7 วัน = ${suPct(f.pct)} ของสถานะ ${sym} ของกลุ่ม: ${lab}${span}${gp}`))}`;
      smLed = suLed('sm_flow', f.to, sym); } }
  out.push(suLine('sm', smSt, 'Smart Money', smV, { href: '#/smart', l: T('smart') }, smLed));
  // 5. Pattern: best active daily pattern under the section 0 display rule
  const Pt = SU.pat[sym]; let pv, pSt = 'n', pLed = '';
  if (!Pt) pv = SU_LOADING();
  else if (!Pt.cands) pv = esc(XL('daily candles for patterns not available', 'ยังดึงแท่งรายวันสำหรับแพทเทิร์นไม่ได้'));
  else { const rec = typeof pTypeRec === 'function' && typeof PT !== 'undefined' && PT.bt ? (ty) => pTypeRec(ty, '1d') : null, p = SUC.pattern(Pt.cands, rec); pSt = p.st;
    if (p.why === 'none') pv = esc(XL('no active daily pattern', 'ไม่มีแพทเทิร์นรายวันที่ยังใช้ได้'));
    else { const dir = p.dir > 0 ? XL('bullish', 'ขาขึ้น') : p.dir < 0 ? XL('bearish', 'ขาลง') : XL('no direction yet', 'ยังไม่มีทิศ');
      const stt = p.status === 'confirmed' ? XL('confirmed', 'ยืนยันแล้ว') : XL('forming', 'กำลังก่อตัว');
      const sc = p.scope === 'any' ? XL('all timeframes', 'ทุกกรอบเวลา') : '1D';
      const rr = !rec ? XL('record loading', 'กำลังโหลดสถิติ') : p.legacy ? XL('no record for this type', 'ยังไม่มีสถิติของประเภทนี้') : p.few ? XL(`not enough cases (n=${p.nEff})`, `เคสไม่พอ (n=${p.nEff})`)
        : p.weak ? XL(`weak record: ${p.rate.toFixed(0)}% hit (${sc})`, `สถิติอ่อน: ถึงเป้า ${p.rate.toFixed(0)}% (${sc})`) : XL(`record ${p.rate.toFixed(0)}% hit, ${p.nEff} independent (${sc})`, `สถิติถึงเป้า ${p.rate.toFixed(0)}% ไม่ทับกัน ${p.nEff} (${sc})`);
      pv = `<b>${esc(typeof pName === 'function' ? pName(p.type) : p.type)}</b> · ${esc(`${dir} · ${stt} · ${XL('score', 'คะแนน')} ${p.conf}`)} · <span class="${p.weak || p.few ? 'pweak-t' : ''}" data-surule="${p.legacy ? 'legacy' : p.few ? 'few' : p.weak ? 'weak' : 'ok'}">${esc(rr)}</span>`;
      pLed = suLed('pattern', p.type, sym); } }
  out.push(suLine('pat', pSt, XL('Pattern', 'แพทเทิร์น'), pv, { tab: 'pat', l: T('tabs').pat || XL('Patterns', 'แพทเทิร์น') }, pLed));
  // 6. Event risk: high-impact calendar event for this token or macro within 48 h
  let ev, eSt = 'n';
  if (!S.cal || !Array.isArray(S.cal.events)) ev = esc(XL('calendar not available', 'ยังดึงปฏิทินไม่ได้'));
  else { const tsOf = (e) => (e.time ? new Date(`${e.date}T${e.time}:00`).getTime() : null), d0 = (e) => { const x = new Date(`${e.date}T00:00:00`).getTime(); return isNaN(x) ? null : x; };
    const r = SUC.event(S.cal.events, sym, now, (e) => { const x = tsOf(e); return Number.isFinite(x) ? x : null; }, d0); eSt = r.st;
    if (!r.next) ev = esc(XL(`no high-impact event for ${sym} or macro in the next ${SUC.BAND.ev} h`, `ไม่มีอีเวนต์ผลกระทบสูงของ ${sym} หรือเศรษฐกิจมหภาคใน ${SUC.BAND.ev} ชม. ข้างหน้า`));
    else { const e = r.next.e, title = L(e, 'title') || e.title, when = r.next.allDay ? XL(`${e.date} (all day)`, `${e.date} (ทั้งวัน)`) : XL(`in ${Math.max(0, Math.round((r.next.t - now) / 36e5))} h (${jst(new Date(r.next.t))})`, `อีก ${Math.max(0, Math.round((r.next.t - now) / 36e5))} ชม. (${jst(new Date(r.next.t))})`);
      ev = `<b>${esc(title)}</b> · ${esc(when)}${r.hits.length > 1 ? esc(XL(` · +${r.hits.length - 1} more`, ` · อีก ${r.hits.length - 1} รายการ`)) : ''}`; } }
  out.push(suLine('event', eSt, XL('Event risk (48 h)', 'ความเสี่ยงอีเวนต์ (48 ชม.)'), ev, { href: '#/calendar', l: T('calendar') }));
  return out;
}
function suHelp() {
  return XL('Each line is one piece of evidence from its own tab, coloured on a rule fixed in advance: green points the same way as an uptrend setup, red points against it, grey is neutral, not available or based on too little data. The lines are not added up into a score. Trend: price against its 50- and 200-day averages. Strength vs BTC: the token\'s 30-day return divided by BTC\'s, and the token/BTC ratio against its 50-day average. Derivatives: funding ranked against the token\'s own last 90 closed days (red = top 10%, longs paying the most; green = bottom 10%) and the 24h change in open interest; grey when the ranked venues hold under half of open interest. Smart Money: the panel\'s 7-day net flow on this coin as a share of its position there (±5% = flat). Pattern: the best active daily pattern; a type with fewer than 30 independent cases or a hit rate under 35% stays grey. Event risk: a high-impact event for this token or the macro calendar within 48 hours. Where the signal ledger records a line, its record is shown under it. Timing: the setup is read from closed daily candles and changes only after two daily closes in a row agree, so a state can now change up to two days later than it did before Phase 1 (when it read the still-open candle).',
    'แต่ละบรรทัดคือหลักฐานหนึ่งชิ้นจากแท็บของมันเอง สีมาจากกฎที่ตั้งไว้ล่วงหน้า เขียว = ไปทางเดียวกับเซ็ตอัปขาขึ้น แดง = สวนทาง เทา = กลาง ๆ ไม่มีข้อมูล หรือข้อมูลน้อยเกินไป ไม่มีการรวมเป็นคะแนนเดียว เทรนด์: ราคาเทียบเส้นค่าเฉลี่ย 50 และ 200 วัน แรงเทียบ BTC: ผลตอบแทน 30 วันของเหรียญหารด้วยของ BTC และอัตราส่วนเหรียญ/BTC เทียบค่าเฉลี่ย 50 วัน อนุพันธ์: Funding จัดอันดับเทียบ 90 วันที่ปิดแล้วของเหรียญเอง (แดง = top 10% ฝั่ง Long จ่ายหนักสุด เขียว = ล่างสุด 10%) และ OI เปลี่ยนใน 24 ชม. ถ้ากระดานที่ใช้จัดอันดับถือ OI ไม่ถึงครึ่งจะเป็นสีเทา Smart Money: กระแสสุทธิ 7 วันของกลุ่มในเหรียญนี้ เทียบสถานะของกลุ่มในเหรียญนั้น (±5% = ทรงตัว) แพทเทิร์น: แพทเทิร์นรายวันที่ดีที่สุดที่ยังใช้ได้ ถ้าประเภทนั้นมีเคสไม่ทับกันไม่ถึง 30 หรือถึงเป้าไม่ถึง 35% จะเป็นสีเทา ความเสี่ยงอีเวนต์: อีเวนต์ผลกระทบสูงของเหรียญนี้หรือเศรษฐกิจมหภาคใน 48 ชม. ถ้าบันทึกสัญญาณเก็บบรรทัดไหนไว้ จะโชว์สถิติไว้ใต้บรรทัดนั้น เรื่องเวลา: มุมมองอ่านจากแท่งรายวันที่ปิดแล้ว และจะเปลี่ยนเมื่อแท่งปิดรายวันสองแท่งติดกันยืนยันตรงกันเท่านั้น จึงอาจเปลี่ยนช้ากว่าก่อน Phase 1 ได้ถึงสองวัน (ก่อนหน้านั้นอ่านแท่งที่ยังไม่ปิด)');
}
/* the block under the state chip */
function suHTML(t) {
  if (typeof SUC === 'undefined' || !t || !t.I) return '';
  suLoad(t);
  const P = t.I.plan, pend = P.pending ? `<p class="su-pend" data-supend="${esc(P.pending)}">${esc(XL(`The last daily close alone reads "${T(P.pending)}". The state changes to it only if the next daily close agrees.`, `แท่งปิดรายวันล่าสุดแท่งเดียวอ่านได้ "${T(P.pending)}" สถานะจะเปลี่ยนตามก็ต่อเมื่อแท่งปิดถัดไปยืนยันตรงกัน`))}</p>` : '';
  return `${pend}<div class="su" data-su-card><div class="su-top"><span class="eyebrow">${esc(XL('Evidence · not summed', 'หลักฐาน · ไม่รวมเป็นคะแนน'))}</span>${uiHelp(suHelp(), XL('How to read the evidence', 'อ่านหลักฐานยังไง'))}</div><ul class="su-ev">${suLines(t).join('')}</ul></div>`;
}
/* Downtrend (stored code Avoid): mirrored plan rows for the trade plan table. Returns null when there is no resistance above. */
function suMirrorRows(t, row, d) {
  const M = SUC.mirror(t.I.plan); if (!M) return null; const p = t.price;
  return { M, rows: [
    row(esc(XL('Invalidation (close above)', 'จุดยกเลิก (ปิดเหนือ)')), LC.stop, px(M.inv), d(M.inv)),
    row(esc(XL('Resistance zone', 'โซนแนวต้าน')), LC.entry, `${px(M.zone[0])} – ${px(M.zone[1])}`, d((M.zone[0] + M.zone[1]) / 2)),
    row(esc(T('now')), 'var(--tx)', `<span data-px="${t.symbol}">${px(p)}</span>`, '', 'now'),
    ...M.tps.map((x, i) => row(`${esc(XL(`Target ${i + 1}`, `เป้า ${i + 1}`))} <span class="mut" style="font-size:11px">${x.rr.toFixed(1)}R${x.basis === 'daily support' ? '' : ' ' + esc(XL('(no support left)', '(ไม่มีแนวรับเหลือ)'))}</span>`, LC.tp, px(x.price), d(x.price)))].join('') };
}
const suMirrorTag = () => `<p class="su-mir" data-sumirror><b>${esc(XL('Levels, not a short call', 'เป็นแค่ระดับราคา ไม่ใช่สัญญาณ Short'))}</b> ${esc(XL('Mirrored from the daily plan: resistance zone above, invalidation above it, targets at the supports below.', 'กลับด้านจากแผนรายวัน: โซนแนวต้านด้านบน จุดยกเลิกเหนือโซน และเป้าที่แนวรับด้านล่าง'))}</p>`;
/* source-tab buttons inside the card switch the token's tab without touching the tab bar's ARIA state elsewhere */
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-sutab]'); if (!b) return;
  S.tab = b.dataset.sutab; $$('.tabs [data-tab]').forEach((x) => x.setAttribute('aria-selected', x.dataset.tab === S.tab));
  const t = tokBySym(S.sel); if (t) renderTab(t); const tb = $('.tabs'); if (tb && tb.scrollIntoView) tb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});
