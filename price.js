/* KMS Capital – Price & indicators tab (v63). Loaded after app.js (shares its globals: S, VC helpers, klines, store, XL, px, big, ...).
   One chart (lightweight-charts v5) with panes: price on top (candles, MA20/50/200, optional Bollinger, Volume and Fibonacci), then a
   short pane per oscillator (RSI 14, MACD 12/26/9, Stochastic 9/3/3). One time axis, one crosshair; the values under it show in a bar
   pinned to the top of the chart and in a label at the top of each pane. On a phone: press and hold, then drag, to move the crosshair;
   release to return to the latest bar. Timeframes 15m / 1h / 4h / 1D / 1W; older candles load as you scroll left.
   Display only: the Technical setup keeps reading closed daily candles (verdict-core.js), whatever this chart shows. */
'use strict';
const PCTFS = ['15m', '1h', '4h', '1d', '1w'], PCTF_LBL = { '15m': '15m', '1h': '1H', '4h': '4H', '1d': '1D', '1w': '1W' };
const SPANS = [['1W', 7], ['1M', 30], ['3M', 91], ['6M', 182], ['1Y', 365], ['All', Infinity]];
const SPAN_DEF = { '15m': '1W', '1h': '1M', '4h': '3M', '1d': '3M', '1w': 'All' };
const MAXB = 6000, PAGE = 1000, MINSPAN = 20; // bars kept per series; bars per request; a span shorter than this many bars is disabled
const IND_KEYS = ['vol', 'bb', 'fib', 'rsi', 'macd', 'stoch'], IND_DEF = { vol: true, bb: false, fib: false, rsi: true, macd: false, stoch: true }, STOCH = [9, 3, 3];
const IND = (() => { const v = store.get('cw-ind', null), o = { ...IND_DEF }; if (v && typeof v === 'object') IND_KEYS.forEach((k) => { if (typeof v[k] === 'boolean') o[k] = v[k]; }); return o; })();
let PCTF = (() => { const v = store.get('cw-ptf', '1d'); return PCTFS.includes(v) ? v : '1d'; })();
let PSPAN = store.get('cw-span', null);
const PC = {}; // `${symbol}|${tf}` -> { k, src, done, loading, at }
const FIBS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
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
  return { ma20: sma(c, 20), ma50: sma(c, 50), ma200: sma(c, 200), rsi: rsiSeries(c), macd: m, sig: sg, hist, bbUp: B.up, bbLo: B.lo, k: ST.k, d: ST.d };
}
/* Fibonacci on the visible bars: the highest high and lowest low in view; the later of the two sets the direction of the swing */
function fibOf(k, from, to) {
  const a = Math.max(0, Math.floor(from)), b = Math.min(k.length - 1, Math.ceil(to)); if (b - a < 5) return null;
  let hi = a, lo = a; for (let i = a; i <= b; i++) { if (k[i].h > k[hi].h) hi = i; if (k[i].l < k[lo].l) lo = i; }
  const H = k[hi].h, Lw = k[lo].l; if (!(H > Lw)) return null; const up = hi > lo; // low first, then high = an up-swing; retracements measured down from the high
  return { up, hi, lo, H, L: Lw, lv: FIBS.map((r) => ({ r, p: up ? H - r * (H - Lw) : Lw + r * (H - Lw) })) };
}

