# Cursor Build Instructions: Vessel Intake Flow (Ionic / Capacitor)

## Objective

Build the vessel intake feature inside the existing Clever Sailor Ionic/Capacitor app. This is the guided flow a user completes to register a new vessel and identify its equipment, as described in the project briefing (Section 2.5) and grounded in the data model in the Universal Vessel Taxonomy and Schema Reference documents.

**Assumption:** The PWA-to-Ionic migration (project briefing, Phase 3) is already complete. The companion app's five tabs (Home, Do, Know, Fix, Ask, Emergency) and the hamburger menu shell already exist. This build adds the intake flow inside that hamburger menu, alongside (not replacing) existing navigation.

## Source of Truth

- **`clever-sailor-schema-reference.docx`** — exact table and field names for every API payload this flow sends
- **Universal Vessel Taxonomy v7** — full reasoning behind Configuration Tier, the manufacturer research findings (Section 1), and why intake sequencing works the way it does (Section 8.4)
- **Project briefing, Section 2.5** — original five-step intake flow description

If the UX described here conflicts with the project briefing, prefer this document for intake-specific detail; defer to the project briefing for anything outside intake scope (auth, billing, notifications infrastructure).

---

## Where This Lives in the App

```
ionic-app/src/app/
  intake/
    intake.module.ts
    intake-routing.module.ts
    pages/
      vessel-basics/
      equipment-capture/
      equipment-checklist/
      signalk-scan/
      review-submit/
    services/
      intake.service.ts
      vessel-config-lookup.service.ts
      equipment-vision.service.ts
      signalk.service.ts
    models/
      intake-state.model.ts
```

Entry point: a "Add a Vessel" item in the existing hamburger menu, per the project briefing's navigation structure (Section 2.3). Tapping it pushes the `intake` module onto the navigation stack — it does not replace the bottom tab bar, which remains accessible via back navigation at any point (the user can abandon intake and return to the companion app).

---

## The Five Steps

Implement as a horizontal step wizard using Ionic's `IonSegment` or a custom step indicator at the top — not a `IonTabs` pattern, since these steps are sequential and dependent, not freely navigable.

### Step 1 — Vessel Basics

**Fields:**
- Vessel name (text)
- Manufacturer (autocomplete, see "Manufacturer Autocomplete" below)
- Model (autocomplete, filtered by selected manufacturer)
- Year (number)
- Length (number, with ft/m unit toggle respecting locale)
- Vessel type — **auto-derived from manufacturer/model where possible, editable if not.** Map to the `vessel_type` enum from the schema reference (`sailing_catamaran`, `cruising_monohull`, `sailing_trimaran`, `power_catamaran`, `motor_yacht`, `sport_fishing`)

**Configuration / Option Pack sub-step (conditional):**

After manufacturer + model is selected, call the backend to check `manufacturer_config_availability` for that manufacturer:

```typescript
interface ConfigAvailability {
  manufacturer: string;
  has_public_configurator: boolean;
  pack_data_source_tier: 1 | 2 | 3;
}
```

- If `has_public_configurator` is true (or `option_pack` records exist for this manufacturer/model regardless of the flag), show a sub-step: **"Do you know your configuration or option pack name?"** with a searchable list of `option_pack.pack_name` values scoped to `applicable_models` matching this model, plus a "Skip — I don't know" option.
- If the user selects a pack, store `selected_option_pack_id` in intake state. This will pre-populate Step 3 (Equipment Checklist) per the manufacturer research findings (taxonomy document, Section 1.6 and 8.4) — **do not skip Step 2 or Step 3 entirely**, since structural/aftermarket items still need confirmation or photo capture.
- If the manufacturer has no known config data (`has_public_configurator: false` and no packs found), skip this sub-step silently — do not show an empty list or a dead-end UI state.

**Validation before allowing "Next":** vessel name and vessel type are required; manufacturer/model are strongly encouraged but not blocking (a vessel with no manufacturer match must still be able to proceed — this is the "no matching spec" path from the taxonomy document, Section 6.5, scenario b).

### Step 2 — Guided Equipment Capture (LLM Image Identification)

**This step does not use OCR.** Use an LLM vision API call (per project briefing Section 4.2 — Azure OpenAI GPT-4o Vision, or equivalent multimodal endpoint already configured in the backend) sent the captured photo plus a structured prompt requesting manufacturer, model, and equipment category guesses.

