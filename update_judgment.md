# Daily judgment update (around 08:30 JST)

The live app computes prices, indicators and the trade plan itself. Only the judgment content in `judgment.json` is refreshed once a day.

1. For each token in `tokens.json`, gather news from the last 24–48h (official X account, CoinDesk/The Block/Decrypt, project blog) and the mood on X (public X search for $SYM over the last 24h).
2. Edit `judgment.json`:
   - top level: `updated` (ISO with +09:00), `updated_label` ("Nov 3, 2026, 8:30 AM JST"), optional `market_note`
   - `tokens.SYM`: what, trend, sentiment (Bullish|Neutral|Bearish|Mixed), sentiment_note, risk (Medium|High|Very high), news[{title,source,url}] (3–5 items, real URLs only), bull[], bear[], watch[], take, verdict_note
   - `glossary[{term,def}]`: only change it if needed
   - **Thai (required, the app has an EN/ไทย toggle):** top-level `th:{market_note}`; each token `th:{what, sentiment_note, take, verdict_note, bull[], bear[], watch[]}`; each news item `th:{title}`; each glossary item `th:{term, def}`. Write natural, everyday Thai the way a Thai trader would actually talk (not word-by-word translation). Keep tickers, numbers and terms like RSI, MA50, TP, SL in English. Keep enum fields (trend, sentiment, risk) in English; the app translates them.
2b. Maintain `calendar.json` (`events[{date YYYY-MM-DD JST, time HH:MM JST optional, type unlock|macro|listing|upgrade|exchange|other, tokens[] (empty = macro), impact high|medium|low, title, th_title, note, th_note, url}]`): add newly announced unlocks, listings, upgrades and macro dates (CPI, PPI, jobs, FOMC) for the next ~60 days, fix changed dates, drop events older than 30 days, set `updated`. Verify each date against an official/primary source and include its url.
2c. Rebuild on-chain data: run `python3 scripts/build_onchain.py` (free DefiLlama endpoints: api.llama.fi /v2/chains, /v2/historicalChainTvl, /overview/fees (+dailyRevenue), /overview/dexs, /protocols, /hacks; stablecoins.llama.fi; coins.llama.fi). It rewrites `onchain.json` for the FIXED 15 chains (Ethereum, Solana, Base, Arbitrum, BSC, Polygon, OP Mainnet, Avalanche, Tron, Sui, Hyperliquid L1, Unichain, Monad, Near, Sonic; 400 days) and `icons/chains/*.jpg`. Check all 15 chains printed and the JSON is valid.
2d. Rebuild bridge flows: run `python3 scripts/build_flows.py` (can take 10-15 min; first 30d build ~1 h; paged data is cached in scripts/.flows_cache/, gitignored, keep it on the box). It writes `flows.json` = real chain-pair USD volume for 1d/7d/30d from Wormholescan x-chain-activity, deBridge DLN getDaily, LayerZero scan (Stargate v2 / USDT0 / PYUSD amounts decoded) and the Across indexer (priced via coins.llama.fi). Dedupe: count at the messaging layer only (never add Mayan/Allbridge/Portal on top of Wormhole or Stargate on top of LayerZero), skip aggregator totals (Relay, LI.FI), dedupe paged transfers by id and then by source tx hash; self-loops dropped; non-15 chains = Other. Sanity check the printed totals: Wormhole 7d should be the same order as `check.wormholescan_scorecards.7d_volume` (x-chain notional is lower because scorecards include non-transfer messages), deBridge > 0 for every window, and no single route > $5B/day. If one source fails the file still builds with the others; mention it in the summary. Known gaps to keep in the UI note: Chainlink CCIP (no filterable public API), canonical rollup bridges, direct Circle CCTP, CEX flows, unpriced LayerZero OFT apps. Leverage data (Binance, Bybit, OKX, Hyperliquid) is fetched live in the browser, not precomputed; the liquidation map is an estimate from OI changes and leverage tiers.
3. When a token is added to `tokens.json` ({symbol,name,coingecko,sources:[{ex,pair}]}; ex = binance|bybit|okx|hyperliquid), add a matching `tokens.SYM` entry. First curl its klines to check the pair is live and fresh (last candle under 3 days old).
4. Validate with `python3 -m json.tool judgment.json >/dev/null && python3 -m json.tool calendar.json >/dev/null`, then load the app and check that there are no console errors.
5. Deploy or copy the updated file to the host. judgment.json is fetched network-first, so clients pick up the update on their next refresh.
Not financial advice. Keep the wording neutral and educational.

