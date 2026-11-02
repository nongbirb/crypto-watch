#!/usr/bin/env python3
"""Build flows.json: REAL cross-chain bridge flows (USD, source chain -> target chain) for 1d / 7d / 30d.
Run daily by the routine (see update_judgment.md). Free public APIs only, no keys.

Sources (counted once each, at the messaging / settlement layer):
  wormhole  api.wormholescan.io /x-chain-activity (all Wormhole apps: Portal, NTT, Mayan, Allbridge-on-WH, CCTP-via-WH...)
  debridge  stats-api.dln.trade getDaily (DLN order flow, daily per chain pair, USD)
  layerzero scan.layerzero-api.com messages (OFT/Stargate payloads decoded; only assets we can price safely)
  across    indexer.api.across.to deposits (paged per origin chain, priced via DefiLlama coins)
Dedupe rules:
  * app-layer feeds that ride on a counted layer are NOT added (Mayan, Allbridge, Portal -> inside Wormhole; Stargate -> inside LayerZero)
  * aggregator totals (Relay, LI.FI, Jumper, DefiLlama bridge-aggregators) are never added
  * paged sources (LayerZero, Across) dedupe by unique message id, then across sources by source tx hash
  * self-loops (A->A) and Other->Other are dropped
Paged sources are cached incrementally in scripts/.flows_cache/*.json.gz, so only the first 30d build is slow.
Chainlink CCIP was evaluated: its public explorer API has no time-ordered / filterable listing, so it is not included.
Usage: python3 scripts/build_flows.py
"""
import json, os, time, gzip, urllib.request, urllib.parse, concurrent.futures as cf, threading, sys
from collections import defaultdict
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'scripts', '.flows_cache'); os.makedirs(CACHE, exist_ok=True)
NOW = int(time.time()); DAY = 86400; SPAN = 30 * DAY
WIN = {'1d': 1, '7d': 7, '30d': 30}
CHAINS = ['Ethereum', 'Solana', 'Base', 'Arbitrum', 'BSC', 'Polygon', 'Optimism', 'Avalanche', 'Tron', 'Sui', 'Hyperliquid', 'Unichain', 'Monad', 'Near', 'Sonic']
OTHER = 'Other'
log = lambda *a: print(*a, flush=True)

def get(url, tries=5, timeout=60):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'crypto-watch/1.0', 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=timeout) as r: return json.load(r)
        except Exception as e:
            code = getattr(e, 'code', None)
            if code in (400, 404, 422) or i == tries - 1: log('FAIL', url[:140], e); return None
            time.sleep((10 if code == 429 else 2) * (i + 1))

# ---------- chain id maps ----------
WH = {1: 'Solana', 2: 'Ethereum', 4: 'BSC', 5: 'Polygon', 6: 'Avalanche', 15: 'Near', 21: 'Sui', 23: 'Arbitrum', 24: 'Optimism', 30: 'Base', 44: 'Unichain', 47: 'Hyperliquid', 48: 'Monad', 52: 'Sonic'}
DB = {1: 'Ethereum', 10: 'Optimism', 56: 'BSC', 137: 'Polygon', 8453: 'Base', 42161: 'Arbitrum', 43114: 'Avalanche', 7565164: 'Solana', 100000014: 'Sonic', 100000022: 'Hyperliquid', 100000026: 'Tron', 100000030: 'Monad'}
LZ = {'ethereum': 'Ethereum', 'solana': 'Solana', 'base': 'Base', 'arbitrum': 'Arbitrum', 'bsc': 'BSC', 'polygon': 'Polygon', 'optimism': 'Optimism', 'avalanche': 'Avalanche', 'tron': 'Tron', 'sui': 'Sui', 'hyperliquid': 'Hyperliquid', 'unichain': 'Unichain', 'monad': 'Monad', 'near': 'Near', 'sonic': 'Sonic'}
AC = {1: 'Ethereum', 34268394551451: 'Solana', 8453: 'Base', 42161: 'Arbitrum', 56: 'BSC', 137: 'Polygon', 10: 'Optimism', 43114: 'Avalanche', 999: 'Hyperliquid', 1337: 'Hyperliquid', 130: 'Unichain', 143: 'Monad', 146: 'Sonic'}
AC_LLAMA = {1: 'ethereum', 10: 'optimism', 56: 'bsc', 137: 'polygon', 8453: 'base', 42161: 'arbitrum', 130: 'unichain', 999: 'hyperliquid', 143: 'monad', 59144: 'linea', 324: 'era', 34443: 'mode', 81457: 'blast', 7777777: 'zora', 57073: 'ink', 480: 'wc', 1135: 'lisk', 534352: 'scroll', 690: 'redstone', 41455: 'aleph-zero', 232: 'lens', 9745: 'plasma', 34268394551451: 'solana', 146: 'sonic', 43114: 'avax', 4663: 'robinhood', 1868: 'soneium', 4326: 'megaeth', 5042: 'arc', 4217: 'tempo'}
AC_ORIGINS = sorted(AC_LLAMA) + [1337]
norm = lambda m, k: m.get(k, OTHER)

