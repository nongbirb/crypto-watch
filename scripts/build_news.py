#!/usr/bin/env python3
"""Daily news build -> news.json. Free RSS only: CoinDesk, The Block, Decrypt, Cointelegraph (keyword-matched)
plus Google News RSS search per token (gives publisher + publish date). 15 newest per token, deduped by title."""
import json, re, time, urllib.request, urllib.parse, email.utils, html, os
from xml.etree import ElementTree as ET
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {'User-Agent': 'Mozilla/5.0 (KMS Capital news build)'}
FEEDS = {'CoinDesk': 'https://www.coindesk.com/arc/outboundfeeds/rss/', 'The Block': 'https://www.theblock.co/rss.xml',
         'Decrypt': 'https://decrypt.co/feed', 'Cointelegraph': 'https://cointelegraph.com/rss'}
# extra search terms / project blog keywords per symbol
KW = {'BTC': ['bitcoin', 'btc'], 'ETH': ['ethereum', 'ether', 'eth'], 'MON': ['monad', 'mon token'], 'HYPE': ['hyperliquid', 'hype token', 'hyperevm'], 'AAVE': ['aave'], 'SOL': ['solana', 'sol token'], 'NEAR': ['near protocol', 'near token', 'near ai', 'near intents'], 'PENDLE': ['pendle'], 'LIT': ['lighter dex', 'lighter exchange', 'lighter perp', 'lit token', 'lighter (lit)', 'lighter']}
def fetch(u):
    for i in range(3):
        try: return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read()
        except Exception as e: err = e; time.sleep(2 * (i + 1))
    print('fail', u, err); return None
def items(xml, src=None):
    out = []
    try: root = ET.fromstring(xml)
    except Exception: return out
    for it in root.iter('item'):
        t = html.unescape((it.findtext('title') or '').strip()); l = (it.findtext('link') or '').strip(); d = it.findtext('pubDate')
        s = src or (it.find('source').text if it.find('source') is not None else '')
        if src is None and s and t.endswith(' - ' + s): t = t[: -len(s) - 3]
        try: ts = email.utils.parsedate_to_datetime(d).timestamp()
        except Exception: continue
        out.append({'title': t, 'url': l, 'source': s.strip(), 'date': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(ts)), '_ts': ts})
    return out
def main():
    toks = json.load(open(os.path.join(ROOT, 'tokens.json')))['tokens']
    pool = []
    for n, u in FEEDS.items():
        x = fetch(u); pool += items(x, n) if x else []
    res = {}
    for t in toks:
        s = t['symbol']; kws = KW.get(s, [t['name'].lower()])
        got = [i for i in pool if any(re.search(r'\b' + re.escape(k.strip()) + r'\b', i['title'].lower()) for k in kws)]
        q = urllib.parse.quote(f'"{t["name"]}" crypto' if s != 'BTC' else 'bitcoin')
        x = fetch(f'https://news.google.com/rss/search?q={q}+when:14d&hl=en-US&gl=US&ceid=US:en')
        g = items(x) if x else []
        got += [i for i in g if any(re.search(r'\b' + re.escape(k.strip()) + r'\b', i['title'].lower()) for k in kws)]
        seen, out = set(), []
        for i in sorted(got, key=lambda i: -i['_ts']):
            k = re.sub(r'\W+', '', i['title'].lower())[:60]
            if k in seen or not i['title']: continue
            seen.add(k); out.append({k2: v for k2, v in i.items() if k2 != '_ts'})
        res[s] = out[:15]; print(s, len(res[s])); time.sleep(1)
    json.dump({'_help': 'News per token, newest first. Built daily by scripts/build_news.py from free RSS (CoinDesk, The Block, Decrypt, Cointelegraph, Google News search). Dates are UTC ISO.',
               'updated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'tokens': res}, open(os.path.join(ROOT, 'news.json'), 'w'), ensure_ascii=False, indent=0)
main()
