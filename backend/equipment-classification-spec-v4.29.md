# Equipment classification specification — v4.29

Follow-on to
[`equipment-classification-spec-v4.28.md`](equipment-classification-spec-v4.28.md).

## Direction of agency on data_roles evidence (lii)

Field-specific polarity (v4.26) was dodged by migrating a hub-commanding
note onto `exposes_data_to_network`. Direction of agency is now universal:

| Role | Agency |
|------|--------|
| `exposes_data_to_network` | OTHERS read THIS device's data |
| `displays_data_from_other_devices` | THIS device shows OTHERS' data |
| `controllable_from_network` | OTHERS command THIS device |

Evidence whose note describes THIS device commanding/controlling other
devices supports **none** of the three — that is hub-commanding behavior
(schema home: `ui_pages`).

Blocking flag `direction_mismatch`. Founding: Zeus note
`"CZone app controls devices via the network"` on `exposes_data_to_network`.

## Occasion circularity (liii)

Occasions that only restate the action (e.g. turn off / to power down the
unit) flag `occasion_circular` (warning) and are cleared. Cleared/circular
occasions do **not** satisfy composition rule xxxix (treated as unoccasioned).

Founding: Zeus power on/off actions.

## Vote-margin retention (liv)

`vote_margin` on actions/surfaces and top-level `extraction_votes` /
`instability_triage` are adjudication metadata. `normalize_profile` must
preserve them through validate/repair/promote.

## hub_domain_split judgment (lv)

When `multiple_hubs` fires, append `hub_domain_split` with a raw judgment
articulating per-hub domain cues (category, platforms, CZone ui_pages,
speaks). Does **not** resolve or merge hubs.

Verify: `scripts/verify_stage15_zeus_v429.py`

## Revision history

| Ver | Notes |
|-----|-------|
| **4.29** | lii–lv: direction_mismatch, occasion_circular, vote retention, hub_domain_split |
| 4.28 | li: gate_verbatim self-evidencing requires |
| 4.27 | l: pre-merge evidence index rewrite |
| 4.26 | xlix: controllable_from_network polarity |
