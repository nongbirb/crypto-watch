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
if k in ('ledger', 'verdict_bt'):  # Proof Layer (docs/architect-proof-layer.md §2.2-2.3): schema, size caps, locked ledger fields
    import os, re, subprocess
    R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
    num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
    def cap(p, kb):
        z = os.path.getsize(p)
        if z > kb * 1024: die(f'{p}: {z / 1024:.1f} KB is over the {kb} KB cap')
    def stat(o, where):  # {n, nEff, med, p25, p75, pos, ci, ciPos}; nEff never above n; interval ordered
        if not isinstance(o, dict) or not num(o.get('n')) or not num(o.get('nEff')): die(where + ': n / nEff missing')
        if o['nEff'] > o['n'] or o['nEff'] < 0: die(where + ': nEff must be between 0 and n')
        if o['n'] and not all(num(o.get(x)) for x in ('med', 'p25', 'p75', 'pos')): die(where + ': stats missing')
        for c in ('ci', 'ciPos'):
            v = o.get(c)
            if v is not None and (not isinstance(v, list) or len(v) != 2 or not all(num(x) for x in v) or v[0] > v[1]): die(where + ': bad ' + c)
    if k == 'verdict_bt':
        p = opt('--file', os.path.join(R, 'verdict_backtest.json')); cap(p, 300); d = json.load(open(p))
        if not isinstance(d.get('updated'), str) or not isinstance(d.get('method'), dict) or not isinstance(d.get('tokens'), dict): die('verdict_backtest: updated / method / tokens missing')
        if len(d['tokens']) < 3: die('verdict_backtest: fewer than 3 tokens')
        for s_, t in d['tokens'].items():
            for f_ in ('from', 'years', 'short', 'states', 'baseline', 'train', 'test'):
                if f_ not in t: die(f'verdict_backtest {s_}: {f_} missing')
            if t['short'] != (t['years'] < 2): die(f'verdict_backtest {s_}: short flag does not match years')
            for part, blk in (('full', t), ('train', t['train']), ('test', t['test'])):
                for h in ('h1', 'h7', 'h30'): stat(blk['baseline'][h], f'{s_} {part} baseline {h}')
                for st in ('Long', 'Wait', 'Avoid'):
                    for h in ('h1', 'h7', 'h30'): stat(blk['states'][st][h], f'{s_} {part} {st} {h}')
        print('OK verdict_bt', len(d['tokens']), 'tokens', f'{os.path.getsize(p) / 1024:.1f} KB'); sys.exit(0)
    # ledger: data/ledger/YYYY-MM.json (cap 200 KB each) + summary.json (cap 100 KB)
    D = opt('--dir', os.path.join(R, 'data/ledger')); base = opt('--base', 'HEAD'); prev_dir = opt('--prev-dir')
    LOCKED = ('id', 't', 'sym', 'kind', 'from', 'to', 'px', 'ctx'); KINDS = ('verdict', 'pattern', 'funding_regime', 'oi_regime', 'sm_flow')
    TS = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$')
    def prev_of(rel):
        if prev_dir:
            q = os.path.join(prev_dir, os.path.basename(rel)); return json.load(open(q)) if os.path.exists(q) else None
        try: return json.loads(subprocess.run(['git', 'show', f'{base}:{rel}'], cwd=R, capture_output=True, check=True).stdout)
        except Exception: return None
    files = sorted(f for f in os.listdir(D) if re.match(r'^\d{4}-\d{2}\.json$', f)) if os.path.isdir(D) else []
    ids, last_t, n = set(), '', 0
    for f in files:
        p = os.path.join(D, f); cap(p, 200); m = json.load(open(p))
        if m.get('month') != f[:7] or not isinstance(m.get('entries'), list): die(f + ': month / entries')
        for e in m['entries']:
            w = f + ' ' + str(e.get('id'))
            if not isinstance(e, dict) or any(x not in e for x in LOCKED): die(w + ': missing locked field')
            if not isinstance(e['id'], str) or e['id'] in ids: die(w + ': id missing or duplicated')
            ids.add(e['id'])
            if not isinstance(e['t'], str) or not TS.match(e['t']) or e['t'][:7] != f[:7]: die(w + ': t must be ISO UTC in this month')
            if e['t'] < last_t: die(w + ': t must not decrease')
            last_t = e['t']
            if e['kind'] not in KINDS: die(w + ': unknown kind ' + str(e['kind']))
            if e['kind'] == 'verdict' and (e['to'] not in ('Long', 'Wait', 'Avoid', 'Insufficient') or e['from'] not in (None, 'Long', 'Wait', 'Avoid', 'Insufficient')): die(w + ': verdict entries use the stored state codes')
            if not isinstance(e['sym'], str) or not isinstance(e['to'], str) or not (e['from'] is None or isinstance(e['from'], str)): die(w + ': sym / from / to')
            if not num(e['px']) or e['px'] <= 0 or not isinstance(e['ctx'], dict): die(w + ': px / ctx')
            for h in ('r1', 'r7', 'r30'):
                if e.get(h) is not None and not num(e[h]): die(w + ': ' + h + ' must be a number')
            n += 1
        pv = prev_of(os.path.relpath(p, R) if not prev_dir else f)
        if pv:  # append-only: the previous entries are an unchanged prefix (locked fields), grades and proofs never change once set
            pe = pv.get('entries', [])
            if len(pe) > len(m['entries']): die(f + ': entries were removed')
            for a, b in zip(pe, m['entries']):
                for x in LOCKED:
                    if a.get(x) != b.get(x): die(f'{f} {a.get("id")}: locked field changed: {x}')
                for x in ('r1', 'r7', 'r30', 'proof'):
                    if a.get(x) is not None and a.get(x) != b.get(x): die(f'{f} {a.get("id")}: {x} changed after it was set')
    if prev_dir: before = sorted(os.listdir(prev_dir))
    else:
        r_ = subprocess.run(['git', 'ls-tree', '--name-only', base + ':' + os.path.relpath(D, R)], cwd=R, capture_output=True, text=True)
        before = r_.stdout.split() if r_.returncode == 0 else []
    for f in before:
        if re.match(r'^\d{4}-\d{2}\.json$', f) and f not in files: die(f + ': ledger month file was removed')
    sp = os.path.join(D, 'summary.json')
    if os.path.exists(sp):
        cap(sp, 100); s_ = json.load(open(sp))
        if not isinstance(s_.get('updated'), str) or not isinstance(s_.get('rows'), list): die('summary: updated / rows')
        for r in s_['rows']:
            if r.get('kind') not in KINDS: die('summary: bad kind')
            for h in ('h1', 'h7', 'h30'): stat(r[h], f'summary {r["kind"]} {r["to"]} {r["sym"]} {h}')
    print('OK ledger', len(files), 'month file(s),', n, 'entries'); sys.exit(0)
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