const IND_LBL = () => ({ vol: XL('Volume', 'วอลุ่ม'), bb: 'Bollinger', fib: 'Fibonacci', rsi: 'RSI', macd: 'MACD', stoch: 'Stochastic' });
const IND_HELP = () => ({
  ma: XL('Moving averages show the trend: price above an average means that trend is up. MA20 = about a month of daily candles, MA50 = about a quarter, MA200 = the long-term trend. On other timeframes they count candles of that timeframe.', 'เส้นค่าเฉลี่ยบอกเทรนด์ ราคาอยู่เหนือเส้นไหน = เทรนด์ช่วงนั้นเป็นขาขึ้น บนกราฟรายวัน MA20 ≈ 1 เดือน MA50 ≈ 1 ไตรมาส MA200 = เทรนด์ระยะยาว ถ้าเปลี่ยนไทม์เฟรม เส้นจะนับตามแท่งของไทม์เฟรมนั้น'),
  vol: XL('Bars at the bottom of the price pane: green = the candle closed up, red = down. Moves on rising volume are more trustworthy; moves on thin volume fade easily.', 'แท่งด้านล่างของช่องราคา เขียว = แท่งปิดขึ้น แดง = ปิดลง ราคาขยับพร้อมวอลุ่มที่เพิ่มขึ้นน่าเชื่อถือกว่า ถ้าวอลุ่มบางมักไปต่อไม่ไกล'),
  bb: XL('Bollinger 20/2: bands = MA20 ± 2 standard deviations. Near the upper band = stretched up, near the lower band = stretched down. A narrow band often comes before a big move.', 'Bollinger 20/2: กรอบ = MA20 บวกลบ 2 เท่าของส่วนเบี่ยงเบนมาตรฐาน ใกล้ขอบบน = ยืดขึ้นมาเยอะ ใกล้ขอบล่าง = ยืดลงมาเยอะ กรอบแคบมักเกิดก่อนราคาวิ่งแรง'),
  fib: XL('Fibonacci retracement, drawn automatically on the biggest swing in view (its highest high and lowest low). After a move, price often pulls back to 38.2–61.8% of it before carrying on; 61.8% is the "golden ratio". It follows the range you are looking at, so 1M and 1Y give different levels. Levels, not a signal.', 'Fibonacci retracement วาดอัตโนมัติจากสวิงใหญ่สุดในช่วงที่มองอยู่ (จุดสูงสุดกับต่ำสุด) หลังราคาวิ่งไปแล้ว มักย่อกลับมาราว 38.2–61.8% ของช่วงนั้นก่อนไปต่อ 61.8% คือ "golden ratio" ระดับจะเปลี่ยนตามช่วงที่ดู 1M กับ 1Y ได้ระดับไม่เท่ากัน เป็นแค่ระดับราคา ไม่ใช่สัญญาณ'),
  rsi: XL('RSI 14: above 70 = stretched up, below 30 = stretched down, 50 is the midline. In a strong trend RSI can stay in either zone for a long time.', 'RSI 14: เกิน 70 = ร้อนเกิน ต่ำกว่า 30 = ขายมากเกิน เส้น 50 คือกึ่งกลาง ในเทรนด์แรง RSI ค้างโซนร้อนหรือโซนขายมากเกินได้นาน'),
  macd: XL('MACD 12/26/9: bars above zero = momentum up, below = down. The MACD line crossing above the signal line often marks momentum turning up.', 'MACD 12/26/9: แท่งเหนือศูนย์ = แรงส่งเป็นขาขึ้น ใต้ศูนย์ = ขาลง เส้น MACD ตัดขึ้นเหนือเส้น Signal มักเป็นจุดที่แรงส่งเริ่มกลับขึ้น'),
  stoch: XL('Stochastic 9/3/3, a fast oscillator. Above 80 = closing near the top of the last 9 candles, below 20 = near the bottom. %K crossing %D shows short-term turns, but it gives many false signals in a strong trend.', 'Stochastic 9/3/3 ตัวแกว่งเร็ว เกิน 80 = ราคาปิดใกล้จุดสูงสุดของ 9 แท่งล่าสุด ต่ำกว่า 20 = ใกล้จุดต่ำสุด %K ตัด %D บอกจังหวะกลับตัวระยะสั้น แต่ในเทรนด์แรงหลอกบ่อย'),
  touch: XL('On a phone: press and hold the chart, then drag to read any day; let go to return to the latest candle. Swipe sideways to scroll; older candles load on their own.', 'บนมือถือ: แตะค้างบนกราฟแล้วลากเพื่ออ่านค่าแต่ละวัน ปล่อยนิ้วแล้วกลับเป็นค่าล่าสุด ปัดซ้าย-ขวาเพื่อเลื่อนกราฟ แท่งเก่าจะโหลดเพิ่มเอง') });
