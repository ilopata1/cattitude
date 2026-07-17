"""Stage 4 section input assembly.

A section's input set is computed from the vessel graph:

1. member devices (section assignment) — full depth
2. platforms any member runs (``runs_platform``) — full depth
3. boundary control-path targets/sources that pass documented visibility —
   summary depth
4. path devices of those edges / platform gates (bridges, COIs) —
   provenance depth only
5. flags on anything above (existing reader_relevance rules apply)

Principle (PRINCIPLES §9): graph reachability establishes *candidacy*;
documented visibility (present platform page or member surface) establishes
*membership* for summary depth.
"""

from __future__ import annotations

from typing import Any

from system_graph import ComputedDevice, ControlPath, VesselGraphResult

DEPTH_FULL = "full"
DEPTH_SUMMARY = "summary"
DEPTH_PROVENANCE = "provenance"

# Documented platform-page → device-family visibility for summary membership.
# Page names are matched case-insensitively / loosely.
_PAGE_VISIBILITY_FAMILIES: dict[str, tuple[str, ...]] = {
    "inverter charger": (
        "mass_combi",
        "combi",
        "multiplus",
        "quattro",
        "inverter/charger",
        "inverter-charger",
    ),
    "inverter charge": (
        "mass_combi",
        "combi",
        "multiplus",
        "quattro",
        "inverter/charger",
        "inverter-charger",
    ),
    "monitoring": (
        "mli",
        "bms",
        "battery monitor",
        "shunt",
    ),
}

# Config-layer evidence may later admit these reachable candidates.
_CONFIG_LAYER_CANDIDATE_NOTE = (
    "Reachable on the vessel graph but not on a documented present platform "
    "page or member surface in current sources; config-layer evidence "
    "(circuits / Favourites / .zcf) may later admit summary membership."
)


