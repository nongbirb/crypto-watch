// v47 regressions: short sidebar reachability, unique token integer, Smart Money clarity/math/help.
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/playwright-core/index.mjs';
const B = process.env.U || 'http://localhost:8787/';
const SHOT = process.env.SHOT || '/workspace/v47_preview';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const fails = [];

async function shot(p, name) { await p.screenshot({ path: `${SHOT}/${name}.png`, fullPage: false }).catch(() => {}); }

// --- unit-ish Smart Money percent helpers via page sandbox ---
{
  const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  const p = await c.newPage();
  await p.goto(B + '#/smart');
  await p.waitForFunction(() => typeof smBar === 'function' && typeof smAggSel === 'function', null, { timeout: 60000 }).catch(() => null);
  // Wait for smart money module + optional data
  await p.waitForTimeout(2500);
  const math = await p.evaluate(() => {
    // Fail case: count% and notional% diverge; lean bar must follow notional.
    const longPct = 80, longPctNtl = 20;
    const barCount = smBar(longPct);
    const barNtl = smBar(longPctNtl);
    const w = (html) => { const m = html.match(/width:([0-9.]+)%/); return m ? +m[1] : null; };
    // Gross long+short must NOT be framed as % of one-sided OI in markup.
    const html = document.body.innerHTML;
    return {
      countW: w(barCount), ntlW: w(barNtl),
      hasOiRatio: /% of OI|ของ OI/.test(html),
      hasWhaleTape: /เทปวาฬสด|Live whale tape/.test(html),
      hasLiveLabel: /รายการเทรดใหญ่ \(สด\)|Large exchange trades \(live\)/.test(html),
      hasIntro: !!document.querySelector('.sm-intro'),
      helpCount: document.querySelectorAll('.ui-help').length,
      assetv: typeof ASSETV !== 'undefined' ? ASSETV : null,
    };
  });
  assert.equal(math.countW, 80);
  assert.equal(math.ntlW, 20);
  assert.notEqual(math.countW, math.ntlW);
  assert.equal(math.hasOiRatio, false, 'must not claim sample gross is % of OI');
  assert.equal(math.hasWhaleTape, false);
  assert.equal(math.hasLiveLabel, true);
  assert.equal(math.hasIntro, true);
  assert.ok(math.helpCount >= 3, 'expected accessible ? helps');
  assert.equal(math.assetv, Number(process.env.EXPECT_ASSETV || 57));
  // Help open / Escape / outside close
  const help = p.locator('.ui-help summary').first();
  await help.focus(); await help.press('Enter');
  assert.equal(await p.locator('.ui-help[open]').count(), 1);
  await p.keyboard.press('Escape');
  assert.equal(await p.locator('.ui-help[open]').count(), 0);
  await help.click();
  assert.equal(await p.locator('.ui-help[open]').count(), 1);
  await p.locator('#main').click({ position: { x: 20, y: 20 } });
  assert.equal(await p.locator('.ui-help[open]').count(), 0);
  // Cohorts switch stays separate
  await p.locator('[data-smcoh="size"]').click();
  await p.waitForTimeout(800);
  assert.equal(await p.locator('[data-smcoh="size"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await p.locator('[data-smcoh="profit"]').getAttribute('aria-pressed'), 'false');
  await shot(p, 'smart-en-desktop');
  // TH + BTC filter
  await p.evaluate(() => { localStorage.setItem('cw-lang', 'th'); location.reload(); });
  await p.waitForFunction(() => document.documentElement.lang === 'th' || localStorage.getItem('cw-lang') === 'th', null, { timeout: 20000 });
  await p.goto(B + '#/smart');
  await p.waitForTimeout(3000);
  const th = await p.evaluate(() => ({
    tape: !!document.body.innerText.includes('รายการเทรดใหญ่ (สด)'),
    whale: document.body.innerText.includes('เทปวาฬสด'),
    intro: !!document.querySelector('.sm-intro'),
  }));
  assert.equal(th.tape, true);
  assert.equal(th.whale, false);
  assert.equal(th.intro, true);
  const btc = p.locator('button.chip[data-smsel="BTC"]');
  if (await btc.count()) { await btc.click(); await p.waitForTimeout(1000); }
  await shot(p, 'smart-th-btc');
  // Malformed / missing snapshot should not blank page
  await p.evaluate(() => { SM.d = null; SM.err = 'fixture-missing'; pSmart(true); });
  await p.waitForTimeout(500);
  const miss = await p.evaluate(() => ({ blank: (document.querySelector('#main')?.textContent || '').trim().length < 40, hasErr: /unavailable|ไม่ได้|fixture-missing/i.test(document.querySelector('#main')?.textContent || '') }));
  assert.equal(miss.blank, false);
  assert.equal(miss.hasErr, true);
  // Safe labeled tape fixture
  await p.evaluate(() => {
    SM.err = null;
    SM.tr = [{ ex: 'binance', m: 'F', s: 'BTC', side: 'B', p: 75000, q: 2, v: 150000, t: Date.now(), big: 1 }];
    SM.thr = 1e5; SM.mkt = 'A'; SM.sel = 'BTC';
    smLive();
  });
  await p.waitForTimeout(300);
  assert.ok(await p.locator('.smtape .smtr').count() >= 1);
  await shot(p, 'smart-fixture-tape');
  await c.close();
}

// --- Flows unique token integer, no logos/+N ---
{
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const p = await c.newPage();
  await p.goto(B + '#/onchain/flows');
  await p.waitForSelector('#ixStats', { timeout: 60000 });
  await p.waitForTimeout(2500);
  const flows = await p.evaluate(() => {
    const boxes = [...document.querySelectorAll('#ixStats .ixbox')];
    const tok = boxes.find((b) => /Unique tokens|จำนวนเหรียญ/.test(b.querySelector('.eyebrow')?.textContent || ''));
    const val = tok?.querySelector('b.num')?.textContent?.trim() || '';
    return {
      val,
      hasStack: !!tok?.querySelector('.ixstack'),
      hasPlus: /\+\d/.test(tok?.textContent || ''),
      hasImg: !!tok?.querySelector('img'),
      integerOk: val === '–' || /^\d{1,3}(,\d{3})*$/.test(val),
      pageLen: (document.querySelector('#main')?.textContent || '').length,
    };
  });
  assert.equal(flows.hasStack, false);
  assert.equal(flows.hasPlus, false);
  assert.equal(flows.hasImg, false);
  assert.equal(flows.integerOk, true);
  assert.match(flows.val, /^\d{1,3}(,\d{3})*$/, 'expected integer unique tokens when full selection, got ' + flows.val);
  assert.ok(flows.pageLen > 80);
  await shot(p, 'flows-unique');
  // Force missing tokenCount
  await p.evaluate(() => {
    if (IX?.d?.stats) { IX.d.stats.tokenCount = null; ixStats(ixAgg()); }
  });
  await p.waitForTimeout(200);
  const miss = await p.evaluate(() => {
    const boxes = [...document.querySelectorAll('#ixStats .ixbox')];
    const tok = boxes.find((b) => /Unique tokens|จำนวนเหรียญ/.test(b.querySelector('.eyebrow')?.textContent || ''));
    return tok?.querySelector('b.num')?.textContent?.trim();
  });
  assert.equal(miss, '–');
  await shot(p, 'flows-unique-missing');
  await c.close();
}

// --- Sidebar short height: nav scrolls, footer reachable, Settings keyboard ---
for (const [name, viewport] of [['short-1280x600', { width: 1280, height: 600 }], ['short-800x600', { width: 800, height: 600 }], ['wide', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport, serviceWorkers: 'block' });
  const p = await c.newPage();
  await p.goto(B + '#/markets');
  await p.waitForTimeout(1500);
  const side = await p.evaluate(() => {
    const nav = document.querySelector('.side .nav');
    const foot = document.querySelector('.side-foot');
    const gear = document.querySelector('.side-act [data-gear]');
    const settings = [...document.querySelectorAll('#sideNav a')].find((a) => /settings|ตั้งค่า/i.test(a.textContent || '') || a.getAttribute('href') === '#/settings');
    const wallets = [...document.querySelectorAll('#sideNav a, #tabBar a')].some((a) => /wallets|กระเป๋า/i.test(a.textContent || '') && a.getAttribute('href') === '#/portfolio');
    const cs = nav ? getComputedStyle(nav) : {};
    const footRect = foot?.getBoundingClientRect();
    const navRect = nav?.getBoundingClientRect();
    return {
      desktop: matchMedia('(min-width:1024px)').matches,
      overflowY: cs.overflowY,
      flex: cs.flexGrow || cs.flex,
      minH: cs.minHeight,
      footBottom: footRect ? footRect.bottom : null,
      navBottom: navRect ? navRect.bottom : null,
      vh: innerHeight,
      gearTab: gear ? gear.tabIndex : null,
      gearTag: gear?.tagName,
      settingsHref: settings?.getAttribute('href') || null,
      walletsVisible: wallets,
      navCount: document.querySelectorAll('#sideNav a').length,
    };
  });
  if (side.desktop) {
    assert.ok(['auto', 'scroll', 'overlay'].includes(side.overflowY), name + ' nav overflow ' + side.overflowY);
    assert.ok(side.footBottom <= side.vh + 1, name + ' footer below viewport ' + side.footBottom);
    assert.equal(side.gearTag, 'BUTTON');
    assert.equal(side.settingsHref, '#/settings');
    assert.equal(side.walletsVisible, false);
    assert.ok(side.navCount >= 8, 'menus preserved');
    // Keyboard: Tab to gear / open settings link
    await p.locator('.side-act [data-gear]').focus();
    assert.ok(await p.evaluate(() => document.activeElement?.matches('[data-gear]')));
    await p.locator('#sideNav a[href="#/settings"]').focus();
    assert.ok(await p.evaluate(() => document.activeElement?.getAttribute('href') === '#/settings'));
  }
  await shot(p, 'sidebar-' + name);
  await c.close();
}

await b.close();
console.log('PASS v47 sidebar, flows unique tokens, smart money clarity/math/help');
