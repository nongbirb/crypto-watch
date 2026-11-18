// Phase 5 Business pulse card in Chromium (docs/business-pulse-p5.md): one card per token on the token page, up to three numbers,
// each with its 30-day change (or when it will appear) and a source link; ratios state "last 30 days x 12"; left-out figures named;
// a missing value omits its line; no buy / sell wording; desktop + phones 390 / 360, EN + TH, light + dark, no sideways scroll.
// Data: tests/fixtures/pulse/pulse.json (a real build of scripts/pulse.py on 2026-11-15). Usage: node tests/pulse-ui.mjs [baseUrl]
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/', SHOT = process.env.SHOT || '';
const FX = readFileSync(new URL('./fixtures/pulse/pulse.json', import.meta.url), 'utf8'), P = JSON.parse(FX);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };
if (SHOT) mkdirSync(SHOT, { recursive: true });
async function open(w, lang, scheme, body = FX) {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, serviceWorkers: 'block', isMobile: w < 600, hasTouch: w < 600, colorScheme: scheme });
  await c.addInitScript((l) => localStorage.setItem('cw-lang', l), lang);
  await c.route('**/data/pulse.json*', (r) => r.fulfill({ contentType: 'application/json', body }));
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '#/markets'); await p.waitForSelector('#pulseBox .pu, #pulseBox p.sub', { timeout: 90000 });
  return { c, p, errs };
}
const card = (p, sym) => p.evaluate((sym) => { S.sel = sym; renderDetail(); const box = document.querySelector('#pulseBox');
  return { h: box.querySelector('h2').textContent, age: (box.querySelector('[data-puage]') || {}).textContent || '', lines: [...box.querySelectorAll('.pu-l')].map((l) => ({ key: l.dataset.pu, txt: l.innerText.replace(/\s+/g, ' '),
    chg: l.querySelector('[data-puchg]').dataset.puchg || 'yes', chgTxt: l.querySelector('[data-puchg]').textContent, win: (l.querySelector('[data-puwin]') || {}).textContent || '',
    src: [...l.querySelectorAll('.pu-m a')].map((a) => a.href) })), not: (box.querySelector('[data-punot]') || {}).textContent || '', all: box.innerText }; }, sym);
const overflow = (p) => p.evaluate(() => { const W = document.documentElement.clientWidth, m = document.querySelector('#pulseBox');
  const out = [...m.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1; }).map((e) => e.className || e.tagName);
  return { doc: document.documentElement.scrollWidth > W, out: [...new Set(out)].slice(0, 6) }; });
const NOADVICE = /\b(sell|selling|bullish|bearish|undervalued|overvalued|cheap|expensive|should|accumulate|opportunity)\b|\bbuy\b(?!backs?)/i;

