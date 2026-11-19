// v69 Stochastic settings (price.js), in Chromium: default 9/3/3; the settings button opens three number fields;
// Apply changes the switch label, the pane label, the help text and the maths; the choice is remembered after a reload;
// bad input (out of range, not a whole number) is refused with a message and changes nothing; a broken saved value falls back
// to 9/3/3; Reset returns 9/3/3; other switches keep working; no sideways scroll; phone fields are at least 44px tall.
// EN 1280 + TH 360. Usage: node tests/stoch-settings.mjs [baseUrl]
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.argv[2] || process.env.U || 'http://localhost:8787/';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok', m); };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const st = (p) => p.evaluate(() => { const f = document.querySelector('#stSet'), lb = document.querySelector('.pc-lbl[data-pl="stoch"]');
  return { stoch: [...STOCH], small: (document.querySelector('[data-ind="stoch"] small') || {}).textContent || '', open: !!f && !f.hidden,
    exp: (document.querySelector('[data-stset]') || { getAttribute: () => '' }).getAttribute('aria-expanded'), pane: lb ? lb.innerText : '',
    saved: localStorage.getItem('cw-stoch'), ind: localStorage.getItem('cw-ind'), err: ((f && f.querySelector('[data-sterr]')) || {}).textContent || '',
    help: IND_HELP().stoch, ow: document.documentElement.scrollWidth - innerWidth,
    hs: f && !f.hidden ? [...f.querySelectorAll('input,button')].map((x) => Math.round(x.getBoundingClientRect().height)) : [],
    ind_macd: (document.querySelector('[data-ind="macd"]') || { getAttribute: () => '' }).getAttribute('aria-pressed') }; });
const wait = (p) => p.waitForSelector('#pcw canvas', { timeout: 60000 }).then(() => p.waitForTimeout(2000));
const setv = async (p, v) => { for (const [k, x] of Object.entries(v)) await p.fill(`#stSet [name="${k}"]`, String(x)); await p.click('#stSet [type="submit"]'); };
for (const [lang, w, h] of [['en', 1280, 900], ['th', 360, 760]]) {
  const tag = `${lang} ${w}:`, mob = w < 768, ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(B + 'index.html#/markets'); await p.evaluate((l) => { localStorage.clear(); localStorage.setItem('cw-lang', l); localStorage.setItem('cw-sel', 'BTC'); }, lang);
  await p.reload(); await wait(p); let s = await st(p);
  ok(s.stoch.join('/') === '9/3/3' && s.small === '9/3/3' && /Stoch\w* 9\/3\/3/.test(s.pane) && !s.open && s.exp === 'false', `${tag} default 9/3/3, settings closed (${s.pane})`);
  await p.click('[data-stset]'); s = await st(p); ok(s.open && s.exp === 'true', `${tag} the settings button opens the fields`);
  if (mob) ok(s.hs.length >= 5 && s.hs.every((x) => x >= 44), `${tag} phone fields and buttons are >= 44px (${s.hs})`);
  ok(s.ow <= 0, `${tag} no sideways scroll with settings open (${s.ow})`);
  const pre = await p.evaluate(() => { const l = document.querySelector('.pc-lbl[data-pl="stoch"]'); return l ? l.innerText : ''; });
  for (const [bad, why] of [[{ n: 1, s: 3, d: 3 }, '%K period 1'], [{ n: 9, s: 21, d: 3 }, 'smoothing 21'], [{ n: 9.5, s: 3, d: 3 }, '9.5'], [{ n: '', s: 3, d: 3 }, 'empty'], [{ n: 9, s: 3, d: 0 }, '%D 0']]) {
    await setv(p, bad); s = await st(p); ok(s.stoch.join('/') === '9/3/3' && s.saved === null && s.err.length > 5 && s.open, `${tag} refuses ${why} with a message (${s.err.slice(0, 40)})`); }
  ok((await p.evaluate(() => document.querySelector('.pc-lbl[data-pl="stoch"]').innerText)) === pre, `${tag} a refused value leaves the pane alone`);
  await setv(p, { n: 14, s: 3, d: 5 }); await wait(p); s = await st(p);
  ok(s.stoch.join('/') === '14/3/5' && s.small === '14/3/5' && /Stoch\w* 14\/3\/5/.test(s.pane) && !s.open, `${tag} Apply 14/3/5 updates the switch and the pane (${s.pane})`);
  ok(s.saved === '[14,3,5]', `${tag} saved in this browser (${s.saved})`);
  ok(s.help.includes('14/3/5') && s.help.includes('14 ') && !/9\/3\/3/.test(s.help), `${tag} help text follows the numbers`);
  const m = await p.evaluate(() => { const c = S.charts[0]; const ser = c.panes().flatMap((q) => q.getSeries()); return ser.length; });
  ok(m > 0, `${tag} chart redrawn (${m} series)`);
  await p.reload(); await wait(p); s = await st(p); ok(s.stoch.join('/') === '14/3/5' && /14\/3\/5/.test(s.pane), `${tag} remembered after reload`);
  const ind0 = s.ind; await p.click('[data-ind="macd"]'); await p.waitForTimeout(1500); s = await st(p);
  ok(s.ind_macd === 'true' && s.stoch.join('/') === '14/3/5', `${tag} other switches still work and keep the Stochastic numbers`);
  await p.click('[data-ind="stoch"]'); await p.waitForTimeout(1500); s = await st(p); ok(!s.pane && s.small === '14/3/5', `${tag} Stochastic can still be switched off`);
  await p.click('[data-ind="stoch"]'); await p.waitForTimeout(1500);
  await p.click('[data-stset]'); await p.click('[data-streset]'); await wait(p); s = await st(p);
  ok(s.stoch.join('/') === '9/3/3' && /9\/3\/3/.test(s.pane) && s.saved === '[9,3,3]', `${tag} Reset returns 9/3/3`);
  await p.evaluate(() => localStorage.setItem('cw-stoch', '[0,3,"x"]')); await p.reload(); await wait(p); s = await st(p);
  ok(s.stoch.join('/') === '9/3/3', `${tag} a broken saved value falls back to 9/3/3`);
  ok(s.ow <= 0, `${tag} no sideways scroll (${s.ow})`); ok(!errs.length, `${tag} no page errors ${errs.join(' | ')}`);
  await ctx.close(); }
await b.close(); console.log(`stoch-settings: ${n} checks passed`);
