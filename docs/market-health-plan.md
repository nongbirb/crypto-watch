# Market Health Map: data audit, formula and build plan (draft for audit, rev 1)

Status: **research only, nothing built.** Written 2026-11-17 (JST) for the auditor to review before any code is written.
Prototype used for every number below: `/workspace/hp-proto/proto.py` + `calc.py` (research scripts on the box, not app code),
raw snapshot `snap.json`, results `result.json`. The snapshot was taken 2026-11-17 13:24–13:32 JST. CoinGecko markets were as of 13:24 JST,
daily candles were closed through 2026-11-16 UTC, and OKX/Hyperliquid derivatives were read at about 13:32 JST.

Ground rules carried over: no mock data, free keyless endpoints only, no edits to locked files, heavy work in Actions, and the score
**บรรยายสภาพตลาด ไม่ใช่สัญญาณ** (descriptive, no measured edge).

---

## 0. What already exists (reuse, don't rebuild)

| Existing piece | What it gives us | Reuse plan |
|---|---|---|
| `scripts/build_screener.py` → `screener.json` (every 3h) | CoinGecko top 250 → top 200 ex-stables, daily candles (Binance vision → Bybit → OKX → Gate), `d50`/`d200`, `vs` (vol ÷ 20d avg), funding, `brk` | Same candle-source chain and `STABLE` list. **Not** reused as-is: it includes the forming candle (MA uses live price), it has no 1h/30d change, no 30d highs/lows, and it uses a 20d volume base. |
| `scripts/klines-lib.mjs` | Keyless candle chain Binance → Bybit → OKX → Hyperliquid spot, with source naming and a closed-candle convention | Use it in the new Node builder. It needs two small, backward-compatible options: `limit` (we need 230 bars, not 1000) and an optional Gate fallback (XMR, KAS, MNT, GT and XDC have no Binance/OKX USDT pair). |
| `scripts/lev_hist.py` note | **Binance USD-M and Bybit are geo-blocked from GitHub's US runners (451/403).** | All derivatives in Actions come from **OKX + Hyperliquid only**. |
| `positioning.json` | OKX long/short account ratio + OKX spot taker flow for the **9 tracked tokens only**; no OI or funding fields | Not enough for top-100 OI/funding. Read-only; we don't extend it. |
| `data/lev/` (locked) | Daily OI/funding history for tracked tokens | Read-only reference; the new history goes in `data/health/`. |
| `app.js` | Browser calls CoinGecko `/coins/markets?ids=…` + `/global` every 5 min for the tracked list | The Health page makes **no CoinGecko calls**. It reads `health.json` only. |
| `#/onchain/health` ("สุขภาพเชน") | Already exists (chain health) | **Name clash**: the new page must use another route id, e.g. `#/breadth`, with the Thai label "สุขภาพตลาด". |

---

## 1. Available metrics: sources, limits, status (each endpoint test-called once on 2026-11-17)

Test calls were made from the box (not a GitHub runner); all returned HTTP 200. Runner reachability comes from the repo's existing workflows.

