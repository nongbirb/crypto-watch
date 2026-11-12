# Architect brief: Proof Layer, Smart Money v2, Setup card

Revision 2, Nov 13 2026. Branch `claude/wonderful-sagan-55yt2d`. Nothing in `main` is changed.

Revision 2 folds in every fix from `docs/architect-proof-layer-feedback.md` (Grok Research + Audit Grok) and `docs/architect-proof-layer.audit.md` (Audit Grok). All of their points were accepted. This file is now the single source for the coding model; the two feedback files remain as the review record and as the auditor's checklist.

Recommended coding model: Claude Opus 5.5. **High** effort for Phase 1 and Phase 2 (statistics, no-lookahead rules, data schemas: mistakes here are silent). **Medium** effort for Phases 3, 4 and 5.

Build order: **Phase 1, then 2, then 4, then 3.** Phase 5 is optional. Phase numbers are kept from revision 1 so the feedback files still match.

## 0. Ground rules (do not break)

Product
- Static site on GitHub Pages. No server, no API keys, no paid data. Builders run in GitHub Actions and commit JSON.
- Only real API values. Anything missing is omitted and the UI says "not available". Estimates are labelled as estimates. A partial sample is always labelled "sample of N", never shown as complete.
- No buy/sell calls. The app shows evidence and its own track record.
- Every page shows the real age of its data.
- EN and Thai for every new string. Thai reads the way a Thai crypto trader talks and keeps common English trading terms (`docs/thai_style.md`, `scripts/thai_blocklist.txt`).
- Phone width: no sideways scrolling. Times show in the viewer's local time zone.

Protected files
- Never edit `data/events/`, `data/events/inputs/`, `reports/`, `narrative.json` or `judgment.json` except through their own builders or jobs. Locked fields and lock proofs must stay valid.
- **Never rename the stored state codes** `Long`, `Wait`, `Avoid`, `Insufficient`. They are used by `judgment.json`, `reports/weekly-*.json`, `scripts/build_weekly.mjs`, `tests/verdict.mjs`, `i18n.js`, `extra.js`, `onchain.js` and `leverage.js`. Only display labels may change, through `i18n.js`.

Code and release
- Source files are the root `*.js`; `min/` is produced by `scripts/build_min.sh`. Never edit `min/` by hand.
- Do not rewrite `app.js`. Extract only what a phase needs.
- Every UI release bumps `ASSETV` in `app.js` (53 on `main` today) and the `cw-shell-vNN` cache name in `sw.js` together, to the same number, and updates `EXPECT_ASSETV` in the tests.
- Every PR passes **all** suites in `tests/` and `scripts/validate.py`, not only new ones. Never weaken an existing test to make it pass.
- Every new data file gets a schema check **and a size cap** in `scripts/validate.py`.
- Refer to code by function name. Line numbers drift.
- Verify every external API field named below against the live API before relying on it. Fields marked (verify) were not checked.

Git and review
- One phase per branch and per PR, branched from current `main`.
- Regular merge commits only. No squash, no rebase, no force-push, no history rewrite.
- Nothing merges until Audit Grok has audited that exact head commit **and** the owner types "merge". The auditor's approval is not the owner's.
- Workflow commits use `git config user.email "41898282+github-actions[bot]@users.noreply.github.com"`.
- Each PR attaches screenshots: EN and TH, desktop and phone, light and dark.

Scheduling
- GitHub skips many scheduled runs. Any new builder that runs more often than daily must be added to the dispatch list in `.github/workflows/heartbeat.yml`, with the same "skip if it started in the last 50 min" guard.

Pattern display rule (used everywhere a pattern is shown)
- A pattern type with hit rate under 35 % at effective n ≥ 30 is shown greyed with its real rate.
- A type with effective n < 30 shows "not enough cases (n=…)".
- Effective n is defined in 2.2.

## 1. Problems this brief fixes

All confirmed by the reviewers against `main` except where noted.

