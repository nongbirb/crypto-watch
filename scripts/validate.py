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
            if v is not None and o['nEff'] < 20: die(where + f': {c} must be null when nEff < 20 (audit F7)')
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
    # git runs inside the ledger folder (REV:./file), so the same checks work in this repo and in a test repo
    gitd = lambda *a: subprocess.run(['git', *a], cwd=D if os.path.isdir(D) else R, capture_output=True, text=True)
    def prev_of(rel):
        if prev_dir:
            q = os.path.join(prev_dir, os.path.basename(rel)); return json.load(open(q)) if os.path.exists(q) else None
        try: return json.loads(subprocess.run(['git', 'show', f'{base}:./{os.path.basename(rel)}'], cwd=D, capture_output=True, check=True).stdout)
        except Exception: return None
    # Audit F3: no future entries, no early grades, no unknown fields, no forged proofs
    NOW = dt.datetime.fromisoformat(opt('--now').replace('Z', '+00:00')) if opt('--now') else dt.datetime.now(dt.timezone.utc)
    ts = lambda v: dt.datetime.fromisoformat(v.replace('Z', '+00:00'))
    KEYS = set(LOCKED) | {'r1', 'r7', 'r30', 'proof'}
    shallow = (gitd('rev-parse', '--is-shallow-repository').stdout.strip() != 'false') if not prev_dir else True
    in_git = not prev_dir and gitd('rev-parse', '--git-dir').returncode == 0
    def check_proof(e, w, fname):
        pr = e.get('proof')
        if pr is None: return
        if not isinstance(pr, dict) or set(pr) != {'commit', 'pushed_at', 'ref'}: die(w + ': proof must be {commit, pushed_at, ref}')
        if not isinstance(pr['commit'], str) or not re.match(r'^[0-9a-f]{40}$', pr['commit']): die(w + ': proof commit must be a full sha')
        if not (pr['ref'] is None or isinstance(pr['ref'], str)): die(w + ': proof ref')
        try: pa = ts(pr['pushed_at'])
        except Exception: die(w + ': proof pushed_at must be an ISO time')
        if pa < ts(e['t']): die(w + ': proof pushed_at is before t')
        if pa > NOW: die(w + ': proof pushed_at is in the future')
        if in_git:  # the commit must be in history and must already hold this entry
            if gitd('cat-file', '-e', pr['commit'] + '^{commit}').returncode != 0:
                if not shallow: die(w + ': proof commit is not in the repository history')
            else:
                if gitd('merge-base', '--is-ancestor', pr['commit'], 'HEAD').returncode != 0: die(w + ': proof commit is not an ancestor of HEAD')
                body = gitd('show', f"{pr['commit']}:./{fname}")
                if body.returncode != 0 or ('"id":' + json.dumps(e['id'])) not in body.stdout: die(w + ': proof commit does not contain this entry')
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
            if e['kind'] == 'funding_regime' and (e['to'] not in ('high', 'low', 'normal') or e['from'] not in (None, 'high', 'low', 'normal')): die(w + ': funding_regime entries use high / low / normal')
            if e['kind'] == 'oi_regime' and (e['to'] not in ('building', 'unwinding', 'normal') or e['from'] not in (None, 'building', 'unwinding', 'normal')): die(w + ': oi_regime entries use building / unwinding / normal')
            if e['kind'] == 'sm_flow' and (e['to'] not in ('net_buy', 'net_sell', 'flat') or e['from'] not in (None, 'net_buy', 'net_sell', 'flat')): die(w + ': sm_flow entries use net_buy / net_sell / flat')
            if e['kind'] == 'verdict' and (e['to'] not in ('Long', 'Wait', 'Avoid', 'Insufficient') or e['from'] not in (None, 'Long', 'Wait', 'Avoid', 'Insufficient')): die(w + ': verdict entries use the stored state codes')
            if not isinstance(e['sym'], str) or not isinstance(e['to'], str) or not (e['from'] is None or isinstance(e['from'], str)): die(w + ': sym / from / to')
            if not num(e['px']) or e['px'] <= 0 or not isinstance(e['ctx'], dict): die(w + ': px / ctx')
            extra = set(e) - KEYS
            if extra: die(w + ': unknown field(s) ' + ', '.join(sorted(extra)))
            t_ = ts(e['t'])
            if t_ > NOW: die(w + ': t is in the future')
            seen = e['ctx'].get('seen')
            if seen is not None:
                try: sv = ts(seen)
                except Exception: die(w + ': ctx.seen must be an ISO time')
                if sv < t_ or sv > NOW: die(w + ': ctx.seen must be between t and now')
            for h in ('r1', 'r7', 'r30'):
                if e.get(h) is not None and not num(e[h]): die(w + ': ' + h + ' must be a number')
                if e.get(h) is not None and t_ + dt.timedelta(days=int(h[1:])) > NOW: die(w + ': ' + h + ' is filled before it is due')
            check_proof(e, w, f)
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
        r_ = subprocess.run(['git', 'ls-tree', '--name-only', base, './'], cwd=D, capture_output=True, text=True) if os.path.isdir(D) else None
        before = [os.path.basename(x) for x in r_.stdout.split()] if r_ and r_.returncode == 0 else []
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
if k == 'lev':  # Phase 4 leverage history (docs/architect-proof-layer.md §5): data/lev/ schema, size caps, closed days never change
    import os, re, subprocess
    R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
    D = opt('--dir', os.path.join(R, 'data/lev')); base = opt('--base', 'HEAD'); prev_dir = opt('--prev-dir')
    NOW = opt('--now') or dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
    def cap(p, kb):
        z = os.path.getsize(p)
        if z > kb * 1024: die(f'{p}: {z / 1024:.1f} KB is over the {kb} KB cap')
    def prev_of(name):
        if prev_dir:
            q = os.path.join(prev_dir, name); return json.load(open(q)) if os.path.exists(q) else None
        try: return json.loads(subprocess.run(['git', 'show', f'{base}:./{name}'], cwd=D, capture_output=True, check=True).stdout)
        except Exception: return None
    if not os.path.isdir(D): print('OK lev (no data/lev yet)'); sys.exit(0)
    nd = 0
    for f in sorted(x for x in os.listdir(D) if re.match(r'^daily-\d{4}\.json$', x)):
        p = os.path.join(D, f); cap(p, 300); Y = json.load(open(p))
        if Y.get('year') != int(f[6:10]) or not isinstance(Y.get('days'), dict) or Y.get('cols') != ['px', 'mc', 'okx', 'hyperliquid']: die(f + ': year / cols / days')
        for day, row in Y['days'].items():
            w = f + ' ' + day
            if not re.match(r'^\d{4}-\d{2}-\d{2}$', day) or day[:4] != f[6:10] or day > NOW[:10]: die(w + ': day key (or a future day)')
            for s_, t in row.items():
                if not isinstance(t, list) or len(t) != 4 or not all(x is None or (num(x) and x > 0) for x in t[:2]): die(w + f' {s_}: row must be [px, mc, okx, hyperliquid]')
                for v in t[2:]:
                    if v is None: continue
                    if not isinstance(v, list) or len(v) != 5: die(w + f' {s_}: venue row must be [f, fx, n, oi, oiHour]')
                    if (v[0] is None) != (v[1] is None) or not all(x is None or num(x) for x in v[:2]) or not (isinstance(v[2], int) and v[2] >= 0) or (v[0] is None) != (v[2] == 0): die(w + f' {s_}: funding / settlements')
                    if v[0] is not None and abs(v[0]) > 50000: die(w + f' {s_}: funding out of range')
                    if (v[3] is None) != (v[4] is None) or (v[3] is not None and not (num(v[3]) and v[3] > 0 and isinstance(v[4], int) and 0 <= v[4] <= 23)): die(w + f' {s_}: open interest / hour')
            nd += 1
        fin = Y.get('final', {})
        if any(d >= NOW[:10] for d in fin): die(f + ': a day is final before it ended')
        pv = prev_of(f)
        if pv:
            for d in pv.get('final', {}):
                if d in pv.get('days', {}) and pv['days'][d] != Y['days'].get(d): die(f'{f} {d}: a closed day changed')
    rp = os.path.join(D, 'recent.json')
    if os.path.exists(rp):
        cap(rp, 150); Rj = json.load(open(rp))
        if Rj.get('unit') != 'kUSD' or not isinstance(Rj.get('hours'), dict): die('lev recent: unit / hours')
        hs = list(Rj['hours'])
        if hs != sorted(hs) or any(not re.match(r'^\d{4}-\d{2}-\d{2}T\d{2}$', h) or h > NOW[:13] for h in hs): die('lev recent: hour keys must be sorted UTC hours, none in the future')
        for h, row in Rj['hours'].items():
            for s_, v in row.items():
                if not isinstance(v, list) or len(v) != 2 or not all(x is None or (num(x) and x > 0) for x in v): die(f'lev recent {h} {s_}: [okx, hyperliquid] kUSD')
    print('OK lev', nd, 'days'); sys.exit(0)