| Metric | Endpoint (keyless) | Test result | Free? | Rate limit | Licence / attribution | Cadence (proposed) | Status label |
|---|---|---|---|---|---|---|---|
| Universe, price, mcap, volume, 1h/24h/7d/30d change | CoinGecko `GET /api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&price_change_percentage=1h,24h,7d,30d` | 200, 250 rows, 248 KB, `last_updated` 13:22 JST | Free keyless | **~5 calls/min per IP, dynamic** (CoinGecko docs); runner IPs are shared, so 429s are possible | **Attribution required**: "Data provided by CoinGecko" with a link near the data. Docs say keyless is "not recommended for production / scheduled polling". | Hourly Action (1 call) | Delayed ≤ ~60 min |
| BTC dominance, ETH dominance, total mcap/volume | CoinGecko `GET /global` | 200; BTC dom 58.52%, ETH 10.02%, mcap $2.23T | Free | same pool | same | Hourly (1 call) | Delayed. **No free history**: `/global/market_cap_chart` is paid, so we log our own. |
| Category / ecosystem membership, exclusion lists | CoinGecko `GET /coins/markets?category=<id>&per_page=250` (one call per category); id list from `GET /coins/categories/list` (782 ids) | 200 for all 33 categories used | Free | same pool | same | **Daily**, cached in `data/health/categories.json` | Reference data |
| Daily OHLCV (MA50/MA200, 30d highs/lows, volume vs 30d avg) | `data-api.binance.vision/api/v3/klines?symbol=XUSDT&interval=1d&limit=230` → OKX `/api/v5/market/candles?instId=X-USDT&bar=1Dutc&limit=300` → Gate `/api/v4/spot/candlesticks` | Binance 200 (BTC 220 bars); OKX 200; 100/100 universe coins resolved (89 Binance, 11 OKX) | Free | Binance vision 6000 weight/min (klines = 2); OKX 40 req/2s; Gate 200 req/10s | Exchange public market data, attribution "Binance/OKX/Gate". The source is named per coin. | Daily after 00:00 UTC (closed candles only) | Daily close (UTC); "ปิดแท่งวันล่าสุด" |
| ETH/BTC | Derived from CoinGecko 7d/30d changes, or Binance vision `ETHBTC` 1d klines (tested 200) | 200 | Free | — | — | Hourly / daily | Delayed |
| Funding (all perps) | OKX `GET /api/v5/public/funding-rate?instId=ANY` | 200, **809 instruments in one call** | Free | 10 req/2s | OKX | Hourly | Delayed ≤ 60 min |
| OI (all perps) | OKX `GET /api/v5/public/open-interest?instType=SWAP` | 200, 544 instruments, `oiUsd` field | Free | 20 req/2s | OKX | Hourly | Delayed |
| OI history (7d change) | OKX `GET /api/v5/rubik/stat/contracts/open-interest-volume?ccy=X&period=1D` | 200 for 20/20 coins tested | Free | 5 req/2s | OKX | Daily (top 20 by OI) | Estimated (OKX only) |
| Funding + OI (Hyperliquid) | `POST api.hyperliquid.xyz/info {"type":"metaAndAssetCtxs"}` | 200, 235 perps, funding + OI + mark | Free | 1200 weight/min (this call weight 20) | Hyperliquid | Hourly | Delayed |
| Liquidations | OKX `GET /api/v5/public/liquidation-orders?instType=SWAP&state=filled&instFamily=BTC-USDT` | 200, but **100 rows ≈ the last 1 hour of BTC only** | Free | 40 req/2s | OKX | — | **ไม่พร้อมใช้งาน at launch** (see §2) |
| Binance USD-M / Bybit (for reference) | `fapi.binance.com/fapi/v1/premiumIndex`, `api.bybit.com/v5/market/tickers?category=linear` | 200 from the box | Free | — | — | **Not usable in Actions** (geo-blocked on US runners) | — |

Volume caveat (estimate): "spot volume" means the quote volume of the one USDT pair we have candles for (Binance, OKX or Gate),
**not** aggregate market volume. That keeps the numerator and the 30-day base on the same venue. CoinGecko `total_volume` includes
wash-prone venues and has no free history, so it is shown in the tooltip only.

### CoinGecko call budget (the binding constraint)
- Hourly light run: **2 CG calls** (`/coins/markets`, `/global`), plus 3 OKX/HL calls.
- Daily heavy run: +33 CG category calls (13 exclusion + 8 theme + 12 ecosystem), paced ≥13 s apart (~7–8 min), plus ~110–160 candle calls (not CG) and 20 OKX rubik calls.
  The prototype made 35 CG calls at 2.5 s spacing from the box with no 429; runners may fare worse.
- If the category refresh fails, reuse the previous `categories.json` and show its date. Membership changes slowly.
- The browser makes **zero** CoinGecko calls for this page.
- Option (open question Q4): a free CoinGecko **Demo key** (100 calls/min, monthly cap) as a repo secret would remove the 429 risk, but it breaks the "no keys" rule.

---

## 2. Gaps

