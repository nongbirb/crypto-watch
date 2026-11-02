import { chromium } from 'playwright-core';
const U = process.env.U || 'http://localhost:8787/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const [n, vp] of [['desk', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, deviceScaleFactor: 2 }); const p = await c.newPage();
  await p.goto(U + '#/onchain/flows'); await p.waitForSelector('.sankey svg .rib', { timeout: 60000 }); await p.waitForTimeout(1500);
  const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const r = await p.evaluate(() => new Promise((res) => { let f = 0, lt = 0, ltT = 0, worst = 0, last = performance.now(); const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => { lt++; ltT += e.duration; })); po.observe({ entryTypes: ['longtask'] });
    const t0 = performance.now(); const tick = (t) => { f++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 5000) requestAnimationFrame(tick); else { po.disconnect(); res({ fps: +(f / 5).toFixed(1), worstFrameMs: Math.round(worst), longTasks: lt, longTaskMs: Math.round(ltT) }); } }; requestAnimationFrame(tick);
    let i = 0; const iv = setInterval(() => { const s = document.querySelector('.sankey'); const rc = s.getBoundingClientRect(); s.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: rc.left + rc.width * ((i++ % 20) / 20), clientY: rc.top + 200 + (i % 7) * 60 })); }, 50); setTimeout(() => clearInterval(iv), 5000); }));
  const m = await cdp.send('Performance.enable').then(() => cdp.send('Performance.getMetrics'));
  console.log(n, JSON.stringify(r), 'nodes', await p.evaluate(() => document.querySelectorAll('.sankey svg *').length)); await c.close(); }
await b.close();
