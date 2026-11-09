// v49 ETH token: shared list order, saved-list migration (one-time, removal sticks), every token feature lists ETH below BTC,
// and the immutable weekly archives keep their 8-token bytes. Usage: node tests/eth-token.mjs  (server on U, default :8787)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.env.U || 'http://localhost:8787/', SHOT = process.env.SHOT || '/workspace/v49_preview';
const ORIG = ['BTC', 'MON', 'HYPE', 'AAVE', 'LIT', 'SOL', 'NEAR', 'PENDLE'];
const tok = JSON.parse(fs.readFileSync('tokens.json')).tokens;
assert.deepEqual(tok.map((t) => t.symbol), ['BTC', 'ETH', ...ORIG.slice(1)], 'ETH directly below BTC, original 8 unchanged in order');
const eth = tok[1]; assert.equal(eth.coingecko, 'ethereum'); assert.deepEqual(eth.sources.map((s) => s.ex), ['binance', 'bybit', 'okx']);
assert.ok(fs.statSync('icons/tokens/eth.png').size > 1000, 'eth icon');
// immutable weekly archives: bytes unchanged and still 8 tokens
const SHA = { 'reports/weekly-2026-11-02.json': '2aca352abac7b123c8ae51f0bddd7d73ae941786e6ac4d216185f3e2476a258f',
  'reports/weekly-v1-2026-11-02.json': 'e29feb2c58bb244623067076afb9fab0ab9e43323d3d5f38eff3d96af26592c0',
  'reports/weekly-v1-2026-11-09.json': 'f6b350b49091fe23b99fb8ff6312b380523a4596c7b4fc01f4ab16d81c8b74e6' };
for (const [f, h] of Object.entries(SHA)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'), h, f + ' bytes changed');
for (const f of ['reports/weekly-v1-2026-11-02.json', 'reports/weekly-v1-2026-11-09.json']) assert.deepEqual(JSON.parse(fs.readFileSync(f)).watchlist.map((t) => t.symbol), ORIG, f + ' membership');
console.log('PASS tokens.json order, icon, archive SHA256 + 8-token membership');

const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
for (const [vp, nm] of [[{ width: 1440, height: 1000 }, 'desktop'], [{ width: 390, height: 844 }, 'phone']]) {
  const c = await b.newContext({ viewport: vp, serviceWorkers: 'block' }); const p = await c.newPage();
  p.on('pageerror', (e) => fails.push(`${nm} PAGEERROR ${e.message}`));
  // 1) fresh viewer: defaults
  await p.goto(B + '#/markets'); await p.waitForFunction(() => S.cfg.length > 0, null, { timeout: 30000 });
  ok((await p.evaluate(() => S.cfg.map((t) => t.symbol).join())) === 'BTC,ETH,' + ORIG.slice(1).join(), nm + ' fresh order');
  await p.waitForTimeout(6000);
  const rows = await p.$$eval('[data-sel]', (x) => [...new Set(x.map((e) => e.dataset.sel))]); ok(rows[0] === 'BTC' && rows[1] === 'ETH', nm + ' markets rows ' + rows.slice(0, 3));
  ok(!(await p.$eval('[data-sel="ETH"]', (e) => e.textContent).catch(() => 'missing')).match(/missing/), nm + ' ETH row');
  await p.screenshot({ path: `${SHOT}/markets-eth-${nm}-en.png` });
  // 2) viewer with a customised 8-token list saved before v49: ETH added once below BTC
  await p.evaluate((o) => { localStorage.clear(); localStorage.setItem('cw-tokens', JSON.stringify(o)); }, tok.filter((t) => t.symbol !== 'ETH').reverse());
  await p.reload(); await p.waitForFunction(() => S.cfg.length > 0);
  const m = await p.evaluate(() => S.cfg.map((t) => t.symbol)); ok(m.length === 9 && m[m.indexOf('BTC') + 1] === 'ETH', nm + ' migration ' + m);
  // 3) user removes ETH -> it must not come back
  await p.evaluate(() => { S.cfg = S.cfg.filter((t) => t.symbol !== 'ETH'); saveCfg(); }); await p.reload(); await p.waitForFunction(() => S.cfg.length > 0);
  ok(!(await p.evaluate(() => S.cfg.some((t) => t.symbol === 'ETH'))), nm + ' removal sticks');
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForFunction(() => S.cfg.length > 0);
  // 4) token pickers / per-token views list ETH
  await p.goto(B + '#/calendar'); await p.waitForTimeout(1500); ok(await p.evaluate(() => S.cfg.some((t) => t.symbol === 'ETH')), nm + ' calendar mine set');
  await p.goto(B + '#/smart'); await p.waitForTimeout(4000); ok(await p.evaluate(() => smSyms().indexOf('ETH') === 1), nm + ' smart money syms');
  await p.goto(B + '#/journal'); await p.waitForTimeout(1500); await p.locator('[data-jnew]:visible').first().click(); await p.waitForTimeout(600);
  ok(await p.$$eval('#jform select[name="token"] option, #jform [name="token"] option', (o) => o.map((x) => x.value || x.textContent).some((v) => /ETH/.test(v))).catch(() => false) || /ETH/.test(await p.textContent('#jform').catch(() => '')), nm + ' journal picker');
  await p.keyboard.press('Escape');
  await p.goto(B + '#/markets'); await p.waitForTimeout(4000); await p.click('[data-sel="ETH"]').catch(() => fails.push(nm + ' no ETH row click'));
  for (const tab of ['pat', 'pos']) { await p.click(`[data-tab="${tab}"]`).catch(() => {}); await p.waitForFunction(() => { const x = document.querySelector('#tabBody'); return x && !x.querySelector('.sk') && x.textContent.trim().length > 30; }, null, { timeout: 30000 }).catch(() => {}); const t = await p.textContent('#tabBody').catch(() => ''); ok(t && t.trim().length > 30 && !/TypeError|Cannot read/.test(t), `${nm} ETH ${tab} tab`); }
  if (nm === 'desktop') await p.screenshot({ path: `${SHOT}/markets-eth-pos-${nm}.png` });
  await c.close();
}
await b.close();
if (fails.length) { console.log('FAIL\n' + fails.join('\n')); process.exit(1); }
console.log('PASS ETH below BTC: fresh list, saved-list migration, removal sticks, Markets/Calendar/Smart Money/Journal/Patterns/Positioning (desktop+phone)');