def assemble_section_inputs(
    graph: VesselGraphResult,
    section_id: str,
    *,
    equipment_doc: dict[str, Any] | None = None,
    member_keys: tuple[str, ...] | list[str] | None = None,
) -> dict[str, Any]:
    """Return a reviewable section input set with per-contributor depth.

    ``member_keys`` optionally restricts step-1 members (leaf / subsection
    pilots such as Solar). Platforms, summary targets, and path devices are
    still derived from that member set.
    """
    _ = equipment_doc
    contributors: dict[str, dict[str, Any]] = {}
    candidates_excluded: list[dict[str, Any]] = []
    present_pages: list[dict[str, Any]] = []
    member_key_filter = (
        {str(k) for k in member_keys} if member_keys is not None else None
    )

    def _add(
        key: str,
        *,
        depth: str,
        reason: str,
        via: str | None = None,
        visibility: str | None = None,
    ) -> None:
        if key not in graph.devices:
            return
        existing = contributors.get(key)
        # Prefer richer depth: full > summary > provenance
        rank = {DEPTH_FULL: 3, DEPTH_SUMMARY: 2, DEPTH_PROVENANCE: 1}
        if existing and rank.get(existing["depth"], 0) >= rank.get(depth, 0):
            # Keep first reason; append alternate reasons
            alts = list(existing.get("also_via") or [])
            alts.append({"depth": depth, "reason": reason, "via": via})
            existing["also_via"] = alts
            return
        entry: dict[str, Any] = {
            "device_key": key,
            "depth": depth,
            "reason": reason,
            "role": graph.devices[key].role,
            "home_section": graph.devices[key].section,
        }
        if via:
            entry["via"] = via
        if visibility:
            entry["visibility"] = visibility
        if existing:
            entry["also_via"] = [
                {
                    "depth": existing["depth"],
                    "reason": existing["reason"],
                    "via": existing.get("via"),
                }
            ] + list(existing.get("also_via") or [])
        contributors[key] = entry

    # --- 1. Section members (full) ---
    members = [
        d
        for d in graph.devices.values()
        if d.section == section_id
        and (member_key_filter is None or d.device_key in member_key_filter)
    ]
    for device in members:
        _add(device.device_key, depth=DEPTH_FULL, reason="section_member")

    # --- 2. Platforms members run (full) ---
    for device in members:
        for edge in device.profile.get("runs_platform") or []:
            if not isinstance(edge, dict):
                continue
            pk = str(edge.get("platform_key") or "").strip()
            if not pk:
                continue
            _add(
                pk,
                depth=DEPTH_FULL,
                reason="runs_platform",
                via=device.device_key,
            )

    # Collect present platform pages from full-depth platform contributors.
    platform_keys = [
        k
        for k, c in contributors.items()
        if c["depth"] == DEPTH_FULL
        and graph.devices[k].role == "PLATFORM"
    ]
    for pk in platform_keys:
        pages = _present_platform_pages(graph.devices[pk], graph)
        present_pages.extend(pages)

    # Member surfaces (for "documented member surface" visibility).
    member_surfaces = _member_surface_docs(members)

    # --- 3. Boundary control paths → summary if visibility passes ---
    member_ids = {d.device_key for d in members}
    platform_ids = set(platform_keys)
    station_ids = member_ids | platform_ids
    seen_boundary: set[str] = set()

    for path in graph.control_paths:
        target = graph.devices.get(path.target)
        hub = graph.devices.get(path.taught_via)
        if not target or not hub:
            continue
        t_sec = target.section
        h_sec = hub.section
        if not t_sec or not h_sec or t_sec == h_sec:
            continue

        # Only paths involving this section's station (members / their platforms).
        if path.taught_via not in station_ids and path.target not in station_ids:
            continue

        # Crossing into this section from outside, or out from this section.
        if h_sec == section_id and t_sec != section_id:
            candidate_key = path.target
            side = "target"
        elif t_sec == section_id and h_sec != section_id:
            candidate_key = path.taught_via
            side = "source"
        else:
            continue

        seen_boundary.add(candidate_key)
        vis = _visibility_for_candidate(
            candidate_key,
            graph.devices[candidate_key],
            present_pages=present_pages,
            member_surfaces=member_surfaces,
        )
        if vis:
            _add(
                candidate_key,
                depth=DEPTH_SUMMARY,
                reason="control_path_boundary",
                via=f"{path.taught_via}->{path.target}",
                visibility=vis,
            )
        else:
            candidates_excluded.append(
                {
                    "device_key": candidate_key,
                    "side": side,
                    "path": {
                        "target": path.target,
                        "taught_via": path.taught_via,
                    },
                    "candidacy": "control_path_boundary",
                    "membership": "excluded",
                    "note": _CONFIG_LAYER_CANDIDATE_NOTE,
                }
            )

        # --- 4. Path devices (bridges / COIs) — provenance ---
        for bridge_key in _path_bridge_devices(path, graph):
            _add(
                bridge_key,
                depth=DEPTH_PROVENANCE,
                reason="path_device",
                via=f"{path.taught_via}->{path.target}",
            )

    # --- 3b. Monitor/display candidacy (exposes_data, no control path required) ---
    # Same visibility gate: present platform page or member surface.
    station_hubs = [
        graph.devices[k]
        for k in station_ids
        if k in graph.devices and graph.devices[k].role in {"HUB", "PLATFORM"}
    ]
    for key, device in graph.devices.items():
        if key in seen_boundary or key in contributors:
            continue
        if device.section == section_id:
            continue
        if not device.profile.get("data_roles", {}).get("exposes_data_to_network"):
            continue
        if not any(
            _shares_network(device, hub, graph) for hub in station_hubs if hub.role == "HUB"
        ):
            # Also allow share with any station member that speaks bridged nets.
            if not any(_shares_network(device, m, graph) for m in members):
                continue
        vis = _visibility_for_candidate(
            key,
            device,
            present_pages=present_pages,
            member_surfaces=member_surfaces,
        )
        if vis:
            _add(
                key,
                depth=DEPTH_SUMMARY,
                reason="monitor_path_boundary",
                via="exposes_data_to_network",
                visibility=vis,
            )
            # Path bridges between a hub member and this monitor target.
            for hub in members:
                if hub.role != "HUB":
                    continue
                fake = ControlPath(target=key, taught_via=hub.device_key)
                for bridge_key in _path_bridge_devices(fake, graph):
                    _add(
                        bridge_key,
                        depth=DEPTH_PROVENANCE,
                        reason="path_device",
                        via=f"{hub.device_key}->{key}",
                    )
        else:
            candidates_excluded.append(
                {
                    "device_key": key,
                    "side": "monitor_target",
                    "candidacy": "network_reachable_exposes_data",
                    "membership": "excluded",
                    "note": _CONFIG_LAYER_CANDIDATE_NOTE,
                }
            )

    # Flags attached to contributors
    contributor_keys = set(contributors)
    flags = [
        f
        for f in graph.flags
        if isinstance(f, dict)
        and (
            str(f.get("device") or "") in contributor_keys
            or str(f.get("platform_key") or "") in contributor_keys
            or any(
                d in contributor_keys for d in (f.get("applies_to") or [])
            )
        )
    ]

    return {
        "section_id": section_id,
        "member_keys_filter": list(member_keys) if member_keys is not None else None,
        "contributors": sorted(
            contributors.values(),
            key=lambda c: (
                {"full": 0, "summary": 1, "provenance": 2}.get(c["depth"], 9),
                c["device_key"],
            ),
        ),
        "present_platform_pages": present_pages,
        "candidates_excluded": candidates_excluded,
        "flags": flags,
        "principle": (
            "graph reachability establishes candidacy; "
            "documented visibility establishes membership"
        ),
    }


