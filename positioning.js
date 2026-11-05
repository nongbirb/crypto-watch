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
    tasks.push(Promise.all([getJSON(`${B}globalLongShortAccountRatio?symbol=${bn}&period=1h&limit=25`), getJSON(`${B}topLongShortAccountRatio?symbol=${bn}&period=1h&limit=25`).catch(() => null)]).then(([g, tp]) => {
      if (g && g.length) F.push({ v: 'binance', pair: bn, lp: 100 * +g[g.length - 1].longAccount, lp0: 100 * +g[0].longAccount, at: +g[g.length - 1].timestamp, top: tp && tp.length ? 100 * +tp[tp.length - 1].longAccount : null, src: 'Binance globalLongShortAccountRatio' }); }).catch(() => {}));
  }
  if (pv.bybit && mk.bybit && sane(mk.bybit.mark)) tasks.push(getJSON(`https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=${pv.bybit}&period=1h&limit=25`).then((r) => { const l = r && r.retCode === 0 && r.result.list; if (l && l.length) F.push({ v: 'bybit', pair: pv.bybit, lp: 100 * +l[0].buyRatio, lp0: 100 * +l[l.length - 1].buyRatio, at: +l[0].timestamp, src: 'Bybit account-ratio' }); }).catch(() => {}));
  const ok = J && J.futures && J.futures[t.symbol] && J.futures[t.symbol].okx;
  if (ok && mk.okx && sane(mk.okx.mark)) { const p = ok.pts; F.push({ v: 'okx', pair: ok.pair, lp: poLP(p[p.length - 1][1]), lp0: poLP(p[0][1]), at: p[p.length - 1][0], src: 'OKX rubik (via GitHub Action)' }); }
  // spot: Binance 24 closed 1h klines, taker buy quote volume vs rest
  const bs = (t.sources || []).find((x) => x.ex === 'binance');
  if (bs) tasks.push(getJSON(`https://api.binance.com/api/v3/klines?symbol=${bs.pair}&interval=1h&limit=25`).then((k) => { k = k.filter((x) => +x[6] < now); k = k.slice(-24); if (k.length < 20 || !sane(+k[k.length - 1][4])) return;
    const q = k.reduce((s, x) => s + +x[7], 0), b = k.reduce((s, x) => s + +x[10], 0); S.push({ v: 'binance', pair: bs.pair, buy: b, sell: q - b, from: +k[0][0], to: +k[k.length - 1][6] + 1, src: 'Binance spot klines (taker buy volume)' }); }).catch(() => {}));
  const os = J && J.spot && J.spot[t.symbol] && J.spot[t.symbol].okx; if (os && sane(os.px)) S.push({ v: 'okx', pair: os.pair, buy: os.buy, sell: os.sell, from: os.from, to: os.to, src: 'OKX rubik taker-volume (via GitHub Action)' });
  await Promise.all(tasks);
  const o = { at: Date.now(), F, S, oi: lev.venues || [], na: lev.na || [], oc: J && J.onchain ? J.onchain[t.symbol] || null : undefined, jat: J && J.updated, pv, J: !!J };
  PO.c[t.symbol] = o; return o;
}
const poBar = (l) => `<span class="smbar pobar" aria-hidden="true"><i class="l" style="width:${l.toFixed(1)}%"></i><i class="s" style="width:${(100 - l).toFixed(1)}%"></i></span>`;
const poT = (ms) => `${new Date(ms).toLocaleDateString(loc(), { month: 'short', day: 'numeric' })} ${lTime(ms)}`;
const poNA = (txt) => `<span class="mut">${esc(txt || PX('not available', 'ไม่มีข้อมูล'))}</span>`;
function poRow(name, lp, extra, meta) { return `<div class="porow"><div class="poh"><b>${esc(name)}</b><span class="num"><span class="up">${lp.toFixed(1)}% ${esc(PX('long', 'ลอง'))}</span> · <span class="dn">${(100 - lp).toFixed(1)}% ${esc(PX('short', 'ชอร์ต'))}</span>${extra || ''}</span></div>${poBar(lp)}<div class="sub">${meta}</div></div>`; }
function poFut(D, t) {
  const ord = ['binance', 'bybit', 'okx', 'hyperliquid'], F = ord.map((v) => D.F.find((x) => x.v === v)).filter(Boolean), oi = Object.fromEntries(D.oi.map((v) => [v.venue, v]));
  const ch = (x) => { const d = x.lp - x.lp0; return ` <small class="${cls(d)}">${d >= 0 ? '+' : ''}${d.toFixed(1)} ${esc(PX('pts 24h', 'จุด 24 ชม.'))}</small>`; };
  const w = F.filter((x) => oi[x.v] && oi[x.v].oiUsd > 0), W = w.reduce((s, x) => s + oi[x.v].oiUsd, 0);
  const comb = w.length >= 2 ? poRow(PX('Combined', 'รวม'), w.reduce((s, x) => s + x.lp * oi[x.v].oiUsd, 0) / W, ` <span class="ptag">${esc(PX('OI-weighted estimate', 'ประมาณการถ่วงด้วย OI'))}</span>`, esc(PX(`${w.map((x) => EXNAME[x.v]).join(' + ')} account ratios weighted by each venue's open interest`, `สัดส่วนบัญชีของ ${w.map((x) => EXNAME[x.v]).join(' + ')} ถ่วงด้วย OI ของแต่ละกระดาน`))) : '';
  const rows = ord.filter((v) => D.pv[v]).map((v) => { const x = F.find((y) => y.v === v);
    if (v === 'hyperliquid') return `<div class="porow"><div class="poh"><b>Hyperliquid</b>${poNA(PX('not published', 'ไม่เปิดเผย'))}</div><div class="sub">${esc(PX('Hyperliquid does not publish an account long/short split (the Smart Money sample is not used here).', 'Hyperliquid ไม่เผยสัดส่วนบัญชี Long/Short (ไม่ใช้ข้อมูล Smart Money ในส่วนนี้)'))}</div></div>`;
    if (!x) return `<div class="porow"><div class="poh"><b>${esc(EXNAME[v])}</b>${poNA(D.na.includes(v) ? PX('not listed', 'ไม่มีคู่เทรด') : null)}</div></div>`;
    return poRow(EXNAME[v], x.lp, ch(x), `${esc(x.pair)} · ${x.top != null ? esc(PX(`top traders ${x.top.toFixed(1)}% long · `, `เทรดเดอร์ท็อป ลอง ${x.top.toFixed(1)}% · `)) : ''}${esc(x.src)} · ${esc(poT(x.at))}`); }).join('');
  const tb = D.oi.length ? `<div class="ftab pof"><div class="fh"><span>${esc(PX('Venue', 'กระดาน'))}</span><span>${esc(PX('Open interest', 'OI'))}</span><span>${esc(PX('Funding (8h-eq.)', 'Funding (เทียบ 8 ชม.)'))}</span></div>${D.oi.map((v) => `<div><span>${esc(EXNAME[v.venue])}</span><span class="num">${big(v.oiUsd)}</span><span class="num ${cls(v.f8)}">${v.f8 == null ? '–' : (v.f8 * 100).toFixed(4) + '%'}</span></div>`).join('')}</div><p class="sub">${esc(PX('Open interest and funding: each venue\'s public API, live', 'OI และ Funding: API สาธารณะของแต่ละกระดาน แบบสด'))} · ${esc(poT(D.at))}</p>` : '';
  return `<p class="sub ponote">${esc(PX('On futures, total long size always equals total short size (every long has a short on the other side). These bars count accounts, not dollars.', 'ในฟิวเจอร์ส มูลค่า Long รวมเท่ากับ Short รวมเสมอ (ทุก Long มี Short อีกฝั่ง) แถบนี้นับจำนวนบัญชี ไม่ใช่มูลค่าเงิน'))}</p>${comb}${rows}${tb}`;
}
function poSpot(D, t) {
  const ss = (t.sources || []).map((x) => x.ex).filter((v) => v !== 'hyperliquid' || true);
  const rows = ['binance', 'okx', 'bybit', 'hyperliquid'].filter((v) => ss.includes(v)).map((v) => { const x = D.S.find((y) => y.v === v);
    if (x) { const tot = x.buy + x.sell, bp = 100 * x.buy / tot; return `<div class="porow"><div class="poh"><b>${esc(EXNAME[v])}</b><span class="num"><span class="up">${esc(PX('Buy', 'ซื้อ'))} ${big(x.buy)}</span> · <span class="dn">${esc(PX('Sell', 'ขาย'))} ${big(x.sell)}</span></span></div>${poBar(bp)}<div class="sub">${bp.toFixed(1)}% ${esc(PX('taker buys', 'ฝั่งซื้อ (taker)'))} · ${esc(x.pair)} · ${esc(PX('window', 'ช่วง'))} ${esc(poT(x.from))} – ${esc(lTime(x.to))} (24h) · ${esc(x.src)}</div></div>`; }
    return `<div class="porow"><div class="poh"><b>${esc(EXNAME[v])}</b>${poNA(v === 'bybit' ? PX('buy/sell split not published', 'ไม่เผยแยกซื้อ/ขาย') : v === 'hyperliquid' ? PX('not available (spot ticker may be a different token)', 'ไม่มีข้อมูล (ชื่อเหรียญสปอตอาจเป็นคนละเหรียญ)') : null)}</div></div>`; }).join('');
  return `<p class="sub ponote">${esc(PX('Spot volume over the last 24 closed hours, split by whether the buyer or the seller took liquidity. Pairs are matched to this token by price check, so same-ticker tokens are excluded.', 'วอลุ่มสปอต 24 ชั่วโมงที่ปิดแล้ว แยกตามฝั่งที่เข้าซื้อ/ขายก่อน (taker) จับคู่เหรียญด้วยการตรวจราคา เหรียญชื่อซ้ำจึงถูกตัดออก'))}</p>${rows || poNA()}`;
}
const PO_CH = { BTC: 'Bitcoin', MON: 'Monad', HYPE: 'Hyperliquid (HyperCore)', SOL: 'Solana', NEAR: 'NEAR', AAVE: 'Ethereum', PENDLE: 'Ethereum', LIT: 'Ethereum' };
function poChain(D, t) {
  const o = D.oc, c = PO_CH[t.symbol];
  const it = (l, v, sub) => `<div class="pokv"><span>${esc(l)}</span><b class="num">${v}</b>${sub ? `<small class="sub">${sub}</small>` : ''}</div>`;
  const head = `<p class="sub">${esc(PX('Chain', 'เชน'))}: <b>${esc(o ? o.chain : c || PX('unknown', 'ไม่ทราบ'))}</b>${o ? ` · <span class="mono">${esc(o.address.slice(0, 8) + '…' + o.address.slice(-6))}</span>` : ''}</p>`;
  if (!o) return `${head}<div class="pogrid">${it(PX('Holders', 'ผู้ถือ'), poNA())}${it(PX('Top 10 holders share', 'สัดส่วน 10 อันดับแรก'), poNA())}${it(PX('Exchange net flow', 'โฟลว์สุทธิเข้า/ออกกระดาน'), poNA())}</div><p class="sub">${esc(D.J ? PX('No free, keyless source gives holder counts for this chain\'s native coin.', 'ไม่มีแหล่งฟรีแบบไม่ใช้คีย์ที่ให้จำนวนผู้ถือเหรียญหลักของเชนนี้') : PX('On-chain data unavailable right now.', 'ดึงข้อมูลออนเชนไม่ได้ในขณะนี้'))}</p>`;
  return `${head}<div class="pogrid">${it(PX('Holders', 'ผู้ถือ'), o.holders != null ? o.holders.toLocaleString(loc()) : poNA())}${it(PX('Top 10 holders share', 'สัดส่วน 10 อันดับแรก'), o.top10 != null ? o.top10.toFixed(1) + '%' : poNA(), o.top10Contracts != null ? esc(PX(`of total supply · ${o.top10Contracts} of 10 are contracts (staking, treasury, bridges)`, `ของซัพพลายทั้งหมด · ${o.top10Contracts} ใน 10 เป็นสัญญา (สเตก, คลัง, บริดจ์)`)) : '')}${it(PX('Exchange net flow', 'โฟลว์สุทธิเข้า/ออกกระดาน'), poNA(), esc(PX('needs labelled exchange wallets; no keyless source', 'ต้องมีป้ายกระเป๋ากระดาน ไม่มีแหล่งแบบไม่ใช้คีย์')))}${it(PX('Top 10 excl. contracts & exchanges', '10 อันดับแรก ไม่รวมสัญญาและกระดาน'), o.top10ExCx != null ? o.top10ExCx.toFixed(1) + '%' : poNA(), esc(PX('removes holders Blockscout marks as contracts (staking, protocol, multisig, bridge), exchange wallets or burn', 'ตัดผู้ถือที่ Blockscout ระบุว่าเป็นสัญญา (สเตก, โปรโตคอล, มัลติซิก, บริดจ์) กระเป๋ากระดาน หรือที่อยู่เผา')))}</div>${poTop(o)}<p class="sub">${esc(o.source)} (eth.blockscout.com) · ${esc(PX('updated', 'อัปเดต'))} ${esc(poT(Date.parse(D.jat)))}</p>`;
}
async function renderPos(t, b) {
  const tabs = [['fut', PX('Futures', 'ฟิวเจอร์ส')], ['spot', PX('Spot', 'สปอต')], ['chain', PX('On-chain', 'ออนเชน')]];
  const shell = (inner) => `<div class="pos"><div class="chartbar"><b>${esc(PX('Positioning', 'สถานะตลาด'))}</b><div class="seg sm">${tabs.map(([k, l]) => `<button aria-pressed="${PO.tab === k}" data-potab="${k}">${esc(l)}</button>`).join('')}</div></div><div id="poBody">${inner}</div></div>`;
  b.innerHTML = shell('<div class="sk" style="height:180px;margin-top:12px"></div>');
  const D = await poLoad(t); if (S.tab !== 'pos' || S.sel !== t.symbol || !b.isConnected) return;
  b.innerHTML = shell(PO.tab === 'spot' ? poSpot(D, t) : PO.tab === 'chain' ? poChain(D, t) : poFut(D, t));
}
document.addEventListener('click', (e) => { const el = e.target.closest('[data-potab]'); if (!el) return; PO.tab = el.dataset.potab; const t = tokBySym(S.sel), b = $('#tabBody'); if (t && b) renderPos(t, b); });
if (typeof I18N !== 'undefined') { I18N.en.tabs.pos = 'Positioning'; I18N.th.tabs.pos = 'สถานะตลาด'; }

