"""Stage 1 reduce — merge per-group interaction profiles (pure code)."""

from __future__ import annotations

import re
from typing import Any

from interaction_profile_derive import actions_semantically_similar


def _tokens(text: str) -> set[str]:
    return {
        t
        for t in "".join(ch if ch.isalnum() else " " for ch in text.lower()).split()
        if t
    }


# Directional antonyms — high token overlap must not collapse these pairs
# (Zeus: open/close quick access menu).
_ACTION_ANTONYM_PAIRS = frozenset(
    {
        frozenset({"open", "close"}),
        frozenset({"on", "off"}),
        frozenset({"show", "hide"}),
        frozenset({"enable", "disable"}),
        frozenset({"start", "stop"}),
        frozenset({"lock", "unlock"}),
        frozenset({"connect", "disconnect"}),
    }
)

# Near-synonym tokens treated as equal for action dedup (Zeus: display/screen).
_ACTION_TOKEN_SYNONYMS: dict[str, str] = {
    "display": "screen",
    "displays": "screen",
    "screen": "screen",
    "screens": "screen",
}


def _canonicalize_action_tokens(text: str) -> set[str]:
    return {_ACTION_TOKEN_SYNONYMS.get(t, t) for t in _tokens(text)}


def action_texts_antonym_conflict(a: str, b: str) -> bool:
    """True when both strings share a directional antonym pair."""
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return False
    for pair in _ACTION_ANTONYM_PAIRS:
        x, y = tuple(pair)
        if (x in ta and y in tb) or (y in ta and x in tb):
            return True
    return False


def fuzzy_text_similar(a: str, b: str, *, threshold: float = 0.7) -> bool:
    """General fuzzy match; reuses Stage 1.6 action matcher when applicable."""
    aa = (a or "").strip().lower()
    bb = (b or "").strip().lower()
    if not aa or not bb:
        return False
    if aa == bb or aa.replace(" the ", " ") == bb.replace(" the ", " "):
        return True
    if action_texts_antonym_conflict(aa, bb):
        return False
    if actions_semantically_similar(aa, bb):
        return True
    ta, tb = _canonicalize_action_tokens(aa), _canonicalize_action_tokens(bb)
    if not ta or not tb:
        return False
    return len(ta & tb) / min(len(ta), len(tb)) >= threshold


_OPERATOR_ACTION_INDEX_RE = re.compile(
    r"^operator_actions\[(\d+)\](.*)$", re.DOTALL
)
_OPERATOR_ACTION_TEXT_RE = re.compile(
    r"^operator_actions\[action=(.+)\](.*)$", re.DOTALL
)


def operator_action_support_path(action_text: str, suffix: str = "") -> str:
    text = " ".join(str(action_text or "").split())
    return f"operator_actions[action={text}]{suffix}"


def parse_operator_action_text_path(field: str) -> tuple[str | None, str]:
    """Parse ``operator_actions[action=…]`` → (action_text, suffix) or (None, "")."""
    m = _OPERATOR_ACTION_TEXT_RE.match((field or "").strip())
    if not m:
        return None, ""
    return m.group(1).strip(), (m.group(2) or "")


