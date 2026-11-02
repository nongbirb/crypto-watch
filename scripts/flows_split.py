#!/usr/bin/env python3
"""Add a stablecoin vs non-stable split to flows.json (stable[w][source] = [[from, to, stable_usd], ...]).
Uses the build_flows caches, so nothing is re-collected except small samples:
  across    per deposit: input token is a $1 stablecoin (DefiLlama symbol in STABLE / USD*, price 0.97-1.03)
  layerzero USDT0 + PYUSD apps = stable; Stargate cached records carry no symbol, so their share is taken
            per route from a fresh sample of recent Stargate messages (falls back to the sample-wide share)
  wormhole  Wormholescan top-assets-by-volume: stable share per source chain, applied to that chain's pairs
  debridge  no token data -> not split (left out of the stable views; listed in split.unsplit)
Usage: python3 scripts/flows_split.py  (also run automatically at the end of build_flows.py)"""
import json, os, gzip, glob, sys
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_flows as B

def isstable(p):
    return bool(p) and len(p) > 2 and 0.97 <= p[0] <= 1.03 and (p[2] in B.STABLE or p[2].startswith('USD'))

def run():
    F = os.path.join(B.ROOT, 'flows.json'); doc = json.load(open(F))
    now = int(doc and B.time.mktime(B.time.strptime(doc['updated'], '%Y-%m-%dT%H:%M:%SZ')) - B.time.timezone)
    W = {w: now - n * B.DAY for w, n in B.WIN.items()}
    out = {w: {} for w in W}; meth = {}
    # ---- Across
    keys = set(); raw = {}
    for f in glob.glob(os.path.join(B.CACHE, 'across_raw_*.json.gz')):
        oc = int(f.split('_')[-1].split('.')[0]); ll = B.AC_LLAMA.get(oc if oc != 1337 else 999)
        for ts, x in json.load(gzip.open(f, 'rt'))['got']:
            if ll and x.get('inputToken'): k = f"{ll}:{x['inputToken']}"; keys.add(k); raw[f"{oc}-{x['depositId']}"] = k
    B.llama_prices(sorted(keys))
    acr = B.load('across').get('recs', {}); agg = {w: defaultdict(float) for w in W}; miss = 0
    for k, (ts, s, t, v, h, app) in acr.items():
        tk = raw.get(k)
        if tk is None: miss += 1
        if tk and isstable(B.PX.get(tk)):
            for w, t0 in W.items():
                if ts >= t0: agg[w][(s, t)] += v
    for w in W: out[w]['across'] = agg[w]
    meth['across'] = f'per deposit by input token ({miss} of {len(acr)} unmatched -> non-stable)'
    # ---- LayerZero
    B.stargate_meta(); share = defaultdict(lambda: [0.0, 0.0]); tot = [0.0, 0.0]; tok = None
    for _ in range(12):
        r = B.get('https://scan.layerzero-api.com/v1/messages/latest?limit=150' + (f'&nextToken={B.urllib.parse.quote(tok)}' if tok else ''))
        if not r: break
        for m in r.get('data', []):
            if m['pathway']['sender'].get('id') != 'stargate': continue
            pl = (m['source']['tx'].get('payload') or '')[2:]
            if pl[:2] != '01': continue
            meta = B.SG.get(int(pl[2:6], 16))
            if not meta: continue
            st = meta[0] in B.STABLE; rt = (B.norm(B.LZ, m['pathway']['sender']['chain']), B.norm(B.LZ, m['pathway']['receiver']['chain']))
            share[rt][0] += st; share[rt][1] += 1; tot[0] += st; tot[1] += 1
        tok = r.get('nextToken')
        if not tok: break
    g = tot[0] / tot[1] if tot[1] else 0.7
    lzr = B.load('layerzero').get('recs', {}); agg = {w: defaultdict(float) for w in W}
    for ts, s, t, v, h, app in lzr.values():
        if app == 'stargate':
            a = share.get((s, t)); f = a[0] / a[1] if a and a[1] >= 5 else g
        else: f = 1.0
        for w, t0 in W.items():
            if ts >= t0: agg[w][(s, t)] += v * f
    for w in W: out[w]['layerzero'] = agg[w]
    meth['layerzero'] = f'USDT0/PYUSD = stable; Stargate share by route from {int(tot[1])} recent msgs (overall {g:.0%})'
    # ---- Wormhole
    for w in W:
        d = B.get(f'https://api.wormholescan.io/api/v1/top-assets-by-volume?timeSpan={'7d' if w == '1d' else w}') or {}
        sh = defaultdict(lambda: [0.0, 0.0])
        for a in d.get('assets', []):
            c = B.norm(B.WH, a['emitterChain']); v = float(a['volume']); sh[c][1] += v
            if a['symbol'].upper() in B.STABLE: sh[c][0] += v
        gs = sum(x[0] for x in sh.values()) / (sum(x[1] for x in sh.values()) or 1)
        out[w]['wormhole'] = {(s, t): v * (sh[s][0] / sh[s][1] if sh[s][1] else gs) for s, t, v in doc['windows'][w].get('wormhole', [])}
    meth['wormhole'] = 'stable share per source chain from Wormholescan top assets (1d uses the 7d share)'
    # ---- write rows aligned with windows (stable usd <= total)
    st = {}
    for w in W:
        st[w] = {}
        for src, rows in doc['windows'][w].items():
            if src not in out[w]: continue
            a = out[w][src]; st[w][src] = [[s, t, round(min(v, a.get((s, t), 0)))] for s, t, v in rows]
    doc['stable'] = st
    doc['split'] = {'method': meth, 'unsplit': ['debridge'], 'note': 'Stablecoins = USDC, USDT/USDT0, PYUSD, DAI/USDS, USDe, FDUSD and other USD-pegged tokens.'}
    json.dump(doc, open(F, 'w'), separators=(',', ':'))
    for w in W:
        a = sum(r[2] for v in st[w].values() for r in v); b = sum(r[2] for k, v in doc['windows'][w].items() if k in st[w] for r in v)
        B.log(w, 'stable share', round(a / b, 3) if b else None)
    B.log(json.dumps(meth))

if __name__ == '__main__': run()
