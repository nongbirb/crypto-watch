/* KMS Capital – Price & indicators tab (v63). Loaded after app.js (shares its globals: S, VC helpers, klines, store, XL, px, big, ...).
   One chart (lightweight-charts v5) with panes: price on top (candles, MA20/50/200, optional Bollinger, Volume and Fibonacci), then a
   short pane per oscillator (RSI 14, MACD 12/26/9, Stochastic 9/3/3 by default, adjustable since v69). One time axis, one crosshair; the values under it show in a bar
   pinned to the top of the chart and in a label at the top of each pane. On a phone: press and hold, then drag, to move the crosshair;
   release to return to the latest bar. Timeframes 15m / 1h / 4h / 1D / 1W; older candles load as you scroll left, "See all" loads the
   whole history (v67: the separate range buttons are gone). The crosshair puts a dot on every line of every pane at that candle.
   Display only: the Technical setup keeps reading closed daily candles (verdict-core.js), whatever this chart shows. */
'use strict';
const PCTFS = ['15m', '1h', '4h', '1d', '1w', '1M'], PCTF_LBL = { '15m': '15m', '1h': '1H', '4h': '4H', '1d': '1D', '1w': '1W', '1M': '1M' };
const VIEW_DEF = { '15m': 7, '1h': 30, '4h': 91, '1d': 91, '1w': Infinity, '1M': Infinity }; // days in view when a chart opens (1 week of 15m candles ... all weeks)
const FIB_BARS = { '15m': 400, '1h': 240, '4h': 180, '1d': 120, '1w': 104, '1M': 48 }; // Fibonacci: the latest big swing = highest high / lowest low of these last bars
const MAXB = 6000, PAGE = 1000; // bars kept per series; bars per request
const IND_KEYS = ['ma', 'vol', 'bb', 'fib', 'rsi', 'macd', 'stoch'], IND_DEF = { ma: true, vol: true, bb: false, fib: false, rsi: true, macd: false, stoch: true }, STOCH = [9, 3, 3];
/* v69: the Stochastic numbers are the user's choice (default 9/3/3), kept in this browser. Display only, like the rest of this tab:
   the Technical setup and its record never read them. Limits: %K period 2-100, %K smoothing 1-20, %D 1-20 (whole numbers). */
const STOCH_DEF = [9, 3, 3], STOCH_LIM = [[2, 100], [1, 20], [1, 20]];
const stochOk = (a) => Array.isArray(a) && a.length === 3 && a.every((x, i) => Number.isInteger(x) && x >= STOCH_LIM[i][0] && x <= STOCH_LIM[i][1]);
{ const v = store.get('cw-stoch', null); if (stochOk(v)) STOCH.splice(0, 3, ...v); }
let STSET = false; // Stochastic settings panel open
/* v70 moving averages: one MA switch; the settings pick which of the three lines show, their lengths (2-400) and SMA or EMA */
const MA_DEF = { type: 'sma', l: [[20, true], [50, true], [200, true]] };
const maOk = (v) => v && (v.type === 'sma' || v.type === 'ema') && Array.isArray(v.l) && v.l.length === 3 && v.l.every((x) => Array.isArray(x) && Number.isInteger(x[0]) && x[0] >= 2 && x[0] <= 400 && typeof x[1] === 'boolean');
const MAC = (() => { const v = store.get('cw-ma', null); return maOk(v) ? v : JSON.parse(JSON.stringify(MA_DEF)); })();
let MASET = false; // MA settings panel open
const maLbl = (n) => `${MAC.type === 'ema' ? 'EMA' : 'MA'}${n}`;
/* v70 compare: one more coin drawn on the price pane; the price scale switches to % from the first bar in view, so both start at 0% */
let PCMP = store.get('cw-cmp', null); if (PCMP != null && !/^[A-Z0-9]{2,12}$/.test(PCMP)) PCMP = null;
let CMPSET = false; const CMPC = 'rgba(236, 72, 153, 0.72)'; // the compared coin is a lighter pink line, so the token itself stays the focus
const cmpTok = (sym) => tokBySym(sym) || { symbol: sym, sources: [{ ex: 'binance', pair: sym + 'USDT' }, { ex: 'bybit', pair: sym + 'USDT' }, { ex: 'okx', pair: sym + '-USDT' }] };
/* v70 indicator pane height: S / M / L (px per pane), remembered; on a desktop the separators can also be dragged */
const OSCSZ = { s: [72, 92], m: [92, 118], l: [132, 170] }; let PSZ = store.get('cw-psz', 'm'); if (!OSCSZ[PSZ]) PSZ = 'm';
const IND = (() => { const v = store.get('cw-ind', null), o = { ...IND_DEF }; if (v && typeof v === 'object') IND_KEYS.forEach((k) => { if (typeof v[k] === 'boolean') o[k] = v[k]; }); return o; })();
let PCTF = (() => { const v = store.get('cw-ptf', '1d'); return PCTFS.includes(v) ? v : '1d'; })();
let PALL = false; // "See all" pressed
const PC = {}; // `${symbol}|${tf}` -> { k, src, done, loading, at }
const FIBS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1], FIB_SHOW = [0, 0.382, 0.5, 0.618, 1]; // all ratios for fibOf (Learn uses them); the chart shows the five that matter
const OSC = ['rsi', 'macd', 'stoch'], FIBC = '#a78bfa'; // Fibonacci has its own colour (not MA50's yellow)
const cmp = (v) => (v == null || !Number.isFinite(v) ? '–' : v === 0 ? '0' : Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toPrecision(3));

const pcKey = (t, tf) => `${t.symbol}|${tf}`;
/* history source for a timeframe: the setup's history source first, then the live one, then the rest; a source with fewer than 300 bars
   does not end the search (the longest wins), so a recently listed pair on one exchange does not cut the chart short */
async function pcLoad(t, tf) {
  const key = pcKey(t, tf), c = PC[key], ttl = tf === '1d' || tf === '1w' ? 3e5 : 6e4;
  if (c && c.k && Date.now() - c.at < ttl) return c;
  if (c && c.loading) return c.loading;
  const pref = [t._hsrc, t._src].filter(Boolean), order = [...new Set([...pref, ...t.sources])], ok = [], errs = [];
  const job = (async () => {
    for (const s of order) {
      try { const k = await klines(s, tf, PAGE); const fresh = k.length && Date.now() - k[k.length - 1].t < Math.max(3 * TFMS[tf], 3 * 864e5);
        if (!fresh) throw new Error('stale'); ok.push({ s, k }); if (k.length >= 300) break; } catch (e) { errs.push(`${EXNAME[s.ex]}: ${e.message}`); }
    }
    if (!ok.length) throw new Error(errs.join(' · ') || 'no source');
    const best = ok.reduce((a, b) => (b.k.length > a.k.length ? b : a), ok[0]);
    PC[key] = { k: best.k, src: best.s, done: best.k.length < Math.min(PAGE, 300) - 5, at: Date.now() };
    return PC[key];
  })();
  PC[key] = { ...(c || {}), loading: job };
  try { return await job; } catch (e) { PC[key] = { err: e.message, at: Date.now() }; throw e; }
}
/* one older page; false when the venue has nothing older */
async function pcMore(c, tf) {
  if (c.done || c.more || !c.k || c.k.length >= MAXB) return false;
  c.more = (async () => {
    try { const k = (await klines(c.src, tf, PAGE, c.k[0].t)).filter((x) => x.t < c.k[0].t);
      if (!k.length) { c.done = true; return 0; } c.k = k.concat(c.k).slice(-MAXB); if (k.length < 50) c.done = true; return k.length; }
    catch (e) { c.done = true; return 0; } finally { c.more = null; }
  })();
  return c.more;
}

