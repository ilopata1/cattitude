"""
Clear all rows from the pgvector table used by Cattitude RAG.

Run from repo root (with backend venv active and .env configured):

    python utilities/clear_vector_store.py

Skip confirmation prompt (useful in scripts):

    python utilities/clear_vector_store.py --yes
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import psycopg2
from psycopg2 import sql

_REPO_ROOT = Path(__file__).resolve().parent.parent
_BACKEND_DIR = _REPO_ROOT / "backend"

sys.path.insert(0, str(_BACKEND_DIR))

from config import settings  # noqa: E402
from db import postgres_connection_strings  # noqa: E402


def _parse_db_name(sync_url: str) -> str:
    """Best-effort extraction of DB name for user-facing confirmation."""
    db_name = sync_url.rsplit("/", 1)[-1]
    return db_name.split("?", 1)[0] or "(unknown)"

def _psycopg2_compatible_url(url: str) -> str:
    """
    psycopg2.connect() accepts DSNs like "postgresql://..." but not SQLAlchemy
    dialect+driver URLs like "postgresql+psycopg2://...".
    """
    # Handle common SQLAlchemy forms created by `postgres_connection_strings()`.
    if url.startswith("postgresql+psycopg2://"):
        return url.replace("postgresql+psycopg2://", "postgresql://", 1)
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return url


def _table_exists(cur, schema: str, table_name: str) -> bool:
    cur.execute("SELECT to_regclass(%s)", (f"{schema}.{table_name}",))
    return cur.fetchone()[0] is not None


def _suggest_tables(cur, needle: str) -> list[str]:
    cur.execute(
        """
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE tablename ILIKE %s
        ORDER BY schemaname, tablename
        """,
        (f"%{needle}%",),
    )
    return [f"{schema}.{table}" for schema, table in cur.fetchall()]


def clear_vector_table(schema: str, table_name: str) -> None:
    sync_url, _ = postgres_connection_strings(settings.database_url)
    db_name = _parse_db_name(sync_url)
    sync_url = _psycopg2_compatible_url(sync_url)

    with psycopg2.connect(sync_url) as conn:
        with conn.cursor() as cur:
            if not _table_exists(cur, schema, table_name):
                suggestions = _suggest_tables(cur, table_name)
                print(
                    f"Table '{schema}.{table_name}' does not exist in database '{db_name}'. "
                    "Nothing to clear yet."
                )
                if suggestions:
                    print("Did you mean one of these?")
                    for s in suggestions:
                        print(f"  - {s}")
                return

            cur.execute(
                sql.SQL("TRUNCATE TABLE {}.{} RESTART IDENTITY").format(
                    sql.Identifier(schema),
                    sql.Identifier(table_name),
                )
            )
        conn.commit()

    print(f"Cleared vector store table '{schema}.{table_name}' in database '{db_name}'.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Clear pgvector table for manual re-ingestion.")
    parser.add_argument(
        "--table",
        default="cattitude",
        help="Vector table name to clear (default: cattitude).",
    )
    parser.add_argument(
        "--schema",
        default="public",
        help="Schema containing the vector table (default: public).",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip confirmation prompt.",
    )
    args = parser.parse_args()

    if not args.yes:
        prompt = (
            f"This will permanently delete all embeddings from table '{args.table}'. "
            "Continue? [y/N]: "
        )
        confirm = input(prompt).strip().lower()
        if confirm not in {"y", "yes"}:
            print("Cancelled. No data was deleted.")
            return

    clear_vector_table(args.schema, args.table)


if __name__ == "__main__":
    main()
