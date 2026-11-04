#!/usr/bin/env python3
"""Smart-money snapshot from Hyperliquid's public (keyless) API.
Top N wallets by 30-day PnL (account value >= MIN_AV) -> open perp positions -> per-coin aggregates + biggest positions.
Writes smart_money.json. Only real API values; nothing estimated except avg leverage (= notional / margin used, as reported)."""
import json, time, urllib.request, datetime as dt, concurrent.futures as cf, sys
LB = 'https://stats-data.hyperliquid.xyz/Mainnet/leaderboard'; INFO = 'https://api.hyperliquid.xyz/info'
N, MIN_AV, TOPPOS = 500, 100_000, 12
TRACK = {t['symbol'] for t in json.load(open('tokens.json'))['tokens']}
def get(url, body=None, tries=5):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None, headers={'Content-Type': 'application/json', 'User-Agent': 'kms-capital'})
            with urllib.request.urlopen(req, timeout=60) as r: return json.load(r)
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(2 * (i + 1) + (10 if '429' in str(e) else 0))
rows = get(LB)['leaderboardRows']
def perf(r, w):
    for k, v in r['windowPerformances']:
        if k == w: return float(v['pnl'])
    return 0.0
cand = [r for r in rows if float(r['accountValue']) >= MIN_AV]
cand.sort(key=lambda r: perf(r, 'month'), reverse=True)
top = cand[:N]
print('leaderboard', len(rows), 'eligible', len(cand), 'using', len(top))
def state(r):
    time.sleep(0.25)
    try: return r, get(INFO, {'type': 'clearinghouseState', 'user': r['ethAddress']})
    except Exception as e: return r, None
res = []
with cf.ThreadPoolExecutor(4) as ex:  # ~8 req/s * weight 2 stays under HL's 1200 weight/min
    for r, s in ex.map(state, top): res.append((r, s))
ok = [x for x in res if x[1]]
print('states ok', len(ok), 'failed', len(res) - len(ok))
agg, pos = {}, {}
for r, s in ok:
    for ap in s.get('assetPositions', []):
        p = ap.get('position') or {}; c = p.get('coin'); szi = float(p.get('szi') or 0)
        if not c or szi == 0: continue
        ntl = abs(float(p.get('positionValue') or 0)); lev = (p.get('leverage') or {}).get('value')
        a = agg.setdefault(c, {'nL': 0, 'nS': 0, 'vL': 0.0, 'vS': 0.0, 'levN': 0.0, 'levD': 0.0})
        if szi > 0: a['nL'] += 1; a['vL'] += ntl
        else: a['nS'] += 1; a['vS'] += ntl
        if lev: a['levN'] += float(lev) * ntl; a['levD'] += ntl
        liq = p.get('liquidationPx')
        pos.setdefault(c, []).append({'a': r['ethAddress'], 'n': r.get('displayName') or None, 'side': 'L' if szi > 0 else 'S', 'lev': lev, 'sz': float(f'{abs(szi):.6g}'), 'ntl': round(ntl, 2),
            'entry': float(p['entryPx']) if p.get('entryPx') else None, 'liq': float(liq) if liq else None, 'upnl': round(float(p.get('unrealizedPnl') or 0), 2), 'pnl30': round(perf(r, 'month'), 2), 'av': round(float(r['accountValue']), 2)})
coins = {}
for c, a in agg.items():
    n, v = a['nL'] + a['nS'], a['vL'] + a['vS']
    coins[c] = {'traders': n, 'long': a['nL'], 'short': a['nS'], 'longPct': round(100 * a['nL'] / n, 1), 'ntlLong': round(a['vL']), 'ntlShort': round(a['vS']),
        'longPctNtl': round(100 * a['vL'] / v, 1) if v else None, 'net': round(a['vL'] - a['vS']), 'avgLev': round(a['levN'] / a['levD'], 1) if a['levD'] else None,
        'top': sorted(pos[c], key=lambda x: -x['ntl'])[:TOPPOS]}
keep = TRACK | set(sorted(coins, key=lambda c: -coins[c]['traders'])[:40])
for c in coins:
    if c not in keep: coins[c]['top'] = []
if len(ok) < 200: print('FAIL: too few wallet states'); sys.exit(1)
out = {'updated': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'source': 'Hyperliquid public API (leaderboard + clearinghouseState)',
    'universe': {'rule': f'top {N} by 30d PnL, account value >= ${MIN_AV:,}', 'wallets': len(ok), 'eligible': len(cand)}, 'coins': coins}
json.dump(out, open('smart_money.json', 'w'), separators=(',', ':'))
print('coins', len(coins), {k: coins[k]['traders'] for k in ['BTC', 'HYPE', 'SOL', 'MON', 'LIT', 'AAVE', 'NEAR', 'PENDLE'] if k in coins})
