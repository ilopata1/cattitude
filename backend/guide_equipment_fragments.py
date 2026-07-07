"""Equipment-level guide content fragments (roadmap: equipment content library).

A fragment is shared, vessel-agnostic content attached to one equipment
registry row (`equipment_guide_fragment.fragment` JSONB):

    {
      "system_sections": {
        "<system_id>": {
          "subtitle": "...",            # optional
          "summary": "...",             # optional
          "learnChecks": ["..."],       # optional
          "sections": [{t, type, c?, items?}]
        }
      },
      "fix_card_overrides": {
        "<card_key>": {"title"?, "icon"?, "steps": ["..."]}
      },
      "extra_fix_cards": [{icon, cat, catL, title, steps}]
    }

Fragments are curated once per equipment model (first boat pays, siblings
don't) and assembled deterministically into vessel guides:

- System modules: when linked equipment provides sections for a system, the
  module is assembled from fragments instead of calling the LLM.
- Fix cards: fragment overrides replace the body steps of the generic card
  with equipment-specific steps; extra cards are appended. The vessel-specific
  contact step (always the final step of a generic card) is preserved, so
  fragments never embed charter company details.
"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection


def _coerce_jsonb(value: Any) -> Any:
    if isinstance(value, str):
        return json.loads(value)
    return value


def load_vessel_fragments(
    conn: Connection, vessel_id: str
) -> list[dict[str, Any]]:
    """Active fragments for equipment linked to the vessel, deduplicated per equipment."""
    rows = conn.execute(
        text(
            """
            SELECT DISTINCT ON (e.id)
                e.id, e.manufacturer, e.model, e.system_category, f.fragment
            FROM vessel_equipment ve
            JOIN equipment e ON e.id = ve.equipment_id
            JOIN equipment_guide_fragment f ON f.equipment_id = e.id
            WHERE ve.vessel_id = :vessel_id
              AND f.is_active
            ORDER BY e.id
            """
        ),
        {"vessel_id": vessel_id},
    ).fetchall()
    fragments = [
        {
            "equipment_id": str(row[0]),
            "manufacturer": row[1],
            "model": row[2],
            "system_category": row[3],
            "fragment": _coerce_jsonb(row[4]) or {},
        }
        for row in rows
    ]
    fragments.sort(
        key=lambda row: (
            row["system_category"] or "",
            row["manufacturer"] or "",
            row["model"] or "",
        )
    )
    return fragments


def assemble_system_from_fragments(
    system_id: str, fragment_rows: list[dict[str, Any]]
) -> dict[str, Any] | None:
    """Assemble a system module payload from equipment fragments, or None.

    Any linked equipment providing sections for the system triggers assembly
    (LLM is skipped). Equipment without a fragment simply contributes nothing —
    the admin review diff is the safety net for noticing missing coverage.
    """
    contributions: list[dict[str, Any]] = []
    for row in fragment_rows:
        entry = (row["fragment"].get("system_sections") or {}).get(system_id)
        if isinstance(entry, dict) and entry.get("sections"):
            contributions.append(entry)
    if not contributions:
        return None

    payload: dict[str, Any] = {"id": system_id, "sections": []}
    learn_checks: list[str] = []
    for entry in contributions:
        if not payload.get("subtitle") and entry.get("subtitle"):
            payload["subtitle"] = entry["subtitle"]
        if not payload.get("summary") and entry.get("summary"):
            payload["summary"] = entry["summary"]
        for check in entry.get("learnChecks") or []:
            if check not in learn_checks:
                learn_checks.append(check)
        payload["sections"].extend(entry["sections"])
    if learn_checks:
        payload["learnChecks"] = learn_checks
    return payload


def apply_fix_card_fragments(
    cards: list[dict[str, Any]], fragment_rows: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Apply equipment fix-card overrides and extras, then strip internal keys."""
    overrides: dict[str, dict[str, Any]] = {}
    extras: list[dict[str, Any]] = []
    contact_step: str | None = None
    for row in fragment_rows:
        fragment = row["fragment"]
        for card_key, override in (fragment.get("fix_card_overrides") or {}).items():
            if isinstance(override, dict) and override.get("steps"):
                overrides[card_key] = override
        for extra in fragment.get("extra_fix_cards") or []:
            if isinstance(extra, dict) and extra.get("steps"):
                extras.append(extra)

    result: list[dict[str, Any]] = []
    for card in cards:
        card = dict(card)
        card_key = card.pop("key", None)
        if card.get("steps"):
            contact_step = contact_step or card["steps"][-1]
        override = overrides.get(card_key) if card_key else None
        if override:
            # Fragment steps are vessel-agnostic; keep the vessel-specific
            # contact step that generic cards always place last.
            last_step = card["steps"][-1] if card.get("steps") else None
            card["steps"] = list(override["steps"]) + ([last_step] if last_step else [])
            if override.get("title"):
                card["title"] = override["title"]
            if override.get("icon"):
                card["icon"] = override["icon"]
        result.append(card)

    for extra in extras:
        extra_card = {
            key: extra[key]
            for key in ("icon", "cat", "catL", "title", "steps")
            if key in extra
        }
        extra_card["steps"] = list(extra_card.get("steps") or [])
        if contact_step:
            extra_card["steps"].append(contact_step)
        result.append(extra_card)

    return result


