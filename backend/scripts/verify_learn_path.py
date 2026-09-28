"""Learn path stages follow the systems and checklists a vessel actually has."""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_navigation import build_learn_path  # noqa: E402


def _ids(stages: list[dict]) -> list[str]:
    return [
        f"{stage['id']}:{','.join(lesson['id'] for lesson in stage['lessons'])}"
        for stage in stages
    ]


def main() -> int:
    failures: list[str] = []

    def expect(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    checks = {"safety-brief", "pd", "anch", "lu", "ec"}
    supernova = build_learn_path(
        {
            "overview": {},
            "safety": {},
            "seamanship": {},
            "sails": {},
            "engines": {},
            "controls": {},
            "electrical": {},
            "batteries": {},
            "water": {},
            "heads": {},
            "galley": {},
            "ac": {},
            "nav": {},
            "dinghy": {},
        },
        checks,
    )
    expect(
        _ids(supernova)
        == [
            "walk:overview",
            "safety:safety-brief",
            "living:heads,water,power,galley,ac",
            "underway:engines,sails,nav",
            "ashore:dinghy",
        ],
        f"supernova path {_ids(supernova)}",
    )
    power = next(lesson for stage in supernova if stage["id"] == "living" for lesson in stage["lessons"] if lesson["id"] == "power")
    expect(power["kind"] == "power", "power is one lesson")

    cattitude = build_learn_path(
        {
            "overview": {},
            "safety": {},
            "sails": {},
            "engines": {},
            "electrical": {},
            "batteries": {},
            "water": {},
            "heads": {},
            "galley": {},
            "ac": {},
            "nav": {},
            "anchoring": {},
            "dinghy": {},
        },
        checks,
    )
    expect(
        _ids(cattitude)
        == [
            "walk:overview",
            "safety:safety-brief",
            "living:heads,water,power,galley,ac",
            "underway:engines,sails,nav,anchoring",
            "ashore:dinghy",
        ],
        f"cattitude path {_ids(cattitude)}",
    )

    sister = build_learn_path(
        {
            "engines": {},
            "controls": {},
            "electrical": {},
            "batteries": {},
            "water": {},
            "heads": {},
            "nav": {},
        },
        set(),
    )
    expect(
        _ids(sister) == ["living:heads,water,power", "underway:engines,nav"],
        f"sister-test path {_ids(sister)}",
    )

    if failures:
        print("FAILED:")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print("OK: learn path")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
