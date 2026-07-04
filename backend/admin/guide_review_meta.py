"""Friendly labels and preview metadata for guide module review in admin UI.

To add a visual preview for a new module type:
1. Register section metadata below (title, blurb, app tab context).
2. Add a preview macro in admin/templates/guide/_preview_macros.html.
3. Dispatch to it from preview_panel() in the same file.
4. Mirror styling from the matching mobile page SCSS in admin/static/admin.css.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from admin.formatting import format_label

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
    # Planned — register metadata now; add preview macros when generation ships:
    # ("systems", "overview"): { "section_title": "Boat overview", ... "mobile_ref": "learn.page" }
    # ("systems", "engines"): { ... }
    # ("checklists", "safety-brief"): { ... "mobile_ref": "checklist.page" }
    # ("fix_cards", "..."): { ... "mobile_ref": "know.page" }
}


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