def get_equipment_fragment(
    conn: Connection, equipment_id: str
) -> dict[str, Any] | None:
    row = conn.execute(
        text(
            """
            SELECT id, fragment, updated_at, created_by
            FROM equipment_guide_fragment
            WHERE equipment_id = :equipment_id AND is_active
            """
        ),
        {"equipment_id": equipment_id},
    ).fetchone()
    if row is None:
        return None
    return {
        "id": str(row[0]),
        "fragment": _coerce_jsonb(row[1]) or {},
        "updated_at": row[2],
        "created_by": row[3],
    }


def replace_equipment_fragment(
    conn: Connection,
    equipment_id: str,
    fragment: dict[str, Any],
    *,
    created_by: str,
) -> dict[str, Any]:
    """Replace the equipment's active fragment JSON (creates row if needed)."""
    row = conn.execute(
        text(
            """
            SELECT id FROM equipment_guide_fragment
            WHERE equipment_id = :equipment_id AND is_active
            """
        ),
        {"equipment_id": equipment_id},
    ).fetchone()

    payload = json.dumps(fragment)
    if row:
        conn.execute(
            text(
                """
                UPDATE equipment_guide_fragment
                SET fragment = CAST(:fragment AS jsonb),
                    updated_at = now(),
                    created_by = :created_by
                WHERE id = :id
                """
            ),
            {
                "id": str(row[0]),
                "fragment": payload,
                "created_by": created_by,
            },
        )
    else:
        conn.execute(
            text(
                """
                INSERT INTO equipment_guide_fragment (equipment_id, fragment, created_by)
                VALUES (:equipment_id, CAST(:fragment AS jsonb), :created_by)
                """
            ),
            {
                "equipment_id": equipment_id,
                "fragment": payload,
                "created_by": created_by,
            },
        )
    return fragment


def delete_equipment_fragment(conn: Connection, equipment_id: str) -> bool:
    result = conn.execute(
        text(
            """
            UPDATE equipment_guide_fragment
            SET is_active = false, updated_at = now()
            WHERE equipment_id = :equipment_id AND is_active
            """
        ),
        {"equipment_id": equipment_id},
    )
    return result.rowcount > 0


def upsert_equipment_fragment(
    conn: Connection,
    equipment_id: str,
    patch: dict[str, Any],
    *,
    created_by: str,
) -> dict[str, Any]:
    """Merge a patch into the equipment's active fragment (creating it if needed).

    Merge is per top-level key: `system_sections` and `fix_card_overrides`
    merge per sub-key; `extra_fix_cards` is replaced when present in the patch.
    """
    row = conn.execute(
        text(
            """
            SELECT id, fragment FROM equipment_guide_fragment
            WHERE equipment_id = :equipment_id AND is_active
            """
        ),
        {"equipment_id": equipment_id},
    ).fetchone()

    fragment: dict[str, Any] = _coerce_jsonb(row[1]) if row else {}
    for key, value in patch.items():
        if key in ("system_sections", "fix_card_overrides"):
            merged = dict(fragment.get(key) or {})
            merged.update(value or {})
            fragment[key] = merged
        else:
            fragment[key] = value

    if row:
        conn.execute(
            text(
                """
                UPDATE equipment_guide_fragment
                SET fragment = CAST(:fragment AS jsonb),
                    updated_at = now(),
                    created_by = :created_by
                WHERE id = :id
                """
            ),
            {
                "id": str(row[0]),
                "fragment": json.dumps(fragment),
                "created_by": created_by,
            },
        )
    else:
        conn.execute(
            text(
                """
                INSERT INTO equipment_guide_fragment (equipment_id, fragment, created_by)
                VALUES (:equipment_id, CAST(:fragment AS jsonb), :created_by)
                """
            ),
            {
                "equipment_id": equipment_id,
                "fragment": json.dumps(fragment),
                "created_by": created_by,
            },
        )
    return fragment
