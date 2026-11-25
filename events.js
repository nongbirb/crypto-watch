/* Events v1: one page per market-moving event (docs/events-v1.md). Data: data/events/*.json built by scripts/build_events.mjs.
   Every number shows its source link and data time; missing data says "unavailable", never 0. No buy/sell calls. */
Object.assign(I18N.en, {
  events: 'Events', evNew: 'NEW', evLocal: 'Times shown in your local time', evUpcoming: 'Upcoming', evReleased: 'Released', evBreaking: 'Breaking', evPast: 'Past',
  evPriced: 'Already priced in?', evExpected: 'Expected', evActual: 'Actual', evBefore: 'Move before (24h)', evImplied: 'Options expected move', evAfter: 'Move after', evPos: 'Positioning',
  evChain: 'How it spread', evTap: 'tap any box', evView: 'Our view', evReplay: 'Replay & record', evUnavail: 'unavailable', evWait: 'waiting for release', evWaitData: 'waiting for data', evLate: 'late', evStale: 'stale',
  evEvidence: 'evidence only', evNoFc: 'unscheduled, no forecast', evShowFull: 'Show full chain', evHideFull: 'Show short chain', evUpNext: 'Up next', evOpen: 'Open event', evSeeChain: 'Open event',
  evMine: 'My tokens', evLegendBlue: 'blue box = measured reaction', evLegendDot: 'dotted line = our explanation (not measured)', evSel: 'Selected',
  evDir: 'Direction', evSize: 'Size', evStr: 'Strength', evConf: 'Confidence', evWhy: 'Why', evWrongIf: 'Proven wrong if', evSrc: 'Source', evTime: 'Data time',
  evNone: 'No events yet.', evLoadErr: 'Could not load events', evNotScored: 'not scored yet', evMatched: 'Direction matched', evMissed: 'Direction missed', evFlatX: 'too small to score', evFlatNC: 'Flat · no call', evSrcWait: 'source not updated yet', evSrcLatest: 'latest',
  evWrongLvl: 'Proven-wrong level', evHit: 'Hit', evNotHit: 'Not hit', evScorecard: 'Scorecard', evPastSame: 'Past events of this type',
  vSurprise: 'SURPRISE', vPriced: 'PRICED IN', vNodata: 'NOT ENOUGH DATA', vNohist: 'NOT ENOUGH HISTORY',
  up: 'Up', down: 'Down', flat: 'Flat', weak: 'Weak', medium: 'Medium', strong: 'Strong', low: 'Low', high: 'High'
});
Object.assign(I18N.th, {
  events: 'อีเวนต์', evNew: 'ใหม่', evLocal: 'เวลาที่แสดงเป็นเวลาตามเครื่องคุณ', evUpcoming: 'กำลังจะมา', evReleased: 'ประกาศแล้ว', evBreaking: 'ข่าวด่วน', evPast: 'ที่ผ่านมา',
  evPriced: 'ตลาด price in ไปแล้วหรือยัง', evExpected: 'ตลาดคาด', evActual: 'ออกจริง', evBefore: 'ขยับก่อนประกาศ (24 ชม.)', evImplied: 'Options คาดว่าจะเหวี่ยง', evAfter: 'ขยับหลังประกาศ', evPos: 'Positioning',
  evChain: 'แรงส่งต่อไปไหนบ้าง', evTap: 'แตะกล่องเพื่อดูรายละเอียด', evView: 'มุมมองของเรา', evReplay: 'ย้อนดูผล', evUnavail: 'ไม่มีข้อมูล', evWait: 'รอประกาศ', evWaitData: 'รอข้อมูล', evLate: 'ข้อมูลช้า', evStale: 'ข้อมูลเก่า',
  evEvidence: 'ไว้ประกอบเท่านั้น', evNoFc: 'ข่าวนอกตาราง ไม่มีตัวเลขคาดการณ์', evShowFull: 'ดูทั้งเส้นทาง', evHideFull: 'ย่อเส้นทาง', evUpNext: 'อีเวนต์ถัดไป', evOpen: 'เปิดดู', evSeeChain: 'ดูอีเวนต์',
  evMine: 'เหรียญของฉัน', evLegendBlue: 'กรอบสีฟ้า = วัดจากราคาจริง', evLegendDot: 'เส้นประ = คำอธิบายของเรา (ไม่ได้วัด)', evSel: 'ที่เลือก',
  evDir: 'ทิศทาง', evSize: 'ขยับเท่าไร', evStr: 'แรงแค่ไหน', evConf: 'มั่นใจแค่ไหน', evWhy: 'ทำไม', evWrongIf: 'ผิดถ้า', evSrc: 'แหล่งข้อมูล', evTime: 'เวลาข้อมูล',
  evNone: 'ยังไม่มีอีเวนต์', evLoadErr: 'โหลดข้อมูลอีเวนต์ไม่สำเร็จ', evNotScored: 'ยังไม่ได้ให้คะแนน', evMatched: 'ทิศทางตรง', evMissed: 'ทิศทางพลาด', evFlatX: 'ขยับน้อยไป ยังให้คะแนนไม่ได้', evFlatNC: 'ไม่นับ (flat)', evSrcWait: 'แหล่งข้อมูลยังไม่อัปเดต', evSrcLatest: 'ล่าสุด',
  evWrongLvl: 'จุดที่ถือว่ามุมมองผิด', evHit: 'โดนแล้ว', evNotHit: 'ยังไม่โดน', evScorecard: 'สถิติความแม่น', evPastSame: 'อีเวนต์แบบเดียวกันที่ผ่านมา',
  vSurprise: 'เซอร์ไพรส์', vPriced: 'PRICED IN', vNodata: 'ข้อมูลยังไม่พอ', vNohist: 'ประวัติยังไม่พอ',
  up: 'ขึ้น', down: 'ลง', flat: 'ทรง ๆ', weak: 'เบา', medium: 'กลาง ๆ', strong: 'แรง', low: 'ต่ำ', high: 'สูง'
});
ICONS.events = '<path d="M4 17l4.5-5 3.5 3 4-6 4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="9" r="1.6" fill="currentColor"/>';
if (!ROUTES.includes('events')) { ROUTES.splice(1, 0, 'events'); NAV.splice(NAV.indexOf('markets') + 1, 0, 'events'); }
// app.js boot parsed the hash before this file loaded; claim a deep link to #/events here.
if (/^#\/events(\/|$)/.test(location.hash)) S.route = 'events';
const EV = { idx: null, files: {}, hist: null, err: null, pre: null, tab: 'cal', cs: 'BTC', cc: {}, jump: false };
const evNum = (v) => typeof v === 'number' && Number.isFinite(v);
const evPct = (v, d = 2) => (evNum(v) ? pct(v, d) : null);
const evNA = () => `<span class="mut">${esc(T('evUnavail'))}</span>`;
const evT = (t, withDate = true) => { const d = new Date(t); if (isNaN(d)) return ''; return (withDate ? d.toLocaleDateString(loc(), { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' : '') + d.toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' }) + ' ' + tzL(d); };
const evDay = (t) => new Date(t).toLocaleDateString(loc(), { weekday: 'short', month: 'short', day: 'numeric' });
const evSrc = (o, label) => (o && /^https:\/\//.test(o.url || '') ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(label || o.src || 'source')} ↗</a>` : '');
const evTitle = (e) => (LANG === 'th' && e.th_title) || e.title;
// Direction result chip: true / false / 'flat' (no call) / null. Flat rule: |BTC| strictly under 0.3% at 1h, 1.0% at 1d (docs/events-v1.md).
const evRes = (x) => (x === true ? `<b class="up">✓ ${esc(T('evMatched'))}</b>` : x === false ? `<b class="dn">✗ ${esc(T('evMissed'))}</b>` : x === 'flat' ? `<b class="mut" data-evflat>${esc(T('evFlatNC'))}</b>` : `<span class="mut">${esc(T('evNotScored'))}</span>`);
const evFlatRule = () => XL(`Flat = BTC moved less than ${EVC.R.FLAT.h1.toFixed(2)}% at 1h or ${EVC.R.FLAT.d1.toFixed(2)}% at 1 day (exactly ${EVC.R.FLAT.h1.toFixed(2)}% / ${EVC.R.FLAT.d1.toFixed(2)}% counts as a call). A flat move when the scenario expected up or down is "no call": not counted as right or wrong.`, `Flat = BTC ขยับไม่ถึง ${EVC.R.FLAT.h1.toFixed(2)}% ใน 1 ชม. หรือไม่ถึง ${EVC.R.FLAT.d1.toFixed(2)}% ใน 1 วัน (ถ้าขยับ ${EVC.R.FLAT.h1.toFixed(2)}% / ${EVC.R.FLAT.d1.toFixed(2)}% พอดี นับเป็นการชี้ทิศ) ถ้าฉากคาดว่าขึ้นหรือลงแต่ราคา flat จะ "ไม่นับ" ไม่ถือว่าถูกหรือผิด`);
// Source of a waiting macro series: latest date the source has published, and how often it publishes (no number is ever filled in).
const EV_PUB = { dollar: ['Fed H.10 posts these daily values once a week (Mondays).', 'เฟดเผยแพร่ H.10 ค่ารายวันสัปดาห์ละครั้ง (วันจันทร์)'], oil: ['EIA posts daily WTI prices to FRED about once a week.', 'EIA อัปเดตราคา WTI รายวันขึ้น FRED ราวสัปดาห์ละครั้ง'], fedbs: ['Weekly H.4.1 (Wednesday level, published Thursday).', 'H.4.1 รายสัปดาห์ (ยอดวันพุธ เผยแพร่วันพฤหัสฯ)'], vix: ['FRED adds the VIX close with a delay of one or more business days.', 'FRED ใส่ราคาปิด VIX ช้ากว่าจริง 1 วันทำการขึ้นไป'], jp10y: ['Japan MOF posts JGB yields after the Tokyo close, next business day at the latest.', 'กระทรวงการคลังญี่ปุ่นลงยีลด์ JGB หลังตลาดโตเกียวปิด อย่างช้าวันทำการถัดไป'], usdjpy: ['ECB reference rates are posted around 16:00 CET on business days.', 'ECB ประกาศ reference rate ราว 16:00 น. เวลายุโรปกลาง ทุกวันทำการ'] };
const evSrcWait = (m) => `${T('evSrcWait')}${m && m.latest ? ` · ${T('evSrcLatest')} ${evDay(m.latest + 'T12:00:00Z')}` : ''}`;
const evStatus = (e, now = Date.now()) => EVC.status(e, now);
async function evLoadIdx(force) {
  if (EV.idx && !force) return EV.idx;
  try { EV.idx = await getJSON('data/events/index.json?ts=' + Date.now()); EV.err = null; } catch (e) { EV.err = e.message; }
  getJSON('data/events/prelive.json?ts=' + Date.now()).then((x) => { EV.pre = x; }).catch(() => { EV.pre = null; }); // informational pre-release snapshot; missing = "not available yet"
  if (!EV.hist) getJSON('data/events/history.json?ts=' + Date.now()).then((h) => { EV.hist = h; if (S.route === 'events') pEvents(true); }).catch(() => { EV.hist = { types: {} }; });
  return EV.idx;
}
/* One boundary for bad data: any malformed number is dropped here, so the page shows "unavailable" for it, never 0 or NaN. */
function evClean(ev) {
  const n = (v) => typeof v === 'number' && isFinite(v), mv = (x) => x && n(x.pct) && x.from && x.to && x.from.at && x.to.url;
  const keep = (o, f) => { if (o && typeof o === 'object') for (const k of Object.keys(o)) if (!f(o[k])) delete o[k]; };
  ev.post = ev.post || {}; for (const k of ['before24h', 'h1', 'd1', 'lock_d1']) keep(ev.post[k], mv); keep(ev.pre_move, mv);
  if (ev.pre) keep(ev.pre.implied, (x) => x && n(x.pct) && x.pct > 0);
  keep(ev.pos, (P) => { if (!P || typeof P !== 'object') return false; if (P.funding && !n(P.funding.pct8h)) delete P.funding; if (P.oi && !n(P.oi.coins)) delete P.oi; if (P.cot && !n(P.cot.lev_net)) delete P.cot; return true; });
  for (const k of ['consensus', 'actual']) if (ev[k] && !n(ev[k].value)) delete ev[k];
  keep(ev.macro, (m) => m && typeof m === 'object');
  return ev;
}
async function evLoad(id) {
  if (EV.files[id]) return EV.files[id];
  try { EV.files[id] = evClean(await getJSON(`data/events/${encodeURIComponent(id)}.json?ts=` + Date.now())); } catch (e) { EV.files[id] = { err: e.message }; } return EV.files[id];
}
const evList = () => ((EV.idx && EV.idx.events) || []);
/* past average |move| after same-type events, from real history + already scored events (never invented) */
function evPast(type, sym, h, before) {
  const rows = ((EV.hist && EV.hist.types && EV.hist.types[type]) || []).filter((r) => !before || Date.parse(r.at) < Date.parse(before)) /* only events before this one */.map((r) => r.moves && r.moves[sym] && r.moves[sym][h]).filter(evNum);
  return { avg: rows.length ? rows.reduce((a, v) => a + Math.abs(v), 0) / rows.length : null, n: rows.length };
}
/* ---------- nav badge / dot ---------- */
function evHot(now = Date.now()) { return evList().some((e) => e.impact === 'high' && !e.nq && Math.abs(Date.parse(e.at) - now) < 864e5); }
const _evShell = renderShell;
renderShell = function () {
  _evShell();
  const l = EV.idx && EV.idx.launched ? Date.parse(EV.idx.launched) : null, isNew = !l || Date.now() < l + 14 * 864e5, hot = evHot();
  $$('[data-route="events"]').forEach((a) => { const s = a.querySelector('span'); if (!s || a.querySelector('.evbadge, .evdot')) return;
    if (hot) s.insertAdjacentHTML('afterend', `<i class="evdot" title="${esc(XL('Big event within 24 hours', 'มีอีเวนต์ใหญ่ภายใน 24 ชม.'))}"></i>`);
    if (isNew) a.insertAdjacentHTML('beforeend', `<b class="evbadge">${esc(T('evNew'))}</b>`); });
};
/* ---------- Calendar + X Narrative hooks ---------- */
function evFor(e) { // a Calendar row -> its Event page, if one exists (same instant, or same day when the time is unknown)
  const ts = e.time ? new Date(`${e.date}T${e.time}:00`).getTime() : null;
  return evList().find((x) => x.kind === 'scheduled' && (ts ? Math.abs(Date.parse(x.at) - ts) < 6e4 : lYmd(new Date(x.at)) === e.date && (x.tokens || []).some((t) => (e.tokens || []).includes(t))));
}
function evChain(e) { const x = evFor(e); return x ? `<a class="link evsee" href="#/events/${esc(x.id)}">${esc(T('evSeeChain'))} →</a>` : ''; }
if (typeof nSrc === 'function') { const _n = nSrc; nSrc = function (a) { const h = _n(a); const u = new Set((a || []).map((s) => s.u)); const x = evList().find((e) => e.kind === 'breaking' && !e.nq && (e.cands || []).some((c) => u.has(c)));
  return x ? h + `<a class="link evsee" href="#/events/${esc(x.id)}">${esc(T('evSeeChain'))} →</a>` : h; }; }
/* ---------- Markets: Up next card ---------- */
function evCountdown(at) { const ms = Date.parse(at) - Date.now(); if (ms <= 0) return XL('now', 'ถึงเวลาแล้ว'); const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4);
  return XL('in ', 'อีก ') + (d ? `${d}${XL('d', ' วัน')} ${h}${XL('h', ' ชม.')}` : h ? `${h}${XL('h', ' ชม.')} ${m}${XL('m', ' นาที')}` : `${m}${XL('m', ' นาที')}`); }
function evUpNext() {
  const mk = $('#mk'); if (!mk) return; let c = $('#evUp'); const now = Date.now();
  const e = evList().filter((x) => x.kind === 'scheduled' && Date.parse(x.at) > now).sort((a, b) => (a.impact === 'high' ? 0 : 1) - (b.impact === 'high' ? 0 : 1) || a.at.localeCompare(b.at)).filter((x, i, a) => Date.parse(x.at) - now < 7 * 864e5 || i === 0).sort((a, b) => a.at.localeCompare(b.at))[0];
  if (!e) { if (c) c.remove(); return; }
  const html = `<a class="evup card" href="#/events/${esc(e.id)}"><span class="eyebrow">${esc(T('evUpNext'))}</span><b>${esc(evTitle(e))}</b><span class="sub">${esc(e.time_known === false ? evDay(e.at) : evT(e.at))}</span><span class="evcd num" data-evcd="${esc(e.at)}">${esc(evCountdown(e.at))}</span><span class="link">${esc(T('evOpen'))} →</span></a>`;
  if (!c) { c = document.createElement('div'); c.id = 'evUp'; const ov = $('#ovSec'); ov ? ov.before(c) : mk.appendChild(c); }
  c.innerHTML = html;
}
const _evMk = pMarkets;
pMarkets = function (soft) { _evMk(soft); if (EV.idx) evUpNext(); else evLoadIdx().then(() => { evUpNext(); renderShell(); }); };
setInterval(() => { $$('[data-evcd]').forEach((el) => { el.textContent = evCountdown(el.dataset.evcd); }); }, 30e3);
function evScen(ev) { const v = ev.view; if (!v || !v.locked_at) return null; if (v.breaking) return (v.scenarios || [])[0] || null; const k = EVC.scenarioFor(ev.actual && ev.actual.value, v.scenarios); return k ? v.scenarios.find((s) => s.key === k) : null; }
/* ---------- page ---------- */
// Lock proof: verified only when GitHub recorded a push containing the lock commit before the release (docs/events-v1.md §5).
function evProofTag(ev) {
  if (ev.kind === 'breaking' || !ev.view || !ev.view.locked_at) return '';
  const p = ev.lock_proof; if (EVC.lockOk(ev)) return `<span class="evtag" data-evproof="ok" title="${esc(p.commit)}">${esc(XL('lock verified: pushed', 'ยืนยันการล็อกแล้ว: push เมื่อ'))} ${esc(evT(p.pushed_at))} · ${esc(String(p.commit).slice(0, 7))}</span>`;
  return `<span class="evtag late" data-evproof="no">${esc(XL('lock not verified', 'ยังยืนยันการล็อกไม่ได้'))}</span>`;
}
function evViewHtml(ev) {
  const v = ev.view, up = evStatus(ev) === 'upcoming', sc = evScen(ev), d = (k) => k ? `<span class="${k === 'up' ? 'up' : k === 'down' ? 'dn' : ''}">${esc(T(k))}</span>` : '–';
  if (!v || !v.locked_at) return '';
  const L2 = (o, k) => (LANG === 'th' && o['th_' + k]) || o[k];
  return `<section class="card evcard"><h2>${esc(T('evView'))} <span class="evlock">🔒 ${esc(XL('Locked', 'ล็อก'))} ${esc(evT(v.locked_at))}</span>${evProofTag(ev)}${v.after_news ? `<span class="evtag late">${esc(XL('written after the news', 'เขียนหลังข่าวออก'))}</span>` : ''}</h2>
    ${v.after_news ? `<p class="sub">${esc(XL('Written after the headline, so it never counts as a prediction. Scored 1 day after it was locked.', 'เขียนหลังข่าวออก จึงไม่นับเป็นการทำนาย ให้คะแนนหลังล็อก 1 วัน'))}</p>` : ''}
    <div class="tscroll"><table class="evtbl"><thead><tr><th>${esc(XL('Scenario', 'ฉาก'))}</th><th>${esc(v.metric || '')}</th><th>${esc(XL('Yields', 'ยีลด์'))}</th><th>${esc(XL('Dollar', 'ดอลลาร์'))}</th><th>BTC</th></tr></thead><tbody>
    ${(v.scenarios || []).map((x) => `<tr class="${sc && sc.key === x.key ? 'hit' : ''}"><td><b>${esc(L2(x, 'label'))}</b>${sc && sc.key === x.key ? ` ← ${esc(XL('happened', 'เกิดจริง'))}` : ''}</td><td class="num">${esc(x.range || '')}</td><td>${d(x.yields)}</td><td>${d(x.dollar)}</td><td>${d(x.btc)}</td></tr>`).join('')}</tbody></table></div>
    <div class="blk"><b>${esc(XL('Opposite case', 'มุมกลับ'))}</b>${esc(L2(v, 'opposite') || '')}</div><div class="blk"><b>${esc(T('evWrongIf'))}</b>${esc(L2(v, 'invalidation') || '')}</div></section>`;
}
function evReplayHtml(ev) {
  const post = ev.kind === 'breaking' ? { d1: ev.post && ev.post.lock_d1 } : ev.post, r = EVC.scoreView(ev.view, ev.actual && ev.actual.value, post, EVC.lockOk(ev));
  const mk = (h) => evRes(r.flat && r.flat[h] ? 'flat' : r[h]);
  const kv = (l, v) => `<div class="ixkv"><span>${esc(l)}</span>${v}</div>`;
  const hasV = ev.view && ev.view.locked_at, unv = hasV && !EVC.lockOk(ev);
  const scored = evList().filter((e) => e.view && e.lockv && e.scored).length;
  return `<section class="card evcard"><h2>${esc(T('evReplay'))}</h2>
    ${unv ? `<p class="sub" data-evunv>${esc(XL('Lock not verified: no push recorded by GitHub before the release, so this view is not scored as a locked forecast.', 'ยังยืนยันการล็อกไม่ได้ เพราะ GitHub ไม่มีบันทึกการ push ก่อนประกาศ เลยไม่นับมุมมองนี้เป็นการทำนายที่ล็อกไว้'))}</p>` : ''}
    ${hasV && !unv ? (ev.kind === 'breaking' ? '' : kv(XL('1 hour after', '1 ชม. หลังประกาศ'), mk('h1'))) + kv(XL('1 day after', '1 วันหลังประกาศ'), mk('d1')) + kv(T('evWrongLvl'), r.wrong == null ? `<span class="mut">${esc(T('evNotScored'))}</span>` : `<b class="${r.wrong ? 'dn' : ''}">${esc(r.wrong ? T('evHit') : T('evNotHit'))}</b>`) + `<p class="sub sm" data-evflatrule>${esc(evFlatRule())}</p>` : unv ? '' : `<p class="mut sm">${esc(XL('No locked view, nothing to score.', 'ไม่มีมุมมองที่ล็อกไว้ เลยไม่มีคะแนน'))}</p>`}
    <div class="blk" data-evscorecard><b>${esc(T('evScorecard'))}</b>${evScorecard(scored >= EVC.R.SCORECARD_MIN, scored)}</div></section>`;
}
/* Scorecard of 1-day results: "X right of Y calls (Z no call)". The right/wrong count stays hidden until SCORECARD_MIN scored events (small samples mislead);
   before that only the progress and the no-call count show, so flat results are never hidden. */
function evScorecard(open, scored) { const t = EVC.tally(evList().filter((e) => e.view && e.lockv && e.scored).map((e) => EV.files[e.id]).filter((ev) => ev && !ev.err).map((ev) => EVC.scoreView(ev.view, ev.actual && ev.actual.value, ev.kind === 'breaking' ? { d1: ev.post.lock_d1 } : ev.post, EVC.lockOk(ev))));
  const nc = XL(`${t.nocall} no call`, `ไม่นับ ${t.nocall}`), M = EVC.R.SCORECARD_MIN;
  return open ? `<span class="num" data-evtally>${esc(XL(`${t.right} right of ${t.calls} calls (${nc})`, `ถูก ${t.right} จาก ${t.calls} ครั้งที่ชี้ทิศ (${nc})`))}</span> <span class="mut">${esc(XL('1-day direction', 'ทิศทาง 1 วัน'))}</span>`
    : `<span class="mut" data-evtally>${esc(XL(`Shows after ${M} scored events · ${scored} of ${M} so far (${t.calls} call${t.calls === 1 ? '' : 's'}, ${nc})`, `จะแสดงเมื่อให้คะแนนครบ ${M} อีเวนต์ · ตอนนี้ ${scored} จาก ${M} (ชี้ทิศ ${t.calls} ครั้ง, ${nc})`))}</span>`; }
const evPre = (id) => (EV.pre && EV.pre.events && EV.pre.events[id]) || null;
// Extra printed metrics (e.g. headline CPI next to core): actual from ev.actual.also, consensus from ev.consensus.also, matched by metric name. Data values only.
function evAlso(ev) { const ac = ev.actual, cs = ev.consensus; if (!ac || !Array.isArray(ac.also)) return [];
  return ac.also.filter((x) => x && evNum(x.value)).map((x) => { const c = ((cs && cs.also) || []).find((y) => y && y.metric === x.metric && evNum(y.value));
    return { key: String(x.metric || '').split(' ')[0].toLowerCase(), name: (LANG === 'th' && ((c && c.th_metric) || x.th_metric)) || x.metric, a: x.value + (x.unit || ''), av: x.value, c: c ? c.value + (c.unit || '') : null, cv: c ? c.value : null }; }); }
/* ---------- v76 page: two tabs (economic calendar / sharp price moves). An event = its numbers (forecast, previous, actual), the market's
   reaction on a chart around the release, and how the same kind of event moved BTC before. Options, funding, COT and the locked view sit
   in one folded "In depth" section. No chain diagram (full-day macro changes cannot be tied to the release) and no "priced in" badge
   (that needs a measured surprise; what can be measured is whether the move was bigger or smaller than usual). ---------- */
const evShow = (e) => e.kind !== 'breaking' || !(e.nq || e.cu || /cause unclear/i.test(e.title || '')); // sharp moves: only with a headline near the move
const evTabOf = (e) => (e.kind === 'breaking' ? 'move' : 'cal');
function evPick() {
  const now = Date.now(), L = evList().filter(evShow), id = (location.hash.match(/^#\/events\/([a-z0-9-]+)/) || [])[1];
  const hit = id && L.find((e) => e.id === id); if (hit) { EV.tab = evTabOf(hit); return id; }
  if (EV.tab === 'move') { const m = L.filter((e) => e.kind === 'breaking').sort((a, b) => b.at.localeCompare(a.at))[0]; return m ? m.id : null; }
  const S0 = L.filter((e) => e.kind === 'scheduled'), recent = S0.filter((e) => Date.parse(e.at) <= now && now - Date.parse(e.at) < 3 * 864e5).sort((a, b) => b.at.localeCompare(a.at))[0];
  const up = S0.filter((e) => Date.parse(e.at) > now).sort((a, b) => a.at.localeCompare(b.at))[0], last = S0.slice().sort((a, b) => b.at.localeCompare(a.at))[0];
  return (recent || up || last || {}).id || null;
}
const evTime = (e) => (e.time_known === false ? XL('all day', 'ทั้งวัน') : new Date(e.at).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' }));
const evMove = (v, l) => (evNum(v) ? `<span class="evmv"><small>${esc(l)}</small> <b class="num ${cls(v)}">${pct(v, 2)}</b></span>` : '');
const evFcLine = (rows) => { const r = (rows || [])[0]; if (!r) return ''; const part = (l, v) => (v ? `<span><small>${esc(l)}</small> <b class="num">${esc(v)}</b></span>` : '');
  return `<span class="evfc">${part(XL('exp.', 'คาด'), r.f)}${part(XL('prev.', 'ก่อน'), r.p)}${part(XL('actual', 'จริง'), r.a)}</span>`; };
const EV_IMP = (e) => `<i class="evimp ${e.impact === 'high' ? 'hi' : 'md'}" title="${esc(e.impact === 'high' ? XL('High impact', 'ผลกระทบสูง') : XL('Medium impact', 'ผลกระทบปานกลาง'))}"></i>`;
function evListHtml2(id, now) {
  const tabs = `<div class="seg evtabs" role="tablist">${[['cal', XL('Economic calendar', 'ปฏิทินเศรษฐกิจ')], ['move', XL('Sharp moves', 'ราคาวิ่งแรง')]].map(([k, l]) => `<button type="button" role="tab" data-evtab="${k}" aria-selected="${EV.tab === k}" aria-pressed="${EV.tab === k}">${esc(l)}</button>`).join('')}</div>`;
  const L = evList().filter(evShow), byDay = (rows, f) => { const out = []; let d = null; rows.forEach((e) => { const dd = evDay(e.at); if (dd !== d) { d = dd; out.push(`<div class="evday">${esc(dd)}</div>`); } out.push(f(e)); }); return out.join(''); };
  const on = (e) => (e.id === id ? ' on" aria-current="true' : '');
  if (EV.tab === 'move') {
    const M = L.filter((e) => e.kind === 'breaking').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20);
    const row = (e) => `<a class="evr${on(e)}" href="#/events/${esc(e.id)}"><span class="tm num">${esc(evTime(e))}</span><span class="nm">${esc(evTitle(e))}</span><span class="rx">${evMove(e.b1, XL('BTC 1h', 'BTC 1 ชม.'))}</span></a>`;
    return `<section class="evlist2">${tabs}${M.length ? byDay(M, row) : `<p class="mut sm">${esc(XL('No sharp moves with a headline in the last weeks.', 'ช่วงนี้ยังไม่มีราคาวิ่งแรงที่มีข่าวประกอบ'))}</p>`}</section>`;
  }
  const S0 = L.filter((e) => e.kind === 'scheduled'), up = S0.filter((e) => Date.parse(e.at) > now).sort((a, b) => a.at.localeCompare(b.at)), past = S0.filter((e) => Date.parse(e.at) <= now).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
  const row = (e) => { const u = Date.parse(e.at) > now, unl = e.type === 'unlock';
    return `<a class="evr${on(e)}" href="#/events/${esc(e.id)}"><span class="tm num">${esc(evTime(e))}</span><span class="nm">${EV_IMP(e)}${esc(evTitle(e))}${unl ? ` <span class="evk">${esc(XL('unlock', 'ปลดล็อก'))}</span>` : ''}</span>${evFcLine(e.fc)}<span class="rx">${u ? `<span class="evcd num" data-evcd="${esc(e.at)}">${esc(evCountdown(e.at))}</span>` : evMove(e.b1, XL('BTC 1h', 'BTC 1 ชม.')) + evMove(e.bd, XL('1d', '1 วัน'))}</span></a>`; };
  return `<section class="evlist2">${tabs}<h2 class="evlh">${esc(XL('Coming up', 'กำลังจะมา'))}</h2>${up.length ? byDay(up, row) : `<p class="mut sm">${esc(XL('Nothing scheduled in the next 30 days.', 'ยังไม่มีอีเวนต์ใน 30 วันข้างหน้า'))}</p>`}
    ${past.length ? `<h2 class="evlh">${esc(XL('Released', 'ประกาศแล้ว'))}</h2>${byDay(past, row)}` : ''}</section>`;
}
// forecast / previous / actual rows: the hourly feed (Forex Factory + FRED), else the hand-entered consensus and official print
function evNumRows(ev) {
  if (ev.fc && ev.fc.rows && ev.fc.rows.length) return ev.fc.rows.map((r) => ({ t: evFcName(r.t), f: r.f, p: r.p, a: r.a, fu: ev.fc.url, fs: ev.fc.src, au: r.url, as: r.src }));
  const cs = ev.consensus, ac = ev.actual; if (!cs && !ac) return [];
  const one = { t: (LANG === 'th' && cs && cs.th_metric) || (cs || ac).metric, f: cs ? cs.value + (cs.unit || '') : null, p: null, a: ac ? ac.value + (ac.unit || '') : null, fu: cs && cs.url, fs: cs && String(cs.source || '').split(/,| \(/)[0], au: ac && ac.url, as: XL('official', 'ทางการ') };
  return [one, ...evAlso(ev).map((x) => ({ t: x.name, f: x.c, p: null, a: x.a, fu: one.fu, fs: one.fs, au: one.au, as: one.as }))];
}
const EV_FFTH = [[/^Core PCE Price Index/, 'Core PCE'], [/^PCE Price Index/, 'PCE'], [/^Prelim GDP Price Index/, 'ดัชนีราคา GDP (รอบสอง)'], [/^Prelim GDP/, 'GDP (รอบสอง)'], [/^Advance GDP Price Index/, 'ดัชนีราคา GDP (รอบแรก)'], [/^Advance GDP/, 'GDP (รอบแรก)'], [/^Final GDP/, 'GDP (รอบสุดท้าย)'],
  [/^Non-Farm Employment Change/, 'การจ้างงานนอกภาคเกษตร'], [/^Unemployment Rate/, 'อัตราว่างงาน'], [/^Average Hourly Earnings/, 'ค่าจ้างรายชั่วโมงเฉลี่ย'], [/^Federal Funds Rate/, 'ดอกเบี้ยนโยบายเฟด'], [/^FOMC Statement/, 'แถลงการณ์ FOMC'], [/^Core CPI/, 'Core CPI'], [/^CPI/, 'CPI รวม'], [/^Core PPI/, 'Core PPI'], [/^PPI/, 'PPI รวม']];
const evFcName = (t) => { if (LANG !== 'th') return t; const m = EV_FFTH.find(([re]) => re.test(t)), per = /m\/m$/.test(t) ? ' เทียบเดือนก่อน' : /q\/q$/.test(t) ? ' เทียบไตรมาสก่อน (ต่อปี)' : /y\/y$/.test(t) ? ' เทียบปีก่อน' : ''; return m ? m[1] + per : t; };
const evNumVal = (s) => { const m = String(s || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };
const EV_WORD = { cpi: ['hotter than expected', 'cooler than expected', 'ร้อนกว่าคาด', 'เย็นกว่าคาด'], ppi: ['hotter than expected', 'cooler than expected', 'ร้อนกว่าคาด', 'เย็นกว่าคาด'], pce: ['hotter than expected', 'cooler than expected', 'ร้อนกว่าคาด', 'เย็นกว่าคาด'], jobs: ['above expectations', 'below expectations', 'สูงกว่าคาด', 'ต่ำกว่าคาด'] };
function evNumsHtml(ev, up) {
  const rows = evNumRows(ev); if (!rows.length) return '';
  const W = EV_WORD[ev.type] || ['above expectations', 'below expectations', 'สูงกว่าคาด', 'ต่ำกว่าคาด'];
  const tr = rows.map((r) => { const a = evNumVal(r.a), f = evNumVal(r.f), w = a != null && f != null ? (a > f ? XL(W[0], W[2]) : a < f ? XL(W[1], W[3]) : XL('as expected', 'ตามคาด')) : '';
    const unemp = /unemployment/i.test(r.t), hotUp = ['cpi', 'ppi', 'pce'].includes(ev.type), c = a == null || f == null || a === f ? '' : (a > f) === (hotUp || unemp) ? 'dn' : 'up'; // red = worse for risk assets on that print
    return `<tr><td>${esc(r.t)}</td><td class="num">${r.f ? esc(r.f) : '<span class="mut">–</span>'}</td><td class="num">${r.p ? esc(r.p) : '<span class="mut">–</span>'}</td><td class="num">${r.a ? `<b class="${c}">${esc(r.a)}</b>${w ? ` <small class="${c}">${esc(w)}</small>` : ''}` : `<span class="mut">${esc(up ? XL('at release', 'รอประกาศ') : '–')}</span>`}</td></tr>`; }).join('');
  const src = [rows[0].fu ? evSrc({ url: rows[0].fu, src: rows[0].fs || XL('forecast', 'ตัวเลขคาด') }) : '', rows.find((r) => r.au) ? evSrc({ url: rows.find((r) => r.au).au, src: rows.find((r) => r.au).as || XL('actual', 'ตัวเลขจริง') }) : ''].filter(Boolean).join(' · ');
  return `<section class="card evcard" data-evnums><h2>${esc(XL('The numbers', 'ตัวเลข'))}</h2><div class="tscroll"><table class="evtbl evnums"><thead><tr><th></th><th>${esc(XL('Forecast', 'ตลาดคาด'))}</th><th>${esc(XL('Previous', 'ครั้งก่อน'))}</th><th>${esc(XL('Actual', 'ออกจริง'))}</th></tr></thead><tbody>${tr}</tbody></table></div>${src ? `<p class="sub sm">${src}</p>` : ''}</section>`;
}
// usual 1-hour move for this event: past releases of the same type (real candles), else the breaking gate's 30-day hourly average
function evUsual(ev, s) {
  const p = evPast(ev.type, s, 'h1', ev.at); if (p.n >= EVC.R.MIN_PAST_N) return { v: p.avg, why: XL(`average of ${p.n} past releases`, `เฉลี่ยจาก ${p.n} ครั้งก่อน`) };
  const g = ev.gate_check && (ev.gate_check.results || []).find((x) => x.u && x.u[s.toLowerCase()]); const u = g && g.u[s.toLowerCase()];
  return u && evNum(u.avg) ? { v: u.avg, why: XL('average hourly move, last 30 days', 'การขยับเฉลี่ยต่อชั่วโมง 30 วันล่าสุด') } : null;
}
function evReactHtml(ev) {
  const syms = ['BTC', 'ETH', ...(ev.tokens || []).filter((s) => s !== 'BTC' && s !== 'ETH' && tokBySym(s))]; if (!syms.includes(EV.cs)) EV.cs = ev.type === 'unlock' && syms[2] ? syms[2] : 'BTC';
  const s = EV.cs, P = ev.post || {}, brk = ev.kind === 'breaking', pre = brk ? ev.pre_move && ev.pre_move[s] : P.before24h && P.before24h[s], h1 = P.h1 && P.h1[s], d1 = P.d1 && P.d1[s], us = evUsual(ev, s);
  const chip = (l, m, sub) => `<div class="evst2"><span class="l">${esc(l)}</span><b class="num ${m ? cls(m.pct) : ''}">${m ? pct(m.pct, 2) : `<span class="mut">${esc(XL('waiting', 'รอ'))}</span>`}</b>${sub ? `<span class="s">${sub}</span>` : ''}</div>`;
  const r = h1 && us && us.v > 0 ? Math.abs(h1.pct) / us.v : null, rk = r == null ? null : r >= 1.5 ? 'big' : r <= 0.67 ? 'small' : 'normal';
  const rl = rk && { big: XL(`${r.toFixed(1)}× a usual hour`, `แรงกว่าปกติ ${r.toFixed(1)} เท่า`), small: XL(`smaller than usual (${r.toFixed(1)}×)`, `เบากว่าปกติ (${r.toFixed(1)} เท่า)`), normal: XL(`about usual (${r.toFixed(1)}×)`, `พอ ๆ กับปกติ (${r.toFixed(1)} เท่า)`) }[rk];
  const seg = `<div class="seg sm">${syms.map((x) => `<button type="button" data-evsym="${x}" aria-pressed="${s === x}">${x}</button>`).join('')}</div>`;
  return `<section class="card evcard" data-evreact><h2>${esc(XL('How the market reacted', 'ตลาดตอบสนองยังไง'))} ${seg}</h2>
    <div class="evchw"><div class="evchr num" id="evChR"></div><div id="evCh" class="evch"></div></div>
    <div class="evsts">${chip(brk ? XL('1h before the headline', 'ก่อนข่าว 1 ชม.') : XL('24h before', 'ก่อนประกาศ 24 ชม.'), pre)}${chip(XL('1h after', 'หลัง 1 ชม.'), h1, rl ? `<span class="evrk ${rk}">${esc(rl)}</span>` : '')}${chip(XL('1 day after', 'หลัง 1 วัน'), d1)}</div>
    ${us ? `<p class="sub sm">${esc(XL(`Usual 1-hour move ±${us.v.toFixed(2)}% (${us.why})`, `ปกติ 1 ชม. ขยับ ±${us.v.toFixed(2)}% (${us.why})`))}${h1 ? ' · ' + evSrc({ url: h1.to.url, src: h1.from.src }) : ''}</p>` : ''}</section>`;
}
// how BTC moved after past releases of this type (real 1-minute candles, docs/events-v1.md)
function evPastHtml(ev) {
  const rows = ((EV.hist && EV.hist.types && EV.hist.types[ev.type]) || []).filter((r) => Date.parse(r.at) < Date.parse(ev.at) && r.moves && r.moves.BTC && evNum(r.moves.BTC.h1)).sort((a, b) => b.at.localeCompare(a.at));
  if (rows.length < 3) return '';
  const h = rows.map((r) => r.moves.BTC.h1), d = rows.map((r) => r.moves.BTC.d1).filter(evNum), avg = (a) => a.reduce((x, v) => x + Math.abs(v), 0) / a.length, upN = d.filter((v) => v > 0).length;
  const name = { cpi: 'CPI', ppi: 'PPI', jobs: XL('jobs report', 'ตัวเลขจ้างงาน'), fomc: 'FOMC', pce: 'PCE' }[ev.type] || ev.type.toUpperCase();
  const bar = (v, mx) => `<i class="evbar ${cls(v)}" style="width:${Math.max(2, Math.round(Math.min(1, Math.abs(v) / mx) * 56))}px"></i>`, mx = Math.max(...h.map(Math.abs), 0.01), mxd = Math.max(...d.map(Math.abs), 0.01);
  return `<section class="card evcard" data-evpast><h2>${esc(XL(`BTC after past ${name} releases`, `BTC หลังประกาศ ${name} ครั้งก่อน ๆ`))}</h2>
    <div class="evsts">${`<div class="evst2"><span class="l">${esc(XL('Average 1h move', 'ขยับเฉลี่ย 1 ชม.'))}</span><b class="num">±${avg(h).toFixed(2)}%</b></div><div class="evst2"><span class="l">${esc(XL('Average 1-day move', 'ขยับเฉลี่ย 1 วัน'))}</span><b class="num">±${d.length ? avg(d).toFixed(2) : '–'}%</b></div><div class="evst2"><span class="l">${esc(XL('1 day later', 'ผ่านไป 1 วัน'))}</span><b class="num"><span class="up">${esc(XL(`up ${upN}`, `ขึ้น ${upN}`))}</span> · <span class="dn">${esc(XL(`down ${d.length - upN}`, `ลง ${d.length - upN}`))}</span></b><span class="s">${esc(XL(`of ${d.length} releases`, `จาก ${d.length} ครั้ง`))}</span></div>`}</div>
    <div class="tscroll"><table class="evtbl evpast"><thead><tr><th>${esc(XL('Release', 'ประกาศ'))}</th><th>${esc(XL('BTC 1h', 'BTC 1 ชม.'))}</th><th>${esc(XL('BTC 1 day', 'BTC 1 วัน'))}</th></tr></thead><tbody>
    ${rows.slice(0, 8).map((r) => `<tr><td>${esc(new Date(r.at).toLocaleDateString(loc(), { month: 'short', day: 'numeric', year: 'numeric' }))}</td><td><span class="num ${cls(r.moves.BTC.h1)}">${pct(r.moves.BTC.h1, 2)}</span>${bar(r.moves.BTC.h1, mx)}</td><td>${evNum(r.moves.BTC.d1) ? `<span class="num ${cls(r.moves.BTC.d1)}">${pct(r.moves.BTC.d1, 2)}</span>${bar(r.moves.BTC.d1, mxd)}` : '<span class="mut">–</span>'}</td></tr>`).join('')}</tbody></table></div>
    <p class="sub sm">${esc(XL(`${rows.length} releases · ${(EV.hist && EV.hist.sources && EV.hist.sources.BTC) || 'Binance BTCUSDT 1-minute candles'}`, `${rows.length} ครั้ง · ${(EV.hist && EV.hist.sources && EV.hist.sources.BTC) || 'แท่ง 1 นาที Binance BTCUSDT'}`))}</p></section>`;
}
// sharp move: the headlines that came out near it (time order); they may or may not be the cause
function evNearHtml(ev) {
  const C = (ev.candidates || []).slice(0, 5); if (!C.length) return '';
  return `<section class="card evcard" data-evnear><h2>${esc(XL('Headlines near the move', 'ข่าวที่ออกใกล้เวลานั้น'))} <span class="evtagc">${esc(XL('not confirmed as the cause', 'ยังไม่ยืนยันว่าเป็นสาเหตุ'))}</span></h2>
    ${C.map((c) => `<div class="evnear"><a href="${esc(/^https:\/\//.test(c.url || '') ? c.url : '#')}" target="_blank" rel="noopener">${esc((LANG === 'th' && c.th_title) || c.title)} ↗</a><small class="mut">${esc(c.src || '')} · ${esc(evT(c.at))}</small></div>`).join('')}</section>`;
}
// folded: options-implied move, positioning at the release, the locked view and its result
function evDeepHtml(ev, up) {
  const parts = [], pre = evPre(ev.id);
  ['BTC', 'ETH'].forEach((s) => { const im = (ev.pre && ev.pre.implied && ev.pre.implied[s]) || (up && pre && pre.assets && pre.assets[s] && pre.assets[s].implied);
    if (im && evNum(im.pct)) parts.push(`<div class="ixkv"><span>${esc(XL(`${s} options expected move`, `${s} options คาดว่าจะเหวี่ยง`))}</span><b class="num">±${im.pct.toFixed(2)}%</b></div><p class="sub sm">${esc(im.method === 'straddle' ? XL(`ATM straddle to the ${evT(im.expiry)} expiry`, `ATM straddle ถึงวันหมดอายุ ${evT(im.expiry)}`) : XL('30-day volatility, 1 day, 1σ (not event-specific)', 'ความผันผวน 30 วัน คิดเป็น 1 วัน 1σ (ไม่เจาะจงอีเวนต์)'))} · ${evSrc({ url: im.url, src: 'Deribit' })}</p>`); });
  const P = (ev.pos || {}).BTC || {}; if (P.funding) parts.push(`<div class="ixkv"><span>${esc(XL('BTC funding at the release', 'Funding BTC ตอนประกาศ'))}</span><b class="num ${cls(P.funding.pct8h)}">${P.funding.pct8h > 0 ? '+' : ''}${P.funding.pct8h.toFixed(4)}% /8h</b></div>`);
  if (P.oi) parts.push(`<div class="ixkv"><span>${esc(XL('BTC open interest', 'OI ของ BTC'))}</span><b class="num">${P.oi.coins.toLocaleString(loc(), { maximumFractionDigits: 0 })} BTC</b></div>`);
  if (P.cot) parts.push(`<div class="ixkv"><span>${esc(XL('CFTC: leveraged funds net (BTC futures)', 'CFTC: กองทุนเลเวอเรจ net (ฟิวเจอร์ส BTC)'))}</span><b class="num">${P.cot.lev_net.toLocaleString(loc())}</b></div><p class="sub sm">${evSrc({ url: P.cot.url, src: 'CFTC COT' })} · ${esc(P.cot.report_date)}</p>`);
  const view = ev.view && ev.view.locked_at ? evViewHtml(ev) + evReplayHtml(ev) : '';
  if (!parts.length && !view) return '';
  return `<details class="card evdeep" data-evdeep><summary>${esc(XL('In depth', 'ข้อมูลเชิงลึก'))}</summary>${parts.length ? `<div class="evdeepb">${parts.join('')}</div>` : ''}${view}</details>`;
}
// 15-minute candles from 12 hours before to 24 hours after (or now), shown as % from the price at the release
async function evCandles(sym, at) {
  const key = `${sym}|${at}`, c = EV.cc[key], end = Math.min(Date.now(), at + 24 * 36e5); if (c && (c.end >= at + 24 * 36e5 || Date.now() - c.got < 6e4)) return c;
  const t = tokBySym(sym) || cmpTok(sym), n = Math.min(1000, Math.ceil((end - (at - 12 * 36e5)) / 9e5) + 1); let err;
  for (const s of [...t.sources].sort((a, b) => (a.ex === 'binance' ? -1 : b.ex === 'binance' ? 1 : 0))) {
    try { const k = (await klines(s, '15m', n, end + 9e5)).filter((x) => x.t >= at - 12 * 36e5 - 9e5); if (k.length > 8) return (EV.cc[key] = { k, src: s, end, got: Date.now() }); } catch (e) { err = e; } }
  throw err || Error('no candles');
}
async function evChart(ev) {
  const el = $('#evCh'), rd = $('#evChR'); if (!el) return; const at = Date.parse(ev.at), sym = EV.cs;
  if (at > Date.now()) { el.closest('.evchw').hidden = true; return; }
  let c; try { c = await evCandles(sym, at); } catch (e) { el.innerHTML = `<p class="mut sm">${esc(XL('Chart unavailable', 'โหลดกราฟไม่ได้'))}: ${esc(e.message)}</p>`; return; }
  if (!document.body.contains(el) || EV.cs !== sym) return;
  const k = c.k, i0 = k.findIndex((x) => x.t + 9e5 > at); if (i0 < 0) return; const base = k[i0].o, Cc = chartColors();
  const LW = LightweightCharts, ch = LW.createChart(el, { autoSize: true, layout: { background: { color: 'transparent' }, textColor: Cc.tx, fontSize: 11, fontFamily: getComputedStyle(document.body).fontFamily },
    grid: { vertLines: { visible: false }, horzLines: { color: Cc.line } }, rightPriceScale: { borderVisible: false }, timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
    crosshair: { mode: 0, horzLine: { visible: false, labelVisible: false } }, handleScroll: false, handleScale: false }); S.charts.push(ch);
  const pf = { type: 'custom', minMove: 0.01, formatter: (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}%` };
  const sr = ch.addSeries(LW.BaselineSeries, { baseValue: { type: 'price', price: 0 }, topLineColor: Cc.up, bottomLineColor: Cc.dn, topFillColor1: Cc.upA, topFillColor2: 'rgba(0,0,0,0)', bottomFillColor1: 'rgba(0,0,0,0)', bottomFillColor2: Cc.dnA, lineWidth: 2, priceLineVisible: false, priceFormat: pf });
  const data = k.map((x) => ({ time: ts(x.t, true), value: (x.c / base - 1) * 100 })); sr.setData(data);
  sr.createPriceLine({ price: 0, color: Cc.mut, lineStyle: 2, lineWidth: 1, axisLabelVisible: false, title: '' });
  try { LW.createSeriesMarkers(sr, [{ time: ts(k[i0].t, true), position: 'aboveBar', color: Cc.ac, shape: 'arrowDown', text: ev.kind === 'breaking' ? XL('headline', 'ข่าวออก') : XL('release', 'ประกาศ') }]); } catch (e) {}
  ch.timeScale().fitContent();
  const show = (i) => { const x = k[i]; if (!x || !rd) return; const v = (x.c / base - 1) * 100; rd.innerHTML = `${esc(new Date(x.t).toLocaleString(loc(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))} · ${esc(sym)} <b class="${cls(v)}">${pf.formatter(v)}</b> · ${esc(px(x.c))} <span class="mut">${esc(ev.kind === 'breaking' ? XL('vs the price at the headline', 'เทียบราคาตอนข่าวออก') : XL('vs the price at the release', 'เทียบราคาตอนประกาศ'))} ${esc(px(base))}</span>`; };
  const ix = new Map(data.map((d, i) => [d.time, i])); show(k.length - 1);
  ch.subscribeCrosshairMove((pm) => { const i = pm && pm.time != null ? ix.get(pm.time) : undefined; show(i != null ? i : k.length - 1); });
}
async function pEvents(soft) {
  const m = $('#main'); if (!soft || !$('#evPg')) m.innerHTML = `<div class="page" id="evPg">${pageHead(T('events'), `<span class="sub">${esc(T('evLocal'))} · ${esc(tzL())}</span>`)}<div class="sk" style="height:220px;margin-top:12px"></div></div>`;
  await evLoadIdx(); if (S.route !== 'events') return; renderShell();
  if (EV.err || !EV.idx) { m.innerHTML = `<div class="page" id="evPg">${pageHead(T('events'))}<p class="err">${esc(T('evLoadErr'))}: ${esc(EV.err || '')}</p><button class="btn" data-evretry>${esc(T('retry'))}</button></div>`; return; }
  const id = evPick(), now = Date.now(), headTxt = pageHead(T('events'), `<span class="sub">${esc(T('evLocal'))} · ${esc(tzL())}</span>`);
  if (!id) { m.innerHTML = `<div class="page evpg" id="evPg">${headTxt}<div class="evlayout">${evListHtml2(null, now)}<div class="evmain"><p class="mut">${esc(T('evNone'))}</p></div></div></div>`; return; }
  const ev = await evLoad(id); if (S.route !== 'events') return;
  if (ev.err) { m.innerHTML = `<div class="page evpg" id="evPg">${headTxt}<div class="evlayout">${evListHtml2(id, now)}<div class="evmain"><p class="err">${esc(T('evLoadErr'))}: ${esc(ev.err)}</p></div></div></div>`; return; }
  const up = Date.parse(ev.at) > now, brk = ev.kind === 'breaking';
  const stL = brk ? XL('Sharp move', 'ราคาวิ่งแรง') : up ? T('evUpcoming') : T('evReleased');
  const head = `<section class="card evcard evhead"><div class="evh"><span class="t">${esc(evTitle(ev))}</span><span class="sub">${esc(ev.time_known === false ? evDay(ev.at) + ' · ' + XL('time not announced', 'ยังไม่ประกาศเวลา') : evT(ev.at))}${ev.source && ev.source.url ? ' · ' + evSrc({ url: ev.source.url, src: ev.source.name }) : ''}</span><span class="evst ${brk ? 'breaking' : up ? 'upcoming' : 'released'}">${esc(stL)}</span>${up ? `<span class="evcd num" data-evcd="${esc(ev.at)}">${esc(evCountdown(ev.at))}</span>` : ''}</div></section>`;
  killCharts();
  const body = head + (brk ? '' : evNumsHtml(ev, up)) + (up ? '' : evReactHtml(ev)) + (brk ? evNearHtml(ev) : evPastHtml(ev)) + evDeepHtml(ev, up);
  m.innerHTML = `<div class="page evpg" id="evPg">${headTxt}<div class="evlayout">${evListHtml2(id, now)}<div class="evmain">${body}</div></div></div>`;
  if (EV.jump && innerWidth < 900) { EV.jump = false; const h = $('.evhead'); if (h) h.scrollIntoView({ block: 'start' }); } // phone: the list sits above, so jump to the tapped event
  if (!up) evChart(ev);
}
document.addEventListener('click', (e) => {
  if (S.route !== 'events') return;
  let el;
  if ((el = e.target.closest('[data-evtab]'))) { EV.tab = el.dataset.evtab; if (/^#\/events\/./.test(location.hash)) location.hash = '#/events'; else pEvents(true); return; }
  if ((el = e.target.closest('[data-evsym]'))) { EV.cs = el.dataset.evsym; pEvents(true); return; }
  if (e.target.closest('[data-evretry]')) { EV.idx = null; pEvents(); return; }
});
addEventListener('hashchange', () => { if (S.route === 'events') EV.jump = /^#\/events\/./.test(location.hash); });
const _evRender = render;
render = function (soft) {
  if (S.route === 'events') { renderShell(); killCharts(); pEvents(soft); return; }
  _evRender(soft);
};
evLoadIdx().then(() => { renderShell(); if (S.route === 'markets') evUpNext(); });
