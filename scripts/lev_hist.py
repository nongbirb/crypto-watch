#!/usr/bin/env python3
"""Leverage history (docs/architect-proof-layer.md §5, Phase 4). Called at the end of scripts/build_positioning.py; runnable alone.
  data/lev/daily-YYYY.json  per token and venue per UTC day: average 8h-equivalent settled funding, the same measured against the
                            venue default (rate - 0.01 % per 8h), the number of settlements, and the last open-interest reading of
                            that day. Plus the CoinGecko close and market cap. The last 90 days are backfilled where the venue has history.
  data/lev/recent.json      hourly open interest for OKX and Hyperliquid for the last 8 days (OKX from its server-side history,
                            Hyperliquid recorded each run because its API gives no OI history).
Venues: OKX and Hyperliquid only. Binance USD-M and Bybit are geo-blocked from GitHub's US runners (HTTP 451 / CloudFront 403), so the
browser keeps fetching them live but they have no stored history. Only real API values; a missing value stays missing (null).
Units: funding in parts per million of notional per 8h (100 = 0.01 % per 8h), open interest in thousands of USD, market cap in millions.

Time stamps (audit M1, M2): every reading is stored under the moment it describes.
  OKX open-interest rows are stamped at the START of their period but hold the value at its END: a 1D row is stored at ts + 24h,
  a 1H row at ts + 1h, and a row whose period has not ended yet is skipped. A reading at exactly 00:00 UTC is the close of the day
  before (stored as hour 24 of that day). CoinGecko's daily point at D 00:00 UTC is the price at the start of D = the close of D - 1.
Final days (audit H1): a day becomes final only after a run in which every fetch succeeded, or 3 days after it was first written,
with whatever is missing left null. A final day is never written again (the validator rejects any change to it)."""
import json, os, sys, time, urllib.request, datetime as dt
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.environ.get('LEV_DIR', os.path.join(ROOT, 'data/lev'))
DAYS, RECENT_H, DEFAULT8, GRACE_DAYS = 90, 8 * 24, 1e-4, 3   # default: 0.01 % per 8h on OKX and Hyperliquid (0.00125 %/h)
DAYMS, HOURMS = 86_400_000, 3_600_000
OK, HLI, CG = 'https://www.okx.com/api/v5', 'https://api.hyperliquid.xyz/info', 'https://api.coingecko.com/api/v3'
VENUES = ['okx', 'hyperliquid']
def get(u, body=None, tries=4):
    """JSON, or None when the request itself failed (network, HTTP error). An API-level error comes back as JSON."""
    for i in range(tries):
        try:
            rq = urllib.request.Request(u, data=json.dumps(body).encode() if body else None, headers={'User-Agent': 'kms-capital', 'Content-Type': 'application/json'})
            with urllib.request.urlopen(rq, timeout=60) as r: return json.load(r)
        except Exception as e:
            if i == tries - 1: print('ERR', u[:120], e); return None
            time.sleep(2 + 4 * i + (15 if '429' in str(e) else 0))