| Gap | Finding | Launch decision |
|---|---|---|
| **Market-wide liquidations** | CoinGlass is paid. Binance `forceOrder` is websocket-only and geo-blocked from runners. Bybit is geo-blocked. Hyperliquid has no public liquidation feed (only per-user fills). OKX REST returns 100 rows per page per instrument family: BTC alone is ~1 page/hour, so 24h across ~90 perps means hundreds of calls per run, and it would still be OKX only. | **ไม่พร้อมใช้งาน** in Pro Mode with the reason "ไม่มีแหล่งข้อมูล liquidation ทั้งตลาดแบบฟรี". Not in any formula. Phase-2 option: hourly OKX-only collection for BTC/ETH/SOL, labelled "OKX เท่านั้น (ตัวอย่าง)", never called market-wide. |
| **Top-100 OI/funding coverage** | OKX + Hyperliquid covered **91 of 100** universe coins today (OI-weighted funding across $11.05B OI). Binance/Bybit are missing because of runner geo-blocks, so venue weights are skewed toward OKX/HL. | Show coverage ("91/100 เหรียญ, OKX + Hyperliquid") and the badge **Estimated**. |
| **OI history** | OKX rubik gives daily OI history per coin (USD) for free. Hyperliquid has none. | 7d OI change = OKX top-20 by OI, price-adjusted. We also start logging OKX+HL total OI daily in `data/health/history.json`. |
| **BTC dominance history** | No free endpoint. | Log daily from launch. "Dominance 7d change" shows ไม่พร้อมใช้งาน until 7 rows exist. |
| **Category mapping quality** | CoinGecko tags are multi-label and noisy. With the "most specific first" priority (Meme > AI > Gaming > DePIN > RWA > DeFi > L2 > L1), the prototype gave LINK→RWA, XLM→RWA, NEAR→AI, OKB→L2, HYPE→DeFi and DOT→Other. **Gaming had 0 coins** in today's top-100 universe, and DePIN had 3. | See the rules below; Gaming shows ไม่พร้อมใช้งาน "ไม่มีเหรียญในกลุ่มนี้" when n < 3. |
| Ecosystem mapping | With the 12 ecosystem categories, Ethereum got 46 coins, Other 26 and Solana 13. Native L1 coins without their own ecosystem tag fall into Other. | Rule below. |

**Primary category rule (each coin once per view).** Proposal for audit:
1. A manual override table (in the script, reviewed in the PR, listed on the methodology page) for the ~10 coins whose tags mislead,
   e.g. LINK → อื่นๆ (Oracle) and OKB → อื่นๆ (exchange token).
2. Otherwise **base layer first**: a chain's own native asset → L1 or L2.
3. Then theme priority: Meme > AI > Gaming > DePIN > RWA > DeFi.
4. Otherwise "อื่นๆ".

Base-layer-first puts NEAR/XLM/ICP under L1 rather than AI/RWA, which matches how beginners think of them. Both orders are deterministic.
The category medians in §4 used the prototype's specific-first order and will shift slightly. The same primary category is used for the
treemap grouping **and** the category medians, so the numbers on screen agree. Ecosystem: a native asset maps to its own chain if listed,
else "L1 อื่นๆ"; a token maps to the first match in [Bitcoin, Ethereum, Solana, BNB Chain, Base, Arbitrum, Tron, Hyperliquid, Sui, Avalanche, TON, Cosmos], else "อื่นๆ".

---

## 3. Universe filter rules (concrete)

Start: CoinGecko `/coins/markets` top 250 by market cap. Walk down by rank and keep the first **100** coins that pass every rule:

1. **Category exclusion.** The coin is in any of these CoinGecko categories (membership from the daily category calls):
   `stablecoins`, `yield-bearing-stablecoins`, `us-treasury-backed-stablecoin`, `wrapped-tokens`, `bridged-tokens`, `binance-peg-tokens`,
   `liquid-staking-tokens`, `liquid-restaking-tokens`, `leveraged-token`, `tokenized-btc`, `tokenized-gold`, `tokenized-commodities`,
   `tokenized-stock`, `tokenized-exchange-traded-funds-etfs`, `tokenized-treasuries`, `tokenized-money-market-fund-mmfs`,
   `tokenized-credit`, `tokenized-private-credit`, `tokenized-closed-end-funds-cefs`.
   The last six were added after the prototype, because rank 9 `figure-heloc` (tokenized HELOC credit) would otherwise enter.
   A test must assert ONDO, LINK and other protocol tokens are **not** caught.
