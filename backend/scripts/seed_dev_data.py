#!/usr/bin/env python3
"""
Idempotent local dev seed for core platform tables.

Usage (from backend/):
  python scripts/seed_dev_data.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import settings  # noqa: E402
from db import postgres_connection_strings  # noqa: E402

CHARTER_NAME = "Cruise Abaco"
OPERATING_BASE_NAME = "Abacos"
OPERATING_BASE_SLUG = "abacos"
VESSEL_NAME = "Cattitude"
VESSEL_SLUG = "cattitude"
VESSEL_TYPE = "sailing_catamaran"

ABACOS_GUIDE_CONTEXT = {
    "displayName": "Abacos, Bahamas",
    "regionLabel": "Marsh Harbour, Abacos",
    "marina": "Boat Harbour Marina",
    "countryCode": "BS",
    "timezone": "America/Nassau",
    "officeVhf": {
        "label": "Cruise Abaco VHF",
        "channel": "Ch 09",
        "hours": "Office hours approx 9am–5pm",
    },
    "marinaVhf": {
        "label": "Boat Harbour Marina VHF",
        "channel": "Ch 68",
        "detail": "Working channel",
    },
    "emergencyContacts": [
        {
            "label": "Cruise Abaco — Jesse",
            "detail": "Dockmaster 24/7",
            "value": "+1 305-304-5821",
            "tel": "+13053045821",
            "action": "call",
        },
        {
            "label": "Cruise Abaco VHF",
            "detail": "Office hours approx 9am–5pm",
            "value": "Ch 09",
            "action": "vhf",
        },
        {
            "label": "Boat Harbour Marina VHF",
            "detail": "Working channel",
            "value": "Ch 68",
            "action": "vhf",
        },
    ],
    "localRules": [
        "Never anchor on coral — always find sand.",
        "Monitor VHF Ch 16 underway; call Cruise Abaco on Ch 09 during office hours.",
    ],
}

EQUIPMENT_ROWS = [
    {
        "manufacturer": "Yanmar",
        "model": "4JH45",
        "system_category": "propulsion",
        "equipment_class": "branded_major",
        "zone": "engine_room",
        "configuration_tier": "structural",
        "identification_method": "nameplate",
        "has_formal_manual": True,
        "vessel_types": ["sailing_catamaran"],
    },
    {
        "manufacturer": "Spectra",
        "model": "Catalina 340",
        "system_category": "freshwater_system",
        "equipment_class": "branded_major",
        "zone": "engine_room",
        "configuration_tier": "aftermarket",
        "identification_method": "nameplate",
        "has_formal_manual": False,
        "vessel_types": ["sailing_catamaran"],
    },
    {
        "manufacturer": "Generic",
        "model": "Self-tailing winch",
        "system_category": "rigging_sail_handling",
        "equipment_class": "generic_hardware",
        "zone": "cockpit_aft_deck",
        "configuration_tier": "structural",
        "identification_method": "visual_description",
        "has_formal_manual": False,
        "vessel_types": ["sailing_catamaran", "cruising_monohull"],
    },
]


def _get_or_create_charter(conn) -> str:
    row = conn.execute(
        text("SELECT id FROM charter_companies WHERE name = :name"),
        {"name": CHARTER_NAME},
    ).fetchone()
    if row:
        return str(row[0])
    row = conn.execute(
        text(
            "INSERT INTO charter_companies (name) VALUES (:name) RETURNING id"
        ),
        {"name": CHARTER_NAME},
    ).fetchone()
    return str(row[0])


def _get_or_create_operating_base(conn, charter_id: str) -> str:
    row = conn.execute(
        text(
            """
            SELECT id FROM charter_operating_bases
            WHERE charter_company_id = :charter_id AND slug = :slug
            """
        ),
        {"charter_id": charter_id, "slug": OPERATING_BASE_SLUG},
    ).fetchone()
    if row:
        return str(row[0])

    row = conn.execute(
        text(
            """
            INSERT INTO charter_operating_bases (
                charter_company_id, name, slug, timezone, country_code, guide_context
            )
            VALUES (
                :charter_id, :name, :slug, :timezone, :country_code,
                CAST(:guide_context AS jsonb)
            )
            RETURNING id
            """
        ),
        {
            "charter_id": charter_id,
            "name": OPERATING_BASE_NAME,
            "slug": OPERATING_BASE_SLUG,
            "timezone": ABACOS_GUIDE_CONTEXT["timezone"],
            "country_code": ABACOS_GUIDE_CONTEXT["countryCode"],
            "guide_context": json.dumps(ABACOS_GUIDE_CONTEXT),
        },
    ).fetchone()
    return str(row[0])


def _get_or_create_vessel(conn, charter_id: str, operating_base_id: str) -> str:
    row = conn.execute(
        text("SELECT id FROM vessels WHERE slug = :slug"),
        {"slug": VESSEL_SLUG},
    ).fetchone()
    if row:
        vessel_id = str(row[0])
        conn.execute(
            text(
                """
                UPDATE vessels
                SET charter_company_id = :charter_id,
                    charter_operating_base_id = :operating_base_id
                WHERE id = :vessel_id
                """
            ),
            {
                "charter_id": charter_id,
                "operating_base_id": operating_base_id,
                "vessel_id": vessel_id,
            },
        )
        return vessel_id

    row = conn.execute(
        text(
            """
            INSERT INTO vessels (
                name, slug, charter_company_id, charter_operating_base_id, vessel_type
            )
            VALUES (
                :name, :slug, :charter_id, :operating_base_id, :vessel_type
            )
            RETURNING id
            """
        ),
        {
            "name": VESSEL_NAME,
            "slug": VESSEL_SLUG,
            "charter_id": charter_id,
            "operating_base_id": operating_base_id,
            "vessel_type": VESSEL_TYPE,
        },
    ).fetchone()
    return str(row[0])


def _get_or_create_equipment(conn, spec: dict) -> str:
    row = conn.execute(
        text(
            """
            SELECT id FROM equipment
            WHERE manufacturer = :manufacturer AND model = :model
            """
        ),
        {"manufacturer": spec["manufacturer"], "model": spec["model"]},
    ).fetchone()
    if row:
        return str(row[0])

    row = conn.execute(
        text(
            """
            INSERT INTO equipment (
                manufacturer, model, vessel_types, zone, system_category,
                equipment_class, configuration_tier, identification_method,
                has_formal_manual
            )
            VALUES (
                :manufacturer, :model,
                CAST(:vessel_types AS vessel_type[]),
                CAST(:zone AS zone),
                CAST(:system_category AS system_category),
                CAST(:equipment_class AS equipment_class),
                CAST(:configuration_tier AS configuration_tier),
                CAST(:identification_method AS identification_method),
                :has_formal_manual
            )
            RETURNING id
            """
        ),
        spec,
    ).fetchone()
    return str(row[0])


def _link_vessel_equipment(conn, vessel_id: str, equipment_id: str) -> None:
    conn.execute(
        text(
            """
            INSERT INTO vessel_equipment (vessel_id, equipment_id, confirmed_by)
            VALUES (:vessel_id, :equipment_id, 'team_verified')
            ON CONFLICT (vessel_id, equipment_id, zone_instance) DO NOTHING
            """
        ),
        {"vessel_id": vessel_id, "equipment_id": equipment_id},
    )


def _seed_engine_manual(conn, equipment_id: str) -> None:
    work = conn.execute(
        text(
            """
            SELECT id FROM manual_work
            WHERE equipment_id = :equipment_id AND manual_type = 'operators'
            """
        ),
        {"equipment_id": equipment_id},
    ).fetchone()
    if work:
        return

    work_row = conn.execute(
        text(
            """
            INSERT INTO manual_work (
                equipment_id, manual_type, title, source_tier, legal_status
            )
            VALUES (
                :equipment_id, 'operators', 'Yanmar 4JH45 Operator Manual',
                'tier_1', 'cleared'
            )
            RETURNING id
            """
        ),
        {"equipment_id": equipment_id},
    ).fetchone()
    work_id = work_row[0]

    edition_row = conn.execute(
        text(
            """
            INSERT INTO manual_edition (manual_work_id, edition_label, content_hash)
            VALUES (:work_id, 'seed', 'seed-content-hash')
            RETURNING id
            """
        ),
        {"work_id": work_id},
    ).fetchone()

    conn.execute(
        text(
            """
            INSERT INTO manual_file (
                manual_edition_id, language, file_hash, storage_path
            )
            VALUES (
                :edition_id, 'en', 'seed-file-hash-yanmar-4jh45',
                'manuals/yanmar_4jh45_operators.pdf'
            )
            ON CONFLICT (file_hash) DO NOTHING
            """
        ),
        {"edition_id": edition_row[0]},
    )


def main() -> None:
    sync_url, _ = postgres_connection_strings(settings.database_url)
    engine = create_engine(sync_url)

    with engine.begin() as conn:
        charter_id = _get_or_create_charter(conn)
        operating_base_id = _get_or_create_operating_base(conn, charter_id)
        vessel_id = _get_or_create_vessel(conn, charter_id, operating_base_id)

        equipment_ids: list[str] = []
        for spec in EQUIPMENT_ROWS:
            equipment_id = _get_or_create_equipment(conn, spec)
            equipment_ids.append(equipment_id)
            _link_vessel_equipment(conn, vessel_id, equipment_id)

        _seed_engine_manual(conn, equipment_ids[0])

    print(
        f"Seed OK: charter={charter_id} base={operating_base_id} "
        f"vessel={vessel_id} slug={VESSEL_SLUG}"
    )


if __name__ == "__main__":
    main()
