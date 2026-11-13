# Smart Money v2, Phase 2 (v55)

Implements section 3 of `docs/architect-proof-layer.md` (branch `claude/wonderful-sagan-55yt2d`, rev 2), plus the Phase 1 audit leftovers F5 to F9. Branch `smart-money-v2-p2`, from `main` at `fdf3ef3`. Not merged, no PR.

## What is where
| Part | File |
|---|---|
| Panel rule, position diff, liquidation bins, underwater, history files (pure functions, JSON CLI for tests) | `scripts/sm_lib.py` |
| Builder: weekly panel, all cohorts fetched once, flows, history, drill-down, rate limiter | `scripts/build_smart_money.py` → `smart_money.json`, `data/sm/panel.json`, `data/sm/recent.json`, `data/sm/daily-YYYY.json` |
| Previous run's panel positions (flow baseline) | Actions cache `.sm_cache/prev.json` (`actions/cache/restore` + `save` in `.github/workflows/smart_money.yml`), never in git, `.gitignore`d |
| Ledger `sm_flow` | `scripts/build_ledger.mjs` (`loadSmDaily`, `flowState`, `step`) |
| Validator | `scripts/validate.py sm [--dir --smart --base REF \| --prev-dir DIR --now ISO]`; `validate.py ledger` checks `sm_flow` state codes; `validate.py verdict_bt` / `ledger` reject an interval below the gate (F7) |
| Page | `smartmoney.js` (headline, flow table, who is underwater + real clusters, levels, biggest positions with drill-down, tape), `style.css` |
| Leverage tab real layer | `leverage.js` `levReal` (uses `smLadder` / `smRealLbl` from `smartmoney.js`) |
| Audit F5 | `verdict-core.js` `compute` (`H4N = 168`) |
| Audit F6, F9, `#/record` text | `proof.js` `prfRecordHTML`, `pRecord` |
| Audit F7 | `scripts/proof-lib.mjs` `summarize`, `scripts/build_verdict_backtest.mjs`; `verdict_backtest.json` regenerated |
| Audit F8 | `app.js` indicator panel, `i18n.js` `asOfClose` |
| Tests | `tests/smart-v2.mjs` (new, node), `tests/smart-ui.mjs` (extended), `tests/proof-ui.mjs` (F6/F8/F9), `tests/proof-layer.mjs` (F7) |
| Release | `ASSETV` 55, `cw-shell-v55`, `index.html ?v=55`, `EXPECT_ASSETV` defaults 55, `min/` rebuilt with `scripts/build_min.sh` |

## Live API checks (2026-11-13, before building on them)
- `https://stats-data.hyperliquid.xyz/Mainnet/leaderboard`: 47,938 rows. Row keys `ethAddress, accountValue, windowPerformances, prize, displayName`. Windows are exactly `day`, `week`, `month`, `allTime`; each has `pnl`, `roi` (a fraction: 0.31 = 31 %) and `vlm` (USD volume), all strings. **No vault or sub-account marker on the rows.**
- Vaults: `https://stats-data.hyperliquid.xyz/Mainnet/vaults` lists 9,478 vaults (`summary.vaultAddress`). 708 leaderboard rows are vaults; 14 to 15 of them pass the other panel filters and are excluded.
- Sub-accounts: Info API `{"type":"userRole","user":…}` returns `{"role":"user" | "vault" | "subAccount" | "agent" | "missing"}`; checked once a week for the wallets walked in rank order.
- Rate limit: the Hyperliquid docs page could not be fetched from the build session (host not reachable). The builder budgets the documented values as I know them: 1,200 weight per minute per IP; `clearinghouseState` and `metaAndAssetCtxs` weight 2, `userRole` 60, other info requests 20. It paces at 1,000 per minute and backs off on 429. Empirically, from this session's egress, 1,500 `clearinghouseState` calls plus 120 `userRole` calls in about 45 s returned no 429. That is not proof of the limit, because the proxy may use several egress IPs.
- A full live build (unique wallets across all three cohorts: 1,084; weight used 2,188 per normal run, about 20,000 on a selection run) answered 1,084 of 1,084, with no 429.

