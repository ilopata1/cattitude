"""Store and manage vessel guide image assets (logos, system photos)."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from config import settings
from guide_bootstrap import vessel_systems_prefix

_BACKEND_DIR = Path(__file__).resolve().parent

_ALLOWED_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
_MAX_IMAGE_BYTES = 8 * 1024 * 1024


class GuideAssetError(Exception):
    pass


def bundled_guide_assets_dir() -> Path:
    """Images shipped in the API image. Not the volume mount."""
    return _BACKEND_DIR / "data" / "guide_assets"


def get_guide_assets_root() -> Path:
    if settings.guide_assets_storage_dir.strip():
        path = Path(settings.guide_assets_storage_dir).expanduser()
    else:
        path = bundled_guide_assets_dir()
    path.mkdir(parents=True, exist_ok=True)
    return path


def seed_missing_guide_assets() -> int:
    """Copy bundled images onto the storage dir when that dir is a volume.

    Existing files are left in place, so an admin upload is not replaced by
    the image seed. Mount the volume at a path other than the bundled dir
    (for example ``/data/guide_assets``) and set ``GUIDE_ASSETS_STORAGE_DIR``
    to that path. A mount directly over ``backend/data/guide_assets`` hides
    the seed and this copy cannot see it.
    """
    source_root = bundled_guide_assets_dir()
    dest_root = get_guide_assets_root()
    if not source_root.is_dir():
        return 0
    try:
        if dest_root.resolve() == source_root.resolve():
            return 0
    except OSError:
        return 0

    copied = 0
    for path in source_root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in _ALLOWED_SUFFIXES:
            continue
        dest = dest_root / path.relative_to(source_root)
        if dest.is_file():
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(path.read_bytes())
        copied += 1
    return copied


def _sanitize_stem(name: str) -> str:
    stem = Path(name).stem
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", stem.strip().lower())
    return cleaned.strip(".-") or "image"


def _write_image_bytes(
    vessel_slug: str,
    original_name: str,
    data: bytes,
    *,
    name_prefix: str,
) -> str:
    if len(data) > _MAX_IMAGE_BYTES:
        raise GuideAssetError("Image must be 8 MB or smaller.")
    suffix = Path(original_name).suffix.lower()
    if suffix not in _ALLOWED_SUFFIXES:
        raise GuideAssetError("Allowed image types: PNG, JPG, WEBP, GIF.")

    digest = hashlib.sha256(data).hexdigest()[:12]
    filename = f"{name_prefix}-{_sanitize_stem(original_name)}-{digest}{suffix}"
    logical_path = f"{vessel_systems_prefix(vessel_slug)}{filename}"

    dest = get_guide_assets_root() / logical_path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)

    return logical_path


def list_vessel_guide_images(vessel_slug: str) -> list[dict[str, Any]]:
    prefix = vessel_systems_prefix(vessel_slug)
    found: dict[str, Path] = {}

    directory = get_guide_assets_root() / prefix
    if directory.is_dir():
        for path in sorted(directory.iterdir()):
            if path.suffix.lower() in _ALLOWED_SUFFIXES and path.is_file():
                logical = f"{prefix}{path.name}"
                found[logical] = path

    items: list[dict[str, Any]] = []
    for logical_path, path in sorted(found.items()):
        items.append(
            {
                "path": logical_path,
                "filename": path.name,
                "bytes": path.stat().st_size,
            }
        )
    return items


def build_photo_section_html(
    image_path: str, *, title: str, caption: str = ""
) -> str:
    alt = title.replace('"', "&quot;")
    caption_html = (
        f'<div class="photo-caption-sub">{caption}</div>' if caption else ""
    )
    return (
        f'<div class="photo-card">'
        f'<img style="max-width:384px;width:100%;" src="{image_path}" '
        f'alt="{alt}" onclick="openPhoto(this.src,\'{alt}\')">'
        f'<div class="photo-caption"><span class="photo-caption-icon">📷</span>'
        f"<div><div class=\"photo-caption-text\">{alt}</div>{caption_html}</div>"
        f"</div></div>"
    )


def _coerce_jsonb(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return value


def _load_patchable_module(
    conn: Connection, vessel_id: str, content_type: str, content_key: str
) -> tuple[str, dict[str, Any]] | None:
    row = conn.execute(
        text(
            """
            SELECT id, payload, status
            FROM guide_content
            WHERE vessel_id = :vessel_id
              AND content_type = CAST(:content_type AS guide_content_type)
              AND content_key = :content_key
              AND status IN ('draft', 'approved', 'published')
            ORDER BY
              CASE status
                WHEN 'draft' THEN 0
                WHEN 'approved' THEN 1
                ELSE 2
              END,
              created_at DESC
            LIMIT 1
            """
        ),
        {
            "vessel_id": vessel_id,
            "content_type": content_type,
            "content_key": content_key,
        },
    ).fetchone()
    if row is None:
        return None
    return str(row[0]), _coerce_jsonb(row[1]) or {}


def _save_module_payload(
    conn: Connection, module_id: str, payload: dict[str, Any], *, updated_by: str
) -> None:
    conn.execute(
        text(
            """
            UPDATE guide_content
            SET payload = CAST(:payload AS jsonb),
                created_by = :updated_by
            WHERE id = :module_id
            """
        ),
        {
            "module_id": module_id,
            "payload": json.dumps(payload),
            "updated_by": updated_by,
        },
    )


def set_branding_logos(
    conn: Connection,
    vessel_id: str,
    *,
    header_logo: str | None = None,
    hero_logo: str | None = None,
    updated_by: str,
) -> dict[str, Any]:
    loaded = _load_patchable_module(conn, vessel_id, "branding", "branding")
    if loaded is None:
        raise GuideAssetError(
            "No branding module found. Generate shell content first, then upload logos."
        )
    module_id, payload = loaded
    if header_logo:
        payload["headerLogo"] = header_logo
    if hero_logo:
        payload["heroLogo"] = hero_logo
    _save_module_payload(conn, module_id, payload, updated_by=updated_by)
    return payload


def add_system_photo(
    conn: Connection,
    vessel_id: str,
    system_id: str,
    *,
    image_path: str,
    title: str,
    caption: str = "",
    updated_by: str,
) -> dict[str, Any]:
    loaded = _load_patchable_module(conn, vessel_id, "system", system_id)
    if loaded is None:
        raise GuideAssetError(
            f"No '{system_id}' system module found. Generate systems first."
        )
    module_id, payload = loaded
    sections = list(payload.get("sections") or [])
    photo_section = {
        "t": title.strip() or "Photo",
        "type": "photo",
        "html": build_photo_section_html(image_path, title=title, caption=caption),
    }
    replaced = False
    for index, section in enumerate(sections):
        if section.get("type") == "photo" and section.get("t") == photo_section["t"]:
            sections[index] = photo_section
            replaced = True
            break
    if not replaced:
        sections.append(photo_section)
    payload["sections"] = sections
    _save_module_payload(conn, module_id, payload, updated_by=updated_by)
    return payload


def save_logo_image(
    vessel_slug: str, original_name: str, data: bytes, *, kind: str
) -> str:
    prefix = "logo-header" if kind == "header" else "logo-hero"
    return _write_image_bytes(vessel_slug, original_name, data, name_prefix=prefix)


def save_system_image(vessel_slug: str, original_name: str, data: bytes) -> str:
    return _write_image_bytes(vessel_slug, original_name, data, name_prefix="system")
