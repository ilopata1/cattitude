# Equipment classification specification — v3.9

How Clever Sailor turns manufacturer manuals into per-device interaction
facts, validates them, and builds a vessel system graph. Companion to
[`guide-pipeline-plan.md`](guide-pipeline-plan.md).

**v3.9** adds **stability voting** (N=3 map-reduce), calibration example **M**
(outbound BMS protection + manual override), a Combi **flap post-mortem**,
TOC / section-topic partition fixes, **resolver match tiers**, material vs
cosmetic instability triage, and the **Outremer vessel regression table**.

Inherits calibration K/L and audience rules from
[`equipment-classification-spec-v3.8.md`](equipment-classification-spec-v3.8.md).

---

## Stability voting

Stage 0 retrieval runs **once**. Stage 1 map-reduce then runs up to **N=3**
on that fixed excerpt set:

1. Run 1 and run 2 independently (temp 0, same groups).
2. If post-merge profiles match under a field-normalized canonical form →
   **short-circuit** (skip run 3).
3. Otherwise run 3 and **field-level majority / presence vote**.

**Stable** fields are accepted as-is. **Unstable** fields keep a voted value
(list entries prefer *presence* when any run extracted them — omission flaps
are the usual failure mode) and emit:

- `validation_flags[]` entry `{flag: extraction_unstable, severity: warning,
  detail, field_path}` for **material** disagreements
- `extraction_unstable_cosmetic` for evidence / fuzzy action-phrasing drift
- `extraction_votes[]` audit rows with `variants`, `vote_margin`, and
  `instability_class`

`extraction_unstable` is a **warning** (not in `NEEDS_REXTRACTION_FLAGS`).
Golden compares run against the **voted** profile so Combi-style shore flaps
surface as visible flags instead of silent green/red flips.

Golden-green voted payloads are archived under
`fixtures/pipeline/last_green/<device>/` for flap diffs
(`scripts/archive_last_green.py`).

### Material vs cosmetic

| Class | Field roots / rule |
|-------|--------------------|
| **Material** | `operator_actions` content/context/audience (distinct actions), `data_roles`, `control_surfaces`, `safety_role`, `requires_devices`, `networks`, `protects` / `protected_by` / `supply_requirements` |
| **Cosmetic** | `evidence` / `confidence`; `operator_actions` *presence* variants that fuzzy-match as the same action |

---

## Resolver match tiers (Stage 2)

`requires_devices` (and protection hint matching) resolve against the vessel
equipment list with an explicit tier:

| Tier | Rule |
|------|------|
| **1** | Manufacturer + model (or model) literal appears in the requirement text |
| **2** | Content-token subset / strong token overlap (legacy fuzzy) |
| **3** | Capability-class synonym — e.g. `"external safety relay"` → Blue Sea **ML-Series** when that line item is commandable/protective; **not** a passive busbar / non-commandable switch |

Each satisfied require is annotated with `resolved_to`, `resolution_tier`, and
`resolution_evidence`.

---

## Calibration M — automatic protection + manual override

Manual (MLI Ultra / lithium BMS style):

**Part 1 — automatic protection:** *"The safety relay will automatically open
(REMOTE OFF) when built-in thresholds are met."*

→ `protects[]` entry worded from the manual (safety relay auto-opens /
protective disconnect on built-in thresholds). **Not** an `operator_action`.

**Part 2 — manual override:** *"LOCK OFF knob position mechanically opens the
safety relay"* (or equivalent LOCK OFF / servicing isolation).

→ `control_surfaces`: `{surface: rotary_selector|physical_controls,
  location_class: on_device, optional_accessory: false}`;  
→ `safety_role.has_manual_override: true`.

Operator recovery after a protective trip (*Close relay* once limits are OK)
remains `operator_actions` with `context: emergency`.

`FEWSHOT_PHRASE_ATTRACTORS` includes distinctive M strings with markers
(`built-in thresholds`, `lock off`) so SmartSolar cannot absorb M wording.

---

## Flap post-mortem — Mass Combi Power Sharing / shore

**Symptom:** harness `shore/AC input current limit (situational)` intermittently
ABSENT while remote / DIP / DC-fuse stayed green. Live action when present was
typically `set Power Sharing level`.

