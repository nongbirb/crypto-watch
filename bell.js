/* v59 bell: a "What's new" popover in the phone header and the desktop side bar.
   It only reads data the app already has: the latest narrative.json edition, screener.json (the Screener's existing
   Momentum breakout preset, via scRows(PRESETS.momo)) and the calendar (S.cal). No new API, no push, no login:
   the last-opened time and the item keys already seen are kept in localStorage. Text is descriptive, never advice. */
Object.assign(I18N.en, { bell: "What's new", bellNews: 'Top news', bellMomo: 'Momentum breakout (Screener)', bellCal: 'Next 24 hours',
  bellNew: 'New', bellNa: 'Unavailable', bellUpd: 'updated', bellClose: 'Close', bellAllDay: 'all day', bellMore: (n) => `+${n} more in the calendar`,
  bellNoMomo: 'No token meets the Momentum breakout preset in the latest Screener data.', bellNoCal: 'No events in the next 24 hours.',
  bellMomoRule: 'Screener preset: price within 0.5% of (or above) its 120-day swing high, 24h volume at least 1.5× the 20-day average, RSI 55–75. A description, not a signal.',
  bellFoot: 'Summaries of the app’s own data. Times are in your time zone. Not financial advice.', bellHasNew: (n) => `${n} new`, bellLoad: 'Loading…' });
Object.assign(I18N.th, { bell: 'มีอะไรใหม่', bellNews: 'ข่าวเด่น', bellMomo: 'เหรียญเข้าเกณฑ์ Momentum breakout', bellCal: 'อีเวนต์ใน 24 ชม. ข้างหน้า',
  bellNew: 'ใหม่', bellNa: 'ไม่พร้อมใช้งาน', bellUpd: 'อัปเดต', bellClose: 'ปิด', bellAllDay: 'ทั้งวัน', bellMore: (n) => `ดูอีก ${n} รายการในปฏิทิน`,
  bellNoMomo: 'ข้อมูลสแกนล่าสุดยังไม่มีเหรียญเข้าเกณฑ์ Momentum breakout', bellNoCal: 'ไม่มีอีเวนต์ใน 24 ชม. ข้างหน้า',
  bellMomoRule: 'เกณฑ์เดียวกับหน้าสแกนเหรียญ: ราคาแตะหรือห่าง swing high 120 วันไม่เกิน 0.5% วอลุ่ม 24 ชม. ตั้งแต่ 1.5× ของค่าเฉลี่ย 20 วัน และ RSI 55–75 เป็นการบรรยายสภาพราคา ไม่ใช่สัญญาณ',
  bellFoot: 'สรุปจากข้อมูลในแอป เวลาแสดงตามโซนเวลาของเครื่องคุณ ไม่ใช่คำแนะนำการลงทุน', bellHasNew: (n) => `ใหม่ ${n} รายการ`, bellLoad: 'กำลังโหลด…' });
ICONS.bell = '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5l1.5-2z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 20.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>';

