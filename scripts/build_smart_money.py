#!/usr/bin/env python3
"""Smart-money snapshot from Hyperliquid's public (keyless) API.
Two separate cohorts (never blended):
  profit = top N wallets by 30-day PnL with account value >= MIN_AV (default view)
  size   = top N wallets by account value
Each wallet's open perp positions are fetched once (wallets in both cohorts are deduped), then aggregated per cohort.
Also stores whole-market context per coin from metaAndAssetCtxs (open interest, hourly funding, mark price).
Only real API values; avg leverage = notional-weighted leverage as reported by Hyperliquid."""
import json, time, urllib.request, datetime as dt, concurrent.futures as cf, sys
LB = 'https://stats-data.hyperliquid.xyz/Mainnet/leaderboard'; INFO = 'https://api.hyperliquid.xyz/info'
N, MIN_AV, TOPPOS, CONC = 500, 100_000, 12, 40.0
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
cand = sorted([r for r in rows if float(r['accountValue']) >= MIN_AV], key=lambda r: perf(r, 'month'), reverse=True)
COH = {'profit': {'rows': cand[:N], 'rule': f'top {N} by 30d PnL, account value >= ${MIN_AV:,}', 'eligible': len(cand)},
       'size': {'rows': sorted(rows, key=lambda r: -float(r['accountValue']))[:N], 'rule': f'top {N} by account value', 'eligible': len(rows)}}
uniq = {}
for c in COH.values():
    for r in c['rows']: uniq.setdefault(r['ethAddress'], r)
print('leaderboard', len(rows), 'eligible', len(cand), 'unique wallets to fetch', len(uniq))
def state(a):
    time.sleep(0.25)
    try: return a, get(INFO, {'type': 'clearinghouseState', 'user': a})
    except Exception: return a, None
with cf.ThreadPoolExecutor(4) as ex:  # ~8 req/s * weight 2 stays under HL's 1200 weight/min
    ST = dict(ex.map(state, list(uniq)))
print('states ok', sum(1 for v in ST.values() if v), 'failed', sum(1 for v in ST.values() if not v))
def build(crow):
    ok = [(r, ST.get(r['ethAddress'])) for r in crow]; ok = [x for x in ok if x[1]]
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
        n, v = a['nL'] + a['nS'], a['vL'] + a['vS']; ps = sorted(pos[c], key=lambda x: -x['ntl'])
        conc = {}
        for sd, tot in (('L', a['vL']), ('S', a['vS'])):
            big = next((p for p in ps if p['side'] == sd), None)
            if big and tot > 0 and 100 * big['ntl'] / tot > CONC: conc[sd] = {'a': big['a'], 'n': big['n'], 'pct': round(100 * big['ntl'] / tot, 1)}
        coins[c] = {'traders': n, 'long': a['nL'], 'short': a['nS'], 'longPct': round(100 * a['nL'] / n, 1), 'ntlLong': round(a['vL']), 'ntlShort': round(a['vS']),
            'longPctNtl': round(100 * a['vL'] / v, 1) if v else None, 'net': round(a['vL'] - a['vS']), 'avgLev': round(a['levN'] / a['levD'], 1) if a['levD'] else None,
            'conc': conc, 'top': ps[:TOPPOS]}
    keep = TRACK | set(sorted(coins, key=lambda c: -coins[c]['traders'])[:40])
    for c in list(coins):
        if c not in keep: del coins[c]
    return len(ok), coins
out = {'updated': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'source': 'Hyperliquid public API (leaderboard + clearinghouseState + metaAndAssetCtxs)', 'cohorts': {}}
for k, c in COH.items():
    w, coins = build(c['rows'])
    if w < 200: print('FAIL: too few wallet states for', k); sys.exit(1)
    out['cohorts'][k] = {'universe': {'rule': c['rule'], 'wallets': w, 'eligible': c['eligible']}, 'coins': coins}
    print(k, w, {s: (coins[s]['traders'], coins[s]['longPctNtl']) for s in sorted(TRACK) if s in coins})
out['universe'], out['coins'] = out['cohorts']['profit']['universe'], out['cohorts']['profit']['coins']  # backward compatible (= profit cohort)
try:
    meta, ctx = get(INFO, {'type': 'metaAndAssetCtxs'}); mk = {}
    for i, a in enumerate(meta['universe']):
        if a['name'] in TRACK and i < len(ctx):
            x = ctx[i]; m = float(x.get('markPx') or 0); oi = float(x.get('openInterest') or 0)
            mk[a['name']] = {'oiUsd': round(oi * m), 'funding': float(x.get('funding') or 0), 'mark': m}
    out['market'] = mk
except Exception as e: print('market ctx failed', e)
json.dump(out, open('smart_money.json', 'w'), separators=(',', ':'))
print('size bytes', len(json.dumps(out, separators=(',', ':'))))