/* indicators on the chart's own candles (display only) */
function pcCalc(k) {
  const c = k.map((x) => x.c), e26 = ema(c, 26), m = ema(c, 12).map((x, i) => x - e26[i]);
  const sg = Array(25).fill(null).concat(c.length > 25 ? ema(m.slice(25), 9) : []), hist = m.map((x, i) => (sg[i] == null ? null : x - sg[i]));
  const B = bb(c), ST = stoch(k, ...STOCH);
  const mav = (n) => (MAC.type === 'ema' ? ema(c, n).map((x, i) => (i < n - 1 ? null : x)) : sma(c, n));
  return { mas: MAC.l.map(([n]) => mav(n)), ma20: sma(c, 20), ma50: sma(c, 50), ma200: sma(c, 200), rsi: rsiSeries(c), macd: m, sig: sg, hist, bbUp: B.up, bbLo: B.lo, k: ST.k, d: ST.d };
}
/* Fibonacci on bars [from, to]: the highest high and lowest low there; the later of the two sets the direction of the swing */
function fibOf(k, from, to) {
  const a = Math.max(0, Math.floor(from)), b = Math.min(k.length - 1, Math.ceil(to)); if (b - a < 5) return null;
  let hi = a, lo = a; for (let i = a; i <= b; i++) { if (k[i].h > k[hi].h) hi = i; if (k[i].l < k[lo].l) lo = i; }
  const H = k[hi].h, Lw = k[lo].l; if (!(H > Lw)) return null; const up = hi > lo; // low first, then high = an up-swing; retracements measured down from the high
  return { up, hi, lo, H, L: Lw, lv: FIBS.map((r) => ({ r, p: up ? H - r * (H - Lw) : Lw + r * (H - Lw) })) };
}

const IND_LBL = () => ({ ma: XL('MA', 'MA'), vol: XL('Volume', 'วอลุ่ม'), bb: 'Bollinger', fib: 'Fibonacci', rsi: 'RSI', macd: 'MACD', stoch: 'Stochastic' });
const IND_HELP = () => ({
  ma: XL('Moving averages show the trend: price above an average means that trend is up. MA20 = about a month of daily candles, MA50 = about a quarter, MA200 = the long-term trend. On other timeframes they count candles of that timeframe.', 'เส้นค่าเฉลี่ยบอกเทรนด์ ราคาอยู่เหนือเส้นไหน = เทรนด์ช่วงนั้นเป็นขาขึ้น บนกราฟรายวัน MA20 ≈ 1 เดือน MA50 ≈ 1 ไตรมาส MA200 = เทรนด์ระยะยาว ถ้าเปลี่ยนไทม์เฟรม เส้นจะนับตามแท่งของไทม์เฟรมนั้น'),
  vol: XL('Bars at the bottom of the price pane: green = the candle closed up, red = down. Moves on rising volume are more trustworthy; moves on thin volume fade easily.', 'แท่งด้านล่างของช่องราคา เขียว = แท่งปิดขึ้น แดง = ปิดลง ราคาขยับพร้อมวอลุ่มที่เพิ่มขึ้นน่าเชื่อถือกว่า ถ้าวอลุ่มบางมักไปต่อไม่ไกล'),
  bb: XL('Bollinger 20/2: bands = MA20 ± 2 standard deviations. Near the upper band = stretched up, near the lower band = stretched down. A narrow band often comes before a big move.', 'Bollinger 20/2: กรอบ = MA20 บวกลบ 2 เท่าของส่วนเบี่ยงเบนมาตรฐาน ใกล้ขอบบน = ยืดขึ้นมาเยอะ ใกล้ขอบล่าง = ยืดลงมาเยอะ กรอบแคบมักเกิดก่อนราคาวิ่งแรง'),
  fib: XL('Fibonacci retracement, drawn automatically on the latest big swing (the highest high and lowest low of the last few months on 1D; the window scales with the timeframe), marked on the chart. It stays put when you zoom or scroll. After a move, price often pulls back to 38.2–61.8% of it before carrying on; the shaded 50–61.8% band is the "golden zone". Each level shows its price on the right axis. Levels, not a signal.', 'Fibonacci retracement วาดอัตโนมัติจากสวิงใหญ่ล่าสุด (จุดสูงสุดกับต่ำสุดของช่วงไม่กี่เดือนล่าสุดบนกราฟรายวัน ช่วงจะปรับตามไทม์เฟรม) และมีจุดบอกบนกราฟ ระดับไม่ขยับตามการซูมหรือเลื่อน หลังราคาวิ่งไปแล้ว มักย่อกลับมาราว 38.2–61.8% ก่อนไปต่อ แถบที่แรเงา 50–61.8% คือ "golden zone" แต่ละระดับมีราคาบอกที่แกนขวา เป็นแค่ระดับราคา ไม่ใช่สัญญาณ'),
  rsi: XL('RSI 14: above 70 = stretched up, below 30 = stretched down, 50 is the midline. In a strong trend RSI can stay in either zone for a long time.', 'RSI 14: เกิน 70 = ร้อนเกิน ต่ำกว่า 30 = ขายมากเกิน เส้น 50 คือกึ่งกลาง ในเทรนด์แรง RSI ค้างโซนร้อนหรือโซนขายมากเกินได้นาน'),
  macd: XL('MACD 12/26/9: bars above zero = momentum up, below = down. The MACD line crossing above the signal line often marks momentum turning up.', 'MACD 12/26/9: แท่งเหนือศูนย์ = แรงส่งเป็นขาขึ้น ใต้ศูนย์ = ขาลง เส้น MACD ตัดขึ้นเหนือเส้น Signal มักเป็นจุดที่แรงส่งเริ่มกลับขึ้น'),
  stoch: XL(`Stochastic ${STOCH.join('/')}, a fast oscillator. Above 80 = closing near the top of the last ${STOCH[0]} candles, below 20 = near the bottom. %K crossing %D shows short-term turns, but it gives many false signals in a strong trend.`, `Stochastic ${STOCH.join('/')} ตัวแกว่งเร็ว เกิน 80 = ราคาปิดใกล้จุดสูงสุดของ ${STOCH[0]} แท่งล่าสุด ต่ำกว่า 20 = ใกล้จุดต่ำสุด %K ตัด %D บอกจังหวะกลับตัวระยะสั้น แต่ในเทรนด์แรงหลอกบ่อย`),
  touch: XL('On a phone: press and hold the chart, then drag to read any day; let go to return to the latest candle. Swipe sideways to scroll; older candles load on their own.', 'บนมือถือ: แตะค้างบนกราฟแล้วลากเพื่ออ่านค่าแต่ละวัน ปล่อยนิ้วแล้วกลับเป็นค่าล่าสุด ปัดซ้าย-ขวาเพื่อเลื่อนกราฟ แท่งเก่าจะโหลดเพิ่มเอง') });
