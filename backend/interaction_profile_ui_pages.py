"""Expand platform ``ui_pages`` into Stage 2 control_surfaces / requires / actions.

Platform extracts emit ``ui_pages[]`` (name, purpose, appears_if_gate, in-page
actions). Stage 2 conditionality still keys off ``control_surfaces`` +
``requires_devices``; this helper materializes those fields from ui_pages when
present (without inventing pages).
"""

from __future__ import annotations

from typing import Any


UI_PAGE_KEYS = frozenset(
    {
        "name",
        "purpose",
        "appears_if_gate",
        "actions",
    }
)

UI_PAGE_GATE_KEYS = frozenset(
    {
        "verbatim",
        "description_verbatim",
        "functional_class",
    }
)

UI_PAGE_ACTION_KEYS = frozenset(
    {
        "action",
        "audience",
        "context",
    }
)

ALARM_SEVERITY_KEYS = frozenset(
    {
        "level_verbatim",
        "color_verbatim",
    }
)


def _gate_description(gate: dict[str, Any]) -> str:
    desc = str(gate.get("description_verbatim") or "").strip()
    if desc:
        return desc
    verbatim = str(gate.get("verbatim") or "").strip()
    # Prefer the noun phrase after "if " when present.
    lower = verbatim.lower()
    if " if " in lower:
        tail = verbatim[lower.index(" if ") + 4 :].strip()
        tail = tail.rstrip(".")
        # Drop leading articles / "a supported"
        return tail
    return verbatim


def expand_ui_pages(profile: dict[str, Any]) -> dict[str, Any]:
    """If ``ui_pages`` is non-empty, rebuild Stage 2 surface/require/action rows.

    Existing non-page operator_actions (alarms acknowledge, menu tap, etc.) are
    preserved and page actions are appended (deduped by action text).
    """
    pages = [p for p in (profile.get("ui_pages") or []) if isinstance(p, dict)]
    if not pages:
        return profile

    surfaces: list[dict[str, Any]] = []
    requires: list[dict[str, Any]] = [
        dict(r)
        for r in (profile.get("requires_devices") or [])
        if isinstance(r, dict)
        and not str(r.get("needed_for") or "").startswith("control_surfaces[")
        and not str(r.get("needed_for") or "").startswith("ui_pages[")
    ]
    actions: list[dict[str, Any]] = []
    seen_actions: set[str] = set()

    for a in profile.get("operator_actions") or []:
        if not isinstance(a, dict):
            continue
        key = str(a.get("action") or "").strip().lower()
        if not key or key in seen_actions:
            continue
        seen_actions.add(key)
        actions.append(dict(a))

    for i, page in enumerate(pages):
        name = str(page.get("name") or "").strip()
        if not name:
            continue
        path = f"control_surfaces[{i}]"
        gate = page.get("appears_if_gate")
        gated = isinstance(gate, dict) and bool(
            str(gate.get("verbatim") or "").strip()
            or str(gate.get("description_verbatim") or "").strip()
        )
        surfaces.append(
            {
                "surface": "touchscreen",
                "location_class": "on_device",
                "optional_accessory": gated,
                "label_verbatim": name,
                "path": path,
            }
        )
        if gated and isinstance(gate, dict):
            desc = _gate_description(gate)
            req: dict[str, Any] = {
                "description_verbatim": desc,
                "needed_for": path,
                "requirement_kind": "device",
                "source": "extracted",
            }
            fc = str(gate.get("functional_class") or "").strip()
            if fc:
                req["functional_class"] = fc
            if str(gate.get("verbatim") or "").strip():
                req["gate_verbatim"] = str(gate.get("verbatim") or "").strip()
            requires.append(req)

        for act in page.get("actions") or []:
            if not isinstance(act, dict):
                continue
            text = str(act.get("action") or "").strip()
            if not text:
                continue
            key = text.lower()
            if key in seen_actions:
                continue
            seen_actions.add(key)
            actions.append(
                {
                    "action": text,
                    "audience": str(act.get("audience") or "operator").strip()
                    or "operator",
                    "context": str(act.get("context") or "daily").strip() or "daily",
                    "source": "extracted",
                }
            )

    profile["control_surfaces"] = surfaces
    profile["requires_devices"] = requires
    profile["operator_actions"] = actions
    return profile


