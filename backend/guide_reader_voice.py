"""Global guide reader-voice style — shared across all module surfaces.

Strong style guidance (not hard bans), except:

- Composition that *requires* a recorded vessel display name still hard-fails
  when the name is missing (``VesselNameMissing``). That is a data requirement,
  not style.

Style preferences
-----------------
- Establish the boat early by recorded display name.
- After that, prefer direct references to the system, screen, equipment, or
  configuration (“the …”) — or omit any vessel reference.
- Use “she” / “her” only when the boat itself is meaningfully the actor or
  owner and the pronoun improves clarity — not as a default substitute for
  “the” or the name.
- Prefer the above over deictics: “this vessel”, “this boat”, “this yacht”,
  bare “the vessel” used as a name substitute.
- Repeat the vessel name only for disambiguation or deliberate reorientation.
- Cross-section pointers are reader navigation (“… in the X section of this
  guide”), not author/structure notes (“lives in”, “home procedures”,
  “stay in”). Emit structured ``links`` with catalog ``target_id`` for
  eventual in-app navigation.

Detectors emit ``style_warnings`` for review. They do not flip Stage 4
``pass`` or block ``generate_module`` by default.
"""

from __future__ import annotations

import re
from typing import Any

from guide_module_catalog import SYSTEM_CATALOG, SYSTEM_IDS

# ---------------------------------------------------------------------------
# Hard data requirement (not style)
# ---------------------------------------------------------------------------


class VesselNameMissing(ValueError):
    """Raised when composition needs vessel_display_name and it is absent."""


def resolve_vessel_display_name(equipment_doc: dict[str, Any]) -> str:
    """Return recorded display name or raise — never invent."""
    for key in ("vessel_display_name", "vessel_name", "display_name"):
        val = str(equipment_doc.get(key) or "").strip()
        if val and val.lower() not in {"outremer_55n60", "outremer_example"}:
            # Reject fixture keys mistaken for names.
            if re.fullmatch(r"[a-z0-9_]+", val) and "_" in val:
                continue
            return val
    raise VesselNameMissing(
        "vessel_display_name is not recorded on the vessel fixture "
        f"(key={equipment_doc.get('vessel')!r}). Supply the boat's name; "
        "do not invent one."
    )


# ---------------------------------------------------------------------------
# Style detectors (warnings only)
# ---------------------------------------------------------------------------

# Prefer name/she over these deictics when referring to the specific boat.
_DEICTIC_RES = (
    re.compile(r"\bthis vessel\b", re.I),
    re.compile(r"\bthis boat\b", re.I),
    re.compile(r"\bthis yacht\b", re.I),
    # Bare "the vessel" as name substitute — not "the vessel's batteries" etc.
    # Match "the vessel" not followed by possessive 's / ’s immediately used as
    # a noun phrase head that is clearly not the boat name substitute… Keep
    # simple: flag "the vessel" when not possessive.
    re.compile(r"\bthe vessel\b(?!\s*'s)(?!\s*’s)", re.I),
)

# Soft budget: after first establish, more than this many name hits is noisy.
DEFAULT_NAME_REPEAT_SOFT_MAX = 3

# Author/structure phrasing that should not appear in guest-facing prose.
_AUTHORIAL_XREF_RES = (
    (re.compile(r"\blives in\b", re.I), "lives in"),
    (re.compile(r"\bstay(?:s)? in\b", re.I), "stay(s) in"),
    (re.compile(r"\bhome procedures?\b", re.I), "home procedure(s)"),
    (re.compile(r"\bhomes? in\b", re.I), "home(s) in"),
    (re.compile(r"\bbelongs in\b", re.I), "belongs in"),
    (re.compile(r"\bdeferred to\b", re.I), "deferred to"),
    (re.compile(r"\bwill be filled in when\b", re.I), "will be filled in when"),
    (re.compile(r"\bwhen that source is attached\b", re.I), "when that source is attached"),
    # Chapter/structure framing as opening context (v4.33) — vessel name is
    # the orientation signal; do not also announce "this chapter covers…".
    # Keep reader xrefs: "… section of this guide" / "notes that accompany
    # this chapter" are navigation, not opening meta.
    (re.compile(r"\bthis chapter covers\b", re.I), "this chapter covers"),
    (re.compile(r"\bfocus of this chapter\b", re.I), "focus of this chapter"),
    (re.compile(r"\bthis chapter is about\b", re.I), "this chapter is about"),
)

# Vessel-place words that must not be inferred from control_surfaces.location_class.
# ``on_device`` means the control lives on the equipment body — never "on deck".
_VESSEL_PLACE_FROM_SURFACE_RES = (
    (re.compile(r"\bon[- ]deck\b", re.I), "on-deck / on deck"),
)

_MINOR_WORDS = frozenset({"and", "or", "of", "the", "a", "an", "to", "for", "in"})

