# Events v1 (v49): spec

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

  `score` records the proof once (`lock_proof` is a frozen field). `validate` re-derives it from git + GitHub on every run and fails on a proof that doesn't match (forged or edited). If it can't be proven (no push before T, API unavailable, or no commit), the page shows **"lock not verified"**, and Replay and the scorecard do not count the view. Proofs older than the API's activity window are kept but noted. After `lock`, commit and push at once; the command prints the exact git line. Tests: `tests/events-lock.mjs`, which includes a live check (commit `13c494e`, first pushed 2026-11-09T09:48:39Z, proves for a 10:00Z release and fails for 09:40Z).
- **Scoring:** the actual print picks the scenario. BTC direction at 1h and 1d is compared with the scenario. Flat thresholds are 0.3% at 1h and 1.0% at 1d. "Wrong" means BTC moved ≥ 1% against the scenario at 1d (in-line: > 2% either way).
- The **scorecard** stays hidden until 10 events with a verified lock are scored. Before that it shows "0 of 10 so far".
- "vs past average" uses `data/events/history.json`. That file holds BTC/ETH/token 1h and 1d moves after every official BLS CPI, jobs and PPI release in 2025–2026 (dates from bls.gov schedules, 08:30 ET).

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
