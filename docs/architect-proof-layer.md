# Architect brief: Proof Layer, Smart Money v2, Setup card

Status: proposal on branch `claude/wonderful-sagan-55yt2d`. Nothing in `main` is changed. For GrokBot / auditor review, then for the coding model.

Recommended coding model: Claude Opus 5.5. Use **high** effort for Phase 1 and Phase 2 (statistics, no-lookahead rules, data schemas: mistakes here are silent). Use **medium** effort for Phase 3 and Phase 4 (UI and wiring). One phase per branch and per PR, in order.

## 0. Ground rules (do not break)

- Static site on GitHub Pages. No server, no API keys, no paid data. Builders run in GitHub Actions and commit JSON.
- Every builder output passes `scripts/validate.py` before commit. Add a validator for every new file.
- Only real API values. Anything missing is omitted and the UI says "not available". Estimates are labelled as estimates.
- No buy/sell calls. The app shows evidence and its own track record.
- EN and Thai for every new string (`docs/thai_style.md`).
- Source files are the root `*.js`; `min/` is produced by `scripts/build_min.sh`. Never edit `min/` by hand.
- Do not rewrite `app.js`. Extract only what a phase needs.
- Verify every external field named below against the live API before relying on it. Fields marked (verify) were not checked.

## 1. Problems this brief fixes (with evidence)

| # | Problem | Where |
|---|---|---|
| P1 | The Long / Wait / Avoid verdict has never been tested. The UI says so itself ("not a validated trading edge"). Patterns have a walk-forward backtest; the verdict has none | `app.js:109-150`, `app.js:449` |
| P2 | The verdict is computed on the still-open daily candle, so MACD histogram and the MA tests can flip during the day | `app.js:113-118` (`c` includes the live bar) |
| P3 | The verdict is long-only and has three coarse states. "Avoid" only means price is below MA50 and not above MA200. It uses no volume, no derivatives, no relative strength, no event risk | `app.js:143-146` |
| P4 | Smart Money cohort = top 500 by 30-day dollar PnL. After a down month this selects shorts by construction (snapshot: group 10% long). The page admits it. Dollar PnL also rewards account size, not skill | `scripts/build_smart_money.py:27-29` |
| P5 | Smart Money keeps no history, so the page shows levels, never changes. Cohort membership changes each run, so a change in the total mixes "new members" with "members traded" | `scripts/build_smart_money.py:95-103` |
| P6 | Leverage score uses absolute thresholds shared by all tokens (funding APR 5 to 40, OI ÷ mcap 1 to 10 %). BTC and MON are not comparable on one scale. Baseline funding (0.01 % per 8h ≈ 11 % APR) already scores as heat | `leverage.js:104-109` |
| P7 | Hyperliquid and OKX open interest have no history in the browser and are added as a flat constant, so the 24h OI change is understated. For HYPE, Hyperliquid is the main venue, so the number is mostly hidden | `leverage.js:59`, `leverage.js:48`, `leverage.js:114-119` |
| P8 | The liquidation heatmap assumes a fixed leverage mix, splits new OI by the long/short *account* ratio, and never removes positions when OI falls | `leverage.js:126-145` (`if (d <= 0) continue`) |
| P9 | Pattern types that the app's own backtest shows failing are still presented like the others: ascending triangle 11 % (n=70), bear flag 18 % (n=56), bull flag 21 % (n=38), cup 15 % on 1d (n=46) | `patterns_backtest.json` → `types.any` |

## 2. Phase 1: Proof Layer (signal ledger + verdict backtest)

Goal: every signal the app shows is recorded when it fires and graded later. The UI shows the record next to the signal.

### 2.1 Extract a shared core
- New `verdict-core.js` (UMD like `events-core.js`, loadable by browser and node): move `sma`, `ema`, `rsiSeries`, `bb`, `atr`, `swings`, `dedupe`, `compute` out of `app.js:78-150` unchanged. `app.js` calls the core. Add to `scripts/build_min.sh` and `index.html`.
- Add option `compute(t, { closedOnly: true })`: indicators and bias use closed daily candles only; the live price is used only for distance-to-level display. This becomes the default in the app (fixes P2).
- Tests: `tests/verdict.mjs` must still pass; add a test that the bias does not change when only the open candle changes.

### 2.2 Verdict backtest
- New `scripts/build_verdict_backtest.mjs`, modelled on `scripts/build_patterns_backtest.mjs` (same candle fetchers, same no-lookahead walk).
- For each token and each closed daily bar with 200+ bars of history: record bias, trend, entry zone, stop, TP1.
- Outcomes per state: forward return at +1d, +7d, +30d (median, 25th/75th percentile, share positive). For `Long` only: did price reach TP1 before the stop, and the result in R.
- Baseline: the same statistics for all days of that token, so each state is shown against "any day".
- Split by time 70 / 30 as the pattern backtest does. Report both.
- Output `verdict_backtest.json`: `{updated, method, tokens:{SYM:{n, states:{Long:{n, d1, d7, d30, tp1BeforeStop, avgR}, Wait:{...}, Avoid:{...}}, baseline:{...}}}, all:{...}}`. Minimum n for showing a rate: 20; below that the UI shows "not enough samples (n=…)".
- Workflow: weekly, same shape as `.github/workflows/patterns_backtest.yml`.