**Camera UX:**
- Use `@capacitor/camera` for capture, not a bare file input — live viewfinder, not a file picker
- Provide a per-photo prompt context: "Take a photo of the engine nameplate" / "Take a photo of this winch or clutch" depending on which equipment slot is being captured, driven by the Step 3 checklist (see flow note below)
- Allow retake before submission
- Show a loading state while the vision API call is in flight — this is a network call with latency, not an instant local operation

**Handling the response — three confidence tiers:**

```typescript
interface EquipmentIdentificationResult {
  confidence: 'high' | 'medium' | 'low';
  suggested_manufacturer: string | null;
  suggested_model: string | null;
  suggested_equipment_class: EquipmentClass;  // from schema reference
  suggested_system_category: SystemCategory;
  description: string;  // always populated, even at low confidence — this is the
                         // generic_hardware / built_installed descriptive path
}
```

- **High confidence:** auto-fill manufacturer/model, show a confirm/edit chip, move on
- **Medium confidence:** show top suggestion plus 2 alternates as selectable chips, plus "none of these — let me type it"
- **Low confidence (or no nameplate at all — the rigging case):** do not force a manufacturer/model match. Use `description` as the content basis and classify as `equipment_class: generic_hardware` or `built_installed` per the taxonomy document Section 5.1's rigging example. This is expected behavior, not a failure state — do not show an error.

**This step is scoped by Configuration Tier from Step 1:**
- If an option pack was selected, this step should primarily prompt for `discrete_option` and `aftermarket` items not covered by the pack's bill of materials, plus confirmation photos for `structural` items if desired (optional, lower priority)
- If no pack was selected, this step covers all equipment the user is willing to photograph, with no pre-filtering

### Step 3 — Equipment Checklist

**Pre-population logic (in priority order):**

