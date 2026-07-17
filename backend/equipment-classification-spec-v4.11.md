# Equipment classification specification — v4.11

Follow-on to
[`equipment-classification-spec-v4.10.md`](equipment-classification-spec-v4.10.md).

## Global reader voice (all guest-facing modules)

Applies to Stage 4 composers, LLM system/checklist/fix/home-rule modules,
and (negatively) equipment fragments (which stay vessel-agnostic).

**Style — strong guidance, not a hard publish ban:**

- Establish the boat once by recorded display name.
- After that, prefer direct system / equipment / screen references (“the …”)
  or omit any vessel reference.
- Use “she” / “her” only when the boat itself is meaningfully the actor or
  owner and the pronoun improves clarity — not as decoration or a default
  substitute for “the”.
- Prefer the above over deictics: “this vessel”, “this boat”, “this yacht”,
  bare “the vessel” used as a name substitute.
- Repeat the vessel name only for disambiguation or deliberate reorientation.

**Hard vs soft:**

| Rule | Enforcement |
|------|-------------|
| Missing `vessel_display_name` when Stage 4 composition requires it | Hard fail (`VesselNameMissing`) |
| Name must appear at least once in Stage 4 draft (criterion xi) | Hard check in evaluate |
| Deictics / name overuse | `style_warnings` only (`guide_reader_voice.py`); do not flip `pass` or block `generate_module` |

Shared module: `guide_reader_voice.py`. Generate returns optional
`reader_voice_style` on the run result for review.

Criterion **(xi)** restated: establish by recorded name; deictics are style
notes, not fail conditions.

## Revision history

| Ver | Notes |
|-----|-------|
| **4.11** | Global reader voice; prefer “the …” after name; she/her only when boat is actor/owner; style_warnings; `guide_reader_voice.py` |
| 4.10 | Section input assembly; controls; ship-with-honest-gaps; xx–xxii |
| 4.9 | Solar v4 template; context_shaping; xi–xix |
