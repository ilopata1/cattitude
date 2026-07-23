# Equipment classification specification — v4.40

Follow-on to
[`equipment-classification-spec-v4.39.md`](equipment-classification-spec-v4.39.md).

## xliv — affirmative station only (global)

Guest prose states **where** an action is taken or **where** an item is
located. It must **not** narrate the complementary negative — where the
action is *not* performed, or where the item *cannot* be found — except
when that negative is a **safety-related caution** against a hazardous
method or location.

**Drop (non-safety contrast):**

- "…from the Nanni instrument panel at the helm — not from the boat's
  digital switching system." → "…from the Nanni instrument panel at the
  helm."
- "standalone unit — not switched from the boat's digital switching
  system — and is operated from…" → "standalone unit operated from…"

**Keep (safety caution):**

- "Stop … from the panel … — never by opening the main battery switch
  while running."

**Distinct from (iv′) absence prose:** (iv′) bans "not fitted" / "there is
no …" claims about missing gear. xliv bans contrastive *station* / *locus*
negatives after an affirmative place or control surface.

**Lint / check:** `lint_negative_station_contrast` in
`guide_composition_rules.py`; global check `affirmative_station_ok`
(`assess_global_composition` **v4.40**).

## Water freeze supersession (this tip)

v4.39 froze Water systems. This tip **supersedes** that freeze solely for
the capability-station sentence (drop "not switched from digital
switching"). Template, spine, fact queries, and Mini Remote / flush
omissions remain as frozen.

## Frozen-section regressions (this pass)

| Section | Result |
|---------|--------|
| Solar v4 | pass |
| Batteries & Energy | pass |
| Controls and Monitoring | pass |
| Electrical Panel | pass |
| Navigation & Helm | pass |
| Water systems | pass (station sentence updated) |

Harness: `python scripts/verify_{solar,batteries,controls,electrical,nav,water}_section_v4.py`
(also `make pipeline-verify` from `backend/` when wired).

## Revision history

| Ver | Notes |
|-----|-------|
| **4.40** | Affirmative station only (xliv); Water freeze supersession for station prose |
| 4.39 | Water systems Stage 4 frozen |
| 4.38 | Retire "day-to-day" globally (xliii) |