const readOf = {
  rsi: (v) => v == null ? null : v >= 70 ? [XL('Overbought', 'ร้อนเกิน'), 'warn'] : v <= 30 ? [XL('Oversold', 'ขายมากเกิน'), 'warn'] : v >= 50 ? [XL('Buyers in control', 'ฝั่งซื้อคุม'), 'up'] : [XL('Sellers in control', 'ฝั่งขายคุม'), 'dn'],
  macd: (h) => h == null ? null : h > 0 ? [XL('Momentum up', 'แรงส่งขาขึ้น'), 'up'] : [XL('Momentum down', 'แรงส่งขาลง'), 'dn'],
  stoch: (k, d) => k == null ? null : k >= 80 ? [XL('Near the top', 'ใกล้จุดสูง'), 'warn'] : k <= 20 ? [XL('Near the bottom', 'ใกล้จุดต่ำ'), 'warn'] : d != null && k > d ? [XL('%K above %D', '%K เหนือ %D'), 'up'] : [XL('%K below %D', '%K ใต้ %D'), 'dn'] };

function spanBars(tf, days) { return days === Infinity ? Infinity : Math.round((days * 864e5) / TFMS[tf]); }
function spanOk(tf, days) { const b = spanBars(tf, days); return b === Infinity || (b >= MINSPAN && b <= MAXB); }
function curSpan(tf) { const s = PSPAN && SPANS.find(([k]) => k === PSPAN); return s && spanOk(tf, s[1]) ? s[0] : SPAN_DEF[tf]; }
const isMobile = () => matchMedia('(max-width: 767px)').matches;

