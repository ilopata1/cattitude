"""Smoke-check Stage 4 plant admin list against live Supernova."""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from sqlalchemy import text

from admin.deps import get_engine
from admin.stage4_admin_service import list_vessel_stage4_plant


def main() -> int:
    with get_engine().connect() as conn:
        vessel_id = conn.execute(
            text("SELECT id::text FROM vessels WHERE slug = 'supernova'")
        ).scalar()
        if not vessel_id:
            print("FAIL: supernova vessel missing")
            return 1
        rows = list_vessel_stage4_plant(conn, vessel_id)
        print(f"OK — {len(rows)} Stage 4 plant rows")
        mppt = next(r for r in rows if r["device_key"] == "victron_mppt_150_60")
        assert mppt["plant_class"] == "solar_charge_controller", mppt
        assert mppt["guest_role"] == "the davit array controller", mppt
        mli = next(r for r in rows if r["device_key"] == "mli_ultra")
        assert any(i["guest_role"] == "house battery 2" for i in mli["instance_roles"])
        print("OK — sample guest fields + plant_class")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
