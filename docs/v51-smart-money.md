# v51 Smart Money rework (branch smart-money-v2)

## Audit findings (v50, Nov 9 2026)
1. Biggest positions was one mixed top-12 list sorted by size, and the builder only stored `ps[:12]`. In the Most profitable group BTC showed 10 shorts of 12; SOL and MON showed 12 of 12, so longs were invisible.
2. The per-token table needed sideways scrolling on phone, and even at 1280 px desktop with 11 columns. The positions table and the token chip row also scrolled sideways on phone.
3. The "Avg leverage" help said account leverage (notional ÷ account value), but the number is Hyperliquid's per-position leverage setting, weighted by size. The help text now matches.
4. The KPI fallback said "of 500 wallets" in All tracked, where it counts positions per wallet and token.
5. No mark price, liquidation distance or ROE. "–" for liquidation was ambiguous.
6. No sample-size context. v47 rightly removed gross (L+S) ÷ OI. The correct measure is per side: group longs ÷ all HL longs (= OI), same for shorts.
7. 100 of 500 wallets are in both groups, and they were not flagged.
8. Cadence: the cron is every 30 min, but GitHub ran it only every ~4–7 h (Nov 6–9). Each run succeeds in about 1 min. Not changed here (proposal).
9. The top-level `coins` was a full second copy of the profit cohort, so the position lists were stored twice.
10. Market context (OI/funding/mark) was fetched after the wallet loop. It is now fetched right after, and `marketAt` is stamped.
11. Biggest positions sat at the bottom under the live trade tape, away from the other snapshot data.
12. Thai mixed transliterations (ลอง/ชอร์ต) with English terms.

## Data (scripts/build_smart_money.py)
- Per coin: `topL` / `topS` hold the biggest 10 longs and 10 shorts, ranked separately. `top` (mixed 12) is kept for cached v50 clients.
- Per position: `roe` is Hyperliquid `returnOnEquity`. `b: 1` means the wallet is in both cohorts.
- `cohorts.*.universe.both` holds the overlap count. `marketAt` holds the market context timestamp.
- Top-level `coins` keeps aggregates only.
- Requests, cadence and APIs are unchanged: still keyless Hyperliquid, 2 + ~900 requests per run.

## UI (smartmoney.js, style.css)
- Biggest positions · Long vs Short shows two lists, 5 visible and 5 more on tap. They are cards, not tables.
- Each card shows: leverage setting plus account leverage, entry → mark (position value ÷ size at snapshot), liquidation price and distance, ROE, open P&L, 30d P&L and an "in both groups" badge.
- The Long/Short summary shows counts, USD and "= x% of all Hyperliquid longs/shorts", timestamped and sourced. It also shows a cohort note and an overlap note. Any missing value shows as 'unavailable'.
- The per-token table becomes cards below 1200 px, and the chip row wraps. No sideways scroll at 360/390 px or on desktop.
- The two groups are still never summed together.

## Tests
`tests/smart-ui.mjs` (fixture `tests/fixtures/smart_money_v51.json`) checks:
- the split
- totals and sample size vs the fixture
- liquidation distance and ROE
- badges
- cohort switch
- pre-v51 snapshot fallback
- missing market → unavailable
- no overflow at 360/390 EN/TH and 1280
