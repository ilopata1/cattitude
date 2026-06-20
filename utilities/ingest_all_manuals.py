"""
Ingest every PDF in manuals/ into pgvector.

Run from repo root (with backend venv active and .env configured):

    python utilities/ingest_all_manuals.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
_BACKEND_DIR = _REPO_ROOT / "backend"
_MANUALS_DIR = _REPO_ROOT / "manuals"

sys.path.insert(0, str(_BACKEND_DIR))

from ingest import ingest_manual  # noqa: E402

MANUALS: list[dict] = [
     #Already ingested:
     {
         "file": _MANUALS_DIR / "Volvo D2-60 Operators Manual.pdf",
         "manual_id": "volvo_d2_operators",
         "tags": ["volvo", "D2-60", "engine"],
     },
    # {
    #     "file": _MANUALS_DIR / "dometic_captouch_panel.pdf",
    #     "manual_id": "dometic_captouch_panel",
    #     "tags": ["dometic", "captouch", "ac"],
    # },
    # {
    #     "file": _MANUALS_DIR / "dometic_elite_control.pdf",
    #     "manual_id": "dometic_elite_control",
    #     "tags": ["dometic", "elite", "ac"],
    # },
    # {
    #     "file": _MANUALS_DIR / "garmin_gpsmap_74xx_76xx_owner_manual.pdf",
    #     "manual_id": "garmin_gpsmap_74xx_76xx_owner_manual",
    #     "tags": ["garmin", "gpsmap", "mfd"],
    # },
    # {
    #     "file": _MANUALS_DIR / "tecma_compass_eco_manual.pdf",
    #     "manual_id": "tecma_compass_eco_manual",
    #     "tags": ["tecma", "compass", "eco", "head"],
    # },
    # {
    #     "file": _MANUALS_DIR / "tecma_macerator_toilets_2g_manual.pdf",
    #     "manual_id": "tecma_macerator_toilets_2g_manual",
    #     "tags": ["tecma", "toilet", "2g"],
    # },
    # {
    #     "file": _MANUALS_DIR / "victron_digital_multi_control.pdf",
    #     "manual_id": "victron_digital_multi_control",
    #     "tags": ["victron", "multi", "control"],
    # },
    # {
    #     "file": _MANUALS_DIR / "victron_gx_display_manual.pdf",
    #     "manual_id": "victron_gx_display_manual",
    #     "tags": ["victron", "gx", "cerbo", "color", "control"],
    # },
    # {
    #     "file": _MANUALS_DIR / "victron_hub1_system_layout.pdf",
    #     "manual_id": "victron_hub1_system_layout",
    #     "tags": ["victron", "hub1"],
    # },
    # {
    #     "file": _MANUALS_DIR / "victron_multiplus_manual.pdf",
    #     "manual_id": "victron_multiplus_manual",
    #     "tags": ["victron", "multiplus", "inverter", "charger"],
    #},
]


def main() -> None:
    for entry in MANUALS:
        file_path: Path = entry["file"]
        manual_id: str = entry["manual_id"]
        tags: list[str] = entry.get("tags", [])
        print(f"\n--- {manual_id} ({file_path.name}) ---")
        ingest_manual(file_path, manual_id, tags)


if __name__ == "__main__":
    main()
