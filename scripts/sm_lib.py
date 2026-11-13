#!/usr/bin/env python3
"""Smart Money v2 (docs/architect-proof-layer.md §3): pure functions, no network. Used by scripts/build_smart_money.py
and tested by tests/smart-v2.mjs through the JSON CLI at the bottom (python3 scripts/sm_lib.py < {"fn": ..., "args": [...]}).

Panel (weekly frozen cohort), position diff -> flows, history files (data/sm/recent.json, data/sm/daily-YYYY.json),
real liquidation bins and "who is underwater". Only real API values; nothing is estimated or filled in."""
import json, math, sys, datetime as dt

# ---------- panel ----------
PANEL_N, PANEL_MIN_AV = 300, 100_000
# 30-day volume / account value above this = likely market maker or hedger, excluded. Chosen from the live distribution on
# 2026-11-13 (wallets with AV >= $100k and positive week, month and allTime PnL, n = 2064): median 2.2x, p90 49x, p95 117x,
# p99 566x, no natural break. 100x (= the account turned over ~3.3 times a day) drops about the top 6 %. Fixed in advance, not fitted.
PANEL_MAX_TURN = 100.0
PANEL_ROI_CAP_Q = 0.99          # 30-day ROI is capped (winsorised) at its 99th percentile among eligible wallets
EXCLUDE_ROLES = ('vault', 'subAccount', 'agent')  # Info API userRole values that are not a trader's own main account

