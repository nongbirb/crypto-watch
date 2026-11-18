/* KMS Capital – Business Pulse per token (docs/architect-proof-layer.md §6, Phase 5; docs/business-pulse-p5.md). Loaded after app.js.
   One small card on the token page: up to three facts about the token's business from data/pulse.json (built by scripts/pulse.py),
   each with its 30-day change measured from the stored daily history and a link to its source. A number the history does not
   support is not shown; nothing here is estimated. No buy or sell wording. */
const PU = { d: undefined, at: 0, req: null };
function puLoad() {
  if (PU.req || (PU.d !== undefined && Date.now() - PU.at < 6e5)) return PU.req;
  PU.req = getJSON('data/pulse.json?t=' + Math.floor(Date.now() / 6e5)).then((x) => { PU.d = x; }).catch(() => { PU.d = false; })
    .finally(() => { PU.at = Date.now(); PU.req = null; const b = $('#pulseBox'), t = tokBySym(S.sel); if (b && t) b.innerHTML = puHTML(t); });
  return PU.req;
}
/* label, value format and how the 30-day change reads, per stored key (EN, TH) */
const PU_K = {
  stables: { l: ['Stablecoin supply, all chains', 'Stablecoin ทั้งตลาด'], f: 'usd' },
  'btc.exnet': { l: ['Exchange net flow, 30 days', 'BTC เข้า-ออกกระดานสุทธิ 30 วัน'], f: 'BTC', s: [' (+ = into exchanges)', ' (+ = เข้ากระดาน)'] },
  'eth.exnet': { l: ['Exchange net flow, 30 days', 'ETH เข้า-ออกกระดานสุทธิ 30 วัน'], f: 'ETH', s: [' (+ = into exchanges)', ' (+ = เข้ากระดาน)'] },
  'eth.l2net': { l: ['Ethereum bridge net flow, last 24 h', 'เงินผ่าน Bridge เข้า-ออก Ethereum สุทธิ 24 ชม.'], f: 'usdS', s: [' (+ = into Ethereum)', ' (+ = เข้า Ethereum)'] },
  'hl.fees': { l: ['Hyperliquid fees per day, 30-day average', 'ค่าธรรมเนียม Hyperliquid ต่อวัน (เฉลี่ย 30 วัน)'], f: 'usd' },
  'hl.hrev': { l: ['HYPE buybacks per day, 30-day average', 'ยอด buyback HYPE ต่อวัน (เฉลี่ย 30 วัน)'], f: 'usd', s: [' (DefiLlama "holders revenue")', ' (DefiLlama "holders revenue")'] },
  'hype.net': { l: ['Buybacks minus new circulating supply, per day', 'buyback หักเหรียญที่เข้าตลาดใหม่ ต่อวัน'], f: 'usdS', s: [' (30 days; supply valued at the close)', ' (30 วัน คิดมูลค่าเหรียญที่ราคาปิด)'] },
  'lit.oishare': { l: ['Lighter share of Lighter + Hyperliquid perp open interest', 'สัดส่วน OI ของ Lighter เทียบ Lighter + Hyperliquid'], f: 'pct' },
  'lit.mcf': { l: ['LIT market cap ÷ annualised Lighter fees', 'มาร์เก็ตแคป LIT ÷ ค่าธรรมเนียม Lighter ต่อปี'], f: 'x' },
  'hype.mcf': { l: ['HYPE market cap ÷ annualised Hyperliquid fees', 'มาร์เก็ตแคป HYPE ÷ ค่าธรรมเนียม Hyperliquid ต่อปี'], f: 'x' },
  'aave.rev': { l: ['Aave revenue, 30 days', 'รายได้ Aave 30 วัน'], f: 'usd' },
  'aave.util': { l: ['Borrow utilization', 'Utilization'], f: 'pct', s: [' (borrowed ÷ supplied)', ' (ยอดกู้ ÷ ยอดฝาก)'] },
  'aave.mcr': { l: ['AAVE market cap ÷ annualised revenue', 'มาร์เก็ตแคป AAVE ÷ รายได้ต่อปี'], f: 'x' },
  'mon.unlock': { l: ['Next unlock, as % of circulating supply', 'Unlock รอบถัดไป เทียบ % ของเหรียญหมุนเวียน'], f: 'pct' },
  'mon.tvl': { l: ['Monad TVL', 'TVL บน Monad'], f: 'usd' },
  'mon.stables': { l: ['Stablecoins on Monad', 'Stablecoin บน Monad'], f: 'usd' },
  'pendle.tvl': { l: ['Pendle TVL', 'TVL ของ Pendle'], f: 'usd' },
  'pendle.fees': { l: ['Pendle fees, 30 days', 'ค่าธรรมเนียม Pendle 30 วัน'], f: 'usd' },
  'pendle.lock': { l: ['Share of PENDLE supply in vePENDLE', 'สัดส่วน PENDLE ที่ล็อกใน vePENDLE'], f: 'pct' },
  'sol.stake': { l: ['Share of SOL supply staked', 'สัดส่วน SOL ที่ Stake'], f: 'pct' },
  'sol.fees': { l: ['Solana transaction fees, 30 days', 'ค่าธรรมเนียมธุรกรรม Solana 30 วัน'], f: 'usd' },
  'near.stake': { l: ['Share of NEAR supply staked', 'สัดส่วน NEAR ที่ Stake'], f: 'pct' },
  'near.active': { l: ['Active accounts, one day', 'บัญชีที่ใช้งาน 1 วัน'], f: 'n' },
  'near.fees': { l: ['NEAR transaction fees, 30 days', 'ค่าธรรมเนียมธุรกรรม NEAR 30 วัน'], f: 'usd' },
};
const PU_OUT = { etf: ['spot ETF flows', 'เงินไหลเข้า-ออก Spot ETF'], 'eth.stake': ['staking share', 'สัดส่วนที่ Stake'], perpvol: ['perp volume share', 'สัดส่วนวอลุ่ม Perp'],
  'aave.buyback': ['buyback amount', 'ยอด buyback'], 'sol.active': ['active addresses', 'จำนวน address ที่ใช้งาน'] };
