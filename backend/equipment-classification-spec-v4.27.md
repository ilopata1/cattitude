# Equipment classification specification — v4.27

Follow-on to
[`equipment-classification-spec-v4.26.md`](equipment-classification-spec-v4.26.md).

## Evidence index rewrite before merge (l)

Map groups emit `operator_actions[i]` evidence that is correct **inside that
group**. Post-merge `rewrite_operator_action_evidence_paths` resolved those
indices against the **merged** action list, retargeting `supports_field`
while leaving `manual_section` / `note` on the original action (Zeus: batch_1
`[0]` setup → merged `[0]` "turn off the device").

### Rule

1. `merge_group_profiles` rewrites each group's evidence indices to
   `operator_actions[action=…]` **before** unioning evidence.
2. Post-merge rewrite remains as a safety net only.
3. Stage 1.5 warning `evidence_support_mismatch` when an action-text evidence
   **note** better matches a different `operator_actions` entry than the linked
   one (content-token overlap on the note; section titles are ignored so shared
   chapter headings do not scramble pairs). Occasion-style notes that match
   nothing strongly are not flagged. Does not set `needs_rextraction`.

### Founding fixture

Zeus-style two-group merge: batch_0 actions first, batch_1 index evidence for
initial setup / view alerts → after merge, setup note still links to the
setup action (not turn-off). Scrambled profile with setup note on
`action=turn off the device` → `evidence_support_mismatch`.

Verify:
- `scripts/verify_interaction_profile_merge.py` (v4.27 block)
- `scripts/verify_interaction_profile_validate.py` (v4.27 block)

### Collision notes

| Existing | This tip | Resolution |
|----------|----------|------------|
| Prompt prefers `action=` | Model still emits `[N]` | Pre-merge rewrite |
| Post-merge rewrite only | Scrambles map-reduce | Pre-group rewrite first |
| Auto-remap note to best action | Risky | Warning only |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.27** | l: pre-merge evidence index rewrite + support mismatch lint |
| 4.26 | xlix: data_roles controllable_from_network polarity |
| 4.25 | xlviii: grounded networks.speaks / bridges |
| 4.24 | xlvii: other-variant procedure scope |
| 4.23 | xlvi: heading carry-forward past callouts |
| 4.22 | xlii–xlv: Stage 1.5 gate / evidence / dedup / surfaces |
