/* X Narrative: twice-daily market narrative editions from narrative.json (see NARRATIVE.md).
   v44 layout: hero + main/rail on desktop; collapsed story cards; sticky edition+jump on mobile. */
Object.assign(I18N.en, {
  narrative: 'X Narrative', nTop: 'What matters today', nRising: 'Rising', nFading: 'Fading', nNarr: 'Narratives',
  nMacro: 'US & macro', nMent: 'Most mentioned', nSent: 'Sentiment', nCat: 'Upcoming', nWin: 'Winners', nLose: 'Losers',
  nConc: 'Concerns', nPosts: 'Notable posts', nEd: 'Edition', nDiff: 'Changed since last edition', nNew: 'New', nGone: 'Dropped',
  nFirst: 'First edition, so there is nothing to compare yet.', nSame: 'No narrative changes.',
  nTiers: 'T1 official · T2 research / data · T3 community (only when corroborated)', nUnconf: 'unconfirmed', nPrev: 'prev',
  nWindow: 'Window', nLoadErr: 'Could not load narrative.json', nRead: 'Read more', nHide: 'Show less',
  nShowAll: 'Show all', nShowLess: 'Show less',
  nJumpAll: 'All', nJumpRising: 'Rising', nJumpFading: 'Fading', nJumpMacro: 'Macro', nJumpConc: 'Concerns', nJumpCat: 'Upcoming', nJumpPosts: 'Posts'
});
Object.assign(I18N.th, {
  narrative: 'X Narrative', nTop: 'เรื่องเด่นวันนี้', nRising: 'กำลังมา', nFading: 'กำลังซา', nNarr: 'กระแสตลาด',
  nMacro: 'สหรัฐฯ & มหภาค', nMent: 'ถูกพูดถึงมากสุด', nSent: 'อารมณ์ตลาด', nCat: 'ปฏิทิน', nWin: 'ผู้ชนะ', nLose: 'ผู้แพ้',
  nConc: 'ข้อกังวล', nPosts: 'โพสต์น่าสนใจ', nEd: 'ฉบับ', nDiff: 'เปลี่ยนจากฉบับก่อน', nNew: 'ใหม่', nGone: 'หายไป',
  nFirst: 'นี่คือฉบับแรก ยังไม่มีฉบับก่อนให้เทียบ', nSame: 'กระแสไม่เปลี่ยน',
  nTiers: 'T1 ทางการ · T2 นักวิจัย/ข้อมูล · T3 ชุมชน (แสดงเมื่อมีแหล่งยืนยัน)', nUnconf: 'ยังไม่ยืนยัน', nPrev: 'ก่อน',
  nWindow: 'ช่วงเวลา', nLoadErr: 'โหลด narrative.json ไม่สำเร็จ', nRead: 'อ่านต่อ', nHide: 'ย่อ',
  nShowAll: 'แสดงทั้งหมด', nShowLess: 'ย่อ',
  nJumpAll: 'ทั้งหมด', nJumpRising: 'กำลังมา', nJumpFading: 'กำลังซา', nJumpMacro: 'มหภาค', nJumpConc: 'ข้อกังวล', nJumpCat: 'ปฏิทิน', nJumpPosts: 'โพสต์'
});
ICONS.narrative = '<path d="M4 5h16v11H9l-5 4V5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 9h8M8 12.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>';
if (!ROUTES.includes('narrative')) { ROUTES.splice(2, 0, 'narrative'); MORE.unshift('narrative'); }

const NX = { d: null, sel: 0, err: false, filter: 'all' };
const nL = (o) => (o && typeof o === 'object' ? (o[LANG] ?? o.en ?? '') : (o ?? ''));
const nHasT1 = (a) => (a || []).some((s) => s.tier === 'T1');
const nTier = (t) => `<span class="tier ${esc(t)}" title="${esc(T('nTiers'))}">${esc(t)}</span>`;

