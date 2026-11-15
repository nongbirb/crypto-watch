# Audit: Setup card, Phase 3

Audited: `setup-card-p3` at `56b6a16` (base `cadb487`). Audit only; nothing was pushed or edited on that branch.
Spec: `docs/architect-proof-layer.md` rev 2, sections 0 and 4; `docs/audits/phase4-audit.md` section 3; `docs/setup-card-p3.md`.

## 1. Verdict

**AGREE, 9/10 on the build. One owner decision (D1) must be taken before merge, and one small fix (M1) should go with it.**

Everything asked for is built as specified, the doc's numbers reproduce exactly, and all 22 suites pass. The open point is not a defect: the backtest that section 4 required shows that hysteresis makes the `Long` state worse.

## 2. Decide before merge

### D1: ship hysteresis or not. Auditor's recommendation: do not ship it
- **Evidence (reproduced: both runs rebuilt here, every cell in the doc's tables matches).** Pooled over all tokens, +7d after `Long`:
  - without hysteresis: 193 days, 63 independent, median −0.16 % (−1.79 to +1.94);
  - with hysteresis: 133 days, 39 independent, median −2.08 % (−4.17 to +0.07).
  - +1d: +0.27 % → −0.47 %. +30d: −4.36 % → −10.91 %.
  - `Wait` and `Avoid` are unchanged (+0.01 → +0.02 %, −0.26 → −0.22 %).
- **What hysteresis buys:** state changes fall from 812 to 440 over about 14,000 token-days. Without it a token already changes state only about once every 17 days, because Phase 1's closed-candle rule removed the intraday flicker that hysteresis was meant to cure.
- **What it costs:** every change arrives a day later, `Long` becomes rarer and its record worse.
- **Why now:** after the merge the ledger stores the held state in locked entries. Switching rules later would mix two rules in one record.
- **Recommendation:** keep the Phase 1 rule (the state of the last closed bar). Keep `holdAt` and the `--raw` / held comparison in the code and the doc as the record of why. I wrote the hysteresis requirement into the brief; the test it asked for says it should not ship.
- **If the owner agrees, the change is:**
  1. `verdict-core.js` `computeHeld`: `plan.bias` = the raw state; no `pending`. Leave `holdAt` and `holdSeries` exported.
  2. `scripts/build_verdict_backtest.mjs`: raw is the default, `--held` gives the comparison; rebuild `verdict_backtest.json`.
  3. `scripts/build_ledger.mjs` `observe`: stores the raw state (as on `main` today), so no entry changes at merge.
  4. `setup.js`, `proof.js`, `i18n.js`: drop the "next daily close agrees" line and the "two days later" wording; timing text goes back to "up to a day later".
  5. Tests follow; the hysteresis tests stay as tests of `holdAt`.
- **If the owner prefers stability,** merge as built. The asymmetric variant in the doc (hold only `Wait` ↔ `Avoid`) is untested and should not be adopted without its own backtest.

### M1 (Medium): the mirrored card still carries long-plan numbers
- **Where:** `app.js` `biasWhy` / `biasWhyL`, `setup-core.js` `mirror`, `setup.js` `suMirrorRows`.
- **Problem:** with mirrored levels shown, the reason sentence still says "TP1 pays 28.64× the risk", which is the hidden long plan's figure. The mirrored targets show R multiples measured from a resistance zone that can be far above price (screenshot `v57-setup-390-en-light.png`: zone +80.8 %, "Target 1 28.6R").
- **Fix:** in the mirrored case drop the "TP1 pays …" clause, and show the R multiple on a target only when price is inside the zone or within 1 ATR below it; otherwise show the distance only.

## 3. Lower severity

| # | Where | Note |
|---|---|---|
| L1 | `verdict-core.js` `computeHeld` | For bars more than one day back, fewer 4h bars are available than were used live that day, and the app's daily window is shorter. In theory a recomputed earlier state could differ. Not observed: 0 differences in 1,100 token-days (see item 1). Moot if D1 removes hysteresis |
| L2 | `setup.js` event line | An all-day calendar event keeps its JST date as the viewer's local day, so the 48-hour window can be off by up to a day for such events. Timed events are converted correctly |
| L3 | `setup-core.js` `event` | "No event in 48 h" is green. It is absence of a risk, not positive evidence; grey would be more honest |

## 4. The seven audit items

1. **Hysteresis: confirmed.** `holdAt` is the single rule; the app, the ledger and the backtest call it. No lookahead: each earlier bar is evaluated on bars up to itself. `Insufficient` starts and ends at once. Tested on real Binance candles (BTC, ETH, SOL, NEAR, AAVE; 220 days each, 76 raw flips): the app-style call, the ledger-style call and a day-by-day replay gave the same state on every day.
2. **Backtests: confirmed.** Both runs rebuilt; all per-token and pooled figures match the doc and the committed `verdict_backtest.json`. The conclusion that `Long` gets worse is correct.
3. **Evidence lines: confirmed.** Bands 10 % / ±5 % / 48 h / 50 % coverage / 30 days are constants in one place. Grey on low coverage, under 30 days, under 50 shared days with BTC, weak or thin pattern records. The pattern line uses `pTypeRec(type, '1d')` with the pooled fallback. Timed events are in local time. Ledger rows use the token's row, else pooled, behind the nEff ≥ 20 gate.
4. **Mirrored levels: confirmed, with M1.** Zone `[max(close, r1 − ATR/4), r1]`, invalidation zone top + 1 ATR, targets at supports then 1R steps. "Levels, not a short call" is printed on the card and under the chart; the chart draws the same lines.
5. **Stored codes and protected files: confirmed.** Only `i18n.js` labels changed; no protected file changed.
6. **L1 to L4: confirmed.** Plain-mean funding, `oiDays` / `oiFrom`, and the heatmap wick fix are as described and covered by `leverage-p4` (16 groups). L4: the three tests keep the same checks. I broke the code under two of them: removing the priced-in chip fails `events-v53`; breaking the overdue notice fails `p1-ui`. `events-ui` was not mutation-tested.
7. **Release: confirmed.** 57 in both places; `setup-core.js` and `setup.js` in `index.html`, `sw.js` and `build_min.sh`; all nine changed `min/` files match a fresh build; EN and Thai present, `validate.py thai` passes; phone screenshots show no sideways scroll. A native Thai reader should still read the new labels.

Suites: 22 of 22 pass here (`events-lock` offline only). Validators `thai`, `ledger`, `verdict_bt`, `sm`, `lev` pass.

## 5. Re-audit of the fix commit `9621bd1` (diff `56b6a16..9621bd1`)

**Verdict: AGREE, 9.5/10. D1 (owner chose not to ship hysteresis) and M1 are done. From the auditor's side this head is ready for the owner's "merge".**

### D1, the five steps
1. **`computeHeld`: confirmed.** `plan.bias` is the last closed bar's state. There is no `pending`, `raw` or `held` field; `heldState` and `heldSince` are the only trace. `holdAt` and `holdSeries` are still exported.
2. **Backtest: confirmed.** The shipped rule is the default; `--held` gives the comparison. Both were rebuilt here. The committed `verdict_backtest.json` has `method.hysteresis` starting "off" and is identical to a fresh default run apart from the `updated` time (last closed bar 2026-11-14). Pooled +7d after `Long`: default 194 / 63 / −0.21 %, held 134 / 39 / −2.17 %.
3. **Ledger and app: confirmed.** `git diff cadb487 -- scripts/build_ledger.mjs` is empty, and `app.js` `compute` is the same line as on `main`. No ledger entry changes at merge.
4. **Wording: confirmed.** No "next daily close agrees" and no two-day wording in `setup.js`, `proof.js` or `i18n.js`, EN or Thai. Timing reads "up to a day later".
5. **Tests: confirmed.** They check the shipped rule; the hysteresis tests remain as tests of `holdAt` / `computeHeld` only. The removed assertions were the ones for the unshipped behaviour.

### M1: fixed and guarded
- The mirrored card's reason no longer quotes the long plan's TP1. Targets show an R multiple only when price is inside the zone or within 1 ATR below it.
- `tests/setup-ui.mjs` checks inside the zone, 0.5 ATR below (R shown) and 1.5 ATR below (distance only).
- I reverted each half in a scratch copy: with R always shown the suite fails, and with the TP1 clause restored it fails.

### Extra change: `data-lvest`
`tests/smart-ui.mjs` now reads the heatmap's own "Estimate" label through `data-lvest` instead of the first `.tagest` on the tab. The assertion on the label text is unchanged; only the selector is more exact. Not weaker.

### Also confirmed
- Stored codes unchanged; no protected file touched.
- All six changed `min/` files match a fresh build; version 57 in both places.
- 22 of 22 suites pass (`events-lock` offline).
- `validate.py`: `thai`, `ledger`, `verdict_bt`, `sm`, `lev` pass. `smart`, `screener`, `news`, `onchain`, `flows` fail at the default window only because the branch's data is a day old, and pass with a 48-hour window.

Section 3 (L1 to L3) stays open; L1 no longer applies now that hysteresis is not shipped.
