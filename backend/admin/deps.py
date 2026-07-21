from __future__ import annotations

from pathlib import Path

from fastapi.templating import Jinja2Templates
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from config import settings
from db import postgres_connection_strings
from equipment_category import label as equipment_category_label
from .formatting import format_label

ADMIN_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(ADMIN_DIR / "templates"))
templates.env.filters["format_label"] = format_label
templates.env.filters["category_label"] = equipment_category_label

_engine: Engine | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        sync_url, _ = postgres_connection_strings(settings.database_url)
        _engine = create_engine(sync_url, pool_pre_ping=True)
    return _engine
