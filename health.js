/* KMS Capital – Market Health page, #/breadth "สุขภาพตลาด" (docs/market-health-p6.md). Lazy-loaded after health-core.js (HMC).
   Reads health.json + data/health/history.json only (built by .github/workflows/health.yml); it never calls CoinGecko itself.
   Two readings that are never merged: Spot Market Health (closed daily candles) and Leverage Risk (OKX + Hyperliquid, estimated).
   The CoinGecko numbers (treemap, category returns) are an unscored intraday view. Descriptive only: no forecast, no buy/sell words. */
const HM = { d: undefined, h: null, err: '', req: null, tf: store.get('cw-hm-tf', '24h'), grp: store.get('cw-hm-grp', 'mcap'), mode: store.get('cw-hm-mode', 'simple'), view: 'map', sort: ['mc', -1], pin: -1 };
const HM_TF = [['1h', 'c1h', 3], ['24h', 'c24', 8], ['7d', 'c7', 20], ['30d', 'c30', 40]]; // tab, field, colour clamp (±%)
const HM_STALE = { intraday: 3 * 36e5, lev: 3 * 36e5, candles: 36 * 36e5 }; // candles: hours after the closed day ended
const hmN = (v, d = 1) => (v == null || !isFinite(v) ? null : (+v).toFixed(d));
const hmNA = (why) => `<span class="hm-na">${esc(XL('Unavailable', 'ไม่พร้อมใช้งาน'))}</span>${why ? `<span class="sub"> · ${esc(why)}</span>` : ''}`;
function hmLoad() {
  if (HM.req) return HM.req;
  HM.req = Promise.all([getJSON('health.json?t=' + Math.floor(Date.now() / 3e5)), getJSON('data/health/history.json?t=' + Math.floor(Date.now() / 3e5)).catch(() => null)])
    .then(([d, h]) => { if (!d || !d.official || !Array.isArray(d.coins)) throw new Error('health.json: unexpected shape'); HM.d = d; HM.h = h; HM.err = ''; })
    .catch((e) => { HM.d = null; HM.err = e.message; }).finally(() => { HM.req = null; });
  return HM.req;
}
/* ---------- states ---------- */
const hmAge = (iso) => (iso ? Date.now() - new Date(iso).getTime() : Infinity);
function hmState(d) {
  const end = new Date(d.official.day + 'T00:00:00Z').getTime() + 864e5;
  return { intra: hmAge(d.sources.cg_markets && d.sources.cg_markets.at) > HM_STALE.intraday, lev: hmAge(d.leverage && d.leverage.at) > HM_STALE.lev, cand: Date.now() - end > HM_STALE.candles };
}
const BANDTH = { Strong: 'แข็งแรง', Healthy: 'ดี', Mixed: 'ปนกัน', Weak: 'อ่อนแอ', Low: 'ต่ำ', Normal: 'ปกติ', Elevated: 'สูงขึ้น', High: 'สูง', Extreme: 'สูงมาก' };
const hmBand = (b) => (b ? (LANG === 'th' ? `${b} · ${BANDTH[b]}` : b) : '');
const GRPL = { 'Top 10': ['Top 10', 'Top 10'], '#11–30': ['#11–30', 'อันดับ 11–30'], '#31–100': ['#31–100', 'อันดับ 31–100'], Other: ['Other', 'อื่นๆ'], OtherL1: ['Other L1s', 'L1 อื่นๆ'] };
const hmG = (k) => (GRPL[k] ? XL(...GRPL[k]) : k);
const dayL = (day) => new Date(day + 'T12:00:00Z').toLocaleDateString(loc(), { month: 'short', day: 'numeric', timeZone: 'UTC' });
function chip(kind, d) { // status of a number: closed daily candle / delayed / estimated / stale
  const t = { daily: [`Daily close ${dayL(d.official.day)} (UTC)`, `ปิดแท่งวัน ${dayL(d.official.day)} (UTC)`], delayed: ['Delayed ≤ 60 min', 'ล่าช้า ≤ 60 นาที'], estimated: ['Estimated', 'Estimated (ประมาณการ)'], stale: ['Stale', 'ข้อมูลเก่า'] }[kind];
  return `<span class="hm-chip ${kind}">${esc(XL(...t))}</span>`;
}
/* ---------- text from the numbers (descriptive only) ---------- */
function hmSummary(d, lang = LANG) {
  const X = (en, th) => (lang === 'th' ? th : en), o = d.official, C = o.comp, out = [], b = C.P, B = C.B, lv = d.leverage;
  if (B && b) {
    const tail = b.btc7 > 0 && B.adv7 < 40 ? X('strength is concentrated in BTC, most coins are not following.', 'แรงกระจุกอยู่ที่ BTC เหรียญส่วนใหญ่ไม่ได้ขึ้นตาม')
      : b.btc7 <= 0 && B.adv7 < 40 ? X('the weakness is market-wide, not just BTC.', 'อ่อนแอทั้งตลาด ไม่ใช่แค่ BTC') : B.adv7 >= 60 ? X('most coins are rising too.', 'เหรียญส่วนใหญ่ขึ้นด้วย') : X('the market is split.', 'ตลาดแบ่งเป็นสองฝั่ง');
    out.push(X(`BTC ${pct(b.btc7, 1)} over 7 days and ${hmN(B.dec7, 0)}% of tracked coins are down: ${tail}`, `BTC ${pct(b.btc7, 1)} ใน 7 วัน และ ${hmN(B.dec7, 0)}% ของเหรียญที่ติดตามลง ${tail}`));
  }
  if (C.H) out.push(X(`${C.H.nh} coins closed at a 30-day high and ${C.H.nl} at a 30-day low.`, `ปิดที่จุดสูงสุดรอบ 30 วัน ${C.H.nh} เหรียญ และจุดต่ำสุดรอบ 30 วัน ${C.H.nl} เหรียญ`));
  if (C.M) out.push(X(`${hmN(C.M.a200, 0)}% are above their MA200 and ${hmN(C.M.a50, 0)}% above their MA50.`, `${hmN(C.M.a200, 0)}% ยืนเหนือ MA200 และ ${hmN(C.M.a50, 0)}% ยืนเหนือ MA50`));
  if (lv && lv.comp.F && lv.comp.O) {
    const oi = lv.comp.O.chg < 0 ? X(`open interest fell ${pct(lv.comp.O.chg, 1)} in coin terms over 7 days`, `OI ลดลง ${pct(lv.comp.O.chg, 1)} ใน 7 วัน (นับเป็นจำนวนเหรียญ)`) : X(`open interest rose ${pct(lv.comp.O.chg, 1)} in coin terms over 7 days`, `OI เพิ่มขึ้น ${pct(lv.comp.O.chg, 1)} ใน 7 วัน (นับเป็นจำนวนเหรียญ)`);
    out.push(X(`Leverage Risk ${lv.band}: average funding ${hmN(lv.comp.F.fbar, 4)}%/8h and ${oi}.`, `Leverage Risk ${BANDTH[lv.band] || ''}: funding เฉลี่ย ${hmN(lv.comp.F.fbar, 4)}%/8h และ ${oi}`));
  }
  return out;
}
function hmKnow(d, lang = LANG) { // "สิ่งที่ควรรู้วันนี้": three facts that are not already in the summary
  const X = (en, th) => (lang === 'th' ? th : en), C = d.official.comp, x = d.context, out = [];
  if (C.V) { const lvl = C.V.R < 0.8 ? X('lighter than usual', 'เบากว่าปกติ') : C.V.R > 1.3 ? X('heavier than usual', 'หนักกว่าปกติ') : X('about normal', 'ใกล้เคียงปกติ');
    const side = C.V.d < -0.2 ? X('more of it on falling coins', 'ไปกองที่เหรียญที่ลงมากกว่า') : C.V.d > 0.2 ? X('more of it on rising coins', 'ไปกองที่เหรียญที่ขึ้นมากกว่า') : X('split between rising and falling coins', 'แบ่งพอๆ กันระหว่างเหรียญขึ้นและลง');
    out.push(X(`Spot volume on the last closed day was ${hmN(C.V.R, 2)}× its 30-day average (${lvl}), ${side}.`, `Spot volume วันล่าสุด ${hmN(C.V.R, 2)}× ของค่าเฉลี่ย 30 วัน (${lvl}) และ${side}`)); }
  if (x.alts_beat_btc_7d != null && x.ethbtc_7d != null) out.push(X(`${hmN(x.alts_beat_btc_7d, 0)}% of altcoins did better than BTC over 7 days (${hmN(x.alts_beat_btc_30d, 0)}% over 30 days). ETH/BTC ${pct(x.ethbtc_7d, 1)} over 7 days.`,
    `Altcoin ${hmN(x.alts_beat_btc_7d, 0)}% ทำผลงานดีกว่า BTC ใน 7 วัน (${hmN(x.alts_beat_btc_30d, 0)}% ใน 30 วัน) ส่วน ETH/BTC ${pct(x.ethbtc_7d, 1)} ใน 7 วัน`));
  const cs = (d.categories || []).filter((c) => c.n >= 3 && c.d7 != null && c.k !== 'Other').sort((a, b) => b.d7 - a.d7);
  if (cs.length >= 2) { const hi = cs[0], lo = cs[cs.length - 1];
    out.push(X(`Best category over 7 days: ${hi.k} (median ${pct(hi.d7, 1)}). Weakest: ${lo.k} (${pct(lo.d7, 1)}).`, `กลุ่มที่ดีที่สุดใน 7 วัน: ${hi.k} (median ${pct(hi.d7, 1)}) กลุ่มที่อ่อนสุด: ${lo.k} (${pct(lo.d7, 1)})`)); }
  return out;
}
/* tooltip: what it is / why it matters / what today's value means */
function hmTip(k, d) {
  const C = d.official.comp, lv = d.leverage, x = d.context, f = (v, n = 0) => hmN(v, n) ?? '–';
  const T3 = {
    spot: [['A 0–100 reading of the whole spot market from closed daily candles: breadth 30, MA trend 25, volume 15, 30-day highs/lows 10, BTC-alt participation 10.', 'คะแนน 0–100 ที่สรุปภาพ spot ทั้งตลาดจากแท่งวันที่ปิดแล้ว ใช้ breadth 30, MA trend 25, volume 15, จุดสูง/ต่ำรอบ 30 วัน 10 และการขึ้นลงตาม BTC ของ alt 10'],
      ['BTC alone can hide weakness. This shows whether most coins are taking part.', 'BTC ตัวเดียวบังภาพได้ คะแนนนี้ดูว่าเหรียญส่วนใหญ่ไปทางเดียวกันไหม'],
      [d.official.score == null ? 'No score today: some required data is missing.' : `${f(d.official.score)} = ${d.official.band}. It describes today, it does not forecast.`, d.official.score == null ? 'วันนี้ไม่มีคะแนน เพราะข้อมูลที่จำเป็นขาดไป' : `${f(d.official.score)} = ${hmBand(d.official.band)} เป็นการบรรยายสภาพวันนี้ ไม่ได้ทำนาย`]],
    lev: [['How crowded derivatives positioning is, from OKX + Hyperliquid perps: funding vs a 0.01%/8h baseline (40), 7-day OI build-up in coin terms (35), share of coins with extreme funding (25).', 'ดูว่าฝั่ง derivatives แออัดแค่ไหน จาก perp บน OKX + Hyperliquid ใช้ funding เทียบฐาน 0.01%/8h (40), OI ที่เพิ่มใน 7 วันแบบนับเป็นจำนวนเหรียญ (35) และสัดส่วนเหรียญที่ funding สุดโต่ง (25)'],
      ['Crowded leverage makes sharp moves and liquidations more likely in either direction. It is kept separate from the spot score.', 'เวลา leverage แออัด ราคาจะสะบัดแรงและมี liquidation ได้ง่ายทั้งสองทาง เลยแยกจากคะแนน spot'],
      [lv.score == null ? 'Not available today.' : `${f(lv.score)} = ${lv.band}. Low means positioning is not crowded. It says nothing about price direction.`, lv.score == null ? 'วันนี้ไม่พร้อมใช้งาน' : `${f(lv.score)} = ${BANDTH[lv.band]} ระดับต่ำแปลว่าโพซิชันไม่แออัด ไม่ได้บอกทิศทางราคา`]],
    adv: [['Share of tracked coins that closed up vs down on the last closed day, and over 7 days.', 'สัดส่วนเหรียญที่ปิดบวกเทียบกับปิดลบ ของแท่งวันล่าสุดและรอบ 7 วัน'],
      ['A rise carried by a few coins is weaker than one most coins join.', 'ตลาดที่ขึ้นเพราะไม่กี่เหรียญ อ่อนกว่าตลาดที่เหรียญส่วนใหญ่ขึ้นด้วย'],
      [C.B ? `${f(C.B.adv1)}% up on the day, ${f(C.B.adv7)}% up over 7 days.` : 'Not available.', C.B ? `วันล่าสุดขึ้น ${f(C.B.adv1)}% ของเหรียญ รอบ 7 วันขึ้น ${f(C.B.adv7)}%` : 'ไม่พร้อมใช้งาน']],
    ma200: [['Share of coins whose close is above their 200-day moving average. Coins with under 200 days of candles are left out, not counted as below.', 'สัดส่วนเหรียญที่ราคาปิดอยู่เหนือ MA200 เหรียญที่มีแท่งไม่ถึง 200 วันไม่ถูกนับ (ไม่ได้นับว่าอยู่ใต้เส้น)'],
      ['MA200 is the common long-term trend line.', 'MA200 เป็นเส้นเทรนด์ระยะยาวที่คนดูกันมากที่สุด'],
      [C.M ? `${f(C.M.a200, 1)}% of ${C.M.n200} coins are above it.` : 'Not available.', C.M ? `${f(C.M.a200, 1)}% จาก ${C.M.n200} เหรียญอยู่เหนือเส้น` : 'ไม่พร้อมใช้งาน']],
    ma50: [['Share of coins whose close is above their 50-day moving average.', 'สัดส่วนเหรียญที่ราคาปิดอยู่เหนือ MA50'],
      ['MA50 shows the medium-term trend and turns earlier than MA200.', 'MA50 คือเทรนด์ระยะกลาง เปลี่ยนทิศเร็วกว่า MA200'],
      [C.M ? `${f(C.M.a50, 1)}% of ${C.M.n50} coins.` : 'Not available.', C.M ? `${f(C.M.a50, 1)}% จาก ${C.M.n50} เหรียญ` : 'ไม่พร้อมใช้งาน']],
    hilo: [['Coins whose last close is the highest (or lowest) of the previous 30 closes.', 'จำนวนเหรียญที่ราคาปิดล่าสุดสูงที่สุด (หรือต่ำที่สุด) เมื่อเทียบ 30 วันก่อนหน้า'],
      ['Many new lows with no new highs means selling is broad.', 'ถ้ามีจุดต่ำใหม่เยอะแต่ไม่มีจุดสูงใหม่เลย แปลว่าแรงขายกระจายทั้งตลาด'],
      [C.H ? `${C.H.nh} highs, ${C.H.nl} lows.` : 'Not available.', C.H ? `สูงสุดใหม่ ${C.H.nh} เหรียญ ต่ำสุดใหม่ ${C.H.nl} เหรียญ` : 'ไม่พร้อมใช้งาน']],
    vol: [['Median of each coin\'s last-day spot volume ÷ its 30-day average, on the same exchange pair as the price. Direction = volume on rising minus falling coins, each coin capped at 10% of the total so BTC/ETH cannot dominate.', 'median ของ spot volume วันล่าสุด ÷ ค่าเฉลี่ย 30 วันของแต่ละเหรียญ (คู่เทรดเดียวกับราคา) ส่วนทิศทางคือ volume ฝั่งเหรียญขึ้นลบฝั่งเหรียญลง โดยจำกัดน้ำหนักเหรียญละไม่เกิน 10% ของทั้งหมด BTC/ETH จะได้ไม่กลบภาพ'],
      ['Volume shows how much conviction is behind the move.', 'volume บอกว่าการขยับนั้นมีคนเล่นจริงจังแค่ไหน'],
      [C.V ? `${f(C.V.R, 2)}× average, direction ${f(C.V.d, 2)} (−1 all on falling coins, +1 all on rising).` : 'Not available.', C.V ? `${f(C.V.R, 2)}× ของค่าเฉลี่ย ทิศทาง ${f(C.V.d, 2)} (−1 = ไปกองที่เหรียญลงทั้งหมด, +1 = เหรียญขึ้นทั้งหมด)` : 'ไม่พร้อมใช้งาน']],
    dom: [['BTC market cap as a share of the whole crypto market (CoinGecko, stablecoins included). In brackets: share of our ex-stablecoin universe.', 'สัดส่วนมาร์เก็ตแคป BTC เทียบทั้งตลาด (CoinGecko รวม stablecoin) ในวงเล็บคือสัดส่วนเทียบกลุ่ม 100 เหรียญที่ไม่รวม stablecoin'],
      ['Rising dominance often means money is sticking to BTC rather than spreading to altcoins.', 'dominance ที่เพิ่มขึ้นมักแปลว่าเงินกระจุกอยู่ที่ BTC ไม่ได้กระจายไป altcoin'],
      [x.btc_dom != null ? `${f(x.btc_dom, 1)}%${x.btc_dom_7d != null ? `, ${pct(x.btc_dom_7d, 1)} pt over 7 days` : '. The 7-day change needs 7 days of our own history.'}` : 'Not available.', x.btc_dom != null ? `${f(x.btc_dom, 1)}%${x.btc_dom_7d != null ? ` เปลี่ยน ${pct(x.btc_dom_7d, 1)} จุดใน 7 วัน` : ' ส่วนการเปลี่ยนแปลง 7 วันต้องรอประวัติของเราครบ 7 วัน'}` : 'ไม่พร้อมใช้งาน']],
    ethbtc: [['ETH price measured in BTC, from closed candles.', 'ราคา ETH เมื่อวัดเป็น BTC คิดจากแท่งวันที่ปิดแล้ว'],
      ['ETH/BTC is a quick read of whether the second-largest coin keeps pace with BTC.', 'ETH/BTC ใช้ดูเร็วๆ ว่าเหรียญอันดับสองตาม BTC ทันไหม'],
      [x.ethbtc_7d != null ? `${pct(x.ethbtc_7d, 1)} over 7 days, ${pct(x.ethbtc_30d, 1)} over 30 days.` : 'Not available.', x.ethbtc_7d != null ? `${pct(x.ethbtc_7d, 1)} ใน 7 วัน และ ${pct(x.ethbtc_30d, 1)} ใน 30 วัน` : 'ไม่พร้อมใช้งาน']],
    altbr: [['Share of altcoins in the universe that did better than BTC over 7 and 30 days.', 'สัดส่วน altcoin ที่ทำผลงานดีกว่า BTC ในรอบ 7 วันและ 30 วัน'],
      ['Shows whether altcoins lead or lag BTC.', 'ดูว่า altcoin นำหรือตามหลัง BTC'],
      [x.alts_beat_btc_7d != null ? `${f(x.alts_beat_btc_7d)}% (7d), ${f(x.alts_beat_btc_30d)}% (30d).` : 'Not available.', x.alts_beat_btc_7d != null ? `${f(x.alts_beat_btc_7d)}% (7 วัน) และ ${f(x.alts_beat_btc_30d)}% (30 วัน)` : 'ไม่พร้อมใช้งาน']],
    part: [['Median altcoin change minus BTC change, on the last day and over 7 days, mapped to 0–100 (50 = in step with BTC).', 'median การเปลี่ยนแปลงของ altcoin ลบด้วยของ BTC ทั้งรายวันและ 7 วัน แปลงเป็น 0–100 (50 = ไปพร้อม BTC)'],
      ['Below 50 means altcoins trail BTC, so BTC may be masking weakness.', 'ต่ำกว่า 50 แปลว่า alt ตามหลัง BTC และ BTC อาจบังความอ่อนแอของตลาด'],
      [C.P ? `Alt median ${pct(C.P.alt7, 1)} vs BTC ${pct(C.P.btc7, 1)} over 7 days → ${f(C.P.v)}.` : 'Not available.', C.P ? `median alt ${pct(C.P.alt7, 1)} เทียบ BTC ${pct(C.P.btc7, 1)} ใน 7 วัน ได้ ${f(C.P.v)}` : 'ไม่พร้อมใช้งาน']],
    oi: [['Open interest (open perp positions, USD) on OKX + Hyperliquid for the universe coins, as a share of their market cap, and the 7-day change in coin terms (OKX top 20).', 'OI (โพซิชัน perp ที่เปิดค้าง, USD) บน OKX + Hyperliquid ของเหรียญในกลุ่ม เทียบมาร์เก็ตแคป และการเปลี่ยนแปลง 7 วันแบบนับเป็นจำนวนเหรียญ (OKX 20 อันดับแรก)'],
      ['Fast OI growth means more leverage is building up.', 'OI ที่โตเร็วแปลว่า leverage กำลังสะสม'],
      [lv.comp.F ? `${big(lv.comp.F.oi)} (${f(lv.oi_mcap, 2)}% of mcap)${lv.comp.O ? `, ${pct(lv.comp.O.chg, 1)} in 7 days` : ''}. Binance and Bybit are not included.` : 'Not available.', lv.comp.F ? `${big(lv.comp.F.oi)} (${f(lv.oi_mcap, 2)}% ของมาร์เก็ตแคป)${lv.comp.O ? ` เปลี่ยน ${pct(lv.comp.O.chg, 1)} ใน 7 วัน` : ''} ยังไม่รวม Binance และ Bybit` : 'ไม่พร้อมใช้งาน']],
    funding: [['OI-weighted average funding per 8 hours, and the share of coins with funding beyond ±0.05%/8h.', 'funding เฉลี่ยต่อ 8 ชม. ถ่วงด้วย OI และสัดส่วนเหรียญที่ funding เกิน ±0.05%/8h'],
      ['High positive funding means longs pay to stay in, which shows a crowded long side. Deeply negative means crowded shorts.', 'funding บวกสูงแปลว่าฝั่ง long ต้องจ่ายเพื่อถือต่อ แสดงว่าฝั่ง long แออัด ถ้าติดลบลึกคือฝั่ง short แออัด'],
      [lv.comp.F ? `${f(lv.comp.F.fbar, 4)}%/8h, ${f(lv.comp.X && lv.comp.X.share, 1)}% of ${lv.comp.F.n} coins extreme.` : 'Not available.', lv.comp.F ? `${f(lv.comp.F.fbar, 4)}%/8h มี ${f(lv.comp.X && lv.comp.X.share, 1)}% จาก ${lv.comp.F.n} เหรียญที่ funding สุดโต่ง` : 'ไม่พร้อมใช้งาน']],
    liq: [['Forced closes of leveraged positions across the market.', 'จำนวน liquidation หรือโพซิชันที่โดนบังคับปิดทั้งตลาด'],
      ['Big liquidation waves often mark violent moves.', 'liquidation ก้อนใหญ่มักมาพร้อมกับช่วงที่ราคาสะบัดแรง'],
      ['No free market-wide source (CoinGlass is paid, Binance/Bybit are blocked for our data jobs), so it is not shown.', 'ยังไม่มีแหล่งข้อมูลทั้งตลาดแบบฟรี (CoinGlass ต้องจ่ายเงิน ส่วน Binance/Bybit ถูกบล็อกจากเครื่องที่ดึงข้อมูล) เลยยังไม่แสดง']],
    map: [['Each tile is one coin: size = market cap, colour and arrow = price change for the selected period (CoinGecko, intraday, not scored).', 'แต่ละช่องคือหนึ่งเหรียญ ขนาด = มาร์เก็ตแคป สีและลูกศร = การเปลี่ยนแปลงราคาในช่วงที่เลือก (CoinGecko ภาพระหว่างวัน ไม่ได้ใช้คิดคะแนน)'],
      ['Shows at a glance whether moves are broad or limited to a few large coins.', 'ดูได้ทันทีว่าตลาดขยับทั้งกระดาน หรือแค่ไม่กี่เหรียญใหญ่'],
      [`${d.coins.length} coins. Use the arrow keys to move between tiles, Enter for details.`, `${d.coins.length} เหรียญ ใช้ปุ่มลูกศรเลื่อนระหว่างช่อง กด Enter เพื่อดูรายละเอียด`]],
    cat: [['Median price change of the coins in each category (one primary category per coin). 7d closed = from closed candles.', 'median การเปลี่ยนแปลงราคาของเหรียญในแต่ละกลุ่ม (เหรียญละหนึ่งกลุ่มหลัก) ช่อง 7 วันปิดแท่งคิดจากแท่งวันที่ปิดแล้ว'],
      ['Shows which sectors hold up and which lead the drop or the rise.', 'ดูว่ากลุ่มไหนยืนได้ กลุ่มไหนนำลงหรือนำขึ้น'],
      ['Groups with fewer than 3 coins are not shown.', 'กลุ่มที่มีไม่ถึง 3 เหรียญจะไม่แสดงค่า']],
  }[k];
  const i = LANG === 'th' ? 1 : 0;
  return uiHelp(`${XL('What it is', 'คืออะไร')}: ${T3[0][i]}\n${XL('Why it matters', 'ทำไมสำคัญ')}: ${T3[1][i]}\n${XL('Today', 'วันนี้')}: ${T3[2][i]}`, XL('Explanation', 'คำอธิบาย'));
}
/* ---------- page ---------- */
function pBreadth() {
  const m = $('#main');
  if (HM.d === undefined) { m.innerHTML = `<div class="page hm" aria-busy="true">${pageHead(XL('Market health', 'สุขภาพตลาด'))}<div class="hm-top"><div class="card hm-skel"></div><div class="card hm-skel"></div></div><div class="card hm-skel tall"></div><p class="sub">${esc(XL('Loading market health…', 'กำลังโหลดสุขภาพตลาด…'))}</p></div>`;
    hmLoad().then(() => { if (S.route === 'breadth') pBreadth(); }); return; }
  if (!HM.d) { m.innerHTML = `<div class="page hm">${pageHead(XL('Market health', 'สุขภาพตลาด'))}<div class="empty empty-cat"><p class="err">${esc(XL('Market health data did not load.', 'โหลดข้อมูลสุขภาพตลาดไม่สำเร็จ'))} <span class="sub">${esc(HM.err)}</span></p><button class="btn" type="button" data-hmretry>${esc(T('retry'))}</button></div></div>`; return; }
  const d = HM.d, o = d.official, lv = d.leverage, st = hmState(d), pro = HM.mode === 'pro';
  const spotOk = o.score != null && !st.cand, levOk = lv && lv.score != null && !st.lev;
  const miss = { universe: XL('fewer than 90 coins', 'เหรียญไม่ถึง 90'), B: 'breadth', M: 'MA', V: 'volume', H: XL('highs/lows', 'จุดสูง/ต่ำ'), P: 'participation', F: 'funding', O: 'OI', X: XL('extreme funding', 'funding สุดโต่ง') };
  const why = (a, stale) => (stale ? XL('data is too old', 'ข้อมูลเก่าเกินไป') : XL('missing: ', 'ขาด: ') + a.map((k) => miss[k] || k).join(', '));
  const score = (lab, tip, ok, v, b, sub, chips, a, stale) => `<section class="card hm-score" aria-label="${esc(lab)}"><div class="hm-sh"><h2>${esc(lab)}</h2>${tip}</div>
    ${ok ? `<div class="hm-big"><b class="num">${esc(hmN(v, 0))}</b><span class="hm-band b-${esc(b)}">${esc(hmBand(b))}</span></div>` : `<div class="hm-big">${hmNA(why(a, stale))}</div>`}
    <div class="hm-meta">${chips}</div><p class="sub">${esc(sub)}</p></section>`;
  const C = o.comp, x = d.context;
  const metric = (k, lab, val, sub, chips) => `<div class="hm-m"><div class="hm-mh"><span>${esc(lab)}</span>${hmTip(k, d)}</div><div class="hm-mv num">${val == null ? hmNA() : esc(val)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}<div class="hm-meta">${chips}</div></div>`;
  const cd = st.cand ? chip('stale', d) : chip('daily', d), cg = st.intra ? chip('stale', d) : chip('delayed', d), es = st.lev ? chip('stale', d) : chip('estimated', d);
  const mets = [
    metric('adv', XL('Advancing vs declining', 'เหรียญขึ้น vs ลง'), C.B ? XL(`${hmN(C.B.adv1, 0)}% up · ${hmN(C.B.dec1, 0)}% down`, `ขึ้น ${hmN(C.B.adv1, 0)}% · ลง ${hmN(C.B.dec1, 0)}%`) : null, C.B ? XL(`7 days: ${hmN(C.B.adv7, 0)}% up · ${hmN(C.B.dec7, 0)}% down`, `7 วัน: ขึ้น ${hmN(C.B.adv7, 0)}% · ลง ${hmN(C.B.dec7, 0)}%`) : '', cd),
    metric('ma200', XL('Above MA200', 'อยู่เหนือ MA200'), C.M ? hmN(C.M.a200, 1) + '%' : null, C.M ? XL(`${C.M.n200} coins with 200+ days`, `${C.M.n200} เหรียญที่มีแท่ง 200 วันขึ้นไป`) : '', cd),
    metric('hilo', XL('30-day highs vs lows', 'จุดสูงสุด vs ต่ำสุด รอบ 30 วัน'), C.H ? `${C.H.nh} / ${C.H.nl}` : null, C.H ? XL('new highs / new lows', 'สูงสุดใหม่ / ต่ำสุดใหม่') : '', cd),
    metric('vol', XL('Spot volume vs 30-day avg', 'Spot volume เทียบค่าเฉลี่ย 30 วัน'), C.V ? hmN(C.V.R, 2) + '×' : null, C.V ? XL(`direction ${hmN(C.V.d, 2)} (cap 10% per coin)`, `ทิศทาง ${hmN(C.V.d, 2)} (จำกัดเหรียญละ 10%)`) : '', cd),
    metric('dom', XL('BTC dominance', 'BTC dominance'), x.btc_dom != null ? hmN(x.btc_dom, 1) + '%' : null, x.btc_dom_ex_stables != null ? XL(`ex-stablecoins: ${hmN(x.btc_dom_ex_stables, 1)}%`, `ไม่รวม stablecoin: ${hmN(x.btc_dom_ex_stables, 1)}%`) : '', d.sources.cg_global && d.sources.cg_global.err ? '' : cg),
    ...(pro ? [
      metric('ma50', XL('Above MA50', 'อยู่เหนือ MA50'), C.M ? hmN(C.M.a50, 1) + '%' : null, C.M ? XL(`${C.M.n50} coins`, `${C.M.n50} เหรียญ`) : '', cd),
      metric('part', XL('BTC–alt participation', 'alt ขยับตาม BTC แค่ไหน'), C.P ? hmN(C.P.v, 0) : null, C.P ? XL(`alt median ${pct(C.P.alt7, 1)} vs BTC ${pct(C.P.btc7, 1)} (7d)`, `median alt ${pct(C.P.alt7, 1)} เทียบ BTC ${pct(C.P.btc7, 1)} (7 วัน)`) : '', cd),
      metric('ethbtc', 'ETH/BTC', x.ethbtc_7d != null ? pct(x.ethbtc_7d, 1) : null, x.ethbtc_30d != null ? XL(`7 days · 30 days ${pct(x.ethbtc_30d, 1)}`, `7 วัน · 30 วัน ${pct(x.ethbtc_30d, 1)}`) : '', cd),
      metric('altbr', XL('Altcoins beating BTC', 'Altcoin ที่ดีกว่า BTC'), x.alts_beat_btc_7d != null ? hmN(x.alts_beat_btc_7d, 0) + '%' : null, x.alts_beat_btc_30d != null ? XL(`7 days · 30 days ${hmN(x.alts_beat_btc_30d, 0)}%`, `7 วัน · 30 วัน ${hmN(x.alts_beat_btc_30d, 0)}%`) : '', cd),
      metric('oi', XL('Open interest (OKX + Hyperliquid)', 'OI (OKX + Hyperliquid)'), lv.comp.F && !st.lev ? big(lv.comp.F.oi) : null, lv.comp.O && !st.lev ? XL(`${pct(lv.comp.O.chg, 1)} in 7 days, coin terms`, `${pct(lv.comp.O.chg, 1)} ใน 7 วัน (นับเป็นจำนวนเหรียญ)`) : '', es),
      metric('funding', 'Funding', lv.comp.F && !st.lev ? hmN(lv.comp.F.fbar, 4) + '%/8h' : null, lv.comp.X && !st.lev ? XL(`${hmN(lv.comp.X.share, 1)}% of ${lv.comp.X.n} coins beyond ±0.05%`, `${hmN(lv.comp.X.share, 1)}% จาก ${lv.comp.X.n} เหรียญเกิน ±0.05%`) : '', es),
      `<div class="hm-m"><div class="hm-mh"><span>Liquidations</span>${hmTip('liq', d)}</div><div class="hm-mv">${hmNA(XL('no free market-wide source', 'ไม่มีแหล่งข้อมูลทั้งตลาดแบบฟรี'))}</div></div>`] : [])];
  const sum = hmSummary(d), know = hmKnow(d);
  m.innerHTML = `<div class="page hm" id="hm">
    <div class="hm-head"><div><h1>${esc(XL('Market health', 'สุขภาพตลาด'))}</h1><p class="hm-desc">${esc(XL('Describes the market, not a forecast', 'บรรยายสภาพตลาด ไม่ใช่การทำนาย'))}</p></div>
      <div class="seg" role="group" aria-label="${esc(XL('Mode', 'โหมด'))}"><button type="button" data-hmmode="simple" aria-pressed="${!pro}">Simple</button><button type="button" data-hmmode="pro" aria-pressed="${pro}">Pro</button></div></div>
    <div class="hm-top">
      ${score('Spot Market Health', hmTip('spot', d), spotOk, o.score, o.band, XL(`${o.n} coins, closed daily candles (${[...new Set(o.coins.map((c) => c.src))].join(' / ')})`, `${o.n} เหรียญ คิดจากแท่งวันที่ปิดแล้ว (${[...new Set(o.coins.map((c) => c.src))].join(' / ')})`), cd, o.missing, st.cand)}
      ${score('Leverage Risk', hmTip('lev', d), levOk, lv && lv.score, lv && lv.band, XL(`OKX + Hyperliquid, ${lv ? lv.coverage : 0} of ${o.n} coins · never added to the spot score`, `OKX + Hyperliquid ครอบคลุม ${lv ? lv.coverage : 0} จาก ${o.n} เหรียญ · ไม่ได้รวมเข้ากับคะแนน spot`), es, lv ? lv.missing : ['F'], st.lev)}
    </div>
    ${sum.length ? `<ul class="hm-sum">${sum.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    <div class="hm-grid">
      <section class="hm-l card" aria-label="${esc(XL('Heatmap', 'Heatmap'))}">${hmMapShell(d)}</section>
      <aside class="hm-r"><section class="card hm-know"><h2>${esc(XL('What to know today', 'สิ่งที่ควรรู้วันนี้'))}</h2>${know.length ? `<ul>${know.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : `<p class="sub">${hmNA()}</p>`}</section>
        <section class="hm-ms" aria-label="${esc(XL('Key metrics', 'ตัวชี้วัดหลัก'))}">${mets.join('')}</section></aside>
    </div>
    <section class="card hm-cat" aria-label="${esc(XL('Category performance', 'ผลงานรายกลุ่ม'))}">${hmCats(d, pro)}</section>
    ${pro ? `<section class="card hm-hist">${hmHist()}</section>${hmMethod(d)}` : ''}
    <div class="foot">${esc(XL('Market health describes the market and does not forecast it. Not financial advice.', 'สุขภาพตลาดบรรยายสภาพตลาด ไม่ใช่การทำนาย และไม่ใช่คำแนะนำการลงทุน'))}<br>
      ${esc(XL('Sources', 'แหล่งข้อมูล'))}: <a class="link" href="https://www.coingecko.com/" target="_blank" rel="noopener">Data provided by CoinGecko</a> · Binance · OKX · Gate · Hyperliquid ·
      ${esc(XL('built', 'อัปเดต'))} ${esc(jst(new Date(d.updated)))}</div></div>`;
  hmDraw();
}
function hmMapShell(d) {
  const tf = HM_TF.find((t) => t[0] === HM.tf) || HM_TF[1];
  return `<div class="hm-sh"><h2>Heatmap</h2>${hmTip('map', d)}<span class="hm-meta">${hmState(d).intra ? chip('stale', d) : chip('delayed', d)}<span class="sub">CoinGecko ${esc(jst(new Date(d.sources.cg_markets.at)))} · ${esc(XL('intraday view, not scored', 'ภาพระหว่างวัน ไม่ใช้คิดคะแนน'))}</span></span></div>
    <div class="hm-ctl"><div role="tablist" class="seg" aria-label="${esc(XL('Period', 'ช่วงเวลา'))}">${HM_TF.map(([k]) => `<button type="button" role="tab" id="hmtab-${k}" aria-controls="hmPanel" aria-selected="${k === tf[0]}" tabindex="${k === tf[0] ? 0 : -1}" data-hmtf="${k}">${k.toUpperCase()}</button>`).join('')}</div>
      <label class="hm-sel"><span>${esc(XL('Group by', 'จัดกลุ่มตาม'))}</span><select data-hmgrp>${[['mcap', XL('Market cap', 'มาร์เก็ตแคป')], ['cat', XL('Category', 'กลุ่ม')], ['eco', XL('Ecosystem', 'Ecosystem')]].map(([k, l]) => `<option value="${k}" ${HM.grp === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      <button type="button" class="btn ghost" data-hmview aria-pressed="${HM.view === 'table'}">${esc(HM.view === 'table' ? XL('Show treemap', 'ดูเป็น treemap') : XL('Show as table', 'ดูเป็นตาราง'))}</button></div>
    <div id="hmPanel" role="tabpanel" aria-labelledby="hmtab-${tf[0]}" class="hm-panel"></div>
    <p class="sub hm-legend">${esc(XL(`Size = market cap · colour and ▲▼ = ${tf[0]} change (full colour at ±${tf[2]}%)`, `ขนาด = มาร์เก็ตแคป · สีและ ▲▼ = การเปลี่ยนแปลง ${tf[0]} (สีเข้มสุดที่ ±${tf[2]}%)`))}</p>`;
}
const hmBg = (v, lim) => (v == null ? 'var(--sf2)' : `color-mix(in srgb, var(${v >= 0 ? '--up' : '--dn'}) ${Math.round(14 + 66 * Math.min(1, Math.abs(v) / lim))}%, var(--sf2))`);
const hmArrow = (v) => (v == null ? '–' : (v > 0 ? '▲ ' : v < 0 ? '▼ ' : '') + pct(v, 1));
function hmGroups(d) {
  const coins = d.coins.filter((c) => c.mc > 0), key = { mcap: 'tier', cat: 'cat', eco: 'eco' }[HM.grp] || 'tier', g = new Map();
  coins.forEach((c) => { const k = c[key] || 'Other'; if (!g.has(k)) g.set(k, []); g.get(k).push(c); });
  return [...g].map(([k, items]) => ({ k, items: items.map((c) => ({ ...c, v: c.mc })) }));
}
function hmDraw() {
  const P = $('#hmPanel'); if (!P || !HM.d) return;
  const d = HM.d, tf = HM_TF.find((t) => t[0] === HM.tf) || HM_TF[1];
  if (!d.coins.length) { P.innerHTML = `<div class="empty">${esc(XL('No coins in this view.', 'ไม่มีเหรียญในมุมมองนี้'))}</div>`; return; }
  if (HM.view === 'table') { P.innerHTML = hmTable(d); return; }
  const W = Math.floor(P.clientWidth), Hh = W < 600 ? 520 : 500, G = HMC.groupLayout(hmGroups(d), W, Hh, 18);
  const tiles = G.flatMap((g) => g.tiles).sort((a, b) => (Math.abs(a.y - b.y) > 4 ? a.y - b.y : a.x - b.x)); // reading order for the arrow keys
  HM.tiles = tiles; HM.pin = -1;
  P.innerHTML = `<div class="hm-map" style="height:${Hh}px" data-hmmap>${G.map((g) => `<div class="hm-g" style="left:${g.x}px;top:${g.y}px;width:${g.w}px;height:${g.h}px" aria-hidden="true">${g.head && g.w >= 90 ? `<span>${esc(hmG(g.k))}</span>` : ''}</div>`).join('')}
    ${tiles.map((t, i) => { const v = t[tf[1]], fs = Math.min(22, Math.sqrt(t.w * t.h) / 6, (t.w - 6) / (t.s.length * 0.68)), big_ = t.h >= 26 && fs >= 9; // label only when the symbol fits the tile
      const lab = `${t.s} ${t.n}, ${tf[0]} ${pct(v, 1)}, ${XL('market cap', 'มาร์เก็ตแคป')} ${big(t.mc)}`;
      return `<button type="button" class="hm-t" data-hmt="${i}" tabindex="${i ? -1 : 0}" aria-label="${esc(lab)}" style="left:${t.x}px;top:${t.y}px;width:${Math.max(0, t.w - 1)}px;height:${Math.max(0, t.h - 1)}px;background:${hmBg(v, tf[2])};font-size:${fs.toFixed(1)}px">${big_ ? `<b>${esc(t.s)}</b>${t.h >= 44 && t.w >= 58 ? `<span>${esc(hmArrow(v))}</span>` : ''}` : ''}</button>`; }).join('')}
    <div class="hm-tip" role="tooltip" id="hmTip" hidden></div></div>`;
}
function hmTipShow(i) {
  const t = HM.tiles && HM.tiles[i], tip = $('#hmTip'), map = $('[data-hmmap]'); if (!t || !tip) return;
  const row = (l, v) => `<div><span>${esc(l)}</span><b class="num">${esc(v)}</b></div>`;
  tip.innerHTML = `<strong>${esc(t.n)} <span class="sub">${esc(t.s)}</span></strong>${row(XL('Price', 'ราคา'), px(t.p))}${row(XL('Market cap', 'มาร์เก็ตแคป'), big(t.mc))}${row(XL('Volume 24h', 'Volume 24 ชม.'), big(t.v))}${row('1h', hmArrow(t.c1h))}${row('24h', hmArrow(t.c24))}${row('7d', hmArrow(t.c7))}${row('30d', hmArrow(t.c30))}<div class="sub">${esc(hmG(t.cat || 'Other'))} · ${esc(hmG(t.eco || 'Other'))}</div>`;
  tip.hidden = false;
  const W = map.clientWidth, Hh = map.clientHeight, tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = t.x + t.w + 6, y = t.y; if (x + tw > W) x = t.x - tw - 6; if (x < 0) x = Math.max(0, Math.min(W - tw, t.x + t.w / 2 - tw / 2)); if (y + th > Hh) y = Math.max(0, Hh - th);
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
  $$('.hm-t').forEach((b) => b.removeAttribute('aria-describedby')); const b = $(`[data-hmt="${i}"]`); if (b) b.setAttribute('aria-describedby', 'hmTip');
}
const hmTipHide = () => { const tip = $('#hmTip'); if (tip) tip.hidden = true; HM.pin = -1; };
function hmTable(d) {
  const [k, dir] = HM.sort, cols = [['rank', '#'], ['s', XL('Coin', 'เหรียญ')], ['p', XL('Price', 'ราคา')], ['mc', XL('Market cap', 'มาร์เก็ตแคป')], ['v', 'Volume 24h'], ['c1h', '1h'], ['c24', '24h'], ['c7', '7d'], ['c30', '30d'], ['cat', XL('Category', 'กลุ่ม')]];
  const rows = [...d.coins].sort((a, b) => { const x = a[k], y = b[k]; return x == null ? 1 : y == null ? -1 : (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir; });
  return `<div class="tbl-wrap"><table class="hm-tbl"><caption class="sub">${esc(XL(`${d.coins.length} coins · CoinGecko intraday view`, `${d.coins.length} เหรียญ · ภาพระหว่างวันจาก CoinGecko`))}</caption><thead><tr>${cols.map(([c, l]) => `<th scope="col" aria-sort="${c === k ? (dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" data-hmsort="${c}">${esc(l)}</button></th>`).join('')}</tr></thead>
    <tbody>${rows.map((c) => `<tr><td class="num">${c.rank ?? '–'}</td><th scope="row">${esc(c.s)} <span class="sub">${esc(c.n)}</span></th><td class="num">${esc(px(c.p))}</td><td class="num">${esc(big(c.mc))}</td><td class="num">${esc(big(c.v))}</td>${['c1h', 'c24', 'c7', 'c30'].map((f) => `<td class="num ${cls(c[f])}">${esc(hmArrow(c[f]))}</td>`).join('')}<td>${esc(hmG(c.cat || 'Other'))}</td></tr>`).join('')}</tbody></table></div>`;
}
function hmCats(d, pro) {
  const by = Object.fromEntries((d.categories || []).map((c) => [c.k, c])), keys = ['L1', 'L2', 'DeFi', 'AI', 'Meme', 'Gaming', 'RWA', 'DePIN', 'Other'];
  const cell = (v, ok) => (ok && v != null ? `<td class="num ${cls(v)}">${esc(hmArrow(v))}</td>` : `<td>${ok ? '–' : ''}</td>`);
  return `<div class="hm-sh"><h2>${esc(XL('Category performance', 'ผลงานรายกลุ่ม'))}</h2>${hmTip('cat', d)}</div><div class="tbl-wrap"><table class="hm-tbl"><thead><tr><th scope="col">${esc(XL('Category', 'กลุ่ม'))}</th><th scope="col">${esc(XL('Coins', 'เหรียญ'))}</th><th scope="col">1h</th><th scope="col">24h</th><th scope="col">7d</th><th scope="col">30d</th><th scope="col">${esc(XL('7d (closed)', '7 วัน (ปิดแท่ง)'))}</th>${pro ? `<th scope="col">${esc(XL('Up 7d', 'ขึ้นใน 7 วัน'))}</th><th scope="col">&gt; MA200</th>` : ''}</tr></thead><tbody>
    ${keys.map((k) => { const c = by[k], ok = c && c.n >= 3; return `<tr><th scope="row">${esc(hmG(k))}</th><td class="num">${c ? c.n : 0}</td>${ok ? ['c1h', 'c24', 'c7', 'c30'].map((f) => cell(c.med[f], true)).join('') + cell(c.d7, true) + (pro ? `<td class="num">${hmN(c.adv7, 0)}%</td><td class="num">${c.a200 == null ? '–' : hmN(c.a200, 0) + '%'}</td>` : '') : `<td colspan="${pro ? 7 : 5}">${hmNA(XL('fewer than 3 coins', 'มีไม่ถึง 3 เหรียญ'))}</td>`}</tr>`; }).join('')}</tbody></table></div>
    <p class="sub">${esc(XL('1h–30d: CoinGecko intraday view, median per category. 7d (closed): closed daily candles.', '1h–30d: ภาพระหว่างวันจาก CoinGecko (median ของกลุ่ม) ช่อง 7 วันปิดแท่งคิดจากแท่งวันที่ปิดแล้ว'))}</p>`;
}
function hmHist() {
  const rows = (HM.h && HM.h.rows) || [];
  const head = `<div class="hm-sh"><h2>${esc(XL('History', 'ประวัติ'))}</h2></div>`;
  if (!rows.length) return head + `<p class="sub">${hmNA(XL('no history yet', 'ยังไม่มีประวัติ'))}</p>`;
  const pts = rows.filter((r) => r.spot != null), W = 600, Hh = 80;
  const line = pts.length >= 2 ? `<svg class="hm-spark" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" role="img" aria-label="${esc(XL('Spot score history', 'ประวัติคะแนน spot'))}"><polyline fill="none" stroke="var(--ac)" stroke-width="2" vector-effect="non-scaling-stroke" points="${pts.map((r, i) => `${(i / (pts.length - 1)) * W},${Hh - (r.spot / 100) * Hh}`).join(' ')}"/></svg>` : '';
  return head + `<p class="sub">${esc(XL(`Logged daily from launch (${rows[0].d}). No backfill: earlier days would only include coins that survived to today.`, `เก็บทุกวันตั้งแต่เริ่มใช้ (${rows[0].d}) ไม่ย้อนเติมข้อมูลเก่า เพราะจะเหลือแต่เหรียญที่รอดมาถึงวันนี้`))}</p>${line}
    <div class="tbl-wrap"><table class="hm-tbl"><thead><tr><th scope="col">${esc(XL('Day (UTC)', 'วัน (UTC)'))}</th><th scope="col">Spot</th><th scope="col">Leverage Risk</th><th scope="col">BTC dom.</th><th scope="col">${esc(XL('Coins', 'เหรียญ'))}</th></tr></thead><tbody>
    ${rows.slice(-14).reverse().map((r) => `<tr><td>${esc(r.d)}</td><td class="num">${r.spot == null ? '–' : esc(hmN(r.spot, 0) + ' · ' + hmBand(r.band))}</td><td class="num">${r.lev == null ? '–' : esc(hmN(r.lev, 0) + ' · ' + hmBand(r.lev_band))}</td><td class="num">${r.btc_dom == null ? '–' : hmN(r.btc_dom, 1) + '%'}</td><td class="num">${r.n}</td></tr>`).join('')}</tbody></table></div>`;
}
function hmMethod(d) {
  const L_ = LANG === 'th' ? [
    'คะแนน Spot = (30·Breadth + 25·MA trend + 15·Volume + 10·Highs/Lows + 10·Participation) ÷ 90 จำกัดไว้ที่ 0–100 ทุกส่วนคิดจากแท่งวันที่ปิดแล้วของคู่เทรดเดียวกับราคา (Binance → OKX → Gate)',
    'Breadth = 0.4×%ขึ้นวันล่าสุด + 0.6×%ขึ้นใน 7 วัน · MA trend = ค่าเฉลี่ยของ %เหนือ MA50 และ %เหนือ MA200 (เหรียญที่มีแท่งไม่ถึง 200 วันไม่ถูกนับใน MA200)',
    'Volume = 50 + 50·d·w โดย d = ทิศทางของ volume (จำกัดเหรียญละ 10%) และ w = clamp((R−0.5)/1, 0, 1) จาก median ของ volume ÷ ค่าเฉลี่ย 30 วัน',
    'Highs/Lows = 50 + 50·(สูงใหม่−ต่ำใหม่) ÷ max(สูงใหม่+ต่ำใหม่, 10% ของเหรียญ) · Participation = 50 + 50·(0.5·clamp(s1/5) + 0.5·clamp(s7/10)) โดย s = median alt − BTC',
    'ระดับ: ≥70 Strong · 55–69 Healthy · 40–54 Mixed · <40 Weak ป้ายจะเปลี่ยนเมื่อคะแนนเลยเส้นไป 3 จุด แต่ตัวเลขแสดงค่าจริงเสมอ ถ้าขาดส่วนไหน หรือเหรียญไม่ถึง 90 จะไม่แสดงคะแนน',
    'Leverage Risk = 0.40·F + 0.35·O + 0.25·X (F = |funding − 0.01%| ÷ 0.09%, O = OI 7 วันแบบนับเป็นจำนวนเหรียญ เต็มที่ +30%, X = 4 × %เหรียญที่ funding เกิน ±0.05%) ระดับ <20 Low · 20–39 Normal · 40–59 Elevated · 60–79 High · ≥80 Extreme ไม่รวมเข้ากับคะแนน spot',
    'ข้อจำกัด: น้ำหนักและเกณฑ์ทั้งหมดเป็นการตัดสินใจของทีม ไม่ได้ fit จากข้อมูล และไม่มี backtest ย้อนหลัง (จะมี survivorship bias) ประวัติเริ่มนับจากวันที่เปิดใช้',
    'ข้อจำกัด: Breadth 7 วัน, MA trend และจุดต่ำรอบ 30 วัน วัดเทรนด์เหมือนๆ กัน รวมกันแล้วเกิน ~65% ของน้ำหนัก คะแนนจึงตามเทรนด์และกลับตัวช้าที่จุดเปลี่ยน',
    'กลุ่มเหรียญ: 100 อันดับแรกตามมาร์เก็ตแคปจาก CoinGecko ไม่รวม stablecoin, wrapped, bridged, staked/LST, leveraged token, tokenized asset (ทองคำ หุ้น พันธบัตร credit) และเหรียญที่ volume 24 ชม. ต่ำกว่า $5M เก็บรายชื่อของทุกวันไว้ในประวัติ',
    'Derivatives ใช้แค่ OKX + Hyperliquid (Binance/Bybit ถูกบล็อกจากเครื่องที่ดึงข้อมูล) Liquidation ทั้งตลาดยังไม่มีแหล่งฟรี'] : [
    'Spot = (30·Breadth + 25·MA trend + 15·Volume + 10·Highs/Lows + 10·Participation) ÷ 90, clamped 0–100. Every part uses closed daily candles from the same pair as the price (Binance → OKX → Gate).',
    'Breadth = 0.4×% up on the last day + 0.6×% up over 7 days · MA trend = mean of % above MA50 and % above MA200 (coins with under 200 days are left out of MA200).',
    'Volume = 50 + 50·d·w, d = volume direction (each coin capped at 10% of the total), w = clamp((R−0.5)/1, 0, 1) from the median of volume ÷ 30-day average.',
    'Highs/Lows = 50 + 50·(highs−lows) ÷ max(highs+lows, 10% of coins) · Participation = 50 + 50·(0.5·clamp(s1/5) + 0.5·clamp(s7/10)), s = alt median − BTC.',
    'Bands: ≥70 Strong · 55–69 Healthy · 40–54 Mixed · <40 Weak. The label changes only 3 points past an edge; the number is always the true value. No score if any part is missing or fewer than 90 coins qualify.',
    'Leverage Risk = 0.40·F + 0.35·O + 0.25·X (F = |funding − 0.01%| ÷ 0.09%, O = 7-day OI change in coin terms, full at +30%, X = 4 × % of coins beyond ±0.05% funding). <20 Low · 20–39 Normal · 40–59 Elevated · 60–79 High · ≥80 Extreme. Never added to the spot score.',
    'Limits: every weight and threshold is a judgment call, not fitted. There is no retro backtest (it would carry survivorship bias); history starts at launch.',
    'Limits: 7-day breadth, MA trend and 30-day lows all measure trend and overlap, together over ~65% of the weight, so the score follows the trend and turns late.',
    'Universe: CoinGecko top coins by market cap, excluding stablecoins, wrapped, bridged, staked/LST, leveraged tokens, tokenized assets (gold, stocks, treasuries, credit) and coins under $5M 24h volume. Each day\'s list is stored with the history.',
    'Derivatives: OKX + Hyperliquid only (Binance/Bybit are blocked for our data jobs). No free market-wide liquidation source yet.'];
  return `<details class="card hm-meth"><summary><h2>${esc(XL('Methodology and limits', 'วิธีคำนวณและข้อจำกัด'))}</h2></summary><ul>${L_.map((s) => `<li>${esc(s)}</li>`).join('')}</ul><p class="sub">${esc(XL('Formula', 'สูตร'))} ${esc(d.formula)}</p></details>`;
}
/* ---------- events ---------- */
document.addEventListener('click', (e) => {
  if (S.route !== 'breadth') return; const q = (s) => e.target.closest(s);
  if (q('[data-hmretry]')) { HM.d = undefined; pBreadth(); return; }
  const md = q('[data-hmmode]'); if (md) { HM.mode = md.dataset.hmmode; store.set('cw-hm-mode', HM.mode); pBreadth(); return; }
  const tf = q('[data-hmtf]'); if (tf) { HM.tf = tf.dataset.hmtf; store.set('cw-hm-tf', HM.tf); hmRefreshMap(); $(`[data-hmtf="${HM.tf}"]`).focus(); return; }
  if (q('[data-hmview]')) { HM.view = HM.view === 'table' ? 'map' : 'table'; hmRefreshMap(); $('[data-hmview]').focus(); return; }
  const so = q('[data-hmsort]'); if (so) { const k = so.dataset.hmsort; HM.sort = [k, HM.sort[0] === k ? -HM.sort[1] : k === 's' || k === 'cat' || k === 'rank' ? 1 : -1]; hmDraw(); $(`[data-hmsort="${k}"]`).focus(); return; }
  const t = q('[data-hmt]'); if (t) { const i = +t.dataset.hmt; if (HM.pin === i) hmTipHide(); else { hmTipShow(i); HM.pin = i; } return; }
  if (!q('#hmTip')) hmTipHide();
});
document.addEventListener('change', (e) => { if (S.route === 'breadth' && e.target.matches('[data-hmgrp]')) { HM.grp = e.target.value; store.set('cw-hm-grp', HM.grp); hmDraw(); } });
document.addEventListener('keydown', (e) => {
  if (S.route !== 'breadth') return;
  const tab = e.target.closest && e.target.closest('[data-hmtf]');
  if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const ks = HM_TF.map((x) => x[0]), i = ks.indexOf(tab.dataset.hmtf);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? ks.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + ks.length) % ks.length; HM.tf = ks[j]; store.set('cw-hm-tf', HM.tf); hmRefreshMap(); $(`[data-hmtf="${HM.tf}"]`).focus(); return; }
  const t = e.target.closest && e.target.closest('[data-hmt]');
  if (t) { const n = HM.tiles.length, i = +t.dataset.hmt, mv = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (mv || e.key === 'Home' || e.key === 'End') { e.preventDefault(); const j = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : Math.max(0, Math.min(n - 1, i + mv)); const b = $(`[data-hmt="${j}"]`);
      t.tabIndex = -1; b.tabIndex = 0; b.focus(); return; }
    if (e.key === 'Escape') { hmTipHide(); return; } }
  if (e.key === 'Escape') hmTipHide();
});
document.addEventListener('focusin', (e) => { if (S.route === 'breadth' && e.target.matches && e.target.matches('[data-hmt]')) hmTipShow(+e.target.dataset.hmt); });
document.addEventListener('mouseover', (e) => { if (S.route !== 'breadth' || HM.pin >= 0) return; const t = e.target.closest && e.target.closest('[data-hmt]'); if (t) hmTipShow(+t.dataset.hmt); });
function hmRefreshMap() { const l = $('.hm-l'); if (l && HM.d) { l.innerHTML = hmMapShell(HM.d); hmDraw(); } }
let hmRz; addEventListener('resize', () => { clearTimeout(hmRz); hmRz = setTimeout(() => { if (S.route === 'breadth' && HM.view === 'map') hmDraw(); }, 200); });
