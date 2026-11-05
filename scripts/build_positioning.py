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
def get(u, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'kms-capital'}), timeout=30) as r: return json.load(r)
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
    out['onchain'][s] = o
print(json.dumps({k: list(v) for k, v in out.items() if isinstance(v, dict)}))
if len(out['futures']) < 3: raise SystemExit('FAIL: too few OKX ratios')
json.dump(out, open('positioning.json', 'w'), separators=(',', ':'))
