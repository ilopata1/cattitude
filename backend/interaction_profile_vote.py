"""Stage 1 stability voting — N map-reduce runs, field-level vote.

Presence (operator_actions / requires_devices / control_surfaces /
networks.speaks): **union-with-provenance** — keep an item present in ≥1 run
when grounded in routed excerpts; attach ``vote_margin``. Attribute conflicts
on the same identity still use majority; 1/1 (or non-unanimous) attribute
splits flag ``extraction_unstable``.

Booleans / category / protect-supply lists retain majority / presence-prefer
behavior as before.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from copy import deepcopy
from typing import Any, Callable

from interaction_profile_merge import (
    _action_same,
    _desc_same,
    _speak_same,
    _surfaces_same_identity,
    fuzzy_text_similar,
    prioritize_evidence,
)
from interaction_profile_validate import (
    FEWSHOT_PHRASE_GROUNDING_RATIO,
    _excerpt_corpus,
    _token_overlap_ratio,
)

STABILITY_N = 3

_BOOL_PATHS = (
    "data_roles.exposes_data_to_network",
    "data_roles.displays_data_from_other_devices",
    "data_roles.controllable_from_network",
    "safety_role.is_protective_device",
    "safety_role.has_manual_override",
    "safety_role.has_emergency_procedure",
)

_UNION_LIST_SPECS: tuple[
    tuple[str, Callable[[dict, dict], bool], tuple[str, ...], Callable[[dict], str]],
    ...,
] = (
    (
        "operator_actions",
        _action_same,
        ("context", "audience"),
        lambda i: str(i.get("action") or ""),
    ),
    (
        "control_surfaces",
        _surfaces_same_identity,
        ("optional_accessory", "location_class", "surface"),
        lambda i: _surface_presence_text(i),
    ),
    (
        "requires_devices",
        # Identity = description only so needed_for can majority as an attribute.
        lambda a, b: fuzzy_text_similar(
            str(a.get("description_verbatim") or ""),
            str(b.get("description_verbatim") or ""),
            threshold=0.6,
        ),
        ("needed_for",),
        lambda i: str(i.get("description_verbatim") or ""),
    ),
)

_DESC_LIST_SPECS: tuple[
    tuple[str, Callable[[dict, dict], bool], tuple[str, ...]], ...
] = (
    ("protects", _desc_same, ()),
    ("protected_by", _desc_same, ()),
    ("supply_requirements", _desc_same, ()),
)


def _get_path(profile: dict[str, Any], dotted: str) -> Any:
    cur: Any = profile
    for part in dotted.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur


def _set_path(profile: dict[str, Any], dotted: str, value: Any) -> None:
    parts = dotted.split(".")
    cur: Any = profile
    for part in parts[:-1]:
        nxt = cur.get(part)
        if not isinstance(nxt, dict):
            nxt = {}
            cur[part] = nxt
        cur = nxt
    cur[parts[-1]] = value


def canonical_merged_profile(profile: dict[str, Any]) -> str:
    """Field-normalized JSON for short-circuit equality (post-merge)."""
    shell = {
        "device": {
            "category_freeform": str(
                (profile.get("device") or {}).get("category_freeform") or ""
            ).strip()
        },
        "control_surfaces": _canonicalize_list(
            profile.get("control_surfaces") or [],
            key_fn=lambda s: (
                str(s.get("surface") or ""),
                str(s.get("location_class") or ""),
                str(s.get("label_verbatim") or "").lower(),
                bool(s.get("optional_accessory")),
            ),
            keep=(
                "surface",
                "location_class",
                "optional_accessory",
                "label_verbatim",
            ),
        ),
        "operator_actions": _canonicalize_list(
            profile.get("operator_actions") or [],
            key_fn=lambda a: (
                str(a.get("action") or "").lower(),
                str(a.get("context") or ""),
                str(a.get("audience") or ""),
            ),
            keep=("action", "context", "audience"),
        ),
        "networks": {
            "speaks": _canonicalize_list(
                ((profile.get("networks") or {}).get("speaks") or []),
                key_fn=lambda s: str(s.get("name_verbatim") or "").lower(),
                keep=("name_verbatim", "physical_or_wireless"),
            ),
            "bridges": _canonicalize_list(
                ((profile.get("networks") or {}).get("bridges") or []),
                key_fn=lambda b: (
                    str(b.get("from") or b.get("from_network") or "").lower(),
                    str(b.get("to") or b.get("to_network") or "").lower(),
                ),
                keep=("from", "to", "from_network", "to_network"),
            ),
        },
        "data_roles": dict(profile.get("data_roles") or {}),
        "requires_devices": _canonicalize_list(
            profile.get("requires_devices") or [],
            key_fn=lambda r: (
                str(r.get("description_verbatim") or "").lower(),
                str(r.get("needed_for") or ""),
            ),
            keep=("description_verbatim", "needed_for"),
        ),
        "safety_role": dict(profile.get("safety_role") or {}),
        "protected_by": _canonicalize_list(
            profile.get("protected_by") or [],
            key_fn=lambda d: str(d.get("description_verbatim") or "").lower(),
            keep=("description_verbatim",),
        ),
        "protects": _canonicalize_list(
            profile.get("protects") or [],
            key_fn=lambda d: str(d.get("description_verbatim") or "").lower(),
            keep=("description_verbatim",),
        ),
        "supply_requirements": _canonicalize_list(
            profile.get("supply_requirements") or [],
            key_fn=lambda d: str(d.get("description_verbatim") or "").lower(),
            keep=("description_verbatim",),
        ),
    }
    return json.dumps(shell, sort_keys=True, ensure_ascii=False)


def _canonicalize_list(
    items: list[Any],
    *,
    key_fn: Callable[[dict], Any],
    keep: tuple[str, ...],
) -> list[dict[str, Any]]:
    cleaned: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        cleaned.append({k: item.get(k) for k in keep})
    cleaned.sort(key=lambda d: json.dumps(key_fn(d), sort_keys=True, default=str))
    return cleaned


def _majority_scalar(values: list[Any]) -> tuple[Any, bool, list[Any]]:
    """Return (chosen, stable, unique_variants). Prefer True over False on ties."""
    if not values:
        return None, True, []
    counts = Counter(json.dumps(v, sort_keys=True, default=str) for v in values)
    best_key, best_n = None, -1
    for key, n in counts.items():
        if n > best_n:
            best_key, best_n = key, n
            continue
        if n == best_n and best_key is not None:
            if best_key == "false" and key == "true":
                best_key = key
    chosen = None
    for v in values:
        if json.dumps(v, sort_keys=True, default=str) == best_key:
            chosen = v
            break
    unique: list[Any] = []
    seen: set[str] = set()
    for v in values:
        k = json.dumps(v, sort_keys=True, default=str)
        if k not in seen:
            seen.add(k)
            unique.append(v)
    if len(unique) == 1:
        stable = True
    else:
        stable = best_n > (len(values) - best_n)
    return chosen, stable, unique


def _cluster_items(
    runs: list[list[dict[str, Any]]],
    same_fn: Callable[[dict, dict], bool],
) -> list[list[dict[str, Any] | None]]:
    """Cluster list items across runs by identity; pad missing with None."""
    clusters: list[list[dict[str, Any] | None]] = []
    for run_idx, items in enumerate(runs):
        for item in items:
            if not isinstance(item, dict):
                continue
            matched = False
            for cluster in clusters:
                prototype = next((c for c in cluster if c is not None), None)
                if prototype is not None and same_fn(prototype, item):
                    cluster[run_idx] = dict(item)
                    matched = True
                    break
            if not matched:
                row: list[dict[str, Any] | None] = [None] * len(runs)
                row[run_idx] = dict(item)
                clusters.append(row)
    return clusters


def item_grounded_in_excerpts(
    text: str,
    excerpts: list[dict[str, Any]] | list[str] | None,
) -> bool:
    """True when distinctive tokens of ``text`` appear in the routed corpus."""
    corpus = _excerpt_corpus(excerpts)
    if not corpus or not (text or "").strip():
        return False
    joined = " ".join(corpus)
    if _token_overlap_ratio(text, joined) >= FEWSHOT_PHRASE_GROUNDING_RATIO:
        return True
    # led_indicators_only / generic LED surface text → accept LED status cues.
    low = text.lower()
    if "led" in low or "indicator" in low:
        return bool(
            re.search(
                r"(?i)\bLED\b|indicator|network status|power\s+indicator|"
                r"status\s+LED|green-?available|green\s*-\s*power",
                joined,
            )
        )
    return False


def _surface_presence_text(item: dict[str, Any]) -> str:
    """Text used for union grounding of a control_surfaces row."""
    label = str(item.get("label_verbatim") or "").strip()
    if label:
        return label
    surface = str(item.get("surface") or "").strip()
    if surface == "led_indicators_only":
        # Enum token itself never appears in manuals; map to grounded LED cues.
        return "LED status indicator"
    return surface


def _margin_label(present_n: int, n_runs: int) -> str:
    return f"{present_n}/{n_runs}"


def _vote_union_cluster(
    cluster: list[dict[str, Any] | None],
    *,
    field: str,
    conflict_attrs: tuple[str, ...],
    text_fn: Callable[[dict], str],
    excerpts: list[dict[str, Any]] | list[str] | None,
    votes: list[dict[str, Any]],
    flags: list[dict[str, str]],
) -> dict[str, Any] | None:
    """Union presence (if grounded) + majority on attributes. Or None to drop."""
    n_runs = len(cluster)
    present = [c for c in cluster if c is not None]
    if not present:
        return None
    present_n = len(present)
    prototype = dict(present[0])
    text = text_fn(prototype)
    if not item_grounded_in_excerpts(text, excerpts):
        votes.append(
            {
                "field_path": field,
                "kind": field,
                "attribute": "presence",
                "chosen": None,
                "vote_margin": _margin_label(present_n, n_runs),
                "blocked": "ungrounded",
                "variants": [
                    {"run": i + 1, "value": cluster[i]} for i in range(n_runs)
                ],
            }
        )
        return None

    chosen = dict(prototype)
    chosen["vote_margin"] = _margin_label(present_n, n_runs)

    for attr in conflict_attrs:
        attr_vals = [p.get(attr) for p in present]
        c_attr, stable_attr, unique = _majority_scalar(attr_vals)
        if c_attr is not None:
            chosen[attr] = c_attr
        if not stable_attr and len(unique) > 1:
            votes.append(
                {
                    "field_path": field,
                    "kind": field,
                    "attribute": attr,
                    "chosen": c_attr,
                    "vote_margin": _margin_label(present_n, n_runs),
                    "variants": [
                        {"run": i + 1, "value": cluster[i]} for i in range(n_runs)
                    ],
                }
            )
            label = text[:80]
            flags.append(
                {
                    "flag": "extraction_unstable",
                    "severity": "warning",
                    "detail": (
                        f"{field}.{attr} disagreed across runs ({label!r})"
                    ),
                    "field_path": field,
                }
            )

    if present_n < n_runs:
        votes.append(
            {
                "field_path": field,
                "kind": field,
                "attribute": "presence",
                "chosen": chosen,
                "vote_margin": _margin_label(present_n, n_runs),
                "variants": [
                    {"run": i + 1, "value": cluster[i]} for i in range(n_runs)
                ],
            }
        )
    return chosen


def vote_merged_profiles(
    run_profiles: list[dict[str, Any]],
    *,
    excerpts: list[dict[str, Any]] | list[str] | None = None,
) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, str]]]:
    """Vote post-merge profiles.

    Returns ``(voted_profile, extraction_votes, unstable_flags)``.
    """
    if not run_profiles:
        raise ValueError("vote_merged_profiles requires at least one profile")
    if len(run_profiles) == 1:
        return deepcopy(run_profiles[0]), [], []

    voted = deepcopy(run_profiles[0])
    votes: list[dict[str, Any]] = []
    flags: list[dict[str, str]] = []
    n_runs = len(run_profiles)

    cats = [
        str((p.get("device") or {}).get("category_freeform") or "").strip()
        for p in run_profiles
    ]
    chosen_cat, cat_stable, _cat_variants = _majority_scalar(cats)
    device = dict(voted.get("device") or {})
    device["category_freeform"] = chosen_cat or device.get("category_freeform") or ""
    voted["device"] = device
    if not cat_stable:
        votes.append(
            {
                "field_path": "device.category_freeform",
                "kind": "device",
                "attribute": "category_freeform",
                "chosen": chosen_cat,
                "variants": [
                    {"run": i + 1, "value": cats[i]} for i in range(len(cats))
                ],
            }
        )
        flags.append(
            {
                "flag": "extraction_unstable",
                "severity": "warning",
                "detail": (
                    "device.category_freeform disagreed across stability runs"
                ),
                "field_path": "device.category_freeform",
            }
        )

    for path in _BOOL_PATHS:
        values = [_get_path(p, path) for p in run_profiles]
        chosen, stable, unique = _majority_scalar(values)
        if chosen is not None:
            _set_path(voted, path, chosen)
        if not stable:
            votes.append(
                {
                    "field_path": path,
                    "kind": path.split(".")[0],
                    "attribute": path.split(".")[-1],
                    "chosen": chosen,
                    "vote_counts": {
                        json.dumps(u, default=str): values.count(u) for u in unique
                    },
                    "variants": [
                        {"run": i + 1, "value": values[i]}
                        for i in range(len(values))
                    ],
                }
            )
            flags.append(
                {
                    "flag": "extraction_unstable",
                    "severity": "warning",
                    "detail": f"{path} disagreed across stability runs",
                    "field_path": path,
                }
            )

    speak_runs = [
        list(((p.get("networks") or {}).get("speaks") or [])) for p in run_profiles
    ]
    voted_speaks: list[dict[str, Any]] = []
    for cluster in _cluster_items(speak_runs, _speak_same):
        item = _vote_union_cluster(
            cluster,
            field="networks.speaks",
            conflict_attrs=("physical_or_wireless",),
            text_fn=lambda i: str(i.get("name_verbatim") or ""),
            excerpts=excerpts,
            votes=votes,
            flags=flags,
        )
        if item is not None:
            voted_speaks.append(item)
    networks = dict(voted.get("networks") or {})
    networks["speaks"] = voted_speaks
    bridge_runs = [
        list(((p.get("networks") or {}).get("bridges") or [])) for p in run_profiles
    ]
    bridge_out: list[dict[str, Any]] = []
    for cluster in _cluster_items(
        bridge_runs,
        lambda a, b: str(a.get("from") or "") == str(b.get("from") or "")
        and str(a.get("to") or "") == str(b.get("to") or ""),
    ):
        present = [c for c in cluster if c is not None]
        if present:
            bridge_out.append(dict(present[0]))
    networks["bridges"] = bridge_out
    voted["networks"] = networks

    for field, same_fn, conflict_attrs, text_fn in _UNION_LIST_SPECS:
        runs = [list(p.get(field) or []) for p in run_profiles]
        out_items: list[dict[str, Any]] = []
        for cluster in _cluster_items(runs, same_fn):
            item = _vote_union_cluster(
                cluster,
                field=field,
                conflict_attrs=conflict_attrs,
                text_fn=text_fn,
                excerpts=excerpts,
                votes=votes,
                flags=flags,
            )
            if item is not None:
                out_items.append(item)
        voted[field] = out_items

    for field, same_fn, _conflict_attrs in _DESC_LIST_SPECS:
        runs = [list(p.get(field) or []) for p in run_profiles]
        out_items = []
        for cluster in _cluster_items(runs, same_fn):
            present = [c for c in cluster if c is not None]
            if not present:
                continue
            chosen = dict(present[0])
            chosen["vote_margin"] = _margin_label(len(present), n_runs)
            out_items.append(chosen)
        voted[field] = out_items

    confs = [
        p.get("confidence") if isinstance(p.get("confidence"), dict) else {}
        for p in run_profiles
    ]
    overall = max((float(c.get("overall") or 0.0) for c in confs), default=0.0)
    notes = " | ".join(
        str(c.get("notes") or "").strip()
        for c in confs
        if str(c.get("notes") or "").strip()
    )
    voted["confidence"] = {"overall": overall, "notes": notes[:500]}

    evidence_out: list[dict[str, Any]] = []
    for p in run_profiles:
        for item in p.get("evidence") or []:
            if not isinstance(item, dict):
                continue
            dup = False
            for prev in evidence_out:
                if str(prev.get("supports_field") or "") == str(
                    item.get("supports_field") or ""
                ) and fuzzy_text_similar(
                    str(prev.get("note") or ""),
                    str(item.get("note") or ""),
                    threshold=0.65,
                ):
                    dup = True
                    break
            if not dup:
                evidence_out.append(dict(item))
    voted["evidence"] = prioritize_evidence(evidence_out, max_evidence=12)

    seen_f: set[str] = set()
    unique_flags: list[dict[str, str]] = []
    for f in flags:
        key = f"{f.get('field_path')}|{f.get('detail')}"
        if key in seen_f:
            continue
        seen_f.add(key)
        unique_flags.append(f)

    return voted, votes, unique_flags


def profiles_identical_post_merge(a: dict[str, Any], b: dict[str, Any]) -> bool:
    return canonical_merged_profile(a) == canonical_merged_profile(b)
