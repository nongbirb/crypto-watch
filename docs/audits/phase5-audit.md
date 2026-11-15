# Audit: Business pulse, Phase 5

Audited: `business-pulse-p5` at `9586b98` (base `0dab281`). Audit only; nothing was pushed or edited on that branch.
Spec: `docs/architect-proof-layer.md` rev 2, sections 0 and 6; `docs/audits/phase3-audit.md` section 3 (L2, L3); `docs/business-pulse-p5.md`.

## 1. Verdict

**AGREE, 9/10. No blocking finding. From the auditor's side this head is ready for the owner's "merge".**

The builder was run live into a temp folder (62 days, 60 final, 33 KB, no failed source). All 24 suites pass (`events-lock` offline). Three low-severity notes are in section 2.

## 2. Low severity (not blocking)

| # | Where | Note | Suggested fix |
|---|---|---|---|
| L1 | `scripts/pulse.py` `mon_unlock` | The unlock share is rebuilt from a rounded percentage and CoinGecko's total supply: 16.76 % × 100.68 B ÷ 11.83 B = 142.7 %. The same event's own token count (17.11 B MON, in its title) gives 144.7 %. About 2 points off | Carry the unlock's token amount as a field in `calendar_auto.json` and divide that by circulating supply |
| L2 | `scripts/pulse.py` `main` (finalise) | A day can become final in the first complete run after midnight. If DefiLlama's point for that day is present but not yet complete, a partial value is locked. In practice the preliminary Coin Metrics day keeps the day open until the next day, so this did not occur (fixture built 10:35 UTC and live build at 11:25 UTC agree on every final day). The protection is incidental | Do not finalise a day until at least 6 hours after it ended |
| L3 | `docs/business-pulse-p5.md` "Left out" | ETH staking share is listed as having no keyless source. A beacon-chain explorer API may give it without a key; I could not reach one from this session to check | Revisit later; not needed for merge |

## 3. The eight audit items

1. **Sources: confirmed.** Called live: fees, open interest, chain TVL and stablecoin endpoints answer 200 with one point per UTC day stamped 00:00; `summary/derivatives` and `yields.llama.fi/poolsBorrow` answer 402, as recorded; CoinGecko `market_chart` and `coins/markets` answer as recorded (MON `max_supply` null). The 11 MB protocol files were read by the live build. ETF flow and Solana active addresses: I know of no keyless source either. ETH staking: see L3.
2. **Day stamping: confirmed.** One value of each kind against upstream:
   - day total: `aave.rev` 2026-11-10 = 191,151 and 11-13 = 349,532, equal to the upstream points stamped those days;
   - close: `mon.tvl` 2026-11-10 = 939,489,213, equal to the upstream point stamped 11-11 00:00 (the 11-10 point is 932,324,008);
   - open interest: `lt.oi` 2026-11-13 = 466,381,120, equal to the point stamped 11-13; the open day is not stored;
   - reading: `sol.stake` 67.3 under 2026-11-15, as in `positioning.json`;
   - Coin Metrics: `btc.exnet` −3,376.16 under its own day 2026-11-14, marked preliminary, day left open.
3. **Final days: confirmed, with L2.** Simulated with injected sources: a CoinGecko failure and a fees failure at 00:20 after the day ended, each followed by complete runs. The day stayed open, later runs completed it, and `validate.py pulse` passed at every step. After the 3-day grace the day became final with the missing value left null. A point that was partial at 00:20 and corrected later was stored corrected.
4. **Maths: confirmed.** By hand from the fixture: AAVE utilisation 42.8806 % (+2.2779 pp), Lighter open-interest share 6.4468 % (+0.0858 pp), AAVE market cap ÷ (30-day revenue × 12) = 23.3578, AAVE 30-day revenue 5,542,568 (+9.3762 %): all equal to the card. MON unlock share 142.7 matches the code's formula (see L1). HYPE's net line is not in the fixture: it needs 30 stored days of circulating supply and only one exists; its formula was read and is as documented.
5. **Card: confirmed.** Screenshots at 360 and 390 px: each number shows its 30-day change or says when it will appear, the ratio states its window, sources are named, the left-out figure is named, at most three numbers, no buy or sell wording. `pulse-ui` (100 checks) covers EN and Thai and the https links.
6. **Workflow: confirmed.** `onchain.yml`: validate (continue-on-error), restore on rejection, commit `onchain.json`, then fail. The heartbeat checks `onchain.yml` against its own 170-minute window first and leaves the 50-minute guard for the other workflows as it was. Real behaviour can only be seen on GitHub.
7. **L2 and L3: confirmed and guarded.** All-day events start at 00:00 JST and show the viewer's local start time; "no event in 48 h" is grey. With the L3 fix undone `setup-card-p3` fails; with the L2 fix undone `setup-ui` fails.
8. **Release: confirmed.** 58 in both places; `pulse.js` in `index.html`, `sw.js` and `build_min.sh`; the four changed `min/` files match a fresh build; no protected file and no `i18n.js` label changed; stored codes unchanged.

Validators: `thai`, `ledger`, `verdict_bt`, `sm`, `lev`, `pulse` pass; the fixture passes `validate.py pulse`.

## 4. After the merge

- Run `onchain.yml` once from the Actions tab. The first run backfills `data/pulse.json`.
- BTC and ETH show one number at first. Exchange net flow needs 30 stored days; HYPE's net line needs 30 days of supply readings.
- This was the last phase of the brief.
