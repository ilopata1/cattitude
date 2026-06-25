"""Manual library CRUD, file storage, and ingestion helpers for admin."""

from __future__ import annotations

import hashlib
import re
import tempfile
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from admin.enums import LEGAL_STATUSES, MANUAL_TYPES, SOURCE_TIERS
from config import settings

PER_PAGE = 50

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_REPO_ROOT = _BACKEND_DIR.parent


class ManualServiceError(Exception):
    pass


def get_manuals_dir() -> Path:
    if settings.manuals_storage_dir.strip():
        path = Path(settings.manuals_storage_dir).expanduser()
    else:
        path = _REPO_ROOT / "manuals"
    path.mkdir(parents=True, exist_ok=True)
    return path


def compute_file_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def compute_content_hash_from_pdf(file_path: Path) -> str:
    from english_text import extract_english
    from ingest import pdf_to_pages

    parts: list[str] = []
    for _, page_text in pdf_to_pages(file_path):
        english = extract_english(page_text)
        if english.strip():
            parts.append(english.strip())
    normalized = "\n\n".join(parts)
    if not normalized:
        raise ManualServiceError(
            "Could not extract text from PDF for content comparison."
        )
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _sanitize_filename(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", name.strip())
    return cleaned.strip("._") or "manual.pdf"


def save_manual_file(data: bytes, original_name: str, file_hash: str) -> str:
    filename = f"{file_hash[:16]}_{_sanitize_filename(original_name)}"
    dest = get_manuals_dir() / filename
    dest.write_bytes(data)
    return f"manuals/{filename}"


def file_size_label(storage_path: str) -> str | None:
    path = get_manuals_dir() / Path(storage_path).name
    if not path.is_file():
        repo_path = _REPO_ROOT / storage_path
        path = repo_path if repo_path.is_file() else path
    if not path.is_file():
        return None
    size = path.stat().st_size
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    return f"{size / (1024 * 1024):.1f} MB"


def _validate_choice(value: str, allowed: list[str], field: str) -> str:
    if value not in allowed:
        raise ManualServiceError(f"Invalid {field}: {value}")
    return value


def count_manual_works(
    conn: Connection,
    *,
    legal_status: str = "",
    system_category: str = "",
    query: str = "",
) -> int:
    clauses, params = _list_filters(
        legal_status=legal_status,
        system_category=system_category,
        query=query,
    )
    return int(
        conn.execute(
            text(
                f"""
                SELECT COUNT(DISTINCT mw.id)
                FROM manual_work mw
                JOIN equipment e ON e.id = mw.equipment_id
                WHERE {' AND '.join(clauses)}
                """
            ),
            params,
        ).scalar()
        or 0
    )


def _list_filters(
    *,
    legal_status: str = "",
    system_category: str = "",
    query: str = "",
) -> tuple[list[str], dict[str, Any]]:
    clauses = ["TRUE"]
    params: dict[str, Any] = {}

    if legal_status:
        clauses.append("mw.legal_status = CAST(:legal_status AS legal_status)")
        params["legal_status"] = legal_status

    if system_category:
        clauses.append("e.system_category = CAST(:system_category AS system_category)")
        params["system_category"] = system_category

    if query.strip():
        clauses.append(
            "(e.manufacturer ILIKE :query_pattern OR e.model ILIKE :query_pattern OR mw.title ILIKE :query_pattern)"
        )
        params["query_pattern"] = f"%{query.strip()}%"

    return clauses, params


def list_manual_works(
    conn: Connection,
    *,
    legal_status: str = "",
    system_category: str = "",
    query: str = "",
    page: int = 1,
    per_page: int = PER_PAGE,
) -> list[dict[str, Any]]:
    clauses, params = _list_filters(
        legal_status=legal_status,
        system_category=system_category,
        query=query,
    )
    offset = max(page - 1, 0) * per_page
    params["limit"] = per_page
    params["offset"] = offset

    rows = conn.execute(
        text(
            f"""
            SELECT
                mw.id,
                e.manufacturer,
                e.model,
                e.system_category,
                mw.manual_type,
                mw.title,
                mw.legal_status,
                mw.source_tier,
                me.edition_label,
                me.id AS current_edition_id,
                COALESCE(
                    array_agg(DISTINCT mf.language) FILTER (WHERE mf.language IS NOT NULL),
                    '{{}}'
                ) AS languages
            FROM manual_work mw
            JOIN equipment e ON e.id = mw.equipment_id
            LEFT JOIN manual_edition me
                ON me.manual_work_id = mw.id AND me.is_current = true
            LEFT JOIN manual_file mf ON mf.manual_edition_id = me.id
            WHERE {' AND '.join(clauses)}
            GROUP BY
                mw.id, e.manufacturer, e.model, e.system_category,
                mw.manual_type, mw.title, mw.legal_status, mw.source_tier,
                me.edition_label, me.id
            ORDER BY e.manufacturer, e.model, mw.title
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).fetchall()
    return [
        {
            "id": str(row[0]),
            "manufacturer": row[1],
            "model": row[2],
            "system_category": row[3],
            "manual_type": row[4],
            "title": row[5],
            "legal_status": row[6],
            "source_tier": row[7],
            "edition_label": row[8],
            "current_edition_id": str(row[9]) if row[9] else None,
            "languages": list(row[10] or []),
        }
        for row in rows
    ]


def list_pending_manual_works(conn: Connection) -> list[dict[str, Any]]:
    return list_manual_works(conn, legal_status="pending", per_page=500)


def get_manual_work(conn: Connection, work_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        text(
            """
            SELECT
                mw.id, mw.equipment_id, mw.manual_type, mw.title,
                mw.source_tier, mw.legal_status, mw.created_at,
                e.manufacturer, e.model, e.system_category
            FROM manual_work mw
            JOIN equipment e ON e.id = mw.equipment_id
            WHERE mw.id = :id
            """
        ),
        {"id": work_id},
    ).fetchone()
    if row is None:
        return None
    return {
        "id": str(row[0]),
        "equipment_id": str(row[1]),
        "manual_type": row[2],
        "title": row[3],
        "source_tier": row[4],
        "legal_status": row[5],
        "created_at": row[6],
        "manufacturer": row[7],
        "model": row[8],
        "system_category": row[9],
    }


def list_works_for_equipment(conn: Connection, equipment_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        text(
            """
            SELECT id, manual_type, title, legal_status, source_tier
            FROM manual_work
            WHERE equipment_id = :equipment_id
            ORDER BY manual_type, title
            """
        ),
        {"equipment_id": equipment_id},
    ).fetchall()
    return [
        {
            "id": str(row[0]),
            "manual_type": row[1],
            "title": row[2],
            "legal_status": row[3],
            "source_tier": row[4],
        }
        for row in rows
    ]


def list_editions(conn: Connection, work_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        text(
            """
            SELECT
                me.id, me.edition_label, me.content_hash, me.is_current,
                me.ingested_at, me.superseded_by_edition_id,
                sup.edition_label AS superseded_by_label
            FROM manual_edition me
            LEFT JOIN manual_edition sup ON sup.id = me.superseded_by_edition_id
            WHERE me.manual_work_id = :work_id
            ORDER BY me.ingested_at DESC
            """
        ),
        {"work_id": work_id},
    ).fetchall()
    return [
        {
            "id": str(row[0]),
            "edition_label": row[1],
            "content_hash": row[2],
            "is_current": row[3],
            "ingested_at": row[4],
            "superseded_by_edition_id": str(row[5]) if row[5] else None,
            "superseded_by_label": row[6],
        }
        for row in rows
    ]


def list_edition_files(conn: Connection, edition_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        text(
            """
            SELECT id, language, file_hash, source_url, storage_path, created_at
            FROM manual_file
            WHERE manual_edition_id = :edition_id
            ORDER BY language
            """
        ),
        {"edition_id": edition_id},
    ).fetchall()
    return [
        {
            "id": str(row[0]),
            "language": row[1],
            "file_hash": row[2],
            "source_url": row[3],
            "storage_path": row[4],
            "created_at": row[5],
            "file_size": file_size_label(row[4]),
        }
        for row in rows
    ]


def find_file_by_hash(conn: Connection, file_hash: str) -> dict[str, Any] | None:
    row = conn.execute(
        text(
            """
            SELECT
                mf.id, mf.language, mf.storage_path,
                me.edition_label, me.id AS edition_id,
                mw.id AS work_id, mw.title,
                e.manufacturer, e.model
            FROM manual_file mf
            JOIN manual_edition me ON me.id = mf.manual_edition_id
            JOIN manual_work mw ON mw.id = me.manual_work_id
            JOIN equipment e ON e.id = mw.equipment_id
            WHERE mf.file_hash = :file_hash
            """
        ),
        {"file_hash": file_hash},
    ).fetchone()
    if row is None:
        return None
    return {
        "file_id": str(row[0]),
        "language": row[1],
        "storage_path": row[2],
        "edition_label": row[3],
        "edition_id": str(row[4]),
        "work_id": str(row[5]),
        "title": row[6],
        "manufacturer": row[7],
        "model": row[8],
    }


def get_current_edition(conn: Connection, work_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        text(
            """
            SELECT id, edition_label, content_hash
            FROM manual_edition
            WHERE manual_work_id = :work_id AND is_current = true
            """
        ),
        {"work_id": work_id},
    ).fetchone()
    if row is None:
        return None
    return {
        "id": str(row[0]),
        "edition_label": row[1],
        "content_hash": row[2],
    }


def update_manual_work(
    conn: Connection,
    work_id: str,
    *,
    manual_type: str,
    title: str,
    source_tier: str,
    legal_status: str,
) -> None:
    title = title.strip()
    if not title:
        raise ManualServiceError("Title is required.")

    result = conn.execute(
        text(
            """
            UPDATE manual_work
            SET
                manual_type = CAST(:manual_type AS manual_type),
                title = :title,
                source_tier = CAST(:source_tier AS source_tier),
                legal_status = CAST(:legal_status AS legal_status)
            WHERE id = :id
            """
        ),
        {
            "id": work_id,
            "manual_type": _validate_choice(manual_type, MANUAL_TYPES, "manual_type"),
            "title": title,
            "source_tier": _validate_choice(source_tier, SOURCE_TIERS, "source_tier"),
            "legal_status": _validate_choice(
                legal_status, LEGAL_STATUSES, "legal_status"
            ),
        },
    )
    if result.rowcount == 0:
        raise ManualServiceError("Manual work not found.")


def set_legal_status(conn: Connection, work_id: str, legal_status: str) -> None:
    status = _validate_choice(legal_status, LEGAL_STATUSES, "legal_status")
    result = conn.execute(
        text(
            """
            UPDATE manual_work
            SET legal_status = CAST(:legal_status AS legal_status)
            WHERE id = :id
            """
        ),
        {"id": work_id, "legal_status": status},
    )
    if result.rowcount == 0:
        raise ManualServiceError("Manual work not found.")


def set_current_edition(conn: Connection, work_id: str, edition_id: str) -> None:
    edition = conn.execute(
        text(
            """
            SELECT id FROM manual_edition
            WHERE id = :edition_id AND manual_work_id = :work_id
            """
        ),
        {"edition_id": edition_id, "work_id": work_id},
    ).fetchone()
    if edition is None:
        raise ManualServiceError("Edition not found for this manual work.")

    conn.execute(
        text(
            """
            UPDATE manual_edition
            SET is_current = false
            WHERE manual_work_id = :work_id AND is_current = true
            """
        ),
        {"work_id": work_id},
    )
    conn.execute(
        text(
            """
            UPDATE manual_edition
            SET is_current = true
            WHERE id = :edition_id
            """
        ),
        {"edition_id": edition_id},
    )


def create_manual_work(
    conn: Connection,
    *,
    equipment_id: str,
    manual_type: str,
    title: str,
    source_tier: str,
    legal_status: str = "pending",
) -> str:
    title = title.strip()
    if not title:
        raise ManualServiceError("Title is required.")

    row = conn.execute(
        text(
            """
            INSERT INTO manual_work (
                equipment_id, manual_type, title, source_tier, legal_status
            )
            VALUES (
                :equipment_id,
                CAST(:manual_type AS manual_type),
                :title,
                CAST(:source_tier AS source_tier),
                CAST(:legal_status AS legal_status)
            )
            RETURNING id
            """
        ),
        {
            "equipment_id": equipment_id,
            "manual_type": _validate_choice(manual_type, MANUAL_TYPES, "manual_type"),
            "title": title,
            "source_tier": _validate_choice(source_tier, SOURCE_TIERS, "source_tier"),
            "legal_status": _validate_choice(
                legal_status, LEGAL_STATUSES, "legal_status"
            ),
        },
    ).fetchone()
    return str(row[0])


def create_edition(
    conn: Connection,
    work_id: str,
    *,
    edition_label: str,
    content_hash: str,
    make_current: bool = True,
) -> str:
    if make_current:
        previous = get_current_edition(conn, work_id)
        conn.execute(
            text(
                """
                UPDATE manual_edition
                SET is_current = false
                WHERE manual_work_id = :work_id AND is_current = true
                """
            ),
            {"work_id": work_id},
        )
        row = conn.execute(
            text(
                """
                INSERT INTO manual_edition (
                    manual_work_id, edition_label, content_hash, is_current
                )
                VALUES (:work_id, :edition_label, :content_hash, true)
                RETURNING id
                """
            ),
            {
                "work_id": work_id,
                "edition_label": edition_label.strip() or None,
                "content_hash": content_hash,
            },
        ).fetchone()
        edition_id = str(row[0])
        if previous:
            conn.execute(
                text(
                    """
                    UPDATE manual_edition
                    SET superseded_by_edition_id = :new_id
                    WHERE id = :old_id
                    """
                ),
                {"new_id": edition_id, "old_id": previous["id"]},
            )
        return edition_id

    row = conn.execute(
        text(
            """
            INSERT INTO manual_edition (
                manual_work_id, edition_label, content_hash, is_current
            )
            VALUES (:work_id, :edition_label, :content_hash, false)
            RETURNING id
            """
        ),
        {
            "work_id": work_id,
            "edition_label": edition_label.strip() or None,
            "content_hash": content_hash,
        },
    ).fetchone()
    return str(row[0])


def add_manual_file(
    conn: Connection,
    edition_id: str,
    *,
    language: str,
    file_hash: str,
    storage_path: str,
    source_url: str | None = None,
) -> str:
    language = language.strip().lower()
    if not language:
        raise ManualServiceError("Language is required.")

    row = conn.execute(
        text(
            """
            INSERT INTO manual_file (
                manual_edition_id, language, file_hash, storage_path, source_url
            )
            VALUES (
                :edition_id, :language, :file_hash, :storage_path, :source_url
            )
            RETURNING id
            """
        ),
        {
            "edition_id": edition_id,
            "language": language,
            "file_hash": file_hash,
            "storage_path": storage_path,
            "source_url": source_url or None,
        },
    ).fetchone()
    return str(row[0])


def ingest_current_edition_file(
    conn: Connection,
    work_id: str,
    storage_path: str,
) -> None:
    work = get_manual_work(conn, work_id)
    if work is None:
        raise ManualServiceError("Manual work not found.")

    path = get_manuals_dir() / Path(storage_path).name
    if not path.is_file():
        alt = _REPO_ROOT / storage_path
        path = alt if alt.is_file() else path
    if not path.is_file():
        raise ManualServiceError(f"Stored file not found: {storage_path}")

    from ingest import ingest_manual

    tags = [
        t
        for t in (work["manufacturer"], work["model"], work["system_category"])
        if t
    ]
    ingest_manual(path, work_id, tags, parser="pypdf")


def upload_manual(
    conn: Connection,
    *,
    equipment_id: str,
    file_data: bytes,
    original_filename: str,
    language: str,
    source_url: str | None,
    work_mode: str,
    manual_work_id: str | None,
    manual_type: str,
    title: str,
    source_tier: str,
    legal_status: str,
    edition_action: str,
    edition_label: str,
    confirm_same_content: bool,
) -> tuple[str, str | None]:
    if not file_data:
        raise ManualServiceError("PDF file is required.")
    if not original_filename.lower().endswith(".pdf"):
        raise ManualServiceError("Only PDF uploads are supported.")

    file_hash = compute_file_hash(file_data)
    duplicate = find_file_by_hash(conn, file_hash)
    if duplicate:
        raise ManualServiceError(
            "This exact file is already in the library: "
            f"{duplicate['title']} ({duplicate['edition_label'] or 'edition'}), "
            f"{duplicate['manufacturer']} — {duplicate['model']}."
        )

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(file_data)
        tmp_path = Path(tmp.name)
    try:
        content_hash = compute_content_hash_from_pdf(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)

    if work_mode == "new":
        work_id = create_manual_work(
            conn,
            equipment_id=equipment_id,
            manual_type=manual_type,
            title=title,
            source_tier=source_tier,
            legal_status=legal_status,
        )
    else:
        if not manual_work_id:
            raise ManualServiceError("Select an existing manual work.")
        work = get_manual_work(conn, manual_work_id)
        if work is None or work["equipment_id"] != equipment_id:
            raise ManualServiceError("Manual work does not match selected equipment.")
        work_id = manual_work_id

    current = get_current_edition(conn, work_id)

    if edition_action == "add_language_current":
        if current is None:
            raise ManualServiceError("No current edition to add a language to.")
        edition_id = current["id"]
    elif edition_action == "new_edition":
        if current and current["content_hash"] == content_hash and not confirm_same_content:
            raise ManualServiceError(
                "SAME_CONTENT"
            )
        edition_id = create_edition(
            conn,
            work_id,
            edition_label=edition_label,
            content_hash=content_hash,
            make_current=True,
        )
    else:
        if current is not None:
            raise ManualServiceError(
                "This manual work already has an edition. Choose new edition or add language."
            )
        edition_id = create_edition(
            conn,
            work_id,
            edition_label=edition_label or "initial",
            content_hash=content_hash,
            make_current=True,
        )

    storage_path = save_manual_file(file_data, original_filename, file_hash)
    add_manual_file(
        conn,
        edition_id,
        language=language,
        file_hash=file_hash,
        storage_path=storage_path,
        source_url=source_url,
    )

    is_current = conn.execute(
        text("SELECT is_current FROM manual_edition WHERE id = :id"),
        {"id": edition_id},
    ).scalar()

    return work_id, storage_path if is_current else None


def add_language_file(
    conn: Connection,
    work_id: str,
    edition_id: str,
    *,
    file_data: bytes,
    original_filename: str,
    language: str,
    source_url: str | None,
) -> str | None:
    edition = conn.execute(
        text(
            """
            SELECT id, is_current FROM manual_edition
            WHERE id = :edition_id AND manual_work_id = :work_id
            """
        ),
        {"edition_id": edition_id, "work_id": work_id},
    ).fetchone()
    if edition is None:
        raise ManualServiceError("Edition not found.")

    if not file_data:
        raise ManualServiceError("PDF file is required.")
    if not original_filename.lower().endswith(".pdf"):
        raise ManualServiceError("Only PDF uploads are supported.")

    file_hash = compute_file_hash(file_data)
    duplicate = find_file_by_hash(conn, file_hash)
    if duplicate:
        raise ManualServiceError(
            "This exact file is already in the library: "
            f"{duplicate['title']} ({duplicate['edition_label'] or 'edition'})."
        )

    storage_path = save_manual_file(file_data, original_filename, file_hash)
    add_manual_file(
        conn,
        edition_id,
        language=language,
        file_hash=file_hash,
        storage_path=storage_path,
        source_url=source_url,
    )

    return storage_path if edition[1] else None
