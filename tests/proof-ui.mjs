// v54 Proof Layer UI in Chromium: plan-card record line (nEff gate, short history, timing help), "What changed" strip, #/record,
// pattern display rule (nEff >= 30, < 35% greyed), ASSETV = cw-shell, EN + TH, desktop + phone 390/360, light + dark, no sideways scroll.
// Data files are injected fixtures (never market results); candles are live. Usage: node tests/proof-ui.mjs  (server on U, default :8787)
// Screenshots -> SHOT (default /workspace/v54_preview).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.env.U || 'http://localhost:8787/', SHOT = process.env.SHOT || '/workspace/v54_preview'; fs.mkdirSync(SHOT, { recursive: true });
const sw = fs.readFileSync('sw.js', 'utf8').match(/cw-shell-v(\d+)/)[1], EXP = Number(process.env.EXPECT_ASSETV || 57);
assert.equal(Number(sw), EXP, 'sw.js cache name matches EXPECT_ASSETV');
// ---- fixtures ----
const st = (n, nEff, med, base) => ({ n, nEff, med, p25: med - 2, p75: med + 2, pos: 55, ci: [med - 1.5, med + 1.0], ciPos: [45, 62] });
const tok = (o) => ({ src: 'Fixture X', from: '2018-01-01', to: '2026-11-11', years: 8.9, short: false, bars: 3000, evaluated: 2800, gaps: 0, insufficient: 0, cut: '2024-01-01', ...o });
const states = (nE) => Object.fromEntries(['Long', 'Wait', 'Avoid'].map((s) => [s, { days: 300, h1: st(300, nE * 7, 0.1), h7: st(300, nE, -1.2), h30: st(300, Math.floor(nE / 4), 2) }]));
const part = (nE) => ({ states: states(nE), baseline: { h1: st(3000, 2800, 0.1), h7: st(3000, 400, 0.4), h30: st(3000, 93, 1.5) } });
const VBT = { updated: new Date(Date.now() - 2 * 864e5).toISOString(), method: {}, minNEff: 20, horizons: [1, 7, 30], all: {}, failed: {},
  tokens: { BTC: tok({ ...part(25), train: part(18), test: part(21) }), ETH: tok({ ...part(12), train: part(8), test: part(4) }), MON: tok({ ...part(22), years: 0.6, short: true, train: part(15), test: part(7) }) } };
const now = Date.now(), ago = (h) => new Date(now - h * 36e5).toISOString().replace(/\.\d+Z$/, 'Z');
const mon = new Date(now).toISOString().slice(0, 7), dayT = (h) => new Date(Math.floor((now - h * 36e5) / 864e5) * 864e5).toISOString().replace(/\.\d+Z$/, 'Z');
const ent = (i, sym, kind, from, to, h) => ({ id: `fx${i}`, t: dayT(h), sym, kind, from, to, px: 100, ctx: { seen: ago(h), key: kind === 'pattern' ? `${to}:${i}` : undefined } });
const E = [ent(1, 'BTC', 'verdict', null, 'Wait', 60), ent(2, 'ETH', 'verdict', null, 'Avoid', 60), ent(3, 'BTC', 'verdict', 'Wait', 'Long', 30), ent(4, 'ETH', 'verdict', 'Avoid', 'Wait', 20),
  ent(5, 'AAVE', 'pattern', 'none', 'hs', 10), ent(6, 'SOL', 'verdict', 'Wait', 'Avoid', 5), ent(7, 'ZZZ', 'verdict', 'Wait', 'Avoid', 4)].sort((a, b) => a.t.localeCompare(b.t));
const LED = { month: mon, entries: E };
const SUM = { updated: ago(4), since: E[0].t, entries: E.length, changes: 5, kinds: ['verdict', 'pattern', 'funding_regime', 'oi_regime', 'sm_flow'], counts: { verdict: 4, pattern: 1 },
  rows: [{ kind: 'verdict', to: 'Long', sym: 'ALL', entries: 1, h1: st(30, 25, 0.8), h7: st(30, 12, 1.1), h30: { n: 0, nEff: 0 }, base: { h1: { med: 0.1 }, h7: { med: 0.4 }, h30: { med: 1 } } },
    { kind: 'pattern', to: 'hs', sym: 'ALL', entries: 1, dirAdj: true, undirected: 0, h1: { n: 1, nEff: 1 }, h7: { n: 0, nEff: 0 }, h30: { n: 0, nEff: 0 }, base: { h7: { med: -0.4 } } },
    { kind: 'verdict', to: 'Long', sym: 'BTC', entries: 1, h1: { n: 1, nEff: 1 }, h7: { n: 0, nEff: 0 }, h30: { n: 0, nEff: 0 }, base: { h7: { med: 0.4 } } }] };
