# Audit: Smart Money v2, Phase 2

Audited: `smart-money-v2-p2` at `c24703c`. Audit only; nothing was pushed or edited on that branch.
Spec: `docs/architect-proof-layer.md` rev 2, sections 0 and 3, plus Phase 1 audit items F5 to F9.

## 1. Verdict

**AGREE with fixes, 8.5/10. Fix M1 and M2 before merge.**

The real builder was run twice on live Hyperliquid data in a temp folder. Run 1 wrote no flow and stated the reason. Run 2 wrote flows with 300 of 300 wallets compared. Liquidation bins + no-price + outside-range reconcile to the dollar with total positions. All 18 test suites pass (`events-lock` offline only).

## 2. Fix before merge

### M1 (Medium): the positions cache is saved before the commit
- **Where:** `.github/workflows/smart_money.yml` (step order), `scripts/sm_lib.py` `totals`.
- **Problem:** the step "Save panel positions for the next run" runs before "Commit". If the push then fails, that run's flow row is never committed, but the cache already holds its snapshot. The next run measures from the uncommitted snapshot, so one interval is lost. The 24h and 7d totals understate, and nothing shows a gap.
- **How found:** by reading the workflow. It cannot be reproduced outside GitHub.
- **Fix:**
  1. Move the cache-save step after the commit step, so it runs only when the push succeeded (or when there was nothing to commit).
  2. In `totals`, count `gaps`: runs whose `t0` is not the `t` of the previous run kept in `recent.json`. Store it in `flows.h24` and `flows.d7`.
  3. Show it on the page next to the interval label when `gaps` > 0, EN and Thai, for example "2 intervals missing".
  4. Add a test for the gap count, and let `validate.py sm` accept the new field.

### M2 (Medium): the short-bias warning is only inside a `?` popover
- **Where:** `smartmoney.js`, next to the panel name / cohort description.
- **Problem:** the page shows figures such as "1% long" while the explanation ("after a falling month that rule fills the panel with shorts") is hidden in a help popover.
- **Fix:** add one always-visible line beside the panel name, EN and Thai: "Selected by recent profit, so after a falling month it is almost all shorts. Read the changes, not the level." Keep the popover. Add a UI test that the line is visible at phone width for the panel cohort and absent for the other two cohorts.

## 3. Decision: do not change the panel rule before merge

The limit was reproduced (1.2 % long; BTC 2 longs against 138 shorts). Three alternatives were tested on live data on 2026-11-13:

| Rule | Long share | BTC longs / shorts | Wallets with no position (of 300) |
|---|---|---|---|
| As built: week + month + allTime profit, ranked by 30-day ROI | 1.2 % | 2 / 138 | 56 |
| allTime profit only, ranked by allTime ROI | 83.7 % | 15 / 4 | 235 |
| allTime profit only, ranked by allTime dollars | 17.9 % | 16 / 33 | 203 |
| month + allTime profit, ranked by allTime ROI | 12.9 % | 23 / 31 | 152 |

None is clearly better: the allTime rules mostly pick wallets that no longer trade. Changing the rule now would fit it to one snapshot. The leaderboard's four windows cannot give a regime-neutral skill panel. The durable fix needs our own data: rank wallets that keep qualifying across several different weeks. To allow that, keep each week's member list in a small history file (addresses only). This can ship with Phase 4.

## 4. Lower severity (can wait for Phase 4)

| # | Where | Note |
|---|---|---|
| L1 | `smartmoney.js` liquidation ladder | The ladder is often empty: panel wallets use low leverage, so most liquidation prices are more than 30 % away (live: BTC 34 % of value inside the range, HYPE none). When most value is outside, lead with that sentence |
| L2 | `scripts/sm_lib.py` `flow_row` | History stores thousands of dollars, so small changes show a count with $0 ("1 add, $0") |
| L3 | `scripts/build_ledger.mjs` `flowState` | A smart-money run that started before midnight can be committed after the ledger's first run of the new day, so `sm_flow` may be read from an incomplete day |
| L4 | `scripts/build_smart_money.py` | Rate limits remain unverified; the Hyperliquid docs host was blocked for the auditor too. Live: 13 rate-limit responses in run 1, all recovered (1,087 of 1,087 wallets answered); none in run 2 |
| L5 | new file | Keep each week's panel member list (see section 3) |

## 5. The ten audit items

1. **No lookahead: confirmed.** Snapshots are taken after the selection; a flow needs a previous snapshot of the same panel; `flowState` reads only same-panel days that ended before the signal time. The validator rejected a back-dated flow.
2. **Panel rule: confirmed.** An independent selection matched the documented counts. The validator rejected a swapped member, a removed member and a second selection in the same week.
3. **Diff correctness: confirmed.** Flip, dust floor, missing wallets, current-price valuation and no flow on a cache miss behave as documented.
4. **Liquidation bins and underwater: confirmed.** All positions are counted; the Leverage layer is drawn separately and never summed.
5. **Rate limiting and partial answers: confirmed in code.** The backoff worked live. The below-60 % path was not forced.
6. **Size caps and schemas: confirmed.** Live file 418 KB against the 700 KB cap. Dropping `top` is safe: the page reads the per-side lists first.
7. **F5 to F9: confirmed.** The F5 test fails without the fix and passes with it. `validate.py verdict_bt` passes on the regenerated file.
8. **Test edits: confirmed, none weakened.**
9. **Release rules: confirmed.** 55 in both places; no protected file changed; `min/` matches a fresh build for all six changed files. Thai passes the validator; a native reader should still check it.
10. **Unverified pieces: still unverified.** The documented rate limits, and the Actions cache workflow, which has never run on GitHub.

## 6. After the merge

Watch the first two smart-money runs in Actions. Run 1 should report no flow (no cached snapshot yet). Run 2 should report a flow.
