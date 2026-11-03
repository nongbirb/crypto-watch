#!/usr/bin/env python3
"""Build interop.json from the data embedded in https://l2beat.com/interop/summary (window.__SSR_DATA__).
No /api/ calls (robots.txt disallows them). Data: L2BEAT (l2beat.com), past 24h."""
import json, re, sys, urllib.request, datetime
URL = 'https://l2beat.com/interop/summary'
BASE = 'https://l2beat.com'
html = urllib.request.urlopen(urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0 (KMS Capital dashboard; github.com/nongbirb/crypto-watch)'}), timeout=60).read().decode()
m = (re.search(r'<script[^>]*id="ssr-data"[^>]*>(.*?)</script>', html, re.S)
     or re.search(r'window.__SSR_DATA__\s*=\s*(\{.*?\})\s*;?\s*</script>', html, re.S))
if not m: sys.exit('SSR data not found; keeping previous interop.json')
import html as H
raw = m.group(1).strip(); raw = raw if raw.startswith('{') else H.unescape(raw)
P = json.loads(raw); P = P.get('props', P)
q = next(x for x in P['queryState']['queries'] if x['queryKey'][0] == ['interop', 'flows'])
inp = json.loads(q['queryHash'])[1]['input']
d = q['state']['data']; d = json.loads(d) if isinstance(d, str) else d
ab = lambda u: u if not u or u.startswith('http') else BASE + u
def fix(o):
    if isinstance(o, dict): return {k: (ab(v) if k == 'iconUrl' and isinstance(v, str) else fix(v)) for k, v in o.items()}
    if isinstance(o, list): return [fix(x) for x in o]
    return o
d = fix(d)
sel = set(inp['chains'])
chains = [{k: c.get(k) for k in ('id', 'name', 'color', 'iconUrl', 'href')} for c in fix(P['interopChains']) if c['id'] in sel]
chains.sort(key=lambda c: inp['chains'].index(c['id']))
for c in chains: c['href'] = ab(c['href'])
assert abs(sum(f['volume'] for f in d['flows']) - d['stats']['totalVolume']) < 1, 'flows do not sum to total'
out = {'_help': 'Built by scripts/build_interop.py from l2beat.com/interop/summary embedded data (24h). Data: L2BEAT.',
       'source': URL, 'window': '24h',
       'updated': datetime.datetime.fromtimestamp(q['state']['dataUpdatedAt'] / 1000, datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
       'fetched': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
       'chains': chains, 'protocols': fix(P['protocols']), 'protocolIds': inp['protocolIds'], **d}
json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else 'interop.json', 'w'), separators=(',', ':'))
print('ok', out['updated'], len(out['flows']), 'routes', round(out['stats']['totalVolume']))
