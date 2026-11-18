# Audit: Market Health Map, PR #15 (v61)

Audited: `feat/v61-health` after merging `main` (v59 #13, v60 #14) at `02dd48d`, plus the two fixes below at `e833476`.
Spec: the owner's Market Health request (Nov 17), `docs/market-health-plan.md` rev 2 (branch `docs/market-health-plan`), `docs/market-health-p6.md`.

## 1. Verdict

**AGREE, 8.5/10, after the two fixes below (already pushed). From the auditor's side the PR is ready for the owner's "merge".**

## 2. What was done to the branch

1. **Merged `main` into it.** All 10 conflicts were version numbers and lists. v61 was kept everywhere. Main's `bell.js` was added to `index.html`, `sw.js` and `build_min.sh`, both style blocks were kept, and `min/` was rebuilt.
2. **M1 fixed: a degraded day could be locked into history** (`scripts/build_health.mjs`).
   - **Problem:** the first run after 00:00 UTC computed the day's score and appended it to the append-only history. If an exchange hiccup left coins without candles, the universe silently shifted to lower-ranked coins (N stays 100) and that row could never be corrected. A missing BTC candle would lock a null score.
   - **Fix:** a closed day is now treated as degraded when it has no score or more than 3 extra coins without candles compared with the day before. A degraded day is recomputed every run for 6 hours, and only then written.
3. **M2 fixed: a rejected file froze the page silently** (`.github/workflows/health.yml`).
   - **Problem:** validation failure stopped the job before the commit, so `health.json` simply stopped updating.
   - **Fix:** the data is now restored from `HEAD`, nothing is committed, and the job fails visibly. This is the same pattern as `positioning.yml` and `onchain.yml`.

The M1 change is verified by reading and by `node --check`. It could not be dry-run here, because the builder needs about 10 minutes of paced CoinGecko calls.

## 3. Against the owner's request

| Request | Result |
|---|---|
| Two separate indicators, never merged | Yes: Spot Market Health 0–100 (Strong / Healthy / Mixed / Weak) and Leverage Risk (Low … Extreme) |
| Leverage safety 10 % in the score | Removed by the owner's decision Q1 (plan rev 2). Weights are 30 / 25 / 15 / 10 / 10 over 90 |
| Top 100 liquid coins; exclusions | Yes: stablecoins, wrapped, bridged, liquid staking, tokenized assets, duplicates, pegged and illiquid (< $5 M volume) are excluded. On 2026-11-16: 45 category, 21 illiquid, 2 pegged, 6 without candles |
| No score when data is missing | Yes: any missing part or N < 90 gives no score |
| Metrics | Breadth, MA50 / MA200, 30-day highs / lows, volume vs 30-day average, BTC dominance, ETH/BTC, alts beating BTC, category medians, OI and funding |
| Liquidations | ไม่พร้อมใช้งาน: no free market-wide source (CoinGlass is paid; Binance and Bybit are blocked from the runners) |
| Treemap, 1H / 24H / 7D / 30D, group by cap / category / ecosystem, tooltip, each coin once | Yes. 1H is display only. Keyboard support and a table view |
| Simple / Pro modes, "สิ่งที่ควรรู้วันนี้", Thai tooltips, source / time / status chips | Yes |
| 65 / 35 desktop grid, one column under 768 px, no overflow | Yes; `health-ui` checks 360 to 1920 px, EN and TH |

## 4. Formula check (`health-core.js`)

- Spot score: closed daily candles only; the forming candle is dropped and the last closed bar must be the closed UTC day.
- Each coin is checked against CoinGecko's price (more than 25 % off = another token).
- Coins too young for MA200 are left out of that MA rather than counted as below it.
- Volume weight is capped at 10 % per coin.
- The ±3 hysteresis changes labels only, never the number.
- Leverage Risk funding is measured against the 0.01 %/8h default (the Phase 4 lesson), weighted by OI over OKX and Hyperliquid. OI build-up is in coin terms.

## 5. Lower severity (not fixed)

| # | Note |
|---|---|
| L1 | The 7-day OI change compares OKX's newest daily OI (today, still moving) with the coin's 7-day closed-candle change through yesterday; the two windows are offset by up to a day |
| L2 | Leverage Risk covers OKX and Hyperliquid only, the same coverage limit as the Leverage tab |

## 6. Tests

Full run after the merge: 26 of 29 suites pass; every `validate.py` mode passes (the five live-data modes with the 48 h window).

| Suite | Why it failed |
|---|---|
| `eth-token` | Also fails on `main`. The check reads the first token buttons on the page; since the ledger has entries those are the "What changed" strip (MON, LIT, SOL), not the table. Stale test, not a product bug |
| `events-v53` | Also fails on `main`. It needs a macro event in "waiting" state, and none is in that state today. Time-dependent |
| `events-ui` | Passed on a rerun; flaky |
