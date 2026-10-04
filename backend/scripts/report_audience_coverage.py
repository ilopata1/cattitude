"""Report Guest/Crew coverage for one published guide bundle.

Offline. Pass the bundle JSON from
``GET /api/v1/vessels/{slug}/guide/bundle.json``.

Usage (from backend/):
  python scripts/report_audience_coverage.py path/to/bundle.json

Per chapter: sections with no audience (both views), sections tagged crew,
and how many of those a guest can actually read. A guest-visible count of 0
is the publish warning "no sections are visible in the Guest view."

Guest-fact and crew-fact gaps are inferred only from stand-in sentences and
unfilled ``{slot}`` text left in the prose. The bundle does not carry
guide_context, so a fact that simply omitted its section is not listed.
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path
from typing import Any

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from content.slots import _CREW_FACT_SLOTS  # noqa: E402
from guide_guest_withhold import guest_visible_section_count  # noqa: E402

_TAG = re.compile(r"<[^>]+>")
_SLOT = re.compile(r"\{([A-Za-z_][A-Za-z0-9_]*)\}")
_CF_TO_KEY = {slot: dotted for dotted, slot in _CREW_FACT_SLOTS}

# Stand-in sentences slots.py publishes when the fact is blank.
_GUEST_STAND_INS: tuple[tuple[str, str], ...] = (
    ("the switch on the wall", "guestFacts.showerPumpSwitch is blank"),
    (
        "The skipper will show you where the life raft is kept.",
        "guestFacts.lifeRaft.location is blank",
    ),
    ("flush with water.", "guestFacts.headsFlushWater is blank"),
    (
        "red DISTRESS button on the fixed VHF",
        "guestFacts.vhfDsc.location is blank",
    ),
    (
        "Call for help on VHF channel 16.",
        "no region-pack rescue contact for this country",
    ),
)


def _plain(value: str) -> str:
    return html.unescape(_TAG.sub(" ", value)).strip()


def _add(bucket: list[tuple[str, str]], where: str, text: str) -> None:
    cleaned = _plain(text)
    if cleaned:
        bucket.append((where, cleaned))


def _from_item(bucket: list[tuple[str, str]], where: str, item: Any) -> None:
    if isinstance(item, str):
        _add(bucket, where, item)
        return
    if not isinstance(item, dict):
        return
    for key in ("c", "gc", "text", "html"):
        value = item.get(key)
        if isinstance(value, str):
            _add(bucket, where, value)


def _from_section(bucket: list[tuple[str, str]], where: str, section: dict[str, Any]) -> None:
    for key in ("c", "html"):
        value = section.get(key)
        if isinstance(value, str):
            _add(bucket, where, value)
    for item in section.get("items") or []:
        _from_item(bucket, where, item)
    for row in section.get("rows") or []:
        if isinstance(row, dict):
            name = str(row.get("name") or "").strip()
            location = str(row.get("location") or "").strip()
            if name or location:
                _add(bucket, where, f"{name} {location}".strip())


def _is_crew(node: dict[str, Any]) -> bool:
    return node.get("audience") == "crew"


def _chapter_order(bundle: dict[str, Any], systems: dict[str, Any]) -> list[str]:
    ui = bundle.get("ui") if isinstance(bundle.get("ui"), dict) else {}
    ordered = [str(key) for key in (ui.get("systemOrder") or []) if key in systems]
    ordered.extend(key for key in systems if key not in ordered)
    return ordered


def _split_prose(
    bundle: dict[str, Any],
) -> tuple[list[tuple[str, str]], list[tuple[str, str]]]:
    """Guest-visible prose, then crew-only prose."""
    guest: list[tuple[str, str]] = []
    crew: list[tuple[str, str]] = []
    systems = bundle.get("systems") if isinstance(bundle.get("systems"), dict) else {}
    for system_id in _chapter_order(bundle, systems):
        module = systems.get(system_id)
        if not isinstance(module, dict):
            continue
        title = str(module.get("title") or system_id)
        for key in ("summary", "subtitle"):
            value = module.get(key)
            if isinstance(value, str):
                _add(guest, f"{title} {key}", value)
        for section in module.get("sections") or []:
            if not isinstance(section, dict):
                continue
            where = f"{title} › {section.get('t') or 'section'}"
            target = crew if _is_crew(section) else guest
            _from_section(target, where, section)

    emergency = bundle.get("emergency") if isinstance(bundle.get("emergency"), dict) else {}
    mayday = emergency.get("mayday") if isinstance(emergency.get("mayday"), dict) else {}
    for step in mayday.get("steps") or []:
        if isinstance(step, str):
            _add(guest, "MAYDAY", step)
    for contact in emergency.get("contacts") or []:
        if not isinstance(contact, dict) or _is_crew(contact):
            continue
        where = f"emergency › {contact.get('label') or 'contact'}"
        for key in ("detail", "value"):
            value = contact.get(key)
            if isinstance(value, str):
                _add(guest, where, value)

    ui = bundle.get("ui") if isinstance(bundle.get("ui"), dict) else {}
    for block in ui.get("homeRuleSections") or []:
        if not isinstance(block, dict):
            continue
        heading = str(block.get("title") or "Rules")
        for rule in block.get("rules") or []:
            if not isinstance(rule, dict) or _is_crew(rule):
                continue
            text = rule.get("text")
            if isinstance(text, str):
                _add(guest, f"rules › {heading}", text)

    checklists = bundle.get("checklists") if isinstance(bundle.get("checklists"), dict) else {}
    for key, checklist in checklists.items():
        if not isinstance(checklist, dict):
            continue
        target = crew if _is_crew(checklist) else guest
        for group in checklist.get("groups") or []:
            if not isinstance(group, dict):
                continue
            where = f"checklist {key} › {group.get('t') or 'group'}"
            for item in group.get("items") or []:
                if isinstance(item, dict) and _is_crew(item):
                    _from_item(crew, where, item)
                    continue
                _from_item(target, where, item)

    fixes = bundle.get("fixes") if isinstance(bundle.get("fixes"), list) else []
    for card in fixes:
        if not isinstance(card, dict):
            continue
        where = f"fix › {card.get('key') or card.get('title') or 'card'}"
        steps = card.get("guestSteps") if not _is_crew(card) else None
        if not isinstance(steps, list) or not steps:
            steps = card.get("steps") or []
        target = crew if _is_crew(card) else guest
        for step in steps:
            if isinstance(step, str):
                _add(target, where, step)
    return guest, crew


def _gaps(rows: list[tuple[str, str]], *, crew_slots: bool) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()

    def keep(line: str) -> None:
        if line not in seen:
            seen.add(line)
            found.append(line)

    for where, text in rows:
        if not crew_slots:
            for phrase, label in _GUEST_STAND_INS:
                if phrase in text:
                    keep(f"  {where}: {label} — “{phrase}”")
        for slot in _SLOT.findall(text):
            dotted = _CF_TO_KEY.get(slot)
            if crew_slots:
                if dotted:
                    keep(f"  {where}: crewFacts.{dotted} is still a slot — {{{slot}}}")
                elif slot.startswith("cf_"):
                    keep(f"  {where}: unfilled crew slot — {{{slot}}}")
            elif dotted is None and not slot.startswith("cf_"):
                keep(f"  {where}: unfilled slot — {{{slot}}}")
    return found


def report(bundle: dict[str, Any], source: str) -> str:
    """Build the coverage text. ``source`` is the path or URL it came from."""
    branding = bundle.get("branding") if isinstance(bundle.get("branding"), dict) else {}
    name = str(branding.get("vesselName") or bundle.get("vesselSlug") or "bundle")
    slug = str(branding.get("vesselSlug") or bundle.get("vesselSlug") or "")
    title = f"Audience coverage — {name}"
    if slug:
        title += f" ({slug})"
    lines = [title, f"source: {source}", ""]

    systems = bundle.get("systems") if isinstance(bundle.get("systems"), dict) else {}
    lines.append("Chapters")
    if not systems:
        lines.append("  none")
    for system_id in _chapter_order(bundle, systems):
        module = systems.get(system_id)
        if not isinstance(module, dict):
            continue
        sections = [section for section in (module.get("sections") or []) if isinstance(section, dict)]
        crew = sum(1 for section in sections if _is_crew(section))
        both = len(sections) - crew
        visible = guest_visible_section_count(module)
        label = str(module.get("title") or system_id)
        lines.append(
            f"  {system_id:<12} both {both:3}  crew {crew:3}  guest-visible {visible:3}  {label}"
        )
        if visible == 0:
            lines.append("               warning: no sections are visible in the Guest view")
    lines.append("")

    checklists = bundle.get("checklists") if isinstance(bundle.get("checklists"), dict) else {}
    both_lists: list[str] = []
    crew_lists: list[str] = []
    for key in sorted(checklists):
        checklist = checklists[key]
        if isinstance(checklist, dict) and _is_crew(checklist):
            crew_lists.append(str(key))
        else:
            both_lists.append(str(key))
    lines.append("Checklists")
    lines.append(f"  both ({len(both_lists)}): {', '.join(both_lists) or 'none'}")
    lines.append(f"  crew ({len(crew_lists)}): {', '.join(crew_lists) or 'none'}")
    lines.append("")

    fixes = bundle.get("fixes") if isinstance(bundle.get("fixes"), list) else []
    both_cards: list[str] = []
    crew_cards: list[str] = []
    for card in fixes:
        if not isinstance(card, dict):
            continue
        key = str(card.get("key") or card.get("title") or "?")
        if _is_crew(card):
            crew_cards.append(key)
        else:
            both_cards.append(key)
    lines.append("Fix cards")
    lines.append(f"  both ({len(both_cards)}): {', '.join(both_cards) or 'none'}")
    lines.append(f"  crew ({len(crew_cards)}): {', '.join(crew_cards) or 'none'}")
    lines.append("")

    guest_prose, crew_prose = _split_prose(bundle)
    lines.append("Guest-fact gaps inferred from guest prose")
    guest_gaps = _gaps(guest_prose, crew_slots=False)
    lines.extend(guest_gaps or ["  none"])
    lines.append("")
    lines.append("Crew-fact gaps inferred from prose")
    crew_gaps = _gaps(guest_prose + crew_prose, crew_slots=True)
    lines.extend(crew_gaps or ["  none"])
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) != 2:
        print(
            "Usage: python scripts/report_audience_coverage.py BUNDLE.json",
            file=sys.stderr,
        )
        return 2
    path = Path(sys.argv[1])
    try:
        bundle = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Could not read {path}: {exc}", file=sys.stderr)
        return 1
    if not isinstance(bundle, dict):
        print(f"{path} is not a guide bundle object", file=sys.stderr)
        return 1
    print(report(bundle, str(path)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
