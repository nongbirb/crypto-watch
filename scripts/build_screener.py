#!/usr/bin/env python3
"""Daily screener build -> screener.json. Universe: CoinGecko top 200 by market cap (+ tokens.json).
Daily candles from Binance spot (fallback: Bybit spot), funding from Binance USDT-M + Bybit linear + Hyperliquid. Free endpoints only."""
import json, os, time, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {'User-Agent': 'Mozilla/5.0', 'content-type': 'application/json'}
STABLE = {'usdt','usdc','dai','usde','fdusd','tusd','usds','pyusd','usd1','usdd','frax','gusd','usdp','busd','eurc','usdtb','rlusd','usdf','susde','susds','bsc-usd','usdg','usdx','lusd','crvusd','gho','usd0','eure','xaut','paxg','bfusd','syrupusdc','usdy','ousg','buidl','usyc','usdai','usdc.e'}
def get(u, body=None, tries=3):
    for i in range(tries):
        try:
            r = urllib.request.Request(u, data=json.dumps(body).encode() if body else None, headers=UA)
            return json.loads(urllib.request.urlopen(r, timeout=30).read())
        except Exception as e: err = e; time.sleep(2 * (i + 1)) if i < tries - 1 else None
    raise err
def rsi(c, n=14):
    if len(c) < n + 1: return None
    g = l = 0
    for i in range(1, n + 1): d = c[i] - c[i-1]; g += max(d, 0); l += max(-d, 0)
    g /= n; l /= n
    for i in range(n + 1, len(c)): d = c[i] - c[i-1]; g = (g*(n-1) + max(d, 0))/n; l = (l*(n-1) + max(-d, 0))/n
    return 100.0 if l == 0 else 100 - 100/(1 + g/l)
def sma(c, n): return sum(c[-n:]) / n if len(c) >= n else None
def support(k, p, w=3):
    k = k[-120:]; lows = [k[i][2] for i in range(w, len(k)-w) if k[i][2] == min(x[2] for x in k[i-w:i+w+1]) and k[i][2] < p]
    return max(lows) if lows else min(x[2] for x in k[-90:])
def resist(k, p, w=3):
    k = k[-120:]; hi = [k[i][1] for i in range(w, len(k)-w) if k[i][1] == max(x[1] for x in k[i-w:i+w+1])]
    return max(hi) if hi else None
