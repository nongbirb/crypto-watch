#!/usr/bin/env python3
"""Leverage history (docs/architect-proof-layer.md §5, Phase 4). Called at the end of scripts/build_positioning.py; runnable alone.
  data/lev/daily-YYYY.json  per token and venue per UTC day: average 8h-equivalent settled funding, the same with settlements at the
                            venue floor counted as 0, the number of settlements, and the last open-interest reading of that day.
                            Plus CoinGecko daily close price and market cap. The last 90 days are backfilled where the venue has history.
  data/lev/recent.json      hourly open interest for OKX and Hyperliquid for the last 8 days (OKX from its server-side history,
                            Hyperliquid recorded each run because its API gives no OI history).
Venues: OKX and Hyperliquid only. Binance USD-M and Bybit are geo-blocked from GitHub's US runners (HTTP 451 / CloudFront 403), so the
browser keeps fetching them live but they have no stored history. Only real API values; a missing value stays missing (null).
Units: funding in parts per million of notional per 8h (100 = 0.01 % per 8h), open interest in thousands of USD, market cap in millions."""
import json, os, sys, time, urllib.request, datetime as dt
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.environ.get('LEV_DIR', os.path.join(ROOT, 'data/lev'))
DAYS, RECENT_H, FLOOR8 = 90, 8 * 24, 1e-4   # floor: 0.01 % per 8h, the default rate on OKX and Hyperliquid (0.00125 %/h)
OK, HLI, CG = 'https://www.okx.com/api/v5', 'https://api.hyperliquid.xyz/info', 'https://api.coingecko.com/api/v3'
VENUES = ['okx', 'hyperliquid']
def get(u, body=None, tries=4):
    for i in range(tries):
        try:
            rq = urllib.request.Request(u, data=json.dumps(body).encode() if body else None, headers={'User-Agent': 'kms-capital', 'Content-Type': 'application/json'})
            with urllib.request.urlopen(rq, timeout=60) as r: return json.load(r)
        except Exception as e:
            if i == tries - 1: print('ERR', u[:120], e); return None
            time.sleep(2 + 4 * i + (15 if '429' in str(e) else 0))
