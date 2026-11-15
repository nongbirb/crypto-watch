# Business pulse, Phase 5 (v58)

Implements section 6 of `docs/architect-proof-layer.md` (branch `claude/wonderful-sagan-55yt2d`, rev 2) and L2 and L3 of `docs/audits/phase3-audit.md` section 3 (L1 no longer applies; hysteresis was not shipped). Branch `business-pulse-p5` from `main` at `0dab281` (the Phase 3 merge). Not merged, no PR.

## What is where
| Part | File |
|---|---|
| Builder: sources, stored daily history, card maths | `scripts/pulse.py` → `data/pulse.json`, called at the end of `scripts/build_onchain.py` (a failure never blocks `onchain.json`) |
| Workflow | `onchain.yml` validates `data/pulse.json` (`continue-on-error`); on rejection it restores the file from `HEAD`, commits `onchain.json` alone, then fails the job (the Phase 4 audit H1 pattern). `heartbeat.yml` now also dispatches `onchain.yml`, with a 170-minute "ran recently" window so it stays about 3-hourly. |
| Validator | `scripts/validate.py pulse [--file F] [--base REF \| --prev FILE] [--now ISO]`: schema, 150 KB cap, known keys and ranges, final days never change, every card number recomputed from the stored history, at most 3 numbers, every number with an `https` source link |
| Card | `pulse.js` (`puHTML`), a section after "Key numbers" on the token page; `style.css` `.pu*` |
| Phase 3 audit L2, L3 | `setup.js` (all-day event = its JST day), `setup-core.js` `event` (no event = grey) |
| Release | `ASSETV` 58, `cw-shell-v58`, `index.html ?v=58`, `pulse.js` in `index.html`, `sw.js` and `build_min.sh`; `min/` rebuilt; test defaults 58 |
| Tests | `tests/pulse-p5.mjs` (node + python, 11 groups), `tests/pulse-ui.mjs` (Chromium, 100 checks); fixture `tests/fixtures/pulse/pulse.json` (a real build on 2026-11-15) |

## Sources, checked live on 2026-11-15
Calls made from this session before building on them (DefiLlama hosts were added to the environment for this):

| Endpoint | Answer | Used for |
|---|---|---|
| `api.llama.fi/summary/fees/{hyperliquid,aave,pendle,lighter,solana,near}?dataType=dailyFees` | 200. `totalDataChart` = `[[ts, usd]]`, one point per UTC day stamped 00:00. `total24h` equals the last complete day (Aave: 11-14 = 2,326,055), and Aave and Pendle already list the day in progress (11-15). Solana / Near are category "Chain": "Transaction fees paid by users". | fees |
| same, `dataType=dailyRevenue` / `dailyHoldersRevenue` | 200. Hyperliquid holders revenue = revenue (69.8 M over 30 days, the Assistance Fund buybacks). Aave holders revenue is 0 on every day. | Aave revenue, HYPE buybacks |
| `api.llama.fi/summary/derivatives/{hyperliquid,lighter}`, `overview/derivatives` | **402** "Upgrade to the paid API plan" | not used: perp volume left out |
| `api.llama.fi/overview/open-interest` | 200. Protocols "Hyperliquid Perps" (5.57 B), "Lighter Perps" (418 M), "Lighter Robinhood Perps" | OI share |
| `api.llama.fi/summary/open-interest/{hyperliquid-perps,lighter-perps}` | 200, daily `totalDataChart`; the newest point (stamped today) equals `total24h` and moves during the day | OI share |
| `api.llama.fi/protocol/{aave,pendle}` | 200, 11 MB / 9 MB. `tvl` points at 00:00 each day plus one live point; `chainTvls.borrowed` (Aave) the same | Pendle TVL, Aave utilisation |
| `api.llama.fi/tvl/{aave,pendle}` | 200, a bare current number | not used (no history) |
| `api.llama.fi/v2/historicalChainTvl/Monad`, `stablecoins.llama.fi/stablecoincharts/{all,Monad}` | 200, daily points at 00:00 (`totalCirculating.peggedUSD` for stablecoins) | Monad TVL, stablecoins; total stablecoin supply |
| `yields.llama.fi/poolsBorrow` | **402** | not used |
| `api.coingecko.com/api/v3/coins/{id}/market_chart?days=70&interval=daily` | 200, points at 00:00 plus one live point | market cap and HYPE price closes |
| `api.coingecko.com/api/v3/coins/markets?ids=monad` | 200. `max_supply` null, `total_supply` 100.68 B, `circulating_supply` 11.83 B | MON unlock share |