2. **Symbol/id backstop** (from `build_screener.py`): the `STABLE` symbol set; symbol ending in `usd`; id starting with `wrapped`/`staked`/`bridged`/`binance-peg`.
3. **Peg heuristic**: price between $0.97 and $1.03 **and** |30d change| < 1.5%. This caught 3 unlisted stables today.
4. **Liquidity**: CoinGecko 24h volume ≥ **$5M**, **and** a spot USDT pair with ≥ 31 closed daily candles from Binance → OKX → Gate.
   The last candle must be ≤ 3 days old, and its close must be within 25% of the CoinGecko price (ticker-collision guard, cf. the old LIT/Litentry case).
   Today $5M excluded LEO, KCS, NEXO, VET and FLR (VET had $4.3M).
5. **Dedup**: one row per CoinGecko id; if two ids share a symbol, keep the higher market cap and drop the other ("duplicate-symbol", 1 case today).

Today: 100 coins qualified, and the 100th was rank 213. Exclusions were 60 illiquid, 58 stable/tokenized/bridged/pegged and 23 without spot candles
(XMR, KAS, MNT, BGB, GT, XDC, WBT, …; the Gate fallback should recover several), plus 1 duplicate. Coins with < 200 closed candles
(HYPE, GRAM, VVV, AERO, CARDS) stay in the universe but are left out of the MA200 denominator only.
**If fewer than 90 coins qualify, no score is shown.**
Each day's universe (ids in rank order + exclusion counts by reason) is written into that day's history row (§5) to avoid survivorship bias.

---

## 4. Scoring formula

All components are 0–100. `clamp(x,a,b)=min(b,max(a,x))`. N = universe size. "Closed day" = last completed UTC daily candle.

### 4.1 Spot Market Health (0–100)
| # | Component | Formula | Notes |
|---|---|---|---|
| B | Breadth | `B = 0.4·Adv24 + 0.6·Adv7`, where AdvX = % of coins with X-change > 0 (CoinGecko rolling) | Already 0–100. 7d weighted higher because 24h is noisy. |
| M | MA trend | `M = 0.5·%>MA50 + 0.5·%>MA200` (closed close vs SMA of closed closes; MA200 only for coins with ≥200 bars) | 0–100 |
| V | Volume confirmation | `R` = median over coins of (closed-day quote vol ÷ mean of the previous 30 closed days). `d` = (Σvol of coins up on the closed day − Σvol of coins down) ÷ Σvol, in [−1,1]. `w = clamp((R−0.5)/1.0, 0, 1)`. **`V = 50 + 50·d·w`** | Thin volume → neutral 50. Heavy volume amplifies the direction it confirms. A volume spike on a red day lowers the score (fixes "high volume = healthy"). |
| H | 30d highs vs lows | `nh` = coins whose closed close ≥ max of the prior 30 closes; `nl` = ≤ min. **`H = 50 + 50·(nh−nl)/max(nh+nl, 10)`** | The floor of 10 (10% of N) stops "1 high, 0 lows" from scoring 100. |
| P | BTC–alt participation | `s24` = median alt 24h change − BTC 24h; `s7` = same for 7d (pp). **`P = 50 + 50·(0.5·clamp(s24/5,−1,1) + 0.5·clamp(s7/10,−1,1))`** | Alts trailing BTC → < 50 ("BTC masks weakness"); alts leading → > 50. |
| L | Leverage safety | `100 − LeverageRisk` | **See Q1. Recommended: leave it out.** |

- **Option A (recommended): Spot = (30B + 25M + 15V + 10H + 10P) / 90.** Spot and Leverage are never mixed, which honours "never merge them".
- **Option B (as written in the spec): Spot = (30B + 25M + 15V + 10H + 10P + 10L) / 100.**
- Final value: `round(clamp(score, 0, 100))`.

**Bands:** ≥ 70 Strong · 55–69 Healthy · 40–54 Mixed · < 40 Weak.

**Missing data:**
- A component counts only if its inputs cover ≥ 90% of the universe and its source isn't stale.
- Staleness limits: CoinGecko snapshot > 3h old; candles > 36h after the last close.
- If **any** spot component is missing, the page shows **no score** ("ไม่พร้อมใช้งาน — ขาด: …"), while every metric that is available still shows its own value.
- No renormalising around a missing spot component.

### 4.2 Leverage Risk (separate label, never added into Spot under Option A)
Inputs: OKX USDT-SWAP + Hyperliquid perps for universe coins. Funding is normalised to an 8h equivalent (OKX from its funding interval, HL hourly × 8).

