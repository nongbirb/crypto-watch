/* Events v1: one page per market-moving event (docs/events-v1.md). Data: data/events/*.json built by scripts/build_events.mjs.
   Every number shows its source link and data time; missing data says "unavailable", never 0. No buy/sell calls. */
Object.assign(I18N.en, {
  events: 'Events', evNew: 'NEW', evLocal: 'Times shown in your local time', evUpcoming: 'Upcoming', evReleased: 'Released', evBreaking: 'Breaking', evPast: 'Past',
  evPriced: 'Already priced in?', evExpected: 'Expected', evActual: 'Actual', evBefore: 'Move before (24h)', evImplied: 'Options expected move', evAfter: 'Move after', evPos: 'Positioning',
  evChain: 'How it spread', evTap: 'tap any box', evView: 'Our view', evReplay: 'Replay & record', evUnavail: 'unavailable', evWait: 'waiting for release', evWaitData: 'waiting for data', evLate: 'late', evStale: 'stale',
  evEvidence: 'evidence only', evNoFc: 'unscheduled, no forecast', evShowFull: 'Show full chain', evHideFull: 'Show short chain', evUpNext: 'Up next', evOpen: 'Open event', evSeeChain: 'See chain',
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
  evEvidence: 'ไว้ประกอบเท่านั้น', evNoFc: 'ข่าวนอกตาราง ไม่มีตัวเลขคาดการณ์', evShowFull: 'ดูทั้งเส้นทาง', evHideFull: 'ย่อเส้นทาง', evUpNext: 'อีเวนต์ถัดไป', evOpen: 'เปิดดู', evSeeChain: 'ดูแรงส่งต่อ',
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
const EV = { idx: null, files: {}, hist: null, err: null, node: null, asset: 'BTC', full: false, drawn: {}, busy: false, inp: {}, pre: null };
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
function evPick() {
  const now = Date.now(), L = evList(); const id = (location.hash.match(/^#\/events\/([a-z0-9-]+)/) || [])[1];
  if (id && L.some((e) => e.id === id)) return id;
  const up = L.filter((e) => Date.parse(e.at) > now).sort((a, b) => a.at.localeCompare(b.at))[0]; if (up) return up.id;
  const past = L.slice().sort((a, b) => b.at.localeCompare(a.at))[0]; return past ? past.id : null;
}
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
/* ---------- chain model ---------- */
const EV_NODE = {
  us2y: { n: ['US 2-year yield', 'บอนด์ยีลด์ 2 ปีสหรัฐฯ'], view: 'yields', why: ['Short-term yields track what traders expect the Fed to do next. A hotter print means higher rates for longer.', 'ยีลด์ระยะสั้นสะท้อนว่าตลาดคิดว่าเฟดจะทำอะไรต่อ ตัวเลขร้อนกว่าคาด = ดอกเบี้ยสูงนานขึ้น'] },
  us10y: { n: ['US 10-year yield', 'บอนด์ยีลด์ 10 ปีสหรัฐฯ'], view: 'yields', why: ['Long-term yields set the discount rate for risk assets, including crypto.', 'ยีลด์ระยะยาวเป็นตัวกำหนดต้นทุนเงินของสินทรัพย์เสี่ยง รวมถึงคริปโต'] },
  jp10y: { n: ['Japan 10-year yield', 'บอนด์ยีลด์ 10 ปีญี่ปุ่น'], why: ['Higher JGB yields can pull money home to Japan and shrink yen carry trades.', 'ยีลด์ญี่ปุ่นขึ้น เงินอาจไหลกลับญี่ปุ่น และ carry trade เงินเยนเริ่มถูกปิด'] },
  dollar: { n: ['Broad dollar index (Fed)', 'ดัชนีดอลลาร์ (เฟด)'], view: 'dollar', why: ['A stronger dollar usually tightens global liquidity, which tends to weigh on BTC.', 'ดอลลาร์แข็ง สภาพคล่องโลกมักตึงขึ้น ซึ่งมักกดดัน BTC'] },
  usdjpy: { n: ['USD/JPY', 'USD/JPY'], view: 'dollar', why: ['The rate gap between the US and Japan drives USD/JPY. Fast yen moves often hit leveraged risk trades.', 'ส่วนต่างดอกเบี้ยสหรัฐฯ กับญี่ปุ่นขับ USD/JPY ถ้าเยนเหวี่ยงแรง สถานะเสี่ยงที่ใช้เลเวอเรจมักโดนก่อน'] },
  fedbs: { n: ['Fed balance sheet', 'งบดุลเฟด'], weekly: true, why: ['Weekly. A shrinking balance sheet drains dollar liquidity slowly. It is background, not the event reaction.', 'ข้อมูลรายสัปดาห์ งบดุลหดคือสภาพคล่องค่อย ๆ หายไป เป็นภาพพื้นหลัง ไม่ใช่ปฏิกิริยาต่อข่าว'] },
  stables: { n: ['Stablecoin supply', 'ซัพพลาย stablecoin'], why: ['More stablecoins means more dollars parked on-chain and ready to buy.', 'stablecoin เพิ่ม = เงินดอลลาร์บนเชนที่พร้อมเข้าซื้อเพิ่ม'] },
  spx: { n: ['S&P 500', 'S&P 500'], why: ['Crypto often trades with US stocks on macro days.', 'วันที่มีข่าวมหภาค คริปโตมักวิ่งตามหุ้นสหรัฐฯ'] },
  ndq: { n: ['Nasdaq', 'Nasdaq'], why: ['Tech stocks are the closest risk peer for BTC and ETH.', 'หุ้นเทคคือเพื่อนร่วมทางฝั่ง risk ที่ใกล้ BTC กับ ETH ที่สุด'] },
  vix: { n: ['VIX', 'VIX'], why: ['A jump in stock-market fear usually comes with selling in crypto.', 'ถ้าดัชนีความกลัวของหุ้นพุ่ง คริปโตมักโดนขายตาม'] },
  gold: { n: ['Gold', 'ทองคำ'], why: ['Gold reacts to real yields and the dollar.', 'ทองตอบสนองต่อ real yield และดอลลาร์'] },
  oil: { n: ['WTI oil', 'น้ำมัน WTI'], why: ['Oil feeds the next inflation prints.', 'ราคาน้ำมันส่งผลต่อเงินเฟ้อรอบถัดไป'] }
};
const EV_WRONG = { yields: ['After a hot print, the yield ends the day below its pre-release level (after a cool print, above it).', 'ถ้า CPI ร้อนแต่ยีลด์ปิดวันต่ำกว่าก่อนประกาศ (หรือเย็นแต่ยีลด์ปิดสูงกว่า) ถือว่าผิด'],
  dollar: ['The dollar moves the opposite way to the locked scenario over the full day.', 'ดอลลาร์วิ่งสวนกับฉากที่ล็อกไว้ทั้งวัน ถือว่าผิด'],
  btc: ['BTC moves at least 1% against the locked scenario 1 day after the release.', 'ผ่านไป 1 วัน BTC วิ่งสวนฉากที่ล็อกไว้อย่างน้อย 1% ถือว่าผิด'],
  none: ['Background only. No direction was locked for this box.', 'เป็นภาพพื้นหลังเท่านั้น ไม่ได้ล็อกทิศทางของกล่องนี้ไว้'] };
const EV_COLS = [['rates', ['Rates', 'ดอกเบี้ย'], ['us2y', 'us10y', 'jp10y']], ['fx', ['Dollar & yen', 'ดอลลาร์ & เยน'], ['dollar', 'usdjpy'], [['Liquidity', 'สภาพคล่อง'], ['fedbs', 'stables']]], ['risk', ['Stocks & gold', 'หุ้น & ทอง'], ['spx', 'ndq', 'vix', 'gold', 'oil']]];
const EV_LINKS = [['ev', 'us2y'], ['ev', 'us10y'], ['ev', 'jp10y'], ['us2y', 'dollar'], ['us2y', 'usdjpy'], ['jp10y', 'usdjpy'], ['us10y', 'ndq'], ['us10y', 'spx'], ['dollar', 'gold'], ['dollar', 'stables'], ['ndq', 'BTC'], ['vix', 'BTC'], ['spx', 'ETH'], ['stables', 'BTC'], ['usdjpy', 'BTC'], ['oil', 'vix'], ['fedbs', 'ETH']];
function evScen(ev) { const v = ev.view; if (!v || !v.locked_at) return null; if (v.breaking) return (v.scenarios || [])[0] || null; const k = EVC.scenarioFor(ev.actual && ev.actual.value, v.scenarios); return k ? v.scenarios.find((s) => s.key === k) : null; }
const EV_STALE_D = 3;
function evMacroNode(ev, k) {
  const m = (ev.macro || {})[k], D0 = EV_NODE[k], sc = evScen(ev), exp = D0.view && sc ? sc[D0.view] : null;
  if (!m) return { k, name: XL(...D0.n), st: Date.now() < Date.parse(ev.at) ? 'wait' : 'waitdata', D0 };
  const okData = m.status === 'ok' && evNum(m.chg) && m.before && m.after && /^\d{4}-\d{2}-\d{2}$/.test(m.after.d || '');
  if (!okData) return { k, name: XL(...D0.n), st: m.status === 'late' ? 'late' : m.status === 'waiting' ? 'waitdata' : 'na', m: m.status === 'ok' ? null : m, D0 };
  const unit = k.match(/^(us2y|us10y|jp10y)$/) ? 'bp' : 'pct', v = m.chg, stren = EVC.strength(unit, v);
  // stale: the first fixing after the release is more than 3 days later (weekends, holidays, weekly series), so other news is mixed in
  const stale = Date.parse(m.after.d + 'T23:59:59Z') - Date.parse(ev.at) > EV_STALE_D * 864e5;
  return { k, name: XL(...D0.n), st: 'ok', v, unit, m, D0, exp, stren, stale, conf: EVC.confidence({ v, stale, weekly: !!D0.weekly, expected: exp && exp !== 'flat' ? exp : null }) };
}
function evCryptoNode(ev, s) {
  const h1 = ev.post && ev.post.h1 && ev.post.h1[s], im = ev.pre && ev.pre.implied && ev.pre.implied[s], sc = evScen(ev), past = evPast(ev.type, s, 'h1', ev.at);
  if (!h1 || !evNum(h1.pct)) return { k: s, name: s, st: Date.now() < Date.parse(ev.at) ? 'wait' : ev.time_known === false ? 'na' : 'waitdata', crypto: true };
  const s1 = EVC.sigma1d(im), ref = s1 ? s1 / Math.sqrt(24) : past.n >= EVC.R.MIN_PAST_N ? past.avg : null; // 1h share of the 1-day 1-sigma (sqrt-time), else past average 1h move
  const stren = EVC.strength('crypto', h1.pct, ref);
  return { k: s, name: s, st: 'ok', v: h1.pct, unit: 'pct', h1, crypto: true, measured: true, exp: sc ? sc.btc : null, stren, conf: EVC.confidence({ v: h1.pct, measured: true, breaking: ev.kind === 'breaking', strength: stren }) };
}
function evFmt(n) { if (!evNum(n.v)) return ''; const a = n.v > 0 ? '▲' : n.v < 0 ? '▼' : '•'; return `<span class="m num ${cls(n.v)}">${a} ${n.unit === 'bp' ? (n.v > 0 ? '+' : n.v < 0 ? '−' : '') + Math.abs(n.v).toFixed(1) + ' bp' : pct(n.v, 2)}${n.crypto ? ' (1h)' : ''}</span>`; }
function evNodeHtml(n, ev) {
  const sel = EV.node === n.k ? ' sel' : '', meas = n.measured ? ' meas' : '';
  let foot;
  if (n.st === 'ok') foot = n.crypto ? `${XL('measured', 'วัด ณ')} ${evT(n.h1.measured_at, false)}` : `${n.D0.weekly ? XL('weekly change', 'เปลี่ยนรายสัปดาห์') : XL('full-day change', 'เปลี่ยนทั้งวัน')} · ${n.m.after.d}`;
  else foot = `<span class="evtag ${n.st}">${esc(n.st === 'wait' ? T('evWait') : n.st === 'waitdata' ? (n.m ? evSrcWait(n.m) : T('evWaitData')) : n.st === 'late' ? T('evLate') : T('evUnavail'))}</span>`;
  if (n.st === 'ok' && n.stale) foot = esc(foot) + ` <span class="evtag late">${esc(T('evStale'))}</span>`;
  return `<button type="button" class="evnode${sel}${meas}" data-evnode="${esc(n.k)}" id="evn-${esc(n.k)}"><span class="n">${esc(n.name)}</span>${n.st === 'ok' ? evFmt(n) : ''}<span class="f">${n.st === 'ok' && !n.stale ? esc(foot) : foot}</span></button>`;
}
function evMine(ev) {
  const toks = S.cfg.filter((t) => t.symbol !== 'BTC' && t.symbol !== 'ETH'), rows = toks.map((t) => ({ t, h: ev.post && ev.post.h1 && ev.post.h1[t.symbol] }));
  const open = EV.node === 'mine';
  return `<button type="button" class="evnode${open ? ' sel' : ''}" data-evnode="mine" id="evn-mine"><span class="n">${esc(T('evMine'))} (${toks.length})</span><span class="f">${esc(toks.slice(0, 3).map((t) => t.symbol).join(', '))}${toks.length > 3 ? '…' : ''}</span><span class="more">${esc(open ? XL('Hide', 'ซ่อน') : XL('Show all', 'ดูทั้งหมด'))} ${open ? '▾' : '▸'}</span></button>
    ${open ? `<div class="evmine">${rows.map(({ t, h }) => `<div class="ixkv"><span>${logo(t, 'sm')} ${esc(t.symbol)}</span><b class="num ${h ? cls(h.pct) : ''}">${h ? pct(h.pct) + ' (1h)' : esc(Date.now() < Date.parse(ev.at) ? T('evWait') : T('evUnavail'))}</b></div>`).join('')}</div>` : ''}`;
}
function evPanel(ev, nodes) {
  const n = nodes[EV.node]; if (!n) return `<div class="ixh"><h3>${esc(T('evSel'))}</h3><small>${esc(T('evTap'))}</small></div>`;
  const kv = (l, v, c = '') => `<div class="ixkv"><span>${esc(l)}</span><b class="${c}">${v}</b></div>`;
  const dir = evNum(n.v) ? EVC.sgn(n.v, n.crypto ? EVC.R.FLAT.h1 : 1e-9) : null;
  const src = n.crypto ? (n.h1 ? `${evSrc({ url: n.h1.to.url, src: n.h1.from.src })}` : '') : n.m && n.m.url ? evSrc({ url: n.m.url, src: n.m.src }) : '';
  const time = n.crypto ? (n.h1 ? `${evT(n.h1.from.at)} → ${evT(n.h1.measured_at, false)}` : '') : n.m && n.m.after ? `${n.m.before.d} → ${n.m.after.d}` : n.m && n.m.before ? `${XL('last before release', 'ค่าล่าสุดก่อนประกาศ')} ${n.m.before.d}` : '';
  const wrong = n.crypto ? EV_WRONG.btc : n.D0 && n.D0.view ? EV_WRONG[n.D0.view] : EV_WRONG.none;
  const why = n.crypto ? [XL('Measured from 1-minute exchange candles at the release and exactly 1 hour later.', 'วัดจากแท่งเทียน 1 นาทีของกระดาน ณ เวลาประกาศ และอีก 1 ชม. ถัดมาพอดี')] : [XL(...n.D0.why)];
  const label = n.crypto ? XL('Measured reaction (1h after the release)', 'ปฏิกิริยาที่วัดจริง (1 ชม. หลังประกาศ)') : XL(`Link from ${ev.type.toUpperCase()}: our explanation, not measured`, `ความเชื่อมโยงกับ ${ev.type.toUpperCase()}: เป็นคำอธิบายของเรา ไม่ได้วัด`);
  return `<div class="ixh"><h3>${esc(n.name)}</h3><small>${esc(label)}</small><button class="icon-btn ixx" data-evclose aria-label="${esc(XL('Close', 'ปิด'))}">✕</button></div>
    <div class="ixsec">${kv(T('evDir'), dir ? esc(T(dir)) : evNA(), dir === 'up' ? 'up' : dir === 'down' ? 'dn' : '')}${kv(T('evSize'), evNum(n.v) ? evFmt(n) : evNA())}${kv(T('evStr'), n.stren ? esc(T(n.stren)) : evNA())}${kv(T('evConf'), n.conf ? esc(T(n.conf)) : evNA())}</div>
    <div class="ixsec"><h4>${esc(T('evWhy'))}</h4><p class="sm">${esc(why[0])}</p></div>
    <div class="ixsec"><h4>${esc(T('evWrongIf'))}</h4><p class="sm">${esc(XL(...wrong))}</p></div>
    <div class="ixsec"><h4>${esc(T('evSrc'))}</h4><p class="sm">${src || evNA()}${time ? `<br><span class="mut">${esc(T('evTime'))}: ${esc(time)}</span>` : ''}${n.m && n.m.reason ? `<br><span class="mut">${esc(n.m.reason)}</span>` : ''}${n.m && n.m.status === 'waiting' ? `<br><span class="mut" data-evpub>${esc(evSrcWait(n.m))}${EV_PUB[n.k] ? ' · ' + esc(XL(...EV_PUB[n.k])) : ''} ${esc(XL('Rechecked by the hourly events job; never filled in.', 'งานอัปเดตรายชั่วโมงจะเช็กซ้ำให้ ไม่มีการเติมตัวเลขเอง'))}</span>` : ''}</p></div>`;
}
function evChainHtml(ev) {
  const nodes = {}, macroOn = ev.kind === 'scheduled' && ev.type !== 'unlock';
  if (macroOn) EV_COLS.forEach(([, , ks, sub]) => [...ks, ...(sub ? sub[1] : [])].forEach((k) => { nodes[k] = evMacroNode(ev, k); }));
  const cryp = ['BTC', 'ETH', ...(ev.tokens || []).filter((s) => s !== 'BTC' && s !== 'ETH')]; cryp.forEach((s) => { nodes[s] = evCryptoNode(ev, s); });
  const evBox = `<button type="button" class="evnode ev0${EV.node === 'ev' ? ' sel' : ''}" id="evn-ev" data-evnode="ev"><span class="n">${esc(evTitle(ev))}</span>${ev.actual && evNum(ev.actual.value) ? `<span class="m num">${esc(ev.actual.value + (ev.actual.unit || ''))}${ev.consensus ? ` vs ${esc(ev.consensus.value + (ev.consensus.unit || ''))}` : ''}</span>` : ''}<span class="f">${esc(ev.kind === 'breaking' ? T('evBreaking') : evStatus(ev) === 'upcoming' ? T('evUpcoming') : T('evReleased'))} ${esc(ev.time_known === false ? evDay(ev.at) : evT(ev.at, false))}</span></button>`;
  const col = (k, title, inner, cl = '') => `<div class="evcol ${cl}" data-col="${k}"><h3>${esc(title)}</h3>${inner}</div>`;
  const mid = macroOn ? EV_COLS.map(([k, t, ks, sub]) => col(k, XL(...t), ks.map((x) => evNodeHtml(nodes[x], ev)).join('') + (sub ? `<h3 class="evsub">${esc(XL(...sub[0]))}</h3>${sub[1].map((x) => evNodeHtml(nodes[x], ev)).join('')}` : ''), 'mid')).join('') : '';
  const crypto = col('crypto', XL('Crypto', 'คริปโต'), cryp.map((s) => evNodeHtml(nodes[s], ev)).join('') + evMine(ev));
  const short = macroOn && !EV.full;
  const body = `<div class="evchain${short ? ' short' : ''}${macroOn ? '' : ' nomacro'}" id="evChain">${col('event', XL('Event', 'อีเวนต์'), evBox, 'first')}${macroOn ? `<button type="button" class="evfull" data-evfull aria-expanded="${EV.full}">${esc(EV.full ? T('evHideFull') : T('evShowFull'))} ${EV.full ? '▴' : '▾'}</button>` : ''}${mid}${crypto}<svg class="evlinks" id="evLinks" aria-hidden="true"></svg></div>`;
  const legend = `<div class="evlegend"><span><b class="evmbox"></b>${esc(T('evLegendBlue'))}</span><span><i></i>${esc(T('evLegendDot'))}</span></div>`;
  const panelOpen = EV.node && nodes[EV.node];
  return { nodes, html: `<section class="card evcard"><h2>${esc(T('evChain'))} <span class="evtagc">${esc(T('evTap'))}</span></h2><div class="evwrap${panelOpen ? ' open' : ''}">${body}<aside class="evpanel ixstats" id="evPanel">${evPanel(ev, nodes)}</aside></div>${legend}</section>` };
}
function evDraw(ev, anim) {
  const c = $('#evChain'), s = $('#evLinks'); if (!c || !s || getComputedStyle(s).display === 'none') return;
  const R = c.getBoundingClientRect(); const pth = [];
  for (const [a, b] of EV_LINKS) { const A = $('#evn-' + a), B = $('#evn-' + b); if (!A || !B || !A.offsetParent || !B.offsetParent) continue; const ra = A.getBoundingClientRect(), rb = B.getBoundingClientRect(); if (rb.left <= ra.right) continue;
    const x1 = ra.right - R.left, y1 = ra.top + ra.height / 2 - R.top, x2 = rb.left - R.left, y2 = rb.top + rb.height / 2 - R.top, mx = (x1 + x2) / 2;
    pth.push(`<path d="M${x1.toFixed(1)},${y1.toFixed(1)}C${mx.toFixed(1)},${y1.toFixed(1)} ${mx.toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}"/>`); }
  s.setAttribute('viewBox', `0 0 ${R.width.toFixed(0)} ${R.height.toFixed(0)}`); s.innerHTML = pth.join(''); s.classList.toggle('anim', !!anim);
}
/* ---------- page ---------- */
function evVerdictLine(ev, s) {
  const P = ev.post || {}, d1 = P.d1 && P.d1[s], te = P.to_expiry && P.to_expiry[s], im = ev.pre && ev.pre.implied && ev.pre.implied[s], past = evPast(ev.type, s, 'd1', ev.at);
  const v = EVC.verdict({ d1: d1 ? d1.pct : null, toExp: te ? te.pct : null, implied: im, past });
  const lab = { surprise: T('vSurprise'), priced: T('vPriced'), nodata: T('vNodata'), nohist: T('vNohist') }[v.key];
  const exT = im && im.expiry ? evT(im.expiry) : '';
  let why;
  if (v.key === 'nodata' && v.basis === 'straddle') why = XL(`Waiting for the option expiry (${exT}) to compare the move with the straddle price.`, `รอถึงวันหมดอายุ options (${exT}) ก่อน แล้วค่อยเทียบกับราคา straddle`);
  else if (v.key === 'nodata') why = !d1 ? XL('The 1-day move is not measured yet.', 'ยังไม่ครบ 1 วัน เลยยังวัดไม่ได้') : XL('No options-implied move and no past events to compare with.', 'ไม่มีตัวเลข options และไม่มีอีเวนต์เก่าให้เทียบ');
  else if (v.key === 'nohist') why = XL(`No options market. Only ${v.n} past events of this type (need ${EVC.R.MIN_PAST_N}).`, `ไม่มีตลาด options และมีอีเวนต์แบบนี้แค่ ${v.n} ครั้ง (ต้องมีอย่างน้อย ${EVC.R.MIN_PAST_N})`);
  else if (v.basis === 'straddle') why = XL(`From the release to the ${exT} expiry, ${s} moved ${pct(te.pct)}: ${v.key === 'surprise' ? 'more' : 'less'} than the ATM straddle priced (±${v.ref.toFixed(2)}%).`, `จากตอนประกาศถึงวันหมดอายุ ${exT} ${s} ขยับ ${pct(te.pct)} ${v.key === 'surprise' ? 'มากกว่า' : 'น้อยกว่า'}ที่ ATM straddle ตั้งราคาไว้ (±${v.ref.toFixed(2)}%)`);
  else if (v.basis === 'dvol') why = XL(`The 1-day move (${pct(d1.pct)}) was ${v.key === 'surprise' ? 'bigger' : 'smaller'} than a 1σ move (±${v.ref.toFixed(2)}%) from 30-day average volatility, which is not event-specific. Even with no news, about 1 day in 3 beats 1σ (normal distribution).`, `ผ่านไป 1 วัน ${s} ขยับ ${pct(d1.pct)} ${v.key === 'surprise' ? 'มากกว่า' : 'น้อยกว่า'} 1σ (±${v.ref.toFixed(2)}%) ที่คิดจากความผันผวนเฉลี่ย 30 วัน ซึ่งไม่ได้เจาะจงอีเวนต์นี้ ต่อให้ไม่มีข่าว ราคาก็วิ่งเกิน 1σ ได้ราว 1 ใน 3 วัน (ตามการแจกแจงปกติ)`);
  else why = XL(`The 1-day move (${pct(d1.pct)}) vs past average ±${v.ref.toFixed(2)}% (n=${v.n}).`, `ผ่านไป 1 วัน ${s} ขยับ ${pct(d1.pct)} เทียบค่าเฉลี่ยในอดีต ±${v.ref.toFixed(2)}% (n=${v.n})`);
  return `<div class="evverdict" data-evbasis="${esc(v.basis || '')}"><span class="evpill ${v.key}">${esc(lab)}</span><span>${esc(why)}</span></div>`;
}
function evPricedHtml(ev) {
  const s = EV.asset, up = evStatus(ev) === 'upcoming', brk = ev.kind === 'breaking';
  const cell = (l, v, sub, c = '') => `<div class="evcell"><div class="l">${esc(l)}</div><div class="v num ${c}">${v}</div><div class="s">${sub || ''}</div></div>`;
  const cs = ev.consensus, ac = ev.actual, b24 = ev.post && ev.post.before24h && ev.post.before24h[s], im = ev.pre && ev.pre.implied && ev.pre.implied[s];
  const h1 = ev.post && ev.post.h1 && ev.post.h1[s], d1 = ev.post && ev.post.d1 && ev.post.d1[s], P = (ev.pos || {})[s] || {};
  const exp = brk ? cell(T('evExpected'), `<span class="mut sm">${esc(T('evNoFc'))}</span>`, '') : cs ? cell(T('evExpected'), esc(cs.value + (cs.unit || '')), `${esc(LANG === 'th' && cs.th_metric ? cs.th_metric : cs.metric || '')} · ${evSrc({ url: cs.url, src: XL('forecast', 'ตัวเลขคาด') })}${cs.locked_at ? ` · 🔒 ${esc(evT(cs.locked_at, false))}` : ''}`) : cell(T('evExpected'), evNA(), up ? esc(XL('entered before the release', 'จะใส่ก่อนประกาศ')) : '');
  const act = brk ? cell(T('evActual'), `<span class="sm">${esc(T('evBreaking'))}</span>`, evSrc({ url: ev.source && ev.source.url, src: ev.source && ev.source.name })) : ac && evNum(ac.value) ? cell(T('evActual'), esc(ac.value + (ac.unit || '')), evSrc({ url: ac.url, src: XL('official release', 'ประกาศทางการ') }) + evAlso(ev).map((x) => `<br><span data-evalso>${esc(x.name)}: <b class="num">${esc(x.a)}</b> (${esc(XL('expected', 'ตลาดคาด'))} ${x.c == null ? esc(T('evUnavail')) : esc(x.c)})</span>`).join(''), cs && ac.value > cs.value ? 'dn' : cs && ac.value < cs.value ? 'up' : '') : cell(T('evActual'), `<span class="mut sm">${esc(up ? T('evWait') : T('evUnavail'))}</span>`, '');
  const pre = brk ? (ev.pre_move && ev.pre_move[s]) : b24;
  const bef = cell(brk ? XL('Move before (1h)', 'ขยับก่อนข่าว (1 ชม.)') : T('evBefore'), pre ? pct(pre.pct) : `<span class="mut sm">${esc(up ? T('evWait') : T('evUnavail'))}</span>`, pre ? `${esc(brk ? XL('moved before the headline (leak or other news)', 'ขยับก่อนข่าวออก (อาจรั่ว หรือมีข่าวอื่น)') : T('evEvidence'))} · ${evSrc({ url: pre.to.url, src: pre.from.src })}` : '', pre ? cls(pre.pct) : '');
  const imSub = !im ? esc(s === 'BTC' || s === 'ETH' ? (up ? XL('ATM straddle, taken just before the release', 'ATM straddle เก็บก่อนประกาศ') : '') : XL('no options market', 'ไม่มีตลาด options'))
    : im.method === 'straddle' ? `<b>${esc(XL('ATM straddle', 'ATM straddle'))}</b> · ${esc(XL('expected move to the', 'คาดว่าจะเหวี่ยงถึงวันหมดอายุ'))} ${esc(evT(im.expiry))} ${esc(XL('expiry', ''))} · ${evSrc({ url: im.url, src: 'Deribit' })} · ${XL('snapshot', 'ณ')} ${esc(evT(im.at, false))}`
    : `<b>${esc(XL('30-day average volatility, not event-specific', 'ความผันผวนเฉลี่ย 30 วัน ไม่ได้เจาะจงอีเวนต์นี้'))}</b> · 1σ ${esc(XL('for 1 day', 'ใน 1 วัน'))} · ${evSrc({ url: im.url, src: 'Deribit DVOL' })} · ${XL('snapshot', 'ณ')} ${esc(evT(im.at, false))}`;
  const imp = cell(T('evImplied'), im ? '±' + im.pct.toFixed(2) + '%' + (im.method === 'straddle' ? '' : ' <small class="mut">1σ</small>') : evNA(), imSub);
  const aft = cell(T('evAfter'), h1 ? `${pct(h1.pct)} <small class="mut">1h</small>` : d1 ? '' : `<span class="mut sm">${esc(up ? T('evWait') : T('evWaitData'))}</span>`, `${h1 ? esc(XL('measured', 'วัด ณ') + ' ' + evT(h1.measured_at, false)) : ''}${d1 ? `<br><span class="num ${cls(d1.pct)}">${pct(d1.pct)}</span> ${esc(XL('after 1 day', 'หลัง 1 วัน'))} · ${esc(evT(d1.measured_at, false))}` : ''}${h1 || d1 ? ' · ' + evSrc({ url: (h1 || d1).to.url, src: (h1 || d1).from.src }) : ''}`, h1 ? cls(h1.pct) : '');
  const fu = P.funding, oi = P.oi, cot = P.cot;
  const pos = cell(T('evPos'), fu ? `<span class="sm">${esc(XL('Funding', 'Funding'))} ${fu.pct8h > 0 ? '+' : ''}${fu.pct8h.toFixed(4)}%</span>` : evNA(),
    [fu ? `${evSrc({ url: fu.url, src: /Hyperliquid/.test(fu.src || '') ? 'Hyperliquid' : 'Bybit' })} · ${esc(evT(fu.at, false))}` : '', oi ? `OI ${oi.coins.toLocaleString(loc(), { maximumFractionDigits: 0 })} ${esc(s)} · ${esc(evT(oi.at, false))}` : P.oi_na ? `<span title="${esc(P.oi_na)}">OI: ${esc(T('evUnavail'))}</span>` : '', cot ? `${evSrc({ url: cot.url, src: 'CFTC COT' })} ${XL('lev. funds net', 'กองทุนเลเวอเรจ net')} ${cot.lev_net.toLocaleString(loc())} · ${XL('as of', 'ข้อมูล')} ${esc(cot.report_date)}` : ''].filter(Boolean).join('<br>') || esc(up ? XL('snapshot 5 min before the release', 'เก็บ 5 นาทีก่อนประกาศ') : ''));
  const seg = `<div class="seg sm">${['BTC', 'ETH'].map((x) => `<button data-evasset="${x}" aria-pressed="${s === x}">${x}</button>`).join('')}</div>`;
  return `<section class="card evcard"><h2>${esc(T('evPriced'))} ${seg}</h2><div class="evpi">${exp}${act}${bef}${imp}${aft}${pos}</div>${brk ? '' : evVerdictLine(ev, s)}${cs && cs.note ? `<p class="sub">${esc(LANG === 'th' && cs.th_note ? cs.th_note : cs.note)}</p>` : ''}</section>`;
}
// Lock proof: verified only when GitHub recorded a push containing the lock commit before the release (docs/events-v1.md §5).
function evProofTag(ev) {
  if (ev.kind === 'breaking' || !ev.view || !ev.view.locked_at) return '';
  const p = ev.lock_proof; if (EVC.lockOk(ev)) return `<span class="evtag" data-evproof="ok" title="${esc(p.commit)}">${esc(XL('lock verified: pushed', 'ยืนยันการล็อกแล้ว: push เมื่อ'))} ${esc(evT(p.pushed_at))} · ${esc(String(p.commit).slice(0, 7))}</span>`;
  return `<span class="evtag late" data-evproof="no">${esc(XL('lock not verified', 'ยังยืนยันการล็อกไม่ได้'))}</span>`;
}
function evViewHtml(ev) {
  const v = ev.view, up = evStatus(ev) === 'upcoming', sc = evScen(ev), d = (k) => k ? `<span class="${k === 'up' ? 'up' : k === 'down' ? 'dn' : ''}">${esc(T(k))}</span>` : '–';
  const btc = tokBySym('BTC'), bias = btc && btc.I && btc.I.plan ? btc.I.plan.bias : null;
  const dec = `<div class="blk"><b>${esc(XL('Decision link', 'เชื่อมกับมุมมองเทคนิค'))}</b>${esc(XL('Current BTC technical verdict on Markets:', 'มุมมองเทคนิค BTC ตอนนี้ในหน้า Markets:'))} <a href="#/markets" data-evbtc>${bias ? vd(bias) : esc(T('evUnavail'))}</a>. ${esc(XL('No buy or sell calls.', 'ไม่ใช่สัญญาณซื้อขาย'))}</div>`;
  if (!v || !v.locked_at) return `<section class="card evcard"><h2>${esc(T('evView'))}</h2><p class="mut">${esc(ev.kind === 'breaking' ? XL('No view written for this headline yet.', 'ยังไม่ได้เขียนมุมมองสำหรับข่าวนี้') : up ? XL('Our view will be locked before the release. Nothing is shown until then.', 'มุมมองจะถูกล็อกก่อนประกาศ ก่อนหน้านั้นยังไม่แสดง') : XL('No view was locked before this release, so there is nothing to score.', 'รอบนี้ไม่ได้ล็อกมุมมองไว้ก่อนประกาศ เลยไม่มีอะไรให้คะแนน'))}</p>${dec}</section>`;
  const L2 = (o, k) => (LANG === 'th' && o['th_' + k]) || o[k];
  return `<section class="card evcard"><h2>${esc(T('evView'))} <span class="evlock">🔒 ${esc(XL('Locked', 'ล็อก'))} ${esc(evT(v.locked_at))}</span>${evProofTag(ev)}${v.after_news ? `<span class="evtag late">${esc(XL('written after the news', 'เขียนหลังข่าวออก'))}</span>` : ''}</h2>
    ${v.after_news ? `<p class="sub">${esc(XL('Written after the headline, so it never counts as a prediction. Scored 1 day after it was locked.', 'เขียนหลังข่าวออก จึงไม่นับเป็นการทำนาย ให้คะแนนหลังล็อก 1 วัน'))}</p>` : ''}
    <div class="tscroll"><table class="evtbl"><thead><tr><th>${esc(XL('Scenario', 'ฉาก'))}</th><th>${esc(v.metric || '')}</th><th>${esc(XL('Yields', 'ยีลด์'))}</th><th>${esc(XL('Dollar', 'ดอลลาร์'))}</th><th>BTC</th></tr></thead><tbody>
    ${(v.scenarios || []).map((x) => `<tr class="${sc && sc.key === x.key ? 'hit' : ''}"><td><b>${esc(L2(x, 'label'))}</b>${sc && sc.key === x.key ? ` ← ${esc(XL('happened', 'เกิดจริง'))}` : ''}</td><td class="num">${esc(x.range || '')}</td><td>${d(x.yields)}</td><td>${d(x.dollar)}</td><td>${d(x.btc)}</td></tr>`).join('')}</tbody></table></div>
    <div class="blk"><b>${esc(XL('Opposite case', 'มุมกลับ'))}</b>${esc(L2(v, 'opposite') || '')}</div><div class="blk"><b>${esc(T('evWrongIf'))}</b>${esc(L2(v, 'invalidation') || '')}</div>${dec}</section>`;
}
function evReplayHtml(ev) {
  const post = ev.kind === 'breaking' ? { d1: ev.post && ev.post.lock_d1 } : ev.post, r = EVC.scoreView(ev.view, ev.actual && ev.actual.value, post, EVC.lockOk(ev));
  const mk = (h) => evRes(r.flat && r.flat[h] ? 'flat' : r[h]);
  const kv = (l, v) => `<div class="ixkv"><span>${esc(l)}</span>${v}</div>`;
  const p1 = evPast(ev.type, 'BTC', 'h1', ev.at); const hasV = ev.view && ev.view.locked_at, unv = hasV && !EVC.lockOk(ev);
  const scored = evList().filter((e) => e.view && e.lockv && e.scored).length;
  return `<section class="card evcard"><h2>${esc(T('evReplay'))}</h2>
    ${unv ? `<p class="sub" data-evunv>${esc(XL('Lock not verified: no push recorded by GitHub before the release, so this view is not scored as a locked forecast.', 'ยังยืนยันการล็อกไม่ได้ เพราะ GitHub ไม่มีบันทึกการ push ก่อนประกาศ เลยไม่นับมุมมองนี้เป็นการทำนายที่ล็อกไว้'))}</p>` : ''}
    ${hasV && !unv ? (ev.kind === 'breaking' ? '' : kv(XL('1 hour after', '1 ชม. หลังประกาศ'), mk('h1'))) + kv(XL('1 day after', '1 วันหลังประกาศ'), mk('d1')) + kv(T('evWrongLvl'), r.wrong == null ? `<span class="mut">${esc(T('evNotScored'))}</span>` : `<b class="${r.wrong ? 'dn' : ''}">${esc(r.wrong ? T('evHit') : T('evNotHit'))}</b>`) + `<p class="sub sm" data-evflatrule>${esc(evFlatRule())}</p>` : unv ? '' : `<p class="mut sm">${esc(XL('No locked view, nothing to score.', 'ไม่มีมุมมองที่ล็อกไว้ เลยไม่มีคะแนน'))}</p>`}
    <div class="blk"><b>${esc(T('evPastSame'))}</b>${ev.kind === 'breaking' || ev.type === 'unlock' ? esc(XL('Not tracked for this type yet.', 'ยังไม่ได้เก็บสถิติประเภทนี้')) : p1.n ? esc(XL(`BTC's average 1-hour move size: ${p1.avg.toFixed(2)}% (based on ${p1.n} events, real candles)`, `BTC ขยับเฉลี่ยใน 1 ชม.: ${p1.avg.toFixed(2)}% (จาก ${p1.n} ครั้ง ราคาจริง)`)) : esc(XL('No past events measured yet.', 'ยังไม่มีอีเวนต์เก่าที่วัดไว้'))}</div>
    <div class="blk" data-evscorecard><b>${esc(T('evScorecard'))}</b>${evScorecard(scored >= EVC.R.SCORECARD_MIN, scored)}</div></section>`;
}
// 5b: the headline names a tracked token, but only BTC/ETH moved unusually, so the token's own news is not shown to be the cause.
function evTokUnclear(ev) {
  const g = ev.kind === 'breaking' && (ev.candidates || [])[0] && ev.candidates[0].gate; if (!EVC.tokenUnclear(g)) return '';
  const t = g.tok, thr = EVC.unusualThr(t.usual);
  return `<div class="evcands" data-evtokunclear><b>${esc(XL('Cause unclear', 'ยังไม่ชัดว่าเพราะอะไร'))}</b>${esc(XL(`The headline names ${t.sym}, but ${t.sym} did not move unusually vs BTC (${pct(t.rel)} vs ±${evNum(thr) ? thr.toFixed(2) : '–'}% threshold). The gate passed only on ${g.by}'s move, which may have other causes.`, `ข่าวพูดถึง ${t.sym} แต่ ${t.sym} ไม่ได้ขยับผิดปกติเมื่อเทียบกับ BTC (${pct(t.rel)} เทียบเกณฑ์ ±${evNum(thr) ? thr.toFixed(2) : '–'}%) ที่ผ่านเกณฑ์ก็เพราะ ${g.by} ขยับแรงเท่านั้น ซึ่งอาจมาจากเรื่องอื่น`))}</div>`;
}
function evGateLine(ev) {
  const g = ev.kind === 'breaking' && ev.gate_check && (ev.gate_check.results || []).find((x) => x.pass) || (ev.gate_check && (ev.gate_check.results || [])[0]); if (!g || !g.m || !g.u) return '';
  const row = (a) => { const m = g.m[a], u = g.u[a]; if (!evNum(m) || !u || !evNum(u.avg)) return ''; const thr = Math.max(EVC.R.UNUSUAL_X * u.avg, evNum(u.p98) ? u.p98 : 0);
    return `${a.toUpperCase()} 1h ${pct(m)} ${XL('vs threshold', 'เทียบเกณฑ์')} ±${thr.toFixed(2)}% (${XL('stricter of', 'ใช้ค่าที่สูงกว่าระหว่าง')} ${EVC.R.UNUSUAL_X}× ${XL('mean', 'ค่าเฉลี่ย')} ${(EVC.R.UNUSUAL_X * u.avg).toFixed(2)}% / p${Math.round(EVC.R.UNUSUAL_PCTL * 100)} ${evNum(u.p98) ? u.p98.toFixed(2) + '%' : '–'}, ${XL('last 30 days', '30 วันล่าสุด')})`; };
  return `<div class="evcands" data-evgate><b>${esc(XL('Breaking-news gate', 'เกณฑ์ข่าวด่วน'))}</b>${['btc', 'eth'].map(row).filter(Boolean).join('<br>')}</div>`;
}
/* Scorecard of 1-day results: "X right of Y calls (Z no call)". The right/wrong count stays hidden until SCORECARD_MIN scored events (small samples mislead);
   before that only the progress and the no-call count show, so flat results are never hidden. */
function evScorecard(open, scored) { const t = EVC.tally(evList().filter((e) => e.view && e.lockv && e.scored).map((e) => EV.files[e.id]).filter((ev) => ev && !ev.err).map((ev) => EVC.scoreView(ev.view, ev.actual && ev.actual.value, ev.kind === 'breaking' ? { d1: ev.post.lock_d1 } : ev.post, EVC.lockOk(ev))));
  const nc = XL(`${t.nocall} no call`, `ไม่นับ ${t.nocall}`), M = EVC.R.SCORECARD_MIN;
  return open ? `<span class="num" data-evtally>${esc(XL(`${t.right} right of ${t.calls} calls (${nc})`, `ถูก ${t.right} จาก ${t.calls} ครั้งที่ชี้ทิศ (${nc})`))}</span> <span class="mut">${esc(XL('1-day direction', 'ทิศทาง 1 วัน'))}</span>`
    : `<span class="mut" data-evtally>${esc(XL(`Shows after ${M} scored events · ${scored} of ${M} so far (${t.calls} call${t.calls === 1 ? '' : 's'}, ${nc})`, `จะแสดงเมื่อให้คะแนนครบ ${M} อีเวนต์ · ตอนนี้ ${scored} จาก ${M} (ชี้ทิศ ${t.calls} ครั้ง, ${nc})`))}</span>`; }
/* ---------- v50: event list, forecast, "what's priced in now", after-release comparison (docs/events-v1.md §5b-§5d) ---------- */
const evDirChip = (k) => (k ? `<span class="evexp ${k === 'up' ? 'up' : k === 'down' ? 'dn' : ''}">${k === 'up' ? '▲' : k === 'down' ? '▼' : '•'} ${esc(T(k))}</span>` : `<span class="mut">–</span>`);
const evInp = (id) => (EV.inp[id] !== undefined ? Promise.resolve(EV.inp[id]) : getJSON(`data/events/inputs/${encodeURIComponent(id)}.json?ts=` + Date.now()).then((x) => (EV.inp[id] = x && typeof x === 'object' ? x : null)).catch(() => (EV.inp[id] = null)));
const evPre = (id) => (EV.pre && EV.pre.events && EV.pre.events[id]) || null;
// BTC priced-in verdict of a released event (same rule as the event page), for the list chip
function evVerdictKey(ev) { if (!ev || ev.err || ev.kind === 'breaking') return null; const s = 'BTC', P = ev.post || {}; return EVC.verdict({ d1: P.d1 && P.d1[s] ? P.d1[s].pct : null, toExp: P.to_expiry && P.to_expiry[s] ? P.to_expiry[s].pct : null, implied: ev.pre && ev.pre.implied && ev.pre.implied[s], past: evPast(ev.type, s, 'd1', ev.at) }).key; }
function evChipFor(e) {
  if (e.kind === 'breaking') { const f = EV.files[e.id]; return e.cu || (f && f.candidates && f.candidates[0] && EVC.tokenUnclear(f.candidates[0].gate)) ? `<span class="evtag late">${esc(XL('cause unclear', 'ยังไม่ชัดว่าเพราะอะไร'))}</span>` : ''; }
  if (Date.parse(e.at) > Date.now()) { const p = evPre(e.id), x = p && p.assets && p.assets.BTC && p.assets.BTC.vs_usual;
    return x ? `<span class="evtag pi ${x.key}">${esc(XL({ bigger: 'Options: bigger move than usual', smaller: 'Options: smaller move than usual', normal: 'Options: usual-size move' }[x.key], { bigger: 'Options: คาดเหวี่ยงแรงกว่าปกติ', smaller: 'Options: คาดเหวี่ยงน้อยกว่าปกติ', normal: 'Options: คาดเหวี่ยงพอ ๆ กับปกติ' }[x.key]))}</span>` : `<span class="evtag na">${esc(XL('priced-in: not measured yet', 'price in: ยังไม่ได้วัด'))}</span>`; }
  const k = evVerdictKey(EV.files[e.id]); return k ? `<span class="evtag pi ${k}" data-evpichip>${esc(XL('BTC', 'BTC'))} ${esc({ surprise: T('vSurprise'), priced: T('vPriced'), nodata: T('vNodata'), nohist: T('vNohist') }[k])}</span>` : '';
}
// Recent list: the locked view's 1-day result as its own labelled chip (the old bare ✓ only meant "scored")
function evScoreChip(e) { const f = EV.files[e.id]; if (!e.scored || !e.view || !f || f.err || !EVC.lockOk(f)) return '';
  const r = EVC.scoreView(f.view, f.actual && f.actual.value, f.kind === 'breaking' ? { d1: f.post && f.post.lock_d1 } : f.post, true), x = r.flat && r.flat.d1 ? 'flat' : r.d1;
  return x === true ? `<span class="evtag vr ok" data-evscore>${esc(XL('view 1d: ✓ = direction matched', 'มุมมอง 1 วัน: ✓ = ทิศทางตรง'))}</span>` : x === false ? `<span class="evtag vr no" data-evscore>${esc(XL('view 1d: ✗ = direction missed', 'มุมมอง 1 วัน: ✗ = ทิศทางพลาด'))}</span>` : x === 'flat' ? `<span class="evtag vr" data-evscore>${esc(XL('view 1d: flat · no call', 'มุมมอง 1 วัน: ไม่นับ (flat)'))}</span>` : ''; }
function evListHtml(id, now) {
  const L = evList().slice().sort((a, b) => a.at.localeCompare(b.at)), up = L.filter((e) => Date.parse(e.at) > now), past = L.filter((e) => Date.parse(e.at) <= now).reverse().slice(0, 4);
  const when = (e) => esc(e.time_known === false ? evDay(e.at) + ' · ' + XL('time not announced', 'ยังไม่ประกาศเวลา') : evT(e.at));
  const card = (e) => `<a class="evli${e.id === id ? ' on' : ''}" href="#/events/${esc(e.id)}"${e.id === id ? ' aria-current="true"' : ''}><span class="t">${esc(evTitle(e))}</span><span class="d">${when(e)}</span><span class="r"><span class="evcd num" data-evcd="${esc(e.at)}">${esc(evCountdown(e.at))}</span><span class="evst upcoming">${esc(T('evUpcoming'))}</span>${evChipFor(e)}</span></a>`;
  const row = (e) => { const st = evStatus(e, now); return `<a class="evrow${e.id === id ? ' on' : ''}" href="#/events/${esc(e.id)}"${e.id === id ? ' aria-current="true"' : ''}><span class="t">${esc(evTitle(e))}</span><span class="d">${when(e)}</span><span class="r"><span class="evst ${st}">${esc(st === 'breaking' ? T('evBreaking') : T('evReleased'))}</span>${e.nq ? `<span class="evtag na">${esc(XL('does not qualify', 'ไม่ผ่านเกณฑ์'))}</span>` : ''}${evChipFor(e)}${evScoreChip(e)}</span></a>`; };
  return `<section class="evlist" aria-label="${esc(T('events'))}"><p class="sub evtz">${esc(T('evLocal'))} · ${esc(tzL())}</p>
    <h2 class="evlh">${esc(XL('Coming up', 'กำลังจะมา'))}</h2>${up.length ? `<div class="evups">${up.map(card).join('')}</div>` : `<p class="mut sm">${esc(XL('No scheduled events in the next 30 days.', 'ยังไม่มีอีเวนต์ในตาราง 30 วันข้างหน้า'))}</p>`}
    ${past.length ? `<h2 class="evlh">${esc(XL('Recent', 'ล่าสุด'))}</h2><div class="evrecent">${past.map(row).join('')}</div>` : ''}</section>`;
}
// Forecast (before release): consensus + our view. Before the lock it shows the final inputs (unchanged values); the lock freezes exactly these.
function evForecastHtml(ev, inp) {
  const locked = !!(ev.view && ev.view.locked_at), v = locked ? ev.view : inp && inp.view && inp.view.status === 'final' ? inp.view : null;
  const cs = ev.consensus || (inp && inp.consensus && evNum(inp.consensus.value) && /^https:\/\//.test(inp.consensus.url || '') ? inp.consensus : null);
  const L2 = (o, k) => (LANG === 'th' && o['th_' + k]) || o[k], up = evStatus(ev) === 'upcoming', sc = evScen(ev);
  const tag = locked ? `<span class="evlock">🔒 ${esc(XL('locked at', 'ล็อกเมื่อ'))} ${esc(evT(ev.view.locked_at))}</span>${evProofTag(ev)}` : `<span class="evtag late" data-evunlocked>${esc(up ? XL('not locked yet · locks before the release', 'ยังไม่ล็อก · จะล็อกก่อนประกาศ') : XL('never locked', 'ไม่ได้ล็อกไว้'))}</span>`;
  const csH = cs ? `<div class="evcons"><div><span class="l">${esc(XL('Consensus', 'ตลาดคาด'))}</span><b class="num">${esc(cs.value + (cs.unit || ''))}</b> <span class="sub">${esc(L2(cs, 'metric') || '')}</span></div>
    ${(cs.also || []).filter((a) => evNum(a.value)).map((a) => `<div class="sub">${esc(L2(a, 'metric') || '')}: <b class="num">${esc(a.value + (a.unit || ''))}</b></div>`).join('')}
    <div class="sub">${esc(XL('Source', 'แหล่ง'))}: ${evSrc({ url: cs.url, src: cs.source || XL('forecast', 'ตัวเลขคาด') })}${cs.cross_check && /^https:\/\//.test(cs.cross_check.url || '') ? `<br>${esc(XL('Cross-check', 'เทียบอีกแหล่ง'))}: ${evSrc({ url: cs.cross_check.url, src: cs.cross_check.source })}` : ''}</div>
    ${cs.note ? `<div class="sub">${esc(L2(cs, 'note'))}</div>` : ''}</div>` : `<p class="mut">${esc(XL('Consensus: ', 'ตลาดคาด: '))}${esc(T('evUnavail'))}</p>`;
  const vH = v ? `<div class="tscroll"><table class="evtbl evfc"><thead><tr><th>${esc(XL('Scenario', 'ฉาก'))}</th><th>${esc(v.metric || '')}</th><th>${esc(XL('Yields', 'ยีลด์'))}</th><th>${esc(XL('Dollar', 'ดอลลาร์'))}</th><th>BTC</th><th>ETH</th></tr></thead><tbody>
    ${(v.scenarios || []).map((x) => `<tr class="${sc && sc.key === x.key ? 'hit' : ''}"><td><b>${esc(L2(x, 'label'))}</b>${sc && sc.key === x.key ? ` ← ${esc(XL('happened', 'เกิดจริง'))}` : ''}</td><td class="num" data-l="${esc(v.metric || '')}">${esc(x.range || '')}</td><td data-l="${esc(XL('Yields', 'ยีลด์'))}">${evDirChip(x.yields)}</td><td data-l="${esc(XL('Dollar', 'ดอลลาร์'))}">${evDirChip(x.dollar)}</td><td data-l="BTC">${evDirChip(x.btc)}</td><td data-l="ETH">${evDirChip(x.eth)}</td></tr>`).join('')}</tbody></table></div>
    <p class="sub evexpl"><span class="evexp">▲</span> ${esc(XL('Expected directions are our explanation, not measured values.', 'ทิศทางที่คาดเป็นคำอธิบายของเรา ไม่ใช่ค่าที่วัดได้'))}${(v.scenarios || []).some((x) => !x.eth) ? ' ' + esc(XL('ETH: no direction set in this view.', 'ETH: มุมมองนี้ไม่ได้กำหนดทิศทางไว้')) : ''}</p>
    <div class="blk"><b>${esc(XL('Opposite case', 'มุมกลับ'))}</b>${esc(L2(v, 'opposite') || '')}</div><div class="blk"><b>${esc(T('evWrongIf'))}</b>${esc(L2(v, 'invalidation') || '')}</div>`
    : `<p class="mut">${esc(up ? XL('Our view is not final yet. It will appear here, then be locked before the release.', 'มุมมองของเรายังไม่สรุป จะแสดงที่นี่แล้วล็อกก่อนประกาศ') : XL('No view was locked before this release, so there is nothing to score.', 'รอบนี้ไม่ได้ล็อกมุมมองไว้ก่อนประกาศ เลยไม่มีอะไรให้คะแนน'))}</p>`;
  const btc = tokBySym('BTC'), bias = btc && btc.I && btc.I.plan ? btc.I.plan.bias : null;
  const dec = `<div class="blk"><b>${esc(XL('Decision link', 'เชื่อมกับมุมมองเทคนิค'))}</b>${esc(XL('Current BTC technical verdict on Markets:', 'มุมมองเทคนิค BTC ตอนนี้ในหน้า Markets:'))} <a href="#/markets" data-evbtc>${bias ? vd(bias) : esc(T('evUnavail'))}</a>. ${esc(XL('No buy or sell calls.', 'ไม่ใช่สัญญาณซื้อขาย'))}</div>`;
  return `<section class="card evcard" data-evfc><h2>${esc(XL('Forecast (before release)', 'คาดการณ์ (ก่อนประกาศ)'))} ${tag}</h2>${csH}${vH}${dec}</section>`;
}
// "What's priced in now": hourly estimates from live market data (prelive.json). Informational; the lock's snapshot is the scoring basis.
function evNowHtml(ev, p) {
  const s = EV.asset, A = p && p.assets && p.assets[s], up = evStatus(ev) === 'upcoming', na = evNA();
  const cell = (l, v, sub) => `<div class="evcell"><div class="l">${esc(l)}</div><div class="v num">${v}</div><div class="s">${sub || ''}</div></div>`;
  const im = A && A.implied, w = A && A.window, b = A && A.base, x = A && A.vs_usual, R = (A && A.run) || {}, fu = A && A.funding, cot = A && A.cot;
  const win = w ? XL(`window: ${w.before_h.toFixed(1)}h before + ${w.after_h.toFixed(1)}h after the release`, `ช่วงเวลา: ${w.before_h.toFixed(1)} ชม. ก่อน + ${w.after_h.toFixed(1)} ชม. หลังประกาศ`) : '';
  const c1 = cell(XL('Options-implied move', 'Options คาดว่าจะเหวี่ยง'), im ? '±' + im.pct.toFixed(2) + '%' : na, im ? `<b>ATM straddle</b> · ${esc(XL('to the', 'ถึงวันหมดอายุ'))} ${esc(evT(im.expiry))} ${esc(XL('expiry', ''))} · ${esc(win)} · ${evSrc({ url: im.url, src: 'Deribit' })} · ${esc(XL('as of', 'ณ'))} ${esc(evT(im.at, false))}` : esc(s === 'BTC' || s === 'ETH' ? XL('no live straddle read yet', 'ยังไม่ได้ดึงราคา straddle') : ''));
  const c2 = cell(XL('Usual move, same window', 'ปกติเหวี่ยงเท่าไร (ช่วงเดียวกัน)'), b ? '±' + b.avg.toFixed(2) + '%' : na, b ? esc(XL(`average |move| after ${b.n} past ${ev.type.toUpperCase()} releases, ${win.replace('window: ', '')} · ${b.src}`, `ค่าเฉลี่ยการขยับ (ไม่สนทิศ) หลังประกาศ ${ev.type.toUpperCase()} ${b.n} ครั้งที่ผ่านมา ช่วงเวลาเดียวกัน · ${b.src}`)) : '');
  const xl = x ? XL({ bigger: 'Market expects a bigger move than usual', smaller: 'Market expects a smaller move than usual', normal: 'Market expects a usual-size move' }[x.key], { bigger: 'ตลาดคาดว่าจะเหวี่ยงแรงกว่าปกติ', smaller: 'ตลาดคาดว่าจะเหวี่ยงน้อยกว่าปกติ', normal: 'ตลาดคาดว่าจะเหวี่ยงพอ ๆ กับปกติ' }[x.key]) : '';
  const c3 = cell(XL('Options vs usual', 'Options เทียบปกติ'), x ? `${x.ratio.toFixed(2)}×` : na, x ? `<b class="evpi-l">${esc(xl)}</b><br>${esc(XL(`ratio = options ÷ usual; above ${EVC.R.EXPECT_RATIO[1]} bigger, below ${EVC.R.EXPECT_RATIO[0]} smaller`, `อัตราส่วน = options ÷ ปกติ; เกิน ${EVC.R.EXPECT_RATIO[1]} = แรงกว่า, ต่ำกว่า ${EVC.R.EXPECT_RATIO[0]} = น้อยกว่า`))}` : esc(b && b.n < EVC.R.MIN_PAST_N ? XL(`needs ${EVC.R.MIN_PAST_N}+ past events`, `ต้องมีอีเวนต์เก่าอย่างน้อย ${EVC.R.MIN_PAST_N} ครั้ง`) : ''));
  const rr = (k, l) => { const m = R[k]; return `<div class="ixkv"><span>${esc(l)}</span><b class="num ${m ? cls(m.pct) : ''}">${m ? pct(m.pct) : na}</b></div>`; };
  const c4 = `<div class="evcell"><div class="l">${esc(XL('Run-up into the event', 'ราคาวิ่งมาก่อนอีเวนต์'))}</div>${rr('week', XL('since week start', 'ตั้งแต่ต้นสัปดาห์') + (R.week ? ' (' + evT(R.week.from.at) + ')' : ''))}${rr('h24', '24h')}${rr('d7', XL('7 days', '7 วัน'))}<div class="s">${R.h24 || R.d7 || R.week ? `${evSrc({ url: (R.h24 || R.d7 || R.week).to.url, src: (R.h24 || R.d7 || R.week).from.src })} · ${esc(XL('to', 'ถึง'))} ${esc(evT((R.h24 || R.d7 || R.week).to.at, false))}` : ''}</div></div>`;
  const c5 = cell(XL('Funding', 'Funding'), fu ? `${fu.pct8h > 0 ? '+' : ''}${fu.pct8h.toFixed(4)}% <small class="mut">/8h</small>` : na, fu ? `${evSrc({ url: fu.url, src: 'Hyperliquid' })} · ${esc(evT(fu.at, false))}` : '');
  const c6 = cell(XL('CFTC COT (weekly)', 'CFTC COT (รายสัปดาห์)'), cot ? `<span class="sm">${esc(XL('lev. funds net', 'กองทุนเลเวอเรจ net'))} ${esc(cot.lev_net.toLocaleString(loc()))}</span>` : na, cot ? `${esc(XL('contracts', 'สัญญา'))} · ${evSrc({ url: cot.url, src: 'CFTC' })} · ${esc(XL('as of', 'ข้อมูล'))} ${esc(cot.report_date)} (${esc(XL('published', 'เผยแพร่'))} ${esc(evT(cot.published, false))})` : '');
  const age = p ? Date.now() - Date.parse(p.at) : null;
  const st = !p ? `<span class="evtag na">${esc(XL('not available yet · updated hourly', 'ยังไม่มีข้อมูล · อัปเดตทุกชั่วโมง'))}</span>` : p.frozen_at ? `<span class="evlock" data-evfrozen>🔒 ${esc(XL('frozen at the lock', 'หยุดอัปเดตตอนล็อก'))} ${esc(evT(p.frozen_at, false))}</span>` : `<span class="evtag">${esc(XL('updated', 'อัปเดต'))} ${esc(evT(p.at, false))} · ${esc(XL('hourly', 'ทุกชั่วโมง'))}</span>${age > 2 * 36e5 ? ` <span class="evtag late" data-evstale title="${esc(XL('The hourly GitHub job that refreshes this card has not run since then (GitHub skips scheduled runs at busy times). Numbers are shown as of their own time, never extrapolated.', 'งานอัปเดตรายชั่วโมงบน GitHub ยังไม่ได้รันตั้งแต่ตอนนั้น (GitHub ข้ามรอบตามตารางเวลาเมื่อระบบยุ่ง) ตัวเลขแสดงตามเวลาของมันเอง ไม่ได้คาดต่อ'))}">${esc(T('evStale'))} · ${esc(XL(`${Math.floor(age / 36e5)}h old, hourly update late`, `อายุ ${Math.floor(age / 36e5)} ชม. รอบอัปเดตรายชั่วโมงล่าช้า`))}</span>` : ''}`;
  const seg = `<div class="seg sm">${['BTC', 'ETH'].map((y) => `<button data-evasset="${y}" aria-pressed="${s === y}">${y}</button>`).join('')}</div>`;
  return `<section class="card evcard" data-evnow><h2>${esc(up ? XL("What's priced in now", 'ตอนนี้ตลาด price in อะไรไว้แล้ว') : XL('What was priced in before the release', 'ก่อนประกาศ ตลาด price in อะไรไว้'))} <span class="evtagc">${esc(XL('estimates', 'ค่าประมาณ'))}</span> ${st} ${seg}</h2>
    <div class="evpi">${c1}${c2}${c3}${c4}${c5}${c6}</div>
    <p class="sub">${esc(XL('Estimates from live market data, for context only. The snapshot frozen at the lock is what gets scored. Options usually price a bit more movement than happens (volatility risk premium).', 'เป็นค่าประมาณจากข้อมูลตลาดสด ใช้ดูประกอบเท่านั้น ค่าที่ใช้ให้คะแนนคือชุดที่ล็อกไว้ ปกติ options มักตั้งราคาเผื่อการเหวี่ยงไว้มากกว่าที่เกิดจริงนิดหน่อย (volatility risk premium)'))}</p></section>`;
}
// Extra printed metrics (e.g. headline CPI next to core): actual from ev.actual.also, consensus from ev.consensus.also, matched by metric name. Data values only.
function evAlso(ev) { const ac = ev.actual, cs = ev.consensus; if (!ac || !Array.isArray(ac.also)) return [];
  return ac.also.filter((x) => x && evNum(x.value)).map((x) => { const c = ((cs && cs.also) || []).find((y) => y && y.metric === x.metric && evNum(y.value));
    return { key: String(x.metric || '').split(' ')[0].toLowerCase(), name: (LANG === 'th' && ((c && c.th_metric) || x.th_metric)) || x.metric, a: x.value + (x.unit || ''), av: x.value, c: c ? c.value + (c.unit || '') : null, cv: c ? c.value : null }; }); }
// The cross-check's figure for one metric, taken from its source text (e.g. "FactSet consensus via Morningstar: core 0.2%, headline 0.24%" -> "0.24%"); null if not stated.
const evCrossVal = (txt, key) => { const m = key && new RegExp(`\\b${key}\\s+(-?\\d+(?:\\.\\d+)?%)`, 'i').exec(String(txt || '')); return m ? m[1] : null; };
// After the release: forecast vs actual, expected vs actual move, verdict, view result, plus a 1-2 line summary from fixed rules (no AI).
function evCompareHtml(ev) {
  const P = ev.post || {}, cs = ev.consensus, ac = ev.actual, sc = evScen(ev), proven = EVC.lockOk(ev), r = EVC.scoreView(ev.view, ac && ac.value, P, proven);
  const pv = EVC.printVs(ac && ac.value, cs && cs.value), W = { cpi: ['hotter than expected', 'cooler than expected', 'ร้อนกว่าคาด', 'เย็นกว่าคาด'], ppi: ['hotter than expected', 'cooler than expected', 'ร้อนกว่าคาด', 'เย็นกว่าคาด'], jobs: ['stronger than expected', 'weaker than expected', 'แรงกว่าคาด', 'อ่อนกว่าคาด'] }[ev.type] || ['above expectations', 'below expectations', 'สูงกว่าคาด', 'ต่ำกว่าคาด'];
  const pvL = pv === 'above' ? XL(W[0], W[2]) : pv === 'below' ? XL(W[1], W[3]) : pv === 'match' ? XL('in line with expectations', 'ตามคาด') : null;
  const wait = `<span class="mut">${esc(T('evWaitData'))}</span>`, mv = (m) => (m ? `<span class="num ${cls(m.pct)}">${pct(m.pct)}</span>` : wait);
  const res = (x) => (!proven ? `<span class="mut">${esc(T('evNotScored'))}</span>` : evRes(x)), dres = (v, flat, exp) => { const x = EVC.dirResult(v, flat, exp); return x === null ? '<span class="mut">–</span>' : res(x); };
  const mac = (k) => { const m = (ev.macro || {})[k]; return m && m.status === 'ok' && evNum(m.chg) ? m.chg : null; };
  const macWait = (k) => { const m = (ev.macro || {})[k]; return m && m.status === 'waiting' ? `<span class="mut" data-evsrcwait>${esc(evSrcWait(m))}</span>` : wait; };
  const rowM = (l, exp, k, unit) => { const v = mac(k); return `<tr><td>${esc(l)}</td><td>${sc ? evDirChip(exp) : '–'}</td><td>${evNum(v) ? `<span class="num ${cls(v)}">${unit === 'bp' ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + ' bp' : pct(v)}</span>` : macWait(k)}</td><td>${sc && exp && evNum(v) ? dres(v, 1e-9, exp) : '<span class="mut">–</span>'}</td></tr>`; };
  const csSrc = cs ? `<br><small class="mut" data-evcssrc>${esc(XL('consensus', 'ตลาดคาด'))}: ${evSrc({ url: cs.url, src: String(cs.source || XL('source', 'แหล่งข้อมูล')).split(/,| \(/)[0] })}${cs.cross_check ? ` · ${esc(XL('cross-check', 'เทียบกับ'))}: ${evSrc({ url: cs.cross_check.url, src: String(cs.cross_check.source || '').split(':')[0] })}` : ''}</small>` : '';
  // Extra rows: the locked consensus source, plus the cross-check's own number for that metric stated plainly (it may differ), read from the cross_check text
  const csOther = (x) => { const cc = cs.cross_check, nm = cc ? String(cc.source || '').split(/:| consensus/)[0].trim() : '', v = cc && evCrossVal(cc.source, x.key);
    return `<br><small class="mut" data-evcssrc>${esc(XL('consensus', 'ตลาดคาด'))}: ${evSrc({ url: cs.url, src: String(cs.source || XL('source', 'แหล่งข้อมูล')).split(/,| \(/)[0] })}${cc ? ` · <span data-evxcheck>${evSrc({ url: cc.url, src: v ? XL(`${nm}: ${v}`, `${nm} คาด ${v}`) : `${nm}: ${T('evUnavail')}` })}</span>` : ''}</small>`; };
  const pvW = (a, c) => { const k = EVC.printVs(a, c); return k === 'above' ? XL(W[0], W[2]) : k === 'below' ? XL(W[1], W[3]) : k === 'match' ? XL('in line with expectations', 'ตามคาด') : null; };
  const rows = [`<tr><td><span>${esc(XL('Print vs consensus', 'ตัวเลขจริง vs ตลาดคาด'))}${cs ? `<br><small class="mut">${esc((LANG === 'th' && cs.th_metric) || cs.metric || '')}</small>` : ''}</span></td><td>${cs ? `<span><b class="num">${esc(cs.value + (cs.unit || ''))}</b>${csSrc}</span>` : evNA()}</td><td>${ac ? `<b class="num">${esc(ac.value + (ac.unit || ''))}</b> ${evSrc({ url: ac.url, src: XL('official', 'ทางการ') })}` : wait}</td><td>${pvL ? esc(pvL) : '<span class="mut">–</span>'}</td></tr>`,
    ...evAlso(ev).map((x) => `<tr data-evalsorow><td>${esc(x.name)}</td><td>${x.c == null ? evNA() : `<span><b class="num">${esc(x.c)}</b>${csOther(x)}</span>`}</td><td><b class="num">${esc(x.a)}</b> ${evSrc({ url: ac.url, src: XL('official', 'ทางการ') })}</td><td>${pvW(x.av, x.cv) ? esc(pvW(x.av, x.cv)) : '<span class="mut">–</span>'}</td></tr>`),
    `<tr><td>${esc(XL('Our scenario', 'ฉากของเรา'))}</td><td>${ev.view && ev.view.locked_at ? esc(XL('locked', 'ล็อกไว้')) : evNA()}</td><td>${sc ? `<b>${esc((LANG === 'th' && sc.th_label) || sc.label)}</b>` : ac ? '<span class="mut">–</span>' : wait}</td><td>${!ev.view || !ev.view.locked_at ? '<span class="mut">–</span>' : !proven ? `<span class="mut">${esc(XL('lock not verified', 'ยังยืนยันการล็อกไม่ได้'))}</span>` : r.wrong === true ? `<b class="dn">${esc(XL('proven wrong', 'ผิด'))}</b>` : r.d1 === true ? `<b class="up">${esc(XL('right so far', 'ถูกทาง'))}</b>` : r.d1 === false ? `<b class="dn">${esc(T('evMissed'))}</b>` : r.flat && r.flat.d1 ? evRes('flat') : `<span class="mut">${esc(T('evNotScored'))}</span>`}</td></tr>`,
    rowM(XL('US 2-year yield (full day)', 'ยีลด์ 2 ปีสหรัฐฯ (ทั้งวัน)'), sc && sc.yields, 'us2y', 'bp'), rowM(XL('Dollar index (full day)', 'ดัชนีดอลลาร์ (ทั้งวัน)'), sc && sc.dollar, 'dollar', 'pct')];
  for (const s of ['BTC', 'ETH']) {
    const im = ev.pre && ev.pre.implied && ev.pre.implied[s], h1 = P.h1 && P.h1[s], d1 = P.d1 && P.d1[s], te = P.to_expiry && P.to_expiry[s], p1 = evPast(ev.type, s, 'h1', ev.at), pd = evPast(ev.type, s, 'd1', ev.at), exp = sc ? (s === 'BTC' ? sc.btc : sc.eth) : null;
    const usual = (p) => (p.n >= EVC.R.MIN_PAST_N ? `±${p.avg.toFixed(2)}% <small class="mut">${esc(XL(`usual, n=${p.n}`, `ปกติ, n=${p.n}`))}</small>` : evNA());
    const v = EVC.verdict({ d1: d1 ? d1.pct : null, toExp: te ? te.pct : null, implied: im, past: pd });
    rows.push(`<tr class="evsep"><td><b>${s}</b> ${esc(XL('1h after', '1 ชม. หลัง'))}</td><td>${usual(p1)}${exp ? ' ' + evDirChip(exp) : ''}</td><td>${mv(h1)}</td><td data-evres="${s}-h1">${exp && h1 ? dres(h1.pct, EVC.R.FLAT.h1, exp) : '<span class="mut">–</span>'}</td></tr>`,
      `<tr><td><b>${s}</b> ${esc(XL('1 day after', '1 วันหลัง'))}</td><td>${usual(pd)}</td><td>${mv(d1)}</td><td data-evres="${s}-d1">${exp && d1 ? dres(d1.pct, EVC.R.FLAT.d1, exp) : '<span class="mut">–</span>'}</td></tr>`,
      `<tr><td><b>${s}</b> ${esc(XL('to the option expiry', 'ถึงวันหมดอายุ options'))}</td><td>${im ? `±${im.pct.toFixed(2)}% <small class="mut">${esc(im.method === 'straddle' ? 'ATM straddle' : XL('30-day vol, 1σ', 'vol 30 วัน, 1σ'))}</small>` : evNA()}</td><td>${im && im.method === 'straddle' ? mv(te) : '<span class="mut">–</span>'}</td><td><span class="evpill ${v.key}" data-evpill="${s}">${esc({ surprise: T('vSurprise'), priced: T('vPriced'), nodata: T('vNodata'), nohist: T('vNohist') }[v.key])}</span></td></tr>`);
  }
  // fixed-rule summary
  const b1 = P.d1 && P.d1.BTC, bv = EVC.verdict({ d1: b1 ? b1.pct : null, toExp: P.to_expiry && P.to_expiry.BTC ? P.to_expiry.BTC.pct : null, implied: ev.pre && ev.pre.implied && ev.pre.implied.BTC, past: evPast(ev.type, 'BTC', 'd1', ev.at) });
  const metric = cs ? (LANG === 'th' && cs.th_metric) || cs.metric : ev.type.toUpperCase();
  const s1 = !ac ? XL('The official print is not entered yet.', 'ยังไม่ได้ใส่ตัวเลขทางการ') : !cs ? XL(`The print was ${ac.value}${ac.unit || ''}; no consensus was recorded.`, `ตัวเลขออกมา ${ac.value}${ac.unit || ''} แต่ไม่ได้บันทึกตัวเลขคาดไว้`)
    : XL(`${metric} came in at ${ac.value}${ac.unit || ''} vs ${cs.value}${cs.unit || ''} expected: ${pvL}.${evAlso(ev).map((x) => ` ${x.name}: ${x.a} vs ${x.c == null ? 'n/a' : x.c}.`).join('')}${sc ? ` That is the "${sc.label}" scenario.` : ''}`, `${metric} ออกมา ${ac.value}${ac.unit || ''} (ตลาดคาด ${cs.value}${cs.unit || ''}) ${pvL}${evAlso(ev).map((x) => ` · ${x.name} ${x.a} (ตลาดคาด ${x.c == null ? '–' : x.c})`).join('')}${sc ? ` ตรงกับฉาก "${sc.th_label || sc.label}"` : ''}`);
  // priced-in sentence uses exactly the move and reference behind the badge (EVC.verdict): release -> option expiry for a straddle, else the 1-day move
  const vk = { surprise: XL('a surprise', 'เซอร์ไพรส์'), priced: XL('priced in', 'price in ไปแล้ว') }[bv.key], exT = bv.basis === 'straddle' ? evT(ev.pre.implied.BTC.expiry) : '';
  const sP = !vk ? (b1 ? '' : XL('BTC 1-day move not measured yet.', 'ยังไม่ครบ 1 วัน เลยยังวัดการขยับของ BTC ไม่ได้')) : bv.basis === 'straddle' ? XL(`From the release to the ${exT} option expiry BTC moved ${pct(bv.move)} vs ±${bv.ref.toFixed(2)}% priced by the ATM straddle: ${vk}.`, `จากตอนประกาศถึงวันหมดอายุ options ${exT} BTC ขยับ ${pct(bv.move)} เทียบกับ ±${bv.ref.toFixed(2)}% ที่ ATM straddle ตั้งราคาไว้ ถือว่า ${vk}`)
    : XL(`BTC moved ${pct(bv.move)} in 1 day vs ±${bv.ref.toFixed(2)}%: ${vk}.`, `BTC ขยับ ${pct(bv.move)} ใน 1 วัน เทียบกับ ±${bv.ref.toFixed(2)}% ถือว่า ${vk}`);
  const sV = !b1 || !ev.view || !ev.view.locked_at ? '' : XL(`View, 1 day after: BTC ${pct(b1.pct)}${r.wrong === true ? ', our view was proven wrong.' : r.d1 === true ? ', our view matched.' : r.d1 === false ? ', our view missed the direction.' : r.flat && r.flat.d1 ? `, under ±${EVC.R.FLAT.d1.toFixed(2)}%, so flat: no call.` : '.'}`, `มุมมองหลัง 1 วัน: BTC ${pct(b1.pct)}${r.wrong === true ? ' มุมมองของเราผิด' : r.d1 === true ? ' มุมมองของเราถูกทาง' : r.d1 === false ? ' มุมมองของเราทิศทางพลาด' : r.flat && r.flat.d1 ? ` ไม่ถึง ±${EVC.R.FLAT.d1.toFixed(2)}% ถือว่า flat ไม่นับคะแนน` : ''}`);
  return `<section class="card evcard" data-evcmp><h2>${esc(XL('Forecast vs what happened', 'คาดการณ์ vs เกิดจริง'))}</h2><p class="evsum" data-evsum data-evsumv="${esc(vk ? bv.key : '')}" data-evsummove="${vk ? esc(pct(bv.move)) : ''}">${esc(s1)} ${esc(sP)} ${esc(sV)}</p>
    <div class="tscroll"><table class="evtbl evcmp"><thead><tr><th></th><th>${esc(XL('Expected', 'คาดไว้'))}</th><th>${esc(XL('Actual', 'เกิดจริง'))}</th><th>${esc(XL('Result', 'ผล'))}</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
    <p class="sub">${esc(evFlatRule())}</p><p class="sub">${esc(XL('Summary written by fixed rules from the numbers above. "Usual" = average size of the move after past releases of this type. Arrows are our explanation, not measured.', 'สรุปด้วยกฎตายตัวจากตัวเลขด้านบน "ปกติ" = ขนาดการขยับเฉลี่ยหลังประกาศแบบเดียวกันในอดีต ลูกศรคือคำอธิบายของเรา ไม่ได้วัด'))}</p></section>`;
}
async function pEvents(soft) {
  const m = $('#main'); if (!soft || !$('#evPg')) m.innerHTML = `<div class="page" id="evPg">${pageHead(T('events'), `<span class="sub">${esc(T('evLocal'))} · ${esc(tzL())}</span>`)}<div class="sk" style="height:220px;margin-top:12px"></div></div>`;
  await evLoadIdx(); if (S.route !== 'events') return; renderShell();
  if (EV.err || !EV.idx) { m.innerHTML = `<div class="page" id="evPg">${pageHead(T('events'))}<p class="err">${esc(T('evLoadErr'))}: ${esc(EV.err || '')}</p><button class="btn" data-evretry>${esc(T('retry'))}</button></div>`; return; }
  const id = evPick(); if (!id) { m.innerHTML = `<div class="page" id="evPg">${pageHead(T('events'))}<p class="mut">${esc(T('evNone'))}</p></div>`; return; }
  const ev = await evLoad(id); if (S.route !== 'events') return;
  const now = Date.now(), recent = evList().filter((e) => Date.parse(e.at) <= now).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);
  const inp = ev.kind === 'scheduled' && !(ev.view && ev.view.locked_at) && evStatus(ev, now) === 'upcoming' ? await evInp(id) : null;
  await Promise.all(recent.map((e) => evLoad(e.id))); if (S.route !== 'events') return; // list chips need the verdicts of recent events
  if (ev.err) { m.innerHTML = `<div class="page evpg" id="evPg">${pageHead(T('events'))}${evListHtml(id, now)}<p class="err">${esc(T('evLoadErr'))}: ${esc(ev.err)}</p></div>`; return; }
  const st = evStatus(ev, now), stL = { upcoming: T('evUpcoming'), released: T('evReleased'), breaking: T('evBreaking') }[st];
  const head = `<section class="card evcard evhead"><div class="evh"><span class="t">${esc(evTitle(ev))}</span><span class="sub">${esc(ev.time_known === false ? evDay(ev.at) + ' · ' + XL('time not announced', 'ยังไม่ประกาศเวลา') : evT(ev.at))}${ev.source && ev.source.url ? ' · ' + XL('source', 'แหล่ง') + ': ' + evSrc({ url: ev.source.url, src: ev.source.name }) : ''}</span><span class="evst ${st}">${esc(stL)}</span>${ev.qualifies === false ? `<span class="evtag late" data-evnq>${esc(XL('Does not qualify: the move was not unusual enough under the current gate', 'ไม่ผ่านเกณฑ์ข่าวด่วน: ราคาขยับไม่แรงพอตามเกณฑ์ปัจจุบัน'))}</span>` : ''}${st === 'upcoming' ? `<span class="evcd num" data-evcd="${esc(ev.at)}">${esc(evCountdown(ev.at))}</span>` : ''}</div>
    ${evGateLine(ev)}
    ${evTokUnclear(ev)}${ev.kind === 'breaking' && ev.candidates && ev.candidates.length ? `<div class="evcands"><b>${esc(ev.unclear || EVC.tokenUnclear(ev.candidates[0].gate) ? XL('Cause unclear. Top candidate headlines:', 'ยังไม่ชัดว่าเพราะข่าวไหน ข่าวที่เข้าข่าย:') : XL('Headline out just before an unusual BTC/ETH move. It may be the cause; not confirmed.', 'ข่าวนี้ออกก่อนราคา BTC/ETH ขยับแรงผิดปกติ อาจเป็นต้นเหตุ แต่ยังไม่ยืนยัน'))}</b>${ev.candidates.map((c) => `<div class="ixkv"><span>${evSrc({ url: c.url, src: (LANG === 'th' && c.th_title) || c.title })}</span><small class="mut">${esc(c.src || '')} · ${esc(evT(c.at, false))}</small></div>`).join('')}</div>` : ''}</section>`;
  const ch = evChainHtml(ev);
  const sch = ev.kind === 'scheduled', pre = evPre(id), rel = st !== 'upcoming';
  const top = !sch ? evPricedHtml(ev) : rel ? evCompareHtml(ev) + evPricedHtml(ev) + (pre ? evNowHtml(ev, pre) : '') : evForecastHtml(ev, inp) + evNowHtml(ev, pre);
  m.innerHTML = `<div class="page evpg" id="evPg">${pageHead(T('events'), `<span class="sub">${esc(T('evLocal'))} · ${esc(tzL())}</span>`)}<div class="evlayout">${evListHtml(id, now)}<div class="evmain">${head}${top}${ch.html}<div class="evtwo">${sch ? (rel ? evForecastHtml(ev, null) : '') : evViewHtml(ev)}${evReplayHtml(ev)}</div></div></div><div class="foot">${esc(T('nfa'))}</div></div>`;
  if (EV.jump && innerWidth < 900) { EV.jump = false; const h = $('.evhead'); if (h) h.scrollIntoView({ block: 'start' }); } // phone: the list sits above, so jump to the tapped event
  const anim = !EV.drawn[id]; EV.drawn[id] = 1; requestAnimationFrame(() => evDraw(ev, anim));
}
addEventListener('resize', () => { if (S.route === 'events') { const id = evPick(); if (id && EV.files[id]) evDraw(EV.files[id], false); } }, { passive: true });
document.addEventListener('click', (e) => {
  if (S.route !== 'events' && !e.target.closest('[data-evbtc]')) return;
  let el;
  if ((el = e.target.closest('[data-evnode]'))) { const k = el.dataset.evnode; EV.node = EV.node === k ? null : k; pEvents(true); return; }
  if (e.target.closest('[data-evclose]')) { EV.node = null; pEvents(true); return; }
  if ((el = e.target.closest('[data-evasset]'))) { EV.asset = el.dataset.evasset; pEvents(true); return; }
  if (e.target.closest('[data-evfull]')) { EV.full = !EV.full; pEvents(true); return; }
  if (e.target.closest('[data-evretry]')) { EV.idx = null; pEvents(); return; }
  if (e.target.closest('[data-evbtc]')) { S.sel = 'BTC'; try { localStorage.setItem('cw-sel', 'BTC'); } catch (er) { /* private mode */ } }
});
addEventListener('hashchange', () => { if (S.route === 'events') { EV.node = null; EV.jump = /^#\/events\/./.test(location.hash); } });
const _evRender = render;
render = function (soft) {
  if (S.route === 'events') { renderShell(); killCharts(); pEvents(soft); return; }
  _evRender(soft);
};
evLoadIdx().then(() => { renderShell(); if (S.route === 'markets') evUpNext(); });
