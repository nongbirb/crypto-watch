# X Narrative: how each edition is generated

The **X Narrative** menu (`#/narrative`) reads `narrative.json`. An agent adds a new edition twice a day:

| Slot | JST | Label (EN / TH) | Window covered |
|---|---|---|---|
| `am` | 08:00 | Overnight / US session · ฉบับเช้า: ช่วงตลาดสหรัฐฯ | previous 20:00 → 08:00 |
| `pm` | 20:00 | Asia & Europe day · ฉบับค่ำ: ช่วงเอเชีย & ยุโรป | 08:00 → 20:00 |

Keep the newest **14 editions**, newest first, and drop the oldest when you add one.

## 1. Gather (free tools only)
1. Read the `x-api-mcp-guide` skill first. X reads are free, so never mention credits.
2. `x.search_news` (built-in `x` namespace): run a query for crypto (`bitcoin OR ethereum OR Binance OR ETF OR stablecoin OR Solana OR Hyperliquid`, `max_age_hours` 14) and a second for US macro (Fed, CPI, jobs, earnings, elections, oil, gold).
3. `x.search_posts_all`, `-is:retweet`, `start_time` set to the window start:
   - posts `from:` the **T1** and **T2** lists in `sources_tiers.json` (OR-joined, split into batches of about 30 handles)
   - topical searches for each candidate narrative
   - always request `expansions=author_id` and `user.fields=created_at,public_metrics,username`
4. `x.get_posts_counts_recent` (granularity `day` or `hour`) for each ticker and theme, used for the mention deltas. `$` is stripped by the API, so tickers match as words. Label the counts approximate.
5. Cross-check every market number (prices, ETF flows, Fed, data dates) with `WebSearch` on primary or T2 outlets (company IR, CNBC, AP, Reuters, CoinDesk, The Block, Farside).
   - If an X claim conflicts with these outlets, use the outlet's figure.
   - If you can't verify a claim, drop it or mark it `"confirmed": false`.

## 2. Source rules
- **T1:** official project, founder, foundation, exchange, government or regulator accounts, explorers, and primary press releases.
- **T2:** research firms, data providers, on-chain analysts and major news outlets.
- **T3:** community accounts. Use one only when a T1 or T2 source backs the same claim, and cite both.
- **Exclude:** accounts younger than about 6 months (check `created_at`), bought-follower patterns (large following but almost no engagement), engagement farming (giveaways, "like & RT", recycled "BREAKING" lists), bots, AI content farms, impersonators, and anything on `blocklist`. Add newly found offenders to the blocklist with a reason.
- Every item must have at least one `src` entry `{n, u, tier}`. Link the exact post (`https://x.com/<handle>/status/<id>`) or article.
- Write neutral, factual language. No price calls or financial advice.

## 3. Schema (`schema: 1`)
```jsonc
{ "updated": "ISO+09:00", "schema": 1, "editions": [ {
  "id": "2026-11-03-am", "date": "2026-11-03", "slot": "am|pm|special",
  "label": {"en": "...", "th": "..."}, "generated_at": "ISO+09:00", "window": {"from": "...", "to": "..."},
  "top": {"en": [3 lines], "th": [3 lines], "src": [Src]},
  // NOTE: the site shows the LIVE Fear & Greed (alternative.me) on the latest edition. Do NOT put F&G numbers in sentiment.note; describe X mood only. score/prev are kept as fallback/archive.
  "sentiment": {"score": 0-100, "prev": 0-100, "label": {en,th}, "note": {en,th}, "src": [Src]},
  "narratives": [{"title": {en,th}, "body": {en,th}, "dir": "rising|fading", "momentum": -100..100, "src": [Src]}],
  "macro":     [{"title": {en,th}, "body": {en,th}, "src": [Src]}],
  "mentions":  {"note": {en,th}, "items": [{"sym": "BTC", "n": 51744, "prev": 64313}]},
  "catalysts": [{"date": "YYYY-MM-DD", "title": {en,th}, "src": [Src]}],
  "winners":   [{"sym": "HYPE", "chg": "+16% 7d", "why": {en,th}, "src": [Src]}],
  "losers":    [ ...same shape as winners ],
  "concerns":  [{"title": {en,th}, "body": {en,th}, "src": [Src], "confirmed": true|false}],
  "posts":     [{"h": "handle", "tier": "T1|T2", "u": "url", "at": "ISO", "likes": 0, "t": "short quote"}]
} ] }
// Src = {"n": "display name", "u": "url", "tier": "T1|T2|T3"}
```
- **Diff:** the UI compares narrative titles (EN) and momentum with the next-older edition, so keep a narrative's `title.en` the same across editions while the story continues.
- **Mentions:** the delta uses the previous edition's `n` for the same `sym`, and falls back to `prev`.
- **Thai:** write natural, conversational Thai (as a Thai trader would say it), not a literal translation. Keep tickers and proper nouns in English.

## 4. Validate → commit → push → live verify
```bash
python3 -c "import json;d=json.load(open('narrative.json'));e=d['editions'];assert len(e)<=14;[ (x['top']['th'],x['narratives']) for x in e];print('ok',len(e))"
node test_narr.mjs                       # headless: phone + desktop, EN/TH, light/dark, no console errors
git add narrative.json sources_tiers.json && git commit -m "Narrative: <date> <slot> edition" && git push
# wait ~1 min for GitHub Pages, then:
curl -s https://nongbirb.github.io/crypto-watch/narrative.json | python3 -c "import json,sys;print(json.load(sys.stdin)['editions'][0]['id'])"
```
`narrative.json` is network-first in the service worker, so installed PWAs pick up new editions on next open.
