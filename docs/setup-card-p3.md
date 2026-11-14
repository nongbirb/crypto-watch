# Setup card, Phase 3 (v57)

Implements section 4 of `docs/architect-proof-layer.md` (branch `claude/wonderful-sagan-55yt2d`, rev 2) and section 3 (L1–L4) of `docs/audits/phase4-audit.md`. Branch `setup-card-p3` from `main` at `cadb487` (the Phase 4 merge). Not merged, no PR.

## What is where
| Part | File |
|---|---|
| Hysteresis (one rule for app, ledger and backtest) | `verdict-core.js` `holdAt`, `holdSeries`, `computeHeld` |
| Evidence-line rules, mirrored levels, ledger row lookup (UMD: browser `SUC`, node `require`) | `setup-core.js` |
| Card UI: evidence list, lazy loads, mirrored rows, source-tab buttons | `setup.js` (`suHTML`, `suLines`, `suMirrorRows`), called from `app.js` `planHTML`; plan chart in `renderTab` |
| Display labels | `i18n.js` (`Long`, `Wait`, `Avoid`, `Insufficient` keys keep their names) |
| App state | `app.js` `compute` → `VC.computeHeld` |
| Ledger | `scripts/build_ledger.mjs` `observe`: stores the held state; `ctx.raw` = the newest bar alone |
| Backtest | `scripts/build_verdict_backtest.mjs`: held states by default, `--raw` for the old rule; per token `changes: {raw, held}`; `verdict_backtest.json` rebuilt with hysteresis |
| Phase 4 audit L1–L3 | `lev-core.js` `fund`, `weighted`, `percentiles` (`oiDays`, `oiFrom`); `leverage.js` history note and `heatmap` |
| Phase 4 audit L4 | `tests/events-ui.mjs`, `tests/events-v53.mjs`, `tests/p1-ui.mjs` |
| Release | `ASSETV` 57, `cw-shell-v57`, `index.html ?v=57`, `setup-core.js` and `setup.js` in `index.html`, `sw.js` and `build_min.sh`; `min/` rebuilt |
| Tests | `tests/setup-card-p3.mjs` (node, 16 groups), `tests/setup-ui.mjs` (Chromium, 45 checks) |

## Labels (section 0: codes unchanged)
The stored codes stay `Long` / `Wait` / `Avoid` / `Insufficient` in `judgment.json`, the weekly reports, the ledger, `verdict_backtest.json` and every test. Only `i18n.js` changes:

| Code | EN | TH |
|---|---|---|
| `Long` | Uptrend setup | เซ็ตอัปขาขึ้น |
| `Wait` | Mixed | ยังไม่ชัด |
| `Avoid` | Downtrend | ขาลง |
| `Insufficient` | Insufficient data | ข้อมูลไม่พอ |

The Learn page entry and its "how to read a token" step now use the new labels.

