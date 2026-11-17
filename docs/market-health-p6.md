# Market Health Map (P6, PR v61)

## What is where
| Piece | File |
|---|---|
| Formula, bands, hysteresis, treemap layout (shared Node + browser, UMD `HMC`) | `health-core.js` |
| Data job: universe, closed candles, derivatives, `health.json`, history append | `scripts/build_health.mjs` |
| Candle fetch (Binance → OKX → Gate, `opts.limit/min/check`) | `scripts/klines-lib.mjs` |
| Page `#/breadth` (More → สุขภาพตลาด): Simple/Pro, treemap, table, tooltips, history | `health.js`, `.hm*` in `style.css` |
| Output: latest snapshot | `health.json` |
| Output: append-only daily history (universe ids + formula version) | `data/health/history.json` |
| Output: CoinGecko category cache (refreshed daily, top-250 ids only) | `data/health/categories.json` |
| Schema, ranges, append-only check | `scripts/validate.py health` |
| Schedule: hourly at :23, heavy step once per closed UTC day | `.github/workflows/health.yml` (+ `heartbeat.yml`) |
| Tests | `tests/health-core.mjs`, `tests/health-ui.mjs`, fixtures in `tests/fixtures/health/` |

The plan below is the audited rev 2 (also on branch `docs/market-health-plan`).

---

# Plan: data audit, formula and build plan (rev 2, after audit)

Status: rev 2, 2026-11-17 (JST). Rev 1 was audited; this revision applies the auditor's fixes (a)–(g) and the user's decisions:
- **Q1** leverage safety is removed from the Spot score (weights renormalised over 90).
- **Q3** the 1H tab stays, display-only (never scored).
- **Q4** no CoinGecko key.
- **Q6** the page lives under More.
- **Q8** ±3 hysteresis on band labels only; the number always shows the true value.

Implementation: branch `feat/v61-health` (PR v61).
The §1–§3 test calls were made from rev-1 prototype scripts (`/workspace/hp-proto/`).
The **§4 worked example is rev 2**, recomputed with the real builder `scripts/build_health.mjs` on 2026-11-17 13:58–14:07 JST:
- closed day: 2026-11-16 (UTC)
- CoinGecko markets: 13:58 JST
- OKX/Hyperliquid: 14:07 JST

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
| Daily OHLCV: **the only input of the official score** (breadth 1d/7d, MA50/MA200, 30d highs/lows, volume) | `data-api.binance.vision/api/v3/klines?symbol=XUSDT&interval=1d&limit=230` → OKX `/api/v5/market/candles?instId=X-USDT&bar=1Dutc&limit=300` → Gate `/api/v4/spot/candlesticks` | Binance 200 (BTC 220 bars); OKX 200; 100/100 universe coins resolved (89 Binance, 11 OKX) | Free | Binance vision 6000 weight/min (klines = 2); OKX 40 req/2s; Gate 200 req/10s | Exchange public market data, attribution "Binance/OKX/Gate". The source is named per coin. | Daily after 00:00 UTC (closed candles only) | Daily close (UTC); "ปิดแท่งวันล่าสุด" |
| ETH/BTC | Derived from CoinGecko 7d/30d changes, or Binance vision `ETHBTC` 1d klines (tested 200) | 200 | Free | — | — | Hourly / daily | Delayed |
| Funding (all perps) | OKX `GET /api/v5/public/funding-rate?instId=ANY` | 200, **809 instruments in one call** | Free | 10 req/2s | OKX | Hourly | Delayed ≤ 60 min |
| OI (all perps) | OKX `GET /api/v5/public/open-interest?instType=SWAP` | 200, 544 instruments, `oiUsd` field | Free | 20 req/2s | OKX | Hourly | Delayed |
| OI history (7d change) | OKX `GET /api/v5/rubik/stat/contracts/open-interest-volume?ccy=X&period=1D` | 200 for 20/20 coins tested | Free | 5 req/2s | OKX | Daily (top 20 by OI) | Estimated (OKX only) |
| Funding + OI (Hyperliquid) | `POST api.hyperliquid.xyz/info {"type":"metaAndAssetCtxs"}` | 200, 235 perps, funding + OI + mark | Free | 1200 weight/min (this call weight 20) | Hyperliquid | Hourly | Delayed |
| Liquidations | OKX `GET /api/v5/public/liquidation-orders?instType=SWAP&state=filled&instFamily=BTC-USDT` | 200, but **100 rows ≈ the last 1 hour of BTC only** | Free | 40 req/2s | OKX | — | **ไม่พร้อมใช้งาน at launch** (see §2) |
| Binance USD-M / Bybit (for reference) | `fapi.binance.com/fapi/v1/premiumIndex`, `api.bybit.com/v5/market/tickers?category=linear` | 200 from the box | Free | — | — | **Not usable in Actions** (geo-blocked on US runners) | — |

