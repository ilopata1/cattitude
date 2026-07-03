# Cursor Build Instructions: Owner Communities (Phase 7)

## Objective

Add a **community layer** to Clever Sailor so end users can discuss specific **boat models**, **equipment**, and **systems** — comparable to Facebook owner groups, but scoped to the platform’s equipment registry and hull catalog.

A second objective is **RAG retrieval over community discussion**, including optional **historical Facebook group content**, so the Ask tab can answer experiential questions manuals miss — with explicit source tiering and disclaimers.

**This phase is planned, not in active development.** Do not implement until Phase 4 (auth) and core registry (Phase 2) are stable.

---

## Product concept

### What users get

- **Communities** anchored to registry entities, e.g.:
  - Hull: “Fountaine Pajot Tanna 47”
  - Equipment: “Victron MultiPlus-II”
  - System: “Freshwater / watermaker” (optional broader topics)
- **Threads and replies** — troubleshooting stories, install tips, vendor recommendations.
- **Discovery** — from Know/Fix equipment cards (“See owner discussions”), hull model on vessel profile, search.
- **Ask enhancement** — when manuals lack an answer, retrieve relevant **community chunks** and label them clearly (“Based on owner reports in the T47 community…”).

### What this is not

- A general social network or Facebook replacement
- Authoritative safety-critical procedures without manual citation
- Unlicensed bulk scraping of Facebook without rights review

---

## Personas

| Persona | Participation |
|---------|----------------|
| **Private owner** | Primary — create threads, reply, follow communities for their hull/equipment |
| **Charter guest** | Read-only or no access (product decision at implementation time) |
| **Charter operator** | Optional read-only for fleet models; moderation delegate |
| **Clever Sailor team** | Platform moderation, FB import jobs, community ↔ registry linking |

---

## Source of truth (when building)

- **`clever-sailor-data-model.md`** — extend with community tables (new migration tranche)
- **`equipment` / `hull_model`** — community foreign keys must reference registry UUIDs
- **Manual library RAG** — community RAG is a **parallel corpus**, not mixed into `manual_file` rows
- **`PLATFORM_ROADMAP.md`** — Phase 7 placement and dependencies

---

## Data model (proposed)

Draft only — refine before Alembic migration.

### `community`

```sql
-- Conceptual — not yet migrated
CREATE TABLE community (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    -- Exactly one primary anchor (check constraint):
    hull_model_id UUID REFERENCES hull_model(id),
    equipment_id UUID REFERENCES equipment(id),
    system_category system_category,  -- optional topic community
    visibility community_visibility NOT NULL DEFAULT 'public',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `community_membership`

Links Auth0 user (Phase 4) to community; roles: member, moderator.

### `community_thread` / `community_post`

Thread title, body (markdown subset), author, timestamps, edit history optional.

### `community_reaction` / `community_report`

Lightweight engagement + moderation queue input.

### `community_content_import_batch`

Provenance for Facebook (or other) imports: source group id/name, import date, legal review status, row counts.

### `community_content_chunk`

Vector-ingest metadata parallel to manual chunks:

- `source_type`: `native_post` | `fb_import` | `admin_curated`
- `thread_id`, `post_id`, `author_display`, `posted_at`
- `content_hash` for dedupe
- Stored in **separate pgvector collection** or shared store with `source_tier: community` metadata (implementation choice at build time)

**Enums to add:** `community_visibility`, `community_content_source`, extend `source_tier` usage for RAG ranking.

---

## RAG architecture

### Retrieval policy

1. **Manual chunks** (`legal_status = cleared`) — highest priority, safety framing.
2. **Community chunks** — experiential; never presented as manufacturer procedure.
3. **Hybrid query** — if manual retrieval score is low, widen to community; if both hit, synthesize with sections.

### Response contract (Ask API)

Extend `/query` response (or client rendering) with:

```json
{
  "answer": "...",
  "sources": [
    { "type": "manual", "title": "...", "edition": "...", "page": 12 },
    { "type": "community", "community": "Tanna 47 Owners", "thread": "...", "author": "...", "date": "..." }
  ],
  "disclaimer": "Community posts reflect owner experience, not manufacturer instructions."
}
```

### Facebook historical content

- **Import pipeline (admin):** upload export / approved scrape → normalize to posts → legal review queue → ingest to vector store.
- **Requirements before ingest:** documented permission (group admin consent, user ToS, or public-domain policy review); store `import_batch_id` on every chunk.
- **Do not** silently merge FB text into manual_work rows.

---

## Mobile UX (sketch)

- **Entry:** hamburger → “Communities” or contextual link from equipment/hull detail.
- **List:** communities user follows + suggested (based on vessel hull_model + installed equipment).
- **Thread view:** linear or lightweight nested replies; no infinite algorithmic feed in v1.
- **Ask:** optional “Include community answers” toggle default on for owners, off for guests if allowed at all.

---

## Admin (sketch)

| Screen | Purpose |
|--------|---------|
| Community list | Link/unlink hull_model and equipment; archive spam communities |
| Moderation queue | Reports, hide/delete post, ban user |
| FB import | Batch upload, preview, legal clearance, ingest trigger |
| RAG diagnostics | Compare manual-only vs hybrid answers; community chunk counts per community |

Mount under a future **Community** admin nav group or Clever Sailor team tools — not charter operator default unless delegated.

---

## Build order (within Phase 7)

1. Schema + Auth0 identity on posts
2. Native communities API + mobile read/write for one hull community (dogfood T47)
3. Moderation minimum viable (report + admin hide)
4. Community chunk ingest + hybrid Ask retrieval
5. FB import batch tooling + legal workflow
6. Discovery links from Know/Fix/equipment registry

---

## Acceptance criteria (Phase 7)

- [ ] User can join a hull-scoped community and create a thread tied to that community
- [ ] Thread list and detail work offline-cached (read) optional v2; v1 may be online-only
- [ ] Ask returns community sources with distinct labeling when manuals insufficient
- [ ] Community chunks never retrieved when `legal_status` or product policy excludes them
- [ ] FB import requires cleared `community_content_import_batch` before vectors written
- [ ] Admin can hide reported content and audit actions
- [ ] Equipment and hull_model registry IDs used for scoping (no orphan string slugs in DB)

---

## Open decisions (resolve before implementation)

1. Charter guests: read-only vs no access to communities
2. Separate pgvector table vs metadata filter on existing store
3. Real names vs pseudonyms (Auth0 profile)
4. Facebook import mechanism (Graph API vs manual export upload only for v1)
5. Whether operators can sponsor “official” pinned posts in their fleet communities

---

## Related documents

| Document | Scope |
|----------|--------|
| `PLATFORM_ROADMAP.md` | All phases including Phase 7 summary |
| `clever-sailor-data-model.md` | Core schema — extend when Phase 7 starts |
| `cursor-build-intake-flow.md` | Onboarding (feeds community suggestions via hull/equipment) |
| `cursor-build-admin-portal.md` | Admin patterns to reuse for moderation screens |
