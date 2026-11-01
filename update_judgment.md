# Daily judgment update (around 08:30 JST)

The live app computes prices, indicators and the trade plan itself. Only the judgment content in `judgment.json` is refreshed once a day.

1. For each token in `tokens.json`, gather news from the last 24–48h (official X account, CoinDesk/The Block/Decrypt, project blog) and the mood on X (public X search for $SYM over the last 24h).
2. Edit `judgment.json`:
   - top level: `updated` (ISO with +09:00), `updated_label` ("Nov 3, 2026, 8:30 AM JST"), optional `market_note`
   - `tokens.SYM`: what, trend, sentiment (Bullish|Neutral|Bearish|Mixed), sentiment_note, risk (Medium|High|Very high), news[{title,source,url}] (3–5 items, real URLs only), bull[], bear[], watch[], take, verdict_note
   - `glossary[{term,def}]`: only change it if needed
3. When a token is added to `tokens.json` ({symbol,name,coingecko,sources:[{ex,pair}]}; ex = binance|bybit|okx|hyperliquid), add a matching `tokens.SYM` entry. First curl its klines to check the pair is live and fresh (last candle under 3 days old).
4. Validate with `python3 -m json.tool judgment.json >/dev/null`, then load the app and check that there are no console errors.
5. Deploy or copy the updated file to the host. judgment.json is fetched network-first, so clients pick up the update on their next refresh.
Not financial advice. Keep the wording neutral and educational.