| # | Problem | Where |
|---|---|---|
| P1 | The Long / Wait / Avoid verdict has never been tested. The UI says so itself ("not a validated trading edge"). Patterns have a walk-forward backtest; the verdict has none | `app.js` `compute`, `planHTML` |
| P2 | The verdict is computed on the still-open daily candle, so it can flip during the day | `app.js` `klines` (never drops the last candle), `compute` |
| P3 | The verdict is long-only with three coarse states. `Avoid` only means price is below MA50 and not above MA200. No volume, derivatives, relative strength or event risk | `app.js` `compute` |
| P4 | Smart Money cohort = top 500 by 30-day dollar PnL. After a down month this selects shorts by construction (snapshot: group 10 % long). Dollar PnL also rewards size, not skill | `scripts/build_smart_money.py` (`cand`, `COH`) |
| P5 | Smart Money keeps no history, so the page shows levels, never changes. Membership changes each run, so a change in the total mixes "new members" with "members traded" | `scripts/build_smart_money.py` |
| P6 | Leverage score uses fixed bounds for all tokens (funding APR 5 to 40, OI ÷ mcap 1 to 10 %). Baseline funding (about 11 % APR) already scores as heat | `leverage.js` `levModel` (`comp`) |
| P7 | Hyperliquid and OKX open interest have no history in the browser and are added flat, so the 24h OI change is understated. For HYPE this hides the main venue | `leverage.js` `vHyper`, `vOkx`, `aggOi` |
| P8 | The liquidation heatmap assumes a fixed leverage mix, splits new OI by the long/short *account* ratio, and never removes positions when OI falls | `leverage.js` `levMix`, `heatmap` |
| P9 | Pattern types that the app's own backtest shows failing are presented like the others. From `patterns_backtest.json` → `types.any`: ascending triangle 11.4 % (n=70), cup 12.4 % (n=105), descending triangle 13.0 % (n=77), bear flag 17.9 % (n=56), bull flag 21.1 % (n=38), inverse head and shoulders 23.6 % (n=72), symmetric triangle 24.2 % (n=62), head and shoulders 30.8 % (n=52). Bear pennant 0 % (n=20) is "not enough cases" | `patterns_backtest.json` |

## 2. Phase 1: Proof Layer (signal ledger + verdict backtest)

Goal: every signal the app shows is recorded when it fires and graded later. The UI shows the record next to the signal.

### 2.1 Shared core
- New `verdict-core.js` (UMD like `events-core.js`, loadable by browser and node): move `sma`, `ema`, `rsiSeries`, `bb`, `atr`, `swings`, `dedupe`, `compute` out of `app.js` unchanged. `app.js` calls the core. Add it to `scripts/build_min.sh` and `index.html`.
- Add option `compute(t, { closedOnly: true })`: indicators and bias use closed daily candles only; the live price is used only to show distance to levels. This becomes the default in the app (fixes P2).
- State codes stay `Long` / `Wait` / `Avoid` / `Insufficient`.
- Timing note, required in the PR description and in the card's help text: with closed candles a state can change up to a day later than it does today. The daily brief runs at about 09:10 JST, just after the 00:00 UTC close, so `judgment.json` notes written then agree with the page.
- Tests: `tests/verdict.mjs` still passes; new test that the bias does not change when only the open candle changes.

### 2.2 Verdict backtest
- New `scripts/build_verdict_backtest.mjs`, modelled on `scripts/build_patterns_backtest.mjs` (same fetchers, same no-lookahead walk). Fetch as much daily history as each venue gives (paginate).
- For each token and each closed daily bar with 200+ bars of history: record state, trend, entry zone, stop, TP1.
- Outcomes per state: forward return at +1d, +7d, +30d (median, 25th and 75th percentile, share positive). For `Long` only: did price reach TP1 before the stop, and the result in R.
- Baseline: the same statistics for all days of that token over the same period.
- 70 / 30 split by time. Report both parts. Nothing is tuned on the 30 % part.

**Sample size (blocking).** Forward windows from consecutive days overlap almost completely, so raw n overstates the sample by up to 7× and 30×.
- Effective n, per state and horizon h: walk cases in time order, count a case, then skip every case that starts fewer than h bars after the last counted one. Store both `n` and `nEff`.
- Confidence interval for each median and share: moving-block bootstrap, block length h, 1,000 resamples, fixed seed so the output is reproducible. Store the 5th and 95th percentile.
- Every display gate uses `nEff`. Minimum to show a rate: `nEff` ≥ 20. Below it the UI shows "not enough samples (n=…)". Expect +30d to fail this gate for most tokens; that is the honest result.
- Store history length per token (first candle date, years). Tokens under 2 years (MON, HYPE, LIT today) carry a "short history" label wherever their record is shown.
- Apply the same idea to patterns: add `nEff` per type to `patterns_backtest.json` (same token, timeframe and type: skip a pattern detected before the previous counted one resolved). The pattern display rule in section 0 reads `nEff`.

