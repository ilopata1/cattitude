# Equipment classification specification — v4.1

How Clever Sailor turns manufacturer manuals into per-device interaction
facts, validates them, and builds a vessel system graph. Companion to
[`guide-pipeline-plan.md`](guide-pipeline-plan.md).

**v4.1** changes Stage 1 **stability voting** for list **presence** to
**union-with-provenance** (gated by excerpt grounding), and adds deterministic
**`needed_for` normalization** from `networks.speaks[N]` → realizing
`data_roles.*`. Inherits v4.0 requirement kinds, resolver tiers, and OR-split
from [`equipment-classification-spec-v4.0.md`](equipment-classification-spec-v4.0.md).

---

## Stability voting — union vs majority

N independent temp-0 map-reduce runs (default **N=3**) are field-voted into one
profile. Policy differs for **presence** vs **attributes**:

| Field / question | Vote rule | Unstable? |
|------------------|-----------|-----------|
| **Presence** of an item in `operator_actions`, `requires_devices`, `control_surfaces`, `networks.speaks` | **Union**: keep if present in ≥1 run **and** the item text is **grounded** in the routed excerpt corpus; attach `vote_margin` (`k/N`) | Presence-only disagreement is **cosmetic** (recorded in `extraction_votes`, not `extraction_unstable`) |
| **Attributes** on the same identity (`context`, `audience`, `optional_accessory`, `needed_for`, speak `physical_or_wireless`) | **Majority**; variants recorded; ties / 1–1 splits remain unstable | Material → `extraction_unstable` |
| Booleans (`data_roles.*`, `safety_role.*`), `device.category_freeform` | Majority (True preferred on strict ties for bools) | Material when non-unanimous |
| `protects` / `protected_by` / `supply_requirements` | Presence-union (same margin annotation) | Cosmetic presence |

Identity for clustering: fuzzy action / surface / speak name; for
`requires_devices`, **description only** so `needed_for` can majority as an
attribute. OR alternatives with different descriptions stay separate clusters.

### Grounding as the union gate

Union is not “any hallucinated string from one run”. An item’s identity text
(action phrase, description_verbatim, label/surface, speak name) must meet the
existing token-overlap grounding threshold against the **routed excerpt
corpus** for that extraction. Ungrounded candidates are **dropped** and appear
in `extraction_votes` with `blocked: "ungrounded"` — validators / fewshot scrub
still apply downstream.

Presence flaps that used to show as material instability (e.g. firmware /
Bluetooth / sunset / error-code actions appearing in 1 of 3 runs) are now
**kept at low margin** when grounded, and counted cosmetic in triage.

---

## `needed_for` normalization (reduce / normalize)

`networks.speaks[N]` names a port that **exists unconditionally**. A
`requires_devices` dependency for *using* that port must target the capability
the network realizes:

1. If `needed_for` matches `networks.speaks[\d+]`:
   - Rewrite to the first **true** of:
     `data_roles.exposes_data_to_network` →
     `data_roles.controllable_from_network` →
     `data_roles.displays_data_from_other_devices`
   - Stash original under `needed_for_normalized_from`
2. If no corresponding capability is true → keep original path and flag
   `needed_for_unmappable` (warning)
3. Then OR-expand + exact-key dedupe
   `(normalized description, needed_for, requirement_kind)` so a GX entry
   formerly split across `networks.speaks[0]` and
   `data_roles.exposes_data_to_network` **collapses to one** vessel
   requirement path

Applied in `normalize_speaks_needed_for` / `finalize_profile_requires` (post-vote
and load-time backstops). Vessel regression requires GX on
`data_roles.exposes_data_to_network`; GlobalLink 520 is an OR alternative when
emitted — pure omission under union is a prompt-coverage candidate.

---

## Unchanged from v4.0

- `requirement_kind` taxonomy and resolver kind filtering
- Resolver tiers 1–3 (FAMILY_ALIASES-only tier 2); tier 4 reserved
- OR-alternative expand in reduce; SmartSolar pins GX + GlobalLink as separate
  device alternatives on `data_roles.exposes_data_to_network`
- Outremer vessel assertions; calibration N

---

## Revision history

| Ver | Notes |
|-----|-------|
| 4.0 | `requirement_kind`; tier 2 = FAMILY_ALIASES only; OR-split in reduce |
| **4.1** | Union-with-provenance presence vote + grounding gate; `needed_for` speaks→data_roles normalize; presence flaps cosmetic |
