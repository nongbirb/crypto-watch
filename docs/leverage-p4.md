# Leverage fixes, Phase 4 (v56)

Implements section 5 of `docs/architect-proof-layer.md` (branch `claude/wonderful-sagan-55yt2d`, rev 2), audit items L1–L5 from `docs/audits/phase2-audit.md` §4, and the `funding_regime` / `oi_regime` ledger kinds. Branch `leverage-p4` from `main` at `9403c41` (the Phase 2 merge). Not merged, no PR.

## What is where
| Part | File |
|---|---|
| History builder (called at the end of `build_positioning.py`; a failure never blocks `positioning.json`) | `scripts/lev_hist.py` → `data/lev/daily-YYYY.json` (cap 300 KB), `data/lev/recent.json` (cap 150 KB) |
| Shared math: own-history percentiles, regimes (UMD: browser `LEVC`, node `require`) | `lev-core.js` |
| Leverage tab | `leverage.js` (`levHist`, `recOi`, `aggOi`, `recOi24`, `levModel`, `heatmap`, `renderLev`) |
| Ledger kinds `funding_regime`, `oi_regime` | `scripts/build_ledger.mjs` (`loadLev`, `levState`, `step`) |
| Validator | `scripts/validate.py lev [--dir --base REF \| --prev-dir DIR --now ISO]`; `ledger` checks the new state codes; `sm` checks `panels-YYYY.json` |
| Workflows | `positioning.yml` validates and commits `data/lev`; `heartbeat.yml` now also dispatches `positioning.yml` about hourly |
| Release | `ASSETV` 56, `cw-shell-v56`, `index.html ?v=56`, `lev-core.js` in `index.html`, `sw.js` and `build_min.sh`, `min/` rebuilt |
| Tests | `tests/leverage-p4.mjs` (node), `tests/leverage-ui.mjs` (Chromium); fixtures `tests/fixtures/lev/` (real history built on 2026-11-13) |

