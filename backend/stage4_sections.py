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
from guide_section_to_module import (
    extract_module_metadata,
    section_to_system_module,
    solar_fold_section,
)
from section_inputs import assemble_section_inputs
from system_graph import build_vessel_graph

# Published system modules produced by Stage 4 composers today. Solar is not a
# standalone module — it folds into ``batteries`` (O1).
PUBLISHED_SECTIONS: tuple[str, ...] = ("batteries", "controls", "electrical", "nav")

# section_id -> (compose_fn, uses_section_inputs)
_COMPOSERS: dict[str, tuple[Callable[..., dict[str, Any]], bool]] = {
    "batteries": (compose_batteries_section, True),
    "controls": (compose_controls_section, True),
    "electrical": (compose_electrical_section, True),
    "nav": (compose_nav_section, True),
    "solar": (compose_solar_section, False),
}


def _load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_vessel_context(vessel_dir: Path) -> dict[str, Any]:
    equipment_doc = _load(vessel_dir / "equipment.json")
    profiles = _load(vessel_dir / "profiles.json")
    graph = build_vessel_graph(
        list(equipment_doc["equipment"]),
        profiles,
        relations=list(equipment_doc.get("relations") or []),
        equipment_doc=equipment_doc,
        vessel_artifact_facts=equipment_doc.get("vessel_artifact_facts"),
    )
    return {"equipment_doc": equipment_doc, "profiles": profiles, "graph": graph}


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


def build_vessel_modules(
    vessel_dir: Path,
) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    """Return ({section_id: SystemModule}, {section_id: metadata})."""
    ctx = load_vessel_context(vessel_dir)

    composed_by_section = {
        sid: compose_section(sid, ctx) for sid in ("solar", *PUBLISHED_SECTIONS)
    }
    solar_section = solar_fold_section(composed_by_section["solar"])

    modules: dict[str, dict[str, Any]] = {}
    metadata: dict[str, dict[str, Any]] = {}
    for sid in PUBLISHED_SECTIONS:
        composed = composed_by_section[sid]
        extra = [solar_section] if (sid == "batteries" and solar_section) else None
        modules[sid] = section_to_system_module(sid, composed, extra_sections=extra)
        metadata[sid] = extract_module_metadata(sid, composed)

    # Solar's audit trail travels with the batteries module metadata.
    metadata["batteries"]["folded_solar"] = extract_module_metadata(
        "solar", composed_by_section["solar"]
    )
    return modules, metadata
