# Audit: Leverage fixes, Phase 4

Audited: `leverage-p4` at `c32725c` (base `9403c41`). Audit only; nothing was pushed or edited on that branch.
Spec: `docs/architect-proof-layer.md` rev 2, sections 0 and 5; `docs/audits/phase2-audit.md` section 4 (L1 to L5); `docs/leverage-p4.md`.

## 1. Verdict

**AGREE with fixes, 7/10. Fix H1 and M1 to M4 before merge.**

The tab, the ledger kinds, the validator and L1 to L5 are built as specified and the no-lookahead test holds. The problems are in the history data itself. They must be fixed before the first run on `main`, because a day becomes final the day after it is written and the validator then forbids any correction.

The history builder was run live into a temp folder (9 tokens, 100 days, 68 KB daily file, 20 KB recent file).

## 2. Fix before merge

### H1 (High): one failed fetch at the day boundary blocks `positioning.yml`, possibly for good
- **Where:** `scripts/lev_hist.py` (`merge_day`, the `final` marking in `main`), `.github/workflows/positioning.yml` (validate before commit).
- **Problem:** the first run after 00:00 UTC marks yesterday final even when a fetch failed in that run. Later runs then fill the missing value, the validator sees "a closed day changed", and the workflow stops before the commit. `positioning.json` is committed in the same step, so it stops updating too.
  - Missing CoinGecko close: every later run refetches it and fails again. This never clears by itself.
  - Missing Hyperliquid or OKX funding settlement: blocked until the day leaves the 3-day refetch window.
  - OKX hourly reading still in progress: blocked until the day leaves the 100-hour window.
- **Reproduced:** took the live output as "new" and, as "previous", the same file with yesterday's (a) price and market cap missing, (b) one fewer Hyperliquid settlement, (c) a different OKX open interest. `validate.py lev` failed all three with "2026-11-12: a closed day changed".
- **Fix:**
  1. `merge_day` never writes into a day that is already final.
  2. A day is marked final only when this run's fetches for it succeeded for every token and venue; otherwise it stays open and the next run completes it. After 3 days it is marked final as it is, with the missing values left null.
  3. In `positioning.yml`, a failed `validate.py lev` must not block `positioning.json`: on failure restore `data/lev` from `HEAD`, commit `positioning.json` alone, and end the job with a failed status so it is noticed.
  4. Tests for 1 and 2 (a failed fetch, then a complete one: the day is completed, the validator passes).

### M1 (Medium): OKX open-interest readings are stamped at the start of their period, but hold the value at its end
- **Where:** `scripts/lev_hist.py` `okx_oi` and its two callers.
- **Problem:** the 1D row stamped day D 16:00 UTC holds the reading taken about 24 hours later, and the newest 1D row is still in progress. Backfilled open interest is therefore stored one day too early, and so is each day's change.
- **Reproduced (BTC, 2026-11-13 22:02 UTC):** 1D row "11-12 16:00" = 2361.5M; hourly row "11-13 15:00" = 2361.5M; hourly row "11-12 16:00" = 2650.2M. Newest 1D row "11-13 16:00" = 2312.5M = the newest hourly row.
- **Fix:** store a 1D row under the day and hour of `ts + 24h` and skip the newest (in-progress) row. Store a 1H row under `ts + 1h`. Add a test with these numbers.

### M2 (Medium): the stored daily "close" is the previous day's close
- **Where:** `scripts/lev_hist.py` `cg_daily`.
- **Problem:** CoinGecko's daily point stamped D 00:00 UTC is the price at the start of day D. It is stored as the close of D.
- **Reproduced (BTC):** stored 2026-11-12 = 73,974; Binance daily candle for 11-12: open 74,015, close 71,460. Same pattern on the four earlier days.
- **Effect:** `mom` mixes day D's open-interest change with day D−1's price change, and `lev` uses a market cap one day old.
- **Fix:** store the 00:00 point of day D as the close of D−1. Add a test.

### M3 (Medium): the floor rule makes funding discontinuous and mis-ranks near-neutral days
- **Where:** `scripts/lev_hist.py` `fund_days` (`fx`), `lev-core.js` `liveExcess`, `fund`, `regimes`.
- **Problem:** a settlement exactly at 0.01 % counts as 0, but one at 0.0099 % counts as 99 ppm. OKX rarely settles exactly at the default (BTC: 7 of 90 days), so most ordinary days carry a large "excess", and a day just under the default ranks as hotter than a day at it.
- **Reproduced:** BTC 2026-11-12 has excess 50 ppm, half the default rate, and `regimes` returns `funding_regime: high` at the 97.75th percentile. 13 of 90 BTC days on OKX average between 60 and 100 ppm and are scored as 60+ ppm of excess.
- **Fix:** excess = rate − default (100 ppm per 8h), everywhere. It is continuous, and for a day it equals stored `f` − 100, so `fx` can be dropped from the file or kept equal to that. Use the same in `liveExcess`. Update the help text ("measured against the venue default of 0.01 % per 8h").

### M4 (Medium): a reading can rest on a small part of the market without saying so
- **Where:** `leverage.js` `renderLev`.
- **Problem:** until Hyperliquid has 30 recorded days, open-interest ranks use OKX only. For HYPE that is $101M of $1.67B, about 6 %, yet the tab shows "How much leverage 49/100 Elevated" with the venue list only in a small note below.
- **Fix:** compute the ranked venues' share of live open interest. Under 50 %, show "Low coverage: N % of open interest" beside the reading and grey the number. Keep the note.