Output `verdict_backtest.json`: `{updated, method, tokens:{SYM:{from, years, short, states:{Long:{h1:{n, nEff, med, p25, p75, pos, ci:[lo, hi]}, h7:{…}, h30:{…}, tp1BeforeStop, avgR}, Wait:{…}, Avoid:{…}}, baseline:{…}, test:{…}}}, all:{…}}`. Size cap 300 KB.

Workflow: weekly, same shape as `.github/workflows/patterns_backtest.yml`.

### 2.3 Live ledger
- New `scripts/build_ledger.mjs`, every 3h, added to `heartbeat.yml`. It reads public candles, runs `verdict-core` and `patterns.js`, reads `smart_money.json` and the Phase 2 and Phase 4 files when they exist, and appends **state changes only** to `data/ledger/YYYY-MM.json`.
- Entry: `{id, t, sym, kind, from, to, px, ctx}`. `kind` is `verdict`, `pattern`, `funding_regime`, `oi_regime` or `sm_flow`. `verdict` entries use the stored state codes. `ctx` holds the numbers that caused the change.
- Grading in the same script: for entries older than 1d / 7d / 30d fill `r1`, `r7`, `r30` from closed candles.
- Locked fields `id`, `t`, `sym`, `kind`, `from`, `to`, `px`, `ctx` are never edited after creation. Lock time is provable from the push timestamp, as with Events (`scripts/build_events.mjs`).
- `data/ledger/summary.json`: per `kind` and `to` state: n, nEff, median forward returns, share positive, against the token baseline. Size cap 100 KB. Monthly ledger files: cap 200 KB each.
- `scripts/validate.py`: schema, increasing `t`, size caps, and rejection of any change to a locked field (compare with the previous commit).

### 2.4 UI
- Trade plan card (`planHTML`): replace the fixed "not a validated trading edge" line with the record, for example `This state on BTC: 12 independent cases · median +7d −1.2 % (range −3.0 to +0.9) · any day +0.4 %`. Keep the old line when `nEff` < 20. Show "short history" where it applies.
- Pattern cards: apply the pattern display rule from section 0.
- "What changed" strip at the top of Markets: ledger entries since the viewer's last visit (timestamp in `localStorage`), newest first, at most 8, each linking to its token.
- New route `#/record`: the summary table per signal kind. Plain table, no charts in v1.

### 2.5 What the audit will test
- No-lookahead: indicators at bar t use only bars ≤ t. A fixture test changes bar t+1 and the state at t must not change.
- Split is by time and nothing is tuned on the held-out part.
- Each state is compared with that token's "any day" baseline over the same period.
- `nEff` and intervals are shown; no confidence from raw n.
- Ledger is append-only and idempotent (running twice adds nothing); the validator rejects an edited locked field.
- All existing suites pass; `ASSETV` and `cw-shell` bumped together.

## 3. Phase 2: Smart Money v2 (skill panel, flows, real liquidation map)

This also covers the owner's earlier requests: "changes since the last snapshot" and wallet drill-down.

### 3.1 Cohort
- Keep `profit` and `size` for one release, add `panel`, then make `panel` the default.
- `panel` is selected once a week (Monday 00:00 UTC) and stored in `data/sm/panel.json` with the selection time:
  - account value ≥ $100k;
  - positive PnL in the week, month **and** allTime windows of the leaderboard (verify window names);
  - ranked by 30-day ROI, not dollars (leaderboard `roi`, verify), capped at the 99th percentile;
  - exclude likely market makers and hedgers: 30-day volume ÷ account value above a threshold (leaderboard `vlm`, verify; choose the threshold from the distribution and document it), and vault or sub-account addresses if the API marks them (verify);
  - top 300.
- Between selections the list is frozen, so a change means members traded (fixes P5).
- **No lookahead.** Every flow and every ledger record for the panel is measured strictly after its selection time. Never backtest a panel on the period used to pick it. At each reselection the flow baseline resets; until 7 days have passed the 7-day figure is labelled "since <selection date>".
- The page states the rule and the selection date.