const PU_WHY = { nosrc: ['no free source the builder can read', 'ไม่มีแหล่งข้อมูลฟรีที่ระบบดึงได้'], paid: ["DefiLlama's endpoint for it is paid", 'endpoint นี้ของ DefiLlama ต้องจ่ายเงิน'],
  zero: ['DefiLlama reports 0 for it', 'DefiLlama รายงานเป็น 0'] };
const puDay = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString(loc(), { month: 'short', day: 'numeric', timeZone: 'UTC' });
const puAdd = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const puSign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');
function puFmt(f, v) {
  if (f === 'usd') return big(v);
  if (f === 'usdS') return puSign(v) + big(Math.abs(v));
  if (f === 'x') return v.toFixed(1) + '×';
  if (f === 'pct') return v.toFixed(v >= 100 ? 0 : 1) + '%';
  if (f === 'n') return Math.round(v).toLocaleString(loc());
  return puSign(v) + Math.abs(v).toLocaleString(loc(), { maximumFractionDigits: 0 }) + ' ' + f; // BTC / ETH
}
/* the 30-day change, in the line's own terms: % for amounts, percentage points for shares, a signed difference for flows */
function puChg(x, k) {
  if (x.chg == null) return null;
  const vs = x.win ? XL('vs the 30 days before', 'เทียบ 30 วันก่อนหน้า') : XL('vs 30 days earlier', 'เทียบ 30 วันก่อน');
  const v = x.kind === 'pct' ? pct(x.chg, 1) : x.kind === 'pp' ? `${puSign(x.chg)}${Math.abs(x.chg).toFixed(2)} pp` : puFmt(k.f === 'usd' ? 'usdS' : k.f, x.chg);
  return `${v} ${vs}`;
}
function puHTML(t) {
  if (PU.d === undefined || (PU.d && Date.now() - PU.at > 6e5)) puLoad();
  const head = (extra = '') => `<div class="sec-h"><h2>${esc(XL('Business pulse', 'ตัวเลขพื้นฐาน'))}</h2>${extra}</div>`;
  if (PU.d === undefined) return head() + `<div class="sk" style="height:60px"></div>`;
  if (!PU.d || !PU.d.cards) return head() + `<p class="sub">${esc(XL('Business pulse: Unavailable', 'ตัวเลขพื้นฐาน: ดึงข้อมูลไม่ได้'))}</p>`;
  const D = PU.d, lines = D.cards[t.symbol] || [];
  const first = (key) => Object.keys(D.days).sort().find((d) => D.days[d][key] != null);
  const li = (x) => { const k = PU_K[x.key]; if (!k) return '';
    const c = puChg(x, k), since = first(x.key), avail = since ? puAdd(since, x.win ? 60 : 30) : null;
    const ch = c ? `<span class="pu-c num" data-puchg>${esc(c)}</span>` : `<span class="pu-c mut" data-puchg="none">${esc(avail ? XL(`30-day change from ${puDay(avail)} (stored history starts ${puDay(since)})`, `เปลี่ยนแปลง 30 วัน เริ่มแสดง ${puDay(avail)} (เริ่มเก็บข้อมูล ${puDay(since)})`) : XL('no 30-day change yet', 'ยังมีข้อมูลไม่ครบ 30 วันให้เทียบ'))}</span>`;
    const win = x.annualise ? `<span class="pu-w" data-puwin>${esc(XL(`market cap at the close of ${puDay(x.day)} ÷ (sum of the last 30 days × 12)`, `มาร์เก็ตแคป ณ ราคาปิด ${puDay(x.day)} ÷ (ยอด 30 วันล่าสุด × 12)`))}</span>` : '';
    const ev = x.event ? `<span class="pu-w">${esc(XL(`unlock on ${puDay(x.event.date)}: ${x.event.supply_pct}% of max supply (DefiLlama) ÷ circulating supply (CoinGecko)`, `Unlock วันที่ ${puDay(x.event.date)}: ${x.event.supply_pct}% ของ max supply (DefiLlama) ÷ เหรียญหมุนเวียน (CoinGecko)`))}</span>` : '';
    const asof = esc(XL(x.win ? `30 days to ${puDay(x.day)} (UTC)` : `${puDay(x.day)} (UTC day)`, x.win ? `30 วันถึง ${puDay(x.day)} (UTC)` : `${puDay(x.day)} (วันตาม UTC)`));
    const src = x.src.map((q) => `<a href="${esc(q.url)}" target="_blank" rel="noopener">${esc(q.label)}</a>`).join(' + ');
    return `<li class="pu-l" data-pu="${esc(x.key)}"><div class="pu-h">${esc(XL(...k.l))}${k.s ? `<span class="mut">${esc(XL(...k.s))}</span>` : ''}</div>
      <div class="pu-v"><b class="num">${esc(puFmt(k.f, x.v))}</b>${ch}</div>${win}${ev}<div class="pu-m">${asof} · ${esc(XL('source', 'แหล่งข้อมูล'))}: ${src}</div></li>`; };
  const notShown = (D.left_out && D.left_out[t.symbol] || []).filter(([, w]) => PU_WHY[w]).map(([k, w]) => PU_OUT[k] ? `${XL(...PU_OUT[k])} (${XL(...PU_WHY[w])})` : null).filter(Boolean);
  const body = lines.length ? `<ul class="pu">${lines.map(li).join('')}</ul>` : `<p class="sub">${esc(XL('No business figures for this token yet.', 'ยังไม่มีตัวเลขพื้นฐานของเหรียญนี้'))}</p>`;
  return head(`<span class="sub" data-puage>${esc(XL('Updated', 'อัปเดต'))} ${esc(fmtUpdated(D.updated))} ${fresh(D.updated, 6)}</span>`) + body
    + (notShown.length ? `` : '')
    + ``;
}
