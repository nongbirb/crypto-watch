#!/usr/bin/env python3
"""Precompute onchain.json from DefiLlama's FREE public API (run daily by the routine).
Why precompute: protocol/hack/stablecoin files are several MB each, so the browser gets one small file instead.
Bridge endpoints (bridges.llama.fi) and active-user data are paid-only (HTTP 402), so flows are ESTIMATED:
  net capital flow = price-adjusted TVL change + stablecoin supply change. See update_judgment.md.
Usage: python3 scripts/build_onchain.py  (writes onchain.json and icons/chains/*.jpg)"""
import json, time, os, urllib.request, concurrent.futures as cf
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DAYS = 400
EXTRA = ['Hyperliquid L1', 'Monad']

def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'crypto-watch/1.0', 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=90) as r: return json.load(r)
        except Exception as e:
            if i == tries - 1: print('FAIL', url, e); return None
            time.sleep(2 + 3 * i)

def daily(pairs):  # [[ts,val]] -> {day_ts: val}
    return {int(t) // 86400 * 86400: float(v) for t, v in pairs if v is not None}

def series(d, days):  # dict -> aligned list over days (forward fill)
    out, last = [], None
    for t in days:
        if t in d: last = d[t]
        out.append(None if last is None else (round(last, 6) if abs(last) < 100 else round(last)))
    return out

chains = get('https://api.llama.fi/v2/chains')
chains.sort(key=lambda x: -(x.get('tvl') or 0))
sel = [c for c in chains[:15]]
for n in EXTRA:
    if not any(c['name'] == n for c in sel):
        sel += [c for c in chains if c['name'] == n]
names = [c['name'] for c in sel]
print('chains:', names)
now = int(time.time()) // 86400 * 86400 - 86400  # last complete UTC day
days = [now - 86400 * i for i in range(DAYS - 1, -1, -1)]
# DefiLlama's latest point is often "today"; drop today if it is missing in TVL later

def per_chain(c):
    n = c['name']; q = urllib.parse.quote(n)
    tvl = get(f'https://api.llama.fi/v2/historicalChainTvl/{q}') or []
    st = get(f'https://stablecoins.llama.fi/stablecoincharts/{q}') or []
    fees = get(f'https://api.llama.fi/overview/fees/{q}?excludeTotalDataChartBreakdown=true') or {}
    rev = get(f'https://api.llama.fi/overview/fees/{q}?excludeTotalDataChartBreakdown=true&dataType=dailyRevenue') or {}
    dex = get(f'https://api.llama.fi/overview/dexs/{q}?excludeTotalDataChartBreakdown=true') or {}
    agg = get(f'https://api.llama.fi/overview/bridge-aggregators/{q}?excludeTotalDataChartBreakdown=true') or {}
    gid = c.get('gecko_id') or c.get('gasTokenGeckoId')
    px = {}
    if gid:
        p = get(f'https://coins.llama.fi/chart/coingecko:{gid}?start={days[0]}&span={DAYS}&period=1d') or {}
        pts = (p.get('coins') or {}).get(f'coingecko:{gid}', {}).get('prices', [])
        px = daily([[x['timestamp'], x['price']] for x in pts])
    tv = daily([[x['date'], x['tvl']] for x in tvl])
    sc = daily([[x['date'], sum((x.get('totalCirculatingUSD') or {}).values())] for x in st])
    return n, dict(
        name=n, symbol=c.get('tokenSymbol'), gecko=gid, tvl_now=c.get('tvl'),
        tvl=series(tv, days), stables=series(sc, days), price=series(px, days),
        fees=series(daily(fees.get('totalDataChart') or []), days), revenue=series(daily(rev.get('totalDataChart') or []), days),
        dex=series(daily(dex.get('totalDataChart') or []), days), bridge_agg=series(daily(agg.get('totalDataChart') or []), days),
        fees_has=bool(fees.get('totalDataChart')), dex_has=bool(dex.get('totalDataChart')), rev_has=bool(rev.get('totalDataChart')))

import urllib.parse
out = {}
with cf.ThreadPoolExecutor(4) as ex:
    for n, d in ex.map(per_chain, sel): out[n] = d

# series with no data before a date -> None; zero-fill flows where metric exists but day missing
for d in out.values():
    for k in ('fees', 'revenue', 'dex', 'bridge_agg'):
        if not any(v for v in d[k] if v): d[k] = None

# top protocols per chain (one big file)
protos = get('https://api.llama.fi/protocols') or []
alias = {'Hyperliquid L1': ['Hyperliquid L1', 'Hyperliquid'], 'BSC': ['BSC', 'Binance'], 'OP Mainnet': ['OP Mainnet', 'Optimism']}
for n, d in out.items():
    rows = []
    for p in protos:
        ct = p.get('chainTvls') or {}
        v = next((ct[a] for a in alias.get(n, [n]) if ct.get(a)), None)
        if v and p.get('category') not in ('CEX', 'Chain'):
            rows.append((v, p))
    rows.sort(key=lambda x: -x[0]); tot = sum(v for v, _ in rows) or 1
    d['protocols'] = [dict(name=p['name'], tvl=round(v), share=round(v / tot, 4), category=p.get('category'), logo=p.get('logo'), change_1d=p.get('change_1d'), change_7d=p.get('change_7d'), url=p.get('url')) for v, p in rows[:10]]
    d['hhi'] = round(sum((v / tot) ** 2 for v, _ in rows), 4); d['protocol_count'] = len(rows)

hacks = get('https://api.llama.fi/hacks') or []
cut = now - 365 * 86400
for n, d in out.items():
    al = alias.get(n, [n])
    hs = [h for h in hacks if int(h['date']) >= cut and any(a in (h.get('chain') or []) for a in al)]
    hs.sort(key=lambda h: -int(h['date']))
    d['hacks'] = [dict(date=int(h['date']), name=h['name'], amount=h.get('amount'), technique=h.get('technique'), bridge=h.get('bridgeHack')) for h in hs[:8]]
    d['hacks_usd_365'] = sum(h.get('amount') or 0 for h in hs); d['hacks_n_365'] = len(hs)

# chain logos (DefiLlama icon CDN), saved locally
for n in out:
    slug = n.lower().replace(' ', '-')
    if n == 'Hyperliquid L1': slug = 'hyperliquid'
    if n == 'OP Mainnet': slug = 'optimism'
    if n == 'BSC': slug = 'binance'
    path = os.path.join(ROOT, 'icons', 'chains', slug + '.jpg')
    if not os.path.exists(path):
        try:
            req = urllib.request.Request(f'https://icons.llamao.fi/icons/chains/rsz_{slug}?w=64&h=64', headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as r: data = r.read()
            if len(data) > 100: open(path, 'wb').write(data)
        except Exception as e: print('logo fail', n, e)
    out[n]['logo'] = f'icons/chains/{slug}.jpg' if os.path.exists(path) else None

doc = dict(_help='Built by scripts/build_onchain.py from DefiLlama free API. Daily series aligned to `days` (UTC midnight, unix s). Flows are estimates; see update_judgment.md.',
           updated=time.strftime('%Y-%m-%dT%H:%M:%S+00:00', time.gmtime()), days=days, chains=[out[n] for n in names])
json.dump(doc, open(os.path.join(ROOT, 'onchain.json'), 'w'), separators=(',', ':'))
print('wrote onchain.json', os.path.getsize(os.path.join(ROOT, 'onchain.json')) // 1024, 'KB')