def keys_at_depth(inputs: dict[str, Any], depth: str) -> list[str]:
    return [
        str(c["device_key"])
        for c in (inputs.get("contributors") or [])
        if c.get("depth") == depth
    ]


def all_contributor_keys(inputs: dict[str, Any]) -> list[str]:
    return [str(c["device_key"]) for c in (inputs.get("contributors") or [])]


def _present_platform_pages(
    platform: ComputedDevice, graph: VesselGraphResult
) -> list[dict[str, Any]]:
    """Pages without a gate, or whose gate resolves on this vessel."""
    out: list[dict[str, Any]] = []
    profile = platform.profile
    pages = list(profile.get("ui_pages") or [])
    requires = [
        r for r in (profile.get("requires_devices") or []) if isinstance(r, dict)
    ]

    for page in pages:
        if not isinstance(page, dict):
            continue
        name = str(page.get("name") or "").strip()
        if not name:
            continue
        gate = page.get("appears_if_gate")
        if not gate:
            out.append(
                {
                    "name": name,
                    "present": True,
                    "reason": "ungated",
                    "platform_key": platform.device_key,
                }
            )
            continue
        # Gate present when any matching requires_devices row is satisfied.
        fc = ""
        if isinstance(gate, dict):
            fc = str(gate.get("functional_class") or "").strip()
        satisfied = False
        resolved_to: str | None = None
        for req in requires:
            if fc and str(req.get("functional_class") or "").strip() != fc:
                continue
            if req.get("satisfied"):
                satisfied = True
                resolved_to = str(req.get("resolved_to") or "") or None
                break
        # Fallback: resolve gate description against inventory when requires
        # rows were not annotated satisfied (e.g. stub platform merge).
        if not satisfied and isinstance(gate, dict):
            desc = str(
                gate.get("description_verbatim")
                or gate.get("verbatim")
                or ""
            )
            hit_key = _inventory_keyword_hit(desc, graph)
            if hit_key and fc != "supported_hvac":
                satisfied = True
                resolved_to = hit_key
            elif hit_key and fc == "supported_hvac":
                # AC-present ≠ CZone-supported HVAC — leave gated off unless
                # vessel row marks integration.
                row = graph.devices[hit_key].line_item
                integrated = bool(
                    row.get("czone_supported_hvac") is True
                    or row.get("hvac_czone_integrated") is True
                    or str(row.get("integration") or "").lower()
                    in {"czone", "czone_supported"}
                )
                if integrated:
                    satisfied = True
                    resolved_to = hit_key
        if satisfied:
            out.append(
                {
                    "name": name,
                    "present": True,
                    "reason": "gate_satisfied",
                    "functional_class": fc or None,
                    "resolved_to": resolved_to,
                    "platform_key": platform.device_key,
                }
            )
        else:
            out.append(
                {
                    "name": name,
                    "present": False,
                    "reason": "gate_unsatisfied",
                    "functional_class": fc or None,
                    "platform_key": platform.device_key,
                }
            )
    return [p for p in out if p.get("present")]


