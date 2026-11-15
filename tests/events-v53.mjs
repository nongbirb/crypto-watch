// v53 Events scoring fixes in Chromium, phone + desktop, EN + TH. Usage: node tests/events-v53.mjs  (server on U, default :8787)
// Checks: flat = no call (not right/wrong), summary priced-in sentence agrees with the badge, headline CPI row + consensus sources,
// scorecard "no call" count, Recent list result chip separate from the priced-in chip, waiting macro shows the source date, no sideways scroll.
import fs from 'node:fs';
import { chromium } from '../node_modules/playwright-core/index.mjs';
import E from '../events-core.js';
const B = process.env.U || 'http://localhost:8787/', ID = '2026-11-10-cpi';
const ev = JSON.parse(fs.readFileSync(`data/events/${ID}.json`));
const bv = E.verdict({ d1: ev.post.d1.BTC.pct, toExp: ev.post.to_expiry.BTC.pct, implied: ev.pre.implied.BTC });
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); else console.log('ok', m); };
for (const [vp, nm] of [[{ width: 390, height: 844 }, 'phone'], [{ width: 360, height: 780 }, 'phone360'], [{ width: 1280, height: 900 }, 'desktop']]) for (const lang of ['en', 'th']) {
  const tag = `${nm}-${lang}`, c = await b.newContext({ viewport: vp, serviceWorkers: 'block' }), p = await c.newPage();
  p.on('pageerror', (e) => fails.push(`${tag} PAGEERROR ${e.message}`));
  await c.addInitScript((l) => localStorage.setItem('cw-lang', l), lang);
  await p.goto(B + `#/events/${ID}`); await p.waitForSelector('[data-evcmp]', { timeout: 30000 }); await p.waitForTimeout(2000);
  const g = await p.evaluate(() => { const q = (s) => [...document.querySelectorAll(s)]; const t = (s) => q(s).map((e) => e.innerText.trim());
    const sum = document.querySelector('[data-evsum]'), pill = document.querySelector('[data-evpill="BTC"]');
    return { ov: document.documentElement.scrollWidth - innerWidth, sumv: sum.dataset.evsumv, summove: sum.dataset.evsummove, sum: sum.innerText, pill: pill && [...pill.classList].find((k) => k === 'priced' || k === 'surprise'),
      h1: t('[data-evres="BTC-h1"]')[0], d1: t('[data-evres="BTC-d1"]')[0], also: t('[data-evalsorow]'), src: t('[data-evcssrc]'), tally: t('[data-evtally]')[0], score: t('[data-evscore]'), pichip: q('[data-evpichip]').length, srcwait: t('[data-evsrcwait]'), rule: q('[data-evflatrule]').length }; });
  ok(g.ov <= 0, `${tag} no sideways scroll`);
  ok(g.pill === bv.key && g.sumv === bv.key, `${tag} summary verdict (${g.sumv}) = badge (${g.pill}) = rule (${bv.key})`);
  ok(g.summove && g.summove.replace('−', '-') === (bv.move > 0 ? '+' : '') + bv.move.toFixed(2) + '%' && g.sum.includes(g.summove), `${tag} summary uses the badge's move ${g.summove} (release -> expiry), not the 1d move`);
  ok(/Direction matched|ทิศทางตรง/.test(g.h1), `${tag} BTC 1h right: ${g.h1}`);
  ok(/Flat · no call|ไม่นับ \(flat\)/.test(g.d1) && !/matched|missed|ตรง|พลาด/.test(g.d1), `${tag} BTC 1d flat = no call: ${g.d1}`);
  ok(g.also.length === 1 && g.also[0].includes('0.4%') && g.also[0].includes('0.3%'), `${tag} headline CPI row 0.4% vs 0.3%`);
  ok(g.src.length >= 2 && g.src.every((s) => s.includes('Bloomberg') && s.includes('FactSet')), `${tag} consensus source named on each row`);
  // headline row: Bloomberg stays the locked consensus; FactSet's own headline figure from the file's cross_check text, stated plainly (not "cross-check")
  const fsH = (/headline\s+(-?\d+(?:\.\d+)?%)/i.exec(ev.consensus.cross_check.source) || [])[1];
  ok(fsH && g.also[0].includes(lang === 'en' ? `FactSet: ${fsH}` : `FactSet คาด ${fsH}`) && !/cross-check|เทียบกับ/.test(g.also[0]) && g.also[0].includes('Bloomberg'), `${tag} headline row: Bloomberg consensus + plain FactSet ${fsH}`);
  ok(/cross-check|เทียบกับ/.test(g.src[0]), `${tag} core row keeps the FactSet cross-check`);
  ok(/1 no call|ไม่นับ 1/.test(g.tally || ''), `${tag} scorecard shows the no-call count: ${g.tally}`);
  // Phase 4 audit L4: "Recent" lists the 4 newest released events, so the CPI row leaves it as later events are released. The chip
  // check reads that list with the page clock fixed to 2 days after the CPI release (Playwright clock; only Date changes, timers run).
  await p.clock.setFixedTime(new Date(Date.parse(ev.at) + 2 * 864e5)); await p.reload(); await p.waitForSelector('[data-evcmp]', { timeout: 30000 }); await p.waitForTimeout(2000);
  const rc = await p.evaluate((id) => { const row = document.querySelector(`.evrecent a[href$="${id}"]`); return { score: row ? [...row.querySelectorAll('[data-evscore]')].map((e) => e.innerText.trim()) : [], pichip: row ? row.querySelectorAll('[data-evpichip]').length : 0 }; }, ID);
  ok(rc.score.some((s) => /flat · no call|ไม่นับ \(flat\)/.test(s)) && rc.pichip > 0, `${tag} Recent: 1d result chip + separate priced-in chip`);
  ok(g.srcwait.length > 0 && g.srcwait.every((s) => /latest|ล่าสุด/.test(s) && !/\d+\.\d+%/.test(s)), `${tag} waiting macro shows source date, no number`);
  ok(g.rule === 1, `${tag} flat rule text in Replay`);
  await c.close();
}
await b.close();
if (fails.length) { console.error('FAIL\n' + fails.join('\n')); process.exit(1); }
console.log('PASS events-v53');