const POK = { exchange: ['Exchange', 'กระดาน'], protocol: ['Staking / protocol', 'สเตก / โปรโตคอล'], multisig: ['Multisig', 'มัลติซิก'], contract: ['Contract', 'สัญญา'], burn: ['Burn', 'ที่อยู่เผา'] };
function poTop(o) {
  if (!o.top || !o.top.length) return '';
  const r = o.top.map((h, i) => `<tr><td class="num">${i + 1}</td><td><a class="mono" href="https://eth.blockscout.com/address/${esc(h.a)}" target="_blank" rel="noopener">${esc(h.a.slice(0, 8) + '…' + h.a.slice(-6))}</a>${h.label ? ` <span class="mut">${esc(h.label)}</span>` : ''}</td><td>${h.kind ? `<span class="potag po-${esc(h.kind)}">${esc(PX(...POK[h.kind]))}</span>` : `<span class="mut">${esc(PX('untagged', 'ไม่มีป้าย'))}</span>`}</td><td class="num">${h.pct.toFixed(2)}%</td></tr>`).join('');
  return `<div class="tblwrap"><table class="potop"><thead><tr><th>#</th><th>${esc(PX('Holder', 'ผู้ถือ'))}</th><th>${esc(PX('Tag (Blockscout)', 'ป้าย (Blockscout)'))}</th><th class="num">${esc(PX('Supply', 'ซัพพลาย'))}</th></tr></thead><tbody>${r}</tbody></table></div>`;
}
