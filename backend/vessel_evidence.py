"""Vessel evidence artifact store + evidence_unattached validation.

Inspection-tier human-entered facts (physical_inspection / walkthrough) must
cite resolvable artifact ids in the vessel artifact store. Facts without a
resolvable reference receive warning flag ``evidence_unattached``.

Human-entered facts split into:
  - observation — what was seen (panel placement, shading geometry)
  - entered_inference — owner/operator conclusion (e.g. yield may drop)
Composition may render reduced-confidence facts, but composed_inference may
only build on facts with attached evidence or document citations.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

# Provenance tiers that require a resolvable evidence artifact reference.
INSPECTION_TIERS = frozenset(
    {
        "physical_inspection",
        "walkthrough",
        "owner_walkthrough",
        "owner_screen_walkthrough",
    }
)

# Tiers that count as document/survey citations (OK without photo artifact).
DOCUMENT_TIERS = frozenset(
    {
        "owner_survey",
        "array_inventory",
        "document",
        "schematic",
        "commissioning_artifact",
        "manual",
    }
)


def default_artifact_store_root(equipment_doc: dict[str, Any] | None = None) -> Path:
    """Resolve artifact store directory for a vessel fixture doc."""
    doc = equipment_doc or {}
    explicit = doc.get("artifact_store_path")
    if explicit:
        return Path(str(explicit))
    backend = Path(__file__).resolve().parent
    vessel = str(doc.get("vessel") or "outremer_55n60")
    folder = "outremer" if "outremer" in vessel else vessel
    return backend / "fixtures" / "pipeline" / folder / "artifacts"


def load_artifact_manifest(
    store_root: Path | None = None,
    *,
    equipment_doc: dict[str, Any] | None = None,
) -> dict[str, dict[str, Any]]:
    """Return artifact_id -> metadata; files on disk must exist when path set."""
    import json

    root = store_root or default_artifact_store_root(equipment_doc)
    manifest_path = root / "manifest.json"
    by_id: dict[str, dict[str, Any]] = {}
    if manifest_path.is_file():
        raw = json.loads(manifest_path.read_text(encoding="utf-8"))
        for row in raw.get("artifacts") or []:
            if not isinstance(row, dict):
                continue
            aid = str(row.get("id") or "").strip()
            if not aid:
                continue
            entry = dict(row)
            rel = str(row.get("path") or "").strip()
            if rel:
                entry["resolved_path"] = str((root / rel).resolve())
                entry["exists"] = (root / rel).is_file()
            else:
                entry["exists"] = False
            by_id[aid] = entry
    for row in (equipment_doc or {}).get("artifacts") or []:
        if not isinstance(row, dict):
            continue
        aid = str(row.get("id") or "").strip()
        if aid and aid not in by_id:
            by_id[aid] = dict(row)
            by_id[aid].setdefault("exists", True)
    return by_id


def artifact_resolvable(
    artifact_id: str,
    catalog: dict[str, dict[str, Any]],
) -> bool:
    aid = str(artifact_id or "").strip()
    if not aid:
        return False
    key = aid.removeprefix("artifact:")
    row = catalog.get(key) or catalog.get(aid)
    if not row:
        return False
    if "exists" in row:
        return bool(row["exists"])
    return True


def iter_vessel_facts(equipment_doc: dict[str, Any] | None) -> list[dict[str, Any]]:
    """Normalize vessel_facts + legacy installation_notes into fact rows."""
    doc = equipment_doc or {}
    facts: list[dict[str, Any]] = []
    for row in doc.get("vessel_facts") or []:
        if isinstance(row, dict):
            facts.append(dict(row))
    if not doc.get("vessel_facts"):
        for i, row in enumerate(doc.get("installation_notes") or []):
            if not isinstance(row, dict):
                continue
            source = str(row.get("source") or "").lower()
            tier = str(row.get("provenance_tier") or "").strip()
            if not tier:
                if "inspection" in source or "photo" in source or "walkthrough" in source:
                    tier = "physical_inspection"
                elif "survey" in source or "inventory" in source:
                    tier = "owner_survey"
                else:
                    tier = "document"
            facts.append(
                {
                    "id": str(row.get("id") or f"installation_note_{i}"),
                    "kind": row.get("kind") or "observation",
                    "provenance_tier": tier,
                    "evidence_refs": list(row.get("evidence_refs") or []),
                    "applies_to": list(row.get("applies_to") or []),
                    "text": str(row.get("note") or row.get("text") or ""),
                    "source": row.get("source"),
                    "legacy_installation_note": True,
                }
            )
    return facts


def fact_has_attached_evidence(
    fact: dict[str, Any],
    catalog: dict[str, dict[str, Any]],
) -> bool:
    """True when fact has resolvable artifact refs OR a document-tier citation."""
    tier = str(fact.get("provenance_tier") or "").strip().lower()
    refs = [
        str(r).strip()
        for r in (fact.get("evidence_refs") or [])
        if str(r).strip()
    ]
    if refs and all(artifact_resolvable(r, catalog) for r in refs):
        return True
    if tier in DOCUMENT_TIERS and (
        str(fact.get("source") or "").strip()
        or str(fact.get("document_citation") or "").strip()
    ):
        return True
    return False


def validate_evidence_attachments(
    equipment_doc: dict[str, Any] | None,
    *,
    store_root: Path | None = None,
) -> list[dict[str, Any]]:
    """Return warning flags for inspection-tier facts lacking evidence refs."""
    doc = equipment_doc or {}
    catalog = load_artifact_manifest(store_root, equipment_doc=doc)
    flags: list[dict[str, Any]] = []
    for fact in iter_vessel_facts(doc):
        tier = str(fact.get("provenance_tier") or "").strip().lower()
        if tier not in INSPECTION_TIERS:
            continue
        if fact_has_attached_evidence(fact, catalog):
            continue
        flags.append(
            {
                "flag": "evidence_unattached",
                "severity": "warning",
                "fact_id": fact.get("id"),
                "provenance_tier": tier,
                "device": (fact.get("applies_to") or [None])[0],
                "applies_to": list(fact.get("applies_to") or []),
                "detail": (
                    f"inspection-tier fact {fact.get('id')!r} lacks resolvable "
                    f"evidence artifact reference"
                ),
            }
        )
    return flags


def annotate_facts_with_evidence(
    equipment_doc: dict[str, Any] | None,
    *,
    store_root: Path | None = None,
) -> list[dict[str, Any]]:
    """Return vessel facts with ``evidence_attached`` bool annotated."""
    doc = equipment_doc or {}
    catalog = load_artifact_manifest(store_root, equipment_doc=doc)
    out: list[dict[str, Any]] = []
    unattached_ids = {
        str(f.get("fact_id"))
        for f in validate_evidence_attachments(doc, store_root=store_root)
    }
    for fact in iter_vessel_facts(doc):
        row = dict(fact)
        fid = str(row.get("id") or "")
        tier = str(row.get("provenance_tier") or "").strip().lower()
        if tier in INSPECTION_TIERS:
            row["evidence_attached"] = fid not in unattached_ids and fact_has_attached_evidence(
                row, catalog
            )
        else:
            row["evidence_attached"] = fact_has_attached_evidence(row, catalog) or (
                tier in DOCUMENT_TIERS
            )
        row["reduced_confidence"] = tier in INSPECTION_TIERS and not row[
            "evidence_attached"
        ]
        out.append(row)
    return out


def contributing_facts_ok_for_inference(
    fact_ids: list[str],
    annotated_facts: list[dict[str, Any]],
) -> tuple[bool, list[str]]:
    """composed_inference may only build on attached-evidence / document facts."""
    by_id = {str(f.get("id")): f for f in annotated_facts}
    bad: list[str] = []
    for fid in fact_ids:
        if fid.startswith("fact:") and fid not in by_id:
            continue
        row = by_id.get(fid)
        if row is None:
            continue
        if row.get("reduced_confidence") or (
            str(row.get("provenance_tier") or "").lower() in INSPECTION_TIERS
            and not row.get("evidence_attached")
        ):
            bad.append(fid)
    return (len(bad) == 0, bad)


def merge_evidence_flags_into_graph_flags(
    graph_flags: list[dict[str, Any]],
    evidence_flags: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    out = [dict(f) for f in graph_flags if isinstance(f, dict)]
    seen = {(f.get("flag"), f.get("fact_id"), f.get("device")) for f in out}
    for f in evidence_flags:
        key = (f.get("flag"), f.get("fact_id"), f.get("device"))
        if key in seen:
            continue
        out.append(dict(f))
        seen.add(key)
    return out


def retrofit_solar_vessel_facts_template() -> list[dict[str, Any]]:
    """Canonical post-retrofit solar vessel_facts (observation / inference split)."""
    return [
        {
            "id": "solar_davit_array_observation",
            "kind": "observation",
            "provenance_tier": "physical_inspection",
            "evidence_refs": ["photo_davit_array"],
            "applies_to": ["victron_mppt_150_60"],
            "text": (
                "Davit-mounted array: 3× rigid panels feeding the davit array "
                "controller (SmartSolar MPPT 150/60)."
            ),
        },
        {
            "id": "solar_coachroof_array_observation",
            "kind": "observation",
            "provenance_tier": "physical_inspection",
            "evidence_refs": ["photo_coachroof_boom"],
            "applies_to": ["victron_mppt"],
            "text": (
                "Coachroof array: 6× semi-flex panels; boom geometry can cast "
                "shade across that array (visible in deck photo)."
            ),
        },
        {
            "id": "solar_array_wattage_inventory",
            "kind": "observation",
            "provenance_tier": "owner_survey",
            "document_citation": "owner survey / array inventory",
            "source": "owner survey / array inventory",
            "evidence_refs": [],
            "applies_to": ["victron_mppt_150_60", "victron_mppt"],
            "text": (
                "Array nameplate inventory: davit ~1.0–1.2 kW primary; "
                "coachroof ~600 W."
            ),
            "wattage_kw": {"davit_min": 1.0, "davit_max": 1.2, "coachroof": 0.6},
        },
        {
            "id": "solar_coachroof_yield_inference",
            "kind": "entered_inference",
            "provenance_tier": "physical_inspection",
            "evidence_refs": ["photo_coachroof_boom"],
            "depends_on": ["solar_coachroof_array_observation"],
            "applies_to": ["victron_mppt"],
            "text": (
                "Expect lower coachroof contribution when the boom shades "
                "those panels."
            ),
        },
    ]


def founding_dangling_shading_fact() -> dict[str, Any]:
    """Founding fixture row: inspection-tier shading with dangling citation."""
    return {
        "id": "solar_shading_dangling",
        "kind": "observation",
        "provenance_tier": "physical_inspection",
        "evidence_refs": [],
        "source": "inspection photos",
        "applies_to": ["victron_mppt_150_60", "victron_mppt"],
        "text": (
            "Solar array shading observed in inspection photos — "
            "operator monitoring context."
        ),
    }
