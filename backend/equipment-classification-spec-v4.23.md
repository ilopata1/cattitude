# Equipment classification specification — v4.23

Follow-on to
[`equipment-classification-spec-v4.22.md`](equipment-classification-spec-v4.22.md).

## Heading carry-forward past diagram callouts (xlvi)

MFD / app manuals often put the **section title on page N** and open page
N+1 with a labeled UI diagram whose text layer starts with callout letters
(`D E`, `A B C…`, or `I Alerts Select…`). Those letters are **not** section
titles.

### Rule

1. Treat diagram callout letter-runs and single-letter callout captions as
   junk for `source_heading_guess` / heading inventory
   (`is_diagram_callout_line` in `manual_retrieval.py`).
2. When a chunk has no usable heading guess, **carry forward** the last good
   title from the prior page of the same manual
   (`carry_forward_source_headings`).
3. Extraction / evidence repair: prefer `source_heading_guess` for
   `manual_section`; never emit callout letters as headings.
4. Validator floor (`evidence_heading_invalid`) remains the safety net.

### Founding fixture

`scripts/verify_heading_carry_forward.py` — title page “Quick access menu”,
figure page opening `D E H I J…`, callout caption page `I Alerts Select…`
→ all inherit `Quick access menu`.

### Collision notes

| Existing | This tip | Resolution |
|----------|----------|------------|
| v4.22 `evidence_heading_invalid` | Same quality floor | Compatible — retrieval prevents the crumb |
| Prompt “never letter crumbs” | Still required | Prompt + retrieval + validator |
| Ban all image text from excerpts | Too broad | Reject callout *as heading* only |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.23** | xlvi: diagram callout junk + heading carry-forward |
| 4.22 | xlii–xlv: Stage 1.5 blocking gate, evidence integrity, dedup, surfaces |
| 4.21 | xli: charge-path enabling conditions |
| 4.20 | xxxv: wisdom ≠ capability quantity restatement |
