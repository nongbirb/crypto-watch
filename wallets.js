/* KMS Capital — watch-only wallet groups. Keyless, all fetched in the browser (public RPCs, mempool.space, Jupiter, DefiLlama, Hyperliquid). */
Object.assign(I18N.en, { portfolio: 'Wallets', wTitle: 'Wallets', wAll: 'All', wAdd: 'Add wallet', wGroup: 'Group', wNewGroup: 'New group name', wAddr: 'Addresses (one per line, optional label after a space)', wLabel: 'Label', wRefresh: 'Refresh', wTotal: 'Total value', w24: '24h change', wWallets: 'Wallets', wUpd: 'Updated', wAlloc: 'Allocation', wByChain: 'By chain', wByTok: 'Holdings', wByWal: 'Wallets', wDust: 'Show small / unpriced tokens', wEmpty: 'Add a group and paste EVM, Solana or Bitcoin addresses (or an xpub). Watch-only: no keys, no wallet connection, nothing leaves this device except public address lookups.', wDel: 'Remove', wDelG: 'Delete group', wRen: 'Rename group', wLoading: 'Loading…', wErr: 'Failed', wDebt: 'debt', wCover: 'Coverage', wSaved: 'Groups are saved on this device only. Export a backup now and then.', wBad: 'Not a recognised EVM / Solana / BTC address', wJournal: 'Trade journal →', wLegacy: 'Manual (old portfolio)', wConfirm: 'Remove this?', wLess: 'Show less', wMoreN: (n) => `Show ${n} more`, wOtherN: (n) => `${n} more chains`, wImported: (n) => `Imported ${n} groups`, wBadFile: 'That file is not a wallet-groups export.',
  wCoverTxt: ['EVM: native + ~2,500 top tokens on 32 chains via public RPC + Multicall3, priced by DefiLlama.', 'DeFi: Aave v3 supplied (aTokens) and borrowed (debt, shown negative); LSTs/LRTs (stETH, wstETH, cbETH, rETH, weETH…); Pendle PT/YT and Morpho vault tokens only if listed. Other LP / staking positions are not seen.', 'Hyperliquid: spot balances + a separate Perps section per account (equity, margin, uPnL, positions, liquidation distance) for EVM addresses.', 'Solana: SOL + all SPL / Token-2022 balances via Jupiter holdings, priced by Jupiter (staked SOL and DeFi positions not included).', 'Bitcoin: address balance via mempool.space; xpub/ypub/zpub via blockchain.info.'] });
Object.assign(I18N.th, { portfolio: 'กระเป๋า', wTitle: 'กระเป๋า', wAll: 'ทั้งหมด', wAdd: 'เพิ่มกระเป๋า', wGroup: 'กลุ่ม', wNewGroup: 'ชื่อกลุ่มใหม่', wAddr: 'ที่อยู่ (บรรทัดละหนึ่ง ใส่ชื่อเล่นตามหลังเว้นวรรคได้)', wLabel: 'ชื่อเล่น', wRefresh: 'รีเฟรช', wTotal: 'มูลค่ารวม', w24: 'เปลี่ยนแปลง 24 ชม.', wWallets: 'กระเป๋า', wUpd: 'อัปเดต', wAlloc: 'สัดส่วน', wByChain: 'แยกตามเชน', wByTok: 'เหรียญที่ถือ', wByWal: 'แยกตามกระเป๋า', wDust: 'แสดงเหรียญมูลค่าน้อย / ไม่มีราคา', wEmpty: 'สร้างกลุ่มแล้ววางที่อยู่ EVM, Solana หรือ Bitcoin (หรือ xpub) ได้เลย ดูอย่างเดียว ไม่ใช้คีย์ ไม่ต้องเชื่อมกระเป๋า ไม่มีข้อมูลออกจากเครื่องนอกจากการค้นที่อยู่สาธารณะ', wDel: 'ลบ', wDelG: 'ลบกลุ่ม', wRen: 'เปลี่ยนชื่อกลุ่ม', wLoading: 'กำลังโหลด…', wErr: 'ดึงข้อมูลไม่สำเร็จ', wDebt: 'หนี้', wCover: 'ขอบเขตข้อมูล', wSaved: 'กลุ่มบันทึกไว้ในเครื่องนี้เท่านั้น ควร Export สำรองไว้เป็นระยะ', wBad: 'ไม่ใช่ที่อยู่ EVM / Solana / BTC ที่รู้จัก', wJournal: 'บันทึกเทรด →', wLegacy: 'กรอกเอง (พอร์ตเดิม)', wConfirm: 'ลบรายการนี้ใช่ไหม?', wLess: 'ย่อ', wMoreN: (n) => `ดูอีก ${n} รายการ`, wOtherN: (n) => `อีก ${n} เชน`, wImported: (n) => `นำเข้าแล้ว ${n} กลุ่ม`, wBadFile: 'ไฟล์นี้ไม่ใช่ไฟล์กลุ่มกระเป๋า',
  wCoverTxt: ['EVM: เหรียญหลัก + โทเคนยอดนิยม ~2,500 ตัวบน 32 เชน ผ่าน RPC สาธารณะ + Multicall3 ราคาจาก DefiLlama', 'DeFi: Aave v3 ฝาก (aToken) และยืม (หนี้ แสดงเป็นค่าติดลบ), LST/LRT (stETH, wstETH, cbETH, rETH, weETH…), Pendle PT/YT และ Morpho vault เฉพาะที่อยู่ในรายการ ส่วน LP / staking อื่นยังมองไม่เห็น', 'Hyperliquid: มูลค่าบัญชี perp + ยอด spot ของที่อยู่ EVM', 'Solana: SOL + SPL / Token-2022 ทั้งหมด ผ่าน Jupiter ราคาจาก Jupiter (ไม่รวม SOL ที่ stake และตำแหน่ง DeFi)', 'Bitcoin: ยอดตามที่อยู่ผ่าน mempool.space, xpub/ypub/zpub ผ่าน blockchain.info'] });