// 1) desktop EN: every token's card is the stored card, nothing else
{ const { c, p, errs } = await open(1280, 'en', 'light');
  for (const sym of Object.keys(P.cards)) {
    const g = await card(p, sym), want = P.cards[sym];
    ok(g.h === 'Business pulse' && /Updated/.test(g.age), `${sym}: card with its data age`);
    ok(g.lines.length === want.length && g.lines.length <= 3 && g.lines.every((l, i) => l.key === want[i].key), `${sym}: ${g.lines.length} numbers, exactly the stored card (${g.lines.map((l) => l.key).join(', ')})`);
    ok(g.lines.every((l) => l.src.length && l.src.every((u) => u.startsWith('https://'))), `${sym}: every number links its source`);
    ok(g.lines.every((l, i) => (want[i].chg == null ? l.chg === 'none' && /30-day change from|no 30-day change yet/.test(l.chgTxt) : l.chg === 'yes' && /vs (the )?30 days/.test(l.chgTxt))), `${sym}: each number shows its 30-day change, or from when it will`);
    ok(g.lines.every((l, i) => !want[i].annualise || /÷ \(sum of the last 30 days × 12\)/.test(l.win)), `${sym}: ratios state the window they annualise`);
    ok(!NOADVICE.test(g.all), `${sym}: no buy / sell wording`);
  }
  const a = await card(p, 'AAVE'), r = a.lines.find((l) => l.key === 'aave.rev'), w = P.cards.AAVE.find((x) => x.key === 'aave.rev');
  ok(r.txt.includes('Aave revenue, 30 days') && r.txt.includes('$5.5M') && r.chgTxt.startsWith(`+${w.chg.toFixed(1)}%`) && /30 days to Nov 14 \(UTC\)/.test(r.txt), `AAVE revenue: value, % change vs the 30 days before, the window (${r.txt})`);
  const u = a.lines.find((l) => l.key === 'aave.util'); ok(/42\.9%/.test(u.txt) && /\+2\.28 pp/.test(u.chgTxt), `AAVE utilisation in percentage points (${u.txt})`);
  const m = await card(p, 'MON'); ok(/unlock on Nov 24: 16\.76% of max supply/.test(m.lines[0].txt), 'MON: the unlock line names its date and inputs');
  const bt = await card(p, 'BTC'); ok(/Not shown: spot ETF flows \(no free source the builder can read\)/.test(bt.not), `BTC: the left-out ETF flow is named with the reason (${bt.not})`);
  const l = await card(p, 'LIT'); ok(/perp volume share \(DefiLlama's endpoint for it is paid\)/.test(l.not), 'LIT: perp volume left out because the endpoint is paid');
  ok(!errs.length, 'no page errors ' + errs.join(';'));
  if (SHOT) { await card(p, 'AAVE'); await p.locator('#pulseBox').screenshot({ path: `${SHOT}/v58-pulse-aave-desktop-en.png` }); }
  await c.close(); }
// 2) a missing value omits its line (here: no Aave borrowed series) and nothing is estimated in its place
{ const Q = JSON.parse(FX); Q.cards.AAVE = Q.cards.AAVE.filter((x) => x.key !== 'aave.util');
  const { c, p, errs } = await open(1280, 'en', 'light', JSON.stringify(Q)); const g = await card(p, 'AAVE');
  ok(g.lines.map((x) => x.key).join() === 'aave.rev,aave.mcr' && !/utili[sz]ation/i.test(g.all), 'missing value: the line is omitted');
  ok(!errs.length, 'no page errors ' + errs.join(';')); await c.close(); }
// 3) unavailable file: said so, no numbers
{ const c = await b.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' }); await c.route('**/data/pulse.json*', (r) => r.fulfill({ status: 404, body: 'nf' }));
  const p = await c.newPage(); await p.goto(B + '#/markets'); await p.waitForSelector('#pulseBox p.sub', { timeout: 90000 });
  ok(/Business pulse: Unavailable/.test(await p.textContent('#pulseBox')), 'file missing: "Unavailable", no numbers'); await c.close(); }
// 4) phones and desktop, EN + TH, light + dark: no sideways scroll
for (const [w, lang, scheme] of [[390, 'en', 'dark'], [390, 'th', 'light'], [360, 'en', 'light'], [360, 'th', 'dark'], [1280, 'th', 'dark']]) {
  const { c, p, errs } = await open(w, lang, scheme), tag = `${w}-${lang}-${scheme}`;
  for (const sym of ['HYPE', 'LIT', 'MON', 'NEAR']) {
    const g = await card(p, sym); const ov = await overflow(p);
    ok(!ov.doc && !ov.out.length, `${tag} ${sym}: no sideways scroll ${JSON.stringify(ov)}`);
    if (lang === 'th') ok(g.h === 'ตัวเลขพื้นฐาน' && g.lines.every((l) => /แหล่งข้อมูล/.test(l.txt)), `${tag} ${sym}: Thai labels`);
  }
  ok(!errs.length, `${tag} no page errors ` + errs.join(';'));
  if (SHOT) { await card(p, 'LIT'); await p.locator('#pulseBox').screenshot({ path: `${SHOT}/v58-pulse-lit-${tag}.png` }); }
  await c.close(); }
await b.close();
console.log(`PASS pulse-ui: ${n} checks (stored card per token, sources, 30-day changes, ratio windows, left-out reasons, missing value omitted, unavailable, no advice wording, phones EN/TH light/dark)`);