function nSrc(a) {
  if (!a || !a.length) return '';
  const show = a.slice(0, 2), rest = a.slice(2);
  const chip = (s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener">${nTier(s.tier)}${esc(s.n)}</a>`;
  let h = show.map(chip).join('');
  if (rest.length) {
    h += `<button type="button" class="nsrc-more" data-nsrc>+${rest.length}</button>`;
    h += rest.map((s) => `<a class="nsrc-x" href="${esc(s.u)}" target="_blank" rel="noopener">${nTier(s.tier)}${esc(s.n)}</a>`).join('');
  }
  return `<div class="nsrc">${h}</div>`;
}

function nGauge(v, p) {
  const a = (x) => Math.PI * (1 - x / 100), pt = (x, r) => [60 + r * Math.cos(a(x)), 60 - r * Math.sin(a(x))];
  const [x1, y1] = pt(v, 42), d = v - p;
  return `<svg viewBox="0 0 120 70" class="ngauge"><defs><linearGradient id="ngg"><stop offset="0" stop-color="var(--dn)"/><stop offset=".5" stop-color="var(--warn)"/><stop offset="1" stop-color="var(--up)"/></linearGradient></defs><path d="M10 60A50 50 0 0 1 110 60" fill="none" stroke="url(#ngg)" stroke-width="8" stroke-linecap="round" opacity=".85"/><line x1="60" y1="60" x2="${x1}" y2="${y1}" stroke="var(--tx)" stroke-width="2.5" stroke-linecap="round" class="needle"/><circle cx="60" cy="60" r="4" fill="var(--tx)"/></svg><div class="ngv"><b>${v}</b> <span class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}</span> <small class="mut">${esc(T('nPrev'))} ${p}</small></div>`;
}


const nMoodLbl = (c) => LANG === 'th'
  ? ({ 'Extreme Fear': 'กลัวสุด ๆ', Fear: 'กลัว', Neutral: 'กลาง ๆ', Greed: 'โลภ', 'Extreme Greed': 'โลภสุด ๆ' }[c] || c)
  : c;
const nMoodLine = (c) => {
  const en = {
    'Extreme Fear': 'Fear is extreme — forced selling often marks a turn.',
    Fear: 'Caution dominates; dips get sold more than bought.',
    Neutral: 'Neither fear nor greed is in charge right now.',
    Greed: 'Risk appetite is up; chase carefully.',
    'Extreme Greed': 'Euphoria is high — easy to overpay here.'
  };
  const th = {
    'Extreme Fear': 'กลัวสุด ๆ — แรงขายถูกบังคับมักเป็นจุดกลับตัว',
    Fear: 'ตลาดระวังตัว ดึงลงแล้วยังถูกเทมากกว่าเข้าซื้อ',
    Neutral: 'ยังไม่มีฝั่งกลัวหรือโลภคุมชัด',
    Greed: 'ความเสี่ยงถูกยอมรับมากขึ้น ไล่ราคาด้วยความระวัง',
    'Extreme Greed': 'คึกคักมาก — ง่ายที่จะซื้อแพงเกิน'
  };
  return (LANG === 'th' ? th : en)[c] || '';
};
function nSpark(series) {
  if (!series || series.length < 2) return '';
  const vals = series.slice(0, 7).map((x) => +x.value).filter((n) => Number.isFinite(n));
  if (vals.length < 2) return '';
  const chron = vals.slice().reverse();
  const w = 120, h = 28, pad = 2;
  const min = Math.min(...chron), max = Math.max(...chron);
  const span = Math.max(1, max - min);
  const pts = chron.map((v, i) => {
    const x = pad + (i / (chron.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  const last = chron[chron.length - 1], first = chron[0];
  const cls = last >= first ? 'up' : 'dn';
  return '<svg class="nspark" viewBox="0 0 ' + w + ' ' + h + '" width="120" height="28" aria-hidden="true"><polyline fill="none" stroke="currentColor" class="' + cls + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" points="' + pts + '"/></svg>';
}

function nSentBody(e) {
  const f = S.fng;
  if (f && f[0] && !NX.sel) {
    const v = +f[0].value, p = f[1] ? +f[1].value : v, c = f[0].value_classification;
    const lbl = nMoodLbl(c), line = nMoodLine(c), spark = nSpark(f);
    return nGauge(v, p)
      + `<div class="nmood"><b class="nmood-lbl">${esc(lbl)}</b>${line ? `<p class="nmood-line">${esc(line)}</p>` : ''}${spark}</div>`;
  }
  if (!f && !NX.fw) {
    NX.fw = setInterval(() => { if (S.fng) { clearInterval(NX.fw); if (S.route === 'narrative') pNarrative(true); } }, 500);
    setTimeout(() => clearInterval(NX.fw), 30000);
  }
  const note = nL(e.sentiment.note);
  return nGauge(e.sentiment.score, e.sentiment.prev) + (note ? `<div class="nmood"><p class="nmood-line">${esc(note)}</p></div>` : '');
}

function nDiff(e, pe) {
  if (!pe) return `<p class="mut">${esc(T('nFirst'))}</p>`;
  const k = (x) => x.title.en, a = new Set(e.narratives.map(k)), b = new Set(pe.narratives.map(k));
  const nw = e.narratives.filter((x) => !b.has(k(x))), gone = pe.narratives.filter((x) => !a.has(k(x)));
  const mv = e.narratives.filter((x) => b.has(k(x))).map((x) => { const o = pe.narratives.find((y) => k(y) === k(x)); return [x, x.momentum - o.momentum]; }).filter((z) => Math.abs(z[1]) >= 10);
  if (!nw.length && !gone.length && !mv.length) return `<p class="mut">${esc(T('nSame'))}</p>`;
  return `<ul class="ndiff">${nw.map((x) => `<li><span class="wtag up">${esc(T('nNew'))}</span>${esc(nL(x.title))}</li>`).join('')}${gone.map((x) => `<li><span class="wtag dn">${esc(T('nGone'))}</span>${esc(nL(x.title))}</li>`).join('')}${mv.map(([x, d]) => `<li><span class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</span> ${esc(nL(x.title))}</li>`).join('')}</ul>`;
}

function nStory(x, kind) {
  const mom = x.momentum ?? 0;
  const score = kind === 'narr' ? `<span class="nscore ${mom >= 0 ? 'up' : 'dn'}">${mom > 0 ? '+' : ''}${mom}</span>` : '';
  const bar = kind === 'narr' ? `<div class="nbar"><i style="width:${Math.min(100, Math.abs(mom))}%" class="${mom >= 0 ? 'bu' : 'bd'}"></i></div>` : '';
  const t1 = nHasT1(x.src) ? `<span class="t1mark">T1</span>` : '';
  const unconf = x.confirmed === false ? ` <span class="wtag warn">${esc(T('nUnconf'))}</span>` : '';
  return `<div class="nit" data-nstory>
    <div class="nmo"><b>${esc(nL(x.title))}${unconf}</b>${score}</div>${bar}
    <p class="nprev">${esc(nL(x.body))}</p>
    <div class="nfoot">${t1}<button type="button" class="nexp" data-nexp>${esc(T('nRead'))}</button>${nSrc(x.src)}</div>
  </div>`;
}

function nNarrBlock(items, dir) {
  const sorted = items.filter((x) => x.dir === dir).slice().sort((a, b) => Math.abs(b.momentum) - Math.abs(a.momentum));
  const top = sorted.slice(0, 3), rest = sorted.slice(3);
  let h = top.map((x) => nStory(x, 'narr')).join('');
  if (rest.length) {
    h += `<div class="nrest" hidden>${rest.map((x) => nStory(x, 'narr')).join('')}</div>`;
    h += `<button type="button" class="nmore" data-nmore>${esc(T('nShowAll'))} (${rest.length})</button>`;
  }
  return h || `<p class="mut">—</p>`;
}

async function nLoad() {
  try { NX.d = await getJSON('narrative.json?t=' + Date.now()); NX.err = false; }
  catch (e) { NX.err = true; }
  if (S.route === 'narrative') pNarrative(true);
}

function pNarrative(soft) {
  const m = $('#main');
  if (!NX.d && !NX.err) { m.innerHTML = pageHead(T('narrative')) + `<p class="mut">${esc(T('wLoading'))}</p>`; nLoad(); return; }
  if (NX.err) { m.innerHTML = pageHead(T('narrative')) + `<div class="empty empty-cat"><img class="cat-quiet" src="icons/favicon.png" alt="" width="40" height="40" decoding="async"><p class="err">${esc(T('nLoadErr'))}</p></div>`; return; }
  const eds = NX.d.editions || [], e = eds[NX.sel] || eds[0], pe = eds[NX.sel + 1];
  const F = NX.filter || 'all';
  const show = (k) => (F === 'all' || F === k) ? '' : ' hidden';
  const showMainCat = () => (F === 'catalysts' ? '' : ' hidden');

  const jumps = [
    ['all', 'nJumpAll'], ['rising', 'nJumpRising'], ['fading', 'nJumpFading'],
    ['macro', 'nJumpMacro'], ['concerns', 'nJumpConc'], ['catalysts', 'nJumpCat'], ['posts', 'nJumpPosts']
  ];
  const jump = `<div class="njump" role="tablist">${jumps.map(([k, t]) =>
    `<button type="button" data-njump="${k}" aria-pressed="${F === k}">${esc(T(t))}</button>`).join('')}</div>`;
  const sw = `<select id="nEd" class="nsel" aria-label="${esc(T('nEd'))}">${eds.map((x, i) =>
    `<option value="${i}" ${i === NX.sel ? 'selected' : ''}>${esc(x.date)} · ${esc(nL(x.label))}</option>`).join('')}</select>`;

  const tops = nL(e.top);
  const topOl = (Array.isArray(tops) ? tops : []).map((l) => `<li>${esc(l)}</li>`).join('');

  const pm = pe && pe.mentions ? Object.fromEntries(pe.mentions.items.map((i) => [i.sym, i.n])) : {};
  const ment = e.mentions.items.map((i) => {
    const pv = pm[i.sym] ?? i.prev, c = pv ? (i.n / pv - 1) * 100 : 0;
    return `<div class="nment"><b>${esc(i.sym)}</b><span class="mut">${i.n.toLocaleString()}</span><span class="${c >= 0 ? 'up' : 'dn'}">${c >= 0 ? '+' : ''}${c.toFixed(0)}%</span></div>`;
  }).join('');
  const cats = e.catalysts.map((c) =>
    `<div class="ncat"><span class="mono">${esc(c.date.slice(5))}</span><span>${esc(nL(c.title))}</span></div>`).join('');
  const wl = (a, cls) => a.map((x) =>
    `<div class="nwl"><div><b>${esc(x.sym)}</b><small>${esc(nL(x.why))}</small></div><span class="${cls} num">${esc(x.chg)}</span></div>`).join('');
  const posts = e.posts.map((p) =>
    `<a class="npost" href="${esc(p.u)}" target="_blank" rel="noopener"><div>${nTier(p.tier)}<b>@${esc(p.h)}</b> <small class="mut">♥ ${p.likes} · ${esc(relT(p.at))}</small></div><p>${esc(p.t)}</p></a>`).join('');

  m.innerHTML = pageHead(T('narrative')) + `
  <div class="npage">
    <div class="ntool">
      ${sw}
      ${jump}
    </div>
    <p class="mut nmeta">${esc(jstFull(e.generated_at))} ${!NX.sel ? fresh(e.generated_at, 12) : ''} · ${esc(T('nTiers'))}</p>

    <div class="nhero">
      <section class="nhero-top card">
        <h3>${esc(T('nTop'))}</h3>
        <ol class="ntop">${topOl}</ol>
        <div class="nhero-src">${nSrc(e.top.src)}</div>
      </section>
      <section class="nhero-sent card">
        <h3>${esc(T('nSent'))}</h3>
        ${nSentBody(e)}
      </section>
    </div>

    <section class="ndiff-wrap card" data-ndiff>
      <h3>${esc(T('nDiff'))}</h3>
      ${nDiff(e, pe)}
    </section>

    <div class="nbody">
      <div class="nmain">
        <section class="card ncard nsec" data-nsec="rising"${show('rising')}><h3>${esc(T('nRising'))}</h3>${nNarrBlock(e.narratives, 'rising')}</section>
        <section class="card ncard nsec" data-nsec="fading"${show('fading')}><h3>${esc(T('nFading'))}</h3>${nNarrBlock(e.narratives, 'fading')}</section>
        <section class="card ncard nsec" data-nsec="macro"${show('macro')}><h3>${esc(T('nMacro'))}</h3>${e.macro.map((x) => nStory(x, 'item')).join('')}</section>
        <section class="card ncard nsec" data-nsec="concerns"${show('concerns')}><h3>${esc(T('nConc'))}</h3>${e.concerns.map((x) => nStory(x, 'item')).join('')}</section>
        <section class="card ncard nsec" data-nsec="catalysts"${showMainCat()}><h3>${esc(T('nCat'))}</h3>${cats}</section>
        <section class="card ncard nsec" data-nsec="posts"${show('posts')}><h3>${esc(T('nPosts'))}</h3>${posts}</section>
      </div>
      <aside class="nrail">
        <section class="card ncard"><h3>${esc(T('nMent'))}</h3>${ment}<p class="mut sm">${esc(nL(e.mentions.note))}</p></section>
        <section class="card ncard nsec" data-nsec="catalysts"${(F === 'all' ? '' : ' hidden')}><h3>${esc(T('nCat'))}</h3>${cats}</section>
        <section class="card ncard"><h3>${esc(T('nWin'))}</h3>${wl(e.winners, 'up')}</section>
        <section class="card ncard"><h3>${esc(T('nLose'))}</h3>${wl(e.losers, 'dn')}</section>
      </aside>
    </div>
  </div>`;

  const ed = $('#nEd');
  if (ed) ed.onchange = (ev) => { NX.sel = +ev.target.value; pNarrative(); };
  $$('[data-njump]').forEach((b) => { b.onclick = () => { NX.filter = b.dataset.njump; pNarrative(); }; });
  $$('[data-nexp]').forEach((b) => {
    b.onclick = () => {
      const nit = b.closest('[data-nstory]');
      const open = nit.classList.toggle('open');
      b.textContent = open ? T('nHide') : T('nRead');
    };
  });
  $$('[data-nmore]').forEach((b) => {
    b.onclick = () => {
      const rest = b.previousElementSibling;
      if (rest.hasAttribute('hidden')) { rest.removeAttribute('hidden'); b.textContent = T('nShowLess'); }
      else { rest.setAttribute('hidden', ''); b.textContent = `${T('nShowAll')} (${rest.querySelectorAll('[data-nstory]').length})`; }
    };
  });
  $$('[data-nsrc]').forEach((b) => { b.onclick = () => b.closest('.nsrc').classList.add('show'); });
  const filterChanged = NX._prevFilter !== F;
  NX._prevFilter = F;
  if (filterChanged && F !== 'all') {
    const target = document.querySelector(`.nmain [data-nsec="${F}"]`);
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
}

(function () {
  const r = render;
  render = function (soft) {
    if (S.route === 'narrative') { renderShell(); killCharts(); pNarrative(soft); if (soft) scrollTo(0, scrollY); return; }
    r(soft);
  };
})();
if (/^#\/narrative\b/.test(location.hash)) S.route = 'narrative';
