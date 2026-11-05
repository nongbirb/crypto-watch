#!/usr/bin/env python3
"""positioning.json: keyless data that browsers cannot fetch (no CORS) or that is slow-changing.
- OKX rubik: long/short ACCOUNT ratio per perp (contract), 25 hourly points  -> futures.okx
- OKX rubik: spot taker buy/sell volume per coin, last 24 closed hours, converted to USD with OKX spot hourly closes -> spot.okx
- Blockscout (eth.blockscout.com, keyless): holder count + top-10 holder share for ERC-20 tokens, matched by contract address
Only real API values; anything missing is omitted (UI shows 'not available')."""
import json, time, urllib.request, datetime as dt
TOK = json.load(open('tokens.json'))['tokens']
# Ethereum contract addresses, verified on Blockscout + CoinGecko platforms (match by address, never ticker)
ERC20 = {'AAVE': '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', 'PENDLE': '0x808507121B80c02388fAd14726482e061B8da827', 'LIT': '0x232CE3bd40fCd6f80f3d55A522d03f25Df784Ee2'}
PROJ = {'AAVE': 'aave', 'PENDLE': 'pendle', 'LIT': 'lighter'}
def get(u, tries=3, body=None):
    for i in range(tries):
        try:
            rq = urllib.request.Request(u, headers={'User-Agent': 'kms-capital', **({'Content-Type': 'application/json'} if body else {})}, data=json.dumps(body).encode() if body else None)
            with urllib.request.urlopen(rq, timeout=60) as r: return json.load(r)
        except Exception as e:
            if i == tries - 1: print('ERR', u, e); return None
            time.sleep(2 + 3 * i)
now = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
out = {'updated': now, 'futures': {}, 'spot': {}, 'onchain': {}}
OK = 'https://www.okx.com/api/v5'
for t in TOK:
    s = t['symbol']; okp = (t.get('perps') or {}).get('okx', s + '-USDT-SWAP'); time.sleep(0.4)
    if okp:
        r = get(f'{OK}/rubik/stat/contracts/long-short-account-ratio-contract?instId={okp}&period=1H&limit=25')
        if r and r.get('code') == '0' and r['data']:
            out['futures'].setdefault(s, {})['okx'] = {'pair': okp, 'pts': [[int(a), round(float(b), 4)] for a, b in reversed(r['data'])]}
    src = next((x for x in t.get('sources', []) if x['ex'] == 'okx'), None)
    if src:  # only when tokens.json maps this token to an OKX spot pair (curated, not ticker-guessing)
        tv = get(f'{OK}/rubik/stat/taker-volume?ccy={s}&instType=SPOT&period=1H'); kl = get(f'{OK}/market/candles?instId={src["pair"]}&bar=1H&limit=30')
        if tv and kl and tv.get('code') == '0' and kl.get('code') == '0':
            px = {int(k[0]): float(k[4]) for k in kl['data'] if k[8] == '1'}
            rows = [(int(a), float(se), float(bu)) for a, se, bu in tv['data'] if int(a) in px]
            rows = sorted(rows)[-24:]
            if len(rows) >= 20:
                out['spot'].setdefault(s, {})['okx'] = {'pair': src['pair'], 'buy': round(sum(b * px[a] for a, _, b in rows)), 'sell': round(sum(se * px[a] for a, se, _ in rows)),
                    'from': rows[0][0], 'to': rows[-1][0] + 3600_000, 'hours': len(rows), 'px': px[rows[-1][0]]}
