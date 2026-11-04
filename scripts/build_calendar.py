#!/usr/bin/env python3
"""Build calendar_auto.json from free keyless official/primary sources.
Sources: airdrops.io/calendar (airdrops), DefiLlama emissions datasets (token unlocks),
federalreserve.gov (FOMC), bls.gov (CPI / jobs / PPI). Manual events stay in calendar.json.
Each source is independent: if one fails, its last good events are kept from the previous file.
Dates are never guessed: only dates printed by the source are used. Output times are JST."""
import json, re, html, ast, time, os, sys, urllib.request
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'calendar_auto.json')
JST, ET = ZoneInfo('Asia/Tokyo'), ZoneInfo('America/New_York')
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
NOW = datetime.now(timezone.utc)
TODAY = NOW.astimezone(JST).date()
KEEP_PAST, AHEAD = 7, 120  # days

def get(url, t=30):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*', 'Accept-Language': 'en-US,en;q=0.9'})
    with urllib.request.urlopen(req, timeout=t) as r: return r.read().decode('utf-8', 'replace')

def et_to_jst(d, hh, mm):
    x = datetime(d.year, d.month, d.day, hh, mm, tzinfo=ET).astimezone(JST)
    return x.strftime('%Y-%m-%d'), x.strftime('%H:%M')

def in_window(ds):
    d = datetime.strptime(ds, '%Y-%m-%d').date()
    return -KEEP_PAST <= (d - TODAY).days <= AHEAD

# ---------- airdrops.io ----------
AKIND = {'claim': 'claim', 'snapshot': 'snapshot', 'deadline': 'deadline', 'tge': 'tge', 'ends': 'ends', 'starts': 'starts', 'launch': 'tge', 'listing': 'tge'}
TH_KIND = {'claim': 'เปิดเคลม', 'snapshot': 'สแนปช็อต', 'deadline': 'เดดไลน์', 'tge': 'TGE', 'ends': 'สิ้นสุด', 'starts': 'เริ่ม'}
def airdrops():
    s = ''
    for fn in (lambda: get('https://airdrops.io/calendar/'),
               lambda: __import__('subprocess').run(['curl', '-sL', '--compressed', '-m', '30', '-A', UA, '-H', 'Accept: text/html', 'https://airdrops.io/calendar/'], capture_output=True, text=True).stdout):
        try: s = fn()
        except Exception as e: print('airdrops try failed:', str(e)[:60]); continue
        if 'next 60 days' in s: break
    i = s.find('next 60 days')
    if i < 0: raise RuntimeError('section not found')
    seg = s[i:s.find('</ul>', i)]
    out = []
    for li in re.findall(r'<li[^>]*>(.*?)</li>', seg, re.S):
        m = re.search(r'<time datetime="(\d{4}-\d{2}-\d{2})"', li)
        a = re.search(r'<a href="(https://airdrops\.io/[^"]+)">([^<]+)</a>\s*,\s*([^.<]+)\.', li)
        if not m or not a: continue
        txt = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', li))).strip()
        note = txt.split(a.group(3).strip() + '.', 1)[-1].strip()
        name, what = html.unescape(a.group(2)).strip(), a.group(3).strip()
        kw = what.lower().split()[0] if what else ''
        wl = what.lower()
        kind = 'ends' if ('end' in wl or 'wind-down' in wl or 'close' in wl) else ('deadline' if 'deadline' in wl else AKIND.get(kw) or ('tge' if 'launch' in wl else None))
        out.append({'date': m.group(1), 'type': 'airdrop', 'tokens': [], 'impact': 'high' if kind in ('claim', 'tge', 'snapshot') else 'medium' if kind == 'deadline' else 'low',
                    'title': f'{name}: {what}', 'th_title': f'{name}: {TH_KIND.get(kind, what)}', 'note': note[:220], 'th_note': '',
                    **({'kind': kind} if kind else {}), 'url': a.group(1), 'src': 'airdrops.io'})
    if not out: raise RuntimeError('no rows parsed')
    return out