Object.assign(I18N.en, { wSpot: 'Spot holdings', wDefi: 'DeFi & LP', wPerps: 'Perps', wSub: 'Subtotal', wHist: 'Portfolio history', wEst: 'estimated', wEstNote: 'Dashed part = estimated: current holdings × historical prices (DefiLlama), before this device started saving snapshots. Perps, unpriced and small tokens are held flat.', wAllocBy: { asset: 'Asset', chain: 'Chain', proto: 'Protocol', tag: 'Wallet tag' }, wAllCh: 'All chains', wEq: 'Account equity', wMB: 'Margin balance', wUpnl: 'Unrealized PnL', wMU: 'Margin used', wWd: 'Withdrawable', wColl: 'Collateral', wNtl: 'Notional', wMR: 'Margin ratio', wPos: 'Open positions', wSide: 'Side', wLong: 'Long', wShortS: 'Short', wSize: 'Size', wEntry: 'Entry', wMark: 'Mark', wPnl: 'PnL', wLev: 'Lev.', wLiq: 'Liq. price', wDist: 'To liq.', wNoPos: 'No open positions', wUnified: 'Unified account: spot USDC is the collateral, so only unrealized PnL is added on top of Spot (no double count).', wClassic: 'Standard account: perp equity is separate from spot balances and is added once.', wLv: { safe: 'Safe', care: 'Caution', risk: 'At risk', crit: 'Critical' }, wHF: 'Health factor', wSupplied: 'Supplied', wBorrowed: 'Borrowed', wNet: 'Net', wType: 'Type', wTagL: 'Tag', wTags: { trading: 'Trading', longterm: 'Long-term', treasury: 'Treasury' }, wCustom: 'Custom…', wNoTag: 'Untagged', wHide: 'Hide', wShow: 'Unhide', wHiddenT: 'Hidden — excluded from totals and charts', wEdit: 'Edit', wHiddenN: (n) => `${n} hidden`, wNoChain: 'Nothing on the selected chains', wSpotP: 'Wallet / spot', wPerpP: 'Hyperliquid perps', wNoHist: 'Collecting snapshots… the chart fills in as you open or refresh this page.', wLiqRisk: 'Liquidation risk', wAaveAcct: 'Aave v3 account', wNoAave: 'No borrow — no liquidation risk' });
Object.assign(I18N.th, { wSpot: 'เหรียญ Spot', wDefi: 'DeFi และ LP', wPerps: 'Perps', wSub: 'รวม', wHist: 'ประวัติมูลค่าพอร์ต', wEst: 'ประมาณการ', wEstNote: 'เส้นประ = ประมาณการ: จำนวนที่ถือตอนนี้ × ราคาย้อนหลัง (DefiLlama) ก่อนเครื่องนี้เริ่มเก็บ snapshot ส่วน Perps และเหรียญไม่มีราคา/มูลค่าน้อยคงที่', wAllocBy: { asset: 'เหรียญ', chain: 'เชน', proto: 'โปรโตคอล', tag: 'แท็กกระเป๋า' }, wAllCh: 'ทุกเชน', wEq: 'มูลค่าบัญชี (Equity)', wMB: 'ยอดมาร์จิ้น', wUpnl: 'กำไร/ขาดทุนยังไม่รับรู้', wMU: 'มาร์จิ้นที่ใช้', wWd: 'ถอนได้', wColl: 'หลักประกัน', wNtl: 'มูลค่าสัญญา', wMR: 'อัตรามาร์จิ้น', wPos: 'สถานะที่เปิดอยู่', wSide: 'ฝั่ง', wLong: 'Long', wShortS: 'Short', wSize: 'ขนาด', wEntry: 'ราคาเข้า', wMark: 'ราคา Mark', wPnl: 'PnL', wLev: 'เลเวอเรจ', wLiq: 'ราคาล้างพอร์ต', wDist: 'ห่างจุดล้าง', wNoPos: 'ไม่มีสถานะเปิด', wUnified: 'บัญชีแบบ Unified: USDC ใน Spot คือหลักประกัน จึงบวกเฉพาะ PnL ที่ยังไม่รับรู้เพิ่มจาก Spot (ไม่นับซ้ำ)', wClassic: 'บัญชีแบบปกติ: Equity ของ perp แยกจากยอด Spot และนับครั้งเดียว', wLv: { safe: 'ปลอดภัย', care: 'ระวัง', risk: 'เสี่ยง', crit: 'วิกฤต' }, wHF: 'Health factor', wSupplied: 'ฝาก', wBorrowed: 'ยืม', wNet: 'สุทธิ', wType: 'ประเภท', wTagL: 'แท็ก', wTags: { trading: 'เทรด', longterm: 'ถือยาว', treasury: 'คลัง' }, wCustom: 'กำหนดเอง…', wNoTag: 'ไม่มีแท็ก', wHide: 'ซ่อน', wShow: 'แสดง', wHiddenT: 'ซ่อนอยู่ — ไม่นับรวมในยอดและกราฟ', wEdit: 'แก้ไข', wHiddenN: (n) => `ซ่อน ${n}`, wNoChain: 'ไม่มีอะไรบนเชนที่เลือก', wSpotP: 'กระเป๋า / spot', wPerpP: 'Hyperliquid perps', wNoHist: 'กำลังเก็บ snapshot… กราฟจะเต็มขึ้นเมื่อเปิดหรือรีเฟรชหน้านี้', wLiqRisk: 'ความเสี่ยงถูกล้างพอร์ต', wAaveAcct: 'บัญชี Aave v3', wNoAave: 'ไม่มีการยืม — ไม่มีความเสี่ยงถูกล้าง' });

const WLK = 'kms-wallets', WC = 'kms-wcache2', WTTL = 10 * 60e3;
const WS = () => { const w = store.get(WLK, null); if (w) return w; const pf = PF(); const g = { groups: [], sel: 'all', dust: false };
  if (pf.holdings && pf.holdings.length) g.groups.push({ id: 'legacy', name: T('wLegacy'), wallets: [{ addr: 'manual', type: 'manual', label: T('wLegacy'), holdings: pf.holdings }] });
  store.set(WLK, g); return g; };
const WSset = (w) => store.set(WLK, w);
const wType = (a) => /^0x[0-9a-fA-F]{40}$/.test(a) ? 'evm' : /^[xyz]pub[1-9A-HJ-NP-Za-km-z]{100,}$/.test(a) ? 'xpub' : /^(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/.test(a) ? 'btc' : /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a) ? 'sol' : null;
const wShort = (a) => a.length > 14 ? a.slice(0, 6) + '…' + a.slice(-4) : a;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function wFetch(url, opt = {}, tries = 3) { // backoff on 429 / 5xx / network
  for (let i = 0; ; i++) { try { const r = await fetch(url, { ...opt, cache: 'no-store' }); if ((r.status === 429 || r.status >= 500) && i < tries) { await sleep(800 * 2 ** i + Math.random() * 400); continue; } if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch (e) { if (i >= tries) throw e; await sleep(800 * 2 ** i); } }
}
const rpc = (url, method, params) => wFetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }).then((j) => { if (j.error) throw new Error(j.error.message || 'rpc'); return j.result; });
async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k]); } catch (e) { out[k] = { err: e.message }; } } })); return out; }

/* ---- prices ---- */
async function llamaPx(keys) { const px = {}; keys = [...new Set(keys)];
  for (let i = 0; i < keys.length; i += 60) { const k = keys.slice(i, i + 60).join(',');
    const [p, c] = await Promise.all([wFetch('https://coins.llama.fi/prices/current/' + k).catch(() => ({})), wFetch('https://coins.llama.fi/percentage/' + k + '?period=24h').catch(() => ({}))]);
    Object.entries(p.coins || {}).forEach(([kk, v]) => px[kk] = { p: v.price, sym: v.symbol, c: (c.coins || {})[kk] }); }
  return px; }

/* ---- EVM ---- */
let EVM = null; const evmList = async () => EVM || (EVM = await getJSON('wallets/evm.json?v=1'));
const hx = (n) => n.toString(16).padStart(64, '0'); const wpad = (a) => a.toLowerCase().replace('0x', '').padStart(64, '0');
function agg3(calls) { // aggregate3((address,bool,bytes)[])
  const n = calls.length; let head = '', body = '';
  calls.forEach((c, i) => { head += hx(n * 32 + i * 192); const d = c[1].replace('0x', ''); body += wpad(c[0]) + hx(1) + hx(96) + hx(d.length / 2) + d.padEnd(128, '0'); });
  return '0x82ad56cb' + hx(32) + hx(n) + head + body; }
function dec3(r) { r = r.replace('0x', ''); const w = (i) => r.slice(i * 2, i * 2 + 64); const n = parseInt(w(32), 16); const out = []; const base = 64;
  for (let i = 0; i < n; i++) { const o = base + parseInt(w(base + i * 32), 16); const ok = parseInt(w(o), 16) === 1; const bo = o + parseInt(w(o + 32), 16); const len = parseInt(w(bo), 16); out.push(ok && len >= 32 ? BigInt('0x' + w(bo + 32)) : 0n); }
  return out; }
const toNum = (b, d) => { if (!b) return 0; const s = b.toString().padStart(d + 1, '0'); return +(s.slice(0, -d || undefined) + '.' + (d ? s.slice(-d) : '0')); };
const ZERO = '0x0000000000000000000000000000000000000000';
const LOGO_CH = { hyperevm: 'hyperliquid', zksync: 'zksync era', worldchain: 'world chain', bsc: 'binance' };
const chLogo = (k) => k === 'manual' ? '' : 'https://icons.llamao.fi/icons/chains/rsz_' + encodeURIComponent(LOGO_CH[k] || k) + '.jpg';
const tkLogo = (id, a) => `https://token-icons.llamao.fi/icons/tokens/${id}/${a.toLowerCase()}?h=48&w=48`;
const PROTO = { aave: 'Aave v3', 'aave-debt': 'Aave v3', lst: 'Liquid staking', pendle: 'Pendle', hlspot: 'Hyperliquid spot' };
const AP3 = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const AAVE_POOL = { ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', base: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5', arbitrum: AP3, optimism: AP3, polygon: AP3, avalanche: AP3, bsc: '0x6807dc923806fE8Fd134338EABCA509979a7e0cB', gnosis: '0xb50201558B00496A145fE76f7424749556E326D8', scroll: '0x11fCfe756c05AD438e312a7fd934381537D3cFfe', linea: '0xc47b8C00b0f69a36fa203Ffeac0334874574a8Ac', zksync: '0x78e30497a3c7527d953c6B1E3541b021A98Ac43c', sonic: '0x5362dBb1e601abF3a4c14c22ffEdA64042E5eAA3', celo: '0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402' };
async function evmChain(c, toks, addr, mc) {
  const all = [[mc, '0x4d2301cc' + wpad(addr)], ...toks.map((t) => [t[0], '0x70a08231' + wpad(addr)])]; const res = [];
  for (let i = 0; i < all.length; i += 250) res.push(...dec3(await rpc(c.rpc, 'eth_call', [{ to: mc, data: agg3(all.slice(i, i + 250)) }, 'latest'])));
  const out = []; if (res[0]) out.push({ chain: c.key, sym: c.native, amt: toNum(res[0], 18), key: 'coingecko:' + c.native_cg, kind: 'native', logo: tkLogo(c.id, ZERO) });
  toks.forEach((t, i) => { const b = res[i + 1]; if (b) out.push({ chain: c.key, sym: t[1], amt: toNum(b, t[2]), key: c.llama + ':' + (t[4] || t[0]), kind: t[3], proto: PROTO[t[3]], logo: tkLogo(c.id, t[4] || t[0]) }); });
  return out; }
