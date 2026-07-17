# Equipment classification specification — v4.0

How Clever Sailor turns manufacturer manuals into per-device interaction
facts, validates them, and builds a vessel system graph. Companion to
[`guide-pipeline-plan.md`](guide-pipeline-plan.md).

**v4.0** adds **`requirement_kind` taxonomy**, tightens resolver **tier 2** to
curated family aliases only, restores **OR-alternative expansion in reduce**,
and documents **tier 4 (LLM)** as a future reserve. Inherits stability voting,
calibration M, Combi flap fixes, and the Outremer vessel table from
[`equipment-classification-spec-v3.9.md`](equipment-classification-spec-v3.9.md).

---

## Requirement kinds (`requires_devices`)

Each `requires_devices` entry carries:

| `requirement_kind` | Meaning | Stage 2 |
|--------------------|---------|---------|
| **device** | Vessel line-item product (GX, remote panel, safety relay) | Resolved against equipment (tiers 1–3) |
| **cable_or_consumable** | Cable / cord / dongle / consumable | Recorded only — never resolves, never `unresolved_dependency` |
| **software_app** | Downloadable app (VictronConnect) | Auto-satisfied when `needed_for` points at a built-in / mobile_app surface; never flags |
| **commissioning_tool** | Installer config tool (MasterAdjust, CZone Configuration Tool) | Recorded only — never resolves, never `unresolved_dependency` |

Extraction prompt (calibration **N**) classifies kinds briefly. A deterministic
post-extraction / normalize **backstop** assigns kinds from obvious cues
(`app`/`software`/`tool` → non-device; `cable`/`cord`/`dongle` →
`cable_or_consumable`) so stale profiles and stubs get kinds without
re-extraction.

---

## Resolver match tiers (Stage 2)

Only **`requirement_kind=device`** enters equipment matching:

| Tier | Rule |
|------|------|
| **1** | Strict manufacturer+model (or model) literal in the requirement text |
| **2** | Curated **`FAMILY_ALIASES`** membership only (e.g. `"GX device"` ↔ Cerbo / Venus family). **No** token-subset / overlap fallback |
| **3** | Capability-class → profile (e.g. `"external safety relay"` → Blue Sea ML-Series with remote-command path; nearest-miss rejects plain switches / Class T) |
| **4** | LLM assist (reserved — not wired; deterministic tiers are authoritative) |

Annotations: `resolved_to`, `resolution_tier`, `resolution_evidence`,
optional `resolution_score` / `rejected_candidates`.

---

## OR-alternative expand (reduce)

Combined descriptions like `"GX device or GlobalLink 520"` are expanded
**post-merge in reduce** (`finalize_profile_requires` / `finalize_requires_devices`):

1. Split on `\bor\b` / commas into separate entries sharing `needed_for`
2. Exact-key dedupe on `(normalized description_verbatim, needed_for,
   requirement_kind)` — map-group duplicates collapse; evidence
   `supports_field: requires_devices[i]` indices are remapped / merged
3. Annotate `requirement_kind`

`normalize_profile` and post-vote finalize apply the same as
load-time / vote backstops. Stage 2 OR semantics remain: any satisfied
**device** alternative activates the path.

List identity elsewhere: `operator_actions` / `control_surfaces` still
dedupe on **fuzzy** match during union; `requires_devices` is the list that
gets an **exact-key** post-split pass (union itself still uses
needed_for + fuzzy description before expand).

SmartSolar fixture pins two separate alternatives
(`GX device` + `GlobalLink 520`) sharing `data_roles.exposes_data_to_network`
— exactly one entry per alternative on that path.

---

## Stability voting / Outremer

Unchanged from v3.9: N=3 vote, last_green archives, material vs cosmetic
triage, Outremer critical assertions (tier-3 ML-Series positive + negatives;
roles; xrefs; flags). Configuration Tool must **not** resolve to `czone_system`
(kind layer + tier-2 family layer).

---

## Calibration N — requirement kinds

Reuse known products; set `requirement_kind` correctly:

- VictronConnect app → `software_app`
- VE.Direct cable → `cable_or_consumable`
- MasterAdjust / CZone Configuration Tool → `commissioning_tool`
- GX device → `device`

Emit separate OR alternatives when the manual says "GX device or GlobalLink
520" — never one combined `description_verbatim`.

---

## Revision history

| Ver | Notes |
|-----|-------|
| 3.9 | Stability voting; calibration M; Combi flap; resolver tiers (legacy tier 2 fuzzy); Outremer |
| **4.0** | `requirement_kind`; tier 2 = FAMILY_ALIASES only; tier 4 reserved; OR-split in reduce; calibration N |