## X sentiment step (daily) — fills `tokens[SYM].x`
Use the built-in `x` tools (free; never mention credits). `$` is stripped by the API, so use names/handles:
BTC `(bitcoin OR BTC)`, MON `(monad OR monad_xyz OR monad_foundation)`, HYPE `(hyperliquid OR HYPE)`, AAVE `aave`, LIT `(Lighter_xyz OR "lighter dex" OR "lighter perp" OR "LIT token")` (ignore "Lighter $LIT on Solana" spam: fake memecoin).
1. `get_posts_counts_recent` (query + ` -is:retweet`, granularity day) → `mentions.now` = 7-day total, `mentions.daily` = 7 daily counts. Append `{date, SYM: now}` to `x_history.json.rows`; set `mentions.prev` = the row from 7 days earlier (null until it exists).
2. `search_posts_all` (start_time = now−7d, sort_order relevancy, max_results 40, `-is:retweet -is:reply lang:en`, post.fields created_at,public_metrics,author_id, expansions author_id, user.fields username,public_metrics).
3. Classify the sample → `split` {bull,neu,bear} as % ; 3–4 `points`; top 5 `top` [{author,url:https://x.com/<user>/status/<id>,date(ISO Z),text(short paraphrase),likes}]; 2–3 `accounts` [{handle,stance bull|neu|bear,take}]; `sample`, `updated`.
4. Thai: `th:{points:[], top:[texts], accounts:[takes]}` in natural Thai.

## News step (daily)
`python3 scripts/build_news.py` → news.json (15 per token, RSS + Google News, keyword-filtered).

## Screener step (daily)
`python3 scripts/build_screener.py` → screener.json (top 200 + watchlist; RSI, MA distance, support, volume spike, funding).

## Weekly report (every Monday JST)
1. Week = previous Mon–Sun (UTC daily candles). For each watchlist token get daily klines (Bybit spot `v5/market/kline?category=spot&symbol=SYMUSDT&interval=D&limit=9`, or binance.vision): close = Sunday close, w = % vs prior Sunday close, low/high = week range, verdict = current Long|Wait|Avoid.
2. Write `reports/weekly-YYYY-MM-DD.json` (date = the Monday) with: title, from, to, generated, summary[3–5], performance[], verdicts[{symbol,from,to,date,why,th:{why}}] (only changes this week), flows{points[],th{points[]}} (from flows.json 7d), ahead[{date,title,tokens,th:{title}}] (next 7 days from calendar.json), th{title,summary[]} in natural Thai.
3. Prepend `{file, week}` to `reports/index.json.reports`.

## Calendar unlocks & airdrops (weekly, plus when news breaks)
Sources (free): cryptolunar.com/token-unlocks-<month>-<year>/ (DefiLlama-derived table), defillama.com/calendar, cryptensive.com/dashboards/token-unlocks/, airdrops.io/calendar/, airdroptracker.io, project docs. DefiLlama's /emissions API is paid (402) — do not use.
Add `type:'unlock'` events with value_usd, supply_pct (% of circulating), vs_vol (value ÷ 24h volume from screener.json `vol`), impact (high if ≥5% supply or ≥$40M), JST date/time, th_title/th_note, url. Airdrops: `type:'airdrop'`, kind snapshot|claim|deadline|tge, url. Keep only well-known projects; skip testnet "est. allocation" spam.
