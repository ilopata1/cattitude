"""Network edge provenance tiers (v4.4a).

Bridge / speaks edges carry one of:
  self_claimed | diagram_inference | counterpart_claim | commissioning_artifact

Strength (strong → weak): self_claimed < counterpart_claim <
commissioning_artifact < diagram_inference.
"""

from __future__ import annotations

import re
from typing import Any

EDGE_PROVENANCE_TIERS = (
    "self_claimed",
    "diagram_inference",
    "counterpart_claim",
    "commissioning_artifact",
)

# Lower = stronger.
EDGE_PROVENANCE_STRENGTH: dict[str, int] = {
    "self_claimed": 0,
    "counterpart_claim": 1,
    "commissioning_artifact": 2,
    "diagram_inference": 3,
}

_CZONE_INTERFACE_RE = re.compile(
    r"(?i)("
    r"CZone\s+enabled|CZone\s+network|CZone\s+communication|"
    r"MasterBus\s*/\s*CZone|MasterBus/CZone|CZone/MB|CZone\s+integration|"
    r"Adding the .{0,40} to a CZone|connect(?:ed)? to (?:a )?CZone|"
    r"CZone®?\s+Configuration\s+Tool|\bCZone\b"
    r")"
)


def normalize_edge_provenance(value: str | None) -> str:
    v = (value or "").strip().lower()
    if v in EDGE_PROVENANCE_STRENGTH:
        return v
    return "self_claimed"


def weakest_provenance(tiers: list[str]) -> str | None:
    if not tiers:
        return None
    return max(
        (normalize_edge_provenance(t) for t in tiers),
        key=lambda t: EDGE_PROVENANCE_STRENGTH.get(t, 99),
    )


def annotate_self_claimed_networks(profile: dict[str, Any]) -> dict[str, Any]:
    """Default extracted speaks/bridges to self_claimed when unset."""
    out = dict(profile)
    networks = dict(out.get("networks") or {})
    speaks = []
    for s in networks.get("speaks") or []:
        if not isinstance(s, dict):
            continue
        entry = dict(s)
        if not str(entry.get("edge_provenance") or "").strip():
            entry["edge_provenance"] = "self_claimed"
        speaks.append(entry)
    bridges = []
    for b in networks.get("bridges") or []:
        if not isinstance(b, dict):
            continue
        entry = dict(b)
        if not str(entry.get("edge_provenance") or "").strip():
            entry["edge_provenance"] = "self_claimed"
        bridges.append(entry)
    networks["speaks"] = speaks
    networks["bridges"] = bridges
    out["networks"] = networks
    return out


def apply_counterpart_network_claims(
    profiles: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """Scan profiles for CZone-interface self-claims; tag counterpart edges.

    When a Mastervolt device's manual grounds CZone membership, any
    ``diagram_inference`` MasterBus↔CZone bridge on another profile gains a
    ``counterpart_claim`` provenance note (does not silently upgrade to
    self_claimed).
    """
    out = {k: dict(v) for k, v in profiles.items()}
    claimants: list[tuple[str, str]] = []  # (device_key, note)

    for key, profile in out.items():
        blob_parts: list[str] = []
        for e in profile.get("evidence") or []:
            if isinstance(e, dict):
                blob_parts.append(str(e.get("manual_section") or ""))
                blob_parts.append(str(e.get("note") or ""))
        for s in (profile.get("networks") or {}).get("speaks") or []:
            if isinstance(s, dict):
                blob_parts.append(str(s.get("name_verbatim") or ""))
                blob_parts.append(str(s.get("note") or ""))
        blob = "\n".join(blob_parts)
        speaks = (profile.get("networks") or {}).get("speaks") or []
        has_czone = any(
            isinstance(s, dict)
            and "czone" in str(s.get("name_verbatim") or "").lower()
            and normalize_edge_provenance(s.get("edge_provenance"))
            in {"self_claimed", ""}
            and str(s.get("derived_from") or "") != "excerpt_bridge_label"
            for s in speaks
        )
        if has_czone and _CZONE_INTERFACE_RE.search(blob):
            note = "CZone interface referenced in profile evidence/speaks"
            if re.search(r"(?i)firmware update|next major firmware", blob):
                note += " (firmware-generation caveat in manual)"
            claimants.append((key, note))
            # Mark this device's CZone speak as self_claimed (manual of record).
            nets = dict(profile.get("networks") or {})
            new_speaks = []
            for s in nets.get("speaks") or []:
                if not isinstance(s, dict):
                    continue
                entry = dict(s)
                if "czone" in str(entry.get("name_verbatim") or "").lower():
                    entry["edge_provenance"] = "self_claimed"
                    entry["counterpart_note"] = note
                elif not str(entry.get("edge_provenance") or "").strip():
                    entry["edge_provenance"] = "self_claimed"
                new_speaks.append(entry)
            nets["speaks"] = new_speaks
            out[key] = {**profile, "networks": nets}

    if not claimants:
        return out

    for key, profile in list(out.items()):
        # Don't treat a device as its own counterpart.
        foreign = [(ck, note) for ck, note in claimants if ck != key]
        if not foreign:
            continue
        nets = dict(profile.get("networks") or {})
        bridges = []
        changed = False
        for b in nets.get("bridges") or []:
            if not isinstance(b, dict):
                continue
            entry = dict(b)
            frm = str(entry.get("from") or "").lower()
            to = str(entry.get("to") or "").lower()
            is_mb_czone = (
                ("masterbus" in frm and "czone" in to)
                or ("czone" in frm and "masterbus" in to)
            )
            if (
                is_mb_czone
                and normalize_edge_provenance(entry.get("edge_provenance"))
                == "diagram_inference"
            ):
                entry["counterpart_sources"] = [
                    {"device_key": ck, "note": note} for ck, note in foreign
                ]
                entry["edge_provenance_secondary"] = "counterpart_claim"
                changed = True
            bridges.append(entry)
        if changed:
            nets["bridges"] = bridges
            out[key] = {**profile, "networks": nets}
    return out
