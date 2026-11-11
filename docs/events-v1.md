# Events v1 (v49, v50 additions): spec

Status: built on branch `events-v1`, not merged or deployed. Approved by SB OL in the group chat on Nov 9, 2026; the auditor reviews before the merge.

The Events tab explains one market event as a chain: **event → rates → dollar & yen → liquidity → stocks & gold → crypto**. It answers three questions: was it priced in, how did it spread, and was our locked view right. It never gives buy/sell calls. The only decision shown is a link to the existing technical verdict (Long / Wait / Avoid / Insufficient data) on Markets.

## 1. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | Measured boxes (blue outline) are only crypto reactions read from 1-minute exchange candles at exact timestamps. Everything else is "our explanation" (dotted line) | Only crypto has free minute data with reuse terms. Macro is daily, so it cannot prove cause |
| D2 | Macro boxes show the **full-day change across the release** (last fixing before T vs first fixing at or after T) and say so: `full-day change · <date>`. They get a `stale` tag when that fixing is more than 3 days after T | A daily close includes other news. The label stops it being read as a reaction |
| D3 | Lines are dotted only. No solid "proven" lines | Nothing in the chain is a measured causal link |
| D4 | Expected move, primary: the Deribit **ATM straddle** (call + put mark price, as % of the forward, interpolated between the two strikes around the forward) of the **nearest expiry after the release** (first 08:00 UTC expiry more than 1h after T). `lock` takes it within 6h before T, live only, because there are no free historical option marks. It is labelled "ATM straddle · expected move to the <expiry> expiry". Fallback: DVOL (30-day index) at T−5m as a 1-day 1σ (IV/√365). It is labelled "**30-day average volatility, not event-specific** · 1σ" | A 1σ move is beaten on about a third of normal days, so it is a weak "surprise" bar. The straddle is the market's own price of the expected absolute move over the event (audit fix 2) |
| D5 | Priced-in verdict. Straddle basis: `|move from T to the expiry| > straddle` → **surprise**, else **priced in**. The 1-day move is not used, so the horizons match. DVOL basis: `|1d move| > 1σ`, and the page explains that ~1 day in 3 beats 1σ with no news. With no options: past average `|1d|` after the same event type, only when there are ≥ 6 past events. Otherwise "not enough data" | A fixed public rule. No hand-picked thresholds per event |
| D6 | Fed odds are left out of v1 | Kalshi's Developer Agreement and Data Terms prohibit storing or publicly displaying its data. Polymarket's terms for redistribution are unclear (ICE is the data distributor) |
| D7 | Gold is shown as **unavailable** | The LBMA series left FRED. There is no free official daily gold price with clear reuse terms |
| D8 | "Dollar" is the Fed **Broad dollar index** (DTWEXBGS), not DXY | DXY is ICE-licensed. The Fed index is public domain |
| D9 | ETH is shown directly below BTC everywhere (separate commit `f5bf751`). BTC/ETH get options, positioning and priced-in. Other tracked tokens appear in "My tokens" (1h/1d moves only) | Deribit only lists BTC/ETH options among our tokens (SOL: none) |
| D10 | Ids use the calendar's JST date: `<YYYY-MM-DD>-<kind>` | Manual and auto calendar rows for the same release merge into one event |
| D11 | Every number carries its source link and data time. Missing or bad data shows "unavailable" / "waiting for data", never 0 | House rule |
| D12 | The page uses the viewer's local time zone with a label (e.g. `GMT+9`) | House rule |

## 2. Nodes: source and update frequency

