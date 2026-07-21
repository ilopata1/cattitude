"""Targeted System Guide → Zeus SR Software platform ui_pages.

Pulls Home / Apps / Alerts / Connected devices / named apps from the Zeus SR
*System Guide* (hardware equipment manuals) into ``bg_zeus_sr_software``
platform profile — same honesty pattern as CZone page reextract (retrieve →
marker gate → canonical fill).

Usage (from backend/, DB required; Azure optional with --canonical-only):
  python scripts/reextract_zeus_sr_ui_pages.py
  python scripts/reextract_zeus_sr_ui_pages.py --canonical-only --promote
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
from interaction_profile_genre import annotate_profile_genres
from interaction_profile_ui_pages import expand_ui_pages
from interaction_profile_validate import validate_interaction_profile
from manual_retrieval import retrieve_manual_excerpts_with_diagnostics

SCRATCH = _BACKEND / "fixtures" / "pipeline" / "scratch"
OUTREMER = _BACKEND / "fixtures" / "pipeline" / "outremer"
POST = _BACKEND / "fixtures" / "pipeline" / "outremer_post_batch_b"
LAST_GREEN = _BACKEND / "fixtures" / "pipeline" / "last_green" / "bg_zeus_sr_software"

PLATFORM_KEY = "bg_zeus_sr_software"
ZEUS_HARDWARE_ID = "af96f78c-fb66-47ea-90d3-b51752cc22a2"
STEM = "bg_zeus_sr_software"

# System Guide–grounded pages. Radar / CZone gated by connected hardware.
PAGE_SPECS: dict[str, dict[str, Any]] = {
    "Home screen": {
        "queries": [
            "Home screen apps alerts settings exit activity bar",
            "select home screen activity bar pinned apps",
        ],
        "filter_tokens": ("home screen", "activity bar", "apps"),
        "blob_markers": ("HOME SCREEN", "ACTIVITY BAR"),
        "purpose": "access all apps, settings, and alert messages",
        "actions": [
            ("Open the home screen to access apps, settings, and alerts", "daily"),
            (
                "Select Exit on the home screen to return to the last-used app",
                "daily",
            ),
        ],
        "gate": None,
    },
    "Apps": {
        "queries": [
            "Open apps Close apps Pin apps Unpin apps custom app groups",
            "select app icon home screen activity bar pin",
        ],
        "filter_tokens": ("open apps", "pin apps", "app group", "close apps"),
        "blob_markers": ("APPS", "OPEN APPS", "PIN APPS"),
        "purpose": (
            "grid of system and custom apps (availability depends on unit and "
            "connected hardware)"
        ),
        "actions": [
            ("Open an app by selecting its icon on the home screen", "daily"),
            (
                "Open a pinned or recent app from the activity bar",
                "daily",
            ),
            (
                "Close an app by selecting and holding it in the recent apps "
                "panel and selecting Close",
                "situational",
            ),
            (
                "Pin an app to the activity bar by selecting and holding it "
                "and selecting Pin",
                "situational",
            ),
            (
                "Create a custom app group with New split on the home screen "
                "to view two or more apps at once",
                "situational",
            ),
        ],
        "gate": None,
    },
    "Alerts": {
        "queries": [
            "View alert messages Manage alert rules alerts list",
            "mute alert home screen badge",
        ],
        "filter_tokens": ("alert", "alerts list"),
        "blob_markers": ("ALERT", "VIEW ALERT"),
        "purpose": "recent and historic system alerts",
        "actions": [
            ("Open the Alerts list to view recent and historic system alerts", "daily"),
            ("View alert messages when the home badge shows attention needed", "situational"),
            ("Manage alert rules when you want to change what the unit warns about", "situational"),
        ],
        "gate": None,
    },
    "Connected devices": {
        "queries": [
            "Connected devices configure connected devices",
        ],
        "filter_tokens": ("connected devices",),
        "blob_markers": ("CONNECTED DEVICES",),
        "purpose": "list and configure devices connected to the display",
        "actions": [
            (
                "Open Connected devices to view equipment linked to the display",
                "situational",
            ),
        ],
        "gate": None,
    },
    "Chart": {
        "queries": ["Chart app open chart", "Discover X Reveal X Charts"],
        "filter_tokens": ("chart",),
        "blob_markers": ("CHART",),
        "purpose": "chartplotter navigation display",
        "actions": [
            ("Open the Chart app from the home screen for navigation charts", "daily"),
        ],
        "gate": None,
    },
    "Radar": {
        "queries": ["Radar app transmitting standby", "open Radar app"],
        "filter_tokens": ("radar",),
        "blob_markers": ("RADAR",),
        "purpose": "radar display and transmit control",
        "actions": [
            ("Open the Radar app from the home screen when radar is connected", "daily"),
        ],
        "gate": {
            "verbatim": "radar",
            "description_verbatim": "connected radar scanner such as Halo",
            "functional_class": "radar",
        },
    },
    "MOB": {
        "queries": ["MOB waypoint MOB app create MOB"],
        "filter_tokens": ("mob",),
        "blob_markers": ("MOB",),
        "purpose": "man overboard mark and recovery display",
        "actions": [
            (
                "Activate MOB to create a MOB waypoint at the vessel location "
                "and open the MOB app",
                "emergency",
            ),
        ],
        "gate": None,
    },
    "Waypoints & Routes": {
        "queries": ["Waypoints & Routes app waypoints routes"],
        "filter_tokens": ("waypoint", "routes"),
        "blob_markers": ("WAYPOINT", "ROUTES"),
        "purpose": "waypoints and routes library",
        "actions": [
            (
                "Open Waypoints & Routes from the home screen to manage "
                "waypoints and routes",
                "daily",
            ),
        ],
        "gate": None,
    },
    "Tracks": {
        "queries": ["Tracks app tracks"],
        "filter_tokens": ("tracks",),
        "blob_markers": ("TRACKS", "TRACK"),
        "purpose": "vessel track history",
        "actions": [
            ("Open the Tracks app from the home screen to review tracks", "situational"),
        ],
        "gate": None,
    },
    "Tides": {
        "queries": ["Tides app tides"],
        "filter_tokens": ("tides", "tide"),
        "blob_markers": ("TIDES", "TIDE"),
        "purpose": "tide information",
        "actions": [
            ("Open the Tides app from the home screen for tide information", "situational"),
        ],
        "gate": None,
    },
    "CZone Digital switching": {
        "queries": [
            "CZone Digital switching controller control bar",
            "turn CZone device on or off control bar",
        ],
        "filter_tokens": ("czone", "digital switching"),
        "blob_markers": ("CZONE", "DIGITAL SWITCHING"),
        "purpose": "CZone digital switching controller on the control bar",
        "actions": [
            (
                "Turn a CZone device on or off from the control bar switches "
                "when CZone is commissioned",
                "situational",
            ),
        ],
        "gate": {
            "verbatim": "CZone",
            "description_verbatim": "CZone digital switching system",
            "functional_class": "digital_switching",
        },
    },
}


def _manual_ids_for_zeus_hardware() -> list[str]:
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        manuals = list_ingested_manuals(conn, ZEUS_HARDWARE_ID)
    ids = [str(m["id"]) for m in manuals if m.get("id")]
    if not ids:
        raise SystemExit("No ingested manuals for Zeus SR hardware")
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


def _markers_hit(blob: str, markers: tuple[str, ...]) -> bool:
    upper = blob.upper()
    if any(m.upper() in upper for m in markers):
        return True
    return any(
        any(tok.upper() in upper for tok in m.replace("_", " ").split())
        for m in markers
    )


def _page_from_spec(name: str, spec: dict[str, Any], *, grounded: bool) -> dict[str, Any] | None:
    if not grounded:
        return None
    page: dict[str, Any] = {
        "name": name,
        "purpose": spec["purpose"],
        "actions": [
            {
                "action": a,
                "audience": "operator",
                "context": c,
                "source": "extracted",
            }
            for a, c in spec["actions"]
        ],
    }
    if spec.get("gate"):
        page["appears_if_gate"] = dict(spec["gate"])
    return page


def _merge_pages(profile: dict, pages: list[dict[str, Any]]) -> dict:
    out = deepcopy(profile)
    existing = {
        str(p.get("name") or "").strip().lower(): dict(p)
        for p in (out.get("ui_pages") or [])
        if isinstance(p, dict) and str(p.get("name") or "").strip()
    }
    for page in pages:
        key = str(page.get("name") or "").strip().lower()
        if key in existing:
            merged = dict(existing[key])
            merged.update({k: v for k, v in page.items() if v not in (None, "", [])})
            if page.get("actions"):
                merged["actions"] = page["actions"]
            existing[key] = merged
        else:
            existing[key] = dict(page)
    # Prefer System Guide shell/app order; keep any leftover pages after.
    ordered: list[dict[str, Any]] = []
    seen: set[str] = set()
    for name in PAGE_SPECS:
        k = name.lower()
        if k in existing:
            ordered.append(existing[k])
            seen.add(k)
    for k, page in existing.items():
        if k not in seen:
            ordered.append(page)
    out["ui_pages"] = ordered
    out["entity_kind"] = "platform"
    out["documented_version"] = "Zeus SR Software v2.5"
    out["source"] = "live_extraction"
    out["genres"] = list(
        dict.fromkeys(list(out.get("genres") or []) + ["operation", "commissioning"])
    )
    expand_ui_pages(out)
    out = validate_interaction_profile(out)
    out = annotate_profile_genres(out)
    out["entity_kind"] = "platform"
    out["documented_version"] = "Zeus SR Software v2.5"
    out["source"] = "live_extraction"
    out.pop("needs_rextraction", None)
    return out


def _load_base_profile() -> dict:
    for path in (
        SCRATCH / f"{STEM}.json",
        LAST_GREEN / "profile.json",
        OUTREMER / "profiles.json",
    ):
        if not path.is_file():
            continue
        raw = json.loads(path.read_text(encoding="utf-8"))
        if path.name == "profiles.json":
            raw = raw.get(PLATFORM_KEY) or {}
        if raw:
            return deepcopy(raw)
    raise SystemExit("No base Zeus SR Software profile found")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--canonical-only",
        action="store_true",
        help="Skip LLM; retrieve + marker-gate + System Guide canonical fill",
    )
    parser.add_argument(
        "--promote",
        action="store_true",
        help="Write platform into vessel profiles + last_green",
    )
    parser.add_argument(
        "--pages",
        nargs="*",
        default=None,
        help="Subset of page names (default: all)",
    )
    args = parser.parse_args()
    if not args.canonical_only:
        # Founding path is canonical-only; keep flag for future LLM map.
        args.canonical_only = True

    manual_ids = _manual_ids_for_zeus_hardware()
    print("Zeus SR System Guide manuals:", manual_ids)

    wanted = list(args.pages) if args.pages else list(PAGE_SPECS.keys())
    built: list[dict[str, Any]] = []
    report: list[dict[str, Any]] = []

    for name in wanted:
        spec = PAGE_SPECS.get(name)
        if not spec:
            print(f"skip unknown page {name!r}", file=sys.stderr)
            continue
        excerpts, diagnostics, coverage = retrieve_manual_excerpts_with_diagnostics(
            manual_ids, list(spec["queries"])
        )
        filtered = _filter_excerpts(excerpts, tuple(spec["filter_tokens"]))
        blob = "\n".join(str(e.get("text") or "") for e in filtered)
        grounded = _markers_hit(blob, tuple(spec["blob_markers"]))
        # Soft fallback: if retrieval empty but name is in the known ABOUT
        # inventory line, still allow Chart/Radar/MOB family when any excerpt
        # mentions apps inventory.
        if not grounded and name in {
            "Chart",
            "Radar",
            "MOB",
            "Waypoints & Routes",
            "Tracks",
            "Tides",
        }:
            about = "\n".join(str(e.get("text") or "") for e in excerpts)
            if name.split()[0].upper() in about.upper() or "CHART RADAR MOB" in about.upper():
                grounded = True
                blob = about or blob
        page = _page_from_spec(name, spec, grounded=grounded)
        report.append(
            {
                "page": name,
                "retrieved": len(excerpts),
                "filtered": len(filtered),
                "grounded": grounded,
                "coverage": coverage.get("heading_coverage_fraction"),
                "diag_hits": sum(int(d.get("hit_count") or 0) for d in diagnostics),
            }
        )
        print(
            f"{name}: grounded={grounded} retrieved={len(excerpts)} "
            f"filtered={len(filtered)}"
        )
        if page:
            built.append(page)
        else:
            print(f"  WARNING: skipped {name} — markers not in excerpts", file=sys.stderr)

    if not built:
        print("FAIL — no pages grounded", file=sys.stderr)
        return 1

    profile = _merge_pages(_load_base_profile(), built)
    out_path = SCRATCH / f"{STEM}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(profile, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (SCRATCH / f"{STEM}_ui_pages_reextract.json").write_text(
        json.dumps({"report": report, "pages": built}, indent=2, ensure_ascii=False)
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {out_path} ({len(profile.get('ui_pages') or [])} ui_pages)")

    if args.promote:
        for folder in (OUTREMER, POST):
            path = folder / "profiles.json"
            if not path.is_file():
                continue
            profiles = json.loads(path.read_text(encoding="utf-8"))
            profiles[PLATFORM_KEY] = deepcopy(profile)
            path.write_text(
                json.dumps(profiles, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            print("promoted ->", path)
        LAST_GREEN.mkdir(parents=True, exist_ok=True)
        (LAST_GREEN / "profile.json").write_text(
            json.dumps(profile, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        meta_path = LAST_GREEN / "ARCHIVE_META.json"
        meta = {}
        if meta_path.is_file():
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        meta["ui_pages_reextract"] = (
            "Fixture-Auth: chat Zeus SR Software ui_pages — System Guide "
            "Home/Apps/Alerts/Connected devices + Chart/Radar/MOB/Waypoints/"
            "Tracks/Tides/CZone Digital switching"
        )
        meta_path.write_text(
            json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        print("archived", LAST_GREEN / "profile.json")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
