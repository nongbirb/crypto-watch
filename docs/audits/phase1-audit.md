# Audit: Proof Layer Phase 1

Audited: `proof-layer-p1` at `3984c77` (2 commits on `main` at `9ecf64e`). Audit only; nothing was pushed or edited on the branch.
Spec: `docs/architect-proof-layer.md` rev 2, sections 0 and 2.

## 1. Verdict

**AGREE with fixes, 8/10.**

The statistics, the no-lookahead walk, the closed-candle rule and the ledger mechanics are correct, and I reproduced the committed numbers exactly. Four medium findings remain. None is in the maths; they are in what the user sees and in what the validator lets through.

## 2. Findings

| # | Severity | Where | What is wrong | How I reproduced it | Fix |
|---|---|---|---|---|---|
| F1 | Medium | `patterns.js` `pTypeRec` | The pattern rule reads one timeframe only. Almost no type reaches 30 cases in a single timeframe, so known-bad types will show "not enough cases" instead of being greyed. Problem P9 stays unfixed in practice | Counted raw n ≥ 30 in `patterns_backtest.json`: 1h 1 type, 4h 5, 1d 2, 1w 0; only `cup` is under 35 %. Pooled `types.any`: 15 types, 9 under 35 % (the ones the brief lists). `nEff` is never above n, so the real counts are lower still | Use the timeframe's record when its `nEff` ≥ 30; otherwise fall back to `types.any` and label it "all timeframes" |
| F2 | Medium | `proof.js` `pRecord`, `style.css` | On a phone the `#/record` tables put the result columns (+7d median, any day, held-out) off-screen; you must scroll sideways inside the table. The test only checks that the page itself does not scroll | Screenshot `v54-phone-en-light-record.png` from `tests/proof-ui.mjs`: the visible columns end at "Days" | Stack each row as a card at phone width, as Smart Money v51 did, and make the test assert the +7d cell is inside the viewport |
| F3 | Medium | `scripts/validate.py` (`ledger`) | The validator accepts a forged `proof`, a grade filled before it is due, an entry dated in the future, and unknown extra fields. It also runs only inside `ledger.yml`, so a hand-made commit to `data/ledger/` is never checked | Built 16 tampered ledgers against a previous copy. Edited, removed, reordered, inserted, duplicated, wrong-code, oversized and deleted-month cases were all rejected. `fake_proof`, `extra_field` and `future_append` (t = Nov 29) passed | Reject `t` later than now; reject `r_h` unless `t` + h days ≤ now; allow only known keys; require `proof` to have `commit`, `pushed_at`, `ref` with `pushed_at` ≥ `t`. Run `validate.py ledger --base origin/main` in `build.yml` on every push |
| F4 | Medium | `scripts/build_ledger.mjs` `buildSummary`, `proof.js` `cell` | Pattern rows are graded by raw price change and coloured green when price rose, whatever the pattern's direction. A bearish pattern that worked shows red | Read the code: `r_h` is `close ÷ px − 1` for every kind, and `cell` colours by the sign of the median. `ctx.dir` is stored but unused | In the summary, multiply pattern returns by `ctx.dir` and label the column "in the pattern's direction". Also add `tf: '1d'` to pattern `ctx` before the first entries are locked: the ledger records daily patterns only |
| F5 | Low | `verdict-core.js` `compute` (4h refinement) | The entry zone can still move within one day, because the app takes "the latest 180 4h bars" and that window slides as the day goes on | BTC, last 129 days, 4h data fetched at 01:00 and 23:00 UTC of the same day: zone differed on 2 days, state on 0 | After filtering to bars closed by the daily close, keep a fixed count (fetch 186, keep the last 174) |
| F6 | Low | `scripts/build_verdict_backtest.mjs` `history` | The backtest picks the venue with the longest history; the app and the ledger pick the first fresh venue. For HYPE the backtest uses the Hyperliquid perp (1.94 years) while the app uses Binance spot, which today gives `Insufficient` | Ledger dry run printed `HYPE binance:HYPEUSDT state Insufficient`; `verdict_backtest.json` says `Hyperliquid HYPE` | Show the backtest venue next to the record line when it differs from the card's venue. (Whether HYPE should read Hyperliquid first is a `tokens.json` decision outside Phase 1) |
| F7 | Low | `scripts/proof-lib.mjs` `blockBoot` | For very small groups the interval is meaningless but still stored: HYPE Long n=2 gives [5.27, 5.27]; AAVE Long nEff=8 gives [−6.44, −3.15] | Read `verdict_backtest.json`. The UI hides these behind the nEff ≥ 20 gate, so nothing wrong is displayed | Store `ci: null` when `nEff` < 20 |
| F8 | Low | `app.js` indicator panel | RSI, MACD and the averages are now last-close values beside a live price. Only the help popover says so | Read `compute` wrapper and `planHTML` | Add "as of the last daily close" to the indicator panel heading |
| F9 | Low | `proof.js` `prfRecordHTML` | The under-gate line reads "not enough samples (n=18) independent cases of 43 days" | Read the string | "18 independent cases from 43 days: not enough to show a rate" |

