"""Stage 1.5 — post-extraction interaction profile validator (pure code).

Runs between Stage 1 extraction and Stage 2 system graph. Annotates the profile
with ``validation_flags``, ``repairs``, and ``needs_rextraction``.

Mechanical auto-repair (warning + ``repairs[]``, no ``needs_rextraction``):
``contradiction_builtin_requires_accessory``, repairable ``dangling_needed_for``,
``fewshot_leakage`` stock phrases that can be dropped, and
``data_role_polarity`` (inverted controllable_from_network evidence).

Blocking ``BLOCKING_FLAGS`` remaining after repair attempts set
``needs_rextraction`` and fail ``stage15_gate_passes``. ``evidence_incomplete``
triggers a one-shot LLM evidence repair pass first (see
``interaction_profile_repair``); if blocking gaps remain, the gate fails.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any

import re

from interaction_profile_schema import (
    CONFIDENCE_KEYS,
    CONTROL_SURFACE_KEYS,
    DATA_ROLE_KEYS,
    DESC_ITEM_KEYS,
    DEVICE_KEYS,
    ENTITY_KINDS,
    EVIDENCE_KEYS,
    EXTRACTED_PROFILE_KEYS,
    NETWORK_BRIDGE_KEYS,
    NETWORK_KEYS,
    NETWORK_SPEAK_KEYS,
    OPERATOR_ACTION_KEYS,
    REQUIRES_DEVICE_KEYS,
    RUNS_PLATFORM_KEYS,
    SAFETY_ROLE_KEYS,
    SYSTEM_CATEGORY_TOKENS,
    control_surface_index_from_path,
    resolve_field_path,
)
from manual_retrieval import COVERAGE_LOW_THRESHOLD

ACTION_INTERFACE_RE = re.compile(
    r"\b(settings?|app|panel|menu|button|display|screen|knob|selector|"
    r"touchscreen|masteradjust|masterview)\b",
    re.I,
)
SNAKE_CASE_RE = re.compile(r"^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$")

# Flags routed to targeted repair (not re-extraction).
ABSENCE_REPAIR_FLAGS = frozenset(
    {
        "action_without_surface",
        "speaks_but_inert",
        "category_freeform_provenance",
    }
)

# Token-overlap / LCS threshold for evidence[].note verbatim detection.
EVIDENCE_VERBATIM_TOKEN_RATIO = 0.55
EVIDENCE_VERBATIM_LCS_RATIO = 0.50
EVIDENCE_NOTE_MAX_WORDS = 12
# Skip similarity on short factual notes (trivial overlap with source).
EVIDENCE_NOTE_SIMILARITY_MIN_WORDS = 10
EVIDENCE_NOTE_SIMILARITY_MIN_CHARS = 60

# Stock phrases from calibration examples — never copy onto other devices
# unless grounded in that device's excerpts. Checked on actions, surfaces,
# requires_devices, and supply/protect lists (examples K/L as well as A–J).
FEWSHOT_PHRASE_ATTRACTORS: tuple[str, ...] = (
    "reset bms after protective disconnect",
    "set ac input current limit",
    "select battery type",
    # Example K
    "masterview remote panel",
    "optional masterview remote panel",
    # Example L
    "install a fuse in the positive dc supply cable within 30cm of the battery",
    "fuse in the positive dc supply cable within 30cm",
    # Example M
    "safety relay will automatically open (remote off) when built-in thresholds are met",
    "safety relay automatically opens when built-in thresholds are met",
    "lock off knob position mechanically opens the safety relay",
    # Example N — requirement_kind taxonomy (meta phrases, not bare product names)
    "victronconnect app -> software_app",
    "ve.direct cable -> cable_or_consumable",
    "czone configuration tool -> commissioning_tool",
    "masteradjust software -> commissioning_tool",
    "gx device -> device",
    # Example G/H network bus names (speaks leakage — Zeus founding)
    "masterbus",
    "ve.direct",
)
# Distinctive markers that MUST appear in excerpts for the matched attractor
# to count as grounded (prevents soft topical overlap, e.g. any fuse text).
FEWSHOT_ATTRACTOR_MARKERS: dict[str, tuple[str, ...]] = {
    "masterview remote panel": ("masterview",),
    "optional masterview remote panel": ("masterview",),
    "install a fuse in the positive dc supply cable within 30cm of the battery": (
        "30cm",
        "30 cm",
    ),
    "fuse in the positive dc supply cable within 30cm": ("30cm", "30 cm"),
    "reset bms after protective disconnect": ("bms",),
    "safety relay will automatically open (remote off) when built-in thresholds are met": (
        "built-in thresholds",
        "built in thresholds",
    ),
    "safety relay automatically opens when built-in thresholds are met": (
        "built-in thresholds",
        "built in thresholds",
    ),
    "lock off knob position mechanically opens the safety relay": ("lock off",),
    "victronconnect app -> software_app": ("software_app",),
    "ve.direct cable -> cable_or_consumable": ("cable_or_consumable",),
    "czone configuration tool -> commissioning_tool": ("commissioning_tool",),
    "masteradjust software -> commissioning_tool": ("commissioning_tool",),
    "gx device -> device": ("requirement_kind", "software_app"),
    "masterbus": ("masterbus",),
    "ve.direct": ("ve.direct", "ve direct"),
}
# Back-compat alias used by older tests/imports.
FEWSHOT_ACTION_ATTRACTORS = FEWSHOT_PHRASE_ATTRACTORS
FEWSHOT_ACTION_MATCH_RATIO = 0.85
FEWSHOT_GROUNDING_RATIO = 0.55
FEWSHOT_PHRASE_MATCH_RATIO = FEWSHOT_ACTION_MATCH_RATIO
FEWSHOT_PHRASE_GROUNDING_RATIO = FEWSHOT_GROUNDING_RATIO

# Flags that mean "this profile is defective" at blocking severity. Any
# remaining blocking member after repair passes forces ``needs_rextraction``.
BLOCKING_FLAGS = frozenset(
    {
        "dangling_needed_for",
        "unknown_field",
        "evidence_shape_invalid",
        "evidence_heading_invalid",
        "fewshot_leakage",
        "evidence_incomplete",
        "derived_ungrounded",
        "direction_mismatch",
    }
)

# Explicit re-extract attractors (also in BLOCKING_FLAGS). Kept for callers that
# special-case these names; the gate itself is severity+BLOCKING_FLAGS.
NEEDS_REXTRACTION_FLAGS = frozenset(
    {
        "fewshot_leakage",
        "dangling_needed_for",
    }
)

# manual_section must look like a heading/title, not body prose or OCR crumbs.
_MANUAL_SECTION_LETTER_CRUMB = re.compile(
    r"^(?:[A-Za-z]\s+){1,}[A-Za-z]$"
)

# Evidence notes that describe THIS device commanding others — not being
# commanded. Founding: Zeus "Control devices via the CZone network".
_CONTROLS_OTHERS_NOTE = re.compile(
    r"(?:"
    r"control(?:s|ling)?\s+(?:devices?|loads?|circuits?|equipment|connected)"
    r"|control\s+[\w\s]{0,40}\s+via\s+(?:the\s+)?(?:czone|nmea|network)"
    r"|czone\s+control\s+from"
    r"|control(?:ling)?\s+other\s+devices?"
    r"|configur(?:e|ing)\s+(?:internal\s+and\s+)?(?:external\s+)?"
    r"connected\s+devices?"
    r")",
    re.IGNORECASE,
)

# Evidence notes that support true controllable_from_network (this unit is
# the object of remote command).
_THIS_UNIT_CONTROLLABLE_NOTE = re.compile(
    r"(?:"
    r"(?:this\s+)?(?:unit|charger|inverter|battery|device|mfd|display)\s+"
    r"(?:can\s+be\s+)?(?:controlled|configured|monitored|adjusted)"
    r"|(?:controlled|configured|adjusted|monitored)\s+"
    r"(?:remotely|from\s+(?:the\s+)?(?:app|smartphone|phone|tablet|vrm|"
    r"masterview))"
    r"|via\s+(?:the\s+)?(?:victronconnect|masteradjust|app|bluetooth|vrm)"
    r"|remote(?:ly)?\s+(?:control|configure|monitor)"
    r"|settings?\s+(?:can\s+be\s+)?(?:adjusted|changed|configured)\s+from"
    r"|command(?:ed|s)?\s+(?:over|via|from)\s+(?:the\s+)?"
    r"(?:network|app|bus)"
    r")",
    re.IGNORECASE,
)

CONTROLLABLE_FROM_NETWORK_PATH = "data_roles.controllable_from_network"

# Hub-commanding evidence — this device controls others; not a data_roles
# direction. Founding: Zeus "CZone app controls devices via the network".
_HUB_COMMANDING_EVIDENCE = re.compile(
    r"(?:"
    r"(?:control|controls|controlling|command|commands|commanding|"
    r"switch|switches|switching)\s+"
    r"(?:various\s+)?(?:lights|pumps|devices?|loads?|circuits?|equipment|"
    r"connected)"
    r"|control(?:s|ling)?\s+[\w\s]{0,40}\s+via\s+(?:the\s+)?"
    r"(?:czone|nmea|network)"
    r"|czone\s+app\s+controls"
    r")",
    re.IGNORECASE,
)

# Content tokens ignored when scoring evidence↔action coherence (v4.27).
_EVIDENCE_COHERENCE_STOPWORDS = frozenset(
    {
        "a",
        "an",
        "the",
        "to",
        "for",
        "of",
        "and",
        "or",
        "on",
        "in",
        "via",
        "from",
        "with",
        "its",
        "this",
        "that",
        "when",
        "how",
        "you",
        "your",
        "unit",
        "device",
        "actions",
        "action",
        "steps",
        "step",
        "describes",
        "describing",
        "using",
        "use",
        "first",
    }
)

# Note better-matches a different action than supports_field names.
_EVIDENCE_MISMATCH_MIN_BEST = 0.3
_EVIDENCE_MISMATCH_MARGIN = 0.15


def controllable_evidence_is_controls_others(note: str, section: str = "") -> bool:
    """True when evidence describes commanding other devices, not this unit.

    This-unit remote-command wording wins when both patterns match.
    """
    blob = f"{note or ''} {section or ''}".strip()
    if not blob:
        return False
    if _THIS_UNIT_CONTROLLABLE_NOTE.search(blob):
        return False
    return bool(_CONTROLS_OTHERS_NOTE.search(blob))


def apply_data_role_polarity_repairs(
    profile: dict[str, Any],
) -> tuple[dict[str, Any], list[dict[str, str]]]:
    """Clear ``controllable_from_network`` when only controls-others evidence.

    Warning + ``repairs[]``; does not set ``needs_rextraction``. Founding:
    Zeus CZone "Control devices via the CZone network".
    """
    out = deepcopy(profile) if isinstance(profile, dict) else {}
    roles = out.get("data_roles") if isinstance(out.get("data_roles"), dict) else {}
    if not bool(roles.get("controllable_from_network")):
        return out, []

    evidence = [dict(e) for e in (out.get("evidence") or []) if isinstance(e, dict)]
    supporting = [
        e
        for e in evidence
        if str(e.get("supports_field") or "").strip() == CONTROLLABLE_FROM_NETWORK_PATH
    ]
    if not supporting:
        return out, []

    inverted = [
        e
        for e in supporting
        if controllable_evidence_is_controls_others(
            str(e.get("note") or ""),
            str(e.get("manual_section") or ""),
        )
    ]
    if not inverted or len(inverted) < len(supporting):
        # Keep the flag when at least one supporting note is not inverted.
        if inverted:
            # Drop only the inverted rows; leave the role true.
            drop_notes = {
                (
                    str(e.get("note") or ""),
                    str(e.get("manual_section") or ""),
                )
                for e in inverted
            }
            kept_ev = [
                e
                for e in evidence
                if not (
                    str(e.get("supports_field") or "").strip()
                    == CONTROLLABLE_FROM_NETWORK_PATH
                    and (
                        str(e.get("note") or ""),
                        str(e.get("manual_section") or ""),
                    )
                    in drop_notes
                )
            ]
            out["evidence"] = kept_ev
            repairs = [dict(r) for r in (out.get("repairs") or []) if isinstance(r, dict)]
            warnings: list[dict[str, str]] = []
            for e in inverted:
                repairs.append(
                    {
                        "repair": "dropped_entry",
                        "flag": "data_role_polarity",
                        "field_path": CONTROLLABLE_FROM_NETWORK_PATH,
                        "original_entry": dict(e),
                    }
                )
                warnings.append(
                    _flag(
                        "data_role_polarity",
                        "repaired: dropped_entry — evidence describes controlling "
                        f"other devices ({e.get('note')!r})",
                        CONTROLLABLE_FROM_NETWORK_PATH,
                        severity="warning",
                    )
                )
            out["repairs"] = repairs
            return out, warnings
        return out, []

    # All supporting evidence is polarity-inverted → clear the role.
    kept_ev = [
        e
        for e in evidence
        if str(e.get("supports_field") or "").strip() != CONTROLLABLE_FROM_NETWORK_PATH
    ]
    out["evidence"] = kept_ev
    roles = dict(roles)
    roles["controllable_from_network"] = False
    out["data_roles"] = roles
    repairs = [dict(r) for r in (out.get("repairs") or []) if isinstance(r, dict)]
    notes = [str(e.get("note") or "") for e in inverted]
    repairs.append(
        {
            "repair": "cleared_controllable_from_network",
            "flag": "data_role_polarity",
            "field_path": CONTROLLABLE_FROM_NETWORK_PATH,
            "original_value": True,
            "inverted_notes": notes,
        }
    )
    out["repairs"] = repairs
    warnings = [
        _flag(
            "data_role_polarity",
            "repaired: cleared controllable_from_network — evidence describes "
            f"controlling other devices ({notes!r})",
            CONTROLLABLE_FROM_NETWORK_PATH,
            severity="warning",
        )
    ]
    return out, warnings


def _evidence_content_tokens(text: str) -> set[str]:
    return {
        t
        for t in _tokens(text)
        if t not in _EVIDENCE_COHERENCE_STOPWORDS and len(t) > 1
    }


def evidence_note_action_overlap(note_blob: str, action_text: str) -> float:
    """Content-token overlap of note/section blob vs an action string."""
    nt = _evidence_content_tokens(note_blob)
    at = _evidence_content_tokens(action_text)
    if not nt or not at:
        return 0.0
    return len(nt & at) / min(len(nt), len(at))


def evidence_action_support_mismatch(
    profile: dict[str, Any],
    *,
    note: str,
    section: str,
    linked_action: str,
) -> str | None:
    """If note better matches another operator_action, return that action text.

    Scores the **note** only — shared ``manual_section`` titles (e.g. both
    software-update actions under "Update software") must not scramble pairing.
    Occasion-style notes that match nothing strongly return None (no flag).
    Empty notes fall back to section.
    """
    actions = [
        str(a.get("action") or "").strip()
        for a in (profile.get("operator_actions") or [])
        if isinstance(a, dict) and str(a.get("action") or "").strip()
    ]
    if not actions or not linked_action.strip():
        return None
    blob = (note or "").strip() or (section or "").strip()
    if not blob:
        return None
    linked_score = evidence_note_action_overlap(blob, linked_action)
    best_action = linked_action
    best_score = linked_score
    for action in actions:
        score = evidence_note_action_overlap(blob, action)
        if score > best_score:
            best_score = score
            best_action = action
    if best_score < _EVIDENCE_MISMATCH_MIN_BEST:
        return None
    if best_action == linked_action:
        return None
    if best_score < linked_score + _EVIDENCE_MISMATCH_MARGIN:
        return None
    return best_action


def check_evidence_support_mismatch(
    profile: dict[str, Any],
) -> list[dict[str, str]]:
    """Warn when evidence note better matches a different operator_action."""
    from interaction_profile_merge import parse_operator_action_text_path

    flags: list[dict[str, str]] = []
    for i, item in enumerate(profile.get("evidence") or []):
        if not isinstance(item, dict):
            continue
        field = str(item.get("supports_field") or "").strip()
        linked, _suffix = parse_operator_action_text_path(field)
        if not linked:
            continue
        better = evidence_action_support_mismatch(
            profile,
            note=str(item.get("note") or ""),
            section=str(item.get("manual_section") or ""),
            linked_action=linked,
        )
        if not better:
            continue
        flags.append(
            _flag(
                "evidence_support_mismatch",
                f"evidence note better matches action {better!r} than "
                f"linked {linked!r}",
                f"evidence[{i}].supports_field",
                severity="warning",
            )
        )
    return flags


def evidence_note_is_hub_commanding(note: str, section: str = "") -> bool:
    """True when note describes this device commanding other devices."""
    blob = f"{note or ''} {section or ''}".strip()
    return bool(blob and _HUB_COMMANDING_EVIDENCE.search(blob))


def check_data_role_direction_mismatch(
    profile: dict[str, Any],
) -> list[dict[str, str]]:
    """Blocking: hub-commanding notes cannot support any data_roles field."""
    flags: list[dict[str, str]] = []
    for i, item in enumerate(profile.get("evidence") or []):
        if not isinstance(item, dict):
            continue
        field = str(item.get("supports_field") or "").strip()
        if not field.startswith("data_roles."):
            continue
        note = str(item.get("note") or "")
        section = str(item.get("manual_section") or "")
        if not evidence_note_is_hub_commanding(note, section):
            continue
        flags.append(
            _flag(
                "direction_mismatch",
                "evidence describes this device commanding other devices — "
                f"supports none of data_roles (got {field!r}; note={note!r})",
                f"evidence[{i}].supports_field",
                severity="blocking",
            )
        )
    return flags


# Occasion circularity — purpose restates the action (v4.29).
_OCCASION_CIRCULAR_STOP = frozenset(
    {
        "a",
        "an",
        "the",
        "to",
        "for",
        "of",
        "and",
        "or",
        "your",
        "its",
        "unit",
        "device",
        "display",
    }
)
_OCCASION_TOKEN_CANON: dict[str, str] = {
    "power": "power",
    "down": "off",
    "off": "off",
    "on": "on",
    "start": "on",
    "starting": "on",
    "stop": "off",
    "shut": "off",
    "turn": "switch",
    "switch": "switch",
    "switches": "switch",
}
_POWER_OFF_PAIR = re.compile(
    r"(?:turn\s+(?:\w+\s+){0,3}off|power\s+down|shut\s+down|switch\s+off)",
    re.I,
)
_POWER_ON_PAIR = re.compile(
    r"(?:turn\s+(?:\w+\s+){0,3}on|power\s+up|switch\s+on|\bstart(?:ing)?\b)",
    re.I,
)


def _occasion_canon_tokens(text: str) -> set[str]:
    out: set[str] = set()
    for t in _tokens(text):
        if t in _OCCASION_CIRCULAR_STOP:
            continue
        out.add(_OCCASION_TOKEN_CANON.get(t, t))
    return out


def occasion_is_circular(action: str, occasion: str) -> bool:
    """True when occasion is only a purpose-restatement of the action."""
    act = (action or "").strip()
    occ = (occasion or "").strip()
    if not act or not occ:
        return False
    occ_body = re.sub(r"^(?:to|for)\s+", "", occ, flags=re.I).strip()
    # Power on/off purpose restatements (Zeus founding).
    if _POWER_OFF_PAIR.search(act) and _POWER_OFF_PAIR.search(occ_body):
        return True
    if _POWER_ON_PAIR.search(act) and _POWER_ON_PAIR.search(occ_body):
        return True
    ta = _occasion_canon_tokens(act)
    to = _occasion_canon_tokens(occ_body)
    if not ta or not to:
        return False
    # Exact canon-token identity (no novel content either way).
    return ta == to


def apply_occasion_circular_repairs(
    profile: dict[str, Any],
) -> tuple[dict[str, Any], list[dict[str, str]]]:
    """Clear circular occasions (warning). They do not satisfy xxxix."""
    out = deepcopy(profile) if isinstance(profile, dict) else {}
    actions = out.get("operator_actions")
    if not isinstance(actions, list):
        return out, []
    repairs = [dict(r) for r in (out.get("repairs") or []) if isinstance(r, dict)]
    warnings: list[dict[str, str]] = []
    changed = False
    for i, act in enumerate(actions):
        if not isinstance(act, dict):
            continue
        action = str(act.get("action") or "")
        occasion = str(act.get("occasion") or "").strip()
        if not occasion or not occasion_is_circular(action, occasion):
            continue
        path = f"operator_actions[{i}].occasion"
        repairs.append(
            {
                "repair": "cleared_circular_occasion",
                "flag": "occasion_circular",
                "field_path": path,
                "original_value": occasion,
            }
        )
        warnings.append(
            _flag(
                "occasion_circular",
                f"repaired: cleared circular occasion {occasion!r} for "
                f"action {action!r}",
                path,
                severity="warning",
            )
        )
        act = dict(act)
        act.pop("occasion", None)
        actions[i] = act
        changed = True
    if changed:
        out["operator_actions"] = actions
        out["repairs"] = repairs
    return out, warnings


def _flag(
    name: str,
    detail: str,
    field_path: str,
    *,
    severity: str,
) -> dict[str, str]:
    return {
        "flag": name,
        "severity": severity,
        "detail": detail,
        "field_path": field_path,
    }


def _tokens(text: str) -> list[str]:
    return [
        t
        for t in "".join(ch if ch.isalnum() else " " for ch in text.lower()).split()
        if t
    ]


def _note_eligible_for_similarity(note: str) -> bool:
    """Short factual notes trivially overlap source — do not flag them."""
    words = _tokens(note)
    return (
        len(words) >= EVIDENCE_NOTE_SIMILARITY_MIN_WORDS
        or len(note.strip()) >= EVIDENCE_NOTE_SIMILARITY_MIN_CHARS
    )


def _token_overlap_ratio(a: str, b: str) -> float:
    ta, tb = set(_tokens(a)), set(_tokens(b))
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / min(len(ta), len(tb))


def _lcs_len(a: str, b: str) -> int:
    """Longest common substring length (character), capped inputs for cost."""
    aa = " ".join(_tokens(a))
    bb = " ".join(_tokens(b))
    if not aa or not bb:
        return 0
    # Bound cost on long excerpt dumps.
    if len(aa) > 800:
        aa = aa[:800]
    if len(bb) > 800:
        bb = bb[:800]
    best = 0
    # Prefer token-string LCS via DP on characters of normalized strings.
    m, n = len(aa), len(bb)
    prev = [0] * (n + 1)
    for i in range(1, m + 1):
        cur = [0] * (n + 1)
        ca = aa[i - 1]
        for j in range(1, n + 1):
            if ca == bb[j - 1]:
                cur[j] = prev[j - 1] + 1
                if cur[j] > best:
                    best = cur[j]
            else:
                cur[j] = 0
        prev = cur
    return best


def _lcs_ratio(a: str, b: str) -> float:
    aa = " ".join(_tokens(a))
    if not aa:
        return 0.0
    return _lcs_len(a, b) / len(aa)


def _excerpt_corpus(excerpts: list[dict[str, Any]] | list[str] | None) -> list[str]:
    if not excerpts:
        return []
    out: list[str] = []
    for item in excerpts:
        if isinstance(item, str) and item.strip():
            out.append(item)
        elif isinstance(item, dict):
            for key in ("text", "content", "excerpt", "body"):
                val = item.get(key)
                if isinstance(val, str) and val.strip():
                    out.append(val)
                    break
    return out


def _normalize_action(text: str) -> str:
    return " ".join(_tokens(text))


def _matches_fewshot_attractor(text: str) -> str | None:
    norm = _normalize_action(text)
    if not norm:
        return None
    phrase_l = (text or "").lower()
    for attractor in FEWSHOT_PHRASE_ATTRACTORS:
        # If the attractor has distinctive markers (e.g. 30cm, MasterView),
        # require those markers in the *profile text* before attributing a match.
        # Prevents soft topical overlap (any "positive battery fuse") firing L.
        markers = FEWSHOT_ATTRACTOR_MARKERS.get(attractor.lower().strip())
        if markers is None:
            att_norm_key = _normalize_action(attractor)
            for key, marks in FEWSHOT_ATTRACTOR_MARKERS.items():
                if _token_overlap_ratio(att_norm_key, key) >= FEWSHOT_PHRASE_MATCH_RATIO:
                    markers = marks
                    break
        if markers and not any(m.lower() in phrase_l for m in markers):
            continue
        att_norm = _normalize_action(attractor)
        if norm == att_norm:
            return attractor
        if _token_overlap_ratio(norm, att_norm) >= FEWSHOT_PHRASE_MATCH_RATIO:
            return attractor
    return None


def _phrase_grounded_in_corpus(text: str, corpus: list[str]) -> bool:
    """Grounding uses the *attractor* match elsewhere; this helper tests phrase⊂corpus.

    Prefer ``_attractor_grounded_in_corpus`` for fewshot checks so a leaked
    stock sentence cannot hide behind soft topical overlap (fuse/battery).
    """
    if not corpus:
        return False
    joined = "\n".join(corpus)
    return _token_overlap_ratio(text, joined) >= FEWSHOT_PHRASE_GROUNDING_RATIO


def _attractor_grounded_in_corpus(attractor: str, corpus: list[str]) -> bool:
    """True when distinctive attractor markers / tokens appear in excerpts."""
    if not corpus or not attractor.strip():
        return False
    joined = "\n".join(corpus).lower()
    markers = FEWSHOT_ATTRACTOR_MARKERS.get(attractor.lower().strip())
    if markers is None:
        # Fall back: case-insensitive lookup by normalized key proximity.
        att_norm = _normalize_action(attractor)
        for key, marks in FEWSHOT_ATTRACTOR_MARKERS.items():
            if _token_overlap_ratio(att_norm, key) >= FEWSHOT_PHRASE_MATCH_RATIO:
                markers = marks
                break
    if markers:
        return any(m.lower() in joined for m in markers)
    stop = {
        "the",
        "and",
        "for",
        "with",
        "from",
        "that",
        "this",
        "into",
        "of",
        "in",
        "a",
        "an",
        "to",
        "or",
        "on",
        "at",
        "is",
        "be",
        "by",
    }
    distinctive = [t for t in _tokens(attractor) if len(t) > 3 and t not in stop]
    if not distinctive:
        return _token_overlap_ratio(attractor, joined) >= FEWSHOT_PHRASE_GROUNDING_RATIO
    hit = sum(1 for t in distinctive if t in joined)
    return (hit / len(distinctive)) >= FEWSHOT_PHRASE_GROUNDING_RATIO


def _fewshot_candidate_phrases(profile: dict[str, Any]) -> list[tuple[str, str]]:
    """(field_path, text) candidates checked for calibration leakage."""
    out: list[tuple[str, str]] = []
    for i, action in enumerate(profile.get("operator_actions") or []):
        if not isinstance(action, dict):
            continue
        if str(action.get("source") or "") == "derived":
            continue
        out.append((f"operator_actions[{i}].action", str(action.get("action") or "")))
    for i, surface in enumerate(profile.get("control_surfaces") or []):
        if not isinstance(surface, dict):
            continue
        label = str(surface.get("label_verbatim") or "").strip()
        surface_name = str(surface.get("surface") or "").strip()
        if label:
            out.append((f"control_surfaces[{i}].label_verbatim", label))
        # Enum alone is not enough to leak — pair with label if present.
        if surface_name == "remote_panel_accessory" and label:
            out.append(
                (
                    f"control_surfaces[{i}].surface",
                    f"{surface_name} {label}",
                )
            )
    for i, req in enumerate(profile.get("requires_devices") or []):
        if not isinstance(req, dict):
            continue
        if str(req.get("source") or "") == "derived":
            continue
        out.append(
            (
                f"requires_devices[{i}].description_verbatim",
                str(req.get("description_verbatim") or ""),
            )
        )
    for key in ("supply_requirements", "protected_by", "protects"):
        for i, item in enumerate(profile.get(key) or []):
            if not isinstance(item, dict):
                continue
            if str(item.get("source") or "") == "derived":
                continue
            out.append(
                (
                    f"{key}[{i}].description_verbatim",
                    str(item.get("description_verbatim") or ""),
                )
            )
    networks = profile.get("networks") if isinstance(profile.get("networks"), dict) else {}
    for i, speak in enumerate(networks.get("speaks") or []):
        if not isinstance(speak, dict):
            continue
        name = str(speak.get("name_verbatim") or "").strip()
        if name:
            out.append((f"networks.speaks[{i}].name_verbatim", name))
    for i, bridge in enumerate(networks.get("bridges") or []):
        if not isinstance(bridge, dict):
            continue
        for endpoint in ("from", "to"):
            name = str(bridge.get(endpoint) or "").strip()
            if name:
                out.append((f"networks.bridges[{i}].{endpoint}", name))
    return out


def network_name_grounded_in_corpus(
    name: str, corpus: list[str]
) -> bool:
    """True when a speak/bridge name appears in excerpts (verbatim or tokens).

    Founding: ``MasterBus`` / ``VE.Direct`` absent from Zeus System Guide
    excerpts must fail; Victron manuals that name ``VE.Direct`` must pass.
    """
    n = (name or "").strip()
    if not n or not corpus:
        return False
    joined = "\n".join(corpus)
    lower = joined.lower()
    if n.lower() in lower:
        return True
    toks = _tokens(n)
    if not toks:
        return False
    joined_norm = " ".join(_tokens(joined))
    phrase = " ".join(toks)
    if phrase and phrase in joined_norm:
        return True
    words = set(joined_norm.split())
    return all(t in words for t in toks)

def evidence_supports_paths(profile: dict[str, Any]) -> set[str]:
    supports: set[str] = set()
    for item in profile.get("evidence") or []:
        if not isinstance(item, dict):
            continue
        path = str(item.get("supports_field") or "").strip()
        if path:
            supports.add(path)
    return supports


def _path_has_evidence(path: str, supports: set[str]) -> bool:
    if path in supports:
        return True
    return any(s == path or s.startswith(path + ".") for s in supports)


def manual_section_is_heading(section: str) -> bool:
    """True when ``manual_section`` looks like a title/heading, not body text.

    Rejects sentence dumps and ``D E``-class letter crumbs (Zeus founding).
    """
    s = (section or "").strip()
    if not s:
        return False
    if _MANUAL_SECTION_LETTER_CRUMB.fullmatch(s):
        return False
    toks = [t for t in re.split(r"\s+", s) if t]
    if not toks:
        return False
    # Single-letter token majority (OCR/fragment noise).
    letterish = sum(1 for t in toks if len(re.sub(r"[^A-Za-z0-9]", "", t)) <= 1)
    if len(toks) >= 2 and letterish / len(toks) >= 0.75:
        return False
    # Headings stay short; long runs are body excerpts mistaken for titles.
    if len(toks) > 12:
        return False
    if re.search(r"[.!?]\s*$", s) and len(toks) > 6:
        return False
    # Prose openers ("I Alerts Select to view…").
    if re.match(r"(?i)^i\s+\w+", s) and len(toks) > 4:
        return False
    if re.search(r"(?i)\b(select to|including|your display has)\b", s):
        return False
    return True


def stage15_gate_passes(profile: dict[str, Any]) -> bool:
    """True when Stage 1.5 leaves the profile eligible for Stage 2."""
    if not isinstance(profile, dict):
        return False
    if profile.get("needs_rextraction") is True:
        return False
    for item in profile.get("validation_flags") or []:
        if not isinstance(item, dict):
            continue
        if (
            str(item.get("severity") or "") == "blocking"
            and str(item.get("flag") or "") in BLOCKING_FLAGS
        ):
            return False
    return True


def missing_priority_evidence_paths(profile: dict[str, Any]) -> list[str]:
    """Priority (a)+(b): true data_roles, each requires_devices, true safety_role.

    Requires that carry ``gate_verbatim`` are self-evidencing (platform
    appears-if gate) and do not need a separate LLM evidence row (v4.28).
    """
    supports = evidence_supports_paths(profile)
    missing: list[str] = []
    data_roles = profile.get("data_roles")
    if isinstance(data_roles, dict):
        for key, val in data_roles.items():
            if val is True:
                path = f"data_roles.{key}"
                if not _path_has_evidence(path, supports):
                    missing.append(path)
    for i, req in enumerate(profile.get("requires_devices") or []):
        if not isinstance(req, dict):
            continue
        from interaction_profile_ui_pages import requires_entry_self_evidencing

        if requires_entry_self_evidencing(req):
            continue
        path = f"requires_devices[{i}]"
        if not _path_has_evidence(path, supports):
            missing.append(path)
    safety = profile.get("safety_role")
    if isinstance(safety, dict):
        for key, val in safety.items():
            if val is True:
                path = f"safety_role.{key}"
                if not _path_has_evidence(path, supports):
                    missing.append(path)
    return missing


def _is_builtin_surface_dependency(
    profile: dict[str, Any], needed_for: str
) -> bool:
    idx = control_surface_index_from_path(needed_for)
    if idx is None:
        return False
    surfaces = profile.get("control_surfaces") or []
    if not isinstance(surfaces, list) or idx < 0 or idx >= len(surfaces):
        return False
    surface = surfaces[idx]
    return isinstance(surface, dict) and surface.get("optional_accessory") is False


def _contradiction_repair_warning(repair: dict[str, Any]) -> dict[str, str]:
    original = repair.get("original_entry") if isinstance(repair.get("original_entry"), dict) else {}
    desc = str(original.get("description_verbatim") or "")
    field_path = str(repair.get("field_path") or "requires_devices")
    return _flag(
        "contradiction_builtin_requires_accessory",
        "repaired: dropped_entry — needed_for pointed at a control "
        "surface with optional_accessory:false "
        f"(dropped {desc!r})",
        field_path,
        severity="warning",
    )


def apply_contradiction_auto_repairs(
    profile: dict[str, Any],
) -> tuple[dict[str, Any], list[dict[str, str]]]:
    """Drop non-software requires_devices tied to built-in surfaces.

    ``software_app`` entries targeting built-in surfaces are **kept** (v4.0:
    downloadable apps are recorded + auto-satisfied in Stage 2). Hardware
    accessories incorrectly required for a built-in surface are still dropped.

    Evidence ``supports_field: requires_devices[N]`` paths are remapped (or
    dropped) so a mechanical drop cannot leave a false ``evidence_incomplete``.
    """
    from interaction_profile_kinds import classify_requirement_kind

    out = deepcopy(profile) if isinstance(profile, dict) else {}
    repairs = [
        dict(r) for r in (out.get("repairs") or []) if isinstance(r, dict)
    ]
    warning_flags: list[dict[str, str]] = []
    kept: list[Any] = []
    kept_orig_indices: list[int] = []
    for i, req in enumerate(out.get("requires_devices") or []):
        if not isinstance(req, dict):
            kept.append(req)
            kept_orig_indices.append(i)
            continue
        needed_for = str(req.get("needed_for") or "").strip()
        field_path = f"requires_devices[{i}].needed_for"
        desc = str(req.get("description_verbatim") or "")
        kind = str(req.get("requirement_kind") or "").strip() or classify_requirement_kind(
            desc
        )
        if not needed_for:
            original = {
                "description_verbatim": desc,
                "needed_for": "",
            }
            repair = {
                "repair": "dropped_entry",
                "flag": "dangling_needed_for",
                "field_path": field_path,
                "original_entry": original,
            }
            repairs.append(repair)
            warning_flags.append(
                _flag(
                    "dangling_needed_for",
                    "repaired: dropped_entry — empty needed_for "
                    f"(dropped {original.get('description_verbatim')!r})",
                    field_path,
                    severity="warning",
                )
            )
            continue
        if (
            needed_for
            and _is_builtin_surface_dependency(out, needed_for)
            and kind != "software_app"
        ):
            original = {
                "description_verbatim": desc,
                "needed_for": needed_for,
            }
            repair = {
                "repair": "dropped_entry",
                "flag": "contradiction_builtin_requires_accessory",
                "field_path": field_path,
                "original_entry": original,
            }
            repairs.append(repair)
            continue
        kept.append(req)
        kept_orig_indices.append(i)
    out["requires_devices"] = kept
    # Remap / drop requires_devices evidence indices after list surgery.
    old_to_new = {old: new for new, old in enumerate(kept_orig_indices)}
    remapped_evidence: list[Any] = []
    for item in out.get("evidence") or []:
        if not isinstance(item, dict):
            remapped_evidence.append(item)
            continue
        entry = dict(item)
        field = str(entry.get("supports_field") or "").strip()
        m = re.fullmatch(r"requires_devices\[(\d+)\](.*)", field)
        if m:
            old_i = int(m.group(1))
            suffix = m.group(2) or ""
            if old_i not in old_to_new:
                continue  # evidence for a dropped require
            entry["supports_field"] = f"requires_devices[{old_to_new[old_i]}]{suffix}"
        remapped_evidence.append(entry)
    out["evidence"] = remapped_evidence
    out["repairs"] = repairs
    for repair in repairs:
        if (
            repair.get("flag") == "contradiction_builtin_requires_accessory"
            and repair.get("repair") == "dropped_entry"
        ):
            warning_flags.append(_contradiction_repair_warning(repair))
        if (
            repair.get("flag") == "dangling_needed_for"
            and repair.get("repair") == "dropped_entry"
            and not any(
                f.get("field_path") == repair.get("field_path")
                and f.get("flag") == "dangling_needed_for"
                for f in warning_flags
            )
        ):
            original = (
                repair.get("original_entry")
                if isinstance(repair.get("original_entry"), dict)
                else {}
            )
            warning_flags.append(
                _flag(
                    "dangling_needed_for",
                    "repaired: dropped_entry — empty needed_for "
                    f"(dropped {original.get('description_verbatim')!r})",
                    str(repair.get("field_path") or ""),
                    severity="warning",
                )
            )
    return out, warning_flags


_DC_SUPPLY_GROUNDING = re.compile(
    # Generic supply-protection language — not product/device names.
    r"\bmust be fused\b|\bfuse(?:d)?\b.{0,40}\b(?:battery|cable|positive|dc)\b|"
    r"\b(?:battery|cable|positive|dc)\b.{0,40}\bfuse(?:d)?\b",
    re.I,
)


def apply_optional_surface_requires(
    profile: dict[str, Any],
) -> tuple[dict[str, Any], list[dict[str, str]]]:
    """Structural fill: optional_accessory surface ⇒ requires_devices entry.

    Grounding: ``control_surfaces[i]`` (already extracted). No product-name
    matching — description copies ``label_verbatim`` or surface enum only.
    """
    out = deepcopy(profile) if isinstance(profile, dict) else {}
    surfaces = out.get("control_surfaces") or []
    if not isinstance(surfaces, list):
        return out, []
    requires = [
        dict(r) for r in (out.get("requires_devices") or []) if isinstance(r, dict)
    ]
    repairs = [dict(r) for r in (out.get("repairs") or []) if isinstance(r, dict)]
    warnings: list[dict[str, str]] = []

    for i, surface in enumerate(surfaces):
        if not isinstance(surface, dict) or surface.get("optional_accessory") is not True:
            continue
        path = str(surface.get("path") or f"control_surfaces[{i}]").strip()
        label = str(surface.get("label_verbatim") or "").strip()
        already = any(
            str(r.get("needed_for") or "").strip() == path
            or (
                label
                and label.lower()
                in str(r.get("description_verbatim") or "").lower()
            )
            for r in requires
        )
        if already:
            continue
        desc = label or str(surface.get("surface") or "optional accessory")
        entry = {
            "description_verbatim": desc,
            "needed_for": path,
            "source": "derived",
            "derived_from": path,
        }
        from interaction_profile_kinds import classify_requirement_kind

        entry["requirement_kind"] = classify_requirement_kind(desc)
        requires.append(entry)
        repair = {
            "repair": "added_requires_for_optional_surface",
            "flag": "optional_surface_without_requires",
            "field_path": path,
            "added_entry": entry,
        }
        repairs.append(repair)
        warnings.append(
            _flag(
                "optional_surface_without_requires",
                f"repaired: added requires_devices for optional surface {desc!r}",
                path,
                severity="warning",
            )
        )

    out["requires_devices"] = requires
    out["repairs"] = repairs
    for repair in repairs:
        if repair.get("repair") != "added_requires_for_optional_surface":
            continue
        path = str(repair.get("field_path") or "")
        if any(f.get("field_path") == path for f in warnings):
            continue
        added = repair.get("added_entry") if isinstance(repair.get("added_entry"), dict) else {}
        warnings.append(
            _flag(
                "optional_surface_without_requires",
                "repaired: added requires_devices for optional surface "
                f"{added.get('description_verbatim')!r}",
                path,
                severity="warning",
            )
        )
    return out, warnings


def apply_grounded_dc_fuse_fill(
    profile: dict[str, Any],
    excerpts: list[dict[str, Any]] | list[str] | None,
) -> tuple[dict[str, Any], list[dict[str, str]]]:
    """Structural fill: add supply_requirements when **evidence** cites fused supply.

    Trigger vocabulary is generic supply-protection language (``must be fused``,
    fuse↔battery/cable/DC), never product names. ``derived_from`` must be an
    ``evidence[N]`` path. Raw excerpts alone are not sufficient grounding.
    ``excerpts`` is unused (API stability with the validate call site).
    """
    _ = excerpts
    out = deepcopy(profile) if isinstance(profile, dict) else {}

    def _has_fuse(items: Any) -> bool:
        return any(
            isinstance(x, dict) and "fuse" in str(x.get("description_verbatim") or "").lower()
            for x in (items or [])
        )

    if _has_fuse(out.get("supply_requirements")) or _has_fuse(out.get("protected_by")):
        return out, []

    evidence_path: str | None = None
    grounded_note = ""
    for i, item in enumerate(out.get("evidence") or []):
        if not isinstance(item, dict):
            continue
        blob = " ".join(
            [
                str(item.get("supports_field") or ""),
                str(item.get("manual_section") or ""),
                str(item.get("note") or ""),
            ]
        )
        if _DC_SUPPLY_GROUNDING.search(blob):
            evidence_path = f"evidence[{i}]"
            grounded_note = str(item.get("note") or "").strip()
            break
    if evidence_path is None:
        return out, []

    # Prefer the evidence note when it already names the requirement; else a
    # generic description (not device-specific product copy).
    desc = grounded_note or "Battery/DC cable must be fused"
    if "fuse" not in desc.lower():
        desc = "Battery/DC cable must be fused"

    supply = [
        dict(x) for x in (out.get("supply_requirements") or []) if isinstance(x, dict)
    ]
    entry = {
        "description_verbatim": desc,
        "source": "derived",
        "derived_from": evidence_path,
    }
    supply.append(entry)
    out["supply_requirements"] = supply
    repairs = [dict(r) for r in (out.get("repairs") or []) if isinstance(r, dict)]
    repairs.append(
        {
            "repair": "added_supply_from_evidence",
            "flag": "dc_fuse_supply_absent",
            "field_path": "supply_requirements",
            "added_entry": entry,
        }
    )
    out["repairs"] = repairs
    warning = _flag(
        "dc_fuse_supply_absent",
        f"repaired: added supply_requirements grounded at {evidence_path}",
        "supply_requirements",
        severity="warning",
    )
    return out, [warning]


def derived_items(profile: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    """Yield (field_path, item) for every object marked source=derived."""
    out: list[tuple[str, dict[str, Any]]] = []
    for i, item in enumerate(profile.get("operator_actions") or []):
        if isinstance(item, dict) and str(item.get("source") or "") == "derived":
            out.append((f"operator_actions[{i}]", item))
    for i, item in enumerate(profile.get("requires_devices") or []):
        if isinstance(item, dict) and str(item.get("source") or "") == "derived":
            out.append((f"requires_devices[{i}]", item))
    for key in ("supply_requirements", "protected_by", "protects"):
        for i, item in enumerate(profile.get(key) or []):
            if isinstance(item, dict) and str(item.get("source") or "") == "derived":
                out.append((f"{key}[{i}]", item))
    return out


def check_derived_grounding(profile: dict[str, Any]) -> list[dict[str, str]]:
    """Blocking flags for derived items missing a resolvable derived_from path."""
    from interaction_profile_schema import resolve_field_path

    flags: list[dict[str, str]] = []
    for field_path, item in derived_items(profile):
        derived_from = str(item.get("derived_from") or "").strip()
        if not derived_from:
            flags.append(
                _flag(
                    "derived_ungrounded",
                    "derived item missing derived_from path",
                    field_path,
                    severity="blocking",
                )
            )
            continue
        ok, _value, err = resolve_field_path(profile, derived_from)
        if not ok:
            flags.append(
                _flag(
                    "derived_ungrounded",
                    f"derived_from {derived_from!r} does not resolve "
                    f"({err or 'unknown'})",
                    field_path,
                    severity="blocking",
                )
            )
    return flags


def _unknown_fields(
    obj: Any,
    allowed: frozenset[str],
    path: str,
    flags: list[dict[str, str]],
) -> None:
    if not isinstance(obj, dict):
        return
    for key in obj:
        if key not in allowed:
            flags.append(
                _flag(
                    "unknown_field",
                    f"property {key!r} is not in the schema",
                    f"{path}.{key}" if path else key,
                    severity="blocking",
                )
            )


def apply_fewshot_leak_auto_repairs(
    profile: dict[str, Any],
    excerpts: list[dict[str, Any]] | list[str] | None,
) -> tuple[dict[str, Any], list[dict[str, str]]]:
    """Drop ungrounded calibration stock phrases from list fields (warning).

    Prevents example-L paste (``within 30cm…``) from permanently setting
    ``needs_rextraction`` when the rest of the profile is usable. Actions that
    leak are also dropped when they match attractors without grounding.

    Also drops ``networks.speaks`` / ``bridges`` whose names are absent from
    the excerpt corpus (v4.25 — Zeus MasterBus / VE.Direct founding). Skipped
    when no excerpts are provided (cannot verify grounding).
    """
    out = deepcopy(profile) if isinstance(profile, dict) else {}
    corpus = _excerpt_corpus(excerpts)
    repairs = [dict(r) for r in (out.get("repairs") or []) if isinstance(r, dict)]
    warnings: list[dict[str, str]] = []

    def _scrub_list(key: str, text_field: str) -> None:
        items = out.get(key) or []
        if not isinstance(items, list):
            return
        kept: list[Any] = []
        for i, item in enumerate(items):
            if not isinstance(item, dict):
                kept.append(item)
                continue
            if str(item.get("source") or "") == "derived":
                kept.append(item)
                continue
            phrase = str(item.get(text_field) or "")
            attractor = _matches_fewshot_attractor(phrase)
            if attractor is None or _attractor_grounded_in_corpus(attractor, corpus):
                kept.append(item)
                continue
            field_path = f"{key}[{i}].{text_field}"
            repair = {
                "repair": "dropped_entry",
                "flag": "fewshot_leakage",
                "field_path": field_path,
                "original_entry": dict(item),
                "attractor": attractor,
            }
            repairs.append(repair)
            warnings.append(
                _flag(
                    "fewshot_leakage",
                    f"repaired: dropped_entry — matched calibration attractor "
                    f"{attractor!r} without excerpt grounding "
                    f"(dropped {phrase!r})",
                    field_path,
                    severity="warning",
                )
            )
        out[key] = kept

    _scrub_list("operator_actions", "action")
    _scrub_list("requires_devices", "description_verbatim")
    for key in ("supply_requirements", "protected_by", "protects"):
        _scrub_list(key, "description_verbatim")

    # Scrub remote_panel_accessory labels that are pure K leakage.
    surfaces = out.get("control_surfaces") or []
    if isinstance(surfaces, list):
        kept_s: list[Any] = []
        for i, surface in enumerate(surfaces):
            if not isinstance(surface, dict):
                kept_s.append(surface)
                continue
            label = str(surface.get("label_verbatim") or "")
            blob = f"{surface.get('surface') or ''} {label}".strip()
            attractor = _matches_fewshot_attractor(blob) or _matches_fewshot_attractor(
                label
            )
            if attractor is None or _attractor_grounded_in_corpus(attractor, corpus):
                kept_s.append(surface)
                continue
            field_path = f"control_surfaces[{i}].label_verbatim"
            repairs.append(
                {
                    "repair": "dropped_entry",
                    "flag": "fewshot_leakage",
                    "field_path": field_path,
                    "original_entry": dict(surface),
                    "attractor": attractor,
                }
            )
            warnings.append(
                _flag(
                    "fewshot_leakage",
                    f"repaired: dropped_entry — matched calibration attractor "
                    f"{attractor!r} without excerpt grounding "
                    f"(dropped surface {label!r})",
                    field_path,
                    severity="warning",
                )
            )
        out["control_surfaces"] = kept_s
        for i, surface in enumerate(out["control_surfaces"]):
            if isinstance(surface, dict):
                surface["path"] = f"control_surfaces[{i}]"

    # Universal speak/bridge grounding (any invented bus name, not only G/H).
    if corpus:
        networks = out.get("networks") if isinstance(out.get("networks"), dict) else {}
        networks = dict(networks)
        speaks_in = networks.get("speaks") or []
        if isinstance(speaks_in, list):
            kept_speaks: list[Any] = []
            for i, speak in enumerate(speaks_in):
                if not isinstance(speak, dict):
                    kept_speaks.append(speak)
                    continue
                name = str(speak.get("name_verbatim") or "").strip()
                if not name or network_name_grounded_in_corpus(name, corpus):
                    kept_speaks.append(speak)
                    continue
                field_path = f"networks.speaks[{i}].name_verbatim"
                repairs.append(
                    {
                        "repair": "dropped_entry",
                        "flag": "fewshot_leakage",
                        "field_path": field_path,
                        "original_entry": dict(speak),
                        "attractor": name,
                    }
                )
                warnings.append(
                    _flag(
                        "fewshot_leakage",
                        f"repaired: dropped_entry — networks.speaks name "
                        f"{name!r} not grounded in excerpts",
                        field_path,
                        severity="warning",
                    )
                )
            networks["speaks"] = kept_speaks
        bridges_in = networks.get("bridges") or []
        if isinstance(bridges_in, list):
            kept_bridges: list[Any] = []
            for i, bridge in enumerate(bridges_in):
                if not isinstance(bridge, dict):
                    kept_bridges.append(bridge)
                    continue
                endpoints = [
                    str(bridge.get("from") or "").strip(),
                    str(bridge.get("to") or "").strip(),
                ]
                bad = [
                    ep
                    for ep in endpoints
                    if ep and not network_name_grounded_in_corpus(ep, corpus)
                ]
                if not bad:
                    kept_bridges.append(bridge)
                    continue
                field_path = f"networks.bridges[{i}]"
                repairs.append(
                    {
                        "repair": "dropped_entry",
                        "flag": "fewshot_leakage",
                        "field_path": field_path,
                        "original_entry": dict(bridge),
                        "attractor": ", ".join(bad),
                    }
                )
                warnings.append(
                    _flag(
                        "fewshot_leakage",
                        f"repaired: dropped_entry — networks.bridges endpoint(s) "
                        f"{bad!r} not grounded in excerpts",
                        field_path,
                        severity="warning",
                    )
                )
            networks["bridges"] = kept_bridges
        out["networks"] = networks

    out["repairs"] = repairs
    return out, warnings


def category_freeform_is_taxonomic(value: str) -> bool:
    text = (value or "").strip()
    if not text:
        return False
    compact = text.lower().replace(" ", "_")
    if compact in SYSTEM_CATEGORY_TOKENS:
        return True
    if SNAKE_CASE_RE.fullmatch(text):
        return True
    return False


def validate_interaction_profile(
    profile: dict[str, Any],
    *,
    excerpts: list[dict[str, Any]] | list[str] | None = None,
    coverage: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Annotate ``profile`` with validation_flags / needs_rextraction; return it.

    Works on raw or normalized profiles. Does not mutate nested content beyond
    adding the annotation keys at the top level. ``coverage`` (heading fraction)
    is persisted onto the profile when provided.
    """
    flags: list[dict[str, str]] = []

    if not isinstance(profile, dict):
        annotated = {
            "validation_flags": [
                _flag(
                    "unknown_field",
                    "profile must be a JSON object",
                    "",
                    severity="blocking",
                )
            ],
            "needs_rextraction": True,
        }
        return annotated

    out = dict(profile)
    # Mechanical repairs first so downstream checks see the repaired lists.
    out, repair_warnings = apply_contradiction_auto_repairs(out)
    flags.extend(repair_warnings)
    out, fewshot_warnings = apply_fewshot_leak_auto_repairs(out, excerpts)
    flags.extend(fewshot_warnings)
    out, polarity_warnings = apply_data_role_polarity_repairs(out)
    flags.extend(polarity_warnings)
    out, occasion_warnings = apply_occasion_circular_repairs(out)
    flags.extend(occasion_warnings)
    out, optional_warnings = apply_optional_surface_requires(out)
    flags.extend(optional_warnings)
    out, fuse_warnings = apply_grounded_dc_fuse_fill(out, excerpts)
    flags.extend(fuse_warnings)
    from interaction_profile_ui_pages import derive_gate_verbatim_evidence

    derive_gate_verbatim_evidence(out)
    # v4.0: OR-expand + exact-key dedupe + requirement_kind backstop.
    from interaction_profile_kinds import finalize_profile_requires

    finalize_profile_requires(out)
    flags.extend(check_derived_grounding(out))

    cov = coverage if isinstance(coverage, dict) else out.get("coverage")
    if isinstance(cov, dict):
        out["coverage"] = {
            "chunk_count": cov.get("chunk_count"),
            "heading_count": cov.get("heading_count"),
            "headings_covered_count": cov.get("headings_covered_count"),
            "heading_coverage_fraction": cov.get("heading_coverage_fraction"),
            "coverage_low_threshold": cov.get(
                "coverage_low_threshold", COVERAGE_LOW_THRESHOLD
            ),
            "top_k_used": cov.get("top_k_used"),
        }
        frac = cov.get("heading_coverage_fraction")
        threshold = float(cov.get("coverage_low_threshold", COVERAGE_LOW_THRESHOLD))
        if frac is not None and float(frac) < threshold:
            flags.append(
                _flag(
                    "coverage_low",
                    f"only {float(frac):.0%} of manual headings represented in "
                    f"routed excerpts (threshold {threshold:.0%}); "
                    f"top_k={cov.get('top_k_used')}, chunks={cov.get('chunk_count')}",
                    "coverage.heading_coverage_fraction",
                    severity="warning",
                )
            )

    _unknown_fields(
        out,
        EXTRACTED_PROFILE_KEYS
        | {
            "validation_flags",
            "needs_rextraction",
            "repairs",
            "coverage",
            "group_utilization",
            "merge_conflicts",
            "extraction_votes",
            "instability_triage",
            "entity_kind",
            "documented_version",
            "runs_platform",
            "ui_pages",
            "alarm_severity",
            "demoted_ui_pages",
            "cross_model_diff",
            "extraction_pending_review",
            "source",
            "genres",
        },
        "",
        flags,
    )

    ek = str(out.get("entity_kind") or "device").strip().lower()
    if out.get("entity_kind") is not None and ek not in ENTITY_KINDS:
        flags.append(
            _flag(
                "unknown_field",
                f"entity_kind must be one of {sorted(ENTITY_KINDS)}; got {ek!r}",
                "entity_kind",
                severity="warning",
            )
        )
    for i, edge in enumerate(out.get("runs_platform") or []):
        if isinstance(edge, dict):
            _unknown_fields(edge, RUNS_PLATFORM_KEYS, f"runs_platform[{i}]", flags)
            if not str(edge.get("platform_key") or "").strip():
                flags.append(
                    _flag(
                        "unknown_field",
                        "runs_platform entry missing platform_key",
                        f"runs_platform[{i}].platform_key",
                        severity="warning",
                    )
                )
    from interaction_profile_schema import (
        ALARM_SEVERITY_KEYS,
        UI_PAGE_ACTION_KEYS,
        UI_PAGE_GATE_KEYS,
        UI_PAGE_KEYS,
    )

    for i, page in enumerate(out.get("ui_pages") or []):
        if not isinstance(page, dict):
            continue
        _unknown_fields(page, UI_PAGE_KEYS, f"ui_pages[{i}]", flags)
        gate = page.get("appears_if_gate")
        if isinstance(gate, dict):
            _unknown_fields(gate, UI_PAGE_GATE_KEYS, f"ui_pages[{i}].appears_if_gate", flags)
        for j, act in enumerate(page.get("actions") or []):
            if isinstance(act, dict):
                _unknown_fields(
                    act, UI_PAGE_ACTION_KEYS, f"ui_pages[{i}].actions[{j}]", flags
                )
    for i, row in enumerate(out.get("alarm_severity") or []):
        if isinstance(row, dict):
            _unknown_fields(row, ALARM_SEVERITY_KEYS, f"alarm_severity[{i}]", flags)

    # merge_conflict warnings (from Stage 1 reduce)
    for i, conflict in enumerate(out.get("merge_conflicts") or []):
        if not isinstance(conflict, dict):
            continue
        flags.append(
            _flag(
                "merge_conflict",
                f"cross-group conflict on {conflict.get('kind')}."
                f"{conflict.get('attribute')} "
                f"(group={conflict.get('group_id')})",
                f"merge_conflicts[{i}]",
                severity="warning",
            )
        )

    for util in out.get("group_utilization") or []:
        if not isinstance(util, dict) or not util.get("unutilized"):
            continue
        predicted = util.get("predicted_fields") or []
        flags.append(
            _flag(
                "group_unutilized",
                f"group {util.get('group_id')!r} had "
                f"{util.get('excerpt_count')} routed excerpts but contributed "
                f"zero fields; routing predicted {predicted}",
                f"group_utilization.{util.get('group_id')}",
                severity="warning",
            )
        )

    device = out.get("device")
    if isinstance(device, dict):
        _unknown_fields(device, DEVICE_KEYS, "device", flags)
        category_ff = str(device.get("category_freeform") or "").strip()
        if category_ff and category_freeform_is_taxonomic(category_ff):
            flags.append(
                _flag(
                    "category_freeform_provenance",
                    "category_freeform must be free text from the manual, not an "
                    f"internal taxonomy token ({category_ff!r})",
                    "device.category_freeform",
                    severity="blocking",
                )
            )

    surfaces = out.get("control_surfaces") or []
    for i, surface in enumerate(surfaces):
        if isinstance(surface, dict):
            _unknown_fields(surface, CONTROL_SURFACE_KEYS, f"control_surfaces[{i}]", flags)

    for i, action in enumerate(out.get("operator_actions") or []):
        if isinstance(action, dict):
            _unknown_fields(action, OPERATOR_ACTION_KEYS, f"operator_actions[{i}]", flags)
            action_text = str(action.get("action") or "")
            if (
                ACTION_INTERFACE_RE.search(action_text)
                and not any(isinstance(s, dict) for s in surfaces)
            ):
                flags.append(
                    _flag(
                        "action_without_surface",
                        "operator action implies an interface but control_surfaces "
                        "is empty",
                        f"operator_actions[{i}].action",
                        severity="blocking",
                    )
                )

    networks = out.get("networks")
    if isinstance(networks, dict):
        _unknown_fields(networks, NETWORK_KEYS, "networks", flags)
        for i, speak in enumerate(networks.get("speaks") or []):
            if isinstance(speak, dict):
                _unknown_fields(speak, NETWORK_SPEAK_KEYS, f"networks.speaks[{i}]", flags)
        for i, bridge in enumerate(networks.get("bridges") or []):
            if isinstance(bridge, dict):
                _unknown_fields(
                    bridge, NETWORK_BRIDGE_KEYS, f"networks.bridges[{i}]", flags
                )

    data_roles = out.get("data_roles")
    if isinstance(data_roles, dict):
        _unknown_fields(data_roles, DATA_ROLE_KEYS, "data_roles", flags)

    speaks = (networks.get("speaks") if isinstance(networks, dict) else []) or []
    if (
        isinstance(speaks, list)
        and any(
            isinstance(s, dict) and str(s.get("name_verbatim") or "").strip()
            for s in speaks
        )
        and isinstance(data_roles, dict)
        and not any(bool(data_roles.get(k)) for k in DATA_ROLE_KEYS)
    ):
        flags.append(
            _flag(
                "speaks_but_inert",
                "networks.speaks is non-empty while all data_roles are false",
                "data_roles",
                severity="blocking",
            )
        )

    safety = out.get("safety_role")
    if isinstance(safety, dict):
        _unknown_fields(safety, SAFETY_ROLE_KEYS, "safety_role", flags)

    for key in ("protected_by", "protects", "supply_requirements"):
        for i, item in enumerate(out.get(key) or []):
            if isinstance(item, dict):
                _unknown_fields(item, DESC_ITEM_KEYS, f"{key}[{i}]", flags)

    confidence = out.get("confidence")
    if isinstance(confidence, dict):
        _unknown_fields(confidence, CONFIDENCE_KEYS, "confidence", flags)

    # --- requires_devices: dangling only (builtin contradiction auto-repaired) ---
    for i, req in enumerate(out.get("requires_devices") or []):
        if not isinstance(req, dict):
            continue
        _unknown_fields(req, REQUIRES_DEVICE_KEYS, f"requires_devices[{i}]", flags)
        needed_for = str(req.get("needed_for") or "").strip()
        path = f"requires_devices[{i}].needed_for"
        if not needed_for:
            flags.append(
                _flag(
                    "dangling_needed_for",
                    "needed_for is empty; must be a profile field path",
                    path,
                    severity="blocking",
                )
            )
            continue
        ok, value, err = resolve_field_path(out, needed_for)
        if not ok:
            flags.append(
                _flag(
                    "dangling_needed_for",
                    err or "needed_for does not resolve",
                    path,
                    severity="blocking",
                )
            )
            continue
        _ = value

    # --- few-shot leakage (calibration example phrases) ---
    corpus = _excerpt_corpus(excerpts)
    for field_path, phrase in _fewshot_candidate_phrases(out):
        attractor = _matches_fewshot_attractor(phrase)
        if attractor is None:
            continue
        if _attractor_grounded_in_corpus(attractor, corpus):
            continue
        flags.append(
            _flag(
                "fewshot_leakage",
                f"profile text matches calibration attractor {attractor!r} "
                "without grounding in provided excerpts",
                field_path,
                severity="blocking",
            )
        )

    # --- evidence coverage for priority fields ---
    for path in missing_priority_evidence_paths(out):
        flags.append(
            _flag(
                "evidence_incomplete",
                f"no evidence entry supports {path}",
                path,
                severity="blocking",
            )
        )

    # --- evidence hygiene ---
    for i, item in enumerate(out.get("evidence") or []):
        epath = f"evidence[{i}]"
        if isinstance(item, str):
            flags.append(
                _flag(
                    "evidence_shape_invalid",
                    "evidence entry must be an object "
                    "{supports_field, manual_section, note}",
                    epath,
                    severity="blocking",
                )
            )
            # Full-sentence string dumps: flag verbatim when long enough.
            if _note_eligible_for_similarity(item):
                flagged_verbatim = False
                for excerpt in corpus:
                    tok = _token_overlap_ratio(item, excerpt)
                    lcs = _lcs_ratio(item, excerpt)
                    if (
                        tok >= EVIDENCE_VERBATIM_TOKEN_RATIO
                        or lcs >= EVIDENCE_VERBATIM_LCS_RATIO
                    ):
                        flags.append(
                            _flag(
                                "evidence_verbatim",
                                f"evidence string too similar to source excerpt "
                                f"(token_overlap={tok:.2f}, lcs_ratio={lcs:.2f})",
                                epath,
                                severity="warning",
                            )
                        )
                        flagged_verbatim = True
                        break
                if not flagged_verbatim and len(_tokens(item)) > EVIDENCE_NOTE_MAX_WORDS:
                    flags.append(
                        _flag(
                            "evidence_verbatim",
                            f"evidence string has {len(_tokens(item))} words "
                            f"(max {EVIDENCE_NOTE_MAX_WORDS} for a paraphrase)",
                            epath,
                            severity="warning",
                        )
                    )
            continue
        if not isinstance(item, dict):
            flags.append(
                _flag(
                    "evidence_shape_invalid",
                    "evidence entry must be an object "
                    "{supports_field, manual_section, note}",
                    epath,
                    severity="blocking",
                )
            )
            continue
        _unknown_fields(item, EVIDENCE_KEYS, epath, flags)
        missing = [k for k in ("supports_field", "manual_section", "note") if k not in item]
        if missing:
            flags.append(
                _flag(
                    "evidence_shape_invalid",
                    f"missing keys: {', '.join(missing)}",
                    epath,
                    severity="blocking",
                )
            )
            continue
        supports = str(item.get("supports_field") or "").strip()
        section = str(item.get("manual_section") or "").strip()
        note = str(item.get("note") or "").strip()
        if not supports or not section or not note:
            flags.append(
                _flag(
                    "evidence_shape_invalid",
                    "supports_field, manual_section, and note must be non-empty",
                    epath,
                    severity="blocking",
                )
            )
            continue
        # manual_section is expected to be a verbatim title/heading — never
        # run similarity against excerpts for it; reject sentence dumps / crumbs.
        if not manual_section_is_heading(section):
            flags.append(
                _flag(
                    "evidence_heading_invalid",
                    "manual_section must be a short heading/title "
                    "(not a sentence or letter-fragment)",
                    f"{epath}.manual_section",
                    severity="blocking",
                )
            )
        note_words = _tokens(note)
        if len(note_words) > EVIDENCE_NOTE_MAX_WORDS:
            flags.append(
                _flag(
                    "evidence_verbatim",
                    f"note has {len(note_words)} words (max {EVIDENCE_NOTE_MAX_WORDS} "
                    "for a paraphrase)",
                    f"{epath}.note",
                    severity="warning",
                )
            )
        if _note_eligible_for_similarity(note):
            for excerpt in corpus:
                tok = _token_overlap_ratio(note, excerpt)
                lcs = _lcs_ratio(note, excerpt)
                if tok >= EVIDENCE_VERBATIM_TOKEN_RATIO or lcs >= EVIDENCE_VERBATIM_LCS_RATIO:
                    flags.append(
                        _flag(
                            "evidence_verbatim",
                            f"note too similar to source excerpt "
                            f"(token_overlap={tok:.2f}, lcs_ratio={lcs:.2f})",
                            f"{epath}.note",
                            severity="warning",
                        )
                    )
                    break

    flags.extend(check_evidence_support_mismatch(out))
    flags.extend(check_data_role_direction_mismatch(out))

    # Genre multi-select + config_defined_operation / genre_content_mismatch.
    out["validation_flags"] = flags
    from interaction_profile_genre import annotate_profile_genres

    out = annotate_profile_genres(out)
    flags = [
        f for f in (out.get("validation_flags") or []) if isinstance(f, dict)
    ]

    # Deduplicate flags (same flag+path+detail).
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for item in flags:
        key = (
            f"{item.get('flag')}|{item.get('field_path')}|{item.get('detail')}"
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)

    out["validation_flags"] = unique
    out["needs_rextraction"] = any(
        str(f.get("severity") or "") == "blocking"
        and str(f.get("flag") or "") in BLOCKING_FLAGS
        for f in unique
    )
    return out


def validation_flag_names(profile: dict[str, Any]) -> set[str]:
    return {
        str(f.get("flag"))
        for f in (profile.get("validation_flags") or [])
        if isinstance(f, dict)
    }