# ---------- pricing ----------
PX = {}
def llama_prices(keys):
    keys = [k for k in dict.fromkeys(keys) if k not in PX]
    for i in range(0, len(keys), 60):
        part = keys[i:i + 60]
        d = get('https://coins.llama.fi/prices/current/' + ','.join(urllib.parse.quote(k, safe=':') for k in part)) or {}
        for k in part:
            c = (d.get('coins') or {}).get(k)
            PX[k] = (c['price'], c.get('decimals'), (c.get('symbol') or '').upper()) if c and c.get('price') else None
STABLE = {'USDC', 'USDT', 'USD₮0', 'USDT0', 'USDC.E', 'USDBC', 'PYUSD', 'USDE', 'DAI', 'USDS', 'FDUSD', 'BUSD', 'USDB', 'EURC'}

# ---------- 1. Wormhole (pre-aggregated by Wormholescan) ----------
def wormhole():
    out = {}
    for w, ts in (('1d', '1d'), ('7d', '7d'), ('30d', '30d')):
        d = get(f'https://api.wormholescan.io/api/v1/x-chain-activity?timeSpan={ts}&by=notional') or {}
        pairs = defaultdict(float)
        for s in d.get('txs', []):
            for t in s.get('destinations', []):
                pairs[(norm(WH, s['chain']), norm(WH, t['chain']))] += float(t['volume'])
        out[w] = pairs
    sc = get('https://api.wormholescan.io/api/v1/scorecards') or {}
    return out, {k: float(sc[k]) for k in ('24h_volume', '7d_volume', '30d_volume') if sc.get(k)}

# ---------- 2. deBridge DLN (daily per pair) ----------
def debridge():
    end = time.gmtime(NOW - DAY); d0 = time.gmtime(NOW - 30 * DAY)
    d = get(f"https://stats-api.dln.trade/api/Satistics/getDaily?dateFrom={time.strftime('%Y-%m-%d', d0)}&dateTo={time.strftime('%Y-%m-%d', end)}") or {}
    rows = d.get('dailyData', [])
    last = max((r['date'] for r in rows), default=0)
    out = {w: defaultdict(float) for w in WIN}
    for r in rows:
        age = (last - r['date']) // DAY
        v = r.get('totalAmountGivenUsd') or 0
        k = (norm(DB, int(r['giveChainId']['stringValue'])), norm(DB, int(r['takeChainId']['stringValue'])))
        for w, n in WIN.items():
            if age < n: out[w][k] += v
    return out, {'last_day': last, 'days': len({r['date'] for r in rows})}

# ---------- cache helpers for paged sources ----------
def load(name):
    p = os.path.join(CACHE, name + '.json.gz')
    try: return json.load(gzip.open(p, 'rt'))
    except Exception: return {}
def save(name, obj):
    p = os.path.join(CACHE, name + '.json.gz'); json.dump(obj, gzip.open(p + '.tmp', 'wt'), separators=(',', ':')); os.replace(p + '.tmp', p)