async function aaveAcct(c, addr) { const pl = c && AAVE_POOL[c.key]; if (!pl) return null;
  const r = (await rpc(c.rpc, 'eth_call', [{ to: pl, data: '0xbf92857c' + wpad(addr) }, 'latest'])).replace('0x', ''); if (r.length < 384) return null;
  const w = (i) => BigInt('0x' + r.slice(i * 64, i * 64 + 64)); const coll = Number(w(0)) / 1e8, debt = Number(w(1)) / 1e8;
  return { chain: c.key, coll, debt, lt: Number(w(3)) / 1e4, ltv: Number(w(4)) / 1e4, hf: debt > 0 ? Number(w(5) / 10n ** 14n) / 1e4 : null }; }
async function evmAddr(addr) { const L = await evmList(); const errs = [];
  const parts = await pool(L.chains, 8, (c) => evmChain(c, L.tokens[c.key] || [], addr, L.multicall3).catch((e) => { errs.push(c.name); return []; }));
  const h = parts.flat().filter((x) => x && x.chain); let perp = null;
  try { const r = await hlAddr(addr); h.push(...r.spot); perp = r.perp; } catch (e) { errs.push('Hyperliquid'); }
  const ac = [...new Set(h.filter((x) => /^aave/.test(x.kind)).map((x) => x.chain))];
  const aave = (await pool(ac, 4, (k) => aaveAcct(L.chains.find((c) => c.key === k), addr))).filter((a) => a && !a.err && (a.coll || a.debt));
  return { h, errs, perp, aave }; }
async function hlAddr(addr) { const P = (b) => wFetch('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  const [cs, sp, ab] = await Promise.all([P({ type: 'clearinghouseState', user: addr }), P({ type: 'spotClearinghouseState', user: addr }), P({ type: 'userAbstraction', user: addr }).catch(() => null)]);
  const spot = []; const bal = (sp.balances || []).filter((b) => +b.total > 0); let usdc = 0;
  if (bal.length) { const mids = await P({ type: 'allMids' }).catch(() => ({}));
    bal.forEach((b) => { const st = /^USD[CTHE]?/.test(b.coin); const p = st ? 1 : +mids[b.coin] || null; if (b.coin === 'USDC') usdc = +b.total;
      spot.push({ chain: 'hyperliquid', sym: b.coin, amt: +b.total, p, kind: 'hlspot', proto: PROTO.hlspot, logo: 'https://app.hyperliquid.xyz/coins/' + (b.coin === 'USDC' ? 'USDC' : b.coin + '_USDC') + '.svg' }); }); }
  const ms = cs.marginSummary || {}, cm = cs.crossMarginSummary || ms;
  const pos = (cs.assetPositions || []).map((a) => a.position).filter((p) => p && +p.szi).map((p) => { const sz = +p.szi, val = +p.positionValue, mark = val / Math.abs(sz), liq = p.liquidationPx != null && +p.liquidationPx > 0 ? +p.liquidationPx : null;
    return { coin: p.coin, sz, entry: +p.entryPx, mark, val, pnl: +p.unrealizedPnl, roe: +p.returnOnEquity * 100, lev: p.leverage ? p.leverage.value : null, lt: p.leverage ? p.leverage.type : '', liq, dist: liq ? Math.abs(mark - liq) / mark : null, mu: +p.marginUsed, logo: 'https://app.hyperliquid.xyz/coins/' + p.coin + '.svg' }; });
  const av = +ms.accountValue || 0; const upnl = pos.reduce((s, p) => s + p.pnl, 0);
  const unified = typeof ab === 'string' && /unified|portfolio|dex/i.test(ab);
  const perp = av > 0.01 || pos.length ? { av, upnl, ntl: +ms.totalNtlPos || 0, mu: +ms.totalMarginUsed || 0, mm: +cs.crossMaintenanceMarginUsed || 0, cav: +cm.accountValue || 0, wd: +cs.withdrawable || 0, unified, mode: ab || 'default', usdc, pos,
    v: unified ? upnl : av /* unified: spot USDC already in Spot = collateral, add only uPnL; classic: perp equity is separate from spot */ } : null;
  return { spot, perp }; }

/* ---- Solana ---- */
const SOLM = 'So11111111111111111111111111111111111111112';
async function solAddr(addr) { // Jupiter Ultra holdings (keyless, CORS) — public Solana RPCs now block getTokenAccountsByOwner
  const j = await wFetch('https://lite-api.jup.ag/ultra/v1/holdings/' + addr); const m = {}; if (+j.uiAmount > 0) m[SOLM] = +j.uiAmount;
  Object.entries(j.tokens || {}).forEach(([mint, accs]) => { const u = accs.reduce((s, x) => s + (x.excludeFromNetWorth ? 0 : +x.uiAmountString || 0), 0); if (u > 0) m[mint] = (m[mint] || 0) + u; });
  const ids = Object.keys(m).slice(0, 400); const px = {}, meta = {};
  for (let i = 0; i < ids.length; i += 50) { Object.assign(px, await wFetch('https://lite-api.jup.ag/price/v3?ids=' + ids.slice(i, i + 50).join(','), {}, 4).catch(() => ({}))); if (i) await sleep(250); }
  const val = ids.filter((k) => px[k] && px[k].usdPrice * m[k] >= 1);
  for (let i = 0; i < val.length; i += 50) ((await wFetch('https://lite-api.jup.ag/tokens/v2/search?query=' + val.slice(i, i + 50).join(','), {}, 4).catch(() => [])) || []).forEach((x) => meta[x.id] = x);
  return { h: ids.map((k) => ({ chain: 'solana', sym: k === SOLM ? 'SOL' : (meta[k] && meta[k].symbol) || wShort(k), amt: m[k], p: px[k] ? px[k].usdPrice : null, c: px[k] ? px[k].priceChange24h : null, kind: 'token', key: 'solana:' + k, logo: meta[k] && meta[k].icon, spam: meta[k] ? !meta[k].isVerified && (meta[k].organicScore || 0) < 20 : true })), errs: [] }; }

/* ---- Bitcoin ---- */
async function btcAddr(addr, type) { let sats;
  if (type === 'xpub') sats = (await wFetch('https://blockchain.info/multiaddr?active=' + addr + '&n=0&cors=true')).wallet.final_balance;
  else { const j = await wFetch('https://mempool.space/api/address/' + addr); const s = (o) => o.funded_txo_sum - o.spent_txo_sum; sats = s(j.chain_stats) + s(j.mempool_stats); }
  return { h: sats ? [{ chain: 'bitcoin', sym: 'BTC', amt: sats / 1e8, key: 'coingecko:bitcoin', kind: 'native', logo: chLogo('bitcoin') }] : [], errs: [] }; }

/* ---- per-address cache + pricing ---- */
S.wLoad = S.wLoad || {};
async function wLoadAddr(w, force) { const C = store.get(WC, {}); const k = w.type + ':' + w.addr; const c = C[k];
  if (!force && c && Date.now() - c.t < WTTL) return c;
  if (S.wLoad[k]) return S.wLoad[k];
  return (S.wLoad[k] = (async () => { try {
    const r = w.type === 'evm' ? await evmAddr(w.addr) : w.type === 'sol' ? await solAddr(w.addr) : w.type === 'manual' ? { h: (w.holdings || []).map((x) => ({ chain: 'manual', sym: x.sym, amt: +x.qty, key: 'coingecko:' + x.id, kind: 'token' })), errs: [] } : await btcAddr(w.addr, w.type);
    const need = r.h.filter((x) => x.key && x.p == null).map((x) => x.key); const px = need.length ? await llamaPx(need) : {};
    r.h.forEach((x) => { const q = x.key && px[x.key]; if (q) { x.p = q.p; x.c = q.c; } x.v = x.p != null ? x.amt * x.p * (x.kind === 'aave-debt' ? -1 : 1) : null; });
    const o = { t: Date.now(), h: r.h, errs: r.errs, perp: r.perp || null, aave: r.aave || [] }; const C2 = store.get(WC, {}); C2[k] = o; store.set(WC, C2); return o;
  } catch (e) { return { t: Date.now(), h: (c && c.h) || [], perp: c && c.perp, aave: (c && c.aave) || [], err: e.message, stale: !!c }; } finally { delete S.wLoad[k]; } })()); }
/* ---- page ---- */
const CHN = () => Object.fromEntries([...((EVM && EVM.chains) || []).map((c) => [c.key, c.name]), ['solana', 'Solana'], ['bitcoin', 'Bitcoin'], ['hyperliquid', 'Hyperliquid'], ['manual', 'Manual']]);
const isDust = (x) => x.v == null || Math.abs(x.v) < 1 || x.spam;
const wKey = (w) => w.type + ':' + w.addr;
const DEFI = new Set(['aave', 'aave-debt', 'lst', 'pendle']);
const wm = (v) => (v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : 2 });
const wms = (v) => (v > 0 ? '+' : '') + wm(v);
const LGC = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#22c55e'];
const lg = (url, sym, sm) => { const s = String(sym || '?').replace(/^\$/, ''); const c = LGC[[...s].reduce((a, ch) => a + ch.charCodeAt(0), 0) % LGC.length];
  return `<span class="lg${sm ? ' sm' : ''}" style="--lc:${c}"><b>${esc(s.slice(0, 1).toUpperCase())}</b>${url ? `<img src="${esc(url)}" alt="" loading="lazy" onload="this.style.opacity=1" onerror="this.remove()">` : ''}</span>`; };