# ---------- DefiLlama unlocks ----------
def unlocks(tokens):
    ids = [t['coingecko'] for t in tokens if t.get('coingecko')]
    px = {}
    try: px = {k: v.get('usd') for k, v in json.loads(get('https://api.coingecko.com/api/v3/simple/price?ids=' + ','.join(ids) + '&vs_currencies=usd')).items()}
    except Exception as e: print('price fetch failed:', e)
    out, ok = [], 0
    for t in tokens:
        cg = t.get('coingecko'); sym = t['symbol']
        if not cg: continue
        try: d = json.loads(get(f'https://defillama-datasets.llama.fi/emissions/{cg}'))
        except Exception as e: print('unlocks', sym, 'no dataset:', str(e)[:60]); continue
        ok += 1
        m = d.get('metadata'); m = ast.literal_eval(m) if isinstance(m, str) else (m or {})
        sm = d.get('supplyMetrics'); sm = ast.literal_eval(sm) if isinstance(sm, str) else (sm or {})
        mx = sm.get('maxSupply') or None
        days = {}
        for e in m.get('events', []):
            ds = datetime.fromtimestamp(e['timestamp'], JST).strftime('%Y-%m-%d')
            if not in_window(ds): continue
            n = e.get('noOfTokens') or [0]
            src = re.sub(r'^.*? from (.+?)( on \{timestamp\}| tokens.*)?$', r'\1', e.get('description', '')).strip()
            g = days.setdefault(ds, {'cliff': 0, 'lin': 0, 'grp': set()})
            if e.get('unlockType') == 'cliff': g['cliff'] += n[0]; g['grp'].add(src)
            elif len(n) == 2 and n[0] == 0 and n[1] > 0: g['lin'] += n[1]; g['grp'].add(src)
        for ds, g in days.items():
            if not g['cliff'] and not g['lin']: continue
            p = px.get(cg); grp = ', '.join(sorted(g['grp']))[:90]
            if g['cliff']:
                amt = g['cliff']; usd = amt * p if p else None; pctm = amt / mx * 100 if mx else None
                if (usd or 0) < 1e6 and (pctm or 0) < 0.1: continue  # skip daily drip noise
                title = f'{sym} unlock: {fmt(amt)} {sym}' + (f' (~${fmt(usd)})' if usd else '')
                th = f'ปลดล็อก {sym}: {fmt(amt)} {sym}' + (f' (~${fmt(usd)})' if usd else '')
                imp = 'high' if (pctm or 0) >= 1 or (usd or 0) >= 50e6 else 'medium'
            else:
                amt = g['lin']; usd = amt * p if p else None; pctm = None
                title = f'{sym} linear vesting starts: {fmt(amt)} {sym}/week'; th = f'{sym} เริ่มเวสติ้งเชิงเส้น: {fmt(amt)} {sym}/สัปดาห์'; imp = 'medium'
            out.append({'date': ds, 'type': 'unlock', 'tokens': [sym], 'impact': imp, 'title': title, 'th_title': th,
                        'note': f'From: {grp}.' + (f' ≈{pctm:.2f}% of max supply.' if pctm else ''), 'th_note': f'จาก: {grp}' + (f' ≈{pctm:.2f}% ของซัพพลายสูงสุด' if pctm else ''),
                        **({'value_usd': round(usd)} if usd else {}), **({'supply_pct': round(pctm, 2)} if pctm else {}),
                        'url': f'https://defillama.com/unlocks/{d.get("name", cg).lower().replace(" ", "-")}', 'src': 'DefiLlama'})
    if not ok: raise RuntimeError('no datasets')
    return out

def fmt(x):
    for u, n in (('B', 1e9), ('M', 1e6), ('K', 1e3)):
        if abs(x) >= n: return f'{x / n:.2f}'.rstrip('0').rstrip('.') + u
    return f'{x:,.0f}'

