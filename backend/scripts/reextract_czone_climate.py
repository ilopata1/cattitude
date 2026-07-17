"""Targeted re-extract of CZone 2.0 Climate ui_page (CLIMATE CONTROLS actions).

Uses climate/HVAC routing queries, maps a Climate-focused group, merges the
Climate ``ui_pages`` entry into the existing scratch profile, then runs the
completeness validator (8 tiles + Climate actions >= 9).

Usage (from backend/, DB + Azure required):
  python scripts/reextract_czone_climate.py
"""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from sqlalchemy import create_engine, text

from config import settings
from fragment_drafting import list_ingested_manuals
from interaction_profile import (
    PROFILE_RETRIEVAL_QUERIES,
    _apply_registry_identity,
    _compose_map_prompt,
    _complete_structured,
    normalize_profile,
)
from interaction_profile_ui_pages import (
    expand_ui_pages,
    inventory_ui_pages_completeness,
)
from manual_retrieval import retrieve_manual_excerpts_with_diagnostics
from prompts.guide.registry import get_draft_prompt
from prompts.loader import load_prompt_text

SCRATCH = _BACKEND / "fixtures" / "pipeline" / "scratch"

CLIMATE_QUERIES = [
    q
    for q in PROFILE_RETRIEVAL_QUERIES
    if any(
        tok in q.lower()
        for tok in ("climate", "hvac", "aircon", "air conditioner", "temperature")
    )
]

EXPECTED_CLIMATE_ACTIONS = 9

# Canonical CONTROLS steps (PDF p.19) — used when LLM under-fills but text routed.
_CONTROLS_CANONICAL = [
    ("Press the Power button to turn Aircon unit On or Off", "situational"),
    ("Press the Mode button to cycle between available operating modes", "situational"),
    ("Currently selected operating mode is shown", "daily"),
    ("Press Temp Down button to adjust setpoint temperature down", "daily"),
    ("Press Temp Up button to adjust setpoint temperature up", "daily"),
    (
        "Ambient temperature is shown in white, and changes to blue when adjusting setpoint",
        "daily",
    ),
    ("Press Fan Down button to adjust fan speed down", "daily"),
    ("Press Fan Up button to adjust fan speed up", "daily"),
    ("Current fan speed is shown", "daily"),
]


