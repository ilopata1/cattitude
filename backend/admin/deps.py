from __future__ import annotations

from pathlib import Path

from fastapi.templating import Jinja2Templates
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from config import settings
from db import postgres_connection_strings

ADMIN_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(ADMIN_DIR / "templates"))

_engine: Engine | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        sync_url, _ = postgres_connection_strings(settings.database_url)
        _engine = create_engine(sync_url, pool_pre_ping=True)
    return _engine
