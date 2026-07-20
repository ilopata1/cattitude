# Equipment classification specification — v4.33

Follow-on to
[`equipment-classification-spec-v4.32.md`](equipment-classification-spec-v4.32.md).

## Vessel-first opening — no chapter meta framing (lxvii)

Guest prose must not open a Know section by announcing guide structure
(“this chapter covers…”, “focus of this chapter”). The **section title**
already signals place in the guide; the **recorded vessel display name** is
the opening orientation signal, paired with a direct system fact.

**Allowed (reader navigation):**

- “… can be found in the \<Section\> section of this guide”
- “… notes that accompany this chapter” (leaf pointer, Batteries→Solar)

**Forbidden (author/structure framing):**

- “this chapter covers…”
- “focus of this chapter”
- “this chapter is about…”

Lint: `lint_authorial_xref_voice` in `guide_reader_voice.py` (same code path
as other authorial patterns). Electrical **lxii** requires vessel + function
in the first capability sentence without chapter meta.

Founding: Electrical v4.32 opening “On Supernova, this chapter covers…”.

### Collision notes

| Existing | This tip | Resolution |
|----------|----------|------------|
| v4.11 vessel named once | Compatible — name stays the opener |
| v4.13 authorial xref lint | Extended pattern list | Same warning class |
| “section of this guide” xrefs | Explicitly allowed | Not banned |
| Batteries fallback “focus of this chapter” | Rewritten to vessel+system fact | Frozen regression |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.33** | Vessel-first opening; ban chapter-meta framing; keep inter-section xrefs |
| 4.32 | Electrical operator-voice review lxii–lxvi |
| 4.31 | Electrical Stage 4 composer |