# ---------- 3. LayerZero (message layer; decode OFT / Stargate amounts) ----------
SG = {}  # stargate assetId -> (symbol, sharedDecimals, llama key)
def stargate_meta():
    d = get('https://mainnet.stargate-api.com/v1/metadata?version=v2') or {}
    for x in (d.get('data') or {}).get('v2', []):
        a = int(x['assetId']); SG.setdefault(a, (x['token']['symbol'].upper(), x.get('sharedDecimals') or 6, f"{x['chainKey']}:{x['token']['address']}"))
LZ_STABLE_APPS = {'usdt0': 'USDT0', 'paypal': 'PYUSD'}  # OFT apps whose token is a $1 stablecoin with 6 shared decimals
def lz_value(m):
    app = m['pathway']['sender'].get('id'); pl = (m['source']['tx'].get('payload') or '')[2:]
    try:
        if app == 'stargate':
            if not pl or pl[:2] != '01': return None
            aid = int(pl[2:6], 16); meta = SG.get(aid)
            if not meta: return None
            if len(pl) == 86: amt = int(pl[70:86], 16)          # taxi: ver|asset|to(32)|amountSD
            elif len(pl) == 32: amt = int(pl[16:32], 16)        # bus ride: ver|asset|..|amountSD
            elif len(pl) > 86: amt = int(pl[70:86], 16)          # taxi + compose
            else: return None
            sym, sd, key = meta
            px = 1.0 if sym in STABLE else (PX.get('coingecko:ethereum') or (None,))[0] if sym in ('ETH', 'WETH') else (PX.get(key) or (None,))[0]
            return amt / 10 ** sd * px if px else None
        if app in LZ_STABLE_APPS and len(pl) >= 80:
            o = 68 if len(pl) == 84 else 64   # 84 hex = 2-byte msg-type prefix + to(32) + amountSD(8)
            return int(pl[o:o + 16], 16) / 1e6
    except Exception: return None
    return None

REDO_PER_RUN = int(os.environ.get('LZ_REDO', '8'))
def layerzero():
    c = load('layerzero'); recs = c.get('recs', {}); done = set(c.get('days_done', []))
    stargate_meta(); llama_prices(['coingecko:ethereum'] + [m[2] for m in SG.values()])
    first = (NOW - SPAN) // DAY * DAY
    redo = set(c.get('redo', []))
    if 'usdt0_partial_before' in c: redo |= {str(d) for d in range(first, c['usdt0_partial_before'], DAY)}
    redo = {d for d in redo if int(d) >= first}; done -= set(sorted(redo, reverse=True)[:REDO_PER_RUN])
    days = [d for d in range(first, NOW, DAY) if str(d) not in done or d + DAY > NOW - 3600]
    lock = threading.Lock(); stats = defaultdict(int)
    def day(d0):
        d1 = min(d0 + DAY, NOW); tok = None; got = {}; n = 0
        while True:
            q = f"https://scan.layerzero-api.com/v1/messages/latest?limit=150&start={time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(d0))}&end={time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(d1))}" + (f"&nextToken={urllib.parse.quote(tok)}" if tok else '')
            r = get(q)
            if r is None: return d0, None, n
            for m in r.get('data', []):
                n += 1
                if m['source'].get('status') not in ('SUCCEEDED', None) and (m.get('status') or {}).get('name') == 'FAILED': continue
                v = lz_value(m)
                if not v or v <= 0: continue
                p = m['pathway']; ts = int(m['source']['tx'].get('blockTimestamp') or 0)
                got[m['guid']] = [ts, norm(LZ, p['sender']['chain']), norm(LZ, p['receiver']['chain']), round(v, 2), m['source']['tx']['txHash'][:18].lower(), p['sender'].get('id')]
            tok = r.get('nextToken')
            if not tok or not r.get('data'): break
            time.sleep(0.15)
        return d0, got, n
    with cf.ThreadPoolExecutor(4) as ex:
        for d0, got, n in ex.map(day, days):
            if got is None: log('LZ day failed', d0); continue
            with lock:
                recs.update(got); stats['msgs'] += n
                if d0 + DAY <= NOW - 3600: done.add(str(d0))
                redo.discard(str(d0)); save('layerzero', {'recs': recs, 'days_done': sorted(done), 'redo': sorted(redo)})
            log(f"LZ {time.strftime('%Y-%m-%d', time.gmtime(d0))}: {n} msgs, {len(got)} priced")
    recs = {k: v for k, v in recs.items() if v[0] >= NOW - SPAN - DAY}
    save('layerzero', {'recs': recs, 'days_done': sorted(x for x in done if int(x) >= first), 'redo': sorted(redo)})
    stats['usdt0_partial_days'] = len(redo)
    return recs, dict(stats)