def day_of(ms): return dt.datetime.fromtimestamp(ms / 1000, dt.timezone.utc).strftime('%Y-%m-%d')
def hour_of(ms): return dt.datetime.fromtimestamp(ms // 3_600_000 * 3600, dt.timezone.utc).strftime("%Y-%m-%dT%H")  # the UTC hour that contains ms (never a later hour)
def at_floor(r8): return abs(r8 - FLOOR8) < 2e-8
def ppm(x): return round(x * 1e6, 2)

def fund_days(rows):
    """rows: [(ms, rate_8h_equivalent)] settled. -> {day: [avg_ppm, excess_avg_ppm, n]}; excess = floor settlements counted as 0."""
    by = {}
    for t, r in rows: by.setdefault(day_of(t), []).append(r)
    return {d: [ppm(sum(v) / len(v)), ppm(sum(0.0 if at_floor(x) else x for x in v) / len(v)), len(v)] for d, v in by.items()}
def okx_funding(inst, since):
    out, after = [], ''
    for _ in range(8):
        r = get(f'{OK}/public/funding-rate-history?instId={inst}&limit=100{after}')
        if not r or r.get('code') != '0' or not r['data']: break
        out += [(int(x['fundingTime']), float(x['realizedRate'])) for x in r['data']]
        last = int(r['data'][-1]['fundingTime'])
        if last < since or len(r['data']) < 100: break
        after = f'&after={last}'; time.sleep(0.25)
    out = sorted(set(out))
    # interval per settlement from the gap to the previous one (OKX moves some contracts to 4h / 2h / 1h); 8h-equivalent = r * 8 / ih
    rows = []
    for i, (t, r) in enumerate(out):
        ih = round((t - out[i - 1][0]) / 3_600_000) if i else 8
        rows.append((t, r * 8 / max(1, min(8, ih or 8))))
    return [x for x in rows if x[0] >= since]
def okx_oi(inst, period, limit=100):
    r = get(f'{OK}/rubik/stat/contracts/open-interest-history?instId={inst}&period={period}&limit={limit}')
    if not r or r.get('code') != '0': return []
    return sorted((int(x[0]), float(x[3])) for x in r['data'])   # [ts, oi, oiCcy, oiUsd]
def hl_funding(coin, since):
    out, st = [], since
    for _ in range(10):
        r = get(HLI, {'type': 'fundingHistory', 'coin': coin, 'startTime': st})
        if not r: break
        out += [(int(x['time']), float(x['fundingRate']) * 8) for x in r]
        if len(r) < 500: break
        st = int(r[-1]['time']) + 1; time.sleep(0.3)
    return sorted(set(out))
def hl_ctx():
    r = get(HLI, {'type': 'metaAndAssetCtxs'})
    if not r: return {}
    meta, ctx = r; return {a['name']: float(ctx[i]['openInterest']) * float(ctx[i]['markPx']) for i, a in enumerate(meta['universe']) if i < len(ctx)}
def cg_daily(cid):
    r = get(f'{CG}/coins/{cid}/market_chart?vs_currency=usd&days={DAYS}&interval=daily')
    if not r or 'prices' not in r: return {}
    px = {day_of(t): p for t, p in r['prices']}; mc = {day_of(t): m for t, m in r.get('market_caps', [])}
    return {d: [float(f'{px[d]:.6g}'), round(mc[d] / 1e6) if mc.get(d) else None] for d in px}

def load(p, d=None):
    try: return json.load(open(p))
    except Exception: return d
def dump(p, o):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f: json.dump(o, f, separators=(',', ':')); f.write('\n')

VI = {'okx': 2, 'hyperliquid': 3}   # day row per token: [px, mc_MUSD, okx, hyperliquid]; venue = [f_ppm, fx_ppm, n, oi_kUSD, oi_hour_utc] or null
def merge_day(row, sym, venue, f=None, oi=None, oih=None, pxmc=None):
    """Funding is replaced only by a value with at least as many settlements; the open-interest reading only by a later one of the
    same UTC day. Never a value from another day."""
    t = row.setdefault(sym, [None, None, None, None])
    if pxmc and t[0] is None: t[0], t[1] = pxmc   # a stored close is never revised (CoinGecko revises past market caps)
    if venue is None: return
    v = t[VI[venue]] or [None, None, 0, None, None]; t[VI[venue]] = v
    if f and f[2] >= v[2]: v[0], v[1], v[2] = f
    if oi is not None and (v[4] is None or oih >= v[4]): v[3], v[4] = round(oi / 1000), oih

def main(now=None):
    now = now or dt.datetime.now(dt.timezone.utc); nms = int(now.timestamp() * 1000); since = nms - DAYS * 86_400_000
    tok = json.load(open(os.path.join(ROOT, 'tokens.json')))['tokens']
    years = {}
    def row(d):
        y = int(d[:4])
        if y not in years: years[y] = load(os.path.join(DIR, f'daily-{y}.json')) or {'year': y, 'cols': ['px', 'mc', 'okx', 'hyperliquid'], 'venueCols': ['f', 'fx', 'n', 'oi', 'oiHourUtc'], 'units': {'f': 'ppm of notional per 8h', 'oi': 'kUSD', 'mc': 'MUSD'}, 'days': {}}
        return years[y]['days'].setdefault(d, {})
    rp = os.path.join(DIR, 'recent.json'); R = load(rp) or {'v': 1, 'unit': 'kUSD', 'hours': {}}
    hl = hl_ctx(); hour_now = hour_of(nms); today = day_of(nms); stats = {}
    for t in tok:
        s = t['symbol']; okp = (t.get('perps') or {}).get('okx', s + '-USDT-SWAP'); hlc = (t.get('perps') or {}).get('hyperliquid', s); st = stats.setdefault(s, {})
        have = lambda venue: sum(1 for Y in years.values() for d, x in Y['days'].items() if (x.get(s) or [None] * 4)[VI[venue]] and x[s][VI[venue]][0] is not None)
        row(today)  # loads this year's file before counting
        fsince = lambda venue: since if have(venue) < DAYS - 10 else nms - 3 * 86_400_000  # full 90-day backfill once, then the last 3 days
        yday = day_of(nms - 86_400_000)
        if t.get('coingecko') and (row(yday).get(s) or [None])[0] is None:
            for d, pm in cg_daily(t['coingecko']).items():
                if d < today: merge_day(row(d), s, None, pxmc=pm)   # today's CoinGecko point is intraday, not a close
            time.sleep(2.5)  # keyless CoinGecko: stay far under its per-minute limit
        if okp:
            for d, f in fund_days(okx_funding(okp, fsince('okx'))).items(): merge_day(row(d), s, 'okx', f=f)
            for ts, usd in okx_oi(okp, '1D'):  # OKX daily reading (its day starts 16:00 UTC): stored with its UTC hour
                merge_day(row(day_of(ts)), s, 'okx', oi=usd, oih=int(hour_of(ts)[-2:]))
            hh = okx_oi(okp, '1H')
            for ts, usd in hh:
                merge_day(row(day_of(ts)), s, 'okx', oi=usd, oih=int(hour_of(ts)[-2:]))
                R['hours'].setdefault(hour_of(ts), {}).setdefault(s, [None, None])[0] = round(usd / 1000)
            st['okx'] = len(hh)
        if hlc:
            for d, f in fund_days(hl_funding(hlc, fsince('hyperliquid'))).items(): merge_day(row(d), s, 'hyperliquid', f=f)
            if hl.get(hlc):  # recorded now: Hyperliquid has no open-interest history endpoint
                merge_day(row(today), s, 'hyperliquid', oi=hl[hlc], oih=int(hour_now[-2:]))
                R['hours'].setdefault(hour_now, {}).setdefault(s, [None, None])[1] = round(hl[hlc] / 1000)
                st['hl'] = 1
        time.sleep(0.3)
    lo = hour_of(nms - RECENT_H * 3_600_000); R['hours'] = dict(sorted((h, v) for h, v in R['hours'].items() if lo <= h <= hour_now))
    R['updated'] = now.strftime('%Y-%m-%dT%H:%M:%SZ'); R['venues'] = VENUES; dump(rp, R)
    for y, Y in years.items():
        Y['days'] = dict(sorted((d, v) for d, v in Y['days'].items() if v))  # history is kept once written
        # a day is final once a run after its end has refreshed it (funding settlements and the last OI reading are then complete)
        for d, v in Y['days'].items():
            if d < today: Y.setdefault('final', {})[d] = True
        Y['final'] = {d: True for d in Y.get('final', {}) if d in Y['days']}
        Y['updated'] = R['updated']; dump(os.path.join(DIR, f'daily-{y}.json'), Y)
    print('lev history: tokens', len(stats), 'recent hours', len(R['hours']), {s: v for s, v in stats.items()})
    return 0

if __name__ == '__main__': sys.exit(main())
