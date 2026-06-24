"""
Import equipment registry CSVs from data/ into Postgres.

Run from repo root (with backend venv active and .env configured):

    python utilities/import_registry.py
    python utilities/import_registry.py --dry-run
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(_BACKEND_DIR))

from scripts.import_registry import main  # noqa: E402

if __name__ == "__main__":
    main()
