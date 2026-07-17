# Equipment classification specification — v3.8

How Clever Sailor turns manufacturer manuals into per-device interaction
facts, validates them, and builds a vessel system graph. Companion to
[`guide-pipeline-plan.md`](guide-pipeline-plan.md).

**v3.8** adds calibration examples **K** (optional accessory panel as this
device's control surface) and **L** (supply/protection requirements), plus the
rule that **audience gates actions only — never requirement fields**.

Inherits Stage 1 map-reduce from
[`equipment-classification-spec-v3.7.md`](equipment-classification-spec-v3.7.md).

---

## Calibration K — accessory panel as surface

Manual (other device): *"The unit can be operated with the optional MasterView
remote panel, installed at a convenient location."*

Expected:

- `control_surfaces[]`: `{surface: remote_panel_accessory, location_class:
  remote_wired, optional_accessory: true, label_verbatim from the manual}`
- `requires_devices[]`: `{description_verbatim: "MasterView remote panel" (or
  the manual's panel name), needed_for: <that surface's path>}`

**Rationale:** a separately sold panel/display that operates **this** device is
a control surface of this device, not a different product.

---

## Calibration L — supply / protection requirements

Manual (other device): *"Install a fuse in the positive DC supply cable within
30cm of the battery."*

Expected:

- `supply_requirements[]` entry describing that fuse mandate (worded from the
  manual under extraction), with supporting `evidence` (`manual_section` + note)
- `protected_by[]` when the manual frames the fuse as protecting this unit

**Rationale / principle:** protection and supply mandates are **facts** to
record even when the surrounding procedure is installer-audience.
**`audience` applies to `operator_actions` only — never to requirement fields**
(`supply_requirements`, `protected_by`, `protects`).

---

## Few-shot leakage (K/L)

`FEWSHOT_PHRASE_ATTRACTORS` includes distinctive K/L strings. Stage 1.5 checks
actions, surface labels, `requires_devices`, and supply/protect description
text. Ungrounded matches → `fewshot_leakage` (blocking). SmartSolar must not
sprout a MasterView `remote_panel_accessory` from example K alone.

---

## Retrieval (remote / accessory UI)

Stage 0 profile queries for remote/accessory UI include synonyms: remote panel,
remote control, display panel, MasterView, monitoring panel, MasterAdjust.

---

## Revision history

| Ver | Notes |
|-----|-------|
| 3.6 | Scaled retrieval; absence validators; Mass Combi golden |
| 3.7 | Map-reduce Stage 1; merge semantics; group utilization; mechanical-fill audit |
| 3.8 | Calibration K/L; audience never gates requirement fields; widened remote-panel retrieval; fewshot phrases for K/L |
