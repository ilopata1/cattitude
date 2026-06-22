# Cursor Build Instructions: Admin Web Interface

## Objective

Build the internal administrative portal for the Clever Sailor team — a web-only interface, not part of the Ionic consumer app, used to manage the equipment registry, manual library, intake review queue, vessel oversight, and query log review. This corresponds to Section 2.10 of the project briefing.

**Charter fleet onboarding** (add vessel, clone sibling, equipment from registry/option pack, generate, review, publish) is **admin-first**. The mobile intake flow (`cursor-build-intake-flow.md`) targets private owners and optional on-board verification. See **Onboarding channels** in `clever-sailor-data-model.md` for the step matrix and persona split.

**This is not a customer-facing product.** Design and build for internal team efficiency over polish. No mobile responsiveness is required (desktop-only is acceptable). No multi-language support is required (English only, per project briefing Section 2.12).

## Source of Truth

- **`clever-sailor-schema-reference.docx`** — exact table and field names for every screen in this portal
- **Universal Vessel Taxonomy v7** — full reasoning behind every classification field this portal edits (Configuration Tier, Equipment Class, the manual_work/edition/file structure, equipment constraints)
- **Project briefing, Section 2.10** — the original capability list this portal must satisfy

---

## Tech Stack

Use **FastAPI + Jinja2 server-rendered templates**, consistent with the project briefing's recommendation (Section 4.2) and the fact that the rest of the backend is already FastAPI. Do not introduce a separate frontend framework (React, Vue) for this portal — it adds a second build pipeline and deployment artifact for no real benefit at this stage, given the portal's internal-only, desktop-only scope.

```
backend/admin/
  __init__.py
  routes/
    equipment.py
    manuals.py
    intake_review.py
    vessels.py
    query_logs.py
    notifications.py
  templates/
    base.html
    equipment/
    manuals/
    intake_review/
    vessels/
    query_logs/
  static/
    admin.css
```

Mount as a sub-application or router prefix (`/admin`) on the existing FastAPI app, not a separate service — this keeps deployment simple (one container, consistent with project briefing Phase 2/5 Docker strategy) while still being logically separable.

---

## Authentication

Per the project briefing, this portal requires team-only access via Auth0 (Phase 4). **Until Phase 4 Auth0 integration is live, use HTTP Basic Auth with credentials in environment variables as a placeholder** — do not ship this portal with no authentication at any point, even during early internal development. Flag the Basic Auth approach clearly as temporary in code comments and in this build's pull request description.

```python
# Temporary — replace with Auth0 role-based access in Phase 4
from fastapi.security import HTTPBasic, HTTPBasicCredentials
```

---

## Screen 1: Equipment Registry

**List view** (`GET /admin/equipment`):
- Paginated table: manufacturer, model, system_category, equipment_class, configuration_tier, has_formal_manual
- Filter by manufacturer, system_category, equipment_class
- Search by manufacturer/model text match