READER_VOICE_STYLE_GUIDANCE = """\
Reader voice (all guest-facing guide modules):
- Establish the boat once by recorded display name.
- After that, prefer direct system/equipment/screen references using "the", or omit any vessel reference.
- Use "she"/"her" only when the boat itself is meaningfully the actor or owner and the pronoun helps clarity — not as decoration or a default substitute for "the".
- Prefer the above over deictics such as "this vessel", "this boat", "this yacht", or bare "the vessel".
- Repeat the vessel name only for disambiguation or a deliberate reorientation.
- Cross-section pointers: write as reader navigation — "can be found in the <Section> section of this guide" — never author/structure notes such as "lives in", "stay in", or "home procedures".
- Open by establishing the boat (recorded display name) with a direct system fact — not "this chapter covers…" / "focus of this chapter" (guide structure is already signaled by the section title).
- Pair each cross-section pointer with a structured link (target_kind=system, target_id=catalog key); do not encode app routes in prose.
- These are strong style preferences for authors and models — not hard publish blocks.
"""


def guest_section_title(system_id: str) -> str:
    """Published section title for guest prose (not raw review_title casing)."""
    entry = SYSTEM_CATALOG.get(system_id) or {}
    explicit = str(entry.get("guest_section_title") or "").strip()
    if explicit:
        return explicit
    review = str(entry.get("review_title") or system_id).strip()
    parts: list[str] = []
    for i, word in enumerate(review.split()):
        if word == "&":
            parts.append("&")
        elif i > 0 and word.lower() in _MINOR_WORDS:
            parts.append(word.lower())
        else:
            parts.append(word[:1].upper() + word[1:] if word else word)
    return " ".join(parts)


def format_section_xref(system_id: str) -> dict[str, str]:
    """Reader phrase + structured link target for a Know system module.

    ``target_id`` matches ``SystemModule.id`` / ``SYSTEM_IDS`` so publish/render
    can resolve to in-app navigation (e.g. Know ``?system=<id>``) without
    baking routes into Stage 4 prose.
    """
    if system_id not in SYSTEM_IDS and system_id not in SYSTEM_CATALOG:
        raise ValueError(f"unknown guide system id for xref: {system_id!r}")
    title = guest_section_title(system_id)
    label = f"{title} section of this guide"
    return {
        "target_kind": "system",
        "target_id": system_id,
        "section_title": title,
        "label": label,
        "phrase": f"the {label}",
        "data_guide_link": f"system:{system_id}",
    }


def section_xref_link(system_id: str) -> dict[str, str]:
    """Compact link object for provenance / publish (no phrase fields)."""
    xref = format_section_xref(system_id)
    return {
        "target_kind": xref["target_kind"],
        "target_id": xref["target_id"],
        "label": xref["label"],
        "data_guide_link": xref["data_guide_link"],
    }


def lint_vessel_deictics(text: str) -> list[dict[str, str]]:
    """Return style warnings for boat deictics (does not fail evaluation)."""
    warnings: list[dict[str, str]] = []
    seen: set[str] = set()
    for pat in _DEICTIC_RES:
        for m in pat.finditer(text or ""):
            hit = m.group(0)
            key = hit.lower()
            if key in seen:
                continue
            seen.add(key)
            warnings.append(
                {
                    "code": "deictic_boat_reference",
                    "match": hit,
                    "guidance": (
                        "Prefer a direct system/equipment reference or omit "
                        "the vessel reference. Use the recorded name or "
                        "she/her only when needed for orientation or clarity."
                    ),
                }
            )
    return warnings


def lint_authorial_xref_voice(text: str) -> list[dict[str, str]]:
    """Warn on author/structure phrasing in guest-facing cross-refs / gaps."""
    warnings: list[dict[str, str]] = []
    seen: set[str] = set()
    for pat, label in _AUTHORIAL_XREF_RES:
        for m in pat.finditer(text or ""):
            hit = m.group(0)
            key = hit.lower()
            if key in seen:
                continue
            seen.add(key)
            warnings.append(
                {
                    "code": "authorial_xref_voice",
                    "match": hit,
                    "pattern": label,
                    "guidance": (
                        "Write as a finished guide for the guest. Prefer "
                        "'can be found in the <Section> section of this guide' "
                        "with a structured system target_id — not 'lives in', "
                        "'stay in', or 'home procedures'."
                    ),
                }
            )
    return warnings