# ---------- 4. Across (paged per origin chain by endBlock) ----------
def across():
    c = load('across'); recs = c.get('recs', {}); newest = c.get('newest', {})
    cutoff_all = NOW - SPAN - DAY
    raw = {}
    def origin(oc):
        rc = load(f'across_raw_{oc}')
        if rc and rc.get('at', 0) > time.time() - 6 * 3600: return oc, [tuple(g) for g in rc['got']], rc['top']
        oc, got, top = origin_fetch(oc); save(f'across_raw_{oc}', {'at': time.time(), 'got': got, 'top': top}); return oc, got, top
    def origin_fetch(oc):
        stop = max(cutoff_all, newest.get(str(oc), 0) - 3 * 3600); end = None; got = []; top = 0
        while True:
            q = f'https://indexer.api.across.to/deposits?limit=1000&originChainId={oc}' + (f'&endBlock={end}' if end else '')
            r = get(q, timeout=90)
            if not r: break
            for x in r:
                ts = int(time.mktime(time.strptime(x['depositBlockTimestamp'][:19], '%Y-%m-%dT%H:%M:%S')) - time.timezone) if x.get('depositBlockTimestamp') else 0
                top = max(top, ts); got.append((ts, {k: x.get(k) for k in ('depositId', 'inputToken', 'inputAmount', 'outputToken', 'outputAmount', 'destinationChainId', 'depositTxHash', 'depositTxnRef', 'status', 'depositBlockNumber')}))
            mn = min(int(x['depositBlockNumber']) for x in r)
            oldest = min(t for t, _ in got[-len(r):])
            if len(r) < 1000 or oldest < stop: break
            end = mn - 1; time.sleep(0.2)
        return oc, got, top
    with cf.ThreadPoolExecutor(4) as ex:
        for oc, got, top in ex.map(origin, AC_ORIGINS):
            raw[oc] = got
            if top: newest[str(oc)] = top
            log(f'Across origin {oc}: {len(got)} deposits')
    keys = []
    for oc, got in raw.items():
        ll = AC_LLAMA.get(oc if oc != 1337 else 999)
        got[:] = [g for g in got if g[1].get('destinationChainId') is not None]
        for ts, x in got:
            if ll and x.get('inputToken'): keys.append(f"{ll}:{x['inputToken']}")
            dl = AC_LLAMA.get(int(x['destinationChainId']))
            if dl and x.get('outputToken'): keys.append(f"{dl}:{x['outputToken']}")
    llama_prices(keys)
    unpriced = 0
    for oc, got in raw.items():
        for ts, x in got:
            if ts < cutoff_all or x.get('status') in ('expired', 'refunded'): continue
            v = None
            for ch, tk, amt in ((oc if oc != 1337 else 999, x.get('inputToken'), x.get('inputAmount')), (int(x['destinationChainId']), x.get('outputToken'), x.get('outputAmount'))):
                p = PX.get(f'{AC_LLAMA.get(ch)}:{tk}') if AC_LLAMA.get(ch) else None
                if p and p[1] is not None and amt: v = int(amt) / 10 ** p[1] * p[0]; break
            if v is None: unpriced += 1; continue
            if v > 5e7: continue  # guard against mis-decimaled tokens
            recs[f"{oc}-{x['depositId']}"] = [ts, norm(AC, oc), norm(AC, int(x['destinationChainId'])), round(v, 2), (x.get('depositTxHash') or x.get('depositTxnRef') or '')[:18].lower(), 'across']
    recs = {k: v for k, v in recs.items() if v[0] >= cutoff_all}
    save('across', {'recs': recs, 'newest': newest})
    return recs, {'unpriced_new': unpriced}

