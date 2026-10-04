# Build series: Guest / Crew audience across the whole guide

Twelve prompts for an implementing LLM. Run them in order; each one assumes the
previous ones have landed. Together they make the Guest/Crew split apply to every
content type, move operator procedures out of the Guest view by default, add the
guest-facing content every vessel needs, and give crew a facts-driven layer, so that
the next Generate → approve → publish for **any** vessel reflects the review in
`canvases/supernova-guest-crew-review.canvas.tsx`.

Line numbers are correct as of commit `2c3f1543`. If a file has drifted, search
for the quoted identifier rather than trusting the number.

---

## Preamble (paste at the top of every prompt)

```
You are working in the Cattitude / Clever Sailor monorepo. Read these first:
README.md (sections "User perspectives" and "Handoff notes"), backend/content/README.md,
PRINCIPLES.md, backend/content/assembler.py, mobile/src/app/core/guide/reader-view.ts.

Standing rules for this series:
- Audience vocabulary on published payloads is a single optional field `audience`
  whose only published value is "crew". Omitted means both reading views. In YAML,
  `audience: guest` is accepted and means both (existing behaviour, see
  backend/content/assembler.py:369-383); any other value is a hard error.
- Guest view = everything not tagged crew. Crew view = everything.
- Do NOT bump BOOTSTRAP_SCHEMA_VERSION (backend/guide_bootstrap.py:19,
  mobile/src/app/core/models/bootstrap-schema.ts). Every new payload field is optional
  and every mobile reader must tolerate its absence (older published bundles).
- No Alembic migration: guestFacts and crewFacts live inside vessels.guide_context JSONB;
  guide_content.payload is JSONB.
- Keep stable keys on checklist items and fix cards (backend/content/README.md
  "Stable keys"). Never re-index items for the Guest view; filter at render time
  while preserving the original group/item indices the progress store uses
  (mobile/src/app/core/services/progress.service.ts:32-76).
- Guest prose follows the existing plain-English voice of backend/content/guest_layers/*.yaml:
  short sentences, second person, no manual jargon, no "if applicable".
- No DB is available to you. Anything that needs Postgres (re-writing the Stage 4
  oracle, live scans) must be listed under "Operator follow-up" in your final message,
  with the exact command.
- Before finishing each prompt run, from backend/:
    python scripts/verify_content_library.py
    python scripts/verify_library_profile.py
    python scripts/verify_learn_checks.py
    python scripts/verify_guest_withhold.py
    python scripts/verify_section_duplicates.py
    python scripts/verify_stage4_modules.py          (fixture mode, no DB)
  and from mobile/:
    npx ng test --watch=false --browsers=ChromeHeadless
  Fix what you broke. Then commit with a conventional message scoped to the prompt.
```

---

## Prompt 1 — One audience helper for every content type

```
Goal: replace the section-only audience parser with a shared helper so checklists,
fix cards, home rules and emergency contacts can carry the same tag.

1. Create backend/content/audience.py exporting:
     PUBLISHED_CREW = "crew"
     def read_audience(spec: dict, *, label: str) -> str | None
   Semantics identical to backend/content/assembler.py:369-383 (`_apply_section_audience`):
   None/"guest"/"both" -> None; "crew" -> "crew"; anything else raises
   ValueError(f"{label!r} audience must be guest or crew, got {raw!r}").
   Also export:
     def stamp_audience(target: dict, spec: dict, *, label: str) -> None
   which sets target["audience"] = "crew" when read_audience returns "crew" and
   otherwise leaves target untouched (never writes audience: "guest").

2. In backend/content/assembler.py replace the body of `_apply_section_audience`
   (lines 369-383) with a call to stamp_audience, keeping the function name so
   `_sections_from_spec` (line 454) is unchanged.

3. Checklists. In `_resolve_checklist_items` (lines 86-110) stamp audience onto each
   item entry from the YAML item (label = item key or text). In `build_checklist_module`
   (lines 233-255) read a top-level `audience:` from the checklist YAML and, if crew,
   set `payload["audience"] = "crew"` on the returned dict ({"groups": ..., "audience": "crew"}).
   `_override_item` (113-127) and `_apply_checklist_overrides` (130-169) must carry
   `audience` through replace/insert_after.

4. Fix cards. In `build_fix_cards_module` (258-281) stamp `audience` from the card
   YAML onto the payload. `_apply_fix_overrides` (284-307) must preserve it.
   In backend/guide_equipment_fragments.py `apply_fix_card_fragments` (120-170):
   overrides keep the card's existing audience; `extra_fix_cards` default to
   audience "crew" unless the fragment entry sets `audience: guest`.

5. Home rules. In `build_home_rules_module` (172-230) stamp audience from each
   static rule (backend/content/home_rules/static_rules.yaml). Rules that come from
   guide_context.localRules (lines 183-189) are always both.

6. Emergency contacts. In backend/guide_template_assembly.py `_normalize_contact`
   (79-94) copy `audience: "crew"` through when the admin JSON entry has it.

7. Validators in backend/guide_generation.py must accept the new optional fields and
   reject bad values:
   - `_validate_checklist_module` (641-657): allow payload["audience"] in {None,"crew"};
     allow item["audience"] in {None,"crew"}.
   - `_validate_fixes_module` (660-672): allow card["audience"] in {None,"crew"}.
   - homeRuleSections branch (622-623): allow rule["audience"].
   - `_validate_system_module` (700-756): add an explicit check that
     section.get("audience") in (None, "crew") — today it is silently accepted.

8. Mobile models, backend/mobile parity only (no behaviour yet):
   mobile/src/app/core/models/bootstrap-content.model.ts — add
   `audience?: 'crew'` to ChecklistItem (71-74), Checklist (81-85), FixCard (99-105),
   HomeRule (109-114), EmergencyContact (17-23). Keep SystemSection's existing
   `audience?: 'guest' | 'crew'` (43-44) but add a comment that only 'crew' is published.

9. Docs: backend/content/README.md step 4 (line 41) — rewrite to say audience is
   accepted on sections, checklist files, checklist items, fix cards, static home
   rules and emergency contacts, with the same values.

10. Tests: in backend/scripts/verify_content_library.py add `_check_audience_plumbing`
    (call it from the existing main) that builds the library modules for the "full"
    fixture (line 102) and asserts: a YAML item tagged crew publishes audience "crew";
    an untagged item publishes no audience key; an invalid value raises ValueError.
    Use a temporary in-memory spec, do not edit the shipped YAML in this prompt.

Acceptance: all verify scripts pass; no shipped YAML changed; published payload for
Supernova fixtures is byte-identical to before (no audience keys appear yet because
no YAML is tagged).
```

