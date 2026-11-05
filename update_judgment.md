# Daily judgment update (around 08:30 JST)

Scope of this routine: judgment.json (with Thai), X sentiment, calendar.json, and the Monday weekly report. All keyless data builds run in GitHub Actions.

The live app computes prices, indicators and the trade plan itself. Only the judgment content in `judgment.json` is refreshed once a day.

1. For each token in `tokens.json`, gather news from the last 24–48h (official X account, CoinDesk/The Block/Decrypt, project blog) and the mood on X (public X search for $SYM over the last 24h).
2. Edit `judgment.json`:
   - top level: `updated` (ISO with +09:00), `updated_label` ("Nov 3, 2026, 8:30 AM JST"), optional `market_note`
   - `tokens.SYM`: what, trend, sentiment (Bullish|Neutral|Bearish|Mixed), sentiment_note, risk (Medium|High|Very high), news[{title,source,url}] (3–5 items, real URLs only), bull[], bear[], watch[], take, verdict_note
   - `glossary[{term,def}]`: only change it if needed
   - **Thai (required, the app has an EN/ไทย toggle):** top-level `th:{market_note}`; each token `th:{what, sentiment_note, take, verdict_note, bull[], bear[], watch[]}`; each news item `th:{title}`; each glossary item `th:{term, def}`. Follow `docs/thai_style.md`: write the Thai from the facts, not word by word from the English. Keep tickers, numbers and terms like RSI, MA50, TP, SL in English. Keep enum fields (trend, sentiment, risk) in English; the app translates them.
2b. Maintain `calendar.json` (`events[{date YYYY-MM-DD JST, time HH:MM JST optional, type unlock|macro|listing|upgrade|exchange|other, tokens[] (empty = macro), impact high|medium|low, title, th_title, note, th_note, url}]`): add newly announced unlocks, listings, upgrades and macro dates (CPI, PPI, jobs, FOMC) for the next ~60 days, fix changed dates, drop events older than 30 days, set `updated`. Verify each date against an official/primary source and include its url.
2c. On-chain, bridge flows, news and screener are NOT built here any more. GitHub Actions rebuild and validate them on a schedule (`.github/workflows/`): screener every 3h, news, onchain and flows every 6h, interop every 2h, each validated by `scripts/validate.py` before commit. Do not run those build scripts in this routine. Just glance at the Actions tab (or the green/amber freshness badges in the app); if a data workflow has failed for over 12h, mention it in the summary. Flow methodology notes live in `scripts/build_flows.py`.
3. When a token is added to `tokens.json` ({symbol,name,coingecko,sources:[{ex,pair}]}; ex = binance|bybit|okx|hyperliquid), add a matching `tokens.SYM` entry. First curl its klines to check the pair is live and fresh (last candle under 3 days old).
4. Validate with `python3 -m json.tool judgment.json >/dev/null && python3 -m json.tool calendar.json >/dev/null`, then load the app and check that there are no console errors. If you edited any `*.js` file, run `bash scripts/build_min.sh` and commit `min/` too (the build Action also does this on push), and bump `ASSETV` in app.js, the `?v=` in index.html and the cache name in sw.js.
5. Deploy or copy the updated file to the host. judgment.json is fetched network-first, so clients pick up the update on their next refresh.
Not financial advice. Keep the wording neutral and educational.

## X sentiment step (daily) — fills `tokens[SYM].x`
Use the built-in `x` tools (free; never mention credits). `$` is stripped by the API, so use names/handles:
BTC `(bitcoin OR BTC)`, MON `(monad OR monad_xyz OR monad_foundation)`, HYPE `(hyperliquid OR HYPE)`, AAVE `aave`, SOL `(solana OR solana_labs)`, NEAR `("near protocol" OR NEARProtocol OR "near intents")`, PENDLE `(pendle OR pendle_fi)`, LIT `(Lighter_xyz OR "lighter dex" OR "lighter perp" OR "LIT token")` (ignore "Lighter $LIT on Solana" spam: fake memecoin).
1. `get_posts_counts_recent` (query + ` -is:retweet`, granularity day) → `mentions.now` = 7-day total, `mentions.daily` = 7 daily counts. Append `{date, SYM: now}` to `x_history.json.rows`; set `mentions.prev` = the row from 7 days earlier (null until it exists).
2. `search_posts_all` (start_time = now−7d, sort_order relevancy, max_results 40, `-is:retweet -is:reply lang:en`, post.fields created_at,public_metrics,author_id, expansions author_id, user.fields username,public_metrics).
3. Classify the sample → `split` {bull,neu,bear} as % ; 3–4 `points`; top 5 `top` [{author,url:https://x.com/<user>/status/<id>,date(ISO Z),text(short paraphrase),likes}]; 2–3 `accounts` [{handle,stance bull|neu|bear,take}]; `sample`, `updated`.
4. Thai: `th:{points:[], top:[texts], accounts:[takes]}`, written per `docs/thai_style.md`.

Thai rule for every step in this file: **Thai (every `th` field): first read `docs/thai_style.md`.** Write the EN, then write the TH natively from the same facts, as a Thai trader would post it (Siam Blockchain / Thai crypto X tone). Do not mirror English sentence order; no `;` or `—`; short sentences; keep long/short/funding/OI/ATH/TVL/perp/spot/tickers in English. Then run `python3 scripts/validate.py thai`, rewrite any WARN item, and read the 3 spot-check lines it prints before committing.

## Weekly report (every Monday JST)
1. Week = previous Mon–Sun (UTC daily candles). For each watchlist token get daily klines (Bybit spot `v5/market/kline?category=spot&symbol=SYMUSDT&interval=D&limit=9`, or binance.vision): close = Sunday close, w = % vs prior Sunday close, low/high = week range, verdict = current Long|Wait|Avoid.
2. Write `reports/weekly-YYYY-MM-DD.json` (date = the Monday) with: title, from, to, generated, summary[3–5], performance[], verdicts[{symbol,from,to,date,why,th:{why}}] (only changes this week), flows{points[],th{points[]}} (from flows.json 7d), ahead[{date,title,tokens,th:{title}}] (next 7 days from calendar.json), th{title,summary[]}, all Thai written per `docs/thai_style.md`.
3. Prepend `{file, week}` to `reports/index.json.reports`.

## Calendar unlocks & airdrops (weekly, plus when news breaks)
Sources (free): cryptolunar.com/token-unlocks-<month>-<year>/ (DefiLlama-derived table), defillama.com/calendar, cryptensive.com/dashboards/token-unlocks/, airdrops.io/calendar/, airdroptracker.io, project docs. DefiLlama's /emissions API is paid (402) — do not use.
Add `type:'unlock'` events with value_usd, supply_pct (% of circulating), vs_vol (value ÷ 24h volume from screener.json `vol`), impact (high if ≥5% supply or ≥$40M), JST date/time, th_title/th_note, url. Airdrops: `type:'airdrop'`, kind snapshot|claim|deadline|tge, url. Keep only well-known projects; skip testnet "est. allocation" spam.
