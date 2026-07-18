"""Channel-map circuit inventory helpers for Stage 4 Controls.

Loads adjudicated ``channel_entries`` from the vessel equipment doc / artifact
store. OPT/CUS rows are asserted only when inventory-corroborated; otherwise
they are ``context_shaping``.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from vessel_evidence import default_artifact_store_root

CITATION = (
    "Owners' manual 55N60 p46 C-ZONE CHANELS Ind C 05/05/2026"
)

# Loose inventory corroboration tokens for OPT/CUS fitted assertion.
_CORROBORATION: list[tuple[str, re.Pattern[str]]] = [
    ("combi", re.compile(r"combi|inverter.?charg", re.I)),
    ("windlass", re.compile(r"windlass|guindeau", re.I)),
    ("winch", re.compile(r"\bwinch\b", re.I)),
    ("freezer", re.compile(r"freezer|conservateur", re.I)),
    ("radar", re.compile(r"\bradar\b", re.I)),
    ("wifi", re.compile(r"\bwifi\b|wi-?fi", re.I)),
    ("watermaker", re.compile(r"watermaker|dessalin", re.I)),
    ("washing", re.compile(r"washing|lave.?linge", re.I)),
    ("dryer", re.compile(r"dryer|seche.?linge|sèche", re.I)),
    ("hifi", re.compile(r"\bhifi\b|hi-?fi", re.I)),
    ("climate", re.compile(r"clim|air.?cond|hvac", re.I)),
    ("solar", re.compile(r"solar|mppt|panneau", re.I)),
    ("zeus", re.compile(r"\bzeus\b", re.I)),
]


def load_channel_map_payload(
    equipment_doc: dict[str, Any] | None,
) -> dict[str, Any] | None:
    """Return adjudicated channel_map JSON from vessel_facts or artifact store."""
    doc = equipment_doc or {}
    for fact in doc.get("vessel_facts") or []:
        if not isinstance(fact, dict):
            continue
        if fact.get("provenance_tier") != "channel_map" and fact.get(
            "source_class"
        ) != "channel_map":
            continue
        if isinstance(fact.get("channel_entries"), list):
            return {
                "channel_entries": list(fact["channel_entries"]),
                "device_locations": list(fact.get("device_locations") or []),
                "document": dict(fact.get("document_citation_fields") or {}),
                "_fact_id": fact.get("id"),
            }
        rel = str(fact.get("extract_path") or "").strip()
        if rel:
            root = default_artifact_store_root(doc)
            path = root / rel
            if path.is_file():
                return json.loads(path.read_text(encoding="utf-8"))
    # Convention: promoted extract beside the PDF
    root = default_artifact_store_root(doc)
    path = root / "channel_map_extract.json"
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8"))
    return None


def _inventory_blob(equipment_doc: dict[str, Any] | None) -> str:
    parts: list[str] = []
    for row in (equipment_doc or {}).get("equipment") or []:
        if not isinstance(row, dict):
            continue
        for k in ("device_key", "model", "description", "manufacturer"):
            parts.append(str(row.get(k) or ""))
        for inst in row.get("instances") or []:
            if isinstance(inst, dict):
                parts.append(str(inst.get("instance_label") or ""))
    for note in (equipment_doc or {}).get("installation_notes") or []:
        if isinstance(note, dict):
            parts.append(str(note.get("note") or ""))
    return " | ".join(parts)


def circuit_is_corroborated(
    entry: dict[str, Any], inventory_blob: str
) -> bool:
    flag = str(entry.get("option_flag") or "STD").upper()
    if flag in {"STD", ""}:
        return True
    en = str(entry.get("circuit_name_en") or "")
    fr = str(entry.get("circuit_name_fr") or "")
    text = f"{en} {fr}"
    for _label, pat in _CORROBORATION:
        if pat.search(text) and pat.search(inventory_blob):
            return True
    return False


def assertable_circuits(
    equipment_doc: dict[str, Any] | None,
    *,
    include_empty: bool = False,
) -> dict[str, Any]:
    """Split channel entries into asserted vs context_shaping (OPT/CUS)."""
    payload = load_channel_map_payload(equipment_doc)
    if not payload:
        return {
            "sourced": False,
            "asserted": [],
            "context_shaping": [],
            "citation": None,
            "device_locations": [],
        }
    inventory = _inventory_blob(equipment_doc)
    asserted: list[dict[str, Any]] = []
    shaping: list[dict[str, Any]] = []
    for row in payload.get("channel_entries") or []:
        if not isinstance(row, dict):
            continue
        if row.get("empty_row") and not include_empty:
            continue
        en = str(row.get("circuit_name_en") or "").strip()
        fr = str(row.get("circuit_name_fr") or "").strip()
        if not en and not fr:
            continue
        item = dict(row)
        item["display_name"] = en or fr
        flag = str(row.get("option_flag") or "STD").upper()
        if flag in {"OPT", "CUS"} and not circuit_is_corroborated(row, inventory):
            item["render_as"] = "context_shaping"
            shaping.append(item)
        else:
            item["render_as"] = "asserted"
            asserted.append(item)
    return {
        "sourced": True,
        "asserted": asserted,
        "context_shaping": shaping,
        "citation": CITATION,
        "device_locations": list(payload.get("device_locations") or []),
        "artifact_id": "channel_map_czone_chanels_ind_c",
    }


def control_page_circuit_names(
    circuits: dict[str, Any], *, limit: int = 12
) -> list[str]:
    """English names for Control-page prose (STD / corroborated first)."""
    names: list[str] = []
    seen: set[str] = set()
    for row in circuits.get("asserted") or []:
        # Prefer switched outputs over analogue / supply feeders for Control page
        ref = str(row.get("channel_ref") or "")
        block = str(row.get("current_block") or "")
        if block == "analogue_input" or "-A" in ref:
            continue
        if ref.startswith("DCD") and any(
            x in ref for x in ("-E", "-S", "-01", "-02")
        ):
            # high-level feeders — skip for named circuit list
            if "COI" in str(row.get("circuit_name_en") or "") or "OI N" in str(
                row.get("circuit_name_en") or ""
            ):
                continue
        name = str(row.get("display_name") or "").strip()
        if not name or name.lower() in seen:
            continue
        # Drop OPT token noise for display
        name = re.sub(r"^\[OPT\]\s*", "", name)
        name = re.sub(r"^\[CUS\]\s*", "", name)
        if name.lower() in seen:
            continue
        seen.add(name.lower())
        names.append(name)
        if len(names) >= limit:
            break
    return names