---

## Prompt 2 — Composed system chapters: procedural blocks default to crew

```
Goal: Stage 4 composers currently publish operator procedures to guests. Make the
Phase 1 transform tag procedural blocks crew per system, and make downstream publish
steps respect the tag.

1. backend/guide_section_to_module.py
   a. After BLOCK_HEADINGS (lines 43-50) add:
        CREW_BLOCKS_BY_SECTION: dict[str, frozenset[str]] = {
          "engines":    {"startup","monitoring","adjusting","troubleshooting","reference"},
          "electrical": {"how_it_works","monitoring","adjusting","troubleshooting","reference"},
          "batteries":  {"adjusting","troubleshooting","reference"},
          "controls":   {"monitoring","adjusting","troubleshooting"},
          "water":      {"how_it_works","startup","monitoring","adjusting","troubleshooting","reference"},
          "heads":      {"how_it_works","startup","monitoring","adjusting","troubleshooting","reference"},
          "nav":        {"startup","monitoring","adjusting"},
          "ac":         {"troubleshooting","reference"},
        }
        SOLAR_FOLD_AUDIENCE = "crew"
      with a docstring explaining: guests get the human version from
      content/guest_layers; capability_summary, Equipment Locations and Related are
      never tagged.
   b. Give `_enrich_block_paragraphs` (217-273) a keyword argument
      `audience: str | None = None`; every section it appends gets
      `section["audience"] = audience` when audience is not None.
   c. In `section_to_system_module` spine loop (566-578) pass
      audience="crew" if block in CREW_BLOCKS_BY_SECTION.get(section_id, frozenset()) else None.
   d. `solar_fold_sections` (533-541): pass audience=SOLAR_FOLD_AUDIENCE.
   e. `extra_sections` (580-581) are appended as-is (solar already tagged).
   f. Do not touch `_synthesize_learn_checks` (377-396); publish replaces those.

2. backend/guide_learn_checks.py `_action_facts` (182-193): skip sections whose
   audience is "crew". Guest Learn must not derive "Turning it on" checks from crew
   procedures. `_location_facts` is unchanged.

3. backend/guide_section_duplicates.py `_fold_sections` (103-125): the while-loop
   condition must also require
     sections[end].get("audience") == section.get("audience")
   so a crew section is never folded into a both section of the same title.
   `_merge_group` (131+) already keeps the first section's extra keys; confirm
   audience survives.

4. backend/guide_guest_withhold.py: add
     def guest_visible_section_count(module: dict) -> int
   (sections with a body and audience != "crew"). Do not change withholding
   behaviour; a crew-only chapter still publishes (crew need it).

5. backend/guide_publish.py `validate_publication_payload` (105-135): add a warning
   per system whose guest_visible_section_count is 0:
     f"{title}: no sections are visible in the Guest view."
   This is a Warning:, not an error.

6. backend/content/assembler.py `apply_vessel_guest_layers` (530-574): when an
   incoming section replaces an existing one by title (lines 561-563) and the incoming
   spec has no audience, inherit the replaced section's audience. Otherwise the
   Supernova override file vessels/supernova/guest/water.yaml (which replaces
   "How it works", "Turning it on", "Monitoring", "Operating", "If something's not
   right", "Care & upkeep") would re-expose those sections to guests.
   Apply the same inheritance in `apply_guest_layers` (488-527): a shared guest
   layer that replaces a same-titled section inherits that section's audience unless
   the YAML sets one explicitly.

7. Supernova content clean-up that this makes necessary:
   - backend/content/vessels/supernova/crew/water.yaml lines 119-126
     ("Flushing the watermaker") duplicate the now-crew "Care & upkeep"; delete that
     section.
   - backend/content/vessels/supernova/guest/water.yaml: add `audience: crew` to the
     "Care & upkeep" section explicitly (belt and braces), and leave `summary:` as is.

8. Verification:
   - backend/scripts/verify_stage4_modules.py fixture mode must still pass the live
     validator. Add an assertion there that, for the outremer fixture, every
     "Turning it on" section in water/engines carries audience "crew" and the
     batteries "How it works" section does not.
   - backend/scripts/verify_section_duplicates.py: add a case proving a crew
     "Operating" followed by a both "Operating" is NOT folded.
   - backend/scripts/verify_learn_checks.py: add a case proving a crew "Turning it on"
     produces no startup learn check.

Operator follow-up to list in your final message (needs DB):
   cd backend && python scripts/verify_stage4_modules.py --write-oracle --slug supernova
   then review the oracle diff per backend/tests/fixtures/POLICY.md (human-gated) and
   re-run --byte-match and --substrate-match.
```

---

## Prompt 3 — Guest layers can own the summary; guest sections sit before "Related"