for s, a in ERC20.items():
    if not any(t['symbol'] == s for t in TOK): continue
    ti = get(f'https://eth.blockscout.com/api/v2/tokens/{a}'); h = get(f'https://eth.blockscout.com/api/v2/tokens/{a}/holders')
    if not ti: continue
    o = {'chain': 'Ethereum', 'address': a, 'source': 'Blockscout'}
    if ti.get('holders_count') or ti.get('holders'): o['holders'] = int(ti.get('holders_count') or ti.get('holders'))
    sup = float(ti.get('total_supply') or 0)
    if h and h.get('items') and sup > 0:
        top = h['items'][:10]; o['top10'] = round(100 * sum(float(x['value']) for x in top) / sup, 1)
        o['top10Contracts'] = sum(1 for x in top if x['address'].get('is_contract'))
        proj = PROJ.get(s, s).lower()
        def cls(x):
            ad = x['address']; tags = (ad.get('metadata') or {}).get('tags') or []
            gen = {t['name'].lower() for t in tags if t.get('tagType') == 'generic'}
            names = [t['name'] for t in tags if t.get('tagType') == 'name']
            impl = [i.get('name') for i in (ad.get('implementations') or []) if i.get('name')]
            isc = bool(ad.get('is_contract')); why = None
            if 'exchange' in gen or gen & {'hot wallet', 'cold wallet'} or any(w in n.lower() for n in names for w in ('exchange', 'hot wallet', 'cold wallet')): k, exc = 'exchange', True
            elif 'burn' in gen: k, exc = 'burn', True
            elif isc and (any(n in ('Safe', 'GnosisSafe') for n in impl) or 'smart account by safe' in gen):
                k = 'multisig'; owned = [t['name'] for t in tags if t.get('tagType') in ('name', 'protocol') and proj in t['name'].lower()]
                if not owned and ad.get('name') and proj in ad['name'].lower(): owned = [ad['name']]
                exc = bool(owned); why = ('tagged ' + owned[0]) if owned else 'no protocol tag'
            elif isc and (names or any(t.get('tagType') == 'protocol' for t in tags) or 'bridge' in gen): k, exc = 'protocol', True
            elif isc: k, exc = 'contract', True
            else: k, exc = None, False
            lab = names[0] if names else ((ad.get('name') or (impl[0] if impl else None)) if isc else None)
            r = {'a': ad['hash'], 'pct': round(100 * float(x['value']) / sup, 2), 'kind': k, 'label': lab, 'ex': exc}
            if why: r['why'] = why
            return r
        allh = [cls(x) for x in h['items']]; nxt = h.get('next_page_params'); pages = 1
        while sum(1 for r in allh if not r['ex']) < 10 and nxt and pages < 6:
            time.sleep(1.5); q = '&'.join(f'{k}={v}' for k, v in nxt.items())
            h2 = get(f'https://eth.blockscout.com/api/v2/tokens/{a}/holders?{q}')
            if not h2 or not h2.get('items'): break
            allh += [cls(x) for x in h2['items']]; nxt = h2.get('next_page_params'); pages += 1
        o['top'] = allh[:10]; inc = [r for r in allh if not r['ex']][:10]
        if len(inc) == 10:
            o['topIncl'] = inc; o['top10ExCx'] = round(sum(r['pct'] for r in inc), 1)
            o['topInclRank'] = allh.index(inc[-1]) + 1
        big = [r for r in inc if r['pct'] > 10]
        if big: o['warn'] = big
    out['onchain'][s] = o
print(json.dumps({k: list(v) for k, v in out.items() if isinstance(v, dict)}))
# ---------- native-chain stats (BTC, SOL, NEAR, HYPE); each item carries its own source + time ----------
def iso(t=None): return (t or dt.datetime.now(dt.timezone.utc)).strftime('%Y-%m-%dT%H:%M:%SZ')
try: prev = json.load(open('positioning.json')).get('native', {})
except Exception: prev = {}
nat = {}
def put(sym, key, item): nat.setdefault(sym, {})[key] = item
def keep(sym, key):
    if prev.get(sym, {}).get(key): put(sym, key, prev[sym][key])
syms = {t['symbol'] for t in TOK}
if 'BTC' in syms:
    CH = 'BTC'
    try:
        # Blockchair: called at most every 6h (strict keyless limit)
        pb = prev.get('BTC', {}).get('addrBal')
        if pb and (time.time() - dt.datetime.fromisoformat(pb['at'].replace('Z', '+00:00')).timestamp()) < 6 * 3600: keep('BTC', 'addrBal')
        else:
            b = get('https://api.blockchair.com/bitcoin/stats', tries=1)
            if b and b.get('data', {}).get('hodling_addresses'): put('BTC', 'addrBal', {'v': int(b['data']['hodling_addresses']), 'src': 'Blockchair', 'url': 'https://blockchair.com/bitcoin', 'at': iso()})
            else: keep('BTC', 'addrBal')
        CM = 'https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&frequency=1d&page_size=1&paging_from=end&metrics='
        a = get(CM + 'AdrActCnt,TxCnt')
        if a and a.get('data'):
            r = a['data'][-1]; put('BTC', 'activity', {'active': int(float(r['AdrActCnt'])), 'tx': int(float(r['TxCnt'])), 'day': r['time'][:10], 'src': 'Coin Metrics Community', 'url': 'https://coinmetrics.io/community-network-data/', 'at': iso()})
        else: keep('BTC', 'activity')
        f = get(CM.replace('page_size=1', 'page_size=4') + 'FlowInExNtv,FlowOutExNtv,FlowInExUSD,FlowOutExUSD')
        rows = [r for r in (f or {}).get('data', []) if all(r.get(k) for k in ('FlowInExNtv', 'FlowOutExNtv', 'FlowInExUSD', 'FlowOutExUSD'))]
        if rows:
            r = rows[-1]; fi, fo = float(r['FlowInExNtv']), float(r['FlowOutExNtv']); ui, uo = float(r['FlowInExUSD']), float(r['FlowOutExUSD'])
            put('BTC', 'exflow', {'in': round(fi, 2), 'out': round(fo, 2), 'net': round(fi - fo, 2), 'inUsd': round(ui), 'outUsd': round(uo), 'netUsd': round(ui - uo), 'day': r['time'][:10],
                  'prelim': any(r.get(k + '-status') == 'flash' for k in ('FlowInExNtv', 'FlowOutExNtv', 'FlowInExUSD', 'FlowOutExUSD')), 'src': 'Coin Metrics Community', 'url': 'https://coinmetrics.io/community-network-data/', 'at': iso()})
        else: keep('BTC', 'exflow')
    except Exception as e: print('native fail', CH, e); [keep(CH, k) for k in prev.get(CH, {})]