const PBT = JSON.parse(fs.readFileSync('patterns_backtest.json', 'utf8'));
PBT.types['1d'] = { ...PBT.types['1d'], atri: { n: 80, hit: 9, rate: 11.3, nEff: 41 }, chdn: { n: 90, hit: 60, rate: 66.7, nEff: 44 }, dtop: { n: 40, hit: 11, rate: 27.5, nEff: 22 }, cup: { n: 39, hit: 6, rate: 15.4, nEff: 29 }, dbot: { n: 24, hit: 14, rate: 58.3, nEff: 24 } };
// audit F1: 1D alone is under 30 independent cases -> the pooled record (all timeframes) decides, and says so
PBT.types.any = { ...PBT.types.any, cup: { n: 99, hit: 14, rate: 14.1, nEff: 71 }, dbot: { n: 67, hit: 30, rate: 44.8, nEff: 65 }, dtop: { n: 30, hit: 9, rate: 30, nEff: 25 } };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); else console.log('ok', m); };
const VPS = [[{ width: 1440, height: 1000 }, 'desktop'], [{ width: 390, height: 844 }, 'phone'], [{ width: 360, height: 780 }, 'phone360']];
for (const [vp, nm] of VPS) for (const lang of ['en', 'th']) for (const theme of nm === 'phone360' ? ['light'] : ['light', 'dark']) {
  const tag = `${nm}-${lang}-${theme}`, c = await b.newContext({ viewport: vp, serviceWorkers: 'block', colorScheme: theme, isMobile: vp.width < 600, hasTouch: vp.width < 600 }), p = await c.newPage();
  p.on('pageerror', (e) => fails.push(`${tag} PAGEERROR ${e.message}`));
  await c.addInitScript(([l, th, seen]) => { if (!sessionStorage.getItem('i')) { localStorage.setItem('cw-lang', l); localStorage.setItem('cw-theme-v', JSON.stringify(th)); localStorage.setItem('cw-sel', 'BTC'); localStorage.setItem('cw-chg-seen', String(seen)); sessionStorage.setItem('i', 1); } }, [lang, theme, now - 40 * 36e5]);
  const J = (o) => (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
  await c.route('**/verdict_backtest.json*', J(VBT)); await c.route('**/data/ledger/summary.json*', J(SUM)); await c.route('**/patterns_backtest.json*', J(PBT));
  await c.route(/\/data\/ledger\/\d{4}-\d{2}\.json/, (r) => (r.request().url().includes(`/${mon}.json`) ? J(LED)(r) : r.fulfill({ status: 404, body: 'nf' })));
  // Markets: strip + plan card
  await p.goto(B + '#/markets'); await p.waitForFunction(() => S.cfg.every((t) => t.I || t.err) && document.querySelector('#chg .chg'), null, { timeout: 60000 });
  await p.waitForSelector('#planBox .prf-rec', { timeout: 30000 });
  const g = await p.evaluate(() => { const q = (s) => [...document.querySelectorAll(s)];
    const fake = (sym, bias, src) => { const d = document.createElement('div'); d.innerHTML = prfRecordHTML({ symbol: sym, I: { plan: { bias } }, _src: src }); return { st: d.firstElementChild.dataset.prfrec || 'none', txt: d.textContent, line: [...d.querySelectorAll(':scope > .prf-rec > p.sub')].map((x) => x.textContent).join(' '), ven: d.querySelector('[data-prfven]') ? d.querySelector('[data-prfven]').textContent : null }; };
    return { assetv: ASSETV, items: q('#chg li').map((li) => li.innerText.replace(/\s+/g, ' ').trim()), btn: q('#chg button.chg-i').map((x) => x.dataset.sel), plan: document.querySelector('#planBox .prf-rec').innerText,
      help: document.querySelector('#planBox .prf-rec .ui-help-body').textContent, ok: fake('BTC', 'Long'), few: fake('ETH', 'Wait'), short: fake('MON', 'Avoid'), none: fake('NEAR', 'Wait'),
      venDiff: fake('BTC', 'Long', { ex: 'bybit', pair: 'BTCUSDT' }).ven, venDiffFew: fake('ETH', 'Wait', { ex: 'bybit', pair: 'ETHUSDT' }).ven, venSame: fake('BTC', 'Long', { ex: 'Fixture', pair: 'X' }).ven,
      asof: (document.querySelector('[data-indasof]') || {}).textContent || '',
      ov: document.documentElement.scrollWidth - innerWidth, oldLine: /not a validated trading edge|ยังไม่ผ่านการทดสอบ/.test(fake('ETH', 'Wait').txt) }; });
  ok(g.assetv === EXP, `${tag} ASSETV ${g.assetv}`);
  ok(g.items.length === 5, `${tag} strip: 5 changes since the last visit (first observations and older entries left out) ${JSON.stringify(g.items)}`);
  ok(/^ZZZ/.test(g.items[0]) && /^SOL/.test(g.items[1]) && /^BTC/.test(g.items[4]), `${tag} newest first`); ok(!g.btn.includes('ZZZ'), `${tag} a token not on the list is not a link`);
  ok(g.ok.st === 'ok' && (lang === 'en' ? /This state on BTC: 25 independent cases · median \+7d −1\.2% \(range −2\.7% to −0\.2%\) · any day \+0\.4%/ : /สถานะนี้ใน BTC: 25 เคสไม่ทับกัน/).test(g.ok.txt), `${tag} record line ${g.ok.txt.slice(0, 120)}`);
  // audit F9 (v55): the under-gate line reads "12 independent cases from 300 days: not enough to show a rate"
  ok(g.few.st === 'few' && g.oldLine && (lang === 'en' ? /This state on ETH: 12 independent cases from 300 days: not enough to show a rate/ : /สถานะนี้ใน ETH: 12 เคสไม่ทับกัน จาก 300 วัน ยังน้อยเกินกว่าจะโชว์อัตรา/).test(g.few.txt) && !/\d%/.test(g.few.line), `${tag} nEff < 20 keeps the old line + not enough to show a rate (no rate shown) ${g.few.txt.slice(0, 160)}`);
  // audit F6 (v55): the backtest venue is named when it is not the card's venue, on both record lines; not when it is the same
  ok(g.venDiff === (lang === 'en' ? 'backtest on Fixture X' : 'ทดสอบย้อนหลังบน Fixture X') && g.venDiffFew && g.venSame === null, `${tag} backtest venue shown only when it differs (${g.venDiff} / ${g.venSame})`);
  // audit F8 (v55): the indicator panel is labelled as of the last daily close
  ok(g.asof.startsWith(lang === 'en' ? 'as of the last daily close · ' : 'ณ แท่งรายวันที่ปิดล่าสุด · '), `${tag} indicator panel label "${g.asof}"`);
  ok(g.short.st === 'ok' && (lang === 'en' ? /short history \(0\.6 yrs\)/ : /ประวัติสั้น/).test(g.short.txt), `${tag} short history label`);
  ok(g.none.st === 'none' && /not a validated|ยังไม่ผ่านการทดสอบ/.test(g.none.txt), `${tag} no record -> old line`);
  ok((lang === 'en' ? /up to two days later than it did before Phase 1/ : /ช้ากว่าก่อน Phase 1 ได้ถึง 2 วัน/).test(g.help) && /09:10 JST/.test(g.help), `${tag} timing note in the card help`);
  ok(g.ov <= 0, `${tag} markets no sideways scroll (${g.ov})`);
  if (nm !== 'phone360') { await p.locator('#mtop').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${SHOT}/v54-${tag}-markets.png` }); await p.locator('#planBox').scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await p.locator('#planBox').screenshot({ path: `${SHOT}/v54-${tag}-plan.png` }).catch(() => {}); }
  // strip link selects the token
  if (g.btn.includes('ETH')) { await p.click('#chg button[data-sel="ETH"]'); await p.waitForTimeout(400); ok(await p.evaluate(() => S.sel) === 'ETH', `${tag} strip link opens the token`); }
  // pattern rule (pure render with fixture types)
  const pr = await p.evaluate((bt) => { PT.bt = bt; PT.tf = '1d'; const d = document.createElement('div');
    const line = (ty) => { d.innerHTML = pTypeLine({ type: ty }); const e = d.querySelector('[data-ptrule]'); return e ? [e.dataset.ptrule, e.textContent] : ['legacy', d.textContent]; };
    const scope = (ty) => { d.innerHTML = pTypeLine({ type: ty }); const e = d.querySelector('[data-ptrule]'); return e ? e.dataset.ptscope : null; };
    return { weak: line('atri'), good: line('chdn'), few: line('dtop'), rec: pTypeRec('atri'), poolWeak: line('cup'), poolScope: scope('cup'), poolOk: line('dbot'), tfScope: scope('atri') }; }, PBT);
  ok(pr.weak[0] === 'weak' && /11%/.test(pr.weak[1]) && pr.rec.weak, `${tag} pattern type < 35% at nEff 41 is greyed with its rate: ${pr.weak[1]}`);
  ok(pr.poolWeak[0] === 'weak' && pr.poolScope === 'any' && (lang === 'en' ? /all timeframes \(1D alone has fewer than 30 cases\)/ : /ทุกกรอบเวลา/).test(pr.poolWeak[1]) && /14%/.test(pr.poolWeak[1]), `${tag} F1: 1D under 30 -> pooled record greys a weak type: ${pr.poolWeak[1]}`);
  ok(pr.poolOk[0] === 'ok' && pr.tfScope === 'tf', `${tag} F1: pooled strong type not greyed; a timeframe with nEff >= 30 is used as is`);
  ok(pr.good[0] === 'ok', `${tag} strong type shown normally`); ok(pr.few[0] === 'few' && /n=25/.test(pr.few[1]), `${tag} 1D nEff 22, pooled nEff 25 -> not enough cases (pooled n): ${pr.few[1]}`);
  // #/record
  await p.goto(B + '#/record'); await p.waitForSelector('.prft', { timeout: 30000 }); await p.waitForTimeout(400);
  const r = await p.evaluate(() => ({ t: document.querySelector('#main').innerText, ov: document.documentElement.scrollWidth - innerWidth, nav: !!document.querySelector('a[href="#/record"]'),
    // audit F2: every result cell must be on screen, and no table may scroll sideways inside its wrapper
    off: [...document.querySelectorAll('.prft td[data-col]')].filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect()).filter((b) => b.right > innerWidth + 1 || b.left < -1).length,
    cells: [...document.querySelectorAll('.prfbt td[data-col="h7"]')].filter((e) => e.offsetParent).length,
    inner: [...document.querySelectorAll('.prf-wrap')].filter((w) => w.offsetParent).map((w) => w.scrollWidth - w.clientWidth).filter((x) => x > 1).length,
    held: (document.querySelector('.prfbt td[data-col="test"]') || {}).dataset?.l, dir: !!document.querySelector('[data-prfdir]') && !!document.querySelector('[data-prfdirnote]') }));
  if (vp.width < 600) ok(r.cells > 0 && r.off === 0 && r.inner === 0, `${tag} F2: every +7d / held-out cell on screen, no sideways table scroll (${r.cells} cells, ${r.off} off-screen, ${r.inner} scrolling)`);
  ok(r.dir && (lang === 'en' ? /graded in the pattern's direction/ : /วัดผลตามทิศของแพทเทิร์น/).test(r.t), `${tag} F4: pattern rows say they are graded in the pattern's direction`);
  ok(r.nav, `${tag} Track record in the menu`);
  ok((lang === 'en' ? /\+0\.8%\s*n=25/ : /\+0\.8%\s*n=25/).test(r.t) && (lang === 'en' ? /not enough samples \(n=12\)/ : /ตัวอย่างไม่พอ \(n=12\)/).test(r.t), `${tag} ledger cells gated on nEff`);
  ok((lang === 'en' ? /short history/ : /ประวัติสั้น/).test(r.t) && r.held === (lang === 'en' ? 'Held-out 30%' : 'ช่วงทดสอบ 30%'), `${tag} backtest table: short history + held-out column (${r.held})`); // phones show labels per card, not in a header
  ok(r.ov <= 0, `${tag} record no sideways scroll (${r.ov})`);
  if (nm !== 'phone360') await p.screenshot({ path: `${SHOT}/v54-${tag}-record.png`, fullPage: true });
  // no visit since: empty strip message
  if (nm === 'desktop' && theme === 'light') { await p.evaluate(() => localStorage.setItem('cw-chg-seen', String(Date.now()))); await p.goto(B + '#/markets'); await p.reload(); await p.waitForSelector('#chg .chg', { timeout: 60000 });
    ok(/No signal changes since your last visit|ไม่มีสัญญาณเปลี่ยน/.test(await p.textContent('#chg')), `${tag} nothing new -> says so`); }
  await c.close();
}
await b.close();
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS proof-ui'); process.exit(fails.length ? 1 : 0);
