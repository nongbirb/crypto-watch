#!/usr/bin/env python3
"""Smart-money snapshot from Hyperliquid's public (keyless) API.
Three separate cohorts (never blended):
  panel  = weekly frozen skill panel (docs/architect-proof-layer.md §3.1, rule in scripts/sm_lib.py select_panel); default view.
           Selected once a week (first run after Monday 00:00 UTC), stored in data/sm/panel.json, frozen until the next Monday,
           so a change between runs means members traded. Flows, liquidation bins and history are measured for the panel only,
           strictly after its selection time.
  profit = top N wallets by 30-day PnL with account value >= MIN_AV (kept one more release)
  size   = top N wallets by account value (kept one more release)
Each wallet's open perp positions are fetched once (wallets in several cohorts are deduped), then aggregated per cohort.
Also stores whole-market context per coin from metaAndAssetCtxs (open interest, hourly funding, mark price).
Positions per coin: 'topL'/'topS' = biggest TOPSIDE longs and shorts (separate), 'roe' = Hyperliquid returnOnEquity, 'b' = wallet is in
both the profit and size cohorts. Only real API values; avg leverage = notional-weighted leverage as reported by Hyperliquid.

Flows (§3.2): the previous run's panel positions live in the Actions cache (SM_PREV, default .sm_cache/prev.json), not in git.
On a cache miss, a panel change or a snapshot older than the selection, this run writes NO flow for the interval and says why.
Rate limits: Hyperliquid documents an aggregated REST weight limit per IP of 1200 per minute; clearinghouseState and
metaAndAssetCtxs weigh 2, userRole 60, other info requests 20 (hyperliquid docs, 'Rate limits and user limits'; the docs host
was not reachable from the build session, see docs/smart-money-v2-p2.md). This builder paces itself at WEIGHT_PER_MIN (1000) and
backs off on 429."""
import json, os, sys, time, threading, urllib.request, urllib.error, datetime as dt, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sm_lib as L

LB = 'https://stats-data.hyperliquid.xyz/Mainnet/leaderboard'; VAULTS = 'https://stats-data.hyperliquid.xyz/Mainnet/vaults'; INFO = 'https://api.hyperliquid.xyz/info'
N, MIN_AV, TOPSIDE, CONC, DOMN = 500, 100_000, 10, 40.0, 3  # TOPSIDE: top-N longs and top-N shorts stored separately
WEIGHT_PER_MIN = int(os.environ.get('SM_WEIGHT_PER_MIN', 1000))
PANEL_MIN_ANSWER = 0.6   # fewer panel wallets than this share answering -> keep the previous snapshot (its real age shows)
DRILL_POS = 12           # drill-down: biggest positions per wallet stored (the rest counted)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SM_DIR = os.environ.get('SM_DIR', os.path.join(ROOT, 'data/sm')); PREV = os.environ.get('SM_PREV', os.path.join(ROOT, '.sm_cache/prev.json'))
OUT = os.environ.get('SM_OUT', os.path.join(ROOT, 'smart_money.json'))
TRACK = {t['symbol'] for t in json.load(open(os.path.join(ROOT, 'tokens.json')))['tokens']}

class Limiter:
    """Token bucket over request weight per minute, shared by all threads."""
    def __init__(self, per_min): self.cap = per_min; self.tokens = per_min; self.t = time.monotonic(); self.lock = threading.Lock(); self.used = 0
    def take(self, w):
        while True:
            with self.lock:
                now = time.monotonic(); self.tokens = min(self.cap, self.tokens + (now - self.t) * self.cap / 60); self.t = now
                if self.tokens >= w: self.tokens -= w; self.used += w; return
                wait = (w - self.tokens) * 60 / self.cap
            time.sleep(wait)
