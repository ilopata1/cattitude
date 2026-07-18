"""Adjudication overlays for the Outremer Ind C channel_map parse.

These edits are vessel-sheet corrections from human review of
``channel_map_parsed.md`` against the PDF. They are NOT extraction rules —
blank-row positions and circuit names differ per builder sheet.
"""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from channel_map_schema import render_channel_map_markdown  # noqa: E402

OUT = BACKEND / "fixtures/pipeline/scratch/channel_map_adjudication"
ARTIFACTS = BACKEND / "fixtures/pipeline/outremer/artifacts"

PLANNED_COMMIT = """
## Planned commit (DO NOT EXECUTE until you approve B3)

After adjudication of the table above:

1. Commit adjudicated `channel_entries` + `device_locations` as `channel_map`
   facts with citations (source doc p46, 05/05/2026 Ind C).
2. Split `config_unsourced` (circuits sourced; modes/favourites/alarms unsourced).
3. Locate COI `_1`/`_2`/`_3` (salon / port / stbd).
4. Wire Controls config-layer; OPT/CUS fitted only if inventory-corroborated.
5. Re-run vessel; surface contradictions — do not auto-resolve.
6. Re-render Controls draft + provenance + reconciliation notes.

Eval: **(xxiii)**–**(xxv)** per v4.12.
"""

ADJ_NOTE = "adjudication overlay (this sheet) — not an extraction rule"


def empty_slot(
    device: str, ref: str, pin: int | None, block: str | None
) -> dict[str, Any]:
    return {
        "device_instance": device,
        "channel_ref": ref,
        "pin": pin,
        "circuit_name_fr": None,
        "circuit_name_en": None,
        "fuse_rating": None,
        "option_flag": "STD",
        "hull_side_or_zone": None,
        "current_block": block,
        "note": None,
        "cell_confidence": "clear",
        "uncertainty_note": ADJ_NOTE + "; blank Fonction on sheet",
        "empty_row": True,
    }


def filled(
    device: str,
    ref: str,
    pin: int | None,
    block: str | None,
    *,
    fr: str | None,
    en: str | None,
    fuse: str | None,
    flag: str = "STD",
    note: str | None = None,
) -> dict[str, Any]:
    return {
        "device_instance": device,
        "channel_ref": ref,
        "pin": pin,
        "circuit_name_fr": fr,
        "circuit_name_en": en,
        "fuse_rating": fuse,
        "option_flag": flag,
        "hull_side_or_zone": None,
        "current_block": block,
        "note": note,
        "cell_confidence": "clear",
        "uncertainty_note": ADJ_NOTE,
        "empty_row": False,
    }


