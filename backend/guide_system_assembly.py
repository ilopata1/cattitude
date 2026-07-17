"""Deterministic system-module assembly from equipment fragments.

Replaces blind ``sections.extend`` with:

1. **Primary home** — overlapping categories (notably ``electrical_dc``) map each
   device to one Know chapter when classification is confident.
2. **Guest skeleton** — within Electrical / Batteries, order contributions by a
   fixed role bucket list so hubs and day-to-day controls appear before
   distribution / charging / protection hardware.

This is the production preview of Stage 2.6 / Stage 4 in
``guide-pipeline-plan.md``. Interaction profiles and vessel graphs come later;
keyword tables here are intentionally small and unit-testable.
"""

from __future__ import annotations

from typing import Any

from guide_module_catalog import SYSTEM_CATALOG

# Systems that share equipment categories and therefore need home routing.
_OVERLAP_PAIR: tuple[str, str] = ("electrical", "batteries")

# Keywords scored against "manufacturer model" (lowercased).
# Higher-specificity phrases should be listed; first matching table wins via scores.
_BATTERIES_HOME_KEYWORDS: tuple[str, ...] = (
    "battery",
    "bms",
    "lithium",
    "mli",
    "charger",
    "inverter",
    "combi",
    "multiplus",
    "quattro",
    "alternator",
    "regulator",
    "balmar",
    "solar",
    "mppt",
    "smartsolar",
    "bluesolar",
    "wind generator",
    "silentwind",
    "shore power",  # often energy / input limit UI on inverter-chargers
    "genset",
    "generator",
    "dc-dc",
    "orrion",
    "fuel cell",
    "cerbo",
    "gx ",
    "hub-1",
    "hub 1",
)

_ELECTRICAL_HOME_KEYWORDS: tuple[str, ...] = (
    "busbar",
    "fuse",
    "class t",
    "breaker",
    "battery switch",
    "ml switch",
    "ml-remote",
    "digital switching",
    "output interface",
    "coi",
    "czone",
    "distribution",
    "isolation",
    "galvanic",
    "panel",
    "shore inlet",
    "ac inlet",
)

# Role buckets interior to a system module (ordered guest skeleton).
_SYSTEM_ROLE_SKELETONS: dict[str, list[dict[str, Any]]] = {
    "electrical": [
        {
            "id": "hub_controls",
            "title": "Controls & displays",
            "blurb": "How you switch and monitor loads day to day.",
            "keywords": (
                "czone",
                "touchscreen",
                "display",
                "panel",
                "control",
                "switchboard",
                "multi control",
            ),
        },
        {
            "id": "shore_power",
            "title": "Shore power",
            "blurb": "Connecting and managing shore AC.",
            "keywords": ("shore", "inlet", "ac input", "shore power"),
        },
        {
            "id": "distribution",
            "title": "Distribution & protection",
            "blurb": "Busbars, fuses, breakers, and isolation hardware.",
            "keywords": (
                "busbar",
                "fuse",
                "breaker",
                "class t",
                "ml switch",
                "isolation",
                "galvanic",
                "distribution",
                "coi",
            ),
        },
        {"id": "other", "title": None, "blurb": None, "keywords": ()},
    ],
    "batteries": [
        {
            "id": "monitoring",
            "title": "Monitoring the house bank",
            "blurb": "Where you read state of charge and alarms.",
            "keywords": ("bms", "cerbo", "gx", "monitor", "shunt", "hub"),
        },
        {
            "id": "storage",
            "title": "Batteries & BMS",
            "blurb": "The house bank and its protective BMS behaviour.",
            "keywords": ("battery", "lithium", "mli", "bms"),
        },
        {
            "id": "inverter_charger",
            "title": "Inverter / charger",
            "blurb": "Inverting and charging from shore or generator.",
            "keywords": (
                "inverter",
                "charger",
                "combi",
                "multiplus",
                "quattro",
                "mass combi",
            ),
        },
        {
            "id": "charge_sources",
            "title": "Other charging sources",
            "blurb": "Solar, wind, and alternator regulators.",
            "keywords": (
                "solar",
                "mppt",
                "smartsolar",
                "wind",
                "silentwind",
                "alternator",
                "regulator",
                "balmar",
                "dc-dc",
            ),
        },
        {
            "id": "protection",
            "title": "Protective devices",
            "blurb": "Disconnects and fuses that guard the bank.",
            "keywords": ("fuse", "class t", "ml switch", "protect"),
        },
        {"id": "other", "title": None, "blurb": None, "keywords": ()},
    ],
}


def _label_text(row: dict[str, Any]) -> str:
    parts = [
        str(row.get("manufacturer") or "").strip(),
        str(row.get("model") or "").strip(),
    ]
    return " ".join(p for p in parts if p).strip().lower()


def _keyword_hits(text: str, keywords: tuple[str, ...]) -> int:
    return sum(1 for key in keywords if key in text)


def primary_system_for_equipment(row: dict[str, Any]) -> str | None:
    """Confident primary Know chapter, or None when category membership alone applies.

    Only resolves the Electrical ↔ Batteries overlap today. Other categories keep
    the catalog's multi-system membership (usually a single system).
    """
    category = row.get("system_category") or ""
    if category not in ("electrical_dc", "electrical_ac_shore_power"):
        return None
    if category == "electrical_ac_shore_power":
        return "electrical"

    text = _label_text(row)
    if not text:
        return None

    batteries_score = _keyword_hits(text, _BATTERIES_HOME_KEYWORDS)
    electrical_score = _keyword_hits(text, _ELECTRICAL_HOME_KEYWORDS)
    if batteries_score == 0 and electrical_score == 0:
        return None
    if batteries_score > electrical_score:
        return "batteries"
    if electrical_score > batteries_score:
        return "electrical"
    # Tie: prefer batteries for charge/storage phrasing already half-matched;
    # otherwise leave unclassified so legacy dual membership remains.
    if batteries_score and electrical_score:
        return None
    return None


