# Clever Sailor — Platform roadmap (phases)

High-level delivery phases for the Clever Sailor / Cattitude platform. Detailed build instructions live in companion `cursor-build-*.md` files where they exist.

**Status key:** done · in progress · planned

---

## Phase 1 — MVP RAG (Cattitude single-vessel)

**Status:** done

- Static/PWA vessel guide for Cattitude
- FastAPI `/query` over ingested PDF manuals (LlamaIndex + pgvector + Azure OpenAI)
- Monorepo layout (`mobile/`, `backend/`, `manuals/`)

See `cattitude-rag-implementation-plan.md` Stage 1.

---

## Phase 2 — Core platform & manual library

**Status:** in progress

- Postgres schema: equipment registry, manual library hierarchy, tenancy, query log
- Alembic migrations; equipment / option pack / hull model registry
- Admin portal: equipment registry, option packs, manual library, vessel onboarding
- RAG over **cleared** manufacturer manuals only (legal status enforcement)
- Query log review for manual coverage gaps
- Charter onboarding via admin (not mobile intake)

See `clever-sailor-data-model.md`, `cursor-build-admin-portal.md`.

---

## Phase 3 — Ionic companion app & offline guide

**Status:** in progress

- Ionic/Capacitor app: Home, Do, Know, Fix, Ask, Emergency
- Vessel guide downloaded once per association; fully offline for guide tabs
- Publication sync via `vessel_guide_publication` manifest + content hash
- Push notification infrastructure (FCM) — foundation for later phases

See `mobile/README.md`, `cursor-build-intake-flow.md` (assumes Phase 3 shell exists).

---

## Phase 4 — Auth, subscriptions & charter access

**Status:** planned

- Auth0 (or equivalent) for owners, charter operators, Clever Sailor team
- Guest tokens / QR vessel association; charter date scoping
- Ask API denied when charter expired; owner subscription rules
- Replace admin HTTP Basic Auth with role-based team access

Referenced in `cursor-build-admin-portal.md`, project briefing §2.10 / §4.

---

## Phase 5 — Production operations

**Status:** planned

- Railway (or Docker) production deployment patterns
- Persistent manual PDF storage; environment separation
- Monitoring, backups, CI for backend + mobile deploys

Referenced in project briefing Phase 2/5 Docker strategy.

---

## Phase 6 — Advanced onboarding & vessel data

**Status:** planned

- Mobile intake flow (private owners + optional charter field verify)
- Intake review queue in admin
- Signal-K equipment scan endpoint
- Manufacturer research / ambiguous-match workflows

See `cursor-build-intake-flow.md`, `cursor-build-admin-portal.md` Screen 4.

---

## Phase 7 — Owner communities & community RAG

**Status:** planned

End-user **communities** for discussing specific **hull models**, **equipment**, and **systems** — similar in spirit to Facebook owner groups (e.g. “Fountaine Pajot Tanna 47 Owners”, “Victron MultiPlus troubleshooting”).

### Product goals

- Give owners and crew a place to ask and answer **experience-based** questions that manuals do not cover (techniques, failures, vendor tips, “what worked on my boat”).
- Scope communities to registry entities (`hull_model`, `equipment` manufacturer/model, optionally `system_category`) so discussion stays discoverable and linkable from Know/Fix/Ask.
- Extend **Ask** with a **second RAG corpus**: community posts and (optionally) **imported historical Facebook group content**, with clear **source attribution** and lower trust tier than manufacturer manuals.
- Moderation and quality: community content is not legal/manual-grade; UI and LLM prompts must distinguish **manual excerpt** vs **community report**.

### Out of scope for initial Phase 7 MVP

- Replacing Facebook groups (integration is ingest + deep links, not full social network parity)
- Unmoderated open posting without reputation/reporting
- Treating community text as authoritative for safety-critical procedures without manual backing

### Deliverables (summary)

| Area | Deliverables |
|------|----------------|
| **Mobile** | Community tab or entry from hull/equipment context; threads, replies, search |
| **Backend** | Community APIs; membership; moderation flags; separate vector ingest pipeline |
| **RAG** | Hybrid retrieval: manuals (tier 1) + community chunks (tier 2/3); citations show author, date, thread |
| **Admin** | Community moderation queue; hull/equipment community linking; FB import job status |
| **Data** | New tables (see `cursor-build-community-phase.md`); provenance for imported FB posts |

### Dependencies

- Phase 4 auth (identity for posts, reports, bans)
- Mature `hull_model` + `equipment` registry (Phase 2)
- Ask/query logging (Phase 2) to measure community RAG value

**Full specification:** [`cursor-build-community-phase.md`](cursor-build-community-phase.md)

---

## Phase ordering notes

Phases 2–3 overlap in current work (admin + Ionic + Cattitude production). Phase 7 is intentionally **after** auth and core registry stability — community features need identity, moderation, and trustworthy equipment/hull scoping.

When prioritising near-term work, finish **Phase 2 charter onboarding + guide generation** before starting Phase 7.

---

## Related documents

| Document | Scope |
|----------|--------|
| `clever-sailor-data-model.md` | Postgres schema (extend in Phase 7) |
| `cursor-build-admin-portal.md` | Admin screens |
| `cursor-build-intake-flow.md` | Mobile intake (Phase 6) |
| `cursor-build-community-phase.md` | Phase 7 detail |
| `README.md` | Product overview |
