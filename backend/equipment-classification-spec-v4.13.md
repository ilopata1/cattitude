# Equipment classification specification — v4.13

Follow-on to
[`equipment-classification-spec-v4.12.md`](equipment-classification-spec-v4.12.md).

## Cross-section xrefs: reader voice + structured links

Guest-facing cross-section pointers are **reader navigation**, not author
structure notes.

**Prose (strong style guidance):**

- Prefer: *can be found in the \<Section\> section of this guide*
- Avoid: *lives in*, *stay(s) in*, *home procedures*, *belongs in*,
  *deferred to*, *will be filled in when that source is attached*
- Section titles come from catalog `guest_section_title` (fallback: titled
  `review_title`), not bare internal casing alone

**Structured target (composer / publish contract):**

| Field | Role |
|-------|------|
| `target_kind` | `system` (Know module; later: checklist, fix, …) |
| `target_id` | Catalog key = `SystemModule.id` / `SYSTEM_IDS` (e.g. `batteries`) |
| `label` | Guest link text (`Batteries & Energy section of this guide`) |
| `data_guide_link` | Opaque token `system:<id>` for renderers |

Do **not** bake app routes into Stage 4 prose. Resolve at publish/render
(e.g. Know already opens `?system=<id>`). Provenance may still list
`xref.batteries`; navigation uses the structured `links` / `guide_links`
objects.

Shared helpers: `format_section_xref`, `section_xref_link`,
`lint_authorial_xref_voice` in `guide_reader_voice.py`. Authorial hits are
`style_warnings` only (same soft policy as deictics).

## Revision history

| Ver | Notes |
|-----|-------|
| **4.13** | Xref reader voice; structured `links` / `guide_links`; catalog `guest_section_title` |
| 4.12 | `channel_map` source class; adjudicated extract; eval xxiii–xxv |
| 4.11 | Global reader voice; style_warnings; `guide_reader_voice.py` |