| Node | Source (keyless) | Fixing time used | Typical lag | Unit |
|---|---|---|---|---|
| US 2Y / 10Y | US Treasury daily par yield curve CSV (`home.treasury.gov/.../daily-treasury-rates.csv/<year>/all?type=daily_treasury_yield_curve...`) | 15:30 ET | ~1 day (same US evening). Fresher than FRED (2–4 days) | bp |
| Japan 10Y | Japan MOF `jgbcme.csv` (+ `jgbcme_all.csv` for history) | 15:00 JST | 1–2 days | bp |
| Broad dollar index | FRED `DTWEXBGS` (Fed H.10) | 12:00 ET | ~1 week (weekly publication) | % |
| USD/JPY | ECB euro reference rates, JPY/USD cross | 14:15 Berlin | ~same day | % |
| S&P 500 / Nasdaq / VIX / WTI | FRED `SP500`, `NASDAQCOM`, `VIXCLS`, `DCOILWTICO` | 16:00 / 16:00 / 16:15 / 14:30 ET | 1–4 days (WTI up to ~1 week) | % |
| Gold | none | n/a | **unavailable** (D7) | n/a |
| Fed balance sheet | FRED `WALCL` (H.4.1, weekly Wednesday level) | 16:30 ET | weekly. Always low confidence | % |
| Stablecoin supply | DefiLlama stablecoins (USD-pegged total) | 00:00 UTC | ~same day | % |
| BTC / ETH / tokens | Binance `data-api.binance.vision` 1m klines → Bybit v5 spot 1m → OKX history-candles (first that answers) | open of the 1m candle starting at T, T+1h, T+24h, T−24h | exact | % |
| Expected move | Deribit `get_book_summary_by_currency` (ATM call+put `mark_price`, nearest expiry after T) / DVOL index | T−≤6h (live straddle) or T−5m (DVOL) | n/a | % to expiry (straddle) / % 1σ 1-day (DVOL) |
| Funding | Hyperliquid `fundingHistory` (BTC/ETH perps, hourly). Shown ×8 as an 8h rate | last funding before T−5m | exact | %/8h |
| Open interest | **unavailable, deliberately** (see the positioning decision below) | n/a | n/a | n/a |
| COT | CFTC Traders in Financial Futures (Socrata `gpe5-46if`, BTC 133741, ETH 146021) | latest report **published** before T (as-of Tue, published Fri 15:30 ET) | weekly | contracts |
| Calendar | the app's existing `calendar` data (scheduled macro + high-impact unlocks for tracked tokens) | n/a | daily | n/a |
| Breaking headlines | X Narrative editions (`narrative.json`); headline time from the X status-id snowflake `(id>>22)+1288834974657` | n/a | ~12h (X Narrative cadence) | n/a |