# ---------- FOMC ----------
MONTHS = {m: i for i, m in enumerate(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'], 1)}
def fomc():
    url = 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'
    s = get(url); out = []
    for ym in re.finditer(r'(\d{4}) FOMC Meetings', s):
        y = int(ym.group(1))
        if y < TODAY.year: continue
        nxt = re.search(r'\d{4} FOMC Meetings', s[ym.end():]); seg = s[ym.end(): ym.end() + nxt.start() if nxt else len(s)]
        for mo, dt in re.findall(r'fomc-meeting__month[^>]*><strong>([^<]+)</strong>.*?fomc-meeting__date[^>]*>([^<]+)<', seg, re.S):
            if 'notation' in dt.lower() or 'unscheduled' in dt.lower(): continue
            mnames = [x.strip().lower() for x in mo.split('/')]; dd = re.findall(r'\d+', dt)
            if not dd or mnames[-1] not in MONTHS: continue
            mon = MONTHS[mnames[-1]]; day = int(dd[-1])
            dkey = datetime(y, mon, day).date()
            ds, tm = et_to_jst(dkey, 14, 0)
            if not in_window(ds): continue
            sep = '*' in dt
            out.append({'date': ds, 'time': tm, 'type': 'macro', 'tokens': [], 'impact': 'high',
                        'title': 'FOMC rate decision' + (' + projections' if sep else ''), 'th_title': 'Fed ประกาศดอกเบี้ย (FOMC)' + (' + ประมาณการเศรษฐกิจ' if sep else ''),
                        'note': f'Statement 2:00 pm ET, press conference 2:30 pm ET (meeting {mo.strip()} {dt.strip().rstrip("*")}).', 'th_note': 'แถลงการณ์ 14:00 ET และแถลงข่าว 14:30 ET',
                        'url': url, 'src': 'Federal Reserve'})
    if not out: raise RuntimeError('no meetings parsed')
    return out

# ---------- BLS ----------
BLS = {'cpi': ('US CPI (inflation)', 'CPI สหรัฐฯ (เงินเฟ้อ)', 'high'), 'empsit': ('US jobs report (NFP)', 'รายงานการจ้างงานสหรัฐฯ (NFP)', 'high'), 'ppi': ('US PPI (producer prices)', 'PPI สหรัฐฯ (ราคาผู้ผลิต)', 'medium')}
MON3 = {m[:3]: i for m, i in MONTHS.items()}
def bls():
    fb = json.load(open(os.path.join(ROOT, 'scripts', 'bls_schedule.json')))
    out, live = [], []
    for k, (t, th, imp) in BLS.items():
        url = f'https://www.bls.gov/schedule/news_release/{k}.htm'; dates = None
        try:
            s = get(url, 20)
            rows = re.findall(r'<td>([A-Z][a-z]+ \d{4})</td>\s*<td>([A-Z][a-z]{2})\.? (\d{1,2}), (\d{4})</td>', s)
            if rows: dates = [(ref, f'{y}-{MON3[m.lower()]:02d}-{int(d):02d}') for ref, m, d, y in rows]; live.append(k)
        except Exception as e: print('bls live', k, 'failed:', str(e)[:60])
        if not dates: dates = [(None, x) for x in fb['series'][k]['dates']]
        for ref, x in dates:
            ds, tm = et_to_jst(datetime.strptime(x, '%Y-%m-%d').date(), 8, 30)
            if not in_window(ds): continue
            out.append({'date': ds, 'time': tm, 'type': 'macro', 'tokens': [], 'impact': imp, 'title': t + (f' – {ref}' if ref else ''), 'th_title': th,
                        'note': 'Release 8:30 am ET.', 'th_note': 'ประกาศ 08:30 ET', 'url': url, 'src': 'BLS'})
    print('bls live:', live or 'none (using verified fallback schedule)')
    return out

def main():
    tokens = json.load(open(os.path.join(ROOT, 'tokens.json')))
    tokens = tokens.get('tokens', tokens) if isinstance(tokens, dict) else tokens
    prev = {}
    try: prev = json.load(open(OUT))
    except Exception: pass
    pev = prev.get('events', []); status = {}; events = []
    for name, fn in (('airdrops.io', airdrops), ('DefiLlama', lambda: unlocks(tokens)), ('Federal Reserve', fomc), ('BLS', bls)):
        try:
            ev = fn(); status[name] = {'ok': True, 'n': len(ev), 'at': NOW.strftime('%Y-%m-%dT%H:%M:%SZ')}
        except Exception as e:
            ev = [x for x in pev if x.get('src') == name and in_window(x['date'])]
            old = (prev.get('sources') or {}).get(name, {})
            status[name] = {'ok': False, 'n': len(ev), 'err': str(e)[:120], 'at': old.get('at')}
            print('FAILED', name, e, '-> kept', len(ev))
        events += ev
    seen, uniq = set(), []
    for e in sorted(events, key=lambda e: (e['date'], e.get('time', ''), e['title'])):
        k = (e['date'], e['type'], e['title'].lower())
        if k in seen: continue
        seen.add(k); uniq.append(e)
    pk = {(x.get('date'), x.get('type'), (x.get('title') or '').lower()): x for x in pev}
    for e in uniq:  # keep Thai text added later (e.g. by the daily routine) when the English is unchanged
        p = pk.get((e['date'], e['type'], e['title'].lower()))
        if not p: continue
        for f in ('th_title', 'th_note', 'title_th', 'note_th'):
            src = 'title' if 'title' in f else 'note'
            if p.get(f) and p.get(src, '') == e.get(src, '') and (not e.get(f) or f.startswith('th_') and p[f] != e.get(f)):
                e[f] = p[f]
    json.dump({'_help': 'AUTO-GENERATED by scripts/build_calendar.py every 6h. Do not edit; put manual events in calendar.json. Dates/times JST.',
               'updated': NOW.strftime('%Y-%m-%dT%H:%M:%SZ'), 'sources': status, 'events': uniq}, open(OUT, 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(status), len(uniq), 'events')
    if not uniq: sys.exit(1)

if __name__ == '__main__': main()
