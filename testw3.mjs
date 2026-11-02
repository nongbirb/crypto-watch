import { chromium } from 'playwright-core';
const U = process.env.U || 'http://localhost:8787/', S = process.env.S || 'shots/w3-';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const g = { groups: [{ id: 'boba', name: 'boba', wallets: [{ addr: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', label: 'vitalik', type: 'evm', tag: 'longterm' }, { addr: '86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY', label: 'toly', type: 'sol', tag: 'treasury' }, { addr: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', label: 'genesis', type: 'btc' }] }, { id: 'hl', name: 'perps', wallets: [{ addr: '0x5b5d51203a0f9079f8aeb098a6523a13f298c060', label: 'hl whale', type: 'evm', tag: 'trading' }] }], sel: 'all', range: '7d' };
const runs = (process.env.RUNS || 'desk:en:dark,phone:th:light,phone:en:dark,desk:th:light').split(',');
for (const r of runs) { const [n, lang, cs] = r.split(':'); const vp = n === 'phone' ? { width: 390, height: 844 } : { width: 1280, height: 900 }; const tag = `${n}-${lang}-${cs}`;
  const c = await b.newContext({ viewport: vp, colorScheme: cs, deviceScaleFactor: 2, hasTouch: n === 'phone' }); const p = await c.newPage(); const errs = [];
  p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(m.text().slice(0, 140))); p.on('pageerror', (e) => errs.push('PE ' + e.message));
  await p.addInitScript(([g, l, cs]) => { if (!sessionStorage.x) { localStorage.setItem('kms-wallets', JSON.stringify(g)); localStorage.setItem('cw-lang', l); localStorage.setItem('cw-theme-v', cs); sessionStorage.x = 1; } }, [g, lang, cs]);
  await p.goto(U + '#/portfolio'); await p.waitForFunction(() => !document.querySelector('.wib.spin') && document.querySelector('.trow'), null, { timeout: 240000 }).catch(() => console.log('timeout')); await p.waitForTimeout(4000);
  const T = async (s) => (await p.locator(s).first().innerText().catch(() => '')).replace(/\n/g, ' | ').slice(0, 500);
  console.log('==', tag, 'HERO', await T('.whero'), 'TABS', await T('.wtabs'));
  console.log('TOK', await T('.wbody'));
  console.log('imgs', await p.evaluate(() => { const a = [...document.querySelectorAll('.trow .tl')]; return [a.length, a.filter((x) => { const i = x.querySelector(':scope>img'); return i && i.complete && i.naturalWidth > 0; }).length]; }));
  await p.screenshot({ path: S + tag + '-top.png' });
  if (tag === 'desk-en-dark') { await p.screenshot({ path: S + tag + '-full.png', fullPage: true });
    console.log('disc', await p.evaluate(() => { const C = JSON.parse(localStorage.getItem('kms-wcache3')); const L = new Set(Object.values(EVM.tokens).flat().map((t) => t[0].toLowerCase())); const h = (C[Object.keys(C).find((k) => /d8da6bf/i.test(k))] || {h:[]}).h; const d = h.filter((x) => x.addr && !L.has(x.addr.toLowerCase())); return { total: h.length, disc: d.length, discPriced: d.filter((x) => x.v >= 1 && !x.spam).map((x) => x.chain + ':' + x.sym + ':' + Math.round(x.v)).slice(0, 25), errs: (C[Object.keys(C).find((k) => /d8da6bf/i.test(k))] || {h:[]}).errs }; }));
    const box = await p.locator('.wchart[data-pts]').boundingBox(); if (box) { await p.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2); await p.waitForTimeout(200); console.log('SCRUB', await T('.whero')); await p.locator('.whero').screenshot({ path: S + 'scrub-hero.png' }); await p.mouse.move(5, 5); }
    await p.click('[data-wchsheet]'); await p.waitForTimeout(300); await p.screenshot({ path: S + 'chain-sheet.png' }); await p.click('#dlg [data-wchx="solana"]'); await p.keyboard.press('Escape'); await p.waitForTimeout(300); console.log('SOL', await T('.whero'));
    await p.click('[data-wchsheet]'); await p.click('#dlg [data-wchx=""]'); await p.keyboard.press('Escape');
    await p.locator('[data-wh10]').first().dispatchEvent('click'); console.log('H10 off', await T('.wbar')); await p.locator('[data-wh10]').first().dispatchEvent('click');
    await p.click('[data-wtab="defi"]'); await p.waitForTimeout(300); console.log('DEFI', await T('.wbody')); await p.screenshot({ path: S + 'defi.png' });
    await p.click('[data-wrg="30d"]'); await p.waitForTimeout(6000);
  }
  await p.click('[data-wtab="perps"]'); await p.waitForTimeout(300); await p.click('[data-wtip]').catch(() => {}); console.log('PERP', await T('.wbody'));
  await p.locator('.wperp3').first().screenshot({ path: S + tag + '-perps.png' }).catch(() => {});
  await p.click('[data-wtab="wallets"]'); await p.waitForTimeout(300); console.log('WAL', await T('.wbody')); if (n === 'phone') await p.screenshot({ path: S + tag + '-wallets.png' });
  await p.click('[data-wtab="tokens"]'); await p.evaluate(() => scrollTo(0, 420)); await p.waitForTimeout(500); await p.screenshot({ path: S + tag + '-tokens.png' }); await p.evaluate(() => scrollTo(0, 0));
  console.log('ERR', errs.slice(0, 6)); await c.close(); }
await b.close();
