# Equipment classification specification — v4.30

Follow-on to
[`equipment-classification-spec-v4.29.md`](equipment-classification-spec-v4.29.md).

## Controls and Monitoring Stage 4 — frozen for reuse

Know chapter `controls` Stage 4 composer and acceptance criteria are
**frozen** after human review. Further change needs a versioned tip that
supersedes this freeze — do not silently rewrite the template in place.

Ship-with-honest-gaps remains in force: `config_unsourced` (Exact Modes,
Favourites shortcuts, alarm details) yields a boat-upgradeable placeholder
and must **not** block freeze or publish. Upgrade when `.zcf` or a screen
walkthrough arrives (inventory/config event) — not by inventing boat config.

**Locked assets**

| Asset | Path |
|-------|------|
| Composer / evaluate | `guide_section_controls.py` (criteria xx–xxv) |
| Draft harness | `scripts/draft_controls_section.py` |
| Regression gate | `scripts/verify_controls_section_v4.py` |
| Scratch draft | `fixtures/pipeline/scratch/controls_section_draft_v4.{md,json}` |

**Template:** capability → monitoring → adjusting → troubleshooting /
reference (planted-expectation for gated AC Mains / Climate orientation).
Touch 7 + CZone platform at `full`; Combi / MLI at `summary` via present
pages; COI / MasterBus bridge `provenance` unnamed. Circuit names on
Control trace to adjudicated `channel_map` (xxiii). Batteries xrefs for
house-bank / Inverter Charger depth.

**Composer tip lineage:** introduced v4.10; channel_map / OPT criteria
xxiii–xxv; freeze tip: **v4.30**.

## Batteries & Energy Stage 4 — freeze reaffirmed

Batteries remains frozen for reuse (composer xxvi–xli;
`verify_batteries_section_v4.py`). An earlier plan row pointed at tip
v4.28; that tip number was later used for gate_verbatim self-evidence
(li). Freeze authority for Batteries is this tip’s reaffirmation plus the
pipeline-plan status row.

## Frozen-section regressions

Frozen Stage 4 sections: **Solar v4**, **Batteries & Energy**, **Controls
and Monitoring**. Any global composition / reader-voice rule change must
re-run all three and report pass / what broke (`standard_frame.txt`).

Harness reminders:

- `python scripts/verify_solar_section_v4.py`
- `python scripts/verify_batteries_section_v4.py`
- `python scripts/verify_controls_section_v4.py`

## Revision history

| Ver | Notes |
|-----|-------|
| **4.30** | Controls Stage 4 frozen for reuse; Batteries freeze reaffirmed; frozen-section set = Solar + Batteries + Controls |
| 4.29 | lii–lv: direction_mismatch, occasion_circular, vote retention, hub_domain_split |
| 4.28 | li: gate_verbatim self-evidencing requires |
| 4.27 | l: pre-merge evidence index rewrite + support mismatch lint |