def rewrite_operator_action_evidence_paths(
    profile: dict[str, Any],
) -> dict[str, Any]:
    """Rewrite ``operator_actions[i]`` evidence links to action-text form.

    Index links are group-local. Call this on each map output **before** merge
    (and again after single-profile normalize). Resolving indices against a
    merged action list retargets ``supports_field`` while leaving note/section
    on the original action (Zeus founding: batch_1 ``[0]`` setup → merged
    ``turn off the device``). Unknown indices are left unchanged for validators.
    """
    if not isinstance(profile, dict):
        return profile
    actions = [
        a for a in (profile.get("operator_actions") or []) if isinstance(a, dict)
    ]
    by_norm = {
        " ".join(str(a.get("action") or "").lower().split()): i
        for i, a in enumerate(actions)
        if str(a.get("action") or "").strip()
    }
    evidence = profile.get("evidence")
    if not isinstance(evidence, list):
        return profile
    out_ev: list[Any] = []
    for item in evidence:
        if not isinstance(item, dict):
            out_ev.append(item)
            continue
        entry = dict(item)
        field = str(entry.get("supports_field") or "").strip()
        m_idx = _OPERATOR_ACTION_INDEX_RE.match(field)
        if m_idx:
            idx = int(m_idx.group(1))
            suffix = m_idx.group(2) or ""
            if 0 <= idx < len(actions):
                text = str(actions[idx].get("action") or "").strip()
                if text:
                    entry["supports_field"] = operator_action_support_path(
                        text, suffix
                    )
            out_ev.append(entry)
            continue
        m_text = _OPERATOR_ACTION_TEXT_RE.match(field)
        if m_text:
            raw = m_text.group(1)
            suffix = m_text.group(2) or ""
            norm = " ".join(raw.lower().split())
            # Re-canonicalize whitespace; leave as-is if action missing.
            if norm in by_norm:
                text = str(actions[by_norm[norm]].get("action") or "").strip()
                entry["supports_field"] = operator_action_support_path(text, suffix)
            out_ev.append(entry)
            continue
        out_ev.append(entry)
    profile["evidence"] = out_ev
    return profile


def resolve_operator_action_support(
    profile: dict[str, Any], path: str
) -> tuple[bool, Any, str | None]:
    """Resolve index or action-text ``operator_actions[...]`` support paths."""
    field = (path or "").strip()
    m_text = _OPERATOR_ACTION_TEXT_RE.match(field)
    if m_text:
        needle = " ".join(m_text.group(1).lower().split())
        suffix = m_text.group(2) or ""
        actions = profile.get("operator_actions") or []
        for i, act in enumerate(actions):
            if not isinstance(act, dict):
                continue
            if " ".join(str(act.get("action") or "").lower().split()) == needle:
                if not suffix:
                    return True, act, None
                from interaction_profile_schema import resolve_field_path

                return resolve_field_path(profile, f"operator_actions[{i}]{suffix}")
        return False, None, f"no operator_actions entry matching action={needle!r}"
    from interaction_profile_schema import resolve_field_path

    return resolve_field_path(profile, field)


def _empty_profile_shell() -> dict[str, Any]:
    return {
        "device": {"manufacturer": "", "model": "", "category_freeform": ""},
        "entity_kind": "device",
        "documented_version": "",
        "ui_pages": [],
        "alarm_severity": [],
        "control_surfaces": [],
        "operator_actions": [],
        "networks": {"speaks": [], "bridges": []},
        "data_roles": {
            "exposes_data_to_network": False,
            "displays_data_from_other_devices": False,
            "controllable_from_network": False,
        },
        "requires_devices": [],
        "safety_role": {
            "is_protective_device": False,
            "has_manual_override": False,
            "has_emergency_procedure": False,
        },
        "protected_by": [],
        "protects": [],
        "supply_requirements": [],
        "evidence": [],
        "confidence": {"overall": 0.0, "notes": ""},
    }


def _ui_page_same(a: dict[str, Any], b: dict[str, Any]) -> bool:
    return str(a.get("name") or "").strip().lower() == str(
        b.get("name") or ""
    ).strip().lower() and bool(str(a.get("name") or "").strip())


def _alarm_severity_same(a: dict[str, Any], b: dict[str, Any]) -> bool:
    return str(a.get("level_verbatim") or "").strip().lower() == str(
        b.get("level_verbatim") or ""
    ).strip().lower() and bool(str(a.get("level_verbatim") or "").strip())


def _surface_key(item: dict[str, Any]) -> str:
    return "|".join(
        [
            str(item.get("surface") or "").lower().strip(),
            str(item.get("location_class") or "").lower().strip(),
            str(item.get("label_verbatim") or "").lower().strip(),
        ]
    )