def main():
    cg = get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&price_change_percentage=24h,7d')
    toks = json.load(open(os.path.join(ROOT, 'tokens.json')))['tokens']
    want = {t['coingecko'] for t in toks}
    coins = [c for c in cg if c['symbol'].lower() not in STABLE and 'usd' not in c['symbol'].lower()[-3:] and not c['id'].startswith(('wrapped', 'staked', 'bridged')) and c['id'] not in ('weth', 'wbtc', 'steth', 'wsteth', 'cbbtc', 'weeth', 'rseth', 'jitosol', 'msol', 'bnsol', 'lbtc', 'solvbtc', 'coinbase-wrapped-btc', 'binance-peg-weth')][:200]
    have = {c['id'] for c in coins}
    miss = [i for i in want if i not in have]
    if miss: coins += get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=' + ','.join(miss) + '&price_change_percentage=24h,7d')
    fund = {}
    try:
        for x in get('https://fapi.binance.com/fapi/v1/premiumIndex'):
            if x['symbol'].endswith('USDT'): fund[x['symbol'][:-4]] = float(x['lastFundingRate']) * 100
    except Exception as e: print('binance funding', e)
    try:
        for x in get('https://api.bybit.com/v5/market/tickers?category=linear')['result']['list']:
            s = x['symbol']
            if s.endswith('USDT') and x.get('fundingRate') and s[:-4] not in fund: fund[s[:-4]] = float(x['fundingRate']) * 100
    except Exception as e: print('bybit funding', e)
    try:
        meta, ctx = get('https://api.hyperliquid.xyz/info', {'type': 'metaAndAssetCtxs'})
        for a, c in zip(meta['universe'], ctx):
            if a['name'] not in fund: fund[a['name']] = float(c['funding']) * 8 * 100  # hourly -> 8h equiv
    except Exception as e: print('hl funding', e)
    v24 = {}
    try:
        for x in get('https://data-api.binance.vision/api/v3/ticker/24hr'):
            if x['symbol'].endswith('USDT'): v24[x['symbol'][:-4]] = float(x['quoteVolume'])
    except Exception as e: print('binance 24h', e)
    try:
        for x in get('https://api.bybit.com/v5/market/tickers?category=spot')['result']['list']:
            s = x['symbol']
            if s.endswith('USDT') and s[:-4] not in v24: v24[s[:-4]] = float(x['turnover24h'])
    except Exception as e: print('bybit 24h', e)
    out = []
    for c in coins:
        s = c['symbol'].upper(); k = None
        for u in (f'https://data-api.binance.vision/api/v3/klines?symbol={s}USDT&interval=1d&limit=220',):
            try:
                r = get(u, tries=1); k = [[float(x[1]), float(x[2]), float(x[3]), float(x[4]), float(x[7])] for x in r]
                if r and r[-1][6] / 1000 < time.time() - 2 * 86400: k = None  # delisted pair: stale candles
            except Exception: k = None
        if not k:
            try:
                r = get(f'https://api.bybit.com/v5/market/kline?category=spot&symbol={s}USDT&interval=D&limit=220', tries=1)['result']['list']
                k = [[float(x[1]), float(x[2]), float(x[3]), float(x[4]), float(x[6])] for x in reversed(r)] or None
            except Exception: k = None
        row = {'id': c['id'], 's': s, 'n': c['name'], 'img': c['image'], 'rank': c['market_cap_rank'], 'p': c['current_price'], 'mc': c['market_cap'], 'vol': c['total_volume'],
               'c24': c.get('price_change_percentage_24h_in_currency'), 'c7': c.get('price_change_percentage_7d_in_currency'), 'f': round(fund[s], 4) if s in fund else None}
        if k and len(k) >= 30:
            cl = [x[3] for x in k]; p = cl[-1]; m50, m200 = sma(cl, 50), sma(cl, 200); sp = support(k, p); rs = resist(k[:-1], p)
            v20 = sum(x[4] for x in k[-21:-1]) / 20  # 20 completed UTC days
            vl = v24.get(s) or (k[-1][4] + k[-2][4] * max(0, 1 - (time.time() % 86400) / 86400))  # rolling 24h; fallback approximates it
            row.update({'rsi': round(rsi(cl), 1), 'd50': round((p/m50 - 1)*100, 2) if m50 else None, 'd200': round((p/m200 - 1)*100, 2) if m200 else None,
                        'sup': sp, 'dsup': round((p/sp - 1)*100, 2) if sp else None, 'hi': rs, 'brk': bool(rs and p >= rs * 0.995),
                        'vs': round(vl / v20, 2) if v20 else None, 'vs2': round(max(vl, k[-2][4]) / v20, 2) if v20 else None})
        out.append(row); time.sleep(0.05)
    json.dump({'_help': 'Screener universe built every 3h (GitHub Action) by scripts/build_screener.py. rsi=daily RSI14, d50/d200=% from 50/200-day MA, dsup=% above nearest daily swing-low support, vs=rolling 24h volume (Binance/Bybit pair, USDT) ÷ 20-day avg of completed daily volume (vs2 = max of last 24h and yesterday), f=funding % per 8h, brk=closing at/above 120-day swing high.',
               'updated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'coins': out}, open(os.path.join(ROOT, 'screener.json'), 'w'), separators=(',', ':'))
    print(len(out), sum(1 for r in out if 'rsi' in r), 'with candles')
main()
