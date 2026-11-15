#!/usr/bin/env python3
"""Business Pulse per token (docs/architect-proof-layer.md §6, Phase 5) -> data/pulse.json. Called at the end of
scripts/build_onchain.py; a failure here never blocks onchain.json. Usage alone: python3 scripts/pulse.py

Every number is a fact about the token's business with its source. Nothing is estimated: a value that is missing upstream
stays null and its line is left out of the card.

Stored history (the Phase 4 lessons):
- days[YYYY-MM-DD][key] = the value for that UTC day, stored under the day it describes:
  - DefiLlama fees / revenue / open interest: a point stamped D 00:00 is the total (or the reading) for day D. The day still
    in progress is never stored.
  - TVL, borrowed, stablecoin supply, CoinGecko market cap: a point stamped D 00:00 is the level at the START of D, so it is
    stored as the close of D - 1. The intraday "now" point is skipped.
  - Readings with no history (staking share, locked share, unlock share, L2BEAT 24 h flow) are stored under the UTC day they were
    read; a later reading of the same day replaces it until the day ends. Coin Metrics exchange flows carry their own day.
- A day becomes final only after a run in which every source answered and every daily series reached that day, or GRACE_DAYS
  after it was first written (missing values then stay null). A final day is never written again; the validator rejects any change.
- KEEP = 61 days, so a 30-day total can be compared with the 30 days before it.
The 30-day changes are measured from this stored history, never recomputed from a revised upstream series."""
import calendar, json, os, time, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, 'data', 'pulse.json')
KEEP, GRACE_DAYS, DAY = 61, 3, 86400
LLAMA, CG = 'https://api.llama.fi', 'https://api.coingecko.com/api/v3'


def day_of(ts): return time.strftime('%Y-%m-%d', time.gmtime(int(ts)))
def ts_of(d): return calendar.timegm(time.strptime(d, '%Y-%m-%d'))
def add_days(d, n): return day_of(ts_of(d) + n * DAY)


def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'crypto-watch/1.0', 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=120) as r: return json.load(r)
        except Exception as e:
            if i == tries - 1: print('pulse FAIL', url, e); return None
            time.sleep(2 + 3 * i)


# ---------- parsers (pure; tested) ----------
def day_points(pairs, today):
    """DefiLlama dimension series [[ts, v]]: the point stamped D 00:00 is day D's total. Only complete days (D < today)."""
    out = {}
    for t, v in pairs or []:
        if v is None or int(t) % DAY: continue
        d = day_of(t)
        if d < today: out[d] = float(v)
    return out


def close_points(pairs, today):
    """Level snapshots [[ts, v]] (TVL, borrowed, stablecoins, market cap): the point stamped D 00:00 is the level at the start of D,
    stored as the close of D - 1. Intraday points (the live "now") are skipped."""
    out = {}
    for t, v in pairs or []:
        if v is None or int(t) % DAY: continue
        d = day_of(int(t) - 1)
        if d < today: out[d] = float(v)
    return out


# ---------- sources (injectable for tests) ----------
def s_dim(slug, kind):
    d = get(f'{LLAMA}/summary/fees/{slug}?dataType={kind}&excludeTotalDataChartBreakdown=true')
    return None if not d or not isinstance(d.get('totalDataChart'), list) else d['totalDataChart']
def s_oi(slug):
    d = get(f'{LLAMA}/summary/open-interest/{slug}?excludeTotalDataChartBreakdown=true')
    return None if not d or not isinstance(d.get('totalDataChart'), list) else d['totalDataChart']
def s_protocol(slug):  # {'tvl': [[ts, v]], 'borrowed': [[ts, v]]}
    d = get(f'{LLAMA}/protocol/{slug}')
    if not d or not isinstance(d.get('tvl'), list): return None
    b = ((d.get('chainTvls') or {}).get('borrowed') or {}).get('tvl') or []
    return {'tvl': [[x['date'], x.get('totalLiquidityUSD')] for x in d['tvl']], 'borrowed': [[x['date'], x.get('totalLiquidityUSD')] for x in b]}
def s_chain_tvl(chain):
    d = get(f'{LLAMA}/v2/historicalChainTvl/{urllib.parse.quote(chain)}')
    return None if not isinstance(d, list) else [[x['date'], x.get('tvl')] for x in d]
def s_stables(chain=None):  # USD-pegged supply; chain None = all chains
    d = get('https://stablecoins.llama.fi/stablecoincharts/' + (urllib.parse.quote(chain) if chain else 'all'))
    if not isinstance(d, list): return None
    return [[x['date'], (x.get('totalCirculating') or x.get('totalCirculatingUSD') or {}).get('peggedUSD')] for x in d]
