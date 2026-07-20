# Equipment classification specification — v4.25

Follow-on to
[`equipment-classification-spec-v4.24.md`](equipment-classification-spec-v4.24.md).

## Grounded network speaks / bridges (xlviii)

Calibration examples G/H teach `MasterBus` and `VE.Direct` as *shape*. On
networks map groups the model can paste those names next to real buses
(CZone, NMEA, Bluetooth). Vote agreement does not prove grounding.

### Rule

1. Every `networks.speaks[].name_verbatim` and each bridge endpoint must
   appear in the excerpt corpus (verbatim or token phrase).
2. Ungrounded names are dropped with warning `fewshot_leakage` +
   `repairs[]` audit (same mechanical class as action/surface scrub).
3. Prompt rule 7: speak/bridge names only from THESE excerpts — never from
   calibration.
4. Attractors include `masterbus` / `ve.direct` for the residual fewshot
   scan; universal grounding covers any invented bus name.
5. No excerpts → skip network scrub (cannot verify).

### Founding fixture

Zeus SR leak list with MasterBus + VE.Direct against NMEA/CZone/Bluetooth
excerpts → those two (and MasterBus→CZone bridge) dropped; grounded speaks
kept. Victron SmartSolar corrected excerpts naming VE.Direct → kept.

Verify: `scripts/verify_interaction_profile_validate.py` (v4.25 block).

### Collision notes

| Existing | This tip | Resolution |
|----------|----------|------------|
| Fewshot scrub actions/surfaces only | Speaks/bridges too | Compatible extension |
| Absence repair mentions MasterBus | Does not merge speaks | Orthogonal |
| Hard-ban MasterBus/VE.Direct | Breaks Victron/Mastervolt | Rejected — grounding only |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.25** | xlviii: grounded networks.speaks / bridges |
| 4.24 | xlvii: other-variant procedure scope |
| 4.23 | xlvi: heading carry-forward past callouts |
| 4.22 | xlii–xlv: Stage 1.5 gate / evidence / dedup / surfaces |