| # | Component | Formula |
|---|---|---|
| F | Funding crowding | `f̄` = OI-weighted mean funding (%/8h). **`F = clamp(100·|f̄ − 0.01|/0.09)`**. 0.01%/8h baseline → 0; ±0.10%/8h (~110%/yr) → 100. Negative funding also counts (crowded shorts). |
| O | OI build-up | For the top 20 coins by OKX OI: OI 7d change in coin terms = `(OI_t/OI_t−7)/(1+price_7d) − 1`, OI-weighted. **`O = clamp(100·max(0, oc)/30)`**. +30% in 7d → 100; falling OI → 0. |
| X | Extreme-funding share | `x` = % of covered perps with |funding| ≥ 0.05%/8h. **`X = clamp(4·x)`**. 25% of coins extreme → 100. |

- **LeverageRisk = 0.40F + 0.35O + 0.25X**, clamped 0–100.
- Bands: < 20 Low · 20–39 Normal · 40–59 Elevated · 60–79 High · ≥ 80 Extreme.
- Required: F, O and X, plus funding coverage ≥ 70 coins. Otherwise no label.
- Liquidations are not an input at launch (§2).
- Every threshold here is a judgment call (opinion), not fitted.

### 4.3 Worked example: real data, 2026-11-17 13:24–13:32 JST (N = 100)
| Item | Raw | Component |
|---|---|---|
| Adv 24h / Adv 7d | 53% / **7%** (93% fell over 7d) | B = 0.4·53 + 0.6·7 = **25.4** |
| % > MA50 / % > MA200 | **3%** (100 coins) / **22.1%** (95 coins) | M = **12.6** |
| Volume | median R = 0.64×; closed-day volume-weighted direction d = −0.87; w = 0.14 | V = 50 + 50·(−0.87)(0.14) = **44.0** |
| 30d highs / lows | 0 / 18 | H = 50 + 50·(−18/18) = **0** |
| Participation | BTC 24h −0.17%, alt median +0.09% (s24 = +0.25pp); BTC 7d −13.10%, alt median −12.73% (s7 = +0.37pp) | P = **52.2** |
| **Spot (Option A)** | (30·25.4 + 25·12.6 + 15·44.0 + 10·0 + 10·52.2)/90 | **25 → Weak** |
| Funding | OI-weighted f̄ = 0.004%/8h over 91 coins, $11.05B OI (OKX+HL) | F = **6.4** |
| OI 7d (coin terms, OKX top 20) | −6.9% (BTC −10.8%, ETH −2.9%, SOL −5.7%; TRX +18.7%, ZEC +3.5%) | O = **0** |
| Extreme funding share | 0% of 91 | X = **0** |
| **Leverage Risk** | 0.4·6.4 + 0 + 0 | **2.6 → Low** |
| Spot (Option B) | adds 10·(100−2.6) | 32 → Weak (same band; leverage safety lifts a Weak market by 7 points, which is why Option A is cleaner) |

Context metrics (shown, not scored):
- BTC dominance 58.5% (CoinGecko, includes stablecoins in the denominator); 69.4% of our ex-stable universe.
- ETH/BTC −0.7% over 7d and −4.7% over 30d.
- Alts beating BTC: 55.6% over 7d, 27.6% over 30d.
- OI/mcap (OKX+HL) 0.59%.
- Category median 7d: AI −9.0% (13), Other −11.5% (11), DePIN −12.4% (3), L1 −12.6% (24), L2 −12.8% (6), RWA −13.1% (7), DeFi −13.8% (27), Meme −14.9% (9), Gaming n/a (0).

Auto Thai summary for this snapshot (deterministic template, no LLM):
"BTC −13.1% ใน 7 วัน และ 93% ของเหรียญที่ติดตามลง: อ่อนแอทั้งตลาด ไม่ใช่แค่ BTC · มีเหรียญทำจุดต่ำสุดรอบ 30 วัน 18 เหรียญ ไม่มีเหรียญไหนทำจุดสูงสุด · Leverage Risk ต่ำ: funding ใกล้ศูนย์และ OI ลดลง (ล้าง leverage ไปแล้ว ไม่ได้แปลว่าปลอดภัยที่จะซื้อ)"

