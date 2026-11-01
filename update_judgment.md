# Daily judgment update (around 08:30 JST)

The live app computes prices, indicators and the trade plan itself. Only the judgment content in `judgment.json` is refreshed once a day.

1. For each token in `tokens.json`, gather news from the last 24–48h (official X account, CoinDesk/The Block/Decrypt, project blog) and the mood on X (public X search for $SYM over the last 24h).
2. Edit `judgment.json`:
   - top level: `updated` (ISO with +09:00), `updated_label` ("Nov 3, 2026, 8:30 AM JST"), optional `market_note`
   - `tokens.SYM`: what, trend, sentiment (Bullish|Neutral|Bearish|Mixed), sentiment_note, risk (Medium|High|Very high), news[{title,source,url}] (3–5 items, real URLs only), bull[], bear[], watch[], take, verdict_note
   - `glossary[{term,def}]`: only change it if needed
   - **Thai (required, the app has an EN/ไทย toggle):** top-level `th:{market_note}`; each token `th:{what, sentiment_note, take, verdict_note, bull[], bear[], watch[]}`; each news item `th:{title}`; each glossary item `th:{term, def}`. Write natural, everyday Thai the way a Thai trader would actually talk (not word-by-word translation). Keep tickers, numbers and terms like RSI, MA50, TP, SL in English. Keep enum fields (trend, sentiment, risk) in English; the app translates them.
2b. Maintain `calendar.json` (`events[{date YYYY-MM-DD JST, time HH:MM JST optional, type unlock|macro|listing|upgrade|exchange|other, tokens[] (empty = macro), impact high|medium|low, title, th_title, note, th_note, url}]`): add newly announced unlocks, listings, upgrades and macro dates (CPI, PPI, jobs, FOMC) for the next ~60 days, fix changed dates, drop events older than 30 days, set `updated`. Verify each date against an official/primary source and include its url.
3. When a token is added to `tokens.json` ({symbol,name,coingecko,sources:[{ex,pair}]}; ex = binance|bybit|okx|hyperliquid), add a matching `tokens.SYM` entry. First curl its klines to check the pair is live and fresh (last candle under 3 days old).
4. Validate with `python3 -m json.tool judgment.json >/dev/null && python3 -m json.tool calendar.json >/dev/null`, then load the app and check that there are no console errors.
5. Deploy or copy the updated file to the host. judgment.json is fetched network-first, so clients pick up the update on their next refresh.
Not financial advice. Keep the wording neutral and educational.
