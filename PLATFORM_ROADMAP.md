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
- **Guide generation economics** — tiered publication (free vs premium); see workstream below

Referenced in `cursor-build-admin-portal.md`, project briefing §2.10 / §4.

---

## Workstream — Guide generation economics (freemium)

**Status:** planned (design before scale; spans Phases 2–4)

**Problem:** Today each full guide run is ~22 GPT-4o calls (~**$0.35–0.45/vessel**). There is **no cross-vessel LLM reuse** — shared equipment in the registry does not skip calls. At freemium conversion (~5%), generating a full personalized guide on every signup burns **~$7–9 in LLM per paying customer** before Ask, hosting, or support. With 1,000+ similar hulls worldwide, that cost is unsustainable.

**Principle:** Separate **“has a usable guide”** from **“ran the full LLM pipeline.”** Free users get a good-enough guide from templates and assembly; premium (or paid onboarding) triggers personalized LLM generation.

**Caching is complementary, not a substitute:** A Redis or proxy cache in front of Azure OpenAI helps on **cache hits**, but naive full-prompt caching has **low hit rates** across similar vessels (each prompt embeds vessel name, contacts, equipment snapshot, and reference module). Use a **hybrid**: tier gating + template/exemplar assembly first, then **fragment-level** exact-key cache, then LLM. Enable **Azure OpenAI prompt caching** for shared instruction prefixes where supported.

### Request flow (hybrid)

```
Generation request
  → tier check (free: assemble templates, no LLM)
  → exemplar / fragment cache lookup (exact key)
  → on miss: Azure OpenAI (store fragment for reuse)
  → publication
```

Regeneration of the same vessel with unchanged `guide_generation_input_snapshot.content_hash` should skip LLM entirely (idempotent cache).

### Target economics

| Path | Marginal LLM cost (order of magnitude) |
|------|----------------------------------------|
| Free signup (template assembly) | **~$0** |
| Free signup (light personalize, mini model, few modules) | **~$0.02–0.04** |
| Premium full personalized guide (GPT-4o) | **~$0.35–0.45** |
| Nth boat matching published exemplar (copy + delta) | **~$0–0.05** |
| Premium module served from fragment cache (exact key hit) | **~$0** |

### Deliverables

| # | Deliverable | Phase | Notes |
|---|-------------|-------|-------|
| 1 | **Product definition:** free vs premium publication contents | 4 | What tabs/modules each tier includes; Ask limits on free |
| 2 | **`publication_tier` (or `subscription_tier`)** on vessel or publication | 4 | Gate `run_guide_generation()` — no full LLM on free by default |
| 3 | **`assemble_guide_from_templates()`** — no LLM path to `vessel_guide_publication` | 2–3 | Hull-model baseline + intake facts (name, contacts, equipment list as structured data) |
| 4 | **Hull-model starter publications** | 2–3 | Curated bootstrap per `hull_model` (maintain from first approved guide on that hull) |
| 5 | **Exemplar matching** — `(hull_model + option_pack fingerprint + operating_base)` → copy modules | 2–3 | Extends `clone_vessel(copy_guide_modules)` policy globally; LLM only for unmatched modules |
| 6 | **Equipment-level content library** (optional) | 3+ | Shared prose keyed by `equipment_id`; assemble into system modules without LLM |
| 7 | **Tiered model policy** | 2 | GPT-4o mini for free/light paths; GPT-4o for premium; validate before publish |
| 8 | **Token/cost logging** on `guide_generation_run` | 2 | Real unit economics per module, not estimates |
| 9 | **Ask gating** aligned with tier | 4 | Free: offline guide only or capped/cached Ask; premium: live RAG |
| 10 | **Fragment cache (Postgres-first)** — `guide_llm_fragment` or reuse `guide_content` with shared scope | 2–3 | Exact-key store for reusable LLM outputs (equipment blurb, system skeleton); key = `(kind, equipment_ids, prompt_version, …)` — not full vessel snapshot |
| 11 | **Cache lookup in `generate_module()`** before Azure call | 2–3 | Check fragment cache + idempotent regen (`content_hash` + module + prompt version); skip LLM on hit |
| 12 | **Redis (optional)** for hot paths | 3–5 | Ask query cache + fragment read-through; add when volume warrants another service on Railway |
| 13 | **Azure OpenAI prompt caching** | 2 | Enable on deployment for shared instruction/schema prefixes; reduces input tokens, not call count |