**Not the cause:** grouping mode flip (still chapter+batch); Stage 0 did route
Power Sharing / AC-input text (`shore power AC input…` query hits remained).

**Root cause:** actionable sentence *"The Power Sharing level can be adjusted…"*
often lacked a chapter heading substring / had a garbage
`source_heading_guess`, so `_assign_chapter` left it **unassigned → leftover
`batch_*`**, while conceptual `3.4.4 Power sharing mode` lived under
`chapter_3`. Split context + LLM omission produced the flap **without any
extraction-prompt change**.

**Fix (Stage 0/1 partition + map retry, no extract-prompt edit for the flap):**

- Section-topic reclaim: inventory titles like `3.4.4 Power sharing mode`
  pull body excerpts that echo **all** significant title words into that chapter
  (brand tokens alone must not win).
- Top-level TOC title reclaim (`7. INSTALLATION`) + adjacent chapter coalesce
  instead of flattening leftovers (MLI).
- When a map group’s text has Power Sharing / AC-input / mains-limit language
  but omits the situational limit action → targeted map retry trailer
  (`AC_LIMIT_RETRY_LINE`), same spirit as empty-group retry. Parallel trailers
  cover remote-panel omission, BMS protects/recovery omission, and DIP /
  MasterAdjust commissioning omission.
- Stability voting makes residual omission flaps visible via
  `extraction_unstable`.
- Vote evidence uses `prioritize_evidence` so `requires_devices` support is not
  dropped by union noise.

---

## Vessel regression table — Outremer

Live Stage 1 profiles for SmartSolar / Mass Combi / MLI Ultra plus hand stubs
(`source: stub`) for CZone, COI, Blue Sea ML-Series, Class T, busbar, Balmar,
Silentwind. Harness: `scripts/run_outremer_vessel.py`.

| Device | Role | Guide section | Stage 3 tier (preview) | Notes |
|--------|------|---------------|------------------------|-------|
| CZone system | HUB | electrical | operate | Station UI + displays/commands others |
| COI | BRIDGE | electrical | reference | MasterBus ↔ CZone |
| MLI Ultra | ENDPOINT | batteries | monitor | Daily monitor + emergency BMS |
| Mass Combi Pro | ENDPOINT | batteries | situational | Control path taught via CZone |
| Victron MPPT | ISLAND | batteries | monitor | `island_with_daily_use` |
| Silentwind | ISLAND | batteries | situational / monitor | Situational brake |
| Balmar MC-624 | ENDPOINT | batteries | reference | Optional BT gateway → `unresolved_dependency` when absent |
| Blue Sea ML-Series | ENDPOINT | electrical | emergency | Manual override; BMS chain |
| Class T | PASSIVE | electrical | emergency | Fuse holder |
| Busbar | PASSIVE | electrical | reference | `suspected_installer_line_item` |

**Critical assertions**

1. Resolver **tier 3**: MLI `requires` `"external safety relay"` → `ml_switch`
   (Blue Sea ML-Series), **not** busbar / plain local battery switch / Class T
   fuse holder; remote-command path required; rejected candidates listed with
   failing criteria (`no remote command path`, `protective but not a switch`).
   Report tier + score + evidence.
2. Roles: CZone **HUB**; Combi **ENDPOINT** with control path via CZone; MPPT
   **ISLAND**; MLI **ENDPOINT**.
3. Xrefs: MLI protection → Class T + ML-Series (Electrical); Combi control →
   CZone.
4. Flags: `island_with_daily_use` (Victron), `suspected_installer_line_item`
   (busbar); **no** `controllable_but_unreachable`.

---

## Revision history

| Ver | Notes |
|-----|-------|
| 3.6 | Scaled retrieval; absence validators; Mass Combi golden |
| 3.7 | Map-reduce Stage 1; merge semantics; group utilization; mechanical-fill audit |
| 3.8 | Calibration K/L; audience never gates requirement fields; widened remote-panel retrieval |
| 3.9 | Stability voting N=3; calibration M; Combi flap post-mortem; resolver tiers; instability triage; Outremer vessel regression table; last_green archives |