const tagName = (t) => t ? (T('wTags')[t] || t) : '';
const lvOf = (s) => s == null ? 'safe' : s >= 0.6 ? 'safe' : s >= 0.35 ? 'care' : s >= 0.15 ? 'risk' : 'crit';
const hbar = (s, txt) => { const lv = lvOf(s); return `<div class="hb hb-${lv}" title="${esc(T('wLiqRisk'))}"><i style="width:${Math.max(3, Math.min(100, (s == null ? 1 : s) * 100)).toFixed(0)}%"></i></div><small class="hbl hb-${lv}"><b>${esc(T('wLv')[lv])}</b>${txt ? ' · ' + txt : ''}</small>`; };
const posSafe = (d) => d == null ? 1 : Math.min(1, d / 0.5);
const hfSafe = (hf) => hf == null ? 1 : Math.max(0, Math.min(1, (hf - 1) / 1.5));

/* ---- history snapshots (local, throttled) ---- */
const WH = 'kms-whist';
function wSnap() { const ws = WS(); const C = store.get(WC, {}); const d = {};
  ws.groups.forEach((g) => g.wallets.forEach((w) => { const c = C[wKey(w)]; if (!c) return;
    (c.h || []).forEach((x) => { if (x.v == null || x.spam) return; const k = wKey(w) + '|' + x.chain; d[k] = (d[k] || 0) + x.v; });
    if (c.perp) { const k = wKey(w) + '|hyperliquid'; d[k] = (d[k] || 0) + c.perp.v; } }));
  if (!Object.keys(d).length) return; Object.keys(d).forEach((k) => d[k] = Math.round(d[k] * 100) / 100);
  let H = store.get(WH, []); const now = Date.now(); const last = H[H.length - 1];
  if (last && now - last.t < 10 * 60e3) H[H.length - 1] = { t: last.t, d }; else H.push({ t: now, d });
  // thin: keep all <48h, hourly <30d, daily beyond; cap 1500
  const seen = new Set(); H = H.filter((s) => { const age = now - s.t; if (age < 48 * 36e5) return true; const b = age < 30 * 864e5 ? 'h' + Math.floor(s.t / 36e5) : 'd' + Math.floor(s.t / 864e5); if (seen.has(b)) return false; seen.add(b); return true; }).slice(-1500);
  store.set(WH, H); }
const RANGES = { '24h': [864e5, 24, '1h'], '7d': [7 * 864e5, 42, '4h'], '30d': [30 * 864e5, 30, '1d'], '90d': [90 * 864e5, 90, '1d'], '1y': [365 * 864e5, 73, '5d'], All: [2 * 365 * 864e5, 104, '1w'] };
S.wEst = S.wEst || {};
async function wEstLoad(rg, keys) { const sig = rg + '|' + keys.join(','); if (S.wEst[sig]) return S.wEst[sig]; const [ms, span, per] = RANGES[rg]; const start = Math.floor((Date.now() - ms) / 1e3); const coins = {};
  const get = async (ks) => { const j = await wFetch(`https://coins.llama.fi/chart/${ks.join(',')}?start=${start}&span=${span}&period=${per}&searchWidth=${per === '1h' ? '600' : '6h'}`, {}, 1).catch(() => null);
    if (!j) { if (ks.length > 1) { const h = Math.ceil(ks.length / 2); await get(ks.slice(0, h)); await get(ks.slice(h)); } return; }
    Object.entries(j.coins || {}).forEach(([k, v]) => coins[k] = (v.prices || []).map((p) => [p.timestamp * 1e3, p.price])); };
  for (let i = 0; i < keys.length; i += 20) await get(keys.slice(i, i + 20));
  return (S.wEst[sig] = coins); }
function wSeries(M, rg) { const [ms] = RANGES[rg]; const from = Date.now() - ms; const H = store.get(WH, []);
  const ok = (k) => { const i = k.lastIndexOf('|'); return M.vkeys.has(k.slice(0, i)) && M.chOk(k.slice(i + 1)); };
  const loc = H.filter((s) => s.t >= from).map((s) => ({ t: s.t, v: Object.entries(s.d).reduce((a, [k, v]) => a + (ok(k) ? v : 0), 0) }));
  const first = loc.length ? loc[0].t : Date.now(); let est = [];
  const coverAll = H.length && H[0].t <= from + ms * 0.04;
  if (!coverAll) { const keys = M.keyed.map((x) => x.key); const sig = rg + '|' + keys.join(','); const co = S.wEst[sig];
    if (co) { const base = M.total - M.keyed.reduce((s, x) => s + x.v, 0); const ts = [...new Set(Object.values(co).flatMap((a) => a.map((p) => p[0])))].sort((a, b) => a - b).filter((t) => t < first);
      const near = (a, t) => { let b = null, bd = Infinity; for (const p of a) { const d = Math.abs(p[0] - t); if (d < bd) { bd = d; b = p[1]; } } return b; };
      // group near-identical timestamps
      const tt = []; ts.forEach((t) => { if (!tt.length || t - tt[tt.length - 1] > ms / 400) tt.push(t); });
      est = tt.map((t) => ({ t, v: base + M.keyed.reduce((s, x) => { const a = co[x.key]; const p = a && near(a, t); return s + (p != null ? x.amt * p * x.sg : x.v); }, 0), e: 1 })); }
    else if (keys.length && !S.wEstBusy) { S.wEstBusy = 1; wEstLoad(rg, keys).finally(() => { S.wEstBusy = 0; if (S.route === 'portfolio') pPortfolio(true); }); } }
  const now = { t: Date.now(), v: M.total };
  const pts = [...est, ...loc]; if (!loc.length || Date.now() - loc[loc.length - 1].t > 60e3) pts.push(now); else pts[pts.length - 1] = { ...pts[pts.length - 1], v: M.total };
  return { pts, est: est.length > 0 }; }
