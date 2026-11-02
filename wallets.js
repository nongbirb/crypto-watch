/* KMS Capital — watch-only wallet groups. Keyless, all fetched in the browser (public RPCs, mempool.space, Jupiter, DefiLlama, Hyperliquid). */
Object.assign(I18N.en, { portfolio: 'Wallets', wTitle: 'Wallets', wAll: 'All', wAdd: 'Add wallet', wGroup: 'Group', wNewGroup: 'New group name', wAddr: 'Addresses (one per line, optional label after a space)', wLabel: 'Label', wRefresh: 'Refresh', wTotal: 'Total value', w24: '24h change', wWallets: 'Wallets', wUpd: 'Updated', wAlloc: 'Allocation', wByChain: 'By chain', wByTok: 'Holdings', wByWal: 'Wallets', wDust: 'Show small / unpriced tokens', wEmpty: 'Add a group and paste EVM, Solana or Bitcoin addresses (or an xpub). Watch-only: no keys, no wallet connection, nothing leaves this device except public address lookups.', wDel: 'Remove', wDelG: 'Delete group', wRen: 'Rename group', wLoading: 'Loading…', wErr: 'Failed', wDebt: 'debt', wCover: 'Coverage', wSaved: 'Groups are saved on this device only. Export a backup now and then.', wBad: 'Not a recognised EVM / Solana / BTC address', wJournal: 'Trade journal →', wLegacy: 'Manual (old portfolio)', wConfirm: 'Remove this?', wLess: 'Show less', wMoreN: (n) => `Show ${n} more`, wOtherN: (n) => `${n} more chains`, wImported: (n) => `Imported ${n} groups`, wBadFile: 'That file is not a wallet-groups export.',
  wCoverTxt: ['EVM: native + ~2,500 top tokens on 32 chains via public RPC + Multicall3, priced by DefiLlama.', 'DeFi: Aave v3 supplied (aTokens) and borrowed (debt, shown negative); LSTs/LRTs (stETH, wstETH, cbETH, rETH, weETH…); Pendle PT/YT and Morpho vault tokens only if listed. Other LP / staking positions are not seen.', 'Hyperliquid: perp account value + spot balances for EVM addresses.', 'Solana: SOL + all SPL / Token-2022 balances via Jupiter holdings, priced by Jupiter (staked SOL and DeFi positions not included).', 'Bitcoin: address balance via mempool.space; xpub/ypub/zpub via blockchain.info.'] });
Object.assign(I18N.th, { portfolio: 'กระเป๋า', wTitle: 'กระเป๋า', wAll: 'ทั้งหมด', wAdd: 'เพิ่มกระเป๋า', wGroup: 'กลุ่ม', wNewGroup: 'ชื่อกลุ่มใหม่', wAddr: 'ที่อยู่ (บรรทัดละหนึ่ง ใส่ชื่อเล่นตามหลังเว้นวรรคได้)', wLabel: 'ชื่อเล่น', wRefresh: 'รีเฟรช', wTotal: 'มูลค่ารวม', w24: 'เปลี่ยนแปลง 24 ชม.', wWallets: 'กระเป๋า', wUpd: 'อัปเดต', wAlloc: 'สัดส่วน', wByChain: 'แยกตามเชน', wByTok: 'เหรียญที่ถือ', wByWal: 'แยกตามกระเป๋า', wDust: 'แสดงเหรียญมูลค่าน้อย / ไม่มีราคา', wEmpty: 'สร้างกลุ่มแล้ววางที่อยู่ EVM, Solana หรือ Bitcoin (หรือ xpub) ได้เลย ดูอย่างเดียว ไม่ใช้คีย์ ไม่ต้องเชื่อมกระเป๋า ไม่มีข้อมูลออกจากเครื่องนอกจากการค้นที่อยู่สาธารณะ', wDel: 'ลบ', wDelG: 'ลบกลุ่ม', wRen: 'เปลี่ยนชื่อกลุ่ม', wLoading: 'กำลังโหลด…', wErr: 'ดึงข้อมูลไม่สำเร็จ', wDebt: 'หนี้', wCover: 'ขอบเขตข้อมูล', wSaved: 'กลุ่มบันทึกไว้ในเครื่องนี้เท่านั้น ควร Export สำรองไว้เป็นระยะ', wBad: 'ไม่ใช่ที่อยู่ EVM / Solana / BTC ที่รู้จัก', wJournal: 'บันทึกเทรด →', wLegacy: 'กรอกเอง (พอร์ตเดิม)', wConfirm: 'ลบรายการนี้ใช่ไหม?', wLess: 'ย่อ', wMoreN: (n) => `ดูอีก ${n} รายการ`, wOtherN: (n) => `อีก ${n} เชน`, wImported: (n) => `นำเข้าแล้ว ${n} กลุ่ม`, wBadFile: 'ไฟล์นี้ไม่ใช่ไฟล์กลุ่มกระเป๋า',
  wCoverTxt: ['EVM: เหรียญหลัก + โทเคนยอดนิยม ~2,500 ตัวบน 32 เชน ผ่าน RPC สาธารณะ + Multicall3 ราคาจาก DefiLlama', 'DeFi: Aave v3 ฝาก (aToken) และยืม (หนี้ แสดงเป็นค่าติดลบ), LST/LRT (stETH, wstETH, cbETH, rETH, weETH…), Pendle PT/YT และ Morpho vault เฉพาะที่อยู่ในรายการ ส่วน LP / staking อื่นยังมองไม่เห็น', 'Hyperliquid: มูลค่าบัญชี perp + ยอด spot ของที่อยู่ EVM', 'Solana: SOL + SPL / Token-2022 ทั้งหมด ผ่าน Jupiter ราคาจาก Jupiter (ไม่รวม SOL ที่ stake และตำแหน่ง DeFi)', 'Bitcoin: ยอดตามที่อยู่ผ่าน mempool.space, xpub/ypub/zpub ผ่าน blockchain.info'] });