def _surfaces_same_identity(a: dict[str, Any], b: dict[str, Any]) -> bool:
    if str(a.get("surface") or "") == str(b.get("surface") or "") and str(
        a.get("surface") or ""
    ):
        la = str(a.get("label_verbatim") or "")
        lb = str(b.get("label_verbatim") or "")
        if la and lb and fuzzy_text_similar(la, lb, threshold=0.6):
            return True
        if not la and not lb:
            return str(a.get("location_class") or "") == str(
                b.get("location_class") or ""
            )
    return _surface_key(a) == _surface_key(b) and bool(_surface_key(a).strip("|"))


def _action_same(a: dict[str, Any], b: dict[str, Any]) -> bool:
    return fuzzy_text_similar(str(a.get("action") or ""), str(b.get("action") or ""))


def _speak_same(a: dict[str, Any], b: dict[str, Any]) -> bool:
    return fuzzy_text_similar(
        str(a.get("name_verbatim") or ""),
        str(b.get("name_verbatim") or ""),
        threshold=0.85,
    )


def _requires_same(a: dict[str, Any], b: dict[str, Any]) -> bool:
    if str(a.get("needed_for") or "").strip() != str(b.get("needed_for") or "").strip():
        return False
    return fuzzy_text_similar(
        str(a.get("description_verbatim") or ""),
        str(b.get("description_verbatim") or ""),
        threshold=0.6,
    )


def _evidence_same(a: dict[str, Any], b: dict[str, Any]) -> bool:
    if str(a.get("supports_field") or "").strip() != str(
        b.get("supports_field") or ""
    ).strip():
        return False
    return fuzzy_text_similar(
        str(a.get("note") or ""), str(b.get("note") or ""), threshold=0.65
    )


def _evidence_priority_rank(item: dict[str, Any]) -> int:
    """Lower = keep first when capping post-merge evidence."""
    field = str(item.get("supports_field") or "").strip().lower()
    if field.startswith("requires_devices"):
        return 0
    if field.startswith("data_roles."):
        return 1
    if field.startswith("safety_role."):
        return 2
    if field.startswith("control_surfaces"):
        return 3
    if field.startswith("operator_actions"):
        return 4
    return 5


def prioritize_evidence(
    items: list[dict[str, Any]], *, max_evidence: int = 8
) -> list[dict[str, Any]]:
    """Cap evidence while preferring priority (a–c) field coverage."""
    cleaned = [dict(e) for e in items if isinstance(e, dict)]
    if len(cleaned) <= max_evidence:
        return cleaned
    # Keep earliest occurrence of each supports_field among equal priority.
    ordered = sorted(
        enumerate(cleaned),
        key=lambda pair: (_evidence_priority_rank(pair[1]), pair[0]),
    )
    kept_idx: list[int] = []
    seen_fields: set[str] = set()
    for idx, item in ordered:
        field = str(item.get("supports_field") or "").strip()
        if field and field in seen_fields and _evidence_priority_rank(item) >= 4:
            continue
        if field:
            seen_fields.add(field)
        kept_idx.append(idx)
        if len(kept_idx) >= max_evidence:
            break
    kept_idx.sort()
    return [cleaned[i] for i in kept_idx]


def _desc_same(a: dict[str, Any], b: dict[str, Any]) -> bool:
    return fuzzy_text_similar(
        str(a.get("description_verbatim") or ""),
        str(b.get("description_verbatim") or ""),
        threshold=0.7,
    )


