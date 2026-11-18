#!/usr/bin/env python3
"""v65 Hyperliquid on-chain liquidation map: every open perp position of the largest Hyperliquid accounts, binned at its
real liquidationPx (the price Hyperliquid itself reports for that account), per coin. Keyless public API only.

Accounts: the leaderboard (stats-data, every account with activity) ranked by account value; the largest HL_N (default 5,000)
are read. On Nov 18 2026 the top 5,000 held ~96% of all leaderboard account value. Vaults are included: their positions are real
positions and are liquidated like any other. Each account's clearinghouseState gives positionValue, szi and liquidationPx
(null when the account cannot be liquidated at any price within reach, counted as noLiq).

Coverage per coin = tracked long + short notional / (2 x open interest), open interest from metaAndAssetCtxs (one side, in coins,
x mark). Shown in the app so a thin sample is never read as the whole market.

Bins: STEP % wide from -RANGE % to +RANGE % of the mark at snapshot time, as sparse [index, usd] pairs where index i covers
[i * STEP, (i + 1) * STEP) % from the mark. Beyond the range -> outside. Nothing is estimated or filled in.

Rate limits: Hyperliquid's aggregated REST weight limit is 1200 per IP per minute; clearinghouseState and metaAndAssetCtxs
weigh 2 and 20. This job spends WEIGHT_PER_MIN (default 1000) so ~5,000 accounts take ~10 minutes.
Exit 1 (file left unchanged) when fewer than MIN_OK of the accounts could be read."""
import concurrent.futures as cf, datetime as dt, json, os, sys, threading, time, urllib.request, urllib.error

LB = 'https://stats-data.hyperliquid.xyz/Mainnet/leaderboard'; INFO = 'https://api.hyperliquid.xyz/info'
N = int(os.environ.get('HL_N', 5000)); WEIGHT_PER_MIN = int(os.environ.get('HL_WPM', 1000)); THREADS = 6
STEP = 0.5; RANGE = 30; MIN_OK = 0.9; MIN_NTL = 250_000; MAX_COINS = 150
OUT = os.environ.get('HL_OUT', 'data/hlliq.json')
UA = {'content-type': 'application/json', 'user-agent': 'crypto-watch-data/1.0'}

class Bucket:
    def __init__(s, per_min): s.cap = per_min; s.tok = per_min / 6; s.t = time.monotonic(); s.lock = threading.Lock(); s.used = 0
    def take(s, w):
        while True:
            with s.lock:
                now = time.monotonic(); s.tok = min(s.cap / 6, s.tok + (now - s.t) * s.cap / 60); s.t = now  # burst of 10 s at most
                if s.tok >= w: s.tok -= w; s.used += w; return
                wait = (w - s.tok) * 60 / s.cap
            time.sleep(wait)
LIM = Bucket(WEIGHT_PER_MIN); N429 = [0]

def get(url, body=None, weight=20, tries=5):
    for i in range(tries):
        if body is not None: LIM.take(weight)
        try:
            q = urllib.request.Request(url, json.dumps(body).encode() if body is not None else None, UA)
            with urllib.request.urlopen(q, timeout=60) as r: return json.load(r)
        except Exception as e:
            is429 = isinstance(e, urllib.error.HTTPError) and e.code == 429
            if is429: N429[0] += 1
            if i == tries - 1: raise
            time.sleep(2 * (i + 1) + (20 * (i + 1) if is429 else 0))

def f(x):
    try: v = float(x); return v if v == v else None
    except (TypeError, ValueError): return None
def sig(x, n=6): return float(f'{x:.{n}g}')
def iso(t): return t.strftime('%Y-%m-%dT%H:%M:%SZ')

def positions(st):
    """clearinghouseState -> [(coin, side, usd, liq)] for open positions"""
    out = []
    for a in (st or {}).get('assetPositions') or []:
        p = a.get('position') or {}; szi = f(p.get('szi')) or 0
        if not szi: continue
        out.append((p.get('coin'), 'L' if szi > 0 else 'S', abs(f(p.get('positionValue')) or 0), f(p.get('liquidationPx'))))
    return out

