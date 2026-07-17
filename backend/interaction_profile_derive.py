"""Stage 1.6 — deterministic derived operator actions (pure code).

Runs after Stage 1.5 validation (and optional evidence repair). Marks extracted
actions with ``source: "extracted"`` and may append derived emergency actions
when evidence cites fault/error/alarm material.

Allowed fills here are structural only — no device-/golden-specific action
strings (see ``equipment-classification-spec-v3.7.md`` mechanical-fills table).
"""

from __future__ import annotations

import re
from typing import Any

ERROR_SECTION_RE = re.compile(r"error|fault|alarm|troubleshoot", re.I)

DERIVED_ERROR_ACTION = "consult error codes and alarms"
DERIVED_ERROR_CONTEXT = "emergency"
DERIVED_ERROR_AUDIENCE = "operator"

# Fuzzy match: treat these as "already present" so we do not duplicate.
_SIMILAR_ERROR_ACTION_RE = re.compile(
    r"(consult|check|review|read).{0,24}(error|fault|alarm)s?"
    r"|(error|fault|alarm)\s*codes?\s*(and|&)?\s*(alarms?)?",
    re.I,
)


def _tokens(text: str) -> set[str]:
    return {
        t
        for t in "".join(ch if ch.isalnum() else " " for ch in text.lower()).split()
        if t
    }


def actions_semantically_similar(a: str, b: str) -> bool:
    """True when two action strings describe the same consult-errors procedure."""
    aa = (a or "").strip().lower()
    bb = (b or "").strip().lower()
    if not aa or not bb:
        return False
    if aa == bb:
        return True
    if aa.replace(" the ", " ") == bb.replace(" the ", " "):
        return True
    if _SIMILAR_ERROR_ACTION_RE.search(aa) and _SIMILAR_ERROR_ACTION_RE.search(bb):
        return True
    ta, tb = _tokens(aa), _tokens(bb)
    if not ta or not tb:
        return False
    overlap = len(ta & tb) / min(len(ta), len(tb))
    return overlap >= 0.7 and bool(ta & {"error", "errors", "fault", "alarm", "alarms"})


def _has_similar_error_action(actions: list[dict[str, Any]]) -> bool:
    for item in actions:
        if not isinstance(item, dict):
            continue
        if actions_semantically_similar(
            str(item.get("action") or ""), DERIVED_ERROR_ACTION
        ):
            return True
    return False


def _error_evidence_path(profile: dict[str, Any]) -> str | None:
    for i, item in enumerate(profile.get("evidence") or []):
        if not isinstance(item, dict):
            continue
        section = str(item.get("manual_section") or "")
        note = str(item.get("note") or "")
        supports = str(item.get("supports_field") or "").strip()
        if supports == "safety_role.has_emergency_procedure":
            return f"evidence[{i}]"
        if ERROR_SECTION_RE.search(section) or ERROR_SECTION_RE.search(note):
            return f"evidence[{i}]"
    return None


def apply_derived_actions(
    profile: dict[str, Any],
    *,
    excerpts: list[dict[str, Any]] | list[str] | None = None,
) -> dict[str, Any]:
    """Return a copy with ``source`` tags and optional derived emergency action.

    When excerpts cite a titled ``shutdown and restart procedure`` and at least
    one ``evidence[N]`` exists, derive generic situational shutdown+restart
    actions grounded at that evidence path (no device-specific action strings —
    wording mirrors the procedure title only).
    """
    out = dict(profile)
    actions_in = list(out.get("operator_actions") or [])
    actions: list[dict[str, Any]] = []
    for item in actions_in:
        if not isinstance(item, dict):
            continue
        tagged = dict(item)
        if str(tagged.get("source") or "").strip() not in {"extracted", "derived"}:
            tagged["source"] = "extracted"
        actions.append(tagged)

    safety = out.get("safety_role") if isinstance(out.get("safety_role"), dict) else {}
    has_emergency = safety.get("has_emergency_procedure") is True
    evidence_path = _error_evidence_path(out)

    if (
        has_emergency
        and evidence_path is not None
        and not _has_similar_error_action(actions)
    ):
        actions.append(
            {
                "action": DERIVED_ERROR_ACTION,
                "audience": DERIVED_ERROR_AUDIENCE,
                "context": DERIVED_ERROR_CONTEXT,
                "source": "derived",
                "derived_from": evidence_path,
            }
        )

    # Structural shutdown/restart: procedure title in excerpts + any evidence row.
    SHUTDOWN_RESTART_SECTION_RE = re.compile(
        r"shutdown and restart procedure", re.I
    )
    blob_parts: list[str] = []
    if excerpts:
        for item in excerpts:
            if isinstance(item, str):
                blob_parts.append(item)
            elif isinstance(item, dict):
                blob_parts.append(str(item.get("text") or ""))
                blob_parts.append(str(item.get("source_heading_guess") or ""))
    for e in out.get("evidence") or []:
        if isinstance(e, dict):
            blob_parts.append(str(e.get("manual_section") or ""))
            blob_parts.append(str(e.get("note") or ""))
    blob = "\n".join(blob_parts)
    evidence_list = [e for e in (out.get("evidence") or []) if isinstance(e, dict)]
    if SHUTDOWN_RESTART_SECTION_RE.search(blob) and evidence_list:
        ground = "evidence[0]"
        for i, e in enumerate(evidence_list):
            sec = str(e.get("manual_section") or "")
            note = str(e.get("note") or "")
            if SHUTDOWN_RESTART_SECTION_RE.search(sec) or SHUTDOWN_RESTART_SECTION_RE.search(
                note
            ):
                ground = f"evidence[{i}]"
                break
            if ERROR_SECTION_RE.search(sec) or "shutdown" in sec.lower():
                ground = f"evidence[{i}]"
        for action_text in ("shutdown", "restart"):
            if _has_action_mention(actions, action_text):
                continue
            # Prefer pairing with "the device" — avoid golden/device brand strings.
            actions.append(
                {
                    "action": f"{action_text} the device",
                    "audience": "operator",
                    "context": "situational",
                    "source": "derived",
                    "derived_from": ground,
                }
            )

    out["operator_actions"] = actions

    from interaction_profile_networks import apply_network_bridges_from_excerpts

    out = apply_network_bridges_from_excerpts(out, excerpts)
    return out


def _has_action_mention(actions: list[dict[str, Any]], needle: str) -> bool:
    compact = needle.lower().replace(" the ", " ")
    for item in actions:
        if not isinstance(item, dict):
            continue
        raw = str(item.get("action") or "").lower().replace(" the ", " ")
        if compact in raw or raw in compact:
            return True
    return False