**Rev 2 rule (a):** the official score uses only closed daily candles from the same exchange pair as the price (Binance → OKX → Gate, one source per coin). Hourly CoinGecko data feeds only the unscored "ภาพระหว่างวัน" (intraday view): the treemap, the 1h–30d category medians and the table.

Volume caveat (estimate, rule (b)): "spot volume" is the quote volume of that same exchange pair from its candles, never CoinGecko `total_volume`, and **not** aggregate market volume. That keeps the numerator and the 30-day base on the same venue. CoinGecko `total_volume` includes
wash-prone venues and has no free history, so it is shown in the tooltip only.

### CoinGecko call budget (the binding constraint)
- Hourly light run: **2 CG calls** (`/coins/markets`, `/global`), plus 3 OKX/HL calls.
- Daily heavy run: +33 CG category calls (13 exclusion + 8 theme + 12 ecosystem), paced ≥13 s apart (~7–8 min), plus ~110–160 candle calls (not CG) and 20 OKX rubik calls.
  The prototype made 35 CG calls at 2.5 s spacing from the box with no 429; runners may fare worse.
- If the category refresh fails, reuse the previous `categories.json` and show its date. Membership changes slowly.
- The browser makes **zero** CoinGecko calls for this page.
- Option (Q4, decided: no key): a free CoinGecko **Demo key** (100 calls/min, monthly cap) as a repo secret would remove the 429 risk, but it breaks the "no keys" rule.

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

**Rule (g), explicit exclusions:** stablecoins (fiat, crypto-backed, yield-bearing, treasury-backed), wrapped, bridged and exchange-pegged tokens, staked/LST and restaked tokens, leveraged tokens, and tokenized assets (BTC wrappers, gold/commodities, stocks, ETFs, treasuries, money-market funds, credit/private credit, closed-end funds). The category ids are below.

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

Today (real build, closed day 2026-11-16; same numbers as §4.3): 100 coins qualified, and the 100th was CoinGecko rank 174.
Excluded on the way: 45 by category, 21 illiquid, 6 without usable spot candles (after the Gate fallback), and 2 pegged-price.
Rev 1's prototype (rank 213; 60/58/23) predates the Gate fallback and the category cache, and is superseded.
Coins with < 200 closed candles (6 today, e.g. HYPE, VVV) stay in the universe but are left out of the MA200 denominator only.
**If fewer than 90 coins qualify, no score is shown.**
Each day's universe (ids in rank order + exclusion counts by reason) is written into that day's history row (§5) to avoid survivorship bias.

---

## 4. Scoring formula (rev 2)

All components are 0–100. `clamp(x,a,b)=min(b,max(a,x))`.

**Rule (a): one input for the official score.** Each universe coin has one source of closed daily candles, from the same pair as its price (Binance → OKX → Gate). The candle must be for the closed UTC day, and its close must be within 25% of the CoinGecko price.

From those candles we compute:
- `d1` = last close ÷ previous close − 1
- `d7` = 7 closes back, `d30` = 30 closes back
- MA50 and MA200 (SMA of closes)
- `hi30` / `lo30` = last close ≥ / ≤ the extreme of the previous 30 closes
- `q` = last day's quote volume, and `vr` = q ÷ mean of the previous 30 days' q

CoinGecko's rolling 1h/24h/7d/30d changes are **never** scored. They feed only the intraday view.