if k == 'sm':  # Smart Money v2 (docs/architect-proof-layer.md §3): data/sm/ schema, size caps, frozen panel, no flow before selection
    import os, re, subprocess
    R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
    D = opt('--dir', os.path.join(R, 'data/sm')); SMJ = opt('--smart', os.path.join(R, 'smart_money.json')); base = opt('--base', 'HEAD'); prev_dir = opt('--prev-dir')
    NOW = opt('--now'); NOW = NOW or dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    TS = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$'); isT = lambda v: isinstance(v, str) and bool(TS.match(v))
    num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
    def cap(p, kb):
        z = os.path.getsize(p)
        if z > kb * 1024: die(f'{p}: {z / 1024:.1f} KB is over the {kb} KB cap')
    def prev_of(name):
        if prev_dir:
            q = os.path.join(prev_dir, name); return json.load(open(q)) if os.path.exists(q) else None
        try: return json.loads(subprocess.run(['git', 'show', f'{base}:./{name}'], cwd=D, capture_output=True, check=True).stdout)
        except Exception: return None
    if not os.path.isdir(D): print('OK sm (no data/sm yet)'); sys.exit(0)
    pp = os.path.join(D, 'panel.json'); P = None
    if os.path.exists(pp):
        cap(pp, 60); P = json.load(open(pp))
        if not isT(P.get('selected')) or not isT(P.get('week')) or not isinstance(P.get('wallets'), list) or not isinstance(P.get('rule'), str): die('panel: selected / week / rule / wallets')
        if not (P['week'] <= P['selected'] < (dt.datetime.fromisoformat(P['week'][:-1]) + dt.timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ')): die('panel: selected must fall in its week')
        if dt.datetime.fromisoformat(P['week'][:-1]).weekday() != 0 or not P['week'].endswith('T00:00:00Z'): die('panel: week must be a Monday 00:00 UTC')
        if P['selected'] > NOW: die('panel: selected is in the future')
        if not 1 <= len(P['wallets']) <= P.get('params', {}).get('n', 300): die('panel: wallet count')
        A = [w.get('a') for w in P['wallets']]
        if len(set(A)) != len(A) or not all(isinstance(a, str) and re.match(r'^0x[0-9a-fA-F]{40}$', a) for a in A): die('panel: wallet addresses missing, malformed or duplicated')
        pv = prev_of('panel.json')
        if pv and pv.get('selected') != P['selected']:
            if P['week'] <= pv.get('week', ''): die('panel: reselected inside the same week (the panel is frozen until the next Monday 00:00 UTC)')
        elif pv and pv.get('wallets') != P['wallets']: die('panel: members changed without a new selection (frozen between selections)')
    sels = {P['selected']} if P else set()
    import importlib.util as _iu  # audit L5: data/sm/panels-YYYY.json, append-only, rebuilds to panel.json for the current selection
    _sp = _iu.spec_from_file_location('sm_lib', os.path.join(R, 'scripts', 'sm_lib.py')); SL = _iu.module_from_spec(_sp); _sp.loader.exec_module(SL)
    for f in sorted(x for x in os.listdir(D) if re.match(r'^panels-\d{4}\.json$', x)):
        p = os.path.join(D, f); cap(p, 400); Hj = json.load(open(p))
        if Hj.get('year') != int(f[7:11]) or not isinstance(Hj.get('weeks'), list): die(f + ': year / weeks')
        for i, w in enumerate(Hj['weeks']):
            if not isT(w.get('week')) or not isT(w.get('selected')) or w['week'][:4] != f[7:11] or (i and w['selected'] <= Hj['weeks'][i - 1]['selected']): die(f + f' week {i}: week / selected (increasing)')
            if ('full' in w) != (i == 0): die(f + f' week {i}: only the first week stores the full list')
        ms = SL.panels_members(Hj)
        if any(len(m) != w['n'] for (_, _, m), w in zip(ms, Hj['weeks'])): die(f + ': member count does not match n')
        if P and ms and ms[-1][1] == P['selected'] and ms[-1][2] != {w['a'] for w in P['wallets']}: die(f + ': the latest week does not match panel.json')
        pv = prev_of(f)
        if pv and pv.get('weeks') != Hj['weeks'][:len(pv.get('weeks', []))]: die(f + ': an earlier week changed (append-only)')
    rp = os.path.join(D, 'recent.json')
    if os.path.exists(rp):
        cap(rp, 200); Rj = json.load(open(rp))
        if Rj.get('v') not in (1, 2) or Rj.get('unit') != 'kUSD' or not isinstance(Rj.get('runs'), list) or (Rj['v'] == 2 and Rj.get('flowUnit') != 'USD'): die('recent: v / unit / flowUnit / runs')
        last = ''
        for r in Rj['runs']:
            w = 'recent ' + str(r.get('t'))
            if not isT(r.get('t')) or r['t'] <= last: die(w + ': t must be ISO UTC and increasing')
            last = r['t']
            if r['t'] > NOW: die(w + ': t is in the future')
            if not isT(r.get('panel')) or r['panel'] > r['t']: die(w + ': snapshot before its panel selection')
            if r.get('t0') is not None and (not isT(r['t0']) or r['t0'] >= r['t'] or r['t0'] < r['panel']): die(w + ': flow interval must start after the panel selection and before t')
            if r.get('t0') is None and any(v[5] is not None for v in r.get('c', {}).values()): die(w + ': flow without a previous snapshot')
            for c, v in r.get('c', {}).items():
                if not isinstance(v, list) or len(v) != 6 or not all(num(x) for x in v[:5]): die(w + f' {c}: row must be [nL, nS, vL, vS, mark, flow]')
                if v[5] is not None and (not isinstance(v[5], list) or len(v[5]) != len(Rj.get('flowCols', [])) or not all(num(x) for x in v[5])): die(w + f' {c}: flow row')
    for f in sorted(x for x in os.listdir(D) if re.match(r'^daily-\d{4}\.json$', x)):
        p = os.path.join(D, f); cap(p, 300); Dj = json.load(open(p))
        if Dj.get('year') != int(f[6:10]) or Dj.get('unit') != 'kUSD' or not isinstance(Dj.get('days'), dict): die(f + ': year / unit / days')
        for day, x in Dj['days'].items():
            w = f + ' ' + day
            if not re.match(r'^\d{4}-\d{2}-\d{2}$', day) or day[:4] != f[6:10]: die(w + ': day key')
            if not all(isT(x.get(k)) for k in ('panel', 'first', 'last')) or not (x['panel'] <= x['first'] <= x['last']) or x['first'][:10] != day or x['last'][:10] != day: die(w + ': panel <= first <= last, all in that day')
            if x['last'] > NOW: die(w + ': last is in the future')
            if x.get('flowFrom') is not None and (not isT(x['flowFrom']) or x['flowFrom'] < x['panel']): die(w + ': flow measured before the panel selection')
            if not num(x.get('runs')) or not num(x.get('flowRuns')) or x['flowRuns'] > x['runs']: die(w + ': runs / flowRuns')
            for c, v in x.get('c', {}).items():
                if not isinstance(v, list) or len(v) != 7 or not all(num(y) for y in v): die(w + f' {c}: row must be [nL, nS, vL, vS, mark, dL, dS]')
        pv = prev_of(f)
        if pv:  # closed days are history: a day before the newest previous day must not change
            done = sorted(pv.get('days', {}))[:-1]
            for day in done:
                if pv['days'][day] != Dj['days'].get(day): die(f'{f} {day}: a closed day changed')
    if os.path.exists(SMJ):
        cap(SMJ, 700); S_ = json.load(open(SMJ)); pc = S_.get('cohorts', {}).get('panel')
        if pc:
            u = pc.get('universe', {})
            if not isT(u.get('selected')) or not num(u.get('wallets')) or not num(u.get('members')) or u['wallets'] > u['members']: die('smart_money panel: selected / wallets <= members')
            if P and u['selected'] != P['selected']: die('smart_money panel: selection differs from data/sm/panel.json')
            fl = S_.get('flows') or {}
            for h in ('h24', 'd7'):
                x = fl.get(h)
                if x and (not isT(x.get('from')) or x['from'] < u['selected'] or x['to'] > S_['updated']): die(f'smart_money flows {h}: measured before the panel selection or after the snapshot')
                if x and 'gaps' in x and (not isinstance(x['gaps'], int) or isinstance(x['gaps'], bool) or x['gaps'] < 0): die(f'smart_money flows {h}: gaps must be a whole number >= 0 (audit M1)')
            for c, x in pc.get('coins', {}).items():
                lq = x.get('liq')
                if lq and any(not (num(b.get('lo')) and num(b.get('hi')) and b['lo'] < b['hi'] and num(b.get('long')) and num(b.get('short'))) for b in lq.get('bins', [])): die(f'smart_money panel {c}: liq bins')
    print('OK sm', 'panel' if P else 'no panel', os.path.basename(SMJ), f'{os.path.getsize(SMJ) / 1024:.0f} KB' if os.path.exists(SMJ) else ''); sys.exit(0)
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