### LLM cache design rules

| Rule | Detail |
|------|--------|
| **Exact keys only** for guide generation | No semantic/similarity cache for safety-critical procedures — wrong-boat content is unacceptable |
| **Fragment granularity** | Cache equipment- and system-level pieces, not whole-vessel prompts with embedded names |
| **Postgres durable, Redis optional** | Fragments are content assets (audit, reuse); Redis is a performance layer for Ask and hot reads |
| **Full-prompt hash** | Useful only for idempotent regen of the **same** vessel snapshot, not cross-vessel reuse |
| **Ask tab** | Best Redis use case — exact or normalized query key with TTL |

### Off-the-shelf options (evaluate at build time)

| Option | Role |
|--------|------|
| **Postgres `guide_llm_fragment`** | Primary durable cache (fits existing stack) |
| **Redis** | Low-latency exact-key cache for Ask + fragment read-through |
| **Azure OpenAI prompt caching** | Built-in prefix caching; no new infra |
| **LiteLLM / Portkey / Helicone** | Optional proxy for cache + observability if needs outgrow custom layer |

### Design rules (locked for this workstream)

1. **No auto full generation on signup** — explicit upgrade or admin override required for 22-call run.
2. **Reuse before regenerate** — exemplar copy and template assembly first; LLM is last resort.
3. **Cross-vessel reuse is intentional** — first boat on a config may pay full cost; subsequent similar boats must not.
4. **Charter fleet clone path remains valid** — `clone_vessel(copy_guide_modules=True)` is the operational pattern for sibling hulls.
5. **Cache after structure** — templates and exemplars first; fragment cache second; LLM last. Do not rely on naive full-prompt Redis caching for freemium economics.

### Acceptance criteria

- [ ] Free-tier vessel can publish a usable guide **without any LLM calls**
- [ ] Premium upgrade triggers personalized generation (full or delta modules only)
- [ ] Admin UI shows tier and blocks “Full guide” generation on free vessels unless override
- [ ] Second vessel with same hull + option pack reuses exemplar modules (0 or minimal LLM)
- [ ] `guide_generation_run` records input/output token counts where LLM was used
- [ ] Documented cost model updated in README / data model (not “~100% LLM at onboarding”)
- [ ] `generate_module()` checks fragment cache before Azure; stores new fragments on miss
- [ ] Regen with unchanged `content_hash` skips LLM for that module (idempotent hit)
- [ ] Ask `/query` can use exact-key response cache (Postgres or Redis) with TTL

### Dependencies

- Phase 2: `guide_content`, `vessel_guide_publication`, `hull_model`, option packs (in place)
- Phase 4: billing/subscription identity to enforce tiers at runtime
- Can start **#3, #4, #8, #10, #11** before auth — template assembly, logging, and Postgres fragment cache do not require Stripe
- **#12 Redis** deferred until Ask volume or read latency justifies another service

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

**Before scaling self-serve owner signup**, work through **Guide generation economics (freemium)** — at minimum hull-model template publications (#4) and a no-LLM assembly path (#3), so free signups do not trigger full GPT-4o runs.

---

## Related documents

| Document | Scope |
|----------|--------|
| `clever-sailor-data-model.md` | Postgres schema (extend in Phase 7) |
| `cursor-build-admin-portal.md` | Admin screens |
| `cursor-build-intake-flow.md` | Mobile intake (Phase 6) |
| `cursor-build-community-phase.md` | Phase 7 detail |
| `README.md` | Product overview |
| `PLATFORM_ROADMAP.md` § Guide generation economics | Freemium / LLM cost workstream (this document) |