### 3.2 History and flows
- Each run diffs every panel wallet's positions against the previous run and stores per coin: opened, closed, increased, reduced, flipped (count and USD), long and short separately.
- Size changes are measured in coins and valued at the current mark, so a price move alone is never a flow.
- The previous run's positions are kept in the **Actions cache, not in git**. On a cache miss the run writes no flow for that interval and says so; it never estimates one.
- History in git, tracked tokens and the panel cohort only:
  - `data/sm/recent.json`: one row per coin per run for the last 7 days: `{t, coin, nL, nS, vL, vS, mark, flow:{…}}`. Cap 200 KB.
  - `data/sm/daily-YYYY.json`: one row per coin per UTC day (closing levels plus the day's summed flows). Cap 300 KB per year.
- `smart_money.json` carries 24h and 7d flow totals summed from those rows, labelled with the actual first and last snapshot times used.
- Cadence: `smart_money.yml` is already in `heartbeat.yml`. No change.

### 3.3 Real liquidation map and "who is underwater"
- In `build()`, aggregate **all** panel positions (not only the top 10 per side) per coin into 1 % price bins from −30 % to +30 % of mark, using each position's real `liquidationPx`: `liqBins:[{lo, hi, long, short}]`. Positions with no liquidation price are counted in `noLiq`.
- Per coin and side: size-weighted average entry, share of position value in loss at mark, median distance to liquidation.
- Rate limits: the builder already makes about 900 `clearinghouseState` calls per run with throttling. Check the Info API weight limit before adding panel wallets, fetch each address once across all cohorts, and back off on 429. If fewer wallets answer than expected, publish with "sample of N of M wallets"; if too few answer, keep the previous snapshot with its real age instead of failing.
- Leverage tab: when `liqBins` exists for the token, draw it as a second layer labelled "Real · Hyperliquid tracked wallets (sample of N, $X)" beside the existing estimate, which stays labelled "Estimate". Never sum the two.

### 3.4 Page layout (`smartmoney.js`)
The page is about 6,400 px tall on a phone and opens with four level KPIs. Reorder, do not redesign:
1. Headline sentence per selected token from flows: `Fixed panel, last 24h: net −$42M BTC (31 wallets added shorts, 9 closed longs).`
2. Flow table: one row per token: 24h net flow, 7d net flow, current lean vs group, sparkline of net position.
3. Who is underwater + real liquidation clusters.
4. Biggest positions (existing cards), collapsed by default, with a per-wallet drill-down: that wallet's positions and its changes since the last snapshot.
5. Live trade tape, collapsed by default.
Move the long explanatory paragraphs into the existing `?` help popovers.

Acceptance: fixture test for the diff (open, close, flip, pure price move = zero flow, cache miss = no flow), panel frozen between selections, no panel figure uses data from before its selection time, `smart_money.json` under 700 KB, validator covers the new files, `tests/smart-ui.mjs` extended.

## 4. Phase 3: Setup card (build last)

Replaces the bare Long / Wait / Avoid chip. Needs evidence lines from Phases 1, 2 and 4.

- The stored codes do not change. Only the display labels change, in `i18n.js`, EN and Thai: `Long` → "Uptrend setup", `Wait` → "Mixed", `Avoid` → "Downtrend", `Insufficient` → "Insufficient data". "Avoid" reads as advice; "Downtrend" is a fact. `judgment.json`, the weekly reports, the ledger and all tests keep the codes.
- Hysteresis: a state changes only after two consecutive closed daily bars agree. This is a change to what gets stored, so run `scripts/build_verdict_backtest.mjs` with and without it and put both results in the PR. Say in the help text and the PR description that a state can now change up to two days later than it did before Phase 1.
- Under the state, an evidence checklist. Each line is green, grey or red with its number and source tab. No summed score in v1:
  - Trend (existing rule)
  - Relative strength: token ÷ BTC 30-day return, and above or below the 50-day average of that ratio
  - Derivatives: funding percentile and OI change (Phase 4)
  - Smart Money: panel 7-day flow direction (Phase 2)
  - Pattern: best active pattern, under the pattern display rule in section 0
  - Event risk: high-impact calendar event for this token or macro within 48h (`calendar.json`)
- Each line with a ledger record shows it. A combined score may be added later only if the ledger shows the combination beats its parts out of sample.
- Mirrored levels: when the state is `Avoid`, show the mirrored plan (resistance zone, invalidation above, targets at supports). The label "Levels, not a short call" is visible on the card itself, not only in a tooltip.

## 5. Phase 4: Leverage fixes (build third)

- New builder step in `scripts/build_positioning.py`:
  - `data/lev/daily-YYYY.json`: per token and venue per UTC day: average 8h-equivalent funding and closing OI. Backfill 90 days where the venue has history (Hyperliquid `fundingHistory`, Binance and Bybit history endpoints). Cap 300 KB per year.
  - `data/lev/recent.json`: hourly OI for Hyperliquid and OKX for the last 8 days, recorded each run because they give no history. Cap 150 KB.
- Score components `fund`, `lev` and `mom` use the token's own percentile over 90 days instead of fixed bounds (fixes P6). Show "not enough history" until 30 days exist.
- 24h OI change includes Hyperliquid and OKX for the hours where recorded history exists; otherwise the UI names the venues left out of the percentage (fixes P7).
- Funding at the venue floor counts as neutral (the `floor` flag exists in `levModel` but is not used in the score).
- Split the single score into two readings: "How much leverage" (OI ÷ mcap percentile, OI build-up) and "Which side is crowded" (signed funding, basis, long/short accounts).
- Heatmap: when OI falls, remove that amount proportionally from all open bins. Rename the long/short input in the help text to "share of accounts, not of money". It stays labelled "Estimate".
- `positioning.yml` runs more often than daily: add it to `heartbeat.yml` if the hourly OI recording must not miss runs.

## 6. Phase 5 (optional): Business Pulse per token

One small card per token on the token page, built from DefiLlama's free fees, revenue and TVL endpoints in `scripts/build_onchain.py` plus data the repo already has.

| Token | Driver shown |
|---|---|
| BTC | Liquidity gauge: spot ETF net flow, 30-day stablecoin supply change, exchange net flow (`positioning.json` → `native.BTC.exflow`) |
| ETH | Exchange net flow, staking share, L2 bridge net flow (`flows.json`, `interop.json`) |
| HYPE | Daily protocol fees and buyback against scheduled unlock supply (`native.HYPE.stake` holds circulating and future supply) = net buy or sell pressure per day |
| LIT | Lighter vs Hyperliquid: perp volume and OI share, and market cap ÷ annualised fees for both |
| AAVE | Fees, revenue, borrow utilisation, market cap ÷ annualised revenue, buyback amount |
| MON | Dilution vs adoption: next unlock as % of circulating supply (`calendar.json`) against Monad TVL, stablecoin supply and bridge net flow (`onchain.json`, `flows.json`) |
| PENDLE | TVL, fees, share of supply locked (`positioning.json` → `onchain.PENDLE`) |
| SOL / NEAR | Staking share, active addresses, chain fees |

Each card: 3 numbers, each with a 30-day change and a source link. Missing data = line omitted.

## 7. Order and size

| Build order | Phase | Effort | Rough size |
|---|---|---|---|
| 1st | 1 Proof Layer | high | 1 core extraction, 2 builders, 2 workflows, 4 UI touches |
| 2nd | 2 Smart Money v2 | high | `build()` rework, panel selection, 3 data files, page reorder |
| 3rd | 4 Leverage fixes | medium | 1 builder step, `levModel` and `heatmap` edits |
| 4th | 3 Setup card | medium | labels in `i18n.js`, `planHTML`, one new render function |
| optional | 5 Business Pulse | medium | builder additions, one card |

## 8. Checklist for every phase PR

- State codes unchanged; only labels changed.
- No change to protected files; validator rejects edits to locked ledger fields.
- Effective sample sizes and intervals shown; no confidence from raw n.
- `ASSETV` and `cw-shell` bumped together; all `tests/` suites and `scripts/validate.py` pass.
- New files have a schema check and are under their size cap.
- New builders that run more often than daily are in `heartbeat.yml`.
- EN and TH, desktop and phone, light and dark screenshots attached.
- PR description states any change in verdict timing.
