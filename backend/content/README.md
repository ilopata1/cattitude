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
| `crew_layers/` | Shared crew sections filled from `guide_context.crewFacts` |
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
make content-verify
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

These older handbook keys use the same store. A blank value is still omitted, except where the slot publishes a stand-in sentence: `showerPumpSwitch` becomes “the switch on the wall”, a missing life-raft location becomes “The skipper will show you where the life raft is kept.”, and an unset `headsFlushWater` becomes “water” inside “flush with water”. `scripts/report_audience_coverage.py` looks for those stand-ins in guest prose.

| Key | Type | Slot | Condition |
|-----|------|------|-----------|
| `lifeRaft.location` | string | `life_raft_sentence` | `has_life_raft_location` |
| `manualBilge.location` | string | `manual_bilge_location` | `has_manual_bilge_location` |
| `swimLadders` | list of `{label, location, deploy}` (one line `label \| location \| deploy` in admin) | `primary_ladder_subtitle` | `has_swim_ladders` |
| `waste.routing` | string | `waste_routing` | `has_waste_routing` |
| `waste.organicOverboard` | bool | — | `organic_overboard` |
| `headsFlushWater` | `fresh` or `sea` | `heads_flush_phrase` | `heads_flush_fresh` or `heads_flush_sea` |
| `showerPumpSwitch` | string | `shower_pump_switch` | — (blank publishes the stand-in above) |
| `holdToDim` | bool | — | `hold_to_dim` |
| `hasTrampoline` | bool, or omitted to follow the hull | — | `has_trampoline` |
| `hasJacklines` | bool, or omitted to follow sailing | — | `has_jacklines` |

## Crew facts

Optional keys on `guide_context.crewFacts` (JSONB, no migration). The owner fills them in on Admin → Guide context, under Crew facts. A blank value is omitted. Shared files in `crew_layers/` turn a filled fact into a section, and every one of those sections is published with `audience: crew`. Long notes that belong to one boat stay in `vessels/{slug}/crew/`.

`has_crew_fact:` takes the dotted key (for example `has_crew_fact: seacocks.list`). `has_daggerboards` is true only when `daggerboards.has` is true. `cf_seacocks_list` is one bullet per line, joined with newlines. The other slots are the text the owner wrote.

`crew_fact_gaps` names the blanks that matter for this boat: daggerboards only on a sailing catamaran, the mainsail only on a sailing boat, anchoring gear only when the boat has ground tackle, and seacocks, standing orders, and MOB recovery on every boat. The same sentences are written as owner questions (`crewfact:<dotted.key>`) when Stage 4 or a template module is generated. A blank crew fact omits its section, so the published guide has no stand-in sentence for it. `scripts/report_audience_coverage.py` reports a crew-fact gap when published prose still contains a `{cf_…}` slot.

| Key | Type | Slot | Condition |
|-----|------|------|-----------|
| `daggerboards.has` | bool | `cf_daggerboards_has` | `has_daggerboards` |
| `daggerboards.notes` | string | `cf_daggerboards_notes` | `has_crew_fact: daggerboards.notes` |
| `mainsail.hoist` | string | `cf_mainsail_hoist` | `has_crew_fact: mainsail.hoist` |
| `mainsail.reefing` | string | `cf_mainsail_reefing` | `has_crew_fact: mainsail.reefing` |
| `mainsail.preventer` | string | `cf_mainsail_preventer` | `has_crew_fact: mainsail.preventer` |
| `headsails.notes` | string | `cf_headsails_notes` | `has_crew_fact: headsails.notes` |
| `winches.map` | string | `cf_winches_map` | `has_crew_fact: winches.map` |
| `clutches.map` | string | `cf_clutches_map` | `has_crew_fact: clutches.map` |
| `seacocks.list` | one line per seacock | `cf_seacocks_list` | `has_crew_fact: seacocks.list` |
| `engines.daily` | string | `cf_engines_daily` | `has_crew_fact: engines.daily` |
| `fuel.summary` | string | `cf_fuel_summary` | `has_crew_fact: fuel.summary` |
| `anchoring.gear` | string | `cf_anchoring_gear` | `has_crew_fact: anchoring.gear` |
| `mooring.sternTo` | string | `cf_mooring_stern_to` | `has_crew_fact: mooring.sternTo` |
| `electrical.batterySwitches` | string | `cf_electrical_battery_switches` | `has_crew_fact: electrical.batterySwitches` |
| `electrical.shorePower` | string | `cf_electrical_shore_power` | `has_crew_fact: electrical.shorePower` |
| `electrical.navLights` | string | `cf_electrical_nav_lights` | `has_crew_fact: electrical.navLights` |
| `bilge.layout` | string | `cf_bilge_layout` | `has_crew_fact: bilge.layout` |
| `standingOrders.text` | string | `cf_standing_orders_text` | `has_crew_fact: standingOrders.text` |
| `mob.recovery` | string | `cf_mob_recovery` | `has_crew_fact: mob.recovery` |
| `heavyWeather.prep` | string | `cf_heavy_weather_prep` | `has_crew_fact: heavyWeather.prep` |
| `spares.location` | string | `cf_spares_location` | `has_crew_fact: spares.location` |
| `vhf.mmsi` | string | `cf_vhf_mmsi` | `has_crew_fact: vhf.mmsi` |
| `vhf.handsets` | string | `cf_vhf_handsets` | `has_crew_fact: vhf.handsets` |

## Who sees what

Guest view is every published entry that has no `audience` field. Crew view is the whole guide. YAML `audience: guest` and `audience: both` publish as both views (the field is left off). Any other value is an error.

| Content | Default | Where to override |
|---------|---------|-------------------|
| Stage 4 spine block listed in `CREW_BLOCKS_BY_SECTION` (`guide_section_to_module.py`) | crew | A guest layer that replaces the same title keeps that tag unless its YAML sets `audience` |
| Capability summary, Equipment Locations, Related, and `photo` sections | both | The composer does not tag these |
| Solar fold into Batteries | crew | — |
| Shared guest layer (`guest_layers/{system}.yaml`) | both | `audience: crew` on the section |
| Vessel guest file (`vessels/{slug}/guest/{system}.yaml`) | both, or the audience of the section it replaces | `audience:` on the section |
| Shared crew layer (`crew_layers/{system}.yaml`) | crew | Forced. A YAML audience is ignored |
| Vessel crew file (`vessels/{slug}/crew/{system}.yaml`) | the YAML's `audience` (these files set crew) | `audience:` on the section |
| Fragment or LLM section whose title is a crew block heading, or matches start, shutdown, outboard, prime, bleed, or isolat | crew | `audience: guest` on the section or the fragment entry. `photo` and `equipment_locations` stay both |
| Checklist file | both (`safety-brief`, `gh`) | Top-level `audience: crew` (`pd`, `anch`, `lu`, `ec`) |
| Checklist item | both | `audience: crew` on the item. `gc:` is the line a guest ticks |
| Fix card | crew, except the five cards that stay both and set `guest_steps` | `audience:` on the card. A crew card must not set `guest_steps` |
| Extra fix card from an equipment fragment | crew | `audience: guest` on that fragment entry |
| Static home rule | both | `audience: crew` in `home_rules/static_rules.yaml`. The synthesised “monitor VHF 16” rule is crew |
| Local rule from `guide_context.localRules` | both | Always both |
| Emergency contact | both | `"audience": "crew"` on the admin JSON entry. Region-pack rescue contacts stay both |
| Learn check taken from a crew “Turning it on” section | omitted from the guest Learn list | Publish skips crew procedure sections |

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