```
Goal: let shared guest layers set chapter summary/subtitle (the Heads chapter opens
with blackwater valve prose on the guest Home tile), and place guest sections ahead of
the composed "Related" footer.

backend/content/assembler.py

1. `apply_guest_layers` (488-527):
   a. Support top-level `summary:` and `subtitle:` in guest_layers/{system}.yaml
      exactly as `apply_vessel_guest_layers` does at lines 571-573 (slots applied).
   b. Support top-level `crew_summary_section:` (string title). When present and the
      incoming payload had a non-empty summary, append a prose section
      {t: <title>, type: prose, c: <old summary>, audience: "crew"} BEFORE the new
      sections, so the composed capability summary is kept for crew.
   c. Insert incoming sections before a trailing section titled "Related"
      (normalise_title == "related") when one exists; otherwise append. Keep the
      replace-by-title behaviour.
   Apply the same "before Related" placement in `apply_crew_layers` (601-623) and
   `apply_vessel_guest_layers` (564-569 append branch).

2. backend/guide_section_to_module.py `_subtitle_from_summary` is only run at
   transform time; so when a guest layer sets `summary:` without `subtitle:`,
   recompute the subtitle in apply_guest_layers using the same first-sentence rule
   (import and reuse `_subtitle_from_summary`; vessel name from slots.vessel_name).

3. Learn checks from guest layers already merge (lines 515-526). No change.

4. Content: backend/content/guest_layers/heads.yaml — add
     summary: >-
       The heads on {vessel_name} flush with {heads_flush_phrase}. Nothing but human
       waste goes in them. Paper goes in the bin.
     crew_summary_section: How the waste system is set up
   Add slot `heads_flush_phrase` in backend/content/slots.py `slot_values` (363-404):
   "fresh water, so every flush comes out of the tanks" | "sea water" | "water"
   from `heads_flush_water` (286-288).

5. Verification: extend `_check_handbook` in backend/scripts/verify_content_library.py
   (134+) — build heads with a fake composed payload whose summary mentions
   "discharge valves" and assert: guest summary is the new sentence; a crew prose
   section titled "How the waste system is set up" holds the old summary; the
   "Related" section is still last.
```

---

## Prompt 4 — Guest facts: the fields every guest chapter needs

```
Goal: extend guide_context.guestFacts so shared guest layers can state where the
safety gear is, where hot water comes from, how to take the helm from the autopilot,
what the stove is, and the cabin names — for any vessel, filled in by the owner in
admin, with publish warnings when the important ones are blank.

1. Schema (document it in backend/content/README.md under a new "Guest facts" table).
   New optional keys under guestFacts, all strings unless noted:
     lifeJackets.location, fireExtinguishers.location, firstAidKit.location,
     flares.location, epirb.location, grabBag.location, throwable.location,
     vhfDsc.location            (e.g. "the fixed VHF at the nav station")
     hotWater.source            (free sentence, e.g. "the 90 L tank in the starboard
                                 engine bay; it heats when the starboard engine runs or
                                 when the electric heater is on — red light under the CZone
                                 console")
     waterTanks.summary         (e.g. "two 270 L tanks, one under the bed in each aft cabin")
     autopilot.standby          (e.g. "press STANDBY on the pilot control beside the engine
                                 levers; the wheel is then live")
     galleyStove                 one of induction | gas | electric | unset
     cabinNames                  list of strings (admin: one per line)
     hatchNotes                  free text, optional
     lifejacketPolicy            free text, optional
     moorsSternTo                bool
     marinaRoutine               free text, optional

2. backend/guide_context_utils.py
   - `build_guest_facts` (58-112): add keyword args for each field above; only write
     keys that are non-empty; validate galleyStove; parse cabinNames lines.
   - `guest_facts_form_values` (132-155): round-trip every new field.
3. backend/admin/routes/vessels.py: add matching `Form("")` params to the handler at
   700-726, pass them into build_guest_facts (741-752), and include them in
   `guest_form` (727-738).
4. backend/admin/templates/vessels/guide_context.html (fieldset at 68-115): add inputs
   grouped under three sub-headings — "Safety gear locations", "Living aboard",
   "At the helm" — with placeholders drawn from the Supernova examples above.
5. backend/content/slots.py: add accessor functions + slot_values entries:
     life_jackets_location, fire_extinguishers_location, first_aid_location,
     flares_location, epirb_location, grab_bag_location, throwable_location,
     vhf_dsc_location, hot_water_sentence, water_tanks_sentence,
     autopilot_standby_sentence, galley_stove, cabin_names_sentence,
     hatch_notes, lifejacket_policy, marina_routine
   backend/content/conditions.py `flag_checks` dict (starts line 42, consumed at 56): add
     has_life_jackets_location, has_fire_extinguishers_location, has_first_aid_location,
     has_flares_location, has_epirb_location, has_grab_bag_location,
     has_throwable_location, has_vhf_dsc_location, has_hot_water_sentence,
     has_water_tanks_sentence, has_autopilot_standby, has_cabin_names, has_hatch_notes,
     has_lifejacket_policy, moors_stern_to, has_marina_routine
   and a `galley_stove: induction|gas|electric` equality check next to `heads_drive`.
6. backend/content/assembler.py `_day_one_items` (671-681): after the life raft add,
   in this order when present: life jackets, fire extinguishers, first-aid kit,
   throwable buoy, EPIRB, grab bag, flares. Keep manual bilge and ladders after them.
7. Publish warnings: backend/guide_publish.py `validate_publication_payload` (105-135)
   does not see the snapshot. Instead add to backend/guide_generation.py, where the
   template/library builder runs (`payload = template_builder(snapshot_payload,
   reference)` at line 1126), a non-fatal run note and ALSO add a new function
     def guest_fact_gaps(snapshot) -> list[str]
   in backend/content/slots.py returning human sentences for missing
   lifeJackets, fireExtinguishers, firstAidKit, epirb, vhfDsc, hotWater, autopilot
   (the last two only when has_water_heater / has_category navigation_and_electronics).
   Surface those in the admin guide overview page next to the existing owner
   questions (find the template that renders owner_question rows under
   backend/admin/templates/vessels/ and add a "Guest facts still blank" list).
8. backend/content/guest_facts/supernova.yaml: add the Supernova values that are
   already known from the crew notes (hotWater.source, waterTanks.summary,
   autopilot.standby, cabinNames: [port forward, port aft, starboard forward,
   starboard aft], moorsSternTo: true, galleyStove: induction). Leave the safety gear
   locations blank — the owner fills them in admin.
9. Verification: backend/scripts/verify_library_profile.py (it already builds
   snapshots with guestFacts at line ~58) — add cases proving each new slot renders
   and each flag gates; verify_content_library `_check_handbook` asserts
   "Find these on day 1" lists life jackets when the fact is set and not when blank.
```

---

## Prompt 5 — Guest content for every vessel (shared guest layers)

```
Goal: add the guest-facing sections the review found missing, as shared guest layers
gated on equipment and guest facts, so they publish on any vessel that qualifies.

Write or extend these files under backend/content/guest_layers/. Every section is
untagged (both views) unless stated. Use existing slot/condition names and the ones
added in Prompt 4. Each file must start with the standard `# Purpose / # Used by /
# Module` header. Keep every sentence short and in the existing voice.