const readOf = {
  rsi: (v) => v == null ? null : v >= 70 ? [XL('Overbought', 'ร้อนเกิน'), 'warn'] : v <= 30 ? [XL('Oversold', 'ขายมากเกิน'), 'warn'] : v >= 50 ? [XL('Buyers in control', 'ฝั่งซื้อคุม'), 'up'] : [XL('Sellers in control', 'ฝั่งขายคุม'), 'dn'],
  macd: (h) => h == null ? null : h > 0 ? [XL('Momentum up', 'แรงส่งขาขึ้น'), 'up'] : [XL('Momentum down', 'แรงส่งขาลง'), 'dn'],
  stoch: (k, d) => k == null ? null : k >= 80 ? [XL('Near the top', 'ใกล้จุดสูง'), 'warn'] : k <= 20 ? [XL('Near the bottom', 'ใกล้จุดต่ำ'), 'warn'] : d != null && k > d ? [XL('%K above %D', '%K เหนือ %D'), 'up'] : [XL('%K below %D', '%K ใต้ %D'), 'dn'] };

function spanBars(tf, days) { return days === Infinity ? Infinity : Math.round((days * 864e5) / TFMS[tf]); }
const isMobile = () => matchMedia('(max-width: 767px)').matches;

/* v69 Stochastic settings: a small button beside the Stochastic switch opens three number fields (Apply / Reset to 9/3/3) */
const setIcon = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2 4h7M13 4h1M2 12h1M7 12h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="11" cy="4" r="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="5" cy="12" r="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
const maSetBtn = () => `<button type="button" class="indt-set" data-maset aria-expanded="${MASET}" aria-controls="maSet" aria-label="${esc(XL('Moving average settings', 'ตั้งค่าเส้น MA'))}" title="${esc(XL('Moving average settings', 'ตั้งค่าเส้น MA'))}">${setIcon}</button>`;
function maSetForm() {
  const C = chartColors(), col = [C.ma20, C.ma50, C.ma200];
  return `<form class="stset maset" id="maSet" data-maform novalidate${MASET ? '' : ' hidden'}><div class="maset-rows">${MAC.l.map(([n, on], i) => `<label class="maset-r"><input type="checkbox" name="on${i}" ${on ? 'checked' : ''}><i style="background:${col[i]}" aria-hidden="true"></i><span>${esc(XL(`Line ${i + 1}`, `เส้นที่ ${i + 1}`))}</span><input class="input" type="number" inputmode="numeric" name="n${i}" min="2" max="400" step="1" value="${n}" aria-label="${esc(XL(`Line ${i + 1} length`, `ความยาวเส้นที่ ${i + 1}`))}"></label>`).join('')}</div>
    <div class="seg sm maset-type" role="radiogroup" aria-label="${esc(XL('Type', 'ชนิด'))}">${[['sma', 'SMA'], ['ema', 'EMA']].map(([k, l]) => `<label><input type="radio" name="type" value="${k}" ${MAC.type === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
    <div class="stset-act"><button type="submit" class="btn sm">${esc(XL('Apply', 'ใช้ค่านี้'))}</button><button type="button" class="btn sm" data-mareset>${esc(XL('Reset to', 'กลับเป็น'))} MA20/50/200</button><span class="stset-err" data-maerr role="alert"></span></div></form>`;
}
function cmpForm(t) {
  const sug = [...new Set(['BTC', 'ETH', ...S.cfg.map((x) => x.symbol)])].filter((x) => x !== t.symbol).slice(0, 12);
  return `<form class="stset cmpset" id="cmpSet" data-cmpform novalidate${CMPSET ? '' : ' hidden'}><div class="cmp-chips">${sug.map((x) => `<button type="button" class="cmp-chip" data-cmppick="${x}" aria-pressed="${PCMP === x}">${x}</button>`).join('')}</div>
    <div class="stset-act"><label class="cmp-in"><span>${esc(XL('Any coin', 'เหรียญอื่น'))}</span><input class="input" name="sym" placeholder="${esc(XL('e.g. DOGE', 'เช่น DOGE'))}" autocomplete="off" autocapitalize="characters" maxlength="12"></label><button type="submit" class="btn sm">${esc(XL('Compare', 'เทียบ'))}</button>${PCMP ? `<button type="button" class="btn sm" data-cmpoff>${esc(XL('Remove', 'เอาออก'))} ${PCMP}</button>` : ''}<span class="stset-err" data-cmperr role="alert"></span></div></form>`;
}
const stSetBtn = () => `<button type="button" class="indt-set" data-stset aria-expanded="${STSET}" aria-controls="stSet" aria-label="${esc(XL('Stochastic settings', 'ตั้งค่า Stochastic'))}" title="${esc(XL('Stochastic settings', 'ตั้งค่า Stochastic'))}"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2 4h7M13 4h1M2 12h1M7 12h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="11" cy="4" r="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="5" cy="12" r="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>`;
function stSetForm() {
  const f = (i, name, lbl) => `<label class="stset-f"><span>${esc(lbl)}</span><input class="input" type="number" inputmode="numeric" name="${name}" min="${STOCH_LIM[i][0]}" max="${STOCH_LIM[i][1]}" step="1" value="${STOCH[i]}" required></label>`;
  return `<form class="stset" id="stSet" data-stform novalidate${STSET ? '' : ' hidden'}><div class="stset-row">${f(0, 'n', XL('%K period', 'ช่วง %K'))}${f(1, 's', XL('%K smoothing', 'ปรับเรียบ %K'))}${f(2, 'd', '%D')}</div>
    <div class="stset-act"><button type="submit" class="btn sm">${esc(XL('Apply', 'ใช้ค่านี้'))}</button><button type="button" class="btn sm" data-streset>${esc(XL('Reset to', 'กลับเป็น'))} ${STOCH_DEF.join('/')}</button><span class="stset-err" data-sterr role="alert"></span></div></form>`;
}
function renderPriceTab(t, b) {
  const th = LANG === 'th', Lb = IND_LBL(), H = IND_HELP(), help = (k, n) => uiHelp(H[k], XL(`How to read ${n}`, `อ่าน ${n} ยังไง`));
  const tfs = `<div class="seg sm ptf" role="group" aria-label="${esc(XL('Timeframe', 'ไทม์เฟรม'))}">${PCTFS.map((x) => `<button type="button" data-ptf="${x}" aria-pressed="${PCTF === x}">${PCTF_LBL[x]}</button>`).join('')}</div>`;
  const all = `<button type="button" class="btn sm pall" data-pall aria-pressed="${PALL}">${esc(PALL ? XL('Latest', 'ล่าสุด') : XL('See all', 'ดูทั้งหมด'))}</button>`;
  const cmpB = `<button type="button" class="btn sm pcmp" data-cmpset aria-expanded="${CMPSET}" aria-controls="cmpSet" aria-pressed="${!!PCMP}">${esc(PCMP && PCMP !== t.symbol ? XL(`vs ${PCMP}`, `เทียบ ${PCMP}`) : XL('Compare', 'เทียบ'))}</button>`;
  const psz = `<div class="seg sm psz" role="group" aria-label="${esc(XL('Indicator pane height', 'ความสูงช่องอินดิเคเตอร์'))}">${[['s', XL('S', 'เล็ก')], ['m', XL('M', 'กลาง')], ['l', XL('L', 'ใหญ่')]].map(([k, l]) => `<button type="button" data-psz="${k}" aria-pressed="${PSZ === k}" title="${esc(XL('Indicator pane height', 'ความสูงช่องอินดิเคเตอร์'))}">${esc(l)}</button>`).join('')}</div>`;
  const sw = `<div class="indt" role="group" aria-label="${esc(XL('Indicators', 'อินดิเคเตอร์'))}">${IND_KEYS.map((k) => `<button type="button" class="indt-b" data-ind="${k}" aria-pressed="${IND[k]}"><i aria-hidden="true"></i>${esc(Lb[k])}${k === 'stoch' ? ` <small>${STOCH.join('/')}</small>` : ''}</button>${k === 'stoch' ? stSetBtn() : k === 'ma' ? maSetBtn() : ''}`).join('')}</div>${maSetForm()}${stSetForm()}${cmpForm(t)}`;
  b.innerHTML = `<div class="ptool">${tfs}${all}${cmpB}${psz}</div>${sw}
    <div class="pcw" id="pcw"><div class="pchart5" id="ch1"></div><div class="pc-read" id="pRead" aria-live="off"></div><div id="pLbls"></div><div class="pc-load" id="pLoad" hidden>${esc(XL('Loading older candles…', 'กำลังโหลดแท่งเก่า…'))}</div></div>
    <div class="pfoot" id="pFoot"></div>`;
  const key = pcKey(t, PCTF), c = PC[key];
  if (c && c.k) return drawPrice(t, c, PCTF);
  $('#ch1').innerHTML = `<div class="sk" style="height:100%"></div>`;
  pcLoad(t, PCTF).then((x) => { if (S.sel === t.symbol && S.tab === 'chart' && $('#pcw')) drawPrice(t, x, PCTF); })
    .catch((e) => { const el = $('#ch1'); if (el) el.innerHTML = `<p class="err">${esc(T('feedFail'))}: ${esc(e.message)}</p>`; });
}

function drawPrice(t, c, tf) {
  killCharts(); const wrap = $('#pcw'), host = $('#ch1'); if (!wrap || !host) return; host.innerHTML = '';
  const Cc = chartColors(), th = LANG === 'th', mob = isMobile(), oscs = OSC.filter((k) => IND[k]);
  const priceH = mob ? 300 : 430, oscH = OSCSZ[PSZ][mob ? 0 : 1]; wrap.style.height = priceH + oscH * oscs.length + 'px';
  const LW = LightweightCharts, intra = TFMS[tf] < 864e5;
  const chart = LW.createChart(host, { autoSize: true, layout: { background: { color: 'transparent' }, textColor: Cc.tx, fontSize: 11, fontFamily: getComputedStyle(document.body).fontFamily, panes: { separatorColor: Cc.line, separatorHoverColor: Cc.ac, enableResize: !mob } }, // v70: drag the separators on a desktop (a phone uses S / M / L: dragging there is the long-press reading)
    grid: { vertLines: { visible: false }, horzLines: { color: Cc.line } }, rightPriceScale: { borderVisible: false, minimumWidth: 64 }, timeScale: { borderVisible: false, timeVisible: intra, secondsVisible: false, rightOffset: 4, minBarSpacing: 0.05 }, // v67: "See all" fits years of candles
    crosshair: { mode: 0, vertLine: { color: Cc.mut, labelBackgroundColor: Cc.tx }, horzLine: { visible: false, labelVisible: false } }, // v68: the horizontal line is drawn below, snapped to the candle
    handleScroll: { vertTouchDrag: false }, trackingMode: { exitMode: LW.TrackingModeExitMode.OnTouchEnd } });
  S.charts.push(chart);
  const pxf = { type: 'custom', minMove: 1e-8, formatter: (v) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : Math.abs(v) >= 1 ? v.toFixed(2) : v.toPrecision(4)) };
  const whole = { type: 'custom', minMove: 1, formatter: (v) => v.toFixed(0) }, fixed100 = { autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) };
  const ser = {}; let k = c.k, I = pcCalc(k), idx = new Map();
  const T0 = (x) => ts(x.t, intra);
  ser.c = chart.addSeries(LW.CandlestickSeries, { upColor: Cc.up, downColor: Cc.dn, borderVisible: false, wickUpColor: Cc.up, wickDownColor: Cc.dn, priceLineVisible: false, priceFormat: pxf }, 0);
  const L = (pane, color, w = 1.5, o = {}) => chart.addSeries(LW.LineSeries, { color, lineWidth: w, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: true, crosshairMarkerRadius: 3.5, crosshairMarkerBorderWidth: 1.5, crosshairMarkerBorderColor: Cc.bg || '#fff', ...o }, pane); // v67: a dot on every line at the crosshair, in every pane
  const noDot = { crosshairMarkerVisible: false }; // v68: no dots on the price-pane lines (their values are in the value bar); the candle gets the dot
  const maCol = [Cc.ma20, Cc.ma50, Cc.ma200]; ser.mas = IND.ma ? MAC.l.map(([, on], i) => (on ? L(0, maCol[i], 1.5, noDot) : null)) : [null, null, null];
  if (IND.bb) { ser.bbUp = L(0, Cc.mut, 1, { lineStyle: 2, ...noDot }); ser.bbLo = L(0, Cc.mut, 1, { lineStyle: 2, ...noDot }); }
  if (IND.vol) { ser.vol = chart.addSeries(LW.HistogramSeries, { priceScaleId: 'vol', priceFormat: { type: 'custom', formatter: big }, priceLineVisible: false, lastValueVisible: false }, 0);
    chart.priceScale('vol', 0).applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } }); }
  ser.c.priceScale().applyOptions({ scaleMargins: { top: mob ? (PCMP && PCMP !== t.symbol ? 0.28 : 0.2) : 0.08, bottom: IND.vol ? 0.24 : 0.06 } }); // v67: on a phone the value bar wraps to 3 lines, so the candles start below it
  const pane = {}; oscs.forEach((kk, i) => { pane[kk] = i + 1; });
  const lvl = (sr, v, st = 2) => sr.createPriceLine({ price: v, color: Cc.mut, lineStyle: st, lineWidth: 1, axisLabelVisible: true, axisLabelColor: Cc.line, axisLabelTextColor: Cc.tx, title: '' }); // v70: the level is written on the axis
  const lvlQ = (sr, v, st = 2) => sr.createPriceLine({ price: v, color: Cc.mut, lineStyle: st, lineWidth: 1, axisLabelVisible: false, title: '' }); // the label is drawn by vtDraw()
  const tag = { lastValueVisible: false }; // v71: the value tags are drawn by vtDraw() below so they follow the crosshair (the library's tags always show the last bar)
  if (IND.rsi) { ser.rsi = L(pane.rsi, Cc.ac, 1.5, { priceScaleId: 'osc', priceFormat: { type: 'custom', minMove: 0.01, formatter: (v) => v.toFixed(1) }, ...fixed100, ...tag }); [70, 50, 30].forEach((v) => lvlQ(ser.rsi, v, v === 50 ? 3 : 2)); }
  if (IND.macd) { ser.hist = chart.addSeries(LW.HistogramSeries, { priceLineVisible: false, lastValueVisible: false, priceFormat: { type: 'custom', formatter: cmp } }, pane.macd);
    ser.macd = L(pane.macd, Cc.ac, 1.5, { ...tag, priceFormat: { type: 'custom', minMove: 1e-8, formatter: cmp } }); ser.sig = L(pane.macd, Cc.ma50, 1.5, { ...tag, priceFormat: { type: 'custom', minMove: 1e-8, formatter: cmp } }); lvl(ser.macd, 0, 3); }
  const one = { type: 'custom', minMove: 0.01, formatter: (v) => v.toFixed(1) };
  if (IND.stoch) { ser.sk = L(pane.stoch, Cc.ac, 1.5, { priceScaleId: 'osc', priceFormat: one, ...fixed100, ...tag }); ser.sd = L(pane.stoch, Cc.ma50, 1.5, { priceScaleId: 'osc', priceFormat: one, ...tag }); [80, 50, 20].forEach((v) => lvlQ(ser.sk, v, v === 50 ? 3 : 2)); }
  // v71: tight margins in the indicator panes (the default left a 0-100 oscillator reading -50..150 on a tall pane)
  [ser.rsi, ser.macd, ser.sk].forEach((sr) => { if (sr) sr.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.08 } }); });
  const f1 = (v) => v.toFixed(1), VT = [];
  if (ser.rsi) VT.push([ser.rsi, Cc.ac, 'rsi', f1]);
  if (ser.macd) VT.push([ser.macd, Cc.ac, 'macd', cmp], [ser.sig, Cc.ma50, 'sig', cmp]);
  if (ser.sk) VT.push([ser.sk, Cc.ac, 'k', f1], [ser.sd, Cc.ma50, 'd', f1]);
  const LVQ = [...(ser.rsi ? [[ser.rsi, [70, 50, 30]]] : []), ...(ser.sk ? [[ser.sk, [80, 50, 20]]] : [])]; // fixed levels written on the axis
  const ps = chart.panes(); ps[0].setStretchFactor(priceH); oscs.forEach((kk) => ps[pane[kk]] && ps[pane[kk]].setStretchFactor(oscH));
  // ---- v70 compare: another coin on the price pane, the right scale in % from the first bar in view ----
  let cc = null; const cmpOn = !!(PCMP && PCMP !== t.symbol);
  if (cmpOn) { ser.cmp = chart.addSeries(LW.LineSeries, { color: CMPC, lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: PCMP, crosshairMarkerVisible: false, priceFormat: pxf }, 0);
    chart.priceScale('right', 0).applyOptions({ mode: LW.PriceScaleMode.Percentage }); }
  const cmpData = () => { if (!ser.cmp) return; if (!cc || !cc.k) { ser.cmp.setData([]); return; } const m = new Map(cc.k.map((x) => [x.t, x.c])); ser.cmp.setData(k.map((x) => (m.has(x.t) ? { time: T0(x), value: m.get(x.t) } : { time: T0(x) }))); };
  const cmpFill = async () => { if (!cc) return; let g = 0; while (cc.k && k.length && cc.k[0].t > k[0].t && !cc.done && g++ < 6) { const n = await pcMore(cc, tf); if (!n) break; } cmpData(); };
  if (cmpOn) pcLoad(cmpTok(PCMP), tf).then((x) => { if (!S.charts.includes(chart)) return; cc = x; cmpFill(); read(lastClosed(), false); foot(); })
    .catch((e) => { const el = $('#pRead'); if (el) el.insertAdjacentHTML('beforeend', `<span class="err">${esc(PCMP)}: ${esc(XL('no candles', 'ไม่มีข้อมูล'))}</span>`); });
  let vtRef = () => {}; // set to vtSoon once the tags exist (apply() runs before that)
  const lineData = (vals) => k.map((x, i) => (vals[i] == null ? { time: T0(x) } : { time: T0(x), value: vals[i] })); // whitespace keeps every pane on the same bars
  const apply = () => {
    idx = new Map(k.map((x, i) => [T0(x), i]));
    ser.c.setData(k.map((x) => ({ time: T0(x), open: x.o, high: x.h, low: x.l, close: x.c })));
    ser.mas.forEach((x, i) => { if (x) x.setData(lineData(I.mas[i])); }); cmpData();
    if (ser.bbUp) { ser.bbUp.setData(lineData(I.bbUp)); ser.bbLo.setData(lineData(I.bbLo)); }
    if (ser.vol) ser.vol.setData(k.map((x) => ({ time: T0(x), value: x.q || x.v * x.c, color: x.c >= x.o ? Cc.upA : Cc.dnA })));
    if (ser.rsi) ser.rsi.setData(lineData(I.rsi));
    if (ser.hist) { ser.hist.setData(k.map((x, i) => (I.hist[i] == null ? { time: T0(x) } : { time: T0(x), value: I.hist[i], color: I.hist[i] >= 0 ? Cc.upA : Cc.dnA }))); ser.macd.setData(lineData(I.macd)); ser.sig.setData(lineData(I.sig)); }
    if (ser.sk) { ser.sk.setData(lineData(I.k)); ser.sd.setData(lineData(I.d)); }
    vtRef();
  };
  apply();
  // ---- range ----
  const showSpan = async (days) => {
    const need = spanBars(tf, days);
    while ((need === Infinity || k.length < need + 5) && !c.done && k.length < MAXB) { $('#pLoad').hidden = false; const n = await pcMore(c, tf); if (!n) break; k = c.k; I = pcCalc(k); apply(); }
    $('#pLoad').hidden = true; const n = k.length, from = need === Infinity ? 0 : Math.max(0, n - need);
    chart.timeScale().setVisibleLogicalRange({ from, to: n + 3 }); fibZone();
  };
  // ---- Fibonacci (v67): fixed on the latest big swing (the last FIB_BARS bars), so zooming or scrolling never moves it. Each level has its
  //      price on the right axis; the swing high and low are marked; the 50–61.8% golden zone is shaded from the swing start to the right edge.
  let fibLines = [], fibInfo = null, fibMk = null;
  const zone = document.createElement('div'); zone.className = 'pc-fibz'; zone.hidden = true; wrap.appendChild(zone);
  const fibZone = () => { if (!fibInfo || !IND.fib) { zone.hidden = true; return; } const f = fibInfo, ph = chart.panes()[0].getHTMLElement(); if (!ph) return;
    const wr = wrap.getBoundingClientRect(), pr = ph.getBoundingClientRect(), y1 = ser.c.priceToCoordinate(f.lv[3].p), y2 = ser.c.priceToCoordinate(f.lv[4].p), x0 = chart.timeScale().logicalToCoordinate(Math.min(f.hi, f.lo)), sw = chart.priceScale('right').width();
    if (y1 == null || y2 == null) { zone.hidden = true; return; } const left = Math.max(0, x0 == null ? 0 : x0), right = pr.width - sw;
    if (right - left < 4) { zone.hidden = true; return; }
    Object.assign(zone.style, { top: `${pr.top - wr.top + Math.min(y1, y2)}px`, height: `${Math.max(2, Math.abs(y2 - y1))}px`, left: `${pr.left - wr.left + left}px`, width: `${right - left}px` }); zone.hidden = false; };
  const fib = () => { fibLines.forEach((l) => { try { ser.c.removePriceLine(l); } catch (e) {} }); fibLines = []; fibInfo = null; if (fibMk) { try { fibMk.setMarkers([]); } catch (e) {} }
    if (!IND.fib) { fibZone(); return foot(); }
    const n = k.length, f = fibOf(k, Math.max(0, n - FIB_BARS[tf]), n - 1); if (!f) { fibZone(); return foot(); } fibInfo = f;
    f.lv.filter(({ r }) => FIB_SHOW.includes(r)).forEach(({ r: q, p }) => fibLines.push(ser.c.createPriceLine({ price: p, color: q === 0.618 || q === 0.5 ? FIBC : 'rgba(167,139,250,.6)', lineStyle: q === 0 || q === 1 ? 0 : 2, lineWidth: q === 0.618 ? 2 : 1, axisLabelVisible: !cmpOn, axisLabelColor: FIBC, axisLabelTextColor: '#fff', title: `${Number.isInteger(Math.round(q * 1000) / 10) ? Math.round(q * 100) : (q * 100).toFixed(1)}%` })));
    const mk = [{ time: T0(k[f.hi]), position: 'aboveBar', color: FIBC, shape: 'arrowDown', text: XL('swing high', 'สวิงสูง') }, { time: T0(k[f.lo]), position: 'belowBar', color: FIBC, shape: 'arrowUp', text: XL('swing low', 'สวิงต่ำ') }].sort((a, b) => a.time - b.time);
    try { if (!fibMk) fibMk = LW.createSeriesMarkers(ser.c, mk); else fibMk.setMarkers(mk); } catch (e) {}
    requestAnimationFrame(fibZone); foot(); };
  // ---- lazy load older candles when the view reaches the left edge ----
  chart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
    if (!r) return; requestAnimationFrame(fibZone); vtSoon();
    if (r.from < 25 && !c.done && !c.more && k.length < MAXB) { $('#pLoad').hidden = false;
      pcMore(c, tf).then((n) => { $('#pLoad').hidden = true; if (!n || !S.charts.includes(chart)) return; const cur = chart.timeScale().getVisibleLogicalRange(); k = c.k; I = pcCalc(k); apply(); fib(); cmpFill(); if (cur) chart.timeScale().setVisibleLogicalRange({ from: cur.from + n, to: cur.to + n }); }); }
  });
  // ---- readouts: the bar pinned at the top and one label per pane ----
  const f2 = (v, dg = 1) => (v == null || !Number.isFinite(v) ? '–' : v.toFixed(dg)), chip = (r) => (r ? ` <span class="ind-chip ${r[1]}">${esc(r[0])}</span>` : '');
  const when = (x) => new Date(x.t).toLocaleString(loc(), intra ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } : { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  // v71 value tags on the right axis: the value of every indicator line at the candle under the pointer (the latest closed candle otherwise)
  const vtBox = document.createElement('div'); vtBox.className = 'pc-vts'; wrap.appendChild(vtBox); let vtI = null;
  const vtDraw = () => { if (!VT.length || !S.charts.includes(chart)) { vtBox.innerHTML = ''; return; } const i = vtI != null ? vtI : lastClosed(), wr = wrap.getBoundingClientRect(), sw = chart.priceScale('right').width(), out = [];
    const byPane = new Map(); VT.forEach(([sr, col, key, f]) => { const v = I[key] && I[key][i], pe = sr.getPane(), el = pe && pe.getHTMLElement(); if (v == null || !el) return; const y = sr.priceToCoordinate(v); if (y == null) return;
      const pr = el.getBoundingClientRect(), it = { top: pr.top - wr.top + Math.max(8, Math.min(pr.height - 8, y)), col, txt: f(v), lo: pr.top - wr.top + 8, hi: pr.top - wr.top + pr.height - 8 };
      const k = pe.paneIndex(); if (!byPane.has(k)) byPane.set(k, []); byPane.get(k).push(it); });
    byPane.forEach((a) => { a.sort((x, y) => x.top - y.top); for (let j = 1; j < a.length; j++) if (a[j].top - a[j - 1].top < 16) a[j].top = a[j - 1].top + 16; // no two tags on top of each other
      const over = a.length ? a[a.length - 1].top - a[0].hi : 0; if (over > 0) a.forEach((x) => { x.top -= over; }); out.push(...a); });
    const lv = []; LVQ.forEach(([sr, vals]) => { const el = sr.getPane() && sr.getPane().getHTMLElement(); if (!el) return; const pr = el.getBoundingClientRect();
      vals.forEach((v) => { const y = sr.priceToCoordinate(v); if (y != null && y > 6 && y < pr.height - 6 && !out.some((t) => Math.abs(t.top - (pr.top - wr.top + y)) < 14)) lv.push(`<span class="lv num" style="top:${(pr.top - wr.top + y).toFixed(1)}px;width:${sw}px">${v}</span>`); }); });
    vtBox.innerHTML = lv.join('') + out.map((t) => `<span class="num" style="top:${t.top.toFixed(1)}px;width:${sw}px;background:${t.col}">${esc(t.txt)}</span>`).join(''); };
  const vtSoon = () => requestAnimationFrame(vtDraw); vtRef = vtSoon;
  host.addEventListener('pointermove', vtSoon); host.addEventListener('wheel', vtSoon, { passive: true }); host.addEventListener('dblclick', vtSoon); // dragging or resetting the right axis moves the tags with it
  const lastClosed = () => { const n = k.length; return n > 1 && k[n - 1].t + TFMS[tf] > Date.now() ? n - 2 : n - 1; };
  const cmpRead = (i) => { if (!ser.cmp || !cc || !cc.k) return ''; const r = chart.timeScale().getVisibleLogicalRange(), a = Math.max(0, Math.min(k.length - 1, Math.ceil(r ? r.from : 0))), m = new Map(cc.k.map((x) => [x.t, x.c]));
    let b0 = null; for (let j = a; j < k.length && b0 == null; j++) b0 = m.get(k[j].t) != null ? j : null; if (b0 == null || b0 > i) return '';
    const me = (k[i].c / k[b0].c - 1) * 100, o = m.get(k[i].t), them = o != null ? (o / m.get(k[b0].t) - 1) * 100 : null;
    return `<span class="pr-cmp" data-prcmp>${esc(t.symbol)} <b class="num ${cls(me)}">${pct(me, 1)}</b> · <i style="background:${CMPC}"></i>${esc(PCMP)} <b class="num ${cls(them)}">${them == null ? '–' : pct(them, 1)}</b> <span class="mut">${esc(XL('since', 'ตั้งแต่'))} ${esc(when(k[b0]))}</span></span>`; };
  const read = (i, cursor) => {
    const x = k[i]; if (!x) return; const p = i ? k[i - 1].c : null, ch = p ? (x.c / p - 1) * 100 : null, el = $('#pRead'); if (!el) return;
    el.innerHTML = `<b class="pr-d">${esc(when(x))}${cursor ? '' : ` · ${esc(i === k.length - 1 ? XL('live', 'ล่าสุด') : XL('last close', 'ปิดล่าสุด'))}`}</b> <span>O <b class="num">${px(x.o)}</b></span> <span>H <b class="num">${px(x.h)}</b></span> <span>L <b class="num">${px(x.l)}</b></span> <span>C <b class="num">${px(x.c)}</b></span>${ch != null ? ` <b class="num ${cls(ch)}">${pct(ch)}</b>` : ''}${IND.vol ? ` <span>${esc(XL('Vol', 'วอลุ่ม'))} <b class="num">${big(x.q || x.v * x.c)}</b></span>` : ''}`
      + cmpRead(i) + `<span class="pr-ma">${(IND.ma ? MAC.l.map(([n, on], j) => [maLbl(n), on ? I.mas[j][i] : null, maCol[j]]) : []).filter((m) => m[1] != null).map(([l, v, col]) => `<span><i style="background:${col}"></i>${l} <b class="num">${px(v)}</b></span>`).join('')}${IND.bb && I.bbUp[i] != null ? `<span><i style="background:${Cc.mut}"></i>BB <b class="num">${px(I.bbLo[i])}–${px(I.bbUp[i])}</b></span>` : ''}</span>`; // v67: every price-pane line has its value
    const lbl = $('#pLbls'); if (!lbl) return;
    const put = (kk, html) => { const e = lbl.querySelector(`[data-pl="${kk}"] .pl-v`); if (e) e.innerHTML = html; };
    if (IND.rsi) put('rsi', `<b class="num">${f2(I.rsi[i])}</b>${chip(readOf.rsi(I.rsi[i]))}`);
    if (IND.macd) put('macd', `<b class="num">${cmp(I.macd[i])}</b> · sig <b class="num">${cmp(I.sig[i])}</b>${chip(readOf.macd(I.hist[i]))}`);
    if (IND.stoch) put('stoch', `%K <b class="num">${f2(I.k[i], 0)}</b> · %D <b class="num">${f2(I.d[i], 0)}</b>${chip(readOf.stoch(I.k[i], I.d[i]))}`);
  };
  const labels = () => { const lbl = $('#pLbls'); if (!lbl) return; const wr = wrap.getBoundingClientRect(), ps2 = chart.panes();
    lbl.innerHTML = oscs.map((kk) => { const el = ps2[pane[kk]] && ps2[pane[kk]].getHTMLElement(); if (!el) return ''; const r = el.getBoundingClientRect();
      const name = { rsi: 'RSI 14', macd: mob ? 'MACD' : 'MACD 12/26/9', stoch: mob ? `Stoch ${STOCH.join('/')}` : `Stochastic ${STOCH.join('/')}` }[kk];
      return `<div class="pc-lbl" data-pl="${kk}" style="top:${Math.round(r.top - wr.top) + 4}px"><b>${esc(name)}</b> <span class="pl-v"></span></div>`; }).join('');
    read(lastClosed(), false); };
  requestAnimationFrame(labels); const ro = new ResizeObserver(() => requestAnimationFrame(() => { labels(); fibZone(); vtDraw(); })); ro.observe(wrap); chart._ro = ro;
  // v68: a dot on the candle at the crosshair: the nearest of open / high / low / close when the pointer is in the price pane, the close otherwise
  const cdot = document.createElement('div'), hl = document.createElement('div'); cdot.className = 'pc-cdot'; hl.className = 'pc-hl'; hl.innerHTML = '<span></span>'; cdot.hidden = hl.hidden = true; wrap.append(cdot, hl);
  chart.subscribeCrosshairMove((pm) => { const i = pm && pm.time != null ? idx.get(pm.time) : undefined; read(i != null ? i : lastClosed(), i != null); vtI = i != null ? i : null; vtDraw();
    const x = i != null ? k[i] : null, ph = chart.panes()[0].getHTMLElement(); if (!x || !pm.point || !ph) { cdot.hidden = hl.hidden = true; return; }
    if (pm.paneIndex > 0) { const pe = chart.panes()[pm.paneIndex], sr = pe && pe.getSeries().find((q) => q.seriesType() === 'Line'), el = pe && pe.getHTMLElement(); // v70: a value tag at the pointer in an indicator pane
      const v = sr && sr.coordinateToPrice(pm.point.y); if (v != null && el) { const wr = wrap.getBoundingClientRect(), pr = el.getBoundingClientRect(), sw = chart.priceScale('right').width();
        Object.assign(hl.style, { top: `${pr.top - wr.top + pm.point.y}px`, left: `${pr.left - wr.left}px`, width: `${pr.width}px`, '--sw': `${sw}px` }); hl.firstChild.textContent = sr.options().priceFormat.formatter ? sr.options().priceFormat.formatter(v) : v.toFixed(1); hl.hidden = false; }
      else hl.hidden = true; }
    let v = x.c; if (pm.paneIndex === 0) { const at = ser.c.coordinateToPrice(pm.point.y); if (at != null) v = [x.o, x.h, x.l, x.c].reduce((a, b) => (Math.abs(b - at) < Math.abs(a - at) ? b : a)); }
    const cy = ser.c.priceToCoordinate(v), cx = chart.timeScale().timeToCoordinate(pm.time); if (cy == null || cx == null) { cdot.hidden = hl.hidden = true; return; }
    const wr = wrap.getBoundingClientRect(), pr = ph.getBoundingClientRect(); cdot.style.left = `${pr.left - wr.left + cx}px`; cdot.style.top = `${pr.top - wr.top + cy}px`; cdot.style.background = x.c >= x.o ? Cc.up : Cc.dn; cdot.hidden = false;
    if (pm.paneIndex > 0) return; const sw = chart.priceScale('right').width(); Object.assign(hl.style, { top: `${pr.top - wr.top + cy}px`, left: `${pr.left - wr.left}px`, width: `${pr.width}px`, '--sw': `${sw}px` }); hl.firstChild.textContent = pxf.formatter(v); hl.hidden = false; });
  // ---- footer: legend, MA status, notes with their "?" ----
  const Lb = IND_LBL(), H = IND_HELP(), help = (kk, n) => uiHelp(H[kk], XL(`How to read ${n}`, `อ่าน ${n} ยังไง`));
  const foot = () => { const el = $('#pFoot'); if (!el) return; const lc = lastClosed(), cl = k[lc] ? k[lc].c : null, ma = (v, l) => (v ? `<span class="ma-chip ${cl > v ? 'up' : 'dn'}"><b>${l}</b> ${px(v)} <span>${cl > v ? '▲ ' + XL('above', 'เหนือ') : '▼ ' + XL('below', 'ใต้')}</span></span>` : '');
    const lg = (items) => `<div class="legend">${items.map(([n, col]) => `<span><i style="background:${col}"></i>${esc(n)}</span>`).join('')}</div>`;
    const leg = IND.ma ? MAC.l.map(([n, on], j) => (on ? [maLbl(n), maCol[j]] : null)).filter(Boolean) : []; if (ser.cmp) leg.push([XL(`${PCMP} (compare, %)`, `${PCMP} (เทียบ, %)`), CMPC]); if (IND.bb) leg.push([XL('Bollinger bands', 'กรอบ Bollinger'), Cc.mut]); if (IND.fib) leg.push(['Fibonacci', FIBC]);
    const notes = [];
    if (IND.fib) notes.push(fibInfo ? `<p class="pnote" data-indn="fib"><b>Fibonacci</b> ${esc(XL('latest big swing', 'สวิงใหญ่ล่าสุด'))}: ${fibInfo.up ? `${esc(XL('up-swing', 'สวิงขึ้น'))} ${esc(XL('low', 'ต่ำ'))} <b class="num">${px(fibInfo.L)}</b> → ${esc(XL('high', 'สูง'))} <b class="num">${px(fibInfo.H)}</b>` : `${esc(XL('down-swing', 'สวิงลง'))} ${esc(XL('high', 'สูง'))} <b class="num">${px(fibInfo.H)}</b> → ${esc(XL('low', 'ต่ำ'))} <b class="num">${px(fibInfo.L)}</b>`} · ${esc(XL('golden zone', 'golden zone'))} 50–61.8% <b class="num">${px(Math.min(fibInfo.lv[3].p, fibInfo.lv[4].p))} – ${px(Math.max(fibInfo.lv[3].p, fibInfo.lv[4].p))}</b></p>` : `<p class="pnote" data-indn="fib"><b>Fibonacci</b> ${esc(XL('no clear recent swing', 'ยังไม่มีสวิงชัดช่วงหลัง'))}</p>`);
    if (IND.bb && I.bbUp[lc] != null) notes.push(`<p class="pnote" data-indn="bb"><b>Bollinger 20/2</b> ${esc(XL('close at', 'ปิดที่'))} <b class="num">${(((cl - I.bbLo[lc]) / (I.bbUp[lc] - I.bbLo[lc])) * 100).toFixed(0)}%</b> ${esc(XL('of the band (0% = lower, 100% = upper)', 'ของกรอบ (0% = ขอบล่าง, 100% = ขอบบน)'))}</p>`);
    if (IND.vol) { const q = k.slice(Math.max(0, lc - 30), lc).map((x) => x.q || x.v * x.c), av = q.length ? q.reduce((a, x) => a + x, 0) / q.length : null, yq = k[lc] ? k[lc].q || k[lc].v * k[lc].c : null;
      notes.push(`<p class="pnote" data-indn="vol"><b>${esc(Lb.vol)}</b> ${esc(XL('last closed candle', 'แท่งที่ปิดล่าสุด'))} <b class="num">${yq != null ? big(yq) : '–'}</b> · ${esc(XL('30-candle average', 'เฉลี่ย 30 แท่ง'))} <span class="num">${av ? big(av) : '–'}</span>${yq && av ? ` · <span class="num">${(yq / av).toFixed(1)}×</span>` : ''}</p>`); }
    const hk = ['ma', ...(IND.vol ? ['vol'] : []), ...(IND.bb ? ['bb'] : []), ...(IND.fib ? ['fib'] : []), ...oscs], hn = { ma: 'MA', ...Lb };
    const oscHelp = `<span class="pf-hl">${esc(XL('How to read', 'อ่านยังไง'))}</span>` + hk.map((kk) => `<span class="pf-h">${esc(hn[kk])} ${help(kk, hn[kk])}</span>`).join('') + (mob ? `<span class="pf-h">${esc(XL('Phone tips', 'ใช้บนมือถือ'))} ${uiHelp(H.touch, XL('How to use the chart on a phone', 'ใช้กราฟบนมือถือยังไง'))}</span>` : '');
    Object.assign(wrap.dataset, { tf: PCTF_LBL[tf], src: `${EXNAME[c.src.ex]} ${c.src.pair}`, bars: String(k.length), from: new Date(k[0].t).toISOString().slice(0, 10) }); // v68: no source line on screen
    el.innerHTML = `<div class="pf-row">${lg(leg)}</div><div class="pf-hs">${oscHelp}</div>
      <div class="ma-row">${IND.ma ? MAC.l.map(([n, on], j) => (on ? ma(I.mas[j][lc], maLbl(n)) : '')).join('') : ''}</div>${notes.join('')}`; };
  // ---- live: the newest candle follows the price feed when the chart reads the same pair ----
  S.live = { onTick: (price) => { if (c.src !== t._src || !k.length) return; const now = Date.now(), last = k[k.length - 1];
    if (now >= last.t + TFMS[tf]) { const t0 = Math.floor(now / TFMS[tf]) * TFMS[tf]; if (tf === '1w' || tf === '1M') return; k.push({ t: t0, o: price, h: price, l: price, c: price, v: 0, q: 0 }); I = pcCalc(k); apply(); return; }
    last.c = price; last.h = Math.max(last.h, price); last.l = Math.min(last.l, price);
    try { ser.c.update({ time: T0(last), open: last.o, high: last.h, low: last.l, close: last.c }); } catch (e) {} } };
  fib(); showSpan(PALL ? Infinity : VIEW_DEF[tf]);
}

/* controls */
document.addEventListener('click', (e) => {
  const q = (s) => e.target.closest && e.target.closest(s); let el;
  const redraw = () => { const t = tokBySym(S.sel); if (!t) return; const y = scrollY; renderTab(t); scrollTo(0, y); };
  if ((el = q('[data-ptf]'))) { PCTF = el.dataset.ptf; PALL = false; store.set('cw-ptf', PCTF); return redraw(); }
  if ((el = q('[data-pall]'))) { PALL = !PALL; return redraw(); }
  if ((el = q('[data-maset]'))) { MASET = !MASET; el.setAttribute('aria-expanded', String(MASET)); const f = $('#maSet'); if (f) { f.hidden = !MASET; if (MASET) f.querySelector('input').focus(); } return; }
  if ((el = q('[data-mareset]'))) { Object.assign(MAC, JSON.parse(JSON.stringify(MA_DEF))); store.set('cw-ma', MAC); MASET = false; return redraw(); }
  if ((el = q('[data-cmpset]'))) { CMPSET = !CMPSET; el.setAttribute('aria-expanded', String(CMPSET)); const f = $('#cmpSet'); if (f) f.hidden = !CMPSET; return; }
  if ((el = q('[data-cmppick]'))) { PCMP = PCMP === el.dataset.cmppick ? null : el.dataset.cmppick; store.set('cw-cmp', PCMP); CMPSET = false; return redraw(); }
  if ((el = q('[data-cmpoff]'))) { PCMP = null; store.set('cw-cmp', null); CMPSET = false; return redraw(); }
  if ((el = q('[data-psz]'))) { PSZ = el.dataset.psz; store.set('cw-psz', PSZ); return redraw(); }
  if ((el = q('[data-stset]'))) { STSET = !STSET; el.setAttribute('aria-expanded', String(STSET)); const f = $('#stSet'); if (f) { f.hidden = !STSET; if (STSET) f.querySelector('input').focus(); } return; }
  if ((el = q('[data-streset]'))) { STOCH.splice(0, 3, ...STOCH_DEF); store.set('cw-stoch', STOCH); STSET = false; return redraw(); }
  if ((el = q('[data-ind]'))) { const k = el.dataset.ind; IND[k] = !IND[k]; store.set('cw-ind', IND); return redraw(); }
});
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (f.matches && f.matches('[data-maform]')) { e.preventDefault(); const fd = new FormData(f), l = [0, 1, 2].map((i) => [Number(fd.get('n' + i)), fd.get('on' + i) === 'on']), v = { type: fd.get('type') === 'ema' ? 'ema' : 'sma', l };
    const err = f.querySelector('[data-maerr]'); if (!maOk(v)) { err.textContent = XL('Lengths are whole numbers from 2 to 400.', 'ความยาวต้องเป็นจำนวนเต็ม 2 ถึง 400'); return; }
    Object.assign(MAC, v); store.set('cw-ma', MAC); MASET = false; const t = tokBySym(S.sel); if (t) { const y = scrollY; renderTab(t); scrollTo(0, y); } return; }
  if (f.matches && f.matches('[data-cmpform]')) { e.preventDefault(); const sym = String(new FormData(f).get('sym') || '').trim().toUpperCase().replace(/USDT$|[-/]?USD$/, ''), err = f.querySelector('[data-cmperr]');
    if (!/^[A-Z0-9]{2,12}$/.test(sym)) { err.textContent = XL('Type a ticker, e.g. DOGE.', 'พิมพ์ชื่อเหรียญ เช่น DOGE'); return; }
    PCMP = sym; store.set('cw-cmp', PCMP); CMPSET = false; const t = tokBySym(S.sel); if (t) { const y = scrollY; renderTab(t); scrollTo(0, y); } return; }
  if (!f.matches || !f.matches('[data-stform]')) return; e.preventDefault();
  const v = ['n', 's', 'd'].map((k) => { const x = f.elements[k].value.trim(); return /^\d+$/.test(x) ? Number(x) : NaN; });
  if (!stochOk(v)) { const m = f.querySelector('[data-sterr]'); if (m) m.textContent = XL(`Whole numbers only: %K period ${STOCH_LIM[0].join('–')}, smoothing ${STOCH_LIM[1].join('–')}, %D ${STOCH_LIM[2].join('–')}.`, `ใส่เลขจำนวนเต็ม: ช่วง %K ${STOCH_LIM[0].join('–')} ปรับเรียบ ${STOCH_LIM[1].join('–')} %D ${STOCH_LIM[2].join('–')}`); return; }
  STOCH.splice(0, 3, ...v); store.set('cw-stoch', STOCH); STSET = false;
  const t = tokBySym(S.sel); if (!t) return; const y = scrollY; renderTab(t); scrollTo(0, y);
});