function chartSVG(pts) { if (pts.length < 2) return ''; const W = 640, H = 190, pl = 4, pr = 4, pt = 12, pb = 18;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t; let lo = Math.min(...pts.map((p) => p.v)), hi = Math.max(...pts.map((p) => p.v)); const padv = (hi - lo) * 0.08 || Math.abs(hi) * 0.01 || 1; lo -= padv; hi += padv;
  const X = (t) => pl + (t - t0) / (t1 - t0 || 1) * (W - pl - pr), Y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  const P = pts.map((p) => [X(p.t), Y(p.v)]);
  const path = (a) => a.map((p, i) => { if (!i) return `M${p[0].toFixed(1)},${p[1].toFixed(1)}`; const p0 = a[i - 2] || a[i - 1], p1 = a[i - 1], p3 = a[i + 1] || p; const c1 = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6], c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6]; return `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p[0].toFixed(1)},${p[1].toFixed(1)}`; }).join('');
  const ne = pts.filter((p) => p.e).length; const up = pts[pts.length - 1].v >= pts[0].v; const col = up ? 'var(--up)' : 'var(--dn)';
  const eP = ne ? P.slice(0, ne + 1) : [], rP = P.slice(Math.max(0, ne));
  const area = path(P) + `L${P[P.length - 1][0].toFixed(1)},${H - pb}L${P[0][0].toFixed(1)},${H - pb}Z`;
  const fmtT = (t) => new Date(t).toLocaleString(LANG === 'th' ? 'th-TH' : 'en-US', (t1 - t0) < 2 * 864e5 ? { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' } : { month: 'short', day: 'numeric', timeZone: 'Asia/Tokyo' });
  return `<svg class="hchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" data-pts='${esc(JSON.stringify(pts.map((p) => [p.t, Math.round(p.v * 100) / 100, p.e ? 1 : 0])))}' data-x0="${t0}" data-x1="${t1}" data-lo="${lo}" data-hi="${hi}">
    <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".28"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
    <path class="ar" d="${area}" fill="url(#hg)"/>${eP.length > 1 ? `<path class="ln est" d="${path(eP)}" stroke="${col}"/>` : ''}${rP.length > 1 ? `<path class="ln real" pathLength="1" d="${path(rP)}" stroke="${col}"/>` : ''}
    <text x="${pl}" y="${H - 4}" class="ax">${esc(fmtT(t0))}</text><text x="${W - pr}" y="${H - 4}" class="ax" text-anchor="end">${esc(fmtT(t1))}</text>
    <line class="hx" x1="0" x2="0" y1="${pt}" y2="${H - pb}"/><circle class="hd" r="4" cx="-10" cy="-10" fill="${col}"/></svg>`; }

/* ---- model ---- */
function wModel() { const ws = WS(); const gs = ws.groups; const sel = gs.some((g) => g.id === ws.sel) ? ws.sel : 'all'; const C = store.get(WC, {});
  const wal = (sel === 'all' ? gs : gs.filter((g) => g.id === sel)).flatMap((g) => g.wallets.map((w) => ({ ...w, g: g.name, gid: g.id })));
  const rows = wal.map((w) => ({ w, c: C[wKey(w)] })); const live = rows.filter((r) => !r.w.hidden);
  const chs = new Set(ws.chains || []); const chOk = (k) => !chs.size || chs.has(k);
  const allCh = {}; live.forEach((r) => { if (!r.c) return; r.c.h.forEach((x) => { if (!isDust(x)) allCh[x.chain] = (allCh[x.chain] || 0) + Math.abs(x.v); }); if (r.c.perp) allCh.hyperliquid = (allCh.hyperliquid || 0) + Math.abs(r.c.perp.v) + 1; });
  const hold = live.flatMap((r) => (r.c ? r.c.h : []).map((x) => ({ ...x, w: r.w }))).filter((x) => chOk(x.chain));
  const vis = hold.filter((x) => ws.dust || !isDust(x));
  const spot = vis.filter((x) => !DEFI.has(x.kind)), defi = vis.filter((x) => DEFI.has(x.kind));
  const perps = chOk('hyperliquid') ? live.filter((r) => r.c && r.c.perp).map((r) => ({ w: r.w, p: r.c.perp })).sort((a, b) => b.p.av - a.p.av) : [];
  const aave = live.flatMap((r) => (r.c && r.c.aave || []).filter((a) => chOk(a.chain)).map((a) => ({ ...a, w: r.w })));
  const sum = (a) => a.reduce((s, x) => s + (x.v || 0), 0);
  const tS = sum(spot), tD = sum(defi), tP = perps.reduce((s, x) => s + x.p.v, 0), total = tS + tD + tP;
  const d24 = vis.reduce((s, x) => s + (x.v && x.c != null ? x.v - x.v / (1 + x.c / 100) : 0), 0);
  const keyed = Object.values(vis.filter((x) => x.key && x.v).reduce((o, x) => { const q = o[x.key] = o[x.key] || { key: x.key, amt: 0, v: 0, sg: x.kind === 'aave-debt' ? -1 : 1 }; q.amt += x.amt; q.v += x.v; return o; }, {})).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 40);
  return { ws, gs, sel, wal, rows, live, chs, chOk, allCh, vis, spot, defi, perps, aave, tS, tD, tP, total, d24, keyed, hid: hold.length - vis.length, vkeys: new Set(live.map((r) => wKey(r.w))), loading: rows.some((r) => S.wLoad[wKey(r.w)]) }; }
function allocParts(M, mode) { const CN = CHN(); const g = {};
  const add = (k, v) => { if (v > 0) g[k] = (g[k] || 0) + v; };
  [...M.spot, ...M.defi].forEach((x) => { if (!(x.v > 0)) return; add(mode === 'asset' ? x.sym : mode === 'chain' ? CN[x.chain] || x.chain : mode === 'proto' ? x.proto || T('wSpotP') : tagName(x.w.tag) || T('wNoTag'), x.v); });
  M.perps.forEach((x) => add(mode === 'asset' ? 'Perps (HL)' : mode === 'chain' ? 'Hyperliquid' : mode === 'proto' ? T('wPerpP') : tagName(x.w.tag) || T('wNoTag'), x.p.v));
  const e = Object.entries(g).sort((a, b) => b[1] - a[1]); const top = e.slice(0, 7), rest = e.slice(7).reduce((s, x) => s + x[1], 0);
  return [...top.map(([n, v], i) => ({ n, v, c: PAL[i] })), ...(rest > 0 ? [{ n: 'Other', v: rest, c: PAL[9] }] : [])]; }