Repo files read: `positioning.json` (Coin Metrics exchange flows, SOL / NEAR / HYPE staking and supply, NEAR activity, Blockscout PENDLE holders), `interop.json` (L2BEAT 24 h chain flows), `calendar_auto.json` (DefiLlama unlocks). `flows.json` and `onchain.json` were read but not used: `onchain.json` forward-fills missing days, so its series were not taken as stored history; the same DefiLlama endpoints are called unfilled instead.

## Stored history (Phase 4 lessons)
- `data/pulse.json` keeps `days[YYYY-MM-DD][key]` for 61 closed days plus today, so a 30-day total can be compared with the 30 days before it.
- **A day is stored under the moment it describes:**
  - **DefiLlama fees, revenue and open interest:** a point stamped D 00:00 is day D. The day still in progress is never stored.
  - **TVL, borrowed, stablecoin supply and CoinGecko market cap or price:** a point stamped D 00:00 is the level at the start of D, so it is stored as the close of D − 1. The live point is skipped.
  - **Readings with no upstream history:**
    - Staking share, vePENDLE share, NEAR active accounts and HYPE circulating supply are stored under the UTC day they were read.
    - The L2BEAT 24 h flow and the MON unlock share are stored the same way.
    - Coin Metrics flows carry their own day.
    - A later reading on the same day replaces the earlier one until the day ends.
- **Final days:**
  - A closed day becomes final after a run in which every source answered and every daily series reached that day. A preliminary Coin Metrics day keeps its day open.
  - Otherwise a closed day becomes final 3 days after it ended, with any missing value left null.
  - A final day is never written again, and the validator rejects any change to one.
- **Backfill:** the first run fills the window from the upstream daily series, so the changes that have upstream history appear at once. Readings start on the first run; their 30-day change appears 30 days later (60 for a 30-day total).
- **Fetch load:** the daily series (including the 9–11 MB protocol files) are fetched only while a closed day in the window is not final, which is about once a day.

## The numbers
"30-day change" means one of three things:
- **Level:** the value on day D against day D − 30.
- **30-day total or average:** the 30 days ending D against the 30 days before.
- **Shares:** in percentage points; for signed flows, a difference in the same unit.

| Token | Number | Formula | Source |
|---|---|---|---|
| BTC | Stablecoin supply, all chains | USD-pegged supply at the close | DefiLlama stablecoins |
| BTC | Exchange net flow, 30 days (BTC) | sum of 30 daily net flows (+ = into exchanges) | Coin Metrics Community via `positioning.json` |
| ETH | Exchange net flow, 30 days (ETH) | as BTC | Coin Metrics Community |
| ETH | Ethereum bridge net flow, last 24 h | L2BEAT `chainData.ethereum.netFlow` for the 24 h window of the read | L2BEAT interop |
| HYPE | Fees per day, 30-day average | sum of 30 days ÷ 30 | DefiLlama |
| HYPE | Buybacks per day, 30-day average | holders revenue, sum of 30 days ÷ 30 | DefiLlama |
| HYPE | Buybacks minus new circulating supply, per day | buybacks per day − (circulating supply at D − at D − 30) ÷ 30 × price at the close of D | DefiLlama, Hyperliquid API (`tokenDetails` via `positioning.json`), CoinGecko |
| LIT | Lighter share of Lighter + Hyperliquid perp OI | Lighter Perps ÷ (Lighter Perps + Hyperliquid Perps) | DefiLlama open interest |
| LIT | LIT market cap ÷ annualised Lighter fees | market cap at the close of D ÷ (fees of the 30 days ending D × 12) | CoinGecko + DefiLlama |
| LIT | HYPE market cap ÷ annualised Hyperliquid fees | same, for Hyperliquid | CoinGecko + DefiLlama |
| AAVE | Revenue, 30 days | sum of 30 days | DefiLlama |
| AAVE | Borrow utilisation | borrowed ÷ (borrowed + TVL); DefiLlama counts a lending market's TVL as supplied minus borrowed, so this is borrowed ÷ supplied | DefiLlama |
| AAVE | Market cap ÷ annualised revenue | market cap at the close ÷ (revenue of the 30 days ending D × 12) | CoinGecko + DefiLlama |
| MON | Next unlock, % of circulating supply | `supply_pct` (of max supply) × max supply (total supply when none) ÷ circulating supply; the card names the date and inputs | DefiLlama unlocks via `calendar_auto.json`, CoinGecko |
| MON | Monad TVL | close | DefiLlama |
| MON | Stablecoins on Monad | close | DefiLlama |
| PENDLE | TVL | close | DefiLlama |
| PENDLE | Fees, 30 days | sum of 30 days | DefiLlama |
| PENDLE | Share of supply in vePENDLE | Blockscout top-holder share of the "Pendle: vePendle" contract | Blockscout via `positioning.json` |
| SOL | Share of supply staked | staked ÷ total | Solana RPC via `positioning.json` |
| SOL | Transaction fees, 30 days | sum of 30 days | DefiLlama (chain fees) |
| NEAR | Share of supply staked | staked ÷ total | NEAR RPC + NearBlocks |
| NEAR | Active accounts, one day | as reported for that day | NearBlocks |
| NEAR | Transaction fees, 30 days | sum of 30 days | DefiLlama (chain fees) |

