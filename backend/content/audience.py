"""Published reading-view tag.

YAML may say ``guest``, ``both``, or omit the field: the published payload then
has no ``audience`` key and both reading views show the entry. ``crew`` is the
only value written onto a payload. Anything else is an authoring error.
"""

from __future__ import annotations

from typing import Any

PUBLISHED_CREW = "crew"

_BOTH_VIEWS = frozenset({"guest", "both"})


def read_audience(spec: dict[str, Any], *, label: str) -> str | None:
    """Return ``crew`` or ``None`` (both views).

    ``None``, ``guest``, and ``both`` publish as omitted. ``crew`` publishes as
    ``crew``. Any other value raises.
    """
    raw = spec.get("audience")
    if raw is None:
        return None
    if isinstance(raw, str):
        audience = raw.strip().lower()
        if audience in _BOTH_VIEWS:
            return None
        if audience == PUBLISHED_CREW:
            return PUBLISHED_CREW
    raise ValueError(f"{label!r} audience must be guest or crew, got {raw!r}")


def stamp_audience(target: dict[str, Any], spec: dict[str, Any], *, label: str) -> None:
    """Set ``target['audience']`` to ``crew`` when the spec says crew.

    Otherwise leave ``target`` untouched. Never writes ``audience: guest``.
    """
    if read_audience(spec, label=label) == PUBLISHED_CREW:
        target["audience"] = PUBLISHED_CREW