1. safety.yaml (extend)
   - "Find these" list: one item per gear location fact, each gated with its
     has_*_location flag. Keep the existing "Life raft" and "Leaks and bilge" sections.
   - "If someone else falls overboard" (list): shout MAN OVERBOARD; point and never
     look away; throw the horseshoe or anything that floats; press MOB on the
     chartplotter (gate: has_category navigation_and_electronics); get the skipper.
   - "Life jackets and clipping on": `{lifejacket_policy}` when has_lifejacket_policy,
     else a default three-line policy (wear one at night, when reefed, in the dinghy,
     and whenever asked); jacklines line reused from seamanship when has_jacklines.
   - "If the skipper cannot carry on" (list): put both engine levers to neutral and
     stop the engines from the panel at the helm (gate propulsion; use {both_engines});
     under sail, turn the boat into the wind and let the sheets go (gate is_sailing);
     if you must stop, drop the anchor and let all the chain out (gate
     ground_tackle_and_mooring); call for help with the MAYDAY card on Home and the
     red DISTRESS button `{vhf_dsc_location}` (gate has_vhf_dsc_location, else "on
     the fixed VHF"); `{sar_contact_line}` (slot added in Prompt 8).
   - learnChecks: "Found the life jackets and the fire extinguishers",
     "Can say what to do if someone else goes in the water".

2. water.yaml (extend)
   - "Where the water comes from" (list, gate has_water_tanks_sentence or
     has_hot_water_sentence): `{water_tanks_sentence}`; `{hot_water_sentence}`;
     "If there is no hot water, that is usually why. Ask before you report it."
   - "What the watermaker is" (list, gate has_watermaker): it makes fresh water from
     the sea while we are under way or on the generator; it is why we can shower at
     anchor; never connect a town-water hose to fill the tanks unless asked; you may
     be asked to say when a tank gauge reaches 90 percent.
   - Keep "Using fresh water" and "Showers".

3. heads.yaml (extend)
   - In "Using the heads" add, after the flush-water line:
     "If the toilet will not flush, the water pump is probably off. Ask before you
     assume the tank is full." and, when heads_drive == electric, "Press the flush
     button once; do not hold it unless you are shown to."
   - "The bin": lid on, empty it ashore, nothing wet in it.

4. electrical.yaml (extend): add to "Using electricity":
   "If everything goes dark at once, tell the skipper. Do not reset anything yourself."

5. batteries.yaml (new, module system/batteries): "Keeping an eye on the batteries"
   — the skipper checks state of charge morning and evening; ask what the number is
   and you will soon know what is normal; a low-battery alarm means switch off what
   you are using and tell the skipper. Gate has_category electrical_dc.

6. engines.yaml (new): "Engines, for guests" (list, gate propulsion):
   `{both_engines_cap}` live under the aft steps / in the engine compartments
   (use {engine_compartments}); if an alarm sounds or the exhaust stops spitting
   water, tell the skipper at once; keep hands, lines and swimmers clear of the
   propellers; never swim with an engine running.

7. nav.yaml (new): "At the helm, for guests" (list, gate navigation_and_electronics):
   the chartplotters show where we are; do not change pages while someone is
   navigating; the MOB button marks the spot if someone goes in;
   `{autopilot_standby_sentence}` when has_autopilot_standby.

8. controls.yaml (new, gate switching_system: digital): "The touchscreen, for guests":
   Favourites is where cabin lights and fans live; ask before touching anything else;
   never acknowledge an alarm without telling the skipper.

9. ac.yaml (new, gate has_category hvac): "Air conditioning, for guests": it only
   runs on shore power or the generator (gate has_generator for the generator clause);
   do not expect it at anchor overnight unless the skipper runs the generator;
   close hatches and doors while it runs.

10. dinghy.yaml (extend): "Dinghy rules" (list, gate tenders_and_watersports): ask
    before you take it; kill cord on the driver; life jackets at night and for
    non-swimmers; tie it with a round turn and two half hitches; do not go alone
    after dark; lift the outboard before you beach it.
    Also, in backend/guide_system_assembly.py `assemble_system_from_fragments`
    (354-409), honour an `audience` key on a fragment `system_sections[sid]` entry
    and on individual sections; default any fragment section whose title matches
    /\b(start|starting|shut ?down|outboard|prim(e|ing)|bleed|isolat)/i to crew.
    Document the rule in the module docstring.

11. galley.yaml (extend)
    - "Cooking": when galley_stove == induction: the hob is induction and needs the
      inverter or generator; pans must be magnetic; wipe the glass when cool.
      When galley_stove == gas: turn the gas on at the bottle and the solenoid only
      while cooking, off after; if you smell gas, no switches, open everything, tell
      the skipper. When electric: needs shore power, generator or inverter.
    - "Fridge and freezer": open briefly; close firmly; tell someone if it is not cold.
    - "Washing up": which tap is fresh water is `{galley_tap_note}` if set (add slot
      from guestFacts.galleyTapNote, optional), one bowl of soapy water, rinse briefly.
    - Keep "Rubbish".
    - learnChecks: "Used the hob once with someone watching".

12. overview.yaml (extend)
    - "Which way is which" (list): port is left looking forward, starboard is right,
      forward is the pointy end, aft is the back; `{cabin_names_sentence}` when
      has_cabin_names ("The cabins are called: …").
    - "Hatches and ports" (list): how to open and dog a hatch, close them before rain
      and before we leave the dock, mosquito screens; `{hatch_notes}` when set.
    - "Your cabin" (list): fans and reading lights; hold-to-dim line when hold_to_dim;
      USB sockets work on batteries, the square 230 V sockets only when the inverter or
      shore power is on (gate electrical_ac); stow bags so nothing falls; expect pump
      and chain noises at night.
    - "At night" (list): red lights only in the saloon and cockpit (gate
      switching_system digital or always — keep generic), no white torches toward the
      helm, one hand for the boat, tell the watch-keeper when you come up.
    - Keep "Trampoline".

13. anchoring.yaml (new, module system/anchoring, gate ground_tackle_and_mooring):
    "Anchoring, for guests": stay off the trampoline/bow and out of the line of the
    chain while we anchor; the windlass is loud and strong, keep fingers away; swinging
    at anchor is normal; the anchor alarm at night means wake the skipper; swim only
    when told the engines are off.
    Confirm with backend/guide_guest_withhold.py that a placeholder anchoring module
    plus this guest layer publishes the chapter with only the guest section (the
    placeholder prose is withheld, `_system_has_guest_body` sees the guest body).

14. backend/content/systems/seamanship.yaml (extend, both views):
    - "Coming alongside" (list): hold the line you are given and nothing else; never
      jump; never fend off with hands or feet; step off only when told; a line goes
      round a cleat, not in your hand, before you take load.
    - "Stern-to and the passerelle" (list, gate moors_stern_to): wait for the
      passerelle to be secured; one person at a time; hold the rail not the lines;
      `{marina_routine}` when has_marina_routine.
    - learnChecks: "Held a dock line round a cleat under load".

15. Add sensible learnChecks to each new file (one or two, keyed system/slug).

Verification: extend verify_content_library `_check_handbook` with a catamaran
snapshot carrying every new fact and a monohull snapshot carrying none; assert
each gated section appears only when it should, and that no new section carries an
audience key.
```

---

## Prompt 6 — Checklists: crew checklists, guest-voice briefing, "Giving a hand"

```
Goal: the four operating checklists are crew; the Safety Briefing speaks to the
skipper but is on the guest Home; guests need a short helper list.

Backend
1. YAML: add top-level `audience: crew` to backend/content/checklists/pd.yaml,
   anch.yaml, lu.yaml, ec.yaml (after the header comment, before `groups:`).
2. safety-brief.yaml: add an optional per-item `gc:` (guest-voice text) for every
   item, e.g. key safety-brief/life-jackets-where → gc: "I know where my life jacket
   is". `_resolve_checklist_items` (assembler 86-110) publishes it as item["gc"]
   when present (slots applied). Validator `_validate_checklist_module` allows it.
3. New guest checklist `gh` ("Giving a hand"), both views:
   - backend/content/checklists/gh.yaml with groups: "Before we leave" (close
     hatches and ports in your cabin; cushions and loose gear inside; shore shoes
     ashore; fenders in when asked — bring the fender aboard before you untie it;
     hand the lines up when asked, do not throw them), "Under way" (one hand for the
     boat; stay out of the cockpit working area under sail, gate is_sailing; tell
     someone if you feel unwell), "Arriving" (fenders out only when asked and only if
     you can tie the knot; hold a line round a cleat; step off only when told).
     Stable keys gh/… on every item.
   - backend/guide_module_catalog.py: add "gh" to CHECKLIST_IDS (line 31) and
     CHECKLIST_CATALOG (178-204) with title "Giving a hand".
   - backend/guide_navigation.py: `_CHECKLIST_ICONS` (31-37) add "gh": ("🤝","ic-green");
     `_CHECKLIST_META_SUBTITLES` (39-45) add "gh": "What a guest can do to help";
     `_DO_TRIP_ORDER` (50) becomes ["safety-brief","gh","pd","anch","lu","ec"].
   - backend/content/assembler.py `_CHECKLIST_IDS` (768) add "gh".
   - Make sure `build_do_menu` (123-163) and `build_checklist_meta` (99-120) need no
     other change.
4. Publish: the doMenu is computed at publish from published checklists; do not
   filter crew checklists out of doMenu server-side (crew need them). Instead publish
   nothing extra — the app reads checklists[key].audience.

Mobile
5. mobile/src/app/core/services/content.service.ts: add
     checklistVisible(key: string, view: ReaderView): boolean
   (false when checklists[key]?.audience === 'crew' && view === 'guest') and
     visibleFixes(view)  — leave for Prompt 7, just add the checklist helper now.
6. mobile/src/app/pages/do/do.page.ts `menu` getter (55-62): filter items with
   content.checklistVisible(item.key, readerView.view()); inject ReaderViewService.
   Also `nextChecklist()` in mobile/src/app/pages/home/home.page.ts (218+) must skip
   crew checklists in guest view.
7. Checklist rendering: mobile/src/app/pages/do/checklist/checklist.page.html (23-46)
   and mobile/src/app/pages/do/learn/learn-lesson.page.html (21-43): show
   `item.gc || item.c` when the reader view is guest and gc is present; keep gi/ii
   indices (no filtering of items here). Expose `readerView` on both components.
   Items tagged crew inside a both checklist: render them only in crew view but keep
   the original index — use `*ngIf` on the button, not an array filter, so
   `cl-{gi}-{ii}` ids and progress keys stay stable. Progress totals
   (progress.service.ts `checklistProgress`, 43-63) must count only visible items:
   add an optional `view` parameter and skip crew items in guest view.
8. mobile/src/app/core/guide/dashboard.ts: `DashboardDoItemInput` (39-45) gets
   `crewOnly?: boolean`; the do loop (71-87) passes it to shortcut(); home.page.ts
   catalog builder (404-416) sets crewOnly from `checklists[item.key]?.audience`.
   GUEST_DEFAULT (55) becomes ['learn','do:safety-brief','do:gh','know:overview','know:heads','more:ask'].
9. mobile/src/app/core/search/guide-search.ts checklist loop (133-153): skip crew
   checklists and crew items when view === 'guest'; prefer gc text for guest index.
10. mobile/src/app/core/guide/learn-path.ts: no change (safety-brief stays the lesson).
11. Checks: extend dashboard.check.ts (crewOnly do item hidden in guest default and
    visible in crew), guide-search.check.ts (crew checklist absent from guest index),
    and add a spec for checklistProgress ignoring crew items in guest view.

Acceptance: verify scripts pass; `ng test` passes; publishing the library modules for
the "full" fixture yields checklists pd/anch/lu/ec with audience "crew", gh without,
and safety-brief items with gc.
```

---

## Prompt 7 — Fix It cards: crew by default, guest versions where safe

```
Goal: only guest-safe troubleshooting shows in the Guest view, and those cards end
with "tell the skipper", not "pull the breaker".

Backend
1. backend/content/fix_cards/cards.yaml: add `audience: crew` to every card except
   these four, which stay both and gain a `guest_steps:` list:
     something_stopped_working  → guest_steps: on the touchscreen open Favourites and
       press the circuit (gate switching_system digital — keep the step text generic
       when not); if it will not stay on, leave it off; tell the skipper.
     fridge_not_cooling → guest_steps: keep the door closed; check nothing is blocking
       the vents; tell the skipper — fridges switch off when the batteries are low.
     ac_not_working → guest_steps: it only runs on shore power or the generator; try
       off and on at the wall panel once; tell the skipper.
     no_fresh_water → guest_steps: the pump may be off or a tank may be empty; do not
       open anything; tell the skipper.
   (Use the actual `key:` values in the file; the names above are from the titles.)
   Also keep `toilet_wont_flush` both but with guest_steps: do not force it; the pump
   is probably off; tell the skipper.
2. assembler `build_fix_cards_module` (258-281): publish `guestSteps` (slots applied
   via `_resolve_steps`) when present; `_apply_fix_overrides` preserves it;
   `apply_fix_card_fragments` (guide_equipment_fragments 120-170) must not drop it.
3. Validator `_validate_fixes_module` (660-672): guestSteps optional list of
   non-empty strings; a card with audience "crew" must not carry guestSteps.

Mobile
4. bootstrap-content.model.ts FixCard: add `guestSteps?: string[]`.
5. content.service.ts: add
     visibleFixes(view: ReaderView): FixCard[]
   returning fixes without crew cards in guest view; cache per view like
   guideIndexes (60, 265-275).
6. fix.page.ts: `filteredFixes` (105-139), `openCard` (72-84) and `cardSlug` (86-90)
   must all use visibleFixes(readerView.view()) so slugs stay consistent; the
   template renders `fix.guestSteps ?? fix.steps` in guest view when guestSteps exists.
7. know.page.ts and guide-chapter.component.ts pass fixes to presentChapter (lines
   215/239 and 86): pass visibleFixes(view) so Know's Fix It buttons do not point at
   crew cards in guest view.
8. guide-search.ts fixes loop (155-172): index visibleFixes for the guest index and
   use guestSteps text there.
9. dashboard.ts: the 'fix' shortcut stays for both views.
10. Checks: guide-search.check.ts (crew card absent from guest index, guest steps
    indexed), chapter-presentation.check.ts (fixButtons exclude crew cards when the
    caller passes the guest list).

Acceptance: on the "full" fixture, 4-5 cards publish without audience and with
guestSteps; all others carry audience "crew"; fragment extras (generator,
Watchkeeper) carry "crew".
```

---

## Prompt 8 — Home rules and emergency: crew rules, SAR contacts, DSC step

```
Goal: crew duties stop appearing as orders to guests; every boat gets its national
rescue contact; the MAYDAY card tells a non-sailor about the DSC button.

Home rules
1. backend/content/home_rules/static_rules.yaml: add `audience: crew` to
   "Never leave the helm unattended with autopilot on…", "Run the Safety Briefing…",
   "Check house battery state of charge…". Add two guest-voice rules (both views):
     caution 🛟 "Wear a life jacket at night, in the dinghy, and whenever you are asked."
     good    👂 "If you hear an alarm, find the skipper. Do not silence it."
   The "Always monitor VHF Ch 16" rule is synthesised at assembler 209-214; tag it crew
   there.
2. Mobile: mobile/src/app/pages/home/boat-rules.component.ts `sections` (16-18)
   filters rules by view and drops sections left empty; rules.page.ts and the
   `widget:rules` tile use the same filtered getter (put it in ContentService as
   visibleHomeRuleSections(view)).

Emergency contacts
3. Region SAR pack: create backend/content/region_packs/sar.yaml keyed by ISO
   countryCode with a list of contacts in the admin JSON shape
   ({label, detail, value, tel?, action}), e.g.
     FR: CROSS (coastguard) — VHF 16 / tel 196; European emergency — 112
     GB: HM Coastguard — VHF 16 / 999;  US: US Coast Guard — VHF 16 / 911
     BS: BASRA — VHF 16 / +1 242 325 8864;  HR: MRCC Rijeka — VHF 16 / 195; GR: 108; IT: 1530; ES: 112
   backend/guide_template_assembly.py `build_emergency_module` (97-127): after the
   admin contacts, append pack contacts for guide_context.countryCode whose label is
   not already present (case-insensitive). Pack contacts are both views.
4. Admin JSON contacts may carry "audience": "crew" (plumbed in Prompt 1). Mobile:
   mobile/src/app/shared/components/app-header/app-header.component.html (83) filters
   crew contacts in guest view. Add help text to the emergency_contacts_json textarea
   in backend/admin/templates/vessels/guide_context.html (60) showing the optional
   field and the suggested crew entries (insurer, yard, engine dealer, marina office).
5. Slot `sar_contact_line` in backend/content/slots.py (used by Prompt 5 safety
   layer): "Call {label} on VHF 16 or {tel}." from the first pack contact for the
   vessel's countryCode, else "Call for help on VHF channel 16."

MAYDAY
6. backend/prompts/guide/assembly/mayday_steps.txt: insert after line 6
   ("Tune VHF to Channel 16…"):
     "If the radio has a red DISTRESS button, lift its cover and hold the button for five seconds, then speak"
   and, when guestFacts.vhfDsc.location is set, make that step name the radio: change
   backend/prompts/guide/assembly_text.py `mayday_steps(callsign)` to accept an
   optional `dsc_location: str = ""` and format `{dsc_location}` (template line uses
   " on {dsc_location}" only when provided — implement as two template lines chosen
   by the caller rather than a conditional in the text file). Pass the fact from
   build_emergency_module.

Verification: verify_library_profile covers rules per profile — add a case that a
crew-tagged rule publishes audience "crew" and the two new rules do not; add a unit
check for the SAR merge (no duplicates, FR yields CROSS + 112) in a new
backend/scripts/verify_emergency_module.py and add it to the Makefile pipeline-verify.
```

---

## Prompt 9 — Crew facts and shared crew layers for any vessel

```
Goal: competent crew get the boat-specific pages the review found missing
(daggerboards, main and reefing, winch map, seacocks, engine daily checks, anchoring
gear, standing orders, MOB recovery, battery switches and shore power, fuel, bilge,
spares) on every vessel, driven by owner-entered facts, with gaps surfaced in admin.
Vessel-specific long-form notes keep living in content/vessels/{slug}/crew/.

1. Schema: guide_context.crewFacts (document in backend/content/README.md "Crew
   facts" table). All optional, free text unless noted:
     daggerboards.has (bool), daggerboards.notes
     mainsail.hoist, mainsail.reefing, mainsail.preventer
     headsails.notes                      (jib / gennaker / spinnaker handling)
     winches.map                          (which winch does what, electric cautions)
     clutches.map
     seacocks.list                        (one per line: what | where)
     engines.daily                        (hatches, dipsticks, strainers, belts)
     fuel.summary                         (capacity, gauges, fillers, range)
     anchoring.gear                       (windlass controls, chain length/markings, bridle)
     mooring.sternTo                      (lazy lines, passerelle)
     electrical.batterySwitches, electrical.shorePower, electrical.navLights
     bilge.layout
     standingOrders.text                  (when to wake the skipper, logging, lights)
     mob.recovery                         (preferred manoeuvre, recovery point, gear)
     heavyWeather.prep
     spares.location
     vhf.mmsi, vhf.handsets
   Parsing: backend/guide_context_utils.py add `build_crew_facts(**kwargs)` and
   `crew_facts_form_values(facts)` mirroring the guest helpers (58-155);
   `build_guide_context_from_form` (158-197) gains `crew_facts` and writes
   context["crewFacts"].
2. Admin: backend/admin/routes/vessels.py handler (700-770) and
   backend/admin/templates/vessels/guide_context.html — add a "Crew facts" fieldset
   after "Guest handbook facts" with textareas, grouped: Sails & deck, Engines & fuel,
   Anchoring & mooring, Electrical, Safety, Watchkeeping.
3. Slots/conditions: backend/content/slots.py add `crew_facts(snapshot)` reader and a
   `crew_fact(snapshot, dotted_key)` accessor; slot_values gains one slot per field
   above named cf_<group>_<field> (e.g. cf_seacocks_list rendered as bullet list text
   joined with "\n"); conditions.py gains `has_crew_fact: <dotted.key>` and
   `has_daggerboards` (crewFacts.daggerboards.has).
4. Shared crew layers: new directory backend/content/crew_layers/{system}.yaml applied
   by a new `apply_shared_crew_layers(system_id, payload, snapshot)` in assembler,
   called BEFORE apply_crew_layers in both call sites:
   backend/guide_generation.py 1164-1172 and backend/stage4_generation.py 111-117.
   Every section it produces is forced to audience "crew" regardless of YAML. Files
   and sections (each gated on its has_crew_fact, type list or prose, slot-filled):
     sails.yaml:     Daggerboards (gate has_daggerboards; notes + a fixed warning line
                     "Boards up before heavy following seas and before shallow water");
                     Mainsail — hoist; Reefing; Preventer; Headsails; Winch map; Clutch map
     engines.yaml:   Daily checks on this boat; Fuel
     anchoring.yaml: Anchoring gear on this boat; Stern-to mooring
     electrical.yaml: Battery switches; Shore power; Navigation and deck lights
     safety.yaml:    Seacocks and through-hulls; Bilge pumps; MOB recovery on this boat;
                     Heavy weather; Spares and tools
     nav.yaml:       Watch standing orders; VHF and DSC (mmsi, handsets)
   Also add the guest warning in sails for daggerboards (both views, gate
   has_daggerboards): "Stay clear of the daggerboard lines and cases when they are
   being moved." — put that one in guest_layers/sails.yaml, not the crew layer.
5. Gaps: add `crew_fact_gaps(snapshot)` in slots.py listing missing facts that matter
   for this vessel (daggerboards only when is_catamaran and is_sailing; mainsail only
   when is_sailing; anchoring only when ground_tackle_and_mooring; seacocks always;
   standingOrders always; mob.recovery always). Show them in the same admin list as
   the guest fact gaps from Prompt 4 under a "Crew facts still blank" heading. Also
   write them as owner questions: call backend/owner_questions.py
   `upsert_owner_questions` (27+) from the Stage 4 and template generation paths with
   fact_queries of shape {"id": "crewfact:<dotted.key>", "prompt": <sentence>,
   "detail": {"kind": "crew_fact", "key": <dotted.key>}} so they appear with the
   existing owner questions.
6. Supernova: populate backend/content/guest_facts/supernova.yaml with a `crewFacts:`
   block for what the crew notes already say (daggerboards.has: true with an empty
   notes field, electrical.shorePower: "inlet aft on the port hull", vhf handsets
   unknown). Everything else blank for the owner.
7. Verification: verify_library_profile — a snapshot with crewFacts renders each crew
   layer section with audience "crew"; a snapshot without renders none; the guest
   daggerboard warning has no audience. verify_guest_withhold — a crew-only chapter
   is not withheld.
```

---

## Prompt 10 — Composed chapters: crew sections for the fragment and LLM paths

```
Goal: the LLM / fragment / placeholder system path (backend/guide_generation.py
`_finalize_system_payload`, 919-934, and guide_system_assembly.py) does not know
about blocks. Give it the same default so non-Stage-4 vessels behave like Stage 4 ones.

1. backend/guide_generation.py: in `_finalize_system_payload` after
   `_normalize_system_payload`, call a new
     apply_default_section_audience(content_key, payload)
   defined in backend/guide_section_to_module.py that tags sections by title using
   BLOCK_HEADINGS reversed (title → block) and CREW_BLOCKS_BY_SECTION, plus the
   fragment title regex from Prompt 5 step 10. Sections that already carry audience
   are left alone. Sections of type photo / equipment_locations never get tagged.
2. The LLM schema hint for systems (`_schema_hint_for`, search in guide_generation.py)
   must mention the optional `audience: "crew"` field and instruct the model to tag
   start/stop, isolation, reset and valve procedures crew. Update the matching prompt
   file under backend/prompts/guide/ that describes system sections.
3. backend/guide_module_catalog.py SYSTEM_CATALOG "focus" strings are inputs to the
   LLM path; append "Guest-visible: where it is, what it does, what to tell the
   skipper. Crew: procedures." to each system's focus (lines 46-176).
4. Verification: verify_system_assembly.py — add a fragment with a "Starting the
   Outboard Motor" steps section and assert it publishes with audience "crew" while
   "Guest-Safe Troubleshooting" does not.
```

---

## Prompt 11 — Mobile parity sweep and copy

```
Goal: every place the app reads checklists, fixes, rules, contacts or chapters
respects the reader view, and the Guest/Crew switch explains itself.

1. Audit and fix remaining readers that bypass the ContentService helpers from
   Prompts 6-8:
   - mobile/src/app/pages/home/home.page.ts (catalog 404-416, nextChecklist 218+,
     any rules widget rendering)
   - mobile/src/app/pages/know/know.page.ts (fix lists at 215/239)
   - mobile/src/app/shared/components/guide-chapter/guide-chapter.component.ts
     (fixes at 86; learnChecks at 134 — in guest view hide checks whose key begins
     with a crew-only section's derived prefix? No: simpler, publish does it. Leave.)
   - mobile/src/app/pages/do/learn/learn-ticks.ts (30): stage ticks count only
     guest-visible items in guest view (checklist items via progress.checklistProgress
     with view).
   - app-header emergency modal contacts (Prompt 8).
2. Persona explainer text in
   mobile/src/app/shared/components/app-header/app-header.component.ts (PERSONA_EXPLAINED
   at 11, toggle at 67-79, 131): update the one-time explanation copy to:
   Guest — "How to live aboard safely and what to tell the skipper."
   Crew — "Everything, including procedures, valves, switches and standing orders."
3. Guest default Home (dashboard.ts GUEST_DEFAULT, changed in Prompt 6): confirm the
   `know:overview` tile exists in the catalog (topic grouping in power-topic.ts
   groupTopics 92+) and falls back cleanly when absent.
4. Learn path: mobile/src/app/core/guide/learn-path.ts STAGE_SPECS (18-24) and
   backend/guide_navigation.py `_LEARN_STAGE_SPECS` (55-61) stay in sync; add
   "seamanship" to the "walk" stage after "overview" on both sides (docking roles and
   knots belong to day one) and add "safety" chapter to the "safety" stage before the
   briefing checklist. Update verify_learn_path.py and learn-path.check.ts.
5. Search result labels: guide-search.ts should label crew-only hits "Crew" in the
   crew view (small suffix) so crew can tell which hits guests cannot see. Optional
   but cheap: add `audience?: 'crew'` on GuideSearchHit.
6. Run the whole mobile check set and fix types. Do not change BOOTSTRAP_SCHEMA_VERSION.
```

---

## Prompt 12 — Documentation, verification wiring, and the Supernova dry run

```
Goal: the next person understands the audience model, CI checks it, and the
Supernova guide re-publishes cleanly.

1. README.md "User perspectives" (lines 70-112): add a short "Reading views" note —
   Guest vs Crew, what each sees, where the tags live, and that admin Guest facts /
   Crew facts drive the shared layers.
2. backend/content/README.md: finish the "Guest facts" and "Crew facts" tables; add a
   "Who sees what" matrix (content type × default audience × where to override).
3. backend/Makefile pipeline-verify: add verify_emergency_module.py (Prompt 8) and
   keep the order. Add a new target `content-verify` that runs
   verify_content_library, verify_library_profile, verify_learn_checks,
   verify_guest_withhold, verify_section_duplicates, verify_learn_path,
   verify_system_assembly, verify_emergency_module.
4. backend/scripts/verify_guest_withhold.py: add an offline case that a chapter with
   only crew sections and a summary is published, and that
   guest_visible_section_count reports 0 for it (so the publish warning fires).
5. Write backend/scripts/report_audience_coverage.py (offline): given a published
   bundle JSON path, print per chapter the count of both/crew sections, the number of
   crew checklists and fix cards, and the guest-fact and crew-fact gaps it can infer
   from blank slots in guest prose (e.g. the literal "the switch on the wall"). Use it
   on a bundle fetched from /api/v1/vessels/supernova/guide/bundle.json and paste the
   output in your final message.
6. Operator follow-up list (your final message must include it verbatim):
   a. cd backend && python scripts/verify_stage4_modules.py --write-oracle --slug supernova
      → review diff per tests/fixtures/POLICY.md → --byte-match → --substrate-match
   b. Admin: open Supernova → Guide context → fill Guest facts (safety gear locations,
      vhfDsc) and Crew facts; save.
   c. Admin: Generate drafts for all sets → review → approve → publish.
   d. python scripts/report_audience_coverage.py <downloaded bundle> and confirm:
      heads guest summary is the flush sentence; water has ≥2 guest sections and ≥8
      crew; fix cards: 5 both / rest crew; checklists: gh + safety-brief both, four crew;
      no "no sections visible in the Guest view" warning except chapters that are
      genuinely crew-only.
   e. mobile: push to main; the Pages workflow deploys; open the PWA, toggle Guest,
      check Home, Do, Fix, Know › Heads, and the MAYDAY card.
```

---

## Dependency map

| Prompt | Depends on | Touches |
|---|---|---|
| 1 audience helper | — | assembler, validators, fragments, template assembly, mobile models |
| 2 composer defaults | 1 | guide_section_to_module, learn checks, duplicates, withhold, publish warnings, Supernova water YAML |
| 3 guest-layer summary | 1, 2 | assembler guest layers, heads guest layer, slots |
| 4 guest facts | 1 | guide_context_utils, admin form, slots, conditions, overview day-one |
| 5 guest content | 3, 4 | guest_layers/*, seamanship, fragments audience rule |
| 6 checklists | 1 | checklist YAML, catalog, navigation, Do/Learn/Home/search in mobile |
| 7 fix cards | 1 | cards.yaml, assembler, Fix/Know/search in mobile |
| 8 rules + emergency | 1, 4 | static rules, region pack, mayday steps, header modal |
| 9 crew facts/layers | 4 | guide_context_utils, admin, slots, crew_layers/*, owner questions |
| 10 fragment/LLM path | 2, 5 | guide_generation finalize, prompts, system assembly |
| 11 mobile sweep | 6, 7, 8 | home, know, learn ticks, header copy, learn path |
| 12 docs + dry run | all | READMEs, Makefile, coverage report |