**Rule (c): coverage is per component, on eligible coins.**
- A coin is *eligible* for a part when it has enough bars: 2 for d1, 8 for d7, 50 for MA50, 200 for MA200, 31 for highs/lows and volume.
- Too-young coins are left out of that part's denominator, **not counted as below**.
- A part is usable when ≥ 90% of its eligible coins have a value. MA50 also needs eligible ≥ 90% of N, and MA200 needs ≥ 50 eligible coins.
- So 6 coins with < 200 bars (HYPE, VVV, …) never trip the 90% rule. The universe itself must have N ≥ 90.

### 4.1 Spot Market Health (0–100), formula `v1`
| # | Weight | Component | Formula |
|---|---|---|---|
| B | 30 | Breadth | `B = 0.4·Adv1 + 0.6·Adv7`, where AdvX = % of coins with closed `dX > 0` |
| M | 25 | MA trend | `M = 0.5·%>MA50 + 0.5·%>MA200`, each over its own eligible coins |
| V | 15 | Volume confirmation | `R` = median `vr`. `d = Σ wᵢ·sign(d1ᵢ) / Σ wᵢ` with **`wᵢ = min(qᵢ, 0.10·Σq)` (rule (b): each coin's weight is capped at 10% of total volume, so BTC/ETH cannot dominate)**. `k = clamp((R−0.5)/1.0, 0, 1)`. **`V = 50 + 50·d·k`** |
| H | 10 | 30d highs vs lows | **`H = 50 + 50·(nh−nl)/max(nh+nl, 0.1·eligible)`** |
| P | 10 | BTC–alt participation | `s1` = median alt `d1` − BTC `d1`; `s7` = same for `d7`. **`P = 50 + 50·(0.5·clamp(s1/5,−1,1) + 0.5·clamp(s7/10,−1,1))`** |

- **Spot = (30B + 25M + 15V + 10H + 10P) / 90**, clamped 0–100 and shown with one decimal. Leverage safety is **not** included (Q1).
- **Bands:** ≥ 70 Strong · 55–69 Healthy · 40–54 Mixed · < 40 Weak.
- **Hysteresis (Q8):** the label moves only when the score is ≥ 3 points past the edge of the previous day's band. The number always shows the true value.
- **Missing data:** if any of B/M/V/H/P is unusable, or N < 90, **no score and no band** are shown (ไม่พร้อมใช้งาน plus the missing parts). There is no renormalising around a missing part. Each metric that is available still shows on its own card.
- **Stale data:** if more than 36h have passed since the scored day ended, the UI hides the score.

### 4.2 Leverage Risk (separate reading, never added to Spot)
Inputs are universe coins on OKX USDT-SWAP and Hyperliquid, with funding normalised to an 8h equivalent and per-coin legs OI-weighted.

| # | Weight | Component | Formula |
|---|---|---|---|
| F | 0.40 | Funding crowding | `f̄` = OI-weighted mean funding (%/8h). `F = clamp(100·|f̄ − 0.01|/0.09)` |
| O | 0.35 | OI build-up | Top 20 by OKX OI: 7d change **in coin terms** = `(OI_t/OI_t−7)/(1 + d7) − 1`, OI-weighted. `O = clamp(100·max(0, oc)/30)` |
| X | 0.25 | Extreme-funding share | `x` = % of covered perps with |funding| ≥ 0.05%/8h. `X = clamp(4·x)` |

- **Leverage Risk = 0.40F + 0.35O + 0.25X**.
- Bands: < 20 Low · 20–39 Normal · 40–59 Elevated · 60–79 High · ≥ 80 Extreme, with the same ±3 hysteresis against the previous run's band.
- Required: ≥ 70 covered coins for F and X, and ≥ 10 coins for O. Otherwise no label.
- Updated hourly. Stale after 3h.
- Liquidations are not an input (no free market-wide source).

**Rule (e): every threshold is a judgment call.** That covers the weights; the 0.01%/8h baseline; 0.10%/8h, +30% OI and 25% extreme share as full scale; the 0.05%/8h extreme line; the 10% volume cap; and the $5M liquidity floor. None is fitted. **There is no retro backtest**: a backfill would only see coins that survived to today (survivorship bias). History starts at launch, one row per closed UTC day, including that day's universe ids and the formula version.

### 4.3 Worked example (rev 2): closed day 2026-11-16 UTC, real build
Universe:
- N = 100; the last coin is CoinGecko rank 174.
- Excluded on the way: 45 by category, 21 illiquid, 6 with no usable candles, 2 pegged-price.
- Candle sources: Binance 76, Gate 14, OKX 10.

| Item | Raw (closed candles) | Component |
|---|---|---|
| Breadth | Adv1 18% (81% down), Adv7 8% (92% down) | B = 0.4·18 + 0.6·8 = **12.0** |
| MA trend | > MA50 5% of 100; > MA200 22.3% of **94 eligible** (6 coins < 200 bars left out) | M = **13.7** |
| Volume | median R = 0.681×; capped direction d = −0.773; k = 0.181 | V = 50 + 50·(−0.773)(0.181) = **43.0** |
| 30d highs/lows | 0 / 17 of 100 | H = **0** |
| Participation | BTC d1 −0.72%, alt median −1.60% (s1 = −0.88pp); BTC d7 −13.91%, alt median −13.09% (s7 = +0.82pp) | P = **47.6** |
| **Spot** | (30·12.0 + 25·13.67 + 15·43.01 + 10·0 + 10·47.63) / 90 | **20.3 → Weak** |
| Funding | f̄ = 0.0041%/8h over 86 coins, $11.10B OI (OKX + HL) | F = **6.6** |
| OI 7d, coin terms (OKX top 20) | −5.7% (OI fell in coin terms) | O = **0** |
| Extreme funding | 1.2% of 86 coins | X = **4.7** |
| **Leverage Risk** | 0.4·6.55 + 0.35·0 + 0.25·4.65 | **3.8 → Low** |

Rev 1 vs rev 2: the spot score moved 25 → 20 because breadth now uses the closed day (Adv1 18%) rather than CoinGecko's rolling 24h (53% at 13:24 JST).

Context (shown, not scored):
- BTC dominance 58.5% (CoinGecko, stablecoins included); 69.0% of our ex-stable universe.
- ETH/BTC −0.95% over 7d and −4.83% over 30d.
- Alts beating BTC: 53.5% over 7d, 30.3% over 30d.
- OI/mcap 0.59%.

Primary category, closed 7d median: AI −8.4% (8), Other −8.8% (11), L1 −13.1% (37), L2 −13.5% (8), DeFi −15.2% (23), Meme −15.9% (9). RWA (2), DePIN (2) and Gaming (0) show ไม่พร้อมใช้งาน (n < 3).

Primary-category order (Q7):
1. override table (LINK → Other; DOT → L1)
2. Meme
3. L1 → L2
4. AI → Gaming → DePIN → RWA → DeFi
5. Other

Thai summary on the page (generated from these numbers by `health.js`):
- "BTC −13.9% ใน 7 วัน และ 92% ของเหรียญที่ติดตามลง อ่อนแอทั้งตลาด ไม่ใช่แค่ BTC"
- "ปิดที่จุดสูงสุดรอบ 30 วัน 0 เหรียญ และจุดต่ำสุดรอบ 30 วัน 17 เหรียญ"
- "Leverage Risk ต่ำ: funding เฉลี่ย 0.0041%/8h และ OI ลดลง −5.7% ใน 7 วัน (นับเป็นจำนวนเหรียญ)" (rule (f): it says what OI did, it does not say "leverage was flushed")

### 4.4 Methodology limits (rule (d), also shown in Pro → "วิธีคำนวณและข้อจำกัด")
- **Overlap.** 7-day breadth (18 of B's 30), MA trend (25) and the 30-day lows inside H (10) all measure trend. Together they are over ~65% of the 90 weight points (~59 of 90 ≈ 66% before counting the trend content in V and P). The score is therefore mostly a trend reading: it is slow at turns and should not be read as independent confirmations.
- N = 100: one coin is one point of breadth.
- Volume is a single venue per coin, not aggregate.
- Leverage covers OKX + Hyperliquid only.
- F measures the distance from the 0.01%/8h baseline **in both directions on purpose**: unusually low or negative funding (crowded shorts) also scores some crowding, not only high funding.
- The thresholds are judgment calls with no backtest (§4.2).
- Validity can be assessed only after 60–90 logged days: stability, component correlation, and how often bands change. Even then it is not an "edge" claim.

## 5. Architecture

### Workflow: `.github/workflows/health.yml`
- `cron: '23 * * * *'` (hourly light run) plus a heavy step when the latest closed UTC day isn't in history yet (first run after 00:00 UTC ≈ 09:23 JST). `workflow_dispatch` too.
- The heavy step is the only one that changes the official score (closed candles).
- Add it to the `heartbeat.yml` dispatch list, as with positioning.
- `concurrency: health`, timeout 20 min.
- Same commit/rebase loop as screener.
- `scripts/validate.py health` runs before the commit; on failure the job keeps the previous files and goes red.

### Builder
- `scripts/build_health.mjs` (Node). It reuses `scripts/klines-lib.mjs`, which gains an `opts` argument (`limit`, `min`, `check`) and a Gate fallback; defaults are unchanged for current callers.
- Pure math lives in `health-core.js` (UMD like `lev-core.js`/`verdict-core.js`): the same code runs in the Action and in the browser (tooltips' "today's value means …") and in the tests.

### Outputs
- **`health.json`** (root, like `screener.json`, ~30 KB), overwritten every hour.
- **`data/health/history.json`**: append-only, one row per closed UTC day. The validator rejects edits to past rows (compares with `HEAD`).
- **`data/health/categories.json`**: daily membership cache with `fetched` date.

```jsonc
// health.json (abridged from the real build of 2026-11-17 14:07 JST)
{ "v": 1, "updated": "2026-11-17T05:07:41Z", "formula": "v1",   // ISO UTC; UI shows viewer-local time + zone label
  "sources": { "cg_markets": {"at": "2026-11-17T04:58:40Z", "status": "delayed"}, "cg_global": {...},
               "candles": {"day": "2026-11-16", "status": "daily_close"}, "derivatives": {"status": "estimated", "errors": []},
               "categories": {"fetched": "2026-11-17", "errors": []} },
  "official": { "day": "2026-11-16", "formula": "v1", "n": 100, "last_rank": 174,
                "excluded": {"category": 45, "illiquid": 21, "no_candles": 6, "pegged": 2},
                "score": 20.3, "band": "Weak", "missing": [],
                "comp": { "B": {"v": 12, "adv1": 18, "adv7": 8, "n": 100}, "M": {"v": 13.67, "a50": 5, "a200": 22.3, "n50": 100, "n200": 94},
                          "V": {"v": 43.01, "R": 0.681, "d": -0.773, "w": 0.181, "cap": 0.1}, "H": {"v": 0, "nh": 0, "nl": 17},
                          "P": {"v": 47.63, "s1": -0.883, "s7": 0.819} },
                "coins": [ {"id": "bitcoin", "s": "BTC", "src": "Binance", "n": 230, "d1": -0.716, "d7": -13.912, "d30": -20.38,
                            "ma50": false, "ma200": false, "hi30": false, "lo30": false, "q": 1.42e9, "vr": 1.181}, ... ] },
  "leverage": { "score": 3.8, "band": "Low", "coverage": 86, "of": 100, "venues": ["okx", "hyperliquid"], "status": "estimated",
                "comp": { "F": {...}, "O": {...}, "X": {...} }, "liquidations": null, "liq_reason": "no_free_marketwide_source" },
  "context":  { "btc_dom": 58.52, "btc_dom_ex_stables": 69.01, "ethbtc_7d": -0.95, "ethbtc_30d": -4.83, "alts_beat_btc_7d": 53.5, "alts_beat_btc_30d": 30.3 },
  "categories": [ {"k": "L1", "n": 37, "d7": -13.07, "med": {"c1h": .., "c24": .., "c7": .., "c30": ..}, "adv7": 13.5}, ... ],
  "coins": [ /* intraday view (CoinGecko, unscored), same order as official.coins */ ] }
// data/health/history.json = { "v": 1, "rows": [ { "d": "2026-11-16", "f": "v1", "spot": 20.3, "band": "Weak",
//   "comp": {"B": 12, "M": 13.67, "V": 43.01, "H": 0, "P": 47.63}, "lev": 3.8, "lev_band": "Low", "btc_dom": 58.52,
//   "oi": 11095888264, "n": 100, "excl": {...}, "uni": ["bitcoin", "ethereum", ... 100 ids] } ] }
```
`formula` is versioned, so a later weight change never silently rewrites history.

### UI
- New lazy modules `health-core.js` + `health.js` (loaded via the existing `loadJS`), route `#/breadth`, Thai label "สุขภาพตลาด", **under More** (Q6).
- The Markets summary card was dropped from v61 so it doesn't conflict with v59's "สรุปประจำวัน" rework (follow-up).

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

### Files to add / change (PR v61, `ASSETV` 61; merge main in after v59/v60 land)
- **Add:**
  - `scripts/build_health.mjs`, `health-core.js`, `health.js`, `.github/workflows/health.yml`
  - `health.json`, `data/health/history.json`, `data/health/categories.json` (all Action-written)
  - `tests/health-core.mjs`, `tests/health-ui.mjs`
  - `tests/fixtures/health/` (a **recorded real snapshot**, e.g. today's, used only by tests, labelled as such; not mock data in the app)
  - `docs/market-health-p6.md` ("what is where")
- **Change:**
  - `scripts/klines-lib.mjs` (`limit` option + Gate fallback, defaults unchanged)
  - `scripts/validate.py` (new `health` kind: schema, ranges, N ≥ 90, unique ids, freshness, history append-only)
  - `app.js` (ROUTES + More entry + icon + `ASSETV` 61)
  - `i18n.js` (TH/EN strings and tooltips)
  - `style.css` (grid, treemap, chips)
  - `index.html` (`?v=61`), `sw.js` (`cw-shell-v61` + both lazy modules), `scripts/build_min.sh` (+`health-core`, `health`), `min/` rebuilt
  - tests that pin `ASSETV`: their default becomes 61
  - `.github/workflows/heartbeat.yml` (dispatch health)
- **Untouched (locked):** `data/ledger/`, `data/sm/`, `data/lev/`, `data/pulse.json`, `*_backtest.json`, `smart_money.json`, `positioning.json`, `onchain.json`, `data/events/`, `reports/`.
  `build_screener.py` is unchanged too (Q5).

### Test plan
- **Node (`tests/health-core.mjs`)**
  - Each component formula against hand-computed values from the recorded fixture (rev 2, closed day 2026-11-16: B 12.0, M 13.7, V 43.0, H 0, P 47.6, Spot 20.3, Lev 3.8; locked in `tests/health-core.mjs`).
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
- **Release**: existing suites green, `ASSETV`/`cw-shell`/`?v` all 61, `min/` rebuilt, `release-check` on the live Pages build (desktop + phone, numbers vs a second source such as CoinGecko's site for BTC dominance).

---

## 6. Risks and decisions

**Decided (user, 2026-11-17).**
- Q1: no leverage in Spot, weights over 90.
- Q3: 1H tab kept, display-only.
- Q4: no CoinGecko key.
- Q6: under More.
- Q8: ±3 hysteresis on labels only.

**Accepted as judgment calls (rule (e)).**
- Q2: the thresholds.
- Q7: the category order and overrides.
- Q5: `build_screener.py` is left untouched, so some STABLE logic is duplicated.

**Risks that remain**
1. CoinGecko keyless is "not for scheduled polling" (~5/min per IP on shared runners). Mitigations: 2 calls/run, categories cached daily, backoff, and the stale chip.
2. Derivatives are OKX + Hyperliquid only, so Leverage Risk is an estimate of part of the market.
3. Trend overlap (§4.4).
4. "Low" Leverage Risk in a sell-off can read as "safe". The copy says Low = not crowded and says nothing about direction.
5. Category tags drift. Gaming, DePIN and RWA are often too thin to show.
6. The universe reaches rank ~174–213 to find 100 liquid coins, so membership changes day to day. That is why each day's list is stored.