function pPortfolio(soft) {
  const M = wModel(); const { ws, gs, sel, wal, rows, loading } = M; const CN = CHN();
  const mode = ws.alloc || 'asset', rg = RANGES[ws.range] ? ws.range : '7d';
  const st = (l, v, c = '') => `<div><div class="eyebrow">${esc(l)}</div><div class="v num ${c}">${v}</div></div>`;
  const chip = (id, n) => `<button class="chip np" data-wg="${esc(id)}" aria-pressed="${sel === id}">${esc(n)}</button>`;
  const upd = rows.map((r) => r.c && r.c.t).filter(Boolean); const updT = upd.length ? new Date(Math.min(...upd)).toISOString() : null;
  const nHid = wal.filter((w) => w.hidden).length;
  const sk = (w = 70) => `<span class="sk" style="display:inline-block;width:${w}px;height:16px"></span>`;
  const secH = (t, v, extra = '') => `<div class="sec-h"><h2>${esc(t)}</h2><span class="wsub">${esc(T('wSub'))} <b class="num">${wm(v)}</b></span>${extra}</div>`;
  // chain chips
  const chKeys = Object.entries(M.allCh).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  const chBar = chKeys.length > 1 ? `<div class="filters wchs"><button class="chip np" data-wch="" aria-pressed="${!M.chs.size}">${esc(T('wAllCh'))}</button>${chKeys.slice(0, S.wChAll ? 99 : 10).map((k) => `<button class="chip np" data-wch="${esc(k)}" aria-pressed="${M.chs.has(k)}">${lg(chLogo(k), CN[k] || k, 1)}${esc(CN[k] || k)}</button>`).join('')}${chKeys.length > 10 ? `<button class="link sm" data-wchall>${esc(S.wChAll ? T('wLess') : '+' + (chKeys.length - 10))}</button>` : ''}</div>` : '';
  // history
  const S1 = wSeries(M, rg); const hp = S1.pts; const h0 = hp.length ? hp[0].v : 0, hch = M.total - h0;
  const hist = `<div class="card whist"><div class="sec-h"><h2>${esc(T('wHist'))}</h2>${S1.est ? `<span class="wtag est" title="${esc(T('wEstNote'))}">${esc(T('wEst'))}</span>` : ''}<div class="seg" style="margin-left:auto">${Object.keys(RANGES).map((r) => `<button data-wrg="${r}" aria-pressed="${r === rg}">${r}</button>`).join('')}</div></div>
    <div class="hhead"><b class="num">${wm(M.total)}</b> ${hp.length > 1 ? `<span class="num ${cls(hch)}">${wms(hch)} (${pct(h0 ? hch / Math.abs(h0) * 100 : 0)})</span>` : ''}<span class="hval sub num"></span></div>
    <div class="hwrap">${hp.length > 1 ? chartSVG(hp) : `<div class="sub hnone">${M.keyed.length ? '<div class="sk" style="height:150px"></div>' : esc(T('wNoHist'))}</div>`}</div>${S1.est ? `<small class="sub">${esc(T('wEstNote'))}</small>` : ''}</div>`;
  // allocation
  const parts = allocParts(M, mode); const ptot = parts.reduce((s, p) => s + p.v, 0) || 1;
  const alloc = `<div class="card pfalloc"><div class="sec-h"><h2>${esc(T('wAlloc'))}</h2></div><div class="seg wseg">${Object.entries(T('wAllocBy')).map(([k, n]) => `<button data-walloc="${k}" aria-pressed="${k === mode}">${esc(n)}</button>`).join('')}</div>${parts.length ? `<div class="dwrap">${donut(parts)}<ul class="dleg">${parts.map((p) => `<li><i style="background:${p.c}"></i><b>${esc(p.n)}</b><span class="num">${(p.v / ptot * 100).toFixed(1)}%</span></li>`).join('')}</ul></div>` : loading ? `<div class="sk" style="height:168px"></div>` : `<p class="sub">${esc(T('wNoChain'))}</p>`}</div>`;
  // spot
  const agg = (list) => { const o = {}; list.forEach((x) => { const k = x.sym + '|' + x.kind; const q = o[k] = o[k] || { n: x.sym, v: 0, amt: 0, p: x.p, c: x.c, ch: new Set(), kind: x.kind, logo: x.logo, proto: x.proto }; q.v += x.v || 0; q.amt += x.amt; q.ch.add(x.chain); if (!q.logo && x.logo) q.logo = x.logo; }); return Object.values(o).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)); };
  const chIcons = (set) => `<span class="wchi" title="${esc([...set].map((k) => CN[k] || k).join(', '))}">${[...set].slice(0, 4).map((k) => lg(chLogo(k), CN[k] || k, 1)).join('')}${set.size > 4 ? `<small>+${set.size - 4}</small>` : ''}</span>`;
  const amtF = (a) => a.toLocaleString('en-US', { maximumFractionDigits: a >= 1000 ? 2 : 4 });
  const sT = agg(M.spot);
  const spotSec = `<div class="sec">${secH(T('wSpot'), M.tS, `<label class="sub wdust"><input type="checkbox" data-wdust ${ws.dust ? 'checked' : ''}> ${esc(T('wDust'))}${M.hid ? ` (${M.hid})` : ''}</label>`)}
    <div class="tbl-wrap"><table class="ov wtok"><thead><tr><th class="l">${esc(T('token'))}</th><th class="l hide-s">${esc(T('wByChain'))}</th><th>${esc(T('price'))}</th><th>24h</th><th>${esc(T('wTotal'))}</th></tr></thead><tbody>${sT.slice(0, S.wMore ? 999 : 15).map((t) => `<tr><td class="l"><div class="wtk">${lg(t.logo, t.n)}<div><b>${esc(t.n)}</b><small class="sub num">${amtF(t.amt)}</small></div></div></td><td class="l hide-s">${chIcons(t.ch)}</td><td class="num">${t.p != null ? px(t.p) : '–'}</td><td class="num ${cls(t.c)}">${t.c != null ? pct(t.c) : '–'}</td><td class="num"><b>${wm(t.v)}</b></td></tr>`).join('') || `<tr><td colspan="5" class="sub">${loading ? esc(T('wLoading')) : esc(T('wNoChain'))}</td></tr>`}</tbody></table></div>${sT.length > 15 ? `<button class="btn ghost" style="margin-top:10px" data-wmore>${esc(S.wMore ? T('wLess') : TF('wMoreN', sT.length - 15))}</button>` : ''}</div>`;
  // perps
  const wName = (w) => `${esc(w.label || wShort(w.addr))}${w.tag ? ` <span class="wtag t">${esc(tagName(w.tag))}</span>` : ''}`;
  const perpSec = M.perps.length ? `<div class="sec">${secH(T('wPerps'), M.tP)}${M.perps.map(({ w, p }) => { const mr = p.cav > 0 ? p.mm / p.cav : 0; const coll = p.unified ? p.usdc : p.av - p.upnl;
    const kv = (l, v, c = '') => `<div><span class="eyebrow">${esc(l)}</span><b class="num ${c}">${v}</b></div>`;
    return `<div class="card wperp"><div class="wph"><div>${lg(chLogo('hyperliquid'), 'H')}<b>${wName(w)}</b> <small class="sub mono">${esc(wShort(w.addr))}</small> <span class="wtag">${esc(p.unified ? 'Unified' : p.mode === 'default' ? 'Standard' : p.mode)}</span></div><div class="wpr">${hbar(1 - mr, `${esc(T('wMR'))} ${(mr * 100).toFixed(1)}%`)}</div></div>
      <div class="wkv">${kv(T('wEq'), wm(p.av))}${kv(T('wMB'), wm(p.av - p.upnl))}${kv(T('wUpnl'), wms(p.upnl), cls(p.upnl))}${kv(T('wMU'), wm(p.mu))}${kv(T('wWd'), wm(p.wd))}${kv(T('wColl'), wm(coll) + (p.unified ? ' <small class="sub">USDC</small>' : ''))}${kv(T('wNtl'), wm(p.ntl))}</div>
      ${p.pos.length ? `<div class="tbl-wrap"><table class="ov wpos"><thead><tr><th class="l">${esc(T('wPos'))}</th><th>${esc(T('wSize'))}</th><th>${esc(T('wEntry'))}</th><th>${esc(T('wMark'))}</th><th>${esc(T('wPnl'))}</th><th>${esc(T('wLiq'))}</th><th class="l wliqc">${esc(T('wLiqRisk'))}</th></tr></thead><tbody>${p.pos.sort((a, b) => b.val - a.val).slice(0, S.wPosAll ? 999 : 8).map((q) => `<tr><td class="l"><div class="wtk">${lg(q.logo, q.coin)}<div><b>${esc(q.coin)}</b><small><span class="${q.sz > 0 ? 'up' : 'dn'}">${esc(q.sz > 0 ? T('wLong') : T('wShortS'))}</span> <span class="sub">${q.lev != null ? q.lev + '× ' + esc(q.lt) : ''}</span></small></div></div></td><td class="num">${amtF(Math.abs(q.sz))}<small class="sub">${wm(q.val)}</small></td><td class="num">${px(q.entry)}</td><td class="num">${px(q.mark)}</td><td class="num ${cls(q.pnl)}"><b>${wms(q.pnl)}</b><small>${pct(q.roe)}</small></td><td class="num">${q.liq ? px(q.liq) : '–'}</td><td class="l wliqc">${hbar(posSafe(q.dist), q.dist != null ? (q.dist >= 1 ? '≥100%' : (q.dist * 100).toFixed(1) + '%') : '–')}</td></tr>`).join('')}</tbody></table></div>${p.pos.length > 8 ? `<button class="btn ghost" data-wposall>${esc(S.wPosAll ? T('wLess') : TF('wMoreN', p.pos.length - 8))}</button>` : ''}` : `<p class="sub">${esc(T('wNoPos'))}</p>`}
      <small class="sub">${esc(p.unified ? T('wUnified') : T('wClassic'))}</small></div>`; }).join('')}</div>` : '';
  // defi
  const dT = agg(M.defi); const kindTag = (k) => k === 'aave' ? T('wSupplied') : k === 'aave-debt' ? T('wBorrowed') : k === 'lst' ? 'LST' : k === 'pendle' ? 'Pendle' : k;
  const defiSec = dT.length || M.aave.length ? `<div class="sec">${secH(T('wDefi'), M.tD)}
    ${M.aave.map((a) => `<div class="card waave"><div class="wph"><div>${lg(chLogo(a.chain), CN[a.chain] || a.chain)}<b>${esc(T('wAaveAcct'))} · ${esc(CN[a.chain] || a.chain)}</b> <small class="sub">${wName(a.w)}</small></div><div class="wpr">${a.debt > 0 ? hbar(hfSafe(a.hf), `${esc(T('wHF'))} ${a.hf != null ? a.hf.toFixed(2) : '∞'}`) : `<small class="sub">${esc(T('wNoAave'))}</small>`}</div></div>
      <div class="wkv"><div><span class="eyebrow">${esc(T('wSupplied'))}</span><b class="num">${wm(a.coll)}</b></div><div><span class="eyebrow">${esc(T('wBorrowed'))}</span><b class="num dn">${wm(a.debt)}</b></div><div><span class="eyebrow">${esc(T('wNet'))}</span><b class="num">${wm(a.coll - a.debt)}</b></div><div><span class="eyebrow">LTV / LT</span><b class="num">${(a.coll ? a.debt / a.coll * 100 : 0).toFixed(1)}% / ${(a.lt * 100).toFixed(0)}%</b></div></div></div>`).join('')}
    <div class="tbl-wrap"><table class="ov wtok"><thead><tr><th class="l">${esc(T('token'))}</th><th class="l">${esc(T('wType'))}</th><th class="l hide-s">${esc(T('wByChain'))}</th><th>${esc(T('price'))}</th><th>${esc(T('wTotal'))}</th></tr></thead><tbody>${dT.map((t) => `<tr><td class="l"><div class="wtk">${lg(t.logo, t.n)}<div><b>${esc(t.n)}</b><small class="sub num">${amtF(t.amt)}</small></div></div></td><td class="l"><span class="wtag ${t.kind === 'aave-debt' ? 'dn' : ''}">${esc(kindTag(t.kind))}</span> <small class="sub">${esc(t.proto || '')}</small></td><td class="l hide-s">${chIcons(t.ch)}</td><td class="num">${t.p != null ? px(t.p) : '–'}</td><td class="num ${t.v < 0 ? 'dn' : ''}"><b>${wm(t.v)}</b></td></tr>`).join('')}</tbody></table></div></div>` : '';
  // wallets
  const walCards = rows.map((r) => { const h = (r.c ? r.c.h : []).filter((x) => ws.dust || !isDust(x)); const v = h.reduce((s, x) => s + (x.v || 0), 0) + (r.c && r.c.perp ? r.c.perp.v : 0); const id = esc(r.w.gid + '|' + r.w.addr);
    return `<div class="wrow${r.w.hidden ? ' off' : ''}"><div class="wtk">${lg(chLogo(r.w.type === 'evm' ? 'ethereum' : r.w.type === 'sol' ? 'solana' : r.w.type === 'manual' ? 'manual' : 'bitcoin'), r.w.type)}<div><b>${esc(r.w.label || wShort(r.w.addr))}</b> <span class="wtag">${esc(r.w.type.toUpperCase())}</span>${r.w.tag ? ` <span class="wtag t">${esc(tagName(r.w.tag))}</span>` : ''}${sel === 'all' ? ` <span class="sub">${esc(r.w.g)}</span>` : ''}<small class="sub mono">${esc(r.w.type === 'manual' ? T('wLegacy') : wShort(r.w.addr))}${r.w.hidden ? ` · ${esc(T('wHiddenT'))}` : ''}${r.c && r.c.err ? ` · <span class="dn">${esc(T('wErr'))}</span>` : ''}${r.c && r.c.errs && r.c.errs.length ? ` · <span class="sub" title="${esc(r.c.errs.join(', '))}">${r.c.errs.length} RPC ✕</span>` : ''}</small></div></div>
      <div class="r"><b class="num">${r.c ? wm(v) : sk()}</b><span class="wact"><button class="link sm" data-wedit="${id}">${esc(T('wEdit'))}</button><button class="link sm" data-whide="${id}" aria-pressed="${!!r.w.hidden}">${esc(r.w.hidden ? T('wShow') : T('wHide'))}</button><button class="link sm dn" data-wdel="${id}">${esc(T('wDel'))}</button></span></div></div>`; }).join('');
  $('#main').innerHTML = `<div class="page wal">${pageHead(T('wTitle'), `<div style="display:flex;gap:6px"><button class="btn ghost" data-wref ${loading ? 'disabled' : ''}>↻ ${esc(T('wRefresh'))}</button><button class="btn pri" data-wadd>+ ${esc(T('wAdd'))}</button></div>`)}
    <div class="filters">${chip('all', T('wAll'))}${gs.map((g) => chip(g.id, g.name + ' · ' + g.wallets.length)).join('')}${sel !== 'all' ? `<button class="link sm" data-wren>${esc(T('wRen'))}</button><button class="link sm dn" data-wdelg>${esc(T('wDelG'))}</button>` : ''}</div>
    ${wal.length ? `${chBar}<div class="jstats">${st(T('wTotal'), wm(M.total))}${st(T('w24'), usd(M.d24) + (M.total ? `<small class="${cls(M.d24)}"> ${pct(M.d24 / (M.total - M.d24) * 100)}</small>` : ''), cls(M.d24))}${st(T('wWallets'), (wal.length - nHid) + (nHid ? ` <small class="sub">${esc(TF('wHiddenN', nHid))}</small>` : ''))}${st(T('wUpd'), loading ? esc(T('wLoading')) : updT ? `<span title="${esc(jstFull(updT))}">${esc(relT(updT))}</span>` : '–')}</div>
    <div class="wsplit">${[[T('wSpot'), M.tS], [T('wDefi'), M.tD], [T('wPerps'), M.tP]].map(([n, v]) => `<div><span class="eyebrow">${esc(n)}</span><b class="num">${wm(v)}</b><i><b style="width:${M.total > 0 ? Math.max(0, v / M.total * 100).toFixed(1) : 0}%"></b></i></div>`).join('')}</div>
    <div class="pfgrid">${hist}${alloc}</div>${spotSec}${perpSec}${defiSec}
    <div class="sec"><div class="sec-h"><h2>${esc(T('wWallets'))}</h2></div>${walCards}</div>` : `<div class="empty">${esc(T('wEmpty'))}<div style="margin-top:14px"><button class="btn pri" data-wadd>+ ${esc(T('wAdd'))}</button></div></div>`}
    <div class="jtools"><a class="link" href="#/journal">${esc(T('wJournal'))}</a><div style="display:flex;gap:6px;margin-left:auto"><button class="btn ghost" data-wexp>${esc(T('exp'))}</button><label class="btn ghost" style="cursor:pointer">${esc(T('imp'))}<input type="file" accept="application/json,.json" id="wimp" hidden></label></div></div>
    <details class="card wcov"><summary><b>${esc(T('wCover'))}</b></summary><ul class="bl">${T('wCoverTxt').map((s) => `<li>${esc(s)}</li>`).join('')}</ul></details>
    <p class="sub" style="margin-top:12px">${esc(T('wSaved'))}</p></div>`;
  $('#wimp').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; try { const j = JSON.parse(await f.text()); if (!Array.isArray(j.groups)) throw 0; WSset({ ...WS(), groups: j.groups, sel: 'all', dust: !!j.dust }); toast(TF('wImported', j.groups.length)); pPortfolio(); } catch (er) { toast(T('wBadFile')); } });
  if (!soft) wRefresh(false);
}
async function wRefresh(force) { const ws = WS(); const wal = (ws.sel === 'all' ? ws.groups : ws.groups.filter((g) => g.id === ws.sel)).flatMap((g) => g.wallets);
  if (!EVM && wal.some((w) => w.type === 'evm')) await evmList().catch(() => {});
  const p = pool(wal, 3, (w) => wLoadAddr(w, force).then(() => { if (S.route === 'portfolio') pPortfolio(true); }));
  if (S.route === 'portfolio') pPortfolio(true); await p; wSnap(); if (S.route === 'portfolio') pPortfolio(true); }