def s_cg_chart(cid):  # {'mcap': [[ts_s, v]], 'px': [[ts_s, v]]}
    d = get(f'{CG}/coins/{cid}/market_chart?vs_currency=usd&days=70&interval=daily')
    if not d or not isinstance(d.get('market_caps'), list): return None
    return {'mcap': [[t // 1000, v] for t, v in d['market_caps']], 'px': [[t // 1000, v] for t, v in d['prices']]}
def s_cg_markets(ids):
    d = get(f'{CG}/coins/markets?vs_currency=usd&ids={",".join(ids)}')
    return None if not isinstance(d, list) else {x['id']: x for x in d}
def s_file(name):
    p = os.path.join(ROOT, name)
    try: return json.load(open(p))
    except Exception: return None
SRC = {'dim': s_dim, 'oi': s_oi, 'protocol': s_protocol, 'chain_tvl': s_chain_tvl, 'stables': s_stables,
       'cg_chart': s_cg_chart, 'cg_markets': s_cg_markets, 'file': s_file}

# daily series: key -> (fetch, parse). Each returns {day: value} (closed days only) or None on failure.
DAILY = {
    'stables':      lambda S, t: _close(S['stables'](), t),
    'hl.fees':      lambda S, t: _day(S['dim']('hyperliquid', 'dailyFees'), t),
    'hl.hrev':      lambda S, t: _day(S['dim']('hyperliquid', 'dailyHoldersRevenue'), t),
    'hl.oi':        lambda S, t: _day(S['oi']('hyperliquid-perps'), t),
    'lt.oi':        lambda S, t: _day(S['oi']('lighter-perps'), t),
    'lt.fees':      lambda S, t: _day(S['dim']('lighter', 'dailyFees'), t),
    'aave.rev':     lambda S, t: _day(S['dim']('aave', 'dailyRevenue'), t),
    'pendle.fees':  lambda S, t: _day(S['dim']('pendle', 'dailyFees'), t),
    'mon.tvl':      lambda S, t: _close(S['chain_tvl']('Monad'), t),
    'mon.stables':  lambda S, t: _close(S['stables']('Monad'), t),
    'sol.fees':     lambda S, t: _day(S['dim']('solana', 'dailyFees'), t),  # the chain's own transaction fees, not its apps' fees
    'near.fees':    lambda S, t: _day(S['dim']('near', 'dailyFees'), t),
}
def _day(x, t): return None if x is None else day_points(x, t)
def _close(x, t): return None if x is None else close_points(x, t)
# protocol TVL / borrowed come from one big response each (fetched once per run, only when a closed day still needs them)
PROTO = {'aave': ('aave.tvl', 'aave.borrowed'), 'pendle': ('pendle.tvl', None)}
CGIDS = {'HYPE': 'hyperliquid', 'LIT': 'lighter', 'AAVE': 'aave'}  # market cap closes (and the HYPE price)


def readings(S, now):
    """Values with no upstream history: [(key, day, value, reach_ok)]. Stored under the day they describe."""
    out, ok = [], True
    pos, itp, cal = S['file']('positioning.json'), S['file']('interop.json'), S['file']('calendar_auto.json')
    if pos is None or itp is None: ok = False
    nat = (pos or {}).get('native') or {}
    for sym in ('BTC', 'ETH'):
        x = (nat.get(sym) or {}).get('exflow')
        if x and isinstance(x.get('net'), (int, float)) and x.get('day'): out.append((sym.lower() + '.exnet', x['day'], float(x['net']), not x.get('prelim')))
    for sym in ('SOL', 'NEAR'):
        x = (nat.get(sym) or {}).get('stake')
        if x and isinstance(x.get('pct'), (int, float)) and x.get('at'): out.append((sym.lower() + '.stake', x['at'][:10], float(x['pct']), True))
    # HYPE circulating supply from Hyperliquid's own API (tokenDetails via positioning.json); CoinGecko's moves in manual steps
    h = (nat.get('HYPE') or {}).get('stake')
    if h and isinstance(h.get('circ'), (int, float)) and h.get('at'): out.append(('HYPE.circ', h['at'][:10], float(h['circ']), True))
    a = (nat.get('NEAR') or {}).get('activity')
    if a and isinstance(a.get('active'), (int, float)) and a.get('day'): out.append(('near.active', a['day'], float(a['active']), True))
    pe = ((pos or {}).get('onchain') or {}).get('PENDLE') or {}
    ve = next((h for h in (pe.get('top') or []) if (h.get('label') or '') == 'Pendle: vePendle'), None)
    if ve and isinstance(ve.get('pct'), (int, float)) and pos.get('updated'): out.append(('pendle.lock', pos['updated'][:10], float(ve['pct']), True))
    eth = next((c for c in (itp or {}).get('chainData') or [] if c.get('chainId') == 'ethereum'), None)
    if eth and isinstance(eth.get('netFlow'), (int, float)) and itp.get('updated'): out.append(('eth.l2net', itp['updated'][:10], float(eth['netFlow']), True))
    return out, ok, pos, cal


def mon_unlock(cal, mk, now):
    """Next scheduled MON unlock (DefiLlama unlocks, via calendar_auto.json) as % of circulating supply (CoinGecko).
    Tokens = supply_pct (of max supply) x max supply (total supply when no max is set). Returns (pct, event) or None."""
    if not cal or not mk or 'monad' not in mk: return None
    m = mk['monad']; sup = m.get('max_supply') or m.get('total_supply'); circ = m.get('circulating_supply')
    if not sup or not circ: return None
    today = day_of(now)
    ev = sorted((e for e in cal.get('events') or [] if e.get('type') == 'unlock' and 'MON' in (e.get('tokens') or []) and e.get('date', '') >= today and isinstance(e.get('supply_pct'), (int, float))), key=lambda e: e['date'])
    if not ev: return None
    e = ev[0]; return round(100 * e['supply_pct'] / 100 * sup / circ, 2), {'date': e['date'], 'supply_pct': e['supply_pct'], 'url': e.get('url')}


# ---------- card maths (pure; tested) ----------
def ser(days, key): return {d: r[key] for d, r in days.items() if r.get(key) is not None}
def last_day(s): return max(s) if s else None
def sum30(s, d):
    ks = [add_days(d, -i) for i in range(30)]
    return sum(s[k] for k in ks) if all(k in s for k in ks) else None
def pct_chg(a, b): return None if a is None or b is None or b <= 0 or a < 0 else 100 * (a / b - 1)


def line(key, v, d, chg, kind, src, **kw):
    return {'key': key, 'v': None if v is None else round(v, 6), 'day': d, 'chg': None if chg is None else round(chg, 4), 'kind': kind, 'src': src, **kw}


def level_line(days, key, src, kind='pct', d=None):
    s = ser(days, key); d = d or last_day(s)
    if d is None: return None
    v, p = s.get(d), s.get(add_days(d, -30))
    chg = (pct_chg(v, p) if kind == 'pct' else (None if p is None else v - p))
    return line(key, v, d, chg, kind, src, base=add_days(d, -30))


def sum_line(days, key, src, per_day=False, d=None):
    """30-day total (or daily average) ending at the newest day that has 30 days in a row; change vs the 30 days before."""
    s = ser(days, key)
    for dd in sorted(s, reverse=True)[:5] if d is None else [d]:
        v = sum30(s, dd)
        if v is None: continue
        p = sum30(s, add_days(dd, -30)); div = 30 if per_day else 1
        return line(key, v / div, dd, pct_chg(v, p) if v >= 0 and (p or 0) > 0 else (None if p is None else (v - p) / div),
                    'pct' if v >= 0 and (p or 0) > 0 else 'abs', src, win=30, base=add_days(dd, -30))
    return None


def ratio_line(days, key, mkey, fkey, src):
    """market cap at the close of D / (sum of the 30 days ending D x 12): "last 30 days x 12"."""
    m, f = ser(days, mkey), ser(days, fkey)
    for d in sorted(set(m) & set(f), reverse=True)[:5]:
        s30 = sum30(f, d)
        if not s30 or s30 <= 0: continue
        v = m[d] / (s30 * 12); p0, ps = m.get(add_days(d, -30)), sum30(f, add_days(d, -30))
        pv = p0 / (ps * 12) if p0 and ps and ps > 0 else None
        return line(key, v, d, pct_chg(v, pv), 'pct', src, win=30, annualise='30x12', base=add_days(d, -30))
    return None


def hype_net(days, src):
    """Per day over the 30 days ending D: buybacks (DefiLlama holders revenue, 30-day average) minus the USD value of the
    circulating supply added (Hyperliquid's circulating supply, stored daily here, change over the same 30 days / 30 x the
    CoinGecko close at D). Needs 30 days of stored supply readings before it appears."""
    hr, ci, px = ser(days, 'hl.hrev'), ser(days, 'HYPE.circ'), ser(days, 'HYPE.px')
    def net(d):
        b = sum30(hr, d); c0, c1, p = ci.get(add_days(d, -30)), ci.get(d), px.get(d)
        return None if b is None or c0 is None or c1 is None or p is None else b / 30 - (c1 - c0) / 30 * p
    for d in sorted(set(hr) & set(ci) & set(px), reverse=True)[:5]:
        v = net(d)
        if v is None: continue
        p = net(add_days(d, -30)); return line('hype.net', v, d, None if p is None else v - p, 'abs', src, win=30, base=add_days(d, -30))
    return None


def share_line(days, src):
    """Lighter's share of Lighter + Hyperliquid perp open interest (DefiLlama), %; change in percentage points."""
    a, b = ser(days, 'lt.oi'), ser(days, 'hl.oi'); sh = {d: 100 * a[d] / (a[d] + b[d]) for d in set(a) & set(b) if a[d] + b[d] > 0}
    if not sh: return None
    d = max(sh); p = sh.get(add_days(d, -30)); return line('lit.oishare', sh[d], d, None if p is None else sh[d] - p, 'pp', src, base=add_days(d, -30))


def util_line(days, src):
    """Aave borrow utilisation = borrowed / (borrowed + TVL). DefiLlama counts a lending market's TVL as supplied minus borrowed."""
    b, t = ser(days, 'aave.borrowed'), ser(days, 'aave.tvl'); u = {d: 100 * b[d] / (b[d] + t[d]) for d in set(b) & set(t) if b[d] + t[d] > 0}
    if not u: return None
    d = max(u); p = u.get(add_days(d, -30)); return line('aave.util', u[d], d, None if p is None else u[d] - p, 'pp', src, base=add_days(d, -30))


L = lambda label, url: {'label': label, 'url': url}
DL = lambda slug, kind='protocol': L('DefiLlama', f'https://defillama.com/{kind}/{slug}')
CGL = lambda cid: L('CoinGecko', f'https://www.coingecko.com/en/coins/{cid}')
CM = L('Coin Metrics', 'https://coinmetrics.io/community-network-data/')
# left out of a card, with the reason (shown on the card): no keyless source the builder can read
LEFT_OUT = {'BTC': [['etf', 'nosrc']], 'ETH': [['eth.stake', 'nosrc']], 'LIT': [['perpvol', 'paid']], 'AAVE': [['aave.buyback', 'zero'], ['aave.fees', 'three']],
            'MON': [['mon.bridge', 'three']], 'SOL': [['sol.active', 'nosrc']], 'HYPE': [], 'PENDLE': [], 'NEAR': []}


def cards(days, extra):
    pos = extra.get('pos') or {}; nat = pos.get('native') or {}
    u = lambda sym, k, d: ((nat.get(sym) or {}).get(k) or {}).get('url', d)
    out = {
        'BTC': [level_line(days, 'stables', [L('DefiLlama', 'https://defillama.com/stablecoins')]), sum_line(days, 'btc.exnet', [CM])],
        'ETH': [sum_line(days, 'eth.exnet', [CM]), level_line(days, 'eth.l2net', [L('L2BEAT', 'https://l2beat.com/interop/summary')], kind='abs')],
        'HYPE': [sum_line(days, 'hl.fees', [DL('hyperliquid')], per_day=True), sum_line(days, 'hl.hrev', [DL('hyperliquid')], per_day=True),
                 hype_net(days, [DL('hyperliquid'), L('Hyperliquid API', u('HYPE', 'stake', 'https://app.hyperliquid.xyz/staking')), CGL('hyperliquid')])],
        'LIT': [share_line(days, [L('DefiLlama', 'https://defillama.com/open-interest')]), ratio_line(days, 'lit.mcf', 'LIT.mcap', 'lt.fees', [CGL('lighter'), DL('lighter')]),
                ratio_line(days, 'hype.mcf', 'HYPE.mcap', 'hl.fees', [CGL('hyperliquid'), DL('hyperliquid')])],
        'AAVE': [sum_line(days, 'aave.rev', [DL('aave')]), util_line(days, [DL('aave')]), ratio_line(days, 'aave.mcr', 'AAVE.mcap', 'aave.rev', [CGL('aave'), DL('aave')])],
        'MON': [level_line(days, 'mon.unlock', [L('DefiLlama unlocks', (extra.get('mon_ev') or {}).get('url') or 'https://defillama.com/unlocks/monad'), CGL('monad')], kind='pp'),
                level_line(days, 'mon.tvl', [DL('monad', 'chain')]), level_line(days, 'mon.stables', [DL('monad', 'chain')])],
        'PENDLE': [level_line(days, 'pendle.tvl', [DL('pendle')]), sum_line(days, 'pendle.fees', [DL('pendle')]),
                   level_line(days, 'pendle.lock', [L('Blockscout', 'https://eth.blockscout.com/token/0x808507121B80c02388fAd14726482e061B8da827?tab=holders')], kind='pp')],
        'SOL': [level_line(days, 'sol.stake', [L('Solana RPC', u('SOL', 'stake', 'https://solana.com/docs/rpc'))], kind='pp'), sum_line(days, 'sol.fees', [DL('solana')])],
        'NEAR': [level_line(days, 'near.stake', [L('NEAR RPC + NearBlocks', u('NEAR', 'stake', 'https://nearblocks.io/node-explorer'))], kind='pp'),
                 level_line(days, 'near.active', [L('NearBlocks', u('NEAR', 'activity', 'https://nearblocks.io/charts'))]), sum_line(days, 'near.fees', [DL('near')])],
    }
    if extra.get('mon_ev'):
        for x in out['MON']:
            if x and x['key'] == 'mon.unlock': x['event'] = extra['mon_ev']
    return {s: [x for x in v if x and x['v'] is not None] for s, v in out.items()}


# ---------- run ----------
def main(now=None, src=None, path=PATH):
    now = int(now if now is not None else time.time()); S = {**SRC, **(src or {})}; today = day_of(now); iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(now))
    old = json.load(open(path)) if os.path.exists(path) else {}
    days, fin, pend = old.get('days') or {}, old.get('final') or {}, old.get('pending') or {}
    first = add_days(today, -KEEP)
    closed = [add_days(today, -i) for i in range(1, KEEP + 1)]
    open_closed = [d for d in closed if not fin.get(d)]  # closed days not yet final
    failed, reach = [], {}

    def put(d, key, v):
        if d < first or d > today or fin.get(d): return  # a final day is never written again
        row = days.setdefault(d, {})
        if row.get(key) != v: row[key] = v
        pend.setdefault(d, iso)

    def daily(key, got):
        if got is None: failed.append(key); return
        reach[key] = last_day(got)
        for d, v in got.items(): put(d, key, v)

    need = bool(open_closed) or not days
    if need:
        for key, f in DAILY.items(): daily(key, f(S, today))
        for slug, (k_tvl, k_b) in PROTO.items():
            p = S['protocol'](slug)
            if p is None: failed.append(slug); continue
            daily(k_tvl, close_points(p['tvl'], today))
            if k_b: daily(k_b, close_points(p['borrowed'], today))
        for sym, cid in CGIDS.items():
            c = S['cg_chart'](cid)
            if c is None: failed.append('cg.' + sym); continue
            mc = close_points(c['mcap'], today); daily(sym + '.mcap', mc)
            if sym == 'HYPE': daily('HYPE.px', close_points(c['px'], today))
    rd, rok, pos, cal = readings(S, now)
    if not rok: failed.append('repo files')
    for key, d, v, fin_ok in rd:
        put(d, key, v)
        if not fin_ok and d < today: reach[key] = add_days(d, -1)  # a preliminary Coin Metrics day stays open
    mk = S['cg_markets'](['monad']); mu = mon_unlock(cal, mk, now)
    if mk is None: failed.append('cg.markets')
    if mu: put(today, 'mon.unlock', mu[0])

    # finalise a closed day after a run where every source answered and every daily series reached it, or GRACE_DAYS after it ended
    for d in sorted(days):
        if d >= today or fin.get(d): continue
        reached = all(r is None or r >= d for r in reach.values())
        if (need and not failed and reached) or now >= ts_of(d) + (1 + GRACE_DAYS) * DAY:
            fin[d] = True; pend.pop(d, None)
    for d in [d for d in days if d < first]: days.pop(d); fin.pop(d, None); pend.pop(d, None)
    for d in [d for d in pend if d not in days or fin.get(d)]: pend.pop(d)
    doc = {'schema': 1, 'updated': iso, 'keep': KEEP,
           'days': {d: dict(sorted(days[d].items())) for d in sorted(days)}, 'final': {d: True for d in sorted(fin) if d in days}, 'pending': dict(sorted(pend.items())),
           'cards': cards(days, {'pos': pos, 'mon_ev': mu[1] if mu else None}), 'left_out': LEFT_OUT, 'failed': failed}
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as fh: json.dump(doc, fh, separators=(',', ':'))
    print('RESULT pulse', os.path.getsize(path) // 1024, 'KB', len(doc['days']), 'days', len(doc['final']), 'final', 'failed:', ','.join(failed) or 'none')
    return doc


if __name__ == '__main__':
    main()