**Detail/edit view** (`GET/POST /admin/equipment/{id}`):
- Edit all fields per the `equipment` table in the schema reference
- `vessel_types` as a multi-select against the `VesselType` enum
- `zone` as a single select against the full `Zone` enum (all four sub-groups combined, per the Postgres schema build doc)
- Show linked `option_pack` (if `option_pack_id` set) as a read-only reference with a link to that pack's detail view
- Show linked `equipment_constraint` rows (both where this equipment is the source and where it's a target) inline, with add/remove controls

**Create view** (`GET/POST /admin/equipment/new`):
- Same fields as edit
- **Merge tool:** before allowing creation, search existing equipment by manufacturer+model and warn if a likely duplicate exists, with a link to the existing record instead — this directly supports the taxonomy document's governance principle (Section 9) against uncontrolled registry growth

**Equipment Constraints sub-screen** (`GET/POST /admin/equipment/{id}/constraints`):
- Add a constraint: select `constraint_type` (`excludes` / `requires` / `mutually_exclusive_group`), then either a target equipment item (autocomplete) or a group identifier
- List existing constraints for this item with delete capability
- Per the taxonomy document (Section 6.2), this data is added opportunistically — the UI should make adding a single constraint fast (a 2-click action from the equipment detail view), not a heavyweight form

---

## Screen 2: Option Packs

**List view** (`GET /admin/option-packs`):
- Table: manufacturer, pack_name, applicable_models, source, count of bill_of_materials items

**Detail/edit view** (`GET/POST /admin/option-packs/{id}`):
- Edit `pack_name`, `applicable_models` (tag input), `source`
- `bill_of_materials`: searchable add/remove list of equipment items (autocomplete against the registry, same pattern as constraints above)

**Manufacturer Config Availability sub-screen** (`GET/POST /admin/manufacturers/config-availability`):
- Simple table over `manufacturer_config_availability`: manufacturer, has_public_configurator, pack_data_source_tier, last_verified
- Inline edit for `last_verified` date — this is the field the taxonomy document (Section 9) flags as needing periodic re-verification; make it easy to bulk-update by manufacturer when a re-check is done

---

## Screen 3: Manual Library

This is the most structurally important screen — it must respect the manual_work / manual_edition / manual_file hierarchy from the schema reference document. Do not collapse this into a flat file list.

**Manual Work list view** (`GET /admin/manuals`):
- Table grouped by `manual_work`: equipment (manufacturer/model), manual_type, title, legal_status, source_tier, current edition label, **languages available** (derived: distinct `language` values across `manual_file` rows under the current edition)
- Filter by legal_status (surface `pending` items prominently — these need review before they can be used)
- Filter by equipment system_category

**Manual Work detail view** (`GET /admin/manuals/{manual_work_id}`):
- Edit `manual_type`, `title`, `source_tier`, `legal_status`
- **Edition history table:** every `manual_edition` for this work, showing `edition_label`, `ingested_at`, `is_current`, and (if superseded) a link to the edition that replaced it
- For the current edition, show its `manual_file` rows: language, source_url, file size (read from storage), upload date
- **"Set as current" action** on any non-current edition — this must enforce the single-current-edition invariant. Implementation: wrap in a transaction that sets the target edition's `is_current = true` and the previously-current edition's `is_current = false` atomically. The database's partial unique index (per `clever-sailor-data-model.md`) will reject a naive update that doesn't do this correctly — rely on that as a safety net, but the application code should not depend on the constraint to catch a logic error; get the transaction right.

**New Manual Upload flow** (`GET/POST /admin/manuals/new`):
1. Select equipment (autocomplete) — or create new equipment inline if none matches
2. Select or create a `manual_work` for that equipment (most equipment will have at most an Operators and a Service manual — show existing works for this equipment first, "create new manual_work" as a secondary action)
3. Upload file
4. **Compute file hash before accepting the upload.** Check against existing `manual_file.file_hash` values:
   - If a match exists anywhere in the library, **reject the upload and show the existing record** ("This exact file is already in the library, linked to [manual_work title], edition [label]") rather than silently creating a duplicate
   - If no match, proceed
5. Ask whether this is a new edition of an existing manual_work or the first edition — if new edition, the system should compute `content_hash` (structural, language-neutral — coordinate with the ingestion pipeline for how this hash is computed, likely the same Docling-based extraction used in `backend/ingest.py`) and compare against the current edition's `content_hash`. If they match, warn the team member: "This appears to be the same content as the current edition — are you sure this isn't a duplicate language file rather than a new edition?" before proceeding, since the language-file case should go through the "add a language" flow instead (below), not create a spurious new edition.
6. Specify language (ISO 639-1 picker)
7. On confirm, create `manual_file` (and `manual_edition` if applicable), store the file, and trigger the existing ingestion pipeline (`backend/ingest.py` per the project briefing) for RAG chunking — **only for the current edition's files**, not for every historical edition

**Add a Language flow** (`GET/POST /admin/manuals/{manual_work_id}/editions/{edition_id}/add-language`):
- Simpler path: same file-hash de-duplication check, but skips the new-edition decision entirely — always attaches to the specified existing edition
- This is the flow for "we found the French version of a manual we already have in English"

**Legal Status review queue** (`GET /admin/manuals/legal-review`):
- Every `manual_work` with `legal_status: pending`, surfaced as a dedicated worklist
- One-click transitions to `cleared` or `dmca_removed`
- Per the project briefing (Section 2.14 / 5.1), this is where the team enforces the "don't use a manual until rights are confirmed" requirement — the Ask chatbot's RAG retrieval should only ever query chunks from manuals where `legal_status = 'cleared'`; **confirm with the backend/ingestion team that this filter is applied at query time**, since this admin screen is only the data-entry side of that requirement, not the enforcement point.

---

## Screen 4: Intake Review Queue

Per the project briefing, this is where medium-confidence equipment matches from the Ionic app's intake flow (see the separate Intake Flow build document) land for human confirmation.

**Queue view** (`GET /admin/intake-review`):
- List of pending intake submissions awaiting review, grouped by vessel
- For each, show: the vessel, the equipment item in question, the LLM's suggested manufacturer/model/equipment_class, confidence level, and the captured photo (if Step 2 photography was used)

**Review action view** (`GET/POST /admin/intake-review/{submission_id}`):
- Side-by-side: captured photo (if any) and the suggested match against the registry
- Actions: **Confirm match** (creates the `vessel_equipment` row as suggested), **Correct match** (search registry for the right equipment, or create new equipment inline), **Reject** (flag as needing further research — routes to a manual research queue, which may not be fully built yet; if not, simply mark as rejected with a note field for now and flag this as a Phase 6 gap rather than building the full manufacturer-contact workflow prematurely)

---

## Screen 5: Vessel Oversight

**List view** (`GET /admin/vessels`):
- Table: vessel name, charter_company (if any), vessel_type, equipment count, manual coverage (% of equipment with `has_formal_manual: true` that also has a `cleared` manual_work)

**Detail view** (`GET /admin/vessels/{id}`):
- Vessel basics (editable)
- Full `vessel_equipment` list with `confirmed_by` shown per item
- Manual coverage breakdown by system_category — this is a useful internal diagnostic for spotting gaps in the manual library, surfaced here rather than only in aggregate

---

## Screen 6: Query Log Review

**List view** (`GET /admin/query-logs`):
- Recent queries across all vessels: vessel, question, response_time_ms, source manual editions used, timestamp
- Filter by vessel, by date range
- **Flag unanswered or low-confidence queries** — if the backend's query response includes any signal that no good match was found (coordinate with the RAG query implementation for what this signal looks like — e.g. empty or low-relevance-score source nodes), surface these prominently. This is the practical mechanism described in the project briefing for "identifying missing manual coverage" (Phase 2 deliverables).

---

## Screen 7: Notifications

**Send view** (`GET/POST /admin/notifications/send`):
- Compose a system-wide announcement: title, body
- Target: all users, or users of a specific vessel/charter company
- This creates `notifications` rows per the schema and (assuming the push infrastructure from Phase 3/4 is live) triggers FCM dispatch — coordinate with whether that infrastructure exists yet; if not, this screen should still create the database rows (in-app notification centre will show them) even if push dispatch is stubbed

---

## Cross-Cutting Concerns

**Autocomplete pattern:** Several screens need equipment/manufacturer autocomplete. Build one reusable Jinja2 macro + small vanilla JS (or HTMX, if already in use elsewhere in the project — check before introducing it fresh) component and reuse it rather than building bespoke search per screen.

**Audit basics:** Every create/update action in this portal should log who made the change and when. Given the temporary Basic Auth (see Authentication above), use a simple "admin user" identifier from the Basic Auth credentials for now; this should be revisited when Auth0 provides real per-team-member identity in Phase 4.

**No destructive deletes without confirmation:** Any delete action (removing an equipment_constraint, rejecting a manual, etc.) requires an explicit confirmation step. Nothing in this portal should support irreversible action via a single click.

---

## Testing Requirements

Per the project briefing's testing requirements (Section 2.11):

- Test the file-hash de-duplication logic in the manual upload flow explicitly — this is the most consequence-sensitive piece of logic in this portal (a bug here directly violates the no-duplicate-storage requirement)
- Test the "set as current edition" transaction for correctness under the single-current-edition invariant
- Test the equipment merge-duplicate-warning logic
- Mock all database calls and file storage calls in unit tests; reserve actual Postgres/storage interaction for a small set of integration tests

---

## Acceptance Criteria

- [ ] All seven screens are functional against the schema defined in `clever-sailor-data-model.md`
- [ ] Manual upload correctly rejects exact file duplicates and shows the existing record instead
- [ ] Manual upload correctly distinguishes "new language of existing edition" from "new edition" via the content-hash comparison, with the team member prompted rather than the system guessing silently
- [ ] Setting a new current edition correctly and atomically unsets the previous one
- [ ] Equipment creation warns on likely duplicates before allowing creation
- [ ] The intake review queue allows a team member to confirm, correct, or reject a submission and see the result reflected in the vessel's equipment list
- [ ] Query log review surfaces low-confidence/unanswered queries distinctly from normal ones
- [ ] The portal is unreachable without authentication (Basic Auth minimum, Auth0 noted as the Phase 4 upgrade)
- [ ] No destructive action is a single, unconfirmed click