def replace_device(
    entries: list[dict[str, Any]], device: str, new_rows: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    others = [e for e in entries if e.get("device_instance") != device]
    return new_rows + others


def repair_coi2(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Human review: EN missing from O5+; A3 skipped → A4..A7 shifted; A8 empty.

    High-current packing on this sheet: O1 blank, Alim Pilote on O2, OPT deck
    wash on O3, Fresh Water on O4 (leading-empty skip — overlay only).
    """
    rows = [
        empty_slot("COI n°2", "COI2-O1", 1, "high_current"),
        filled(
            "COI n°2",
            "COI2-O2",
            2,
            "high_current",
            fr="Alim Pilote",
            en="Auto Pilot",
            fuse="25",
        ),
        filled(
            "COI n°2",
            "COI2-O3",
            3,
            "high_current",
            fr="[OPT] Lave Pont",
            en="[OPT] Deck Wash",
            fuse="25",
            flag="OPT",
            note="OPT",
        ),
        filled(
            "COI n°2",
            "COI2-O4",
            4,
            "high_current",
            fr="Pompe ED BD",
            en="Pump - Fresh Water PORT",
            fuse="25",
        ),
        filled(
            "COI n°2",
            "COI2-O5",
            1,
            "low_current",
            fr="Pompe de Cale BD01",
            en="Bilge Pump PORT01 - Bilge",
            fuse="5",
        ),
        filled(
            "COI n°2",
            "COI2-O6",
            2,
            "low_current",
            fr="Pompe de Cale BD02",
            en="Bilge Pump PORT02 - Engine Room",
            fuse="5",
        ),
        filled(
            "COI n°2",
            "COI2-O7",
            3,
            "low_current",
            fr="Pompe de Cale BD03",
            en="Bilge Pump PORT03 - Engine Room",
            fuse="5",
        ),
        filled(
            "COI n°2",
            "COI2-O8",
            4,
            "low_current",
            fr="Eclairage Cab Ar",
            en="Lights - Aft Cabin PORT",
            fuse="2",
        ),
        filled(
            "COI n°2",
            "COI2-O9",
            5,
            "low_current",
            fr="Eclairage Ambiance Coursive",
            en="Lights - Courtesy PORT",
            fuse="2",
        ),
        filled(
            "COI n°2",
            "COI2-O10",
            6,
            "low_current",
            fr="Eclairage Cousive",
            en="Lights - Companion Way PORT",
            fuse="2",
        ),
        filled(
            "COI n°2",
            "COI2-O11",
            7,
            "low_current",
            fr="Eclairage SDB BD AR",
            en="Lights - Aft Bathroom PORT",
            fuse="2",
        ),
        filled(
            "COI n°2",
            "COI2-O12",
            8,
            "low_current",
            fr="Ventilation Douche",
            en="Shower Fan - PORT",
            fuse="2",
        ),
        filled(
            "COI n°2",
            "COI2-O13",
            9,
            "low_current",
            fr="Pompe de Douche",
            en="Pump - Shower Drain PORT",
            fuse="5",
        ),
        empty_slot("COI n°2", "COI2-O14", 10, "low_current"),
        filled(
            "COI n°2",
            "COI2-O15",
            11,
            "low_current",
            fr="[OPT] Courtoisie Jupes",
            en="[OPT] Step Lights - PORT",
            fuse="2",
            flag="OPT",
            note="OPT",
        ),
        empty_slot("COI n°2", "COI2-O16", 12, "low_current"),
        filled(
            "COI n°2",
            "COI2-A1",
            1,
            "analogue_input",
            fr="BP Eclairage Cab Ar",
            en="Lights SW - Aft Cabin PORT",
            fuse=None,
        ),
        filled(
            "COI n°2",
            "COI2-A2",
            2,
            "analogue_input",
            fr="BP Eclairage Ambiance Coursive",
            en="Lights SW - Courtesy PORT",
            fuse=None,
        ),
        filled(
            "COI n°2",
            "COI2-A3",
            3,
            "analogue_input",
            fr="BP Eclairage Coursive",
            en="Lights SW - Companion Way PORT",
            fuse=None,
        ),
        filled(
            "COI n°2",
            "COI2-A4",
            4,
            "analogue_input",
            fr="BP Eclairage SDB BD Arrière",
            en="Lights SW - Aft Bathroom PORT",
            fuse=None,
        ),
        filled(
            "COI n°2",
            "COI2-A5",
            5,
            "analogue_input",
            fr="BP Eclairage SDB BD Avant",
            en="Lights SW - WC PORT",
            fuse=None,
        ),
        filled(
            "COI n°2",
            "COI2-A6",
            6,
            "analogue_input",
            fr="BP Eclairage Cab AV BD",
            en="Lights SW - Fwd Cabin PORT",
            fuse=None,
        ),
        filled(
            "COI n°2",
            "COI2-A7",
            7,
            "analogue_input",
            fr="Jauge Eau Douce BD",
            en="Fresh Water Tank PORT",
            fuse=None,
        ),
        filled(
            "COI n°2",
            "COI2-A8",
            8,
            "analogue_input",
            fr="Jauge Eaux Noires BD",
            en="Black Water Tank PORT",
            fuse=None,
        ),
    ]
    # Sheet shows fuse 3 on blank O16 in some reads — keep names empty, note fuse
    rows[15]["fuse_rating"] = "3"
    rows[15]["uncertainty_note"] = (
        ADJ_NOTE + "; blank Fonction; fuse 3 printed on sheet — confirm"
    )
    rows[15]["cell_confidence"] = "ambiguous"
    return replace_device(entries, "COI n°2", rows)


def repair_coi3(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Human review: leading empties O1–O3; Fresh Water on O4; O16 empty.

    Leading blank rows were skipped by vision → bilge/lights shifted up.
    Content below is this sheet's adjudicated packing, not a general rule.
    """
    rows = [
        empty_slot("COI n°3", "COI3-O1", 1, "high_current"),
        empty_slot("COI n°3", "COI3-O2", 2, "high_current"),
        empty_slot("COI n°3", "COI3-O3", 3, "high_current"),
        filled(
            "COI n°3",
            "COI3-O4",
            4,
            "high_current",
            fr="Pompe ED TD",
            en="Pump - Fresh Water STBD",
            fuse="25",
        ),
        filled(
            "COI n°3",
            "COI3-O5",
            1,
            "low_current",
            fr="Pompe de Cale TD01",
            en="Bilge Pump STBD01 - Bilge",
            fuse="5",
        ),
        filled(
            "COI n°3",
            "COI3-O6",
            2,
            "low_current",
            fr="Pompe de Cale TD02",
            en="Bilge Pump STBD02 - Engine Room",
            fuse="5",
        ),
        filled(
            "COI n°3",
            "COI3-O7",
            3,
            "low_current",
            fr="Pompe de Cale TD03",
            en="Bilge Pump STBD03 - Engine Room",
            fuse="5",
        ),
        filled(
            "COI n°3",
            "COI3-O8",
            4,
            "low_current",
            fr="Eclairage Cab Ar",
            en="Lights - Aft Cabin STBD",
            fuse="2",
        ),
        filled(
            "COI n°3",
            "COI3-O9",
            5,
            "low_current",
            fr="Eclairage Ambiance Coursive",
            en="Lights - Courtesy STBD",
            fuse="2",
        ),
        filled(
            "COI n°3",
            "COI3-O10",
            6,
            "low_current",
            fr="Eclairage Coursive",
            en="Lights - Companion Way STBD",
            fuse="2",
        ),
        filled(
            "COI n°3",
            "COI3-O11",
            7,
            "low_current",
            fr="Eclairage Cab AV (Offshore)",
            en="Lights - Fwd Cabin STBD",
            fuse="2",
        ),
        filled(
            "COI n°3",
            "COI3-O12",
            8,
            "low_current",
            fr="Ecl. Ambiance Carré*",
            en="Lights - Salon Courtesy",
            fuse="5",
            flag="CUS",
            note="12&14",
        ),
        filled(
            "COI n°3",
            "COI3-O13",
            9,
            "low_current",
            fr="Eclairage Cockpit",
            en="Lights - Cockpit",
            fuse="3",
        ),
        filled(
            "COI n°3",
            "COI3-O14",
            10,
            "low_current",
            fr="Ecl. Ambiance Carré*",
            en="Lights - Salon Courtesy",
            fuse="5",
            flag="CUS",
            note="12&14",
        ),
        filled(
            "COI n°3",
            "COI3-O15",
            11,
            "low_current",
            fr="[OPT] Courtoisie Jupes",
            en="[OPT] Step Lights - STBD",
            fuse="2",
            flag="OPT",
            note="OPT",
        ),
        empty_slot("COI n°3", "COI3-O16", 12, "low_current"),
        filled(
            "COI n°3",
            "COI3-A1",
            1,
            "analogue_input",
            fr="BP Eclairage Cab Ar",
            en="Lights SW - Aft Cabin STBD",
            fuse=None,
        ),
        filled(
            "COI n°3",
            "COI3-A2",
            2,
            "analogue_input",
            fr="BP Eclairage Ambiance Coursive",
            en="Lights SW - Courtesy STBD",
            fuse=None,
        ),
        filled(
            "COI n°3",
            "COI3-A3",
            3,
            "analogue_input",
            fr="BP Eclairage Cousive",
            en="Lights SW - Companion Way STBD",
            fuse=None,
        ),
        filled(
            "COI n°3",
            "COI3-A4",
            4,
            "analogue_input",
            fr="BP Eclairage SDB TD",
            en="Lights SW - Bathroom STBD",
            fuse=None,
        ),
        filled(
            "COI n°3",
            "COI3-A5",
            5,
            "analogue_input",
            fr="BP Eclairage Cab AV (Offshore)",
            en="Lights SW - Fwd Cabin",
            fuse=None,
        ),
        empty_slot("COI n°3", "COI3-A6", 6, "analogue_input"),
        filled(
            "COI n°3",
            "COI3-A7",
            7,
            "analogue_input",
            fr="Jauge Eau Douce TD",
            en="Fresh Water Tank STBD",
            fuse=None,
        ),
        filled(
            "COI n°3",
            "COI3-A8",
            8,
            "analogue_input",
            fr="Jauge Eaux Noires TD",
            en="Black Water Tank STBD",
            fuse=None,
        ),
    ]
    # A8 black-water: present on sheet in prior full-column reads; mark if unsure
    rows[-1]["cell_confidence"] = "ambiguous"
    rows[-1]["uncertainty_note"] = (
        ADJ_NOTE + "; A8 black-water — confirm (A6 blank shifted A7/A8)"
    )
    return replace_device(entries, "COI n°3", rows)


def repair_coi1(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Human review: O3 empty (was duplicate of O4 Zeus); keep outputs in pin order."""
    rows = [
        filled(
            "COI n°1",
            "COI1-O1",
            1,
            "high_current",
            fr="Réfrigérateur",
            en="Fridge",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-O2",
            2,
            "high_current",
            fr="[OPT] Conservateur",
            en="[OPT] Freezer",
            fuse=None,
            flag="OPT",
            note="OPT",
        ),
        empty_slot("COI n°1", "COI1-O3", 3, "high_current"),
        filled(
            "COI n°1",
            "COI1-O4",
            4,
            "high_current",
            fr="[OPT] Zeus x2",
            en="[OPT] Zeus x2",
            fuse=None,
            flag="OPT",
            note="OPT",
        ),
        filled(
            "COI n°1",
            "COI1-O5",
            1,
            "low_current",
            fr="Eclairage Carré Bâbord",
            en="Lights - Salon PORT",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-O6",
            2,
            "low_current",
            fr="Eclairage Carré Tribord",
            en="Lights - Salon STBD",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-O7",
            3,
            "low_current",
            fr="[OPT] Commande Guindeau",
            en="[OPT] Windlass",
            fuse=None,
            flag="OPT",
            note="OPT",
        ),
        filled(
            "COI n°1",
            "COI1-O8",
            4,
            "low_current",
            fr="Feu de navigation",
            en="Navigation Light",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-O9",
            5,
            "low_current",
            fr="Eclairage Rouge",
            en="Red lights",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-O10",
            6,
            "low_current",
            fr="Feu de Mouillage",
            en="Anchor Light",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-O11",
            7,
            "low_current",
            fr="Feu de Hune",
            en="Steaming Light",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-O12",
            8,
            "low_current",
            fr="Feu de Pont",
            en="Deck Light",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-O13",
            9,
            "low_current",
            fr="Commande Chauffe EAU",
            en="Water Heater ON/OFF",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-O14",
            10,
            "low_current",
            fr="[OPT] Electronique",
            en="[OPT] Electronic",
            fuse=None,
            flag="OPT",
            note="OPT",
        ),
        filled(
            "COI n°1",
            "COI1-O15",
            11,
            "low_current",
            fr="[OPT] Wifi",
            en="[OPT] Wifi",
            fuse=None,
            flag="OPT",
            note="OPT",
        ),
        filled(
            "COI n°1",
            "COI1-O16",
            12,
            "low_current",
            fr="[OPT] Radar",
            en="[OPT] Radar",
            fuse=None,
            flag="OPT",
            note="OPT",
        ),
        filled(
            "COI n°1",
            "COI1-A1",
            1,
            "analogue_input",
            fr="BP Eclairage Carré Bâbord",
            en="Lights SW - Salon PORT",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-A2",
            2,
            "analogue_input",
            fr="BP Eclairage Carré Tribord",
            en="Lights SW - Salon STBD",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-A3",
            3,
            "analogue_input",
            fr="BP Ecl. Ambiance Carré",
            en="Lights SW - Salon Courtesy",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-A4",
            4,
            "analogue_input",
            fr="BP Eclairage Cockpit Bimini",
            en="Lights SW - Cockpit",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-A5",
            5,
            "analogue_input",
            fr="Jauge Gasoil BD",
            en="Fuel Tank PORT",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-A6",
            6,
            "analogue_input",
            fr="Jauge Gasoil TD",
            en="Fuel Tank STBD",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-A7",
            7,
            "analogue_input",
            fr="Alarme Pompes de Cale BD",
            en="Bilge Pump Running - PORT",
            fuse=None,
        ),
        filled(
            "COI n°1",
            "COI1-A8",
            8,
            "analogue_input",
            fr="Alarme Pompes de Cale TD",
            en="Bilge Pump Running - STBD",
            fuse=None,
        ),
    ]
    return replace_device(entries, "COI n°1", rows)


def repair_coi1_analogue(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Deprecated: use repair_coi1 (full device rebuild in pin order)."""
    return repair_coi1(entries)


def _drop_devices(entries: list[dict[str, Any]], predicates) -> list[dict[str, Any]]:
    out = []
    for e in entries:
        name = str(e.get("device_instance") or "")
        if any(pred(name) for pred in predicates):
            continue
        out.append(e)
    return out


def _is_fuse_or_dc(name: str) -> bool:
    n = name.lower()
    return (
        "fuse" in n
        or n.startswith("fb")
        or "dc500" in n
        or "porte" in n
        or name.startswith("OUTPUT INTERFACE OI n°3 TD")
    )


def repair_fuse_boxes(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """FB01–FB05 overlays: empty-row integrity + missing devices."""
    entries = _drop_devices(
        entries,
        [
            lambda n: "fuse" in n.lower() or n.lower().startswith("fb"),
        ],
    )
    rows: list[dict[str, Any]] = []

    # Fuse Box 01 Carré
    d = "Fuse Box 01 Carré"
    rows += [
        filled(d, "FB1-1", 1, None, fr="Liseuse TAC", en="Salon Reading Light", fuse="2"),
        filled(d, "FB1-2", 2, None, fr="USB Carré/Cockpit", en="USB Salon", fuse="5"),
        filled(
            d,
            "FB1-3",
            3,
            None,
            fr="[OPT] Ventilateurs Carré x2",
            en="[OPT] Salon Fans",
            fuse="2",
            flag="OPT",
            note="OPT",
        ),
        empty_slot(d, "FB1-4", 4, None),
        empty_slot(d, "FB1-5", 5, None),
        filled(
            d,
            "FB1-6",
            6,
            None,
            fr="Verrouillage Guillotines",
            en="Sash Window Lock",
            fuse="2",
        ),
    ]

    # Fuse Box 02 BD Arrière — FB2-1 and FB2-3 empty
    d = "Fuse Box 02 BD Arrière"
    rows += [
        empty_slot(d, "FB2-1", 1, None),
        filled(
            d,
            "FB2-2",
            2,
            None,
            fr="Liseuses Cab AR",
            en="Aft cabin Reading Light",
            fuse="3",
        ),
        empty_slot(d, "FB2-3", 3, None),
        filled(
            d,
            "FB2-4",
            4,
            None,
            fr="[OPT] Ventilateurs Cab AR BD",
            en="[OPT] Aft Cabin Fan",
            fuse="2",
            flag="OPT",
            note="OPT",
        ),
        filled(
            d,
            "FB2-5",
            5,
            None,
            fr="[CUS] Prise USB A&C",
            en="[CUS] Helm Station USB Plug",
            fuse="5",
            flag="CUS",
            note="CUS",
        ),
        filled(
            d,
            "FB2-6",
            6,
            None,
            fr="[OPT] Condensat Clim BD",
            en="[CUS] Waste Pump Air Cond",
            fuse="7.5",
            flag="OPT",
            note="OPT",
        ),
    ]

    # Fuse Box 03 BD Avant — FB3-5 and FB3-6 empty
    d = "Fuse Box 03 BD Avant"
    rows += [
        filled(
            d,
            "FB3-1",
            1,
            None,
            fr="Liseuses Cab AV",
            en="Front Cabin Reading Light",
            fuse="3",
        ),
        filled(
            d,
            "FB3-2",
            2,
            None,
            fr="[OPT] Refroidissement Groupe electro",
            en=None,
            fuse="10",
            flag="OPT",
            note="OPT",
        ),
        filled(
            d,
            "FB3-3",
            3,
            None,
            fr="[OPT] Ventilateurs Cab AV BD",
            en="Front Cabin Fan",
            fuse="2",
            flag="OPT",
            note="OPT",
        ),
        filled(
            d,
            "FB3-4",
            4,
            None,
            fr="Eclairage Soute a voiles",
            en="Sail Bay Lights",
            fuse="2",
        ),
        empty_slot(d, "FB3-5", 5, None),
        empty_slot(d, "FB3-6", 6, None),
    ]
    # FB3-2 EN blank on sheet
    for row in rows:
        if row.get("channel_ref") == "FB3-2":
            row["cell_confidence"] = "ambiguous"
            row["uncertainty_note"] = ADJ_NOTE + "; EN blank on sheet"
            break

    # Fuse Box 04 TD Arrière (was missing entirely)
    d = "Fuse Box 04 TD Arrière"
    rows += [
        empty_slot(d, "FB4-1", 1, None),
        filled(
            d,
            "FB4-2",
            2,
            None,
            fr="Liseuses Cab AR",
            en="Aft cabin Reading Light",
            fuse="3",
        ),
        empty_slot(d, "FB4-3", 3, None),
        filled(
            d,
            "FB4-4",
            4,
            None,
            fr="[OPT] Ventilateurs Cab AR TD",
            en="[OPT] Aft Cabin Fan",
            fuse="2",
            flag="OPT",
            note="OPT",
        ),
        empty_slot(d, "FB4-5", 5, None),
        filled(
            d,
            "FB4-6",
            6,
            None,
            fr="[OPT] Condensat Clim TD",
            en="[CUS] Waste Pump Air Cond",
            fuse="7.5",
            flag="OPT",
            note="OPT",
        ),
    ]

    # Fuse Box 05 TD Avant — FB5-4 Sail Bay Light
    d = "Fuse Box 05 TD Avant"
    rows += [
        filled(
            d,
            "FB5-1",
            1,
            None,
            fr="Liseuses Cab AV TD",
            en="Companion Way Reading Light",
            fuse="3",
        ),
        filled(
            d,
            "FB5-2",
            2,
            None,
            fr="[OPT] Ventilateur Cab AV TD",
            en="[OPT] FWD Cabin Fan",
            fuse="2",
            flag="OPT",
            note="OPT",
        ),
        empty_slot(d, "FB5-3", 3, None),
        filled(
            d,
            "FB5-4",
            4,
            None,
            fr="Eclairage Soute a voiles",
            en="Sail Bay Light",
            fuse="2",
        ),
        empty_slot(d, "FB5-5", 5, None),
        empty_slot(d, "FB5-6", 6, None),
    ]

    return entries + rows


def repair_dc500(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """DC500 n°0–3 + Portes-Fusible overlays."""
    entries = _drop_devices(
        entries,
        [
            lambda n: "dc500" in n.lower() or "porte" in n.lower(),
            lambda n: n.startswith("OUTPUT INTERFACE OI n°3 TD"),
        ],
    )
    rows: list[dict[str, Any]] = []

    d = "DC500 n°0"
    rows += [
        filled(
            d,
            "DCD0-E",
            None,  # type: ignore[arg-type]
            None,
            fr="SHUNT/ BATTERIES LITHIUM",
            en="LITHIUM BATTERIES",
            fuse=None,
        ),
        filled(
            d,
            "DCD0-01",
            1,
            None,
            fr="[OPT] COMBI 1",
            en="[OPT] COMBIMASTER n°1",
            fuse="200",
            flag="OPT",
            note="OPT",
        ),
        filled(
            d,
            "DCD0-02",
            2,
            None,
            fr="[OPT] COMBI 2",
            en="[OPT] COMBIMASTER n°2",
            fuse="200",
            flag="OPT",
            note="OPT",
        ),
        filled(
            d,
            "DCD0-03",
            3,
            None,
            fr="POMPES DE CALES AUTO",
            en="BILGE PUMPS",
            fuse="35",
        ),
        filled(
            d,
            "DCD0-04",
            4,
            None,
            fr="[OPT] PANNEAUX SOLAIRES",
            en="[OPT] SOLAR PANELS",
            fuse="63",
            flag="OPT",
            note="OPT",
        ),
        filled(
            d,
            "DCD0-S",
            None,  # type: ignore[arg-type]
            None,
            fr="COUPE CIRCUIT",
            en="CIRCUIT BREAKER",
            fuse=None,
        ),
    ]

    d = "DC500 n°1"
    rows += [
        filled(
            d,
            "DCD1-E",
            None,  # type: ignore[arg-type]
            None,
            fr="COUPE CIRCUIT",
            en="CIRCUIT BREAKER",
            fuse=None,
        ),
        filled(
            d,
            "DCD1-01",
            1,
            None,
            fr="COI N°1 CARRE + FUSE BOX",
            en="COI N°1 CARRE + FUSE BOX",
            fuse="100",
        ),
        filled(
            d,
            "DCD1-02",
            2,
            None,
            fr="DC-DC 24/12V -> OI N°1 - 12V",
            en="DC-DC 24/12V -> OI N°1 - 12V",
            fuse="50",
        ),
        empty_slot(d, "DCD1-03", 3, None),
        filled(
            d,
            "DCD1-04",
            4,
            None,
            fr="[OPT] Hifi",
            en="Hifi",
            fuse="30",
            flag="OPT",
            note="*disj",
        ),
        filled(
            d,
            "DCD1-S",
            None,  # type: ignore[arg-type]
            None,
            fr="GUINDEAU",
            en="WINDLASS",
            fuse="100",
            note="*disj",
        ),
    ]
    # User said DCD1-05 / GUINDEAU — sheet REPERE is DCD1-S (5th data row after E)
    rows[-1]["uncertainty_note"] = (
        ADJ_NOTE + "; sheet REPERE is DCD1-S (not DCD1-05) — confirm"
    )
    rows[-1]["cell_confidence"] = "ambiguous"

    d = "DC500 n°2"
    rows += [
        filled(d, "DCD2-E", None, None, fr="FUDCD02", en="FUDCD02", fuse="250"),  # type: ignore[arg-type]
        filled(
            d,
            "DCD2-01",
            1,
            None,
            fr="COI N°2 BD + FUSE BOX",
            en="COI N°2 PORT + FUSE BOX",
            fuse="100",
        ),
        filled(
            d,
            "DCD2-02",
            2,
            None,
            fr="OI N°2 BD",
            en="OI N°2 PORT",
            fuse="50",
        ),
        filled(
            d,
            "DCD2-03",
            3,
            None,
            fr="[OPT] WINCH ELEC BD x2 + Line Driver",
            en="[OPT] ELEC WINCH PORT + Line Driver",
            fuse="200",
            flag="OPT",
            note="OPT",
        ),
        filled(
            d,
            "DCD2-04",
            4,
            None,
            fr="[OPT] DESSALINISATEUR",
            en="[OPT] WATER MAKER",
            fuse="35",
            flag="OPT",
            note="OPT",
        ),
        filled(
            d,
            "DCD2-S",
            None,  # type: ignore[arg-type]
            None,
            fr="COFFRET MOTEUR BD",
            en="ENGINE BOX PORT",
            fuse=None,
        ),
    ]

    d = "DC500 n°3"
    rows += [
        filled(d, "DCD3-E", None, None, fr="FUDCD03", en="FUDCD03", fuse="250"),  # type: ignore[arg-type]
        filled(
            d,
            "DCD3-01",
            1,
            None,
            fr="COI N°3 TD + FUSE BOX",
            en="COI N°3 STBD + FUSE BOX",
            fuse="100",
        ),
        filled(
            d,
            "DCD3-02",
            2,
            None,
            fr="OI N°3 TD",
            en="OI N°3 STBD",
            fuse="50",
        ),
        filled(
            d,
            "DCD3-03",
            3,
            None,
            fr="[OPT] WINCH ELEC TD x2",
            en="[OPT] ELEC WINCH STBD",
            fuse="200",
            flag="OPT",
            note="OPT",
        ),
        empty_slot(d, "DCD3-04", 4, None),
        filled(
            d,
            "DCD3-S",
            None,  # type: ignore[arg-type]
            None,
            fr="COFFRET MOTEUR TD",
            en="ENGINE BOX STBD",
            fuse=None,
        ),
    ]
    # DCD3-04 may be empty or 35A OPT placeholder — mark ambiguous
    rows[-2]["uncertainty_note"] = (
        ADJ_NOTE + "; confirm whether DCD3-04 blank or OPT 35A row"
    )
    rows[-2]["cell_confidence"] = "ambiguous"

    d = "Portes-Fusible"
    rows += [
        filled(
            d,
            "DCD2-E",
            None,  # type: ignore[arg-type]
            None,
            fr="DCD2-E",
            en="FUDCD2",
            fuse="250",
        ),
        filled(
            d,
            "DCD3-E",
            None,  # type: ignore[arg-type]
            None,
            fr="DCD3-E",
            en="FUDCD3",
            fuse="250",
        ),
    ]

    return entries + rows


def _upsert_locations(locs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    wanted = [
        {
            "device_instance": "Fuse Box 01 Carré",
            "device_kind": "fuse_box",
            "zone_label_fr": "Carré",
            "zone_label_en": "Salon",
            "hull_side": "center",
            "network_address": None,
            "cell_confidence": "clear",
            "uncertainty_note": ADJ_NOTE,
        },
        {
            "device_instance": "Fuse Box 02 BD Arrière",
            "device_kind": "fuse_box",
            "zone_label_fr": "BD Arrière",
            "zone_label_en": "Port Aft",
            "hull_side": "port",
            "network_address": None,
            "cell_confidence": "clear",
            "uncertainty_note": ADJ_NOTE,
        },
        {
            "device_instance": "Fuse Box 03 BD Avant",
            "device_kind": "fuse_box",
            "zone_label_fr": "BD Avant",
            "zone_label_en": "Port Forward",
            "hull_side": "port",
            "network_address": None,
            "cell_confidence": "clear",
            "uncertainty_note": ADJ_NOTE,
        },
        {
            "device_instance": "Fuse Box 04 TD Arrière",
            "device_kind": "fuse_box",
            "zone_label_fr": "TD Arrière",
            "zone_label_en": "Starboard Aft",
            "hull_side": "stbd",
            "network_address": None,
            "cell_confidence": "clear",
            "uncertainty_note": ADJ_NOTE,
        },
        {
            "device_instance": "Fuse Box 05 TD Avant",
            "device_kind": "fuse_box",
            "zone_label_fr": "TD Avant",
            "zone_label_en": "Starboard Forward",
            "hull_side": "stbd",
            "network_address": None,
            "cell_confidence": "clear",
            "uncertainty_note": ADJ_NOTE,
        },
        {
            "device_instance": "Portes-Fusible",
            "device_kind": "fuse_holder",
            "zone_label_fr": None,
            "zone_label_en": None,
            "hull_side": None,
            "network_address": None,
            "cell_confidence": "clear",
            "uncertainty_note": ADJ_NOTE,
        },
    ]
    by = {str(l.get("device_instance")): dict(l) for l in locs}
    # Drop old FB aliases
    for k in list(by):
        if "fuse" in k.lower() or "porte" in k.lower():
            del by[k]
    for loc in wanted:
        by[loc["device_instance"]] = loc
    # Keep COI / Touch / DC500 location shells
    return list(by.values())


def main() -> int:
    path = OUT / "channel_map_extract.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = list(data.get("channel_entries") or [])

    entries = repair_coi2(entries)
    entries = repair_coi3(entries)
    entries = repair_coi1(entries)
    entries = repair_fuse_boxes(entries)
    entries = repair_dc500(entries)
    data["channel_entries"] = entries
    data["device_locations"] = _upsert_locations(
        list(data.get("device_locations") or [])
    )

    data["extractor_flags"] = [
        "Adjudication overlay round 7 (vessel-specific, NOT extraction rules):",
        "  FB2: FB2-1 and FB2-3 empty; content re-packed.",
        "  FB3: FB3-5 and FB3-6 empty slots added.",
        "  FB5-4: Sail Bay Light restored.",
        "  Fuse Box 01 Carré and Fuse Box 04 TD Arrière added (were missing).",
        "  Fuse Box 05 TD Avant location + full 6-row table restored.",
        "  DC500 n°0: DCD0-02 COMBI 2 restored; rows unshifted.",
        "  DC500 n°1: DCD1-03 empty; GUINDEAU on DCD1-S (sheet repere; not DCD1-05).",
        "  Sort: alpha REPERE suffixes (E/S) before numeric (-01…).",
        "Extraction rules remain generic only: never skip blank Fonction rows.",
        "STOP — pending approval to commit facts (B3).",
    ]
    data["_meta"] = dict(data.get("_meta") or {})
    data["_meta"]["adjudication_round"] = "7_fb_dc500"
    data["_meta"]["status"] = "pending_adjudication"
    data["_meta"]["vessel_specific_overlays"] = True
    data["_meta"]["confirmed"] = [
        "COI3 packing",
        "COI1-A1..A3",
        "COI2-O1 empty",
        "COI2-O2 Auto Pilot",
        "COI2-O3 OPT Deck Wash",
    ]

    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    md = render_channel_map_markdown(data) + PLANNED_COMMIT
    (OUT / "channel_map_parsed.md").write_text(md, encoding="utf-8")
    (ARTIFACTS / "channel_map_parsed.md").write_text(md, encoding="utf-8")

    for label in (
        "Fuse Box 02 BD Arrière",
        "Fuse Box 03 BD Avant",
        "Fuse Box 05 TD Avant",
        "Fuse Box 01 Carré",
        "DC500 n°0",
        "DC500 n°1",
    ):
        print("===", label, "===")
        for e in entries:
            if e.get("device_instance") != label:
                continue
            print(
                e.get("channel_ref"),
                "empty="+str(e.get("empty_row")),
                e.get("circuit_name_fr"),
                "/",
                e.get("circuit_name_en"),
                e.get("fuse_rating"),
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