Template rules:
- Concentration line when BTC 7d > 0 and Adv7 < 40 → "แรงกระจุกอยู่ที่ BTC".
- When both are down → "อ่อนแอทั้งตลาด".
- When Adv7 ≥ 60 and P ≥ 55 → "เหรียญส่วนใหญ่ขึ้นตาม".
- Every sentence is descriptive; banned words are checked against `scripts/thai_blocklist.txt` plus "น่าซื้อ/ควรขาย/จะขึ้น/จะลง".

Honesty note for the methodology page:
- The weights are the user's starting point, not fitted. B, M and H all measure trend and are correlated, so ~65% of the weight sits on one underlying factor.
- With N = 100, one coin is one point of breadth.
- Validity can be judged only after 60–90 days of logged history, by looking at stability, component correlation, and the distribution of band changes. It is still not an "edge" claim.

---

## 5. Architecture

### Workflow: `.github/workflows/health.yml`
- `cron: '23 * * * *'` (hourly light run) plus a heavy step when the latest closed UTC day isn't in history yet (first run after 00:00 UTC ≈ 09:23 JST). `workflow_dispatch` too.
- Add it to the `heartbeat.yml` dispatch list, as with positioning.
- `concurrency: health`, timeout 20 min.
- Same commit/rebase loop as screener.
- `scripts/validate.py health` runs before the commit; on failure the job keeps the previous files and goes red.

