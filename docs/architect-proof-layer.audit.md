# Audit feedback: architect-proof-layer.md

Reviewer: Audit Grok (auditor). Reviewed commit `9f9933c` on `claude/wonderful-sagan-55yt2d`, 2026-11-13 JST.
Verdict: **AGREE with fixes, 7/10.** The plan is sound and its evidence holds up. It needs the changes below written into the brief before any coding starts.

## 1. Evidence check (against `main` at `08cc6e8`)

| Claim | Result |
|---|---|
| P1/P3: Long / Wait / Avoid rule (`app.js` `compute`) is untested; Avoid = price < MA50 and not > MA200 | Confirmed |
| P2: verdict uses the still-open daily candle | Confirmed (by crypto research: the fetchers never drop the last candle and Binance returns the open day as the last one) |
| P4: Smart Money cohort = top N by 30-day dollar PnL, account value floor | Confirmed (`scripts/build_smart_money.py`) |
| P6: fixed leverage-score bounds for all tokens (funding APR 5 to 40, OI ÷ mcap 1 to 10 %) | Confirmed (`leverage.js` `comp`) |
| P7: venues without OI history added flat | Confirmed (`aggOi`) |
| P8: heatmap never removes notional when OI falls | Confirmed (`if (d <= 0) continue`) |
| P9: ascending triangle 11.4 % n=70, bear flag 17.9 % n=56, bull flag 21.1 % n=38 | Confirmed in `patterns_backtest.json` → `types.any` |
| P9: cup 15 % on 1d (n=46) | Not checked (per-timeframe split) |

Line numbers in the brief drift a little from current `main`. Use function names, not line numbers.

## 2. Required fixes, by severity

### High
1. **Overlapping samples in the verdict backtest (Phase 1.2).** Forward returns at +7d and +30d taken from every daily bar overlap almost completely, so n overstates the real sample size by up to 7× and 30×. Required:
   - report an effective sample size: non-overlapping windows (one case per horizon length), or block-bootstrap confidence intervals;
   - apply the "minimum n = 20" rule to the effective n, not the raw count;
   - show per token how many years of history exist; newer tokens (MON, HYPE, LIT) will have too few cases and must say so.
2. **House rules missing from section 0.** Add them verbatim:
   - Never modify `data/events/`, `data/events/inputs/`, `reports/`, `narrative.json` or `judgment.json` except through their own update jobs. Locked fields and lock proofs must stay valid.
   - Regular merge commits only. No squash, no rebase, no force-push, no history rewrite.
   - Every UI release bumps `ASSETV` and the `cw-shell` cache version together and passes all existing test suites, not only the ones named in the brief.
   - Nothing merges without the auditor's review of the exact head commit and the owner typing "merge".
   - Bot commits use `41898282+github-actions[bot]@users.noreply.github.com`.
3. **Keep stored state codes (from crypto research).** Phase 3 renames Long / Wait / Avoid. Rename display labels only; `judgment.json`, the weekly archive, `tests/verdict.mjs` and the ledger keep the existing codes, or the track record breaks.

### Medium
4. **Pattern greying rule up front.** Phase 3 already has the rule (hit rate < 35 % at n ≥ 30 shown greyed). State it in Phase 1 too, so the UI applies it from the start. It also covers types the problem table missed: descending triangle 13.0 % (n=77), cup 12.4 % (n=105), head-and-shoulders bottom 23.6 % (n=72). Bear pennant (0 %, n=20) falls under "not enough cases".
5. **Repo growth.** `data/sm/history.json`, `last_positions.json` and the ledger are rewritten every run, and each commit stores a new copy. Set a size budget per file, split by month, and check repo size in the validator.
6. **Scheduling.** New jobs (ledger every 3h, panel weekly) must be started by `heartbeat.yml` too, because GitHub skips many scheduled runs.
7. **Hyperliquid limits (from crypto research).** Phase 3.3 fetches positions for all 300 panel wallets each run. Check the rate limits first and add backoff; a partial fetch must be labelled partial, never shown as complete.

### Low
8. **Lookahead in the panel.** Selecting wallets by past PnL is fine only if every flow and record shown is measured after the selection date. Say this explicitly, and never backtest the panel on the period used to pick it.
9. **Mirrored Downtrend plan.** Keep the "levels, not a short call" label visible on the card, not only in a tooltip.
10. **Verdict timing.** Closed candles plus two-day hysteresis means a state changes up to a day later than today. Note this in the UI help and the daily brief.

## 3. Statistics checklist for the Phase 1 PR (what the audit will test)

- No-lookahead: indicators at bar t use only bars ≤ t; a fixture test changes bar t+1 and the state at t must not change.
- The 70/30 split is by time, and the rule is not tuned on the 30 % part.
- Each state is compared with that token's "any day" baseline over the same period.
- Effective n and confidence intervals are shown; anything below the minimum shows "not enough samples (n=…)".
- Ledger: append-only, idempotent (running twice adds nothing), locked fields `t`, `px`, `from`, `to` never edited (validator compares with the previous commit), lock time provable from the push timestamp, as with Events.

## 4. Suggested order

Phase 1, then Phase 2, then Phase 4, then Phase 3; Phase 5 optional. One phase per branch and PR, each audited at its exact head before "merge".

Bottom line: the author is capable for this work. Hand it to the coding model once sections 2.1 to 2.3 are written into the brief. What would change my view: Phase 1 output that reports raw overlapping n as its sample size, or any change to locked files.