LIM = Limiter(WEIGHT_PER_MIN); N429 = [0]
def get(url, body=None, tries=5, weight=None):
    if body is not None: LIM.take(weight or 20)
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None, headers={'Content-Type': 'application/json', 'User-Agent': 'kms-capital'})
            with urllib.request.urlopen(req, timeout=60) as r: return json.load(r)
        except Exception as e:
            if i == tries - 1: raise
            is429 = isinstance(e, urllib.error.HTTPError) and e.code == 429
            if is429: N429[0] += 1
            time.sleep(2 * (i + 1) + (15 * (i + 1) if is429 else 0))

def perf(r, w):
    x = L.win(r, w); return float(x['pnl']) if x else 0.0
def now_utc(): return dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
def load(p, d=None):
    try: return json.load(open(p))
    except Exception: return d
def dump(p, o, compact=True):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f: json.dump(o, f, separators=(',', ':') if compact else None); f.write('\n')

def build(crow, ST, BOTH, coins_keep=None, ntop=40):
    """Aggregates one cohort. coins_keep: restrict stored coins (panel: tracked tokens only)."""
    ok = [(r, ST.get(r['ethAddress'])) for r in crow]; ok = [x for x in ok if x[1]]
    agg, pos = {}, {}
    for r, s in ok:
        ms = s.get('marginSummary') or {}; tav = float(ms.get('accountValue') or 0); tnp = float(ms.get('totalNtlPos') or 0)
        alev = round(tnp / tav, 2) if tav > 0 else None  # account leverage = total position notional / account value (clearinghouseState)
        for ap in s.get('assetPositions', []):
            p = ap.get('position') or {}; c = p.get('coin'); szi = float(p.get('szi') or 0)
            ntl = abs(float(p.get('positionValue') or 0))
            if not c or szi == 0 or ntl <= 0: continue  # zero-notional positions dropped
            lev = (p.get('leverage') or {}).get('value')
            a = agg.setdefault(c, {'nL': 0, 'nS': 0, 'vL': 0.0, 'vS': 0.0, 'levN': 0.0, 'levD': 0.0})
            if szi > 0: a['nL'] += 1; a['vL'] += ntl
            else: a['nS'] += 1; a['vS'] += ntl
            if lev: a['levN'] += float(lev) * ntl; a['levD'] += ntl
            liq = p.get('liquidationPx')
            pos.setdefault(c, []).append({'a': r['ethAddress'], 'n': r.get('displayName') or None, 'side': 'L' if szi > 0 else 'S', 'lev': lev, 'sz': float(f'{abs(szi):.6g}'), 'ntl': round(ntl, 2),
                'roe': round(float(p['returnOnEquity']), 4) if p.get('returnOnEquity') not in (None, '') else None, 'b': 1 if r['ethAddress'] in BOTH else 0,
                'entry': float(p['entryPx']) if p.get('entryPx') else None, 'liq': float(liq) if liq else None, 'upnl': round(float(p.get('unrealizedPnl') or 0), 2), 'pnl30': round(perf(r, 'month'), 2), 'av': round(tav, 2), 'alev': alev})
    coins = {}
    for c, a in agg.items():
        n, v = a['nL'] + a['nS'], a['vL'] + a['vS']; ps = sorted(pos[c], key=lambda x: -x['ntl'])
        conc = {}
        for sd, tot in (('L', a['vL']), ('S', a['vS'])):
            big = next((p for p in ps if p['side'] == sd), None)
            pc = min(100.0, 100 * big['ntl'] / tot) if big and tot > 0 else 0  # notional share only, capped
            if pc > CONC: conc[sd] = {'a': big['a'], 'n': big['n'], 'pct': round(pc, 1)}
        # v55: the old mixed 'top' list (kept for cached v50 clients) is no longer stored; it took 224 KB of the 700 KB budget
        coins[c] = {'traders': n, 'long': a['nL'], 'short': a['nS'], 'longPct': round(100 * a['nL'] / n, 1), 'ntlLong': round(a['vL']), 'ntlShort': round(a['vS']),
            'longPctNtl': round(100 * a['vL'] / v, 1) if v else None, 'net': round(a['vL'] - a['vS']), 'avgLev': round(a['levN'] / a['levD'], 1) if a['levD'] else None,
            'conc': conc, 'topL': [p for p in ps if p['side'] == 'L'][:TOPSIDE], 'topS': [p for p in ps if p['side'] == 'S'][:TOPSIDE]}
    TL, TS = sum(a['vL'] for a in agg.values()), sum(a['vS'] for a in agg.values())
    g = round(100 * TL / (TL + TS), 1) if TL + TS else None  # group's overall notional net-long % across all coins
    for c in coins:
        lp = coins[c]['longPctNtl']; coins[c]['bias'] = round(lp - g, 1) if lp is not None and g is not None else None
    dom = {}
    for c, x in coins.items():
        for sd, d in x['conc'].items(): dom.setdefault(d['a'], {'a': d['a'], 'n': d['n'], 'coins': []})['coins'].append({'c': c, 'side': sd, 'pct': d['pct']})
    dom = sorted([d for d in dom.values() if len(d['coins']) >= DOMN], key=lambda d: -len(d['coins']))
    keep = coins_keep if coins_keep is not None else TRACK | set(sorted(coins, key=lambda c: -coins[c]['traders'])[:ntop])
    for c in list(coins):
        if c not in keep: del coins[c]
    return len(ok), coins, g, dom, sum(1 for r, _ in ok if r['ethAddress'] in BOTH), pos

