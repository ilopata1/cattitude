# Vessel guide content — how it works

This document explains how Clever Sailor prepares the guest-facing **vessel guide** for a specific boat — what information goes in, how the system decides what to use, and what you need to do before content reaches the mobile app.

It is written for charter operators, content reviewers, and anyone using the admin portal. It is not a developer setup guide.

---

## What you are building

Each vessel gets a complete guide that powers the mobile app tabs:

| App area | What guests see | Examples |
|----------|-----------------|----------|
| **Home** | Welcome banner, emergency info, house rules | Boat name, MAYDAY steps, “never do this” rules |
| **Do** | Checklists and learn-the-boat progress | Safety brief, pre-departure, anchoring, end of charter |
| **Know** | Systems explained by topic or boat location | Engines, electrical, sails, anchoring, heads, etc. |
| **Fix** | Quick troubleshooting cards | Engine won’t start, VHF not working, bilge alarm |

Behind the scenes, the guide is split into **modules** — one piece of content per topic (for example, “engines system”, “safety-brief checklist”, “branding”). Modules are generated, reviewed, approved, and finally published together as a single package the app downloads.

The **Ask** tab (searchable equipment manuals) is separate. Manuals are uploaded and reviewed on their own; they do not flow through this guide pipeline.

---

## Where content comes from

Think of guide content as being assembled from several layers of information. Not every module uses every layer, but all of them can influence the final result.

### 1. The vessel record

Basic facts: boat name, internal slug, vessel type (for example, sailing catamaran), and hull model (manufacturer and model name).

### 2. Charter company and operating base

Which company operates the boat, and which **operating base** (marina or region) it belongs to. The operating base carries shared settings that apply to all boats at that location unless a specific boat overrides them.

### 3. Guide context — your most important local-knowledge layer

**Guide context** is structured settings for facts that change by location or by boat:

- Display name and region label
- Marina name
- Vessel radio callsign
- Office VHF channel and hours
- Marina VHF details
- **Emergency contacts** (who to call)
- **Local rules** (location-specific “never do this” rules, one per line)

Guide context exists at two levels:

- **Operating base guide context** — defaults for every boat at that base
- **Vessel guide context** — overrides for one specific boat

You enter and edit these in **Admin → Vessels → Guide context**.

### 4. Equipment linked to the vessel

Each piece of onboard gear (engines, chartplotter, heads, windlass, and so on) is linked from a shared **equipment registry**. Each item has a manufacturer, model, system category (for example, propulsion or electrical), and physical zone on the boat (cockpit, port hull, etc.).

System guides and fix cards depend heavily on this list. If equipment is missing, the system cannot produce accurate detail for that topic.

### 5. Equipment content library (reusable fragments)

For common equipment models, curated **equipment fragments** can be written once and reused across sister boats. A fragment might include:

- System guide sections (procedures, warnings, learn checks)
- Fix-card overrides (model-specific troubleshooting steps)
- Extra fix cards

Fragments are tied to equipment models, not to individual boats. Charter contact details are always added when content is assembled for a vessel — they are not stored inside the fragment.

### 6. Curated content library (standard marine practice)

A built-in library of standard charter content covers home rules, checklists, and generic fix cards. It is based on human-reviewed reference material, generalized so it works across boats. The source files live under [`content/`](content/README.md) as YAML (with a small assembly engine); developers edit those files rather than the old monolithic Python module.

Vessel-specific slots (VHF channel, company name, boat name) are filled from the snapshot at generation time. Items that only apply when certain equipment exists (for example, a watermaker) are included or skipped automatically.

### 7. Reference modules (this boat’s previous approved content)

When you regenerate content, the system can look up the vessel’s last **approved** or **published** version of the same module. This is used to:

- Preserve photos and layout in system guides
- Give AI a structural template to follow (section order and tone)

Do/Know **navigation** (menus, system order, zone layout) is **not** copied from reference — it is assembled automatically when you publish.

It is **not** used to blindly reuse outdated facts. Fresh data always comes from the current snapshot.

### 8. AI (optional)

For some modules, an AI model can write prose when no curated fragment or library path applies, or when you explicitly choose to **personalize** content. AI receives the full snapshot, relevant equipment, and instructions — but nothing goes live without human review.

---

## How layers combine (hierarchy and overrides)

### Guide context: base defaults, vessel overrides

When content is generated, operating base and vessel guide context are **merged**:

```
Operating base guide context  →  shared defaults for the region
        +
Vessel guide context          →  boat-specific overrides
        =
Merged guide context          →  used for generation
```