def _union_dicts(
    existing: list[dict[str, Any]],
    incoming: list[dict[str, Any]],
    *,
    same_fn,
    conflict_attrs: tuple[str, ...] = (),
    group_id: str,
    kind: str,
    contributions: dict[str, dict[str, int]],
    conflicts: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    out = list(existing)
    bucket = contributions.setdefault(
        group_id,
        {
            "operator_actions": 0,
            "control_surfaces": 0,
            "networks": 0,
            "requires_devices": 0,
            "evidence": 0,
            "supply_requirements": 0,
            "protected_by": 0,
            "protects": 0,
            "data_roles": 0,
            "safety_role": 0,
        },
    )
    for item in incoming:
        if not isinstance(item, dict):
            continue
        match_idx = None
        for i, prev in enumerate(out):
            if same_fn(prev, item):
                match_idx = i
                break
        if match_idx is None:
            out.append(dict(item))
            bucket[kind] = bucket.get(kind, 0) + 1
            continue
        prev = out[match_idx]
        for attr in conflict_attrs:
            if attr not in prev and attr not in item:
                continue
            if prev.get(attr) != item.get(attr) and item.get(attr) is not None:
                conflicts.append(
                    {
                        "kind": kind,
                        "attribute": attr,
                        "group_id": group_id,
                        "variants": [dict(prev), dict(item)],
                    }
                )
        # Keep first; still count as a contribution attempt if new attrs differ.
        bucket[kind] = bucket.get(kind, 0) + 1
    return out


def measure_group_contribution(profile: dict[str, Any]) -> dict[str, int]:
    """Count fields/evidence a single map output contributed (pre-merge)."""
    if not isinstance(profile, dict):
        return {
            "operator_actions": 0,
            "control_surfaces": 0,
            "networks": 0,
            "requires_devices": 0,
            "evidence": 0,
            "supply_requirements": 0,
            "protected_by": 0,
            "protects": 0,
            "data_roles": 0,
            "safety_role": 0,
        }
    networks = profile.get("networks") if isinstance(profile.get("networks"), dict) else {}
    roles = profile.get("data_roles") if isinstance(profile.get("data_roles"), dict) else {}
    safety = profile.get("safety_role") if isinstance(profile.get("safety_role"), dict) else {}
    return {
        "operator_actions": len(
            [a for a in (profile.get("operator_actions") or []) if isinstance(a, dict)]
        ),
        "control_surfaces": len(
            [s for s in (profile.get("control_surfaces") or []) if isinstance(s, dict)]
        ),
        "networks": len(
            [s for s in (networks.get("speaks") or []) if isinstance(s, dict)]
        )
        + len([b for b in (networks.get("bridges") or []) if isinstance(b, dict)]),
        "requires_devices": len(
            [r for r in (profile.get("requires_devices") or []) if isinstance(r, dict)]
        ),
        "evidence": len(
            [e for e in (profile.get("evidence") or []) if isinstance(e, dict)]
        ),
        "supply_requirements": len(
            [x for x in (profile.get("supply_requirements") or []) if isinstance(x, dict)]
        ),
        "protected_by": len(
            [x for x in (profile.get("protected_by") or []) if isinstance(x, dict)]
        ),
        "protects": len(
            [x for x in (profile.get("protects") or []) if isinstance(x, dict)]
        ),
        "data_roles": sum(1 for k, v in roles.items() if v is True),
        "safety_role": sum(1 for k, v in safety.items() if v is True),
    }


def merge_group_profiles(
    group_results: list[dict[str, Any]],
) -> dict[str, Any]:
    """Merge map outputs.

    ``group_results`` items: {group_id, is_introduction, profile, excerpts?}.

    Returns ``{profile, conflicts, group_contributions, utilization}``.
    """
    merged = _empty_profile_shell()
    conflicts: list[dict[str, Any]] = []
    contributions: dict[str, dict[str, int]] = {}
    notes: list[str] = []
    max_conf = 0.0
    manufacturer = ""
    model = ""

    ordered = sorted(
        group_results,
        key=lambda g: (0 if g.get("is_introduction") else 1, str(g.get("group_id"))),
    )

    category = ""
    scratch_contrib: dict[str, dict[str, int]] = {}

    for group in ordered:
        group_id = str(group.get("group_id") or "group")
        profile = group.get("profile") if isinstance(group.get("profile"), dict) else {}
        # Bind evidence indices to this group's action texts before union —
        # merged-list rewrite would scramble note/section pairing (v4.27).
        if profile:
            profile = rewrite_operator_action_evidence_paths(dict(profile))
        device = profile.get("device") if isinstance(profile.get("device"), dict) else {}
        if not manufacturer:
            manufacturer = str(device.get("manufacturer") or "")
        if not model:
            model = str(device.get("model") or "")
        if group.get("is_introduction"):
            cat = str(device.get("category_freeform") or "").strip()
            if cat:
                category = cat

        contributions[group_id] = measure_group_contribution(profile)
        scratch_contrib[group_id] = {
            "operator_actions": 0,
            "control_surfaces": 0,
            "ui_pages": 0,
            "networks": 0,
            "requires_devices": 0,
            "evidence": 0,
            "supply_requirements": 0,
            "protected_by": 0,
            "protects": 0,
            "data_roles": 0,
            "safety_role": 0,
        }

        if str(profile.get("entity_kind") or "").strip().lower() == "platform":
            merged["entity_kind"] = "platform"
        doc_ver = str(profile.get("documented_version") or "").strip()
        if doc_ver and len(doc_ver) >= len(
            str(merged.get("documented_version") or "")
        ):
            merged["documented_version"] = doc_ver

        merged["ui_pages"] = _union_dicts(
            merged["ui_pages"],
            list(profile.get("ui_pages") or []),
            same_fn=_ui_page_same,
            conflict_attrs=("purpose",),
            group_id=group_id,
            kind="ui_pages",
            contributions=scratch_contrib,
            conflicts=conflicts,
        )
        merged["alarm_severity"] = _union_dicts(
            merged.get("alarm_severity") or [],
            list(profile.get("alarm_severity") or []),
            same_fn=_alarm_severity_same,
            conflict_attrs=("color_verbatim",),
            group_id=group_id,
            kind="alarm_severity",
            contributions=scratch_contrib,
            conflicts=conflicts,
        )

        merged["control_surfaces"] = _union_dicts(
            merged["control_surfaces"],
            list(profile.get("control_surfaces") or []),
            same_fn=_surfaces_same_identity,
            conflict_attrs=("optional_accessory", "location_class", "surface"),
            group_id=group_id,
            kind="control_surfaces",
            contributions=scratch_contrib,
            conflicts=conflicts,
        )
        for i, surface in enumerate(merged["control_surfaces"]):
            if isinstance(surface, dict):
                surface["path"] = f"control_surfaces[{i}]"

        merged["operator_actions"] = _union_dicts(
            merged["operator_actions"],
            list(profile.get("operator_actions") or []),
            same_fn=_action_same,
            conflict_attrs=("context", "audience"),
            group_id=group_id,
            kind="operator_actions",
            contributions=scratch_contrib,
            conflicts=conflicts,
        )

        networks = (
            profile.get("networks") if isinstance(profile.get("networks"), dict) else {}
        )
        merged["networks"]["speaks"] = _union_dicts(
            merged["networks"]["speaks"],
            list(networks.get("speaks") or []),
            same_fn=_speak_same,
            conflict_attrs=("physical_or_wireless",),
            group_id=group_id,
            kind="networks",
            contributions=scratch_contrib,
            conflicts=conflicts,
        )
        for bridge in networks.get("bridges") or []:
            if not isinstance(bridge, dict):
                continue
            frm = str(bridge.get("from") or "").strip()
            to = str(bridge.get("to") or "").strip()
            if not frm or not to:
                continue
            if not any(
                str(b.get("from")) == frm and str(b.get("to")) == to
                for b in merged["networks"]["bridges"]
                if isinstance(b, dict)
            ):
                merged["networks"]["bridges"].append({"from": frm, "to": to})

        roles = (
            profile.get("data_roles")
            if isinstance(profile.get("data_roles"), dict)
            else {}
        )
        for key in merged["data_roles"]:
            if bool(roles.get(key)):
                merged["data_roles"][key] = True

        safety = (
            profile.get("safety_role")
            if isinstance(profile.get("safety_role"), dict)
            else {}
        )
        for key in merged["safety_role"]:
            if bool(safety.get(key)):
                merged["safety_role"][key] = True

        merged["requires_devices"] = _union_dicts(
            merged["requires_devices"],
            list(profile.get("requires_devices") or []),
            same_fn=_requires_same,
            conflict_attrs=("description_verbatim",),
            group_id=group_id,
            kind="requires_devices",
            contributions=scratch_contrib,
            conflicts=conflicts,
        )

        for key in ("protected_by", "protects", "supply_requirements"):
            merged[key] = _union_dicts(
                merged[key],
                list(profile.get(key) or []),
                same_fn=_desc_same,
                conflict_attrs=(),
                group_id=group_id,
                kind=key,
                contributions=scratch_contrib,
                conflicts=conflicts,
            )

        merged["evidence"] = _union_dicts(
            merged["evidence"],
            list(profile.get("evidence") or []),
            same_fn=_evidence_same,
            conflict_attrs=(),
            group_id=group_id,
            kind="evidence",
            contributions=scratch_contrib,
            conflicts=conflicts,
        )

        conf = (
            profile.get("confidence")
            if isinstance(profile.get("confidence"), dict)
            else {}
        )
        try:
            max_conf = max(max_conf, float(conf.get("overall") or 0.0))
        except (TypeError, ValueError):
            pass
        note = str(conf.get("notes") or "").strip()
        if note:
            notes.append(f"[{group_id}] {note}")

    merged["device"] = {
        "manufacturer": manufacturer,
        "model": model,
        "category_freeform": category,
    }
    merged["confidence"] = {
        "overall": max_conf,
        "notes": " | ".join(notes),
    }
    # Cap after full union, preferring priority-field evidence (v3.3 a–c).
    merged["evidence"] = prioritize_evidence(list(merged["evidence"] or []), max_evidence=8)

    # v4.0: OR-split combined descriptions post-merge; exact-key dedupe.
    # Post-merge rewrite is a safety net only — indices should already be
    # action-text from the per-group rewrite above (v4.27).
    from interaction_profile_kinds import finalize_profile_requires
    from interaction_profile_options import collapse_option_value_actions

    finalize_profile_requires(merged)
    merged["operator_actions"] = collapse_option_value_actions(
        list(merged.get("operator_actions") or [])
    )
    # Expand platform ui_pages into Stage 2 surfaces/requires after merge.
    # Gate-verbatim requires get derived evidence inside expand (v4.28).
    if merged.get("ui_pages"):
        from interaction_profile_ui_pages import expand_ui_pages

        expand_ui_pages(merged)
        merged["evidence"] = prioritize_evidence(
            list(merged.get("evidence") or []), max_evidence=8
        )
    rewrite_operator_action_evidence_paths(merged)

    utilization = []
    for group in ordered:
        gid = str(group.get("group_id") or "")
        counts = contributions.get(gid) or {}
        total = sum(int(v) for v in counts.values())
        utilization.append(
            {
                "group_id": gid,
                "is_introduction": bool(group.get("is_introduction")),
                "excerpt_count": len(group.get("excerpts") or []),
                "predicted_fields": list(group.get("predicted_fields") or []),
                "contributions": counts,
                "contribution_total": total,
                "unutilized": len(group.get("excerpts") or []) > 0 and total == 0,
            }
        )

    return {
        "profile": merged,
        "conflicts": conflicts,
        "group_contributions": contributions,
        "utilization": utilization,
    }