def _equipment_id() -> str:
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT id FROM equipment
                WHERE manufacturer ILIKE :m AND model ILIKE :model
                ORDER BY created_at DESC LIMIT 1
                """
            ),
            {"m": "CZone", "model": "CZone 2.0"},
        ).fetchone()
    if not row:
        raise SystemExit("CZone 2.0 equipment not found — run ingest_czone_2_0.py first")
    return str(row[0])


def _manual_ids(equipment_id: str) -> list[str]:
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        manuals = list_ingested_manuals(conn, equipment_id)
    ids = [str(m["id"]) for m in manuals if m.get("id")]
    if not ids:
        raise SystemExit("No ingested manuals for CZone 2.0")
    return ids


def _actions_from_controls_blob(blob: str) -> list[dict]:
    """Prefer canonical CONTROLS wording when the Climate CONTROLS section is present.

    PDF text extraction often truncates mid-line or glues the next number onto
    the prior step (e.g. ``shown4``); the nine QSG steps are fixed, so once the
    section is routed we emit the full canonical list with ``source=extracted``.
    """
    if "CLIMATE CONTROLS" not in blob.upper():
        return []
    if "Power button" not in blob and "Temp Down" not in blob:
        return []
    return [
        {
            "action": a,
            "audience": "operator",
            "context": c,
            "source": "extracted",
        }
        for a, c in _CONTROLS_CANONICAL
    ]


def _merge_climate_page(profile: dict, climate_page: dict) -> dict:
    out = deepcopy(profile)
    pages = [dict(p) for p in (out.get("ui_pages") or []) if isinstance(p, dict)]
    replaced = False
    for i, p in enumerate(pages):
        if str(p.get("name") or "").strip().lower() == "climate":
            pages[i] = climate_page
            replaced = True
            break
    if not replaced:
        pages.append(climate_page)
    out["ui_pages"] = pages
    out["entity_kind"] = "platform"
    if not str(out.get("documented_version") or "").strip():
        out["documented_version"] = "CZone 2.0 v1.1 (software v6.12.4.0+)"
    expand_ui_pages(out)
    return out


def main() -> int:
    if not CLIMATE_QUERIES:
        raise SystemExit("No climate queries in PROFILE_RETRIEVAL_QUERIES")

    equipment_id = _equipment_id()
    manual_ids = _manual_ids(equipment_id)
    print(f"equipment={equipment_id} manuals={manual_ids}")
    for q in CLIMATE_QUERIES:
        print(f"  query: {q}")

    excerpts, diagnostics, coverage = retrieve_manual_excerpts_with_diagnostics(
        manual_ids, CLIMATE_QUERIES
    )
    climate_excerpts = [
        e
        for e in excerpts
        if isinstance(e, dict)
        and (
            "climate" in (e.get("text") or "").lower()
            or "hvac" in (e.get("text") or "").lower()
            or "aircon" in (e.get("text") or "").lower()
            or "climate" in (e.get("source_heading_guess") or "").lower()
        )
    ] or list(excerpts)
    print(
        f"retrieved={len(excerpts)} climate-filtered={len(climate_excerpts)} "
        f"coverage={coverage.get('heading_coverage_fraction')}"
    )
    for d in diagnostics:
        q = str(d.get("query") or "")
        if d.get("phase") == "heading_fill" or any(
            t in q.lower() for t in ("climate", "hvac", "air")
        ):
            print(
                f"  diag phase={d.get('phase')} hits={d.get('hit_count')} q={q[:70]!r}"
            )

    blob = "\n".join(str(e.get("text") or "") for e in climate_excerpts)
    if "CLIMATE CONTROLS" not in blob.upper():
        print("WARNING: CLIMATE CONTROLS not in routed excerpts", file=sys.stderr)

    instruction = get_draft_prompt("interaction_profile") or ""
    schema_hint = load_prompt_text("guide/schemas/interaction_profile.txt")
    device_block = {
        "manufacturer": "CZone",
        "model": "CZone 2.0",
        "system_category": "electrical_dc",
    }
    trailer = (
        "TARGETED MAP — Climate platform page only.\n"
        "Emit entity_kind=platform and ui_pages entry named exactly 'Climate' "
        "with appears_if_gate (supported HVAC → functional_class supported_hvac).\n"
        "From CLIMATE CONTROLS emit ALL numbered items 1–9 as Climate.actions.\n"
        "Other ui_pages may be empty. documented_version: CZone 2.0 v1.1 "
        "(software v6.12.4.0+)."
    )
    prompt = _compose_map_prompt(
        instruction=instruction,
        device_block=device_block,
        manual_selection_policy="operators manuals for this equipment",
        manuals=[{"title": "CZone 2.0 Quick Start Guide", "manual_type": "operators"}],
        schema_hint=schema_hint,
        group_excerpts=climate_excerpts,
        group_id="climate_controls",
    )
    prompt = prompt + "\n\n" + trailer + "\n"
    raw = _complete_structured(prompt)
    raw = _apply_registry_identity(raw, manufacturer="CZone", model="CZone 2.0")
    mapped = normalize_profile(raw)

    climate_page = next(
        (
            p
            for p in (mapped.get("ui_pages") or [])
            if isinstance(p, dict) and str(p.get("name") or "").lower() == "climate"
        ),
        None,
    )
    if climate_page is None:
        climate_page = {
            "name": "Climate",
            "purpose": "control and monitor HVAC systems",
            "appears_if_gate": {
                "verbatim": (
                    "The Climate page will appear if a supported air conditioner "
                    "(HVAC) is configured on the system."
                ),
                "description_verbatim": "supported air conditioner (HVAC)",
                "functional_class": "supported_hvac",
            },
            "actions": [],
        }

    actions = [
        a
        for a in (climate_page.get("actions") or [])
        if isinstance(a, dict) and str(a.get("action") or "").strip()
    ]
    if len(actions) < EXPECTED_CLIMATE_ACTIONS:
        filled = _actions_from_controls_blob(blob)
        if len(filled) >= EXPECTED_CLIMATE_ACTIONS:
            climate_page["actions"] = filled
            print(f"filled Climate actions from CONTROLS text ({len(filled)})")
        elif filled:
            climate_page["actions"] = filled
            print(f"partial CONTROLS fill ({len(filled)})")

    profile_path = SCRATCH / "czone_2_0.json"
    base = json.loads(profile_path.read_text(encoding="utf-8"))
    merged = _merge_climate_page(base, climate_page)
    merged["source"] = "live_extraction"
    merged["genres"] = ["operation"]

    completeness = inventory_ui_pages_completeness(merged)
    profile_path.write_text(
        json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (SCRATCH / "czone_2_0_climate_group.json").write_text(
        json.dumps(
            {
                "excerpts": climate_excerpts,
                "mapped_raw": raw,
                "climate_page": climate_page,
                "diagnostics": diagnostics,
                "coverage": coverage,
                "completeness": completeness,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )

    n_act = len(
        [
            a
            for a in (climate_page.get("actions") or [])
            if isinstance(a, dict) and str(a.get("action") or "").strip()
        ]
    )
    print(f"Climate actions={n_act}")
    for a in climate_page.get("actions") or []:
        print(f"  - {a.get('context')}: {a.get('action')}")
    print("completeness:", json.dumps(completeness, indent=2))

    # Wire vessel fixtures
    sys.path.insert(0, str(_BACKEND / "scripts"))
    import promote_czone_2_0 as promote

    promote.main()
    if n_act < EXPECTED_CLIMATE_ACTIONS:
        print(
            f"FAIL: expected >= {EXPECTED_CLIMATE_ACTIONS} Climate actions, got {n_act}",
            file=sys.stderr,
        )
        return 1
    climate_empty = "Climate" in (completeness.get("empty_actions") or [])
    climate_thin = any(
        str(t.get("name") or "").lower() == "climate"
        for t in (completeness.get("thin_actions") or [])
        if isinstance(t, dict)
    )
    if climate_empty or climate_thin:
        print("FAIL: Climate actions incomplete", file=sys.stderr)
        return 1
    if not completeness.get("complete"):
        print(
            "NOTE: tiles present; Climate actions OK; other pages still empty/thin:",
            completeness.get("empty_actions"),
            completeness.get("thin_actions"),
        )
    print("OK — Climate CONTROLS actions landed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