# Intro tile inventory for CZone 2.0 Quick Start (V1.1) — completeness check.
CZONE_2_0_INTRO_PAGE_TILES = (
    "Favourites",
    "Modes",
    "Control",
    "Monitoring",
    "Alarms",
    "AC Mains",
    "Inverter/Charger",
    "Climate",
)


def inventory_ui_pages_completeness(
    profile: dict[str, Any],
    *,
    expected_tiles: tuple[str, ...] | list[str] = CZONE_2_0_INTRO_PAGE_TILES,
    require_actions: bool = True,
    min_actions_by_page: dict[str, int] | None = None,
) -> dict[str, Any]:
    """Compare extracted ui_pages names against intro page-tile inventory.

    When ``require_actions`` is set, documented pages must carry in-page
    actions (Climate CONTROLS founding: >=9). Override per page via
    ``min_actions_by_page``.
    """
    pages = [p for p in (profile.get("ui_pages") or []) if isinstance(p, dict)]
    got = [str(p.get("name") or "").strip() for p in pages if str(p.get("name") or "").strip()]
    got_norm = {g.lower().replace(" ", "") for g in got}
    by_name = {
        str(p.get("name") or "").strip().lower().replace(" ", ""): p for p in pages
    }

    def _norm(t: str) -> str:
        return t.lower().replace(" ", "").replace("-", "/")

    missing = [t for t in expected_tiles if _norm(t) not in got_norm]
    still_missing: list[str] = []
    for t in missing:
        alts = {_norm(t), _norm(t.replace("/", " ")), _norm(t.replace("/", ""))}
        if not (alts & got_norm):
            stem = _norm(t).split("/")[0][:8]
            if not any(g.startswith(stem) or stem in g for g in got_norm):
                still_missing.append(t)

    extra = [
        g
        for g in got
        if not any(
            _norm(g) == _norm(t)
            or _norm(g).replace("/", "") == _norm(t).replace("/", "")
            for t in expected_tiles
        )
    ]

    mins = {
        "climate": 9,
        "favourites": 1,
        "modes": 1,
        "alarms": 1,
        **{k.lower().replace(" ", ""): v for k, v in (min_actions_by_page or {}).items()},
    }
    empty_actions: list[str] = []
    thin_actions: list[dict[str, Any]] = []
    if require_actions:
        for name in expected_tiles:
            key = _norm(name).replace("/", "")
            page = by_name.get(key) or by_name.get(_norm(name))
            if page is None:
                # try fuzzy
                page = next(
                    (
                        p
                        for k, p in by_name.items()
                        if key[:6] in k or k.startswith(key[:6])
                    ),
                    None,
                )
            if page is None:
                continue
            n_act = len(
                [
                    a
                    for a in (page.get("actions") or [])
                    if isinstance(a, dict) and str(a.get("action") or "").strip()
                ]
            )
            need = mins.get(key, mins.get(name.lower().replace(" ", ""), 0))
            # Always-on pages: require at least 1 when documented with controls;
            # Climate founding requires 9 (CLIMATE CONTROLS numbered list).
            if key == "climate" or name.lower() == "climate":
                need = max(need, 9)
            elif need == 0 and name.lower() in {
                "favourites",
                "modes",
                "control",
                "monitoring",
                "alarms",
            }:
                need = 1
            if need and n_act == 0:
                empty_actions.append(str(page.get("name") or name))
            elif need and n_act < need:
                thin_actions.append(
                    {
                        "name": str(page.get("name") or name),
                        "got": n_act,
                        "min": need,
                    }
                )

    complete = not still_missing and not empty_actions and not thin_actions
    return {
        "expected": list(expected_tiles),
        "extracted": got,
        "missing": still_missing,
        "extra": extra,
        "empty_actions": empty_actions,
        "thin_actions": thin_actions,
        "complete": complete,
        "count": len(got),
    }
