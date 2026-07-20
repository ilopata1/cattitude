# Equipment classification specification — v4.26

Follow-on to
[`equipment-classification-spec-v4.25.md`](equipment-classification-spec-v4.25.md).

## data_roles polarity for controllable_from_network (xlix)

MFDs that command CZone loads were marked `controllable_from_network: true`
because extract/repair treated "control devices via the network" as the MFD
being network-commanded (subject/object inversion).

### Rule

1. Prompt rule 7b + schema header: subject is always the device under extract.
   - `exposes_data_to_network` — this device publishes onto a network
   - `displays_data_from_other_devices` — this device shows others' data
   - `controllable_from_network` — THIS device can be commanded over a network
2. Anti-pattern: controlling other devices is not `controllable_from_network`
   (calibration O). Contrast D/E (app controls THIS charger).
3. Evidence repair + absence repair prompts carry the same polarity language.
4. Stage 1.5 mechanical repair: when `controllable_from_network` is true and
   every supporting evidence note matches controls-others wording (and not
   this-unit remote-command wording), clear the flag, drop those evidence
   rows, warning `data_role_polarity` + `repairs[]`. Does not set
   `needs_rextraction`.

### Founding fixture

Zeus-style evidence note `"Control devices via the CZone network"` on
`data_roles.controllable_from_network` → role cleared to false; warning
`data_role_polarity`. Victron-style note `"configure charger via VictronConnect
app"` → role kept true.

Verify: `scripts/verify_interaction_profile_validate.py` (v4.26 block).

### Collision notes

| Existing | This tip | Resolution |
|----------|----------|------------|
| Absence repair "monitoring or control" | Ambiguous control | Replaced with polarity wording |
| Speaks grounding (v4.25) | Orthogonal | Compatible |
| Hard-ban CZone control actions | Would drop real switching OA | Rejected — polarity on data_roles only |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.26** | xlix: data_roles controllable_from_network polarity |
| 4.25 | xlviii: grounded networks.speaks / bridges |
| 4.24 | xlvii: other-variant procedure scope |
| 4.23 | xlvi: heading carry-forward past callouts |
| 4.22 | xlii–xlv: Stage 1.5 gate / evidence / dedup / surfaces |
