# Design note — equipment class vs vessel plant role

**Recorded:** 2026-07-28 (after Phase 4 W4 human read of `sister-test`)  
**Status:** recorded direction — **not implemented**. No schema migration; no
rip of `GUEST_*_BY_CATALOG` yet.  
**Parent plan:** [`guide-stage4-integration-plan.md`](guide-stage4-integration-plan.md)
(Phase 4 / Decision 4a).

---

## Non-negotiable

Once mature, **adding an equipment registry item must not require composer code
changes.** Classification and guest-facing semantics live in data (registry /
interaction profile / vessel substrate / vessel facts), not in per-model
dictionaries in Python.

The current tables in `guide_composer_device.py`:

- `GUEST_LABEL_BY_CATALOG`
- `GUEST_ROLE_BY_CATALOG`
- `GUEST_ROLE_BY_KEY`

are **Outremer freeze shims** — transitional for byte-match — not the target
architecture.

**Policy:** do not add new entries to those maps for new gear. New models must
work via substrate/profile fields (or honest gap).

---

## Two layers (do not collapse)

| Layer | Question | Example | Where it lives |
|-------|----------|---------|----------------|
| **Equipment class** (model-level) | What kind of device is this? | `solar_charge_controller`, `lithium_battery`, `watermaker` | Interaction profile / registry-adjacent; same for every boat that fits that model |
| **Plant role** (vessel-level) | How is *this install* used on this boat? | `house_bank` vs `engine_start_bank`; davit vs coachroof array | Vessel substrate, instance fields, or vessel facts — **not** the manual alone |

A battery can be the house bank on one vessel and an engine/start bank on
another. Extraction from the MLI manual cannot know that. **Class ≠ role.**

---

## Guest wording (nickname) — not a third taxonomy by default

Wording in guest prose (“the engines”, “the davit array controller”) is
**conceptually** distinct from class, but we have **not** locked a permanent
`guest_role` column on every registry row.

Working hypothesis (**open — not decided**):

1. **Derive** default guest phrases from plant **class** + existing plant
   fields where possible:
   - singular/plural ← `quantity`
   - port/starboard ← `side` / place / `instance_label` (do not invent side in
     code when substrate only has chart-table labels — Combi port/stbd on
     Outremer is prose convention debt)
   - davit/coachroof ← place or vessel facts (Solar already binds via facts)
2. **Disallow brand-as-role** as a special nickname type (e.g. platform named
   only “CZone”) — prefer manufacturer/model first-use or a function phrase;
   existing Controls “CZone” prose may need oracle/voice policy if enforced.
3. **Rare vessel overrides** only when derivation would be wrong — not a
   parallel catalog of nicknames for every `catalog_key`.

**Open decision:** is `guest_role` a first-class stored field, or
derived/override-only?

---

## How class gets onto a profile (avoid end-user forms)

Stage 1 already emits `device.category_freeform` in the **manual’s own words**
(e.g. `"solar MPPT charge controller"`). Keep that rule.

Mapping freeform → closed `plant_functions[]`:

- Prefer a **deterministic normalizer** (synonyms over a short closed vocab).
- Optional **small, low-token classify** at **profile promote / review time**
  on misses — same posture as Stage 1.5 / Stage 3.
- **No LLM at Stage 4 Generate** (composers stay pure code over stored data).
- High confidence → auto-write class onto the profile; low confidence → staff
  library review — **not** guest/owner inventory forms.
- **Do not** ask the once-per-model classify to emit vessel roles
  (`house_bank`).

---

## What already exists vs what would be new

### Existing (keep using)

- Equipment / substrate: `manufacturer`, `model`, `quantity`, `description`,
  `system_category`, `side`, `places`, `instance_label`
- Profile: `device.*`, `control_surfaces`, `operator_actions`, networks,
  `category_freeform`
- Graph: section assignment, topology roles, `assemble_section_inputs`
- Vessel facts: layout, wattage, array observations, UI host facts

### New when we implement (data, not Python maps)

- Closed **class** vocabulary + bindings on the interaction profile
  (proposed at promote; reviewed when low-confidence)
- Vessel **role** tags on install / facts where class alone is insufficient
- Optional `guest_label` on a vessel row when registry model strings are wrong
  for guest parens (hook already coded in `guide_composer_device`; rarely
  needed if manufacturer/model are clean)
- Migration: seed Outremer’s current shim-map wording into data once so
  byte-match holds, then delete or empty the code catalogs

---

## Relationship to Phase 4 decisions

- **Decision 3** (naming from profile/equipment): affirmed; maps are debt.
- **Decision 4** (family via graph/profile predicates): still valid interim;
  explicit class bindings are the cleaner long-term selector for composers.
- **Decision 4a:** this note **records** the analysis; implementation is a
  follow-on spike (start with one family, e.g. MPPT →
  `solar_charge_controller`), not a blocker for W1–W5 which already shipped.

---

## Explicitly deferred

- Registry ↔ Stage 4 substrate merge (decision 7 / Phase 4b)
- Universal “any OEM stack” composers (Cattitude / Garmin–Victron is a later
  phase after same-family proof)
- LLM inside `compose_*` / Generate
- Owner onboarding UI for plant roles

---

## Evaluation questions still open before implement

1. Short table of classes already implied by frozen composers.
2. Minimum vessel-role vocab (house bank, array mount, …) vs facts-only.
3. Go / no-go on stored `guest_role` vs derive-only.
4. Spike: migrate one family off `GUEST_*_BY_CATALOG` with Outremer byte-match
   green and `sister-test` still coherent.