def aggregate(rows, mark, oi):
    """rows: [(coin, side, usd, liq)] of every tracked position; mark/oi: {coin: price}, {coin: one-side OI in USD}"""
    C = {}
    for coin, side, usd, liq in rows:
        m = mark.get(coin)
        if not m or usd <= 0: continue
        c = C.setdefault(coin, {'L': {}, 'S': {}, 'n': 0, 'long': 0.0, 'short': 0.0, 'noLiq': {'n': 0, 'long': 0.0, 'short': 0.0}, 'outside': {'long': 0.0, 'short': 0.0}})
        k = 'long' if side == 'L' else 'short'; c['n'] += 1; c[k] += usd
        if not liq or liq <= 0: c['noLiq']['n'] += 1; c['noLiq'][k] += usd; continue
        d = round((liq / m - 1) * 100, 9)  # rounded first so 95 / 100 - 1 lands in bin -10, not -11
        if d < -RANGE or d >= RANGE: c['outside'][k] += usd; continue
        i = int(d // STEP); c[side][i] = c[side].get(i, 0.0) + usd
    out = {}
    for coin, c in sorted(C.items(), key=lambda kv: -(kv[1]['long'] + kv[1]['short'])):
        tot = c['long'] + c['short']
        if tot < MIN_NTL or len(out) >= MAX_COINS: continue
        o = oi.get(coin) or 0
        out[coin] = {'mark': sig(mark[coin]), 'oi': round(o), 'cov': round(100 * tot / (2 * o), 1) if o > 0 else None, 'n': c['n'],
                     'long': round(c['long']), 'short': round(c['short']),
                     'L': [[i, round(v)] for i, v in sorted(c['L'].items()) if v >= 1], 'S': [[i, round(v)] for i, v in sorted(c['S'].items()) if v >= 1],
                     'noLiq': {'n': c['noLiq']['n'], 'long': round(c['noLiq']['long']), 'short': round(c['noLiq']['short'])},
                     'outside': {'long': round(c['outside']['long']), 'short': round(c['outside']['short'])}}
    return out

def main():
    t0 = time.monotonic(); started = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    rows = get(LB)['leaderboardRows']
    rows.sort(key=lambda r: -(f(r.get('accountValue')) or 0)); top = rows[:N]
    av_all = sum(f(r.get('accountValue')) or 0 for r in rows); av_top = sum(f(r.get('accountValue')) or 0 for r in top)
    print('leaderboard', len(rows), 'reading', len(top), f'(account value >= ${f(top[-1]["accountValue"]):,.0f}, {100 * av_top / av_all:.1f}% of all)')
    def state(a):
        try: return get(INFO, {'type': 'clearinghouseState', 'user': a}, weight=2)
        except Exception: return None
    pos, ok = [], 0
    with cf.ThreadPoolExecutor(THREADS) as ex:
        for i, st in enumerate(ex.map(state, [r['ethAddress'] for r in top])):
            if st is not None: ok += 1; pos += positions(st)
            if (i + 1) % 500 == 0: print(f'  {i + 1}/{len(top)} read, {int(time.monotonic() - t0)} s, 429s {N429[0]}', flush=True)
    meta, ctx = get(INFO, {'type': 'metaAndAssetCtxs'}, weight=20)  # mark + OI read right after the positions, so the bins match the price
    snap = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    mark, oi = {}, {}
    for u, c in zip(meta['universe'], ctx):
        m = f(c.get('markPx'))
        if m: mark[u['name']] = m; oi[u['name']] = (f(c.get('openInterest')) or 0) * m
    print('accounts ok', ok, 'failed', len(top) - ok, 'positions', len(pos), '429s', N429[0], 'weight', LIM.used, 'secs', int(time.monotonic() - t0))
    if ok < MIN_OK * len(top): print(f'only {ok} of {len(top)} accounts read: keeping the previous file'); sys.exit(1)
    out = {'updated': iso(snap), 'started': iso(started), 'source': 'Hyperliquid public API (stats-data leaderboard + clearinghouseState + metaAndAssetCtxs)',
           'accounts': {'ranked': len(rows), 'read': ok, 'asked': len(top), 'minAv': round(f(top[-1]['accountValue']) or 0), 'avShare': round(100 * av_top / av_all, 1)},
           'step': STEP, 'range': RANGE, 'positions': len(pos), 'coins': aggregate(pos, mark, oi)}
    os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True)
    with open(OUT, 'w') as fh: json.dump(out, fh, separators=(',', ':'))
    print('wrote', OUT, os.path.getsize(OUT), 'bytes,', len(out['coins']), 'coins')

if __name__ == '__main__': main()
