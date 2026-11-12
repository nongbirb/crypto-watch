# Proof Layer, Phase 1 (v54)

Implements section 2 of `docs/architect-proof-layer.md` (branch `claude/wonderful-sagan-55yt2d`, rev 2). Phase 1 only.

## Verdict timing change (required note)
The Technical setup (Long / Wait / Avoid / Insufficient) now reads **closed daily candles only**. The open daily candle is dropped, and 4h candles count only if they closed by that daily close. The live price is used only to show distance to the levels. A state can therefore change **up to a day later** than before, at the 00:00 UTC close, and no longer flips during the day. The daily brief runs at about 09:10 JST, just after that close, so `judgment.json` notes written then agree with the page (`update_judgment.md` says so). The stored state codes are unchanged.

## What is where
| Part | File |
|---|---|
| Indicators + rule, moved unchanged from `app.js`, plus `compute(t, { closedOnly, now })` | `verdict-core.js` (browser `VC`, node `require`) |
| Shared stats: nEff, block bootstrap, walk, forward returns, TP1-before-stop | `scripts/proof-lib.mjs` |
| Verdict backtest (weekly) | `scripts/build_verdict_backtest.mjs` → `verdict_backtest.json` (cap 300 KB), `.github/workflows/verdict_backtest.yml` |
| Pattern nEff per type | `scripts/build_patterns_backtest.mjs` → `patterns_backtest.json` `types.*.*.nEff` |
| Live ledger (every 3h + heartbeat) | `scripts/build_ledger.mjs` → `data/ledger/YYYY-MM.json` (cap 200 KB), `data/ledger/summary.json` (cap 100 KB), `.github/workflows/ledger.yml` |
| Validator | `scripts/validate.py ledger [--base REF \| --prev-dir DIR]`, `scripts/validate.py verdict_bt` |
| UI | `proof.js`: record line on the trade plan card, "What changed" strip, `#/record`; `patterns.js`: pattern display rule |
| Tests | `tests/proof-layer.mjs` (node), `tests/proof-ui.mjs` (Chromium) |

## Rules as built
- **Backtest cases:** every closed UTC daily bar with 200+ bars of history. The state comes from the 299 closed bars ending at that bar, the window the app sees. There is no 4h refinement, because years of 4h history are not available for every venue. One venue per token: the `tokens.json` source with the longest closed history, never stitched.
- **Outcomes:** close-to-close forward return at +1d, +7d and +30d. A missing bar means no case. For Long only: TP1 before the stop, from the signal close. A bar touching both counts as the stop. A trade unresolved after 90 bars is a timeout, marked to that close. R = (exit − entry) / (entry − stop).
- **nEff:** cases in time order. Count one, then skip every case that starts fewer than h days after it. For TP1 and patterns, skip cases detected before the counted one resolved.
- **Intervals:** moving-block bootstrap, block = horizon, 1,000 resamples, fixed seed. `ci` = [5th, 95th] percentile of the median; `ciPos` = the same for the share positive.
- **Gate:** a rate is shown only with nEff ≥ 20; below that the UI says "not enough samples (n=…)". Patterns use the section 0 rule: nEff ≥ 30 and hit rate < 35 % is greyed with its rate, and nEff < 30 shows "not enough cases (n=…)". The rule is applied to the timeframe shown on the card.
- **Split:** by time per token, first 70 % train and last 30 % test. A train case's forward window must end before the cut. The rule has no tunable parameter, so nothing is fitted.
- **Ledger:** state changes only. `t` = close time of the last closed daily bar and never decreases. The first observation of a token is stored with `from: null` and is not counted as a change. Locked fields are `id, t, sym, kind, from, to, px, ctx`. `r1 / r7 / r30` and `proof` are filled once and never changed. Lock time comes from the commit that first holds the entry plus GitHub's push timestamp, using `events-core.js proveLock`.
- **Kinds:** `verdict` and `pattern` are recorded now. `sm_flow`, `funding_regime` and `oi_regime` need the Phase 2 and Phase 4 data files; the builder logs that they were skipped, and the `#/record` page says they are not recorded yet.
