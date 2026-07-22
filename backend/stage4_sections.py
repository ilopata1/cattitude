"""Phase 1 harness: compose frozen Stage 4 sections and build SystemModules.

One code path shared by the verifier and the ingest command. Given a vessel
fixture directory (``fixtures/pipeline/<vessel>``) it:
  * builds the vessel graph,
  * runs each frozen ``compose_*_section`` composer,
  * transforms the output into a live ``SystemModule`` (via
    ``guide_section_to_module``), folding solar into batteries (O1).

Returns both the client payloads and the out-of-band metadata (decision 2).
See ``guide-stage4-integration-plan.md``.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

from guide_section_batteries import compose_batteries_section
from guide_section_controls import compose_controls_section
from guide_section_electrical import compose_electrical_section
from guide_section_nav import compose_nav_section
from guide_section_solar import compose_solar_section
from guide_section_water import compose_water_section
from guide_section_to_module import (
    extract_module_metadata,
    section_to_system_module,
    solar_fold_sections,
)
from section_inputs import assemble_section_inputs
from system_graph import build_vessel_graph

# Published system modules produced by Stage 4 composers today. Solar is not a
# standalone module — it folds into ``batteries`` (O1).
PUBLISHED_SECTIONS: tuple[str, ...] = (
    "batteries",
    "controls",
    "electrical",
    "nav",
    "water",
)

# section_id -> (compose_fn, uses_section_inputs)
_COMPOSERS: dict[str, tuple[Callable[..., dict[str, Any]], bool]] = {
    "batteries": (compose_batteries_section, True),
    "controls": (compose_controls_section, True),
    "electrical": (compose_electrical_section, True),
    "nav": (compose_nav_section, True),
    "solar": (compose_solar_section, False),
    "water": (compose_water_section, True),
}


def _load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def build_context(equipment_doc: dict[str, Any], profiles: dict[str, Any]) -> dict[str, Any]:
    """Build a composer context from an ``equipment_doc`` + ``profiles`` pair.

    Shared by the fixture and DB sources so both feed ``build_vessel_graph``
    identically (Phase 2 byte-match seam).
    """
    graph = build_vessel_graph(
        list(equipment_doc["equipment"]),
        profiles,
        relations=list(equipment_doc.get("relations") or []),
        equipment_doc=equipment_doc,
        vessel_artifact_facts=equipment_doc.get("vessel_artifact_facts"),
    )
    return {"equipment_doc": equipment_doc, "profiles": profiles, "graph": graph}


def load_vessel_context(vessel_dir: Path) -> dict[str, Any]:
    return build_context(
        _load(vessel_dir / "equipment.json"),
        _load(vessel_dir / "profiles.json"),
    )


def load_vessel_context_from_db(conn: Any, vessel_id: str) -> dict[str, Any]:
    """Build a composer context from the Phase 2 DB substrate (migration 023)."""
    from stage4_substrate import (
        build_equipment_doc_from_db,
        build_profiles_from_db,
    )

    return build_context(
        build_equipment_doc_from_db(conn, vessel_id),
        build_profiles_from_db(conn, vessel_id),
    )


def compose_section(section_id: str, ctx: dict[str, Any]) -> dict[str, Any]:
    compose_fn, uses_inputs = _COMPOSERS[section_id]
    kwargs: dict[str, Any] = {
        "graph": ctx["graph"],
        "profiles": ctx["profiles"],
        "equipment_doc": ctx["equipment_doc"],
    }
    if uses_inputs:
        kwargs["section_inputs"] = assemble_section_inputs(
            ctx["graph"], section_id, equipment_doc=ctx["equipment_doc"]
        )
    return compose_fn(**kwargs)


def build_modules_from_context(
    ctx: dict[str, Any],
) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    """Compose + transform all published sections from a prepared context."""
    composed_by_section = {
        sid: compose_section(sid, ctx) for sid in ("solar", *PUBLISHED_SECTIONS)
    }
    solar_sections = solar_fold_sections(composed_by_section["solar"])

    modules: dict[str, dict[str, Any]] = {}
    metadata: dict[str, dict[str, Any]] = {}
    for sid in PUBLISHED_SECTIONS:
        composed = composed_by_section[sid]
        extra = solar_sections if (sid == "batteries" and solar_sections) else None
        modules[sid] = section_to_system_module(
            sid,
            composed,
            extra_sections=extra,
            equipment_doc=ctx["equipment_doc"],
        )
        metadata[sid] = extract_module_metadata(sid, composed)

    # Solar's audit trail travels with the batteries module metadata.
    metadata["batteries"]["folded_solar"] = extract_module_metadata(
        "solar", composed_by_section["solar"]
    )
    return modules, metadata


def build_vessel_modules(
    vessel_dir: Path,
) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    """Return ({section_id: SystemModule}, {section_id: metadata}) from a fixture."""
    return build_modules_from_context(load_vessel_context(vessel_dir))