if 'SOL' in syms:
    CH = 'SOL'
    try:
        SR = 'https://api.mainnet-beta.solana.com'
        sp = get(SR, body={'jsonrpc': '2.0', 'id': 1, 'method': 'getSupply', 'params': [{'excludeNonCirculatingAccountsList': True}]})
        va = get(SR, body={'jsonrpc': '2.0', 'id': 1, 'method': 'getVoteAccounts'})
        if sp and va and sp.get('result') and va.get('result'):
            tot = sp['result']['value']['total'] / 1e9; v = va['result']
            st = sum(x['activatedStake'] for x in v['current'] + v['delinquent']) / 1e9
            put('SOL', 'stake', {'staked': round(st), 'total': round(tot), 'pct': round(100 * st / tot, 1), 'validators': len(v['current']), 'src': 'Solana RPC (getVoteAccounts, getSupply)', 'url': 'https://solana.com/docs/rpc', 'at': iso()})
        else: keep('SOL', 'stake')
    except Exception as e: print('native fail', CH, e); [keep(CH, k) for k in prev.get(CH, {})]
if 'NEAR' in syms:
    CH = 'NEAR'
    try:
        ch = get('https://api.nearblocks.io/v1/charts')
        if ch and ch.get('charts'):
            r = ch['charts'][-1]; put('NEAR', 'activity', {'active': int(r['active_accounts']), 'new': int(r['new_accounts']), 'tx': int(r['txns']), 'day': r['date'][:10], 'src': 'NearBlocks', 'url': 'https://nearblocks.io/charts', 'at': iso()})
        else: keep('NEAR', 'activity')
        vr = get('https://rpc.mainnet.near.org', body={'jsonrpc': '2.0', 'id': 1, 'method': 'validators', 'params': [None]})
        ns = get('https://api.nearblocks.io/v1/stats')
        if vr and vr.get('result') and ns and ns.get('stats'):
            st = sum(int(x['stake']) for x in vr['result']['current_validators']) / 1e24; tot = int(ns['stats'][0]['total_supply']) / 1e24
            put('NEAR', 'stake', {'staked': round(st), 'total': round(tot), 'pct': round(100 * st / tot, 1), 'validators': len(vr['result']['current_validators']), 'src': 'NEAR RPC (validators) + NearBlocks supply', 'url': 'https://nearblocks.io/node-explorer', 'at': iso()})
        else: keep('NEAR', 'stake')
    except Exception as e: print('native fail', CH, e); [keep(CH, k) for k in prev.get(CH, {})]
if 'HYPE' in syms:
    CH = 'HYPE'
    try:
        HL = 'https://api.hyperliquid.xyz/info'
        td = get(HL, body={'type': 'tokenDetails', 'tokenId': '0x0d01dc56dcaaca66ad901c959b4011ec'}); vs = get(HL, body={'type': 'validatorSummaries'})
        if td and vs:
            tot, circ, fut = float(td['totalSupply']), float(td['circulatingSupply']), float(td.get('futureEmissions') or 0)
            nc = [(a, float(b)) for a, b in td.get('nonCirculatingUserBalances', [])]
            st = sum(float(v['stake']) for v in vs) / 1e8
            big = max(nc, key=lambda x: x[1]) if nc else None
            dl = get(HL, body={'type': 'delegatorSummary', 'user': big[0]}) if big else None
            ncSt = float(dl['delegated']) if dl and dl.get('delegated') is not None else None
            o = {'staked': round(st), 'total': round(tot), 'pct': round(100 * st / tot, 1), 'validators': len(vs), 'circ': round(circ), 'nonCirc': round(sum(b for _, b in nc)), 'future': round(fut),
                 'src': 'Hyperliquid API (tokenDetails, validatorSummaries, delegatorSummary)', 'url': 'https://app.hyperliquid.xyz/staking', 'at': iso()}
            if big and ncSt is not None:
                o.update({'ncWallet': big[0], 'ncWalletBal': round(big[1]), 'ncWalletStaked': round(ncSt), 'stakedExNc': round(st - ncSt), 'pctExNcOfCirc': round(100 * (st - ncSt) / circ, 1)})
            put('HYPE', 'stake', o)
        else: keep('HYPE', 'stake')
    except Exception as e: print('native fail', CH, e); [keep(CH, k) for k in prev.get(CH, {})]
out['native'] = nat
print('native', {k: list(v) for k, v in nat.items()})
if len(out['futures']) < 3: raise SystemExit('FAIL: too few OKX ratios')
json.dump(out, open('positioning.json', 'w'), separators=(',', ':'))
