# Equipment classification specification — v4.14

Follow-on to
[`equipment-classification-spec-v4.13.md`](equipment-classification-spec-v4.13.md).

## Batteries & Energy Stage 4 composer

Know chapter `batteries` uses `assemble_section_inputs` + capability→task
template (like Controls), tip version **v4.14**.

| Block | Owns |
|-------|------|
| `capability_summary` | House bank identity; charge-source glance |
| `monitoring` | Bank state; CZone meter path → **xref Controls** |
| `charging` | Solar pointer (leaf owns VictronConnect depth); Alphas; Silentwind brake |
| `inverter` | Mass Combi operate (no install/DIP); station path → **xref Controls** |
| `troubleshooting` | BMS reset; isolation/Class-T → **xref Electrical** |

Provenance-depth bridges (COI / MasterBus bridge) stay unnamed in body.
CZone Touch is an excluded control-path candidate from batteries members —
station teaching stays on Controls.

### Evaluation additions

| # | Criterion |
|---|-----------|
| **(xxvi)** | Batteries input set matches fixture (full members + provenance bridges) |
| **(xxvii)** | Structured Controls `guide_link` + reader-facing section phrase |
| **(xxviii)** | Structured Electrical `guide_link` for isolation/protection |
| **(xxix)** | Solar charge pointer present without VictronConnect rehash |
| **(xxx)** | Block order follows capability→monitoring→charging→inverter→troubleshooting |
| **(xxxi)** | Vessel established by recorded display name |

Harness: `scripts/draft_batteries_section.py`,
`scripts/verify_batteries_section_v4.py`,
`tests/fixtures/batteries_section_v4_expectations.json`.

## Revision history

| Ver | Notes |
|-----|-------|
| **4.14** | Batteries Stage 4 composer; criteria xxvi–xxxi |
| → | See [`equipment-classification-spec-v4.15.md`](equipment-classification-spec-v4.15.md) for global spine / orphan / wisdom |
| 4.13 | Xref reader voice; structured `guide_links` |
| 4.12 | `channel_map` source class; eval xxiii–xxv |
