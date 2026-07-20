# Equipment classification specification — v4.31

Follow-on to
[`equipment-classification-spec-v4.30.md`](equipment-classification-spec-v4.30.md).

## Electrical Panel Stage 4 composer

Know chapter `electrical` uses `assemble_section_inputs` + capability→task
spine (tip **v4.31**). Owns isolation, Class-T, DC distribution, and
network bridges. Station UI stays on Controls; house-bank / charge depth
stays on Batteries.

| Block | Owns |
|-------|------|
| `capability_summary` | ML isolation switches; local rotary; Class-T holders |
| `how_it_works` | Disconnect / Class-T role; CZone output interfaces (owner path via touchscreen) |
| `adjusting` | Isolate a feed (ML override / rotary) |
| `troubleshooting` | Confirm isolation + Class-T after a trip; BMS reset → **xref Batteries** |
| `reference` | Busbar + MasterBus–CZone bridge (passive); **xref Controls** + **Batteries** |

MasterBus USB is commissioning-only — context_shaping / omitted from body.
`suspected_installer_line_item` on busbar shapes wording; busbar demoted to
`reference` (orphan rule).

### Evaluation additions

| # | Criterion |
|---|-----------|
| **(lvi)** | Electrical input set matches fixture (full members) |
| **(lvii)** | Structured Controls `guide_link` |
| **(lviii)** | Structured Batteries `guide_link` |
| **(lix)** | Isolation + Class-T present in body (satisfies Batteries inbound pointer) |
| **(lx)** | No CZone station page teaching / VictronConnect / bank kWh restatement |
| **(lxi)** | Block order follows capability→how_it_works→adjusting→troubleshooting→reference |

Harness: `scripts/draft_electrical_section.py`,
`scripts/verify_electrical_section_v4.py`,
`tests/fixtures/electrical_section_v4_expectations.json`.

**Not frozen** — founding composer; freeze only after human review (PLAYBOOKS
§2.D). Frozen regressions remain Solar + Batteries + Controls (v4.30).

## Revision history

| Ver | Notes |
|-----|-------|
| **4.31** | Electrical Stage 4 composer; criteria lvi–lxi |
| 4.30 | Controls Stage 4 frozen; Batteries freeze reaffirmed |
| 4.29 | lii–lv: direction_mismatch, occasion_circular, vote retention, hub_domain_split |
| 4.28 | li: gate_verbatim self-evidencing requires |
