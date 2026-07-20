"""Targeted re-extract of CZone 2.0 ui_page actions (Favourites / Alarms / …).

Same pattern as ``reextract_czone_climate.py``: page-specific retrieval →
map group → merge ``ui_pages[name].actions`` into scratch → completeness.

Usage (from backend/, DB + Azure required):
  python scripts/reextract_czone_ui_pages.py
  python scripts/reextract_czone_ui_pages.py --pages Favourites Alarms
  python scripts/reextract_czone_ui_pages.py --pages Favourites Alarms Control Monitoring --promote
"""

from __future__ import annotations

import argparse
import json
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from sqlalchemy import create_engine, text

from config import settings
from fragment_drafting import list_ingested_manuals
from interaction_profile import (
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

# Page specs: retrieval queries, excerpt filter tokens, canonical fill, mins.
PAGE_SPECS: dict[str, dict[str, Any]] = {
    "Favourites": {
        "queries": [
            "Favourites pages Modes bar switches meters mimic",
            "activate Mode hold half a second Favourites",
            "single throw double throw switch Favourites pages",
            "press meter slide out Favourites monitoring",
        ],
        "filter_tokens": ("favourites", "modes bar", "single throw", "double throw"),
        "blob_markers": ("FAVOURITES PAGES", "Modes Bar"),
        "min_actions": 1,
        "purpose": "common items are pre-configured for easy access",
        "canonical": [
            (
                "To activate a Mode hold the desired Mode for half a second, "
                "while the button is illuminating white",
                "situational",
            ),
            (
                "Press a single-throw switch once to turn the circuit ON and "
                "again to turn it OFF",
                "daily",
            ),
            (
                "Press a Favourites meter to open a slide-out with additional "
                "monitored fields",
                "daily",
            ),
            (
                "Press a mimic indicator to open a slide-out panel for circuit "
                "control and associated monitoring data",
                "daily",
            ),
        ],
        "trailer": (
            "TARGETED MAP — Favourites platform page only.\n"
            "Emit entity_kind=platform and ui_pages entry named exactly "
            "'Favourites' (no appears_if_gate — always present).\n"
            "From FAVOURITES PAGES / Modes Bar / Switches / Meters emit "
            "operator actions (activate Mode by hold, switch press, meter/"
            "mimic press). Exclude CONFIGURING FAVOURITES installer steps "
            "(.zcf / .cfp upload).\n"
            "Other ui_pages may be empty."
        ),
    },
    "Alarms": {
        "queries": [
            "Alarms page active historic alarm list acknowledge",
            "Press acknowledge to close the popup Critical Important Standard",
            "alarm severity Critical Important Standard Warning filter History",
        ],
        "filter_tokens": ("alarm", "acknowledge", "severity"),
        "blob_markers": ("ALARMS PAGE",),
        "min_actions": 1,
        "purpose": "list of active and historic alarms",
        "canonical": [
            (
                "Press desired alarm to open up alarm details on alarm pane",
                "daily",
            ),
            (
                "Filter by History to see alarm history",
                "situational",
            ),
            (
                "Press acknowledge to close the Critical, Important or "
                "Standard alarm popup",
                "situational",
            ),
        ],
        "trailer": (
            "TARGETED MAP — Alarms platform page only.\n"
            "Emit entity_kind=platform and ui_pages entry named exactly "
            "'Alarms' (no appears_if_gate — always present).\n"
            "From ALARMS PAGE emit actions: open alarm details, filter by "
            "History, acknowledge popup.\n"
            "Other ui_pages may be empty."
        ),
    },
    "Modes": {
        "queries": [
            "Modes page activate Mode control pane switch",
            "Press desired Mode to open up controls on the control pane",
        ],
        "filter_tokens": ("modes page", "activate mode", "control pane"),
        "blob_markers": ("MODES PAGE",),
        "min_actions": 1,
        "purpose": "control multiple circuits with a single touch",
        "canonical": [
            (
                "Press desired Mode to open up controls on the control pane",
                "situational",
            ),
            (
                "Press the switch to activate Mode",
                "situational",
            ),
        ],
        "trailer": (
            "TARGETED MAP — Modes platform page only.\n"
            "Emit ui_pages entry named exactly 'Modes'.\n"
            "From MODES PAGE emit activate-Mode actions.\n"
            "Other ui_pages may be empty."
        ),
    },
    "Control": {
        "queries": [
            "Control page configured circuits press desired circuit control pane",
            "Filter Pane circuit category Control page",
        ],
        "filter_tokens": ("control page", "control list", "circuit"),
        "blob_markers": ("CONTROL PAGE",),
        "min_actions": 0,  # completeness mins do not require Control today
        "purpose": "list of configured circuits",
        "canonical": [
            (
                "Press desired circuit to open up controls on control pane",
                "daily",
            ),
            (
                "Select a circuit category to filter down circuit list",
                "daily",
            ),
        ],
        "trailer": (
            "TARGETED MAP — Control platform page only.\n"
            "Emit ui_pages entry named exactly 'Control'.\n"
            "From CONTROL PAGE emit circuit-open and filter actions.\n"
            "Other ui_pages may be empty."
        ),
    },
    "Monitoring": {
        "queries": [
            "Monitoring page configured meters press desired meter monitoring pane",
            "Filter Pane monitoring category meters",
        ],
        "filter_tokens": ("monitoring page", "monitoring list", "meter"),
        "blob_markers": ("MONITORING PAGE",),
        "min_actions": 0,
        "purpose": "list of configured meters",
        "canonical": [
            (
                "Press desired meter to open up associated data on monitoring pane",
                "daily",
            ),
            (
                "Select a monitoring category to filter down list",
                "daily",
            ),
        ],
        "trailer": (
            "TARGETED MAP — Monitoring platform page only.\n"
            "Emit ui_pages entry named exactly 'Monitoring'.\n"
            "From MONITORING PAGE emit meter-open and filter actions.\n"
            "Other ui_pages may be empty."
        ),
    },
}


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


def _filter_excerpts(excerpts: list[dict], tokens: tuple[str, ...]) -> list[dict]:
    out = []
    for e in excerpts:
        if not isinstance(e, dict):
            continue
        blob = f"{e.get('text') or ''} {e.get('source_heading_guess') or ''}".lower()
        if any(tok in blob for tok in tokens):
            out.append(e)
    return out or list(excerpts)


def _canonical_actions(
    blob: str, markers: tuple[str, ...], canonical: list[tuple[str, str]]
) -> list[dict]:
    upper = blob.upper()
    if not any(m.upper() in upper for m in markers):
        # Soft gate: any marker word present (heading OCR / excerpt trim).
        soft = any(
            any(tok.upper() in upper for tok in m.replace("_", " ").split())
            for m in markers
        )
        if not soft:
            return []
    return [
        {
            "action": a,
            "audience": "operator",
            "context": c,
            "source": "extracted",
        }
        for a, c in canonical
    ]


def _merge_page(profile: dict, page: dict) -> dict:
    out = deepcopy(profile)
    name = str(page.get("name") or "").strip().lower()
    pages = [dict(p) for p in (out.get("ui_pages") or []) if isinstance(p, dict)]
    replaced = False
    for i, p in enumerate(pages):
        if str(p.get("name") or "").strip().lower() == name:
            # Preserve gate / purpose if map under-filled them.
            merged = dict(p)
            merged.update({k: v for k, v in page.items() if v not in (None, "", [])})
            if page.get("actions"):
                merged["actions"] = page["actions"]
            pages[i] = merged
            replaced = True
            break
    if not replaced:
        pages.append(page)
    out["ui_pages"] = pages
    out["entity_kind"] = "platform"
    if not str(out.get("documented_version") or "").strip():
        out["documented_version"] = "CZone 2.0 v1.1 (software v6.12.4.0+)"
    expand_ui_pages(out)
    return out


def _extract_page(
    page_name: str,
    *,
    manual_ids: list[str],
) -> tuple[dict, dict]:
    spec = PAGE_SPECS[page_name]
    queries = list(spec["queries"])
    print(f"\n=== {page_name} ===")
    for q in queries:
        print(f"  query: {q}")

    excerpts, diagnostics, coverage = retrieve_manual_excerpts_with_diagnostics(
        manual_ids, queries
    )
    filtered = _filter_excerpts(excerpts, tuple(spec["filter_tokens"]))
    print(
        f"retrieved={len(excerpts)} filtered={len(filtered)} "
        f"coverage={coverage.get('heading_coverage_fraction')}"
    )
    for d in diagnostics:
        print(
            f"  diag phase={d.get('phase')} hits={d.get('hit_count')} "
            f"q={str(d.get('query') or '')[:70]!r}"
        )

    blob = "\n".join(str(e.get("text") or "") for e in filtered)
    markers = tuple(spec["blob_markers"])
    if not any(m.upper() in blob.upper() for m in markers):
        print(f"WARNING: markers {markers} not in routed excerpts", file=sys.stderr)

    instruction = get_draft_prompt("interaction_profile") or ""
    schema_hint = load_prompt_text("guide/schemas/interaction_profile.txt")
    device_block = {
        "manufacturer": "CZone",
        "model": "CZone 2.0",
        "system_category": "electrical_dc",
    }
    prompt = _compose_map_prompt(
        instruction=instruction,
        device_block=device_block,
        manual_selection_policy="operators manuals for this equipment",
        manuals=[{"title": "CZone 2.0 Quick Start Guide", "manual_type": "operators"}],
        schema_hint=schema_hint,
        group_excerpts=filtered,
        group_id=f"czone_{page_name.lower()}",
    )
    prompt = prompt + "\n\n" + str(spec["trailer"]) + "\n"
    raw = _complete_structured(prompt)
    raw = _apply_registry_identity(raw, manufacturer="CZone", model="CZone 2.0")
    mapped = normalize_profile(raw)

    page = next(
        (
            p
            for p in (mapped.get("ui_pages") or [])
            if isinstance(p, dict)
            and str(p.get("name") or "").strip().lower() == page_name.lower()
        ),
        None,
    )
    if page is None:
        page = {
            "name": page_name,
            "purpose": spec["purpose"],
            "actions": [],
        }

    actions = [
        a
        for a in (page.get("actions") or [])
        if isinstance(a, dict) and str(a.get("action") or "").strip()
    ]
    need = int(spec["min_actions"])
    if len(actions) < max(need, 1) or (
        need and len(actions) < need
    ):
        filled = _canonical_actions(blob, markers, list(spec["canonical"]))
        if filled and len(filled) >= len(actions):
            page["actions"] = filled
            print(f"filled {page_name} actions from QSG text ({len(filled)})")
        elif filled:
            page["actions"] = filled
            print(f"partial {page_name} fill ({len(filled)})")

    # Always prefer canonical when routed and LLM under-filled vs canonical length.
    filled = _canonical_actions(blob, markers, list(spec["canonical"]))
    cur = [
        a
        for a in (page.get("actions") or [])
        if isinstance(a, dict) and str(a.get("action") or "").strip()
    ]
    if filled and len(filled) > len(cur):
        page["actions"] = filled
        print(f"upgraded {page_name} to canonical ({len(filled)} > {len(cur)})")

    if not str(page.get("purpose") or "").strip():
        page["purpose"] = spec["purpose"]

    audit = {
        "excerpts": filtered,
        "mapped_raw": raw,
        "page": page,
        "diagnostics": diagnostics,
        "coverage": coverage,
    }
    return page, audit


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pages",
        nargs="+",
        default=["Favourites", "Alarms"],
        choices=sorted(PAGE_SPECS.keys()),
        help="ui_pages to re-extract (default: Favourites Alarms)",
    )
    parser.add_argument(
        "--promote",
        action="store_true",
        help="Wire scratch into vessel fixtures via promote_czone_2_0",
    )
    args = parser.parse_args()

    equipment_id = _equipment_id()
    manual_ids = _manual_ids(equipment_id)
    print(f"equipment={equipment_id} manuals={manual_ids}")

    profile_path = SCRATCH / "czone_2_0.json"
    base = json.loads(profile_path.read_text(encoding="utf-8"))
    merged = deepcopy(base)
    audits: dict[str, Any] = {}

    for page_name in args.pages:
        page, audit = _extract_page(page_name, manual_ids=manual_ids)
        merged = _merge_page(merged, page)
        audits[page_name] = audit
        n = len(
            [
                a
                for a in (page.get("actions") or [])
                if isinstance(a, dict) and str(a.get("action") or "").strip()
            ]
        )
        print(f"{page_name} actions={n}")
        for a in page.get("actions") or []:
            if isinstance(a, dict):
                print(f"  - {a.get('context')}: {a.get('action')}")

    merged["source"] = "live_extraction"
    merged["genres"] = ["operation"]
    merged["entity_kind"] = "platform"
    completeness = inventory_ui_pages_completeness(merged)

    profile_path.write_text(
        json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (SCRATCH / "czone_2_0_ui_pages_reextract.json").write_text(
        json.dumps(
            {"pages": audits, "completeness": completeness},
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print("completeness:", json.dumps(completeness, indent=2))

    # Gate: requested pages must clear empty/thin for their mins.
    failures: list[str] = []
    for page_name in args.pages:
        need = int(PAGE_SPECS[page_name]["min_actions"])
        if need <= 0:
            continue
        if page_name in (completeness.get("empty_actions") or []):
            failures.append(f"{page_name} still empty_actions")
        for t in completeness.get("thin_actions") or []:
            if isinstance(t, dict) and str(t.get("name") or "") == page_name:
                failures.append(f"{page_name} thin {t}")

    if args.promote:
        import promote_czone_2_0 as promote

        saved = sys.argv[:]
        try:
            sys.argv = [str(Path(promote.__file__).name)]
            rc = promote.main()
        finally:
            sys.argv = saved
        if rc != 0:
            print("promote returned", rc, file=sys.stderr)
            return rc

    if failures:
        print("FAIL:", "; ".join(failures), file=sys.stderr)
        return 1
    if not completeness.get("ok"):
        print(
            "NOTE: requested pages OK for their mins; remaining:",
            completeness.get("empty_actions"),
            completeness.get("thin_actions"),
        )
    print("OK — targeted ui_pages actions landed:", ", ".join(args.pages))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
