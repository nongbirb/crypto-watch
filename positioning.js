/* KMS Capital – Positioning tab: accounts long vs short (futures), 24h taker buy vs sell (spot), on-chain holders.
   Browser (keyless, CORS-ok): Binance account ratios + spot klines, Bybit account-ratio. positioning.json (GitHub Action, every 30 min): OKX ratios + spot taker volume, Blockscout holders.
   Cached 5 min per token so busy pages do not hammer the APIs. Never guesses: missing = "not available". */
const PO = { c: {}, j: undefined, tab: 'fut' };
const PX = (en, th) => (LANG === 'th' ? th : en);
async function poJ() { if (PO.j !== undefined && PO.j && Date.now() - PO.jt < 10 * 60e3) return PO.j; PO.jt = Date.now(); try { PO.j = await getJSON('positioning.json?t=' + Math.floor(Date.now() / 6e5)); } catch (e) { PO.j = null; } return PO.j; }
const poLP = (r) => 100 * r / (1 + r); // long/short ratio -> long %
async function poLoad(t) {
  const c = PO.c[t.symbol]; if (c && Date.now() - c.at < 5 * 60e3) return c;
  const pv = Object.fromEntries(perpVenues(t)), lev = await loadLev(t).catch(() => ({ venues: [] })), J = await poJ();
  const mk = Object.fromEntries((lev.venues || []).map((v) => [v.venue, v])), ref = (lev.venues || []).map((v) => v.mark).sort((a, b) => a - b), mid = ref.length ? ref[ref.length >> 1] : null;
  const sane = (p) => !mid || !p || Math.abs(p / mid - 1) < 0.15; // same ticker, different token -> dropped
  const F = [], S = [], now = Date.now();
  const bn = pv.binance && mk.binance && sane(mk.binance.mark) ? pv.binance : null;
  const tasks = [];
  if (bn) {
    const B = 'https://fapi.binance.com/futures/data/';
    tasks.push(Promise.all([getJSON(`${B}globalLongShortAccountRatio?symbol=${bn}&period=1h&limit=25`), getJSON(`${B}topLongShortAccountRatio?symbol=${bn}&period=1h&limit=25`).catch(() => null), getJSON(`${B}topLongShortPositionRatio?symbol=${bn}&period=1h&limit=2`).catch(() => null)]).then(([g, tp, pp]) => {
      if (g && g.length) F.push({ v: 'binance', pair: bn, lp: 100 * +g[g.length - 1].longAccount, lp0: 100 * +g[0].longAccount, at: +g[g.length - 1].timestamp, top: tp && tp.length ? 100 * +tp[tp.length - 1].longAccount : null, topPos: pp && pp.length ? 100 * +pp[pp.length - 1].longAccount : null, src: 'Binance globalLongShortAccountRatio' }); }).catch(() => {}));
  }
  if (pv.bybit && mk.bybit && sane(mk.bybit.mark)) tasks.push(getJSON(`https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=${pv.bybit}&period=1h&limit=25`).then((r) => { const l = r && r.retCode === 0 && r.result.list; if (l && l.length) F.push({ v: 'bybit', pair: pv.bybit, lp: 100 * +l[0].buyRatio, lp0: 100 * +l[l.length - 1].buyRatio, at: +l[0].timestamp, src: 'Bybit account-ratio' }); }).catch(() => {}));
  const ok = J && J.futures && J.futures[t.symbol] && J.futures[t.symbol].okx;
  if (ok && mk.okx && sane(mk.okx.mark)) { const p = ok.pts; F.push({ v: 'okx', pair: ok.pair, lp: poLP(p[p.length - 1][1]), lp0: poLP(p[0][1]), at: p[p.length - 1][0], topPos: ok.top4 && ok.top4.length ? poLP(ok.top4[ok.top4.length - 1][1]) : null, src: 'OKX rubik (via GitHub Action)' }); }
  // spot: Binance 24 closed 1h klines, taker buy quote volume vs rest
  const bs = (t.sources || []).find((x) => x.ex === 'binance');
  if (bs) tasks.push(getJSON(`https://api.binance.com/api/v3/klines?symbol=${bs.pair}&interval=1h&limit=25`).then((k) => { k = k.filter((x) => +x[6] < now); k = k.slice(-24); if (k.length < 20 || !sane(+k[k.length - 1][4])) return;
    const q = k.reduce((s, x) => s + +x[7], 0), b = k.reduce((s, x) => s + +x[10], 0); S.push({ v: 'binance', pair: bs.pair, buy: b, sell: q - b, from: +k[0][0], to: +k[k.length - 1][6] + 1, src: 'Binance spot klines (taker buy volume)' }); }).catch(() => {}));
  const os = J && J.spot && J.spot[t.symbol] && J.spot[t.symbol].okx; if (os && sane(os.px)) S.push({ v: 'okx', pair: os.pair, buy: os.buy, sell: os.sell, from: os.from, to: os.to, src: 'OKX rubik taker-volume (via GitHub Action)' });
  tasks.push(hlqLoad().catch(() => null)); // v77: Hyperliquid real positions (data/hlliq.json)
  await Promise.all(tasks);
  const o = { at: Date.now(), F, S, hl: pv.hyperliquid ? lsHL(t.symbol, hlqCoin(t)) : null, okx: ok && mk.okx && sane(mk.okx.mark) ? ok : null, oi: lev.venues || [], na: lev.na || [], oc: J && J.onchain ? J.onchain[t.symbol] || null : undefined, nat: J && J.native ? J.native[t.symbol] || null : null, jat: J && J.updated, pv, J: !!J };
  PO.c[t.symbol] = o; return o;
}
const poBar = (l) => `<span class="smbar pobar" aria-hidden="true"><i class="l" style="width:${l.toFixed(1)}%"></i><i class="s" style="width:${(100 - l).toFixed(1)}%"></i></span>`;
const poT = (ms) => `${new Date(ms).toLocaleDateString(loc(), { month: 'short', day: 'numeric' })} ${lTime(ms)}`;
const poNA = (txt) => `<span class="mut">${esc(txt || PX('not available', 'ไม่มีข้อมูล'))}</span>`;
function poRow(name, lp, extra, meta) { return `<div class="porow"><div class="poh"><b>${esc(name)}</b><span class="num"><span class="up">${lp.toFixed(1)}% ${esc(PX('long', 'Long'))}</span> · <span class="dn">${(100 - lp).toFixed(1)}% ${esc(PX('short', 'Short'))}</span>${extra || ''}</span></div>${poBar(lp)}<div class="sub">${meta}</div></div>`; }
function poFut(D, t) {
  const ord = ['binance', 'bybit', 'okx', 'hyperliquid'], F = ord.map((v) => D.F.find((x) => x.v === v)).filter(Boolean), oi = Object.fromEntries(D.oi.map((v) => [v.venue, v]));
  const ch = (x) => { const d = x.lp - x.lp0; return ` <small class="${cls(d)}">${d >= 0 ? '+' : ''}${d.toFixed(1)} ${esc(PX('pts 24h', 'จุด 24 ชม.'))}</small>`; };
  const rows = ord.filter((v) => D.pv[v]).map((v) => { const x = F.find((y) => y.v === v);
    if (v === 'hyperliquid') return D.hl ? poRow('Hyperliquid', D.hl.lp, ` <small class="mut">${esc(PX('real money', 'เงินจริง'))}</small>`, esc(PX(`${big(D.hl.long)} long / ${big(D.hl.short)} short · ${(D.hl.acc || 5000).toLocaleString()} largest accounts · ${poT(D.hl.at)}`, `Long ${big(D.hl.long)} / Short ${big(D.hl.short)} · ${(D.hl.acc || 5000).toLocaleString()} บัญชีใหญ่สุด · ${poT(D.hl.at)}`))) : `<div class="porow"><div class="poh"><b>Hyperliquid</b>${poNA(PX('not in the tracked accounts', 'ไม่มีในบัญชีที่ติดตาม'))}</div></div>`;
    if (!x) return `<div class="porow"><div class="poh"><b>${esc(EXNAME[v])}</b>${poNA(D.na.includes(v) ? PX('not listed', 'ไม่มีคู่เทรด') : null)}</div></div>`;
    return poRow(EXNAME[v], x.lp, ch(x), `${esc(PX('accounts', 'บัญชี'))} · ${esc(x.pair)} · ${x.topPos != null ? esc(PX(`big traders' money ${x.topPos.toFixed(1)}% long · `, `เงินรายใหญ่ Long ${x.topPos.toFixed(1)}% · `)) : ''}${esc(poT(x.at))}`); }).join('');
  const tb = D.oi.length ? `<div class="ftab pof"><div class="fh"><span>${esc(PX('Venue', 'กระดาน'))}</span><span>${esc(PX('Open interest', 'OI'))}</span><span>${esc(PX('Funding (8h-eq.)', 'Funding (เทียบ 8 ชม.)'))}</span></div>${D.oi.map((v) => `<div><span>${esc(EXNAME[v.venue])}</span><span class="num">${big(v.oiUsd)}</span><span class="num ${cls(v.f8)}">${v.f8 == null ? '–' : (v.f8 * 100).toFixed(4) + '%'}</span></div>`).join('')}</div>` : '';
  return `${poSum(D, t)}<h3 class="lsvh">${esc(PX('By exchange', 'แยกตามกระดาน'))}</h3>${rows}${tb}`;
}
function poSpot(D, t) {
  const ss = (t.sources || []).map((x) => x.ex).filter((v) => v !== 'hyperliquid' || true);
  const rows = ['binance', 'okx', 'bybit', 'hyperliquid'].filter((v) => ss.includes(v)).map((v) => { const x = D.S.find((y) => y.v === v);
    if (x) { const tot = x.buy + x.sell, bp = 100 * x.buy / tot; return `<div class="porow"><div class="poh"><b>${esc(EXNAME[v])}</b><span class="num"><span class="up">${esc(PX('Buy', 'ซื้อ'))} ${big(x.buy)}</span> · <span class="dn">${esc(PX('Sell', 'ขาย'))} ${big(x.sell)}</span></span></div>${poBar(bp)}<div class="sub">${bp.toFixed(1)}% ${esc(PX('taker buys', 'ฝั่งซื้อ (taker)'))} · ${esc(x.pair)} · ${esc(PX('window', 'ช่วง'))} ${esc(poT(x.from))} – ${esc(lTime(x.to))} (24h) · ${esc(x.src)}</div></div>`; }
    return `<div class="porow"><div class="poh"><b>${esc(EXNAME[v])}</b>${poNA(v === 'bybit' ? PX('buy/sell split not published', 'ไม่เผยแยกซื้อ/ขาย') : v === 'hyperliquid' ? PX('not available (spot ticker may be a different token)', 'ไม่มีข้อมูล (ชื่อเหรียญสปอตอาจเป็นคนละเหรียญ)') : null)}</div></div>`; }).join('');
  return `${rows || poNA()}`;
}
const PO_CH = { BTC: 'Bitcoin', ETH: 'Ethereum', MON: 'Monad', HYPE: 'Hyperliquid (HyperCore)', SOL: 'Solana', NEAR: 'NEAR', AAVE: 'Ethereum', PENDLE: 'Ethereum', LIT: 'Ethereum' };
/* native-chain stats (built hourly by the Action; Blockchair at most every 6h). Every card shows source + updated time. */
function poNative(N, sym, it) {
  if (sym === 'MON') return `<div class="pogrid">${it(PX('On-chain stats', 'สถิติออนเชน'), poNA(), esc(PX('not available — Monad explorers require an API key', 'ไม่มีข้อมูล — explorer ของ Monad ต้องใช้ API key')))}</div>`;
  const n = (v, d = 0) => v == null || isNaN(v) ? '–' : Number(v).toLocaleString(loc(), { maximumFractionDigits: d });
  const m = (v) => v == null ? '–' : (v / 1e6).toLocaleString(loc(), { maximumFractionDigits: 1 }) + 'M';
  const src = () => ''; // v68: no source lines under the cards
  const card = (x, body) => { if (!x) return ''; try { return `<div class="ponat">${body()}${src(x)}</div>`; } catch (e) { return `<div class="ponat"><p class="mut sm">${esc(PX('Data unavailable', 'ไม่มีข้อมูล'))}</p></div>`; } };
  const g = (h) => `<div class="pogrid">${h}</div>`;
  const N0 = N || {}; let h = '';
  h += card(N0.addrBal, () => g(it(PX('Addresses with a balance', 'แอดเดรสที่มียอดคงเหลือ'), n(N0.addrBal.v), esc(PX('not the same as holders — one person can own many addresses', 'ไม่เท่ากับจำนวนผู้ถือ — หนึ่งคนมีได้หลายแอดเดรส')))));
  h += card(N0.activity, () => { const a = N0.activity; return g(it(PX('Active addresses / day', 'แอดเดรสที่ใช้งาน / วัน'), n(a.active)) + (a.new != null ? it(PX('New accounts / day', 'บัญชีใหม่ / วัน'), n(a.new)) : '') + it(PX('Transactions / day', 'ธุรกรรม / วัน'), n(a.tx))); });
  h += card(N0.exflow, () => { const f = N0.exflow, pr = ` · ${PX('estimate (Coin Metrics-labelled exchange addresses)', 'ประมาณการ (จากที่อยู่กระดานที่ Coin Metrics ระบุ)')}` + (f.prelim ? ` · ${PX('preliminary', 'ตัวเลขเบื้องต้น')}` : ''); return g(it(PX('Exchange inflow', 'ไหลเข้ากระดาน'), n(f.in) + ' BTC', esc(big(f.inUsd) + pr)) + it(PX('Exchange outflow', 'ไหลออกกระดาน'), n(f.out) + ' BTC', esc(big(f.outUsd) + pr)) + it(PX('Exchange net flow', 'Net flow เข้า/ออกกระดาน'), (f.net > 0 ? '+' : '') + n(f.net) + ' BTC', esc((f.netUsd < 0 ? '−' : '+') + big(Math.abs(f.netUsd)) + ' · ' + PX('positive = more BTC moved onto exchanges', 'บวก = BTC เข้ากระดานมากกว่า') + pr))); });
  const k = N0.stake;
  if (k && sym !== 'HYPE') h += card(k, () => g(it(PX('Staked', 'Staked'), n(k.pct, 1) + '%', esc(PX(`of total supply · ${m(k.staked)} of ${m(k.total)} ${sym}`, `ของซัพพลายทั้งหมด · ${m(k.staked)} จาก ${m(k.total)} ${sym}`))) + it(PX('Validators', 'วาลิเดเตอร์'), n(k.validators))));
  if (k && sym === 'HYPE') h += card(k, () => g(it(PX('Staked', 'Staked'), n(k.pct, 1) + '%', esc(PX(`of total supply · ${m(k.staked)} HYPE · ${k.validators} validators`, `ของซัพพลายทั้งหมด · ${m(k.staked)} HYPE · ${k.validators} วาลิเดเตอร์`)))
    + (k.stakedExNc != null ? it(PX('Staked excl. non-circulating wallet', 'สเตก ไม่รวมกระเป๋านอกการหมุนเวียน'), n(k.pctExNcOfCirc, 1) + '%', esc(PX(`of circulating · ${m(k.stakedExNc)} HYPE (non-circulating wallet ${k.ncWallet.slice(0, 6)}…${k.ncWallet.slice(-4)} delegates ${m(k.ncWalletStaked)})`, `ของซัพพลายหมุนเวียน · ${m(k.stakedExNc)} HYPE (กระเป๋านอกการหมุนเวียน ${k.ncWallet.slice(0, 6)}…${k.ncWallet.slice(-4)} สเตก ${m(k.ncWalletStaked)})`))) : '')
    + it(PX('Supply split', 'สัดส่วนซัพพลาย'), m(k.total), esc(PX(`circulating ${m(k.circ)} · non-circulating ${m(k.nonCirc)} · future emissions ${m(k.future)}`, `หมุนเวียน ${m(k.circ)} · นอกการหมุนเวียน ${m(k.nonCirc)} · ปล่อยในอนาคต ${m(k.future)}`))))
    + `<p class="sub">${esc(PX('Why staked > circulating: staked HYPE includes tokens held by non-circulating wallets (counted outside circulating supply), so total staked can exceed circulating supply.', 'ทำไมสเตกมากกว่าซัพพลายหมุนเวียน: HYPE ที่สเตกรวมโทเคนจากกระเป๋านอกการหมุนเวียน (ไม่นับในซัพพลายหมุนเวียน) ยอดสเตกรวมจึงเกินซัพพลายหมุนเวียนได้'))}</p>`);
  return h || `<div class="pogrid">${it(PX('On-chain stats', 'สถิติออนเชน'), poNA())}</div>`;
}
function poChain(D, t) {
  const o = D.oc, c = PO_CH[t.symbol];
  const it = (l, v, sub) => `<div class="pokv"><span>${esc(l)}</span><b class="num">${v}</b>${sub ? `<small class="sub">${sub}</small>` : ''}</div>`;
  const head = `<p class="sub">${esc(PX('Chain', 'เชน'))}: <b>${esc(o ? o.chain : c || PX('unknown', 'ไม่ทราบ'))}</b>${o ? ` · <span class="mono">${esc(o.address.slice(0, 8) + '…' + o.address.slice(-6))}</span>` : ''}</p>`;
  if (!o && (D.nat || t.symbol === 'MON')) return head + poNative(D.nat, t.symbol, it);
  if (!o) return `${head}<div class="pogrid">${it(PX('Holders', 'ผู้ถือ'), poNA())}${it(PX('Top 10 holders share', 'Top 10 ถือรวมกี่ %'), poNA())}${it(PX('Exchange net flow', 'Net flow เข้า/ออกกระดาน'), poNA())}</div><p class="sub">${esc(D.J ? PX('No free, keyless source gives holder counts for this chain\'s native coin.', 'ไม่มีแหล่งฟรีแบบไม่ใช้คีย์ที่ให้จำนวนผู้ถือเหรียญหลักของเชนนี้') : PX('On-chain data unavailable right now.', 'ตอนนี้ยังดึงข้อมูล on-chain ไม่ได้'))}</p>`;
  return `${head}<div class="pogrid">${it(PX('Holders', 'ผู้ถือ'), o.holders != null ? o.holders.toLocaleString(loc()) : poNA())}${it(PX('Top 10 holders share', 'Top 10 ถือรวมกี่ %'), o.top10 != null ? o.top10.toFixed(1) + '%' : poNA(), o.top10Contracts != null ? esc(PX(`of total supply · ${o.top10Contracts} of 10 are contracts (staking, treasury, bridges)`, `ของซัพพลายทั้งหมด · ${o.top10Contracts} ใน 10 เป็นสัญญา (สเตก, คลัง, บริดจ์)`)) : '')}${it(PX('Exchange net flow', 'Net flow เข้า/ออกกระดาน'), poNA(), esc(PX('needs labelled exchange wallets; no keyless source', 'ต้องมีป้ายกระเป๋ากระดาน ไม่มีแหล่งแบบไม่ใช้คีย์')))}${it(PX('Top 10 excl. contracts & exchanges', '10 อันดับแรก ไม่รวมสัญญาและกระดาน'), o.top10ExCx != null ? o.top10ExCx.toFixed(1) + '%' : poNA(), esc(o.topInclRank ? PX(`largest 10 holders left after skipping contracts, exchange wallets and burn (Blockscout tags), down to rank ${o.topInclRank}. Multisigs count unless tagged as protocol-owned`, `ผู้ถือ 10 รายใหญ่สุดที่เหลือ หลังข้ามสัญญา กระเป๋ากระดาน และที่อยู่เผา (ตามป้าย Blockscout) ไล่ถึงอันดับ ${o.topInclRank} มัลติซิกนับรวม เว้นแต่ถูกระบุว่าเป็นของโปรโตคอล`) : PX('not enough holder pages loaded', 'โหลดรายชื่อผู้ถือไม่พอ')))}</div>${poWarn(o)}${poTop(o.top, PX('Top 10 holders (raw)', 'Top 10 holders (ยังไม่กรอง)'))}${poTop(o.topIncl, PX('Top 10 excl. contracts & exchanges', '10 อันดับแรก ไม่รวมสัญญาและกระดาน'))}<p class="sub">${esc(o.source)} (eth.blockscout.com) · ${esc(PX('updated', 'อัปเดต'))} ${esc(poT(Date.parse(D.jat)))}</p>`;
}
async function renderPos(t, b) {
  const tabs = [['fut', PX('Futures', 'Futures')], ['spot', PX('Spot', 'Spot')], ['chain', PX('On-chain', 'ออนเชน')]];
  const shell = (inner) => `<div class="pos"><div class="chartbar"><b>${esc(PX('Positioning', 'Positioning'))}</b><div class="seg sm">${tabs.map(([k, l]) => `<button aria-pressed="${PO.tab === k}" data-potab="${k}">${esc(l)}</button>`).join('')}</div></div><div id="poBody">${inner}</div></div>`;
  b.innerHTML = shell('<div class="sk" style="height:180px;margin-top:12px"></div>');
  const D = await poLoad(t); if (S.tab !== 'pos' || S.sel !== t.symbol || !b.isConnected) return;
  killCharts(); b.innerHTML = shell(PO.tab === 'spot' ? poSpot(D, t) : PO.tab === 'chain' ? poChain(D, t) : poFut(D, t));
  if (PO.tab === 'fut') poChart(D, t);
}
document.addEventListener('click', (e) => { const el = e.target.closest('[data-potab]'); if (!el) return; PO.tab = el.dataset.potab; const t = tokBySym(S.sel), b = $('#tabBody'); if (t && b) renderPos(t, b); });
if (typeof I18N !== 'undefined') { I18N.en.tabs.pos = 'Positioning'; I18N.th.tabs.pos = 'สถานะตลาด'; }

const POK = { exchange: ['Exchange', 'กระดาน'], protocol: ['Staking / protocol', 'สเตก / โปรโตคอล'], multisig: ['Multisig', 'มัลติซิก'], contract: ['Contract', 'สัญญา'], burn: ['Burn', 'ที่อยู่เผา'] };
function poWarn(o) {
  return (o.warn || []).map(w => `<p class="powarn">⚠ ${esc(PX(`Concentration: one non-exchange, non-contract holder (${w.a.slice(0, 8)}…${w.a.slice(-6)}) has ${w.pct.toFixed(1)}% of supply.`, `การกระจุกตัว: ผู้ถือรายเดียวที่ไม่ใช่กระดานหรือสัญญา (${w.a.slice(0, 8)}…${w.a.slice(-6)}) ถือ ${w.pct.toFixed(1)}% ของซัพพลาย`))}</p>`).join('');
}
function poTop(L, title) {
  if (!L || !L.length) return '';
  const r = L.map((h, i) => `<tr${h.ex ? ' class="mut"' : ''}><td class="num">${i + 1}</td><td><a class="mono" href="https://eth.blockscout.com/address/${esc(h.a)}" target="_blank" rel="noopener">${esc(h.a.slice(0, 8) + '…' + h.a.slice(-6))}</a>${h.label ? ` <span class="mut">${esc(h.label)}</span>` : ''}</td><td>${h.kind ? `<span class="potag po-${esc(h.kind)}">${esc(PX(...POK[h.kind]))}</span>` : `<span class="mut">${esc(PX('untagged', 'ไม่มีแท็ก'))}</span>`}${h.ex ? ` <span class="mut">${esc(PX('excluded', 'ไม่นับ'))}</span>` : ''}</td><td class="num">${h.pct.toFixed(2)}%</td></tr>`).join('');
  return `<h4 class="potitle">${esc(title)}</h4><div class="tblwrap"><table class="potop"><thead><tr><th>#</th><th>${esc(PX('Holder', 'ผู้ถือ'))}</th><th>${esc(PX('Tag (Blockscout)', 'แท็ก (Blockscout)'))}</th><th class="num">${esc(PX('Supply', 'ซัพพลาย'))}</th></tr></thead><tbody>${r}</tbody></table></div>`;
}

/* ---------- v77 long / short across exchanges. Three different questions, never mixed into one number:
   - money (real): Hyperliquid positions of its 5,000 largest accounts, in dollars (data/hlliq.json, hourly, public on-chain state);
   - money (big traders): Binance topLongShortPositionRatio + OKX top-trader position ratio = how the largest accounts' positions split;
   - head count: Binance / Bybit / OKX account ratios = share of ACCOUNTS long (mostly small traders, often ~70% long).
   Venue figures are combined weighted by each venue's open interest. History: Binance 4h (browser) or OKX 4h (GitHub Action). ---------- */
const lsPct = (l, s) => (l + s > 0 ? (100 * l) / (l + s) : null);
const lsW = (rows) => { const w = rows.filter((x) => x.w > 0 && Number.isFinite(x.v)), W = w.reduce((a, x) => a + x.w, 0); return W ? { v: w.reduce((a, x) => a + x.v * x.w, 0) / W, n: w.length } : null; };
function lsHL(sym, coin) { const d = HLQ.d, c = d && d.coins && d.coins[coin || sym]; if (!c || !(c.long + c.short > 0)) return null; return { long: c.long, short: c.short, lp: lsPct(c.long, c.short), cov: c.cov, oi: c.oi, n: c.n, at: Date.parse(d.updated), acc: d.accounts && d.accounts.read }; }
const lsRow = (name, lp, right, sub, k) => `<div class="lsrow" data-ls="${k}"><div class="lsh"><b>${esc(name)}</b><span class="num"><span class="up">Long ${lp.toFixed(1)}%</span> · <span class="dn">Short ${(100 - lp).toFixed(1)}%</span>${right || ''}</span></div>${poBar(lp)}<div class="sub">${sub}</div></div>`;
function poSum(D0, t) {
  const ORD = ['binance', 'bybit', 'okx'], D = { ...D0, F: D0.F.slice().sort((a, b) => ORD.indexOf(a.v) - ORD.indexOf(b.v)) }; // fixed venue order whatever answered first
  const oi = Object.fromEntries(D.oi.map((v) => [v.venue, v.oiUsd])), parts = [];
  if (D.hl) parts.push(lsRow(PX('Real money (Hyperliquid)', 'เงินจริง (Hyperliquid)'), D.hl.lp, ` <small class="mut">${big(D.hl.long)} / ${big(D.hl.short)}</small>`, esc(PX(`positions of the ${(D.hl.acc || 5000).toLocaleString()} largest accounts · ${D.hl.cov != null ? D.hl.cov.toFixed(0) + '% of Hyperliquid OI · ' : ''}${poT(D.hl.at)}`, `สถานะของ ${(D.hl.acc || 5000).toLocaleString()} บัญชีใหญ่สุด · ${D.hl.cov != null ? 'ครอบคลุม ' + D.hl.cov.toFixed(0) + '% ของ OI ใน Hyperliquid · ' : ''}${poT(D.hl.at)}`)), 'hl'));
  const mo = lsW(D.F.filter((x) => x.topPos != null).map((x) => ({ v: x.topPos, w: oi[x.v] || 0 }))), moV = D.F.filter((x) => x.topPos != null && oi[x.v]).map((x) => EXNAME[x.v]);
  if (mo) parts.push(lsRow(PX("Big traders' money", 'เงินของเทรดเดอร์รายใหญ่'), mo.v, '', esc(PX(`${moV.join(' + ')} top traders' positions${mo.n > 1 ? ', weighted by open interest' : ''}`, `สถานะของบัญชีท็อปใน ${moV.join(' + ')}${mo.n > 1 ? ' ถ่วงตาม OI' : ''}`)), 'top'));
  const ac = lsW(D.F.map((x) => ({ v: x.lp, w: oi[x.v] || 0 }))), acV = D.F.filter((x) => oi[x.v]).map((x) => EXNAME[x.v]);
  if (ac) parts.push(lsRow(PX('Accounts (head count)', 'จำนวนบัญชี (นับคน)'), ac.v, '', esc(PX(`${acV.join(' + ')} accounts${ac.n > 1 ? ', weighted by open interest' : ''} · mostly small traders`, `บัญชีใน ${acV.join(' + ')}${ac.n > 1 ? ' ถ่วงตาม OI' : ''} · ส่วนใหญ่เป็นรายย่อย`)), 'acc'));
  const tot = D.oi.reduce((a, v) => a + (v.oiUsd || 0), 0), fw = lsW(D.oi.filter((v) => v.f8 != null).map((v) => ({ v: v.f8 * 100, w: v.oiUsd || 0 })));
  const stat = (l, v, s) => `<div class="lsst"><span class="l">${esc(l)}</span><b class="num">${v}</b>${s ? `<span class="s">${s}</span>` : ''}</div>`;
  const stats = `<div class="lssts">${tot ? stat(PX('Open interest', 'OI รวม'), big(tot), esc(PX(`${D.oi.length} venues`, `${D.oi.length} กระดาน`))) : ''}${fw ? stat(PX('Funding (OI-weighted)', 'Funding เฉลี่ย (ถ่วง OI)'), `<span class="${cls(fw.v)}">${fw.v > 0 ? '+' : ''}${fw.v.toFixed(4)}%</span> <small class="mut">/8h</small>`, esc(fw.v > 0 ? PX('longs pay shorts', 'ฝั่ง Long จ่ายให้ Short') : fw.v < 0 ? PX('shorts pay longs', 'ฝั่ง Short จ่ายให้ Long') : PX('balanced', 'สมดุล'))) : ''}</div>`;
  const help = typeof uiHelp === 'function' ? uiHelp(PX('Real money = what the positions are worth (Hyperliquid shows every position on-chain). Big traders = how the largest accounts on Binance / OKX split their positions. Head count = how many accounts are long, each account counts once whatever its size, so it mostly shows small traders. When the crowd is very long but the money is not, the crowd is the side most likely to be squeezed.', 'เงินจริง = มูลค่าสถานะจริง (Hyperliquid เปิดเผยทุกสถานะบนเชน) · เทรดเดอร์รายใหญ่ = บัญชีใหญ่สุดใน Binance / OKX ถือฝั่งไหนเท่าไร · นับคน = กี่บัญชีที่ long โดยทุกบัญชีนับ 1 เท่ากันไม่ว่าเล็กหรือใหญ่ จึงสะท้อนรายย่อยเป็นหลัก ถ้าคนส่วนใหญ่ long หนักแต่เงินก้อนใหญ่ไม่ได้ long ตาม ฝั่งคนหมู่มากมักเป็นฝั่งที่โดนบีบ'), PX('How to read long / short', 'อ่าน long / short ยังไง')) : '';
  if (!parts.length) return '';
  return `<section class="lssum" data-lssum><div class="lshd"><h3>${esc(PX('Long / short across exchanges', 'Long / Short ทั้งตลาด'))}</h3>${help}</div>${parts.join('')}${stats}
    <div class="lsch"><div class="lsch-h"><span>${esc(PX('History', 'ย้อนหลัง'))}</span><span class="lsleg"><i class="a"></i>${esc(PX('accounts long', 'บัญชีที่ Long'))}<i class="m"></i>${esc(PX("big traders' money long", 'เงินรายใหญ่ที่ Long'))}<i class="p"></i>${esc(PX('price', 'ราคา'))}</span></div><div id="lsCh" class="lsc"></div><div class="sub" id="lsChS"></div></div></section>`;
}
// 4-hour history: Binance (30 days, from the browser) or OKX (16 days, GitHub Action); the price from the chart's own candles
async function poChart(D, t) {
  const el = $('#lsCh'), sb = $('#lsChS'); if (!el) return;
  let acc = null, mon = null, src = '';
  const bn = D.pv && D.pv.binance && D.F.some((x) => x.v === 'binance') ? D.pv.binance : null;
  if (bn) { const B = 'https://fapi.binance.com/futures/data/';
    const [g, tp] = await Promise.all([getJSON(`${B}globalLongShortAccountRatio?symbol=${bn}&period=4h&limit=180`).catch(() => null), getJSON(`${B}topLongShortPositionRatio?symbol=${bn}&period=4h&limit=180`).catch(() => null)]);
    if (g && g.length > 10) { acc = g.map((x) => [+x.timestamp, 100 * +x.longAccount]); mon = tp && tp.length > 10 ? tp.map((x) => [+x.timestamp, 100 * +x.longAccount]) : null; src = `Binance ${bn} · 4h · ${PX('30 days', '30 วัน')}`; } }
  const ok = D.okx; if (!acc && ok && ok.pts4 && ok.pts4.length > 10) { acc = ok.pts4.map(([a, r]) => [a, poLP(r)]); mon = ok.top4 && ok.top4.length > 10 ? ok.top4.map(([a, r]) => [a, poLP(r)]) : null; src = `OKX ${ok.pair} · 4h · ${PX('about 16 days', 'ราว 16 วัน')} (GitHub Action)`; }
  if (!acc) { el.closest('.lsch').hidden = true; return; }
  let px4 = null; try { const c = await pcLoad(t, '4h'); px4 = c.k; } catch (e) {}
  if (!el.isConnected) return;
  const Cc = chartColors(), LW = LightweightCharts, T = (ms) => ts(ms, true);
  const ch = LW.createChart(el, { autoSize: true, layout: { background: { color: 'transparent' }, textColor: Cc.tx, fontSize: 11, fontFamily: getComputedStyle(document.body).fontFamily },
    grid: { vertLines: { visible: false }, horzLines: { color: Cc.line } }, rightPriceScale: { borderVisible: false }, leftPriceScale: { visible: !!px4, borderVisible: false }, timeScale: { borderVisible: false, timeVisible: true }, crosshair: { mode: 0 }, handleScroll: false, handleScale: false });
  S.charts.push(ch);
  const pf = { type: 'custom', minMove: 0.1, formatter: (v) => v.toFixed(1) + '%' };
  if (px4) { const t0 = acc[0][0], p = ch.addSeries(LW.LineSeries, { color: Cc.mut, lineWidth: 1, priceScaleId: 'left', priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceFormat: { type: 'custom', minMove: 1e-8, formatter: (v) => px(v) } }); p.setData(px4.filter((x) => x.t >= t0).map((x) => ({ time: T(x.t), value: x.c }))); }
  const a = ch.addSeries(LW.LineSeries, { color: Cc.ac, lineWidth: 2, priceLineVisible: false, priceFormat: pf }); a.setData(acc.map(([x, v]) => ({ time: T(x), value: v })));
  a.createPriceLine({ price: 50, color: Cc.mut, lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: '50%' });
  if (mon) { const m = ch.addSeries(LW.LineSeries, { color: '#f59e0b', lineWidth: 2, priceLineVisible: false, priceFormat: pf }); m.setData(mon.map(([x, v]) => ({ time: T(x), value: v }))); }
  ch.timeScale().fitContent(); if (sb) sb.textContent = src;
}
/* ---------- Market health: long / short of every big coin (Hyperliquid real money) + Binance head count, sortable ---------- */
const HLS = { sort: store.get('cw-hm-ls', 'oi'), bn: {}, busy: false };
const hmLsShell = () => `<section class="card hm-ls" id="hmLs" aria-label="${esc(XL('Long / short by coin', 'Long / Short รายเหรียญ'))}"><div class="sk" style="height:160px"></div></section>`;
async function hmLsFill() {
  const el = $('#hmLs'); if (!el) return; await hlqLoad(); if (!el.isConnected) return;
  const d = HLQ.d; if (!d || !d.coins) { el.innerHTML = `<h2>${esc(XL('Long / short by coin', 'Long / Short รายเหรียญ'))}</h2><p class="mut">${esc(XL('Hyperliquid positions did not load.', 'โหลดข้อมูลสถานะ Hyperliquid ไม่ได้'))}</p>`; return; }
  const mine = new Set(S.cfg.map((x) => x.symbol)), all = Object.entries(d.coins).filter(([, c]) => c.long + c.short > 0 && c.oi > 0).map(([k, c]) => ({ k, oi: c.oi, long: c.long, short: c.short, lp: lsPct(c.long, c.short), cov: c.cov, mine: mine.has(k) }));
  const top = all.sort((a, b) => b.oi - a.oi).filter((x, i) => i < 25 || x.mine), key = HLS.sort;
  const rows = top.slice().sort((a, b) => (key === 'long' ? b.lp - a.lp : key === 'short' ? a.lp - b.lp : b.oi - a.oi));
  const crowd = (lp) => (lp >= 60 ? `<span class="lscr up">${esc(XL('long-heavy', 'Long หนา'))}</span>` : lp <= 40 ? `<span class="lscr dn">${esc(XL('short-heavy', 'Short หนา'))}</span>` : '');
  const bnCell = (k) => { const v = HLS.bn[k]; return v == null ? '<span class="mut">…</span>' : v === false ? '<span class="mut">–</span>' : `<span class="num">${v.toFixed(0)}%</span>`; };
  const seg = `<div class="seg sm">${[['oi', XL('Largest', 'OI ใหญ่สุด')], ['long', XL('Most long', 'Long หนาสุด')], ['short', XL('Most short', 'Short หนาสุด')]].map(([k, l]) => `<button type="button" data-hmls="${k}" aria-pressed="${key === k}">${esc(l)}</button>`).join('')}</div>`;
  el.innerHTML = `<div class="hm-sh"><h2>${esc(XL('Long / short by coin', 'Long / Short รายเหรียญ'))}</h2>${seg}</div>
    <div class="tscroll"><table class="lstbl"><thead><tr><th>${esc(XL('Coin', 'เหรียญ'))}</th><th>${esc(XL('Real money on Hyperliquid', 'เงินจริงใน Hyperliquid'))}</th><th class="r">${esc(XL('Long / Short', 'Long / Short'))}</th><th class="r">${esc(XL('Binance accounts long', 'บัญชี Binance ที่ Long'))}</th><th class="r">OI (HL)</th></tr></thead><tbody>
    ${rows.map((r) => `<tr${r.mine ? ' class="mine"' : ''}><td><b>${esc(r.k)}</b>${crowd(r.lp)}</td><td class="lsbarc">${poBar(r.lp)}<span class="num"><span class="up">${r.lp.toFixed(0)}%</span> / <span class="dn">${(100 - r.lp).toFixed(0)}%</span></span></td><td class="r num">${big(r.long)} / ${big(r.short)}</td><td class="r" data-bn="${esc(r.k)}">${bnCell(r.k)}</td><td class="r num">${big(r.oi)}</td></tr>`).join('')}</tbody></table></div>
    <p class="sub">${esc(XL(`Hyperliquid: positions of its ${(d.accounts && d.accounts.read || 5000).toLocaleString()} largest accounts (public on-chain data), ${new Date(d.updated).toLocaleString(loc(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}. Binance: share of accounts long, last hour. Your coins are highlighted.`, `Hyperliquid: สถานะของ ${(d.accounts && d.accounts.read || 5000).toLocaleString()} บัญชีใหญ่สุด (ข้อมูลเปิดบนเชน) ${new Date(d.updated).toLocaleString(loc(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · Binance: สัดส่วนบัญชีที่ Long ชั่วโมงล่าสุด · แถวที่ไฮไลต์คือเหรียญในรายการของคุณ`))}</p>`;
  // Binance head count, a few at a time; a coin Binance does not list stays "–"
  const todo = rows.map((r) => r.k).filter((k) => HLS.bn[k] === undefined && /^[A-Z0-9]{2,10}$/.test(k));
  const one = async (k) => { try { const g = await getJSON(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${k}USDT&period=1h&limit=1`); HLS.bn[k] = g && g.length ? 100 * +g[0].longAccount : false; } catch (e) { HLS.bn[k] = false; }
    const c = document.querySelector(`#hmLs [data-bn="${k}"]`); if (c) c.innerHTML = bnCell(k); };
  for (let i = 0; i < todo.length; i += 6) { await Promise.all(todo.slice(i, i + 6).map(one)); if (!el.isConnected) return; }
  rows.filter((r) => !/^[A-Z0-9]{2,10}$/.test(r.k)).forEach((r) => { HLS.bn[r.k] = false; const c = document.querySelector(`#hmLs [data-bn="${r.k}"]`); if (c) c.innerHTML = bnCell(r.k); });
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-hmls]'); if (!b) return; HLS.sort = b.dataset.hmls; store.set('cw-hm-ls', HLS.sort); hmLsFill(); });
