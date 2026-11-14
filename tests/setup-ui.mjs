// Phase 3 Setup card in Chromium (docs/architect-proof-layer.md §4): display labels (codes unchanged), six evidence lines each green /
// grey / red with its number and source tab, ledger record under a line, derivatives coverage label, pattern display rule, 48 h event
// risk, "pending" note from the hysteresis, mirrored levels for a Downtrend with "Levels, not a short call" on the card, the source-tab
// buttons, help text with the timing change; desktop + phones 390 / 360, EN + TH, light + dark, no sideways scroll.
// Live market data is whatever this machine reaches; the states that matter are set from synthetic candles and injected inputs.
// Usage: node tests/setup-ui.mjs [baseUrl]   (SHOT=dir for screenshots)
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/', SHOT = process.env.SHOT || '';
const DAILY = readFileSync(new URL('./fixtures/lev/daily-2026.json', import.meta.url), 'utf8'), REC = readFileSync(new URL('./fixtures/lev/recent.json', import.meta.url), 'utf8');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };
if (SHOT) mkdirSync(SHOT, { recursive: true });

async function open(w, lang, scheme) {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, serviceWorkers: 'block', isMobile: w < 600, hasTouch: w < 600, colorScheme: scheme });
  await c.addInitScript((l) => localStorage.setItem('cw-lang', l), lang);
  await c.route('**/data/lev/daily-2026.json*', (r) => r.fulfill({ contentType: 'application/json', body: DAILY }));
  await c.route('**/data/lev/daily-2025.json*', (r) => r.fulfill({ status: 404, body: 'nf' }));
  await c.route('**/data/lev/recent.json*', (r) => r.fulfill({ contentType: 'application/json', body: REC }));
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '#/markets'); await p.waitForSelector('#planBox [data-su-card]', { timeout: 90000 });
  // let the card's own loads finish first, so none of them lands after the injected inputs below
  await p.waitForFunction(() => typeof SU !== 'undefined' && !Object.values(SU.req).some(Boolean) && SU.sm !== undefined && PRF.sum !== undefined, null, { timeout: 90000 });
  return { c, p, errs };
}
/* one synthetic token state: candles that give `kind`, plus injected inputs for every line; returns what the card shows */
const setState = (p, kind) => p.evaluate((kind) => {
  const DAY = 864e5, now = Date.now(), t0 = Math.floor(now / DAY) * DAY - 260 * DAY, t = tokBySym('BTC'), eth = tokBySym('ETH');
  const mk = (f) => Array.from({ length: 260 }, (_, i) => { const c = f(i); return { t: t0 + i * DAY, o: c, c, h: c * 1.01, l: c * 0.99, v: 1, q: 1000 }; });
  // Downtrend: a top at bar 200, then a steady fall; Mixed: the fall plus one sharp up close (raw Uptrend-free, MA50 reclaimed today only)
  const down = (i) => (i < 200 ? 100 + i * 0.5 : 200 - (i - 200) * 1.5);
  t.d1 = mk(kind === 'pending' ? (i) => (i < 259 ? down(i) : down(258) * 1.6) : down); t.price = t.d1[259].c; t.h4 = null; t.I = compute(t);
  eth.d1 = mk((i) => 50 + i * 0.3); // ETH/BTC rises: strength line on ETH would be green
  // Derivatives: a high funding rank on a small share of open interest -> grey with the coverage label
  SU.lev.BTC = { at: now, M: { P: { fundSigned: 95, days: 90, fundVenues: ['okx'] }, oi24: 2.1, covSide: 6 } };
  SU.sm = { flows: { d7: { from: new Date(now - 7 * DAY).toISOString(), to: new Date(now).toISOString(), hours: 168, gaps: 0, coins: { BTC: { net: 9e6 } } } }, coins: { BTC: { ntlLong: 6e7, ntlShort: 4e7 } } }; SU.smAt = now;
  SU.pat.BTC = { at: now, cands: [{ type: 'dtop', conf: 77, dir: -1, o: { st: 'confirmed' } }] };
  PT.bt = { ...(PT.bt || {}), types: { '1d': { dtop: { n: 12, hit: 6, rate: 50, nEff: 12 } }, any: { dtop: { n: 40, hit: 10, rate: 25, nEff: 31 } } } };
  PRF.sum = { rows: [{ kind: 'sm_flow', to: 'net_buy', sym: 'ALL', entries: 30, h7: { n: 30, nEff: 24, med: 1.4 }, base: { h7: { med: 0.2 } } }] };
  S.cal = { ...(S.cal || {}), events: [{ date: '2099-01-01', type: 'macro', tokens: [], impact: 'high', title: 'Test FOMC', th_title: 'ทดสอบ FOMC', time: new Date(now + 10 * 36e5).toTimeString().slice(0, 5), _local: true }] };
  // the calendar keeps local date + time; put the event 10 h from now in local time
  const d = new Date(now + 10 * 36e5); S.cal.events[0].date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  S.sel = 'BTC'; renderDetail();
  const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)];
  const line = (k) => { const e = q(`#planBox [data-su="${k}"]`); return e ? { st: e.dataset.sust, txt: e.innerText.replace(/\s+/g, ' '), src: (e.querySelector('.su-src') || {}).textContent, dot: getComputedStyle(e.querySelector('.su-d')).backgroundColor } : null; };
  return { chip: q('#planBox .vd').textContent, cls: q('#planBox .vd').className, held: t.I.plan.bias, raw: t.I.plan.raw, pend: (q('.su-pend') || {}).textContent || '',
    lines: Object.fromEntries(['trend', 'rs', 'deriv', 'sm', 'pat', 'event'].map((k) => [k, line(k)])), order: qa('#planBox [data-su]').map((e) => e.dataset.su),
    mir: q('[data-sumirror]') ? { txt: q('[data-sumirror]').innerText, vis: q('[data-sumirror]').getBoundingClientRect().height > 0, inTip: !!q('[data-sumirror]').closest('.ui-help-body') } : null,
    rows: qa('#planBox table.lv tr').map((r) => r.innerText.replace(/\s+/g, ' ')), help: (q('#planBox [data-su-card] .ui-help-body') || {}).textContent || '',
    led: qa('#planBox .su-led').map((e) => [e.closest('[data-su]').dataset.su, e.dataset.suled, e.textContent]), lowcov: (q('#planBox [data-su="deriv"] [data-lvlow]') || {}).textContent || '',
    up: getComputedStyle(document.documentElement).getPropertyValue('--up').trim(), dn: getComputedStyle(document.documentElement).getPropertyValue('--dn').trim() };
}, kind);
const rgb = (hex) => { const h = hex.replace('#', ''); return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`; };
const overflow = (p) => p.evaluate(() => { const W = document.documentElement.clientWidth, m = document.querySelector('#planBox');
  const out = [...m.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && !e.closest('.ui-help-body'); }).map((e) => e.className || e.tagName);
  return { doc: document.documentElement.scrollWidth > W, out: [...new Set(out)].slice(0, 6) }; });

// 1) desktop EN light: every rule
{ const { c, p, errs } = await open(1280, 'en', 'light'); const g = await setState(p, 'down');
  ok(g.held === 'Avoid' && g.chip === 'Downtrend' && /\bAvoid\b/.test(g.cls), `stored code Avoid, shown as "Downtrend" (${g.chip})`);
  ok(g.order.join() === 'trend,rs,deriv,sm,pat,event', 'six evidence lines in order: trend, strength vs BTC, derivatives, Smart Money, pattern, event risk');
  ok(Object.values(g.lines).every((l) => ['g', 'r', 'n'].includes(l.st) && l.src), 'each line is green, grey or red and names its source tab');
  ok(g.lines.trend.st === 'r' && /Downtrend · close −[\d.]+% vs MA50, [+−][\d.]+% vs MA200/.test(g.lines.trend.txt) && g.lines.trend.dot === rgb(g.dn), `trend: red dot with its numbers (${g.lines.trend.txt})`);
  ok(g.lines.rs.st === 'n' && /benchmark/.test(g.lines.rs.txt), 'strength vs BTC: BTC is the benchmark (grey)');
  ok(g.lines.deriv.st === 'n' && /95th percentile of own 90 days/.test(g.lines.deriv.txt) && /OI 24h \+2\.1%/.test(g.lines.deriv.txt) && /Low coverage: 6% of open interest/.test(g.lowcov), `derivatives: top-10% funding on 6% coverage stays grey, with the coverage label (${g.lines.deriv.txt})`);
  ok(g.lines.sm.st === 'g' && /\+\$9\.0M/.test(g.lines.sm.txt) && /\+9\.0% of the panel's BTC position: net buying/.test(g.lines.sm.txt) && g.lines.sm.dot === rgb(g.up), `Smart Money: 9% of the panel position = net buying, green (${g.lines.sm.txt})`);
  ok(g.led.some(([k, s, x]) => k === 'sm' && s === 'ok' && /median \+7d \+1\.4% \(24 independent\)/.test(x) && /any day \+0\.2%/.test(x)), 'Smart Money line shows its ledger record (nEff >= 20)');
  ok(g.lines.pat.st === 'n' && /Double top/.test(g.lines.pat.txt) && /weak record: 25% hit \(all timeframes\)/.test(g.lines.pat.txt), `pattern: 1D has 12 cases, all timeframes 25% at nEff 31 -> weak, grey (${g.lines.pat.txt})`);
  ok(g.led.some(([k, s]) => k === 'pat' && s === 'none'), 'pattern line: no ledger record yet, said so');
  ok(g.lines.event.st === 'r' && /Test FOMC · in (9|10) h/.test(g.lines.event.txt), `event risk: a high-impact macro event in 10 h is red (${g.lines.event.txt})`);
  ok(g.mir && g.mir.vis && !g.mir.inTip && /^Levels, not a short call/.test(g.mir.txt), '"Levels, not a short call" is visible on the card itself, not in a tooltip');
  ok(/^Invalidation \(close above\)/.test(g.rows[0]) && /^Resistance zone/.test(g.rows[1]) && g.rows.some((r) => /^Target 1/.test(r)) && !g.rows.some((r) => /Entry zone|Stop-loss|^TP1/.test(r)), `Downtrend shows the mirrored levels only (${g.rows.join(' | ')})`);
  ok(/two days later than it did before Phase 1/.test(g.help) && /not added up into a score/.test(g.help), 'help text: no summed score; a state can change up to two days later than before Phase 1');
  // source tab buttons switch the token tab
  await p.click('#planBox [data-su="deriv"] [data-sutab="lev"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => S.tab === 'lev' && document.querySelector('.tabs [data-tab="lev"]').getAttribute('aria-selected') === 'true' && !document.querySelector('#planBox [data-sutab][aria-selected]')), 'the Leverage source button opens the Leverage tab');
  await p.evaluate(() => { S.tab = 'plan'; renderTab(tokBySym('BTC')); }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => /Levels, not a short call/.test(document.querySelector('#tabBody').textContent)), 'the plan chart of a Downtrend is labelled "Levels, not a short call"');
  // ETH: strength vs BTC from the two candle sets
  const e = await p.evaluate(() => { S.sel = 'ETH'; const t = tokBySym('ETH'); t.price = t.d1[t.d1.length - 1].c; t.I = compute(t); renderDetail(); const l = document.querySelector('#planBox [data-su="rs"]'); return { st: l.dataset.sust, txt: l.innerText.replace(/\s+/g, ' ') }; });
  ok(e.st === 'g' && /\+[\d.]+% vs BTC over 30 days · ETH\/BTC above its 50-day average/.test(e.txt), `strength vs BTC: ETH outperforming and above its 50-day ratio average is green (${e.txt})`);
  // pending: the last close alone reads differently; the held state stays until the next close agrees
  const pd = await setState(p, 'pending');
  ok(pd.raw !== pd.held && pd.held === 'Avoid' && new RegExp(`alone reads "${pd.raw === 'Wait' ? 'Mixed' : 'Uptrend setup'}"`).test(pd.pend) && /only if the next daily close agrees/.test(pd.pend), `hysteresis: held ${pd.held}, last close alone ${pd.raw}, said under the chip`);
  // a normal plan (not Downtrend) keeps the entry zone and no mirror label
  const w = await p.evaluate(() => { const t = tokBySym('BTC'), DAY = 864e5, t0 = Math.floor(Date.now() / DAY) * DAY - 260 * DAY;
    t.d1 = Array.from({ length: 260 }, (_, i) => { const c = 100 + i * 0.5 + 6 * Math.sin(i / 4); return { t: t0 + i * DAY, o: c, c, h: c * 1.01, l: c * 0.99, v: 1, q: 1000 }; }); t.price = t.d1[259].c; t.I = compute(t); renderDetail();
    return { b: t.I.plan.bias, mir: !!document.querySelector('[data-sumirror]'), rows: [...document.querySelectorAll('#planBox table.lv tr')].map((r) => r.innerText) }; });
  ok(w.b !== 'Avoid' && !w.mir && w.rows.some((r) => /Entry zone/.test(r)), `${w.b}: the usual plan, no mirror label`);
  ok(!errs.length, 'no page errors ' + errs.join(';'));
  if (SHOT) { await setState(p, 'down'); await p.locator('#planBox').screenshot({ path: `${SHOT}/v57-setup-desktop-en-light.png` }); }
  await c.close(); }

// 2) phones and desktop, EN + TH, light + dark: labels, no sideways scroll
for (const [w, lang, scheme] of [[390, 'en', 'light'], [390, 'th', 'dark'], [360, 'en', 'dark'], [360, 'th', 'light'], [1280, 'th', 'dark']]) {
  const { c, p, errs } = await open(w, lang, scheme); const g = await setState(p, 'down'), tag = `${w}-${lang}-${scheme}`;
  ok(g.chip === (lang === 'en' ? 'Downtrend' : 'ขาลง'), `${tag} label ${g.chip}`);
  ok(g.mir && g.mir.vis && (lang === 'en' ? /Levels, not a short call/ : /ไม่ใช่สัญญาณ Short/).test(g.mir.txt), `${tag} mirror label visible`);
  ok(lang === 'en' || (/ความเสี่ยงอีเวนต์/.test(g.lines.event.txt) && /ครอบคลุมน้อย: 6% ของ OI/.test(g.lowcov) && /ช้ากว่าก่อน Phase 1 ได้ถึงสองวัน/.test(g.help)), `${tag} Thai lines, coverage label and timing note`);
  const ov = await overflow(p); ok(!ov.doc && !ov.out.length, `${tag} no sideways scroll ${JSON.stringify(ov)}`);
  ok(!errs.length, `${tag} no page errors ` + errs.join(';'));
  if (SHOT) await p.locator('#planBox').screenshot({ path: `${SHOT}/v57-setup-${w}-${lang}-${scheme}.png` });
  await c.close(); }
await b.close();
console.log(`PASS setup-ui: ${n} checks (labels, six lines, colours, ledger, coverage, pattern rule, event risk, pending, mirrored levels, source tabs, phones EN/TH light/dark)`);
