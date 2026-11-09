/* KMS Capital – Smart Money tab. (1) Hyperliquid top-trader bias + (3) top positions from smart_money.json (GitHub Action, scheduled every 30 min but GitHub often runs it hours apart, so the page shows the real snapshot age);
   (2) live whale tape + (5) big buys vs sells from public trade websockets (Hyperliquid, Binance, OKX, Bybit; perps + spot) — only while this tab is open. No keys. Nearby fills are grouped heuristically, not identified wallet orders. */
'use strict';
const SM = { d: null, err: null, mk: null, mkT: 0, sel: store.get('kms-sm-sel', 'ALL'), coh: store.get('kms-sm-coh', 'profit'), mkt: store.get('kms-sm-mkt', 'A'), thr: store.get('kms-sm-thr', 1e5), ws: {}, st: {}, tr: [], okx: null, raf: 0, retry: {}, hb: 0 };
const SM_FLOOR = 5e4, SM_KEEP = 864e5, SM_EX = ['hyperliquid', 'binance', 'okx', 'bybit'];
/* sockets: perps on every venue; spot on Binance/OKX/Bybit (own sockets) and Hyperliquid (same socket, '@n' pair names) */
const SM_SOCK = ['hyperliquid', 'binance', 'okx', 'bybit', 'binance_s', 'okx_s', 'bybit_s'];
/* verified spot listings (checked against each venue's ticker vs perp price, Nov 2026). Binance LITUSDT is Litentry, not Lighter → excluded; Binance has no MON spot. */
const SM_SPOT_X = { binance: ['LIT', 'MON'] };
const SM_HLSPOT = { BTC: '@142', HYPE: '@107', SOL: '@156', MON: '@243' }; /* UBTC, HYPE, USOL, UMON vs USDC on Hyperliquid spot */
const SM_HLREV = Object.fromEntries(Object.entries(SM_HLSPOT).map(([k, v]) => [v, k]));
const smSpotSyms = (ex) => smSyms().filter((s) => !(SM_SPOT_X[ex] || []).includes(s));
const smSockSt = (ex, m) => SM.st[m === 'S' && ex !== 'hyperliquid' ? ex + '_s' : ex];
const smSyms = () => S.cfg.map((t) => t.symbol);
const smK = (v) => v == null || isNaN(v) ? '–' : (v < 0 ? '−' : '') + '$' + (Math.abs(v) >= 1e9 ? (Math.abs(v) / 1e9).toFixed(2) + 'B' : Math.abs(v) >= 1e6 ? (Math.abs(v) / 1e6).toFixed(2) + 'M' : Math.abs(v) >= 1e3 ? Math.round(Math.abs(v) / 1e3) + 'k' : Math.round(Math.abs(v)));
const smKs = (v) => (v > 0 ? '+' : '') + smK(v);
/* persisted large trades + session coverage (this device only) */
function smLoad() { const now = Date.now(); SM.tr = store.get('kms-sm-trades', []).filter((x) => now - x.t < SM_KEEP); SM.cov = store.get('kms-sm-cov', []).filter((c) => now - c[1] < SM_KEEP); }
function smSave() { store.set('kms-sm-trades', SM.tr.slice(0, 4000)); store.set('kms-sm-cov', SM.cov); }
function smCovMs(spot) { const now = Date.now(), lo = now - SM_KEEP; return SM.cov.filter((c) => !spot || c[2]).reduce((s, [a, b]) => s + Math.max(0, b - Math.max(a, lo)), 0); } /* c[2]=1: spot streams were on (older sessions were perps-only) */
async function smLoadSnap() { try { SM.d = await getJSON('smart_money.json?ts=' + Date.now()); SM.err = null; } catch (e) { SM.err = e.message; } }
/* whole-market context: live from Hyperliquid (1 request), snapshot from smart_money.json as fallback */
async function smLoadMk() { if (Date.now() - SM.mkT < 60e3) return; SM.mkT = Date.now();
  try { const r = await fetch('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'metaAndAssetCtxs' }) }); if (!r.ok) throw new Error(r.status);
    const [m, c] = await r.json(); const o = {}; m.universe.forEach((a, i) => { if (smSyms().includes(a.name) && c[i]) { const mk = +c[i].markPx; o[a.name] = { oiUsd: +c[i].openInterest * mk, funding: +c[i].funding, mark: mk }; } }); SM.mk = o; SM.mkLive = Date.now(); } catch (e) { SM.mkLive = 0; } }
const smCoh = () => (SM.d && SM.d.cohorts && SM.d.cohorts[SM.coh]) || (SM.d && SM.coh === 'profit' ? { universe: SM.d.universe, coins: SM.d.coins } : null);
const smCohO = () => SM.d && SM.d.cohorts && SM.d.cohorts[SM.coh === 'profit' ? 'size' : 'profit'];
const smMkt = (s) => (SM.mk && SM.mk[s]) || (SM.d && SM.d.market && SM.d.market[s]) || null;
const smFund = (f) => f == null ? '–' : (f * 100).toFixed(4) + '%';
const smApr = (f) => f == null ? '' : (f * 24 * 365 * 100).toFixed(1) + '%';
/* ---------- trades ingest ---------- */
function smAdd(ex, sym, side, px, sz, t, mk = 'F') {
  const v = px * sz; if (!(v > 0)) return; const tk = tokBySym(sym); if (tk && tk.price && Math.abs(px / tk.price - 1) > 0.15) return; // wrong-asset listing guard
  const last = SM.tr[0]; // heuristically group nearby fills; this does NOT identify one order or wallet
  if (last && last.ex === ex && (last.m || 'F') === mk && last.s === sym && last.side === side && Math.abs(last.t - t) <= 50) { last.v += v; last.q += sz; last.p = last.v / last.q; if (!last.big && last.v >= SM_FLOOR) { last.big = 1; smDirty(); } return; }
  SM.pend = SM.pend || []; SM.pend.push({ ex, m: mk, s: sym, side, p: px, q: sz, v, t });
  if (!SM.ft) SM.ft = setTimeout(smFlush, 60);
}
function smFlush() { SM.ft = 0; const p = (SM.pend || []).sort((a, b) => a.t - b.t); SM.pend = [];
  const out = [];
  p.forEach((x) => { const y = out[out.length - 1]; if (y && y.ex === x.ex && y.m === x.m && y.s === x.s && y.side === x.side && Math.abs(y.t - x.t) <= 50) { y.v += x.v; y.q += x.q; y.p = y.v / y.q; } else out.push({ ...x }); });
  const big = out.filter((x) => x.v >= SM_FLOOR).map((x) => ({ ...x, v: Math.round(x.v), big: 1 }));
  if (big.length) { SM.tr = [...big.reverse(), ...SM.tr].filter((x) => Date.now() - x.t < SM_KEEP).slice(0, 4000); smDirty(); }
}
function smDirty() { if (SM.raf) return; SM.raf = setTimeout(() => { SM.raf = 0; smSave(); if (S.route === 'smart') smLive(); }, 700); }
/* ---------- websockets ---------- */
function smOpen(ex) {
  const syms = smSyms(); if (!syms.length) return; let url, subs = [], ping;
  if (ex === 'hyperliquid') { url = 'wss://api.hyperliquid.xyz/ws'; subs = [...syms, ...syms.filter((s) => SM_HLSPOT[s]).map((s) => SM_HLSPOT[s])].map((s) => ({ method: 'subscribe', subscription: { type: 'trades', coin: s } })); ping = () => ({ method: 'ping' }); }
  if (ex === 'binance_s') url = 'wss://data-stream.binance.vision/stream?streams=' + smSpotSyms('binance').map((s) => s.toLowerCase() + 'usdt@aggTrade').join('/');
  if (ex === 'okx_s') { url = 'wss://ws.okx.com/ws/v5/public'; subs = smSpotSyms('okx').map((s) => ({ op: 'subscribe', args: [{ channel: 'trades', instId: s + '-USDT' }] })); ping = () => 'ping'; }
  if (ex === 'bybit_s') { url = 'wss://stream.bybit.com/v5/public/spot'; subs = smSpotSyms('bybit').map((s) => ({ op: 'subscribe', args: ['publicTrade.' + s + 'USDT'] })); ping = () => ({ op: 'ping' }); }
  if (ex === 'binance') url = 'wss://fstream.binance.com/stream?streams=' + syms.map((s) => s.toLowerCase() + 'usdt@aggTrade').join('/');
  if (ex === 'okx') { url = 'wss://ws.okx.com/ws/v5/public'; subs = syms.map((s) => ({ op: 'subscribe', args: [{ channel: 'trades', instId: s + '-USDT-SWAP' }] })); ping = () => 'ping'; }
  if (ex === 'bybit') { url = 'wss://stream.bybit.com/v5/public/linear'; subs = syms.map((s) => ({ op: 'subscribe', args: ['publicTrade.' + s + 'USDT'] })); ping = () => ({ op: 'ping' }); }
  let w; try { w = new WebSocket(url); } catch (e) { SM.st[ex] = 'err'; return smRetry(ex); }
  SM.ws[ex] = w; SM.st[ex] = 'conn';
  w.onopen = () => { SM.st[ex] = 'live'; SM.retry[ex] = 0; subs.forEach((m) => w.send(JSON.stringify(m))); if (ping) w._p = setInterval(() => { if (w.readyState === 1) w.send(typeof ping() === 'string' ? ping() : JSON.stringify(ping())); }, 20e3); smDirty(); };
  w.onmessage = (e) => { if (e.data === 'pong') return; let m; try { m = JSON.parse(e.data); } catch (er) { return; }
    if (ex === 'hyperliquid' && m.channel === 'trades') m.data.forEach((x) => { const sp = SM_HLREV[x.coin]; smAdd(ex, sp || x.coin, x.side === 'B' ? 'B' : 'S', +x.px, +x.sz, x.time, sp ? 'S' : 'F'); });
    else if (ex === 'binance_s' && m.data && m.data.e === 'aggTrade') { const d = m.data; smAdd('binance', d.s.replace(/USDT$/, ''), d.m ? 'S' : 'B', +d.p, +d.q, d.T, 'S'); }
    else if (ex === 'okx_s' && m.arg && m.data) m.data.forEach((x) => smAdd('okx', x.instId.split('-')[0], x.side === 'buy' ? 'B' : 'S', +x.px, +x.sz, +x.ts, 'S'));
    else if (ex === 'bybit_s' && m.topic && m.data) m.data.forEach((x) => smAdd('bybit', x.s.replace(/USDT$/, ''), x.S === 'Buy' ? 'B' : 'S', +x.p, +x.v, x.T, 'S'));
    else if (ex === 'binance' && m.data && m.data.e === 'aggTrade') { const d = m.data; smAdd(ex, d.s.replace(/USDT$/, ''), d.m ? 'S' : 'B', +d.p, +d.q, d.T); }
    else if (ex === 'okx' && m.arg && m.data) m.data.forEach((x) => { const s = x.instId.split('-')[0], cv = SM.okx && SM.okx[x.instId]; if (cv) smAdd(ex, s, x.side === 'buy' ? 'B' : 'S', +x.px, +x.sz * cv, +x.ts); });
    else if (ex === 'bybit' && m.topic && m.data) m.data.forEach((x) => smAdd(ex, x.s.replace(/USDT$/, ''), x.S === 'Buy' ? 'B' : 'S', +x.p, +x.v, x.T)); };
  w.onclose = () => { clearInterval(w._p); if (SM.ws[ex] !== w) return; SM.ws[ex] = null; SM.st[ex] = 'err'; smDirty(); smRetry(ex); };
  w.onerror = () => {};
}
function smRetry(ex) { if (S.route !== 'smart') return; const n = SM.retry[ex] = (SM.retry[ex] || 0) + 1; clearTimeout(SM['rt' + ex]); SM['rt' + ex] = setTimeout(() => { if (S.route === 'smart' && !SM.ws[ex]) smOpen(ex); }, Math.min(60e3, 2e3 * 2 ** Math.min(n, 5))); }
async function smStart() {
  const key = smSyms().join(',');
  if (SM.on && SM.key === key) return; smStop(); SM.on = true; SM.key = key; SM.cov.push([Date.now(), Date.now(), 1]);
  SM.hb = setInterval(() => { const c = SM.cov[SM.cov.length - 1]; if (c) c[1] = Date.now(); smSave(); if (S.route === 'smart') smLive(); }, 15e3);
  if (!SM.okx) { try { const r = await getJSON('https://www.okx.com/api/v5/public/instruments?instType=SWAP'); SM.okx = Object.fromEntries(r.data.map((x) => [x.instId, +x.ctVal])); } catch (e) { SM.okx = null; } }
  if (!SM.on) return; SM_SOCK.forEach((ex) => { if (ex === 'okx' && !SM.okx) { SM.st.okx = 'err'; return; } smOpen(ex); });
}
function smStop() { if (!SM.on) return; SM.on = false; clearInterval(SM.hb); const c = SM.cov[SM.cov.length - 1]; if (c) c[1] = Date.now(); smSave();
  SM_SOCK.forEach((ex) => { clearTimeout(SM['rt' + ex]); const w = SM.ws[ex]; SM.ws[ex] = null; SM.st[ex] = ''; if (w) { clearInterval(w._p); try { w.close(); } catch (e) {} } }); }
addEventListener('hashchange', () => { if (S.route !== 'smart') smStop(); });
document.addEventListener('visibilitychange', () => { if (S.route !== 'smart') return; if (document.hidden) smStop(); else smStart(); });
/* ---------- view ---------- */
// Real snapshot time + age (the collector is scheduled every 30 min, but GitHub often runs it hours apart).
function smSnapTxt() { const u = SM.d && SM.d.updated, t = u ? Date.parse(u) : NaN; if (!SM.d && !SM.err) return XL('Loading position snapshot…', 'กำลังโหลดชุดข้อมูลโพซิชัน…'); if (!isFinite(t)) return XL('Position snapshot time: unavailable', 'เวลาของชุดข้อมูลโพซิชัน: ไม่มีข้อมูล');
  const m = Math.max(0, Math.round((Date.now() - t) / 6e4)), age = m < 60 ? XL(`${m} min ago`, `${m} นาทีที่แล้ว`) : XL(`${Math.floor(m / 60)}h ${m % 60}m ago`, `${Math.floor(m / 60)} ชม. ${m % 60} นาทีที่แล้ว`);
  return XL(`Hyperliquid position snapshot taken ${jst(new Date(t))} (${age}). Refreshes are irregular, often hours apart. Names only when the trader set one on the leaderboard.`, `ชุดข้อมูลโพซิชันจาก Hyperliquid เก็บเมื่อ ${jst(new Date(t))} (${age}) รอบอัปเดตไม่แน่นอน บางทีห่างกันหลายชั่วโมง · แสดงชื่อเฉพาะเมื่อเทรดเดอร์ตั้งไว้ในลีดเดอร์บอร์ด`); }
const smName = (s) => s === 'ALL' ? XL('All tracked', 'ทุกเหรียญที่ติดตาม') : s;
function smAggSel() { const c = (smCoh() || {}).coins || {}; const ss = SM.sel === 'ALL' ? smSyms() : [SM.sel];
  const a = ss.map((s) => c[s]).filter(Boolean); if (!a.length) return null;
  const sum = (k) => a.reduce((s, x) => s + (x[k] || 0), 0); const vL = sum('ntlLong'), vS = sum('ntlShort'), n = sum('traders');
  const lw = a.reduce((s, x) => s + (x.avgLev || 0) * (x.ntlLong + x.ntlShort), 0);
  return { traders: n, long: sum('long'), short: sum('short'), longPct: n ? 100 * sum('long') / n : null, longPctNtl: vL + vS ? 100 * vL / (vL + vS) : null, net: vL - vS, avgLev: vL + vS ? lw / (vL + vS) : null, one: SM.sel !== 'ALL' };
}
function smBar(l) { return l == null ? '' : `<span class="smbar" aria-hidden="true"><i class="l" style="width:${l.toFixed(1)}%"></i><i class="s" style="width:${(100 - l).toFixed(1)}%"></i></span>`; }

const smHelp = (key) => {
  const notes = {
    cohort: ['Two separate Hyperliquid samples: highest absolute 30-day profit among accounts worth $100k+, or largest account values. Past winners are selected after the fact; they are not proven forecasters and may hedge elsewhere.', 'เลือกดูแยกกัน 2 กลุ่มบน Hyperliquid: กำไร 30 วันสูงสุดในบัญชีมูลค่า $100K ขึ้นไป หรือบัญชีมูลค่าใหญ่สุด เป็นการคัดจากอดีต ไม่ได้พิสูจน์ว่าทายตลาดแม่น และอาจ hedge อยู่ที่อื่น'],
    count: ['For one token, counts sampled wallets with an open position. In All tracked, counts wallet–token positions; the same wallet can appear in several tokens. Not all crypto traders.', 'รายเหรียญนับกระเป๋าในกลุ่มที่มีโพซิชันเปิด ถ้าเลือกทุกเหรียญ จะนับแยกกระเป๋าต่อเหรียญ กระเป๋าเดียวจึงนับซ้ำได้ ไม่ใช่เทรดเดอร์ทั้งตลาด'],
    size: ['Long notional / (long + short notional) in this sample. 70% means 70% of sampled position value is long, not a 70% chance of a price rise.', 'มูลค่า Long ÷ มูลค่า Long และ Short รวมในกลุ่ม เช่น 70% คือมูลค่าโพซิชันฝั่ง Long 70% ไม่ใช่โอกาสที่ราคาจะขึ้น 70%'],
    group: ['Selected-token long share by notional minus the same cohort’s share across all its coins, in percentage points. Positive means more long than its own baseline, not a buy signal.', 'สัดส่วนมูลค่า Long ของเหรียญที่เลือก ลบด้วยสัดส่วน Long ของกลุ่มเดียวกันในทุกเหรียญ หน่วยเป็นจุดเปอร์เซ็นต์ ค่าบวกแปลว่าเอน Long มากกว่าค่าเฉลี่ยของกลุ่ม ไม่ใช่สัญญาณซื้อ'],
    net: ['Long minus short position notional in USD at the snapshot. This is a stock of positions, not new money entering or leaving.', 'มูลค่าโพซิชัน Long ลบ Short หน่วย USD ณ รอบอัปเดต เป็นสถานะที่ถืออยู่ ไม่ใช่เงินไหลเข้าออกใหม่'],
    leverage: ['Position-size-weighted account leverage: total account position notional / account value. It is not the leverage button on one trade and may be distorted by hedges.', 'เฉลี่ยเลเวอเรจบัญชีโดยถ่วงตามขนาดโพซิชัน คิดจากมูลค่าโพซิชันรวม ÷ มูลค่าบัญชี ไม่ใช่เลเวอเรจที่เลือกในเทรดเดียว และอาจมี hedge'],
    market: ['Hyperliquid only. OI is outstanding perpetual-futures notional, not inflow. Positive funding means longs pay shorts. APR simply annualizes the current hourly rate; it is not a forecast or guaranteed yield.', 'เฉพาะ Hyperliquid เท่านั้น OI คือมูลค่าสัญญา perp ที่ยังเปิด ไม่ใช่เงินไหลเข้า funding บวกคือ Long จ่าย Short ตัวเลขต่อปีแค่คูณอัตรารายชั่วโมง ไม่ใช่ผลตอบแทนที่คาดว่าจะได้'],
    tape: ['Public exchange executions above your USD threshold. Buy/sell is the taker side, not proof of opening a long/short. Nearby same-side fills within 50 ms are grouped heuristically and may be unrelated. Wallet owners are not identified.', 'รายการซื้อขายจากกระดานที่เกินขั้นต่ำ USD ที่เลือก ซื้อหรือขายหมายถึงฝั่งที่ไล่กินคำสั่ง ไม่ได้บอกว่าเปิด Long หรือ Short ระบบรวมรายการฝั่งเดียวกันที่ห่างไม่เกิน 50 มิลลิวินาทีโดยประมาณ อาจเป็นคนละคำสั่ง และระบุเจ้าของกระเป๋าไม่ได้'],
    coverage: ['Only observations received while this tab is visible on this device; gaps are never filled. Retains up to 24 hours and 4,000 large trades. Open-tab time is not guaranteed data coverage; a green dot only means the socket is connected.', 'เก็บเฉพาะข้อมูลที่ได้รับตอนเปิดแท็บนี้บนเครื่องนี้ ไม่เติมช่วงที่ขาด ย้อนหลังได้สูงสุด 24 ชม. และ 4,000 รายการ เวลาเปิดแท็บไม่ได้แปลว่ารับข้อมูลครบ จุดเขียวบอกแค่ว่าเชื่อมต่ออยู่']
  };
  return uiHelp(XL(...notes[key]));
};
function smKpis() { const a = smAggSel(), W = smCoh() ? smCoh().universe.wallets : 500;
  if (!SM.d) return `<div class="smk">${[0, 1, 2, 3].map(() => `<div class="card smc"><div class="eyebrow">&nbsp;</div><div class="smv mut">${esc(SM.err ? T('unavail') : '…')}</div></div>`).join('')}</div>`;
  if (!a) return `<div class="smk">${[XL('Smart-money bias', 'สัดส่วน Long/Short ของกลุ่ม'), XL('Long share by size', 'สัดส่วนมูลค่า Long'), XL('Net position', 'สถานะสุทธิ'), XL('Avg leverage', 'เลเวอเรจเฉลี่ย')].map((h) => `<div class="card smc"><div class="eyebrow">${esc(h)}</div><div class="smv mut">–</div><div class="sub">${esc(XL('No position returned in this sample', 'ไม่พบโพซิชันในกลุ่มตัวอย่าง'))}</div></div>`).join('')}</div>`;
  const lc = a.longPct >= 50 ? 'up' : 'dn', ln = a.longPctNtl >= 50 ? 'up' : 'dn';
  const card = (h, v, c, sub, help) => `<div class="card smc"><div class="eyebrow">${esc(h)} ${smHelp(help || (h === XL('Lean vs group', 'เอนเทียบกลุ่ม') ? 'group' : h === XL('Long share by size', 'สัดส่วนมูลค่า Long') ? 'size' : h === XL('Net position', 'สถานะสุทธิ') ? 'net' : h === XL('Avg leverage', 'เลเวอเรจเฉลี่ย') ? 'leverage' : 'count'))}</div><div class="smv num ${c}">${v}</div><div class="sub">${sub}</div></div>`;
  const g = smCoh() && smCoh().groupLongPctNtl, rb = g != null && a.longPctNtl != null ? a.longPctNtl - g : null;
  return `<div class="smk">${rb != null ? card(XL('Lean vs group', 'เอนเทียบกลุ่ม'), `${rb >= 0 ? '+' : ''}${rb.toFixed(0)} ${esc(XL('pts', 'จุด'))}`, cls(rb), esc(XL(`long value ${a.longPctNtl.toFixed(0)}% vs group ${g.toFixed(0)}% · ${a.long} long · ${a.short} short positions`, `Long ตามมูลค่า ${a.longPctNtl.toFixed(0)}% เทียบทั้งกลุ่ม ${g.toFixed(0)}% · Long ${a.long} · Short ${a.short} โพซิชัน`)) + smBar(a.longPctNtl)) : ''}${rb != null ? '' : card(XL('Smart-money bias', 'สัดส่วน Long/Short ของกลุ่ม'), `${(a.longPct >= 50 ? a.longPct : 100 - a.longPct).toFixed(0)}% ${esc(a.longPct >= 50 ? XL('Long', 'Long') : XL('Short', 'Short'))}`, lc, esc(XL(`${a.long} long · ${a.short} short of ${W} wallets`, `ลอง ${a.long} · ชอร์ต ${a.short} จาก ${W} กระเป๋า`)) + smBar(a.longPct))}
    ${card(XL('Long share by size', 'สัดส่วนมูลค่า Long'), a.longPctNtl == null ? '–' : a.longPctNtl.toFixed(0) + '%', ln, esc(XL('of open position value', 'ของมูลค่าโพซิชันที่เปิดอยู่')) + smBar(a.longPctNtl))}
    ${card(XL('Net position', 'สถานะสุทธิ'), smKs(a.net), cls(a.net), esc(XL('longs minus shorts, USD', 'ลองลบชอร์ต (USD)')))}
    ${card(XL('Avg leverage', 'เลเวอเรจเฉลี่ย'), a.avgLev == null ? '–' : a.avgLev.toFixed(1) + '×', '', esc(XL('weighted by position size', 'ถ่วงตามขนาดโพซิชัน')))}</div>`; }
function smBiasTable() { const c = (smCoh() || {}).coins || {}, o = (smCohO() || {}).coins;
  const rows = smSyms().map((s) => { const x = c[s], t = tokBySym(s) || { symbol: s };
    return `<tr data-smsel="${esc(s)}" class="${SM.sel === s ? 'sel' : ''}"><td><div class="tok">${logo(t, 'sm')}<b>${esc(s)}</b></div></td>${x ? `<td class="num">${x.traders}</td><td class="smbt">${smBar(x.longPct)}<span class="num ${x.longPct >= 50 ? 'up' : 'dn'}">${x.longPct.toFixed(0)}%</span></td><td class="num ${x.longPctNtl >= 50 ? 'up' : 'dn'}">${x.longPctNtl == null ? '–' : x.longPctNtl.toFixed(0) + '%'}</td><td class="num ${cls(x.bias)}">${x.bias == null ? '–' : (x.bias >= 0 ? '+' : '') + x.bias.toFixed(0)}</td><td class="num ${cls(x.net)}">${smKs(x.net)}</td><td class="num">${x.avgLev == null ? '–' : x.avgLev.toFixed(1) + '×'}</td>${o ? smAgreeTd(x, o[s]) : ''}` : `<td class="mut" colspan="${o ? 7 : 6}">${esc(SM.d ? XL('No top trader holds it (or not listed on Hyperliquid)', 'ไม่มีเทรดเดอร์ท็อปถือ (หรือไม่มีใน Hyperliquid)') : T('unavail'))}</td>`}${smMktTd(s)}</tr>`; }).join('');
  return `<div class="tbl-wrap"><table class="ov smt"><thead><tr><th class="l">${esc(T('token'))}</th><th>${esc(XL('Wallet positions', 'กระเป๋าที่ถือโพซิชัน'))} ${smHelp('count')}</th><th>${esc(XL('Long % (count)', 'Long % (จำนวน)'))} ${smHelp('count')}</th><th>${esc(XL('Long % (size)', 'Long % (มูลค่า)'))} ${smHelp('size')}</th><th title="${esc(XL('Long % (size) minus the group\'s long % across all coins', 'ลอง % (มูลค่า) ลบ ลอง % ของทั้งกลุ่มทุกเหรียญ'))}">${esc(XL('vs group', 'เทียบกลุ่ม'))} ${smHelp('group')}</th><th>${esc(XL('Net', 'สุทธิ'))} ${smHelp('net')}</th><th>${esc(XL('Avg lev.', 'เลเวอเรจ'))} ${smHelp('leverage')}</th>${o ? `<th title="${esc(XL('Long % (size) in the other cohort', 'ลอง % (มูลค่า) ของอีกกลุ่ม'))}">${esc(SM.coh === 'profit' ? XL('Biggest accts', 'บัญชีใหญ่') : XL('Most profitable', 'กำไรสูงสุด'))}</th>` : ''}<th class="smsep">${esc(XL('Hyperliquid OI', 'OI บน Hyperliquid'))}</th><th>${esc(XL('Funding 1h · APR', 'funding 1 ชม. · ต่อปี'))} ${smHelp('market')}</th></tr></thead><tbody>${rows}</tbody></table></div>${smConcList()}`; }
function smAgreeTd(x, y) { if (!y || y.longPctNtl == null || x.longPctNtl == null) return `<td class="num mut">–</td>`;
  const ag = (x.longPctNtl >= 50) === (y.longPctNtl >= 50);
  return `<td class="num"><span class="${y.longPctNtl >= 50 ? 'up' : 'dn'}">${y.longPctNtl.toFixed(0)}%</span> <span class="smag ${ag ? 'ok' : 'no'}" title="${esc(ag ? XL('Both cohorts lean the same way', 'ทั้งสองกลุ่มเอียงไปทางเดียวกัน') : XL('Cohorts disagree', 'สองกลุ่มเห็นต่างกัน'))}">${ag ? XL('agree', 'ตรงกัน') : XL('differ', 'ต่างกัน')}</span></td>`; }
function smMktTd(s) { const k = smMkt(s); if (!k) return `<td class="num mut smsep">–</td><td class="num mut">–</td>`;
  return `<td class="num smsep">${smK(k.oiUsd)}</td><td class="num"><span class="${k.funding >= 0 ? 'up' : 'dn'}">${smFund(k.funding)}</span> <span class="mut">· ${smApr(k.funding)}</span></td>`; }
const smShort = (a) => a.slice(0, 6) + '…' + a.slice(-4);
function smDom() { const u = smCoh() || {}, my = new Set(smSyms()), d = (u.dominant || []).map((w) => ({ ...w, coins: w.coins.filter((c) => my.has(c.c)) })).filter((w) => w.coins.length >= (u.domMin || 3)); if (!d.length) return '';
  return d.slice(0, 5).map((w) => `<div><span class="smwi" aria-hidden="true">!</span>${esc(XL(`Same wallet dominates ${w.coins.length} coins:`, `กระเป๋าเดียวคุม ${w.coins.length} เหรียญ:`))} ${esc(w.coins.map((c) => `${c.c} ${c.side === 'L' ? XL('long', 'Long') : XL('short', 'Short')} ${c.pct.toFixed(0)}%`).join(', '))} · <a class="link mono" href="https://app.hyperliquid.xyz/explorer/address/${esc(w.a)}" target="_blank" rel="noopener" title="${esc(w.a)}">${esc(w.n || smShort(w.a))}</a></div>`).join(''); }
function smConcList() { const c = (smCoh() || {}).coins || {}; const ss = SM.sel === 'ALL' ? smSyms() : [SM.sel];
  const it = ss.flatMap((s) => Object.entries((c[s] && c[s].conc) || {}).map(([sd, w]) => ({ s, sd, ...w }))); const dm = smDom(); if (!it.length && !dm) return '';
  return `<div class="smwarn">${dm}${it.map((w) => `<div><span class="smwi" aria-hidden="true">!</span><b>${esc(w.s)}</b> ${esc(XL(`1 wallet = ${w.pct.toFixed(0)}% of ${w.sd === 'L' ? 'longs' : 'shorts'} (by size)`, `1 กระเป๋า = ${w.pct.toFixed(0)}% ของฝั่ง${w.sd === 'L' ? 'Long' : 'Short'} (ตามมูลค่า)`))} · <a class="link mono" href="https://app.hyperliquid.xyz/explorer/address/${esc(w.a)}" target="_blank" rel="noopener" title="${esc(w.a)}">${esc(w.n || smShort(w.a))}</a></div>`).join('')}</div>`; }
function smCohDesc() { const u = smCoh(); const n = u ? u.universe.wallets : 500;
  return SM.coh === 'size' ? XL(`Hyperliquid · ${n} largest accounts by account value (any profit)`, `Hyperliquid · ${n} บัญชีที่มีมูลค่าบัญชีสูงสุด (ไม่ดูกำไร)`) : XL(`Hyperliquid · top ${n} by 30-day profit, accounts $100k+`, `Hyperliquid · ${n} อันดับแรกตามกำไร 30 วัน บัญชี ≥ $100k`); }
function smMktStrip() { const ss = SM.sel === 'ALL' ? smSyms() : [SM.sel]; const ks = ss.map(smMkt).filter(Boolean); if (!ks.length) return '';
  const oi = ks.reduce((a, k) => a + k.oiUsd, 0), one = ss.length === 1 ? ks[0] : null, a = smAggSel();
  const live = SM.mkLive ? XL('live', 'สด') : XL('as of snapshot', 'ณ รอบอัปเดต');
  return `<div class="smmk card"><div><span class="eyebrow">${esc(XL('Hyperliquid market context', 'ภาพรวมบน Hyperliquid'))}</span><span class="sub">Hyperliquid · ${esc(live)}</span></div>
    <div><span class="sub">${esc(XL('Open interest', 'Open interest'))}</span><b class="num">${smK(oi)}</b></div>
    <div><span class="sub">${esc(XL('Funding 1h · APR', 'ฟันดิง 1 ชม. · ต่อปี'))}</span><b class="num">${one ? `<span class="${one.funding >= 0 ? 'up' : 'dn'}">${smFund(one.funding)}</span> <span class="mut">· ${smApr(one.funding)}</span>` : `<span class="mut">${esc(XL('per token below', 'ดูรายเหรียญด้านล่าง'))}</span>`}</b></div>
    <div><span class="sub">${esc(XL('Sample gross positions', 'มูลค่า Long + Short ของกลุ่ม'))} ${smHelp('size')}</span><b class="num">${a ? smK(smAggN(ss)) : '–'}</b></div></div>`; }
function smAggN(ss) { const c = (smCoh() || {}).coins || {}; return ss.reduce((t, s) => t + (c[s] ? c[s].ntlLong + c[s].ntlShort : 0), 0); }
function smPositions() { const c = (smCoh() || {}).coins || {}; if (!SM.d) return `<div class="empty">${esc(SM.err ? T('unavail') : '…')}</div>`;
  const ss = SM.sel === 'ALL' ? smSyms() : [SM.sel]; const ps = ss.flatMap((s) => ((c[s] && c[s].top) || []).map((p) => ({ ...p, s }))).sort((a, b) => b.ntl - a.ntl).slice(0, 12);
  if (!ps.length) return `<div class="empty">${esc(XL('No open positions from the top traders for this token.', 'ไม่มีโพซิชันเปิดของเทรดเดอร์ท็อปในเหรียญนี้'))}</div>`;
  const sh = (a) => a.slice(0, 6) + '…' + a.slice(-4);
  return `<div class="tbl-wrap"><table class="ov smp"><thead><tr><th class="l">${esc(XL('Wallet', 'กระเป๋า'))}</th>${SM.sel === 'ALL' ? `<th class="l">${esc(T('token'))}</th>` : ''}<th class="l">${esc(T('side'))}</th><th title="${esc(XL('Total position notional ÷ account value (all positions in the wallet)', 'มูลค่าโพซิชันรวม ÷ มูลค่าบัญชี (ทุกโพซิชันในกระเป๋า)'))}">${esc(XL('Acct lev.', 'เลเวอเรจบัญชี'))}</th><th>${esc(XL('Size', 'ขนาด'))}</th><th>${esc(T('entry'))}</th><th>${esc(XL('Liq. price', 'ราคาล้างพอร์ต'))}</th><th>${esc(XL('Open P&L', 'กำไรค้าง'))}</th><th>${esc(XL('30d P&L', 'กำไร 30 วัน'))}</th></tr></thead><tbody>${ps.map((p) => `<tr><td><a class="link mono" href="https://app.hyperliquid.xyz/explorer/address/${esc(p.a)}" target="_blank" rel="noopener" title="${esc(p.a)}">${esc(p.n || sh(p.a))}</a></td>${SM.sel === 'ALL' ? `<td>${esc(p.s)}</td>` : ''}<td class="${p.side === 'L' ? 'up' : 'dn'}">${esc(p.side === 'L' ? XL('Long', 'Long') : XL('Short', 'Short'))}${p.lev ? ' ' + p.lev + '×' : ''}</td><td class="num">${p.alev != null ? (+p.alev).toFixed(1) + '×' : '<span class="mut">–</span>'}</td><td class="num">${smK(p.ntl)}</td><td class="num">${px(p.entry)}</td><td class="num">${p.liq ? px(p.liq) : '<span class="mut">–</span>'}</td><td class="num ${cls(p.upnl)}">${smKs(p.upnl)}</td><td class="num ${cls(p.pnl30)}">${smKs(p.pnl30)}</td></tr>`).join('')}</tbody></table></div>`; }
const smInSel = (x) => (SM.sel === 'ALL' ? smSyms().includes(x.s) : x.s === SM.sel) && (SM.mkt === 'A' || (x.m || 'F') === SM.mkt);
function smTape() { const rows = SM.tr.filter((x) => x.v >= SM.thr && smInSel(x)).slice(0, 40);
  const stL = (st) => st === 'live' ? XL('connected', 'เชื่อมต่ออยู่') : st === 'conn' ? T('connecting') : st === 'err' ? XL('reconnecting', 'กำลังเชื่อมต่อใหม่') : T('offline');
  const ms = SM.mkt === 'A' ? ['F', 'S'] : [SM.mkt];
  const dot = SM_EX.map((ex) => `<span class="smex" title="${esc(ms.map((k) => EXNAME[ex] + ' ' + (k === 'S' ? XL('spot', 'สปอต') : XL('futures', 'ฟิวเจอร์ส')) + ': ' + stL(smSockSt(ex, k))).join(' · '))}">${ms.map((k) => `<i class="${smSockSt(ex, k) || ''}"></i>`).join('')}${esc(EXNAME[ex])}</span>`).join('');
  return `<div class="smexs">${dot}</div>${rows.length ? `<div class="smtape">${rows.map((x) => `<div class="smtr"><span class="mut num">${esc(lTime(x.t).replace(/ \S+$/, ''))}</span><span class="smven">${esc(EXNAME[x.ex])}<em class="smtag ${(x.m || 'F') === 'S' ? 's' : 'f'}">${(x.m || 'F') === 'S' ? 'S' : 'F'}</em></span><b>${esc(x.s)}</b><span class="${x.side === 'B' ? 'up' : 'dn'}">${esc(x.side === 'B' ? XL('Buy', 'ซื้อ') : XL('Sell', 'ขาย'))}</span><span class="num r">${smK(x.v)}</span><span class="num r mut">${px(x.p)}</span></div>`).join('')}</div>` : `<div class="empty">${esc(XL(`Waiting for trades of ${smK(SM.thr)} or more…`, `รอเทรดตั้งแต่ ${smK(SM.thr)} ขึ้นไป…`))}</div>`}
  <p class="sub smnote">${smHelp('tape')} ${esc(XL(`Times in ${tzL()}. F = perpetual futures, S = spot (USDT/USDC pairs). Taker side. Live only while this page is open.`, `เวลาแบบ ${tzL()} · F = ฟิวเจอร์ส, S = สปอต (คู่ USDT/USDC) · ฝั่งผู้ส่งคำสั่ง · สดเฉพาะตอนเปิดหน้านี้`))}</p>`; }
function smFlow() { const now = Date.now(), tr = SM.tr.filter((x) => x.v >= SM.thr && smInSel(x) && now - x.t < SM_KEEP);
  const by = Object.fromEntries(SM_EX.map((e) => [e, { b: 0, s: 0 }])); tr.forEach((x) => { by[x.ex][x.side === 'B' ? 'b' : 's'] += x.v; });
  const mx = Math.max(1, ...SM_EX.map((e) => Math.max(by[e].b, by[e].s))); const tb = tr.reduce((s, x) => s + (x.side === 'B' ? x.v : 0), 0), tsl = tr.reduce((s, x) => s + (x.side === 'S' ? x.v : 0), 0);
  const cov = smCovMs(SM.mkt !== 'F'), h = Math.floor(cov / 36e5), m = Math.round((cov % 36e5) / 6e4);
  return `<div class="smfl">${SM_EX.map((e) => `<div class="smfr"><span>${esc(EXNAME[e])}</span><div class="smfb"><div class="b"><i style="width:${(100 * by[e].b / mx).toFixed(1)}%"></i></div><div class="s"><i style="width:${(100 * by[e].s / mx).toFixed(1)}%"></i></div></div><span class="num r"><span class="up">${smK(by[e].b)}</span> / <span class="dn">${smK(by[e].s)}</span></span><span class="num r ${cls(by[e].b - by[e].s)}">${smKs(by[e].b - by[e].s)}</span></div>`).join('')}
    <div class="smfr tot"><span>${esc(XL('Total', 'รวม'))}</span><div></div><span class="num r"><span class="up">${smK(tb)}</span> / <span class="dn">${smK(tsl)}</span></span><span class="num r ${cls(tb - tsl)}">${smKs(tb - tsl)}</span></div></div>
    <p class="sub smnote">${smHelp('coverage')} ${esc(XL(`${SM.mkt === 'S' ? 'Spot' : SM.mkt === 'F' ? 'Futures' : 'Spot + futures'} exchange trades of ${smK(SM.thr)}+ only — not deposits or withdrawals. Bar width is % of the largest venue buy or sell notional in this filtered sample, not trade count and not whole-market share. Counted on this device while this page was open: ${h}h ${m}m of the last 24h. Gaps are not filled.`, `${SM.mkt === 'S' ? 'สปอต' : SM.mkt === 'F' ? 'ฟิวเจอร์ส' : 'สปอต + ฟิวเจอร์ส'} · เฉพาะเทรดบนกระดานตั้งแต่ ${smK(SM.thr)} — ไม่ใช่การฝาก/ถอน · ความกว้างแท่งคือ % ของมูลค่าซื้อหรือขายสูงสุดในกระดานหนึ่งภายในกลุ่มที่กรอง ไม่ใช่จำนวนดีลและไม่ใช่สัดส่วนทั้งตลาด · นับบนเครื่องนี้ขณะเปิดหน้านี้: ${h} ชม. ${m} นาที จาก 24 ชม.ล่าสุด · ช่วงที่ไม่ได้เปิดจะไม่มีข้อมูล`))}</p>`; }
function smLive() { const a = $('#smTape'), b = $('#smFlow'); if (a) a.innerHTML = smTape(); if (b) b.innerHTML = smFlow(); }
async function pSmart(soft) {
  const m = $('#main'); if (!SM.cov) smLoad();
  if (SM.sel !== 'ALL' && !smSyms().includes(SM.sel)) SM.sel = 'ALL';
  const draw = () => {
    const u = SM.d && SM.d.updated; const thrs = [5e4, 1e5, 25e4, 5e5, 1e6];
    m.innerHTML = `<div class="page smp-pg">${pageHead(XL('Smart Money', 'สมาร์ทมันนี่'), `<span class="sub">${u ? esc(XL('Position snapshot as of ', 'โพซิชัน ณ รอบอัปเดต ') + jst(new Date(u))) + ' ' + fresh(u, 0.5) : ''}</span>`)}
      <p class="sub sm-intro">${esc(XL('See what selected Hyperliquid accounts hold, then compare large exchange trades. Positions are snapshots; the trade list only collects while this tab is visible. Neither proves what whales will do next.', 'ดูว่าบัญชีที่คัดมาบน Hyperliquid ถือฝั่งไหน แล้วดูรายการซื้อขายขนาดใหญ่จากกระดานประกอบ โพซิชันเป็นข้อมูลตามรอบ ส่วนรายการเทรดเก็บเฉพาะตอนเปิดแท็บนี้ ไม่ได้บอกว่า whale จะทำอะไรต่อ'))}</p>
      <div class="filters smf">${['ALL', ...smSyms()].map((s) => `<button class="chip np" data-smsel="${esc(s)}" aria-pressed="${SM.sel === s}">${esc(smName(s))}</button>`).join('')}</div>
      ${SM.err && !SM.d ? `<div class="empty empty-cat"><img class="cat-quiet" src="icons/favicon.png" alt="" width="40" height="40" decoding="async"><p class="err">${esc(XL('Position snapshot unavailable', 'โหลดข้อมูลโพซิชันไม่ได้'))} (${esc(SM.err)}) <button class="link" data-smretry>${esc(T('retry'))}</button></p></div>` : ''}
      <p class="sub smsnap" data-smsnap>${esc(smSnapTxt())}</p>
      <div class="smcoh"><div class="seg" role="group" aria-label="${esc(XL('Cohort', 'กลุ่ม'))}">${[['profit', XL('Most profitable', 'กำไรสูงสุด')], ['size', XL('Biggest accounts', 'บัญชีใหญ่สุด')]].map(([k, l]) => `<button data-smcoh="${k}" aria-pressed="${SM.coh === k}">${esc(l)}</button>`).join('')}</div><span class="sub">${esc(smCohDesc())} ${smHelp('cohort')}</span></div>${SM.coh === 'profit' ? `<p class="sub smnote smwarn">${esc(XL('Note: a 30-day profit ranking tends to follow recent price direction. If price fell, the top earners are mostly those who were short, so treat this as momentum, not foresight.', 'หมายเหตุ: การจัดอันดับกำไร 30 วันมักเอนตามทิศทางราคาล่าสุด ถ้าราคาลง ผู้ทำกำไรสูงสุดส่วนใหญ่คือคนที่ชอร์ต จึงควรมองเป็นโมเมนตัม ไม่ใช่การมองการณ์ไกล'))}</p>` : ''}
      ${u && Date.now() - Date.parse(u) > 60 * 60e3 ? `<p class="smwarn sub">${esc(XL('Position snapshot is over an hour old. It may not reflect current holdings; live trades below do not refresh these positions.', 'โพซิชันเก่าเกิน 1 ชม. อาจไม่ตรงกับที่ถืออยู่ตอนนี้ รายการเทรดสดด้านล่างไม่ได้อัปเดตโพซิชันส่วนนี้'))}</p>` : ''}
      ${smKpis()}
      ${smMktStrip()}
      <div class="sec"><div class="sec-h"><h2>${esc(XL('Positions by token', 'โพซิชันรายเหรียญ'))}</h2><span class="sub">${esc(XL('sampled accounts · Hyperliquid only', 'เฉพาะบัญชีในกลุ่มบน Hyperliquid'))}</span></div>${smBiasTable()}</div>
      <div class="smmkt"><h2>${esc(XL('Exchange trades · separate from account snapshots', 'รายการเทรดบนกระดาน แยกจากโพซิชันบัญชี'))}</h2><div class="seg" role="group">${[['A', XL('All', 'ทั้งหมด')], ['F', XL('Futures', 'Futures')], ['S', XL('Spot', 'Spot')]].map(([k, l]) => `<button data-smmkt="${k}" aria-pressed="${SM.mkt === k}">${esc(l)}</button>`).join('')}</div></div>
      <div class="smg">
        <div class="sec card smbox"><div class="sec-h"><h2>${esc(XL('Large exchange trades (live)', 'รายการเทรดใหญ่ (สด)'))} ${smHelp('tape')}</h2><label class="smthr"><span class="sub">${esc(XL('Min', 'ขั้นต่ำ'))}</span><select class="input sm" data-smthr>${thrs.map((v) => `<option value="${v}" ${SM.thr === v ? 'selected' : ''}>${smK(v)}</option>`).join('')}</select></label></div><div id="smTape">${smTape()}</div></div>
        <div class="sec card smbox"><div class="sec-h"><h2>${esc(XL('Observed large buys vs sells', 'ยอดซื้อขายขนาดใหญ่ที่เก็บได้'))} ${smHelp('coverage')}</h2><span class="sub">${esc(XL('buy / sell · net', 'ซื้อ / ขาย · สุทธิ'))}</span></div><div id="smFlow">${smFlow()}</div></div>
      </div>
      <div class="sec card smbox"><div class="sec-h"><h2>${esc(XL('Top positions', 'โพซิชันใหญ่สุด'))}</h2><span class="sub">${esc(smName(SM.sel))} · ${esc(SM.coh === 'size' ? XL('Biggest accounts', 'บัญชีใหญ่สุด') : XL('Most profitable', 'กำไรสูงสุด'))}</span></div>${smPositions()}<p class="sub smnote">${esc(smSnapTxt())}</p></div>
      <p class="sub" style="margin-top:14px">${esc(XL('Sources: Hyperliquid public API (positions, open interest, funding); public trade streams of Hyperliquid, Binance, OKX and Bybit (perpetuals and spot). The two cohorts are shown separately and never blended. Past profit does not predict future trades. Not financial advice.', 'แหล่งข้อมูล: API สาธารณะของ Hyperliquid (โพซิชัน, OI, ฟันดิง) และสตรีมเทรดสาธารณะของ Hyperliquid, Binance, OKX, Bybit (ฟิวเจอร์สและสปอต) · แสดงสองกลุ่มแยกกัน ไม่นำมารวม · กำไรในอดีตไม่ได้บอกอนาคต · ไม่ใช่คำแนะนำการลงทุน'))}</p></div>`;
    const w = $('.smt', m); if (w) { const tw = w.closest('.tbl-wrap'); tw.addEventListener('scroll', () => tw.classList.toggle('scrolled', tw.scrollLeft > 2), { passive: true }); }
  };
  if (!SM.d && !SM.err) { draw(); await smLoadSnap(); } else if (!soft || !SM.d || Date.now() - Date.parse(SM.d.updated) > 20 * 60e3) await smLoadSnap();
  if (!soft || !SM.mk) await smLoadMk();
  if (S.route !== 'smart') return; draw(); smStart();
}
document.addEventListener('click', (e) => { if (e.target.closest('.ui-help')) return; const el = e.target.closest('[data-smsel],[data-smretry],[data-smcoh],[data-smmkt]'); if (!el) return;
  if (el.dataset.smcoh) { SM.coh = el.dataset.smcoh; store.set('kms-sm-coh', SM.coh); return pSmart(true); }
  if (el.dataset.smmkt) { SM.mkt = el.dataset.smmkt; store.set('kms-sm-mkt', SM.mkt); $$('[data-smmkt]').forEach((b) => b.setAttribute('aria-pressed', b === el)); return smLive(); }
  if (el.dataset.smretry != null) { SM.err = null; SM.d = null; return pSmart(); }
  SM.sel = el.dataset.smsel; store.set('kms-sm-sel', SM.sel); pSmart(true); });
document.addEventListener('change', (e) => { const el = e.target.closest('[data-smthr]'); if (!el) return; SM.thr = +el.value; store.set('kms-sm-thr', SM.thr); smLive(); });
if (typeof I18N !== 'undefined') { I18N.en.smart = 'Smart Money'; I18N.th.smart = 'สมาร์ทมันนี่'; }
