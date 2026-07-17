"""Manual / profile genre multi-select + content mismatch checks.

Genres describe what the *source document* covers (multi-select). They are
distinct from Stage 2 roles and Stage 3 content tiers.

Founding fixture: CZone Touch 7 — install/commission genres with
``config_defined_operation`` (operational UI exists but is not documented;
behavior lives in the CZone config file / owner walkthrough).
"""

from __future__ import annotations

import re
from typing import Any

# Atomic genres + shorthand ``combined`` (install + operate + … in one manual).
GENRE_VALUES = frozenset(
    {
        "installation",
        "commissioning",
        "operation",
        "monitoring",
        "maintenance",
        "reference",
        "combined",
    }
)

# Genres that claim documented day-to-day / monitoring operator content.
_OPERATOR_FACING_GENRES = frozenset({"operation", "monitoring", "combined"})

# Genres that claim install / first-setup / config-tool content.
_SETUP_GENRES = frozenset({"installation", "commissioning", "combined"})

# Operator-audience actions that are still first-setup / power-on (not day-to-day).
_SETUPISH_ACTION_RE = re.compile(
    r"(?i)\b("
    r"calibrat|dip\s*switch|dipswitch|mounting bracket|wifi\s*mode|"
    r"circuit breaker|supplying power|first\s*start|initial\s*power"
    r")\b"
)


def normalize_genres(raw: Any) -> list[str]:
    """Return sorted unique valid genre tokens; drop unknowns."""
    if raw is None:
        return []
    items: list[Any]
    if isinstance(raw, str):
        items = [raw]
    elif isinstance(raw, list):
        items = list(raw)
    else:
        return []
    out: list[str] = []
    seen: set[str] = set()
    for item in items:
        g = str(item or "").strip().lower()
        if g == "operator":
            g = "operation"
        if g in GENRE_VALUES and g not in seen:
            seen.add(g)
            out.append(g)
    return sorted(out)


def _operator_actions(profile: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        a
        for a in (profile.get("operator_actions") or [])
        if isinstance(a, dict) and str(a.get("action") or "").strip()
    ]


def _has_documented_operation(profile: dict[str, Any]) -> bool:
    """True when the extract contains non-setup operator-facing actions."""
    for a in _operator_actions(profile):
        audience = str(a.get("audience") or "")
        context = str(a.get("context") or "")
        action = str(a.get("action") or "")
        if audience not in {"operator", "either"}:
            continue
        if _SETUPISH_ACTION_RE.search(action):
            continue
        if context in {"daily", "situational", "emergency"}:
            return True
        if context == "maintenance" and audience == "operator":
            return True
    return False


def _has_setup_content(profile: dict[str, Any]) -> bool:
    for a in _operator_actions(profile):
        audience = str(a.get("audience") or "")
        context = str(a.get("context") or "")
        if audience == "installer_or_technician":
            return True
        if context in {"commissioning", "installation"}:
            return True
    return False


def _has_station_ui(profile: dict[str, Any]) -> bool:
    return any(
        isinstance(s, dict)
        and s.get("surface") in {"touchscreen", "web_interface"}
        for s in (profile.get("control_surfaces") or [])
    )


def derive_genres_hint(profile: dict[str, Any]) -> list[str]:
    """Deterministic genre hint from content (does not overwrite declared)."""
    hints: list[str] = []
    if _has_setup_content(profile):
        if any(
            str(a.get("context") or "") == "commissioning"
            or str(a.get("audience") or "") == "installer_or_technician"
            for a in _operator_actions(profile)
        ):
            hints.append("commissioning")
        hints.append("installation")
    if _has_documented_operation(profile):
        hints.append("operation")
    if hints and "operation" in hints and (
        "installation" in hints or "commissioning" in hints
    ):
        hints.append("combined")
    return normalize_genres(hints)


def annotate_profile_genres(profile: dict[str, Any]) -> dict[str, Any]:
    """Normalize ``genres``; derive hint when empty; emit mismatch / config flags.

    ``config_defined_operation`` replaces the earlier planned
    ``profile_genre_incomplete`` name: station UI exists but documented
    actions are setup-only (operation lives in config / walkthrough).
    """
    out = dict(profile)
    declared = normalize_genres(out.get("genres"))
    hinted = derive_genres_hint(out)
    if not declared and hinted:
        declared = [g for g in hinted if g != "combined"] or hinted
    out["genres"] = declared

    flags = [
        dict(f) for f in (out.get("validation_flags") or []) if isinstance(f, dict)
    ]
    # Drop retired flag name if present.
    flags = [f for f in flags if f.get("flag") != "profile_genre_incomplete"]
    # genre_hint is compute-only — do not persist (avoids unknown_field).
    out.pop("genre_hint", None)

    has_ops = _has_documented_operation(out)
    has_setup = _has_setup_content(out)
    station = _has_station_ui(out)
    claims_ops = bool(set(declared) & _OPERATOR_FACING_GENRES)
    claims_setup = bool(set(declared) & _SETUP_GENRES)

    def _has(name: str) -> bool:
        return any(f.get("flag") == name for f in flags)

    # genre_content_mismatch: declared genre disagrees with observed content.
    if claims_ops and not has_ops and not _has("config_defined_operation"):
        # Claiming operation without documented ops — mismatch unless already
        # marked config-defined (Touch 7 closes via explicit flag + vessel facts).
        if not _has("genre_content_mismatch"):
            flags.append(
                {
                    "flag": "genre_content_mismatch",
                    "detail": (
                        f"genres={declared} claim operator-facing content but "
                        "extract has no daily/situational/emergency operator actions"
                    ),
                }
            )
    if has_ops and declared and not claims_ops and "combined" not in declared:
        if not _has("genre_content_mismatch"):
            flags.append(
                {
                    "flag": "genre_content_mismatch",
                    "detail": (
                        f"genres={declared} omit operation/monitoring/combined but "
                        "extract has operator-facing actions"
                    ),
                }
            )
    if claims_setup and not has_setup and not has_ops:
        # Empty install claim with no actions at all — soft mismatch
        if not _operator_actions(out) and not _has("genre_content_mismatch"):
            flags.append(
                {
                    "flag": "genre_content_mismatch",
                    "detail": f"genres={declared} claim setup content but no actions extracted",
                }
            )

    # config_defined_operation: station UI + setup-only docs (founding: Touch 7).
    if station and has_setup and not has_ops:
        if not _has("config_defined_operation"):
            flags.append(
                {
                    "flag": "config_defined_operation",
                    "detail": (
                        "Station UI present; manual documents first-setup only — "
                        "day-to-day operation is config-defined (device_configuration "
                        "or owner screen-walkthrough), not device divergence"
                    ),
                }
            )
        # Prefer setup genres when auto-flagging.
        if not declared:
            out["genres"] = ["installation", "commissioning"]
        # Config-defined closes genre mismatch for setup-only station manuals.
        flags = [f for f in flags if f.get("flag") != "genre_content_mismatch"]

    out["validation_flags"] = flags
    return out


def expect_combined_genre(profile: dict[str, Any]) -> bool:
    """True when genres include ``combined`` or both setup + operation atoms."""
    g = set(normalize_genres(profile.get("genres")))
    if "combined" in g:
        return True
    return bool(g & {"installation", "commissioning"}) and bool(
        g & {"operation", "monitoring"}
    )
