# Feedback on `architect-proof-layer.md`

Reviewers: Grok Research (builder of the current app and its daily jobs) and Audit Grok (auditor), in the grok gangz room, Nov 13 2026.
Verdict: **approve with the fixes below.** Audit Grok: AGREE with fixes, 7/10. The brief's evidence was spot-checked against `main` and holds up. Read this file together with the brief; where they differ, this file wins.

## Evidence check

| Brief claim | Result |
|---|---|
| P1 verdict is untested and the UI says so | Confirmed. `app.js` `planHTML` shows "Technical checklist, not a validated trading edge." (line ~450, not 449) |
| P2 verdict uses the still-open daily candle | Confirmed. The Binance / OKX / Hyperliquid fetchers in `app.js` (`klines`, ~lines 38-66) never drop the last candle, and Binance returns the open candle last |
| P3 Avoid = below MA50 and not above MA200 | Confirmed (`compute`, `app.js` ~143-146) |
| P4 Smart Money cohort = top N by 30-day dollar PnL | Confirmed (`scripts/build_smart_money.py` 27-29) |
| P8 heatmap never removes positions when OI falls | Confirmed (`leverage.js:138`, `if (d <= 0) continue`) |
| P9 pattern hit rates | Confirmed against `patterns_backtest.json` `types.any`: ascending triangle 11.4% (n=70), bear flag 17.9% (n=56), bull flag 21.1% (n=38). The list is incomplete: descending triangle 13.0% (n=77), cup 12.4% (n=105), head and shoulders 30.8% (n=52), inverse head and shoulders 23.6% (n=72), symmetric triangle 24.2% (n=62), bear pennant 0% (n=20) |

## Fixes, most important first

### 1. Overlapping samples (Phase 1, blocking)
Daily cases with 7-day and 30-day forward returns overlap heavily: day N and day N+1 share 6 of 7 (or 29 of 30) days. 300 daily cases may be worth about 10 independent 30-day ones.
- Report an effective sample size: non-overlapping count (`floor(n / horizon)`) or block-bootstrap intervals. Use it, not raw n, for the "n >= 20" display gate.
- Show the history length per token. MON, HYPE and LIT have little history; label them "short history".
- Keep the 70/30 time split and the no-lookahead walk. The test fixture must show that a future candle cannot change a past state.

### 2. Keep internal state codes (Phase 3, blocking)
Do **not** rename `Long` / `Wait` / `Avoid` / `Insufficient` in data or code. `judgment.json` (written by the daily update), `reports/weekly-*.json` (weekly track record archive), `scripts/build_weekly.mjs`, `tests/verdict.mjs`, `i18n.js`, `extra.js`, `onchain.js` and `leverage.js` use them. Change only the **display labels** (EN and Thai) through `i18n.js`. Renaming the codes breaks the weekly track record and makes old reports unreadable.

### 3. House rules missing from section 0 (all phases, blocking)
Add these to the ground rules:
- Never edit `data/events/`, `reports/`, `narrative.json` or `judgment.json` except through their own builders or jobs. Locked event files are a tamper-evidence record; editing them breaks the lock proof for good.
- Never rewrite history, force-push, or squash. Regular merge commits only.
- One phase per branch and PR. Nothing merges until Audit Grok has audited that exact commit **and** the owner types "merge". The auditor's approval is not the owner's.
- Every UI release bumps `ASSETV` in `app.js` (now 53) and the `cw-shell-vNN` cache name in `sw.js` together, to the same number, and updates `EXPECT_ASSETV` in the tests.
- Every PR passes **all** suites in `tests/` (currently 15 files, plus `scripts/validate.py`), not only new or extended ones. Never weaken an existing test to make it pass.
- Phone width: no sideways scrolling. Times show in the viewer's local time zone. Thai reads like a Thai crypto trader talks and keeps common English trading terms (`docs/thai_style.md`, `scripts/thai_blocklist.txt`).
- Workflow commits use `git config user.email "41898282+github-actions[bot]@users.noreply.github.com"` (as all workflows do since PR #10).

### 4. Pattern rule in one place (Phases 1 and 3)
Section 1 lists only four failing patterns. Phase 3 already has the right rule: grey out any type under 35% with n >= 30, and show "not enough cases" when n < 30. State it once in the ground rules and use it in Phase 1's UI as well as the Setup card. Base the gate on the effective n from fix 1.

### 5. Repo growth (Phases 1, 2, 4)
Rewriting `data/sm/history.json`, `data/sm/last_positions.json` and `data/lev/history.json` every 30 minutes stores a new full copy in git each time.
- Use monthly files (as the ledger does), or write daily roll-ups and keep intraday rows only for the last 7 days.
- Keep `last_positions.json` out of git if possible (Actions cache or artifact). If it must be committed, set a size cap and test it.
- Add a size check to `scripts/validate.py` for every new file.

### 6. Hourly trigger (Phases 1, 2, 4)
GitHub skips many scheduled runs (Nov 10-11: events ran 6 times in 24h instead of 120). `.github/workflows/heartbeat.yml` re-dispatches `events.yml` and `smart_money.yml`. Any new scheduled builder that must not miss runs (the 3-hourly ledger at least) has to be added to its list, with the same "skip if it started in the last 50 min" guard. Pages must show the real data age.

### 7. Closed candles and hysteresis change the daily brief (Phase 1 and 3, note)
With closed candles only and two-day hysteresis, a verdict can change up to a day later than it does now. This is accepted (fewer intraday flips), but the PR description must say it, and `judgment.json` notes must not contradict the page. The daily brief runs at about 09:10 JST, just after the 00:00 UTC daily close.

### 8. Hyperliquid rate limits (Phase 2)
The real liquidation map needs every panel wallet's positions on every run (about 300 `clearinghouseState` calls). Check the Info API weight limit first, batch or throttle, and fall back to the previous snapshot with its real age instead of failing. Never show a partial sample as complete: always label it "sample of N wallets".

## Suggested order
Phase 1, then Phase 2, then Phase 4, then Phase 3 (needs evidence lines from 1, 2 and 4). Phase 5 stays optional. Phase 2's flows also cover the owner's earlier Smart Money requests ("changes since the last snapshot", wallet drill-down).

## Review checklist for each phase PR
- Effective sample sizes shown; no raw-n confidence (Phase 1).
- No change to locked files; validator rejects edits to locked ledger fields.
- State codes unchanged; only labels changed.
- `ASSETV` and `cw-shell` bumped together; all `tests/` suites and `validate.py` pass; EN and TH, desktop and phone, light and dark screenshots attached.
- New files under the size cap; new builders listed in `heartbeat.yml` if they run more often than daily.
