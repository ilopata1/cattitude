# Curated guide content library

Guest-facing copy for hybrid guide modules (home rules, checklists, fix cards) lives here as YAML data plus a small Python assembly engine. This is separate from [`prompts/`](../prompts/README.md), which holds LLM instructions.

## Layout

| Path | Purpose |
|------|---------|
| `loader.py` | Load YAML files; strip leading `#` doc headers |
| `slots.py` | Resolve `{vessel_name}`, `{both_engines}`, `{contact_step}`, etc. from a vessel snapshot |
| `conditions.py` | Evaluate `when:` blocks (`has_category`, `twin_engine`, `is_sailing`, …) |
| `assembler.py` | Build module payloads; exports `LIBRARY_MODULE_BUILDERS` |
| `home_rules/` | Section headings + static rules (runtime `localRules` still come from guide context) |
| `region_packs/` | National rescue contacts keyed by country code (`sar.yaml`), appended to the emergency module |
| `checklists/` | One YAML file per checklist (`safety-brief`, `gh`, `pd`, `anch`, `lu`, `ec`) |
| `fix_cards/` | Default troubleshooting cards (equipment fragments can override after assembly) |

`guide_content_library.py` at the backend root is a thin re-export of `LIBRARY_MODULE_BUILDERS` so existing imports keep working.

## Editing content

1. Open the relevant YAML file. Each file starts with a `#` header describing purpose and module key.
2. Use `{slot}` placeholders for vessel-specific text (see `slots.py` for available names).
3. Gate items with `when:` when they depend on equipment or vessel type:

```yaml
- c: Raw water seacocks OPEN on {both_engines}
  when:
    has_category:
      - propulsion
```

For multiple required categories, use `all:`:

```yaml
when:
  all:
    - has_category: [electrical_dc]
    - has_category: [navigation_electronics]
```

4. Tag `audience: crew` when only the Crew reading view should show it. The same values are accepted on sections, checklist files, checklist items, fix cards, static home rules, and emergency contacts. Leave the field off, or set `audience: guest` (or `both`), when both views should show it. Crew view shows everything. Any other value is an error. The published payload only ever contains `audience: crew`; `guest` is not written out. A checklist item may also set `gc:` — the line a guest ticks. It is published as `gc` when present, and the Guest view shows that text instead of `c`. A fix card both views should show may set `guest_steps:` (published as `guestSteps`). A crew card must not.

   Vessel-only crew sections live in `vessels/{slug}/crew/{system}.yaml` and are appended for that slug. A same-titled correction for one boat lives in `vessels/{slug}/guest/{system}.yaml` and replaces that section in place. Name photos by key from `vessels/{slug}/crew_photos.yaml`.

5. After edits, run parity verification:

```bash
cd backend
python scripts/verify_content_library.py
```

## Guest facts

Optional keys on `guide_context.guestFacts` (JSONB, no migration). The owner fills them in on Admin → Guide context. A blank value is omitted. Shared guest layers read the slots below. `guest_fact_gaps` in `slots.py` names the important blanks: life jackets, fire extinguishers, the first-aid kit, the EPIRB, and the fixed VHF always; hot water only when a heater is on the registry; the autopilot only when the boat has navigation electronics.

| Key | Type | Slot | Condition |
|-----|------|------|-----------|
| `lifeJackets.location` | string | `life_jackets_location` | `has_life_jackets_location` |
| `fireExtinguishers.location` | string | `fire_extinguishers_location` | `has_fire_extinguishers_location` |
| `firstAidKit.location` | string | `first_aid_location` | `has_first_aid_location` |
| `flares.location` | string | `flares_location` | `has_flares_location` |
| `epirb.location` | string | `epirb_location` | `has_epirb_location` |
| `grabBag.location` | string | `grab_bag_location` | `has_grab_bag_location` |
| `throwable.location` | string | `throwable_location` | `has_throwable_location` |
| `vhfDsc.location` | string | `vhf_dsc_location` | `has_vhf_dsc_location` |
| `hotWater.source` | string | `hot_water_sentence` | `has_hot_water_sentence` |
| `waterTanks.summary` | string | `water_tanks_sentence` | `has_water_tanks_sentence` |
| `autopilot.standby` | string | `autopilot_standby_sentence` | `has_autopilot_standby` |
| `galleyStove` | `induction`, `gas`, or `electric` | `galley_stove` | `galley_stove:` equals that value |
| `galleyTapNote` | string | `galley_tap_note` | `has_galley_tap_note` |
| `cabinNames` | list of strings (one per line in admin) | `cabin_names_sentence` | `has_cabin_names` |
| `hatchNotes` | string | `hatch_notes` | `has_hatch_notes` |
| `lifejacketPolicy` | string | `lifejacket_policy` | `has_lifejacket_policy` |
| `moorsSternTo` | bool | — | `moors_stern_to` |
| `marinaRoutine` | string | `marina_routine` | `has_marina_routine` |

`cabin_names_sentence` reads “The cabins are called: …”. Location slots are the location text alone.

## Regenerating from legacy

`scripts/materialize_guide_content.py` can rebuild YAML from `guide_content_library_legacy.py` (kept for verification). Prefer hand-editing with slots after the initial export; re-run materialize only when merging large legacy changes.

## Module keys

| Key | Source |
|-----|--------|
| `ui` / `homeRuleSections` | `home_rules/*.yaml` + runtime local rules |
| `checklist` / `safety-brief`, `gh`, `pd`, `anch`, `lu`, `ec` | `checklists/*.yaml` |
| `fix_card_set` / `all` | `fix_cards/cards.yaml` |

Equipment-specific fix-card enrichment still happens in `guide_equipment_fragments.py` after library assembly.

## Stable keys (user overlay prerequisite)

Fix cards in `fix_cards/cards.yaml` already use a `key` field (e.g. `engine_wont_start`). **Keep `key` through publish** into the mobile bootstrap JSON — it is required for future per-user overlays and regen-safe patch paths.

When adding checklist groups or items, add explicit `key` fields where practical. Do not rely on array index alone for content that users may personalize later.

See [`cursor-build-user-overlays.md`](../../cursor-build-user-overlays.md) and `PLATFORM_ROADMAP.md` § User guide personalization.