## Rules as built
**Panel (§3.1).** Selected by the first run after Monday 00:00 UTC (`needs_selection`: the stored `week` is before this week's Monday), stored in `data/sm/panel.json` with `selected` (actual run time) and `week`. Rule: account value ≥ $100k; PnL > 0 in the `week`, `month` and `allTime` windows; 30-day `vlm` ÷ account value ≤ 100; not in the vault list; `userRole` not `vault`, `subAccount` or `agent` (an unknown role is kept and counted in `stats.roleUnknown`); ranked by 30-day `roi` capped at its 99th percentile among eligible wallets, ties broken by 30-day PnL then address; top 300. The turnover threshold of 100× comes from the live distribution (n = 2,064 eligible wallets: median 2.2×, p90 49×, p95 117×, p99 566×, no natural break). It drops about the top 6 % and was fixed in advance, not fitted. `panel.json.stats` stores the distribution and the count left after each filter, so every selection can be audited. Between selections the member list is frozen; members who leave the leaderboard stay in the panel.

**Flows (§3.2).** Each run diffs every panel wallet that answered in both runs, coin by coin, in coins (`szi`): open, close, increase, reduce, flip. A flip is recorded as `flip` on the old side (size closed) plus `open` on the new side. Values are size change × the current mark, so a price move alone is zero. Changes worth less than $100 are not counted (`dust`). A wallet missing in either run is left out (`missingPrev`, `missingNow`). No flow is written, with the reason stored, when the cache misses, the cached snapshot belongs to another panel, or it is older than the selection. Snapshot time = start of the position fetch, which is always after the selection.

**History in git (§3.2).** USD values in history files are in thousands (`unit: "kUSD"`).
- `data/sm/recent.json`: one entry per run, `c: {coin: [nL, nS, vL, vS, mark, flowRow | null]}`, for 7 days. If it would pass 190 KB, the oldest runs are dropped and `trimmed`/`from` say so.
- `data/sm/daily-YYYY.json`: one row per UTC day: closing levels (last run of the day) and summed `dL`/`dS`, plus `panel`, `first`, `last`, `runs`, `flowRuns` and `flowFrom`. Adding a run is idempotent: only a run newer than the day's `last` is added. A day keeps one panel.
- `smart_money.json.flows`: `h24` and `d7` sums from `recent.json`, using only intervals that start at or after the selection, labelled `from` / `to` / `runs` and `sinceSelection`. `last` holds this run's interval, reason and counts.

**Real liquidation map and underwater (§3.3).** For each tracked coin, every panel position (not only the top 10) goes into 1 % bins from −30 % to +30 % of the Hyperliquid mark, at its real `liquidationPx` (`liq.bins: [{lo, hi, long, short}]`). Positions without a liquidation price go to `noLiq`; positions beyond ±30 % go to `outside`. `uw` per side: positions, value, size-weighted average entry, share of value in loss at mark, size-weighted median distance to liquidation, open P&L. If fewer than 60 % of panel wallets answer (or fewer than 200 for profit/size), nothing is written and the previous snapshot stays with its real age. A partial answer is shown as "sample of N of M wallets".

**Ledger `sm_flow` (task 4).** At each daily close, the state per token comes from `daily-*.json`: summed net flow over the 7 UTC days ending at the signal day. Only days of the same panel with at least one measured interval count, and every run in them ended before the signal time. The state is `net_buy` or `net_sell` when |net| > 5 % of the panel's gross position on the coin at that close, otherwise `flat`. The band was fixed in advance. The rest follows the Phase 1 rules: the first observation is a start (`from: null`), entries are written on change only, runs are idempotent, `px` is the daily close, and grading and summary are as for verdicts.

**Page (§3.4).** Order: headline per token from flows (for All tracked: the 4 largest |net|) → flow table (24h net, 7d or "since selection" net, lean vs group, net-position sparkline from `recent.json`) → who is underwater + real liquidation ladder → levels (the old KPIs, market strip and table) → biggest positions (collapsed by default; panel cards have a drill-down with all the wallet's positions and its changes since the last snapshot) → live tape (collapsed by default). Open/closed state is remembered per device. Long notes moved into `?` popovers. The panel is the default (new storage key `kms-sm-coh2`); profit and size stay selectable. A snapshot without a panel falls back to profit and says so. The Leverage tab draws the real ladder in its own box, labelled "Real · Hyperliquid tracked wallets (sample of N, $X)", under the estimate, which keeps its "Estimate" tag. The two are never summed.

**Size.** The old mixed `top` list (kept for v50 clients) is no longer stored; it took 224 KB. Live `smart_money.json` with the panel: 428 KB (cap 700 KB). `recent.json` ≈ 1 KB per run (≈ 170 KB at 24 runs a day). `daily-YYYY.json` ≈ 0.5 KB per day (≈ 190 KB a year for 9 tokens).

## Audit leftovers
- **F5:** after the 4h candles are filtered to those closed by the daily close, `compute` keeps the newest 168 (`H4N`). The app and ledger fetch 180 and at most 6 are dropped, so the window and entry zone are fixed for the whole UTC day. `tests/smart-v2.mjs` plants a 4h swing low at the edge of the moving window; it fails without the fix and passes with it.
- **F6:** the record line shows "backtest on Binance BTCUSDT" when the backtest venue differs from the card's venue.
- **F7:** `ci` and `ciPos` (and the TP1 / R intervals) are `null` when nEff < 20; the validator rejects anything else. `verdict_backtest.json` was regenerated with live candles.
- **F8:** the indicator panel reads "as of the last daily close · Binance".
- **F9:** the under-gate line reads "This state on ETH: 12 independent cases from 300 days: not enough to show a rate".
- "every 3 hours" → "about hourly": `#/record` (EN/TH) and the `ledger.yml` header. The 3-hourly cron stays as the backup schedule; `heartbeat.yml` dispatches the ledger every hour.

## Changes to existing tests (none weakened)
- `tests/proof-layer.mjs`: the old check "interval holds the median" ran at nEff 7. F7 makes that interval `null`, so the test now asserts `ci`/`ciPos` are `null` at nEff 7. The containment check (median and share inside their intervals) moved to a case with nEff ≥ 20.
- `tests/proof-ui.mjs`: the under-gate assertion follows the F9 wording and also checks that no rate is shown on that line. New checks were added for F6 (venue shown only when it differs) and F8 (indicator label).
- `tests/smart-ui.mjs`: Biggest positions is now collapsed by default, so the page helper opens it the way a reader would (clicking its summary) before the unchanged checks run. 45 v55 checks were added.
- `EXPECT_ASSETV` defaults 54 → 55 in `tests/proof-ui.mjs`, `tests/smart-ui.mjs` and `tests/v47-ui.mjs`.

## Known limits
- **The panel rule selects almost only shorts after a falling month.** Live selection on 2026-11-13: panel long share across all coins 1.1 %; BTC 2 longs vs 139 shorts. Positive PnL in the week **and** the month rewards whoever held the winning side, and ranking by ROI instead of dollars does not change that. The page says so. Flows (changes) are the informative part; levels and "lean vs group" mostly repeat the past month. Changing the rule (for example, dropping the week window or balancing sides) is a product decision, not taken here.
- The Info API weight limits come from the docs as I recall them; the docs page was unreachable from this session. The pacing budget is configurable (`SM_WEIGHT_PER_MIN`).
- A selection run adds about 20 minutes of paced `userRole` calls; the workflow timeout was raised to 45 min.
- Flows between two snapshots miss round trips inside the interval (opened and closed in between). Long gaps between GitHub runs make intervals long; each interval is labelled with its real start and end.
- Counts in the headline are per wallet per snapshot, not distinct wallets over 24h; the help text says so.
- Until the first Monday after merge, the panel is the one selected by the first run (its `week` is that week's Monday). The first run after merge has no cache, so it writes no flow. Flows start from the second run.
- `sm_flow` ledger entries begin only after a full UTC day with measured flows exists in `daily-*.json`.
- The Leverage real layer covers Hyperliquid panel wallets only, a small sample of one venue.
- `tests/events-lock.mjs` (untouched by this branch) fails its live GitHub step, here and on `main`. The step reads only the newest 100 pushes from the activity API, and the 2026-11-09 push it looks for has dropped off that page because the data bots push often. Node's `fetch` also needs `NODE_USE_ENV_PROXY=1` behind this session's proxy. With `NET=0` the suite passes.
- Not checked here: screenshots for the PR (EN/TH, desktop/phone, light/dark) were taken locally for review only; no PR was opened, as instructed.
