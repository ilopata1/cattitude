"""Human-readable labels for Postgres enum values in admin UI."""

from __future__ import annotations


def format_label(value: object | None) -> str:
    """sailing_catamaran → Sailing Catamaran; empty → em dash."""
    if value is None or value == "":
        return "—"
    text = str(value).strip()
    if not text:
        return "—"
    return " ".join(part.capitalize() for part in text.split("_"))
