#!/usr/bin/env python3
"""Link Stage 4 interaction_profile rows to registry equipment.id.

Fills nullable ``equipment_id`` and aligns manufacturer/model columns to the
matched registry row. Does not rewrite profile JSONB (byte-match safe).

Usage (from backend/):
  python scripts/link_stage4_profiles_to_registry.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_BACKEND))

from sqlalchemy import create_engine  # noqa: E402

from config import settings  # noqa: E402
from db import postgres_connection_strings  # noqa: E402
from stage4_substrate import link_profiles_to_registry  # noqa: E402


def main() -> int:
    sync_url, _ = postgres_connection_strings(settings.database_url)
    engine = create_engine(sync_url)
    with engine.begin() as conn:
        stats = link_profiles_to_registry(conn)
    print(
        f"Linked {stats['linked']}/{stats['total']} interaction_profile rows "
        f"to registry equipment (cleared {stats['cleared']})."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
