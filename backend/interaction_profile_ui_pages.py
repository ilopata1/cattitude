"""Expand platform ``ui_pages`` into Stage 2 control_surfaces / requires / actions.

Platform extracts emit ``ui_pages[]`` (name, purpose, appears_if_gate, in-page
actions). Stage 2 conditionality still keys off ``control_surfaces`` +
``requires_devices`` for platforms; this helper materializes those fields from
ui_pages when present (without inventing pages).

Devices (MFDs etc.): one physical screen = one ``control_surfaces`` row.
Named menus/panels/tabs stay on ``ui_pages``; empty settings-section pages are
demotion candidates (dropped from ``ui_pages``, listed on
``demoted_ui_pages``).
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
        "occasion",
        "source",
    }
)

ALARM_SEVERITY_KEYS = frozenset(
    {
        "level_verbatim",
        "color_verbatim",
    }
)

# Settings / setup style pages with zero in-page actions → demotion candidates.
_SETTINGS_PAGE_TOKENS = frozenset(
    {
        "general",
        "settings",
        "setup",
        "simulation",
        "screen layout",
        "screenlayout",
        "system",
        "preferences",
        "options",
        "configuration",
        "about",
    }
)

# Labels that name a menu/panel on a screen — not a second physical surface.
_MENU_SURFACE_LABEL_TOKENS = frozenset(
    {
        "menu",
        "drawer",
        "panel",
        "tab",
        "page",
        "dialog",
        "overlay",
        "quick access",
        "app drawer",
        "general",
        "simulation",
        "screen layout",
        "settings",
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


def _norm_page_name(name: str) -> str:
    return " ".join(str(name or "").lower().split())


def ui_page_is_settings_section(name: str) -> bool:
    n = _norm_page_name(name)
    if not n:
        return False
    compact = n.replace(" ", "")
    if n in _SETTINGS_PAGE_TOKENS or compact in _SETTINGS_PAGE_TOKENS:
        return True
    return any(tok in n for tok in ("setting", "setup", "preference", "config"))


def _label_looks_like_menu(label: str) -> bool:
    n = _norm_page_name(label)
    if not n:
        return False
    if ui_page_is_settings_section(n):
        return True
    return any(tok in n for tok in _MENU_SURFACE_LABEL_TOKENS)


def demote_empty_settings_ui_pages(profile: dict[str, Any]) -> list[str]:
    """Drop zero-action settings-section ui_pages; return demoted names."""
    pages = [p for p in (profile.get("ui_pages") or []) if isinstance(p, dict)]
    kept: list[dict[str, Any]] = []
    demoted: list[str] = []
    for page in pages:
        name = str(page.get("name") or "").strip()
        acts = [a for a in (page.get("actions") or []) if isinstance(a, dict)]
        has_action = any(str(a.get("action") or "").strip() for a in acts)
        if not has_action and ui_page_is_settings_section(name):
            demoted.append(name or "(unnamed)")
            continue
        kept.append(page)
    profile["ui_pages"] = kept
    if demoted:
        profile["demoted_ui_pages"] = demoted
    elif "demoted_ui_pages" in profile:
        profile.pop("demoted_ui_pages", None)
    return demoted


def consolidate_device_control_surfaces(profile: dict[str, Any]) -> dict[str, Any]:
    """One physical screen per device: menus stay on ui_pages, not surfaces."""
    kind = str(profile.get("entity_kind") or "device").strip().lower() or "device"
    if kind == "platform":
        return profile

    surfaces_in = [
        dict(s) for s in (profile.get("control_surfaces") or []) if isinstance(s, dict)
    ]
    pages = [dict(p) for p in (profile.get("ui_pages") or []) if isinstance(p, dict)]
    page_names = {_norm_page_name(str(p.get("name") or "")) for p in pages}

    hardware: list[dict[str, Any]] = []
    menu_surfaces: list[dict[str, Any]] = []
    for surf in surfaces_in:
        label = str(surf.get("label_verbatim") or "").strip()
        if str(surf.get("surface") or "") == "touchscreen" and _label_looks_like_menu(
            label
        ):
            menu_surfaces.append(surf)
        else:
            hardware.append(surf)

    # Promote menu-labeled touchscreens into ui_pages when missing.
    for surf in menu_surfaces:
        label = str(surf.get("label_verbatim") or "").strip()
        if not label:
            continue
        if _norm_page_name(label) in page_names:
            continue
        pages.append(
            {
                "name": label,
                "purpose": "",
                "appears_if_gate": {
                    "verbatim": "",
                    "description_verbatim": "",
                    "functional_class": "",
                },
                "actions": [],
            }
        )
        page_names.add(_norm_page_name(label))

    # Ensure a single physical touchscreen when the only surfaces were menus.
    touch = [s for s in hardware if str(s.get("surface") or "") == "touchscreen"]
    other = [s for s in hardware if str(s.get("surface") or "") != "touchscreen"]
    if menu_surfaces and not touch:
        touch = [
            {
                "surface": "touchscreen",
                "location_class": "on_device",
                "optional_accessory": False,
                "label_verbatim": "Display",
                "path": "control_surfaces[0]",
            }
        ]
    elif len(touch) > 1:
        # Keep first physical touchscreen; drop duplicate panel labels.
        touch = [touch[0]]

    out_surfaces = touch + other
    for i, surf in enumerate(out_surfaces):
        surf["path"] = f"control_surfaces[{i}]"

    profile["control_surfaces"] = out_surfaces
    profile["ui_pages"] = pages
    demote_empty_settings_ui_pages(profile)
    return profile


def _merge_page_actions_into_operator_actions(profile: dict[str, Any]) -> None:
    actions: list[dict[str, Any]] = []
    seen: set[str] = set()
    for a in profile.get("operator_actions") or []:
        if not isinstance(a, dict):
            continue
        key = str(a.get("action") or "").strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        actions.append(dict(a))
    for page in profile.get("ui_pages") or []:
        if not isinstance(page, dict):
            continue
        for act in page.get("actions") or []:
            if not isinstance(act, dict):
                continue
            text = str(act.get("action") or "").strip()
            if not text:
                continue
            key = text.lower()
            if key in seen:
                continue
            seen.add(key)
            actions.append(
                {
                    "action": text,
                    "audience": str(act.get("audience") or "operator").strip()
                    or "operator",
                    "context": str(act.get("context") or "daily").strip() or "daily",
                    "source": "extracted",
                }
            )
    profile["operator_actions"] = actions


def expand_ui_pages(profile: dict[str, Any]) -> dict[str, Any]:
    """Materialize Stage 2 fields from ``ui_pages`` (platforms) or consolidate devices.

    Platforms: rebuild one touchscreen surface per page (legacy Stage 2 gate
    wiring via optional_accessory + requires_devices).

    Devices: one physical touchscreen; menus remain ui_pages; empty settings
    pages are demoted.
    """
    pages = [p for p in (profile.get("ui_pages") or []) if isinstance(p, dict)]
    if not pages:
        # Still consolidate mis-labeled menu surfaces on devices.
        return consolidate_device_control_surfaces(profile)

    kind = str(profile.get("entity_kind") or "device").strip().lower() or "device"
    if kind != "platform":
        demote_empty_settings_ui_pages(profile)
        consolidate_device_control_surfaces(profile)
        _merge_page_actions_into_operator_actions(profile)
        return profile

    demote_empty_settings_ui_pages(profile)
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
    derive_gate_verbatim_evidence(profile)
    return profile


def requires_entry_self_evidencing(req: dict[str, Any]) -> bool:
    """True when the require carries a platform appears-if gate sentence."""
    return bool(str(req.get("gate_verbatim") or "").strip())


def _gate_evidence_note(gate_verbatim: str, description: str) -> str:
    """<=12-word note; prefer description-based paraphrase over full gate."""
    desc = " ".join(str(description or "").split())
    if desc:
        note = f"Page appears when {desc} is configured"
        if len(note.split()) <= 12:
            return note
    words = str(gate_verbatim or "").split()
    if not words:
        return "Appears-if gate from manual"
    return " ".join(words[:12])


def derive_gate_verbatim_evidence(profile: dict[str, Any]) -> dict[str, Any]:
    """Append evidence rows for requires that carry ``gate_verbatim`` (v4.28).

    Platform appears-if gates are already manual-sourced; a separate LLM
    evidence row is redundant. Derived rows keep completeness accounting
    honest when the cap would otherwise drop them.
    """
    if not isinstance(profile, dict):
        return profile
    requires = profile.get("requires_devices") or []
    if not isinstance(requires, list):
        return profile
    surfaces = profile.get("control_surfaces") or []
    evidence = [
        dict(e) for e in (profile.get("evidence") or []) if isinstance(e, dict)
    ]
    covered = {
        str(e.get("supports_field") or "").strip()
        for e in evidence
        if str(e.get("supports_field") or "").strip()
    }
    added = False
    for i, req in enumerate(requires):
        if not isinstance(req, dict) or not requires_entry_self_evidencing(req):
            continue
        path = f"requires_devices[{i}]"
        if path in covered or any(
            c == path or c.startswith(path + ".") for c in covered
        ):
            continue
        needed = str(req.get("needed_for") or "").strip()
        section = "Appears-if gate"
        # Prefer the gated page label from the matching control surface.
        if needed.startswith("control_surfaces[") and isinstance(surfaces, list):
            try:
                idx = int(needed.split("[", 1)[1].split("]", 1)[0])
            except (ValueError, IndexError):
                idx = -1
            if 0 <= idx < len(surfaces) and isinstance(surfaces[idx], dict):
                label = str(surfaces[idx].get("label_verbatim") or "").strip()
                if label:
                    section = label
        note = _gate_evidence_note(
            str(req.get("gate_verbatim") or ""),
            str(req.get("description_verbatim") or ""),
        )
        evidence.append(
            {
                "supports_field": path,
                "manual_section": section,
                "note": note,
            }
        )
        covered.add(path)
        added = True
    if added:
        from interaction_profile_merge import prioritize_evidence

        profile["evidence"] = prioritize_evidence(evidence, max_evidence=8)
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
            key = name.lower().replace(" ", "").replace("/", "")
            page = by_name.get(key) or by_name.get(key.replace("/", ""))
            if page is None:
                # try stem match
                page = next(
                    (
                        by_name[g]
                        for g in by_name
                        if g.startswith(key[:6]) or key[:6] in g
                    ),
                    None,
                )
            if page is None:
                continue
            acts = [
                a
                for a in (page.get("actions") or [])
                if isinstance(a, dict) and str(a.get("action") or "").strip()
            ]
            need = mins.get(key, mins.get(name.lower().replace(" ", ""), 0))
            if require_actions and need and len(acts) < need:
                if len(acts) == 0:
                    empty_actions.append(name)
                else:
                    thin_actions.append(
                        {"name": name, "got": len(acts), "need": need}
                    )

    return {
        "expected": list(expected_tiles),
        "got": got,
        "missing": still_missing,
        "extra": extra,
        "empty_actions": empty_actions,
        "thin_actions": thin_actions,
        "ok": not still_missing
        and not empty_actions
        and not thin_actions,
    }