### Builder
- `scripts/build_health.mjs` (Node). It reuses `scripts/klines-lib.mjs` (adds `limit` and the Gate fallback; defaults unchanged for current callers).
- Pure math lives in `health-core.js` (UMD like `lev-core.js`/`verdict-core.js`): the same code runs in the Action and in the browser (tooltips' "today's value means …") and in the tests.

### Outputs
- **`health.json`** (root, like `screener.json`, ~30 KB), overwritten every hour.
- **`data/health/history.json`**: append-only, one row per closed UTC day. The validator rejects edits to past rows (compares with `HEAD`).
- **`data/health/categories.json`**: daily membership cache with `fetched` date.

```jsonc
// health.json
{ "v": 1, "updated": "2026-11-17T04:32:00Z",              // ISO UTC; UI renders viewer-local time + zone label (existing tzL())
  "sources": { "cg_markets": {"at": "...Z", "status": "delayed"}, "cg_global": {...}, "candles": {"closed_day": "2026-11-16", "status": "daily_close"},
               "okx": {"at": "...Z", "status": "delayed"}, "hl": {...}, "categories": {"fetched": "2026-11-17"} },
  "universe": { "n": 100, "last_rank": 213, "excluded": {"illiquid": 60, "stable": 36, ...} },
  "spot":     { "score": 25, "band": "Weak", "option": "A", "missing": [],
                "comp": { "B": {"v": 25.4, "adv24": 53, "adv7": 7, "cov": 100}, "M": {...}, "V": {...}, "H": {...}, "P": {...} } },
  "leverage": { "score": 2.6, "band": "Low", "coverage": 91, "venues": ["okx","hyperliquid"], "status": "estimated",
                "comp": { "F": {...}, "O": {...}, "X": {...} }, "liquidations": null, "liq_reason": "no_free_marketwide_source" },
  "context":  { "btc_dom": 58.5, "btc_dom_ex_stables": 69.4, "ethbtc_7d": -0.7, "ethbtc_30d": -4.7, "alts_beat_btc_7d": 55.6, ... },
  "categories": [ {"k": "L1", "n": 24, "med": {"1h":..,"24h":..,"7d":-12.6,"30d":..}, "adv7": ..}, ... ],
  "coins": [ {"id":"bitcoin","s":"BTC","n":"Bitcoin","rank":1,"p":64905,"mc":1.305e12,"v":3.28e10,
              "c":{"1h":0.87,"24h":-0.17,"7d":-13.1,"30d":-20.5}, "cat":"L1","eco":"Bitcoin","src":"binance",
              "ma50":false,"ma200":false,"hi30":false,"lo30":false,"vr":0.9}, ... ],
  "summary_th": ["...", "..."], "summary_en": ["...", "..."], "know_today_th": ["...", "...", "..."] }
// data/health/history.json rows: { "d": "2026-11-16", "spot": 25, "band": "Weak", "comp": {...}, "lev": 2.6, "lev_band": "Low",
//   "btc_dom": 58.5, "oi_usd": 1.105e10, "universe": ["bitcoin","ethereum", ...100 ids], "excluded": {...}, "formula": "v1A" }
```
`formula` is versioned, so a later weight change never silently rewrites history.

### UI
- New lazy module `health.js` (loaded via the existing `loadJS`), route `#/breadth`, Thai label "สุขภาพตลาด".
- A compact card in Markets "สรุปประจำวัน" (score + band + Leverage label) links to it.
- Placement in NAV vs More: Q6.

**Simple Mode (default)**
- Top: two separate score cards (Spot, Leverage Risk), each with its band word, a ▲▼/icon and the Thai summary.
- Treemap with tabs 1H/24H/7D/30D and grouping market cap / category / ecosystem.
- Five metrics: Adv/Dec, % > MA200, 30d highs vs lows, Volume vs 30d, BTC dominance.
- "สิ่งที่ควรรู้วันนี้": 3 template bullets (+ events in the next 24h read from the existing events data).

**Pro Mode** (toggle saved in localStorage) adds MA50/MA200 breadth, OI, funding, the liquidations card (ไม่พร้อมใช้งาน), category breadth, a history sparkline from `history.json`, and methodology.

**Layout**
- `max-width: 1400px`.
- ≥ 1024px: grid `65fr 35fr`, gap 24px; treemap left; breadth/dominance/volume/leverage right; category table full-width below.
- 768–1023px: same columns at 60/40 or stacked.
- < 768px: one column, treemap first, 44px tap targets, no horizontal overflow, no `overflow:hidden` hacks.

**Tooltips.** Each metric has a Thai tooltip in three parts: what it is, why it matters, and today's value read in words (generated by `health-core.js`).
They are reachable by keyboard and touch (button + `aria-describedby`, Esc closes).

**Per-metric failure.** A failure shows ไม่พร้อมใช้งาน plus the reason on that card only. Source, update time (viewer-local + zone) and a status chip
(Real-time / Delayed / Estimated / Daily close) sit on every card. Footer: "Data provided by CoinGecko" link, plus OKX, Hyperliquid and Binance.

**Treemap: no library.**
- Own squarified layout (Bruls–Huizing–van Wijk, ~80 lines in `health-core.js`, unit-testable), rendered as absolutely positioned `<button>` tiles in HTML, not canvas.
- That gives native focus, labels, text wrapping and screen-reader names (e.g. "BTC Bitcoin −13.1% 7 วัน, มูลค่าตลาด $1.31T").
- Two-level layout for grouping: groups first, then coins inside. A coin has exactly one group per view, so it appears once.
- Colour is a diverging scale clamped per tab (1H ±3%, 24H ±8%, 7D ±20%, 30D ±40%). Every tile big enough also shows ▲/▼ and the % text.
- A "ดูเป็นตาราง" toggle gives a sortable table with the same data, the accessible and mobile fallback.
- Keyboard: arrow keys move between tiles in reading order, Enter opens the tooltip/detail, Esc closes.
- `prefers-reduced-motion` is respected.
- Why not d3 / ECharts: ~100 tiles don't need them, they'd add 90–300 KB to a PWA shell, and the existing `lightweight-charts` has no treemap.

### Files to add / change (PR targets v60, after the v59 bell/bullets PR)
- **Add:**
  - `scripts/build_health.mjs`, `health-core.js`, `health.js`, `.github/workflows/health.yml`
  - `health.json`, `data/health/history.json`, `data/health/categories.json` (all Action-written)
  - `tests/health-core.mjs`, `tests/health-ui.mjs`
  - `tests/fixtures/health/` (a **recorded real snapshot**, e.g. today's, used only by tests, labelled as such; not mock data in the app)
  - this doc moved to `docs/market-health-p6.md` with a "what is where" table
- **Change:**
  - `scripts/klines-lib.mjs` (`limit` option + Gate fallback, defaults unchanged)
  - `scripts/validate.py` (new `health` kind: schema, ranges, N ≥ 90, unique ids, freshness, history append-only)
  - `app.js` (ROUTES + nav entry + Markets summary card + `ASSETV` 60)
  - `i18n.js` (TH/EN strings and tooltips)
  - `style.css` (grid, treemap, chips)
  - `index.html` (`?v=60`, `health-core.js`), `sw.js` (`cw-shell-v60`), `scripts/build_min.sh` (+`health-core`, `health`), `min/` rebuilt
  - `.github/workflows/heartbeat.yml` (dispatch health)
- **Untouched (locked):** `data/ledger/`, `data/sm/`, `data/lev/`, `data/pulse.json`, `*_backtest.json`, `smart_money.json`, `positioning.json`, `onchain.json`, `data/events/`, `reports/`.
  `build_screener.py` is unchanged too (Q5).

### Test plan
- **Node (`tests/health-core.mjs`)**
  - Each component formula against hand-computed values from the recorded fixture (today's B 25.4, M 12.6, V 44.0, H 0, P 52.2, Spot 25, Lev 2.6).
  - Clamps at extremes, the missing/stale rules (no score), band edges (39/40, 54/55, 69/70), and leverage band edges.
  - Universe filter: figure-heloc, USDT and stETH excluded; ONDO, LINK and HYPE kept; dedup; ticker-collision guard.
  - Squarify: areas ∝ mcap within 1%, no overlap, each id once per grouping.
  - Thai summary: no blocklisted or predictive words.
- **Validator**: `validate.py health` rejects a past-row edit, N < 90, duplicate ids, future dates and out-of-range scores.
- **Chromium (`tests/health-ui.mjs`)**
  - Viewports 1440, 1024, 800 and 390 px: no horizontal overflow (`scrollWidth ≤ clientWidth`), 65/35 widths at ≥ 1024, single column < 768, treemap before the metrics on mobile, chart text not clipped.
  - Keyboard: tab order, arrow keys across the tablist and tiles, `aria-selected`/`tabpanel` wiring, Esc closes the tooltip.
  - States from fixtures: loading skeleton; empty (`coins: []`); stale (`updated` 5h old → stale chip, spot score hidden); a single-source error (OKX missing → only the leverage cards show ไม่พร้อมใช้งาน); `health.json` 404 → a page-level error with retry.
  - Simple ↔ Pro toggle persists; Thai and English.
- **Release**: existing suites green, `ASSETV`/`cw-shell`/`?v` all 60, `min/` rebuilt, `release-check` on the live Pages build (desktop + phone, numbers vs a second source such as CoinGecko's site for BTC dominance).

---

## 6. Risks and open questions

**Risks**
1. CoinGecko keyless is officially "not for scheduled polling" and limited to ~5/min on shared runner IPs. Mitigations: 2 calls/hour, cached categories, backoff. The worst case is a few hours of stale data with a clear stale chip.
2. Derivatives are OKX + Hyperliquid only (Binance/Bybit geo-blocked). Leverage Risk is therefore an **estimate** of part of the market, and an OKX/HL-specific funding quirk can move it.
3. Correlated components: B, M and H move together, so the score is mostly "trend", and it reacts late at turns.
4. A "Low" Leverage Risk in a crash (like today) can read as "safe". The copy must say "leverage ถูกล้างไปแล้ว ไม่ได้แปลว่าปลอดภัย".
5. Category tags drift. The overrides need occasional review; Gaming/DePIN are often too thin to show.
6. The universe walks to rank ~213 to find 100 liquid coins. Thresholds change membership day to day, which is why each day's list is stored.
7. The 1H tab is at most ~60 min delayed (hourly snapshot). Label it, or drop 1H from the tabs (Q3).

**Open questions for the user / auditor**
- Q1. Leverage safety inside the Spot score (Option B, as in the spec) or kept fully separate (Option A, recommended)? The spec says both "never merge" and "leverage safety 10%".
- Q2. Are the thresholds acceptable as judgment calls (funding 0.10%/8h = 100, OI +30%/7d = 100, extreme funding 0.05%/8h, liquidity $5M)?
- Q3. Keep the 1H tab with a "ล่าช้า ≤ 60 นาที" label, or drop it?
- Q4. Accept a free CoinGecko Demo key as a repo secret if keyless 429s become frequent? This breaks "no keys".
- Q5. Leave `build_screener.py` untouched (some duplicated filter logic) or refactor the shared filters into one module (touches a working pipeline)?
- Q6. Where does the page live: NAV (which is already full after v59) or More, plus the Markets card?
- Q7. Primary-category order (base-layer-first proposed) and the initial override list.
- Q8. Band hysteresis (e.g. require ±2 points past an edge before the label changes) or none at launch?