def day_of(ms): return dt.datetime.fromtimestamp(ms / 1000, dt.timezone.utc).strftime('%Y-%m-%d')
def hour_of(ms): return dt.datetime.fromtimestamp(ms // HOURMS * 3600, dt.timezone.utc).strftime('%Y-%m-%dT%H')  # the UTC hour that contains ms
def at(ms):
    """(day, hour) a reading taken at ms belongs to; exactly 00:00 UTC is the close of the previous day (hour 24)."""
    if ms % DAYMS == 0: return day_of(ms - 1), 24
    return day_of(ms), int(hour_of(ms)[-2:])
def ppm(x): return round(x * 1e6, 2)

def fund_days(rows):
    """rows: [(ms, rate_8h_equivalent)] settled. -> {day: [avg_ppm, excess_ppm, n]}; excess = average - the venue default (audit M3)."""
    by = {}
    for t, r in rows: by.setdefault(day_of(t), []).append(r)
    return {d: [ppm(sum(v) / len(v)), round(ppm(sum(v) / len(v)) - ppm(DEFAULT8), 2), len(v)] for d, v in by.items()}

# ---------- sources: each returns None when a request failed, [] / {} when the venue simply has nothing ----------
def okx_funding(inst, since):
    out, after = [], ''
    for _ in range(8):
        r = get(f'{OK}/public/funding-rate-history?instId={inst}&limit=100{after}')
        if r is None: return None
        if r.get('code') != '0' or not r['data']: break
        out += [(int(x['fundingTime']), float(x['realizedRate'])) for x in r['data']]
        last = int(r['data'][-1]['fundingTime'])
        if last < since or len(r['data']) < 100: break
        after = f'&after={last}'; time.sleep(0.25)
    out = sorted(set(out))
    # interval per settlement from the gap to the previous one (OKX moves some contracts to 4h / 2h / 1h); 8h-equivalent = r * 8 / ih
    rows = []
    for i, (t, r) in enumerate(out):
        ih = round((t - out[i - 1][0]) / HOURMS) if i else 8
        rows.append((t, r * 8 / max(1, min(8, ih or 8))))
    return [x for x in rows if x[0] >= since]
def okx_oi(inst, period, now_ms, limit=100):
    """[(moment_ms, usd)]: rows are stamped at the start of their period and hold the value at its end (audit M1)."""
    r = get(f'{OK}/rubik/stat/contracts/open-interest-history?instId={inst}&period={period}&limit={limit}')
    if r is None: return None
    if r.get('code') != '0': return []
    p = {'1D': DAYMS, '1H': HOURMS}[period]
    return sorted((int(x[0]) + p, float(x[3])) for x in r['data'] if int(x[0]) + p <= now_ms)   # [ts, oi, oiCcy, oiUsd]; open periods skipped
def hl_funding(coin, since):
    out, st = [], since
    for _ in range(10):
        r = get(HLI, {'type': 'fundingHistory', 'coin': coin, 'startTime': st})
        if r is None: return None
        out += [(int(x['time']), float(x['fundingRate']) * 8) for x in r]
        if len(r) < 500: break
        st = int(r[-1]['time']) + 1; time.sleep(0.3)
    return sorted(set(out))
def hl_ctx():
    r = get(HLI, {'type': 'metaAndAssetCtxs'})
    if r is None: return None
    meta, ctx = r; return {a['name']: float(ctx[i]['openInterest']) * float(ctx[i]['markPx']) for i, a in enumerate(meta['universe']) if i < len(ctx)}
def cg_daily(cid):
    """{day: [close, mc_MUSD]}: the 00:00 UTC point of day D is the close of D - 1 (audit M2); the intraday 'now' point is skipped."""
    r = get(f'{CG}/coins/{cid}/market_chart?vs_currency=usd&days={DAYS}&interval=daily')
    if r is None or 'prices' not in r: return None
    mc = {t: m for t, m in r.get('market_caps', [])}
    return {day_of(t - 1): [float(f'{p:.6g}'), round(mc[t] / 1e6) if mc.get(t) else None] for t, p in r['prices'] if t % DAYMS == 0}
SRC = {'okx_funding': okx_funding, 'okx_oi': okx_oi, 'hl_funding': hl_funding, 'hl_ctx': hl_ctx, 'cg_daily': cg_daily, 'sleep': time.sleep}

def load(p, d=None):
    try: return json.load(open(p))
    except Exception: return d
def dump(p, o):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f: json.dump(o, f, separators=(',', ':')); f.write('\n')

VI = {'okx': 2, 'hyperliquid': 3}   # day row per token: [px, mc_MUSD, okx, hyperliquid]; venue = [f_ppm, fx_ppm, n, oi_kUSD, oi_hour_utc] or null
def merge_day(row, sym, venue, f=None, oi=None, oih=None, pxmc=None):
    """Funding is replaced only by a value with at least as many settlements; the open-interest reading only by a later one of the
    same UTC day. Never a value from another day. Callers never pass a final day's row (audit H1)."""
    t = row.setdefault(sym, [None, None, None, None])
    if pxmc and t[0] is None: t[0], t[1] = pxmc   # a stored close is never revised (CoinGecko revises past market caps)
    if venue is None: return
    v = t[VI[venue]] or [None, None, 0, None, None]; t[VI[venue]] = v
    if f and f[2] >= v[2]: v[0], v[1], v[2] = f
    if oi is not None and (v[4] is None or oih >= v[4]): v[3], v[4] = round(oi / 1000), oih

def main(now=None, src=None):
    S = {**SRC, **(src or {})}
    now = now or dt.datetime.now(dt.timezone.utc); nms = int(now.timestamp() * 1000); since = nms - DAYS * DAYMS; iso = now.strftime('%Y-%m-%dT%H:%M:%SZ')
    tok = json.load(open(os.path.join(ROOT, 'tokens.json')))['tokens']
    years, scratch, failed = {}, {}, []
    def year(y):
        if y not in years: years[y] = load(os.path.join(DIR, f'daily-{y}.json')) or {'year': y, 'cols': ['px', 'mc', 'okx', 'hyperliquid'], 'venueCols': ['f', 'fx', 'n', 'oi', 'oiHourUtc'],
            'units': {'f': 'ppm of notional per 8h', 'fx': 'f - 100 (the venue default, 0.01 % per 8h)', 'oi': 'kUSD', 'mc': 'MUSD', 'oiHourUtc': '0-24, 24 = the 00:00 reading that closes the day'}, 'days': {}}
        return years[y]
    def final(d): return bool(year(int(d[:4])).get('final', {}).get(d))
    def row(d):  # a final day is never written: writes to it go to a throwaway row (audit H1)
        if final(d): return scratch.setdefault(d, {})
        Y = year(int(d[:4])); Y.setdefault('pending', {}).setdefault(d, iso); return Y['days'].setdefault(d, {})
    def fail(what): failed.append(what); print('fetch failed:', what)
    rp = os.path.join(DIR, 'recent.json'); R = load(rp) or {'v': 1, 'unit': 'kUSD', 'hours': {}}
    today = day_of(nms); hl = S['hl_ctx']()
    if hl is None: fail('hyperliquid metaAndAssetCtxs')
    stats = {}
    for t in tok:
        s = t['symbol']; okp = (t.get('perps') or {}).get('okx', s + '-USDT-SWAP'); hlc = (t.get('perps') or {}).get('hyperliquid', s); st = stats.setdefault(s, {})
        row(today); year(int(today[:4]) - 1) if today[5:] < '04-01' else None   # loads the files the 90-day window can touch
        have = lambda venue: sum(1 for Y in years.values() for d, x in Y['days'].items() if (x.get(s) or [None] * 4)[VI[venue]] and x[s][VI[venue]][0] is not None)
        fsince = lambda venue: since if have(venue) < DAYS - 10 else nms - GRACE_DAYS * DAYMS  # full 90-day backfill once, then the last 3 days
        need_px = any(not final(d) and d < today and (x.get(s) or [None])[0] is None for Y in years.values() for d, x in Y['days'].items()) or not any((x.get(s) or [None])[0] for Y in years.values() for x in Y['days'].values())
        if t.get('coingecko') and need_px:
            c = S['cg_daily'](t['coingecko'])
            if c is None: fail(f'coingecko {s}')
            else:
                for d, pm in c.items():
                    if d < today and d >= day_of(since): merge_day(row(d), s, None, pxmc=pm)
            S['sleep'](2.5)  # keyless CoinGecko: stay far under its per-minute limit
        if okp:
            fr = S['okx_funding'](okp, fsince('okx'))
            if fr is None: fail(f'okx funding {s}')
            else:
                for d, f in fund_days(fr).items(): merge_day(row(d), s, 'okx', f=f)
            for per in ('1D', '1H'):
                oi = S['okx_oi'](okp, per, nms)
                if oi is None: fail(f'okx oi {per} {s}'); continue
                for m, usd in oi:
                    d, h = at(m)
                    if d >= day_of(since): merge_day(row(d), s, 'okx', oi=usd, oih=h)
                    if per == '1H': R['hours'].setdefault(hour_of(m), {}).setdefault(s, [None, None])[0] = round(usd / 1000)
                if per == '1H': st['okx'] = len(oi)
        if hlc:
            fr = S['hl_funding'](hlc, fsince('hyperliquid'))
            if fr is None: fail(f'hyperliquid funding {s}')
            else:
                for d, f in fund_days(fr).items(): merge_day(row(d), s, 'hyperliquid', f=f)
            if hl and hl.get(hlc):  # recorded now: Hyperliquid has no open-interest history endpoint
                d, h = at(nms); merge_day(row(d), s, 'hyperliquid', oi=hl[hlc], oih=h)
                R['hours'].setdefault(hour_of(nms), {}).setdefault(s, [None, None])[1] = round(hl[hlc] / 1000)
                st['hl'] = 1
        S['sleep'](0.3)
    hour_now = hour_of(nms); lo = hour_of(nms - RECENT_H * HOURMS); R['hours'] = dict(sorted((h, v) for h, v in R['hours'].items() if lo <= h <= hour_now))
    R['updated'] = iso; R['venues'] = VENUES; dump(rp, R)
    grace = (now - dt.timedelta(days=GRACE_DAYS)).strftime('%Y-%m-%dT%H:%M:%SZ')
    for y, Y in years.items():
        Y['days'] = dict(sorted((d, v) for d, v in Y['days'].items() if v))  # history is kept once written
        fin, pend = Y.setdefault('final', {}), Y.setdefault('pending', {})
        for d in list(Y['days']):
            if d >= today or fin.get(d): continue
            # final when this run fetched everything (the day has ended, so nothing more will come), or GRACE_DAYS after it was first written
            if not failed or pend.get(d, iso) <= grace: fin[d] = True
        Y['final'] = {d: True for d in sorted(fin) if d in Y['days']}; Y['pending'] = {d: v for d, v in sorted(pend.items()) if d in Y['days'] and d not in Y['final']}
        if Y['days']: Y['updated'] = iso; dump(os.path.join(DIR, f'daily-{y}.json'), Y)   # never writes an empty year file
    print('lev history: tokens', len(stats), 'recent hours', len(R['hours']), 'failed fetches', len(failed), {s: v for s, v in stats.items()})
    return 0

if __name__ == '__main__': sys.exit(main())