# ---------- merge ----------
def main():
    res = {}
    with cf.ThreadPoolExecutor(4) as ex:
        fw, fd, fl, fa = ex.submit(wormhole), ex.submit(debridge), ex.submit(layerzero), ex.submit(across)
        (wh, whsc), (db, dbs), (lzr, lzs), (acr, acs) = fw.result(), fd.result(), fl.result(), fa.result()
    # cross-source dedupe of paged txs by source tx hash (Across first, then LayerZero)
    seen = {}; removed = defaultdict(lambda: {'n': 0, 'usd': 0.0})
    paged = {'across': defaultdict(lambda: defaultdict(float)), 'layerzero': defaultdict(lambda: defaultdict(float))}
    for src, recs in (('across', acr), ('layerzero', lzr)):
        for k, (ts, s, t, v, h, app) in recs.items():
            if v > 5e7: removed[f'{src} (>$50M single transfer, decode guard)']['n'] += 1; continue
            if h and h in seen and seen[h] != src:
                removed[f'{src} (tx already counted by {seen[h]})']['n'] += 1; removed[f'{src} (tx already counted by {seen[h]})']['usd'] += v; continue
            if h: seen.setdefault(h, src)
            for w, n in WIN.items():
                if ts >= NOW - n * DAY: paged[src][w][(s, t)] += v
    srcs = {'wormhole': wh, 'debridge': db, 'layerzero': paged['layerzero'], 'across': paged['across']}
    windows = {}; totals = {}; selfloop = defaultdict(float)
    for w in WIN:
        windows[w] = {}
        for name, data in srcs.items():
            rows = []
            for (s, t), v in data.get(w, {}).items():
                if s == t: selfloop[f'{name} {w}'] += v; continue
                if v >= 1: rows.append([s, t, round(v)])
            rows.sort(key=lambda r: -r[2]); windows[w][name] = rows
            totals.setdefault(name, {})[w] = round(sum(r[2] for r in rows))
    doc = dict(
        _help='Built by scripts/build_flows.py. windows[w][source] = [[from, to, usd], ...]; chains outside the 15 are "Other"; self-loops removed.',
        updated=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(NOW)), chains=CHAINS,
        sources={'wormhole': {'label': 'Wormhole', 'incl': 'Portal, NTT, Mayan, Allbridge (Wormhole), CCTP via Wormhole', 'window': 'rolling'},
                 'debridge': {'label': 'deBridge', 'incl': 'DLN orders', 'window': 'UTC days', 'last_day': dbs.get('last_day')},
                 'layerzero': {'label': 'LayerZero', 'incl': 'Stargate v2, USDT0, PYUSD (OFT amounts decoded)', 'window': 'rolling', 'partial': lzs.get('usdt0_partial_days', 0)},
                 'across': {'label': 'Across', 'incl': 'all Across deposits (incl. CCTP-forward routes)', 'window': 'rolling'}},
        totals=totals, windows=windows,
        check={'wormholescan_scorecards': whsc, 'layerzero_msgs_scanned_this_run': lzs.get('msgs', 0), 'across_unpriced_this_run': acs.get('unpriced_new', 0),
               'dedupe_removed': {k: {'n': v['n'], 'usd': round(v['usd'])} for k, v in removed.items()}, 'self_loops_removed_usd': {k: round(v) for k, v in selfloop.items()}},
        excluded=['Chainlink CCIP (no filterable public listing)', 'Canonical rollup bridges', 'Circle CCTP direct', 'CEX deposits/withdrawals', 'Relay / LI.FI aggregator totals (would double count)'])
    json.dump(doc, open(os.path.join(ROOT, 'flows.json'), 'w'), separators=(',', ':'))
    log('wrote flows.json', os.path.getsize(os.path.join(ROOT, 'flows.json')) // 1024, 'KB'); log(json.dumps(totals)); log(json.dumps(doc['check'])[:1500])

if __name__ == '__main__':
    main()
    import flows_split; flows_split.run()