## Hysteresis
- **Rule:** a stored state changes only after two consecutive closed daily bars agree. Walking back from the newest closed bar, the held state is the raw state of the newest bar whose raw state equals the bar before it.
- **Insufficient** (incomplete inputs) starts and ends at once. Levels cannot be issued without the inputs, and there is no earlier state to hold.
- **Lookback cap:** if no bar in the last 30 qualifies, the state at the oldest bar looked at is kept. That needs 30 alternating closes; none of the tokens' histories reach it.
- **Same code everywhere:** `holdAt` is the only implementation. The app (`computeHeld` on the 299 closed bars it loads) and the ledger (`computeHeld` with `win: 299`, the backtest's window) call it bar by bar. The backtest calls it over the walk-forward states (`holdSeries`). A test checks, on four synthetic series, that both give the same state at every bar.
- **Card:**
  - When the newest close alone reads differently, the card says so under the chip: "The last daily close alone reads "Mixed". The state changes to it only if the next daily close agrees."
  - The help text of both the card and the record says that a state can now change up to two days later than it did before Phase 1.
- **Ledger after merge:** `observe` now stores the held state. A token whose held state differs from its last stored entry gets one `verdict` change on the first run. On 2026-11-14 the held and raw states were equal for all 9 tokens as the app loaded them here, so none is expected (the ledger may read a different venue for some tokens).
- **Timing change** (for the PR description): before Phase 1 the state read the still-open candle. Phase 1 moved it to the last close, up to one day later. Phase 3 adds the second agreeing close, so up to two days later in total.

## Verdict backtest with and without hysteresis
Both runs used the same script on the same day (2026-11-14, last closed bar 2026-11-13), one venue per token, the 299-bar window, and nothing tuned. "no hysteresis" = `--raw`, which reproduces the run before this change exactly (BTC Long 43 days, nEff 18, +0.82 %). Cells are +7d returns: n / nEff / median %, with the 90 % bootstrap interval where nEff ≥ 20.

**Per token, +7d.** "State changes" = number of days the stored state differed from the day before.

| Token | run | state changes | Long days | Long +7d n / nEff / med | Wait +7d | Avoid +7d | Long TP1 before stop | any day +7d |
|---|---|---|---|---|---|---|---|---|
| BTC | no hysteresis | 188 | 43 | 43 / 18 / +0.82 | 2072 / 324 / +0.33 [-0.17, +0.88] | 1055 / 175 / +0.37 [-0.34, +0.92] | 23/43 (53.49%) | +0.38 |
| BTC | hysteresis | 94 | 26 | 26 / 7 / -0.35 | 2084 / 313 / +0.38 [-0.11, +0.89] | 1060 / 169 / +0.38 [-0.31, +0.87] | 11/26 (42.31%) | +0.38 |
| ETH | no hysteresis | 165 | 64 | 63 / 23 / -3.37 [-7.25, +0.79] | 2002 / 312 / +0.33 [-0.36, +1.06] | 1105 / 176 / +0.08 [-0.97, +1.01] | 20/64 (31.25%) | +0.22 |
| ETH | hysteresis | 92 | 52 | 50 / 15 / -4.59 | 2014 / 306 / +0.33 [-0.34, +1.01] | 1106 / 170 / +0.12 [-0.86, +1.06] | 17/50 (34%) | +0.22 |
| MON | no hysteresis | 2 | 0 | 0 | 1 / 1 / -23.35 | 29 / 5 / -8.54 | 0 | -8.78 |
| MON | hysteresis | 0 | 0 | 0 | 0 | 30 / 5 / -8.78 | 0 | -8.78 |
| HYPE | no hysteresis | 16 | 2 | 2 / 1 / +5.27 | 413 / 61 / -0.30 [-2.17, +2.31] | 88 / 14 / -1.55 | 2/2 (100%) | -0.33 |
| HYPE | hysteresis | 8 | 0 | 0 | 417 / 61 / -0.26 [-1.97, +2.31] | 86 / 13 / -2.76 | 0 | -0.33 |
| AAVE | no hysteresis | 111 | 14 | 14 / 8 / -4.53 | 1112 / 178 / -0.24 [-1.51, +1.05] | 889 / 142 / -0.22 [-1.47, +1.27] | 3/14 (21.43%) | -0.26 |
| AAVE | hysteresis | 62 | 8 | 8 / 3 / -6.44 | 1114 / 172 / -0.44 [-1.67, +0.96] | 893 / 140 / -0.02 [-1.36, +1.55] | 2/8 (25%) | -0.26 |
| LIT | no hysteresis | 0 | 0 | 0 | 97 / 14 / +1.80 | 0 | 0 | +1.80 |
| LIT | hysteresis | 0 | 0 | 0 | 97 / 14 / +1.80 | 0 | 0 | +1.80 |
| SOL | no hysteresis | 115 | 22 | 22 / 7 / -2.55 | 1334 / 209 / -0.28 [-1.51, +1.50] | 724 / 122 / -0.41 [-1.38, +0.88] | 0/22 (0%) | -0.38 |
| SOL | hysteresis | 71 | 17 | 17 / 5 / -3.09 | 1342 / 206 / -0.33 [-1.51, +1.25] | 721 / 115 / -0.37 [-1.39, +1.04] | 2/17 (11.76%) | -0.38 |
| NEAR | no hysteresis | 153 | 32 | 32 / 17 / +7.66 | 1092 / 180 / -1.39 [-3.00, +0.53] | 892 / 144 / -0.98 [-2.21, +0.31] | 18/32 (56.25%) | -1.07 |
| NEAR | hysteresis | 80 | 18 | 18 / 7 / +2.25 | 1102 / 175 / -1.25 [-2.44, +0.86] | 896 / 141 / -0.93 [-2.16, +0.46] | 9/18 (50%) | -1.07 |
| PENDLE | no hysteresis | 62 | 17 | 17 / 6 / -0.68 | 608 / 99 / -0.53 [-2.60, +1.78] | 399 / 65 / -1.85 [-4.44, +0.35] | 8/17 (47.06%) | -1.05 |
| PENDLE | hysteresis | 33 | 14 | 14 / 4 / -0.94 | 607 / 95 / -0.23 [-2.21, +1.92] | 403 / 63 / -2.22 [-4.70, +0.05] | 7/14 (50%) | -1.05 |

**Pooled (all tokens), +7d.** Tokens move together, so pooled nEff counts at most one case per window across all tokens.

| State | no hysteresis | hysteresis |
|---|---|---|
| Long | 193 / 63 / -0.16 [-1.79, +1.94] | 133 / 39 / -2.08 [-4.17, +0.07] |
| Wait | 8731 / 380 / +0.01 [-0.40, +0.44] | 8777 / 376 / +0.02 [-0.39, +0.43] |
| Avoid | 5181 / 283 / -0.26 [-0.72, +0.22] | 5195 / 281 / -0.22 [-0.71, +0.27] |

**Held-out last 30 % of each token, +7d** (nothing was set on it)

| Token | state | no hysteresis | hysteresis |
|---|---|---|---|
| BTC | Long | 14 / 7 / +0.58 | 7 / 2 / +0.07 |
| BTC | Avoid | 265 / 46 / +0.51 [-0.59, +1.59] | 267 / 44 / +0.72 [-0.49, +1.71] |
| ETH | Long | 32 / 12 / -3.52 | 29 / 9 / -4.86 |
| ETH | Avoid | 344 / 57 / +0.15 [-1.52, +1.46] | 340 / 54 / +0.26 [-1.33, +1.60] |
| MON | Long | 0 | 0 |
| MON | Avoid | 5 / 1 / -5.51 | 5 / 1 / -5.51 |
| HYPE | Long | 2 / 1 / +5.27 | 0 |
| HYPE | Avoid | 0 | 0 |
| AAVE | Long | 1 / 1 / +6.47 | 0 |
| AAVE | Avoid | 292 / 46 / -1.42 [-3.98, +0.52] | 295 / 46 / -1.35 [-3.99, +0.53] |
| LIT | Long | 0 | 0 |
| LIT | Avoid | 0 | 0 |
| SOL | Long | 0 | 0 |
| SOL | Avoid | 287 / 48 / +0.38 [-0.96, +2.22] | 287 / 46 / +0.34 [-1.23, +1.88] |
| NEAR | Long | 16 / 7 / +3.19 | 9 / 3 / +0.73 |
| NEAR | Avoid | 241 / 40 / +0.65 [-2.62, +3.63] | 244 / 38 / +0.53 [-2.89, +3.79] |
| PENDLE | Long | 8 / 3 / +9.25 | 6 / 2 / +11.78 |
| PENDLE | Avoid | 151 / 24 / -1.29 [-4.23, +2.04] | 153 / 24 / -1.32 [-4.52, +2.04] |

**Pooled, +1d and +30d** (n / nEff / median, interval where nEff ≥ 20)

| State | +1d no hysteresis | +1d hysteresis | +30d no hysteresis | +30d hysteresis |
|---|---|---|---|---|
| Long | 194 / 185 / +0.27 [-0.09, +0.64] | 135 / 132 / -0.47 [-0.82, +0.33] | 191 / 37 / -4.36 [-13.62, +5.69] | 132 / 27 / -10.91 [-13.43, +3.06] |
| Wait | 8761 / 2542 / +0.00 [-0.07, +0.06] | 8809 / 2539 / +0.00 [-0.06, +0.08] | 8551 / 97 / -0.05 [-1.98, +2.27] | 8595 / 95 / -0.18 [-2.20, +2.11] |
| Avoid | 5204 / 1834 / -0.04 [-0.10, +0.04] | 5215 / 1841 / -0.04 [-0.11, +0.03] | 5156 / 75 / +0.13 [-2.12, +2.11] | 5171 / 75 / +0.30 [-1.84, +2.19] |

### What this shows
- **Stability:**
  - Hysteresis roughly halves the number of state changes (BTC 188 → 94, ETH 165 → 92, all tokens 812 → 440).
  - Mixed and Downtrend are almost unchanged: pooled +7d medians +0.01 → +0.02 % and −0.26 → −0.22 %, intervals overlapping.
- **Uptrend setup (`Long`) gets worse and rarer:**
  - Pooled: 193 → 133 days, nEff 63 → 39.
  - +7d median −0.16 % → −2.08 % (interval −4.17 to +0.07); +1d median +0.27 % → −0.47 %.
  - Cause: `Long` is short-lived (it needs price within 3 % of the entry zone). Waiting for a second agreeing close often confirms it only as price leaves the zone, and the first day of the move is lost.
  - No per-token `Long` cell reaches nEff 20 in either version, so the card shows "not enough samples" for it with or without hysteresis.
- **Decision for the owner:** this was not tuned. Section 4 asks for hysteresis, and both results are reported here. If the weaker `Long` record outweighs the stability, the alternative is to apply hysteresis only to `Wait` ↔ `Avoid` and let `Long` start at once. That would be a separate, pre-registered change; it was not tested here.

## Evidence lines (under the state, never summed)
Each line is green (g), grey (n) or red (r). It shows its number, a source-tab button or link, and its ledger record where the ledger records that kind. The bands are fixed in advance and none is fitted.

| Line | Number shown | Green | Red | Grey | Source | Ledger |
|---|---|---|---|---|---|---|
| Trend | close vs MA50 and MA200 (%) | Uptrend | Downtrend | Mixed or too little history | Price tab | the state's own record stays under the chip |
| Strength vs BTC | token ÷ BTC 30-day return; token/BTC ratio vs its 50-day average | outperforming **and** above the average | underperforming **and** below | otherwise; BTC itself ("benchmark"); under 50 shared closed days | Price tab | none |
| Derivatives (Phase 4) | funding percentile against own 90 closed days, OI 24h change | funding in the bottom 10 % | funding in the top 10 % (longs paying the most) | between; under 30 days; **ranked venues under 50 % of open interest** (with "Low coverage: N % of open interest", audit M4) | Leverage tab | `funding_regime` for the same band |
| Smart Money | panel 7-day net, and as % of the panel's position on the coin | above +5 % (net buying) | below −5 % (net selling) | within ±5 %; no position | Smart Money page | `sm_flow` |
| Pattern | best active daily pattern by score: direction, status, score, record | bullish, with a record that passes the rule | bearish, with a record that passes | type with nEff < 30 ("not enough cases") or hit rate < 35 % ("weak record"), undirected, or no record | Patterns tab | `pattern` for that type |
| Event risk | the nearest high-impact event for this token or macro within 48 h | none in the next 48 h | one or more | calendar unavailable | Calendar | none |

- **Data:**
  - Trend and Strength vs BTC: the closed daily candles already loaded.
  - Derivatives: the Leverage tab's model (`loadLev`, `levModel`), cached 5 min.
  - Smart Money: `smart_money.json` (`flows.d7`, `coins`).
  - Pattern: 1D candles through `patCandles` and `patterns_backtest.json`, using `pTypeRec(type, '1d')`, which falls back to all timeframes pooled exactly as the pattern cards do.
  - Event risk: the merged calendar (`calendar.json` and `calendar_auto.json`) in local time; an all-day event counts for its whole day.
  - Each async source loads once per token and re-renders the card when it arrives.
- **Ledger rows** come from `data/ledger/summary.json`: the token's own row first, else all tokens pooled, gated at nEff ≥ 20 like the record. The summary has no changes yet, so today every line says "no recorded change … yet".

## Mirrored levels (Downtrend)
When the stored state is `Avoid` and there is a daily resistance above the close, the plan table shows the mirror of the daily plan:
- **Resistance zone:** `[r1 − ATR/4, r1]`, never below the close.
- **Invalidation:** zone top + 1 ATR (close above).
- **Targets:** the daily supports below the zone, then 1R steps (marked "no support left").

"Levels, not a short call" is printed on the card above the table (EN and TH), and again under the Trade plan chart, which draws the same lines. The long entry zone, stop and TPs are not shown for a Downtrend. The reason text ends "The levels below are mirrored from the daily plan." With no resistance above, the usual table is shown.

## Phase 4 audit section 3
- **L1:** funding across venues is now a plain mean every day, in history (`fund`) and live (`weighted`). Before, it was OI-weighted only on days where every venue had OI, so the measure would have changed on the day Hyperliquid OI recording started. The help note says "plain mean of the venues". Test: the same day gives 30 with or without Hyperliquid OI (it was 40 OI-weighted), and live gives the same.
- **L2:** `percentiles` returns `oiDays` and `oiFrom`. When more than one OI venue is ranked and fewer days have every reading, the history note says "ranked on the N days where every one of them has a reading (since D), not all 90". Test: Hyperliquid with 40 recorded days gives `oiDays` 40.
- **L3:** in `heatmap`, a leverage tier already liquidated by a later wick is closed. It is neither drawn nor counted in the open notional, so a later OI drop removes the right share. Test: a wick to 85 then an OI drop of 500 removes 500/660 of what is drawn; the old code removed 500/1000.
- **L4:**
  - `events-v53`: the "Recent" chip check fixes the page clock (Playwright `clock.setFixedTime`, timers still run) at two days after the CPI release, because Recent lists only the 4 newest released events and the CPI row has left it.
  - `events-ui`: when `prelive.json` has no entry for the next event (true now: the MON unlock on Nov 24), the newest real snapshot with an options-implied move (the CPI's, as recorded) is served under that id, unfrozen.
  - `p1-ui`: the real edition's overdue notice must match `nIsOverdue` whatever its age, then a fresh edition must show none and an old one must show it. Data freshness itself is `tests/narrative-freshness.mjs`.
  - None of the three checks was loosened. Breaking the rendered chip or window in `events.js` makes `events-v53` and `events-ui` fail.

## Known limits
- The backtest has no 4h history, so a live entry zone (refined on 4h) can differ from the backtest's daily one. This is unchanged from Phase 1.
- Derivatives, Smart Money and Pattern lines load after the card. Until then they say "loading…" and are grey.
- Derivative ranks cover OKX and Hyperliquid only. With Binance and Bybit live in a browser, the line will usually be grey with "Low coverage", as the Phase 4 re-audit expected.
- The colour direction of each line (for example, top-10 % funding = red) is a fixed reading, not tested. Where the ledger records the line, its record shows how that state has done.
- The mirrored R multiples are measured from the resistance zone, like the long plan's from its entry zone. When price is far below the zone they are large.
