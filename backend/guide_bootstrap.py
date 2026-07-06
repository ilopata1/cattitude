"""Split, assemble, and validate vessel guide bootstrap payloads."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

ASSET_PATH_RE = re.compile(r"assets/images/[^\s\"'<>]+")

LEGACY_SYSTEMS_PREFIX = "assets/images/systems/"
VESSEL_SYSTEMS_PREFIX = "assets/images/vessels/{slug}/systems/"


def vessel_systems_prefix(vessel_slug: str) -> str:
    return VESSEL_SYSTEMS_PREFIX.format(slug=vessel_slug)


def normalize_vessel_asset_paths(data: Any, vessel_slug: str) -> Any:
    """Rewrite legacy shared image paths to the per-vessel namespace."""
    target = vessel_systems_prefix(vessel_slug)
    if isinstance(data, str):
        return data.replace(LEGACY_SYSTEMS_PREFIX, target)
    if isinstance(data, dict):
        return {key: normalize_vessel_asset_paths(value, vessel_slug) for key, value in data.items()}
    if isinstance(data, list):
        return [normalize_vessel_asset_paths(item, vessel_slug) for item in data]
    return data


BACKEND_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_DIR.parent
MOBILE_SRC = REPO_ROOT / "mobile" / "src"


def asset_file_path(logical_path: str, *, vessel_slug: str | None = None) -> Path:
    if logical_path.startswith("assets/"):
        primary = MOBILE_SRC / logical_path
    else:
        primary = MOBILE_SRC / "assets" / logical_path

    if primary.is_file():
        return primary

    if vessel_slug and LEGACY_SYSTEMS_PREFIX in logical_path:
        legacy = MOBILE_SRC / logical_path.replace(
            vessel_systems_prefix(vessel_slug),
            LEGACY_SYSTEMS_PREFIX,
        )
        if legacy.is_file():
            return legacy

    if LEGACY_SYSTEMS_PREFIX in logical_path:
        legacy = MOBILE_SRC / logical_path
        if legacy.is_file():
            return legacy

    return primary


def canonical_json_hash(data: Any) -> str:
    encoded = json.dumps(data, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return f"sha256:{hashlib.sha256(encoded).hexdigest()}"


def find_asset_paths(data: Any) -> list[str]:
    found: set[str] = set()

    def walk(value: Any) -> None:
        if isinstance(value, str):
            for match in ASSET_PATH_RE.finditer(value):
                found.add(match.group(0))
        elif isinstance(value, dict):
            for item in value.values():
                walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    walk(data)
    return sorted(found)


def build_asset_manifest(
    payload: dict[str, Any],
    vessel_slug: str,
    *,
    api_prefix: str = "/api/v1/vessels",
) -> list[dict[str, Any]]:
    manifest: list[dict[str, Any]] = []
    for path in find_asset_paths(payload):
        file_path = asset_file_path(path, vessel_slug=vessel_slug)
        if file_path.is_file():
            raw = file_path.read_bytes()
            manifest.append(
                {
                    "path": path,
                    "url": f"{api_prefix}/{vessel_slug}/guide/assets/{path}",
                    "hash": f"sha256:{hashlib.sha256(raw).hexdigest()}",
                    "bytes": len(raw),
                }
            )
        else:
            manifest.append(
                {
                    "path": path,
                    "url": f"{api_prefix}/{vessel_slug}/guide/assets/{path}",
                    "hash": None,
                    "bytes": None,
                    "missing": True,
                }
            )
    return manifest


def split_bootstrap(bootstrap: dict[str, Any]) -> list[dict[str, Any]]:
    modules: list[dict[str, Any]] = []

    if branding := bootstrap.get("branding"):
        modules.append(
            {"content_type": "branding", "content_key": "branding", "payload": branding}
        )
    if emergency := bootstrap.get("emergency"):
        modules.append(
            {"content_type": "emergency", "content_key": "emergency", "payload": emergency}
        )

    for system_id, system in (bootstrap.get("systems") or {}).items():
        modules.append(
            {"content_type": "system", "content_key": system_id, "payload": system}
        )

    for checklist_key, checklist in (bootstrap.get("checklists") or {}).items():
        modules.append(
            {
                "content_type": "checklist",
                "content_key": checklist_key,
                "payload": checklist,
            }
        )

    if fixes := bootstrap.get("fixes"):
        modules.append(
            {"content_type": "fix_card_set", "content_key": "all", "payload": fixes}
        )

    if locations := bootstrap.get("locations"):
        modules.append(
            {"content_type": "locations", "content_key": "locations", "payload": locations}
        )

    ui = bootstrap.get("ui") or {}
    for ui_key in (
        "homeRuleSections",
        "doMenu",
        "checklistMeta",
        "systemOrder",
        "locationLayout",
    ):
        if ui_key in ui:
            modules.append(
                {"content_type": "ui", "content_key": ui_key, "payload": ui[ui_key]}
            )

    return modules


def assemble_bootstrap(
    modules: list[dict[str, Any]],
    *,
    vessel_id: str,
    vessel_slug: str,
    manual_titles: dict[str, str] | None = None,
) -> dict[str, Any]:
    bootstrap: dict[str, Any] = {
        "vesselId": vessel_id,
        "vesselSlug": vessel_slug,
        "branding": {},
        "emergency": {},
        "systems": {},
        "checklists": {},
        "fixes": [],
        "locations": {},
        "manualTitles": manual_titles or {},
        "ui": {},
    }

    for module in modules:
        content_type = module["content_type"]
        content_key = module["content_key"]
        payload = module["payload"]

        if content_type == "branding":
            bootstrap["branding"] = payload
        elif content_type == "emergency":
            bootstrap["emergency"] = payload
        elif content_type == "system":
            bootstrap["systems"][content_key] = payload
        elif content_type == "checklist":
            bootstrap["checklists"][content_key] = payload
        elif content_type == "fix_card_set":
            bootstrap["fixes"] = payload
        elif content_type == "locations":
            bootstrap["locations"] = payload
        elif content_type == "ui":
            bootstrap["ui"][content_key] = payload

    return normalize_vessel_asset_paths(bootstrap, vessel_slug)