const BELL = { lang: '', seenT: +store.get('cw-bell-seen', 0) || 0, seenK: new Set(store.get('cw-bell-keys', [])), opener: null, scrAt: 0, newAtOpen: new Set() };
const BELL_NEW_MS = 48 * 36e5;                                     // older than 48h is never "new"
const BELL_STALE = { news: 48 * 36e5, scr: 12 * 36e5, cal: 48 * 36e5 }; // a source older than this shows Unavailable
const bellAge = (iso) => { const t = Date.parse(iso); return Number.isFinite(t) ? Date.now() - t : Infinity; };
const bellShort = (s, n = 150) => { s = String(s || '').trim(); if (s.length <= n) return s; const cut = s.lastIndexOf(' ', n); return s.slice(0, cut > n * 0.6 ? cut : n).replace(/[\s,;:·–-]+$/, '') + '…'; };
const bellLink = (l, dflt) => (typeof l === 'string' && /^(#\/[\w/-]*|https:\/\/[^\s"'<>]+)$/.test(l) ? l : dflt);

// (a) news: edition-level highlights [{en, th, link?}] if the routine wrote them, else the edition's own first 1-3 "top" items.
function bellNews() {
  if (typeof NX === 'undefined' || !NX.d) return (typeof NX !== 'undefined' && NX.err) ? null : undefined;
  const e = (NX.d.editions || [])[0]; if (!e || bellAge(e.generated_at) > BELL_STALE.news) return null;
  const hl = Array.isArray(e.highlights) ? e.highlights.filter((h) => h && (h.en || h.th)) : [];
  const src = hl.length ? hl.slice(0, 3).map((h) => ({ t: nL(h), link: bellLink(h.link, '#/narrative') })) : (nL(e.top) || []).slice(0, 3).map((t) => ({ t, link: '#/narrative' }));
  return { upd: e.generated_at, items: src.filter((x) => x.t).map((x, i) => ({ key: `n:${e.id}:${i}`, ts: Date.parse(e.generated_at), t: bellShort(x.t), link: x.link, when: e.generated_at })) };
}
// (b) the Screener's existing Momentum breakout preset: exactly the rows the Screener table shows with that preset and no extra filters.
function bellMomo() {
  if (typeof PRESETS === 'undefined' || typeof scRows !== 'function') return null;
  if (!S.scr || !S.scr.updated) return S.errors.scr ? null : undefined;
  if (bellAge(S.scr.updated) > BELL_STALE.scr) return null;
  const day = S.scr.updated.slice(0, 10), wl = new Set(S.cfg.map((t) => t.symbol));
  const hits = scRows(PRESETS.momo).sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9));
  return { upd: S.scr.updated, items: hits.slice(0, 6).map((c) => ({ key: `s:${c.s}:${day}`, ts: Date.parse(S.scr.updated), when: S.scr.updated,
    link: wl.has(c.s) ? `#/markets/${encodeURIComponent(c.s)}` : '#/screener/momo',
    t: XL(`${c.s} reached its 120-day swing high (${px(c.hi)}) · volume ${(+c.vs2).toFixed(1)}× its 20-day average · RSI ${Math.round(c.rsi)}`,
      `${c.s} ขึ้นมาแตะ swing high 120 วัน (${px(c.hi)}) · วอลุ่ม ${(+c.vs2).toFixed(1)}× ค่าเฉลี่ย 20 วัน · RSI ${Math.round(c.rsi)}`) })), more: Math.max(0, hits.length - 6) };
}
// (c) calendar events in the next 24h. Timed events are already in local time (calLocal); an all-day date is a JST day, as in setup.js.
function bellCal() {
  if (!S.cal) return S.errors.cal ? null : undefined;
  if (bellAge(S.cal.updated) > BELL_STALE.cal) return null;
  const now = Date.now(), end = now + 864e5, IMP = { high: 0, medium: 1, low: 2 };
  const ev = (S.cal.events || []).map((e) => { const t = e.time ? new Date(`${e.date}T${e.time}:00`).getTime() : null, d0 = Date.parse(`${e.date}T00:00:00+09:00`);
    return { e, t, d0, at: t ?? d0 }; }).filter((x) => Number.isFinite(x.at) && (x.t != null ? x.t >= now && x.t <= end : x.d0 < end && x.d0 + 864e5 > now))
    .sort((a, b) => (IMP[a.e.impact] ?? 3) - (IMP[b.e.impact] ?? 3) || a.at - b.at);
  return { upd: S.cal.updated, more: Math.max(0, ev.length - 5), items: ev.slice(0, 5).map(({ e, t, at }) => ({ key: `c:${e.date}:${e.title}`, ts: Math.min(now, at - 864e5),
    t: bellShort(LANG === 'th' ? e.th_title || e.title : e.title, 110), link: '#/calendar', when: t != null ? new Date(t).toISOString() : null,
    whenTxt: t != null ? jst(new Date(t)) : `${new Date(at + 9 * 36e5).toLocaleDateString(loc(), { month: 'short', day: 'numeric', timeZone: 'UTC' })} · ${T('bellAllDay')} (JST)` })) };
}
const bellSecs = () => [['news', 'bellNews', bellNews()], ['momo', 'bellMomo', bellMomo()], ['cal', 'bellCal', bellCal()]];
const bellIsNew = (it) => Number.isFinite(it.ts) && it.ts > BELL.seenT && Date.now() - it.ts < BELL_NEW_MS && !BELL.seenK.has(it.key);

