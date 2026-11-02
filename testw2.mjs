import { chromium } from 'playwright-core';
const U = process.env.U || 'http://localhost:8787/', S = process.env.S || 'shots/w2-';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const g = { groups: [{ id: 'boba', name: 'boba', wallets: [{ addr: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', label: 'vitalik', type: 'evm', tag: 'longterm' }, { addr: '86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY', label: 'toly', type: 'sol', tag: 'treasury' }, { addr: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', label: 'genesis', type: 'btc', tag: 'cold' }] }, { id: 'hl', name: 'perps', wallets: [{ addr: '0x5b5d51203a0f9079f8aeb098a6523a13f298c060', label: 'hl whale', type: 'evm', tag: 'trading' }] }], sel: 'all', dust: false, range: '7d' };
for (const [n, vp, lang, cs] of [['desk', { width: 1280, height: 900 }, 'en', 'dark'], ['phone', { width: 390, height: 844 }, 'th', 'light']]) {
  const c = await b.newContext({ viewport: vp, colorScheme: cs, deviceScaleFactor: 2, hasTouch: n === 'phone' }); const p = await c.newPage(); const errs = [];
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 140))); p.on('pageerror', (e) => errs.push('PE ' + e.message));
  await p.addInitScript(([g, l]) => { if (!sessionStorage.x) { localStorage.setItem('kms-wallets', JSON.stringify(g)); localStorage.setItem('cw-lang', l); sessionStorage.x = 1; } }, [g, lang]);
  await p.goto(U + '#/portfolio'); await p.waitForTimeout(45000);
  const T = async (s) => (await p.locator(s).first().innerText().catch(() => '')).replace(/\n/g, ' | ').slice(0, 400);
  console.log(n, 'STATS', await T('.jstats')); console.log('SPLIT', await T('.wsplit')); console.log('HIST', await T('.whist'));
  console.log('PERP', await T('.wperp')); console.log('SPOT', await T('.wtok tbody')); console.log('CH', await T('.wchs'));
  console.log('imgs', await p.evaluate(() => [document.querySelectorAll('.lg img').length, document.querySelectorAll('.lg').length]));
  if (n === 'phone') { await p.screenshot({ path: S + 'phone-overview.png' }); await p.locator('.wperp').first().screenshot({ path: S + 'perps-phone.png' }).catch(() => {}); }
  else { await p.screenshot({ path: S + 'desk.png', fullPage: true }); await p.locator('.wperp').first().screenshot({ path: S + 'perps.png' }).catch(() => {});
    await p.click('[data-wrg="30d"]'); await p.waitForTimeout(8000); console.log('HIST30', await T('.whist')); await p.locator('.whist').screenshot({ path: S + 'history.png' });
    await p.click('[data-walloc="tag"]'); console.log('ALLOC tag', await T('.dleg'));
    await p.click('[data-wch="solana"]'); console.log('FILTER sol', await T('.jstats'), await T('.wsplit'));
    await p.click('[data-wch=""]'); await p.click('[data-whide*="0x5b5d"]'); console.log('HIDE hl', await T('.jstats'), 'perp?', await p.locator('.wperp').count());
  }
  console.log('ERR', errs.slice(0, 6)); await c.close(); }
await b.close();
