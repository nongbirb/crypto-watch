/* Events v1: one page per market-moving event (docs/events-v1.md). Data: data/events/*.json built by scripts/build_events.mjs.
   Every number shows its source link and data time; missing data says "unavailable", never 0. No buy/sell calls. */
Object.assign(I18N.en, {
  events: 'Events', evNew: 'NEW', evLocal: 'Times shown in your local time', evUpcoming: 'Upcoming', evReleased: 'Released', evBreaking: 'Breaking', evPast: 'Past',
  evPriced: 'Already priced in?', evExpected: 'Expected', evActual: 'Actual', evBefore: 'Move before (24h)', evImplied: 'Options expected (1 day)', evAfter: 'Move after', evPos: 'Positioning',
  evChain: 'How it spread', evTap: 'tap any box', evView: 'Our view', evReplay: 'Replay & record', evUnavail: 'unavailable', evWait: 'waiting for release', evWaitData: 'waiting for data', evLate: 'late', evStale: 'stale',
  evEvidence: 'evidence only', evNoFc: 'unscheduled, no forecast', evShowFull: 'Show full chain', evHideFull: 'Show short chain', evUpNext: 'Up next', evOpen: 'Open event', evSeeChain: 'See chain',
  evMine: 'My tokens', evLegendBlue: 'blue box = measured reaction', evLegendDot: 'dotted line = our explanation (not measured)', evSel: 'Selected',
  evDir: 'Direction', evSize: 'Size', evStr: 'Strength', evConf: 'Confidence', evWhy: 'Why', evWrongIf: 'Proven wrong if', evSrc: 'Source', evTime: 'Data time',
  evNone: 'No events yet.', evLoadErr: 'Could not load events', evNotScored: 'not scored yet', evMatched: 'Direction matched', evMissed: 'Direction missed', evFlatX: 'too small to score',
  evWrongLvl: 'Proven-wrong level', evHit: 'Hit', evNotHit: 'Not hit', evScorecard: 'Scorecard', evPastSame: 'Past events of this type',
  vSurprise: 'SURPRISE', vPriced: 'PRICED IN', vNodata: 'NOT ENOUGH DATA', vNohist: 'NOT ENOUGH HISTORY',
  up: 'Up', down: 'Down', flat: 'Flat', weak: 'Weak', medium: 'Medium', strong: 'Strong', low: 'Low', high: 'High'
});
Object.assign(I18N.th, {
  events: 'อีเวนต์', evNew: 'ใหม่', evLocal: 'เวลาที่แสดงเป็นเวลาตามเครื่องคุณ', evUpcoming: 'กำลังจะมา', evReleased: 'ประกาศแล้ว', evBreaking: 'ข่าวด่วน', evPast: 'ที่ผ่านมา',
  evPriced: 'ตลาด price in ไปแล้วหรือยัง', evExpected: 'ตลาดคาด', evActual: 'ออกจริง', evBefore: 'ขยับก่อนประกาศ (24 ชม.)', evImplied: 'Options คาดว่าจะเหวี่ยง (1 วัน)', evAfter: 'ขยับหลังประกาศ', evPos: 'Positioning',
  evChain: 'แรงส่งต่อไปไหนบ้าง', evTap: 'แตะกล่องเพื่อดูรายละเอียด', evView: 'มุมมองของเรา', evReplay: 'ย้อนดูผล', evUnavail: 'ไม่มีข้อมูล', evWait: 'รอประกาศ', evWaitData: 'รอข้อมูล', evLate: 'ข้อมูลช้า', evStale: 'ข้อมูลเก่า',
  evEvidence: 'ไว้ประกอบเท่านั้น', evNoFc: 'ข่าวนอกตาราง ไม่มีตัวเลขคาดการณ์', evShowFull: 'ดูทั้งเส้นทาง', evHideFull: 'ย่อเส้นทาง', evUpNext: 'อีเวนต์ถัดไป', evOpen: 'เปิดดู', evSeeChain: 'ดูแรงส่งต่อ',
  evMine: 'เหรียญของฉัน', evLegendBlue: 'กรอบสีฟ้า = วัดจากราคาจริง', evLegendDot: 'เส้นประ = คำอธิบายของเรา (ไม่ได้วัด)', evSel: 'ที่เลือก',
  evDir: 'ทิศทาง', evSize: 'ขยับเท่าไร', evStr: 'แรงแค่ไหน', evConf: 'มั่นใจแค่ไหน', evWhy: 'ทำไม', evWrongIf: 'ผิดถ้า', evSrc: 'แหล่งข้อมูล', evTime: 'เวลาข้อมูล',
  evNone: 'ยังไม่มีอีเวนต์', evLoadErr: 'โหลดข้อมูลอีเวนต์ไม่สำเร็จ', evNotScored: 'ยังไม่ได้ให้คะแนน', evMatched: 'ทิศทางตรง', evMissed: 'ทิศทางพลาด', evFlatX: 'ขยับน้อยไป ยังให้คะแนนไม่ได้',
  evWrongLvl: 'จุดที่ถือว่ามุมมองผิด', evHit: 'โดนแล้ว', evNotHit: 'ยังไม่โดน', evScorecard: 'สถิติความแม่น', evPastSame: 'อีเวนต์แบบเดียวกันที่ผ่านมา',
  vSurprise: 'เซอร์ไพรส์', vPriced: 'PRICED IN', vNodata: 'ข้อมูลยังไม่พอ', vNohist: 'ประวัติยังไม่พอ',
  up: 'ขึ้น', down: 'ลง', flat: 'ทรง ๆ', weak: 'เบา', medium: 'กลาง ๆ', strong: 'แรง', low: 'ต่ำ', high: 'สูง'
});
ICONS.events = '<path d="M4 17l4.5-5 3.5 3 4-6 4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="9" r="1.6" fill="currentColor"/>';
if (!ROUTES.includes('events')) { ROUTES.splice(1, 0, 'events'); NAV.splice(NAV.indexOf('markets') + 1, 0, 'events'); }
// app.js boot parsed the hash before this file loaded; claim a deep link to #/events here.
if (/^#\/events(\/|$)/.test(location.hash)) S.route = 'events';
const EV = { idx: null, files: {}, hist: null, err: null, node: null, asset: 'BTC', full: false, drawn: {}, busy: false };
const evNum = (v) => typeof v === 'number' && Number.isFinite(v);
const evPct = (v, d = 2) => (evNum(v) ? pct(v, d) : null);
const evNA = () => `<span class="mut">${esc(T('evUnavail'))}</span>`;
const evT = (t, withDate = true) => { const d = new Date(t); if (isNaN(d)) return ''; return (withDate ? d.toLocaleDateString(loc(), { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' : '') + d.toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' }) + ' ' + tzL(d); };
const evDay = (t) => new Date(t).toLocaleDateString(loc(), { weekday: 'short', month: 'short', day: 'numeric' });
const evSrc = (o, label) => (o && /^https:\/\//.test(o.url || '') ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(label || o.src || 'source')} ↗</a>` : '');
const evTitle = (e) => (LANG === 'th' && e.th_title) || e.title;
const evStatus = (e, now = Date.now()) => EVC.status(e, now);
async function evLoadIdx(force) {
  if (EV.idx && !force) return EV.idx;
  try { EV.idx = await getJSON('data/events/index.json?ts=' + Date.now()); EV.err = null; } catch (e) { EV.err = e.message; }
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
  const ref = im ? im.pct / Math.sqrt(24) : past.n >= EVC.R.MIN_PAST_N ? past.avg : null; // 1h share of the 1-day implied move (sqrt-time), else past average 1h move
  const stren = EVC.strength('crypto', h1.pct, ref);
  return { k: s, name: s, st: 'ok', v: h1.pct, unit: 'pct', h1, crypto: true, measured: true, exp: sc ? sc.btc : null, stren, conf: EVC.confidence({ v: h1.pct, measured: true, breaking: ev.kind === 'breaking', strength: stren }) };
}
function evFmt(n) { if (!evNum(n.v)) return ''; const a = n.v > 0 ? '▲' : n.v < 0 ? '▼' : '•'; return `<span class="m num ${cls(n.v)}">${a} ${n.unit === 'bp' ? (n.v > 0 ? '+' : n.v < 0 ? '−' : '') + Math.abs(n.v).toFixed(1) + ' bp' : pct(n.v, 2)}${n.crypto ? ' (1h)' : ''}</span>`; }
function evNodeHtml(n, ev) {
  const sel = EV.node === n.k ? ' sel' : '', meas = n.measured ? ' meas' : '';
  let foot;
  if (n.st === 'ok') foot = n.crypto ? `${XL('measured', 'วัด ณ')} ${evT(n.h1.measured_at, false)}` : `${n.D0.weekly ? XL('weekly change', 'เปลี่ยนรายสัปดาห์') : XL('full-day change', 'เปลี่ยนทั้งวัน')} · ${n.m.after.d}`;
  else foot = `<span class="evtag ${n.st}">${esc(n.st === 'wait' ? T('evWait') : n.st === 'waitdata' ? T('evWaitData') : n.st === 'late' ? T('evLate') : T('evUnavail'))}</span>`;
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
    <div class="ixsec"><h4>${esc(T('evSrc'))}</h4><p class="sm">${src || evNA()}${time ? `<br><span class="mut">${esc(T('evTime'))}: ${esc(time)}</span>` : ''}${n.m && n.m.reason ? `<br><span class="mut">${esc(n.m.reason)}</span>` : ''}</p></div>`;
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
  const d1 = ev.post && ev.post.d1 && ev.post.d1[s], im = ev.pre && ev.pre.implied && ev.pre.implied[s], past = evPast(ev.type, s, 'd1', ev.at);
  const v = EVC.verdict(d1 ? d1.pct : null, im ? im.pct : null, past);
  const lab = { surprise: T('vSurprise'), priced: T('vPriced'), nodata: T('vNodata'), nohist: T('vNohist') }[v.key];
  let why;
  if (v.key === 'nodata') why = !d1 ? XL('The 1-day move is not measured yet.', 'ยังไม่ครบ 1 วัน เลยยังวัดไม่ได้') : XL('No options-implied move and no past events to compare with.', 'ไม่มีตัวเลข options และไม่มีอีเวนต์เก่าให้เทียบ');
  else if (v.key === 'nohist') why = XL(`No options market. Only ${v.n} past events of this type (need ${EVC.R.MIN_PAST_N}).`, `ไม่มีตลาด options และมีอีเวนต์แบบนี้แค่ ${v.n} ครั้ง (ต้องมีอย่างน้อย ${EVC.R.MIN_PAST_N})`);
  else if (v.basis === 'options') why = XL(`The 1-day move (${pct(d1.pct)}) was ${v.key === 'surprise' ? 'bigger' : 'smaller'} than options expected (±${v.ref.toFixed(2)}%).`, `ผ่านไป 1 วัน ${s} ขยับ ${pct(d1.pct)} ${v.key === 'surprise' ? 'มากกว่า' : 'น้อยกว่า'}ที่ options คาดไว้ (±${v.ref.toFixed(2)}%)`);
  else why = XL(`The 1-day move (${pct(d1.pct)}) vs past average ±${v.ref.toFixed(2)}% (n=${v.n}).`, `ผ่านไป 1 วัน ${s} ขยับ ${pct(d1.pct)} เทียบค่าเฉลี่ยในอดีต ±${v.ref.toFixed(2)}% (n=${v.n})`);
  return `<div class="evverdict"><span class="evpill ${v.key}">${esc(lab)}</span><span>${esc(why)}</span></div>`;
}
function evPricedHtml(ev) {
  const s = EV.asset, up = evStatus(ev) === 'upcoming', brk = ev.kind === 'breaking';
  const cell = (l, v, sub, c = '') => `<div class="evcell"><div class="l">${esc(l)}</div><div class="v num ${c}">${v}</div><div class="s">${sub || ''}</div></div>`;
  const cs = ev.consensus, ac = ev.actual, b24 = ev.post && ev.post.before24h && ev.post.before24h[s], im = ev.pre && ev.pre.implied && ev.pre.implied[s];
  const h1 = ev.post && ev.post.h1 && ev.post.h1[s], d1 = ev.post && ev.post.d1 && ev.post.d1[s], P = (ev.pos || {})[s] || {};
  const exp = brk ? cell(T('evExpected'), `<span class="mut sm">${esc(T('evNoFc'))}</span>`, '') : cs ? cell(T('evExpected'), esc(cs.value + (cs.unit || '')), `${esc(LANG === 'th' && cs.th_metric ? cs.th_metric : cs.metric || '')} · ${evSrc({ url: cs.url, src: XL('forecast', 'ตัวเลขคาด') })}${cs.locked_at ? ` · 🔒 ${esc(evT(cs.locked_at, false))}` : ''}`) : cell(T('evExpected'), evNA(), up ? esc(XL('entered before the release', 'จะใส่ก่อนประกาศ')) : '');
  const act = brk ? cell(T('evActual'), `<span class="sm">${esc(T('evBreaking'))}</span>`, evSrc({ url: ev.source && ev.source.url, src: ev.source && ev.source.name })) : ac && evNum(ac.value) ? cell(T('evActual'), esc(ac.value + (ac.unit || '')), evSrc({ url: ac.url, src: XL('official release', 'ประกาศทางการ') }), cs && ac.value > cs.value ? 'dn' : cs && ac.value < cs.value ? 'up' : '') : cell(T('evActual'), `<span class="mut sm">${esc(up ? T('evWait') : T('evUnavail'))}</span>`, '');
  const pre = brk ? (ev.pre_move && ev.pre_move[s]) : b24;
  const bef = cell(brk ? XL('Move before (1h)', 'ขยับก่อนข่าว (1 ชม.)') : T('evBefore'), pre ? pct(pre.pct) : `<span class="mut sm">${esc(up ? T('evWait') : T('evUnavail'))}</span>`, pre ? `${esc(brk ? XL('moved before the headline (leak or other news)', 'ขยับก่อนข่าวออก (อาจรั่ว หรือมีข่าวอื่น)') : T('evEvidence'))} · ${evSrc({ url: pre.to.url, src: pre.from.src })}` : '', pre ? cls(pre.pct) : '');
  const imp = cell(T('evImplied'), im ? '±' + im.pct.toFixed(2) + '%' : evNA(), im ? `${evSrc({ url: im.url, src: im.method === 'dvol30' ? XL('Deribit DVOL 30d (fallback)', 'Deribit DVOL 30 วัน (สำรอง)') : XL('Deribit ATM IV', 'Deribit ATM IV') })} · ${XL('snapshot', 'ณ')} ${esc(evT(im.at, false))}` : esc(s === 'BTC' || s === 'ETH' ? (up ? XL('snapshot taken just before the release', 'จะเก็บก่อนประกาศ') : '') : XL('no options market', 'ไม่มีตลาด options')));
  const aft = cell(T('evAfter'), h1 ? `${pct(h1.pct)} <small class="mut">1h</small>` : d1 ? '' : `<span class="mut sm">${esc(up ? T('evWait') : T('evWaitData'))}</span>`, `${h1 ? esc(XL('measured', 'วัด ณ') + ' ' + evT(h1.measured_at, false)) : ''}${d1 ? `<br><span class="num ${cls(d1.pct)}">${pct(d1.pct)}</span> ${esc(XL('after 1 day', 'หลัง 1 วัน'))} · ${esc(evT(d1.measured_at, false))}` : ''}${h1 || d1 ? ' · ' + evSrc({ url: (h1 || d1).to.url, src: (h1 || d1).from.src }) : ''}`, h1 ? cls(h1.pct) : '');
  const fu = P.funding, oi = P.oi, cot = P.cot;
  const pos = cell(T('evPos'), fu ? `<span class="sm">${esc(XL('Funding', 'Funding'))} ${fu.pct8h > 0 ? '+' : ''}${fu.pct8h.toFixed(4)}%</span>` : evNA(),
    [fu ? `${evSrc({ url: fu.url, src: 'Bybit' })} · ${esc(evT(fu.at, false))}` : '', oi ? `OI ${oi.coins.toLocaleString(loc(), { maximumFractionDigits: 0 })} ${esc(s)} · ${esc(evT(oi.at, false))}` : '', cot ? `${evSrc({ url: cot.url, src: 'CFTC COT' })} ${XL('lev. funds net', 'กองทุนเลเวอเรจ net')} ${cot.lev_net.toLocaleString(loc())} · ${XL('as of', 'ข้อมูล')} ${esc(cot.report_date)}` : ''].filter(Boolean).join('<br>') || esc(up ? XL('snapshot 5 min before the release', 'เก็บ 5 นาทีก่อนประกาศ') : ''));
  const seg = `<div class="seg sm">${['BTC', 'ETH'].map((x) => `<button data-evasset="${x}" aria-pressed="${s === x}">${x}</button>`).join('')}</div>`;
  return `<section class="card evcard"><h2>${esc(T('evPriced'))} ${seg}</h2><div class="evpi">${exp}${act}${bef}${imp}${aft}${pos}</div>${brk ? '' : evVerdictLine(ev, s)}${cs && cs.note ? `<p class="sub">${esc(LANG === 'th' && cs.th_note ? cs.th_note : cs.note)}</p>` : ''}</section>`;
}
function evViewHtml(ev) {
  const v = ev.view, up = evStatus(ev) === 'upcoming', sc = evScen(ev), d = (k) => k ? `<span class="${k === 'up' ? 'up' : k === 'down' ? 'dn' : ''}">${esc(T(k))}</span>` : '–';
  const btc = tokBySym('BTC'), bias = btc && btc.I && btc.I.plan ? btc.I.plan.bias : null;
  const dec = `<div class="blk"><b>${esc(XL('Decision link', 'เชื่อมกับมุมมองเทคนิค'))}</b>${esc(XL('Current BTC technical verdict on Markets:', 'มุมมองเทคนิค BTC ตอนนี้ในหน้า Markets:'))} <a href="#/markets" data-evbtc>${bias ? vd(bias) : esc(T('evUnavail'))}</a>. ${esc(XL('No buy or sell calls.', 'ไม่ใช่สัญญาณซื้อขาย'))}</div>`;
  if (!v || !v.locked_at) return `<section class="card evcard"><h2>${esc(T('evView'))}</h2><p class="mut">${esc(ev.kind === 'breaking' ? XL('No view written for this headline yet.', 'ยังไม่ได้เขียนมุมมองสำหรับข่าวนี้') : up ? XL('Our view will be locked before the release. Nothing is shown until then.', 'มุมมองจะถูกล็อกก่อนประกาศ ก่อนหน้านั้นยังไม่แสดง') : XL('No view was locked before this release, so there is nothing to score.', 'รอบนี้ไม่ได้ล็อกมุมมองไว้ก่อนประกาศ เลยไม่มีอะไรให้คะแนน'))}</p>${dec}</section>`;
  const L2 = (o, k) => (LANG === 'th' && o['th_' + k]) || o[k];
  return `<section class="card evcard"><h2>${esc(T('evView'))} <span class="evlock">🔒 ${esc(XL('Locked', 'ล็อก'))} ${esc(evT(v.locked_at))}</span>${v.after_news ? `<span class="evtag late">${esc(XL('written after the news', 'เขียนหลังข่าวออก'))}</span>` : ''}</h2>
    ${v.after_news ? `<p class="sub">${esc(XL('Written after the headline, so it never counts as a prediction. Scored 1 day after it was locked.', 'เขียนหลังข่าวออก จึงไม่นับเป็นการทำนาย ให้คะแนนหลังล็อก 1 วัน'))}</p>` : ''}
    <div class="tscroll"><table class="evtbl"><thead><tr><th>${esc(XL('Scenario', 'ฉาก'))}</th><th>${esc(v.metric || '')}</th><th>${esc(XL('Yields', 'ยีลด์'))}</th><th>${esc(XL('Dollar', 'ดอลลาร์'))}</th><th>BTC</th></tr></thead><tbody>
    ${(v.scenarios || []).map((x) => `<tr class="${sc && sc.key === x.key ? 'hit' : ''}"><td><b>${esc(L2(x, 'label'))}</b>${sc && sc.key === x.key ? ` ← ${esc(XL('happened', 'เกิดจริง'))}` : ''}</td><td class="num">${esc(x.range || '')}</td><td>${d(x.yields)}</td><td>${d(x.dollar)}</td><td>${d(x.btc)}</td></tr>`).join('')}</tbody></table></div>
    <div class="blk"><b>${esc(XL('Opposite case', 'มุมกลับ'))}</b>${esc(L2(v, 'opposite') || '')}</div><div class="blk"><b>${esc(T('evWrongIf'))}</b>${esc(L2(v, 'invalidation') || '')}</div>${dec}</section>`;
}
function evReplayHtml(ev) {
  const post = ev.kind === 'breaking' ? { d1: ev.post && ev.post.lock_d1 } : ev.post, r = EVC.scoreView(ev.view, ev.actual && ev.actual.value, post);
  const mk = (x) => (x === true ? `<b class="up">✓ ${esc(T('evMatched'))}</b>` : x === false ? `<b class="dn">✗ ${esc(T('evMissed'))}</b>` : `<span class="mut">${esc(T('evNotScored'))}</span>`);
  const kv = (l, v) => `<div class="ixkv"><span>${esc(l)}</span>${v}</div>`;
  const p1 = evPast(ev.type, 'BTC', 'h1', ev.at); const hasV = ev.view && ev.view.locked_at;
  const scored = evList().filter((e) => e.view && e.scored).length;
  return `<section class="card evcard"><h2>${esc(T('evReplay'))}</h2>
    ${hasV ? (ev.kind === 'breaking' ? '' : kv(XL('1 hour after', '1 ชม. หลังประกาศ'), mk(r.h1))) + kv(XL('1 day after', '1 วันหลังประกาศ'), mk(r.d1)) + kv(T('evWrongLvl'), r.wrong == null ? `<span class="mut">${esc(T('evNotScored'))}</span>` : `<b class="${r.wrong ? 'dn' : ''}">${esc(r.wrong ? T('evHit') : T('evNotHit'))}</b>`) : `<p class="mut sm">${esc(XL('No locked view, nothing to score.', 'ไม่มีมุมมองที่ล็อกไว้ เลยไม่มีคะแนน'))}</p>`}
    <div class="blk"><b>${esc(T('evPastSame'))}</b>${ev.kind === 'breaking' || ev.type === 'unlock' ? esc(XL('Not tracked for this type yet.', 'ยังไม่ได้เก็บสถิติประเภทนี้')) : p1.n ? esc(XL(`BTC's average 1-hour move size: ${p1.avg.toFixed(2)}% (based on ${p1.n} events, real candles)`, `BTC ขยับเฉลี่ยใน 1 ชม.: ${p1.avg.toFixed(2)}% (จาก ${p1.n} ครั้ง ราคาจริง)`)) : esc(XL('No past events measured yet.', 'ยังไม่มีอีเวนต์เก่าที่วัดไว้'))}</div>
    <div class="blk"><b>${esc(T('evScorecard'))}</b><span class="mut">${esc(scored >= EVC.R.SCORECARD_MIN ? '' : XL(`Shows after ${EVC.R.SCORECARD_MIN} scored events · ${scored} of ${EVC.R.SCORECARD_MIN} so far`, `จะแสดงเมื่อให้คะแนนครบ ${EVC.R.SCORECARD_MIN} อีเวนต์ · ตอนนี้ ${scored} จาก ${EVC.R.SCORECARD_MIN}`))}</span>${scored >= EVC.R.SCORECARD_MIN ? evScorecard() : ''}</div></section>`;
}
function evGateLine(ev) {
  const g = ev.kind === 'breaking' && ev.gate_check && (ev.gate_check.results || []).find((x) => x.pass) || (ev.gate_check && (ev.gate_check.results || [])[0]); if (!g || !g.m || !g.u) return '';
  const row = (a) => { const m = g.m[a], u = g.u[a]; if (!evNum(m) || !u || !evNum(u.avg)) return ''; const thr = Math.max(EVC.R.UNUSUAL_X * u.avg, evNum(u.p98) ? u.p98 : 0);
    return `${a.toUpperCase()} 1h ${pct(m)} ${XL('vs threshold', 'เทียบเกณฑ์')} ±${thr.toFixed(2)}% (${XL('stricter of', 'ใช้ค่าที่สูงกว่าระหว่าง')} ${EVC.R.UNUSUAL_X}× ${XL('mean', 'ค่าเฉลี่ย')} ${(EVC.R.UNUSUAL_X * u.avg).toFixed(2)}% / p${Math.round(EVC.R.UNUSUAL_PCTL * 100)} ${evNum(u.p98) ? u.p98.toFixed(2) + '%' : '–'}, ${XL('last 30 days', '30 วันล่าสุด')})`; };
  return `<div class="evcands" data-evgate><b>${esc(XL('Breaking-news gate', 'เกณฑ์ข่าวด่วน'))}</b>${['btc', 'eth'].map(row).filter(Boolean).join('<br>')}</div>`;
}
function evScorecard() { const s = evList().filter((e) => e.view && e.scored).map((e) => EV.files[e.id]).filter(Boolean).map((ev) => EVC.scoreView(ev.view, ev.actual && ev.actual.value, ev.kind === 'breaking' ? { d1: ev.post.lock_d1 } : ev.post)).filter((r) => r.d1 != null);
  return s.length ? `<span class="num">${s.filter((r) => r.d1).length} / ${s.length}</span> ${esc(XL('1-day direction matched', 'ทิศทาง 1 วันตรง'))}` : ''; }
async function pEvents(soft) {
  const m = $('#main'); if (!soft || !$('#evPg')) m.innerHTML = `<div class="page" id="evPg">${pageHead(T('events'), `<span class="sub">${esc(T('evLocal'))} · ${esc(tzL())}</span>`)}<div class="sk" style="height:220px;margin-top:12px"></div></div>`;
  await evLoadIdx(); if (S.route !== 'events') return; renderShell();
  if (EV.err || !EV.idx) { m.innerHTML = `<div class="page" id="evPg">${pageHead(T('events'))}<p class="err">${esc(T('evLoadErr'))}: ${esc(EV.err || '')}</p><button class="btn" data-evretry>${esc(T('retry'))}</button></div>`; return; }
  const id = evPick(); if (!id) { m.innerHTML = `<div class="page" id="evPg">${pageHead(T('events'))}<p class="mut">${esc(T('evNone'))}</p></div>`; return; }
  const ev = await evLoad(id); if (S.route !== 'events') return;
  const now = Date.now(), L = evList().slice().sort((a, b) => a.at.localeCompare(b.at)), up = L.filter((e) => Date.parse(e.at) > now), past = L.filter((e) => Date.parse(e.at) <= now).reverse();
  const chip = (e) => { const st = evStatus(e, now); return `<a class="chip np${e.id === id ? ' on' : ''}" href="#/events/${esc(e.id)}" aria-current="${e.id === id}">${st === 'upcoming' ? '' : `<small>${esc(st === 'breaking' ? T('evBreaking') : T('evPast'))}</small>`}${esc(evTitle(e))} · ${esc(e.time_known === false ? evDay(e.at) : evT(e.at))}${e.scored && e.view ? ' ✓' : ''}</a>`; };
  if (ev.err) { m.innerHTML = `<div class="page" id="evPg">${pageHead(T('events'))}<div class="filters evchips">${[...up, ...past].map(chip).join('')}</div><p class="err">${esc(T('evLoadErr'))}: ${esc(ev.err)}</p></div>`; return; }
  const st = evStatus(ev, now), stL = { upcoming: T('evUpcoming'), released: T('evReleased'), breaking: T('evBreaking') }[st];
  const head = `<section class="card evcard evhead"><div class="evh"><span class="t">${esc(evTitle(ev))}</span><span class="sub">${esc(ev.time_known === false ? evDay(ev.at) + ' · ' + XL('time not announced', 'ยังไม่ประกาศเวลา') : evT(ev.at))}${ev.source && ev.source.url ? ' · ' + XL('source', 'แหล่ง') + ': ' + evSrc({ url: ev.source.url, src: ev.source.name }) : ''}</span><span class="evst ${st}">${esc(stL)}</span>${ev.qualifies === false ? `<span class="evtag late" data-evnq>${esc(XL('Does not qualify: the move was not unusual enough under the current gate', 'ไม่ผ่านเกณฑ์ข่าวด่วน: ราคาขยับไม่แรงพอตามเกณฑ์ปัจจุบัน'))}</span>` : ''}${st === 'upcoming' ? `<span class="evcd num" data-evcd="${esc(ev.at)}">${esc(evCountdown(ev.at))}</span>` : ''}</div>
    ${evGateLine(ev)}
    ${ev.kind === 'breaking' && ev.candidates && ev.candidates.length ? `<div class="evcands"><b>${esc(ev.unclear ? XL('Cause unclear. Top candidate headlines:', 'ยังไม่ชัดว่าเพราะข่าวไหน ข่าวที่เข้าข่าย:') : XL('Headline out just before an unusual BTC/ETH move. It may be the cause; not confirmed.', 'ข่าวนี้ออกก่อนราคา BTC/ETH ขยับแรงผิดปกติ อาจเป็นต้นเหตุ แต่ยังไม่ยืนยัน'))}</b>${ev.candidates.map((c) => `<div class="ixkv"><span>${evSrc({ url: c.url, src: (LANG === 'th' && c.th_title) || c.title })}</span><small class="mut">${esc(c.src || '')} · ${esc(evT(c.at, false))}</small></div>`).join('')}</div>` : ''}</section>`;
  const ch = evChainHtml(ev);
  m.innerHTML = `<div class="page evpg" id="evPg">${pageHead(T('events'), `<span class="sub">${esc(T('evLocal'))} · ${esc(tzL())}</span>`)}<div class="filters evchips">${[...up, ...past].map(chip).join('')}</div>${head}${evPricedHtml(ev)}${ch.html}<div class="evtwo">${evViewHtml(ev)}${evReplayHtml(ev)}</div><div class="foot">${esc(T('nfa'))}</div></div>`;
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
addEventListener('hashchange', () => { if (S.route === 'events') EV.node = null; });
const _evRender = render;
render = function (soft) {
  if (S.route === 'events') { renderShell(); killCharts(); pEvents(soft); return; }
  _evRender(soft);
};
evLoadIdx().then(() => { renderShell(); if (S.route === 'markets') evUpNext(); });