Each macro box has one of these states: `ok` (number + both fixing dates), `waiting` (the first fixing after T is not published yet), `late` (still missing after the series' normal lag + 1 day), `unavailable` (no source or a fetch error, with the reason kept in the file).

## 3. Gating (breaking news)

A headline becomes a breaking event only if:
1. it has an https source link and an exact time (X status id), and
2. in the hour after the headline, BTC or ETH moved more than the **stricter** of **3× the mean |1h move|** and the **98th percentile of |1h moves|**, both over the trailing 30 days (720 closed hourly candles before the headline). Constants: `R.UNUSUAL_X = 3`, `R.UNUSUAL_PCTL = 0.98`, `R.UNUSUAL_WIN_H = 720`. A tracked token named in the headline can also pass, using the same rule on its 1h move relative to BTC.

Evidence (audit fix, `tests/events-gate.mjs`, real Binance 1h closes for 8,759 hours from Nov 2025 to Nov 2026, fixture `tests/fixtures/hourly_btc_eth.json`): the old 2× mean rule let **15.68%** of random hours pass (BTC or ETH). The new rule lets **3.33%** pass (BTC 2.48%, ETH 2.44%). The p98 floor is usually the binding one.

Existing breaking events are re-checked whenever the rule changes (`gate_check.rule`). Ones that fail are kept for the record but marked `qualifies: false`: "Does not qualify", no accent dot, no "See chain" link. They are never forced through. On Nov 8, `2026-11-08-brk-1630` (BTC −0.48% vs a 0.95% threshold) **does not qualify**. `2026-11-08-brk-2220` (BTC +1.21% vs a 1.03% threshold) **qualifies**.

Headlines that pass within 60 minutes of each other form one cluster. A cluster with more than one headline is titled "Market move: cause unclear" and lists the top 3 candidates (best source tier first). A breaking page always says the headline *may* be the cause and is not confirmed. It never has a forecast. Its crypto confidence is always low.

`pulse` (every 15 min) is a cheap BTC/ETH check that writes `data/events/candidates.json`. It never creates events by itself.

## 4. Confidence rules (`events-core.js → confidence`)

- **High**: a measured crypto reaction (1m candles) at a scheduled event, with medium or strong strength.
- **Medium**: a measured crypto reaction that is weak, or a daily macro change across the release whose direction matches the locked view and is not stale.
- **Low**: everything else. That covers stale or late data, a direction against the view, no view, weekly series, and breaking news.

Strength (crypto uses the 1-day 1σ equivalent: DVOL as is; straddle ÷ √(2/π) ÷ √days-to-expiry): bp series weak < 3 ≤ medium ≤ 8 < strong; % series weak < 0.3 ≤ medium ≤ 1.0 < strong; crypto |1h| ÷ (implied 1-day move ÷ √24) weak < 0.5 ≤ medium ≤ 1.0 < strong.

## 5. Lock and replay rules

- A **view** (scenarios with expected yields / dollar / BTC directions, the opposite case and an invalidation rule) and the **consensus** are entered in `data/events/inputs/<id>.json`. `lock <id>` copies them into the event file with `locked_at`. It runs only before T and only when `view.status` is `"final"`. A breaking view is marked `after_news: true`.
- **Frozen fields:** `id, kind, type, at, consensus, view, actual`. Per asset, the frozen fields are `pre.implied, post.ref, post.before24h, post.h1, post.d1, post.to_expiry, pos`. A missing asset may be filled later. A filled value never changes and is never deleted.
- `save()` refuses any edit to a frozen field. `validate [--base REF]` checks every event file against git (CI runs it before each data commit).
- Positioning is frozen only when funding **and** OI are both present, so a partial snapshot (e.g. Bybit refusing a region) can be completed by a later run.
- **Lock proof (audit fix 3):** `locked_at` is written by us, so it proves nothing by itself. A scheduled view counts as a locked forecast only when `lock_proof.verified` is true. That requires:
  1. `lockCommit()`: the first git commit whose copy of the event file holds that exact view (`git log --reverse -- <file>`);
  2. a push recorded by **GitHub's repository activity API** (`GET /repos/nongbirb/crypto-watch/activity`, server-side `timestamp`), made **before the release**, whose `after` commit contains the lock commit (`git merge-base --is-ancestor`).

  `score` records the proof once (`lock_proof` is a frozen field). `validate` re-derives it from git + GitHub on every run and fails on a proof that doesn't match (forged or edited). If it can't be proven (no push before T, API unavailable, or no commit), the page shows **"lock not verified"**, and Replay and the scorecard do not count the view. Proofs older than the API's activity window are kept but noted. After `lock`, commit and push at once (`git add data/events`: the event file, `index.json` and `prelive.json` change); the command prints the exact git line. Tests: `tests/events-lock.mjs`, which includes a live check (commit `13c494e`, first pushed 2026-11-09T09:48:39Z, proves for a 10:00Z release and fails for 09:40Z).
- **Scoring:** the actual print picks the scenario. BTC direction at 1h and 1d is compared with the scenario. Flat rule: a BTC move **strictly below** 0.30% at 1h or 1.00% at 1d is "flat"; **exactly** ±0.30% / ±1.00% counts as a call (up/down). A flat move when the scenario expected up or down is **"Flat · no call"** (TH "ไม่นับ (flat)"): not right, not wrong, and excluded from right/wrong counts. A flat move when the scenario expected flat (in line) is a match. "Wrong" means BTC moved ≥ 1% against the scenario at 1d (in-line: > 2% either way), so a flat 1d move is never "proven wrong". Rules: `dirResult`, `scoreView` (`flat.h1/d1`), `tally` in `events-core.js`; tests in `tests/events.mjs` (edge, just-under, Nov 10 CPI replay: 1h right, 1d no call).
- The **scorecard** reads "X right of Y calls (Z no call)" for the 1-day result. The right/wrong count stays hidden until 10 events with a verified lock are scored ("Shows after 10 scored events · n of 10 so far"); the call and no-call counts are shown under the gate so flat results are never hidden.
- **Priced in** (badge and summary sentence) uses one basis: with an ATM straddle, the BTC move from the release to the option expiry vs the straddle; otherwise the 1-day move vs DVOL or the past average (`EVC.verdict`). The summary repeats the badge's move and reference.
- **Macro "waiting":** a series stays "waiting" until its source publishes the day after the release (FRED H.10 dollar index weekly, EIA WTI to FRED about weekly, H.4.1 Fed balance sheet weekly, FRED VIX with a lag, MOF JGB next business day, ECB USD/JPY ~16:00 CET). The page shows "source not updated yet · latest <date>" and the cadence; no number is filled in. `fetched_at` changes only when a value changes (no empty commits), so it is not a "last tried" time. Retries happen on every hourly events run.
- **Stale "priced in now":** the card refreshes on the scheduled events workflow. GitHub can skip scheduled runs for hours; the card then shows "stale · Nh old" with the reason, never extrapolated numbers.
- "vs past average" uses `data/events/history.json`. That file holds BTC/ETH/token 1h and 1d moves after every official BLS CPI, jobs and PPI release in 2025–2026 (dates from bls.gov schedules, 08:30 ET).

## 5b. v50: "What's priced in now" (before the release)

`node scripts/build_events.mjs prelive` runs hourly in `events.yml` (the :35 run, `continue-on-error`, so it never blocks the data commit). It writes `data/events/prelive.json`, **never the event file**, so no frozen field, lock or lock proof is touched. It covers scheduled non-unlock events released within the next 8 days and stops updating an event once its view is locked. `lock` writes one final copy right after the lock is saved (it reuses the lock's straddle and records `frozen_at`); if that fails, the lock is unaffected. Everything here is an **estimate, for context only**. Scoring still uses the lock's `pre.implied` and the T−5m `pos`.

Per asset (BTC, ETH), from real data only (missing → "unavailable"):
- **Options-implied move:** the Deribit ATM straddle of the nearest expiry more than 1h after the release, same function as `lock` (`impliedLive`, without the 6h limit). Shown with its expiry, snapshot time and the **window it covers: hours before + hours after the release** (snapshot → expiry).
- **Usual move, same window (baseline, auditor fix):** for every past release of the same type in `history.json` (CPI: 21), the |% move| from the same number of hours before the release to the same number of hours after it, from 1-minute exchange candles (Binance → Bybit → OKX). The average is the baseline, with n. This compares like with like: a straddle taken 25h before a CPI release that expires 18.5h after it is compared with past CPI moves over exactly −25h → +18.5h. (We chose this over "ordinary no-news windows" because it measures what the market usually does around this event.)
- **Options vs usual:** ratio = straddle ÷ baseline. Fixed thresholds (`R.EXPECT_RATIO`): **> 1.25 "bigger move than usual"**, **< 0.8 "smaller move than usual"**, otherwise **"usual-size move"**. Needs n ≥ `MIN_PAST_N` (6). Known bias: option prices usually include a volatility risk premium, so ratios a little above 1 are normal; the page says so.
- **Run-up:** % change since the start of the week (Monday 00:00 UTC, shown in local time), over 24h and over 7 days, to the last closed minute.
- **Funding:** latest Hyperliquid hourly funding, shown ×8 as an 8h rate, with its time. **CFTC COT:** latest Traders in Financial Futures report already published, leveraged-funds net (contracts), with report and publish dates.
- The card shows "updated <time> · hourly" and a `stale` tag when older than 2h (GitHub schedules can skip runs), or "frozen at the lock <time>".

## 5c. v50: forecast before the release

Before the lock the page shows the **final** inputs (`inputs/<id>.json`, only when `view.status` is `"final"`) unchanged: consensus (value, source link, cross-check, note) and our view (Hot / In line / Cool ranges, expected yields / dollar / BTC / ETH direction, opposite case, invalidation), labelled **"Forecast (before release)"** and **"not locked yet"**. After `lock` it shows the frozen copy with "locked at <time>" and the lock-proof tag. Expected directions are drawn as dotted chips: our explanation, not measured. ETH has no direction in the Nov 10 CPI view, so it shows "–" with "ETH: no direction set in this view" (no value is invented or changed). Lock semantics, the lock proof, scoring and the event-file schema are unchanged.

## 5d. v50: after the release

A comparison table: print vs consensus; our scenario and whether the view is right / proven wrong / not scored (only with a verified lock); US 2Y and dollar index full-day change vs the expected direction; BTC and ETH at 1h and 1d vs the usual move of past same-type releases (n ≥ 6) and vs the expected direction; and the move to the option expiry vs the locked straddle with the priced-in verdict (§5 D5). A 1–2 line summary is built by fixed rules from those numbers (EN and Thai, no AI): print above / below / equal to consensus (CPI, PPI: hotter / cooler; jobs: stronger / weaker), which scenario that is, BTC's 1-day move, the verdict, and the view result.

## 5e. v50: breaking news that names a token

If a headline names a tracked token but the gate passed only on BTC's or ETH's move (the token itself did not move unusually vs BTC), the page says **"cause unclear"** and shows the token's relative move and threshold (`EVC.tokenUnclear`). `2026-11-09-brk-0625` (names PENDLE; passed on ETH −1.45% vs 1.36%; PENDLE vs BTC −0.34% vs ±1.80%) is cause unclear. The event file is not rewritten; `index.json` gets `cu: true` on the next run.

## 6. Verification (Nov 9, 2026)

- **BLS CPI:** October 2026 CPI releases Tue Nov 10, 2026 at 08:30 ET (bls.gov schedule) = 13:30 UTC = 22:30 JST. BLS will not publish y/y rates for October 2026 (missing October 2025 data).
- **Treasury:** the daily par yield CSV endpoint works. At 17:54 JST on Nov 9, its latest row was 11/06, so the lag is about 1 day.
- **Deribit straddle (Nov 9, 19:07 JST, sample):** BTC 10NOV26 ATM straddle ±1.69% (forward 74,097, strikes 74,000/74,500, ATM IV 41.3%). ETH ±2.40% (forward 2,100.9, ATM IV 58.7%).
- **Deribit:** BTC has 860 live option instruments and ETH 736. 58 expire on 10NOV26/11NOV26, so a live implied move is feasible for the CPI. DVOL is available for BTC and ETH. SOL has no options.
- **Kalshi / Polymarket:** not used (D6).
- **CFTC COT:** the TFF API works. The latest report is as of 2026-11-03 (published 2026-11-06).
- **FRED latest at check time:** DGS2/DGS10/SP500/VIX 11-05, NASDAQCOM 11-06, DTWEXBGS and DEXJPUS 10-30, DCOILWTICO 11-03, WALCL 11-04. FRED's JP 10Y is monthly (hence MOF). The LBMA gold series is gone.
- **Others:** MOF JGB is current to 11/06. ECB is current to 11-06. DefiLlama is current.
- **Live check, Nov 6 jobs report:** BTC −0.54% at 1h and −0.19% at 1d. ETH −0.50% at 1h. DVOL implied move: BTC ±2.17%, ETH ±2.94%. Across the release: US 2Y +5 bp, US 10Y +2 bp, Nasdaq +1.09%, stablecoins −0.41%. The other series show "waiting", which is correct given their fixing times.

## 7. Event-timed jobs

```
node scripts/build_events.mjs sync                 # calendar -> event files (daily; CI hourly)
node scripts/build_events.mjs lock 2026-11-10-cpi  # BEFORE 22:30 JST Nov 10 (ideally ~21:30 JST, <=6h before for live Deribit IV). Set inputs view.status "final" first
node scripts/build_events.mjs score 2026-11-10-cpi # after 23:31 JST Nov 10 (+1h) and after 22:31 JST Nov 11 (+1d); `score` alone does all due
node scripts/build_events.mjs breaking             # after each X Narrative edition
node scripts/build_events.mjs pulse                # every 15 min (CI)
node scripts/build_events.mjs prelive              # hourly (CI): "What's priced in now" -> data/events/prelive.json (informational)
node scripts/build_events.mjs validate --base HEAD # before any data commit
node scripts/build_events.mjs history              # rebuild past-event moves (slow, ~40 min)
```

The actual CPI print is entered by hand into the event file (`actual: {value, unit, url}`) after the release. It is frozen once written.

`.github/workflows/events.yml` runs `pulse` every 15 min, and `sync` + `score` + `breaking` hourly at :35. It always runs `validate` before committing. GitHub schedules are best-effort (often 5–20 min late, sometimes skipped). The results do not depend on the run time, because candles are read at exact timestamps. Only the live options snapshot (`lock`) is time-sensitive, and it is a manual step.

## 8. Known limits

- No Fed odds (D6). No gold (D7). The Fed broad dollar index replaces DXY (D8).
- FRED series lag 1–7 days, so most macro boxes say "waiting for data" for a few days after an event.
- X Narrative runs about every 12h, so breaking events appear up to ~12h late. Breaking views can only be written after the news.
- The DVOL fallback is a 30-day vol, not event-specific, and is labelled that way. The straddle is captured as late as `lock` runs (≤ 6h before T), so it also prices the hours between the snapshot and T.
- The breaking gate is correlation in time, not proof. About 3.3% of random hours pass it on real data. The page says "may be the cause; not confirmed".
- **Positioning decision (audit, non-blocking).** Probe run `42597995875` on a GitHub US runner (`.github/workflows/probe_positioning.yml`) showed:
  - Bybit: **HTTP 403** (CloudFront country block);
  - OKX funding + OI history, Deribit perpetual funding, Kraken futures funding: HTTP 200.

  Reachable is not enough. OKX API Agreement §9.4 forbids displaying its market data to third parties even from public endpoints, Deribit ToS §4.6 limits market data to personal use, Coinbase's Market Data Terms forbid display outside your organisation, and Kraken restricts redistribution. **Chosen:** funding from **Hyperliquid** (a public on-chain venue, already used by Positioning, reachable from runners, no data-display restriction found in its terms). **Open interest is deliberately "unavailable"**, because no free source has display rights and Hyperliquid has no OI history. A snapshot is frozen once funding is in. If funding is still missing 2 days after T, it is frozen as unavailable with the reason, so there are no endless retries. The Nov 6 jobs snapshot was taken from Bybit before this change and stays as recorded (frozen).
- `index.json.launched` is `null` until deploy. Set it to the deploy date so the NEW badge ends after 14 days.
- ETH has no `judgment.json` entry until the next daily judgment run after merge. Markets computes its technical verdict client-side meanwhile.
