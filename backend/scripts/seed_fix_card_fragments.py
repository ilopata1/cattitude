#!/usr/bin/env python3
"""
Seed curated fix-card fragments for known registry equipment.

Content is generalized from the human-reviewed published Cattitude guide:
override steps replace the body of the matching generic fix card (the
vessel-specific contact step is re-appended automatically at assembly time),
and extra cards are added when the equipment is linked.

Idempotent — merges into existing active fragments per equipment.

Usage (from backend/):
  python scripts/seed_fix_card_fragments.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import settings  # noqa: E402
from db import postgres_connection_strings  # noqa: E402
from guide_equipment_fragments import upsert_equipment_fragment  # noqa: E402

# (manufacturer, model) -> fragment patch
SEED_FRAGMENTS: dict[tuple[str, str], dict] = {
    ("Yanmar", "4JH45"): {
        "fix_card_overrides": {
            "engine_wont_start": {
                "steps": [
                    "Confirm raw water seacock OPEN (handle parallel to pipe) in the engine compartment",
                    "Check the engine circuit breaker is ON in the engine compartment (red button)",
                    "At the helm: press ON/OFF to activate the EVC, wait for the glow plug cycle",
                    "Check battery voltage — must be above 12.0V",
                    "Never crank more than 10 seconds — risk of water in the exhaust",
                ]
            },
            "engine_overheating": {
                "steps": [
                    "IMMEDIATELY reduce RPM — switch to the other engine if possible",
                    "Check raw water flow from the exhaust — must be a continuous stream",
                    "Go to the engine compartment: check the raw water strainer for blockage — clear if needed",
                    "Confirm the raw water seacock is fully open",
                    "No water from the exhaust = impeller failed — do not run the engine",
                    "Do not restart until water flow is confirmed",
                ]
            },
        }
    },
    ("Victron Energy", "Victron MultiPlus inverter/charger"): {
        "fix_card_overrides": {
            "low_battery": {
                "steps": [
                    "Turn off all high-draw loads: AC units, induction stove, watermaker, microwave",
                    "Start the engine(s) — run at 1200-1500 RPM until the Victron display shows the bank recovering and the charging phase reaches Absorption",
                    "Alternatively: run the generator or shore power and switch the Victron Multi Control toggle to CHARGER ONLY — this charges the batteries without enabling AC loads",
                    "Check the solar charge controller on the Victron display — PV Charger watts should be contributing in daylight",
                    "Do not run high-draw AC loads again until the bank has recovered",
                    "If the bank will not recover despite charging: possible battery fault",
                ]
            }
        }
    },
    ("Spectra", "Catalina 340 watermaker"): {
        "fix_card_overrides": {
            "watermaker": {
                "steps": [
                    "Check the Watermaker breaker at the DC panel is ON",
                    "Confirm the generator is running — the watermaker is AC-powered; solar alone is not sufficient",
                    "Press the GREEN button on the Aqua-Base panel to start — switching to tank is automatic",
                    "Check the Salinity indicator — if reading high, water quality is poor; do not send it to the tanks",
                    "Confirm you are in clean, deep, open water — not shallow, sandy, near a marina, or murky",
                    "If the unit runs but salinity stays high: membranes may be contaminated — press RED to stop",
                    "If not used for 3+ days without flushing: press the BLUE button to flush before attempting production",
                ]
            }
        }
    },
    ("Dessalator", "Duo AC & DC Navigator"): {
        "fix_card_overrides": {
            "watermaker": {
                "title": "Watermaker not producing",
                "steps": [
                    "Check the watermaker breaker at the panel is ON",
                    "On the NAVIGATOR panel, confirm AC or DC voltage selection",
                    "If running on 12 V or 24 V DC for more than five minutes: start an engine, shore charger, or the generator — then retry start from the panel",
                    "Confirm you are in clean, deep, open water — not shallow, sandy, or near a marina",
                    "If it still will not produce: stop from the NAVIGATOR panel and leave it in stand-by",
                ],
            }
        }
    },
    ("Tecma", "Compass Eco electric head"): {
        "fix_card_overrides": {
            "toilet_wont_flush": {
                "steps": [
                    "Check the 25A circuit breaker for that head at the main panel — reset if tripped",
                    "Confirm the fresh water pump is on",
                    "Hold the flush switch for a full 10+ second cycle",
                    "Check for blockage — almost always caused by paper products or foreign objects",
                    "Do NOT try to disassemble the toilet",
                    "REMINDER: Nothing goes in the head except human waste — no TP, no wipes, ever",
                ]
            }
        }
    },
    ("Dometic", "CruiseAir self-contained AC"): {
        "fix_card_overrides": {
            "ac_not_working": {
                "steps": [
                    "Confirm AC power is available — shore power connected or generator running",
                    "Open the sea water valves for the AC units — the pumps need seawater flow or they are destroyed",
                    "At the Dometic panel in the cabin: tap to wake, press MODE to select COOL",
                    "Check the AC circuit breaker on the main electrical panel",
                    "Do not run all cabins simultaneously on generator — it may overload",
                    "Never cut generator power with AC units running — turn off at the Dometic panels first",
                ]
            }
        }
    },
    ("Whirlpool", "Induction cooktop (240V)"): {
        "extra_fix_cards": [
            {
                "icon": "🍳",
                "cat": "electrical",
                "catL": "Electrical",
                "title": "Induction stove not working",
                "steps": [
                    "Confirm AC power is available — generator running or shore power connected",
                    "Check the inverter control panel is ON and not in charger-only mode",
                    "Check for an overload indication — too many AC loads running simultaneously; turn off other AC loads and try again",
                    "Confirm induction-compatible cookware — a magnet must stick firmly to the base of the pot or pan",
                ],
            }
        ]
    },
    ("Quick", "Dylan DH4 windlass"): {
        "fix_card_overrides": {
            "windlass": {
                "steps": [
                    "Check the windlass circuit breaker — reset if tripped",
                    "Never run the windlass continuously more than 60 seconds — allow the motor to cool between runs",
                    "Check the handheld remote connection — ensure the cable is plugged in and not damaged",
                    "Ensure the remote cable has not been caught in or around the anchor chain",
                    "If the remote does not respond: try operating from the Quick chain counter at the helm if fitted",
                    "Start an engine — the windlass draws high current and a low battery will kill it",
                ]
            }
        }
    },
}


def main() -> None:
    sync_url, _ = postgres_connection_strings(settings.database_url)
    engine = create_engine(sync_url)

    seeded = 0
    with engine.begin() as conn:
        for (manufacturer, model), patch in SEED_FRAGMENTS.items():
            row = conn.execute(
                text(
                    """
                    SELECT id FROM equipment
                    WHERE manufacturer = :manufacturer AND model = :model
                    """
                ),
                {"manufacturer": manufacturer, "model": model},
            ).fetchone()
            if row is None:
                print(f"  skip {manufacturer} {model}: not in registry")
                continue
            upsert_equipment_fragment(
                conn, str(row[0]), patch, created_by="seed_fix_card_fragments.py"
            )
            seeded += 1
            print(f"  seeded {manufacturer} {model}")

    print(f"\nSeed OK: {seeded} equipment fragment(s)")


if __name__ == "__main__":
    main()