function wEdit(gid, addr) { const ws = WS(); const g = ws.groups.find((x) => x.id === gid); const w = g && g.wallets.find((x) => x.addr === addr); if (!w) return; const d = $('#dlg'); const TG = T('wTags'); const custom = w.tag && !TG[w.tag];
  d.innerHTML = `<form method="dialog" id="weform"><div class="dlg-h"><h2>${esc(T('wEdit'))}</h2><button class="icon-btn" value="cancel" aria-label="close">✕</button></div>
    <div class="dlg-b"><div class="fld full"><label>${esc(T('wLabel'))}</label><input class="input" name="l" value="${esc(w.label || '')}"></div>
    <div class="fld full"><label>${esc(T('wTagL'))}</label><select class="input" name="t"><option value="">${esc(T('wNoTag'))}</option>${Object.entries(TG).map(([k, n]) => `<option value="${k}" ${w.tag === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}<option value="_c" ${custom ? 'selected' : ''}>${esc(T('wCustom'))}</option></select><input class="input" name="c" value="${esc(custom ? w.tag : '')}" placeholder="${esc(T('wCustom'))}" style="margin-top:6px"></div>
    <label class="sub"><input type="checkbox" name="h" ${w.hidden ? 'checked' : ''}> ${esc(T('wHiddenT'))}</label></div>
    <div class="dlg-f"><button class="btn ghost" value="cancel">${esc(T('cancel'))}</button><button class="btn pri" value="ok">${esc(T('save'))}</button></div></form>`;
  const fm = $('#weform'); const sc = () => { fm.c.style.display = fm.t.value === '_c' ? '' : 'none'; }; sc(); fm.t.addEventListener('change', sc);
  fm.onsubmit = (e) => { if (e.submitter && e.submitter.value === 'cancel') return; w.label = fm.l.value.trim(); w.tag = fm.t.value === '_c' ? fm.c.value.trim() : fm.t.value; w.hidden = fm.h.checked; WSset(ws); pPortfolio(true); };
  d.showModal(); }
function wDialog() { const ws = WS(); const d = $('#dlg');
  d.innerHTML = `<form method="dialog" id="wform"><div class="dlg-h"><h2>${esc(T('wAdd'))}</h2><button class="icon-btn" value="cancel" aria-label="close">✕</button></div>
    <div class="dlg-b"><div class="fld full"><label>${esc(T('wGroup'))}</label><select class="input" name="g">${ws.groups.filter((g) => g.id !== 'legacy').map((g) => `<option value="${esc(g.id)}" ${g.id === ws.sel ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}<option value="">+ ${esc(T('wNewGroup'))}</option></select><input class="input" name="gn" placeholder="${esc(T('wNewGroup'))}" style="margin-top:6px"></div>
    <div class="fld full"><label>${esc(T('wAddr'))}</label><textarea class="input mono" name="a" rows="4" placeholder="0x…  main&#10;bc1q…&#10;7xKX…  phantom"></textarea><small class="sub" id="wdet"></small></div></div>
    <div class="dlg-f"><button class="btn ghost" value="cancel">${esc(T('cancel'))}</button><button class="btn pri" value="ok">${esc(T('save'))}</button></div></form>`;
  const fm = $('#wform'); const gsel = () => { fm.gn.style.display = fm.g.value ? 'none' : ''; }; gsel(); fm.g.addEventListener('change', gsel);
  const parse = () => fm.a.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [a, ...lb] = l.split(/\s+/); return { addr: a, label: lb.join(' '), type: wType(a) }; });
  fm.a.addEventListener('input', () => { $('#wdet').innerHTML = parse().map((x) => x.type ? `${esc(wShort(x.addr))} → <b>${x.type.toUpperCase()}</b>` : `<span class="dn">${esc(wShort(x.addr))}: ${esc(T('wBad'))}</span>`).join(' · '); });
  fm.onsubmit = (e) => { if (e.submitter && e.submitter.value === 'cancel') return; const list = parse().filter((x) => x.type); if (!list.length) { e.preventDefault(); toast(T('wBad')); return; }
    let g = ws.groups.find((x) => x.id === fm.g.value); if (!g) { const n = fm.gn.value.trim() || 'Group ' + (ws.groups.length + 1); g = { id: 'g' + Date.now().toString(36), name: n, wallets: [] }; ws.groups.push(g); }
    list.forEach((x) => { if (!g.wallets.some((w) => w.addr.toLowerCase() === x.addr.toLowerCase())) g.wallets.push(x); }); ws.sel = g.id; WSset(ws); pPortfolio(); };
  d.showModal(); }
