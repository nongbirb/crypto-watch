# Weekly v1 — approved scope, November 6 2026

Only the latest fully closed Monday–Sunday UTC week. Publish Monday around 09:30 JST, replacing the existing Sunday routine (one routine, not two). Main table shows return and range percentage, not live quotes. Report dates remain UTC; observation timestamps display in each viewer's timezone. Daily candles are shown with their UTC trading date.

Return = (this Sunday close / prior Sunday close − 1) × 100. Range = (maximum high − minimum low of this Monday–Sunday) / prior Sunday close × 100. Require eight consecutive valid positive UTC daily candles, not nine latest/rolling bars. Reject duplicate/gapped/malformed data; fallback to another configured venue, otherwise mark unavailable. Genuine zero return remains zero. Archive complete eight-day inputs for audit. Preserve actual configured exchange pairs: never substitute the old Litentry LIT pair for Lighter. Hyperliquid fallback is explicitly perpetual USD, not spot USDT.

The shared watchlist is captured at generation, including all tokens even when unavailable. It is not a claim about membership at historical week open, and cannot see viewers' private lists. Every row records source, market, pair, units and retrieval time. Eight current tokens are not hardcoded.

Weekly F&G requires all seven daily publication observations in the UTC week; show first and last values with their timestamps. These are daily published observations, not market-closing readings. Missing series stays unavailable. Calendar is a dated snapshot with original sources and per-feed last-checked dates. Timed events convert from the existing JST calendar schema to ISO and device-local display. Date-only events retain their source date and zone without inventing a time. Calendars can be incomplete or stale; event dates are not confirmation of execution.

Write `reports/weekly-v1-YYYY-MM-DD.json` (Monday publication date). Exclusive creation prevents overwrites. A rerun validates the existing file and can repair only a missing index entry. Legacy archives remain byte-identical and selectable. A late backfill uses the real generation time and calendar snapshot; no claim that those events were known at the historical week close.

No historical verdict reconstruction, speculative narratives or numeric flows in this version. No pullback engine/UI, performance claim or win-rate score. Any subsequent scope expansion returns for review.

Tests: `tests/weekly.mjs` covers UTC boundaries, arithmetic, baseline exclusion, invalid candles, missing versus zero, missing F&G, event filtering and archive immutability. `tests/weekly-ui.mjs` covers EN/TH, desktop/phone, details, archives, local timezone display and deliberately broken inputs. Run the existing full release suite and v46/v47 regressions before release. Auditor reviews the proposed changes before publishing.
