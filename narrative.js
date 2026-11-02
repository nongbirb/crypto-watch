/* X Narrative: twice-daily market narrative editions from narrative.json (see NARRATIVE.md). */
Object.assign(I18N.en, { narrative: 'X Narrative', nTop: 'Top story', nRising: 'Rising', nFading: 'Fading', nNarr: 'Narratives', nMacro: 'US & macro', nMent: 'Most mentioned', nSent: 'Sentiment', nCat: 'Catalysts', nWin: 'Winners', nLose: 'Losers', nConc: 'Concerns', nPosts: 'Notable posts', nEd: 'Edition', nDiff: 'Changed since last edition', nNew: 'New', nGone: 'Dropped', nFirst: 'First edition, so there is nothing to compare yet.', nSame: 'No narrative changes.', nTiers: 'T1 official · T2 research / data · T3 community (only when corroborated)', nUnconf: 'unconfirmed', nPrev: 'prev', nWindow: 'Window', nLoadErr: 'Could not load narrative.json' });
Object.assign(I18N.th, { narrative: 'X Narrative', nTop: 'เรื่องเด่น', nRising: 'กำลังมา', nFading: 'กำลังซา', nNarr: 'กระแสตลาด', nMacro: 'สหรัฐฯ & มหภาค', nMent: 'ถูกพูดถึงมากสุด', nSent: 'อารมณ์ตลาด', nCat: 'ปัจจัยที่ต้องจับตา', nWin: 'ผู้ชนะ', nLose: 'ผู้แพ้', nConc: 'ข้อกังวล', nPosts: 'โพสต์น่าสนใจ', nEd: 'ฉบับ', nDiff: 'เปลี่ยนจากฉบับก่อน', nNew: 'ใหม่', nGone: 'หายไป', nFirst: 'นี่คือฉบับแรก ยังไม่มีฉบับก่อนให้เทียบ', nSame: 'กระแสไม่เปลี่ยน', nTiers: 'T1 ทางการ · T2 นักวิจัย/ข้อมูล · T3 ชุมชน (แสดงเมื่อมีแหล่งยืนยัน)', nUnconf: 'ยังไม่ยืนยัน', nPrev: 'ก่อน', nWindow: 'ช่วงเวลา', nLoadErr: 'โหลด narrative.json ไม่สำเร็จ' });
ICONS.narrative = '<path d="M4 5h16v11H9l-5 4V5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 9h8M8 12.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>';
if (!ROUTES.includes('narrative')) { ROUTES.splice(2, 0, 'narrative'); MORE.unshift('narrative'); }
const NX = { d: null, sel: 0, err: false };
const nL = (o) => (o && typeof o === 'object' ? (o[LANG] ?? o.en ?? '') : (o ?? ''));
const nTier = (t) => `<span class="tier ${esc(t)}" title="${esc(T('nTiers'))}">${esc(t)}</span>`;
const nSrc = (a) => (a && a.length ? `<div class="nsrc">${a.map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener">${nTier(s.tier)}${esc(s.n)}</a>`).join('')}</div>` : '');
const nCard = (h, body, cls = '') => `<section class="card ncard ${cls}"><h3>${esc(h)}</h3>${body}</section>`;
async function nLoad() { try { NX.d = await getJSON('narrative.json?t=' + Date.now()); NX.err = false; } catch (e) { NX.err = true; } if (S.route === 'narrative') pNarrative(true); }
function nGauge(v, p) { const a = (x) => Math.PI * (1 - x / 100), pt = (x, r) => [60 + r * Math.cos(a(x)), 60 - r * Math.sin(a(x))];
  const [x1, y1] = pt(v, 42), d = v - p;
  return `<svg viewBox="0 0 120 70" class="ngauge"><defs><linearGradient id="ngg"><stop offset="0" stop-color="var(--dn)"/><stop offset=".5" stop-color="var(--warn)"/><stop offset="1" stop-color="var(--up)"/></linearGradient></defs><path d="M10 60A50 50 0 0 1 110 60" fill="none" stroke="url(#ngg)" stroke-width="8" stroke-linecap="round" opacity=".85"/><circle cx="${pt(p, 50)[0]}" cy="${pt(p, 50)[1]}" r="3" fill="var(--tx3)"/><line x1="60" y1="60" x2="${x1}" y2="${y1}" stroke="var(--tx)" stroke-width="2.5" stroke-linecap="round" class="needle"/><circle cx="60" cy="60" r="4" fill="var(--tx)"/></svg><div class="ngv"><b>${v}</b> <span class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}</span> <small class="mut">${esc(T('nPrev'))} ${p}</small></div>`; }
function nDiff(e, pe) {
  if (!pe) return `<p class="mut">${esc(T('nFirst'))}</p>`;
  const k = (x) => x.title.en, a = new Set(e.narratives.map(k)), b = new Set(pe.narratives.map(k));
  const nw = e.narratives.filter((x) => !b.has(k(x))), gone = pe.narratives.filter((x) => !a.has(k(x)));
  const mv = e.narratives.filter((x) => b.has(k(x))).map((x) => { const o = pe.narratives.find((y) => k(y) === k(x)); return [x, x.momentum - o.momentum]; }).filter((z) => Math.abs(z[1]) >= 10);
  if (!nw.length && !gone.length && !mv.length) return `<p class="mut">${esc(T('nSame'))}</p>`;
  return `<ul class="ndiff">${nw.map((x) => `<li><span class="wtag up">${esc(T('nNew'))}</span>${esc(nL(x.title))}</li>`).join('')}${gone.map((x) => `<li><span class="wtag dn">${esc(T('nGone'))}</span>${esc(nL(x.title))}</li>`).join('')}${mv.map(([x, d]) => `<li><span class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</span> ${esc(nL(x.title))}</li>`).join('')}</ul>`; }
function nItems(a) { return a.map((x) => `<div class="nit"><b>${esc(nL(x.title))}${x.confirmed === false ? ` <span class="wtag warn">${esc(T('nUnconf'))}</span>` : ''}</b><p>${esc(nL(x.body))}</p>${nSrc(x.src)}</div>`).join(''); }
function pNarrative(soft) {
  const m = $('#main');
  if (!NX.d && !NX.err) { m.innerHTML = pageHead(T('narrative')) + `<p class="mut">${esc(T('wLoading'))}</p>`; nLoad(); return; }
  if (NX.err) { m.innerHTML = pageHead(T('narrative')) + `<p class="err">${esc(T('nLoadErr'))}</p>`; return; }
  const eds = NX.d.editions || [], e = eds[NX.sel] || eds[0], pe = eds[NX.sel + 1];
  const sw = `<select id="nEd" class="nsel" aria-label="${esc(T('nEd'))}">${eds.map((x, i) => `<option value="${i}" ${i === NX.sel ? 'selected' : ''}>${esc(x.date)} · ${esc(nL(x.label))}</option>`).join('')}</select>`;
  const narr = (dir) => e.narratives.filter((x) => x.dir === dir).map((x) => `<div class="nit"><div class="nmo"><b>${esc(nL(x.title))}</b><span class="${x.momentum >= 0 ? 'up' : 'dn'}">${x.momentum > 0 ? '+' : ''}${x.momentum}</span></div><div class="nbar"><i style="width:${Math.min(100, Math.abs(x.momentum))}%" class="${x.momentum >= 0 ? 'bu' : 'bd'}"></i></div><p>${esc(nL(x.body))}</p>${nSrc(x.src)}</div>`).join('');
  const pm = pe && pe.mentions ? Object.fromEntries(pe.mentions.items.map((i) => [i.sym, i.n])) : {};
  const ment = e.mentions.items.map((i) => { const pv = pm[i.sym] ?? i.prev, c = pv ? (i.n / pv - 1) * 100 : 0; return `<div class="nment"><b>${esc(i.sym)}</b><span class="mut">${i.n.toLocaleString()}</span><span class="${c >= 0 ? 'up' : 'dn'}">${c >= 0 ? '+' : ''}${c.toFixed(0)}%</span></div>`; }).join('');
  const wl = (a, c) => a.map((x) => `<div class="nit"><div class="nmo"><b>${esc(x.sym)}</b><span class="${c}">${esc(x.chg)}</span></div><p>${esc(nL(x.why))}</p>${nSrc(x.src)}</div>`).join('');
  m.innerHTML = pageHead(T('narrative'), sw) + `<p class="mut nmeta">${esc(jstFull(e.generated_at))} · ${esc(T('nTiers'))}</p>
  <div class="ngrid">
  ${nCard(T('nTop'), `<ol class="ntop">${nL(e.top).map((l) => `<li>${esc(l)}</li>`).join('')}</ol>${nSrc(e.top.src)}`, 'nwide')}
  ${nCard(T('nDiff'), nDiff(e, pe))}
  ${nCard(T('nSent'), nGauge(e.sentiment.score, e.sentiment.prev) + `<p class="mut">${esc(nL(e.sentiment.note))}</p>${nSrc(e.sentiment.src)}`)}
  ${nCard(T('nRising'), narr('rising'))}
  ${nCard(T('nFading'), narr('fading'))}
  ${nCard(T('nMacro'), nItems(e.macro))}
  ${nCard(T('nMent'), ment + `<p class="mut sm">${esc(nL(e.mentions.note))}</p>`)}
  ${nCard(T('nCat'), e.catalysts.map((c) => `<div class="ncat"><span class="mono">${esc(c.date.slice(5))}</span><span>${esc(nL(c.title))}</span>${nSrc(c.src)}</div>`).join(''))}
  ${nCard(T('nWin'), wl(e.winners, 'up'))}
  ${nCard(T('nLose'), wl(e.losers, 'dn'))}
  ${nCard(T('nConc'), nItems(e.concerns))}
  ${nCard(T('nPosts'), e.posts.map((p) => `<a class="npost" href="${esc(p.u)}" target="_blank" rel="noopener"><div>${nTier(p.tier)}<b>@${esc(p.h)}</b> <small class="mut">♥ ${p.likes} · ${esc(relT(p.at))}</small></div><p>${esc(p.t)}</p></a>`).join(''), 'nwide')}
  </div>`;
  $('#nEd').onchange = (ev) => { NX.sel = +ev.target.value; pNarrative(); };
}
(function () { const r = render; render = function (soft) { if (S.route === 'narrative') { renderShell(); killCharts(); pNarrative(soft); if (soft) scrollTo(0, scrollY); return; } r(soft); }; })();
if (/^#\/narrative\b/.test(location.hash)) S.route = 'narrative';
