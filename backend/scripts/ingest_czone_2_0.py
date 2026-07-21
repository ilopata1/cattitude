"""Re-ingest the real CZone 2.0 Quick Start Guide V1.1 PDF.

Prior ingest used a mislabeled mirror that was V1.0 (16pp, no Climate).
Official V1.1 is 19pp and includes CLIMATE PAGE + CLIMATE CONTROLS.

Usage (from backend/):
  python scripts/ingest_czone_2_0.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
_REPO = _BACKEND.parent
sys.path.insert(0, str(_BACKEND))

from pypdf import PdfReader
from sqlalchemy import create_engine, text

from admin.equipment_service import create_equipment
from admin.manual_service import (
    ingest_current_edition_file,
    set_legal_status,
    upload_manual,
)
from config import settings

PDF = _REPO / "manuals" / "CZone_2.0_Quick_Start_Guide_v1.1.pdf"

REQUIRED_HEADINGS = (
    "CLIMATE PAGE",
    "CLIMATE CONTROLS",
)


def _heading_inventory(pdf_path: Path) -> list[str]:
    reader = PdfReader(str(pdf_path))
    blob = "\n".join((p.extract_text() or "") for p in reader.pages)
    heads: list[str] = []
    for line in blob.splitlines():
        s = line.strip()
        if re.fullmatch(
            r"(?i)(CLIMATE PAGE|CLIMATE CONTROLS|FAVOURITES PAGES?|MODES PAGE|"
            r"CONTROL PAGE|MONITORING PAGE|ALARMS PAGE|AC MAINS PAGE|"
            r"INVERTER CHARGER PAGE|CZONE 2\.0 INTRODUCTION)",
            s,
        ):
            heads.append(s.upper())
    return heads


def main() -> int:
    if not PDF.is_file():
        raise SystemExit(f"missing PDF: {PDF}")

    reader = PdfReader(str(PDF))
    page0 = (reader.pages[0].extract_text() or "")
    if "V1.1" not in page0 and "V1.1" not in ((reader.pages[1].extract_text() or "")[:80]):
        raise SystemExit(
            f"PDF does not look like V1.1 (page1={page0[:80]!r}). "
            "Refuse to ingest wrong edition."
        )
    if len(reader.pages) < 18:
        raise SystemExit(f"PDF has only {len(reader.pages)} pages; V1.1 expected ~19")

    heads = _heading_inventory(PDF)
    missing = [h for h in REQUIRED_HEADINGS if h not in heads]
    if missing:
        raise SystemExit(f"pre-ingest heading check failed; missing {missing}; have {heads}")
    print(f"pre-ingest OK: {len(reader.pages)} pages; headings={heads}")

    engine = create_engine(settings.database_url)
    with engine.begin() as conn:
        existing = conn.execute(
            text(
                """
                SELECT id FROM equipment
                WHERE manufacturer ILIKE :m AND model ILIKE :model
                ORDER BY created_at DESC LIMIT 1
                """
            ),
            {"m": "CZone", "model": "CZone 2.0"},
        ).fetchone()
        if existing:
            equipment_id = str(existing[0])
            print(f"equipment exists: {equipment_id}")
        else:
            equipment_id = create_equipment(
                conn,
                {
                    "manufacturer": "CZone",
                    "model": "CZone 2.0",
                    "vessel_types": ["sailing_catamaran", "power_catamaran"],
                    "system_category": "electrical_dc",
                    "equipment_class": "branded_major",
                    "configuration_tier": "aftermarket",
                    "identification_method": "nameplate",
                    "has_formal_manual": True,
                },
            )
            print(f"created equipment: {equipment_id}")

        work = conn.execute(
            text(
                """
                SELECT id FROM manual_work
                WHERE equipment_id = :eid
                  AND title ILIKE :title
                ORDER BY created_at DESC LIMIT 1
                """
            ),
            {"eid": equipment_id, "title": "%CZone 2.0 Quick Start%"},
        ).fetchone()

        data = PDF.read_bytes()
        if work:
            work_id = str(work[0])
            set_legal_status(conn, work_id, "cleared")
            work_id, ingest_path = upload_manual(
                conn,
                equipment_id=equipment_id,
                file_data=data,
                original_filename="CZone_2.0_Quick_Start_Guide_v1.1.pdf",
                language="en",
                source_url="https://downloads.czone.net/Attachment/DownloadFile?downloadId=239",
                work_mode="existing",
                manual_work_id=work_id,
                manual_type="operators",
                title="CZone 2.0 Quick Start Guide",
                source_tier="tier_1",
                legal_status="cleared",
                edition_action="new_edition",
                edition_label="V1.1",
                confirm_same_content=True,
            )
        else:
            work_id, ingest_path = upload_manual(
                conn,
                equipment_id=equipment_id,
                file_data=data,
                original_filename="CZone_2.0_Quick_Start_Guide_v1.1.pdf",
                language="en",
                source_url="https://downloads.czone.net/Attachment/DownloadFile?downloadId=239",
                work_mode="new",
                manual_work_id=None,
                manual_type="operators",
                title="CZone 2.0 Quick Start Guide",
                source_tier="tier_1",
                legal_status="cleared",
                edition_action="new_edition",
                edition_label="V1.1",
                confirm_same_content=False,
            )
        print(f"uploaded work={work_id} path={ingest_path}")
        if not ingest_path:
            raise SystemExit("no storage path after upload")
        ingest_current_edition_file(conn, work_id, ingest_path)
        print(f"ingested {ingest_path}")

        # Post-ingest: confirm vector store has Climate chunks.
        rows = conn.execute(
            text(
                """
                SELECT COUNT(*) FROM data_cattitude
                WHERE metadata_::text ILIKE :wid
                  AND (text ILIKE '%CLIMATE PAGE%' OR text ILIKE '%CLIMATE CONTROLS%')
                """
            ),
            {"wid": f"%{work_id}%"},
        ).scalar()
        # metadata key may vary — also scan by file tag
        if not rows:
            rows = conn.execute(
                text(
                    """
                    SELECT COUNT(*) FROM data_cattitude
                    WHERE text ILIKE '%CLIMATE PAGE%'
                       OR text ILIKE '%CLIMATE CONTROLS%'
                    """
                )
            ).scalar()
        print(f"vector climate-heading hits (approx): {rows}")
        if not rows:
            print("WARNING: Climate headings not found in vector store text")

    print("EQUIPMENT_ID=", equipment_id)
    print("HEADING_INVENTORY=", heads)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