function bellDot() {
  const n = bellSecs().reduce((a, [, , s]) => a + (s ? s.items.filter(bellIsNew).length : 0), 0);
  $$('[data-bell]').forEach((b) => { b.querySelector('.bell-dot').hidden = !n; b.setAttribute('aria-label', T('bell') + (n ? ` · ${T('bellHasNew')(n)}` : '')); });
}
function bellBody() {
  const sec = ([id, h, s]) => {
    const head = `<h3 class="bell-h">${esc(T(h))}${s && s.upd && (id === 'cal' || !s.items.length) ? ` <span class="bell-upd">${esc(T('bellUpd'))} ${esc(jst(new Date(s.upd)))}</span>` : ''}</h3>`;
    if (s === undefined) return `<section class="bell-sec" data-bellsec="${id}">${head}<p class="bell-mut">${esc(T('bellLoad'))}</p></section>`;
    if (!s) return `<section class="bell-sec" data-bellsec="${id}">${head}<p class="bell-mut" data-bellna>${esc(T('bellNa'))}</p></section>`;
    const li = s.items.map((it) => `<li><a href="${esc(it.link)}" ${/^https:/.test(it.link) ? 'target="_blank" rel="noopener"' : ''}>${BELL.newAtOpen.has(it.key) ? `<span class="bell-new">${esc(T('bellNew'))}</span>` : ''}<span class="bell-t">${esc(it.t)}</span><span class="bell-when">${esc(it.whenTxt || (it.when ? jst(new Date(it.when)) : ''))}</span></a></li>`).join('');
    const empty = id === 'momo' ? T('bellNoMomo') : id === 'cal' ? T('bellNoCal') : T('bellNa');
    const more = s.more ? `<a class="bell-more" href="${id === 'cal' ? '#/calendar' : '#/screener/momo'}">${esc(id === 'cal' ? T('bellMore')(s.more) : XL(`+${s.more} more in the Screener`, `ดูอีก ${s.more} เหรียญในหน้าสแกน`))}</a>` : '';
    return `<section class="bell-sec" data-bellsec="${id}">${head}${s.items.length ? `<ul class="bell-list">${li}</ul>` : `<p class="bell-mut">${esc(empty)}</p>`}${more}${id === 'momo' ? `<p class="bell-rule">${esc(T('bellMomoRule'))}</p>` : ''}</section>`;
  };
  return `<div class="bell-top"><h2 id="bellTitle" tabindex="-1">${esc(T('bell'))}</h2><button type="button" class="icon-btn" data-bellclose aria-label="${esc(T('bellClose'))}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
    ${bellSecs().map(sec).join('')}<p class="bell-foot">${esc(T('bellFoot'))}</p>`;
}
function bellOpen(btn) {
  const p = $('#bellPanel'); BELL.opener = btn; BELL.lang = LANG; if (typeof closeGear === 'function') closeGear();
  BELL.newAtOpen = new Set(bellSecs().flatMap(([, , s]) => (s ? s.items.filter(bellIsNew).map((x) => x.key) : [])));
  p.innerHTML = bellBody(); p.hidden = false; bellPlace();
  $$('[data-bell]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
  // Opening counts as seen: everything listed now stops lighting the dot.
  BELL.seenT = Date.now(); bellSecs().forEach(([, , s]) => s && s.items.forEach((x) => BELL.seenK.add(x.key)));
  store.set('cw-bell-seen', BELL.seenT); store.set('cw-bell-keys', [...BELL.seenK].slice(-300)); bellDot();
  $('#bellTitle').focus();
}
function bellPlace() {
  const p = $('#bellPanel'), b = BELL.opener; if (!p || p.hidden || !b || !b.isConnected) return;
  const r = b.getBoundingClientRect(), h = p.offsetHeight, w = p.offsetWidth;
  p.style.top = (r.bottom + 6 + h > innerHeight - 8 ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
  p.style.left = Math.max(8, Math.min(innerWidth - w - 8, innerWidth >= 1024 ? r.left : r.right - w)) + 'px';
}
function bellClose(focus) {
  const p = $('#bellPanel'); if (!p || p.hidden) return; p.hidden = true;
  $$('[data-bell]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  if (focus && BELL.opener && BELL.opener.isConnected) BELL.opener.focus();
}
async function bellScr() { // the screener file only (no CoinGecko call); the Screener page later adds its live prices to the same object
  if (S.scr && S.scr.updated && Date.now() - BELL.scrAt < 30 * 6e4) return; BELL.scrAt = Date.now();
  try { const d = await getJSON('screener.json?ts=' + Date.now()); if (d && Array.isArray(d.coins)) { if (!S.scr || !S.scr.updated || S.scr.updated !== d.updated) S.scr = d; S.errors.scr = null; } }
  catch (e) { if (!S.scr) S.errors.scr = e.message; }
}
function bellRefresh() {
  if (typeof nLoad === 'function' && (typeof NX === 'undefined' || !NX.d || Date.now() - NX.loaded > 10 * 6e4)) nLoad().then(bellUpd);
  bellScr().then(bellUpd);
}
function bellUpd() { bellDot(); const p = $('#bellPanel'); if (p && !p.hidden && !p.contains(document.activeElement)) { p.innerHTML = bellBody(); bellPlace(); } }

(function bellInit() {
  const btn = (cls) => `<button type="button" class="icon-btn bell-btn ${cls}" data-bell aria-haspopup="dialog" aria-expanded="false" aria-controls="bellPanel" aria-label="${esc(T('bell'))}">${svg('bell', 18)}<i class="bell-dot" hidden></i></button>`;
  const top = document.querySelector('.top-in [data-refresh]'), side = document.querySelector('.side-act [data-refresh]');
  if (top) top.insertAdjacentHTML('beforebegin', btn('bell-m')); if (side) side.insertAdjacentHTML('afterend', btn('bell-d'));
  const p = document.createElement('div'); p.id = 'bellPanel'; p.className = 'bell-pop'; p.hidden = true;
  p.setAttribute('role', 'dialog'); p.setAttribute('aria-labelledby', 'bellTitle'); document.body.appendChild(p);
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-bell]'); if (b) { return p.hidden ? bellOpen(b) : bellClose(true); }
    if (e.target.closest('[data-bellclose]')) return bellClose(true);
    if (e.target.closest('#bellPanel a')) return bellClose(false);
    if (!p.hidden && !p.contains(e.target)) bellClose(false);
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !p.hidden) { e.preventDefault(); bellClose(true); } });
  p.addEventListener('focusout', (e) => { if (e.relatedTarget && !p.contains(e.relatedTarget) && !e.relatedTarget.closest('[data-bell]')) bellClose(false); });
  addEventListener('resize', bellPlace, { passive: true }); addEventListener('hashchange', () => bellClose(false));
  // Labels follow the language switch (every switch calls render).
  const r0 = render; render = function (soft) { r0(soft); bellDot(); if (!p.hidden && BELL.lang !== LANG) { BELL.lang = LANG; p.innerHTML = bellBody(); bellPlace(); $('#bellTitle').focus(); } };
  bellRefresh(); setInterval(() => { if (!document.hidden) bellRefresh(); }, 5 * 6e4); setInterval(bellDot, 6e4);
})();