const WLK = 'kms-wallets', WC = 'kms-wcache', WTTL = 10 * 60e3;
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
async function evmChain(c, toks, addr, mc) {
  const all = [[mc, '0x4d2301cc' + wpad(addr)], ...toks.map((t) => [t[0], '0x70a08231' + wpad(addr)])]; const res = [];
  for (let i = 0; i < all.length; i += 250) res.push(...dec3(await rpc(c.rpc, 'eth_call', [{ to: mc, data: agg3(all.slice(i, i + 250)) }, 'latest'])));
  const out = []; if (res[0]) out.push({ chain: c.key, sym: c.native, amt: toNum(res[0], 18), key: 'coingecko:' + c.native_cg, kind: 'native' });
  toks.forEach((t, i) => { const b = res[i + 1]; if (b) out.push({ chain: c.key, sym: t[1], amt: toNum(b, t[2]), key: c.llama + ':' + (t[4] || t[0]), kind: t[3] }); });
  return out; }
async function evmAddr(addr) { const L = await evmList(); const errs = [];
  const parts = await pool(L.chains, 8, (c) => evmChain(c, L.tokens[c.key] || [], addr, L.multicall3).catch((e) => { errs.push(c.name); return []; }));
  const h = parts.flat().filter((x) => Array.isArray ? x && x.chain : 0); h.push(...await hlAddr(addr).catch(() => { errs.push('Hyperliquid'); return []; }));
  return { h, errs }; }
