"""Heading callout junk + carry-forward (v4.23).

Founding shape: section title on page N; page N+1 opens with diagram callout
letters (``D E`` / ``I Alerts Select…``). ``source_heading_guess`` must inherit
the prior page title, never the callout crumbs.

Usage (from backend/):
  python scripts/verify_heading_carry_forward.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from manual_retrieval import (
    carry_forward_source_headings,
    guess_source_heading,
    heading_guess_is_usable,
    is_diagram_callout_line,
)


def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if not cond:
            failures.append(msg)

    check(is_diagram_callout_line("D E") is True, '"D E" must be callout junk')
    check(
        is_diagram_callout_line("D E H I J K L M N O") is True,
        "letter-run callouts must be junk",
    )
    check(
        is_diagram_callout_line(
            "I Alerts Select to view the Active alerts panel, including "
            "historical alerts."
        )
        is True,
        "single-letter callout caption must be junk",
    )
    check(
        is_diagram_callout_line("Quick access menu") is False,
        "real section title must not be callout junk",
    )
    check(
        heading_guess_is_usable("Quick access menu") is True,
        "Quick access menu must be a usable heading",
    )
    check(
        heading_guess_is_usable("D E") is False,
        '"D E" must not be usable',
    )

    figure_chunk = (
        "D E H I J K L M N O G C B A F\n"
        "A Power off Select to turn off the device. If the unit is powered "
        "through a power control bus via the yellow power control wire, "
        "selecting this option puts the unit into standby.\n"
        "B Sleep mode\n"
    )
    check(
        guess_source_heading(figure_chunk) is None
        or heading_guess_is_usable(guess_source_heading(figure_chunk)) is False
        or guess_source_heading(figure_chunk) != "D E",
        "figure chunk must not guess D E as heading",
    )
    # Stronger: raw guess on figure-only opener must not be the letter run.
    raw = guess_source_heading("D E\nA Power off Select to turn off the device.")
    check(
        raw != "D E" and (raw is None or heading_guess_is_usable(raw)),
        f"callout opener must not yield D E; got {raw!r}",
    )

    title_chunk = (
        "Quick access menu\n"
        "The quick access menu provides fast access to common system "
        "settings and features.\n"
        "If the activity bar is visible, open the quick access menu by "
        "selecting the icon.\n"
    )
    check(
        guess_source_heading(title_chunk) == "Quick access menu",
        f"title chunk must guess Quick access menu; got "
        f"{guess_source_heading(title_chunk)!r}",
    )

    items = [
        {
            "manual_id": "m1",
            "page_start": 10,
            "page_end": 10,
            "text": title_chunk,
            "source_heading_guess": guess_source_heading(title_chunk),
        },
        {
            "manual_id": "m1",
            "page_start": 11,
            "page_end": 11,
            "text": figure_chunk,
            "source_heading_guess": guess_source_heading(figure_chunk),
        },
        {
            "manual_id": "m1",
            "page_start": 11,
            "page_end": 11,
            "text": (
                "I Alerts Select to view the Active alerts panel, including "
                "historical alerts.\n"
                "J Screenshot Select Screenshot from the quick access menu.\n"
            ),
            "source_heading_guess": None,
        },
    ]
    carry_forward_source_headings(items)
    check(
        items[0]["source_heading_guess"] == "Quick access menu",
        "title page keeps its heading",
    )
    check(
        items[1]["source_heading_guess"] == "Quick access menu",
        f"figure page must inherit Quick access menu; got "
        f"{items[1].get('source_heading_guess')!r}",
    )
    check(
        items[2]["source_heading_guess"] == "Quick access menu",
        f"callout-caption page must inherit Quick access menu; got "
        f"{items[2].get('source_heading_guess')!r}",
    )

    if failures:
        print("FAIL")
        for item in failures:
            print(" -", item)
        return 1
    print("OK — heading callout junk + carry-forward (v4.23)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