def iso(d): return d.astimezone(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
def parse(s): return dt.datetime.fromisoformat(s.replace('Z', '+00:00'))
def week_start(now):
    """Monday 00:00 UTC of the week that contains `now`."""
    d = now.astimezone(dt.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return d - dt.timedelta(days=d.weekday())
def needs_selection(panel, now):
    return not panel or not panel.get('week') or parse(panel['week']) < week_start(now)

def win(r, k):
    for a, b in r.get('windowPerformances') or []:
        if a == k: return b
    return None
def _f(x):
    try: return float(x)
    except (TypeError, ValueError): return None
def quantile(s, q):
    if not s: return None
    s = sorted(s); i = (len(s) - 1) * q; lo = math.floor(i); hi = math.ceil(i)
    return s[lo] + (s[hi] - s[lo]) * (i - lo)

def select_panel(rows, vaults, role_of, now, n=PANEL_N, min_av=PANEL_MIN_AV, max_turn=PANEL_MAX_TURN):
    """rows: leaderboard rows; vaults: set of lower-case vault addresses (stats-data /vaults); role_of(addr) -> userRole
    string or None (unknown). Called only for wallets walked in rank order, so it stays a few hundred calls a week."""
    st = {'leaderboard': len(rows)}
    a = [r for r in rows if (_f(r.get('accountValue')) or 0) >= min_av]; st['accountValue'] = len(a)
    def pos(r):
        for k in ('week', 'month', 'allTime'):
            w = win(r, k)
            if not w or (_f(w.get('pnl')) or 0) <= 0: return False
        return True
    b = [r for r in a if pos(r)]; st['positiveWeekMonthAllTime'] = len(b)
    turn = lambda r: (_f(win(r, 'month').get('vlm')) or 0) / _f(r['accountValue'])
    tv = [turn(r) for r in b]
    st['turnover'] = {k: round(quantile(tv, q), 1) if tv else None for k, q in (('p50', .5), ('p90', .9), ('p95', .95), ('p99', .99))}
    c = [r for r in b if turn(r) <= max_turn]; st['afterTurnover'] = len(c)
    d = [r for r in c if r['ethAddress'].lower() not in vaults]; st['vaultsExcluded'] = len(c) - len(d)
    roi = lambda r: _f(win(r, 'month').get('roi'))
    d = [r for r in d if roi(r) is not None]
    cap = quantile([roi(r) for r in d], PANEL_ROI_CAP_Q) if d else None; st['roiCap'] = round(cap, 4) if cap is not None else None
    # rank: capped 30-day ROI, ties (all wallets at the cap) broken by 30-day dollar PnL, then address (stable)
    ranked = sorted(d, key=lambda r: (-min(roi(r), cap), -(_f(win(r, 'month').get('pnl')) or 0), r['ethAddress']))
    out, roles, unknown = [], {}, 0
    for r in ranked:
        if len(out) >= n: break
        ro = role_of(r['ethAddress'])
        if ro in EXCLUDE_ROLES: roles[ro] = roles.get(ro, 0) + 1; continue
        if ro is None: unknown += 1
        m = win(r, 'month')
        out.append({'a': r['ethAddress'], 'n': r.get('displayName') or None, 'av': round(_f(r['accountValue'])), 'roi30': round(roi(r), 4),
                    'pnl30': round(_f(m.get('pnl')) or 0), 'turn': round(turn(r), 1)})
    st['rolesExcluded'] = roles; st['roleUnknown'] = unknown; st['eligible'] = len(d)
    return {'selected': iso(now), 'week': iso(week_start(now)),
            'rule': f'account value >= ${min_av:,}; PnL > 0 in the week, month and allTime leaderboard windows; 30-day volume / account value <= {max_turn:g}; '
                    f'not a vault (Hyperliquid vault list) or a sub-account / agent (Info API userRole); ranked by 30-day ROI capped at its 99th percentile '
                    f'(ties: 30-day PnL); top {n}. Frozen until the next Monday 00:00 UTC.',
            'params': {'n': n, 'minAv': min_av, 'maxTurnover': max_turn, 'roiCapQ': PANEL_ROI_CAP_Q, 'windows': ['week', 'month', 'allTime']},
            'stats': st, 'wallets': out}

# ---------- positions ----------
def positions_of(state):
    """clearinghouseState -> {coin: {szi, ntl, entry, liq, lev, upnl, roe}} for open positions (szi != 0)."""
    out = {}
    for ap in (state or {}).get('assetPositions', []) or []:
        p = ap.get('position') or {}; c = p.get('coin'); szi = _f(p.get('szi')) or 0
        if not c or szi == 0: continue
        out[c] = {'szi': szi, 'ntl': abs(_f(p.get('positionValue')) or 0), 'entry': _f(p.get('entryPx')), 'liq': _f(p.get('liquidationPx')),
                  'lev': (p.get('leverage') or {}).get('value'), 'upnl': _f(p.get('unrealizedPnl')) or 0.0}
    return out

EPS = 1e-9
def same(a, b): return abs(a - b) <= EPS * max(1.0, abs(a), abs(b))
CATS = ('open', 'close', 'inc', 'red', 'flip')
def wallet_changes(prev, cur):
    """prev, cur: {coin: szi}. Returns [(coin, kind, side, dsz)] with kind in CATS. dsz in coins, always >= 0.
    flip: the old side closed (side = old side, dsz = |prev|) AND the new side opened (a separate 'open' record)."""
    out = []
    for c in sorted(set(prev) | set(cur)):
        p, q = prev.get(c, 0.0) or 0.0, cur.get(c, 0.0) or 0.0
        if same(p, q): continue
        sp, sq = ('L' if p > 0 else 'S') if p else None, ('L' if q > 0 else 'S') if q else None
        if not p: out.append((c, 'open', sq, abs(q)))
        elif not q: out.append((c, 'close', sp, abs(p)))
        elif sp == sq: out.append((c, 'inc' if abs(q) > abs(p) else 'red', sp, abs(abs(q) - abs(p))))
        else: out.append((c, 'flip', sp, abs(p))); out.append((c, 'open', sq, abs(q)))
    return out
def empty_flow(): return {'L': {k: [0, 0.0] for k in CATS}, 'S': {k: [0, 0.0] for k in CATS}}
def finish_flow(f):
    for sd in ('L', 'S'):
        for k in CATS: f[sd][k][1] = round(f[sd][k][1])
    add = lambda sd: f[sd]['open'][1] + f[sd]['inc'][1] - f[sd]['close'][1] - f[sd]['red'][1] - f[sd]['flip'][1]
    f['dL'], f['dS'] = add('L'), add('S'); f['net'] = f['dL'] - f['dS']
    return f
DUST_USD = 100  # a size change worth less than $100 at mark is not counted as a flow (counted in 'dust'); fixed, not fitted
def diff_flows(prev, cur, marks, coins=None, dust=DUST_USD):
    """prev, cur: {addr: {coin: szi}} for wallets that answered in that run. Only wallets present in BOTH are compared
    (a wallet that failed in one run is never read as a close or an open). Size changes are in coins valued at the CURRENT
    mark, so a price move alone is never a flow. Returns {coins: {coin: flow}, compared, missingPrev, missingNow, unpriced}."""
    both = sorted(set(prev) & set(cur)); F = {}; unpriced = set(); nd = 0
    for a in both:
        for c, kind, sd, dsz in wallet_changes(prev[a], cur[a]):
            if coins is not None and c not in coins: continue
            m = marks.get(c)
            if not m: unpriced.add(c); continue
            f = F.setdefault(c, empty_flow())
            if dsz * m < dust: nd += 1; continue
            f[sd][kind][0] += 1; f[sd][kind][1] += dsz * m
    for c in (coins or []):
        if c in marks: F.setdefault(c, empty_flow())
    return {'coins': {c: finish_flow(f) for c, f in F.items()}, 'compared': len(both), 'missingPrev': len(set(cur) - set(prev)),
            'missingNow': len(set(prev) - set(cur)), 'unpriced': sorted(unpriced), 'dust': nd}

def flow_status(prev_snap, panel_sel, now_t):
    """Whether a flow can be measured for this interval. prev_snap: cached {t, panel, wallets} or None."""
    if not prev_snap or not isinstance(prev_snap.get('wallets'), dict): return 'no previous snapshot (Actions cache miss): no flow for this interval'
    if prev_snap.get('panel') != panel_sel: return 'panel reselected: flow baseline reset, no flow for this interval'
    if parse(prev_snap['t']) < parse(panel_sel): return 'previous snapshot is older than the panel selection: no flow for this interval'
    if parse(prev_snap['t']) >= parse(now_t): return 'previous snapshot is not older than this one: no flow'
    return None

# ---------- liquidation bins + underwater ----------
LIQ_RANGE, LIQ_STEP = 30, 1
def sig(x, n=6): return float(f'{x:.{n}g}') if x is not None else None
def liq_bins(pos, mark):
    """pos: [{side, ntl, liq}] of ALL panel positions on one coin; mark: current mark. 1 % bins from -30 % to +30 % of mark,
    each position counted at its real liquidationPx. Positions without one -> noLiq; beyond the range -> outside."""
    B = {}; noliq = {'n': 0, 'long': 0.0, 'short': 0.0}; outside = {'long': 0.0, 'short': 0.0}
    for p in pos:
        k = 'long' if p['side'] == 'L' else 'short'
        if not p.get('liq') or p['liq'] <= 0: noliq['n'] += 1; noliq[k] += p['ntl']; continue
        d = round((p['liq'] / mark - 1) * 100, 9)  # rounded first: 95 / 100 - 1 is -5.0000000004 in floats, which is bin -5, not -6
        if d < -LIQ_RANGE or d >= LIQ_RANGE: outside[k] += p['ntl']; continue
        i = math.floor(d / LIQ_STEP); b = B.setdefault(i, {'lo': sig(mark * (1 + i * LIQ_STEP / 100)), 'hi': sig(mark * (1 + (i + 1) * LIQ_STEP / 100)), 'long': 0.0, 'short': 0.0})
        b[k] += p['ntl']
    bins = [dict(b, long=round(b['long']), short=round(b['short'])) for i, b in sorted(B.items())]
    return {'mark': sig(mark), 'range': LIQ_RANGE, 'step': LIQ_STEP, 'bins': bins, 'noLiq': {'n': noliq['n'], 'long': round(noliq['long']), 'short': round(noliq['short'])},
            'outside': {k: round(v) for k, v in outside.items()}, 'positions': len(pos)}
def wmedian(vals):
    """size-weighted median of [(value, weight)]"""
    v = sorted((a, w) for a, w in vals if w > 0)
    if not v: return None
    tot = sum(w for _, w in v); c = 0.0
    for a, w in v:
        c += w
        if c >= tot / 2: return a
def underwater(pos, mark):
    """Per side: size-weighted average entry, share of position value in loss at mark, size-weighted median distance to liquidation."""
    out = {}
    for sd in ('L', 'S'):
        ps = [p for p in pos if p['side'] == sd]
        if not ps: out[sd] = None; continue
        sz = sum(abs(p['sz']) for p in ps if p.get('entry')); ntl = sum(p['ntl'] for p in ps)
        loss = sum(p['ntl'] for p in ps if p.get('entry') and ((sd == 'L' and p['entry'] > mark) or (sd == 'S' and p['entry'] < mark)))
        dist = [(abs(p['liq'] - mark) / mark * 100, p['ntl']) for p in ps if p.get('liq') and p['liq'] > 0]
        md = wmedian(dist)
        out[sd] = {'n': len(ps), 'ntl': round(ntl), 'avgEntry': sig(sum(p['entry'] * abs(p['sz']) for p in ps if p.get('entry')) / sz) if sz else None,
                   'lossPct': round(100 * loss / ntl, 1) if ntl else None, 'medLiqDist': round(md, 1) if md is not None else None, 'withLiq': len(dist),
                   'upnl': round(sum(p.get('upnl') or 0 for p in ps))}
    return out

# ---------- history files ----------
RECENT_DAYS, RECENT_CAP, DAILY_CAP = 7, 190 * 1024, 290 * 1024   # caps leave room under the validator caps (200 KB / 300 KB)
K = lambda v: round(v / 1000)  # history files store USD in thousands (unit "kUSD")
FLOW_COLS = ['dL', 'dS'] + [f'{sd}{k}_{x}' for sd in ('L', 'S') for k in CATS for x in ('n', 'k')]
def flow_row(f):
    return [K(f['dL']), K(f['dS'])] + [v for sd in ('L', 'S') for k in CATS for v in (f[sd][k][0], K(f[sd][k][1]))]
def flow_from_row(r):
    f = {'dL': r[0] * 1000, 'dS': r[1] * 1000, 'L': {}, 'S': {}}; i = 2
    for sd in ('L', 'S'):
        for k in CATS: f[sd][k] = [r[i], r[i + 1] * 1000]; i += 2
    f['net'] = f['dL'] - f['dS']; return f
def recent_add(recent, run, now):
    """run: {t, t0|None, panel, w, m, fw, nf, c: {coin: [nL, nS, vL, vS, mark, flow_row|None]}}. Keeps 7 days, newest last,
    idempotent on t, and drops the oldest runs if the file would exceed RECENT_CAP (the file then says from when it holds data)."""
    R = recent if recent and recent.get('v') == 1 else {'v': 1, 'unit': 'kUSD', 'cols': ['nL', 'nS', 'vL', 'vS', 'mark', 'flow'], 'flowCols': FLOW_COLS, 'runs': []}
    runs = [x for x in R['runs'] if x['t'] != run['t']] + [run]
    lo = iso(now - dt.timedelta(days=RECENT_DAYS)); runs = sorted([x for x in runs if x['t'] >= lo], key=lambda x: x['t'])
    R['runs'] = runs; R['updated'] = iso(now); R['trimmed'] = False
    while len(runs) > 1 and len(json.dumps(R, separators=(',', ':'))) > RECENT_CAP: runs.pop(0); R['trimmed'] = True
    R['from'] = runs[0]['t'] if runs else None
    return R
def daily_add(daily, run, year):
    """Adds one run to its UTC day: closing levels = that run's levels, flows summed. Idempotent: a run is added only if it is
    newer than the day's last run. A day keeps one panel id; flows from runs of another panel are never mixed into it."""
    D = daily if daily and daily.get('year') == year else {'year': year, 'unit': 'kUSD', 'cols': ['nL', 'nS', 'vL', 'vS', 'mark', 'dL', 'dS'], 'days': {}}
    day = run['t'][:10]; x = D['days'].get(day)
    if x and run['t'] <= x['last']: return D
    if not x or x.get('panel') != run['panel']:
        x = D['days'][day] = {'panel': run['panel'], 'first': run['t'], 'last': run['t'], 'runs': 0, 'flowRuns': 0, 'flowFrom': None, 'c': {}}
    x['last'] = run['t']; x['runs'] += 1
    if run.get('t0') is not None and not run.get('nf'):
        x['flowRuns'] += 1; x['flowFrom'] = x['flowFrom'] or run['t0']
    for c, v in run['c'].items():
        old = x['c'].get(c); dL = (old[5] if old else 0) + (v[5][0] if v[5] else 0); dS = (old[6] if old else 0) + (v[5][1] if v[5] else 0)
        x['c'][c] = [v[0], v[1], v[2], v[3], v[4], dL, dS]
    D['days'] = dict(sorted(D['days'].items()))
    return D
def totals(recent, panel_sel, now, hours):
    """Sum of flows over runs with t > now - hours whose interval starts at or after the panel selection.
    Labelled with the first interval start and the last snapshot time actually used."""
    lo = iso(now - dt.timedelta(hours=hours)); use = [r for r in (recent or {}).get('runs', []) if r['t'] > lo and r.get('t0') and not r.get('nf') and r['t0'] >= panel_sel]
    if not use: return None
    C = {}
    for r in use:
        for c, v in r['c'].items():
            if not v[5]: continue
            f = flow_from_row(v[5]); a = C.setdefault(c, empty_flow())
            for sd in ('L', 'S'):
                for k in CATS: a[sd][k][0] += f[sd][k][0]; a[sd][k][1] += f[sd][k][1]
    return {'from': min(r['t0'] for r in use), 'to': max(r['t'] for r in use), 'runs': len(use), 'hours': hours, 'gaps': gaps(recent, panel_sel, lo),
            'sinceSelection': panel_sel > iso(now - dt.timedelta(hours=hours)), 'coins': {c: finish_flow(f) for c, f in C.items()}}
def gaps(recent, panel_sel, lo):
    """Audit M1: intervals missing from the totals. A run of this panel after `lo` is a gap when it has no flow, or when its
    interval does not start at the previous run kept in recent.json (that previous run's flow row was never committed, e.g. a
    failed push while the cache already held its snapshot). The panel's first run (its selection run) has no interval to miss.
    A run whose previous run is no longer in recent.json is not judged."""
    runs = (recent or {}).get('runs', []); mine = [i for i, r in enumerate(runs) if r.get('panel') == panel_sel]; n = 0
    for i in mine:
        r = runs[i]
        if i == mine[0] or r['t'] <= lo or i == 0: continue
        if not r.get('t0') or r.get('nf') or r['t0'] != runs[i - 1]['t']: n += 1
    return n

if __name__ == '__main__':  # JSON CLI for tests: {"fn": name, "args": [...]}; datetimes as ISO strings
    q = json.load(sys.stdin); fn = q['fn']; a = q.get('args', [])
    if fn == 'select_panel':
        rows, vaults, roles, now = a; r = select_panel(rows, set(vaults), lambda x: roles.get(x), parse(now)); print(json.dumps(r))
    elif fn == 'needs_selection': print(json.dumps(needs_selection(a[0], parse(a[1]))))
    elif fn == 'diff_flows': print(json.dumps(diff_flows(*a)))
    elif fn == 'flow_status': print(json.dumps(flow_status(*a)))
    elif fn == 'liq_bins': print(json.dumps(liq_bins(*a)))
    elif fn == 'underwater': print(json.dumps(underwater(*a)))
    elif fn == 'recent_add': print(json.dumps(recent_add(a[0], a[1], parse(a[2]))))
    elif fn == 'daily_add': print(json.dumps(daily_add(*a)))
    elif fn == 'totals': print(json.dumps(totals(a[0], a[1], parse(a[2]), a[3])))
    elif fn == 'gaps': print(json.dumps(gaps(*a)))
    elif fn == 'flow_row': print(json.dumps(flow_row(a[0])))
    else: raise SystemExit('unknown fn ' + fn)