def lint_vessel_place_from_surface(text: str) -> list[dict[str, str]]:
    """Warn when guest prose uses vessel-place words that often leak from
    ``location_class: on_device`` (control on the device ≠ place on the boat).

    Vessel places belong only when a vessel location fact is cited
    (``device_locations``, installation note, owner confirmation). Until then,
    say ``local`` / omit place.
    """
    warnings: list[dict[str, str]] = []
    seen: set[str] = set()
    for pat, label in _VESSEL_PLACE_FROM_SURFACE_RES:
        for m in pat.finditer(text or ""):
            hit = m.group(0)
            key = hit.lower()
            if key in seen:
                continue
            seen.add(key)
            warnings.append(
                {
                    "code": "vessel_place_from_surface",
                    "match": hit,
                    "pattern": label,
                    "guidance": (
                        "Do not render control_surfaces.location_class "
                        "'on_device' as a vessel place (on-deck, locker, panel). "
                        "Use 'local' until a vessel location fact is sourced."
                    ),
                }
            )
    return warnings


def count_vessel_name_mentions(text: str, vessel_display_name: str) -> int:
    name = (vessel_display_name or "").strip()
    if not name:
        return 0
    return len(re.findall(re.escape(name), text or "", flags=re.I))


def lint_vessel_name_budget(
    text: str,
    vessel_display_name: str,
    *,
    soft_max: int = DEFAULT_NAME_REPEAT_SOFT_MAX,
) -> list[dict[str, str]]:
    """Warn when the display name is repeated more than soft_max times."""
    n = count_vessel_name_mentions(text, vessel_display_name)
    if n <= soft_max:
        return []
    return [
        {
            "code": "vessel_name_repeated",
            "match": vessel_display_name,
            "count": str(n),
            "soft_max": str(soft_max),
            "guidance": (
                "After establishing the boat by name, prefer direct "
                "system/equipment references or bare facts; repeat the name "
                "only for disambiguation or reorientation."
            ),
        }
    ]


def vessel_established(text: str, vessel_display_name: str) -> bool:
    """True when the recorded display name appears at least once."""
    name = (vessel_display_name or "").strip()
    if not name:
        return False
    return bool(re.search(re.escape(name), text or "", flags=re.I))


def assess_reader_voice_style(
    text: str,
    *,
    vessel_display_name: str = "",
    name_soft_max: int = DEFAULT_NAME_REPEAT_SOFT_MAX,
) -> dict[str, Any]:
    """Aggregate style assessment for any guide prose blob.

    ``established`` is a hard expectation for Stage 4 composers (name must
    appear). Deictics, name budget, and authorial xref voice are warnings only.
    """
    warnings = (
        lint_vessel_deictics(text)
        + lint_vessel_name_budget(
            text, vessel_display_name, soft_max=name_soft_max
        )
        + lint_authorial_xref_voice(text)
        + lint_vessel_place_from_surface(text)
    )
    return {
        "established": vessel_established(text, vessel_display_name),
        "name_mentions": count_vessel_name_mentions(text, vessel_display_name),
        "style_warnings": warnings,
        "guidance": READER_VOICE_STYLE_GUIDANCE.strip(),
    }


def collect_prose_strings(payload: Any) -> list[str]:
    """Walk common guide module shapes and collect guest-facing text fields."""
    out: list[str] = []

    def _walk(obj: Any) -> None:
        if isinstance(obj, str):
            return
        if isinstance(obj, list):
            for item in obj:
                _walk(item)
            return
        if not isinstance(obj, dict):
            return
        for key in ("c", "summary", "subtitle", "title", "text", "body"):
            val = obj.get(key)
            if isinstance(val, str) and val.strip():
                out.append(val)
        steps = obj.get("steps")
        if isinstance(steps, list):
            for step in steps:
                if isinstance(step, str) and step.strip():
                    out.append(step)
                elif isinstance(step, dict):
                    _walk(step)
        items = obj.get("items")
        if isinstance(items, list):
            for item in items:
                if isinstance(item, str) and item.strip():
                    out.append(item)
                elif isinstance(item, dict):
                    _walk(item)
        for key in ("sections", "groups", "learnChecks"):
            child = obj.get(key)
            if isinstance(child, (list, dict)):
                _walk(child)
        # Fix cards are a top-level list; also walk nested dict values lightly.
        for key, val in obj.items():
            if key in {
                "c",
                "summary",
                "subtitle",
                "title",
                "text",
                "body",
                "steps",
                "items",
                "sections",
                "groups",
                "learnChecks",
            }:
                continue
            if isinstance(val, (list, dict)) and key in {
                "fixes",
                "cards",
            }:
                _walk(val)

    _walk(payload)
    return out


def assess_module_reader_voice(
    payload: Any,
    *,
    vessel_display_name: str = "",
    name_soft_max: int = DEFAULT_NAME_REPEAT_SOFT_MAX,
) -> dict[str, Any]:
    """Style assessment over a full guide module payload (report-only)."""
    blobs = collect_prose_strings(payload)
    joined = "\n\n".join(blobs)
    result = assess_reader_voice_style(
        joined,
        vessel_display_name=vessel_display_name,
        name_soft_max=name_soft_max,
    )
    result["prose_field_count"] = len(blobs)
    return result
