"""Evidence-shaped network bridge fills from routed excerpts (v4.4).

When a manual diagram/caption explicitly names a CZone↔MasterBus bridge
(and that text is already routed), record speaks + bridges. Never invent a
bridge from brand knowledge alone.
"""

from __future__ import annotations

import re
from typing import Any

# Diagram / caption labels seen on CZone COI system-example pages.
_CZONE_MASTERBUS_BRIDGE_RE = re.compile(
    r"(?i)("
    r"CZone\s*[-/]\s*MasterBus\s+Bridge|"
    r"CZone/Masterbus\s+Bridge|"
    r"MasterBus\s+Bridge\s+Interface|"
    r"CZone\s*[-–]\s*MasterBus\s+Bridge\s+Interface"
    r")"
)

_MASTERBUS_TOKEN_RE = re.compile(r"(?i)\bMaster\s*-?\s*Bus\b|\bMbus\b|\bMasterbus\b")
_CZONE_TOKEN_RE = re.compile(r"(?i)\bCZone\b")
_NMEA_TOKEN_RE = re.compile(r"(?i)\bNMEA\s*2000\b|\bN2K\b")


def _excerpt_blob(excerpts: list[dict[str, Any]] | list[str] | None) -> str:
    parts: list[str] = []
    for item in excerpts or []:
        if isinstance(item, str):
            parts.append(item)
        elif isinstance(item, dict):
            parts.append(str(item.get("text") or ""))
            parts.append(str(item.get("source_heading_guess") or ""))
    return "\n".join(parts)


def _has_speak(speaks: list[dict[str, Any]], needle: str) -> bool:
    n = needle.lower().replace(" ", "")
    for s in speaks:
        if not isinstance(s, dict):
            continue
        name = str(s.get("name_verbatim") or "").lower().replace(" ", "").replace("-", "")
        if n in name or name in n:
            return True
    return False


def _has_bridge(bridges: list[dict[str, Any]], a: str, b: str) -> bool:
    aa, bb = a.lower(), b.lower()
    for br in bridges:
        if not isinstance(br, dict):
            continue
        frm = str(br.get("from") or "").lower()
        to = str(br.get("to") or "").lower()
        if {frm, to} == {aa, bb} or (
            aa in frm and bb in to
        ) or (bb in frm and aa in to):
            return True
    return False


def apply_network_bridges_from_excerpts(
    profile: dict[str, Any],
    excerpts: list[dict[str, Any]] | list[str] | None,
) -> dict[str, Any]:
    """Fill MasterBus↔CZone bridge when diagram labels are routed."""
    blob = _excerpt_blob(excerpts)
    if not blob or not _CZONE_MASTERBUS_BRIDGE_RE.search(blob):
        return profile
    if not (_MASTERBUS_TOKEN_RE.search(blob) and _CZONE_TOKEN_RE.search(blob)):
        return profile

    out = dict(profile)
    networks = dict(out.get("networks") or {})
    speaks = [
        dict(s) for s in (networks.get("speaks") or []) if isinstance(s, dict)
    ]
    bridges = [
        dict(b) for b in (networks.get("bridges") or []) if isinstance(b, dict)
    ]

    added_speaks: list[str] = []
    if not _has_speak(speaks, "MasterBus"):
        speaks.append(
            {
                "name_verbatim": "MasterBus",
                "physical_or_wireless": "wired",
                "source": "derived",
                "derived_from": "excerpt_bridge_label",
                "edge_provenance": "diagram_inference",
            }
        )
        added_speaks.append("MasterBus")
    if not _has_speak(speaks, "CZone"):
        # Prefer CZone (matches vessel hub + diagram "CZone/Masterbus Bridge").
        # Keep any existing NMEA 2000 row as well.
        speaks.append(
            {
                "name_verbatim": "CZone",
                "physical_or_wireless": "wired",
                "source": "derived",
                "derived_from": "excerpt_bridge_label",
                "edge_provenance": "diagram_inference",
            }
        )
        added_speaks.append("CZone")
    if _NMEA_TOKEN_RE.search(blob) and not _has_speak(speaks, "NMEA 2000"):
        speaks.append(
            {
                "name_verbatim": "NMEA 2000",
                "physical_or_wireless": "wired",
                "source": "derived",
                "derived_from": "excerpt_bridge_label",
                "edge_provenance": "diagram_inference",
            }
        )
        added_speaks.append("NMEA 2000")

    # Ensure diagram-inferred speaks already present get the weak tier if derived.
    for s in speaks:
        if str(s.get("derived_from") or "") == "excerpt_bridge_label":
            s["edge_provenance"] = "diagram_inference"

    added_bridge = False
    if not _has_bridge(bridges, "MasterBus", "CZone"):
        bridges.append(
            {
                "from": "MasterBus",
                "to": "CZone",
                "edge_provenance": "diagram_inference",
                "note": (
                    "SYSTEM EXAMPLE diagram labels a CZone/Masterbus Bridge "
                    "(SKU 80-911-0072-00) — may be a separate module from COI; "
                    "diagram_inference only"
                ),
            }
        )
        added_bridge = True
    else:
        for b in bridges:
            frm = str(b.get("from") or "").lower()
            to = str(b.get("to") or "").lower()
            if ("masterbus" in frm and "czone" in to) or (
                "czone" in frm and "masterbus" in to
            ):
                if not str(b.get("edge_provenance") or "").strip():
                    b["edge_provenance"] = "diagram_inference"

    networks["speaks"] = speaks
    networks["bridges"] = bridges
    out["networks"] = networks

    if added_speaks or added_bridge:
        evidence = [
            dict(e) for e in (out.get("evidence") or []) if isinstance(e, dict)
        ]
        note = (
            "Routed system-example diagram labels CZone/MasterBus bridge "
            f"(added speaks={added_speaks or '—'}; bridge={added_bridge}; "
            "edge_provenance=diagram_inference)"
        )
        if not any("MasterBus" in str(e.get("note") or "") for e in evidence):
            evidence.append(
                {
                    "supports_field": "networks.bridges",
                    "manual_section": "SYSTEM EXAMPLE — CZone COI & Masterbus",
                    "note": note[:240],
                }
            )
            out["evidence"] = evidence[:8]
    return out
