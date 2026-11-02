/* KMS Capital — watch-only wallet groups. Keyless, all fetched in the browser (public RPCs, mempool.space, Jupiter, DefiLlama, Hyperliquid). */
Object.assign(I18N.en, { portfolio: 'Wallets', wTitle: 'Wallets', wAll: 'All', wAdd: 'Add wallet', wGroup: 'Group', wNewGroup: 'New group name', wAddr: 'Addresses (one per line, optional label after a space)', wLabel: 'Label', wRefresh: 'Refresh', wTotal: 'Total value', w24: '24h change', wWallets: 'Wallets', wUpd: 'Updated', wAlloc: 'Allocation', wByChain: 'By chain', wByTok: 'Holdings', wByWal: 'Wallets', wDust: 'Show small / unpriced tokens', wEmpty: 'Add a group and paste EVM, Solana or Bitcoin addresses (or an xpub). Watch-only: no keys, no wallet connection, nothing leaves this device except public address lookups.', wDel: 'Remove', wDelG: 'Delete group', wRen: 'Rename group', wLoading: 'Loading…', wErr: 'Failed', wDebt: 'debt', wCover: 'Coverage', wSaved: 'Groups are saved on this device only. Export a backup now and then.', wBad: 'Not a recognised EVM / Solana / BTC address', wJournal: 'Trade journal →', wLegacy: 'Manual (old portfolio)', wConfirm: 'Remove this?', wLess: 'Show less', wMoreN: (n) => `Show ${n} more`, wOtherN: (n) => `${n} more chains`, wImported: (n) => `Imported ${n} groups`, wBadFile: 'That file is not a wallet-groups export.',
  wCoverTxt: ['EVM: native + ~2,500 top tokens on 32 chains via public RPC + Multicall3, priced by DefiLlama.', 'DeFi: Aave v3 supplied (aTokens) and borrowed (debt, shown negative); LSTs/LRTs (stETH, wstETH, cbETH, rETH, weETH…); Pendle PT/YT and Morpho vault tokens only if listed. Other LP / staking positions are not seen.', 'Hyperliquid: spot balances + a separate Perps section per account (equity, margin, uPnL, positions, liquidation distance) for EVM addresses.', 'Solana: SOL + all SPL / Token-2022 balances via Jupiter holdings, priced by Jupiter (staked SOL and DeFi positions not included).', 'Bitcoin: address balance via mempool.space; xpub/ypub/zpub via blockchain.info.'] });
Object.assign(I18N.th, { portfolio: 'กระเป๋า', wTitle: 'กระเป๋า', wAll: 'ทั้งหมด', wAdd: 'เพิ่มกระเป๋า', wGroup: 'กลุ่ม', wNewGroup: 'ชื่อกลุ่มใหม่', wAddr: 'ที่อยู่ (บรรทัดละหนึ่ง ใส่ชื่อเล่นตามหลังเว้นวรรคได้)', wLabel: 'ชื่อเล่น', wRefresh: 'รีเฟรช', wTotal: 'มูลค่ารวม', w24: 'เปลี่ยนแปลง 24 ชม.', wWallets: 'กระเป๋า', wUpd: 'อัปเดต', wAlloc: 'สัดส่วน', wByChain: 'แยกตามเชน', wByTok: 'เหรียญที่ถือ', wByWal: 'แยกตามกระเป๋า', wDust: 'แสดงเหรียญมูลค่าน้อย / ไม่มีราคา', wEmpty: 'สร้างกลุ่มแล้ววางที่อยู่ EVM, Solana หรือ Bitcoin (หรือ xpub) ได้เลย ดูอย่างเดียว ไม่ใช้คีย์ ไม่ต้องเชื่อมกระเป๋า ไม่มีข้อมูลออกจากเครื่องนอกจากการค้นที่อยู่สาธารณะ', wDel: 'ลบ', wDelG: 'ลบกลุ่ม', wRen: 'เปลี่ยนชื่อกลุ่ม', wLoading: 'กำลังโหลด…', wErr: 'ดึงข้อมูลไม่สำเร็จ', wDebt: 'หนี้', wCover: 'ขอบเขตข้อมูล', wSaved: 'กลุ่มบันทึกไว้ในเครื่องนี้เท่านั้น ควร Export สำรองไว้เป็นระยะ', wBad: 'ไม่ใช่ที่อยู่ EVM / Solana / BTC ที่รู้จัก', wJournal: 'บันทึกเทรด →', wLegacy: 'กรอกเอง (พอร์ตเดิม)', wConfirm: 'ลบรายการนี้ใช่ไหม?', wLess: 'ย่อ', wMoreN: (n) => `ดูอีก ${n} รายการ`, wOtherN: (n) => `อีก ${n} เชน`, wImported: (n) => `นำเข้าแล้ว ${n} กลุ่ม`, wBadFile: 'ไฟล์นี้ไม่ใช่ไฟล์กลุ่มกระเป๋า',
  wCoverTxt: ['EVM: เหรียญหลัก + โทเคนยอดนิยม ~2,500 ตัวบน 32 เชน ผ่าน RPC สาธารณะ + Multicall3 ราคาจาก DefiLlama', 'DeFi: Aave v3 ฝาก (aToken) และยืม (หนี้ แสดงเป็นค่าติดลบ), LST/LRT (stETH, wstETH, cbETH, rETH, weETH…), Pendle PT/YT และ Morpho vault เฉพาะที่อยู่ในรายการ ส่วน LP / staking อื่นยังมองไม่เห็น', 'Hyperliquid: มูลค่าบัญชี perp + ยอด spot ของที่อยู่ EVM', 'Solana: SOL + SPL / Token-2022 ทั้งหมด ผ่าน Jupiter ราคาจาก Jupiter (ไม่รวม SOL ที่ stake และตำแหน่ง DeFi)', 'Bitcoin: ยอดตามที่อยู่ผ่าน mempool.space, xpub/ypub/zpub ผ่าน blockchain.info'] });
Object.assign(I18N.en, { wSpot: 'Spot holdings', wDefi: 'DeFi & LP', wPerps: 'Perps', wSub: 'Subtotal', wHist: 'Portfolio history', wEst: 'estimated', wEstNote: 'Dashed part = estimated: current holdings × historical prices (DefiLlama), before this device started saving snapshots. Perps, unpriced and small tokens are held flat.', wAllocBy: { asset: 'Asset', chain: 'Chain', proto: 'Protocol', tag: 'Wallet tag' }, wAllCh: 'All chains', wEq: 'Account equity', wMB: 'Margin balance', wUpnl: 'Unrealized PnL', wMU: 'Margin used', wWd: 'Withdrawable', wColl: 'Collateral', wNtl: 'Notional', wMR: 'Margin ratio', wPos: 'Open positions', wSide: 'Side', wLong: 'Long', wShortS: 'Short', wSize: 'Size', wEntry: 'Entry', wMark: 'Mark', wPnl: 'PnL', wLev: 'Lev.', wLiq: 'Liq. price', wDist: 'To liq.', wNoPos: 'No open positions', wUnified: 'Unified account: spot USDC is the collateral, so only unrealized PnL is added on top of Spot (no double count).', wClassic: 'Standard account: perp equity is separate from spot balances and is added once.', wLv: { safe: 'Safe', care: 'Caution', risk: 'At risk', crit: 'Critical' }, wHF: 'Health factor', wSupplied: 'Supplied', wBorrowed: 'Borrowed', wNet: 'Net', wType: 'Type', wTagL: 'Tag', wTags: { trading: 'Trading', longterm: 'Long-term', treasury: 'Treasury' }, wCustom: 'Custom…', wNoTag: 'Untagged', wHide: 'Hide', wShow: 'Unhide', wHiddenT: 'Hidden — excluded from totals and charts', wEdit: 'Edit', wHiddenN: (n) => `${n} hidden`, wNoChain: 'Nothing on the selected chains', wSpotP: 'Wallet / spot', wPerpP: 'Hyperliquid perps', wNoHist: 'Collecting snapshots… the chart fills in as you open or refresh this page.', wLiqRisk: 'Liquidation risk', wAaveAcct: 'Aave v3 account', wNoAave: 'No borrow — no liquidation risk' });
Object.assign(I18N.th, { wSpot: 'เหรียญ Spot', wDefi: 'DeFi และ LP', wPerps: 'Perps', wSub: 'รวม', wHist: 'ประวัติมูลค่าพอร์ต', wEst: 'ประมาณการ', wEstNote: 'เส้นประ = ประมาณการ: จำนวนที่ถือตอนนี้ × ราคาย้อนหลัง (DefiLlama) ก่อนเครื่องนี้เริ่มเก็บ snapshot ส่วน Perps และเหรียญไม่มีราคา/มูลค่าน้อยคงที่', wAllocBy: { asset: 'เหรียญ', chain: 'เชน', proto: 'โปรโตคอล', tag: 'แท็กกระเป๋า' }, wAllCh: 'ทุกเชน', wEq: 'มูลค่าบัญชี (Equity)', wMB: 'ยอดมาร์จิ้น', wUpnl: 'กำไร/ขาดทุนยังไม่รับรู้', wMU: 'มาร์จิ้นที่ใช้', wWd: 'ถอนได้', wColl: 'หลักประกัน', wNtl: 'มูลค่าสัญญา', wMR: 'อัตรามาร์จิ้น', wPos: 'สถานะที่เปิดอยู่', wSide: 'ฝั่ง', wLong: 'Long', wShortS: 'Short', wSize: 'ขนาด', wEntry: 'ราคาเข้า', wMark: 'ราคา Mark', wPnl: 'PnL', wLev: 'เลเวอเรจ', wLiq: 'ราคาล้างพอร์ต', wDist: 'ห่างจุดล้าง', wNoPos: 'ไม่มีสถานะเปิด', wUnified: 'บัญชีแบบ Unified: USDC ใน Spot คือหลักประกัน จึงบวกเฉพาะ PnL ที่ยังไม่รับรู้เพิ่มจาก Spot (ไม่นับซ้ำ)', wClassic: 'บัญชีแบบปกติ: Equity ของ perp แยกจากยอด Spot และนับครั้งเดียว', wLv: { safe: 'ปลอดภัย', care: 'ระวัง', risk: 'เสี่ยง', crit: 'วิกฤต' }, wHF: 'Health factor', wSupplied: 'ฝาก', wBorrowed: 'ยืม', wNet: 'สุทธิ', wType: 'ประเภท', wTagL: 'แท็ก', wTags: { trading: 'เทรด', longterm: 'ถือยาว', treasury: 'คลัง' }, wCustom: 'กำหนดเอง…', wNoTag: 'ไม่มีแท็ก', wHide: 'ซ่อน', wShow: 'แสดง', wHiddenT: 'ซ่อนอยู่ — ไม่นับรวมในยอดและกราฟ', wEdit: 'แก้ไข', wHiddenN: (n) => `ซ่อน ${n}`, wNoChain: 'ไม่มีอะไรบนเชนที่เลือก', wSpotP: 'กระเป๋า / spot', wPerpP: 'Hyperliquid perps', wNoHist: 'กำลังเก็บ snapshot… กราฟจะเต็มขึ้นเมื่อเปิดหรือรีเฟรชหน้านี้', wLiqRisk: 'ความเสี่ยงถูกล้างพอร์ต', wAaveAcct: 'บัญชี Aave v3', wNoAave: 'ไม่มีการยืม — ไม่มีความเสี่ยงถูกล้าง' });