def equipment_belongs_on_system(row: dict[str, Any], system_id: str) -> bool:
    """Whether linked equipment should count toward / contribute to a system."""
    meta = SYSTEM_CATALOG.get(system_id) or {}
    categories = meta.get("equipment_categories") or []
    if not categories:
        return True
    if row.get("system_category") not in categories:
        return False
    primary = primary_system_for_equipment(row)
    if primary is None:
        return True
    return primary == system_id


def draft_target_systems(
    category: str,
    *,
    manufacturer: str = "",
    model: str = "",
) -> list[str]:
    """System ids to draft fragment prose into for this equipment model."""
    row = {
        "system_category": category,
        "manufacturer": manufacturer,
        "model": model,
    }
    primary = primary_system_for_equipment(row)
    if primary:
        return [primary]
    return [
        system_id
        for system_id, meta in SYSTEM_CATALOG.items()
        if category in (meta.get("equipment_categories") or [])
    ]


def _role_for_contribution(system_id: str, row: dict[str, Any]) -> str:
    skeleton = _SYSTEM_ROLE_SKELETONS.get(system_id)
    if not skeleton:
        return "other"
    text = _label_text(row)
    best_id = "other"
    best_hits = 0
    for bucket in skeleton:
        if bucket["id"] == "other":
            continue
        hits = _keyword_hits(text, bucket.get("keywords") or ())
        if hits > best_hits:
            best_hits = hits
            best_id = bucket["id"]
    return best_id


def _pick_system_entry(
    row: dict[str, Any], system_id: str
) -> dict[str, Any] | None:
    """Fragment entry for this system, with legacy dual-dump recovery."""
    if not equipment_belongs_on_system(row, system_id):
        return None

    sections_map = (row.get("fragment") or {}).get("system_sections") or {}
    entry = sections_map.get(system_id)
    if isinstance(entry, dict) and entry.get("sections"):
        return entry

    primary = primary_system_for_equipment(row)
    if primary != system_id:
        return None

    # Legacy fragments often wrote energy gear into electrical only (or both).
    # When this system is the primary home, accept the overlap partner's copy.
    alt = _OVERLAP_PAIR[1] if system_id == _OVERLAP_PAIR[0] else _OVERLAP_PAIR[0]
    if system_id in _OVERLAP_PAIR:
        entry = sections_map.get(alt)
        if isinstance(entry, dict) and entry.get("sections"):
            return entry
    return None


def _device_heading(row: dict[str, Any]) -> dict[str, Any]:
    manufacturer = str(row.get("manufacturer") or "").strip()
    model = str(row.get("model") or "").strip()
    label = " ".join(p for p in (manufacturer, model) if p) or "Equipment"
    return {
        "t": label,
        "type": "prose",
        "c": f"Guest procedures for the {label} on this vessel.",
    }


def _bucket_heading(bucket: dict[str, Any]) -> dict[str, Any]:
    return {
        "t": bucket["title"],
        "type": "prose",
        "c": bucket.get("blurb") or "",
    }


def assemble_system_from_fragments(
    system_id: str, fragment_rows: list[dict[str, Any]]
) -> dict[str, Any] | None:
    """Assemble a system module payload from equipment fragments, or None.

    Equipment without a usable entry for this system contributes nothing.
    Multi-equipment modules are ordered by the guest skeleton for Electrical
    and Batteries; other systems keep stable manufacturer/model order with
    per-device headings when more than one device contributes.
    """
    contributions: list[tuple[dict[str, Any], dict[str, Any], str]] = []
    for row in fragment_rows:
        entry = _pick_system_entry(row, system_id)
        if entry is None:
            continue
        role = _role_for_contribution(system_id, row)
        contributions.append((row, entry, role))

    if not contributions:
        return None

    payload: dict[str, Any] = {"id": system_id, "sections": []}
    learn_checks: list[str] = []
    multi = len(contributions) > 1
    skeleton = _SYSTEM_ROLE_SKELETONS.get(system_id)

    def _absorb_meta(entry: dict[str, Any]) -> None:
        if not payload.get("subtitle") and entry.get("subtitle"):
            payload["subtitle"] = entry["subtitle"]
        if not payload.get("summary") and entry.get("summary"):
            payload["summary"] = entry["summary"]
        for check in entry.get("learnChecks") or []:
            if check not in learn_checks:
                learn_checks.append(check)

    if skeleton:
        role_order = [bucket["id"] for bucket in skeleton]
        buckets_by_id = {bucket["id"]: bucket for bucket in skeleton}
        for role_id in role_order:
            role_rows = [c for c in contributions if c[2] == role_id]
            if not role_rows:
                continue
            bucket = buckets_by_id[role_id]
            if multi and bucket.get("title"):
                payload["sections"].append(_bucket_heading(bucket))
            for row, entry, _role in role_rows:
                _absorb_meta(entry)
                if multi:
                    payload["sections"].append(_device_heading(row))
                payload["sections"].extend(entry["sections"])
    else:
        for row, entry, _role in contributions:
            _absorb_meta(entry)
            if multi:
                payload["sections"].append(_device_heading(row))
            payload["sections"].extend(entry["sections"])

    if learn_checks:
        payload["learnChecks"] = learn_checks
    return payload
