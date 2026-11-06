# v47 UI follow-up

## Scope
- Desktop short-height sidebar: nav scrolls (`flex:1; min-height:0; overflow-y:auto`); brand/footer pinned; Settings remains keyboard-reachable; Wallets stays hidden via existing flag.
- Flows **จำนวนเหรียญ / Unique tokens**: show integer `stats.tokenCount` only when `Number.isInteger`; no logo stack or `+N` remainder.
- Smart Money: clearer EN/TH copy (`รายการเทรดใหญ่ (สด)`), intro, separate Spot/Futures and cohort controls, reusable `uiHelp` explanations, remove misleading sample-gross-as-%-of-OI, lean bar uses notional share, name flow-bar denominator, no whale-identity claims.

## Out of scope
Weekly redesign and advanced pullback checklist (design proposals only after this ships).