Not defects, but the owner should know:
- **What the backtest says.** The rule shows no edge. Pooled over all tokens, +7d median is −0.1 % for `Long`, 0.0 % for `Wait`, −0.3 % for `Avoid`; the intervals all include zero. `Long` is rare: BTC 43 days in 9.2 years, AAVE 14, SOL 22. `Avoid` on BTC (+0.37 %) equals any day (+0.38 %).
- **`tests/events-lock.mjs` live step.** It failed here with `acts.map is not a function` (GitHub's API did not return a list through this sandbox), not for the reason the builder gave. I could not confirm the builder's explanation. The test file, `events-core.js`, `scripts/build_events.mjs` and `data/events/` are byte-identical to `main`, and the offline run (`NET=0`) passes.
- **Bybit** refused requests here too (HTTP 403), so MON and LIT were backtested on OKX. Numbers for those two may change when the workflow runs in Actions.

## 3. Items 1 to 10

1. **Moved unchanged: confirmed.** Diffed every function against `git show 9ecf64e:app.js`. Only `compute` differs, and only by the `closedOnly` block, `h4` as a local, and the extra `plan` fields. `app.js` keeps no second copy; it wraps `VC.compute` with `closedOnly: true`.
2. **Closed candles: confirmed, with F5.** Halving the open candle's close and low changed nothing except `plan.price` and `plan.inZone`. The `tick()` guard skips a candle whose close time has passed.
3. **No lookahead: confirmed.** Tripled every BTC bar after index 1500: all states up to 1500 were identical, later ones changed. Window is 299 bars. The fixture test does change bar t+1 onward.
4. **Statistics: confirmed, with F7.** Recomputed BTC with my own loop: days, n, `nEff`, +7d median and baseline all match the file (Long 43 / 43 / 18 / +0.82; Wait 2077 / 2070 / 324 / +0.34; Avoid 1055 / 1055 / 175 / +0.37; any day +0.38, n 3168). A full rebuild matched the committed file for all nine tokens, so the bootstrap is deterministic. Every gate in `proof.js` reads `nEff`. Baseline is the same token over the same days.
5. **Split: confirmed.** 70 / 30 by time; a train case needs its forward window to end before the cut. The rule has no parameter, so nothing is tuned.
6. **TP1 before stop: confirmed.** Entry is the signal close, the stop is tested first in each bar, timeout at 90 bars marked to that close.
7. **Ledger: confirmed, with F3 and F4.** Ran the builder twice on live data into a temp folder: 13 entries, second run added nothing, files byte-identical. `t` never decreases, first observations have `from: null` and are left out of the summary, the lock proof calls `events-core.js` `proveLock`. Validator holes are in F3.
8. **Pattern rule: not confirmed.** Built as specified per timeframe, but it does not do its job (F1). My answer is pooled fallback.
9. **Section 0: confirmed, except phone tables (F2).** Protected paths untouched; state codes unchanged; `ASSETV` 54 = `cw-shell-v54` = test default; `min/` files for `verdict-core`, `proof`, `app` and `patterns` are byte-identical to a fresh terser build; caps exist for all new files; `ledger.yml` is in the heartbeat list; bot email used; EN and TH present and `validate.py thai` passes; times use the viewer's locale. I am not a native Thai reader: the Thai keeps English trading terms as the style guide asks, but a Thai speaker should read it once.
10. **Test changes: confirmed, none weakened.** `tests/verdict.mjs` now loads `verdict-core.js` and still runs the same assertions through the app wrapper. The `v47-ui` default moved from 47 to 54, which fixes a stale default.

Suites run here: 16 of 17 pass (`proof-layer`, `proof-ui`, `verdict`, `events`, `events-gate`, `events-ui`, `events-v53`, `weekly`, `weekly-ui`, `heartbeat-rounds`, `narrative-freshness`, `release` on Chromium only, `smart-ui`, `v47-ui`, `p1-ui`, `eth-token`). `events-lock` passes offline and fails on its live step, as described above. `validate.py`: `smart`, `thai`, `ledger`, `verdict_bt` pass; `screener`, `news`, `onchain`, `flows` fail only on data age, and those files are unchanged from `main`.

## 4. Open decisions

- **Pattern rule: per timeframe with pooled fallback.** Use the timeframe when it has `nEff` ≥ 30, else `types.any`, labelled.
- **Ledger cadence: keep hourly.** A run appends only on a state change and rewrites the summary only when its content changes, so extra runs cost no repo growth, and states only change at the daily close anyway. Change the wording in the workflow comment and the `#/record` page from "every 3 hours" to "about hourly".

## 5. Ready to merge?

**Not yet.** Fix F1 to F4 in one more commit, then re-audit that diff only. F3 and the `tf` part of F4 should land before the ledger's first real run, because entries are locked from the moment they are written. F5 to F9 can go in the same commit or wait for Phase 2.

This is the auditor's view. The owner's "merge" is a separate decision.