function wExport() { const b = new Blob([JSON.stringify({ app: 'kms-capital', kind: 'wallet-groups', version: 1, ...WS() }, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `kms-capital-wallets-${todayJ()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
document.addEventListener('click', (e) => { const q = (s) => e.target.closest(s); let el; const ws = () => WS();
  if ((el = q('[data-wg]'))) { const w = ws(); w.sel = el.dataset.wg; WSset(w); return pPortfolio(); }
  if (q('[data-wadd]')) return wDialog();
  if (q('[data-wmore]')) { S.wMore = !S.wMore; return pPortfolio(true); }
  if (q('[data-wref]')) return wRefresh(true);
  if (q('[data-wexp]')) return wExport();
  if ((el = q('[data-wdel]')) && confirm(T('wConfirm'))) { const [gid, a] = el.dataset.wdel.split('|'); const w = ws(); const g = w.groups.find((x) => x.id === gid); if (g) g.wallets = g.wallets.filter((x) => x.addr !== a); WSset(w); return pPortfolio(true); }
  if (q('[data-wdelg]') && confirm(T('wConfirm'))) { const w = ws(); w.groups = w.groups.filter((x) => x.id !== w.sel); w.sel = 'all'; WSset(w); return pPortfolio(true); }
  if (q('[data-wren]')) { const w = ws(); const g = w.groups.find((x) => x.id === w.sel); const n = g && prompt(T('wRen'), g.name); if (n) { g.name = n.trim(); WSset(w); pPortfolio(true); } }
});
document.addEventListener('change', (e) => { if (e.target.matches('[data-wdust]')) { const w = WS(); w.dust = e.target.checked; WSset(w); pPortfolio(true); } });
document.addEventListener('click', (e) => { const q = (s) => e.target.closest(s); let el; const ws = WS(); const save = () => { WSset(ws); pPortfolio(true); };
  if ((el = q('[data-wch]'))) { const k = el.dataset.wch; let c = new Set(ws.chains || []); if (!k) c = new Set(); else c.has(k) ? c.delete(k) : c.add(k); ws.chains = [...c]; return save(); }
  if (q('[data-wposall]')) { S.wPosAll = !S.wPosAll; return pPortfolio(true); }
  if (q('[data-wchall]')) { S.wChAll = !S.wChAll; return pPortfolio(true); }
  if ((el = q('[data-walloc]'))) { ws.alloc = el.dataset.walloc; return save(); }
  if ((el = q('[data-wrg]'))) { ws.range = el.dataset.wrg; return save(); }
  if ((el = q('[data-whide]'))) { const [gid, a] = el.dataset.whide.split('|'); const w = (ws.groups.find((x) => x.id === gid) || { wallets: [] }).wallets.find((x) => x.addr === a); if (w) { w.hidden = !w.hidden; save(); } return; }
  if ((el = q('[data-wedit]'))) { const [gid, a] = el.dataset.wedit.split('|'); return wEdit(gid, a); }
});
const wHover = (e) => { const s = e.target.closest && e.target.closest('.hchart'); if (!s) return; const r = s.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; const pts = JSON.parse(s.dataset.pts); const x0 = +s.dataset.x0, x1 = +s.dataset.x1, lo = +s.dataset.lo, hi = +s.dataset.hi;
  const t = x0 + x / r.width * (x1 - x0); let b = pts[0]; pts.forEach((p) => { if (Math.abs(p[0] - t) < Math.abs(b[0] - t)) b = p; });
  const W = 640, H = 190; const X = 4 + (b[0] - x0) / (x1 - x0 || 1) * (W - 8), Y = 12 + (1 - (b[1] - lo) / (hi - lo)) * (H - 30);
  s.querySelector('.hx').setAttribute('x1', X); s.querySelector('.hx').setAttribute('x2', X); const c = s.querySelector('.hd'); c.style.opacity = 1; c.setAttribute('cx', X); c.setAttribute('cy', Y);
  const o = s.closest('.whist').querySelector('.hval'); if (o) o.textContent = `${wm(b[1])} · ${new Date(b[0]).toLocaleString(LANG === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })} JST${b[2] ? ' · ' + T('wEst') : ''}`; };
document.addEventListener('mousemove', wHover); document.addEventListener('touchmove', wHover, { passive: true });