def _inventory_keyword_hit(desc: str, graph: VesselGraphResult) -> str | None:
    blob = desc.lower()
    if not blob:
        return None
    keywords = (
        ("combi", "mass_combi"),
        ("inverter/charger", "mass_combi"),
        ("inverter-charger", "mass_combi"),
        ("charger", "mass_combi"),
        ("inverter", "mass_combi"),
        ("mli", "mli"),
        ("aircon", "air"),
        ("air conditioner", "air"),
        ("hvac", "air"),
        ("acmi", "acmi"),
    )
    for needle, family in keywords:
        if needle not in blob:
            continue
        for key, device in graph.devices.items():
            text = " ".join(
                [
                    key.lower(),
                    str(device.line_item.get("model") or "").lower(),
                    str(device.line_item.get("description") or "").lower(),
                    str(device.line_item.get("manufacturer") or "").lower(),
                ]
            )
            if family == "air":
                if any(t in text for t in ("aircon", "air con", "hvac", "climate")):
                    return key
                continue
            if family in text or needle in text:
                return key
    return None


def _member_surface_docs(members: list[ComputedDevice]) -> list[dict[str, Any]]:
    """Documented active surfaces on section members (non-platform)."""
    out: list[dict[str, Any]] = []
    for device in members:
        if device.role == "PLATFORM":
            continue
        for surf in device.active_surfaces:
            if not isinstance(surf, dict):
                continue
            if surf.get("active") is False:
                continue
            label = str(surf.get("label_verbatim") or surf.get("surface") or "")
            out.append(
                {
                    "device_key": device.device_key,
                    "label": label,
                    "surface": surf.get("surface"),
                    "path": surf.get("path"),
                }
            )
    return out


def _visibility_for_candidate(
    key: str,
    device: ComputedDevice,
    *,
    present_pages: list[dict[str, Any]],
    member_surfaces: list[dict[str, Any]],
) -> str | None:
    """Return visibility reason string if candidate may enter summary depth."""
    text = " ".join(
        [
            key.lower(),
            str(device.line_item.get("model") or "").lower(),
            str(device.line_item.get("manufacturer") or "").lower(),
            str(device.line_item.get("description") or "").lower(),
            str(
                (device.profile.get("device") or {}).get("category_freeform") or ""
            ).lower(),
        ]
    )
    for page in present_pages:
        pname = str(page.get("name") or "").strip().lower()
        families: tuple[str, ...] = ()
        for page_key, fams in _PAGE_VISIBILITY_FAMILIES.items():
            if page_key in pname:
                families = fams
                break
        if not families:
            continue
        if any(fam in text for fam in families):
            return f"documented_present_platform_page:{page.get('name')}"

    # Documented member surface whose label mentions the candidate family.
    for surf in member_surfaces:
        label = str(surf.get("label") or "").lower()
        if not label:
            continue
        for fams in _PAGE_VISIBILITY_FAMILIES.values():
            if any(fam in text and fam in label for fam in fams):
                return (
                    f"documented_member_surface:"
                    f"{surf.get('device_key')}:{surf.get('label')}"
                )
    return None


def _shares_network(
    a: ComputedDevice, b: ComputedDevice, graph: VesselGraphResult
) -> bool:
    """True when a and b share a reachable network component."""
    from system_graph import _shares_reachable_network

    return _shares_reachable_network(a, b, graph.network_components)


def _path_bridge_devices(
    path: ControlPath, graph: VesselGraphResult
) -> list[str]:
    """BRIDGE devices that sit on networks connecting hub and target."""
    hub = graph.devices.get(path.taught_via)
    target = graph.devices.get(path.target)
    if not hub or not target:
        return []
    hub_nets = set(hub.normalized_speaks)
    target_nets = set(target.normalized_speaks)
    # Expand via bridge edges on BRIDGE devices.
    out: list[str] = []
    for key, device in graph.devices.items():
        if device.role != "BRIDGE":
            continue
        speaks = set(device.normalized_speaks)
        bridges = set(device.normalized_bridges)
        # Speaks both sides, or bridges between a hub net and a target net.
        if speaks & hub_nets and speaks & target_nets:
            out.append(key)
            continue
        for frm, to in bridges:
            if (frm in hub_nets and to in target_nets) or (
                to in hub_nets and frm in target_nets
            ):
                out.append(key)
                break
            # Bridge connects into a net the hub or target speaks.
            if (frm in hub_nets or to in hub_nets) and (
                frm in target_nets or to in target_nets or speaks & target_nets
            ):
                out.append(key)
                break
            if (frm in target_nets or to in target_nets) and (
                frm in hub_nets or to in hub_nets or speaks & hub_nets
            ):
                out.append(key)
                break
    return sorted(set(out))