const WLK = 'kms-wallets', WC = 'kms-wcache3', WTTL = 10 * 60e3;
const WS = () => { const w = store.get(WLK, null); if (w) return w; const pf = PF(); const g = { groups: [], sel: 'all', dust: false };
  if (pf.holdings && pf.holdings.length) g.groups.push({ id: 'legacy', name: T('wLegacy'), wallets: [{ addr: 'manual', type: 'manual', label: T('wLegacy'), holdings: pf.holdings }] });
  store.set(WLK, g); return g; };
const WSset = (w) => store.set(WLK, w);
const wType = (a) => /^0x[0-9a-fA-F]{40}$/.test(a) ? 'evm' : /^[xyz]pub[1-9A-HJ-NP-Za-km-z]{100,}$/.test(a) ? 'xpub' : /^(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/.test(a) ? 'btc' : /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a) ? 'sol' : null;
const wShort = (a) => a.length > 14 ? a.slice(0, 6) + '…' + a.slice(-4) : a;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function wFetch(url, opt = {}, tries = 3) { // backoff on 429 / 5xx / network
  for (let i = 0; ; i++) { try { const r = await fetch(url, { signal: AbortSignal.timeout(20000), ...opt, cache: 'no-store' }); if ((r.status === 429 || r.status >= 500) && i < tries) { await sleep(800 * 2 ** i + Math.random() * 400); continue; } if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
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
  const out = []; if (res[0]) out.push({ chain: c.key, sym: c.native, amt: toNum(res[0], 18), key: 'coingecko:' + c.native_cg, kind: 'native', logo: logoList(c.key, ZERO) });
  toks.forEach((t, i) => { const b = res[i + 1]; if (b) out.push({ chain: c.key, sym: t[1], amt: toNum(b, t[2]), key: c.llama + ':' + (t[4] || t[0]), kind: t[3], proto: PROTO[t[3]], addr: t[0], logo: logoList(c.key, t[4] || t[0]) }); });
  return out; }
async function aaveAcct(c, addr) { const pl = c && AAVE_POOL[c.key]; if (!pl) return null;
  const r = (await rpc(c.rpc, 'eth_call', [{ to: pl, data: '0xbf92857c' + wpad(addr) }, 'latest'])).replace('0x', ''); if (r.length < 384) return null;
  const w = (i) => BigInt('0x' + r.slice(i * 64, i * 64 + 64)); const coll = Number(w(0)) / 1e8, debt = Number(w(1)) / 1e8;
  return { chain: c.key, coll, debt, lt: Number(w(3)) / 1e4, ltv: Number(w(4)) / 1e4, hf: debt > 0 ? Number(w(5) / 10n ** 14n) / 1e4 : null }; }
async function evmAddr(addr) { const L = await evmList(); const errs = [];
  const [parts, disc] = await Promise.all([pool(L.chains, 8, (c) => evmChain(c, L.tokens[c.key] || [], addr, L.multicall3).catch((e) => { errs.push(c.name); return []; })), evmDisc(addr, L, errs).catch(() => [])]);
  const h = parts.flat().filter((x) => x && x.chain); let perp = null;
  const have = new Set(h.map((x) => x.chain + ':' + (x.addr || '').toLowerCase())); disc.forEach((t) => { if (!have.has(t.chain + ':' + t.addr.toLowerCase())) { have.add(t.chain + ':' + t.addr.toLowerCase()); h.push(t); } });
  try { const r = await hlAddr(addr); h.push(...r.spot); perp = r.perp; } catch (e) { errs.push('Hyperliquid'); }
  const ac = [...new Set(h.filter((x) => /^aave/.test(x.kind)).map((x) => x.chain))];
  const aave = (await pool(ac, 4, (k) => aaveAcct(L.chains.find((c) => c.key === k), addr))).filter((a) => a && !a.err && (a.coll || a.debt));
  return { h, errs, perp, aave }; }
async function hlAddr(addr) { const P = (b) => wFetch('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  const [cs, sp, ab] = await Promise.all([P({ type: 'clearinghouseState', user: addr }), P({ type: 'spotClearinghouseState', user: addr }), P({ type: 'userAbstraction', user: addr }).catch(() => null)]);
  const spot = []; const bal = (sp.balances || []).filter((b) => +b.total > 0); let usdc = 0;
  if (bal.length) { const mids = await P({ type: 'allMids' }).catch(() => ({}));
    bal.forEach((b) => { const st = /^USD[CTHE]?/.test(b.coin); const p = st ? 1 : +mids[b.coin] || null; if (b.coin === 'USDC') usdc = +b.total;
      spot.push({ chain: 'hyperliquid', sym: b.coin, amt: +b.total, p, kind: 'hlspot', proto: PROTO.hlspot, logo: b.coin === 'USDC' ? logoList('ethereum', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48') : ['https://app.hyperliquid.xyz/coins/' + b.coin + '_USDC.svg', 'https://app.hyperliquid.xyz/coins/' + b.coin + '.svg'] }); }); }
  const ms = cs.marginSummary || {}, cm = cs.crossMarginSummary || ms;
  const pos = (cs.assetPositions || []).map((a) => a.position).filter((p) => p && +p.szi).map((p) => { const sz = +p.szi, val = +p.positionValue, mark = val / Math.abs(sz), liq = p.liquidationPx != null && +p.liquidationPx > 0 ? +p.liquidationPx : null;
    return { coin: p.coin, sz, entry: +p.entryPx, mark, val, pnl: +p.unrealizedPnl, roe: +p.returnOnEquity * 100, lev: p.leverage ? p.leverage.value : null, lt: p.leverage ? p.leverage.type : '', liq, dist: liq ? Math.abs(mark - liq) / mark : null, mu: +p.marginUsed, logo: 'https://app.hyperliquid.xyz/coins/' + p.coin + '.svg' }; });
  const av = +ms.accountValue || 0; const upnl = pos.reduce((s, p) => s + p.pnl, 0);
  const unified = typeof ab === 'string' && /unified|portfolio|dex/i.test(ab);
  // Perps subtotal = account equity. Unified/portfolio margin: the margin balance (equity − uPnL) is the same spot USDC already listed, so remove it from spot once.
  const overlap = unified ? Math.max(0, Math.min(usdc, av - upnl)) : 0; const us = spot.find((x) => x.sym === 'USDC'); if (us && overlap) { us.amt = Math.max(0, us.amt - overlap); us.held = overlap; }
  const perp = av > 0.01 || pos.length ? { av, upnl, ntl: +ms.totalNtlPos || 0, mu: +ms.totalMarginUsed || 0, mm: +cs.crossMaintenanceMarginUsed || 0, cav: +cm.accountValue || 0, wd: +cs.withdrawable || 0, unified, mode: ab || 'default', usdc, overlap, pos, v: av } : null;
  return { spot, perp }; }

/* ---- Solana ---- */
const SOLM = 'So11111111111111111111111111111111111111112';
async function solAddr(addr) { // Jupiter Ultra holdings (keyless, CORS) — public Solana RPCs now block getTokenAccountsByOwner
  const j = await wFetch('https://lite-api.jup.ag/ultra/v1/holdings/' + addr); const m = {}; if (+j.uiAmount > 0) m[SOLM] = +j.uiAmount;
  Object.entries(j.tokens || {}).forEach(([mint, accs]) => { const u = accs.reduce((s, x) => s + (x.excludeFromNetWorth ? 0 : +x.uiAmountString || 0), 0); if (u > 0) m[mint] = (m[mint] || 0) + u; });
  const ids = Object.keys(m).slice(0, 400); const px = {}, meta = {};
  for (let i = 0; i < ids.length; i += 50) { Object.assign(px, await wFetch('https://lite-api.jup.ag/price/v3?ids=' + ids.slice(i, i + 50).join(','), {}, 4).catch(() => ({}))); if (i) await sleep(250); }
  const val = ids.slice(0, 300);
  for (let i = 0; i < val.length; i += 50) ((await wFetch('https://lite-api.jup.ag/tokens/v2/search?query=' + val.slice(i, i + 50).join(','), {}, 4).catch(() => [])) || []).forEach((x) => meta[x.id] = x);
  return { h: ids.map((k) => ({ chain: 'solana', sym: k === SOLM ? 'SOL' : (meta[k] && meta[k].symbol) || wShort(k), amt: m[k], p: px[k] ? px[k].usdPrice : null, c: px[k] ? px[k].priceChange24h : null, kind: k === SOLM ? 'native' : 'token', key: 'solana:' + k, addr: k === SOLM ? null : k, name: meta[k] && meta[k].name, rep: 'ok', llp: px[k] ? 1 : 0, liq: meta[k] ? meta[k].liquidity : null, holders: meta[k] ? meta[k].holderCount : 0, logo: k === SOLM ? logoList('solana', ZERO) : logoList('solana', k, meta[k] && meta[k].icon) })), errs: [] }; }

/* ---- Bitcoin ---- */
async function btcAddr(addr, type) { let sats;
  if (type === 'xpub') sats = (await wFetch('https://blockchain.info/multiaddr?active=' + addr + '&n=0&cors=true')).wallet.final_balance;
  else { const j = await wFetch('https://mempool.space/api/address/' + addr); const s = (o) => o.funded_txo_sum - o.spent_txo_sum; sats = s(j.chain_stats) + s(j.mempool_stats); }
  return { h: sats ? [{ chain: 'bitcoin', sym: 'BTC', amt: sats / 1e8, key: 'coingecko:bitcoin', kind: 'native', logo: logoList('bitcoin', ZERO) }] : [], errs: [] }; }

/* ---- per-address cache + pricing ---- */
S.wLoad = S.wLoad || {};
async function wLoadAddr(w, force) { const C = store.get(WC, {}); const k = w.type + ':' + w.addr; const c = C[k];
  if (!force && c && Date.now() - c.t < WTTL) return c;
  if (S.wLoad[k]) return S.wLoad[k];
  return (S.wLoad[k] = (async () => { try {
    const r = w.type === 'evm' ? await evmAddr(w.addr) : w.type === 'sol' ? await solAddr(w.addr) : w.type === 'manual' ? { h: (w.holdings || []).map((x) => ({ chain: 'manual', sym: x.sym, amt: +x.qty, key: 'coingecko:' + x.id, kind: 'token' })), errs: [] } : await btcAddr(w.addr, w.type);
    await wPrice(r.h);
    const big = (x) => Math.abs(x.v || 0) >= 0.01, core = (x) => big(x) || (!x.spam && !x.disc); const keep = r.h.filter(core).concat(r.h.filter((x) => !core(x)).slice(0, 80)).map(({ name, holders, p0, llp, rep, disc, ...x }) => x);
    const o = { t: Date.now(), h: keep, errs: r.errs, perp: r.perp || null, aave: r.aave || [] }; const C2 = store.get(WC, {}); C2[k] = o; store.set(WC, C2); return o;
  } catch (e) { return { t: Date.now(), h: (c && c.h) || [], perp: c && c.perp, aave: (c && c.aave) || [], err: e.message, stale: !!c }; } finally { delete S.wLoad[k]; } })()); }
/* ---- keccak-256 (EIP-55 checksums for Trust Wallet logo paths) ---- */
const KRC = ['1', '8082', '800000000000808a', '8000000080008000', '808b', '80000001', '8000000080008081', '8000000000008009', '8a', '88', '80008009', '8000000a', '8000808b', '800000000000008b', '8000000000008089', '8000000000008003', '8000000000008002', '8000000000000080', '800a', '800000008000000a', '8000000080008081', '8000000000008080', '80000001', '8000000080008008'].map((h) => BigInt('0x' + h));
const KROT = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14].map(BigInt); const KM = (1n << 64n) - 1n;
const krl = (v, n) => n ? ((v << n) | (v >> (64n - n))) & KM : v;
function keccak256(bytes) { const s = Array(25).fill(0n), R = 136, p = [...bytes, 1]; while (p.length % R) p.push(0); p[p.length - 1] |= 0x80;
  for (let o = 0; o < p.length; o += R) { for (let i = 0; i < R / 8; i++) { let v = 0n; for (let b = 7; b >= 0; b--) v = (v << 8n) | BigInt(p[o + i * 8 + b]); s[i] ^= v; }
    for (let r = 0; r < 24; r++) { const C = [0, 1, 2, 3, 4].map((x) => s[x] ^ s[x + 5] ^ s[x + 10] ^ s[x + 15] ^ s[x + 20]);
      for (let x = 0; x < 5; x++) { const D = C[(x + 4) % 5] ^ krl(C[(x + 1) % 5], 1n); for (let y = 0; y < 25; y += 5) s[x + y] ^= D; }
      const B = Array(25); for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) B[y + 5 * ((2 * x + 3 * y) % 5)] = krl(s[x + 5 * y], KROT[x + 5 * y]);
      for (let x = 0; x < 5; x++) for (let y = 0; y < 25; y += 5) s[x + y] = B[x + y] ^ (~B[(x + 1) % 5 + y] & KM & B[(x + 2) % 5 + y]);
      s[0] ^= KRC[r]; } }
  let h = ''; for (let i = 0; i < 4; i++) for (let b = 0; b < 8; b++) h += Number((s[i] >> BigInt(8 * b)) & 255n).toString(16).padStart(2, '0'); return h; }
const CKS = {}; const cksum = (a) => { const l = a.toLowerCase().replace('0x', ''); if (CKS[l]) return CKS[l]; const h = keccak256([...l].map((c) => c.charCodeAt(0))); return (CKS[l] = '0x' + [...l].map((c, i) => parseInt(h[i], 16) >= 8 ? c.toUpperCase() : c).join('')); };
/* ---- logos: chain + contract address, never symbol ---- */
const TW = { ethereum: 'ethereum', base: 'base', arbitrum: 'arbitrum', optimism: 'optimism', bsc: 'smartchain', polygon: 'polygon', avalanche: 'avalanchec', sonic: 'sonic', linea: 'linea', scroll: 'scroll', zksync: 'zksync', mantle: 'mantle', gnosis: 'xdai', blast: 'blast', celo: 'celo', cronos: 'cronos', opbnb: 'opbnb', solana: 'solana', bitcoin: 'bitcoin', unichain: 'unichain', zora: 'zora', berachain: 'berachain', monad: 'monad', fraxtal: 'fraxtal', taiko: 'taiko', mode: 'mode', worldchain: 'worldchain', ink: 'ink', soneium: 'soneium', plasma: 'plasma', abstract: 'abstract', hyperevm: 'hyperevm', katana: 'katana', megaeth: 'megaeth' };
const TWB = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/';
const CHID = () => Object.fromEntries(((EVM && EVM.chains) || []).map((c) => [c.key, c.id]));
function logoList(chain, addr, extra) { const out = []; const tw = TW[chain];
  if (!addr || addr === ZERO || addr === 'native') { if (tw) out.push(TWB + tw + '/info/logo.png'); const id = CHID()[chain]; if (id) out.push(tkLogo(id, ZERO)); }
  else if (chain === 'solana') { if (extra) out.push(extra); out.push(TWB + 'solana/assets/' + addr + '/logo.png'); }
  else if (/^0x[0-9a-fA-F]{40}$/.test(addr)) { if (tw) out.push(TWB + tw + '/assets/' + cksum(addr) + '/logo.png'); const id = CHID()[chain]; if (id) out.push(tkLogo(id, addr)); if (extra) out.push(extra); }
  else if (extra) out.push(extra);
  return [...new Set(out.filter(Boolean))]; }
window.wImgErr = (im) => { const l = (im.dataset.fb || '').split(' ').filter(Boolean); const n = l.shift(); if (!n) return im.remove(); im.dataset.fb = l.join(' '); im.src = n; };

/* ---- token discovery (keyless explorers) ---- */
const BS = { ethereum: 'eth.blockscout.com', optimism: 'explorer.optimism.io', gnosis: 'gnosis.blockscout.com', scroll: 'scroll.blockscout.com', arbitrum: 'arbitrum.blockscout.com', polygon: 'polygon.blockscout.com', base: 'base.blockscout.com', zksync: 'zksync.blockscout.com', celo: 'celo.blockscout.com', unichain: 'unichain.blockscout.com', soneium: 'soneium.blockscout.com', megaeth: 'megaeth.blockscout.com', mode: 'explorer.mode.network', worldchain: 'worldchain-mainnet.explorer.alchemy.com', ink: 'explorer.inkonchain.com' };
const RS = { avalanche: 43114, mantle: 5000, blast: 81457, plasma: 9745 };
const SPAMN = /https?:|www\.|\.(com|io|xyz|org|net|app|gg|fi|site|top|vip)\b|claim|visit|reward|airdrop|voucher|\bgift|bonus|t\.me|✅|🎁/i;
async function bsDisc(chain, addr) { const j = await wFetch(`https://${BS[chain]}/api/v2/addresses/${addr}/token-balances`, {}, 1);
  return (Array.isArray(j) ? j : []).filter((x) => x.token && x.token.type === 'ERC-20' && x.value && x.value !== '0').map((x) => { const t = x.token, d = +t.decimals || 0;
    return { chain, addr: t.address_hash, sym: t.symbol || '?', name: t.name || '', amt: toNum(BigInt(x.value), d), p0: t.exchange_rate != null ? +t.exchange_rate : null, icon: t.icon_url, rep: t.reputation || 'ok', holders: +t.holders_count || 0 }; }); }
async function rsDisc(chain, addr) { const out = []; let url = `https://api.routescan.io/v2/network/mainnet/evm/${RS[chain]}/address/${addr}/erc20-holdings?limit=200`;
  for (let i = 0; i < 3 && url; i++) { const j = await wFetch(url, {}, 1); (j.items || []).forEach((t) => { if (t.tokenQuantity && t.tokenQuantity !== '0') out.push({ chain, addr: t.tokenAddress, sym: t.tokenSymbol || '?', name: t.tokenName || '', amt: toNum(BigInt(t.tokenQuantity), +t.tokenDecimals || 0), p0: t.tokenPrice != null ? +t.tokenPrice : null, rep: 'ok' }); });
    url = j.link && j.link.next ? 'https://api.routescan.io' + j.link.next : null; }
  return out; }
async function evmDisc(addr, L, errs) { const ch = [...Object.keys(BS), ...Object.keys(RS)]; const res = await pool(ch, 6, (k) => Promise.race([BS[k] ? bsDisc(k, addr) : rsDisc(k, addr), new Promise((_, j) => setTimeout(() => j(new Error('t')), 25000))]).catch(() => { errs.push(k + ' (discovery)'); return []; }));
  const out = []; res.forEach((r) => Array.isArray(r) && out.push(...r)); const llamaOf = Object.fromEntries(L.chains.map((c) => [c.key, c.llama]));
  return out.map((t) => ({ chain: t.chain, sym: t.sym, name: t.name, amt: t.amt, addr: t.addr, key: llamaOf[t.chain] + ':' + t.addr.toLowerCase(), kind: 'token', p0: t.p0, rep: t.rep, holders: t.holders, disc: 1, logo: logoList(t.chain, t.addr, t.icon) })); }
/* ---- DEX pricing fallback (DexScreener, by chain + address) ---- */
const DXC = { gnosis: 'gnosischain' };
async function dexPx(list) { const by = {}; list.forEach((x) => { const c = DXC[x.chain] || x.chain; (by[c] = by[c] || new Set()).add(x.addr); }); const r = {};
  const jobs = []; Object.entries(by).forEach(([c, s]) => { const a = [...s]; for (let i = 0; i < a.length; i += 30) jobs.push([c, a.slice(i, i + 30)]); });
  await pool(jobs.slice(0, 12), 3, async ([c, a]) => { const j = await wFetch(`https://api.dexscreener.com/tokens/v1/${c}/${a.join(',')}`, {}, 1).catch(() => []);
    (Array.isArray(j) ? j : []).forEach((p) => { const k = (p.baseToken.address || '').toLowerCase(); const liq = (p.liquidity && p.liquidity.usd) || 0; const q = r[k];
      if (p.priceUsd && (!q || liq > q.liq)) r[k] = { p: +p.priceUsd, c: p.priceChange ? p.priceChange.h24 : null, liq, img: p.info && p.info.imageUrl, sym: p.baseToken.symbol }; }); });
  return r; }
async function wPrice(h) { const okD = (x) => x.rep === 'ok' && !SPAMN.test(x.sym + ' ' + (x.name || ''));
  const dq = h.filter((x) => x.disc && okD(x)).sort((a, b) => ((b.p0 || 0) * b.amt) - ((a.p0 || 0) * a.amt) || (b.holders || 0) - (a.holders || 0)).slice(0, 360); const dset = new Set(dq);
  const need = h.filter((x) => x.key && (x.disc ? dset.has(x) : x.p == null)).map((x) => x.key); const px = need.length ? await llamaPx(need) : {};
  h.forEach((x) => { const q = x.key && px[x.key]; if (q) { x.p = q.p; x.c = q.c; x.llp = 1; } });
  const nd = h.filter((x) => x.addr && ((x.disc && dset.has(x)) || x.chain === 'solana') && (!x.llp || /…/.test(x.sym)) && okD(x)).sort((a, b) => (b.holders || 0) - (a.holders || 0)).slice(0, 300);
  const dx = nd.length ? await dexPx(nd).catch(() => ({})) : {};
  h.forEach((x) => { const d = x.addr && dx[x.addr.toLowerCase()]; if (d && /…/.test(x.sym) && d.sym) x.sym = d.sym; if (d && (d.liq >= 1000 || x.p == null)) { if (!x.llp) { x.p = d.p; x.c = d.c; } x.liq = d.liq; if (d.img && Array.isArray(x.logo)) x.logo.push(d.img); }
    if (x.p == null && x.p0 != null) x.p = x.p0;
    x.v = x.p != null ? x.amt * x.p * (x.kind === 'aave-debt' ? -1 : 1) : null;
    if (x.disc || x.chain === 'solana') { const real = (x.llp || (x.liq || 0) >= 5000) && Math.abs(x.v || 0) >= 1; const bad = x.rep !== 'ok' || SPAMN.test(x.sym + ' ' + (x.name || '')) || x.p == null || (x.liq != null && x.liq < 1000 && !x.llp);
      x.spam = real ? false : x.spam || bad; } });
  return h; }
/* ---- page ---- */
const CHN = () => Object.fromEntries([...((EVM && EVM.chains) || []).map((c) => [c.key, c.name]), ['solana', 'Solana'], ['bitcoin', 'Bitcoin'], ['hyperliquid', 'Hyperliquid'], ['manual', 'Manual']]);
const isDust = (x) => x.v == null || x.spam;
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
/* ---- model ---- */
function wModel() { const ws = WS(); const gs = ws.groups; const sel = gs.some((g) => g.id === ws.sel) ? ws.sel : 'all'; const C = store.get(WC, {});
  const wal = (sel === 'all' ? gs : gs.filter((g) => g.id === sel)).flatMap((g) => g.wallets.map((w) => ({ ...w, g: g.name, gid: g.id })));
  const rows = wal.map((w) => ({ w, c: C[wKey(w)] })); const live = rows.filter((r) => !r.w.hidden);
  const chs = new Set(ws.chains || []); const chOk = (k) => !chs.size || chs.has(k);
  const allCh = {}; live.forEach((r) => { if (!r.c) return; r.c.h.forEach((x) => { if (!isDust(x)) allCh[x.chain] = (allCh[x.chain] || 0) + Math.abs(x.v); }); if (r.c.perp) allCh.hyperliquid = (allCh.hyperliquid || 0) + Math.abs(r.c.perp.v) + 1; });
  const hold = live.flatMap((r) => (r.c ? r.c.h : []).map((x) => ({ ...x, w: r.w }))).filter((x) => chOk(x.chain));
  const vis = hold.filter((x) => !isDust(x));
  const spot = vis.filter((x) => !DEFI.has(x.kind)), defi = vis.filter((x) => DEFI.has(x.kind));
  const perps = chOk('hyperliquid') ? live.filter((r) => r.c && r.c.perp).map((r) => ({ w: r.w, p: r.c.perp })).sort((a, b) => b.p.av - a.p.av) : [];
  const aave = live.flatMap((r) => (r.c && r.c.aave || []).filter((a) => chOk(a.chain)).map((a) => ({ ...a, w: r.w })));
  const sum = (a) => a.reduce((s, x) => s + (x.v || 0), 0);
  const tS = sum(spot), tD = sum(defi), tP = perps.reduce((s, x) => s + x.p.v, 0), total = tS + tD + tP;
  const d24 = vis.reduce((s, x) => s + (x.v && x.c != null ? x.v - x.v / (1 + x.c / 100) : 0), 0);
  const keyed = Object.values(vis.filter((x) => x.key && x.v).reduce((o, x) => { const q = o[x.key] = o[x.key] || { key: x.key, amt: 0, v: 0, sg: x.kind === 'aave-debt' ? -1 : 1 }; q.amt += x.amt; q.v += x.v; return o; }, {})).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 40);
  return { ws, gs, sel, wal, rows, live, chs, chOk, allCh, vis, spot, defi, perps, aave, tS, tD, tP, total, d24, keyed, hid: hold.length - vis.length, spamN: hold.length - vis.length, vkeys: new Set(live.map((r) => wKey(r.w))), loading: rows.some((r) => S.wLoad[wKey(r.w)]) }; }
function allocParts(M, mode) { const CN = CHN(); const g = {};
  const add = (k, v) => { if (v > 0) g[k] = (g[k] || 0) + v; };
  [...M.spot, ...M.defi].forEach((x) => { if (!(x.v > 0)) return; add(mode === 'asset' ? x.sym : mode === 'chain' ? CN[x.chain] || x.chain : mode === 'proto' ? x.proto || T('wSpotP') : tagName(x.w.tag) || T('wNoTag'), x.v); });
  M.perps.forEach((x) => add(mode === 'asset' ? 'Perps (HL)' : mode === 'chain' ? 'Hyperliquid' : mode === 'proto' ? T('wPerpP') : tagName(x.w.tag) || T('wNoTag'), x.p.v));
  const e = Object.entries(g).sort((a, b) => b[1] - a[1]); const top = e.slice(0, 7), rest = e.slice(7).reduce((s, x) => s + x[1], 0);
  return [...top.map(([n, v], i) => ({ n, v, c: PAL[i] })), ...(rest > 0 ? [{ n: 'Other', v: rest, c: PAL[9] }] : [])]; }

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
  if ((el = q('[data-wg]'))) { const w = ws(); w.sel = el.dataset.wg; WSset(w); if ($('#dlg').open) $('#dlg').close(); return pPortfolio(); }
  if (q('[data-wadd]')) return wDialog();
  if (q('[data-wmore]')) { S.wMore = !S.wMore; return pPortfolio(true); }
  if (q('[data-wref]')) return wRefresh(true);
  if (q('[data-wexp]')) return wExport();
  if ((el = q('[data-wdel]')) && confirm(T('wConfirm'))) { const [gid, a] = el.dataset.wdel.split('|'); const w = ws(); const g = w.groups.find((x) => x.id === gid); if (g) g.wallets = g.wallets.filter((x) => x.addr !== a); WSset(w); return pPortfolio(true); }
  if (q('[data-wdelg]') && confirm(T('wConfirm'))) { if ($('#dlg').open) $('#dlg').close(); const w = ws(); w.groups = w.groups.filter((x) => x.id !== w.sel); w.sel = 'all'; WSset(w); return pPortfolio(true); }
  if (q('[data-wren]')) { const w = ws(); const g = w.groups.find((x) => x.id === w.sel); const n = g && prompt(T('wRen'), g.name); if (n) { g.name = n.trim(); WSset(w); pPortfolio(true); } }
});
document.addEventListener('click', (e) => { const q = (s) => e.target.closest(s); let el; const ws = WS(); const save = () => { WSset(ws); pPortfolio(true); };
  if ((el = q('[data-wch]'))) { const k = el.dataset.wch; let c = new Set(ws.chains || []); if (!k) c = new Set(); else c.has(k) ? c.delete(k) : c.add(k); ws.chains = [...c]; return save(); }
  if (q('[data-wposall]')) { S.wPosAll = !S.wPosAll; return pPortfolio(true); }
  if (q('[data-wchall]')) { S.wChAll = !S.wChAll; return pPortfolio(true); }
  if ((el = q('[data-walloc]'))) { ws.alloc = el.dataset.walloc; return save(); }
  if ((el = q('[data-wrg]'))) { ws.range = el.dataset.wrg; return save(); }
  if ((el = q('[data-whide]'))) { const [gid, a] = el.dataset.whide.split('|'); const w = (ws.groups.find((x) => x.id === gid) || { wallets: [] }).wallets.find((x) => x.addr === a); if (w) { w.hidden = !w.hidden; save(); } return; }
  if ((el = q('[data-wedit]'))) { const [gid, a] = el.dataset.wedit.split('|'); return wEdit(gid, a); }
});
/* ---- Wallets v3 UI (Rabby-style) ---- */
Object.assign(I18N.en, { wNet: 'Net worth', wTokens: 'Tokens', wDefiT: 'DeFi', wPerpsT: 'Perps', wWalT: 'Wallets', wHide10: 'Hide < $10', wHidN: (n) => `${n} hidden`, wChains: 'Chains', wAllG: 'All wallets', wManage: 'Manage', wPerpInfo: 'Perps value = account equity (margin balance + unrealized PnL).', wPerpUni: (o) => `Unified account: the ${o} margin balance is the same USDC as in your spot balance, so it is removed from Tokens once. Total = spot + unrealized PnL — the same figure Hyperliquid shows.`, wPerpCls: 'Standard account: perp equity sits apart from spot, so it is added once in full.', wHeld: 'in perps margin', wSpamN: (n) => `${n} spam / unpriced hidden`, wDone: 'Done', wClear: 'Clear', w24s: '24h', wNoTok: 'No tokens above $10 here.' });
Object.assign(I18N.th, { wNet: 'มูลค่าสุทธิ', wTokens: 'เหรียญ', wDefiT: 'DeFi', wPerpsT: 'Perps', wWalT: 'กระเป๋า', wHide10: 'ซ่อน < $10', wHidN: (n) => `ซ่อน ${n}`, wChains: 'เชน', wAllG: 'กระเป๋าทั้งหมด', wManage: 'จัดการ', wPerpInfo: 'มูลค่า Perps = Equity ของบัญชี (ยอดมาร์จิ้น + PnL ที่ยังไม่รับรู้)', wPerpUni: (o) => `บัญชี Unified: ยอดมาร์จิ้น ${o} คือ USDC ก้อนเดียวกับในยอด spot จึงหักออกจากแท็บเหรียญหนึ่งครั้ง ยอดรวม = spot + PnL ที่ยังไม่รับรู้ ตรงกับที่ Hyperliquid แสดง`, wPerpCls: 'บัญชีปกติ: Equity ของ perp แยกจาก spot จึงบวกเต็มจำนวนหนึ่งครั้ง', wHeld: 'อยู่ในมาร์จิ้น perps', wSpamN: (n) => `ซ่อนสแปม / ไม่มีราคา ${n}`, wDone: 'เสร็จ', wClear: 'ล้าง', w24s: '24 ชม.', wNoTok: 'ไม่มีเหรียญมูลค่าเกิน $10' });
const lgx = (url, sym, chain) => { const l = (Array.isArray(url) ? url : [url]).filter(Boolean); const s = String(sym || '?').replace(/^\$/, ''); const c = LGC[[...s].reduce((a, ch) => a + ch.charCodeAt(0), 0) % LGC.length];
  return `<span class="tl" style="--lc:${c}"><b>${esc(s.slice(0, 1).toUpperCase())}</b>${l.length ? `<img src="${esc(l[0])}" data-fb="${esc(l.slice(1).join(' '))}" alt="" loading="lazy" onload="this.style.opacity=1" onerror="wImgErr(this)">` : ''}${chain ? `<i class="cb"><img src="${esc(chLogo(chain))}" alt="" loading="lazy" onerror="this.remove()"></i>` : ''}</span>`; };
const hide10 = () => WS().hide10 !== false;
const amtF = (a) => { a = Math.abs(a); return a >= 1e9 ? (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a.toLocaleString('en-US', { maximumFractionDigits: a >= 1000 ? 2 : a >= 1 ? 4 : 6 }); };
const pxF = (p) => { if (p == null) return '–'; if (p >= 1) return '$' + p.toLocaleString('en-US', { maximumFractionDigits: p >= 1000 ? 2 : 4 }); if (p <= 0) return '$0'; const z = Math.floor(-Math.log10(p)); if (z >= 5) { const sub = '₀₁₂₃₄₅₆₇₈₉'; return '$0.0' + String(z).split('').map((d) => sub[d]).join('') + Math.round(p * 10 ** (z + 3)); } return '$' + p.toFixed(z + 4).replace(/0+$/, ''); };
const dt = (t, rg) => new Date(t).toLocaleString(LANG === 'th' ? 'th-TH' : 'en-US', rg === '24h' || rg === '7d' ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' } : { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Tokyo' }) + ' JST';
function chartV3(pts) { if (pts.length < 2) return ''; const W = 1000, H = 220, pt = 14, pb = 6;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t; let lo = Math.min(...pts.map((p) => p.v)), hi = Math.max(...pts.map((p) => p.v)); const pv = (hi - lo) * 0.1 || Math.abs(hi) * 0.01 || 1; lo -= pv; hi += pv * 0.6;
  const X = (t) => (t - t0) / (t1 - t0 || 1) * W, Y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  const P = pts.map((p) => [X(p.t), Y(p.v)]); // monotone-ish smoothing (Catmull-Rom, tension 1/6), clamp control points to segment y-range to avoid overshoot
  const path = P.map((p, i) => { if (!i) return `M${p[0].toFixed(1)},${p[1].toFixed(1)}`; const p0 = P[i - 2] || P[i - 1], p1 = P[i - 1], p3 = P[i + 1] || p; const mn = Math.min(p1[1], p[1]), mx = Math.max(p1[1], p[1]); const cl = (v) => Math.max(mn, Math.min(mx, v));
    return `C${(p1[0] + (p[0] - p0[0]) / 6).toFixed(1)},${cl(p1[1] + (p[1] - p0[1]) / 6).toFixed(1)} ${(p[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${cl(p[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p[0].toFixed(1)},${p[1].toFixed(1)}`; }).join('');
  const up = pts[pts.length - 1].v >= pts[0].v; const ne = pts.filter((p) => p.e).length; const ex = ne ? (P[Math.min(ne, P.length - 1)][0] / W * 100).toFixed(2) : 0;
  return `<div class="wchart ${up ? 'is-up' : 'is-dn'}" data-pts='${esc(JSON.stringify(pts.map((p) => [p.t, Math.round(p.v * 100) / 100, p.e ? 1 : 0])))}' data-lo="${lo}" data-hi="${hi}" data-pt="${pt / H}" data-pb="${pb / H}">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="wg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".22"/><stop offset=".7" stop-color="currentColor" stop-opacity=".04"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>${ne ? `<mask id="wm3"><rect width="${W}" height="${H}" fill="#fff"/><rect width="${P[Math.min(ne, P.length - 1)][0]}" height="${H}" fill="#777"/></mask>` : ''}</defs>
    <path d="${path}L${W},${H}L0,${H}Z" fill="url(#wg3)"/><path class="ln" d="${path}" ${ne ? 'mask="url(#wm3)"' : ''}/></svg>
    ${ne ? `<span class="west" style="width:${ex}%"></span>` : ''}<i class="wx"></i><i class="wdot"></i></div>`; }
function wTween(el, to) { const from = S.wHeroV == null ? to * 0.96 : S.wHeroV; S.wHeroV = to; if (Math.abs(from - to) < 0.005) { el.innerHTML = heroHTML(to); return; } const t0 = performance.now(), d = 700;
  const step = (t) => { if (!el.isConnected || S.wScrub) return; const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.innerHTML = heroHTML(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
const heroHTML = (v) => { const s = wm(v); const i = s.indexOf('.'); return i > 0 ? `${s.slice(0, i)}<small>${s.slice(i)}</small>` : s; };
function pPortfolio(soft) {
  const M = wModel(); const { ws, gs, sel, wal, rows, loading } = M; const CN = CHN(); const H10 = hide10();
  const rg = RANGES[ws.range] ? ws.range : '7d'; const tab = ['tokens', 'defi', 'perps', 'wallets'].includes(ws.tab) ? ws.tab : 'tokens';
  const gName = sel === 'all' ? T('wAllG') : (gs.find((g) => g.id === sel) || {}).name;
  const chKeys = Object.entries(M.allCh).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  const chBtn = `<button class="wpill" data-wchsheet>${M.chs.size ? `<span class="wstack">${[...M.chs].slice(0, 3).map((k) => `<img src="${esc(chLogo(k))}" alt="">`).join('')}</span>${M.chs.size === 1 ? esc(CN[[...M.chs][0]] || [...M.chs][0]) : M.chs.size + ' ' + esc(T('wChains'))}` : esc(T('wAllCh'))}<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>`;
  const top = `<div class="wtop"><button class="wpill wgrp" data-wgsheet><b>${esc(gName || T('wAllG'))}</b><span class="sub">${wal.length - wal.filter((w) => w.hidden).length}</span><svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>${chKeys.length > 1 ? chBtn : ''}<span class="wsp"></span><button class="wib ${loading ? 'spin' : ''}" data-wref title="${esc(T('wRefresh'))}" aria-label="${esc(T('wRefresh'))}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg></button><button class="wib pri" data-wadd title="${esc(T('wAdd'))}" aria-label="${esc(T('wAdd'))}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg></button></div>`;
  if (!wal.length) { $('#main').innerHTML = `<div class="page w3">${top}<div class="empty">${esc(T('wEmpty'))}<div style="margin-top:14px"><button class="btn pri" data-wadd>+ ${esc(T('wAdd'))}</button></div></div>${foot()}</div>`; bindImp(); if (!soft) wRefresh(false); return; }
  const S1 = wSeries(M, rg); const hp = S1.pts; const base24 = M.total - M.d24; const p24 = base24 ? M.d24 / Math.abs(base24) * 100 : 0;
  const upd = rows.map((r) => r.c && r.c.t).filter(Boolean); const updT = upd.length ? new Date(Math.min(...upd)).toISOString() : null;
  const hero = `<section class="whero"><div class="wlbl">${esc(T('wNet'))}${updT ? ` · <span title="${esc(jstFull(updT))}">${esc(relT(updT))}</span>` : ''}</div>
    <div class="wbig num" id="wbig">${heroHTML(S.wHeroV == null ? M.total : S.wHeroV)}</div>
    <div class="wchg num" id="wchg" data-rest="1"><span class="${cls(M.d24)}">${wms(M.d24)} (${pct(p24)})</span> <span class="sub">${esc(T('w24s'))}</span></div></section>`;
  const chart = `<section class="wchartbox" data-rg="${rg}">${hp.length > 1 ? chartV3(hp) : `<div class="wchart none">${M.keyed.length ? '<div class="sk"></div>' : `<span class="sub">${esc(T('wNoHist'))}</span>`}</div>`}
    <div class="wrgs">${Object.keys(RANGES).map((r) => `<button data-wrg="${r}" aria-pressed="${r === rg}">${r === 'All' && LANG === 'th' ? 'ทั้งหมด' : r}</button>`).join('')}</div>${S1.est ? `<p class="westn sub">${esc(T('wEstNote'))}</p>` : ''}</section>`;
  const tabs = `<nav class="wtabs" role="tablist">${[['tokens', T('wTokens'), M.tS], ['defi', T('wDefiT'), M.tD], ['perps', T('wPerpsT'), M.tP], ['wallets', T('wWalT'), null]].map(([k, n, v]) => `<button role="tab" data-wtab="${k}" aria-selected="${k === tab}"><span>${esc(n)}</span>${v != null && (v || k === 'tokens') ? `<small class="num">${wm(v)}</small>` : ''}</button>`).join('')}</nav>`;
  const hideBox = (n) => `<div class="wbar"><label class="wchk"><input type="checkbox" data-wh10 ${H10 ? 'checked' : ''}><span></span>${esc(T('wHide10'))}</label>${n ? `<span class="sub">${esc(TF('wHidN', n))}</span>` : ''}</div>`;
  const row = (x) => `<div class="trow">${lgx(x.logo, x.sym, x.chain)}<div class="tn"><b>${esc(x.sym)}</b><small class="num">${amtF(x.amt)}${x.held ? ` · <span title="${esc(T('wHeld'))}">+${amtF(x.held)} ${esc(T('wHeld'))}</span>` : ''}${x.tag ? ` · ${x.tag}` : ''}</small></div><div class="tp num">${pxF(x.p)}<small class="${cls(x.c)}">${x.c != null ? pct(x.c) : ''}</small></div><div class="tv num ${x.v < 0 ? 'dn' : ''}">${wm(x.v || 0)}</div></div>`;
  const agg = (list) => Object.values(list.reduce((o, x) => { const k = x.chain + '|' + (x.addr || x.key || x.sym) + '|' + x.kind; const q = o[k] = o[k] || { ...x, amt: 0, v: 0, held: 0 }; q.amt += x.amt; q.v += x.v || 0; q.held += x.held || 0; return o; }, {})).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  let body = '';
  if (tab === 'tokens') { const all = agg(M.spot); const shown = all.filter((x) => !H10 || Math.abs(x.v) >= 10); const lim = S.wMore ? 999 : 40;
    body = hideBox(all.length - shown.length) + `<div class="tlist">${shown.slice(0, lim).map(row).join('') || `<p class="sub wpad">${esc(loading ? T('wLoading') : T('wNoTok'))}</p>`}</div>${shown.length > lim || S.wMore ? `<button class="wmore" data-wmore>${esc(S.wMore ? T('wLess') : TF('wMoreN', shown.length - lim))}</button>` : ''}${M.spamN ? `<p class="sub wpad">${esc(TF('wSpamN', M.spamN))}</p>` : ''}`; }
  if (tab === 'defi') { const kindTag = (k) => k === 'aave' ? T('wSupplied') : k === 'aave-debt' ? T('wBorrowed') : k === 'lst' ? 'LST' : k === 'pendle' ? 'Pendle' : k;
    const all = agg(M.defi).map((x) => ({ ...x, tag: esc(kindTag(x.kind)) })); const shown = all.filter((x) => !H10 || Math.abs(x.v) >= 10); const byP = {}; shown.forEach((x) => (byP[x.proto || 'Other'] = byP[x.proto || 'Other'] || []).push(x));
    body = hideBox(all.length - shown.length) + M.aave.map((a) => `<div class="wcard"><div class="wch">${lgx(chLogo(a.chain), CN[a.chain] || a.chain)}<b>Aave v3 · ${esc(CN[a.chain] || a.chain)}</b><span class="wsp"></span>${a.debt > 0 ? `<span class="wpillsm hb-${lvOf(hfSafe(a.hf))}">${esc(T('wHF'))} ${a.hf != null ? a.hf.toFixed(2) : '∞'}</span>` : ''}</div>
      <div class="wkv3"><div><small>${esc(T('wSupplied'))}</small><b class="num">${wm(a.coll)}</b></div><div><small>${esc(T('wBorrowed'))}</small><b class="num">${wm(a.debt)}</b></div><div><small>${esc(T('wNet'))}</small><b class="num">${wm(a.coll - a.debt)}</b></div><div><small>LTV / LT</small><b class="num">${(a.coll ? a.debt / a.coll * 100 : 0).toFixed(1)}% / ${(a.lt * 100).toFixed(0)}%</b></div></div>${a.debt > 0 ? hbar(hfSafe(a.hf)) : ''}</div>`).join('')
      + Object.entries(byP).map(([p, l]) => `<div class="wgrp"><div class="wgh"><b>${esc(p)}</b><span class="num">${wm(l.reduce((s, x) => s + x.v, 0))}</span></div><div class="tlist">${l.map(row).join('')}</div></div>`).join('') + (!shown.length && !M.aave.length ? `<p class="sub wpad">${esc(loading ? T('wLoading') : T('wNoChain'))}</p>` : ''); }
  if (tab === 'perps') body = M.perps.length ? M.perps.map(({ w, p }) => { const mr = p.cav > 0 ? p.mm / p.cav : 0; const tip = `${T('wPerpInfo')} ${p.unified ? TF('wPerpUni', wm(p.overlap || 0)) : T('wPerpCls')}`;
    const kv = (l, v, c = '') => `<div><small>${esc(l)}</small><b class="num ${c}">${v}</b></div>`;
    return `<div class="wcard wperp3"><div class="wch">${lgx(chLogo('hyperliquid'), 'H')}<div><b>${esc(w.label || wShort(w.addr))}</b><small class="sub mono">${esc(wShort(w.addr))} · ${esc(p.unified ? 'Unified' : 'Standard')}</small></div><span class="wsp"></span><div class="r"><small class="sub">${esc(T('wEq'))} <button class="winfo" data-wtip aria-label="info">i</button></small><b class="num wbig2">${wm(p.av)}</b></div></div>
      <div class="wtip" hidden>${esc(tip)}<div class="wmath num">${p.unified ? `${esc(T('wEq'))} ${wm(p.av)} − ${esc(T('wMB'))} ${wm(p.overlap || 0)} = ${esc(T('wUpnl'))} ${wms(p.av - (p.overlap || 0))}` : `${esc(T('wMB'))} ${wm(p.av - p.upnl)} + ${esc(T('wUpnl'))} ${wms(p.upnl)} = ${wm(p.av)}`}</div></div>
      <div class="wkv3">${kv(T('wMB'), wm(p.av - p.upnl))}${kv(T('wUpnl'), wms(p.upnl), cls(p.upnl))}${kv(T('wMU'), wm(p.mu))}${kv(T('wWd'), wm(p.wd))}${kv(T('wNtl'), wm(p.ntl))}${kv(T('wMR'), (mr * 100).toFixed(1) + '%')}</div>${hbar(1 - mr, esc(T('wMR')) + ' ' + (mr * 100).toFixed(1) + '%')}
      ${p.pos.length ? `<div class="tlist">${p.pos.sort((a, b) => b.val - a.val).slice(0, S.wPosAll ? 999 : 8).map((q) => `<div class="trow">${lgx(q.logo, q.coin)}<div class="tn"><b>${esc(q.coin)} <span class="wpillsm ${q.sz > 0 ? 'up' : 'dn'}">${esc(q.sz > 0 ? T('wLong') : T('wShortS'))}${q.lev != null ? ' ' + q.lev + '×' : ''}</span></b><small class="num">${amtF(q.sz)} · ${wm(q.val)}</small></div><div class="tp num">${pxF(q.mark)}<small class="sub">${esc(T('wLiq'))} ${q.liq ? pxF(q.liq) : '–'}${q.dist != null ? ` · ${q.dist >= 1 ? '≥100' : (q.dist * 100).toFixed(1)}%` : ''}</small></div><div class="tv num ${cls(q.pnl)}">${wms(q.pnl)}<small>${pct(q.roe)}</small></div></div>`).join('')}</div>${p.pos.length > 8 ? `<button class="wmore" data-wposall>${esc(S.wPosAll ? T('wLess') : TF('wMoreN', p.pos.length - 8))}</button>` : ''}` : `<p class="sub wpad">${esc(T('wNoPos'))}</p>`}</div>`; }).join('') : `<p class="sub wpad">${esc(loading ? T('wLoading') : T('wNoPos'))}</p>`;
  if (tab === 'wallets') { const mode = ws.alloc || 'chain'; const parts = allocParts(M, mode); const ptot = parts.reduce((s, p) => s + p.v, 0) || 1;
    body = `<div class="wcard"><div class="wch"><b>${esc(T('wAlloc'))}</b><span class="wsp"></span><div class="seg">${Object.entries(T('wAllocBy')).map(([k, n]) => `<button data-walloc="${k}" aria-pressed="${k === mode}">${esc(n)}</button>`).join('')}</div></div><div class="wabar">${parts.map((p) => `<i style="width:${(p.v / ptot * 100).toFixed(2)}%;background:${p.c}"></i>`).join('')}</div><ul class="walg">${parts.map((p) => `<li><i style="background:${p.c}"></i>${esc(p.n)}<span class="num">${(p.v / ptot * 100).toFixed(1)}%</span></li>`).join('')}</ul></div>
    <div class="tlist">${rows.map((r) => { const v = (r.c ? r.c.h : []).filter((x) => !isDust(x)).reduce((s, x) => s + (x.v || 0), 0) + (r.c && r.c.perp ? r.c.perp.v : 0); const id = esc(r.w.gid + '|' + r.w.addr);
      return `<div class="trow wwr${r.w.hidden ? ' off' : ''}">${lgx(logoList(r.w.type === 'evm' ? 'ethereum' : r.w.type === 'sol' ? 'solana' : 'bitcoin', ZERO), r.w.type)}<div class="tn"><b>${esc(r.w.label || wShort(r.w.addr))}${r.w.tag ? ` <span class="wpillsm">${esc(tagName(r.w.tag))}</span>` : ''}</b><small class="mono">${esc(r.w.type === 'manual' ? T('wLegacy') : wShort(r.w.addr))}${sel === 'all' ? ' · ' + esc(r.w.g) : ''}${r.w.hidden ? ' · ' + esc(T('wHiddenT')) : ''}${r.c && r.c.err ? ` · <span class="dn">${esc(T('wErr'))}</span>` : ''}</small></div><div class="tp"><span class="wact"><button class="link sm" data-wedit="${id}">${esc(T('wEdit'))}</button><button class="link sm" data-whide="${id}">${esc(r.w.hidden ? T('wShow') : T('wHide'))}</button><button class="link sm dn" data-wdel="${id}">${esc(T('wDel'))}</button></span></div><div class="tv num">${r.c ? wm(v) : '<span class="sk" style="display:inline-block;width:60px;height:14px"></span>'}</div></div>`; }).join('')}</div>`; }
  $('#main').innerHTML = `<div class="page w3">${top}${hero}${chart}${tabs}<section class="wbody">${body}</section>${foot()}</div>`;
  bindImp(); wTween($('#wbig'), M.total); S.wTot = M.total;
  if (!soft) wRefresh(false);
}
function foot() { return `<div class="wfoot"><a class="link" href="#/journal">${esc(T('wJournal'))}</a><span class="wsp"></span><button class="link" data-wexp>${esc(T('exp'))}</button><label class="link" style="cursor:pointer">${esc(T('imp'))}<input type="file" accept="application/json,.json" id="wimp" hidden></label></div>
  <details class="wcov"><summary>${esc(T('wCover'))}</summary><ul class="bl">${T('wCoverTxt').map((s) => `<li>${esc(s)}</li>`).join('')}</ul></details><p class="sub wsaved">${esc(T('wSaved'))}</p>`; }
function bindImp() { const f = $('#wimp'); if (f) f.addEventListener('change', async (e) => { const fl = e.target.files[0]; if (!fl) return; try { const j = JSON.parse(await fl.text()); if (!Array.isArray(j.groups)) throw 0; WSset({ ...WS(), groups: j.groups, sel: 'all' }); toast(TF('wImported', j.groups.length)); pPortfolio(); } catch (er) { toast(T('wBadFile')); } }); }
function wSheet(title, html, onclose) { const d = $('#dlg'); d.classList.add('wsheet'); d.innerHTML = `<form method="dialog"><div class="dlg-h"><h2>${esc(title)}</h2><button class="icon-btn" value="cancel" aria-label="close">✕</button></div><div class="dlg-b">${html}</div></form>`;
  d.addEventListener('close', () => { d.classList.remove('wsheet'); onclose && onclose(); }, { once: true }); d.showModal(); }
function wChSheet() { const M = wModel(); const CN = CHN(); const ks = Object.entries(M.allCh).sort((a, b) => b[1] - a[1]);
  wSheet(T('wChains'), `<button type="button" class="wsrow" data-wchx=""><span class="tl"><b>∗</b></span><b>${esc(T('wAllCh'))}</b><span class="wsp"></span><span class="wck ${!M.chs.size ? 'on' : ''}"></span></button>${ks.map(([k, v]) => `<button type="button" class="wsrow" data-wchx="${esc(k)}">${lgx(chLogo(k), CN[k] || k)}<b>${esc(CN[k] || k)}</b><span class="wsp"></span><span class="num sub">${wm(v)}</span><span class="wck ${M.chs.has(k) ? 'on' : ''}"></span></button>`).join('')}`, () => pPortfolio(true)); }
function wGSheet() { const ws = WS(); const C = store.get(WC, {}); const gv = (g) => g.wallets.filter((w) => !w.hidden).reduce((s, w) => { const c = C[wKey(w)]; return s + (c ? c.h.filter((x) => !isDust(x)).reduce((a, x) => a + (x.v || 0), 0) + (c.perp ? c.perp.v : 0) : 0); }, 0);
  wSheet(T('wGroup'), `<button type="button" class="wsrow" data-wg="all"><b>${esc(T('wAllG'))}</b><span class="wsp"></span><span class="num sub">${wm(ws.groups.reduce((s, g) => s + gv(g), 0))}</span><span class="wck ${ws.sel === 'all' ? 'on' : ''}"></span></button>${ws.groups.map((g) => `<button type="button" class="wsrow" data-wg="${esc(g.id)}"><b>${esc(g.name)}</b><small class="sub">${g.wallets.length}</small><span class="wsp"></span><span class="num sub">${wm(gv(g))}</span><span class="wck ${ws.sel === g.id ? 'on' : ''}"></span></button>`).join('')}
    ${ws.sel !== 'all' ? `<div class="wsact"><button type="button" class="btn ghost" data-wren>${esc(T('wRen'))}</button><button type="button" class="btn ghost dn" data-wdelg>${esc(T('wDelG'))}</button></div>` : ''}`); }
document.addEventListener('click', (e) => { const q = (s) => e.target.closest(s); let el; const ws = WS(); const save = () => { WSset(ws); pPortfolio(true); };
  if (q('[data-wchsheet]')) return wChSheet();
  if (q('[data-wgsheet]')) return wGSheet();
  if ((el = q('[data-wchx]'))) { const k = el.dataset.wchx; let c = new Set(ws.chains || []); if (!k) c = new Set(); else c.has(k) ? c.delete(k) : c.add(k); ws.chains = [...c]; WSset(ws); const M = wModel();
    document.querySelectorAll('#dlg [data-wchx]').forEach((b) => b.querySelector('.wck').classList.toggle('on', b.dataset.wchx ? M.chs.has(b.dataset.wchx) : !M.chs.size)); return; }
  if ((el = q('[data-wtab]'))) { ws.tab = el.dataset.wtab; return save(); }
  if ((el = q('[data-wtip]'))) { const t = el.closest('.wcard').querySelector('.wtip'); t.hidden = !t.hidden; return; }
});
document.addEventListener('change', (e) => { if (e.target.matches('[data-wh10]')) { const w = WS(); w.hide10 = e.target.checked; WSset(w); pPortfolio(true); } });
const wScrub = (e) => { const c = e.target.closest && e.target.closest('.wchart[data-pts]'); const big = $('#wbig'), chg = $('#wchg');
  if (!c) { if (S.wScrub) { S.wScrub = 0; document.querySelectorAll('.wchart.on').forEach((x) => x.classList.remove('on')); if (big) big.innerHTML = heroHTML(S.wTot); if (chg && S.wChg) chg.innerHTML = S.wChg; } return; }
  const r = c.getBoundingClientRect(); const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; const pts = JSON.parse(c.dataset.pts); const t0 = pts[0][0], t1 = pts[pts.length - 1][0];
  const t = t0 + Math.max(0, Math.min(1, cx / r.width)) * (t1 - t0); let b = pts[0]; for (const p of pts) if (Math.abs(p[0] - t) < Math.abs(b[0] - t)) b = p;
  const lo = +c.dataset.lo, hi = +c.dataset.hi, pt = +c.dataset.pt, pb = +c.dataset.pb; const xp = (b[0] - t0) / (t1 - t0 || 1) * 100, yp = (pt + (1 - (b[1] - lo) / (hi - lo)) * (1 - pt - pb)) * 100;
  c.classList.add('on'); c.querySelector('.wx').style.left = xp + '%'; const d = c.querySelector('.wdot'); d.style.left = xp + '%'; d.style.top = yp + '%';
  if (!S.wScrub) { S.wScrub = 1; S.wChg = chg ? chg.innerHTML : ''; } const ch = b[1] - pts[0][1]; const rg = c.closest('[data-rg]').dataset.rg;
  if (big) big.innerHTML = heroHTML(b[1]); if (chg) chg.innerHTML = `<span class="${cls(ch)}">${wms(ch)} (${pct(pts[0][1] ? ch / Math.abs(pts[0][1]) * 100 : 0)})</span> <span class="sub">${esc(dt(b[0], rg))}${b[2] ? ' · ' + esc(T('wEst')) : ''}</span>`; };
document.addEventListener('mousemove', wScrub); document.addEventListener('touchmove', wScrub, { passive: true }); document.addEventListener('touchstart', wScrub, { passive: true });
document.addEventListener('touchend', () => setTimeout(() => wScrub({ target: document.body }), 600));