**Rule:** If the vessel has a value set, it wins. If a vessel field is blank, the operating base value is used.

Example: All Abacos boats inherit the base marina VHF channel. One boat with a different marina assignment can override just that field while keeping shared emergency contacts from the base.

### Generation method: first match wins

When you click **Generate** in admin (or run the generation script), each module is built using the **first method that applies** for that module type:

| Priority | Method | Used for | AI? |
|----------|--------|----------|-----|
| 1 | **Template assembly** | Branding, emergency (MAYDAY, contacts) | Never |
| 2 | **Equipment gap placeholder** | System topics that need equipment but none is linked | Never |
| 3 | **Equipment content library** | System guides when curated fragments exist for linked equipment | Never |
| 4 | **Curated content library** | Home rules, checklists, fix cards (default path) | Only if you check **Personalize** |
| 5 | **AI generation** | System guides without fragments; any module when **Personalize** is checked | Yes |
| *(at publish)* | **Navigation assembly** | Do menu, checklist labels, system order, Know-by-location layout | Never |

**Key behaviors:**

- **Branding and emergency** always use template assembly. Emergency text is built from your contacts and callsign — the system does not paraphrase MAYDAY procedures through AI.
- **Do and Know navigation** is built automatically at **publish** from your approved systems, checklists, and `vessel_type` (see `guide_navigation.py`). You do not generate or approve navigation modules separately.
- **Home rules, checklists, and fix cards** use the curated library **by default**. AI is opt-in via the **Personalize** checkbox.
- **System guides** use equipment fragments when available; otherwise AI fills the gap (if equipment is linked). If required equipment is missing, you get a clear placeholder instead of invented details.

### How reference content is reused (without copying stale facts)

Even when a module is not copied verbatim, a previous approved version may still influence the result:

| Situation | What happens |
|-----------|--------------|
| AI-written system guide | AI is told to match section layout and tone, but facts must come from the current snapshot |
| System guide photos | Photo sections from the reference are kept at their original positions; AI does not generate photos |
| Missing icon or location tags | Falls back to reference, then to built-in system defaults |
| Branding logos | Logo image paths are preserved from reference when not in data |
| Home rules reference | Only **approved** or **published** versions are used — not drafts (avoids repeating bad output) |

---

## What is manual, what is automatic, what is AI

| Content | Default | AI when? |
|---------|---------|----------|
| Branding (name, tagline, model) | Template assembly from vessel + guide context | Never |
| Emergency (MAYDAY, contacts) | Template assembly from guide context | Never |
| Home rules | Curated library | Only if **Personalize** is checked |
| System guides (13 topics) | Equipment fragments if available; otherwise AI | When no fragments exist and equipment is present (or topic does not require equipment) |
| System guides (missing equipment) | Placeholder message | Never |
| Checklists (5) | Curated library | Only if **Personalize** is checked |
| Fix cards | Curated library + equipment fragment enrichment | Only if **Personalize** is checked |
| Do tab menu & checklist headers | Assembled at publish from approved checklists + catalog | Never |
| Know tab order & zones | Assembled at publish from approved systems + `vessel_type` layout profile | Never |

**Your manual steps** (the system does not do these for you):

1. Enter **guide context** (contacts, VHF, local rules) at base and/or vessel level
2. Link **equipment** to the vessel
3. Optionally curate **equipment fragments** for models you use repeatedly (“first boat pays, siblings reuse”) — edit JSON on each equipment registry page
4. **Review drafts** — compare new output to the prior approved version
5. **Approve** modules individually
6. **Publish** the full approved set to make it live in the app

Equipment **manuals** (PDFs for the Ask tab) are uploaded and legally reviewed separately. They are outside this pipeline.

---

## Defaults and fallbacks

The system fills gaps predictably rather than failing silently:

| Situation | What happens |
|-----------|--------------|
| Vessel guide context field is empty | Operating base value is used |
| No emergency contacts in merged guide context | Emergency module **cannot** be generated — add contacts first |
| System topic needs equipment but none is linked | Admin warns you; generation can produce a “not yet configured” placeholder |
| AI leaves a section empty | Placeholder text: content not yet available — configure equipment and regenerate |
| Branding model label missing | Hull model → previous reference → vessel type → generic “Vessel” |
| Branding location missing | Region label → display name → previous reference |
| System icon or location tags missing | Reference module → built-in system catalog defaults |
| Manual tab titles (`manualTitles`) | Built at publish from `manual_work.title` for manuals on linked equipment; Ask live queries also resolve titles from the library |
| Operating base context updated after last publish | Admin shows a **stale context** warning — regenerate affected sections |
| Publish with no changes since last time | Publish is blocked (same content hash) |