## Venues with stored history (checked live, 2026-11-13)
- **OKX:** settled funding history (`public/funding-rate-history`, 100 per page, paged to 90 days). Open interest history comes from `rubik/stat/contracts/open-interest-history`: `period=1D` gives 100 days (each reading stamped 16:00 UTC, OKX's day start), `period=1H` gives 100 hours. Rows are `[ts, oi, oiCcy, oiUsd]`. That endpoint is CORS-blocked in browsers but works server-side.
- **Hyperliquid:** `fundingHistory` (hourly, 500 per page, paged to 90 days). It has no open-interest history, so OI is recorded each run from `metaAndAssetCtxs`.
- **Binance USD-M and Bybit:** not stored. From the build session, Bybit answers 403 ("CloudFront … block access from your country"), and `fapi.binance.com` is geo-blocked for US addresses; GitHub runners are in the US. The browser still fetches both live, but they are not part of any rank.
- **CoinGecko** `market_chart?days=90&interval=daily`: daily close price and market cap, fetched only when yesterday's close is missing.

## Rules as built
- **Daily file:** `days[YYYY-MM-DD][SYM] = [px, mc_MUSD, okx, hyperliquid]`, with venue = `[f, fx, n, oi_kUSD, oiHourUtc]`.
  - `f` is the mean 8h-equivalent settled funding in ppm (100 = 0.01 % per 8h), from `rate × 8 / interval`, with the interval taken from the gap between settlements.
  - `fx` is the same mean with every settlement at the floor (0.01 % per 8h, the default on OKX and Hyperliquid) counted as 0.
  - `n` is the number of settlements. Funding is replaced only by a value with at least as many settlements. OI is replaced only by a later reading of the same UTC day. A stored close is never revised.
  - `final[day]` is set once a run after that day's end has refreshed it, and the validator rejects any later change to a final day.
  - The first run backfills 90 days per token and venue (about 2 minutes); later runs fetch the last 3 days (about 15 s).
  - Live size is about 670 bytes per day, roughly 245 KB a year for 9 tokens.
- **Recent file:** `hours[YYYY-MM-DDTHH][SYM] = [okx_kUSD, hyperliquid_kUSD]` for 8 days. OKX comes from its hourly history; Hyperliquid is stamped with the UTC hour that contains the reading.
- **Score components (P6):** `fund`, `lev` and `mom` are the token's percentile against its own last 90 closed days (ties count half). Under 30 days the bar is empty and the reading says "not enough history (N of 30 days)".
  - `fund` = |excess funding|, OI-weighted across OKX and Hyperliquid. Live, it is the last 24h of settlements with the floor counted as 0.
  - `lev` = summed OI ÷ market cap.
  - `mom` = daily OI change − 0.5 × |price change|. Live, OI change comes from the recorded hourly OI.
  - OI ranks use only venues with OI on at least 30 of the window days. Hyperliquid joins about 30 days after merge; until then the note under the readings names the venues used.
  - `crowd` (long/short accounts) and `basis` keep their fixed bounds: there is no history for them.
- **Floor:** a settlement at the venue floor counts as neutral (0) in both history and live funding.
- **Two readings, never summed:**
  - "How much leverage" = mean of the `lev` and `mom` percentiles, with the existing High / Elevated / Low bands at 60 / 35.
  - "Which side is crowded" = mean of the available signed inputs: 2 × (signed funding percentile − 50), signed long/short accounts, signed basis. Above +20 is "Longs crowded", below −20 "Shorts crowded", otherwise "Balanced".
  - The old single "Leverage risk /100" is gone.
- **24h OI (P7):** OKX and Hyperliquid join the aggregate when their recorded history has a reading within 2 h of both the newest hour and 24 h earlier. Venues still added flat are named ("% excludes Hyperliquid (no history for these hours)"); recorded ones are labelled as such. When no venue has browser-side history, the recorded hours themselves form the timeline. "7d" is now shown only over a real 7-day span; before, it used the oldest point once there were more than 100 hours.
- **Heatmap (P8):** an hourly OI decrease removes the same share from every open bin (total open notional × (1 + ΔOI / open)). The input is labelled "share of accounts, not of money", and the map stays labelled "Estimate".
- **Ledger:** at each daily close, for the closed day that ends at the signal time, ranked against the 90 closed days before it (never that day itself or later):
  - `funding_regime` is `high` / `low` / `normal` when excess funding is in the top 10 % / bottom 10 % / between.
  - `oi_regime` is `building` / `unwinding` / `normal` on the daily OI build-up.
  - It needs 30 prior days and a day marked final. The rest follows the Phase 1 rules: first observation `from: null`, changes only, idempotent.

## Audit L1–L5
- **L1:** when most of a coin's panel position value liquidates beyond ±30 % or reports no price, the ladder now leads with that sentence (BTC live: "66% of this position value …; the clusters below cover only 34%").
- **L2:** `recent.json` stores flow amounts in whole USD (format v2). A v1 file is migrated (amounts × 1000), not dropped. Levels and the daily file stay in thousands.
- **L3:** `sm_flow` reads a day only once the daily file holds a run of a later day. `smart_money.yml` runs one at a time, so every run of that day was committed before.
- **L4:** each run stores `smart_money.json.fetch` = wallets, answered, retried, HTTP 429 count, weight used, budget and seconds, so the real rate-limit behaviour shows on GitHub. The documented limits themselves remain unverified (docs host blocked).
- **L5:** `data/sm/panels-YYYY.json` keeps every weekly member list: the year's first week in full, later weeks as add / drop. It is append-only and idempotent; the validator rebuilds it, checks member counts and the match with `panel.json`, and rejects edited weeks. Cap 400 KB per year.

## Verified after the Phase 2 merge
- **Run 1** (`smart money data` #67 on `9403c41`): about 19 minutes including the panel selection. It wrote no flow, with reason "no previous snapshot (Actions cache miss)"; 300 of 300 answered. The cache was saved after the commit step.
- **Run 2** (#68): flow ok, 300 compared, `h24.runs` 1, `gaps` 0, so no "intervals missing" label. BTC net showed as +$1,000; that is the kUSD rounding that L2 fixes on this branch.

## Known limits
- Ranks cover OKX and Hyperliquid only. Binance and Bybit (usually the largest venues) have no stored history, so a rank can differ from what a Binance-only view would suggest. The note under the readings says this.
- Backfilled OKX OI is OKX's daily reading stamped 16:00 UTC; days recorded since are the last hourly reading of the UTC day. Each value stores its hour.
- Hyperliquid OI history starts at merge; its OI joins the ranks after 30 recorded days and the 24h change after 24 recorded hours.
- `mom` live uses the recorded hourly 24h change; history uses close-to-close daily changes. They are the same quantity, measured a few hours apart.
- The regime bands (10 %) and the side band (±20) were fixed in advance, not fitted.
- The verdict state codes and Phase 3 are untouched.