function renderPriceTab(t, b) {
  const th = LANG === 'th', Lb = IND_LBL(), H = IND_HELP(), help = (k, n) => uiHelp(H[k], XL(`How to read ${n}`, `อ่าน ${n} ยังไง`));
  const tfs = `<div class="seg sm ptf" role="group" aria-label="${esc(XL('Timeframe', 'ไทม์เฟรม'))}">${PCTFS.map((x) => `<button type="button" data-ptf="${x}" aria-pressed="${PCTF === x}">${PCTF_LBL[x]}</button>`).join('')}</div>`;
  const span = curSpan(PCTF), spans = `<div class="seg sm pspan" role="group" aria-label="${esc(XL('Range', 'ช่วงกราฟ'))}">${SPANS.map(([k, d]) => `<button type="button" data-pspan="${k}" aria-pressed="${span === k}" ${spanOk(PCTF, d) ? '' : 'disabled'}>${k}</button>`).join('')}</div>`;
  const sw = `<div class="indt" role="group" aria-label="${esc(XL('Indicators', 'อินดิเคเตอร์'))}">${IND_KEYS.map((k) => `<button type="button" class="indt-b" data-ind="${k}" aria-pressed="${IND[k]}"><i aria-hidden="true"></i>${esc(Lb[k])}${k === 'stoch' ? ` <small>${STOCH.join('/')}</small>` : ''}</button>`).join('')}</div>`;
  b.innerHTML = `<div class="ptool">${tfs}${spans}</div>${sw}
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
  const priceH = mob ? 300 : 430, oscH = mob ? 92 : 118; wrap.style.height = priceH + oscH * oscs.length + 'px';
  const LW = LightweightCharts, intra = TFMS[tf] < 864e5;
  const chart = LW.createChart(host, { autoSize: true, layout: { background: { color: 'transparent' }, textColor: Cc.tx, fontSize: 11, fontFamily: getComputedStyle(document.body).fontFamily, panes: { separatorColor: Cc.line, separatorHoverColor: Cc.line, enableResize: false } },
    grid: { vertLines: { visible: false }, horzLines: { color: Cc.line } }, rightPriceScale: { borderVisible: false, minimumWidth: 64 }, timeScale: { borderVisible: false, timeVisible: intra, secondsVisible: false, rightOffset: 4 },
    crosshair: { mode: 0, vertLine: { color: Cc.mut, labelBackgroundColor: Cc.tx }, horzLine: { color: Cc.mut, labelBackgroundColor: Cc.tx } },
    handleScroll: { vertTouchDrag: false }, trackingMode: { exitMode: LW.TrackingModeExitMode.OnTouchEnd } });
  S.charts.push(chart);
  const pxf = { type: 'custom', minMove: 1e-8, formatter: (v) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : Math.abs(v) >= 1 ? v.toFixed(2) : v.toPrecision(4)) };
  const whole = { type: 'custom', minMove: 1, formatter: (v) => v.toFixed(0) }, fixed100 = { autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) };
  const ser = {}; let k = c.k, I = pcCalc(k), idx = new Map();
  const T0 = (x) => ts(x.t, intra);
  ser.c = chart.addSeries(LW.CandlestickSeries, { upColor: Cc.up, downColor: Cc.dn, borderVisible: false, wickUpColor: Cc.up, wickDownColor: Cc.dn, priceLineVisible: false, priceFormat: pxf }, 0);
  const L = (pane, color, w = 1.5, o = {}) => chart.addSeries(LW.LineSeries, { color, lineWidth: w, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, ...o }, pane);
  ser.ma20 = L(0, Cc.ma20); ser.ma50 = L(0, Cc.ma50); ser.ma200 = L(0, Cc.ma200);
  if (IND.bb) { ser.bbUp = L(0, Cc.mut, 1, { lineStyle: 2 }); ser.bbLo = L(0, Cc.mut, 1, { lineStyle: 2 }); }
  if (IND.vol) { ser.vol = chart.addSeries(LW.HistogramSeries, { priceScaleId: 'vol', priceFormat: { type: 'custom', formatter: big }, priceLineVisible: false, lastValueVisible: false }, 0);
    chart.priceScale('vol', 0).applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } }); ser.c.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.24 } }); }
  const pane = {}; oscs.forEach((kk, i) => { pane[kk] = i + 1; });
  if (IND.rsi) { ser.rsi = L(pane.rsi, Cc.ac, 1.5, { priceFormat: whole, ...fixed100 }); [70, 50, 30].forEach((v) => ser.rsi.createPriceLine({ price: v, color: Cc.mut, lineStyle: v === 50 ? 3 : 2, lineWidth: 1, axisLabelVisible: false, title: '' })); }
  if (IND.macd) { ser.hist = chart.addSeries(LW.HistogramSeries, { priceLineVisible: false, lastValueVisible: false, priceFormat: { type: 'custom', formatter: cmp } }, pane.macd);
    ser.macd = L(pane.macd, Cc.ac, 1.5); ser.sig = L(pane.macd, Cc.ma50, 1.5); }
  if (IND.stoch) { ser.sk = L(pane.stoch, Cc.ac, 1.5, { priceFormat: whole, ...fixed100 }); ser.sd = L(pane.stoch, Cc.ma50, 1.5); [80, 20].forEach((v) => ser.sk.createPriceLine({ price: v, color: Cc.mut, lineStyle: 2, lineWidth: 1, axisLabelVisible: false, title: '' })); }
  const ps = chart.panes(); ps[0].setStretchFactor(priceH); oscs.forEach((kk) => ps[pane[kk]] && ps[pane[kk]].setStretchFactor(oscH));
  const lineData = (vals) => k.map((x, i) => (vals[i] == null ? { time: T0(x) } : { time: T0(x), value: vals[i] })); // whitespace keeps every pane on the same bars
  const apply = () => {
    idx = new Map(k.map((x, i) => [T0(x), i]));
    ser.c.setData(k.map((x) => ({ time: T0(x), open: x.o, high: x.h, low: x.l, close: x.c })));
    ser.ma20.setData(lineData(I.ma20)); ser.ma50.setData(lineData(I.ma50)); ser.ma200.setData(lineData(I.ma200));
    if (ser.bbUp) { ser.bbUp.setData(lineData(I.bbUp)); ser.bbLo.setData(lineData(I.bbLo)); }
    if (ser.vol) ser.vol.setData(k.map((x) => ({ time: T0(x), value: x.q || x.v * x.c, color: x.c >= x.o ? Cc.upA : Cc.dnA })));
    if (ser.rsi) ser.rsi.setData(lineData(I.rsi));
    if (ser.hist) { ser.hist.setData(k.map((x, i) => (I.hist[i] == null ? { time: T0(x) } : { time: T0(x), value: I.hist[i], color: I.hist[i] >= 0 ? Cc.upA : Cc.dnA }))); ser.macd.setData(lineData(I.macd)); ser.sig.setData(lineData(I.sig)); }
    if (ser.sk) { ser.sk.setData(lineData(I.k)); ser.sd.setData(lineData(I.d)); }
  };
  apply();
  // ---- range ----
  const showSpan = async (name) => {
    const d = (SPANS.find(([x]) => x === name) || [, 90])[1], need = spanBars(tf, d);
    while ((need === Infinity || k.length < need + 5) && !c.done && k.length < MAXB) { $('#pLoad').hidden = false; const n = await pcMore(c, tf); if (!n) break; k = c.k; I = pcCalc(k); apply(); }
    $('#pLoad').hidden = true; const n = k.length, from = need === Infinity ? 0 : Math.max(0, n - need);
    chart.timeScale().setVisibleLogicalRange({ from, to: n + 3 }); fib();
  };
  // ---- Fibonacci: price lines on the candles for the biggest swing in view, redrawn when the view changes ----
  let fibLines = [], fibT = 0, fibInfo = null;
  const fib = () => { fibLines.forEach((l) => { try { ser.c.removePriceLine(l); } catch (e) {} }); fibLines = []; fibInfo = null; if (!IND.fib) return foot();
    const r = chart.timeScale().getVisibleLogicalRange(); if (!r) return; const f = fibOf(k, r.from, r.to); if (!f) return foot(); fibInfo = f;
    f.lv.forEach(({ r: q, p }) => fibLines.push(ser.c.createPriceLine({ price: p, color: q === 0.618 || q === 0.5 ? FIBC : 'rgba(167,139,250,.55)', lineStyle: q === 0 || q === 1 ? 0 : 2, lineWidth: q === 0.618 ? 2 : 1, axisLabelVisible: q === 0.618, title: `${(q * 100).toFixed(1)}%` })));
    foot(); };
  // ---- lazy load older candles when the view reaches the left edge ----
  chart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
    if (!r) return; clearTimeout(fibT); fibT = setTimeout(fib, 250);
    if (r.from < 25 && !c.done && !c.more && k.length < MAXB) { $('#pLoad').hidden = false;
      pcMore(c, tf).then((n) => { $('#pLoad').hidden = true; if (!n || !S.charts.includes(chart)) return; const cur = chart.timeScale().getVisibleLogicalRange(); k = c.k; I = pcCalc(k); apply(); if (cur) chart.timeScale().setVisibleLogicalRange({ from: cur.from + n, to: cur.to + n }); }); }
  });
  // ---- readouts: the bar pinned at the top and one label per pane ----
  const f2 = (v, dg = 1) => (v == null || !Number.isFinite(v) ? '–' : v.toFixed(dg)), chip = (r) => (r ? ` <span class="ind-chip ${r[1]}">${esc(r[0])}</span>` : '');
  const when = (x) => new Date(x.t).toLocaleString(loc(), intra ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } : { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const lastClosed = () => { const n = k.length; return n > 1 && k[n - 1].t + TFMS[tf] > Date.now() ? n - 2 : n - 1; };
  const read = (i, cursor) => {
    const x = k[i]; if (!x) return; const p = i ? k[i - 1].c : null, ch = p ? (x.c / p - 1) * 100 : null, el = $('#pRead'); if (!el) return;
    el.innerHTML = `<b class="pr-d">${esc(when(x))}${cursor ? '' : ` · ${esc(i === k.length - 1 ? XL('live', 'ล่าสุด') : XL('last close', 'ปิดล่าสุด'))}`}</b> <span>O <b class="num">${px(x.o)}</b></span> <span>H <b class="num">${px(x.h)}</b></span> <span>L <b class="num">${px(x.l)}</b></span> <span>C <b class="num">${px(x.c)}</b></span>${ch != null ? ` <b class="num ${cls(ch)}">${pct(ch)}</b>` : ''}${IND.vol ? ` <span>${esc(XL('Vol', 'วอลุ่ม'))} <b class="num">${big(x.q || x.v * x.c)}</b></span>` : ''}`;
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
  requestAnimationFrame(labels); const ro = new ResizeObserver(() => requestAnimationFrame(labels)); ro.observe(wrap); chart._ro = ro;
  chart.subscribeCrosshairMove((pm) => { const i = pm && pm.time != null ? idx.get(pm.time) : undefined; read(i != null ? i : lastClosed(), i != null); });
  // ---- footer: legend, MA status, notes with their "?" ----
  const Lb = IND_LBL(), H = IND_HELP(), help = (kk, n) => uiHelp(H[kk], XL(`How to read ${n}`, `อ่าน ${n} ยังไง`));
  const foot = () => { const el = $('#pFoot'); if (!el) return; const lc = lastClosed(), cl = k[lc] ? k[lc].c : null, ma = (v, l) => (v ? `<span class="ma-chip ${cl > v ? 'up' : 'dn'}"><b>${l}</b> ${px(v)} <span>${cl > v ? '▲ ' + XL('above', 'เหนือ') : '▼ ' + XL('below', 'ใต้')}</span></span>` : '');
    const lg = (items) => `<div class="legend">${items.map(([n, col]) => `<span><i style="background:${col}"></i>${esc(n)}</span>`).join('')}</div>`;
    const leg = [[T('ma20'), Cc.ma20], [T('ma50'), Cc.ma50], [T('ma200'), Cc.ma200]]; if (IND.bb) leg.push([XL('Bollinger bands', 'กรอบ Bollinger'), Cc.mut]); if (IND.fib) leg.push(['Fibonacci', FIBC]);
    const notes = [];
    if (IND.fib) notes.push(fibInfo ? `<p class="pnote" data-indn="fib"><b>Fibonacci</b> ${fibInfo.up ? `${esc(XL('up-swing', 'สวิงขึ้น'))} ${esc(XL('low', 'ต่ำ'))} <b class="num">${px(fibInfo.L)}</b> → ${esc(XL('high', 'สูง'))} <b class="num">${px(fibInfo.H)}</b>` : `${esc(XL('down-swing', 'สวิงลง'))} ${esc(XL('high', 'สูง'))} <b class="num">${px(fibInfo.H)}</b> → ${esc(XL('low', 'ต่ำ'))} <b class="num">${px(fibInfo.L)}</b>`} · ${esc(XL('golden zone', 'golden zone'))} 50–61.8% <b class="num">${px(Math.min(fibInfo.lv[3].p, fibInfo.lv[4].p))} – ${px(Math.max(fibInfo.lv[3].p, fibInfo.lv[4].p))}</b></p>` : `<p class="pnote" data-indn="fib"><b>Fibonacci</b> ${esc(XL('no clear swing in view', 'ไม่มีสวิงชัดในช่วงที่ดู'))}</p>`);
    if (IND.bb && I.bbUp[lc] != null) notes.push(`<p class="pnote" data-indn="bb"><b>Bollinger 20/2</b> ${esc(XL('close at', 'ปิดที่'))} <b class="num">${(((cl - I.bbLo[lc]) / (I.bbUp[lc] - I.bbLo[lc])) * 100).toFixed(0)}%</b> ${esc(XL('of the band (0% = lower, 100% = upper)', 'ของกรอบ (0% = ขอบล่าง, 100% = ขอบบน)'))}</p>`);
    if (IND.vol) { const q = k.slice(Math.max(0, lc - 30), lc).map((x) => x.q || x.v * x.c), av = q.length ? q.reduce((a, x) => a + x, 0) / q.length : null, yq = k[lc] ? k[lc].q || k[lc].v * k[lc].c : null;
      notes.push(`<p class="pnote" data-indn="vol"><b>${esc(Lb.vol)}</b> ${esc(XL('last closed candle', 'แท่งที่ปิดล่าสุด'))} <b class="num">${yq != null ? big(yq) : '–'}</b> · ${esc(XL('30-candle average', 'เฉลี่ย 30 แท่ง'))} <span class="num">${av ? big(av) : '–'}</span>${yq && av ? ` · <span class="num">${(yq / av).toFixed(1)}×</span>` : ''}</p>`); }
    const hk = ['ma', ...(IND.vol ? ['vol'] : []), ...(IND.bb ? ['bb'] : []), ...(IND.fib ? ['fib'] : []), ...oscs], hn = { ma: 'MA', ...Lb };
    const oscHelp = `<span class="pf-hl">${esc(XL('How to read', 'อ่านยังไง'))}</span>` + hk.map((kk) => `<span class="pf-h">${esc(hn[kk])} ${help(kk, hn[kk])}</span>`).join('') + (mob ? `<span class="pf-h">${esc(XL('Phone tips', 'ใช้บนมือถือ'))} ${uiHelp(H.touch, XL('How to use the chart on a phone', 'ใช้กราฟบนมือถือยังไง'))}</span>` : '');
    el.innerHTML = `<div class="pf-row">${lg(leg)}</div><div class="pf-hs">${oscHelp}</div>
      <div class="ma-row">${ma(I.ma20[lc], 'MA20')}${ma(I.ma50[lc], 'MA50')}${ma(I.ma200[lc], 'MA200')}</div>${notes.join('')}
      <p class="sub psrc">${esc(PCTF_LBL[tf])} ${esc(XL('candles', 'แท่งเทียน'))} · ${esc(EXNAME[c.src.ex])} ${esc(c.src.pair)} · ${esc(XL(`${k.length} candles loaded, from`, `โหลดแล้ว ${k.length} แท่ง ตั้งแต่`))} ${esc(new Date(k[0].t).toLocaleDateString(loc(), { year: 'numeric', month: 'short', day: 'numeric' }))}${c.done ? ` (${esc(XL('the venue has nothing older', 'กระดานนี้ไม่มีข้อมูลเก่ากว่านี้'))})` : ''}${(t._hsrc || t._src) !== c.src ? '' : ''} · ${esc(XL('The Technical setup always reads closed daily candles.', 'มุมมองเทคนิคใช้แท่งรายวันที่ปิดแล้วเสมอ'))}</p>`; };
  // ---- live: the newest candle follows the price feed when the chart reads the same pair ----
  S.live = { onTick: (price) => { if (c.src !== t._src || !k.length) return; const now = Date.now(), last = k[k.length - 1];
    if (now >= last.t + TFMS[tf]) { const t0 = Math.floor(now / TFMS[tf]) * TFMS[tf]; if (tf === '1w') return; k.push({ t: t0, o: price, h: price, l: price, c: price, v: 0, q: 0 }); I = pcCalc(k); apply(); return; }
    last.c = price; last.h = Math.max(last.h, price); last.l = Math.min(last.l, price);
    try { ser.c.update({ time: T0(last), open: last.o, high: last.h, low: last.l, close: last.c }); } catch (e) {} } };
  showSpan(curSpan(tf));
}

/* controls */
document.addEventListener('click', (e) => {
  const q = (s) => e.target.closest && e.target.closest(s); let el;
  const redraw = () => { const t = tokBySym(S.sel); if (!t) return; const y = scrollY; renderTab(t); scrollTo(0, y); };
  if ((el = q('[data-ptf]'))) { PCTF = el.dataset.ptf; store.set('cw-ptf', PCTF); return redraw(); }
  if ((el = q('[data-pspan]')) && !el.disabled) { PSPAN = el.dataset.pspan; store.set('cw-span', PSPAN); return redraw(); }
  if ((el = q('[data-ind]'))) { const k = el.dataset.ind; IND[k] = !IND[k]; store.set('cw-ind', IND); return redraw(); }
});