async function hlAddr(addr) { const P = (b) => wFetch('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  const [cs, sp] = await Promise.all([P({ type: 'clearinghouseState', user: addr }), P({ type: 'spotClearinghouseState', user: addr })]); const out = [];
  const av = +((cs.marginSummary || {}).accountValue || 0); if (av > 0.01) out.push({ chain: 'hyperliquid', sym: 'Perp equity', amt: av, p: 1, kind: 'hl' });
  const bal = (sp.balances || []).filter((b) => +b.total > 0); if (bal.length) { const mids = await P({ type: 'allMids' }).catch(() => ({}));
    bal.forEach((b) => { const p = /^USD[CTHE]?/.test(b.coin) ? 1 : +mids[b.coin] || null; out.push({ chain: 'hyperliquid', sym: b.coin, amt: +b.total, p, kind: 'hl' }); }); }
  return out; }

/* ---- Solana ---- */
const SOLM = 'So11111111111111111111111111111111111111112';
async function solAddr(addr) { // Jupiter Ultra holdings (keyless, CORS) — public Solana RPCs now block getTokenAccountsByOwner
  const j = await wFetch('https://lite-api.jup.ag/ultra/v1/holdings/' + addr); const m = {}; if (+j.uiAmount > 0) m[SOLM] = +j.uiAmount;
  Object.entries(j.tokens || {}).forEach(([mint, accs]) => { const u = accs.reduce((s, x) => s + (x.excludeFromNetWorth ? 0 : +x.uiAmountString || 0), 0); if (u > 0) m[mint] = (m[mint] || 0) + u; });
  const ids = Object.keys(m).slice(0, 400); const px = {}, meta = {};
  for (let i = 0; i < ids.length; i += 50) { Object.assign(px, await wFetch('https://lite-api.jup.ag/price/v3?ids=' + ids.slice(i, i + 50).join(','), {}, 4).catch(() => ({}))); if (i) await sleep(250); }
  const val = ids.filter((k) => px[k] && px[k].usdPrice * m[k] >= 1);
  for (let i = 0; i < val.length; i += 50) ((await wFetch('https://lite-api.jup.ag/tokens/v2/search?query=' + val.slice(i, i + 50).join(','), {}, 4).catch(() => [])) || []).forEach((x) => meta[x.id] = x);
  return { h: ids.map((k) => ({ chain: 'solana', sym: k === SOLM ? 'SOL' : (meta[k] && meta[k].symbol) || wShort(k), amt: m[k], p: px[k] ? px[k].usdPrice : null, c: px[k] ? px[k].priceChange24h : null, kind: 'token', spam: meta[k] ? !meta[k].isVerified && (meta[k].organicScore || 0) < 20 : true })), errs: [] }; }

/* ---- Bitcoin ---- */
async function btcAddr(addr, type) { let sats;
  if (type === 'xpub') sats = (await wFetch('https://blockchain.info/multiaddr?active=' + addr + '&n=0&cors=true')).wallet.final_balance;
  else { const j = await wFetch('https://mempool.space/api/address/' + addr); const s = (o) => o.funded_txo_sum - o.spent_txo_sum; sats = s(j.chain_stats) + s(j.mempool_stats); }
  return { h: sats ? [{ chain: 'bitcoin', sym: 'BTC', amt: sats / 1e8, key: 'coingecko:bitcoin', kind: 'native' }] : [], errs: [] }; }

/* ---- per-address cache + pricing ---- */
S.wLoad = S.wLoad || {};
async function wLoadAddr(w, force) { const C = store.get(WC, {}); const k = w.type + ':' + w.addr; const c = C[k];
  if (!force && c && Date.now() - c.t < WTTL) return c;
  if (S.wLoad[k]) return S.wLoad[k];
  return (S.wLoad[k] = (async () => { try {
    const r = w.type === 'evm' ? await evmAddr(w.addr) : w.type === 'sol' ? await solAddr(w.addr) : w.type === 'manual' ? { h: (w.holdings || []).map((x) => ({ chain: 'manual', sym: x.sym, amt: +x.qty, key: 'coingecko:' + x.id, kind: 'token' })), errs: [] } : await btcAddr(w.addr, w.type);
    const need = r.h.filter((x) => x.key && x.p == null).map((x) => x.key); const px = need.length ? await llamaPx(need) : {};
    r.h.forEach((x) => { const q = x.key && px[x.key]; if (q) { x.p = q.p; x.c = q.c; } x.v = x.p != null ? x.amt * x.p * (x.kind === 'aave-debt' ? -1 : 1) : null; delete x.key; });
    const o = { t: Date.now(), h: r.h, errs: r.errs }; const C2 = store.get(WC, {}); C2[k] = o; store.set(WC, C2); return o;
  } catch (e) { return { t: Date.now(), h: (c && c.h) || [], err: e.message, stale: !!c }; } finally { delete S.wLoad[k]; } })()); }

/* ---- page ---- */
const CHN = () => Object.fromEntries([...((EVM && EVM.chains) || []).map((c) => [c.key, c.name]), ['solana', 'Solana'], ['bitcoin', 'Bitcoin'], ['hyperliquid', 'Hyperliquid'], ['manual', 'Manual']]);
const isDust = (x) => x.v == null || Math.abs(x.v) < 1 || x.spam;
function pPortfolio(soft) {
  const ws = WS(); const gs = ws.groups; const sel = gs.some((g) => g.id === ws.sel) ? ws.sel : 'all';
  const wal = (sel === 'all' ? gs : gs.filter((g) => g.id === sel)).flatMap((g) => g.wallets.map((w) => ({ ...w, g: g.name, gid: g.id })));
  const C = store.get(WC, {}); const CN = CHN();
  const rows = wal.map((w) => ({ w, c: C[w.type + ':' + w.addr] }));
  const hold = rows.flatMap((r) => (r.c ? r.c.h : []).map((x) => ({ ...x, w: r.w })));
  const vis = hold.filter((x) => ws.dust || !isDust(x)); const hid = hold.length - vis.length;
  const tot = vis.reduce((s, x) => s + (x.v || 0), 0); const d24 = vis.reduce((s, x) => s + (x.v && x.c != null ? x.v - x.v / (1 + x.c / 100) : 0), 0);
  const upd = rows.map((r) => r.c && r.c.t).filter(Boolean); const updT = upd.length ? new Date(Math.min(...upd)).toISOString() : null;
  const byTok = {}; vis.forEach((x) => { const k = x.sym + (x.kind === 'aave-debt' ? ' (' + T('wDebt') + ')' : ''); const o = byTok[k] = byTok[k] || { n: k, v: 0, amt: 0, p: x.p, c: x.c, ch: new Set(), kind: x.kind }; o.v += x.v || 0; o.amt += x.amt; o.ch.add(CN[x.chain] || x.chain); });
  const toks = Object.values(byTok).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  const byCh = {}; vis.forEach((x) => { const k = CN[x.chain] || x.chain; byCh[k] = (byCh[k] || 0) + (x.v || 0); }); let chs = Object.entries(byCh).sort((a, b) => b[1] - a[1]); if (chs.length > 8) chs = [...chs.slice(0, 7), [TF('wOtherN', chs.length - 7), chs.slice(7).reduce((s, c) => s + c[1], 0)]];
  const pos = toks.filter((t) => t.v > 0); const top = pos.slice(0, 7); const rest = pos.slice(7).reduce((s, t) => s + t.v, 0);
  const parts = [...top.map((t, i) => ({ n: t.n, v: t.v, c: PAL[i] })), ...(rest > 0 ? [{ n: 'Other', v: rest, c: PAL[9] }] : [])]; const ptot = parts.reduce((s, p) => s + p.v, 0) || 1;
  const loading = rows.some((r) => S.wLoad[r.w.type + ':' + r.w.addr]);
  const money = (v) => '$' + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: v >= 1000 || v <= -1000 ? 0 : 2 });
  const st = (l, v, c = '') => `<div><div class="eyebrow">${esc(l)}</div><div class="v num ${c}">${v}</div></div>`;
  const chip = (id, n) => `<button class="chip np" data-wg="${esc(id)}" aria-pressed="${sel === id}">${esc(n)}</button>`;
  const walCards = rows.map((r) => { const h = (r.c ? r.c.h : []).filter((x) => ws.dust || !isDust(x)); const v = h.reduce((s, x) => s + (x.v || 0), 0);
    return `<div class="wrow"><div><b>${esc(r.w.label || wShort(r.w.addr))}</b> <span class="wtag">${esc(r.w.type.toUpperCase())}</span>${sel === 'all' ? ` <span class="sub">${esc(r.w.g)}</span>` : ''}<small class="sub mono">${esc(r.w.type === 'manual' ? T('wLegacy') : wShort(r.w.addr))}${r.c && r.c.err ? ` · <span class="dn">${esc(T('wErr'))}</span>` : ''}${r.c && r.c.errs && r.c.errs.length ? ` · <span class="sub" title="${esc(r.c.errs.join(', '))}">${r.c.errs.length} RPC ✕</span>` : ''}</small></div>
      <div class="r"><b class="num">${r.c ? money(v) : `<span class="sk" style="display:inline-block;width:70px;height:16px"></span>`}</b><button class="link sm" data-wdel="${esc(r.w.gid + '|' + r.w.addr)}">${esc(T('wDel'))}</button></div></div>`; }).join('');
  $('#main').innerHTML = `<div class="page wal">${pageHead(T('wTitle'), `<div style="display:flex;gap:6px"><button class="btn ghost" data-wref ${loading ? 'disabled' : ''}>↻ ${esc(T('wRefresh'))}</button><button class="btn pri" data-wadd>+ ${esc(T('wAdd'))}</button></div>`)}
    <div class="filters">${chip('all', T('wAll'))}${gs.map((g) => chip(g.id, g.name + ' · ' + g.wallets.length)).join('')}${sel !== 'all' ? `<button class="link sm" data-wren>${esc(T('wRen'))}</button><button class="link sm dn" data-wdelg>${esc(T('wDelG'))}</button>` : ''}</div>
    ${wal.length ? `<div class="jstats">${st(T('wTotal'), money(tot))}${st(T('w24'), usd(d24) + (tot ? `<small class="${cls(d24)}"> ${pct(d24 / (tot - d24) * 100)}</small>` : ''), cls(d24))}${st(T('wWallets'), wal.length)}${st(T('wUpd'), loading ? esc(T('wLoading')) : updT ? `<span title="${esc(jstFull(updT))}">${esc(relT(updT))}</span>` : '–')}</div>
    <div class="pfgrid"><div class="card pfalloc"><div class="sec-h"><h2>${esc(T('wAlloc'))}</h2></div>${parts.length ? `<div class="dwrap">${donut(parts)}<ul class="dleg">${parts.map((p) => `<li><i style="background:${p.c}"></i><b>${esc(p.n)}</b><span class="num">${(p.v / ptot * 100).toFixed(1)}%</span></li>`).join('')}</ul></div>` : `<div class="sk" style="height:168px"></div>`}</div>
      <div class="card"><div class="sec-h"><h2>${esc(T('wByChain'))}</h2></div><ul class="wbars">${chs.map(([n, v]) => `<li><span>${esc(n)}</span><i><b style="width:${Math.max(1, v / (chs[0][1] || 1) * 100)}%"></b></i><span class="num">${money(v)}</span></li>`).join('') || '<li class="sub">–</li>'}</ul></div></div>
    <div class="sec"><div class="sec-h"><h2>${esc(T('wByTok'))}</h2><label class="sub wdust"><input type="checkbox" data-wdust ${ws.dust ? 'checked' : ''}> ${esc(T('wDust'))}${hid ? ` (${hid})` : ''}</label></div>
      <div class="tbl-wrap"><table class="ov wtok"><thead><tr><th class="l">${esc(T('token'))}</th><th class="l hide-s">${esc(T('wByChain'))}</th><th>${esc(T('price'))}</th><th>24h</th><th>${esc(T('wTotal'))}</th></tr></thead><tbody>${toks.slice(0, S.wMore ? 999 : 15).map((t) => `<tr><td class="l"><b>${esc(t.n)}</b>${t.kind === 'aave' || t.kind === 'aave-debt' ? ' <span class="wtag">Aave</span>' : t.kind === 'lst' ? ' <span class="wtag">LST</span>' : t.kind === 'pendle' ? ' <span class="wtag">Pendle</span>' : ''}<small class="sub num">${t.amt.toLocaleString('en-US', { maximumFractionDigits: 4 })}</small></td><td class="l sub hide-s"><div class="wch" title="${esc([...t.ch].join(", "))}">${esc([...t.ch].join(", "))}</div></td><td class="num">${t.p != null ? px(t.p) : '–'}</td><td class="num ${cls(t.c)}">${t.c != null ? pct(t.c) : '–'}</td><td class="num ${t.v < 0 ? 'dn' : ''}"><b>${t.v < 0 ? '−' : ''}${money(t.v)}</b></td></tr>`).join('') || `<tr><td colspan="5" class="sub">${loading ? esc(T('wLoading')) : '–'}</td></tr>`}</tbody></table></div>${toks.length > 15 ? `<button class="btn ghost" style="margin-top:10px" data-wmore>${esc(S.wMore ? T('wLess') : TF('wMoreN', toks.length - 15))}</button>` : ''}</div>
    <div class="sec"><div class="sec-h"><h2>${esc(T('wByWal'))}</h2></div>${walCards}</div>` : `<div class="empty">${esc(T('wEmpty'))}<div style="margin-top:14px"><button class="btn pri" data-wadd>+ ${esc(T('wAdd'))}</button></div></div>`}
    <div class="jtools"><a class="link" href="#/journal">${esc(T('wJournal'))}</a><div style="display:flex;gap:6px;margin-left:auto"><button class="btn ghost" data-wexp>${esc(T('exp'))}</button><label class="btn ghost" style="cursor:pointer">${esc(T('imp'))}<input type="file" accept="application/json,.json" id="wimp" hidden></label></div></div>
    <details class="card wcov"><summary><b>${esc(T('wCover'))}</b></summary><ul class="bl">${T('wCoverTxt').map((s) => `<li>${esc(s)}</li>`).join('')}</ul></details>
    <p class="sub" style="margin-top:12px">${esc(T('wSaved'))}</p></div>`;
  $('#wimp').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; try { const j = JSON.parse(await f.text()); if (!Array.isArray(j.groups)) throw 0; WSset({ groups: j.groups, sel: 'all', dust: !!j.dust }); toast(TF('wImported', j.groups.length)); pPortfolio(); } catch (er) { toast(T('wBadFile')); } });
  if (!soft) wRefresh(false);
}
async function wRefresh(force) { const ws = WS(); const wal = (ws.sel === 'all' ? ws.groups : ws.groups.filter((g) => g.id === ws.sel)).flatMap((g) => g.wallets);
  if (!EVM && wal.some((w) => w.type === 'evm')) await evmList().catch(() => {});
  const p = pool(wal, 3, (w) => wLoadAddr(w, force).then(() => { if (S.route === 'portfolio') pPortfolio(true); }));
  if (S.route === 'portfolio') pPortfolio(true); await p; if (S.route === 'portfolio') pPortfolio(true); }
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