1. If an option pack was selected in Step 1, every `equipment_id` in that pack's `bill_of_materials` is pre-checked and shown with a "From your configuration" badge — these still require a single confirm tap, not re-entry
2. Items identified via Step 2 photography are shown as pre-filled rows
3. Remaining expected equipment for this vessel type (query equipment where `vessel_types` contains this vessel's type, scoped to common `system_category` values not yet covered) shown as **Yes / No / Not sure** rows — this is the fallback checklist behavior from the original project briefing

**Do not show System Categories that don't apply to this vessel type** — e.g. never show `rigging_sail_handling` or `sails` rows for a `motor_yacht` or `power_catamaran`. Filter by the `vessel_types` array on each candidate `equipment` row before rendering.

**Constraint checking:** Before allowing "Next," validate selected equipment against `equipment_constraint` rows:

```typescript
async function validateConstraints(selectedEquipmentIds: string[]): Promise<ConstraintViolation[]>
```

If a violation is found (e.g. both an inverter and a generator option are checked where an `excludes` constraint exists between them), show a non-blocking confirmation dialog: *"You've selected both [X] and [Y], which aren't typically used together — is this correct?"* Allow the user to proceed either way; log the override rather than hard-blocking, consistent with the taxonomy document's governance principle (Section 9) that constraint data is best-effort, not authoritative.

### Step 4 — Signal-K Scan (Optional)

- Framed clearly as optional and a shortcut, not a required step — include a prominent "Skip this step" action
- Requires the device to be on the vessel's local network; use `@capacitor/network` to check connection type before attempting and show a clear message if not on a suitable network rather than failing silently
- On scan, call the backend Signal-K endpoint (project briefing, Phase 6) with the raw Signal-K snapshot; backend returns fuzzy-matched equipment suggestions
- Results merge into the Step 3 checklist state if the user navigates back — do not create a separate, disconnected list

**Note:** Per the project briefing, full Signal-K backend support is a Phase 6 capability. If Phase 6 is not yet built when this intake flow ships, **build this step's UI to gracefully read "Signal-K scanning will be available in a future update"** rather than leaving a broken/non-functional step in the flow. Coordinate with backend status before wiring the actual scan call.

### Step 5 — Review and Submit

- Grouped summary by `system_category`, showing every equipment item that will be submitted, its `equipment_class`, and its `confirmed_by` value (which should be set automatically based on how each item was captured: `config_match` for pack-derived items, `photo_intake` for Step 2 items, `owner_reported` for manually checked Step 3 items)
- Allow editing any item by tapping it (returns to the relevant step's context, not a full restart)
- Clear "Submit" action — on submit, construct the `vessel_equipment` payload per the schema reference and POST to the backend
- Show a success state confirming submission, and set expectation: "We're finding manuals for your equipment now — you'll get a notification as they become available" (ties to the three-tier manual sourcing pipeline and notification system in the project briefing)

---

## State Management

Use a single `IntakeService` holding in-memory state for the duration of the flow, persisted to `@capacitor/preferences` (or equivalent local storage) after every step so the flow survives app backgrounding or interruption — this is explicitly required by the project briefing's offline/resilience requirements.

```typescript
interface IntakeState {
  vesselBasics: VesselBasicsForm;
  selectedOptionPackId: string | null;
  capturedEquipment: CapturedEquipmentItem[];
  checklistSelections: Map<string, 'yes' | 'no' | 'not_sure'>;
  signalKResults: SignalKMatch[] | null;
  currentStep: 1 | 2 | 3 | 4 | 5;
}
```

On app resume, check for an in-progress intake state and offer to resume rather than silently discarding it.

---

## Manufacturer Autocomplete

Step 1's manufacturer/model autocomplete should query the backend's `equipment` registry (grouped distinct `manufacturer`, `model` values) rather than hard-coding a manufacturer list in the app — the registry grows over time and the app must reflect that without a release.

```typescript
GET /api/v1/manufacturers?query={partial_text}
GET /api/v1/models?manufacturer={manufacturer}&query={partial_text}
```

If no match exists for a typed manufacturer/model, allow free-text entry and flag the vessel for the "no matching spec" path — do not block vessel creation on an exact registry match.

---

## API Contract Summary

All endpoints below are assumed to exist or need to be coordinated with the backend team — flag any not yet available rather than stubbing silently.

```
GET   /api/v1/manufacturers?query=
GET   /api/v1/models?manufacturer=&query=
GET   /api/v1/manufacturer-config-availability/{manufacturer}
GET   /api/v1/option-packs?manufacturer=&model=
GET   /api/v1/equipment?vessel_type=&system_category=     -- for checklist pre-population
POST  /api/v1/equipment/identify-from-image                -- LLM vision call, returns EquipmentIdentificationResult
POST  /api/v1/equipment/validate-constraints                -- returns ConstraintViolation[]
POST  /api/v1/signalk/scan                                  -- Phase 6, may not exist yet
POST  /api/v1/vessels                                       -- creates vessel + vessel_equipment rows
```

---

## Error Handling and Offline Behavior

- If the device is offline at any point, allow progress through Steps 1 and 3 (no network calls strictly required) but disable Step 2's vision identification and Step 4's Signal-K scan with a clear inline message, not a generic error
- Final submission (Step 5) requires connectivity — if offline at submit time, save the complete intake state locally and show "We'll submit this as soon as you're back online," then retry automatically on reconnect (use `@capacitor/network`'s connection change listener)
- Never lose user input due to a network failure at any step

---

## Testing Requirements

Per the project briefing's testing requirements (Section 2.11), every service class needs unit test coverage:

- `IntakeService` — state transitions, persistence/resume logic
- `VesselConfigLookupService` — manufacturer/model/pack lookup, including the no-match fallback path
- `EquipmentVisionService` — response parsing across all three confidence tiers, including the low-confidence/no-nameplate path
- `SignalKService` — graceful degradation when Phase 6 backend is unavailable

Mock all HTTP calls and all Capacitor plugin calls (Camera, Network, Preferences) in tests — no test should require a live device or live backend.

---

## Acceptance Criteria

- [ ] A user can complete all five steps for a vessel with a known manufacturer/model and known option pack, with minimal photography required
- [ ] A user can complete all five steps for a vessel with no manufacturer match at all (free-text entry), falling through entirely to photo-driven and manual checklist confirmation
- [ ] Step 2 correctly handles the no-nameplate case (e.g. a rigging clutch) by producing descriptive content rather than forcing a manufacturer/model match or showing an error
- [ ] Step 3 never displays a System Category inapplicable to the selected vessel type
- [ ] Constraint violations are surfaced as non-blocking confirmations, never hard stops
- [ ] Intake state survives app backgrounding and is offered for resume on next launch
- [ ] The flow is fully usable on both phone and tablet layouts (per project briefing Section 2.2 device support)
- [ ] All service classes have passing unit tests with no live network or device dependency
