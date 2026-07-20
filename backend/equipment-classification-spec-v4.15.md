# Equipment classification specification — v4.15

Follow-on to
[`equipment-classification-spec-v4.14.md`](equipment-classification-spec-v4.14.md).

## Global Stage 4 composition rules (all sections, all vessels)

These rules live in the composition layer (`guide_composition_rules.py`).
They contain **no** section-specific or vessel-specific logic. Batteries &
Energy v1 is the **founding counterexample** only.

### 1. Section-scope ordering

Ordering and grouping govern the **whole section**, not individual sentences.

Every operate-tier Know section follows this spine (slots may be empty when
a section has nothing for that slot):

| Spine slot | Role |
|------------|------|
| `capability_summary` | Identity / what the boat has |
| `how_it_works` | How the system works (members + operating conditions co-located) |
| `monitoring` | Daily use |
| `adjusting` | Settings the owner touches |
| `troubleshooting` | Fault / emergency response |
| `reference` | Protection / cross-section reference / deferred caveats |

**Alias map** (legacy composer block names → spine):

| Legacy block | Spine slot |
|--------------|------------|
| `charging` | `how_it_works` |
| `inverter` | `adjusting` |

Rules:

- Related facts for one functional group share a paragraph (or adjacent
  sentences in the same spine slot), including operating conditions.
- Cross-references to the **same** target section are consolidated (one
  reader-facing pointer, or adjacent sentences in one slot — not repeated
  in non-adjacent slots).
- Emergency content sits in `troubleshooting`, never adjacent to routine
  `adjusting` settings.
- **Criterion:** no topic appears in two non-adjacent spine slots.

### 2. Orphan-fact rule

If a device contributes only one sentence to a section, composition either:

- gives a **minimal complete treatment** (what it does + when the owner
  interacts), or
- demotes it to the `reference` (or caveat) block.

No drive-by single facts mid-narrative.

Founding counterexample: B&E v1 Silentwind brake-only sentence mid-charging.

### 3. Vocabulary lint (owner language)

Internal / system phrasing → owner language.

| Banned (examples) | Prefer |
|-------------------|--------|
| `protective status` | `state of charge and any alarms` (founding) |

Bare equipment counts must carry the **operational quantity** where sources
support it (e.g. “2 alternator regulators…”, not a later bare “the Alpha Pro
regulators” without quantity on first group mention).

### 4. Wisdom-layer requirement

Every operate-tier section must expose a **wisdom slot**: at least one
`composed_inference` of operational guidance (Solar boom-shade class —
provenance id S6 on the Solar v4 fixture; often cited as “S7/S8 class” in
review notes).

- **This round:** add the requirement + slot only. Content may be
  `status: pending` (thin/empty) until a per-section wisdom round.
- **Solar (vii)** remains stricter: evidence-backed non-empty inference
  required for Solar pass (see collisions).

Shared assessor: `assess_global_composition()` → criteria **(xxxii)–(xxxv)**.

## Collision notes (do not silently resolve)

| Existing policy | New rule | Collision |
|-----------------|----------|-----------|
| Solar **(ix′)** capability→monitoring→adjusting→troubleshooting (v4.9) | 6-slot spine adds `how_it_works` + `reference` | **Mapped, not replaced.** Solar may omit empty spine slots; legacy order must remain a valid subsequence under the alias map. Do not force Solar to rename blocks in this round. |
| Solar **(vii)** / **(x)** non-empty evidence-clean `composed_inference` | Wisdom slot may be empty/`pending` this round | **Stricter Solar wins for Solar.** Global (xxxv) accepts pending; Solar evaluate still requires filled inference. |
| Review note “solar S7/S8 class” | Solar v4 fixture wisdom is **S6** (`composed_inference` boom-shade) | **ID mismatch in review notes** — founding wisdom class is S6; S7/S8 are adjusting sourced actions. Spec uses “boom-shade / Solar S6 class”. |
| Controls `SECTION_ORDER` includes `reference` already | Spine `reference` | Compatible. |
| B&E v4.14 used `charging` + `inverter` blocks | Spine aliases | B&E v2 remaps to spine names; aliases keep global assessor stable. |
| PRINCIPLES §7 composed_inference needs attached evidence | Empty wisdom slot | Pending slot is **not** a rendered inference claim — no evidence required until filled. |

## Evaluation additions (global)

| # | Criterion |
|---|-----------|
| **(xxxii)** | Spine order: emitted blocks are a non-decreasing subsequence of the spine (after aliases) |
| **(xxxiii)** | Orphan-fact: no single-sentence mid-narrative device without complete treatment or `reference` demotion |
| **(xxxiv)** | Vocabulary: no banned internal phrasing (`protective status`, …) |
| **(xxxv)** | Wisdom slot present (`composed_inference` filled **or** explicit `wisdom_slot.status=pending`) |

## Batteries & Energy v2 (first application — not part of the rule)

- Remap to spine blocks; co-locate charge sources + conditions in
  `how_it_works`.
- Wind generator: minimal complete treatment (contribution + when to brake).
- Consolidate Controls xrefs; BMS reset only in `troubleshooting`; Electrical
  pointer in `reference`.
- Wisdom slot pending (empty) — expected this round.

## Revision history

| Ver | Notes |
|-----|-------|
| **4.15** | Global spine / orphan / wisdom; xxxii–xxxv |
| → | See [`equipment-classification-spec-v4.16.md`](equipment-classification-spec-v4.16.md) for same-breath / spell-out / surface-bound adjusting |
| 4.14 | Batteries Stage 4 composer; xxvi–xxxi |
