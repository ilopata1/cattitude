"""Sanitize checks for the duty rota and daily inspection documents."""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from duty_rota import sanitize_rota  # noqa: E402
from inspection_days import sanitize_day  # noqa: E402


def main() -> None:
    failures: list[str] = []

    def check(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    rota = sanitize_rota({
        "startAt": "2026-11-12T12:00:00",
        "crew": [
            {"id": "sam", "name": " Sam "},
            {"id": "sam", "name": "Again"},
            {"id": "Bad Id", "name": "No"},
            {"id": "jo", "name": "Jo"},
        ],
        "tasks": [
            {"id": "watch", "name": " Watch ", "intervalHours": 5},
            {"id": "watch", "name": "Duplicate", "intervalHours": 2},
            {"id": "cooking", "name": "Cooking", "intervalHours": 24},
        ],
        "updatedAt": "2026-11-12T12:00:00.000Z",
    })
    check(rota["startAt"] == "2026-11-12T12:00", "start keeps the clock and drops seconds")
    check([person["name"] for person in rota["crew"]] == ["Sam", "Jo"], "crew ids are unique and names trim")
    check(rota["tasks"][0]["intervalHours"] == 4, "5 hours snaps to 4")
    check(rota["tasks"][0]["sequence"] == ["sam", "jo"], "a missing sequence follows the crew list")
    check(len(rota["tasks"]) == 2, "a repeated task id is stored once")
    ordered = sanitize_rota({
        "crew": rota["crew"],
        "tasks": [{
            "id": "watch",
            "name": "Watch",
            "intervalHours": 4,
            "sequence": ["jo", "nope", "jo"],
        }],
    })
    check(ordered["tasks"][0]["sequence"] == ["jo", "jo"], "a sequence can repeat a person and drops unknown ids")
    empty = sanitize_rota({
        "crew": rota["crew"],
        "tasks": [{"id": "watch", "name": "Watch", "intervalHours": 4, "sequence": []}],
    })
    check(empty["tasks"][0]["sequence"] == [], "an empty sequence stays empty")
    check(sanitize_rota({"startAt": "2026-02-31T12:00"})["startAt"] == "", "an impossible start is cleared")

    day = sanitize_day({
        "date": "2026-11-12",
        "updatedAt": "2026-11-12T12:00:00.000Z",
        "marks": {
            "before-tell": {"done": True, "note": "  " + ("x" * 800)},
            "Nope": {"done": True, "note": "no"},
            "before-clip": {"done": False, "note": "   "},
        },
    })
    check(day is not None and len(day["marks"]["before-tell"]["note"]) == 500, "a note is capped at 500")
    check(day is not None and "before-clip" not in day["marks"] and "Nope" not in day["marks"], "empty and illegal ids are dropped")
    check(sanitize_day({"date": "12 Nov", "marks": {}}) is None, "a day needs a real date")
    check(sanitize_day({"date": "2026-11-12", "marks": {}})["marks"] == {}, "a cleared day is still a day")

    if failures:
        print("\n".join(failures))
        raise SystemExit(1)
    print("duty and inspection checks ok")


if __name__ == "__main__":
    main()
