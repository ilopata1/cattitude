"""Friendly labels and preview metadata for guide module review in admin UI."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from admin.formatting import format_label
from guide_module_catalog import (
    CHECKLIST_CATALOG,
    COPY_MODULE_REVIEW,
    FIXES_REVIEW,
    SYSTEM_CATALOG,
)

# (content_type, content_key) → review metadata
_MODULE_REVIEW: dict[tuple[str, str], dict[str, Any]] = {
    ("branding", "branding"): {
        "section_title": "Welcome banner",
        "guest_label": "Home tab header",
        "review_title": "Welcome banner",
        "review_blurb": (
            "This is what guests see at the top of the Home tab when they open the guide app."
        ),
        "preview_context": "Home tab",
        "preview_available": True,
        "mobile_ref": "mobile/src/app/pages/home/home.page.html",
    },
    ("emergency", "emergency"): {
        "section_title": "Emergency & MAYDAY",
        "guest_label": "MAYDAY & contacts",
        "review_title": "Emergency & MAYDAY",
        "review_blurb": (
            "MAYDAY steps and emergency contacts shown on the Home tab — "
            "the first things a crew needs in a crisis."
        ),
        "preview_context": "Home tab",
        "preview_available": True,
        "mobile_ref": "mobile/src/app/pages/home/home.page.html",
    },
    ("ui", "homeRuleSections"): {
        "section_title": "Home screen rules",
        "guest_label": "Safety rules list",
        "review_title": "Home screen rules",
        "review_blurb": (
            "Safety rules and good habits listed on the Home tab, grouped by severity."
        ),
        "preview_context": "Home tab",
        "preview_available": True,
        "mobile_ref": "mobile/src/app/pages/home/home.page.html",
    },
    ("fix_card_set", "all"): {
        **FIXES_REVIEW,
        "preview_available": True,
        "mobile_ref": "mobile/src/app/pages/fix/fix.page.html",
    },
}

for _system_id, _meta in SYSTEM_CATALOG.items():
    _MODULE_REVIEW[("system", _system_id)] = {
        "section_title": _meta.get("review_title", _system_id),
        "guest_label": _meta.get("guest_label", _system_id),
        "review_title": _meta.get("review_title", _system_id),
        "review_blurb": (
            f"{_meta.get('focus', '')} — shown in Learn the Boat and the Know tab."
        ),
        "preview_context": "Do → Learn / Know",
        "preview_available": True,
        "mobile_ref": "mobile/src/app/pages/know/know.page.html",
    }

for _checklist_id, _meta in CHECKLIST_CATALOG.items():
    _MODULE_REVIEW[("checklist", _checklist_id)] = {
        "section_title": _meta["title"],
        "guest_label": _meta["guest_label"],
        "review_title": _meta["title"],
        "review_blurb": _meta["focus"],
        "preview_context": "Do → Checklist",
        "preview_available": True,
        "mobile_ref": "mobile/src/app/pages/do/checklist/checklist.page.html",
    }

for _key, _meta in COPY_MODULE_REVIEW.items():
    _MODULE_REVIEW[_key] = {**_meta, "preview_available": False}


@dataclass(frozen=True)
class ModuleReviewMeta:
    section_title: str
    guest_label: str
    review_title: str
    review_blurb: str
    preview_context: str
    preview_available: bool
    mobile_ref: str | None = None


def lookup_module_review_meta(content_type: str, content_key: str) -> ModuleReviewMeta:
    entry = _MODULE_REVIEW.get((content_type, content_key))
    if entry:
        return ModuleReviewMeta(**entry)

    type_label = format_label(content_type)
    key_label = format_label(content_key) if content_key != content_type else content_key
    return ModuleReviewMeta(
        section_title=f"{type_label} — {key_label}",
        guest_label=content_key,
        review_title=f"{type_label} — {key_label}",
        review_blurb="Review the proposed content before approving.",
        preview_context="Guest app",
        preview_available=False,
    )


def attach_review_meta(module: dict[str, Any]) -> dict[str, Any]:
    meta = lookup_module_review_meta(module["content_type"], module["content_key"])
    module["review"] = asdict(meta)
    return module