At publish time, image paths are normalized for the vessel, and missing image files are flagged in the asset manifest but do not block publish.

---

## End-to-end flow

```
┌─────────────────────────────────────────────────────────────────┐
│  SETUP (ongoing, in admin)                                      │
│  • Create vessel, assign operating base and hull model          │
│  • Fill guide context (base defaults + vessel overrides)        │
│  • Link equipment; add equipment fragments for repeated models│
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  SNAPSHOT                                                       │
│  All inputs are read and frozen for this generation run         │
│  (vessel, company, base, merged guide context, hull, equipment) │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  GENERATE                                                       │
│  Admin → Generate drafts (optionally with Personalize)          │
│  Each module → method chosen by precedence table above          │
│  Output saved as drafts awaiting review                         │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  REVIEW & APPROVE                                               │
│  Compare each draft to the prior approved version               │
│  Approve → ready to publish (older approved versions superseded)│
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  PUBLISH                                                        │
│  All approved modules → single app package (bootstrap)          │
│  + manual titles from last publication                          │
│  Validate → record version → approved modules become published  │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  MOBILE APP                                                     │
│  App downloads the latest publication bundle                    │
│  Guide works fully offline after download                       │
└─────────────────────────────────────────────────────────────────┘
```

### Module statuses

| Status | Meaning |
|--------|---------|
| **draft** | Just generated — needs human review |
| **approved** | Reviewed and ready to publish |
| **published** | Live in the app (from the latest publish action) |
| **superseded** | Replaced by a newer version |
| **archived** | Hidden from active lists |

### Cloning a sister ship

When you duplicate a vessel, approved or published guide modules can be copied directly as imported approved content. This is useful for boats that share the same layout and equipment — you still review and publish before guests see anything.

---

## Practical guide for content authors

1. **Set guide context first.** Contacts, VHF, and local rules flow into branding, emergency, home rules, checklists, and fix cards. Without them, generation is blocked or produces thin content.

2. **Link equipment before generating system guides.** Otherwise you get placeholders or generic AI output instead of accurate procedures.

3. **Use the library by default; personalize selectively.** The curated library is faster, more consistent, and cheaper. Use **Personalize** only when you need bespoke prose for a specific boat.

4. **Invest in equipment fragments for repeated models.** One curated fragment benefits every vessel with that engine, chartplotter, or head type.

5. **Publish** — Do and Know navigation are included automatically; no separate navigation step.

6. **Nothing reaches guests until you publish.** Generation always creates drafts. Review, approve, then publish.

7. **Regenerate after context or equipment changes.** The snapshot captures a point in time. Old drafts do not auto-update when you change VHF channels or add equipment.

8. **Watch for stale context warnings.** If the operating base is updated after your last publish, regenerate sections that depend on local facts.

## Terminology

| Term | Plain meaning |
|------|----------------|
| **Module** | One piece of guide content (for example, “engines system” or “safety-brief checklist”) |
| **Snapshot** | A frozen copy of all vessel inputs used for one generation run |
| **Guide context** | Local and regional facts: contacts, VHF, marina, callsign, local rules |
| **Template assembly** | Building content by mapping fields directly — no AI |
| **Content library** | Built-in curated standard marine content with vessel-specific slots filled in |
| **Equipment fragment** | Reusable curated content tied to an equipment model |
| **Reference module** | This vessel’s previous approved version of the same module |
| **Personalize** | Admin option to use AI instead of the curated library |
| **Bootstrap** | The complete content package the mobile app downloads |
| **Publication** | A versioned, immutable snapshot of the bootstrap sent to the app |

---

## Design intent (why it works this way)

The pipeline is deliberately layered:

- **Routine charter content** is deterministic and reusable — the same checklists and fix cards work across a fleet with small slot substitutions.
- **Equipment-specific detail** is curated once per model and shared across sister boats.
- **AI fills gaps** only where no curated path exists, or when you explicitly ask for personalization.
- **Safety-critical content** (emergency procedures, contacts) never goes through AI paraphrasing.
- **Human review is mandatory** — generation produces drafts; publish is a deliberate act.

For database schema, API contracts, developer setup, **curated content YAML**, and **LLM prompt files**, see the root [`README.md`](../README.md), [`clever-sailor-data-model.md`](../clever-sailor-data-model.md), [`content/README.md`](content/README.md), and [`prompts/README.md`](prompts/README.md).