Every ratio on the card states its window: "market cap at the close of D ÷ (sum of the last 30 days × 12)".

## Left out, and why
| Token | Figure | Why |
|---|---|---|
| BTC | Spot ETF net flow | No keyless source the builder can read (the usual ones are HTML pages or need a key) |
| ETH | Staking share | No keyless source among the builder's; `positioning.json` has none for ETH |
| ETH | (third number) | Only two numbers have a source |
| LIT | Perp volume share | DefiLlama's derivatives volume endpoint answers 402 (paid) |
| AAVE | Buyback amount | DefiLlama reports 0 holders revenue for Aave on every day; no other keyless source |
| AAVE | Fees | Three numbers per card: revenue, utilisation and the revenue ratio were kept |
| MON | Bridge net flow | Three numbers per card |
| SOL | Active addresses | No keyless source in the repo or DefiLlama's free API |
| HYPE | "Scheduled" unlock supply | No schedule source; the measured change in circulating supply (Hyperliquid's own figure) is used instead |

The card names the figures left out for lack of a source ("Not shown: …"). Figures left out only because of the three-number limit are not named.

## Phase 3 audit L2 and L3
- **L2:** an all-day calendar date is a JST day, like the times that `calLocal` converts from +09:00. The event line now starts it at 00:00 JST and shows the viewer's local start time ("all day 2026-11-18 JST (from Nov 17, 5:00 AM HST)"). Test: in Honolulu with the page clock 40 h before the JST day starts, the event is inside the 48 h window. The old local-midnight reading put it 59 h away. With the fix undone, the test fails.
- **L3:** "no high-impact event in the next 48 h" is grey, not green. It is the absence of a risk, not evidence either way. Tests: node and Chromium.

## Known limits
- **Late upstream data:**
  - DefiLlama sometimes revises a day after it has been stored. The stored value stays; that is the point of storing.
  - A source that is late beyond the 3-day grace leaves that day null for good.
- **Supply measures:**
  - HYPE's net line uses Hyperliquid's own circulating supply (302 M), not CoinGecko's (238 M, which moves in manual steps). It appears 30 days after the first stored reading.
  - Market cap is CoinGecko's, so its circulating-supply figure feeds the ratios.
- **Open interest:** DefiLlama's open interest for a day is its reading for that day (the newest point moves during the day), and the open day is never stored. The Lighter share counts "Lighter Perps" only, not "Lighter Robinhood Perps" (stock perps).
- **MON unlock share:** it depends on DefiLlama's `supply_pct` (rounded to 2 decimals) and on CoinGecko's supply figures. It changes when the next unlock passes.
- **Readings and missed runs:**
  - Readings are only as frequent as the runs. A UTC day with no run has no reading.
  - The heartbeat now dispatches `onchain.yml`, but GitHub can still skip runs.
- **Data on `main`:** no `data/pulse.json` is committed. The first `onchain.yml` run after the merge creates it, with the backfill.
