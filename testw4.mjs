import { chromium } from 'playwright-core';
const U = process.env.U || 'http://localhost:8787/', S = process.env.S || 'shots/w3-';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const g = { groups: [{ id: 'boba', name: 'boba', wallets: [{ addr: '0x636B3d51dE9A7F3F48BD0a63a00f0e840951E53c', label: 'monad-chog', type: 'evm' }, { addr: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', label: 'vitalik', type: 'evm', tag: 'longterm' }, { addr: '86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY', label: 'toly', type: 'sol', tag: 'treasury' }, { addr: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', label: 'genesis', type: 'btc' }] }, { id: 'hl', name: 'perps', wallets: [{ addr: '0x5b5d51203a0f9079f8aeb098a6523a13f298c060', label: 'hl whale', type: 'evm', tag: 'trading' }] }], sel: 'all', range: '7d' };
const runs = (process.env.RUNS || 'desk:en:dark,desk:en:light,phone:en:dark,phone:en:light').split(',');
for (const r of runs) { const [n, lang, cs] = r.split(':'); const vp = n === 'phone' ? { width: 390, height: 844 } : { width: 1440, height: 900 }; const tag = `${n}-${lang}-${cs}`;
  const c = await b.newContext({ viewport: vp, colorScheme: cs, deviceScaleFactor: 2, hasTouch: n === 'phone' }); const p = await c.newPage(); const errs = [];
  p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(m.text().slice(0, 140))); p.on('pageerror', (e) => errs.push('PE ' + e.message));
  await p.addInitScript(([g, l, cs]) => { if (!sessionStorage.x) { localStorage.setItem('kms-wallets', JSON.stringify(g)); localStorage.setItem('cw-lang', l); localStorage.setItem('cw-theme-v', cs); sessionStorage.x = 1; } }, [g, lang, cs]);
  await p.goto(U + '#/portfolio'); await p.waitForFunction(() => !document.querySelector('.wib.spin') && document.querySelector('.trow'), null, { timeout: 240000 }).catch(() => console.log('timeout')); await p.waitForTimeout(6000);
  const T = async (s) => (await p.locator(s).first().innerText().catch(() => '')).replace(/\n/g, ' | ').slice(0, 400);
  console.log('==', tag, 'HERO', await T('.whero'), 'ALLOC', await T('.walloc'));
  console.log('pills', await p.evaluate(() => [...document.querySelectorAll('.wtop .wpill')].map((e) => { const r = e.getBoundingClientRect(); return [r.top, r.height]; })));
  console.log('chart', await p.evaluate(() => { const c = document.querySelector('.wchart'); return c && [c.dataset.pts && c.dataset.pts.slice(0, 80), document.querySelector('.waxis') && document.querySelector('.waxis').innerText]; }));
  await p.screenshot({ path: S + tag + '-top.png' }); await p.screenshot({ path: S + tag + '-full.png', fullPage: true });
  if (tag === 'desk-en-dark') {
    console.log('CHOG', await p.evaluate(() => { const C = JSON.parse(localStorage.getItem('kms-wcache3')); const k = Object.keys(C).find((k) => /636b3d51/i.test(k)); return k && C[k].h.filter((x) => x.chain === 'monad').map((x) => x.sym + ':' + Math.round(x.v || 0)); }));
    const box = await p.locator('.wchart[data-pts]').boundingBox(); if (box) { await p.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2); await p.waitForTimeout(200); console.log('SCRUB', await T('.whero')); await p.locator('.wmain').screenshot({ path: S + 'scrub.png' }); await p.mouse.move(5, 5); }
    for (const rg of ['30d', '1y']) { await p.click(`[data-wrg="${rg}"]`); await p.waitForTimeout(8000); console.log(rg, await T('.whero'), await T('.waxis')); await p.locator('.wmain').screenshot({ path: S + 'chart-' + rg + '.png' }); }
    await p.locator('.wleg button').first().click(); await p.waitForTimeout(400); console.log('FILT', await T('.wfchip'), await T('#ws-tok')); await p.screenshot({ path: S + 'filter.png' });
    await p.click('[data-walloc="chain"]'); await p.waitForTimeout(400); await p.locator('.walloc').screenshot({ path: S + 'alloc-chain.png' });
  }
  console.log('ERR', errs.slice(0, 6)); await c.close(); }
await b.close();