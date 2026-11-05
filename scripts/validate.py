#!/usr/bin/env python3
"""Sanity checks for the data files built by GitHub Actions. Exit 1 = do not commit."""
import json, sys, datetime as dt
def die(m): print('FAIL:', m); sys.exit(1)
def fresh(d, h=3):
    t = dt.datetime.fromisoformat(d['updated'].replace('Z', '+00:00'))
    if (dt.datetime.now(dt.timezone.utc) - t).total_seconds() > h * 3600: die('updated is stale: ' + d['updated'])
k = sys.argv[1]
if k == 'thai':  # light guard: warn on known-bad calques in generated Thai (see docs/thai_style.md)
    import os
    R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    bad = [l.strip() for l in open(os.path.join(R, 'scripts/thai_blocklist.txt'), encoding='utf-8') if l.strip() and not l.startswith('#')]
    def walk(o, p, out):
        if isinstance(o, dict):
            for a, b in o.items(): walk(b, p + '.' + a, out) if a != 'th' else walk_th(b, p + '.th', out)
        elif isinstance(o, list): [walk(b, f'{p}[{i}]', out) for i, b in enumerate(o)]
    def walk_th(o, p, out):
        if isinstance(o, str):
            for w in bad + [';']:
                if w in o: out.append((p, w, o[:80]))
        elif isinstance(o, dict): [walk_th(b, p + '.' + a, out) for a, b in o.items()]
        elif isinstance(o, list): [walk_th(b, f'{p}[{i}]', out) for i, b in enumerate(o)]
    hits = []
    nar = json.load(open(os.path.join(R, 'narrative.json')))
    walk(nar['editions'][0], 'narrative[0]', hits)
    walk(json.load(open(os.path.join(R, 'judgment.json'))), 'judgment', hits)
    for h in hits: print('WARN thai:', *h)
    import random; random.seed()
    lines = []
    walk_s = lambda o: [lines.append(o)] if isinstance(o, str) and len(o) > 25 else [walk_s(v) for v in (o.values() if isinstance(o, dict) else o if isinstance(o, list) else [])]
    walk_s(nar['editions'][0].get('top', {}).get('th', []) + [x.get('body', {}).get('th', '') for x in nar['editions'][0].get('narratives', [])])
    print('Spot check (read these 3 lines):'); [print('  -', l) for l in random.sample(lines, min(3, len(lines)))]
    print('OK thai' if not hits else f'WARN thai: {len(hits)} item(s) to rewrite'); sys.exit(0)
d = json.load(open({'screener': 'screener.json', 'news': 'news.json', 'onchain': 'onchain.json', 'flows': 'flows.json', 'smart': 'smart_money.json'}[k]))
fresh(d, float(sys.argv[2]) if len(sys.argv) > 2 else 3)
if k == 'screener':
    c = d['coins']; n = sum(1 for x in c if x.get('rsi') is not None)
    print(f'coins={len(c)} with_candles={n}')
    if len(c) < 190: die('fewer than 190 coins')
    if n < 120: die('fewer than 120 coins with exchange candles (exchange API blocked?)')
    btc = next((x for x in c if x.get('s') == 'BTC' or x.get('sym') == 'BTC' or x.get('symbol') == 'BTC'), None)
    if btc and btc.get('rsi') is None: die('BTC has no candles')
elif k == 'news':
    t = d['tokens']; tot = sum(len(v) if isinstance(v, list) else len(v.get('items', [])) for v in t.values())
    print(f'tokens={len(t)} items={tot}')
    if len(t) < 5 or tot < 25: die('too few news items')
elif k == 'onchain':
    print(f"chains={len(d['chains'])} days={len(d['days'])}")
    if len(d['chains']) != 15: die('expected 15 chains')
    if len(d['days']) < 300: die('history too short')
elif k == 'flows':
    print(f"chains={len(d['chains'])}", {s: {w: round(v.get(w, 0) / 1e6, 1) if isinstance(v.get(w, 0), (int, float)) else v.get(w) for w in ('1d', '7d', '30d')} for s, v in d['totals'].items()})
    if len(d['chains']) != 15: die('expected 15 chains')
    live = [s for s, v in d['totals'].items() if isinstance(v.get('7d'), (int, float)) and v['7d'] > 0]
    if len(live) < 3: die('fewer than 3 bridge sources returned data: ' + str(live))
elif k == 'smart':
    print(f"wallets={d['universe']['wallets']} coins={len(d['coins'])}")
    if d['universe']['wallets'] < 200: die('too few wallets')
    if 'BTC' not in d['coins'] or d['coins']['BTC']['traders'] < 20: die('BTC aggregate missing/too small')
    for ck in ('profit', 'size'):
        c = d.get('cohorts', {}).get(ck)
        if not c or c['universe']['wallets'] < 200 or 'BTC' not in c['coins']: die('cohort missing/too small: ' + ck)
print('OK', k)