### 2.3 Live ledger
- New `scripts/build_ledger.mjs`, run every 3h (reuse the screener workflow shape). It reads the same public candles, runs `verdict-core` and `patterns.js`, reads `smart_money.json` and `data/sm/history.json` (Phase 2), and appends **state changes only** to `data/ledger/YYYY-MM.json`.
- Entry: `{id, t, sym, kind, from, to, px, ctx}`. `kind` is one of `verdict`, `pattern`, `funding_regime`, `oi_regime`, `sm_flow`. `ctx` holds the numbers that caused the change.
- Grading pass in the same script: for entries older than 1d / 7d / 30d fill `r1`, `r7`, `r30` from closed candles. Never rewrite `t`, `px`, `from`, `to` after creation. Follow the lock-then-score rule used in `scripts/build_events.mjs`.
- `data/ledger/summary.json`: per `kind` and `to` state: n, median forward returns, share positive, versus the token baseline.
- Add both files to `scripts/validate.py` (schema, monotonic `t`, no edits to locked fields: compare with the previous commit's entries).

### 2.4 UI
- Trade plan card (`planHTML`, `app.js:437`): replace the fixed "not a validated trading edge" line with the record: `This state on BTC: 41 past cases · median +7d −1.2% (any day +0.4%)`. Tooltip explains method. Keep the old line when n < 20.
- New "What changed" strip at the top of Markets: ledger entries since the viewer's last visit (timestamp in `localStorage`), newest first, max 8, each linking to its token.
- New route `#/record`: the summary table per signal kind. Plain table, no charts in v1.

Acceptance: backtest reproducible from a fixture (`tests/fixtures/`), ledger append is idempotent (running twice adds nothing), validator rejects an edited locked field, Thai strings present, phone width has no sideways scroll.

## 3. Phase 2: Smart Money v2 (skill panel, flows, real liquidation map)

### 3.1 Cohort
- Keep `profit` and `size` for one release, add `panel`, then make `panel` the default.
- `panel` selection, run once a week (Monday 00:00 UTC) and stored in `data/sm/panel.json` with the selection date:
  - account value ≥ $100k;
  - positive PnL in week, month **and** allTime windows of the leaderboard (verify window names);
  - ranked by 30-day ROI, not dollars (leaderboard `roi`, verify), with ROI capped at the 99th percentile;
  - exclude likely market makers and hedgers: 30-day volume ÷ account value above a threshold (leaderboard `vlm`, verify; pick the threshold from the distribution and document it), and vault / sub-account addresses if the API marks them (verify);
  - top 300.
- Between selections the member list is frozen. All flow numbers come from this fixed list, so a change means members traded (fixes P5).
- State the rule and the selection date on the page, as today.

### 3.2 History and flows
- Each run appends one row per coin to `data/sm/history.json` (keep 30 days, then daily rows up to 1 year): `{t, coin, cohort, nL, nS, vL, vS, mark}`.
- Each run also writes `data/sm/last_positions.json` (address → coin → signed size, entry). The next run diffs against it and stores `flows` in `smart_money.json` per coin: opened, closed, increased, reduced, flipped (count and USD), separately for long and short, for 24h and 7d.
- Size changes are measured in coins, then valued at the current mark, so a price move alone is not counted as a flow.
- Cadence: the workflow already runs at `17,47 * * * *` but GitHub delays it. Keep it; the page keeps showing real snapshot age. Flows are computed between actual snapshot times and labelled with them.

### 3.3 Real liquidation map and "who is underwater"
- In `build()` aggregate **all** panel positions (not only top 10 per side) per coin into price bins of 1 % from −30 % to +30 % of mark: `liqBins:[{lo, hi, long, short}]` using each position's real `liquidationPx`. Positions with no liquidation price are counted in `noLiq`.
- Also per coin and side: notional-weighted average entry, share of notional in loss at mark, median distance to liquidation.
- Leverage tab: when `liqBins` exists for the token, draw it as a second layer labelled "Real · Hyperliquid tracked wallets (sample of N, $X)" beside the existing estimate, which stays labelled "Estimate". Never sum the two.

### 3.4 Page layout (`smartmoney.js`)
The page is about 6,400 px tall on a phone and opens with four level KPIs. Reorder, do not redesign:
1. Headline sentence per selected token from flows: `Fixed panel, last 24h: net −$42M BTC (31 wallets added shorts, 9 closed longs).`
2. Flow table: one row per token: 24h net flow, 7d net flow, current lean vs group, sparkline of net position from history.
3. Who is underwater + real liquidation clusters.
4. Biggest positions (existing cards), collapsed by default.
5. Live trade tape, collapsed by default (it only fills while the tab is open, so it should not hold prime space).
Move the long explanatory paragraphs into the existing `?` help popovers.

Acceptance: fixture test for the diff (open, close, flip, pure price move = zero flow), panel frozen between selections, `smart_money.json` stays under 700 KB, validator covers new files, `tests/smart-ui.mjs` extended.

## 4. Phase 3: Setup card (replaces the bare Long / Wait / Avoid chip)

- Keep the existing rule as the "Trend" line, on closed candles, but name states by what they measure: `Uptrend setup` / `Mixed` / `Downtrend` / `Insufficient data`. "Avoid" reads as advice; "Downtrend" is a fact.
- Add hysteresis: a state changes only after two consecutive closed daily bars agree.
- Under it, an evidence checklist, each line green / grey / red with its number and source tab. No summed score in v1:
  - Trend (existing rule)
  - Relative strength: token ÷ BTC 30-day return, and above/below its own 50-day average of that ratio
  - Derivatives: funding percentile and OI change (Phase 4 numbers)
  - Smart Money: panel 7-day flow direction (Phase 2)
  - Pattern: best active pattern, only if its type has hit rate ≥ 35 % at n ≥ 30 in `patterns_backtest.json`; otherwise shown greyed with its real rate (fixes P9)
  - Event risk: high-impact calendar event for this token or macro within 48h (`calendar.json`)
- Each line that has a ledger record shows it (Phase 1). A combined score may be added later only if the ledger shows the combination beats its parts out of sample.
- Symmetric levels: when the state is Downtrend, show the mirrored plan (resistance zone, invalidation above, targets at supports) labelled as levels, not as a short call.

## 5. Phase 4: Leverage fixes

- Per-token percentiles: new builder step in `scripts/build_positioning.py` storing 90 days of 8h funding and daily OI per venue per token in `data/lev/history.json` (Hyperliquid `fundingHistory`, Binance / Bybit history endpoints; record Hyperliquid and OKX OI each run because they give no history). The score components `fund`, `lev`, `mom` use the token's own percentile over 90 days instead of fixed bounds (fixes P6, P7).
- Funding at the venue floor counts as neutral (the `floor` flag already exists at `leverage.js:91` but is not used in the score).
- Split the single score into two readings: "How much leverage" (OI ÷ mcap percentile, OI build-up) and "Which side is crowded" (signed funding, basis, long/short accounts). One unsigned number hides the direction.
- Heatmap: remove notional when OI falls (take it proportionally from all open bins), and rename the long/short split input in the help text to "share of accounts, not of money".
- Show HL and OKX in the OI change only for the hours where recorded history exists; otherwise say which venues are excluded from the percentage.

## 6. Phase 5 (optional, after the above): Business Pulse per token

One small card per token on the token page, built from DefiLlama's free fees / revenue / TVL endpoints in `scripts/build_onchain.py` (already the DefiLlama builder) plus data the repo already has:

| Token | Driver shown |
|---|---|
| BTC | Liquidity gauge: spot ETF net flow, 30-day stablecoin supply change, exchange net flow (`positioning.json` → `native.BTC.exflow`) |
| ETH | Exchange net flow, staking share, L2 bridge net flow (`flows.json`, `interop.json`) |
| HYPE | Daily protocol fees and buyback vs scheduled unlock supply (`native.HYPE.stake` already holds circulating / future supply) = net buy or sell pressure per day |
| LIT | Lighter vs Hyperliquid: perp volume and OI share, and market cap ÷ annualised fees for both, side by side |
| AAVE | Fees, revenue, borrow utilisation, market cap ÷ annualised revenue, buyback amount |
| MON | Dilution vs adoption: next unlock as % of circulating supply (`calendar.json`) against Monad TVL, stablecoin supply and bridge net flow (`onchain.json`, `flows.json`) |
| PENDLE | TVL, fees, share of supply locked (`positioning.json` → `onchain.PENDLE`) |
| SOL / NEAR | Staking share, active addresses, chain fees |

Each card: 3 numbers, each with a 30-day change and a source link. Missing data = line omitted.

## 7. Order and size

| Phase | Effort setting | Rough size |
|---|---|---|
| 1 Proof Layer | high | 1 core extraction, 2 builders, 2 workflows, 3 UI touches |
| 2 Smart Money v2 | high | builder rewrite of `build()`, 3 data files, page reorder |
| 3 Setup card | medium | `planHTML` + one new render function |
| 4 Leverage fixes | medium | 1 builder step, `levModel` and `heatmap` edits |
| 5 Business Pulse | medium | builder additions, one card |

Phase 3 depends on 1, 2 and 4 for its evidence lines; ship it with whichever lines exist and add the rest as they land.