## 3. Lower severity (Phase 3 or later)

| # | Where | Note |
|---|---|---|
| L1 | `lev-core.js` `fund` | Funding is OI-weighted only on days where every venue has OI, else a plain mean; the measure changes on the day Hyperliquid OI recording starts |
| L2 | `lev-core.js` `series` | When Hyperliquid joins the OI ranks, days before its recording drop out, so the window shrinks to about 30 values at once. Say so in the note |
| L3 | `leverage.js` `heatmap` | `open` is not reduced when a cluster is removed by a price wick, so later declines cut slightly too little |
| L4 | `tests/events-ui.mjs`, `tests/events-v53.mjs`, `tests/p1-ui.mjs` | Failed here on time-dependent checks ("priced-in now", "Recent" chips, narrative age). None of their code or data changed on this branch. Not confirmed against `main` |

## 4. The eight audit items

1. **History data: not confirmed.** Fields and units for Hyperliquid funding are right. OKX open interest is stamped a period early (M1), the close is a day late (M2), the floor rule is wrong (M3), and a final day can be changed by the builder itself (H1). Settlement counts, "replaced only by a later same-day reading", the validator's final-day check and the size caps are as documented.
2. **Percentiles: confirmed.** 90 closed days, 30-day minimum, Hyperliquid OI left out until 30 recorded days, live `mom` and `lev` use the same venue set as the history.
3. **No lookahead in the regimes: confirmed.** Multiplying every value after day D left D's regimes identical. The open day returns nothing.
4. **Leverage tab: confirmed, with M4.** Two readings, never summed; "not enough history"; left-out venues named; 7d only over a real span; the heatmap cuts clusters on a decline; "share of accounts, not of money".
5. **Ledger: confirmed.** New state codes are checked, changes only, one entry per kind per signal time.
6. **L1 to L5: confirmed.** The v1 to v2 conversion multiplies amounts by 1,000 and keeps counts; the L3 guard is present; the panel history is delta-encoded, idempotent and seeded from the current `panel.json`.
7. **Release rules: confirmed.** `positioning.yml` validates and commits `data/lev` and is in the heartbeat; 56 in both places; `lev-core.js` is in `index.html`, `sw.js` and `build_min.sh`; `min/` matches a fresh build for the five changed files; no protected file changed; EN and Thai present, `validate.py thai` passes.
8. **Venue coverage: acceptable with M4.** Binance and Bybit cannot be reached from the data servers, so OKX and Hyperliquid are the honest choice. The reading must show its coverage.

Suites: 16 of 19 pass here (`events-lock` offline only). The three that fail are in L4.

## 5. After the fixes

Because every backfilled value changes with M1 to M3, regenerate the test fixtures in `tests/fixtures/lev/`. Nothing on `main` needs migrating: `data/lev/` does not exist there yet.

## 6. Re-audit of the fix commit `38c8756` (diff `c32725c..38c8756`)

**Verdict: AGREE, 9/10. H1 and M1 to M4 are fixed. From the auditor's side this head is ready for the owner's "merge".**

"Guarded" below means: I reverted that one fix in a scratch copy and the test suite failed.

| Item | Fixed | Guarded by a test | How checked |
|---|---|---|---|
| H1 final-day lock | Yes | Yes | Writes to a final day go to a throwaway row. Removing the guard fails with "a closed day changed" |
| H1 final only after a clean run | Yes | Yes | Any failed fetch keeps past days open. Removing the condition fails "a failed fetch keeps 11-12 open" |
| H1 3-day grace | Yes | Yes | A day is finalised as it is 3 days after it was first written. Removing the grace fails its test |
| H1 workflow order | Yes | Yes (text check only) | validate (continue-on-error), restore `data/lev` from `HEAD`, commit, then fail the job. The test matches the workflow text; the real behaviour can only be seen on GitHub |
| M1 stamped at ts + period | Yes | Yes | Live: stored OKX readings carry hour 24. Removing the shift fails the test built on the audit's numbers |
| M1 open period skipped | Yes | Yes | Same test |
| M1 hour 24 at exactly 00:00 | Yes | Yes | Own test |
| M2 close moved to D−1 | Yes | Yes | Live BTC: stored 71,372 / 68,313.7 against Binance closes 71,460 / 68,314 for Nov 12 / Nov 13 |
| M3 fx = f − 100 | Yes | Yes | Builder, validator (rejects any other value), `lev-core.js` `liveExcess`, help text EN and Thai. BTC Nov 12 is now `normal` (was `high`) |
| M4 coverage share, 50 % threshold | Yes | Yes | UI test: HYPE 6 % and BTC 47 % show the label and grey number. Setting the threshold to 0 fails the test |

- **Fixtures:** `tests/fixtures/lev/` pass `validate.py lev` (91 days).
- **Live:** the builder ran twice into a temp folder with 0 failed fetches; the second output validates against the first.
- **Also checked:** `leverage-p4` (15 groups) and `leverage-ui` (28 checks) pass; `min/lev-core.js` and `min/leverage.js` match a fresh build; no protected file, `app.js` or `sw.js` changed.
- **Not re-run on this commit:** the other suites.

Note for the owner, not a defect: with Binance and Bybit live in a real browser, OKX + Hyperliquid will usually hold well under half of open interest, so "Low coverage" will show on most tokens most of the time. That is the honest state of the data. It only improves if history for the larger venues can be stored from somewhere that can reach them.