def main():
    started = now_utc()
    rows = get(LB)['leaderboardRows']
    # ---- panel: reselect once a week (first run after Monday 00:00 UTC); otherwise frozen ----
    panel_p = os.path.join(SM_DIR, 'panel.json'); panel = load(panel_p)
    if L.needs_selection(panel, started) or os.environ.get('SM_FORCE_PANEL') == '1':
        vaults = {v['summary']['vaultAddress'].lower() for v in get(VAULTS) if v.get('summary', {}).get('vaultAddress')}
        def role(a):
            try: return (get(INFO, {'type': 'userRole', 'user': a}, weight=60) or {}).get('role')
            except Exception: return None  # unknown role: kept, counted in stats.roleUnknown
        panel = L.select_panel(rows, vaults, role, now_utc())
        dump(panel_p, panel, compact=False)
        print('panel selected', panel['selected'], 'wallets', len(panel['wallets']), panel['stats'])
    PSEL = panel['selected']; PW = {w['a']: w for w in panel['wallets']}
    cand = sorted([r for r in rows if float(r['accountValue']) >= MIN_AV], key=lambda r: perf(r, 'month'), reverse=True)
    byaddr = {r['ethAddress']: r for r in rows}
    prow = [byaddr.get(a) or {'ethAddress': a, 'displayName': w['n'], 'windowPerformances': []} for a, w in PW.items()]  # frozen members, even if they left the leaderboard
    COH = {'panel': {'rows': prow, 'rule': panel['rule'], 'eligible': len(prow)},
           'profit': {'rows': cand[:N], 'rule': f'top {N} by 30d PnL, account value >= ${MIN_AV:,}', 'eligible': len(cand)},
           'size': {'rows': sorted(rows, key=lambda r: -float(r['accountValue']))[:N], 'rule': f'top {N} by account value', 'eligible': len(rows)}}
    uniq = {}
    for c in COH.values():
        for r in c['rows']: uniq.setdefault(r['ethAddress'], r)
    BOTH = {r['ethAddress'] for r in COH['profit']['rows']} & {r['ethAddress'] for r in COH['size']['rows']}  # profit & size overlap (flagged, never summed twice)
    print('leaderboard', len(rows), 'eligible', len(cand), 'unique wallets to fetch', len(uniq), 'weight budget/min', WEIGHT_PER_MIN)
    snap_t = L.iso(now_utc())  # snapshot time = start of the position fetch (always after the panel selection)
    def state(a):
        try: return a, get(INFO, {'type': 'clearinghouseState', 'user': a}, weight=2)
        except Exception: return a, None
    with cf.ThreadPoolExecutor(6) as ex: ST = dict(ex.map(state, list(uniq)))
    miss = [a for a, v in ST.items() if not v]
    if miss:  # one slower retry pass for wallets that failed (429 storms, timeouts)
        time.sleep(10)
        with cf.ThreadPoolExecutor(2) as ex: ST.update({a: v for a, v in ex.map(state, miss) if v})
    MK, MK_AT, MARKS = {}, None, {}
    try:
        meta, ctx = get(INFO, {'type': 'metaAndAssetCtxs'}, weight=20)
        for i, a in enumerate(meta['universe']):
            if i >= len(ctx): break
            x = ctx[i]; m = float(x.get('markPx') or 0)
            if m > 0: MARKS[a['name']] = m
            if a['name'] in TRACK:
                oi = float(x.get('openInterest') or 0); MK[a['name']] = {'oiUsd': round(oi * m), 'funding': float(x.get('funding') or 0), 'mark': m}
        MK_AT = L.iso(now_utc())
    except Exception as e: print('market ctx failed', e)
    print('states ok', sum(1 for v in ST.values() if v), 'failed', sum(1 for v in ST.values() if not v), '429s', N429[0], 'weight used', LIM.used)

    out = {'updated': L.iso(now_utc()), 'snapshotAt': snap_t, 'source': 'Hyperliquid public API (leaderboard + vaults + userRole + clearinghouseState + metaAndAssetCtxs)', 'cohorts': {}}
    pos_by = {}
    for k, c in COH.items():
        keep = TRACK if k == 'panel' else None
        w, coins, g, dom, nb, pos = build(c['rows'], ST, BOTH if k != 'panel' else set(), keep)
        if k == 'panel':
            if w < PANEL_MIN_ANSWER * len(prow): print(f'KEEP previous snapshot: only {w} of {len(prow)} panel wallets answered'); return 0
        elif w < 200: print(f'KEEP previous snapshot: too few wallet states for {k} ({w})'); return 0
        out['cohorts'][k] = {'universe': {'rule': c['rule'], 'wallets': w, 'eligible': c['eligible'], 'both': nb}, 'groupLongPctNtl': g, 'dominant': dom, 'domMin': DOMN, 'coins': coins}
        pos_by[k] = pos
        print(k, w, {s: (coins[s]['traders'], coins[s]['longPctNtl']) for s in sorted(TRACK) if s in coins})
    P = out['cohorts']['panel']; P['universe'].update({'selected': PSEL, 'week': panel['week'], 'members': len(prow), 'sample': P['universe']['wallets'] < len(prow)})
    del P['universe']['both']
    # ---- real liquidation bins + who is underwater: ALL panel positions per tracked coin ----
    for c, x in P['coins'].items():
        m = MARKS.get(c)
        if not m: continue
        ps = pos_by['panel'].get(c, [])
        x['liq'] = L.liq_bins(ps, m); x['uw'] = L.underwater(ps, m)
    # ---- flows: diff against the previous run's panel positions (Actions cache) ----
    cur = {a: {c: p['szi'] for c, p in L.positions_of(ST[a]).items()} for a in PW if ST.get(a)}
    prev = load(PREV); why = L.flow_status(prev, PSEL, snap_t)
    D = L.diff_flows(prev['wallets'], cur, MARKS, sorted(TRACK)) if not why else None
    last = {'t0': prev['t'] if prev and not why else None, 't': snap_t, 'members': len(prow), 'answered': len(cur), 'ok': not why, 'reason': why}
    if D: last.update({'compared': D['compared'], 'missingPrev': D['missingPrev'], 'missingNow': D['missingNow'], 'unpriced': D['unpriced'], 'dust': D['dust'], 'dustUsd': L.DUST_USD})
    # drill-down: wallets shown in the panel's biggest-position lists -> all their positions + changes since the last snapshot
    shown = {p['a'] for x in P['coins'].values() for p in x['topL'] + x['topS']}
    W = {}
    for a in sorted(shown):
        ps = L.positions_of(ST.get(a)); s = ST.get(a) or {}; ms = s.get('marginSummary') or {}
        lst = sorted(ps.items(), key=lambda kv: -kv[1]['ntl'])
        ch = None
        if not why and prev and a in prev['wallets']:
            ch = [[c, kind, sd, L.sig(dsz), round(dsz * MARKS[c]) if MARKS.get(c) else None] for c, kind, sd, dsz in L.wallet_changes(prev['wallets'][a], cur.get(a, {}))]
        W[a] = {'n': PW[a]['n'], 'av': round(float(ms.get('accountValue') or 0)), 'roi30': PW[a]['roi30'],
                'pos': [[c, 'L' if p['szi'] > 0 else 'S', L.sig(abs(p['szi'])), round(p['ntl']), L.sig(p['entry']), L.sig(p['liq']), p['lev'], round(p['upnl'])] for c, p in lst[:DRILL_POS]],
                'more': max(0, len(lst) - DRILL_POS), 'chg': ch}
    P['wallets'] = W; P['walletCols'] = {'pos': ['coin', 'side', 'size', 'usd', 'entry', 'liq', 'lev', 'upnl'], 'chg': ['coin', 'kind', 'side', 'size', 'usdAtMark']}
    # ---- history (git): recent.json (7 days, one row per coin per run) + daily-YYYY.json ----
    def lv(c):
        x = P['coins'].get(c); return [x['long'], x['short'], L.K(x['ntlLong']), L.K(x['ntlShort'])] if x else [0, 0, 0, 0]
    run = {'t': snap_t, 't0': last['t0'], 'panel': PSEL, 'w': len(cur), 'm': len(prow), 'nf': why,
           'c': {c: lv(c) + [L.sig(MARKS[c]), L.flow_row(D['coins'][c]) if D and c in D['coins'] else None] for c in sorted(TRACK) if MARKS.get(c)}}
    if D: run['fw'] = D['compared']
    now = now_utc(); rp = os.path.join(SM_DIR, 'recent.json')
    recent = L.recent_add(load(rp), run, now); dump(rp, recent)
    yp = os.path.join(SM_DIR, f'daily-{snap_t[:4]}.json'); dump(yp, L.daily_add(load(yp), run, int(snap_t[:4])))
    # ---- 24h / 7d totals from recent.json, labelled with the snapshot times actually used ----
    out['flows'] = {'panel': PSEL, 'last': last, 'h24': L.totals(recent, PSEL, now, 24), 'd7': L.totals(recent, PSEL, now, 168),
                    'note': 'Panel only. Size changes in coins valued at the current mark (a price move alone is never a flow). Wallets that did not answer in both runs are left out. No flow is written for an interval without a cached previous snapshot.'}
    os.makedirs(os.path.dirname(PREV), exist_ok=True); json.dump({'t': snap_t, 'panel': PSEL, 'wallets': cur}, open(PREV, 'w'))
    out['universe'] = out['cohorts']['profit']['universe']  # backward compatible (= profit cohort); top-level coins keep aggregates only (the page reads cohorts)
    out['coins'] = {c: {k: v for k, v in x.items() if k not in ('top', 'topL', 'topS')} for c, x in out['cohorts']['profit']['coins'].items()}
    if MK: out['market'], out['marketAt'] = MK, MK_AT  # missing -> page shows 'unavailable'
    dump(OUT, out)
    print('flow', 'ok' if not why else why, 'size bytes', os.path.getsize(OUT), 'recent', os.path.getsize(rp), 'daily', os.path.getsize(yp))
    return 0

if __name__ == '__main__': sys.exit(main())
